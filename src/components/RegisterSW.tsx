"use client";

import { useEffect } from "react";

/** Registers the service worker so the worker app opens without a network. */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration fails on an insecure origin that is not localhost.
        // The app still works; it simply will not open offline.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
