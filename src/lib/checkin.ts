/**
 * Presence attestation.
 *
 * One function, because every channel — QR at the worksite, a tap in the app,
 * a missed call from a feature phone — must produce the same attestation with
 * the same guarantees. The channel only changes how the district is resolved
 * and how much confidence we have in it.
 */
import { db } from "./db";
import { nearestDistrict, centroid, haversineKm } from "./geo";
import { shouldCoarsen } from "./privacy";
import type { CheckInMethod } from "./types";

export type CheckInInput = {
  workerId: string;
  method: CheckInMethod;
  lat?: number | null;
  lng?: number | null;
  /** worksite QR payload, for method "qr" */
  qrSecret?: string | null;
  /** district resolved from cell tower, for method "ivr" */
  ivrDistrict?: { state: string; district: string } | null;
  /** when the device recorded it — may predate arrival if queued offline */
  recordedAt?: Date;
  wasOffline?: boolean;
};

export type CheckInResult = {
  ok: true;
  checkInId: string;
  state: string;
  district: string;
  method: CheckInMethod;
  /** true when this attestation moved the worker to a new district */
  migrated: boolean;
  from?: { state: string; district: string };
  worksiteName?: string;
  /** set when coords were supplied but fell outside the worksite geofence */
  geofenceWarning?: string;
} | { ok: false; error: string };

export async function recordCheckIn(input: CheckInInput): Promise<CheckInResult> {
  const worker = await db.worker.findUnique({ where: { id: input.workerId } });
  if (!worker) return { ok: false, error: "Unknown worker." };

  const recordedAt = input.recordedAt ?? new Date();
  let state: string | null = null;
  let district: string | null = null;
  let worksiteId: string | null = null;
  let worksiteName: string | undefined;
  let geofenceWarning: string | undefined;

  // ------------------------------------------------ resolve where they are
  if (input.method === "qr") {
    if (!input.qrSecret) return { ok: false, error: "Worksite code missing." };
    const site = await db.worksite.findUnique({ where: { qrSecret: input.qrSecret } });
    if (!site) return { ok: false, error: "This worksite code is not recognised." };
    if (!site.active) return { ok: false, error: "This worksite is no longer active." };

    state = site.state;
    district = site.district;
    worksiteId = site.id;
    worksiteName = site.name;

    // Coordinates are optional here. When present they let us verify the
    // worker is physically at the site rather than scanning a photographed
    // code — but a failed check is a warning, not a rejection, because GPS
    // is unreliable indoors and inside sheds.
    if (input.lat != null && input.lng != null) {
      const metres = haversineKm({ lat: input.lat, lng: input.lng }, site) * 1000;
      if (metres > site.geofenceRadius) {
        geofenceWarning = `Recorded ${Math.round(metres)} m from the worksite boundary.`;
      }
    }
  } else if (input.method === "ivr") {
    // Feature phone: the network gives us a cell tower, which resolves to a
    // district and no finer. That is exactly the granularity we keep anyway.
    if (!input.ivrDistrict) return { ok: false, error: "Could not resolve the caller's district." };
    state = input.ivrDistrict.state;
    district = input.ivrDistrict.district;
  } else {
    if (input.lat == null || input.lng == null) {
      return { ok: false, error: "Location unavailable. Try the worksite QR code instead." };
    }
    const near = nearestDistrict(input.lat, input.lng);
    if (!near) return { ok: false, error: "Could not resolve a district from that location." };
    state = near.st_nm;
    district = near.district;
  }

  // --------------------------------------------------- write the attestation
  // Coordinates are stored only while they are still doing verification work.
  // A queued offline check-in that surfaces a fortnight later arrives already
  // past its retention window, so it is written coarsened from the start.
  const expired = shouldCoarsen(recordedAt);
  const keepCoords = !expired && input.lat != null && input.lng != null;

  const checkIn = await db.checkIn.create({
    data: {
      workerId: worker.id,
      worksiteId,
      method: input.method,
      state,
      district,
      lat: keepCoords ? input.lat : null,
      lng: keepCoords ? input.lng : null,
      coarsened: expired,
      recordedAt,
      wasOffline: input.wasOffline ?? false,
      verified: true,
    },
  });

  // ------------------------------------------------------- migration event
  const migrated = district !== worker.currentDistrict || state !== worker.currentState;
  const from = { state: worker.currentState, district: worker.currentDistrict };

  if (migrated) {
    await db.migrationEvent.create({
      data: {
        workerId: worker.id,
        fromState: worker.currentState,
        fromDistrict: worker.currentDistrict,
        toState: state,
        toDistrict: district,
        sector: worker.sector,
        detectedAt: recordedAt,
      },
    });
  }

  // Only advance presence if this attestation is newer than what we hold —
  // a late offline sync must not rewind the worker's current location.
  if (recordedAt >= worker.lastSeenAt) {
    await db.worker.update({
      where: { id: worker.id },
      data: { currentState: state, currentDistrict: district, lastSeenAt: recordedAt },
    });
  }

  return {
    ok: true,
    checkInId: checkIn.id,
    state,
    district,
    method: input.method,
    migrated,
    ...(migrated ? { from } : {}),
    ...(worksiteName ? { worksiteName } : {}),
    ...(geofenceWarning ? { geofenceWarning } : {}),
  };
}
