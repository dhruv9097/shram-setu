/**
 * Dashboard aggregations.
 *
 * Every function that returns place-linked counts passes them through
 * kAnonymise() before returning. Nothing in this module returns an individual
 * worker — that path lives in lib/individual.ts and is gated and audited.
 *
 * Note on portability: date bucketing is done in JS rather than SQL, because
 * strftime (sqlite) and to_char (postgres) are not interchangeable. At this
 * data volume the cost is negligible and the schema stays provider-agnostic.
 */
import { db } from "./db";
import { kAnonymise, K_THRESHOLD, type Cell } from "./privacy";

const DAY = 86_400_000;

// ------------------------------------------------------------------ overview

export async function nationalOverview() {
  const [totalWorkers, featurePhone, activeCrises, openSos, checkInsToday, workRecords] =
    await Promise.all([
      db.worker.count(),
      db.worker.count({ where: { isSmartphone: false } }),
      db.crisisEvent.count({ where: { active: true } }),
      db.sosRequest.count({ where: { status: "open" } }),
      db.checkIn.count({ where: { recordedAt: { gte: new Date(Date.now() - DAY) } } }),
      db.workRecord.count(),
    ]);

  // currentState vs homeState is a column-to-column comparison, which Prisma's
  // filter syntax cannot express — hence raw SQL. Double quotes work on both
  // sqlite and postgres.
  const [{ n: nonDomiciled }] = await db.$queryRawUnsafe<{ n: number | bigint }[]>(
    `SELECT COUNT(*) AS n FROM "Worker" WHERE "currentState" <> "homeState"`,
  );

  const districtsCovered = await db.worker
    .findMany({ select: { currentState: true, currentDistrict: true }, distinct: ["currentState", "currentDistrict"] })
    .then((r) => r.length);

  return {
    totalWorkers,
    nonDomiciled: Number(nonDomiciled),
    nonDomiciledPct: Math.round((Number(nonDomiciled) / totalWorkers) * 100),
    featurePhone,
    featurePhonePct: Math.round((featurePhone / totalWorkers) * 100),
    districtsCovered,
    activeCrises,
    openSos,
    checkInsToday,
    workRecords,
  };
}

// ------------------------------------------------------- district presence

export type DistrictCell = { state: string; district: string };

/**
 * Worker headcount by district of current presence — the choropleth layer.
 * Districts holding fewer than k workers are withheld.
 */
export async function districtPresence() {
  const rows = await db.worker.groupBy({
    by: ["currentState", "currentDistrict"],
    _count: { _all: true },
  });

  const cells: Cell<DistrictCell>[] = rows.map((r) => ({
    state: r.currentState,
    district: r.currentDistrict,
    count: r._count._all,
  }));

  return kAnonymise(cells);
}

/** Same, but counting only workers away from their home state. */
export async function nonDomiciledByDistrict() {
  const rows = await db.$queryRawUnsafe<{ state: string; district: string; n: number | bigint }[]>(
    `SELECT "currentState" AS state, "currentDistrict" AS district, COUNT(*) AS n
     FROM "Worker" WHERE "currentState" <> "homeState"
     GROUP BY "currentState", "currentDistrict"`,
  );
  return kAnonymise(rows.map((r) => ({ state: r.state, district: r.district, count: Number(r.n) })));
}

// ------------------------------------------------------------- corridors

export type CorridorCell = { fromState: string; toState: string };

/** Interstate migration flows over a window, for the corridor view. */
export async function corridorFlows(days = 365) {
  const since = new Date(Date.now() - days * DAY);
  const rows = await db.migrationEvent.groupBy({
    by: ["fromState", "toState"],
    where: { detectedAt: { gte: since } },
    _count: { _all: true },
  });

  const interstate: Cell<CorridorCell>[] = rows
    .filter((r) => r.fromState !== r.toState)
    .map((r) => ({ fromState: r.fromState, toState: r.toState, count: r._count._all }));

  return kAnonymise(interstate);
}

/** Corridors broken down by sector — feeds the sector filter. */
export async function corridorsBySector(days = 365) {
  const since = new Date(Date.now() - days * DAY);
  const rows = await db.migrationEvent.groupBy({
    by: ["fromState", "toState", "sector"],
    where: { detectedAt: { gte: since } },
    _count: { _all: true },
  });
  return kAnonymise(
    rows
      .filter((r) => r.fromState !== r.toState)
      .map((r) => ({
        fromState: r.fromState,
        toState: r.toState,
        sector: r.sector,
        count: r._count._all,
      })),
  );
}

// ----------------------------------------------------------------- trends

