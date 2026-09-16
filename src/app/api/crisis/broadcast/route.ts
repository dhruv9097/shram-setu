import { NextResponse } from "next/server";
import { z } from "zod";
import { currentOfficer } from "@/lib/auth";
import { db } from "@/lib/db";
import { translateAlert } from "@/lib/gemini";
import { withinScope } from "@/lib/privacy";

const Body = z.object({
  crisisId: z.string().min(1),
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(600),
});

export async function POST(req: Request) {
  const officer = await currentOfficer();
  if (!officer) {
    return NextResponse.json(
      { ok: false, error: "Sign in as an officer to broadcast." },
      { status: 401 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const crisis = await db.crisisEvent.findUnique({ where: { id: parsed.data.crisisId } });
  if (!crisis || !crisis.active) {
    return NextResponse.json({ ok: false, error: "No active crisis." }, { status: 404 });
  }

  if (!withinScope(officer, crisis.state, crisis.district)) {
    return NextResponse.json(
      { ok: false, error: `Your scope does not cover ${crisis.district}, ${crisis.state}.` },
      { status: 403 },
    );
  }

  // Consent is the filter, and it is applied here rather than in the UI, so a
  // crafted request cannot reach a worker who opted out. There is deliberately
  // no override — a consent switch that bends in an emergency was never consent.
  const recipients = await db.worker.findMany({
    where: {
      currentState: crisis.state,
      currentDistrict: crisis.district,
      consentCrisis: true,
    },
    select: { id: true, language: true, isSmartphone: true },
  });

  const languages = [...new Set(recipients.map((r) => r.language))];
  const translations = await translateAlert(parsed.data.title, parsed.data.body, languages);

  const alerts = recipients.map((r) => {
    const t = translations?.[r.language];
    return {
      crisisId: crisis.id,
      workerId: r.id,
      kind: "crisis",
      channel: r.isSmartphone ? "push" : "sms",
      title: t?.title ?? parsed.data.title,
      body: t?.body ?? parsed.data.body,
      language: t ? r.language : "en",
      sentAt: new Date(),
    };
  });

  for (let i = 0; i < alerts.length; i += 500) {
    await db.alert.createMany({ data: alerts.slice(i, i + 500) });
  }

  const withheld = await db.worker.count({
    where: {
      currentState: crisis.state,
      currentDistrict: crisis.district,
      consentCrisis: false,
    },
  });

  await db.auditLog.create({
    data: {
      officerId: officer.id,
      action: "crisis_broadcast",
      targetDistrict: crisis.district,
      legalBasis: "declared_crisis",
      justification: `Relief broadcast to ${alerts.length} consenting workers in ${crisis.district}. ${withheld} withheld consent and were not contacted.`,
    },
  });

  return NextResponse.json({
    ok: true,
    sent: alerts.length,
    push: alerts.filter((a) => a.channel === "push").length,
    sms: alerts.filter((a) => a.channel === "sms").length,
    withheld,
    translated: Boolean(translations),
    languages: translations ? Object.keys(translations) : [],
  });
}
