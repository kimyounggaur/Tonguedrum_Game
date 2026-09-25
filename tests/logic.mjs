// tests/logic.mjs — 순수 로직(텅 판정·키 매핑·스케줄러·점수·곡 파서)을 브라우저 없이 검사한다.
// 사용: node tests/logic.mjs      (Node 18+, 설치할 것 없음)
// js/*.js는 클래식 스크립트(window.TDG)라서 vm으로 가짜 window를 만들어 읽는다.
// 아직 없는 파일·기능은 건너뛴다: rules.js의 스케줄러는 Phase 5(3-B에는 mulberry32만), songs.js는 Phase 6.
import fs from "node:fs";
import vm from "node:vm";

const win = {};
const sandbox = vm.createContext({ window: win, console, Math });
for (const f of ["config.js", "tongues.js", "rules.js", "songs.js"]) {
  const url = new URL(`../js/${f}`, import.meta.url);
  if (!fs.existsSync(url)) { console.log(`(건너뜀: js/${f} 없음)`); continue; }
  vm.runInContext(fs.readFileSync(url, "utf8"), sandbox, { filename: f });
}
const TDG = win.TDG;
const { TONGUES, NOTE, pointToTongue, inMoleEllipse, keyToNote } = TDG.tongues;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL", msg); } };

// 1) 텅 데이터와 판정
ok(TONGUES.length === 15, "텅 15개");
ok(new Set(TONGUES.map((t) => t.note)).size === 15 && TONGUES.every((t) => NOTE[t.note]), "음 15개, 모두 NOTE에 있음");
for (const tol of [1, TDG.config.GAME.touchTolerance]) {
  for (const t of TONGUES) {
    ok(pointToTongue(t.x, t.y, tol)?.tongue.id === t.id, `tol ${tol} 두더지 자리 → ${t.id}`);
    ok(pointToTongue(t.lx, t.ly, tol)?.tongue.id === t.id, `tol ${tol} 숫자 자리 → ${t.id}`);
    ok(pointToTongue((t.x + t.lx) / 2, (t.y + t.ly) / 2, tol)?.tongue.id === t.id, `tol ${tol} 텅 중간 → ${t.id}`);
  }
  ok(pointToTongue(57.45, 47.5, tol) === null, `tol ${tol} 콧수염 → null`);
  ok(pointToTongue(46.5, 38.5, tol) === null && pointToTongue(67.5, 38.5, tol) === null, `tol ${tol} 눈 → null`);
  ok(pointToTongue(5, 45, tol) === null, `tol ${tol} 드럼 밖 → null`);
}
ok(TONGUES.every((t) => inMoleEllipse(t.x, t.y, t) && !inMoleEllipse(t.x + 3.2, t.y, t)), "기존 타원 식");

// 2) 키보드
const K = (code, m = {}) => keyToNote({ code, shiftKey: !!m.s, ctrlKey: !!m.c, altKey: !!m.a, metaKey: !!m.m });
ok(K("Digit1") === "C4" && K("Digit7") === "B4" && K("Numpad5") === "G4", "숫자 1~7 = 가운데 옥타브");
ok(K("Digit1", { s: 1 }) === "C5" && K("Digit3", { s: 1 }) === "E5" && K("Digit4", { s: 1 }) === null, "Shift+1~3 = 높은음");
ok(K("KeyE") === "E3" && K("KeyU") === "B3" && K("KeyQ") === null, "E R T Y U = 낮은음");
ok(K("Digit1", { c: 1 }) === null && K("Digit1", { a: 1 }) === null && K("Digit1", { m: 1 }) === null, "Ctrl·Alt·Meta 조합은 무시");
const mapped = new Set([...Object.values(TDG.config.KEYMAP), ...Object.values(TDG.config.SHIFT_HIGH)]);
ok(TONGUES.every((t) => mapped.has(t.note)), "15음 모두 키가 있음");

