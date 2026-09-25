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

const steel = await page.evaluate(async () => {
  function rms(data, start, end, rate) {
    let sum = 0; let count = 0;
    for (let i = Math.floor(start * rate); i < Math.min(data.length, Math.floor(end * rate)); i += 1) {
      sum += data[i] * data[i]; count += 1;
    }
    return Math.sqrt(sum / Math.max(1, count));
  }
  function highRms(data, start, end, rate) {
    let low = 0; let sum = 0; let count = 0;
    for (let i = Math.floor(start * rate); i < Math.min(data.length, Math.floor(end * rate)); i += 1) {
      // 약 2kHz 위 성분만 비교해 강한 타격의 금속성 밝기를 검증한다.
      low += (data[i] - low) * 0.24;
      const high = data[i] - low;
      sum += high * high; count += 1;
    }
    return Math.sqrt(sum / Math.max(1, count));
  }
  async function render(velocity) {
    const ctx = new OfflineAudioContext(2, 48000 * 3, 48000);
    const a = Object.assign(Object.create(Object.getPrototypeOf(TDG.audio)), TDG.audio, { ctx: null, voices: [], volume: 0.7, muted: false, _voiceSeed: 0x1234abcd });
    a.init(ctx);
    const voice = a.playNote("C4", { velocity });
    const buf = await ctx.startRendering();
    const data = buf.getChannelData(0);
    return { modalCount: voice?.modalCount || 0, attack: rms(data, 0.012, 0.080, buf.sampleRate), high: highRms(data, 0.012, 0.080, buf.sampleRate), tail: rms(data, 0.70, 1.10, buf.sampleRate) };
  }
  return { soft: await render(0.2), hard: await render(1) };
});
await browser.close();
console.table(rows);
console.table([{ 상황: "스틸 모달·세기 반응", 모달: steel.hard.modalCount, 약타: +steel.soft.attack.toFixed(4), 강타: +steel.hard.attack.toFixed(4), 약타고역: +steel.soft.high.toFixed(4), 강타고역: +steel.hard.high.toFixed(4), 울림: +steel.hard.tail.toFixed(4) }]);
const bad = rows.filter((r) => r.피크 > -0.5 || r.음소거 > -80 || (r.상황.includes("stopAll") && r.피크 > -60));
const steelBad = steel.hard.modalCount < 6 || steel.hard.high < steel.soft.high * 1.2 || steel.hard.tail < 0.001;
console.log(bad.length || steelBad ? `AUDIO FAIL: ${[...bad.map((r) => r.상황), ...(steelBad ? ["스틸 모달·세기 반응"] : [])].join(", ")}` : "AUDIO PASS");
process.exit(bad.length || steelBad ? 1 : 0);
