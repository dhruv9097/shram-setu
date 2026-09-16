"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi", or: "Odia", bn: "Bengali", as: "Assamese", en: "English",
};

type Result = {
  sent: number; push: number; sms: number; withheld: number;
  translated: boolean; languages: string[];
};

export function CrisisBroadcast({
  crisisId,
  district,
  signedIn,
  reachable,
  withheld,
}: {
  crisisId: string;
  district: string;
  signedIn: boolean;
  reachable: number;
  withheld: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("Flood warning");
  const [body, setBody] = useState(
    "Water is rising in the Tapi. Move to the relief camp at Udhna Community Hall tonight. Give a missed call to 1800-123-4567 for help.",
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/crisis/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ crisisId, title, body }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) setError(json.error ?? "Could not send.");
      else {
        setResult(json);
        router.refresh();
      }
    } catch {
      setError("Could not send.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="border border-rule bg-paper-raised">
        <p className="border-b border-rule-soft px-5 py-3 text-sm font-semibold text-verified">
          Broadcast sent
        </p>
        <dl className="space-y-2 px-5 py-4 text-sm">
          <div className="leader">
            <dt className="text-ink-muted">Reached by app notification</dt>
            <dd className="num font-medium">{result.push.toLocaleString("en-IN")}</dd>
          </div>
          <div className="leader">
            <dt className="text-ink-muted">Reached by SMS, no smartphone</dt>
            <dd className="num font-medium">{result.sms.toLocaleString("en-IN")}</dd>
          </div>
          <div className="leader">
            <dt className="text-ink-muted">Not contacted, consent withdrawn</dt>
            <dd className="num font-medium text-withheld">{result.withheld.toLocaleString("en-IN")}</dd>
          </div>
        </dl>
        <p className="border-t border-rule-soft px-5 py-3 text-xs leading-relaxed text-ink-muted">
          {result.translated
            ? `Delivered in ${result.languages.map((l) => LANGUAGE_NAMES[l] ?? l).join(", ")}, each worker in their own language.`
            : "Translation was unavailable, so the message was delivered in English. Nothing was invented."}{" "}
          This broadcast is recorded in the access log.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-rule bg-paper-raised">
      <div className="border-b border-rule-soft px-5 py-3">
        <h2 className="text-sm font-semibold">Broadcast to {district}</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Write once in English. Each worker receives it in the language they read.
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <label className="block">
          <span className="text-xs text-ink-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm focus:border-indigo focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Message</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm leading-relaxed focus:border-indigo focus:outline-none"
          />
        </label>
      </div>

      {/* The consent floor is stated before the officer acts, not after. */}
      <p className="border-t border-rule-soft px-5 py-3 text-xs leading-relaxed text-ink-muted">
        This will reach <span className="num font-medium text-ink">{reachable.toLocaleString("en-IN")}</span>{" "}
        workers. <span className="num font-medium text-ink">{withheld.toLocaleString("en-IN")}</span>{" "}
        withdrew consent for crisis contact and will not receive it. There is no override.
      </p>

      {error && <p className="px-5 pb-2 text-xs text-alert">{error}</p>}

      <div className="border-t border-rule-soft px-5 py-4">
        {signedIn ? (
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="w-full border-2 border-alert bg-alert px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send now"}
          </button>
        ) : (
          <Link
            href="/officer"
            className="block w-full border border-rule bg-paper px-4 py-3 text-center text-sm font-medium"
          >
            Sign in as an officer to broadcast
          </Link>
        )}
      </div>
    </div>
  );
}
