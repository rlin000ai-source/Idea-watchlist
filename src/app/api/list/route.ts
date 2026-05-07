import { NextRequest, NextResponse } from "next/server";
import { loadWatchlist } from "@/lib/store";
import { enrichEntries } from "@/lib/grade";
import { checkAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const wl = await loadWatchlist();
  const enriched = wl.entries.length > 0 ? await enrichEntries(wl.entries) : [];

  return NextResponse.json({
    schema_version: wl.schema_version,
    last_updated: wl.last_updated,
    fetched_at: new Date().toISOString(),
    entries: enriched,
  });
}
