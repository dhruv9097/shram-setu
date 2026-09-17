import Link from "next/link";
import { db } from "@/lib/db";
import { nationalOverview } from "@/lib/queries";
import { districtDistanceKm } from "@/lib/geo";

export const dynamic = "force-dynamic";

function timeAgo(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export default async function Home() {
  const [stats, subject] = await Promise.all([
    nationalOverview(),
    // A real row from the dataset: someone in the Ganjam-Surat powerloom
    // corridor whose eShram record still points home.
    db.worker.findFirst({
      where: {
        homeState: "Odisha",
        currentDistrict: "Surat",
        nameLocal: { not: null },
        sector: "textile",
      },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  const distanceKm = subject
    ? districtDistanceKm(subject.homeState, subject.homeDistrict, subject.currentState, subject.currentDistrict)
    : null;

  return (
    <main className="mx-auto max-w-[72rem] px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-5">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">ShramSetu</span>
          <span lang="hi" className="text-lg text-ink-muted">श्रम सेतु</span>
        </div>
        <p className="text-xs text-ink-faint">
          Built on eShram, for the Ministry of Labour &amp; Employment
        </p>
      </header>

      {/* hero — statement left, the evidence right */}
      <section className="grid gap-x-12 gap-y-10 pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:pt-20">
        <div>
          <h1 className="max-w-[16ch] text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl">
            eShram knows who India&rsquo;s workers are. Not where they are.
          </h1>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-ink-muted">
            The register records a worker once, at enrolment, against a home address.
            Then they migrate for work and the record stays behind. Welfare is delivered
            to the address, so it never reaches the worker.
          </p>
        </div>

        {subject && (
          <figure className="border border-rule bg-paper-raised lg:mt-2">
            <figcaption className="flex items-baseline justify-between border-b border-rule-soft px-5 py-3">
              <span className="text-xs text-ink-faint">One worker in this system</span>
              <span className="num text-xs text-ink-faint">
                UAN {subject.uan.slice(0, 4)}&thinsp;&hellip;&thinsp;{subject.uan.slice(-4)}
              </span>
            </figcaption>

            <div className="px-5 py-5">
              <p lang={subject.language} className="text-xl font-semibold leading-tight">
                {subject.nameLocal}
              </p>
              <p className="mt-1 text-sm text-ink-faint">
                {subject.skillCategory}, {subject.sector}
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="reveal leader" style={{ animationDelay: "120ms" }}>
                  <dt className="text-ink-muted">eShram record says</dt>
                  <dd className="font-medium">{subject.homeDistrict}, {subject.homeState}</dd>
                </div>
                <div className="reveal leader" style={{ animationDelay: "560ms" }}>
                  <dt className="text-ink-muted">Actually present in</dt>
                  <dd className="flex items-baseline gap-2 font-medium text-ochre-deep">
                    {subject.currentDistrict}, {subject.currentState}
                    <span className="num text-xs font-normal text-ink-faint">{timeAgo(subject.lastSeenAt)}</span>
                  </dd>
                </div>
              </dl>
            </div>

            <p className="border-t border-rule-soft px-5 py-3 text-xs leading-relaxed text-ink-muted">
              {subject.homeDistrict} to {subject.currentDistrict} is{" "}
              <span className="num">{distanceKm?.toLocaleString("en-IN")}</span> km across two
              state borders. The ration entitlement, the accident cover and the scheme
              eligibility all stayed in {subject.homeDistrict}.
            </p>
          </figure>
        )}
      </section>

      {/* the scale of it */}
      <section className="mt-16 grid gap-px border-y border-rule bg-rule sm:grid-cols-3">
        {[
          {
            value: stats.nonDomiciled.toLocaleString("en-IN"),
            of: `of ${stats.totalWorkers.toLocaleString("en-IN")}`,
            label: "are outside their home state right now, invisible to the state they stand in",
          },
          {
            value: `${stats.featurePhonePct}%`,
            of: `${stats.featurePhone.toLocaleString("en-IN")} workers`,
            label: "have no smartphone, so any app-only system silently drops them",
          },
          {
            value: stats.districtsCovered.toLocaleString("en-IN"),
            of: "districts",
            label: "hold at least one worker from somewhere else in the country",
          },
        ].map((s) => (
          <div key={s.label} className="bg-paper px-5 py-6">
            <p className="flex items-baseline gap-2">
              <span className="num text-3xl font-semibold leading-none">{s.value}</span>
              <span className="text-xs text-ink-faint">{s.of}</span>
            </p>
            <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-ink-muted">{s.label}</p>
          </div>
        ))}
      </section>

      {/* the inversion */}
      <section className="mt-20 grid gap-x-12 gap-y-8 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">So we did not build tracking.</h2>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink-muted">
            A worker has no reason to keep a government database current, and every reason
            to distrust one that follows them. ShramSetu inverts it: the worker marks their
            own presence, the way a muster roll has always worked, and the attestation pays
            them back the same day.
          </p>
        </div>

        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {[
            ["Ration that travels", "Presence at destination establishes portability, so the entitlement follows the worker."],
            ["Proof of employment", "Each attestation builds a verifiable work record, for an accident claim, a loan, the next job."],
            ["Reachable in a crisis", "When a district floods, the state can warn everyone standing in it, in the language they read."],
            ["Nothing without consent", "Purpose-specific, revocable, and every official who looks is recorded where the worker can see it."],
          ].map(([term, detail]) => (
            <li key={term} className="border-l-2 border-ochre pl-4">
              <p className="font-medium">{term}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* entry points */}
      <section className="mt-20">
        <h2 className="text-xl font-semibold tracking-tight">Open the system</h2>
        <div className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/w",
              title: "Worker app",
              sub: "मज़दूर",
              lang: "hi",
              detail: "Mark presence, carry your work history, control who sees it.",
              note: "Best viewed on a phone",
            },
            {
              href: "/dashboard",
              title: "Officer dashboard",
              sub: "Labour department",
              detail: "District presence, migration corridors, crisis response.",
              note: `${stats.districtsCovered} districts live`,
            },
            {
              href: "/employer",
              title: "Employer console",
              sub: "Worksite",
              detail: "Post a worksite code, keep an attested muster roll.",
              note: "For contractors and units",
            },
            {
              href: "/ivr",
              title: "No smartphone",
              sub: "Missed call",
              detail: "How the one in five without a phone marks presence.",
              note: `${stats.featurePhone.toLocaleString("en-IN")} workers in this system`,
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col justify-between gap-6 bg-paper-raised p-5 transition-colors hover:bg-ochre-wash"
            >
              <div>
                <p className="font-semibold">{card.title}</p>
                <p lang={card.lang} className="mt-0.5 text-sm text-ink-faint">{card.sub}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{card.detail}</p>
              </div>
              <p className="text-xs text-ink-faint">{card.note}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
        <p className="max-w-[78ch]">
          Every figure here is computed from synthetic data generated along documented
          Indian migration corridors. No real worker record is used. Aggregates are
          suppressed below <span className="num">k&nbsp;=&nbsp;10</span>, and precise
          coordinates are discarded seven days after the attestation they verified.
        </p>
      </footer>
    </main>
  );
}
