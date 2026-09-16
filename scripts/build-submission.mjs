/**
 * Renders submission/submission.html to PDF and reports the exact word count.
 * The brief caps the written content at 500 words, so every visible word on
 * every slide is counted — headings, labels, captions and footers included,
 * which is the conservative reading of the rule.
 */
import puppeteer from "puppeteer-core";
import { statSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SRC = resolve("submission/submission.html");
const OUT = resolve("submission/ShramSetu-PS1.pdf");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--allow-file-access-from-files"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await page.goto(`file://${SRC}`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 800));

const report = await page.evaluate(() => {
  const count = (s) => (s.trim().match(/[^\s]+/g) ?? []).length;
  const slides = [...document.querySelectorAll(".slide")].map((el, i) => ({
    slide: i + 1,
    words: count(el.innerText),
  }));
  return { slides, total: slides.reduce((a, s) => a + s.words, 0) };
});

console.table(report.slides);
console.log("TOTAL WORDS:", report.total, report.total <= 500 ? "— within the 500 limit" : `— OVER by ${report.total - 500}`);

await page.pdf({
  path: OUT,
  width: "1280px",
  height: "720px",
  printBackground: true,
  pageRanges: "1-6",
});
await browser.close();

const mb = statSync(OUT).size / 1_048_576;
console.log(`PDF: ${OUT}`);
console.log(`SIZE: ${mb.toFixed(2)} MB ${mb <= 5 ? "— within the 5 MB limit" : "— OVER 5 MB"}`);
