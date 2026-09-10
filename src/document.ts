import type { ModuleKind, ModuleRef } from './contract.ts';

/** One module placed on a page, with the values the editor filled in. */
export interface PageModuleInstance {
  /** Stable id for this placement. Survives reorders; used as the patch target. */
  id: string;
  /** Which module renders here, as `<app_name>/<module_name>`. */
  module: ModuleRef;
  fields: Record<string, unknown>;
  /** Kept in the document but not rendered. Lets the editor stage a module. */
  hidden?: boolean;
}

export interface PageSeo {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  canonical?: string;
}

/**
 * The v2 page document.
 *
 * Stored by the backend as JSON in `page_v2_{locale}_{state}` on the record.
 * Replaces v1's recursive `PageContent` tree: composition is a flat ordered
 * list, and everything below a module is the module developer's concern.
 */
export interface PageDocument {
  version: 2;
  /**
   * Monotonic counter bumped on every applied patch.
   *
   * The editor iframe uses it to ignore revisions it has already rendered and
   * to detect that it has fallen behind and needs a full reload.
   */
  revision: number;
  modules: PageModuleInstance[];
  seo?: PageSeo;
  excerpt?: string;
  css?: string;
  headJs?: string;
  bodyJs?: string;
}

export function emptyPageDocument(): PageDocument {
  return { version: 2, revision: 0, modules: [] };
}

/** A page's linked CRM record, as exposed to modules. */
export interface CaraerRecord {
  uuid: string;
  object: string;
  /** Raw property values, keyed by property name. */
  properties: Record<string, unknown>;
  /** Display-formatted values for the same properties. */
  parsedProperties: Record<string, unknown>;
}

export interface PageContext {
  uuid: string;
  title: string | null;
  slug: string | null;
  locale: string;
  /** `draft` when rendering the builder preview, `published` on the live site. */
  state: 'draft' | 'published';
  path: string;
  /** Absolute origin of the live site, for canonical URLs and share links. */
  origin: string;
}

export interface CompanyContext {
  uuid: string;
  name: string;
  subdomain: string;
  logo: string | null;
  logoDark: string | null;
  favicon: string | null;
}

/**
 * Present only when the page renders inside the builder iframe.
 *
 * A module can use it to render an editing affordance, but must not depend on
 * it: on the live site it is `null`.
 */
export interface EditorContext {
  /** The module instance currently selected in the sidebar, if any. */
  selectedModuleId: string | null;
}

/** Everything a module's `index.astro` receives as props. */
export interface ModuleProps<Fields = Record<string, unknown>> {
  /**
   * Field values, resolved for rendering.
   *
   * A `PROPERTY_*` field arrives as the *value* of that property on the page's
   * record, which is what makes `fields.job_title` print the vacancy's title.
   */
  fields: Fields;
  /**
   * Field values exactly as the editor stored them.
   *
   * For a `PROPERTY_*` field this is the property *name*. A listing module
   * needs it, because it reads that property off each record it lists rather
   * than off the page's own record.
   */
  rawFields: Record<string, unknown>;
  record: CaraerRecord | null;
  page: PageContext;
  company: CompanyContext;
  module: { id: string; ref: ModuleRef; kind: ModuleKind };
  editor: EditorContext | null;
}
