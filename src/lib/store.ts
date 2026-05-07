import { Redis } from "@upstash/redis";
import type { Watchlist, Entry } from "./types";
import { entryKey } from "./validate";

const redis = Redis.fromEnv();
const KEY = "watchlist:v1";

const EMPTY: Watchlist = {
  schema_version: "1.0",
  last_updated: new Date().toISOString().slice(0, 10),
  entries: [],
};

export async function loadWatchlist(): Promise<Watchlist> {
  const data = await redis.get<Watchlist>(KEY);
  if (!data) return { ...EMPTY };
  // Defensive: ensure entries array exists
  if (!Array.isArray(data.entries)) data.entries = [];
  return data;
}

export async function saveWatchlist(wl: Watchlist): Promise<void> {
  wl.last_updated = new Date().toISOString().slice(0, 10);
  await redis.set(KEY, wl);
}

export async function addEntry(entry: Entry): Promise<{ added: true } | { added: false; reason: string }> {
  const wl = await loadWatchlist();
  const key = entryKey(entry);
  const existing = wl.entries.find((e) => entryKey(e) === key);
  if (existing) {
    return { added: false, reason: `Entry already exists for ${entry.ticker} on ${entry.exchange}` };
  }
  wl.entries.push(entry);
  await saveWatchlist(wl);
  return { added: true };
}

export async function removeEntry(
  ticker: string,
  exchange: string,
): Promise<{ removed: true } | { removed: false; reason: string }> {
  const wl = await loadWatchlist();
  const key = entryKey({ ticker, exchange });
  const before = wl.entries.length;
  wl.entries = wl.entries.filter((e) => entryKey(e) !== key);
  if (wl.entries.length === before) {
    return { removed: false, reason: `No entry found for ${ticker} on ${exchange}` };
  }
  await saveWatchlist(wl);
  return { removed: true };
}

export async function updateEntry(
  ticker: string,
  exchange: string,
  patch: Partial<Entry>,
): Promise<{ updated: true; entry: Entry } | { updated: false; reason: string }> {
  const wl = await loadWatchlist();
  const key = entryKey({ ticker, exchange });
  const idx = wl.entries.findIndex((e) => entryKey(e) === key);
  if (idx === -1) {
    return { updated: false, reason: `No entry found for ${ticker} on ${exchange}` };
  }
  wl.entries[idx] = { ...wl.entries[idx], ...patch };
  await saveWatchlist(wl);
  return { updated: true, entry: wl.entries[idx] };
}
