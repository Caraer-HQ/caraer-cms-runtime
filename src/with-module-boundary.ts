export interface ModuleBoundaryOptions {
  moduleRef: string;
  /** Stack traces and the raw message. Editor, local preview, `astro dev`. */
  detail?: boolean;
}

const htmlStringSymbol = Symbol.for('astro:html-string');

class HTMLString extends String {
  [htmlStringSymbol] = true;
}

function markHTMLString(value: string) {
  return new HTMLString(value);
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error == null) return '';
  return String(error);
}

function errorStack(error: unknown): string {
  return error instanceof Error && error.stack ? error.stack : '';
}

/** Markup for a failed module slot. Safe to `set:html`. */
export function renderModuleErrorHtml(options: ModuleBoundaryOptions, error: unknown): string {
  const moduleRef = options.moduleRef || 'unknown';
  const detail = Boolean(options.detail);
  const message = errorMessage(error);
  const stack = detail ? errorStack(error) : '';
  const title = detail ? 'This module failed to render' : 'This section could not be displayed';
  const body = detail
    ? `<code>${escapeHTML(moduleRef)}</code>${
        message ? `<span class="caraer-module-error__message">${escapeHTML(message)}</span>` : ''
      }`
    : 'The rest of the page is unaffected.';
  const details = stack
    ? `<details><summary>Details</summary><pre>${escapeHTML(stack)}</pre></details>`
    : '';

  return `<style>.caraer-module-error{display:grid;gap:var(--caraer-space-2xs);margin:var(--caraer-space-md);padding:var(--caraer-space-md);border:1px dashed var(--caraer-color-destructive);border-radius:var(--caraer-radius-md);background:var(--caraer-color-gray-100);color:var(--caraer-color-gray-800);font-family:var(--caraer-font-body);font-size:var(--caraer-size-small);line-height:var(--caraer-leading-small)}.caraer-module-error strong{color:var(--caraer-color-destructive);font-weight:var(--caraer-weight-h4,600)}.caraer-module-error code{font-size:.85em}.caraer-module-error__message{display:block;margin-top:var(--caraer-space-2xs)}.caraer-module-error details{margin-top:var(--caraer-space-xs)}.caraer-module-error summary{cursor:pointer;color:var(--caraer-color-gray-600)}.caraer-module-error pre{margin:var(--caraer-space-2xs) 0 0;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:.8em;color:var(--caraer-color-gray-700)}</style><div class="caraer-module-error" data-caraer-module-error="${escapeHTML(moduleRef)}" role="alert"><strong>${title}</strong><span>${body}</span>${details}</div>`;
}

function fail(options: ModuleBoundaryOptions, error: unknown) {
  console.error(`CMS module ${options.moduleRef} failed to render`, error);
  return markHTMLString(renderModuleErrorHtml(options, error));
}

/** Framework islands cannot be wrapped: a new factory identity breaks `client:*`. */
export function moduleHasIslands(manifest: { frameworks?: Record<string, unknown> } | null | undefined) {
  return Boolean(manifest?.frameworks && Object.keys(manifest.frameworks).length > 0);
}

/**
 * Wraps a module so a throw in its frontmatter becomes an error card instead of
 * a 500 for the whole page.
 *
 * Used by the local CMS preview, which renders one module at a time. The site
 * renderer uses `CaraerModuleCatch.astro` instead, so sibling island modules on
 * the same page keep their factory identity.
 *
 * Modules that declare `frameworks` are returned unchanged.
 */
export function withModuleBoundary(
  Component: any,
  options: ModuleBoundaryOptions,
  manifest?: { frameworks?: Record<string, unknown> } | null,
) {
  if (typeof Component !== 'function' || moduleHasIslands(manifest)) {
    return Component;
  }

  const fn = async (...args: unknown[]) => {
    try {
      return await Component(...args);
    } catch (error) {
      return fail(options, error);
    }
  };
  fn.isAstroComponentFactory = true;
  fn.moduleId = Component.moduleId;
  fn.propagation = Component.propagation;
  return fn;
}
