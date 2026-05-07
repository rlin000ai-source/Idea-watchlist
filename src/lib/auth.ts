import { NextRequest, NextResponse } from "next/server";

export function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.WATCHLIST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: WATCHLIST_TOKEN not set" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  const fromHeader = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const fromQuery = req.nextUrl.searchParams.get("token");
  const provided = fromHeader || fromQuery;
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
