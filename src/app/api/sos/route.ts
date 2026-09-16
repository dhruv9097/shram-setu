import { NextResponse } from "next/server";
import { z } from "zod";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { SOS_TYPES } from "@/lib/types";

const Body = z.object({
  type: z.enum(SOS_TYPES),
  urgency: z.enum(["immediate", "urgent", "routine"]).default("routine"),
  spokenText: z.string().max(2000).optional(),
  spokenLanguage: z.string().max(5).optional(),
  summaryEnglish: z.string().max(600).optional(),
  triageSuggested: z.string().max(40).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export async function POST(req: Request) {
  const worker = await currentWorker();
  if (!worker) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }
  const d = parsed.data;

  const sos = await db.sosRequest.create({
    data: {
      workerId: worker.id,
      type: d.type,
      urgency: d.urgency,
      state: worker.currentState,
      district: worker.currentDistrict,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      spokenText: d.spokenText ?? null,
      spokenLanguage: d.spokenLanguage ?? worker.language,
      summaryEnglish: d.summaryEnglish ?? null,
      triageSuggested: d.triageSuggested ?? null,
      // Whether the worker kept what the model proposed. Recorded so the
      // accuracy of the triage can be audited against real decisions later.
      triageAccepted: Boolean(d.triageSuggested && d.triageSuggested === d.type),
      status: "open",
    },
  });

  return NextResponse.json({ ok: true, id: sos.id, district: sos.district, state: sos.state });
}
