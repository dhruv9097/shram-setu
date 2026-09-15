/**
 * ShramSetu seed.
 *
 * Generates a synthetic but structurally realistic population of unorganised
 * workers moving along documented Indian migration corridors, together with the
 * presence attestations, migration events and work credentials that the system
 * derives from them.
 *
 * Everything here is synthetic. No real worker data is used or implied.
 * Deterministic: a fixed PRNG seed means the demo looks identical every run.
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CORRIDORS } from "../src/lib/corridors";
import { makeName } from "../src/lib/names";

const prisma = new PrismaClient();

// ----------------------------------------------------------------- utilities

/** mulberry32 — small deterministic PRNG so the demo is reproducible. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260915);

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const chance = (p: number) => rng() < p;
const DAY = 86_400_000;

// ------------------------------------------------------------------ geography

type Centroid = { district: string; st_nm: string; lat: number; lng: number };
const centroids: Centroid[] = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/district-centroids.json"), "utf8"),
).filter((c: Partial<Centroid>) => c.district);

const centroidOf = new Map<string, Centroid>();
for (const c of centroids) centroidOf.set(`${c.st_nm}|${c.district}`, c);

function coordsNear(state: string, district: string, jitterKm = 12) {
  const c = centroidOf.get(`${state}|${district}`);
  if (!c) return null;
  const dLat = ((rng() - 0.5) * jitterKm) / 111;
  const dLng = ((rng() - 0.5) * jitterKm) / (111 * Math.cos((c.lat * Math.PI) / 180));
  return { lat: +(c.lat + dLat).toFixed(6), lng: +(c.lng + dLng).toFixed(6) };
}

// ---------------------------------------------------------------- name pools

const LANG_BY_STATE: Record<string, string> = {
  Bihar: "hi", "Uttar Pradesh": "hi", "Madhya Pradesh": "hi", Rajasthan: "hi",
  Jharkhand: "hi", Chhattisgarh: "hi", Odisha: "or", "West Bengal": "bn", Assam: "as",
};

// ------------------------------------------------------------------ employers

const EMPLOYER_PREFIX = ["Shree","Maa","Bharat","National","Sunrise","Royal","Krishna","Jai","New","Metro","Universal","Greenfield"];
const EMPLOYER_SUFFIX: Record<string, string[]> = {
  construction: ["Constructions","Infra Pvt Ltd","Builders","Developers","Engineering Works"],
  textile: ["Textiles","Weaving Mills","Fabrics Pvt Ltd","Processing Mills","Knitwear"],
  agriculture: ["Farms","Agro Services","Krishi Udyog","Agri Contractors"],
  "brick kiln": ["Brick Works","Ent Bhatta","Clay Products","Brick Udyog"],
  plantation: ["Plantations","Estates","Agro Estates"],
  domestic: ["Facility Services","Housekeeping Services","Manpower Solutions"],
  services: ["Security Services","Logistics","Manpower Pvt Ltd","Facility Management"],
};

// ------------------------------------------------------------------ main seed

async function main() {
  console.log("clearing existing data…");
  // order matters: children before parents
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.crisisEvent.deleteMany();
  await prisma.sosRequest.deleteMany();
  await prisma.consentEvent.deleteMany();
  await prisma.workRecord.deleteMany();
  await prisma.migrationEvent.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.worksite.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.officer.deleteMany();

  const now = Date.now();
  const WINDOW_DAYS = 365;

  // ---------------------------------------------------------- employers/sites
  console.log("creating employers and worksites…");
  const employers: any[] = [];
  const worksites: any[] = [];

  for (const corridor of CORRIDORS) {
    for (const district of corridor.toDistricts) {
      const nEmp = int(2, 4);
      for (let e = 0; e < nEmp; e++) {
        const empId = `emp_${employers.length.toString().padStart(4, "0")}`;
        const suffixes = EMPLOYER_SUFFIX[corridor.sector] ?? ["Enterprises"];
        employers.push({
          id: empId,
          name: `${pick(EMPLOYER_PREFIX)} ${pick(suffixes)}`,
          type: corridor.sector === "agriculture" ? "farm" : corridor.sector === "textile" ? "factory" : "contractor",
          regNo: `LIN${int(10000000, 99999999)}`,
          verified: chance(0.72),
          state: corridor.toState,
          district,
          createdAt: new Date(now - int(400, 1200) * DAY),
        });

        const nSites = int(1, 3);
        for (let s = 0; s < nSites; s++) {
          const co = coordsNear(corridor.toState, district, 18);
          if (!co) continue;
          worksites.push({
            id: `ws_${worksites.length.toString().padStart(4, "0")}`,
            employerId: empId,
            name: `${district} ${corridor.sector === "construction" ? "Site" : "Unit"} ${s + 1}`,
            sector: corridor.sector,
            state: corridor.toState,
            district,
            lat: co.lat,
            lng: co.lng,
            geofenceRadius: pick([200, 300, 400, 500]),
            qrSecret: randomBytes(9).toString("hex"),
            active: chance(0.9),
            createdAt: new Date(now - int(200, 900) * DAY),
          });
        }
      }
    }
  }
  await prisma.employer.createMany({ data: employers });
  await prisma.worksite.createMany({ data: worksites });
  console.log(`  ${employers.length} employers, ${worksites.length} worksites`);

  const sitesByDistrict = new Map<string, any[]>();
  for (const w of worksites) {
    const k = `${w.state}|${w.district}`;
    if (!sitesByDistrict.has(k)) sitesByDistrict.set(k, []);
    sitesByDistrict.get(k)!.push(w);
  }

  // ------------------------------------------------------------------ workers
  console.log("generating workers and presence history…");
  const TARGET = 4200;
  const totalWeight = CORRIDORS.reduce((s, c) => s + c.weight, 0);

  const workers: any[] = [];
  const checkIns: any[] = [];
  const migrations: any[] = [];
  const records: any[] = [];
  const consentEvents: any[] = [];

  let uanCounter = 100000000000;

  for (const corridor of CORRIDORS) {
    const count = Math.round((corridor.weight / totalWeight) * TARGET);

    for (let i = 0; i < count; i++) {
      const wid = `wk_${workers.length.toString().padStart(5, "0")}`;
      const isFemale = corridor.sector === "domestic" ? chance(0.62) : chance(0.16);
      const homeDistrict = pick(corridor.fromDistricts);
      const lang = LANG_BY_STATE[corridor.fromState] ?? "hi";
      const person = makeName(corridor.fromState, lang, isFemale, pick);

      // ~17% of workers have no smartphone — they exist in the system only
      // through IVR/SMS. Making them a first-class case is the point.
      const isSmartphone = chance(0.83);

      // Is this worker currently at destination, or back home?
      const atDestination = chance(0.63);
      const destDistrict = pick(corridor.toDistricts);

      // when they first moved out in this window
      const migratedDaysAgo = int(40, WINDOW_DAYS - 20);
      const migratedAt = now - migratedDaysAgo * DAY;
      // if returned, when
      const returnedDaysAgo = atDestination ? null : int(5, Math.max(6, migratedDaysAgo - 20));
      const returnedAt = returnedDaysAgo ? now - returnedDaysAgo * DAY : null;

      const currentState = atDestination ? corridor.toState : corridor.fromState;
      const currentDistrict = atDestination ? destDistrict : homeDistrict;

      // ------------------------------------------------ presence attestations
      const sites = sitesByDistrict.get(`${corridor.toState}|${destDistrict}`) ?? [];
      const site = sites.length ? pick(sites) : null;

      let lastSeen = migratedAt;

      // sparse check-ins at home before migrating
      for (let t = now - WINDOW_DAYS * DAY; t < migratedAt; t += int(12, 24) * DAY) {
        const co = isSmartphone ? coordsNear(corridor.fromState, homeDistrict) : null;
        const ageDays = (now - t) / DAY;
        const fresh = ageDays <= 7;
        checkIns.push({
          workerId: wid,
          worksiteId: null,
          method: isSmartphone ? "geo" : "ivr",
          state: corridor.fromState,
          district: homeDistrict,
          lat: fresh && co ? co.lat : null,
          lng: fresh && co ? co.lng : null,
          coarsened: !fresh,
          recordedAt: new Date(t),
          syncedAt: new Date(t + int(0, 3) * 3600_000),
          wasOffline: chance(0.18),
          verified: true,
        });
        lastSeen = t;
      }

      // dense check-ins at the destination worksite
      const destEnd = returnedAt ?? now;
      let daysWorked = 0;
      for (let t = migratedAt; t < destEnd; t += int(5, 11) * DAY) {
        const co = isSmartphone && site ? coordsNear(corridor.toState, destDistrict, 3) : null;
        const ageDays = (now - t) / DAY;
        const fresh = ageDays <= 7;
        const method = !isSmartphone ? "ivr" : site && chance(0.55) ? "qr" : chance(0.85) ? "geo" : "employer";
        checkIns.push({
          workerId: wid,
          worksiteId: site && method !== "ivr" ? site.id : null,
          method,
          state: corridor.toState,
          district: destDistrict,
          lat: fresh && co ? co.lat : null,
          lng: fresh && co ? co.lng : null,
          coarsened: !fresh,
          recordedAt: new Date(t),
          syncedAt: new Date(t + int(0, 8) * 3600_000),
          wasOffline: chance(0.34), // worksites have poor connectivity
          verified: chance(0.97),
        });
        daysWorked += int(4, 9);
        lastSeen = t;
      }

      // check-ins back home after return
      if (returnedAt) {
        for (let t = returnedAt; t < now; t += int(10, 20) * DAY) {
          const co = isSmartphone ? coordsNear(corridor.fromState, homeDistrict) : null;
          const ageDays = (now - t) / DAY;
          const fresh = ageDays <= 7;
          checkIns.push({
            workerId: wid,
            worksiteId: null,
            method: isSmartphone ? "geo" : "ivr",
            state: corridor.fromState,
            district: homeDistrict,
            lat: fresh && co ? co.lat : null,
            lng: fresh && co ? co.lng : null,
            coarsened: !fresh,
            recordedAt: new Date(t),
            syncedAt: new Date(t + int(0, 4) * 3600_000),
            wasOffline: chance(0.15),
            verified: true,
          });
          lastSeen = t;
        }
      }

      // A slice of workers currently at destination checked in within the last
      // 48 hours. Without this the dashboard opens showing a dataset that
      // stopped a week ago, which reads as broken during a live demo.
      if (!returnedAt && chance(0.45)) {
        const t = now - int(0, 2) * DAY - int(0, 23) * 3_600_000;
        const co = isSmartphone && site ? coordsNear(corridor.toState, destDistrict, 3) : null;
        checkIns.push({
          workerId: wid,
          worksiteId: site && isSmartphone ? site.id : null,
          method: !isSmartphone ? "ivr" : site && chance(0.55) ? "qr" : "geo",
          state: corridor.toState,
          district: destDistrict,
          lat: co?.lat ?? null,
          lng: co?.lng ?? null,
          coarsened: false, // inside the retention window
          recordedAt: new Date(t),
          syncedAt: new Date(t + int(0, 2) * 3_600_000),
          wasOffline: chance(0.3),
          verified: true,
        });
        lastSeen = t;
      }

      // ------------------------------------------------------ migration events
      migrations.push({
        workerId: wid,
        fromState: corridor.fromState,
        fromDistrict: homeDistrict,
        toState: corridor.toState,
        toDistrict: destDistrict,
        sector: corridor.sector,
        detectedAt: new Date(migratedAt),
      });
      if (returnedAt) {
        migrations.push({
          workerId: wid,
          fromState: corridor.toState,
          fromDistrict: destDistrict,
          toState: corridor.fromState,
          toDistrict: homeDistrict,
          sector: corridor.sector,
          detectedAt: new Date(returnedAt),
        });
      }

      // -------------------------------------------------- work credential
      if (site && daysWorked > 0) {
        records.push({
          workerId: wid,
          employerId: site.employerId,
          worksiteId: site.id,
          sector: corridor.sector,
          state: corridor.toState,
          district: destDistrict,
          startDate: new Date(migratedAt),
          endDate: returnedAt ? new Date(returnedAt) : null,
          daysWorked,
          proofHash: createHash("sha256").update(`${wid}:${site.id}:${migratedAt}:${daysWorked}`).digest("hex"),
        });
      }

      const consentResearch = chance(0.34);
      const consentHistory = chance(0.94);
      const consentCrisis = chance(0.97);
      const consentWelfare = chance(0.96);

      workers.push({
        id: wid,
        uan: String(uanCounter++),
        name: person.latin,
        nameLocal: person.local,
        phone: `9${int(100000000, 999999999)}`,
        isSmartphone,
        language: lang,
        gender: isFemale ? "female" : "male",
        yearOfBirth: int(1972, 2006),
        skillCategory: pick(corridor.skills),
        sector: corridor.sector,
        homeState: corridor.fromState,
        homeDistrict,
        currentState,
        currentDistrict,
        lastSeenAt: new Date(lastSeen),
        consentWelfare,
        consentCrisis,
        consentHistory,
        consentResearch,
        registeredAt: new Date(now - int(200, 1400) * DAY),
      });

      // a consent trail for a subset — some workers revoke, which the
      // dashboard must honour
      if (chance(0.22)) {
        consentEvents.push({
          workerId: wid,
          purpose: "research",
          granted: consentResearch,
          createdAt: new Date(now - int(10, 300) * DAY),
        });
      }
    }
  }

  // ------------------------------------------------------------- long tail
  // Real migration has a thin tail: a few workers in districts that are nobody's
  // main corridor. These sparse cells are precisely what k-anonymity exists to
  // protect — a district holding four workers from one origin block is
  // effectively identifying. Without them the suppression path never executes
  // and we would be claiming a protection the system never actually exercises.
  const corridorDests = new Set(
    CORRIDORS.flatMap((c) => c.toDistricts.map((d) => `${c.toState}|${d}`)),
  );
  const tailPool = centroids.filter((c) => !corridorDests.has(`${c.st_nm}|${c.district}`));
  const tailDistricts = Array.from({ length: 75 }, () => pick(tailPool));

  for (const dest of tailDistricts) {
    const corridor = pick(CORRIDORS);
    const groupSize = int(1, 9); // deliberately below k
    for (let i = 0; i < groupSize; i++) {
      const wid = `wk_${workers.length.toString().padStart(5, "0")}`;
      const isFemale = chance(0.2);
      const homeDistrict = pick(corridor.fromDistricts);
      const tailLang = LANG_BY_STATE[corridor.fromState] ?? "hi";
      const person = makeName(corridor.fromState, tailLang, isFemale, pick);
      const isSmartphone = chance(0.8);
      const migratedAt = now - int(30, 300) * DAY;

      let lastSeen = migratedAt;
      for (let t = migratedAt; t < now; t += int(7, 16) * DAY) {
        const ageDays = (now - t) / DAY;
        const fresh = ageDays <= 7;
        const co = isSmartphone && fresh ? coordsNear(dest.st_nm, dest.district, 8) : null;
        checkIns.push({
          workerId: wid,
          worksiteId: null,
          method: isSmartphone ? "geo" : "ivr",
          state: dest.st_nm,
          district: dest.district,
          lat: co?.lat ?? null,
          lng: co?.lng ?? null,
          coarsened: !fresh,
          recordedAt: new Date(t),
          syncedAt: new Date(t + int(0, 5) * 3_600_000),
          wasOffline: chance(0.25),
          verified: true,
        });
        lastSeen = t;
      }

      migrations.push({
        workerId: wid,
        fromState: corridor.fromState,
        fromDistrict: homeDistrict,
        toState: dest.st_nm,
        toDistrict: dest.district,
        sector: corridor.sector,
        detectedAt: new Date(migratedAt),
      });

      workers.push({
        id: wid,
        uan: String(uanCounter++),
        name: person.latin,
        nameLocal: person.local,
        phone: `9${int(100000000, 999999999)}`,
        isSmartphone,
        language: tailLang,
        gender: isFemale ? "female" : "male",
        yearOfBirth: int(1972, 2006),
        skillCategory: pick(corridor.skills),
        sector: corridor.sector,
        homeState: corridor.fromState,
        homeDistrict,
        currentState: dest.st_nm,
        currentDistrict: dest.district,
        lastSeenAt: new Date(lastSeen),
        consentWelfare: chance(0.96),
        consentCrisis: chance(0.97),
        consentHistory: chance(0.94),
        consentResearch: chance(0.34),
        registeredAt: new Date(now - int(200, 1400) * DAY),
      });
    }
  }

  console.log(`  ${workers.length} workers, ${checkIns.length} check-ins`);

  // batched inserts — sqlite chokes on very large single statements
  async function insertBatched(name: string, rows: any[], fn: (b: any[]) => Promise<unknown>, size = 2000) {
    for (let i = 0; i < rows.length; i += size) {
      await fn(rows.slice(i, i + size));
      process.stdout.write(`\r  ${name}: ${Math.min(i + size, rows.length)}/${rows.length}   `);
    }
    process.stdout.write("\n");
  }

  await insertBatched("workers", workers, (b) => prisma.worker.createMany({ data: b }));
  await insertBatched("check-ins", checkIns, (b) => prisma.checkIn.createMany({ data: b }));
  await insertBatched("migrations", migrations, (b) => prisma.migrationEvent.createMany({ data: b }));
  await insertBatched("work records", records, (b) => prisma.workRecord.createMany({ data: b }));
  await insertBatched("consent events", consentEvents, (b) => prisma.consentEvent.createMany({ data: b }));

  // ----------------------------------------------------------------- officers
  console.log("creating officers…");
  await prisma.officer.createMany({
    data: [
      { id: "off_nat", name: "Dr. A. Ramachandran", email: "national@shramsetu.gov.in", role: "national" },
      { id: "off_gj", name: "Meera Desai", email: "gujarat@shramsetu.gov.in", role: "state", scopeState: "Gujarat" },
      { id: "off_surat", name: "Rakesh Patel", email: "surat@shramsetu.gov.in", role: "district", scopeState: "Gujarat", scopeDistrict: "Surat" },
      { id: "off_kl", name: "Anitha Menon", email: "kerala@shramsetu.gov.in", role: "state", scopeState: "Kerala" },
      { id: "off_od", name: "S. K. Mohapatra", email: "odisha@shramsetu.gov.in", role: "state", scopeState: "Odisha" },
    ],
  });

  // ------------------------------------------------------------------- crisis
  // Live scenario for the demo: Tapi river flooding in Surat, where the
  // Ganjam-Surat powerloom corridor concentrates Odia workers.
  console.log("creating crisis scenario…");
  const crisis = await prisma.crisisEvent.create({
    data: {
      id: "crisis_surat_flood",
      type: "flood",
      title: "Tapi river flooding — Surat industrial belt",
      state: "Gujarat",
      district: "Surat",
      severity: "severe",
      declaredById: "off_surat",
      startedAt: new Date(now - 2 * DAY),
      active: true,
    },
  });

  const inSurat = workers.filter((w) => w.currentDistrict === "Surat" && w.consentCrisis);
  const alerts = inSurat.map((w) => ({
    crisisId: crisis.id,
    workerId: w.id,
    kind: "crisis",
    channel: w.isSmartphone ? "push" : "sms",
    title: w.language === "or" ? "ବନ୍ୟା ସତର୍କତା" : "बाढ़ चेतावनी",
    body:
      w.language === "or"
        ? "ସୁରଟରେ ବନ୍ୟା। ନିକଟତମ ରିଲିଫ୍ କ୍ୟାମ୍ପ: ଉଧନା ସାମୁଦାୟିକ ହଲ୍। ସାହାଯ୍ୟ ପାଇଁ 1800-XXX କୁ ମିସ୍ କଲ୍ କରନ୍ତୁ।"
        : "सूरत में बाढ़। निकटतम राहत शिविर: उधना सामुदायिक हॉल। सहायता हेतु 1800-XXX पर मिस्ड कॉल करें।",
    language: w.language,
    sentAt: new Date(now - int(1, 40) * 3600_000),
    readAt: chance(0.58) ? new Date(now - int(1, 20) * 3600_000) : null,
  }));
  await insertBatched("alerts", alerts, (b) => prisma.alert.createMany({ data: b }));

  // --------------------------------------------------------------------- SOS
  console.log("creating SOS requests…");
  const sosTypes = ["wage_theft", "accident", "unsafe_site", "stranded", "medical"];
  const sosPool = workers.filter((w) => w.currentState !== w.homeState);
  const sos = Array.from({ length: 42 }, () => {
    const w = pick(sosPool);
    const co = coordsNear(w.currentState, w.currentDistrict, 6);
    const created = now - int(1, 45) * DAY;
    const status = pick(["open", "open", "acknowledged", "resolved", "resolved"]);
    return {
      workerId: w.id,
      type: pick(sosTypes),
      state: w.currentState,
      district: w.currentDistrict,
      lat: co?.lat ?? null,
      lng: co?.lng ?? null,
      note: null,
      status,
      createdAt: new Date(created),
      resolvedAt: status === "resolved" ? new Date(created + int(1, 5) * DAY) : null,
    };
  });
  await prisma.sosRequest.createMany({ data: sos });

  // --------------------------------------------------------------- audit log
  // Every individual-level access leaves a trace the worker can read.
  console.log("creating audit trail…");
  const auditable = sos.filter((s) => s.status !== "open").slice(0, 18);
  await prisma.auditLog.createMany({
    data: [
      ...auditable.map((s) => ({
        officerId: pick(["off_surat", "off_gj", "off_kl", "off_od"]),
        action: "view_individual",
        targetWorkerId: s.workerId,
        targetDistrict: s.district,
        legalBasis: "sos_response",
        justification: `Responding to ${s.type.replace("_", " ")} grievance raised by the worker.`,
        createdAt: new Date(s.createdAt.getTime() + int(1, 10) * 3600_000),
      })),
      {
        officerId: "off_surat",
        action: "crisis_broadcast",
        targetDistrict: "Surat",
        legalBasis: "declared_crisis",
        justification: "Flood relief broadcast to all consenting workers present in Surat district.",
        createdAt: new Date(now - 40 * 3600_000),
      },
      {
        officerId: "off_nat",
        action: "export_aggregate",
        targetDistrict: null,
        legalBasis: "worker_consent",
        justification: "Quarterly corridor statistics for the Ministry, k-anonymised at k=10.",
        createdAt: new Date(now - 9 * DAY),
      },
    ],
  });

  // ------------------------------------------------------------------ summary
  const [wc, cc, mc, rc, ac] = await Promise.all([
    prisma.worker.count(),
    prisma.checkIn.count(),
    prisma.migrationEvent.count(),
    prisma.workRecord.count(),
    prisma.alert.count(),
  ]);
  console.log(`
seed complete
  workers          ${wc}
  check-ins        ${cc}
  migration events ${mc}
  work records     ${rc}
  crisis alerts    ${ac}
  sos requests     ${sos.length}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
