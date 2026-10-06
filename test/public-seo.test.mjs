import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalUrl,jsonLd,websiteOrigin,sitemapShards,sitemapIndex,sitemapUrls} from '../src/public-seo.ts';
const page=(tenant='alpha',object='articles',environment='main',index=0)=>({recordUuid:`${tenant}-${index}`,object,environment,path:`/${environment}/${object}/${index}`,canonicalUrl:`https://${tenant}.example.test/${environment}/${object}/${index}`,lastModified:'2026-10-01T12:00:00Z'});
test('canonical URLs share a configured origin, remove tracking, and respect overrides',()=>{
 assert.equal(websiteOrigin('alpha.example.test','synthetic'),'https://alpha.example.test');
 assert.equal(canonicalUrl('https://alpha.example.test','/items/1?utm_source=test#section'),'https://alpha.example.test/items/1');
 assert.equal(canonicalUrl('https://alpha.example.test','/items/1','https://beta.example.test/path?tracking=1'),'https://beta.example.test/path');
 assert.throws(()=>canonicalUrl('https://alpha.example.test','/','javascript:alert(1)'));
});
test('arbitrary JSON-LD stays safe in HTML without changing the JSON value',()=>{
 const data={'@type':'Article',description:'</script><script>alert(1)</script>\u2028'};
 const json=jsonLd(data);assert.ok(!json.includes('</script>'));assert.deepEqual(JSON.parse(json),data);
 assert.equal(jsonLd(null),null);assert.equal(jsonLd('raw script'),null);
});
test('two tenants and arbitrary objects group deterministically by environment and object with deduplication',()=>{
 const pages=[page(),page('alpha','events'),page('beta','guides','de'),page(),page('alpha','articles','en')];
 const shards=sitemapShards(pages);assert.equal(shards.length,4);assert.equal(shards.reduce((sum,s)=>sum+s.pages.length,0),4);
 assert.deepEqual(sitemapShards([...pages].reverse()),shards);assert.match(sitemapIndex(shards),/<sitemapindex/);
 assert.ok(sitemapIndex(shards).includes('https://beta.example.test/sitemaps/'));
 const aliases=[page(),{...page(),recordUuid:'other',object:'guides',lastModified:null}];
 assert.deepEqual(sitemapShards(aliases),sitemapShards([...aliases].reverse()));
 assert.throws(()=>sitemapIndex(shards,100),/limit/);
});
test('sitemaps shard at count and byte limits, escape XML, omit unknown dates and obsolete hints',()=>{
 const pages=Array.from({length:7},(_,index)=>page('alpha','arbitrary','main',index));
 assert.deepEqual(sitemapShards(pages,3).map(s=>s.pages.length),[3,3,1]);
 assert.ok(sitemapShards(pages,50_000,450).length>1);
 const xml=sitemapUrls([{...pages[0],lastModified:null}]);assert.ok(!xml.includes('lastmod'));assert.ok(!xml.includes('priority'));assert.ok(!xml.includes('changefreq'));
 assert.match(sitemapUrls(pages),/<lastmod>2026-10-01T12:00:00Z<\/lastmod>/);
 assert.throws(()=>sitemapShards([{...pages[0],canonicalUrl:'https://alpha.example.test/items/1?utm_source=x'}]));
 assert.throws(()=>sitemapShards([{...pages[0],object:''}]));
});
