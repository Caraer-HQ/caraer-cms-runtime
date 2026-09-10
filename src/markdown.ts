import { createMarkdownProcessor, type MarkdownRenderer } from '@astrojs/markdown-remark';

let renderer: Promise<MarkdownRenderer> | undefined;

/**
 * Shared markdown renderer.
 *
 * Building one is expensive, so it is created once per server process rather
 * than per render. Uses Astro's own pipeline so CMS copy renders the same way
 * markdown does everywhere else in the platform.
 */
function getRenderer(): Promise<MarkdownRenderer> {
  renderer ??= createMarkdownProcessor({ gfm: true, smartypants: true, syntaxHighlight: false });
  return renderer;
}

const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;

/** Whether a stored value is already HTML rather than markdown or plain text. */
export function looksLikeHtml(value: string): boolean {
  return HTML_PATTERN.test(value);
}

/**
 * Renders CMS copy to HTML.
 *
 * Editors produce three shapes depending on the field type and how the value
 * arrived: HTML (rich text), markdown, or plain text with newlines. Detecting
 * rather than requiring the caller to declare it keeps module code free of
 * defensive branching.
 */
export async function renderRichText(value: unknown): Promise<string> {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.trim() === '') return '';
  if (looksLikeHtml(text)) return text;

  const { code } = await (await getRenderer()).render(text);
  return code;
}
