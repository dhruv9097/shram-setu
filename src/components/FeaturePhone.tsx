"use client";

import { useState } from "react";

const HELPLINE = "1800 123 4567";

type Screen =
  | { k: "idle" }
  | { k: "dialling" }
  | { k: "connecting" }
  | { k: "disconnected" }
  | { k: "sms"; text: string; district: string; migrated: boolean }
  | { k: "error"; text: string };

export function FeaturePhone({
  phone,
  name,
  language,
  towerState,
  towerDistrict,
}: {
  phone: string;
  name: string;
  language: string;
  towerState: string;
  towerDistrict: string;
}) {
  const [screen, setScreen] = useState<Screen>({ k: "idle" });

  async function call() {
    setScreen({ k: "dialling" });
    await new Promise((r) => setTimeout(r, 900));
    setScreen({ k: "connecting" });
    // A missed call: the network sees the attempt and the caller hangs up.
    await new Promise((r) => setTimeout(r, 1100));
    setScreen({ k: "disconnected" });
    await new Promise((r) => setTimeout(r, 700));

    try {
      const res = await fetch("/api/ivr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, towerState, towerDistrict }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setScreen({ k: "error", text: body.error ?? "Could not reach the service." });
        return;
      }
      setScreen({ k: "sms", text: body.sms, district: `${body.district}, ${body.state}`, migrated: body.migrated });
    } catch {
      setScreen({ k: "error", text: "Network unavailable." });
    }
  }

  const lcd = (() => {
    switch (screen.k) {
      case "idle":
        return { top: "ShramSetu", lines: [HELPLINE, "", "Press call"] };
      case "dialling":
        return { top: "Dialling", lines: [HELPLINE] };
      case "connecting":
        return { top: "Calling…", lines: [HELPLINE, "", "Ringing"] };
      case "disconnected":
        return { top: "Call ended", lines: ["Missed call placed", "", "Please wait"] };
      case "sms":
        return { top: "1 new message", lines: [] };
      case "error":
        return { top: "Failed", lines: [screen.text] };
    }
  })();

  return (
    <div>
      {/* handset */}
      <div className="mx-auto w-full max-w-[17rem] rounded-[1.6rem] border-2 border-ink bg-ink p-3 shadow-sm">
        {/* lcd */}
        <div className="rounded-[0.35rem] border border-ink/40 bg-[#c7d3a8] px-3 py-3 font-mono text-ink">
          <p className="border-b border-ink/25 pb-1.5 text-[10px] uppercase tracking-wide">
            {lcd.top}
          </p>

          {screen.k === "sms" ? (
            <div className="min-h-[7.5rem] pt-2">
              <p className="text-[10px] opacity-70">ShramSetu</p>
              <p lang={language} className="mt-1 text-[13px] leading-snug">{screen.text}</p>
              {screen.migrated && (
                <p className="mt-2 border-t border-ink/25 pt-1.5 text-[10px] leading-snug opacity-80">
                  New district recorded
                </p>
              )}
            </div>
          ) : (
            <div className="min-h-[7.5rem] pt-2 text-[13px] leading-relaxed">
              {lcd.lines.map((l, i) => (
                <p key={i}>{l || " "}</p>
              ))}
            </div>
          )}
        </div>

        {/* keys */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={call}
            disabled={screen.k !== "idle" && screen.k !== "sms" && screen.k !== "error"}
            aria-label="Call"
            className="rounded bg-[#3f7d4e] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            &#9742;
          </button>
          <button
            type="button"
            onClick={() => setScreen({ k: "idle" })}
            aria-label="Clear"
            className="rounded bg-[#3a3a3a] py-2.5 text-sm text-white"
          >
            C
          </button>
          <button
            type="button"
            aria-label="End"
            onClick={() => setScreen({ k: "idle" })}
            className="rounded bg-[#8a3430] py-2.5 text-sm font-semibold text-white"
          >
            &#9711;
          </button>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "∗", "0", "#"].map((k) => (
            <span
              key={k}
              aria-hidden
              className="rounded bg-[#2a2a2a] py-2 text-center font-mono text-xs text-paper/70"
            >
              {k}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-faint">
        {name} &mdash; <span className="num">{phone}</span>
      </p>
      <p className="mt-1 text-center text-xs text-ink-faint">
        serving cell resolves to {towerDistrict}
      </p>
    </div>
  );
}
