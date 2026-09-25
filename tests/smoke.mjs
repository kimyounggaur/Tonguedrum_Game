// 다섯 가지 모드를 실제 UI에서 시작하고 핵심 입력 경로를 한 번씩 확인한다.
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8000/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
const results = [];

await page.goto(`${BASE}?nosw=1`, { waitUntil: "networkidle" });

async function startMode(mode) {
  await page.evaluate(() => window.TDG.game.goHome());
  await page.locator(`input[name="mode"][value="${mode}"]`).check({ force: true });
  await page.locator("#start-btn").click();
  await page.waitForFunction((expected) => window.TDG.game.mode === expected, mode);
}

await startMode("classic");
results.push(await page.evaluate(() => {
  TDG.game._debug.skipCountdown();
  const tongue = TDG.TONGUES[0];
  TDG.game._debug.forceMole(tongue.id);
  return { mode: "classic", status: TDG.game.status, ok: TDG.game.strike({ tongueId: tongue.id, source: "test" }) && TDG.game.score > 0 };
}));

await startMode("find");
results.push(await page.evaluate(() => {
  const state = TDG.game._debug.modeState;
  const ok = TDG.game.strike({ tongueId: state.target.id, source: "test" });
  return { mode: "find", status: TDG.game.status, ok: ok && state.waitUntil > 0 };
}));

await startMode("melody");
results.push(await page.evaluate(() => {
  const state = TDG.game._debug.modeState;
  const tongue = TDG.tongues.byNote[state.notes[0].note];
  const ok = TDG.game.strike({ tongueId: tongue.id, source: "test" });
  return { mode: "melody", status: TDG.game.status, ok: ok && state.index === 1 };
}));

await startMode("echo");
await page.waitForFunction(() => !TDG.game._debug.modeState.listening);
results.push(await page.evaluate(() => {
  const state = TDG.game._debug.modeState;
  const tongue = TDG.tongues.byNote[state.sequence[0]];
  const ok = TDG.game.strike({ tongueId: tongue.id, source: "test" });
  return { mode: "echo", status: TDG.game.status, ok: ok && state.inputIndex === 1 };
}));

await startMode("free");
results.push(await page.evaluate(() => {
  const state = TDG.game._debug.modeState;
  TDG.game.strike({ tongueId: TDG.TONGUES[4].id, source: "test" });
  return { mode: "free", status: TDG.game.status, ok: state.history.length === 1 && document.getElementById("timer").hidden };
}));

await browser.close();
console.table(results);
const ok = results.length === 5 && results.every((row) => row.status === "running" && row.ok);
console.log(ok ? "SMOKE PASS" : "SMOKE FAIL");
process.exit(ok ? 0 : 1);
