/**
 * Screenshot helper. Drives the Chrome already installed on this machine —
 * no browser download. Usage:
 *   node scripts/shot.mjs <path> <out.png> [width] [height] [--full]
 * Optional env WORKER=<id> signs in as that worker first.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3001";

const [, , path = "/", out = "/tmp/ss/out.png", w = "440", h = "900", ...rest] = process.argv;
const fullPage = rest.includes("--full");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 2 });

if (process.env.WORKER) {
  await page.goto(`${BASE}/w`, { waitUntil: "networkidle0" });
  const ok = await page.evaluate(async (id) => {
    const form = [...document.querySelectorAll("form")].find(
      (f) => f.querySelector('input[name="workerId"]')?.value === id,
    );
    if (!form) return false;
    form.querySelector("button[type=submit]").click();
    return true;
  }, process.env.WORKER);
  if (!ok) {
    // fall back to the first demo persona
    await page.evaluate(() => {
      document.querySelector('form input[name="workerId"]')?.closest("form")
        ?.querySelector("button[type=submit]")?.click();
    });
  }
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
}

await page.goto(BASE + path, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: out, fullPage });
console.log("shot:", out, "->", path);
await browser.close();