/** Monthly interstate movement, bucketed in JS for provider portability. */
export async function inflowTrend(months = 12) {
  const since = new Date(Date.now() - months * 31 * DAY);
  const rows = await db.migrationEvent.findMany({
    where: { detectedAt: { gte: since } },
    select: { detectedAt: true, fromState: true, toState: true, sector: true },
  });

  const buckets = new Map<string, { month: string; total: number; bySector: Record<string, number> }>();
  for (const r of rows) {
    if (r.fromState === r.toState) continue;
    const month = `${r.detectedAt.getFullYear()}-${String(r.detectedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(month)) buckets.set(month, { month, total: 0, bySector: {} });
    const b = buckets.get(month)!;
    b.total++;
    b.bySector[r.sector] = (b.bySector[r.sector] ?? 0) + 1;
  }

  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export async function sectorBreakdown() {
  const rows = await db.worker.groupBy({ by: ["sector"], _count: { _all: true } });
  return rows
    .map((r) => ({ sector: r.sector, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

// ------------------------------------------------------------ district view

/**
 * Drill-down for a single district. Returns composition, never identities.
 * Language mix is the operationally important part: it tells a relief officer
 * which languages an alert must be issued in.
 */
export async function districtDetail(state: string, district: string) {
  const [present, workers] = await Promise.all([
    db.worker.count({ where: { currentState: state, currentDistrict: district } }),
    db.worker.findMany({
      where: { currentState: state, currentDistrict: district },
      select: {
        homeState: true,
        sector: true,
        language: true,
        isSmartphone: true,
        gender: true,
        consentCrisis: true,
      },
    }),
  ]);

  if (present < K_THRESHOLD) {
    return { state, district, suppressed: true as const, k: K_THRESHOLD };
  }

  const tally = <T extends string>(xs: T[]) => {
    const m = new Map<T, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  };

  const nonDomiciled = workers.filter((w) => w.homeState !== state).length;

  return {
    state,
    district,
    suppressed: false as const,
    present,
    nonDomiciled,
    // origin mix is itself k-anonymised — a district with 3 workers from Sikkim
    // should not reveal that
    originStates: kAnonymise(
      tally(workers.filter((w) => w.homeState !== state).map((w) => w.homeState)).map((t) => ({
        state: t.key,
        count: t.count,
      })),
    ),
    sectors: tally(workers.map((w) => w.sector)),
    languages: tally(workers.map((w) => w.language)),
    reachableByPush: workers.filter((w) => w.isSmartphone && w.consentCrisis).length,
    reachableBySmsOnly: workers.filter((w) => !w.isSmartphone && w.consentCrisis).length,
    consentWithheld: workers.filter((w) => !w.consentCrisis).length,
    women: workers.filter((w) => w.gender === "female").length,
  };
}

// ------------------------------------------------------------------- crisis

export async function activeCrises() {
  return db.crisisEvent.findMany({
    where: { active: true },
    include: { declaredBy: { select: { name: true, role: true } }, _count: { select: { alerts: true } } },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Who is reachable in a crisis district, and in which languages.
 * This is the number a relief officer actually needs.
 */
export async function crisisReachability(state: string, district: string) {
  const workers = await db.worker.findMany({
    where: { currentState: state, currentDistrict: district },
    select: { language: true, isSmartphone: true, consentCrisis: true, homeState: true },
  });

  const consenting = workers.filter((w) => w.consentCrisis);
  const byLanguage = new Map<string, { push: number; sms: number }>();
  for (const w of consenting) {
    if (!byLanguage.has(w.language)) byLanguage.set(w.language, { push: 0, sms: 0 });
    const b = byLanguage.get(w.language)!;
    if (w.isSmartphone) b.push++;
    else b.sms++;
  }

  return {
    present: workers.length,
    nonDomiciled: workers.filter((w) => w.homeState !== state).length,
    reachable: consenting.length,
    unreachable: workers.length - consenting.length,
    byLanguage: [...byLanguage.entries()]
      .map(([language, v]) => ({ language, ...v, total: v.push + v.sms }))
      .sort((a, b) => b.total - a.total),
  };
}

// ---------------------------------------------------------------- integrity

/**
 * Surfaces how much of the dataset is coordinate-free. Shown on the dashboard
 * so an official can see the retention policy is actually running, rather than
 * taking it on faith.
 */
export async function privacyPosture() {
  const [total, coarsened, withCoords, offlineSynced, revokedResearch, revokedCrisis] =
    await Promise.all([
      db.checkIn.count(),
      db.checkIn.count({ where: { coarsened: true } }),
      db.checkIn.count({ where: { NOT: { lat: null } } }),
      db.checkIn.count({ where: { wasOffline: true } }),
      db.worker.count({ where: { consentResearch: false } }),
      db.worker.count({ where: { consentCrisis: false } }),
    ]);

  return {
    totalCheckIns: total,
    coarsened,
    coarsenedPct: Math.round((coarsened / total) * 1000) / 10,
    retainingCoords: withCoords,
    offlineSynced,
    offlinePct: Math.round((offlineSynced / total) * 1000) / 10,
    revokedResearch,
    revokedCrisis,
    k: K_THRESHOLD,
  };
}
