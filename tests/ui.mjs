// UI 계약 회귀 검사: 설정, 순위표, 일시정지, 모바일 배치를 실제 브라우저에서 확인한다.
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8000/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
const rows = [];

function record(name, ok, detail = "") { rows.push({ 검사: name, 판정: ok ? "PASS" : "FAIL", 상세: detail }); }
function overlap(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }

await page.goto(`${BASE}?nosw=1&teacher=1`, { waitUntil: "networkidle" });

await page.locator('input[name="level"][value="hard"]').check({ force: true });
await page.locator("#start-btn").click();
const difficulty = await page.evaluate(() => {
  TDG.game._debug.skipCountdown();
  return { picked: TDG.ui.getStartOptions().difficulty, minVisible: TDG.game._debug.modeState.cfg.visibleMs[0] };
});
record("난이도 선택", difficulty.picked === "hard" && difficulty.minVisible === 560, JSON.stringify(difficulty));
await page.evaluate(() => TDG.game.goHome());

await page.locator("#settings-btn").click();
await page.locator("#student-settings-tab").click();
record("학생 설정 탭", await page.locator("#student-settings").isVisible());
await page.locator("#teacher-settings-tab").click();
record("선생님 설정 탭", await page.locator("#teacher-settings").isVisible());
await page.locator("#teacher-tongues").selectOption("five");
const tonguePreset = await page.evaluate(() => ({ saved: TDG.settings.tongues?.length, pressed: document.querySelectorAll('#teacher-tongue-picker [aria-pressed="true"]').length }));
record("교사 도~솔 범위", tonguePreset.saved === 5 && tonguePreset.pressed === 5, JSON.stringify(tonguePreset));

await page.locator("#student-settings-tab").click();
await page.locator("#settings-close").focus();
await page.keyboard.press("Shift+Tab");
const focusBack = await page.evaluate(() => document.activeElement?.tagName);
await page.keyboard.press("Tab");
const focusWrap = await page.evaluate(() => document.activeElement?.id);
record("설정 포커스 순환", focusBack === "SUMMARY" && focusWrap === "settings-close", `${focusBack}→${focusWrap}`);
await page.locator("#settings-close").click();

const visibleMode = await page.evaluate(() => {
  TDG.settings.mode = "classic"; TDG.settings.modesVisible = ["find"]; TDG.ui.refreshStart();
  return { checked: document.querySelector('#mode-group input:checked')?.value, startMode: TDG.ui.getStartOptions().mode };
});
record("숨긴 모드 선택 해제", visibleMode.checked === "find" && visibleMode.startMode === "find", JSON.stringify(visibleMode));
await page.evaluate(() => { TDG.settings.mode = "classic"; TDG.settings.modesVisible = ["classic", "find", "melody", "echo", "free"]; TDG.settings.boardEnabled = true; TDG.storage.saveSettings(TDG.settings); TDG.storage.clearBoard(); TDG.ui.refreshStart(); });

await page.evaluate(() => { TDG.game.start({ mode: "classic", difficulty: "normal", time: 30 }); TDG.game._debug.skipCountdown(); TDG.game.end(); });
await page.locator("#board-name").fill("민수");
await page.locator("#board-save").click();
const boardCount = await page.evaluate(() => TDG.storage.getBoard(TDG.game.lastResult.recordKey).length);
record("순위표 단일 저장", boardCount === 1, `${boardCount}행`);
await page.locator("#board-close").click();

await page.evaluate(() => {
  TDG.game.goHome();
  const input = document.querySelector('input[name="mode"][value="free"]');
  input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true }));
});
const freeBoard = await page.evaluate(() => ({ hidden: document.getElementById("board-btn").hidden, copy: document.getElementById("start-best").textContent }));
record("자유 연주 순위표 제외", freeBoard.hidden && freeBoard.copy.includes("자유롭게"), JSON.stringify(freeBoard));

const zeroCut = await page.evaluate(() => {
  TDG.storage.clearBoard();
  for (let i = 0; i < 10; i += 1) TDG.storage.addBoardEntry("classic.normal.30", { name: `학생${i}`, score: 0, stars: 0 });
  TDG.game.start({ mode: "classic", difficulty: "normal", time: 30 }); TDG.game._debug.skipCountdown(); TDG.game.end();
  return { offered: !document.getElementById("board-name-form").hidden, qualifies: TDG.storage.qualifiesForBoard("classic.normal.30", 0) };
});
record("0점 공동 10위 판정", !zeroCut.offered && !zeroCut.qualifies, JSON.stringify(zeroCut));
await page.evaluate(() => { TDG.game.goHome(); TDG.storage.clearBoard(); });

const recordUnits = await page.evaluate(() => {
  const key = TDG.config.STORAGE_KEYS.records;
  const records = TDG.storage.get(key, {}); records["find.see"] = { best: 8, bestStars: 2 }; TDG.storage.set(key, records);
  const input = document.querySelector('input[name="mode"][value="find"]');
  input.checked = true; TDG.ui.updateModeOptions();
  const start = document.getElementById("start-best").textContent;
  TDG.ui.showResult({ mode: "melody", title: "테스트", score: 90, stars: 2, lines: [], record: { best: 90 }, message: "" });
  const result = [...document.querySelectorAll("#end-stats dd")].at(-1)?.textContent;
  return { start, result };
});
record("모드별 최고 기록 단위", recordUnits.start.includes("8 / 10") && recordUnits.result === "90%", JSON.stringify(recordUnits));
await page.evaluate(() => TDG.game.goHome());

