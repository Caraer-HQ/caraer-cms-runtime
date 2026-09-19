import type { PageDocument, PageModuleInstance, PageSeo } from './document.ts';

/**
 * The edit protocol shared by the Flutter builder, the backend websocket
 * channel, the AI rewrite endpoint and the preview iframe.
 *
 * Every change to a page is one of these operations. Keeping the set small and
 * explicit is what lets the iframe re-render only the modules that actually
 * changed instead of reloading the document.
 */
export type PagePatch =
  | { op: 'set_field'; moduleId: string; field: string; value: unknown }
  | { op: 'set_fields'; moduleId: string; fields: Record<string, unknown> }
  | { op: 'add_module'; index: number; module: PageModuleInstance }
  | { op: 'remove_module'; moduleId: string }
  | { op: 'move_module'; moduleId: string; toIndex: number }
  | { op: 'replace_modules'; modules: PageModuleInstance[] }
  | { op: 'set_hidden'; moduleId: string; hidden: boolean }
  | { op: 'set_seo'; seo: PageSeo }
  | { op: 'set_module'; moduleId: string; ref: string; fields?: Record<string, unknown> };

/** A batch of patches applied atomically, producing one new revision. */
export interface PageRevision {
  revision: number;
  patches: PagePatch[];
  /** User who authored the change, for presence and attribution. */
  authorUuid?: string;
  at?: number;
}

/** Which module instances a patch affects, for targeted re-rendering. */
export function affectedModuleIds(patch: PagePatch): string[] | 'all' {
  switch (patch.op) {
    case 'set_field':
    case 'set_fields':
    case 'set_hidden':
    case 'set_module':
    case 'remove_module':
      return [patch.moduleId];
    case 'add_module':
      return [patch.module.id];
    // A move changes document order, and SEO changes the shell, so neither can
    // be satisfied by swapping a single fragment.
    case 'move_module':
    case 'replace_modules':
    case 'set_seo':
      return 'all';
  }
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(Math.trunc(index), length);
}

/**
 * Applies one patch, returning a new document.
 *
 * Pure and side-effect free so the same implementation runs in the browser
 * preview, in tests, and against a document fetched from the backend. Unknown
 * module ids are ignored rather than throwing: a patch racing a concurrent
 * delete should not break another editor's session.
 */
export function applyPatch(doc: PageDocument, patch: PagePatch): PageDocument {
  switch (patch.op) {
    case 'set_field':
      return {
        ...doc,
        modules: doc.modules.map((m) =>
          m.id === patch.moduleId ? { ...m, fields: { ...m.fields, [patch.field]: patch.value } } : m,
        ),
      };

    case 'set_fields':
      return {
        ...doc,
        modules: doc.modules.map((m) =>
          m.id === patch.moduleId ? { ...m, fields: { ...m.fields, ...patch.fields } } : m,
        ),
      };

    case 'add_module': {
      const modules = [...doc.modules];
      modules.splice(clampIndex(patch.index, modules.length), 0, patch.module);
      return { ...doc, modules };
    }

    case 'remove_module':
      return { ...doc, modules: doc.modules.filter((m) => m.id !== patch.moduleId) };

    case 'move_module': {
      const from = doc.modules.findIndex((m) => m.id === patch.moduleId);
      if (from === -1) return doc;
      const modules = [...doc.modules];
      const [moved] = modules.splice(from, 1);
      modules.splice(clampIndex(patch.toIndex, modules.length), 0, moved);
      return { ...doc, modules };
    }

    case 'replace_modules':
      return { ...doc, modules: [...patch.modules] };

    case 'set_hidden':
      return {
        ...doc,
        modules: doc.modules.map((m) => (m.id === patch.moduleId ? { ...m, hidden: patch.hidden } : m)),
      };

    case 'set_seo':
      return { ...doc, seo: { ...doc.seo, ...patch.seo } };

    case 'set_module':
      return {
        ...doc,
        modules: doc.modules.map((m) =>
          m.id === patch.moduleId
            ? { ...m, module: patch.ref, fields: patch.fields ? { ...patch.fields } : m.fields }
            : m,
        ),
      };
  }
}

/** Applies a revision's patches in order and stamps the new revision number. */
export function applyRevision(doc: PageDocument, revision: PageRevision): PageDocument {
  const next = revision.patches.reduce(applyPatch, doc);
  return { ...next, revision: revision.revision };
}
