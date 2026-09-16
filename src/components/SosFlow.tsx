"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { SOS_TYPES, type SosType } from "@/lib/types";

const SPEECH_LOCALE: Record<string, string> = {
  hi: "hi-IN", or: "or-IN", bn: "bn-IN", as: "as-IN", en: "en-IN",
};

const GLYPH: Record<SosType, string> = {
  wage_theft: "₹",
  accident: "✕",
  unsafe_site: "⚠",
  stranded: "⚑",
  medical: "⚕",
};

type Triage = {
  type: SosType;
  urgency: "immediate" | "urgent" | "routine";
  summaryEnglish: string;
  evidence: string;
};

type Stage =
  | { k: "describe" }
  | { k: "thinking" }
  | { k: "confirm"; triage: Triage }
  | { k: "choose" }
  | { k: "sent"; type: SosType };

export function SosFlow({ lang, district, state }: { lang: Lang; district: string; state: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ k: "describe" });
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  function startVoice() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("This browser cannot listen. Please type instead.");
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = SPEECH_LOCALE[lang] ?? "hi-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const said = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setText(said);
    };
    rec.onerror = () => {
      setListening(false);
      setError("Could not hear that. Please type instead.");
    };
    rec.onend = () => setListening(false);
    setError(null);
    setListening(true);
    rec.start();
  }

  function stopVoice() {
    recRef.current?.stop();
    setListening(false);
  }

  async function submitDescription() {
    if (text.trim().length < 3) return;
    setStage({ k: "thinking" });
    try {
      const res = await fetch("/api/sos/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, language: lang }),
      });
      const body = await res.json();
      if (body?.triage) setStage({ k: "confirm", triage: body.triage });
      else setStage({ k: "choose" }); // nothing understood — the worker chooses
    } catch {
      setStage({ k: "choose" });
    }
  }

  async function file(type: SosType, triage?: Triage) {
    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        urgency: triage?.urgency ?? "routine",
        spokenText: text || undefined,
        spokenLanguage: lang,
        summaryEnglish: triage?.summaryEnglish,
        triageSuggested: triage?.type,
      }),
    });
    if (res.ok) {
      setStage({ k: "sent", type });
      router.refresh();
    } else {
      setError("Could not send. Try again.");
    }
  }

  // ------------------------------------------------------------------ sent
  if (stage.k === "sent") {
    return (
      <div className="border-l-4 border-verified bg-verified-wash px-4 py-5">
        <p lang={lang} className="text-xl font-semibold text-verified">{t("sent", lang)}</p>
        <p lang={lang} className="mt-2 text-sm">{t(`sos_${stage.type}` as never, lang)}</p>
        <p lang={lang} className="mt-3 text-sm text-ink-muted">{t("someoneWillCome", lang)}</p>
        <p className="mt-1 text-xs text-ink-faint">{district}, {state}</p>
      </div>
    );
  }

  // --------------------------------------------------------------- confirm
  if (stage.k === "confirm") {
    const { triage } = stage;
    return (
      <div>
        <p lang={lang} className="text-sm text-ink-muted">{t("understood", lang)}</p>

        <div className="mt-3 border-2 border-ink bg-paper-raised px-4 py-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-3xl leading-none">{GLYPH[triage.type]}</span>
            <div>
              <p lang={lang} className="text-lg font-semibold leading-tight">
                {t(`sos_${triage.type}` as never, lang)}
              </p>
              <p lang={lang} className="text-xs text-ink-muted">
                {t(`urgency_${triage.urgency}` as never, lang)}
              </p>
            </div>
          </div>
        </div>

        {/* The worker's own words are what gets filed; the reading of them is
            shown so they can reject it. */}
        <p className="mt-3 border-l-2 border-rule pl-3 text-xs leading-relaxed text-ink-faint">
          {triage.summaryEnglish}
        </p>

        <button
          type="button"
          onClick={() => file(triage.type, triage)}
          className="mt-5 w-full border-2 border-ochre-deep bg-ochre px-4 py-4 text-lg font-semibold"
        >
          <span lang={lang}>{t("confirmSend", lang)}</span>
        </button>

        <button
          type="button"
          onClick={() => setStage({ k: "choose" })}
          className="mt-3 w-full px-4 py-3 text-sm underline underline-offset-2"
        >
          <span lang={lang}>{t("notRight", lang)}</span>
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- choose
  if (stage.k === "choose") {
    return (
      <div>
        <p lang={lang} className="text-sm text-ink-muted">{t("orChoose", lang)}</p>
        <ul className="mt-3 space-y-px bg-rule">
          {SOS_TYPES.map((type) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => file(type)}
                className="flex w-full items-center gap-4 bg-paper-raised px-4 py-4 text-left"
              >
                <span aria-hidden className="w-7 shrink-0 text-2xl leading-none">{GLYPH[type]}</span>
                <span lang={lang} className="text-base font-medium">
                  {t(`sos_${type}` as never, lang)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // -------------------------------------------------------------- describe
  return (
    <div>
      <button
        type="button"
        onClick={listening ? stopVoice : startVoice}
        className={`flex aspect-[2/1] w-full flex-col items-center justify-center gap-2 border-2 ${
          listening ? "border-alert bg-alert-wash" : "border-ink bg-paper-raised"
        }`}
      >
        <span aria-hidden className="text-4xl leading-none">{listening ? "◉" : "ᴘ"}</span>
        <span lang={lang} className="text-lg font-semibold">
          {listening ? t("listening", lang) : t("sayAloud", lang)}
        </span>
      </button>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        lang={lang}
        placeholder="…"
        className="mt-3 w-full border border-rule bg-paper-raised px-3 py-3 text-base"
      />

      {error && <p className="mt-2 text-xs text-alert">{error}</p>}

      <button
        type="button"
        onClick={submitDescription}
        disabled={text.trim().length < 3 || stage.k === "thinking"}
        className="mt-3 w-full border-2 border-ochre-deep bg-ochre px-4 py-4 text-lg font-semibold disabled:opacity-50"
      >
        {stage.k === "thinking" ? "···" : <span lang={lang}>{t("sos", lang)}</span>}
      </button>

      <button
        type="button"
        onClick={() => setStage({ k: "choose" })}
        className="mt-4 w-full px-4 py-2 text-sm text-ink-muted underline underline-offset-2"
      >
        <span lang={lang}>{t("orChoose", lang)}</span>
      </button>
    </div>
  );
}