// 3) 스케줄러 — 16ms 스텝으로 30초를 돌리며 reaction(ms) 뒤에 때리는 봇
if (TDG.rules && TDG.rules.createSpawner && TDG.config.DIFFICULTY && TDG.config.DIFFICULTY.easy) {
const { createSpawner, mulberry32, pointsFor, starsFor } = TDG.rules;
function simulate(difficulty, reaction, seed = 7, durationMs = 30000) {
  const cfg = TDG.config.DIFFICULTY[difficulty];
  const sp = createSpawner({ cfg, durationMs, rng: mulberry32(seed), tongues: TONGUES });
  const botRng = mulberry32(seed + 1000);
  let escaped = 0, maxAlive = 0;
  for (let t = 0; t <= durationMs; t += 16) {
    for (const ev of sp.update(t)) if (ev.type === "leave" && ev.escaped) escaped++;
    for (const m of sp.moles) {
      if (m.hitAt !== null || m.tried) continue;
      const rt = typeof reaction === "function" ? (m.rt ??= reaction(botRng)) : reaction;
      if (rt === null || t < m.spawnAt + rt) continue;
      m.tried = true;                                                   // 한 마리에 한 번만 시도
      if (m.miss ??= (typeof reaction === "function" && botRng() < 0.15)) continue;   // 사람 봇: 15%는 빗나감
      if (sp.hittable(m.tongueId, t) === m && t < durationMs) sp.hit(m, t);
    }
    const alive = sp.moles.filter((m) => t >= m.spawnAt && t < m.goneAt);
    if (new Set(alive.map((m) => m.tongueId)).size !== alive.length) throw new Error("같은 텅에 두 마리");
    if (alive.length > cfg.maxConcurrent) throw new Error("동시 등장 수 초과");
    maxAlive = Math.max(maxAlive, alive.length);
  }
  const spawns = sp.moles.filter((m) => m.spawnAt < durationMs).length;
  const hits = sp.moles.filter((m) => m.hitAt !== null).length;
  return { spawns, hits, rate: Math.round((hits / spawns) * 100), escaped, maxAlive, seq: sp.moles.map((m) => m.tongueId).join(",") };
}
for (const d of ["easy", "normal", "hard"]) {
  const rows = [null, 300, 600, 900, 1200].map((r) => ({ r, ...simulate(d, r) }));
  console.log(d.padEnd(6), rows.map((x) => `${x.r === null ? "안 침" : x.r + "ms"} ${x.hits}/${x.spawns}(${x.rate}%)`).join(" | "));
}
const idle = simulate("normal", null);
ok(idle.spawns >= 16 && idle.spawns <= 24, `보통·안 침 등장 16~24마리(현행 실측 19): ${idle.spawns}`);
ok(simulate("normal", 300, 42).seq === simulate("normal", 300, 42).seq, "같은 시드 = 같은 순서(재현성)");
ok(simulate("normal", 300, 42).seq !== simulate("normal", 300, 43).seq, "다른 시드 = 다른 순서");
ok(simulate("hard", 300).maxAlive === 2 && simulate("normal", 300).maxAlive === 1, "어려움만 동시 2마리");
const one = createSpawner({ cfg: TDG.config.DIFFICULTY.normal, durationMs: 30000, rng: mulberry32(1), tongues: [TONGUES[5]] });
let n1 = 0; for (let t = 0; t <= 30000; t += 16) n1 += one.update(t).filter((e) => e.type === "spawn").length;
ok(n1 >= 10, `텅 1개만 쓰는 설정에서도 계속 나옴: ${n1}마리`);

// 사람 흉내 봇(반응 450~1100ms 고르게, 15% 빗나감) — 별점 기준 참고용(부록 D)
const human = (rng) => 450 + rng() * 650;
for (const d of ["easy", "normal", "hard"]) {
  const rates = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => simulate(d, human, s).rate);
  console.log(`사람봇 ${d.padEnd(6)} 잡은 비율 ${rates.join("% ")}% → 별 ${rates.map((r) => starsFor(r)).join(" ")}`);
}

// 4) 점수·별점
ok(pointsFor({ golden: false, combo: 1 }) === 10 && pointsFor({ golden: true, combo: 1 }) === 30, "기본 10 · 황금 30");
ok(pointsFor({ golden: false, combo: 5 }) === 15 && pointsFor({ golden: true, combo: 7 }) === 35, "연속 5마리째부터 +5");
ok(starsFor(39) === 0 && starsFor(40) === 1 && starsFor(65) === 2 && starsFor(85) === 3 && starsFor(100) === 3, "별점 경계 40·65·85");
}

// 5) 곡
if (TDG.songs) {
const { parseSong, validateSong, SONGS } = TDG.songs;
for (const s of SONGS) {
  const errs = validateSong(s);
  ok(errs.length === 0, `${s.id}: ${errs.join(", ")}`);
  const notes = parseSong(s.notes).events.filter((e) => e.note);
  ok(notes.every((e) => TONGUES.some((t) => t.note === e.note)), `${s.id}: 모든 음이 텅에 있음`);
}
for (const bad of ["4'", ".2", "8", "5x", ".5'"]) {
  let threw = false; try { parseSong(bad); } catch (_) { threw = true; }
  ok(threw, `잘못된 토큰 거부: ${bad}`);
}
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
