import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordCheckIn } from "@/lib/checkin";
import { t, type Lang } from "@/lib/i18n";

/**
 * The feature-phone channel.
 *
 * In production this is called by a telecom IVR gateway after a missed call:
 * the gateway supplies the calling number and the serving cell, which resolves
 * to a district and no finer. That is the same granularity the system retains
 * from a smartphone anyway, which is why a worker with no smartphone is not a
 * second-class participant here.
 *
 * The gateway integration is not wired. This endpoint models its contract so
 * the rest of the system is written against the real shape.
 */
const Body = z.object({
  phone: z.string().min(10).max(12),
  /** resolved by the gateway from the serving cell tower */
  towerState: z.string().min(2),
  towerDistrict: z.string().min(2),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Malformed gateway request." }, { status: 400 });
  }
  const { phone, towerState, towerDistrict } = parsed.data;

  const worker = await db.worker.findUnique({ where: { phone } });
  if (!worker) {
    return NextResponse.json(
      { ok: false, error: "This number is not registered on eShram." },
      { status: 404 },
    );
  }

  const result = await recordCheckIn({
    workerId: worker.id,
    method: "ivr",
    ivrDistrict: { state: towerState, district: towerDistrict },
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const lang = worker.language as Lang;
  // What the gateway would send back as an SMS, in the worker's own language.
  const sms =
    lang === "en"
      ? `Presence marked. ${result.district}, ${result.state}. ShramSetu`
      : `${t("marked", lang)}. ${result.district}, ${result.state}. ShramSetu`;

  return NextResponse.json({
    ok: true,
    sms,
    language: lang,
    district: result.district,
    state: result.state,
    migrated: result.migrated,
    worker: { name: worker.nameLocal ?? worker.name, uan: worker.uan },
  });
}
