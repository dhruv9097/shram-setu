import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentWorker } from "@/lib/auth";
import { db } from "@/lib/db";
import { t, timeAgo, type Lang } from "@/lib/i18n";
import { WorkerNav } from "@/components/WorkerNav";

export const dynamic = "force-dynamic";

const PURPOSES = [
  { field: "consentWelfare", en: "Deliver welfare to me where I am", hi: "जहाँ मैं हूँ वहाँ लाभ पहुँचाएँ", or: "ମୁଁ ଯେଉଁଠି ଅଛି ସେଠାରେ ସୁବିଧା ପଠାନ୍ତୁ" },
  { field: "consentCrisis", en: "Warn me in an emergency", hi: "आपात में मुझे चेतावनी दें", or: "ଜରୁରୀ ସମୟରେ ମୋତେ ସତର୍କ କରନ୍ତୁ" },
  { field: "consentHistory", en: "Build my work record", hi: "मेरा काम का रिकॉर्ड बनाएँ", or: "ମୋର କାମର ରେକର୍ଡ ତିଆରି କରନ୍ତୁ" },
  { field: "consentResearch", en: "Use my data in anonymous statistics", hi: "गुमनाम आँकड़ों में मेरा डेटा लें", or: "ଅଜ୍ଞାତ ପରିସଂଖ୍ୟାନରେ ମୋର ତଥ୍ୟ ନିଅନ୍ତୁ" },
] as const;

async function toggleConsent(formData: FormData) {
  "use server";
  const worker = await currentWorker();
  if (!worker) return;
  const field = String(formData.get("field") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!PURPOSES.some((p) => p.field === field)) return;

  await db.worker.update({ where: { id: worker.id }, data: { [field]: next } });
  await db.consentEvent.create({
    data: { workerId: worker.id, purpose: field.replace("consent", "").toLowerCase(), granted: next },
  });
  revalidatePath("/w/privacy");
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const worker = await currentWorker();
  if (!worker) redirect("/w");

  const { lang: override } = await searchParams;
  const lang = (override === "en" ? "en" : worker.language) as Lang;
  const showingEnglish = lang === "en";

  const [looks, unread, checkIns, withCoords] = await Promise.all([
    db.auditLog.findMany({
      where: { targetWorkerId: worker.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { officer: { select: { name: true, scopeDistrict: true, scopeState: true } } },
    }),
    db.alert.count({ where: { workerId: worker.id, readAt: null } }),
    db.checkIn.count({ where: { workerId: worker.id } }),
    db.checkIn.count({ where: { workerId: worker.id, NOT: { lat: null } } }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex items-baseline justify-between gap-3 border-b border-rule px-5 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <h1 lang={lang} className="text-xl font-semibold">{t("youControl", lang)}</h1>
        <Link
          href={showingEnglish ? "/w/privacy" : "/w/privacy?lang=en"}
          className="shrink-0 border border-rule px-2.5 py-1 text-xs text-ink-muted"
        >
          {showingEnglish ? worker.language.toUpperCase() : "EN"}
        </Link>
      </header>

      <main className="flex-1 px-5 py-5">
        {/* consent, per purpose */}
        <ul className="space-y-px bg-rule">
          {PURPOSES.map((p) => {
            const on = worker[p.field] as boolean;
            const label = lang === "en" ? p.en : lang === "or" ? p.or : p.hi;
            return (
              <li key={p.field} className="bg-paper-raised">
                <form action={toggleConsent}>
                  <input type="hidden" name="field" value={p.field} />
                  <input type="hidden" name="next" value={String(!on)} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  >
                    <span lang={lang} className="text-base leading-snug">{label}</span>
                    <span
                      aria-hidden
                      className={`flex h-7 w-12 shrink-0 items-center rounded-full border-2 px-0.5 ${
                        on ? "justify-end border-verified bg-verified-wash" : "justify-start border-rule bg-paper"
                      }`}
                    >
                      <span className={`size-5 rounded-full ${on ? "bg-verified" : "bg-rule"}`} />
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          {showingEnglish
            ? "Turning one off takes effect immediately. Nothing already delivered is undone, but nothing new is sent."
            : "बंद करते ही तुरंत लागू होगा।"}
        </p>

        {/* what is held */}
        <section className="mt-8 border-t border-rule pt-5">
          <h2 className="text-sm font-semibold">
            {showingEnglish ? "What is stored about you" : "आपके बारे में क्या रखा है"}
          </h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="leader">
              <dt className="text-ink-muted">{showingEnglish ? "Times you marked presence" : "हाज़िरी लगाई"}</dt>
              <dd className="num font-medium">{checkIns.toLocaleString("en-IN")}</dd>
            </div>
            <div className="leader">
              <dt className="text-ink-muted">
                {showingEnglish ? "Still holding a location point" : "जगह का सटीक निशान बचा है"}
              </dt>
              <dd className="num font-medium">{withCoords}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            {showingEnglish
              ? "A location point is kept only long enough to confirm you were at the worksite, then deleted. Everything older is held as a district name only."
              : "सटीक जगह सिर्फ़ इतनी देर रखी जाती है कि पुष्टि हो सके, फिर मिटा दी जाती है।"}
          </p>
        </section>

        {/* who looked */}
        <section className="mt-8 border-t border-rule pt-5">
          <h2 lang={lang} className="text-sm font-semibold">{t("whoSaw", lang)}</h2>
          {looks.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              {showingEnglish ? "Nobody has looked at your record." : "अब तक किसी ने आपका रिकॉर्ड नहीं देखा।"}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {looks.map((l) => (
                <li key={l.id} className="border-l-2 border-indigo-mid pl-3">
                  <p className="text-sm font-medium">
                    {l.officer.name}
                    {l.officer.scopeDistrict ? `, ${l.officer.scopeDistrict}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{l.justification}</p>
                  <p className="num mt-0.5 text-xs text-ink-faint">{timeAgo(l.createdAt, lang)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <WorkerNav lang={lang} active="/w/privacy" alertCount={unread} />
    </div>
  );
}