const presetHasSub = await page.evaluate(() => { TDG.settings.mode = "find"; TDG.settings.sub = "hear"; return new URL(TDG.ui.createPresetLink()).searchParams.get("sub"); });
record("듣고 찾기 프리셋", presetHasSub === "hear", String(presetHasSub));

await page.evaluate(() => TDG.game.start({ mode: "echo" }));
await page.waitForFunction(() => !TDG.game._debug.modeState.listening);
await page.evaluate(() => {
  const state = TDG.game._debug.modeState; state.lives = 1;
  const wrong = TDG.TONGUES.find((t) => t.note !== state.sequence[0]);
  TDG.game.strike({ tongueId: wrong.id, source: "test" }); TDG.game.pause("test");
});
await page.waitForTimeout(650);
const pausedEnd = await page.evaluate(() => ({ status: TDG.game.status, pauseHidden: document.getElementById("pause-overlay").hidden }));
record("종료 예약 중 일시정지", pausedEnd.status === "paused" && !pausedEnd.pauseHidden, JSON.stringify(pausedEnd));
await page.evaluate(() => TDG.game.resume());
await page.waitForFunction(() => TDG.game.status === "ended");
const endedClean = await page.evaluate(() => ({ pauseHidden: document.getElementById("pause-overlay").hidden, inert: document.getElementById("end-screen").hasAttribute("inert") }));
record("재개 후 정상 결과", endedClean.pauseHidden && !endedClean.inert, JSON.stringify(endedClean));

await page.evaluate(() => TDG.game.start({ mode: "echo" }));
await page.waitForFunction(() => !TDG.game._debug.modeState.listening);
const echoWinPause = await page.evaluate(() => {
  const state = TDG.game._debug.modeState; const note = state.sequence[0];
  state.length = 8; state.sequence = Array(8).fill(note); state.inputIndex = 7; state.listening = false;
  TDG.game.strike({ tongueId: TDG.tongues.byNote[note].id, source: "test" });
  TDG.game.pause("test"); TDG.game.resume();
  return { endAt: state.endAt, playback: state.playback, listening: state.listening };
});
record("따라 치기 완주 직전 재개", echoWinPause.endAt > 0 && echoWinPause.playback === null && !echoWinPause.listening, JSON.stringify(echoWinPause));
await page.waitForFunction(() => TDG.game.status === "ended");

await page.evaluate(() => { TDG.game.start({ mode: "free" }); TDG.game.strike({ tongueId: TDG.TONGUES[0].id, source: "test" }); TDG.game.replayCurrent(); TDG.game.pause("test"); });
const replayPause = await page.evaluate(() => TDG.game._debug.modeState.playback === null);
record("자동 연주 일시정지", replayPause);
await page.evaluate(() => TDG.game.goHome());

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
const mobileStart = await page.evaluate(() => ({ bottom: document.getElementById("start-btn").getBoundingClientRect().bottom, h: innerHeight, scrollW: document.documentElement.scrollWidth, w: innerWidth }));
record("모바일 시작 CTA", mobileStart.bottom <= mobileStart.h && mobileStart.scrollW === mobileStart.w, JSON.stringify(mobileStart));
await page.setViewportSize({ width: 360, height: 740 });
await page.reload({ waitUntil: "networkidle" });
const androidStart = await page.evaluate(() => ({ bottom: document.getElementById("start-btn").getBoundingClientRect().bottom, h: innerHeight, scrollW: document.documentElement.scrollWidth, w: innerWidth }));
record("안드로이드 시작 CTA", androidStart.bottom <= androidStart.h && androidStart.scrollW === androidStart.w, JSON.stringify(androidStart));
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.locator('input[name="mode"][value="free"]').check({ force: true });
await page.locator("#start-btn").click();
const mobileButtons = await page.evaluate(() => {
  const rect = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  return { mute: rect("mute-btn"), replay: rect("replay-btn"), end: rect("end-mode-btn") };
});
record("모바일 하단 조작 분리", !overlap(mobileButtons.mute, mobileButtons.replay) && !overlap(mobileButtons.mute, mobileButtons.end), JSON.stringify(mobileButtons));

await page.setViewportSize({ width: 844, height: 390 });
await page.evaluate(() => { TDG.game.start({ mode: "classic", difficulty: "normal", time: 30 }); TDG.game._debug.skipCountdown(); TDG.game.end(); });
const resultTop = await page.evaluate(() => document.querySelector(".end-card").getBoundingClientRect().top);
record("짧은 화면 결과 상단", resultTop >= 0, `${resultTop.toFixed(1)}px`);

await browser.close();
console.table(rows);
const ok = rows.every((row) => row.판정 === "PASS");
console.log(ok ? "UI PASS" : "UI FAIL");
process.exit(ok ? 0 : 1);
