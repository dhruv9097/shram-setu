# ShramSetu — श्रम सेतु
**PS1: Migrant Worker Tracking in eShram** · Ministry of Labour & Employment

> The bridge that moves with the worker.

---

## 1. The real problem

eShram (NDUW) holds ~30 crore unorganised workers, Aadhaar-seeded, each with a UAN.
It captures a worker **once** — at registration — against a **home-state address**.

Migrant workers move. The record does not.

Consequences:
- **No destination-state visibility.** Kerala cannot count the Odia workers inside it today.
- **Welfare does not travel.** Ration portability, health schemes, accident cover are keyed to a stale address.
- **Crisis blindness.** 2020: no state could answer "who is here and who needs relief."
- **No policy signal.** Migration corridors, seasonality and sector shifts are invisible.

## 2. Why it is still unsolved

| Barrier | Consequence |
|---|---|
| Feature phones, low literacy, 20+ languages | App-only solutions exclude ~40% of workers |
| "Tracking" framing | Surveillance objection — politically and ethically fatal |
| No worker incentive | Nobody updates a database for free |
| Worksite connectivity | Online-only sync fails where workers actually are |
| Informal employers | Avoid registration to dodge compliance |

## 3. The reframe (this is the differentiator)

**Do not build tracking. Build consent-based presence attestation that pays the worker to opt in.**

The worker is never tracked. The worker **checks in**, because a check-in unlocks:
- portable ration eligibility at destination (ONORC linkage)
- proof of employment for accident/insurance claims
- local health camp + welfare alerts in their language
- a **verifiable work-history credential** — the thing that gets them the next job

Presence data is a *by-product* of a service the worker actually wants.

## 4. Pillars

### P1 — Zero-literacy check-in, three graceful degradations
1. **QR at worksite** — employer displays, worker scans, done.
2. **One-tap geofenced check-in** in the PWA — no typing, no reading.
3. **Missed-call + SMS IVR** for feature phones — district resolved from cell tower,
   confirmation SMS in the worker's language. *This is the inclusivity answer.*

### P2 — Offline-first
Worksites have no signal. Check-ins queue locally (IndexedDB) and sync on reconnect.
Demoable: toggle airplane mode, check in, come back online, watch it flush.

### P3 — Privacy by design *(answers the #1 judge objection)*
- Location stored at **district granularity** by default. Precise GPS exists only for the
  duration of a check-in event, then is coarsened and discarded.
- **k-anonymity on every official view** — cells below threshold k are suppressed.
  Officials see flows, never individuals.
- Individual lookup requires a **legitimate trigger** (worker SOS, or declared disaster
  mode) and is **written to an immutable audit log**.
- The worker has a **"who viewed my data"** screen. Consent toggles are per-purpose
  and revocable.

### P4 — Migration corridor intelligence
Aggregate dashboard: Bihar→Delhi, UP→Maharashtra, Odisha→Kerala. Seasonal waves,
sector shifts, inflow/outflow balance per district. Sankey + choropleth.

### P5 — Portable work-history credential
Every attested check-in builds a signed, verifiable work record — the worker's reason
to care. Feeds directly into NCS (PS12) and skilling schemes.

### P6 — Crisis mode
Flood, heatwave, pandemic in district X → push alerts in local language to every worker
present, and hand the state a headcount of non-domiciled workers needing relief.
This is the COVID-2020 answer.

### P7 — AI layer
- **Multilingual voice intent** (Gemini) — worker speaks Bhojpuri/Odia, system acts.
- **Welfare-gap detection** — no check-in for 30 days on a known corridor → outreach flag.
- **Inflow forecasting** — predict seasonal surges so destination states pre-position.

## 5. Architecture

Single Next.js 15 app. One repo, one language, one deploy. Chosen deliberately over
Expo + NestJS + separate dashboard: three deploy targets is the #1 way a solo team
loses a 30-hour hackathon.

```
Worker PWA (mobile routes, installable, offline-first)
Employer console (worksite QR, roster)
Officer dashboard (desktop, k-anonymised, crisis mode)
        |
Next.js route handlers  ──  Prisma  ──  Postgres
        |
Privacy kernel: coarsening · k-anonymity gate · audit log
```

Map ships as **bundled SVG topojson**, not tile servers — venue wifi cannot break the demo.

## 6. Scope discipline (30h, solo)

**Built and clickable:**
- Worker PWA: UAN login, one-tap + QR check-in, offline queue, work history,
  consent screen, "who viewed my data", SOS, Hindi/English toggle
- Officer dashboard: district choropleth, corridor flows, k-anonymity suppression
  visible in the UI, crisis broadcast, audit log
- Employer: worksite QR generation, roster
- ~5,000 synthetic workers seeded along **real** migration corridors so the map is alive

**Simulated, and labelled honestly as such:**
- IVR/SMS — a feature-phone simulator panel in the demo.
  "Gateway integration ready; simulated here."

Never claim a real Aadhaar/eShram API integration. Judges know the APIs are gated.
Say "designed to consume the eShram UAN API; mocked at this boundary" — that is a
strength, not a weakness.
