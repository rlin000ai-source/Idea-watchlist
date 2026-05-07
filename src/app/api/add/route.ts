import { NextRequest, NextResponse } from "next/server";
import { addEntry } from "@/lib/store";
import { validateEntry } from "@/lib/validate";
import { checkAuth } from "@/lib/auth";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  let body: Partial<Entry>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateEntry(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors, warnings: result.warnings },
      { status: 400 },
    );
  }

  const addRes = await addEntry(body as Entry);
  if (!addRes.added) {
    return NextResponse.json({ error: addRes.reason }, { status: 409 });
  }

  return NextResponse.json({ ok: true, warnings: result.warnings, entry: body });
}
