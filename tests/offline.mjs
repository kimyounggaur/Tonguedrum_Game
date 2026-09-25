// tests/offline.mjs — 서비스워커 오프라인 동작을 확인한다.
// 사용: python3 -m http.server 8000 을 켠 상태에서  node tests/offline.mjs http://localhost:8000/
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:8000/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 } });
const page = await ctx.newPage();
const r = {};
await page.goto(BASE, { waitUntil: "load" });
r.registered = await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
await page.reload({ waitUntil: "load" });                               // 두 번째 로드부터 서비스워커가 제어
r.controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true);
await page.reload({ waitUntil: "load" });
r.offlineDrum = await page.evaluate(async () => {
  const img = document.querySelector("#start-screen img.tonguedrum");
  if (img && !img.complete) await new Promise((res) => img.addEventListener("load", res, { once: true }));
  return !!img && img.naturalWidth > 0;
});
await page.goto(BASE + "?selftest=1", { waitUntil: "load" });
r.offlineWithQuery = (await page.title()).length > 0;
await page.goto(BASE, { waitUntil: "load" });
await page.click("#start-btn");
await page.waitForTimeout(1500);
r.offlineStart = await page.evaluate(() => (window.TDG && TDG.game ? TDG.game.status : typeof gameStatus !== "undefined" ? gameStatus : null));
await ctx.setOffline(false);
await page.goto(BASE + "?nosw=1", { waitUntil: "load" });
await page.waitForTimeout(500);
r.unregisteredByNosw = (await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0;
await browser.close();
console.log(r);
const ok = r.registered && r.controlled && r.offlineDrum && r.offlineWithQuery && ["countdown", "running"].includes(r.offlineStart) && r.unregisteredByNosw;
console.log(ok ? "OFFLINE PASS" : "OFFLINE FAIL");
process.exit(ok ? 0 : 1);
