/** Provider-independent URL, JSON-LD and sitemap rules shared by the site renderers. */
export interface PublicPageDescriptor {
  recordUuid: string;
  object: string;
  environment: string;
  path: string;
  canonicalUrl: string;
  lastModified: string | null;
}
export interface SeoMetadata {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  structuredData?: unknown;
}
export function canonicalUrl(base: string, path: string, override?: string): string {
  const url = new URL(override?.trim() || path, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid canonical URL');
  url.search = ''; url.hash = '';
  return url.toString();
}
export function websiteOrigin(domain: string | null | undefined, subdomain: string | null | undefined): string {
  const configured = domain?.trim() || (subdomain ? `${subdomain}.caraer.com` : '');
  if (!configured) throw new Error('Website domain is not configured');
  return new URL(configured.includes('://') ? configured : `https://${configured}`).origin;
}
export function jsonLd(structuredData: unknown): string | null {
  if (!structuredData || typeof structuredData !== 'object') return null;
  return JSON.stringify(structuredData).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;'}[char]!));
}
const prefix = '<?xml version="1.0" encoding="UTF-8"?>';
const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
export function urlEntry(page: PublicPageDescriptor): string {
  const date = page.lastModified && !Number.isNaN(Date.parse(page.lastModified)) ? page.lastModified : null;
  return `<url><loc>${escapeXml(page.canonicalUrl)}</loc>${date ? `<lastmod>${escapeXml(date)}</lastmod>` : ''}</url>`;
}
export interface SitemapShard { id: string; origin: string; pages: PublicPageDescriptor[] }
export function sitemapShards(pages: PublicPageDescriptor[], maxUrls = 50_000, maxBytes = 50 * 1024 * 1024): SitemapShard[] {
  const groups = new Map<string, PublicPageDescriptor[]>();
  const seen = new Set<string>();
  // Sorting makes shards deterministic when discovery order changes.
  const order = (page: PublicPageDescriptor) => JSON.stringify([page.canonicalUrl, page.environment, page.object, page.recordUuid, page.path, page.lastModified]);
  for (const page of [...pages].sort((a,b) => order(a).localeCompare(order(b)))) {
    if (!page.recordUuid || !page.object || !page.environment || !page.canonicalUrl) throw new Error('Incomplete public page descriptor');
    const url = canonicalUrl(page.canonicalUrl, page.canonicalUrl);
    if (url !== page.canonicalUrl) throw new Error('Non-canonical public page URL');
    if (seen.has(url)) continue;
    seen.add(url);
    const group = JSON.stringify([new URL(url).origin, page.environment, page.object]);
    const entries = groups.get(group) ?? []; entries.push(page); groups.set(group, entries);
  }
  const shards: SitemapShard[] = [];
  for (const [group, entries] of groups) {
    const [origin, environment, object] = JSON.parse(group) as string[];
    const key = Buffer.from(JSON.stringify([environment, object, origin])).toString('base64url');
    let slice: PublicPageDescriptor[] = [], size = 150, index = 0;
    const push = () => { shards.push({ id: `${key}.${index++}.xml`, origin, pages: slice }); slice = []; size = 150; };
    for (const entry of entries) {
      const bytes = Buffer.byteLength(urlEntry(entry));
      if (bytes + 150 > maxBytes) throw new Error('Sitemap URL exceeds shard size limit');
      if (slice.length && (slice.length >= maxUrls || size + bytes > maxBytes)) push();
      slice.push(entry); size += bytes;
    }
    if (slice.length) push();
  }
  if (shards.length > 50_000) throw new Error('Sitemap index exceeds the sitemap limit');
  return shards;
}
export function sitemapIndex(shards: SitemapShard[], maxBytes = 50 * 1024 * 1024): string {
  const xml = `${prefix}<sitemapindex xmlns="${namespace}">${shards.map(shard => `<sitemap><loc>${escapeXml(`${shard.origin}/sitemaps/${shard.id}`)}</loc></sitemap>`).join('')}</sitemapindex>`;
  if (shards.length > 50_000 || Buffer.byteLength(xml) > maxBytes) throw new Error('Sitemap index exceeds the sitemap limit');
  return xml;
}
export function sitemapUrls(pages: PublicPageDescriptor[]): string {
  return `${prefix}<urlset xmlns="${namespace}">${pages.map(urlEntry).join('')}</urlset>`;
}
