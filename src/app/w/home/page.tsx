import Link from "next/link";
import { redirect } from "next/navigation";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { centroid } from "@/lib/geo";
import { t, timeAgo, type Lang } from "@/lib/i18n";
import { CheckInButton } from "@/components/CheckInButton";
import { WorkerNav } from "@/components/WorkerNav";

export const dynamic = "force-dynamic";

export default async function WorkerHome({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const worker = await currentWorker();
  if (!worker) redirect("/w");

  const { lang: override } = await searchParams;
  const lang = (override === "en" ? "en" : worker.language) as Lang;
  const showingEnglish = lang === "en";

  const [crisis, unreadAlerts, lastCheckIn] = await Promise.all([
    db.crisisEvent.findFirst({
      where: { active: true, state: worker.currentState, district: worker.currentDistrict },
    }),
    db.alert.count({ where: { workerId: worker.id, readAt: null } }),
    db.checkIn.findFirst({ where: { workerId: worker.id }, orderBy: { recordedAt: "desc" } }),
  ]);

  const here = centroid(worker.currentState, worker.currentDistrict);

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex items-start justify-between gap-3 border-b border-rule px-5 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <div>
          <p lang={worker.language} className="text-xl font-semibold leading-tight">
            {worker.nameLocal ?? worker.name}
          </p>
          <p className="num mt-0.5 text-xs text-ink-faint">
            UAN {worker.uan.slice(0, 4)}&thinsp;{worker.uan.slice(4, 8)}&thinsp;{worker.uan.slice(8)}
          </p>
        </div>
        <Link
          href={showingEnglish ? "/w/home" : "/w/home?lang=en"}
          aria-label={showingEnglish ? "Show in my language" : "Show in English"}
          className="shrink-0 border border-rule px-2.5 py-1 text-xs text-ink-muted"
        >
          {showingEnglish ? worker.language.toUpperCase() : "EN"}
        </Link>
      </header>

      <main className="flex-1 px-5 py-5">
        {crisis && (
          <Link href="/w/alerts" className="mb-5 block border-l-4 border-alert bg-alert-wash px-4 py-3">
            <p className="text-sm font-semibold text-alert">{crisis.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              Declared in {crisis.district}. Relief information is in your alerts.
            </p>
          </Link>
        )}

        <CheckInButton lang={lang} fallbackLat={here?.lat ?? 21.17} fallbackLng={here?.lng ?? 72.83}>
          <dl className="mt-7 space-y-3 border-t border-rule pt-5 text-sm">
            <div className="leader">
              <dt lang={lang} className="text-ink-muted">{t("lastMarked", lang)}</dt>
              <dd lang={lang} className="font-medium">
                {lastCheckIn ? timeAgo(lastCheckIn.recordedAt, lang) : t("never", lang)}
              </dd>
            </div>
            <div className="leader">
              <dt lang={lang} className="text-ink-muted">{t("where", lang)}</dt>
              <dd className="font-medium">
                {worker.currentDistrict}, {worker.currentState}
              </dd>
            </div>
            <div className="leader">
              <dt lang={lang} className="text-ink-muted">{t("home", lang)}</dt>
              <dd className="font-medium text-ink-muted">
                {worker.homeDistrict}, {worker.homeState}
              </dd>
            </div>
          </dl>

          <Link
            href="/w/sos"
            className="mt-7 flex items-center justify-center border-2 border-alert px-4 py-3.5 text-alert"
          >
            <span lang={lang} className="text-base font-semibold">{t("sos", lang)}</span>
          </Link>
        </CheckInButton>
      </main>

      <WorkerNav lang={lang} active="/w/home" alertCount={unreadAlerts} />
    </div>
  );
}
