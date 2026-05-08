import { createClient } from "@supabase/supabase-js";
import type { Watchlist, Entry } from "./types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const TABLE = "watchlist_entries";

type Row = Entry & { id: string; created_at: string; updated_at: string };

function rowToEntry(r: Row): Entry {
  return {
    ticker: r.ticker,
    exchange: r.exchange,
    currency: r.currency,
    analysis_date: r.analysis_date,
    anchor_price: Number(r.anchor_price),
    bull_target: Number(r.bull_target),
    base_target: Number(r.base_target),
    bear_target: Number(r.bear_target),
    thesis_oneliner: r.thesis_oneliner,
    catalysts: Array.isArray(r.catalysts) ? r.catalysts : [],
    source_url: r.source_url ?? undefined,
    tags: Array.isArray(r.tags) ? r.tags : undefined,
    closed_date: r.closed_date ?? undefined,
    closed_reason: r.closed_reason ?? undefined,
  };
}

function entryToRow(e: Entry) {
  return {
    ticker: e.ticker.toUpperCase(),
    exchange: e.exchange.toUpperCase(),
    currency: e.currency,
    analysis_date: e.analysis_date,
    anchor_price: e.anchor_price,
    bull_target: e.bull_target,
    base_target: e.base_target,
    bear_target: e.bear_target,
    thesis_oneliner: e.thesis_oneliner,
    catalysts: e.catalysts,
    source_url: e.source_url ?? null,
    tags: e.tags ?? null,
    closed_date: e.closed_date ?? null,
    closed_reason: e.closed_reason ?? null,
  };
}

export async function loadWatchlist(): Promise<Watchlist> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase load failed: ${error.message}`);
  const rows = (data ?? []) as Row[];
  const entries = rows.map(rowToEntry);
  const lastUpdated =
    rows.length > 0
      ? rows.map((r) => r.updated_at).sort().slice(-1)[0].slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  return { schema_version: "1.0", last_updated: lastUpdated, entries };
}

export async function addEntry(
  entry: Entry,
): Promise<{ added: true } | { added: false; reason: string }> {
  const { error } = await supabase.from(TABLE).insert(entryToRow(entry));
  if (error) {
    if (error.code === "23505") {
      return {
        added: false,
        reason: `Entry already exists for ${entry.ticker} on ${entry.exchange}`,
      };
    }
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
  return { added: true };
}

export async function removeEntry(
  ticker: string,
  exchange: string,
): Promise<{ removed: true } | { removed: false; reason: string }> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("ticker", ticker.toUpperCase())
    .eq("exchange", exchange.toUpperCase())
    .select();
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  if (!data || data.length === 0) {
    return { removed: false, reason: `No entry found for ${ticker} on ${exchange}` };
  }
  return { removed: true };
}

export async function updateEntry(
  ticker: string,
  exchange: string,
  patch: Partial<Entry>,
): Promise<{ updated: true; entry: Entry } | { updated: false; reason: string }> {
  const patchRow: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "ticker" || k === "exchange") {
      patchRow[k] = String(v).toUpperCase();
    } else {
      patchRow[k] = v;
    }
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(patchRow)
    .eq("ticker", ticker.toUpperCase())
    .eq("exchange", exchange.toUpperCase())
    .select();
  if (error) {
    if (error.code === "23505") {
      return { updated: false, reason: `Updated values would collide with another entry` };
    }
    throw new Error(`Supabase update failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return { updated: false, reason: `No entry found for ${ticker} on ${exchange}` };
  }
  return { updated: true, entry: rowToEntry(data[0] as Row) };
}
