import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { startOfficerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const id = String(formData.get("officerId") ?? "");
  if (!id) return;
  await startOfficerSession(id);
  redirect("/dashboard/crisis");
}

export default async function OfficerSignIn() {
  const officers = await db.officer.findMany({ orderBy: { role: "asc" } });

  return (
    <main className="mx-auto max-w-[34rem] px-5 py-14 sm:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Sign in as an officer</h1>
      <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-ink-muted">
        The aggregate views need no sign-in — they are suppressed below{" "}
        <span className="num">k&nbsp;=&nbsp;10</span> and safe to publish as they stand.
        Identity is required to <em>act</em>: to broadcast into a district, or to see a
        named worker. Every such action is written to a log the worker can read.
      </p>

      <ul className="mt-7 space-y-px bg-rule">
        {officers.map((o) => (
          <li key={o.id}>
            <form action={signIn}>
              <input type="hidden" name="officerId" value={o.id} />
              <button
                type="submit"
                className="flex w-full items-baseline justify-between gap-4 bg-paper-raised px-4 py-4 text-left transition-colors hover:bg-indigo-wash"
              >
                <span>
                  <span className="block font-medium">{o.name}</span>
                  <span className="block text-xs text-ink-faint">{o.email}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {o.role === "national"
                    ? "National"
                    : o.scopeDistrict
                      ? `${o.scopeDistrict}, ${o.scopeState}`
                      : o.scopeState}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
