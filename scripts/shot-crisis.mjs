import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox","--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await p.goto("http://localhost:3100/officer", { waitUntil: "networkidle0" });
await Promise.all([
  p.waitForNavigation({ waitUntil: "networkidle0" }),
  p.evaluate(() => [...document.querySelectorAll("form")].find(x => x.innerText.includes("Surat")).querySelector("button[type=submit]").click()),
]);
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: "/tmp/ss/crisis.png" });
console.log("captured crisis page");
await b.close();
