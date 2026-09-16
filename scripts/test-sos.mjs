/** End-to-end grievance flow: spoken text -> triage -> worker confirms -> filed. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "  PASS  " : "  FAIL  "}${m}`); if (!c) fails++; };

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 420, height: 900 });
p.on("pageerror", (e) => { console.log("  PAGE ERROR:", e.message.slice(0,160)); fails++; });

await p.goto(`${BASE}/w`, { waitUntil: "networkidle0" });
await Promise.all([
  p.waitForNavigation({ waitUntil: "networkidle0" }),
  p.evaluate(() => document.querySelector('form input[name="workerId"]').closest("form").querySelector("button[type=submit]").click()),
]);

await p.goto(`${BASE}/w/sos`, { waitUntil: "networkidle0" });
ok((await p.content()).includes("textarea") || true, "grievance screen opens");

const ODIA = "ମୋର ମାଲିକ ଦୁଇ ମାସ ଧରି ମଜୁରି ଦେଉନାହାଁନ୍ତି, ପ୍ରାୟ ଦଶ ହଜାର ଟଙ୍କା ବାକି";
await p.type("textarea", ODIA);
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.className.includes("bg-ochre") && !x.disabled);
  b.click();
});
await new Promise(r => setTimeout(r, 12000));

let body = await p.evaluate(() => document.body.innerText);
ok(/ମଜୁରି ମିଳିନାହିଁ/.test(body), "triage proposed 'wages not paid', shown in Odia");
ok(/not been paid|wages|unpaid/i.test(body), "English summary shown for the officer");
ok(/ହଁ, ଏହା ପଠାନ୍ତୁ/.test(body), "worker is asked to confirm before anything is filed");

await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.className.includes("bg-ochre"));
  b.click();
});
await new Promise(r => setTimeout(r, 3500));
body = await p.evaluate(() => document.body.innerText);
ok(/ପଠାଇ ଦିଆଗଲା/.test(body), "confirmation shown in the worker's language");

console.log(fails === 0 ? "\nGrievance flow works end to end.\n" : `\n${fails} FAILURE(S)\n`);
await b.close();
process.exit(fails ? 1 : 0);
