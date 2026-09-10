import type { CaraerTokenSet } from '@caraer/cms-tokens';
import type { CompanyContext, EditorContext, PageContext } from './document.ts';

export interface CaraerMenuItem {
  label: string;
  url: string | null;
  icon?: string | null;
  items?: CaraerMenuItem[];
}

export interface CaraerMenu {
  location: string;
  title?: string | null;
  items: CaraerMenuItem[];
}

export interface CaraerFormField {
  uuid: string;
  name: string;
  label: string;
  type: string;
  format?: string | null;
  required?: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: Array<{ name: string; label: string }>;
}

export interface CaraerFormStep {
  title?: string | null;
  description?: string | null;
  fields: CaraerFormField[];
}

export interface CaraerForm {
  uuid: string;
  name: string;
  label: string;
  wizard: boolean;
  steps: CaraerFormStep[];
  submitLabel?: string | null;
  thankYouMessage?: string | null;
  redirectUrl?: string | null;
}

export interface RecordListQuery {
  object: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  filter?: Record<string, unknown>;
}

export interface RecordListResult {
  total: number;
  records: Array<{
    uuid: string;
    slug?: string | null;
    url?: string | null;
    properties: Record<string, unknown>;
    parsedProperties: Record<string, unknown>;
  }>;
}

/**
 * The server-side capabilities platform components rely on.
 *
 * Modules never construct a backend client themselves. `caraer-web` populates
 * this on `Astro.locals` in middleware, which keeps API base URLs, tenant
 * headers, auth and caching entirely inside the runtime, and means a module
 * behaves identically in the local dev harness where these are stubbed.
 */
export interface CaraerLocals {
  company: CompanyContext;
  page: PageContext | null;
  tokens: CaraerTokenSet;
  editor: EditorContext | null;

  /** Resolves a possibly-signed asset key to a stable, cacheable URL. */
  assetUrl(key: string | null | undefined): string | null;

  /** Builds a site-absolute path, adding the locale prefix when needed. */
  localePath(path: string): string;

  getMenu(location: string): Promise<CaraerMenu | null>;
  getForm(formUuidOrName: string): Promise<CaraerForm | null>;
  listRecords(query: RecordListQuery): Promise<RecordListResult>;

  /**
   * Installed app settings for this company. SECRET fields are omitted.
   * Server-only — never put the result on the page document.
   */
  getAppSettings(appName: string): Promise<Record<string, unknown>>;

  /** Adds a cache tag to the current response. */
  tag(...tags: string[]): void;
}
