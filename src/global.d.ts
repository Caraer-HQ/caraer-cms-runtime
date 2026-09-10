import type { CaraerRecord } from './document.ts';

/**
 * `window.caraer`, available to any client-side script on a rendered page.
 *
 * Mirrors v1's API exactly so a company's existing custom JS keeps working
 * after moving to v2. Prefer `Astro.props.record` in a module: it renders
 * server-side and is visible to crawlers.
 */
export interface CaraerWindowApi {
  record: CaraerRecord;
  page: {
    uuid: string;
    title: string | null;
    slug: string | null;
    locale: string;
    state: 'draft' | 'published';
  } | null;
  company: { uuid: string; name: string; subdomain: string } | null;

  /** The stored value, e.g. an epoch for a date property. */
  getInternalProperty(name: string): unknown;

  /** The display value a visitor would read. */
  getParsedProperty(name: string): unknown;

  /** Alias for the parsed value. */
  getProperty(name: string): unknown;
}

declare global {
  interface Window {
    caraer?: CaraerWindowApi;
  }

  interface DocumentEventMap {
    /** Fired once `window.caraer` is populated. */
    'caraer:ready': CustomEvent<CaraerWindowApi>;
  }
}

export {};
