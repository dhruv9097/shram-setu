import Link from "next/link";
import { db } from "@/lib/db";
import { currentOfficer } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  view_individual: "Viewed a named worker",
  crisis_broadcast: "Broadcast into a district",
  export_aggregate: "Exported aggregate statistics",
  sos_respond: "Responded to a grievance",
};

const BASIS_LABEL: Record<string, string> = {
  sos_response: "the worker asked for help",
  declared_crisis: "a declared crisis",
  worker_consent: "the worker's consent",
  grievance: "a filed grievance",
};

export default async function AuditPage() {
  const [entries, officer, totals] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        officer: { select: { name: true, role: true, scopeDistrict: true, scopeState: true } },
        targetWorker: { select: { uan: true, currentDistrict: true } },
      },
    }),
    currentOfficer(),
    db.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper-raised">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="text-base font-semibold tracking-tight">ShramSetu</Link>
            <span className="text-sm text-ink-muted">Labour department</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-ink-muted hover:text-ink">Overview</Link>
            <Link href="/dashboard/crisis" className="text-ink-muted hover:text-ink">Crisis response</Link>
            <span className="font-medium">Access log</span>
            <span className="text-xs text-ink-faint">{officer ? officer.name : "not signed in"}</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[80rem] px-5 py-7 sm:px-8">
        <h1 className="text-xl font-semibold tracking-tight">Who looked, and why</h1>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          Every time an official sees a named worker, or reaches into a district, it is
          written here with the reason. The entry is not optional and cannot be deleted
          from the interface. The worker sees the same record on their own phone, which is
          what makes it accountability rather than bookkeeping.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-y border-rule py-3 text-sm">
          {totals.map((t) => (
            <span key={t.action} className="flex items-baseline gap-2">
              <span className="num font-semibold">{t._count._all}</span>
              <span className="text-ink-muted">{ACTION_LABEL[t.action] ?? t.action}</span>
            </span>
          ))}
        </div>

        <ul className="mt-6 space-y-px bg-rule">
          {entries.map((e) => (
            <li key={e.id} className="bg-paper-raised px-4 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-medium">
                  {ACTION_LABEL[e.action] ?? e.action}
                  {e.targetWorker && (
                    <span className="num ml-2 font-normal text-ink-muted">
                      UAN {e.targetWorker.uan.slice(0, 4)}&thinsp;&hellip;&thinsp;{e.targetWorker.uan.slice(-4)}
                    </span>
                  )}
                  {!e.targetWorker && e.targetDistrict && (
                    <span className="ml-2 font-normal text-ink-muted">{e.targetDistrict}</span>
                  )}
                </p>
                <p className="num shrink-0 text-xs text-ink-faint">
                  {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {e.officer.name}
                {e.officer.scopeDistrict
                  ? `, ${e.officer.scopeDistrict}`
                  : e.officer.scopeState
                    ? `, ${e.officer.scopeState}`
                    : ", national"}
                {" — under "}
                {BASIS_LABEL[e.legalBasis] ?? e.legalBasis}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">{e.justification}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
