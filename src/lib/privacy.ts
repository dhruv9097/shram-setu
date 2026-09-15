/**
 * ShramSetu privacy kernel.
 *
 * Every path that exposes worker presence data goes through this module. The
 * design rule is that an official can see *flows* freely, and an *individual*
 * only with a recorded legal basis that the worker can later read back.
 *
 * Three mechanisms:
 *   1. coarsening       — precise coordinates decay to district granularity
 *   2. k-anonymity      — aggregate cells below k are suppressed, with
 *                         complementary suppression so totals cannot be differenced
 *   3. audited lifting  — individual access requires a basis and is logged
 */

import type { LegalBasis, OfficerRole } from "./types";

// ---------------------------------------------------------------- parameters

/** Minimum group size before an aggregate cell may be shown. */
export const K_THRESHOLD = 10;

/**
 * How long a precise coordinate may be retained after a check-in. Coordinates
 * exist only to verify the worker was inside the worksite geofence; once that
 * is settled they serve no further purpose and are discarded.
 */
export const COORD_RETENTION_HOURS = 168; // 7 days

/** Bases that permit lifting the identity veil on a single worker. */
const INDIVIDUAL_ACCESS_BASES: readonly LegalBasis[] = [
  "sos_response", // the worker themselves asked for help
  "declared_crisis", // an active, declared crisis in that district
  "worker_consent", // explicit, specific, revocable
  "grievance", // a filed labour grievance naming the worker
];

// ---------------------------------------------------------------- coarsening

export function shouldCoarsen(recordedAt: Date, now = new Date()): boolean {
  return now.getTime() - recordedAt.getTime() > COORD_RETENTION_HOURS * 3_600_000;
}

/**
 * Strip coordinates from a check-in that has outlived the verification window.
 * District and state survive; the point location does not.
 */
export function coarsenCheckIn<T extends { lat: number | null; lng: number | null; recordedAt: Date }>(
  row: T,
  now = new Date(),
): T & { coarsened: boolean } {
  if (!shouldCoarsen(row.recordedAt, now)) return { ...row, coarsened: false };
  return { ...row, lat: null, lng: null, coarsened: true };
}

// -------------------------------------------------------------- k-anonymity

export type Cell<T> = T & { count: number };

export type KAnonResult<T> = {
  visible: Cell<T>[];
  /** how many cells were withheld */
  suppressedCells: number;
  /** combined count of withheld cells, safe to publish as one lump */
  suppressedTotal: number;
  k: number;
};

/**
 * Suppress every cell whose count is below k.
 *
 * Naive suppression leaks: if you publish a grand total and withhold exactly
 * one cell, that cell is recoverable by subtraction. So when a single cell
 * would be suppressed we suppress the next-smallest as well — standard
 * complementary suppression from statistical disclosure control.
 */
export function kAnonymise<T>(cells: Cell<T>[], k = K_THRESHOLD): KAnonResult<T> {
  const sorted = [...cells].sort((a, b) => a.count - b.count);

  const suppressed: Cell<T>[] = [];
  const visible: Cell<T>[] = [];
  for (const cell of sorted) {
    if (cell.count < k) suppressed.push(cell);
    else visible.push(cell);
  }

  // complementary suppression — never leave exactly one cell withheld
  if (suppressed.length === 1 && visible.length > 0) {
    suppressed.push(visible.shift()!);
  }

  return {
    visible: visible.sort((a, b) => b.count - a.count),
    suppressedCells: suppressed.length,
    suppressedTotal: suppressed.reduce((s, c) => s + c.count, 0),
    k,
  };
}

/**
 * Laplace noise for counts released outside the system (research extracts,
 * published statistics). Calibrated for a query of sensitivity 1.
 *
 * This is deliberately NOT applied to operational views — a relief officer
 * needs a true headcount. It applies to the research export path only.
 */
export function withLaplaceNoise(count: number, epsilon = 1.0, rand = Math.random): number {
  const u = rand() - 0.5;
  const noise = -(1 / epsilon) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return Math.max(0, Math.round(count + noise));
}

// ------------------------------------------------------------ access control

export type Officer = {
  id: string;
  role: OfficerRole;
  scopeState: string | null;
  scopeDistrict: string | null;
};

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

/** Is this officer territorially competent for the given place? */
export function withinScope(officer: Officer, state: string, district?: string): boolean {
  if (officer.role === "national") return true;
  if (officer.role === "state") return officer.scopeState === state;
  return officer.scopeState === state && officer.scopeDistrict === district;
}

/**
 * Gate on individual-level access. Aggregate views do not come through here;
 * they go through kAnonymise instead.
 */
export function canViewIndividual(
  officer: Officer,
  target: { currentState: string; currentDistrict: string; consentCrisis: boolean },
  basis: LegalBasis,
  context: { activeCrisisInDistrict?: boolean } = {},
): AccessDecision {
  if (!INDIVIDUAL_ACCESS_BASES.includes(basis)) {
    return { allowed: false, reason: `'${basis}' is not a recognised basis for individual access.` };
  }
  if (!withinScope(officer, target.currentState, target.currentDistrict)) {
    return {
      allowed: false,
      reason: `Officer scope (${officer.role}${officer.scopeState ? `: ${officer.scopeState}` : ""}) does not cover ${target.currentDistrict}, ${target.currentState}.`,
    };
  }
  if (basis === "declared_crisis") {
    if (!context.activeCrisisInDistrict) {
      return { allowed: false, reason: "No active declared crisis in this district." };
    }
    if (!target.consentCrisis) {
      return { allowed: false, reason: "Worker has withdrawn consent for crisis-response contact." };
    }
  }
  return { allowed: true };
}

/**
 * Fields an officer may see about an individual once access is granted.
 * Even with a valid basis, the exposure is the minimum the task requires —
 * a relief officer gets a name and a phone number, not a location history.
 */
export function minimalDisclosure(basis: LegalBasis): string[] {
  switch (basis) {
    case "sos_response":
      return ["name", "phone", "language", "currentDistrict", "lastKnownCoords", "sosDetail"];
    case "declared_crisis":
      return ["name", "phone", "language", "currentDistrict"];
    case "grievance":
      return ["name", "phone", "language", "currentDistrict", "employer", "workRecords"];
    case "worker_consent":
      return ["name", "phone", "language", "currentDistrict", "workRecords", "checkInHistory"];
  }
}
