// Watchlist data types — kept in sync with the skill schema.

export interface Entry {
  ticker: string;
  exchange: string;
  currency: string;
  analysis_date: string; // ISO YYYY-MM-DD
  anchor_price: number;
  bull_target: number;
  base_target: number;
  bear_target: number;
  thesis_oneliner: string;
  catalysts: string[];
  source_url?: string;
  tags?: string[];
  closed_date?: string;
  closed_reason?: string;
}

export interface Watchlist {
  schema_version: string;
  last_updated: string; // ISO YYYY-MM-DD
  entries: Entry[];
}

export type Grade = "WIN" | "BULL_HIT" | "NEUTRAL" | "MISS" | "UNGRADED";

export interface PriceData {
  ticker: string;
  anchor_date_used: string;
  anchor_price_actual: number;
  current_price: number;
  current_date: string;
  used_substitute: boolean;
  error?: string;
}

export interface BenchmarkData {
  symbol: string;
  anchor_dates: Record<
    string,
    { anchor_date: string; anchor_price: number; used_substitute: boolean }
  >;
  latest: { date: string; price: number };
  error?: string;
}

export interface EnrichedEntry extends Entry {
  current_price: number | null;
  current_date: string | null;
  stock_return: number | null; // decimal, not percent
  benchmark_return: number | null;
  excess_return: number | null;
  grade: Grade;
  price_error?: string;
}
