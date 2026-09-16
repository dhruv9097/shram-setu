import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EmployerIndex() {
  const employers = await db.employer.findMany({
    where: { verified: true },
    include: { _count: { select: { worksites: true } } },
    orderBy: { name: "asc" },
    take: 8,
  });

  return (
    <main className="mx-auto max-w-[44rem] px-5 py-14 sm:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Employer console</h1>
      <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-ink-muted">
        A contractor displays a worksite code. Workers scan it to mark presence, which
        builds an attested muster roll without anyone keeping a register by hand. The
        employer sees who is on site; they never see where a worker goes afterwards.
      </p>

      <ul className="mt-7 space-y-px bg-rule">
        {employers.map((e) => (
          <li key={e.id}>
            <Link
              href={`/employer/${e.id}`}
              className="flex items-baseline justify-between gap-4 bg-paper-raised px-4 py-4 transition-colors hover:bg-ochre-wash"
            >
              <span>
                <span className="block font-medium">{e.name}</span>
                <span className="block text-xs text-ink-faint">
                  {e.type} — {e.district}, {e.state}
                </span>
              </span>
              <span className="num shrink-0 text-xs text-ink-muted">
                {e._count.worksites} {e._count.worksites === 1 ? "site" : "sites"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
