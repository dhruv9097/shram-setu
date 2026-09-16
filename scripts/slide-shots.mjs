import puppeteer from "puppeteer-core";
import { resolve } from "node:path";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox","--allow-file-access-from-files","--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await p.goto("file://" + resolve("submission/submission.html"), { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");
await new Promise(r => setTimeout(r, 700));
const n = await p.evaluate(() => document.querySelectorAll(".slide").length);
const overflow = await p.evaluate(() =>
  [...document.querySelectorAll(".slide")].map((el,i) => ({
    slide: i+1,
    scrollH: el.scrollHeight, clientH: el.clientHeight,
    overflows: el.scrollHeight > el.clientHeight + 1,
  })));
console.table(overflow);
const els = await p.$$(".slide");
for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `/tmp/ss/slide${i+1}.png` });
console.log("captured", n, "slides");
await b.close();
