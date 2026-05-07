import { NextRequest, NextResponse } from "next/server";
import { updateEntry, loadWatchlist } from "@/lib/store";
import { validateEntry } from "@/lib/validate";
import { checkAuth } from "@/lib/auth";
import { entryKey } from "@/lib/validate";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  let body: { ticker?: string; exchange?: string; patch?: Partial<Entry> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.ticker || !body.exchange || !body.patch) {
    return NextResponse.json(
      { error: "ticker, exchange, and patch are required" },
      { status: 400 },
    );
  }

  // Build hypothetical merged entry to validate
  const wl = await loadWatchlist();
  const existing = wl.entries.find(
    (e) => entryKey(e) === entryKey({ ticker: body.ticker!, exchange: body.exchange! }),
  );
  if (!existing) {
    return NextResponse.json(
      { error: `No entry found for ${body.ticker} on ${body.exchange}` },
      { status: 404 },
    );
  }
  const merged = { ...existing, ...body.patch };
  const validation = validateEntry(merged);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed after patch", errors: validation.errors },
      { status: 400 },
    );
  }

  const res = await updateEntry(body.ticker, body.exchange, body.patch);
  if (!res.updated) {
    return NextResponse.json({ error: res.reason }, { status: 404 });
  }

  return NextResponse.json({ ok: true, entry: res.entry, warnings: validation.warnings });
}
