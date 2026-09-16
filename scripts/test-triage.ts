/** Checks multilingual grievance triage against realistic worker phrasing. */
import { triageGrievance, geminiConfigured } from "../src/lib/gemini";

const CASES: { text: string; lang: string; expect: string }[] = [
  { text: "ମୋର ମାଲିକ ତିନି ମାସ ଧରି ମଜୁରି ଦେଉନାହାଁନ୍ତି। ପ୍ରାୟ ପନ୍ଦର ହଜାର ଟଙ୍କା ବାକି ଅଛି।", lang: "or", expect: "wage_theft" },
  { text: "मेरा हाथ मशीन में आ गया है, बहुत खून बह रहा है", lang: "hi", expect: "accident" },
  { text: "ঠিকাদার চলে গেছে, আমাদের কাছে টাকা নেই, বাড়ি ফিরতে পারছি না", lang: "bn", expect: "stranded" },
  { text: "साइट पर मचान बहुत कमजोर है, कभी भी गिर सकता है", lang: "hi", expect: "unsafe_site" },
  { text: "तबीयत ठीक नहीं है, तेज बुखार है तीन दिन से", lang: "hi", expect: "medical" },
];

(async () => {
  console.log("gemini configured:", geminiConfigured(), "\n");
  let correct = 0;
  for (const c of CASES) {
    const t0 = Date.now();
    const r = await triageGrievance(c.text, c.lang);
    const hit = r?.type === c.expect;
    if (hit) correct++;
    console.log(`${hit ? "  MATCH " : "  MISS  "}[${c.lang}] expected ${c.expect} — got ${r ? `${r.type} / ${r.urgency}` : "null"} (${Date.now() - t0}ms)`);
    if (r) {
      console.log(`         summary : ${r.summaryEnglish}`);
      console.log(`         evidence: ${r.evidence}`);
    }
  }
  console.log(`\n${correct}/${CASES.length} classified as expected`);
  process.exit(0);
})();
