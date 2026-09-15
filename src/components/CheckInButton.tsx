"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { get, set } from "idb-keyval";
import { t, type Lang } from "@/lib/i18n";

const QUEUE_KEY = "shramsetu:queue";

type Queued = {
  id: string;
  method: "geo" | "qr";
  lat: number | null;
  lng: number | null;
  qrSecret: string | null;
  recordedAt: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "sending" }
  | { kind: "done"; district: string; state: string; migrated: boolean; approximate: boolean }
  | { kind: "queued" }
  | { kind: "error"; message: string };

async function readQueue(): Promise<Queued[]> {
  return (await get<Queued[]>(QUEUE_KEY)) ?? [];
}
async function writeQueue(q: Queued[]) {
  await set(QUEUE_KEY, q);
}

export function CheckInButton({
  lang,
  fallbackLat,
  fallbackLng,
  children,
}: {
  lang: Lang;
  /** Centroid of the worker's current district, used when the browser will
   *  not give us a location. A laptop at a demo venue reports the venue, not
   *  the worksite, so without this the demo cannot run at all. */
  fallbackLat: number;
  fallbackLng: number;
  /** Rendered between the queue state and the demo control, so that real page
   *  content is not split by a control that exists only for the demo. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState(0);
  const [simulateOffline, setSimulateOffline] = useState(false);

  const refreshPending = useCallback(async () => {
    setPending((await readQueue()).length);
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  const flush = useCallback(async () => {
    const queue = await readQueue();
    if (!queue.length) return;

    const remaining: Queued[] = [];
    for (const item of queue) {
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            method: item.method,
            lat: item.lat,
            lng: item.lng,
            qrSecret: item.qrSecret,
            recordedAt: item.recordedAt,
            wasOffline: true,
          }),
        });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    await writeQueue(remaining);
    setPending(remaining.length);
    router.refresh();
  }, [router]);

  // Flush whenever the network comes back, and once on mount in case the app
  // was closed while items were still queued.
  useEffect(() => {
    if (!simulateOffline) void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush, simulateOffline]);

  async function locate(): Promise<{ lat: number; lng: number; approximate: boolean }> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { lat: fallbackLat, lng: fallbackLng, approximate: true };
    }
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => resolve({ lat: fallbackLat, lng: fallbackLng, approximate: true }),
        4000,
      );
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, approximate: false });
        },
        () => {
          clearTimeout(timer);
          resolve({ lat: fallbackLat, lng: fallbackLng, approximate: true });
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60_000 },
      );
    });
  }

  async function markPresence() {
    setStatus({ kind: "locating" });
    const { lat, lng, approximate } = await locate();
    const recordedAt = new Date().toISOString();

    const offline = simulateOffline || (typeof navigator !== "undefined" && !navigator.onLine);
    if (offline) {
      const queue = await readQueue();
      queue.push({
        id: crypto.randomUUID(),
        method: "geo",
        lat,
        lng,
        qrSecret: null,
        recordedAt,
      });
      await writeQueue(queue);
      setPending(queue.length);
      setStatus({ kind: "queued" });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "geo", lat, lng, recordedAt, wasOffline: false }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setStatus({ kind: "error", message: body.error ?? "Could not record presence." });
        return;
      }
      setStatus({
        kind: "done",
        district: body.district,
        state: body.state,
        migrated: body.migrated,
        approximate,
      });
      router.refresh();
    } catch {
      // The network dropped mid-request. Keep the attestation rather than
      // losing it — this is the common case at a worksite.
      const queue = await readQueue();
      queue.push({ id: crypto.randomUUID(), method: "geo", lat, lng, qrSecret: null, recordedAt });
      await writeQueue(queue);
      setPending(queue.length);
      setStatus({ kind: "queued" });
    }
  }

  const busy = status.kind === "locating" || status.kind === "sending";

  return (
    <div>
      <button
        type="button"
        onClick={markPresence}
        disabled={busy}
        className="flex aspect-[5/4] w-full flex-col items-center justify-center gap-3 border-2 border-ochre-deep bg-ochre text-ink transition-[background-color,transform] active:scale-[0.99] disabled:opacity-70"
      >
        <span aria-hidden className="text-4xl leading-none">
          {busy ? "···" : "◉"}
        </span>
        <span lang={lang} className="text-2xl font-semibold leading-tight">
          {t("markPresence", lang)}
        </span>
      </button>

      {/* result line */}
      <div aria-live="polite" className="mt-4 min-h-[3.5rem]">
        {status.kind === "done" && (
          <div className="border-l-2 border-verified pl-3">
            <p lang={lang} className="font-semibold text-verified">
              {t("marked", lang)}
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">
              {status.district}, {status.state}
              {status.migrated && " — new district recorded"}
            </p>
            {status.approximate && (
              <p className="mt-0.5 text-xs text-ink-faint">
                Location taken from your last known district — this browser would not share GPS.
              </p>
            )}
          </div>
        )}

        {status.kind === "queued" && (
          <div className="border-l-2 border-ochre-deep pl-3">
            <p lang={lang} className="font-semibold">
              {t("savedOffline", lang)}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              Nothing is lost. It sends itself when a signal returns.
            </p>
          </div>
        )}

        {status.kind === "error" && (
          <p className="border-l-2 border-alert pl-3 text-sm text-alert">{status.message}</p>
        )}
      </div>

      {/* queue state */}
      {pending > 0 && (
        <div className="mt-2 flex items-baseline justify-between border border-rule bg-ochre-wash px-3 py-2">
          <span lang={lang} className="text-sm">
            <span className="num font-semibold">{pending}</span> {t("pending", lang)}
          </span>
          <button
            type="button"
            onClick={() => void flush()}
            disabled={simulateOffline}
            className="text-xs underline underline-offset-2 disabled:no-underline disabled:opacity-50"
          >
            Send now
          </button>
        </div>
      )}

      {children}

      {/* demo control — a laptop cannot lose its network without also losing
          the dev server, so the offline path is exercised explicitly */}
      <label className="mt-8 flex items-start gap-2.5 border-t border-dashed border-rule pt-4 text-xs text-ink-faint">
        <input
          type="checkbox"
          checked={simulateOffline}
          onChange={(e) => setSimulateOffline(e.target.checked)}
          className="size-4 accent-ochre-deep"
        />
        <span>Simulate no network, to show what happens at a worksite with no signal</span>
      </label>
    </div>
  );
}
