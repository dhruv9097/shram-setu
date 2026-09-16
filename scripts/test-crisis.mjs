/** Crisis broadcast: consent is enforced server-side and cannot be overridden. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "  PASS  " : "  FAIL  "}${m}`); if (!c) fails++; };

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 950 });
p.on("pageerror", (e) => { console.log("  PAGE ERROR:", e.message.slice(0,140)); fails++; });

// unauthenticated: can read the district, cannot act on it
await p.goto(`${BASE}/dashboard/crisis`, { waitUntil: "networkidle0" });
let body = await p.evaluate(() => document.body.innerText);
ok(/Tapi river flooding/.test(body), "aggregate crisis view is readable without signing in");
ok(/Sign in as an officer to broadcast/.test(body), "acting on the district requires identity");

const blocked = await p.evaluate(async () => {
  const r = await fetch("/api/crisis/broadcast", { method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ crisisId: "crisis_surat_flood", title: "test", body: "test message here" }) });
  return r.status;
});
ok(blocked === 401, `broadcast API refuses an unidentified caller (got ${blocked})`);

// wrong-scope officer must be refused even when signed in
await p.goto(`${BASE}/officer`, { waitUntil: "networkidle0" });
await Promise.all([
  p.waitForNavigation({ waitUntil: "networkidle0" }),
  p.evaluate(() => {
    const forms = [...document.querySelectorAll("form")];
    const kerala = forms.find(f => f.innerText.includes("Kerala"));
    (kerala ?? forms[0]).querySelector("button[type=submit]").click();
  }),
]);
const scoped = await p.evaluate(async () => {
  const r = await fetch("/api/crisis/broadcast", { method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ crisisId: "crisis_surat_flood", title: "test", body: "test message here" }) });
  return { status: r.status, body: await r.json() };
});
ok(scoped.status === 403, `a Kerala officer cannot broadcast into Gujarat (got ${scoped.status})`);

// correct officer
await p.goto(`${BASE}/officer`, { waitUntil: "networkidle0" });
await Promise.all([
  p.waitForNavigation({ waitUntil: "networkidle0" }),
  p.evaluate(() => {
    const f = [...document.querySelectorAll("form")].find(x => x.innerText.includes("Surat"));
    f.querySelector("button[type=submit]").click();
  }),
]);
await new Promise(r => setTimeout(r, 1200));
body = await p.evaluate(() => document.body.innerText);
ok(/Send now/.test(body), "the district officer is offered the broadcast control");
ok(/There is no override/.test(body), "the consent floor is stated before acting");

const sent = await p.evaluate(async () => {
  const r = await fetch("/api/crisis/broadcast", { method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ crisisId: "crisis_surat_flood", title: "Flood warning",
      body: "Water is rising in the Tapi. Move to the relief camp at Udhna Community Hall tonight." }) });
  return r.json();
});
ok(sent.ok === true, "broadcast accepted for the competent officer");
ok(sent.withheld > 0 && sent.sent > 0, `${sent.sent} contacted, ${sent.withheld} withheld by consent`);
ok(sent.sms > 0, `${sent.sms} routed to SMS for workers with no smartphone`);
ok(sent.translated === true, `delivered in ${sent.languages?.join(", ")}`);

console.log(fails === 0 ? "\nCrisis broadcast enforces scope and consent.\n" : `\n${fails} FAILURE(S)\n`);
await b.close();
process.exit(fails ? 1 : 0);
