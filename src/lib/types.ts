// Union types kept in TS rather than Prisma enums, so the schema stays
// portable between sqlite and postgres. See prisma/schema.prisma.

export const CHECKIN_METHODS = ["qr", "geo", "ivr", "employer"] as const;
export type CheckInMethod = (typeof CHECKIN_METHODS)[number];

export const CONSENT_PURPOSES = ["welfare", "crisis", "history", "research"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const OFFICER_ROLES = ["district", "state", "national"] as const;
export type OfficerRole = (typeof OFFICER_ROLES)[number];

export const LEGAL_BASES = ["sos_response", "declared_crisis", "worker_consent", "grievance"] as const;
export type LegalBasis = (typeof LEGAL_BASES)[number];

export const SOS_TYPES = ["wage_theft", "accident", "unsafe_site", "stranded", "medical"] as const;
export type SosType = (typeof SOS_TYPES)[number];

export const CRISIS_TYPES = ["flood", "heatwave", "cyclone", "pandemic", "industrial"] as const;
export type CrisisType = (typeof CRISIS_TYPES)[number];

export const LANGUAGES = {
  hi: { label: "हिन्दी", english: "Hindi" },
  or: { label: "ଓଡ଼ିଆ", english: "Odia" },
  bn: { label: "বাংলা", english: "Bengali" },
  as: { label: "অসমীয়া", english: "Assamese" },
  en: { label: "English", english: "English" },
} as const;
export type Language = keyof typeof LANGUAGES;
