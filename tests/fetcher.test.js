// tests/fetcher.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Fetcher } = require('../lib/fetcher');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-fetch-'));
  let calls = 0;
  let fail = false;
  const fakeFetch = async (url) => {
    calls++;
    if (fail) throw new Error('network down');
    return { ok: true, json: async () => ({ url, n: calls }) };
  };
  const f = new Fetcher({ cacheDir: dir, fetchImpl: fakeFetch });

  // 1. first call hits the network
  const a = await f.get('https://example.com/x', 60000);
  assert.strictEqual(a.n, 1, 'first call fetches');

  // 2. second call within TTL is served from cache
  const b = await f.get('https://example.com/x', 60000);
  assert.strictEqual(b.n, 1, 'cached within TTL');
  assert.strictEqual(calls, 1);

  // 3. TTL 0 forces refetch
  const c = await f.get('https://example.com/x', 0);
  assert.strictEqual(c.n, 2, 'ttl 0 refetches');

  // 4. network failure falls back to stale disk cache
  fail = true;
  const d = await f.get('https://example.com/x', 0);
  assert.strictEqual(d.n, 2, 'stale-on-error returns last good payload');

  // 5. failure with no cache at all throws
  let threw = false;
  try { await f.get('https://example.com/never-seen', 0); } catch { threw = true; }
  assert.ok(threw, 'no cache + failure throws');

  // 6. fresh Fetcher instance reads the disk cache (memory cold)
  fail = false;
  const f2 = new Fetcher({ cacheDir: dir, fetchImpl: fakeFetch });
  const e = await f2.get('https://example.com/x', 60 * 60 * 1000);
  assert.strictEqual(e.n, 2, 'disk cache survives restart');

  console.log('fetcher.test.js OK');
})().catch((err) => { console.error(err); process.exit(1); });
