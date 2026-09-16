/** End-to-end check of the presence flow, including the offline queue. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";

let fails = 0;
const ok = (c, m) => { console.log(`${c ? "  PASS  " : "  FAIL  "}${m}`); if (!c) fails++; };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 440, height: 900 });
page.on("pageerror", (e) => { console.log("  PAGE ERROR:", e.message); fails++; });

// sign in as the first demo persona
await page.goto(`${BASE}/w`, { waitUntil: "networkidle0" });
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0" }),
  page.evaluate(() => document.querySelector('form input[name="workerId"]').closest("form").querySelector("button[type=submit]").click()),
]);
ok(page.url().includes("/w/home"), "signs in and lands on the presence screen");

// ---------------------------------------------------------------- online
await page.click("button.aspect-\\[5\\/4\\]").catch(async () => {
  await page.evaluate(() => document.querySelector("main button").click());
});
await new Promise((r) => setTimeout(r, 6000));
let text = await page.evaluate(() => document.body.innerText);
ok(/ହାଜିରା ହୋଇଗଲା|Presence marked/.test(text), "online check-in reports success");
ok(/Surat/.test(text), "confirmation names the resolved district");

// --------------------------------------------------------------- offline
await page.evaluate(() => {
  const cb = document.querySelector('input[type=checkbox]');
  cb.click();
});
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => document.querySelector("main button").click());
await new Promise((r) => setTimeout(r, 6000));
text = await page.evaluate(() => document.body.innerText);
ok(/ଫୋନରେ ସଞ୍ଚିତ|Saved on your phone/.test(text), "offline check-in is kept on the device");
ok(/ପଠାଇବାକୁ ବାକି|waiting to send/.test(text), "queue shows an item waiting");

const queued = await page.evaluate(async () => {
  const req = indexedDB.open("keyval-store");
  return new Promise((res) => {
    req.onsuccess = () => {
      const tx = req.result.transaction("keyval", "readonly");
      const g = tx.objectStore("keyval").get("shramsetu:queue");
      g.onsuccess = () => res(g.result?.length ?? 0);
      g.onerror = () => res(-1);
    };
    req.onerror = () => res(-1);
  });
});
ok(queued === 1, `attestation is persisted in IndexedDB (found ${queued})`);

// ---------------------------------------------------------------- flush
// Restoring the network must drain the queue on its own — the worker should
// never have to know that a retry was needed.
await page.evaluate(() => document.querySelector('input[type=checkbox]').click());
await new Promise((r) => setTimeout(r, 5000));

const queuedAfter = await page.evaluate(async () => {
  const req = indexedDB.open("keyval-store");
  return new Promise((res) => {
    req.onsuccess = () => {
      const tx = req.result.transaction("keyval", "readonly");
      const g = tx.objectStore("keyval").get("shramsetu:queue");
      g.onsuccess = () => res(g.result?.length ?? 0);
      g.onerror = () => res(-1);
    };
    req.onerror = () => res(-1);
  });
});
ok(queuedAfter === 0, `queue drains by itself on reconnect, with no user action (${queuedAfter} left)`);

console.log(fails === 0 ? "\nPresence flow works end to end.\n" : `\n${fails} FAILURE(S)\n`);
await browser.close();
process.exit(fails ? 1 : 0);
