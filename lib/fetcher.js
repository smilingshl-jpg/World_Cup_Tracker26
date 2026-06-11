// lib/fetcher.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Fetcher {
  constructor({ cacheDir, fetchImpl } = {}) {
    this.cacheDir = cacheDir || path.join(__dirname, '..', 'data', 'cache');
    this.fetchImpl = fetchImpl || globalThis.fetch;
    this.mem = new Map(); // key -> { fetchedAt, body }
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  _key(url) {
    return crypto.createHash('sha1').update(url).digest('hex');
  }

  _diskPath(key) {
    return path.join(this.cacheDir, key + '.json');
  }

  _readDisk(key) {
    try {
      return JSON.parse(fs.readFileSync(this._diskPath(key), 'utf8'));
    } catch {
      return null;
    }
  }

  async get(url, ttlMs) {
    const key = this._key(url);
    const now = Date.now();

    let entry = this.mem.get(key) || this._readDisk(key);
    if (entry && now - entry.fetchedAt < ttlMs) {
      this.mem.set(key, entry);
      return entry.body;
    }

    try {
      const res = await this.fetchImpl(url, { headers: { 'user-agent': 'worldcup2026-hub' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.json();
      entry = { fetchedAt: now, body };
      this.mem.set(key, entry);
      fs.writeFileSync(this._diskPath(key), JSON.stringify(entry));
      return body;
    } catch (err) {
      if (entry) return entry.body; // stale-on-error
      throw err;
    }
  }
}

module.exports = { Fetcher };
