// tests/news.test.js
'use strict';
const assert = require('assert');
const { parseRss, makeNewsSource } = require('../lib/news');

const xml = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Spain cruise past rivals]]></title><link>https://bbc.co.uk/1</link><pubDate>Thu, 11 Jun 2026 10:00:00 GMT</pubDate></item>
<item><title>Mexico &amp; the opening night</title><link>https://bbc.co.uk/2</link><pubDate>Thu, 11 Jun 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

const items = parseRss(xml);
assert.strictEqual(items.length, 2);
assert.strictEqual(items[0].title, 'Spain cruise past rivals');
assert.strictEqual(items[1].title, 'Mexico & the opening night');
assert.strictEqual(items[0].link, 'https://bbc.co.uk/1');
assert.ok(items[0].pubDate.includes('2026'));

(async () => {
  let calls = 0;
  const src = makeNewsSource({
    fetchImpl: async () => { calls++; return { ok: true, text: async () => xml }; },
    ttlMs: 60000
  });
  const a = await src.get();
  assert.strictEqual(a.items.length, 2);
  await src.get();
  assert.strictEqual(calls, 1, 'cached within ttl');

  const bad = makeNewsSource({ fetchImpl: async () => { throw new Error('down'); }, ttlMs: 0 });
  const b = await bad.get();
  assert.deepStrictEqual(b.items, [], 'failure -> empty items, no throw');
  console.log('news.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
