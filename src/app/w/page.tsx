import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { startWorkerSession, currentWorkerId } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const workerId = String(formData.get("workerId") ?? "");
  if (!workerId) return;
  await startWorkerSession(workerId);
  redirect("/w/home");
}

export default async function WorkerSignIn() {
  if (await currentWorkerId()) redirect("/w/home");

  // Three workers who between them cover the cases the system has to handle:
  // a smartphone worker inside an active crisis district, a feature-phone
  // worker who can only be reached by SMS, and a woman in domestic work.
  const [inCrisis, featurePhone, domestic] = await Promise.all([
    db.worker.findFirst({
      where: { currentDistrict: "Surat", homeState: "Odisha", isSmartphone: true, nameLocal: { not: null } },
      orderBy: { lastSeenAt: "desc" },
    }),
    db.worker.findFirst({
      where: { isSmartphone: false, nameLocal: { not: null }, NOT: { currentState: "Odisha" } },
      orderBy: { lastSeenAt: "desc" },
    }),
    db.worker.findFirst({
      where: { sector: "domestic", gender: "female", nameLocal: { not: null } },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  const demos = [
    { worker: inCrisis, note: "In Surat, where a flood was declared two days ago" },
    { worker: featurePhone, note: "No smartphone — reachable only by SMS and missed call" },
    { worker: domestic, note: "Domestic work, migrated from Jharkhand" },
  ].filter((d): d is { worker: NonNullable<typeof inCrisis>; note: string } => Boolean(d.worker));

  return (
    <main className="px-5 pb-10 pt-8">
      <div className="flex items-baseline gap-2.5">
        <span className="text-base font-semibold tracking-tight">ShramSetu</span>
        <span lang="hi" className="text-base text-ink-muted">श्रम सेतु</span>
      </div>

      <h1 lang="hi" className="mt-8 text-2xl font-semibold leading-tight">
        अपना eShram नंबर डालें
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">Sign in with your eShram UAN</p>

      <form action={signIn} className="mt-6">
        <label htmlFor="uan" className="sr-only">
          eShram UAN
        </label>
        <input
          id="uan"
          name="uan"
          inputMode="numeric"
          autoComplete="off"
          placeholder="1000 0000 0084"
          className="num w-full border border-rule bg-paper-raised px-4 py-4 text-lg tracking-wider placeholder:text-ink-faint focus:border-indigo focus:outline-none"
        />
        <p className="mt-2 text-xs text-ink-faint">
          You will get a one-time password on the phone number in your eShram record.
        </p>
      </form>

      <div className="mt-10 border-t border-rule pt-6">
        <p className="text-xs text-ink-faint">
          For this demonstration, sign in as one of these workers. Each is a synthetic
          record generated along a real migration corridor.
        </p>

        <ul className="mt-4 space-y-px bg-rule">
          {demos.map(({ worker, note }) => (
            <li key={worker.id}>
              <form action={signIn}>
                <input type="hidden" name="workerId" value={worker.id} />
                <button
                  type="submit"
                  className="flex w-full flex-col items-start gap-1 bg-paper-raised px-4 py-4 text-left transition-colors hover:bg-ochre-wash"
                >
                  <span className="flex w-full items-baseline justify-between gap-3">
                    <span lang={worker.language} className="text-lg font-semibold leading-tight">
                      {worker.nameLocal}
                    </span>
                    <span className="num shrink-0 text-2xs text-ink-faint">
                      {worker.uan.slice(0, 4)}&thinsp;&hellip;&thinsp;{worker.uan.slice(-4)}
                    </span>
                  </span>
                  <span className="text-sm text-ink-muted">
                    {worker.skillCategory} &mdash; {worker.currentDistrict}, {worker.currentState}
                  </span>
                  <span className="mt-0.5 text-xs text-ink-faint">{note}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
