/**
 * Privacy kernel verification.
 *
 * Run with: npm run test:privacy
 *
 * These are the guarantees ShramSetu makes to a worker about their data.
 * If any of these fail, the system is lying to them.
 */
import {
  kAnonymise,
  withLaplaceNoise,
  canViewIndividual,
  coarsenCheckIn,
  withinScope,
  K_THRESHOLD,
} from "../privacy";

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "  PASS  " : "  FAIL  "}${msg}`);
  if (!cond) failures++;
};
const group = (name: string) => console.log(`\n${name}`);

group(`k-anonymity (k=${K_THRESHOLD})`);
{
  const r = kAnonymise([
    { d: "Surat", count: 412 },
    { d: "Thane", count: 88 },
    { d: "Kollam", count: 3 },
    { d: "Bhuj", count: 7 },
  ]);
  ok(r.visible.length === 2, "cells at or above k remain visible");
  ok(r.suppressedCells === 2 && r.suppressedTotal === 10, "sub-k cells withheld and lumped");
  ok(r.visible[0].count === 412, "visible cells sorted descending");
}

group("complementary suppression — the differencing attack");
{
  // Publishing a total while withholding exactly one cell lets an attacker
  // recover that cell by subtraction. A lone suppressed cell must take a
  // neighbour down with it.
  const r = kAnonymise([
    { d: "A", count: 500 },
    { d: "B", count: 300 },
    { d: "C", count: 4 },
  ]);
  ok(r.suppressedCells === 2, "a lone sub-k cell drags the next-smallest with it");
  ok(!r.visible.some((c) => c.d === "B"), "B sacrificed so C cannot be differenced out");
  ok(r.suppressedCells > 1, "withheld lump spans >1 cell, so no exact value is derivable");
}

group("no suppression when every cell is safe");
{
  const r = kAnonymise([{ d: "A", count: 50 }, { d: "B", count: 30 }]);
  ok(r.suppressedCells === 0 && r.visible.length === 2, "all cells pass through untouched");
}

group("coordinate coarsening");
{
  const now = new Date("2026-09-15T12:00:00Z");
  const fresh = coarsenCheckIn(
    { lat: 21.17, lng: 72.83, recordedAt: new Date("2026-09-14T12:00:00Z") },
    now,
  );
  const stale = coarsenCheckIn(
    { lat: 21.17, lng: 72.83, recordedAt: new Date("2026-08-01T12:00:00Z") },
    now,
  );
  ok(fresh.lat === 21.17 && !fresh.coarsened, "recent check-in keeps coords while still verifiable");
  ok(stale.lat === null && stale.coarsened, "expired check-in has coords stripped");
}

group("individual access gate");
{
  const officer = { id: "o1", role: "district" as const, scopeState: "Gujarat", scopeDistrict: "Surat" };
  const target = { currentState: "Gujarat", currentDistrict: "Surat", consentCrisis: true };

  ok(canViewIndividual(officer, target, "sos_response").allowed, "worker's own SOS permits access");
  ok(!canViewIndividual(officer, target, "declared_crisis").allowed, "crisis basis denied with no live crisis");
  ok(
    canViewIndividual(officer, target, "declared_crisis", { activeCrisisInDistrict: true }).allowed,
    "crisis basis allowed once a crisis is declared",
  );
  ok(
    !canViewIndividual(officer, { ...target, consentCrisis: false }, "declared_crisis", {
      activeCrisisInDistrict: true,
    }).allowed,
    "withdrawn consent overrides an active crisis",
  );
  ok(
    !canViewIndividual(
      officer,
      { currentState: "Kerala", currentDistrict: "Ernakulam", consentCrisis: true },
      "sos_response",
    ).allowed,
    "a Surat officer cannot reach into Kerala",
  );
  ok(withinScope({ ...officer, role: "national" }, "Kerala", "Ernakulam"), "national scope covers everything");
}

group("differential privacy on research exports");
{
  const samples = Array.from({ length: 2000 }, () => withLaplaceNoise(100, 1.0));
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  ok(Math.abs(mean - 100) < 2, `Laplace noise is unbiased (mean ${mean.toFixed(2)} ≈ 100)`);
  ok(new Set(samples).size > 5, "output varies across calls");
  ok(samples.every((s) => s >= 0), "noised counts never go negative");
}


group("withheld cells disclose identity but never value");
{
  const r = kAnonymise([
    { state: "Gujarat", district: "Surat", count: 415 },
    { state: "Kerala", district: "Idukki", count: 4 },
    { state: "Assam", district: "Hailakandi", count: 6 },
  ]);
  ok(r.suppressed.length === 2, "withheld cells are returned so a map can mark them");
  ok(
    r.suppressed.every((c) => !("count" in (c as object))),
    "no count survives on a withheld cell",
  );
  ok(
    JSON.stringify(r.suppressed).includes("Idukki"),
    "the district is named, so suppression is visible rather than silent",
  );
  ok(!JSON.stringify(r.suppressed).includes("4"), "its value is not recoverable from the payload");
}

console.log(failures === 0 ? "\nAll privacy guarantees hold.\n" : `\n${failures} FAILURE(S)\n`);
process.exit(failures ? 1 : 0);
