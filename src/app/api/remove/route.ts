import { NextRequest, NextResponse } from "next/server";
import { removeEntry } from "@/lib/store";
import { checkAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  let body: { ticker?: string; exchange?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.ticker || !body.exchange) {
    return NextResponse.json(
      { error: "Both ticker and exchange are required" },
      { status: 400 },
    );
  }

  const res = await removeEntry(body.ticker, body.exchange);
  if (!res.removed) {
    return NextResponse.json({ error: res.reason }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
