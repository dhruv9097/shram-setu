/**
 * Ranked horizontal bars. One series, so no legend — the heading names it.
 * Values are direct-labelled because the point of the chart is the ordering
 * plus the number, and an axis would cost more room than it returns.
 */
export function Bars({
  rows,
  max,
  accent = "#4d76b5",
}: {
  rows: { label: string; sub?: string; value: number }[];
  max?: number;
  accent?: string;
}) {
  const ceiling = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
          <span className="truncate text-sm">
            {r.label}
            {r.sub && <span className="ml-1.5 text-xs text-ink-faint">{r.sub}</span>}
          </span>
          <span className="num text-sm font-medium tabular-nums">
            {r.value.toLocaleString("en-IN")}
          </span>
          <span className="col-span-2 mt-1 block h-1.5 bg-rule-soft">
            <span
              className="block h-full rounded-r-[2px]"
              style={{ width: `${Math.max(2, (r.value / ceiling) * 100)}%`, background: accent }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
