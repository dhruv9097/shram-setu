/** Worksite QR check-in: the same path a camera scan takes. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";
const SECRET = process.argv[2];
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "  PASS  " : "  FAIL  "}${m}`); if (!c) fails++; };

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox","--use-fake-ui-for-media-stream"] });
const p = await b.newPage();
await p.setViewport({ width: 420, height: 900 });

await p.goto(`${BASE}/w`, { waitUntil: "networkidle0" });
await Promise.all([
  p.waitForNavigation({ waitUntil: "networkidle0" }),
  p.evaluate(() => document.querySelector('form input[name="workerId"]').closest("form").querySelector("button[type=submit]").click()),
]);

await p.goto(`${BASE}/w/home`, { waitUntil: "networkidle0" });
ok((await p.evaluate(() => document.body.innerText)).includes("ସ୍କାନ୍"), "worker home offers the scan action in Odia");

await p.goto(`${BASE}/w/scan`, { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 1500));
let text = await p.evaluate(() => document.body.innerText);
ok(/ଟାଇପ୍|type the code/i.test(text), "typing the code is offered alongside the camera");

// a code that is not a real worksite must be refused
await p.type("input[inputmode=text]", "not-a-real-secret");
await p.evaluate(() => [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "OK").click());
await new Promise(r => setTimeout(r, 3000));
text = await p.evaluate(() => document.body.innerText);
ok(/not recognised/i.test(text), "an unknown worksite code is refused");

// the real one
// fresh screen rather than fighting a controlled input
await p.goto(`${BASE}/w/scan`, { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 1200));
await p.type("input[inputmode=text]", SECRET);
console.log("    typed:", await p.evaluate(() => document.querySelector("input[inputmode=text]").value));
await p.evaluate(() => [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "OK").click());
await new Promise(r => setTimeout(r, 4000));
text = await p.evaluate(() => document.body.innerText);
ok(/ହାଜିରା ହୋଇଗଲା|Presence marked/.test(text), "a valid worksite code marks presence");
ok(/Surat/.test(text), "confirmation names the worksite district");
ok(/Unit|Site/.test(text), "confirmation names the worksite itself");
if (fails) console.log("\n--- page text ---\n" + text.slice(0, 500));

console.log(fails === 0 ? "\nWorksite QR check-in works.\n" : `\n${fails} FAILURE(S)\n`);
await b.close();
process.exit(fails ? 1 : 0);
