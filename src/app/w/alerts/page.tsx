import { redirect } from "next/navigation";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { t, timeAgo, type Lang } from "@/lib/i18n";
import { WorkerNav } from "@/components/WorkerNav";

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const worker = await currentWorker();
  if (!worker) redirect("/w");

  const { lang: override } = await searchParams;
  const lang = (override === "en" ? "en" : worker.language) as Lang;

  const alerts = await db.alert.findMany({
    where: { workerId: worker.id },
    orderBy: { sentAt: "desc" },
    take: 25,
  });

  // Opening the screen is reading them. Marked after the read so the unread
  // count on this render is still correct.
  const unreadIds = alerts.filter((a) => !a.readAt).map((a) => a.id);
  if (unreadIds.length) {
    await db.alert.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="border-b border-rule px-5 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <h1 lang={lang} className="text-xl font-semibold">{t("alerts", lang)}</h1>
      </header>

      <main className="flex-1 px-5 py-5">
        {alerts.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {lang === "en" ? "Nothing right now." : "अभी कुछ नहीं।"}
          </p>
        ) : (
          <ul className="space-y-px bg-rule">
            {alerts.map((a) => {
              const fresh = unreadIds.includes(a.id);
              return (
                <li
                  key={a.id}
                  className={`bg-paper-raised px-4 py-4 ${
                    a.kind === "crisis" ? "border-l-4 border-alert" : "border-l-4 border-rule"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      lang={a.language}
                      className={`text-base font-semibold leading-snug ${
                        a.kind === "crisis" ? "text-alert" : ""
                      }`}
                    >
                      {a.title}
                    </p>
                    {fresh && <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-ochre" />}
                  </div>
                  <p lang={a.language} className="mt-1.5 text-sm leading-relaxed">{a.body}</p>
                  <p className="num mt-2 text-xs text-ink-faint">
                    {timeAgo(a.sentAt, lang)}
                    {a.channel === "sms" && " · SMS"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <WorkerNav lang={lang} active="/w/alerts" alertCount={0} />
    </div>
  );
}
