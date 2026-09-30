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
  "SINGLE_LINE",
  "MULTI_LINE",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "RECORD_SINGLE_SELECT",
  "RECORD_MULTI_SELECT",
  "FORM_SINGLE_SELECT",
  "OBJECT_SINGLE_SELECT",
  "OBJECT_MULTI_SELECT",
  "PROPERTY_SINGLE_SELECT",
  "PROPERTY_MULTI_SELECT",
  "SWITCH",
  "MAPPING",
  "FILE",
  "MULTI_FILE",
  /**
   * A list of objects. Library authors set `min` / `max` and `itemFields`;
   * the editor pages through one item at a time instead of growing a form.
   */
  "REPEATABLE",
  "SECRET",
  "ACTION",
] as const;

export type ModuleFieldType = (typeof MODULE_FIELD_TYPES)[number];

/**
 * Field types that make no sense on a CMS module.
 *
 * `SECRET` would put a write-only credential in a public page document, and
 * `ACTION` is a button that invokes a serverless function from a settings
 * screen. Both are rejected by `caraer apps validate`.
 */
export const DISALLOWED_MODULE_FIELD_TYPES: readonly ModuleFieldType[] = [
  "SECRET",
  "ACTION",
];

export type ModuleFieldOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "IN"
  | "NOT_IN"
  | "IS_SET"
  | "IS_NOT_SET";

export interface ModuleFieldCondition {
  field: string;
  operator: ModuleFieldOperator;
  value?: unknown;
}

export interface ModuleFieldOption {
  name: string;
  label: string;
  helpText?: string;
  /** Screenshot URL, or a sketch id such as `card-orb` / `card-badge`. */
  preview?: string;
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
  /**
   * When true, the editor shows this field under a collapsed Advanced settings
   * section unless the field is already inside a titled group. Content (text,
   * images, icons) stays in the main list; styling belongs here. Unlike
   * `hidden`, the field is still editable once opened, and the value is
   * always stored.
   */
  advanced?: boolean;
  options?: ModuleFieldOption[];
  visibleWhen?: ModuleFieldCondition[];
  itemFields?: ModuleField[];
  /** Inclusive lower bound for a `REPEATABLE` list. Defaults to 0. */
  min?: number;
  /** Inclusive upper bound for a `REPEATABLE` list. Defaults to 20. */
  max?: number;
  /** Singular label used in the editor pager, e.g. "Step" or "Card". */
  itemLabel?: string;
  /**
   * Restricts an `OBJECT_*` picker to objects that have every listed trait.
   */
  filterTraits?: string[];
  /**
   * Restricts a `PROPERTY_*` picker to properties of these types
   * (`date`, `string`, …). `filterPropertyTypes` is the settings-schema name.
   */
  allowedPropertyTypes?: string[];
  filterPropertyTypes?: string[];
  /**
   * Restricts a `PROPERTY_*` picker to these format names or types
   * (`date`, `datetime`, `single-line`, …).
   */
  allowedPropertyFormats?: string[];
  filterPropertyFormats?: string[];
}

/** Sidebar expandable. Put fields in `fields`; do not set `group` on a field. */
export interface ModuleFieldGroup {
  group: string;
  fields: ModuleField[];
}

export type ModuleFieldOrGroup = ModuleField | ModuleFieldGroup;

export function isModuleFieldGroup(item: ModuleFieldOrGroup): item is ModuleFieldGroup {
  return (
    typeof (item as ModuleFieldGroup).group === 'string' &&
    (item as ModuleFieldGroup).group.trim() !== '' &&
    Array.isArray((item as ModuleFieldGroup).fields)
  );
}

export function flattenModuleFields(items: ModuleFieldOrGroup[]): ModuleField[] {
  const out: ModuleField[] = [];
  for (const item of items) {
    if (isModuleFieldGroup(item)) out.push(...item.fields);
    else out.push(item);
  }
  return out;
}

