import Link from "next/link";
import { activeCrises, crisisReachability } from "@/lib/queries";
import { currentOfficer } from "@/lib/auth";
import { db } from "@/lib/db";
import { CrisisBroadcast } from "@/components/CrisisBroadcast";
import { Bars } from "@/components/Bars";

export const dynamic = "force-dynamic";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi", or: "Odia", bn: "Bengali", as: "Assamese", en: "English",
};

export default async function CrisisPage() {
  const [crises, officer] = await Promise.all([activeCrises(), currentOfficer()]);
  const crisis = crises[0];

  if (!crisis) {
    return (
      <main className="mx-auto max-w-[60rem] px-5 py-14 sm:px-8">
        <h1 className="text-xl font-semibold">No active crisis</h1>
        <p className="mt-3 text-sm text-ink-muted">
          When a district is declared, the workers present in it appear here with the
          languages needed to reach them.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm underline underline-offset-2">
          Back to the dashboard
        </Link>
      </main>
    );
  }

  const [reach, sent] = await Promise.all([
    crisisReachability(crisis.state, crisis.district),
    db.alert.count({ where: { crisisId: crisis.id } }),
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
            <span className="font-medium">Crisis response</span>
            <Link href="/dashboard/audit" className="text-ink-muted hover:text-ink">Access log</Link>
            <span className="text-xs text-ink-faint">
              {officer ? `${officer.name}` : "not signed in"}
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[80rem] px-5 py-7 sm:px-8">
        <div className="border-l-4 border-alert bg-alert-wash px-5 py-4">
          <h1 className="text-xl font-semibold text-alert">{crisis.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {crisis.severity} &middot; declared by {crisis.declaredBy.name} &middot;{" "}
            {crisis.district}, {crisis.state}
          </p>
        </div>

        <section className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-4">
          {[
            { v: reach.present, l: "workers present in the district" },
            { v: reach.nonDomiciled, l: "are from another state" },
            { v: reach.reachable, l: "consent to crisis contact" },
            { v: reach.unreachable, l: "withdrew consent, will not be contacted" },
          ].map((s) => (
            <div key={s.l} className="bg-paper-raised px-4 py-3.5">
              <p className="num text-2xl font-semibold leading-none">
                {s.v.toLocaleString("en-IN")}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-ink-muted">{s.l}</p>
            </div>
          ))}
        </section>

        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_1.05fr]">
          <section>
            <h2 className="text-sm font-semibold">Languages this district needs</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              A warning in the wrong language is not a warning. This is the operational
              reason presence has to be known at all.
            </p>
            <div className="mt-4">
              <Bars
                rows={reach.byLanguage.map((l) => ({
                  label: LANGUAGE_NAMES[l.language] ?? l.language,
                  sub: l.sms > 0 ? `${l.sms} by SMS` : undefined,
                  value: l.total,
                }))}
                accent="#a8322d"
              />
            </div>
            {sent > 0 && (
              <p className="mt-5 border-t border-rule pt-3 text-xs text-ink-faint">
                <span className="num">{sent.toLocaleString("en-IN")}</span> alerts already
                sent for this crisis.
              </p>
            )}
          </section>

          <CrisisBroadcast
            crisisId={crisis.id}
            district={crisis.district}
            signedIn={Boolean(officer)}
            reachable={reach.reachable}
            withheld={reach.unreachable}
          />
        </div>
      </main>
    </div>
  );
}
