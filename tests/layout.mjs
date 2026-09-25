// tests/layout.mjs — 9개 화면 크기에서 "두더지 자리(DOM) ↔ 그림 속 텅(이미지 좌표)" 오차를 잰다.
// 사용: node tests/layout.mjs http://localhost:8000/     (Node 18+, Playwright 필요)
// 기준: 모든 화면에서 최대 오차 ≤ 1px 이면 통과(종료 코드 0), 아니면 1.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:8000/";
const OUT = "tests/output";
const DRUM_W = 3609, DRUM_H = 3505;              // 텅드럼 원본 이미지 크기(비율 기준, naturalWidth 쓰지 않음)
const VIEWPORTS = [
  ["desktop-1920x947", 1920, 947], ["laptop-1440x789", 1440, 789], ["laptop-1366x657", 1366, 657],
  ["chromebook-1280x632", 1280, 632], ["ipad-land-1180x820", 1180, 820, true], ["ipad-port-820x1180", 820, 1180, true],
  ["phone-port-390x844", 390, 844, true], ["phone-land-844x390", 844, 390, true], ["android-360x740", 360, 740, true],
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let worst = 0;
const rows = [];
for (const [name, width, height, touch] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: !!touch, isMobile: !!touch && width < 900 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click("#start-btn");
  await page.waitForTimeout(600);                 // 카운트다운이 있으면 넉넉히
  // 숨쉬기(scale) 애니메이션이 측정값을 흔들지 않도록 측정 순간에는 모든 애니메이션을 끈다
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(100);
  const r = await page.evaluate(({ DRUM_W, DRUM_H }) => {
    // Phase 3 이후: window.TDG.TONGUES / 현행: 전역 const TONGUE_SLOTS (const 전역은 window 속성이 아님에 주의)
    const slots = (window.TDG && window.TDG.TONGUES) || (typeof TONGUE_SLOTS !== "undefined" ? TONGUE_SLOTS : []);
    const img = document.querySelector("#stage img.tonguedrum, #stage .tonguedrum img, #stage img");
    const ir = img.getBoundingClientRect();
    const s = Math.min(ir.width / DRUM_W, ir.height / DRUM_H);          // object-fit: contain
    const cw = DRUM_W * s, ch = DRUM_H * s;
    const cx = ir.x + (ir.width - cw) / 2, cy = ir.y + (ir.height - ch) / 2;
    let max = 0, maxId = "";
    for (const t of slots) {
      const el = document.querySelector(`.mole-slot[data-tongue-id="${t.id}"], .mole-slot[data-slot-id="${t.id}"]`);
      if (!el) continue;
      const b = el.getBoundingClientRect();
      const dx = b.x + b.width / 2 - (cx + (t.x / 100) * cw);
      const dy = b.y + b.height / 2 - (cy + (t.y / 100) * ch);
      const d = Math.hypot(dx, dy);
      if (d > max) { max = d; maxId = t.id; }
    }
    return { max: +max.toFixed(1), maxId, drum: `${Math.round(cw)}×${Math.round(ch)}` };
  }, { DRUM_W, DRUM_H });
  await page.screenshot({ path: `${OUT}/${name}.png` });
  worst = Math.max(worst, r.max);
  rows.push({ 화면: name, 드럼: r.drum, 최대오차px: r.max, 위치: r.maxId, 판정: r.max <= 1 ? "PASS" : "FAIL" });
  await ctx.close();
}
await browser.close();
console.table(rows);
console.log(worst <= 1 ? "LAYOUT PASS" : `LAYOUT FAIL (최대 ${worst}px)`);
process.exit(worst <= 1 ? 0 : 1);
