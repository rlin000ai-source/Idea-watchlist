// Yahoo Finance price fetcher.
// Server-side only — runs in Vercel serverless functions.

interface YahooSeries {
  series: Array<[string, number]>; // [date, close]
  error?: string;
}

const UA = "Mozilla/5.0 (compatible; watchlist/1.0)";

function rangeForLookback(earliestDate: string): string {
  const earliest = new Date(earliestDate);
  const today = new Date();
  const days = Math.ceil((today.getTime() - earliest.getTime()) / 86400000) + 30;
  if (days <= 31) return "1mo";
  if (days <= 92) return "3mo";
  if (days <= 183) return "6mo";
  if (days <= 366) return "1y";
  if (days <= 732) return "2y";
  return "5y";
}

async function fetchYahoo(ticker: string, range: string): Promise<YahooSeries> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?interval=1d&range=${range}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return { series: [], error: `HTTP ${res.status}` };
    const json: any = await res.json();
    if (json.chart?.error) return { series: [], error: JSON.stringify(json.chart.error) };
    const result = json.chart?.result?.[0];
    if (!result) return { series: [], error: "no result" };
    const ts: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const series: Array<[string, number]> = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (c === null || c === undefined) continue;
      const d = new Date(ts[i] * 1000).toISOString().slice(0, 10);
      series.push([d, c]);
    }
    return { series };
  } catch (e: any) {
    return { series: [], error: e.message || "fetch failed" };
  }
}

function findAnchor(
  series: Array<[string, number]>,
  targetDate: string,
): { date: string; price: number; substitute: boolean } | null {
  let best: [string, number] | null = null;
  for (const [d, p] of series) {
    if (d <= targetDate) best = [d, p];
    else break;
  }
  if (!best) return null;
  return { date: best[0], price: best[1], substitute: best[0] !== targetDate };
}

export interface PriceQuery {
  ticker: string;
  analysis_date: string;
  benchmark?: string; // defaults to ^GSPC
}

export interface PriceResult {
  ticker: string;
  anchor: { date: string; price: number; substitute: boolean } | null;
  latest: { date: string; price: number } | null;
  benchmark: {
    symbol: string;
    anchor: { date: string; price: number; substitute: boolean } | null;
    latest: { date: string; price: number } | null;
  };
  error?: string;
}

export async function fetchPricesForEntries(queries: PriceQuery[]): Promise<{
  fetched_at: string;
  results: PriceResult[];
}> {
  if (queries.length === 0) {
    return { fetched_at: new Date().toISOString(), results: [] };
  }
  const earliest = queries.map((q) => q.analysis_date).sort()[0];
  const range = rangeForLookback(earliest);

  // Group by benchmark to minimize fetches
  const benchmarks = new Set(queries.map((q) => q.benchmark || "^GSPC"));
  const benchmarkSeries: Record<string, YahooSeries> = {};
  await Promise.all(
    Array.from(benchmarks).map(async (bm) => {
      benchmarkSeries[bm] = await fetchYahoo(bm, range);
    }),
  );

  const results = await Promise.all(
    queries.map(async (q): Promise<PriceResult> => {
      const bm = q.benchmark || "^GSPC";
      const bmSeries = benchmarkSeries[bm];
      const tickerSeries = await fetchYahoo(q.ticker, range);

      const tickerLatest =
        tickerSeries.series.length > 0
          ? {
              date: tickerSeries.series[tickerSeries.series.length - 1][0],
              price: tickerSeries.series[tickerSeries.series.length - 1][1],
            }
          : null;
      const tickerAnchor = findAnchor(tickerSeries.series, q.analysis_date);

      const bmLatest =
        bmSeries.series.length > 0
          ? {
              date: bmSeries.series[bmSeries.series.length - 1][0],
              price: bmSeries.series[bmSeries.series.length - 1][1],
            }
          : null;
      const bmAnchor = findAnchor(bmSeries.series, q.analysis_date);

      return {
        ticker: q.ticker,
        anchor: tickerAnchor,
        latest: tickerLatest,
        benchmark: { symbol: bm, anchor: bmAnchor, latest: bmLatest },
        error: tickerSeries.error,
      };
    }),
  );

  return { fetched_at: new Date().toISOString(), results };
}
