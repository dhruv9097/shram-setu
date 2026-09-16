import { translateAlert } from "../src/lib/gemini";
(async () => {
  const t0 = Date.now();
  const r = await translateAlert(
    "Flood warning",
    "Water is rising in the Tapi. Move to the relief camp at Udhna Community Hall tonight. Give a missed call to 1800-123-4567 for help.",
    ["or", "hi", "bn"],
  );
  console.log(`(${Date.now() - t0}ms)`);
  if (!r) { console.log("null — English would be sent, stated plainly"); process.exit(0); }
  for (const [lang, v] of Object.entries(r)) console.log(`\n[${lang}] ${v.title}\n     ${v.body}`);
  process.exit(0);
})();
