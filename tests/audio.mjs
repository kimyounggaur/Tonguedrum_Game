// tests/audio.mjs — 음원 엔진을 실제로 렌더링해 피크 음량(dBFS)을 잰다. 0을 넘으면 소리가 찢어진다.
// 사용: node tests/audio.mjs      (Node 18+, Playwright 필요: tests/README.md)
import { chromium } from "playwright";
import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(`../js/${f}`, import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (const f of ["config.js", "tongues.js", "audio.js"]) await page.addScriptTag({ content: read(f) });

const rows = await page.evaluate(async () => {
  async function renderPeak(setup, { volume = 0.7, muted = false } = {}) {
    const ctx = new OfflineAudioContext(2, 48000 * 3, 48000);
    const a = Object.assign(Object.create(Object.getPrototypeOf(TDG.audio)), TDG.audio, { ctx: null, voices: [], volume, muted });
    a.init(ctx);
    setup(a);
    const buf = await ctx.startRendering();
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    }
    return peak === 0 ? -Infinity : +(20 * Math.log10(peak)).toFixed(1);
  }
  const cases = {
    "단음 C4": (a) => a.playNote("C4"),
    "6음 동시": (a) => ["C4", "E4", "G4", "C5", "E5", "E3"].forEach((n) => a.playNote(n)),
    "30연타": (a) => { const ns = Object.keys(TDG.NOTE); for (let i = 0; i < 30; i++) a.playNote(ns[i % 15], { when: i * 0.01 }); },
    "틱": (a) => a.tick(),
    "예약 3음 뒤 stopAll": (a) => { ["C4", "E4", "G4"].forEach((n, i) => a.playNote(n, { when: 0.3 + i * 0.3 })); a.stopAll(); },
  };
  const out = [];
  for (const [name, fn] of Object.entries(cases)) out.push({ 상황: name, 피크: await renderPeak(fn), 음소거: await renderPeak(fn, { muted: true }) });
  return out;
});
await browser.close();
console.table(rows);
const bad = rows.filter((r) => r.피크 > -0.5 || r.음소거 > -80 || (r.상황.includes("stopAll") && r.피크 > -60));
console.log(bad.length ? `AUDIO FAIL: ${bad.map((r) => r.상황).join(", ")}` : "AUDIO PASS");
process.exit(bad.length ? 1 : 0);
