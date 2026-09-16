import { redirect } from "next/navigation";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { t, type Lang } from "@/lib/i18n";
import { WorkerNav } from "@/components/WorkerNav";

export const dynamic = "force-dynamic";

function months(from: Date, to: Date | null, lang: Lang) {
  const end = to ?? new Date();
  const fmt = (d: Date) =>
    d.toLocaleDateString(lang === "en" ? "en-IN" : "en-IN", { month: "short", year: "numeric" });
  return to ? `${fmt(from)} — ${fmt(end)}` : `${fmt(from)} — now`;
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const worker = await currentWorker();
  if (!worker) redirect("/w");

  const { lang: override } = await searchParams;
  const lang = (override === "en" ? "en" : worker.language) as Lang;
  const showingEnglish = lang === "en";

  const [records, unread, totalDays] = await Promise.all([
    db.workRecord.findMany({
      where: { workerId: worker.id },
      orderBy: { startDate: "desc" },
      include: { employer: { select: { name: true, verified: true } } },
    }),
    db.alert.count({ where: { workerId: worker.id, readAt: null } }),
    db.workRecord.aggregate({ where: { workerId: worker.id }, _sum: { daysWorked: true } }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="border-b border-rule px-5 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <h1 lang={lang} className="text-xl font-semibold">{t("workHistory", lang)}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          <span className="num font-semibold text-ink">{totalDays._sum.daysWorked ?? 0}</span>{" "}
          <span lang={lang}>{t("daysWorked", lang)}</span>
        </p>
      </header>

      <main className="flex-1 px-5 py-5">
        <p className="text-xs leading-relaxed text-ink-muted">
          {showingEnglish
            ? "Built from the presence you marked. Show this for an accident claim, a loan, or the next job — it is signed, so anyone can verify it without seeing where you have been."
            : "आपकी लगाई हाज़िरी से बना। दुर्घटना दावे, क़र्ज़ या अगली नौकरी के लिए दिखाएँ।"}
        </p>

        {records.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            {showingEnglish ? "No record yet." : "अभी कोई रिकॉर्ड नहीं।"}
          </p>
        ) : (
          <ul className="mt-5 space-y-px bg-rule">
            {records.map((r) => (
              <li key={r.id} className="bg-paper-raised px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-base font-semibold leading-snug">{r.employer.name}</p>
                  {r.employer.verified && (
                    <span className="shrink-0 border border-verified px-1.5 py-0.5 text-2xs text-verified">
                      {showingEnglish ? "registered" : "पंजीकृत"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {r.sector} — {r.district}, {r.state}
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="leader">
                    <dt className="text-ink-muted">{showingEnglish ? "Period" : "अवधि"}</dt>
                    <dd className="num">{months(r.startDate, r.endDate, lang)}</dd>
                  </div>
                  <div className="leader">
                    <dt className="text-ink-muted">{t("daysWorked", lang)}</dt>
                    <dd className="num font-semibold">{r.daysWorked}</dd>
                  </div>
                </dl>
                <p className="num mt-3 break-all border-t border-rule-soft pt-2 text-2xs text-ink-faint">
                  {r.proofHash.slice(0, 32)}…
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>

      <WorkerNav lang={lang} active="/w/work" alertCount={unread} />
    </div>
  );
}
