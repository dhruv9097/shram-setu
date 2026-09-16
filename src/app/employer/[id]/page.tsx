import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function EmployerConsole({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const employer = await db.employer.findUnique({
    where: { id },
    include: { worksites: { where: { active: true }, orderBy: { name: "asc" } } },
  });
  if (!employer) notFound();

  const siteIds = employer.worksites.map((w) => w.id);
  const since = new Date(Date.now() - 7 * DAY);

  const recent = await db.checkIn.findMany({
    where: { worksiteId: { in: siteIds }, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    include: { worker: { select: { id: true, name: true, nameLocal: true, language: true, uan: true, skillCategory: true } } },
    take: 400,
  });

  // One row per worker: the muster roll is who was here, not every scan.
  const roll = new Map<string, { worker: (typeof recent)[number]["worker"]; days: Set<string>; last: Date }>();
  for (const c of recent) {
    const key = c.worker.id;
    if (!roll.has(key)) roll.set(key, { worker: c.worker, days: new Set(), last: c.recordedAt });
    const entry = roll.get(key)!;
    entry.days.add(c.recordedAt.toISOString().slice(0, 10));
    if (c.recordedAt > entry.last) entry.last = c.recordedAt;
  }
  const rows = [...roll.values()].sort((a, b) => b.last.getTime() - a.last.getTime());

  const primary = employer.worksites[0];
  const qr = primary
    ? await QRCode.toDataURL(`shramsetu:site:${primary.qrSecret}`, {
        margin: 1,
        width: 320,
        color: { dark: "#1c1a17", light: "#f9faf7" },
      })
    : null;

  return (
    <main className="mx-auto max-w-[68rem] px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{employer.name}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {employer.district}, {employer.state} — <span className="num">{employer.regNo}</span>
          </p>
        </div>
        <Link href="/employer" className="text-sm text-ink-muted underline underline-offset-2">
          All employers
        </Link>
      </header>

      <div className="mt-7 grid gap-8 lg:grid-cols-[19rem_1fr]">
        {/* the code a worker scans */}
        <section>
          <h2 className="text-sm font-semibold">Worksite code</h2>
          {primary && qr ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Print this and put it at the gate. Scanning it marks presence.
              </p>
              <div className="mt-3 border border-rule bg-paper-raised p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt={`Worksite code for ${primary.name}`} className="w-full" />
                <p className="mt-3 text-sm font-medium">{primary.name}</p>
                <p className="text-xs text-ink-faint">
                  {primary.sector} — geofence <span className="num">{primary.geofenceRadius}</span> m
                </p>
              </div>
              {employer.worksites.length > 1 && (
                <p className="mt-3 text-xs text-ink-faint">
                  <span className="num">{employer.worksites.length - 1}</span> other active site
                  {employer.worksites.length > 2 ? "s" : ""} have their own codes.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">No active worksite.</p>
          )}
        </section>

        {/* the muster roll */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Muster roll, last seven days</h2>
            <p className="text-xs text-ink-faint">
              <span className="num">{rows.length}</span> workers attested
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Nobody has marked presence here this week.</p>
          ) : (
            <ul className="mt-4 space-y-px bg-rule">
              {rows.slice(0, 18).map((r) => (
                <li key={r.worker.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 bg-paper-raised px-4 py-3">
                  <span>
                    <span lang={r.worker.language} className="block font-medium leading-snug">
                      {r.worker.nameLocal ?? r.worker.name}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {r.worker.skillCategory} — UAN {r.worker.uan.slice(0, 4)}&thinsp;&hellip;&thinsp;{r.worker.uan.slice(-4)}
                    </span>
                  </span>
                  <span className="num shrink-0 text-sm">
                    {r.days.size} {r.days.size === 1 ? "day" : "days"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-ink-muted">
            An employer sees presence at their own sites and nothing else. Where a worker
            was before, or goes after, is not theirs to see.
          </p>
        </section>
      </div>
    </main>
  );
}
