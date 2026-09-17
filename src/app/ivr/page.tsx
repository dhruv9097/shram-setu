import Link from "next/link";
import { db } from "@/lib/db";
import { FeaturePhone } from "@/components/FeaturePhone";

export const dynamic = "force-dynamic";

export default async function IvrPage() {
  // Someone who genuinely has no smartphone — the case an app-only system drops.
  const worker = await db.worker.findFirst({
    where: { isSmartphone: false, nameLocal: { not: null } },
    orderBy: { lastSeenAt: "desc" },
  });

  const featurePhoneCount = await db.worker.count({ where: { isSmartphone: false } });
  const total = await db.worker.count();

  if (!worker) return null;

  return (
    <main className="mx-auto max-w-[62rem] px-5 py-12 sm:px-8">
      <header className="border-b border-rule pb-5">
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          ShramSetu
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          The worker with no smartphone
        </h1>
        <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-ink-muted">
          <span className="num font-medium text-ink">{featurePhoneCount.toLocaleString("en-IN")}</span>{" "}
          of {total.toLocaleString("en-IN")} workers in this system have no smartphone. Every
          app-only design drops them silently. They mark presence with a missed call: the
          telecom gateway resolves the serving cell tower to a district, which is the only
          precision this system keeps from anyone.
        </p>
      </header>

      <div className="mt-9 grid gap-10 lg:grid-cols-[20rem_1fr]">
        <FeaturePhone
          phone={worker.phone}
          name={worker.nameLocal ?? worker.name}
          language={worker.language}
          towerState={worker.currentState}
          towerDistrict={worker.currentDistrict}
        />

        <section>
          <h2 className="text-sm font-semibold">What is simulated, and what is not</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="border-l-2 border-ochre pl-4">
              <p className="font-medium">The telecom gateway is simulated.</p>
              <p className="mt-1 leading-relaxed text-ink-muted">
                No IVR or SMS integration is wired. The phone above calls the same endpoint a
                real gateway would, with the same payload: a calling number and a district
                resolved from the serving cell.
              </p>
            </li>
            <li className="border-l-2 border-verified pl-4">
              <p className="font-medium">Everything after that is real.</p>
              <p className="mt-1 leading-relaxed text-ink-muted">
                The attestation is written to the same table as a smartphone check-in, moves the
                worker&rsquo;s district if it changed, and appears on the officer&rsquo;s map
                immediately. A feature-phone worker is not a second-class record.
              </p>
            </li>
            <li className="border-l-2 border-indigo-mid pl-4">
              <p className="font-medium">A missed call costs nothing.</p>
              <p className="mt-1 leading-relaxed text-ink-muted">
                No data, no balance, no literacy. The worker dials and hangs up. The reply comes
                as an SMS in their own script.
              </p>
            </li>
          </ul>

          <p className="mt-7 border-t border-rule pt-4 text-xs leading-relaxed text-ink-faint">
            Press the green key. The number dialled belongs to a synthetic worker whose eShram
            record already exists in this database.
          </p>
        </section>
      </div>
    </main>
  );
}
