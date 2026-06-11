// lib/news.js
'use strict';

const FEED_URL = 'http://feeds.bbci.co.uk/sport/football/rss.xml';
const MAX_ITEMS = 12;

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function tag(block, name) {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  return m ? decodeEntities(m[1]) : '';
}

function parseRss(xml) {
  const items = [];
  const re = /<item[\s>][\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) && items.length < MAX_ITEMS) {
    const title = tag(m[0], 'title');
    const link = tag(m[0], 'link');
    if (title && link) items.push({ title, link, pubDate: tag(m[0], 'pubDate') });
  }
  return items;
}

// Own in-memory cache (Fetcher is JSON-only; RSS is text).
function makeNewsSource({ fetchImpl = globalThis.fetch, url = FEED_URL, ttlMs = 15 * 60 * 1000 } = {}) {
  let cache = { fetchedAt: 0, items: [] };
  return {
    async get() {
      if (Date.now() - cache.fetchedAt < ttlMs && cache.items.length) return { ...cache };
      try {
        const res = await fetchImpl(url, { headers: { 'user-agent': 'worldcup2026-hub' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        cache = { fetchedAt: Date.now(), items: parseRss(await res.text()) };
      } catch {
        // keep stale items if we have them; otherwise empty
        if (!cache.items.length) cache = { fetchedAt: 0, items: [] };
      }
      return { ...cache };
    }
  };
}

module.exports = { parseRss, makeNewsSource, FEED_URL };
