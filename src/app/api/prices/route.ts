import { NextRequest, NextResponse } from "next/server";
import { fetchPricesForEntries } from "@/lib/prices";
import { checkAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/prices?tickers=SHEL,PLTR&dates=2026-04-30,2026-03-26
// Useful for ad-hoc lookups from the skill without going through the watchlist.
export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const tickers = req.nextUrl.searchParams.get("tickers")?.split(",").filter(Boolean) || [];
  const dates = req.nextUrl.searchParams.get("dates")?.split(",").filter(Boolean) || [];

  if (tickers.length === 0 || tickers.length !== dates.length) {
    return NextResponse.json(
      { error: "Provide equal-length comma-separated tickers and dates" },
      { status: 400 },
    );
  }

  const queries = tickers.map((t, i) => ({ ticker: t, analysis_date: dates[i] }));
  const result = await fetchPricesForEntries(queries);
  return NextResponse.json(result);
}
