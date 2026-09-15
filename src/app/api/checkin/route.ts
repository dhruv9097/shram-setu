import { NextResponse } from "next/server";
import { z } from "zod";
import { currentWorkerId } from "@/lib/auth";
import { recordCheckIn } from "@/lib/checkin";
import { CHECKIN_METHODS } from "@/lib/types";

const Body = z.object({
  method: z.enum(CHECKIN_METHODS),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  qrSecret: z.string().min(1).nullable().optional(),
  /** ISO timestamp from the device — set when replaying a queued check-in */
  recordedAt: z.string().datetime().optional(),
  wasOffline: z.boolean().optional(),
});

export async function POST(req: Request) {
  const workerId = await currentWorkerId();
  if (!workerId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const { recordedAt, ...rest } = parsed.data;
  const result = await recordCheckIn({
    workerId,
    ...rest,
    recordedAt: recordedAt ? new Date(recordedAt) : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
