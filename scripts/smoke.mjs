/** Every route renders, with no console errors and no hydration mismatch. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";

const PUBLIC = ["/", "/dashboard", "/dashboard/crisis", "/dashboard/audit", "/officer", "/w", "/employer"];
const WORKER = ["/w/home", "/w/work", "/w/alerts", "/w/privacy", "/w/sos"];

let fails = 0;
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

async function visit(page, path, label) {
  const errs = [];
  const onConsole = (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 130)); };
  const onErr = (e) => errs.push("PAGEERROR: " + e.message.slice(0, 130));
  page.on("console", onConsole);
  page.on("pageerror", onErr);
  const res = await page.goto(BASE + path, { waitUntil: "networkidle0" }).catch(() => null);
  await new Promise((r) => setTimeout(r, 900));
  const status = res?.status() ?? 0;
  const text = await page.evaluate(() => document.body.innerText.trim().length).catch(() => 0);
  page.off("console", onConsole);
  page.off("pageerror", onErr);
  const good = status === 200 && text > 40 && errs.length === 0;
  if (!good) fails++;
  console.log(`  ${good ? "PASS" : "FAIL"}  ${label.padEnd(10)} ${path.padEnd(20)} ${status} ${text}ch${errs.length ? "\n         " + errs.join("\n         ") : ""}`);
}

{
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  for (const p of PUBLIC) await visit(page, p, "public");
  await page.close();
}
{
  const page = await b.newPage();
  await page.setViewport({ width: 420, height: 900 });
  await page.goto(`${BASE}/w`, { waitUntil: "networkidle0" });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.evaluate(() => document.querySelector('form input[name="workerId"]').closest("form").querySelector("button[type=submit]").click()),
  ]);
  for (const p of WORKER) await visit(page, p, "worker");
  await page.close();
}

console.log(fails === 0 ? "\nAll routes render clean.\n" : `\n${fails} ROUTE FAILURE(S)\n`);
await b.close();
process.exit(fails ? 1 : 0);
