import Link from "next/link";
import { redirect } from "next/navigation";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { t, type Lang } from "@/lib/i18n";
import { QrScanner } from "@/components/QrScanner";
import { WorkerNav } from "@/components/WorkerNav";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const worker = await currentWorker();
  if (!worker) redirect("/w");

  const { lang: override } = await searchParams;
  const lang = (override === "en" ? "en" : worker.language) as Lang;

  const unread = await db.alert.count({ where: { workerId: worker.id, readAt: null } });

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex items-baseline justify-between gap-3 border-b border-rule px-5 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <h1 lang={lang} className="text-lg font-semibold leading-tight">{t("scanCode", lang)}</h1>
        <Link href="/w/home" lang={lang} className="shrink-0 text-sm text-ink-muted underline underline-offset-2">
          {t("back", lang)}
        </Link>
      </header>

      <main className="flex-1 px-5 py-5">
        <QrScanner lang={lang} />
      </main>

      <WorkerNav lang={lang} active="/w/home" alertCount={unread} />
    </div>
  );
}
