/** Captures the screenshots used in the submission document. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";
const OUT = "/tmp/ss";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});

// ---- officer dashboard with Surat selected
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1320, height: 940, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  const ok = await page.evaluate(() => {
    const el = document.querySelector('path[data-district="Surat"]');
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return true;
  });
  await new Promise((r) => setTimeout(r, 2500));
  const panel = await page.evaluate(() => document.querySelector("aside")?.innerText ?? "");
  console.log("surat selected:", ok);
  console.log("--- panel ---\n" + panel);
  await page.screenshot({ path: `${OUT}/surat-dashboard.png` });

  // just the drill-down panel, for a tight crop
  const aside = await page.$("aside");
  if (aside) await aside.screenshot({ path: `${OUT}/surat-panel.png` });
  await page.close();
}

// ---- worker app, Odia, inside the crisis district
{
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 880, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/w`, { waitUntil: "networkidle0" });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.evaluate(() =>
      document.querySelector('form input[name="workerId"]').closest("form").querySelector("button[type=submit]").click(),
    ),
  ]);
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/worker-odia.png` });

  // offline state, for the no-signal evidence
  await page.evaluate(() => document.querySelector('input[type=checkbox]').click());
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => document.querySelector("main button").click());
  await new Promise((r) => setTimeout(r, 5000));
  await page.screenshot({ path: `${OUT}/worker-offline.png` });
  await page.close();
}

// ---- the map alone, presence view
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1050, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1600));
  const svg = await page.$("svg[role=img]");
  await svg.screenshot({ path: `${OUT}/map-presence.png` });

  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Corridors");
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  const svg2 = await page.$("svg[role=img]");
  await svg2.screenshot({ path: `${OUT}/map-corridors.png` });
  await page.close();
}

await browser.close();
console.log("captured");
