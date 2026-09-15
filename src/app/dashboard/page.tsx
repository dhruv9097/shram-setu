import Link from "next/link";
import {
  nationalOverview,
  districtPresence,
  corridorFlows,
  privacyPosture,
  activeCrises,
} from "@/lib/queries";
import { DashboardView } from "@/components/DashboardView";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [overview, presence, corridors, posture, crises] = await Promise.all([
    nationalOverview(),
    districtPresence(),
    corridorFlows(),
    privacyPosture(),
    activeCrises(),
  ]);

  // Named only so the map can paint them as withheld. The counts stay on the
  // server — kAnonymise strips them before returning.
  const suppressedKeys = presence.suppressed.map((d) => `${d.state}|${d.district}`);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper-raised">
        <div className="mx-auto flex max-w-[84rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              ShramSetu
            </Link>
            <span className="text-sm text-ink-muted">Labour department</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <span className="font-medium">Overview</span>
            <Link href="/dashboard/crisis" className="text-ink-muted hover:text-ink">
              Crisis response
            </Link>
            <Link href="/dashboard/audit" className="text-ink-muted hover:text-ink">
              Access log
            </Link>
          </nav>
        </div>
      </header>

      {crises.length > 0 && (
        <div className="border-b border-alert/30 bg-alert-wash">
          <div className="mx-auto flex max-w-[84rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-2.5 sm:px-8">
            <p className="text-sm">
              <span className="font-semibold text-alert">Active crisis</span>{" "}
              <span className="text-ink-muted">
                {crises[0].title} — declared by {crises[0].declaredBy.name}
              </span>
            </p>
            <Link href="/dashboard/crisis" className="text-sm font-medium text-alert underline underline-offset-2">
              Open response
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[84rem] px-5 py-6 sm:px-8">
        {/* headline figures */}
        <section className="mb-7 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: overview.totalWorkers, label: "workers registered" },
            { value: overview.nonDomiciled, label: "working outside their home state" },
            { value: overview.districtsCovered, label: "districts holding migrant workers" },
            { value: overview.checkInsToday, label: "presence marks in the last day" },
          ].map((s) => (
            <div key={s.label} className="bg-paper-raised px-4 py-3.5">
              <p className="num text-2xl font-semibold leading-none">
                {s.value.toLocaleString("en-IN")}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-ink-muted">{s.label}</p>
            </div>
          ))}
        </section>

        <DashboardView
          data={presence.visible.map((d) => ({ state: d.state, district: d.district, count: d.count }))}
          suppressedKeys={suppressedKeys}
          suppressedCount={presence.suppressedCells}
          suppressedTotal={presence.suppressedTotal}
          arcs={corridors.visible.map((c) => ({
            fromState: c.fromState,
            toState: c.toState,
            count: c.count,
          }))}
          k={posture.k}
        />

        {/* privacy posture — shown so the policy can be checked, not trusted */}
        <section className="mt-10 border-t border-rule pt-6">
          <h2 className="text-sm font-semibold">What this system is holding</h2>
          <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-ink-muted">
            These figures are computed live from the database, not asserted. An officer,
            an auditor or a worker can check that the retention policy is actually running.
          </p>
          <dl className="mt-4 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="leader">
              <dt className="text-ink-muted">Presence marks held</dt>
              <dd className="num font-medium">{posture.totalCheckIns.toLocaleString("en-IN")}</dd>
            </div>
            <div className="leader">
              <dt className="text-ink-muted">Stripped of coordinates</dt>
              <dd className="num font-medium">{posture.coarsenedPct}%</dd>
            </div>
            <div className="leader">
              <dt className="text-ink-muted">Recorded with no signal</dt>
              <dd className="num font-medium">{posture.offlinePct}%</dd>
            </div>
            <div className="leader">
              <dt className="text-ink-muted">Workers who withdrew consent</dt>
              <dd className="num font-medium">{posture.revokedResearch.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
