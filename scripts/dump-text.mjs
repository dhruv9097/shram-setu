import puppeteer from "puppeteer-core";
import { resolve } from "node:path";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox","--allow-file-access-from-files"] });
const p = await b.newPage();
await p.goto("file://" + resolve("submission/submission.html"), { waitUntil: "networkidle0" });
const out = await p.evaluate(() =>
  [...document.querySelectorAll(".slide")].map((el, i) => `\n──────── SLIDE ${i + 1} ────────\n${el.innerText.trim()}`).join("\n"));
console.log(out);
const bad = await p.evaluate(() => {
  const t = document.body.innerText;
  return ["we ", "we'", " our ", " ours ", " us ", "team"].filter((w) => t.toLowerCase().includes(w));
});
console.log("\n──────── collective-voice check ────────");
console.log(bad.length ? "FOUND: " + JSON.stringify(bad) : "clean — no we / our / us / team anywhere");
await b.close();
