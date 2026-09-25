// file:// 직접 실행 계약: 모듈·fetch 없이 게임과 결과 카드가 동작하는지 확인한다.
import { chromium } from "playwright";

const url = new URL("../index.html", import.meta.url).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.TDG?.TONGUES?.length === 15);
await page.locator("#start-btn").click();
const game = await page.evaluate(() => {
  TDG.game._debug.skipCountdown();
  return {
    status: TDG.game.status,
    screen: document.body.dataset.screen,
    imageLoaded: document.querySelector("#stage img.tonguedrum").naturalWidth > 0,
  };
});
const card = await page.evaluate(async () => {
  TDG.game.end();
  await TDG.ui.openResultCard();
  const canvas = document.getElementById("result-card-canvas");
  return { width: canvas.width, height: canvas.height, visible: !document.getElementById("result-card-modal").hidden };
});
await page.goto(`${url}?selftest=1`, { waitUntil: "load" });
await page.waitForSelector("#selftest-panel", { timeout: 30000 });
const selftest = await page.locator("#selftest-panel").innerText();
const selftestFailures = await page.locator(".selftest-item.fail").allTextContents();

await browser.close();
const ok = game.status === "running" && game.screen === "game" && game.imageLoaded
  && card.width === 1080 && card.height === 1350 && card.visible
  && selftest.includes("✖0") && errors.length === 0;
console.log({ url, game, card, selftest, selftestFailures, errors });
console.log(ok ? "FILE PASS" : "FILE FAIL");
process.exit(ok ? 0 : 1);
