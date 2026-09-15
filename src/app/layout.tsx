import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Devanagari, IBM_Plex_Mono, Noto_Sans_Oriya } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font — the demo does not depend on a
// font CDN being reachable from the venue wifi.
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});
const plexDeva = IBM_Plex_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-deva",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});
const notoOdia = Noto_Sans_Oriya({
  subsets: ["oriya"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-odia",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShramSetu — presence that travels with the worker",
  description:
    "Consent-based presence attestation for India's unorganised migrant workforce. Built on eShram.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ShramSetu", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f2f4f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${plexDeva.variable} ${plexMono.variable} ${notoOdia.variable}`}>
        {children}
      </body>
    </html>
  );
}
