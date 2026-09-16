import { NextResponse } from "next/server";
import { z } from "zod";
import { currentWorkerId } from "@/lib/auth";
import { triageGrievance, geminiConfigured } from "@/lib/gemini";

const Body = z.object({ text: z.string().min(3).max(2000), language: z.string().min(2).max(5) });

/**
 * Reads what the worker said and proposes a category. Writes nothing — the
 * worker confirms before anything is filed.
 */
export async function POST(req: Request) {
  if (!(await currentWorkerId())) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const triage = await triageGrievance(parsed.data.text, parsed.data.language);
  return NextResponse.json({
    ok: true,
    triage,
    available: geminiConfigured(),
  });
}
