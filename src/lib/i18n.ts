/**
 * Worker-facing strings.
 *
 * The worker app renders in the worker's own language by default, with English
 * available but never assumed. Copy is kept short and verb-first because much
 * of the audience reads slowly or not at all — the interface leans on one
 * large action, icons and position rather than sentences.
 */
export type Lang = "hi" | "or" | "bn" | "as" | "en";

export const STRINGS = {
  markPresence: {
    hi: "हाज़िरी लगाएँ", or: "ହାଜିରା ଦିଅନ୍ତୁ", bn: "হাজিরা দিন", as: "হাজিৰা দিয়ক", en: "Mark presence",
  },
  marked: {
    hi: "हाज़िरी लग गई", or: "ହାଜିରା ହୋଇଗଲା", bn: "হাজিরা হয়ে গেছে", as: "হাজিৰা হ’ল", en: "Presence marked",
  },
  savedOffline: {
    hi: "फ़ोन में सुरक्षित, नेटवर्क आते ही भेजेंगे",
    or: "ଫୋନରେ ସଞ୍ଚିତ, ନେଟୱାର୍କ ଆସିଲେ ପଠାଯିବ",
    bn: "ফোনে সংরক্ষিত, নেটওয়ার্ক এলে পাঠানো হবে",
    as: "ফোনত ৰখা হ’ল, নেটৱৰ্ক আহিলে পঠিওৱা হ’ব",
    en: "Saved on your phone. It will send when the network returns.",
  },
  lastMarked: {
    hi: "पिछली हाज़िरी", or: "ଶେଷ ହାଜିରା", bn: "শেষ হাজিরা", as: "শেষ হাজিৰা", en: "Last marked",
  },
  work: { hi: "काम", or: "କାମ", bn: "কাজ", as: "কাম", en: "Work" },
  alerts: { hi: "सूचना", or: "ସୂଚନା", bn: "খবর", as: "খবৰ", en: "Alerts" },
  privacy: { hi: "निजता", or: "ଗୋପନୀୟତା", bn: "গোপনীয়তা", as: "গোপনীয়তা", en: "Privacy" },
  daysWorked: { hi: "दिन काम किया", or: "ଦିନ କାମ କଲେ", bn: "দিন কাজ করেছেন", as: "দিন কাম কৰিলে", en: "days worked" },
  workHistory: { hi: "काम का रिकॉर्ड", or: "କାମର ରେକର୍ଡ", bn: "কাজের রেকর্ড", as: "কামৰ ৰেকৰ্ড", en: "Work record" },
  whoSaw: {
    hi: "किसने आपकी जानकारी देखी", or: "କିଏ ଆପଣଙ୍କ ସୂଚନା ଦେଖିଲା",
    bn: "কে আপনার তথ্য দেখেছে", as: "কোনে আপোনাৰ তথ্য চালে", en: "Who looked at your data",
  },
  youControl: {
    hi: "आप तय करते हैं", or: "ଆପଣ ସ୍ଥିର କରନ୍ତି", bn: "আপনি ঠিক করেন", as: "আপুনি ঠিক কৰে", en: "You decide",
  },
  sos: { hi: "मदद चाहिए", or: "ସାହାଯ୍ୟ ଦରକାର", bn: "সাহায্য দরকার", as: "সহায় লাগে", en: "I need help" },
  pending: { hi: "भेजना बाक़ी", or: "ପଠାଇବାକୁ ବାକି", bn: "পাঠানো বাকি", as: "পঠিয়াবলৈ বাকী", en: "waiting to send" },
  offline: { hi: "नेटवर्क नहीं", or: "ନେଟୱାର୍କ ନାହିଁ", bn: "নেটওয়ার্ক নেই", as: "নেটৱৰ্ক নাই", en: "No network" },
  where: { hi: "कहाँ", or: "କେଉଁଠି", bn: "কোথায়", as: "ক'ত", en: "Where" },
  home: { hi: "घर", or: "ଘର", bn: "বাড়ি", as: "ঘৰ", en: "Home" },
  minAgo: { hi: "मिनट पहले", or: "ମିନିଟ୍ ପୂର୍ବେ", bn: "মিনিট আগে", as: "মিনিট আগে", en: "min ago" },
  hrAgo: { hi: "घंटे पहले", or: "ଘଣ୍ଟା ପୂର୍ବେ", bn: "ঘণ্টা আগে", as: "ঘণ্টা আগে", en: "hr ago" },
  daysAgo: { hi: "दिन पहले", or: "ଦିନ ପୂର୍ବେ", bn: "দিন আগে", as: "দিন আগে", en: "days ago" },
  never: { hi: "अभी तक नहीं", or: "ଏପର୍ଯ୍ୟନ୍ତ ନାହିଁ", bn: "এখনও নয়", as: "এতিয়ালৈকে নাই", en: "Not yet" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  const entry = STRINGS[key] as Record<Lang, string>;
  return entry[lang] ?? entry.en;
}

/**
 * Relative time in the worker's own language. A worker reading Odia should not
 * be handed a Hindi timestamp — that is the whole claim of this system, and it
 * fails on details like this one.
 */
export function timeAgo(d: Date, lang: Lang, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - d.getTime()) / 60000));
  if (mins < 60) return `${mins} ${t("minAgo", lang)}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${t("hrAgo", lang)}`;
  return `${Math.round(hrs / 24)} ${t("daysAgo", lang)}`;
}
