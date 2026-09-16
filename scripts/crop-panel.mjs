import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox","--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1320, height: 1200, deviceScaleFactor: 2 });
await p.goto("http://localhost:3100/dashboard", { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(() => document.querySelector('path[data-district="Surat"]').dispatchEvent(new MouseEvent("click",{bubbles:true})));
await new Promise(r => setTimeout(r, 2500));
const inner = await p.$("aside > div");
await inner.screenshot({ path: "/tmp/ss/surat-panel.png" });
console.log("panel cropped:", await p.evaluate(() => {
  const r = document.querySelector("aside > div").getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)}`;
}));
await b.close();