/**
 * A named group of fields in the module settings sidebar.
 *
 * Opening a component shows only its fields. Stored values stay a flat map
 * keyed by field name; this is editor organization, not a stored value.
 *
 * In `index.astro`, put full {@link ModuleField} objects in `fields`. On push,
 * `caraer apps` flattens those into the module `fields` list (component order,
 * then leftover top-level fields) and publishes each component with `fields`
 * as name strings only.
 *
 * @example Group content and keep layout on General
 * ```ts
 * export const manifest = {
 *   name: "hero",
 *   label: "Hero",
 *   kind: "section",
 *   category: "hero",
 *   fields: [
 *     { name: "width", label: "Width", type: "SINGLE_SELECT", options: [] },
 *   ],
 *   components: [
 *     {
 *       name: "heading",
 *       label: "Heading",
 *       fields: [
 *         { name: "heading", label: "Heading", type: "MULTI_LINE", required: true },
 *         {
 *           name: "heading_color",
 *           label: "Heading color",
 *           type: "SINGLE_SELECT",
 *           advanced: true,
 *           options: [],
 *         },
 *       ],
 *     },
 *     {
 *       name: "image",
 *       label: "Image",
 *       fields: [
 *         { name: "image", label: "Image", type: "FILE" },
 *         { name: "image_smart", label: "Image from property", type: "SINGLE_LINE" },
 *       ],
 *     },
 *   ],
 * } satisfies ModuleManifest;
 * ```
 *
 * @example Reuse exported field constants from `fields.ts`
 * ```ts
 * import { headingField, bodyField } from "./fields";
 * import { widthField, marginTopField } from "../settings";
 *
 * export const manifest = {
 *   name: "content_block",
 *   label: "Content block",
 *   kind: "section",
 *   category: "content",
 *   fields: [widthField, marginTopField],
 *   components: [
 *     { name: "heading", label: "Heading", fields: [headingField] },
 *     { name: "body", label: "Text", fields: [bodyField] },
 *   ],
 * } satisfies ModuleManifest;
 * ```
 */
export interface ModuleComponent {
  /** snake_case key, unique in the module. */
  name: string;
  /** Row title in the module settings sidebar. */
  label: string;
  fields: ModuleField[];
}

/**
 * Sidebar group in the published module catalog.
 *
 * Same `name` / `label` as in source; `fields` are keys into the flat
 * `fields` array, not nested definitions.
 */
export interface ModuleComponentCatalog {
  name: string;
  label: string;
  fields: string[];
}

/**
 * What a module is used for.
 *
 * `section` composes into a page alongside others; `page` is a complete page in
 * one module; `header` and `footer` fill the site-wide slots that
 * `WebsiteSettings` already models for v1.
 */
export type ModuleKind = "section" | "page" | "header" | "footer";

/** UI frameworks a module may use for islands. */
export const MODULE_FRAMEWORKS = [
  "react",
  "preact",
  "solid",
  "svelte",
  "vue",
] as const;
export type ModuleFramework = (typeof MODULE_FRAMEWORKS)[number];

/**
 * React, Preact and Solid all compile `.jsx`/`.tsx`, so Astro can only tell
 * them apart by path. Islands must live in a folder named after the framework.
 * Svelte and Vue are unambiguous by file extension.
 */
export const JSX_FRAMEWORKS: readonly ModuleFramework[] = [
  "react",
  "preact",
  "solid",
];

/**
 * How the library picker groups a module.
 *
 * Closed on purpose: free text meant the same kind of block landed under a
 * different heading depending on which app shipped it.
 */
export const MODULE_CATEGORIES = [
  "hero",
  "content",
  "listing",
  "layout",
  "media",
  "form",
  "cta",
  "social_proof",
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
  fields: ModuleFieldOrGroup[];
  /**
   * Groups fields into sidebar rows. Opening a component shows only its
   * fields.
   *
   * Use components for multi-field blocks that clutter the main list (image,
   * recruiter, repeatable item shape). Routine copy and layout can stay on
   * top-level `fields` (**General**); a one-field component is usually noise.
   *
   * Component `fields` are merged into the module field list in component
   * order, then any leftover top-level `fields`. Each field `name` may appear
   * only once across all components and the leftover list. Leftovers render as
   * **General**, always open below the named components. Use a manifest component
   * instead of top-level `fields` when that block should be collapsible too.
   *
   * A `foo_smart` field is shown with the `foo` component when `foo` is grouped
   * and `foo_smart` is not listed elsewhere (same rule as the local CMS dev
   * harness).
   *
   * After push, the catalog stores {@link ModuleComponentCatalog} entries
   * (`fields` as name strings). Your Astro module still reads a flat
   * `Astro.props.fields` map; grouping does not change runtime props.
   */
  components?: ModuleComponent[];
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

export function parseModuleRef(
  ref: ModuleRef,
): { app: string; module: string } | null {
  const slash = ref.indexOf("/");
  if (slash <= 0 || slash === ref.length - 1) return null;
  return { app: ref.slice(0, slash), module: ref.slice(slash + 1) };
}
