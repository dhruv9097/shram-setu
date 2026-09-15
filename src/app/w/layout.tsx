/**
 * Worker shell.
 *
 * Constrained to a phone width even on a laptop, because that is the only
 * device this surface is ever used on and the demo should not pretend
 * otherwise.
 */
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ledger">
      <div className="mx-auto min-h-dvh max-w-[26rem] bg-paper shadow-[0_0_0_1px_var(--color-rule)]">
        {children}
      </div>
    </div>
  );
}
