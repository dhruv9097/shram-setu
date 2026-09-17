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
  whatHappened: { hi: "क्या हुआ?", or: "କଣ ହେଲା?", bn: "কী হয়েছে?", as: "কি হ'ল?", en: "What happened?" },
  sayAloud: { hi: "बोलकर बताएँ", or: "କହି ଜଣାନ୍ତୁ", bn: "বলে জানান", as: "কৈ জনাওক", en: "Say it aloud" },
  listening: { hi: "सुन रहे हैं…", or: "ଶୁଣୁଛୁ…", bn: "শুনছি…", as: "শুনি আছোঁ…", en: "Listening…" },
  orChoose: { hi: "या नीचे से चुनें", or: "କିମ୍ବା ତଳୁ ବାଛନ୍ତୁ", bn: "অথবা নিচে থেকে বেছে নিন", as: "বা তলৰ পৰা বাছক", en: "Or choose below" },
  understood: { hi: "यह समझा गया", or: "ଏହା ବୁଝାଗଲା", bn: "এটা বোঝা গেছে", as: "এইটো বুজা গ'ল", en: "This is what was understood" },
  confirmSend: { hi: "हाँ, यही भेजें", or: "ହଁ, ଏହା ପଠାନ୍ତୁ", bn: "হ্যাঁ, এটাই পাঠান", as: "হয়, এইটোৱে পঠিয়াওক", en: "Yes, send this" },
  notRight: { hi: "यह सही नहीं है", or: "ଏହା ଠିକ୍ ନୁହେଁ", bn: "এটা ঠিক নয়", as: "এইটো শুদ্ধ নহয়", en: "That is not right" },
  sent: { hi: "भेज दिया गया", or: "ପଠାଇ ଦିଆଗଲା", bn: "পাঠানো হয়েছে", as: "পঠিওৱা হ'ল", en: "Sent" },
  someoneWillCome: { hi: "अधिकारी आपसे संपर्क करेंगे", or: "ଅଧିକାରୀ ଆପଣଙ୍କୁ ଯୋଗାଯୋଗ କରିବେ", bn: "কর্মকর্তা আপনার সাথে যোগাযোগ করবেন", as: "বিষয়াই আপোনাৰ লগত যোগাযোগ কৰিব", en: "An officer will contact you" },
  back: { hi: "वापस", or: "ପଛକୁ", bn: "ফিরে যান", as: "উভতি যাওক", en: "Back" },
  sos_wage_theft: { hi: "मज़दूरी नहीं मिली", or: "ମଜୁରି ମିଳିନାହିଁ", bn: "মজুরি পাইনি", as: "মজুৰি নাপালোঁ", en: "Wages not paid" },
  sos_accident: { hi: "चोट लग गई", or: "ଆଘାତ ଲାଗିଛି", bn: "আঘাত পেয়েছি", as: "আঘাত পালোঁ", en: "I am injured" },
  sos_unsafe_site: { hi: "काम की जगह ख़तरनाक है", or: "କାମ ସ୍ଥାନ ବିପଦଜନକ", bn: "কাজের জায়গা বিপজ্জনক", as: "কামৰ ঠাই বিপদজনক", en: "The site is unsafe" },
  sos_stranded: { hi: "फँस गया हूँ", or: "ଆଟକି ଯାଇଛି", bn: "আটকে পড়েছি", as: "আটক পৰিছোঁ", en: "I am stranded" },
  sos_medical: { hi: "बीमार हूँ", or: "ଅସୁସ୍ଥ ଅଛି", bn: "অসুস্থ", as: "অসুস্থ", en: "I am ill" },
  urgency_immediate: { hi: "तुरंत", or: "ତୁରନ୍ତ", bn: "এখনই", as: "তৎক্ষণাৎ", en: "Immediate" },
  urgency_urgent: { hi: "ज़रूरी", or: "ଜରୁରୀ", bn: "জরুরি", as: "জৰুৰী", en: "Urgent" },
  urgency_routine: { hi: "सामान्य", or: "ସାଧାରଣ", bn: "সাধারণ", as: "সাধাৰণ", en: "Routine" },
  scanCode: { hi: "साइट का कोड स्कैन करें", or: "ସାଇଟ୍ କୋଡ୍ ସ୍କାନ୍ କରନ୍ତୁ", bn: "সাইটের কোড স্ক্যান করুন", as: "ছাইটৰ ক'ড স্কেন কৰক", en: "Scan the worksite code" },
  pointAtCode: { hi: "कोड की ओर कैमरा रखें", or: "କୋଡ୍ ଆଡ଼କୁ କ୍ୟାମେରା ଧରନ୍ତୁ", bn: "কোডের দিকে ক্যামেরা ধরুন", as: "ক'ডৰ ফালে কেমেৰা ধৰক", en: "Point the camera at the code" },
  enterCode: { hi: "या कोड टाइप करें", or: "କିମ୍ବା କୋଡ୍ ଟାଇପ୍ କରନ୍ତୁ", bn: "অথবা কোড টাইপ করুন", as: "বা ক'ড টাইপ কৰক", en: "Or type the code" },
  cameraBlocked: { hi: "कैमरा नहीं खुला। कोड टाइप करें।", or: "କ୍ୟାମେରା ଖୋଲିଲା ନାହିଁ। କୋଡ୍ ଟାଇପ୍ କରନ୍ତୁ।", bn: "ক্যামেরা খোলেনি। কোড টাইপ করুন।", as: "কেমেৰা নোখোলিল। ক'ড টাইপ কৰক।", en: "The camera did not open. Type the code instead." },
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
