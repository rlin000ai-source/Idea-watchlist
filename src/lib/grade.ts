import type { Entry, EnrichedEntry, Grade } from "./types";
import { fetchPricesForEntries, PriceResult } from "./prices";

export function gradeEntry(
  entry: Entry,
  currentPrice: number | null,
): Grade {
  if (currentPrice === null) return "UNGRADED";
  if (
    typeof entry.bull_target !== "number" ||
    typeof entry.base_target !== "number" ||
    typeof entry.bear_target !== "number"
  ) {
    return "UNGRADED";
  }
  if (currentPrice >= entry.bull_target) return "BULL_HIT";
  if (currentPrice >= entry.base_target) return "WIN";
  if (currentPrice >= entry.bear_target) return "NEUTRAL";
  return "MISS";
}

export async function enrichEntries(entries: Entry[]): Promise<EnrichedEntry[]> {
  const queries = entries.map((e) => ({
    ticker: e.ticker,
    analysis_date: e.analysis_date,
  }));
  const { results } = await fetchPricesForEntries(queries);

  const byTicker = new Map<string, PriceResult>();
  for (const r of results) byTicker.set(r.ticker, r);

  return entries.map((e): EnrichedEntry => {
    const pr = byTicker.get(e.ticker);
    const current = pr?.latest?.price ?? null;
    const anchorActual = pr?.anchor?.price ?? null;
    const bmCurrent = pr?.benchmark.latest?.price ?? null;
    const bmAnchor = pr?.benchmark.anchor?.price ?? null;

    let stockReturn: number | null = null;
    let benchmarkReturn: number | null = null;
    let excessReturn: number | null = null;
    if (current !== null && anchorActual !== null) {
      stockReturn = current / anchorActual - 1;
    }
    if (bmCurrent !== null && bmAnchor !== null) {
      benchmarkReturn = bmCurrent / bmAnchor - 1;
    }
    if (stockReturn !== null && benchmarkReturn !== null) {
      excessReturn = stockReturn - benchmarkReturn;
    }

    return {
      ...e,
      current_price: current,
      current_date: pr?.latest?.date ?? null,
      stock_return: stockReturn,
      benchmark_return: benchmarkReturn,
      excess_return: excessReturn,
      grade: gradeEntry(e, current),
      price_error: pr?.error,
    };
  });
}
