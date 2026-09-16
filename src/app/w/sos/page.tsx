import Link from "next/link";
import { redirect } from "next/navigation";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { t, timeAgo, type Lang } from "@/lib/i18n";
import { SosFlow } from "@/components/SosFlow";
import { WorkerNav } from "@/components/WorkerNav";

export const dynamic = "force-dynamic";

export default async function SosPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const worker = await currentWorker();
  if (!worker) redirect("/w");

  const { lang: override } = await searchParams;
  const lang = (override === "en" ? "en" : worker.language) as Lang;

  const [open, unread] = await Promise.all([
    db.sosRequest.findMany({
      where: { workerId: worker.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.alert.count({ where: { workerId: worker.id, readAt: null } }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex items-baseline justify-between gap-3 border-b border-rule px-5 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <h1 lang={lang} className="text-xl font-semibold">{t("whatHappened", lang)}</h1>
        <Link href="/w/home" lang={lang} className="shrink-0 text-sm text-ink-muted underline underline-offset-2">
          {t("back", lang)}
        </Link>
      </header>

      <main className="flex-1 px-5 py-5">
        <SosFlow lang={lang} district={worker.currentDistrict} state={worker.currentState} />

        {open.length > 0 && (
          <section className="mt-9 border-t border-rule pt-5">
            <h2 className="text-xs font-semibold text-ink-muted">Earlier requests</h2>
            <ul className="mt-3 space-y-2.5">
              {open.map((s) => (
                <li key={s.id} className="leader text-sm">
                  <span lang={lang}>{t(`sos_${s.type}` as never, lang)}</span>
                  <span className="text-xs text-ink-faint">
                    {s.status === "resolved" ? "resolved" : timeAgo(s.createdAt, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <WorkerNav lang={lang} active="/w/home" alertCount={unread} />
    </div>
  );
}
