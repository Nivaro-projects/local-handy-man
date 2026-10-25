// @ts-check
import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('  PUBLIC SEO ROUTES, INDEXING BOUNDARY & STRUCTURED DATA TEST SUITE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf-8');

console.log('Suite 1: Crawl boundaries');

runTest('robots.txt blocks every private shell and points at the sitemap', () => {
  const robots = read('public/robots.txt');
  for (const route of ['/admin', '/app', '/tech', '/technician', '/customer', '/login', '/reset-password']) {
    assert.ok(robots.includes(`Disallow: ${route}\n`), `robots.txt must disallow ${route}`);
  }
  assert.ok(robots.includes('Sitemap: https://nivaro.in/sitemap.xml'), 'robots.txt must reference the sitemap');
});

runTest('sitemap.xml lists only the public marketing URLs', () => {
  const sitemap = read('public/sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepStrictEqual(locs, ['https://nivaro.in/', 'https://nivaro.in/services']);
});

runTest('vercel.json sends X-Robots-Tag noindex for private paths', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const rule = vercel.headers.find((entry) =>
    entry.headers.some((header) => header.key === 'X-Robots-Tag' && header.value.includes('noindex'))
  );
  assert.ok(rule, 'vercel.json needs an X-Robots-Tag noindex rule');
  for (const route of ['admin', 'app', 'tech', 'customer', 'login']) {
    assert.ok(rule.source.includes(route), `X-Robots-Tag rule must cover ${route}`);
  }
});

console.log('\nSuite 2: Route metadata');

runTest('App.tsx marks private shells noindex and routes /services to the catalog page', () => {
  const app = read('src/App.tsx');
  assert.ok(app.includes('const PRIVATE_SEO'), 'App.tsx must define PRIVATE_SEO');
  assert.ok(/PRIVATE_SEO[\s\S]*noindex: true/.test(app), 'PRIVATE_SEO must set noindex');
  assert.ok(app.includes("currentPath === '/services'"), 'App.tsx must detect /services');
  assert.ok(app.includes('<ServicesCatalogPage'), 'App.tsx must render ServicesCatalogPage');
});

runTest('index.html carries local geo meta, canonical and absolute OG URLs', () => {
  const html = read('index.html');
  assert.ok(html.includes('<link rel="canonical" href="https://nivaro.in/" />'), 'canonical missing');
  assert.ok(html.includes('name="geo.placename" content="Chirala"'), 'geo.placename missing');
  assert.ok(html.includes('content="IN-AP"'), 'geo.region missing');
  assert.ok(html.includes('property="og:url" content="https://nivaro.in/"'), 'absolute og:url missing');
  assert.ok(html.includes('content="index, follow'), 'default robots directive missing');
});

runTest('homepage H1 targets the Chirala local intent', () => {
  const hero = read('src/components/Hero.tsx');
  const h1 = hero.match(/<h1[^>]*>\s*([\s\S]*?)<\/h1>/);
  assert.ok(h1, 'Hero must render an h1');
  assert.ok(/Chirala/i.test(h1[1]), 'Hero h1 must name Chirala');
  assert.ok(/electricians/i.test(h1[1]), 'Hero h1 must name the service category');
});

console.log('\nSuite 3: Structured data');

runTest('business JSON-LD is a local business with area, hours and no invented ratings', () => {
  const seo = read('src/lib/seo.ts');
  assert.ok(seo.includes("'HomeAndConstructionBusiness'"), 'LocalBusiness subtype missing');
  assert.ok(seo.includes("'@type': 'City', name: SITE.city"), 'areaServed city missing');
  assert.ok(seo.includes('openingHoursSpecification'), 'opening hours missing');
  assert.ok(!seo.includes('aggregateRating'), 'must not publish an unverified aggregateRating');
  assert.ok(!seo.includes('reviewCount'), 'must not publish unverified review counts');
});

runTest('service catalog page exposes H1, breadcrumbs and FAQ structured data', () => {
  const page = read('src/pages/ServicesCatalogPage.tsx');
  assert.ok(page.includes('useSeo(CATALOG_SEO)'), 'catalog page must apply its own metadata');
  assert.ok(page.includes('breadcrumbLd('), 'catalog page must emit breadcrumbs');
  assert.ok(page.includes('faqLd(FAQS)'), 'catalog page must emit FAQPage data');
  assert.ok(/<h1[^>]*>[\s\S]*?Electrical/.test(page), 'catalog page needs an intent-led h1');
  assert.ok(/<h1[^>]*>[\s\S]*?Chirala/.test(page), 'catalog h1 must name Chirala');
});

console.log('\n========================================================================');
console.log(`  ${passedTests}/${totalTests} SEO TESTS PASSED`);
console.log('========================================================================');
