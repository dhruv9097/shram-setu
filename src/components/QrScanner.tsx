"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { t, type Lang } from "@/lib/i18n";

/** The QR at a worksite encodes this, so a stray QR cannot be checked into. */
const PREFIX = "shramsetu:site:";

type Status =
  | { k: "scanning" }
  | { k: "sending" }
  | { k: "done"; district: string; state: string; worksite?: string; warning?: string }
  | { k: "error"; message: string };

export function QrScanner({ lang }: { lang: Lang }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const busyRef = useRef(false);

  const [status, setStatus] = useState<Status>({ k: "scanning" });
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [manual, setManual] = useState("");

  const submit = useCallback(
    async (secret: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setStatus({ k: "sending" });

      // A coordinate is sent when available so the server can check the
      // worker is actually at the site rather than scanning a photograph of
      // the code. A failed check is a warning, not a rejection — GPS is
      // unreliable inside a shed.
      const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timer = setTimeout(() => resolve(null), 3000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(timer); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
          () => { clearTimeout(timer); resolve(null); },
          { timeout: 3000 },
        );
      });

      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            method: "qr",
            qrSecret: secret,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            recordedAt: new Date().toISOString(),
          }),
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setStatus({ k: "error", message: body.error ?? "Could not record presence." });
          busyRef.current = false;
          return;
        }
        setStatus({
          k: "done",
          district: body.district,
          state: body.state,
          worksite: body.worksiteName,
          warning: body.geofenceWarning,
        });
        router.refresh();
      } catch {
        setStatus({ k: "error", message: "No network. Use the presence button instead — it works offline." });
        busyRef.current = false;
      }
    },
    [router],
  );

  // camera + decode loop
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraOk(true);

        const tick = () => {
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          const w = video.videoWidth;
          const h = video.videoHeight;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, w, h);
          const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
            inversionAttempts: "dontInvert",
          });
          if (found?.data?.startsWith(PREFIX)) {
            void submit(found.data.slice(PREFIX.length));
            return; // stop the loop once a code is taken
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setCameraOk(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [submit]);

  if (status.k === "done") {
    return (
      <div className="border-l-4 border-verified bg-verified-wash px-4 py-5">
        <p lang={lang} className="text-xl font-semibold text-verified">{t("marked", lang)}</p>
        {status.worksite && <p className="mt-1 text-sm font-medium">{status.worksite}</p>}
        <p className="mt-0.5 text-sm text-ink-muted">{status.district}, {status.state}</p>
        {status.warning && (
          <p className="mt-2 text-xs text-ink-faint">{status.warning}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden border-2 border-ink bg-ink">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {/* framing guide */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-2/3 border-2 border-ochre" />
        </div>
        {cameraOk === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper px-5">
            <p lang={lang} className="text-center text-sm text-ink-muted">{t("cameraBlocked", lang)}</p>
          </div>
        )}
        {status.k === "sending" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/70">
            <span className="text-2xl text-paper">···</span>
          </div>
        )}
      </div>

      <p lang={lang} className="mt-3 text-center text-sm text-ink-muted">{t("pointAtCode", lang)}</p>

      {status.k === "error" && (
        <p className="mt-3 border-l-2 border-alert pl-3 text-sm text-alert">{status.message}</p>
      )}

      {/* Typing the code is not a lesser path — at a real site the code is
          printed on a board and a cracked camera is common. */}
      <div className="mt-6 border-t border-rule pt-4">
        <label lang={lang} className="text-xs text-ink-muted">{t("enterCode", lang)}</label>
        <div className="mt-2 flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.trim())}
            inputMode="text"
            autoCapitalize="none"
            placeholder="a1b2c3d4e5"
            className="num min-w-0 flex-1 border border-rule bg-paper-raised px-3 py-3 text-base tracking-wide"
          />
          <button
            type="button"
            onClick={() => manual && submit(manual)}
            disabled={!manual || status.k === "sending"}
            className="shrink-0 border-2 border-ochre-deep bg-ochre px-5 py-3 font-semibold disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
