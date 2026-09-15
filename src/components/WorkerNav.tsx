import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

const ITEMS = [
  { href: "/w/home", key: "markPresence", glyph: "◉" },
  { href: "/w/work", key: "work", glyph: "▤" },
  { href: "/w/alerts", key: "alerts", glyph: "△" },
  { href: "/w/privacy", key: "privacy", glyph: "◌" },
] as const;

export function WorkerNav({
  lang,
  active,
  alertCount = 0,
}: {
  lang: Lang;
  active: string;
  alertCount?: number;
}) {
  return (
    <nav
      className="sticky bottom-0 grid grid-cols-4 gap-px border-t border-rule bg-rule"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {ITEMS.map((item) => {
        const current = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`flex flex-col items-center gap-1 px-1 py-3 ${
              current ? "bg-ochre-wash text-ink" : "bg-paper-raised text-ink-muted"
            }`}
          >
            <span aria-hidden className="relative text-lg leading-none">
              {item.glyph}
              {item.href === "/w/alerts" && alertCount > 0 && (
                <span className="num absolute -right-2.5 -top-1 min-w-[1.1rem] rounded-full bg-alert px-1 text-2xs font-semibold leading-[1.1rem] text-white">
                  {alertCount}
                </span>
              )}
            </span>
            <span lang={lang} className="text-2xs leading-tight">
              {t(item.key, lang)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
