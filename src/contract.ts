/**
 * The Caraer CMS v2 module contract.
 *
 * These types describe what an app developer declares in `module.caraer.json`
 * and what their `index.astro` receives as props. The same shapes are validated
 * by `caraer apps validate` and by the backend when a build is deployed, so the
 * three stay in step.
 */

/**
 * Field types, mirroring `AppSettingFieldType` in the backend exactly.
 *
 * Reusing the app settings types rather than inventing CMS-specific ones means
 * the Flutter builder renders module fields with the widgets it already has.
 */
export const MODULE_FIELD_TYPES = [
  'SINGLE_LINE',
  'MULTI_LINE',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'RECORD_SINGLE_SELECT',
  'RECORD_MULTI_SELECT',
  'OBJECT_SINGLE_SELECT',
  'OBJECT_MULTI_SELECT',
  'PROPERTY_SINGLE_SELECT',
  'PROPERTY_MULTI_SELECT',
  'SWITCH',
  'MAPPING',
  'FILE',
  'MULTI_FILE',
  'SECRET',
  'ACTION',
] as const;

export type ModuleFieldType = (typeof MODULE_FIELD_TYPES)[number];

/**
 * Field types that make no sense on a CMS module.
 *
 * `SECRET` would put a write-only credential in a public page document, and
 * `ACTION` is a button that invokes a serverless function from a settings
 * screen. Both are rejected by `caraer apps validate`.
 */
export const DISALLOWED_MODULE_FIELD_TYPES: readonly ModuleFieldType[] = ['SECRET', 'ACTION'];

export type ModuleFieldOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'IS_SET'
  | 'IS_NOT_SET';

export interface ModuleFieldCondition {
  field: string;
  operator: ModuleFieldOperator;
  value?: unknown;
}

export interface ModuleFieldOption {
  name: string;
  label: string;
  helpText?: string;
}

export interface ModuleField {
  /** snake_case key. Becomes the property name on `Astro.props.fields`. */
  name: string;
  label: string;
  type: ModuleFieldType;
  required?: boolean;
  helpText?: string;
  defaultValue?: unknown;
  /** Hidden from the editor sidebar but still stored and passed to the module. */
  hidden?: boolean;
  options?: ModuleFieldOption[];
  visibleWhen?: ModuleFieldCondition[];
  /**
   * Restricts an `OBJECT_*` or `PROPERTY_*` field to a subset.
   *
   * For a `PROPERTY_SINGLE_SELECT` this is what turns a free property picker
   * into "pick a text property on the object this page belongs to".
   */
  allowedPropertyTypes?: string[];
  allowedPropertyFormats?: string[];
}

/**
 * What a module is used for.
 *
 * `section` composes into a page alongside others; `page` is a complete page in
 * one module; `header` and `footer` fill the site-wide slots that
 * `WebsiteSettings` already models for v1.
 */
export type ModuleKind = 'section' | 'page' | 'header' | 'footer';

/** UI frameworks a module may use for islands. */
export const MODULE_FRAMEWORKS = ['react', 'preact', 'solid', 'svelte', 'vue'] as const;
export type ModuleFramework = (typeof MODULE_FRAMEWORKS)[number];

/**
 * React, Preact and Solid all compile `.jsx`/`.tsx`, so Astro can only tell
 * them apart by path. Islands must live in a folder named after the framework.
 * Svelte and Vue are unambiguous by file extension.
 */
export const JSX_FRAMEWORKS: readonly ModuleFramework[] = ['react', 'preact', 'solid'];

/**
 * How the library picker groups a module.
 *
 * Closed on purpose: free text meant the same kind of block landed under a
 * different heading depending on which app shipped it.
 */
export const MODULE_CATEGORIES = [
  'hero',
  'content',
  'listing',
  'layout',
  'media',
  'form',
  'cta',
  'social_proof',
] as const;

export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export interface ModuleManifest {
  name: string;
  label: string;
  kind: ModuleKind;
  description?: string;
  /** Icon shown in the builder's module library. */
  icon?: string;
  /** Groups the module in the library picker. */
  category: ModuleCategory;
  fields: ModuleField[];
  /**
   * Frameworks this module's islands use, with the major range it targets.
   *
   * A build hoists one copy of each framework, so two installed apps cannot
   * pull different majors. `caraer apps push` rejects a range that excludes the
   * major pinned by the platform version, turning the conflict into a
   * publish-time error for one developer instead of a build failure on a
   * customer's live site.
   */
  frameworks?: Partial<Record<ModuleFramework, string>>;
  /** Screenshot URL shown in the library picker. */
  preview?: string;
}

/** A module's identity once it is published: `<app_name>/<module_name>`. */
export type ModuleRef = string;

export function moduleRef(appName: string, moduleName: string): ModuleRef {
  return `${appName}/${moduleName}`;
}

export function parseModuleRef(ref: ModuleRef): { app: string; module: string } | null {
  const slash = ref.indexOf('/');
  if (slash <= 0 || slash === ref.length - 1) return null;
  return { app: ref.slice(0, slash), module: ref.slice(slash + 1) };
}
