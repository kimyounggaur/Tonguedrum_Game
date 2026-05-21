/* ============================================================
   Steel Tongue Drum Whack-a-Mole — Game Logic
   ============================================================ */

"use strict";

/* ---------- 상수: tongue 좌표 (검은 원 기준 percentage) ---------- */
const TONGUE_SLOTS = [
  { id: "top-center",          x: 56.47, y: 17.20, rx: 3.1, ry: 5.8 },
  { id: "upper-right-inner",   x: 64.96, y: 22.71, rx: 3.1, ry: 5.8 },
  { id: "upper-left-inner",    x: 48.61, y: 24.52, rx: 3.1, ry: 5.8 },
  { id: "right-upper-outer",   x: 75.03, y: 26.14, rx: 3.1, ry: 5.8 },
  { id: "left-upper-outer",    x: 37.08, y: 26.75, rx: 3.1, ry: 5.8 },
  { id: "center-upper",        x: 57.16, y: 35.09, rx: 3.1, ry: 5.8 },
  { id: "right-mid-inner",     x: 76.94, y: 37.42, rx: 3.1, ry: 5.8 },
  { id: "left-mid-inner",      x: 36.92, y: 38.35, rx: 3.1, ry: 5.8 },
  { id: "right-mid-outer",     x: 81.08, y: 47.52, rx: 3.1, ry: 5.8 },
  { id: "left-mid-outer",      x: 32.25, y: 47.65, rx: 3.1, ry: 5.8 },
  { id: "lower-left-inner",    x: 41.90, y: 54.90, rx: 3.1, ry: 5.8 },
  { id: "lower-right-inner",   x: 73.92, y: 55.86, rx: 3.1, ry: 5.8 },
  { id: "bottom-center",       x: 57.42, y: 62.66, rx: 3.1, ry: 5.8 },
  { id: "lower-right-outer",   x: 68.43, y: 65.78, rx: 3.1, ry: 5.8 },
  { id: "lower-left-outer",    x: 45.32, y: 66.75, rx: 3.1, ry: 5.8 },
];

/* ---------- 상수: 게임 설정 ---------- */
const GameStatus = { IDLE: "idle", RUNNING: "running", ENDED: "ended" };

const GAME_DURATION_MS    = 60_000;
const SCORE_PER_HIT       = 10;
const MOLE_ENTER_MS       = 140;
const MOLE_VISIBLE_MIN_MS = 750;
const MOLE_VISIBLE_MAX_MS = 1200;
const MOLE_LEAVE_MS       = 180;
const NEXT_MOLE_DELAY_MIN = 120;
const NEXT_MOLE_DELAY_MAX = 350;
const HIT_STAR_MS         = 300;
const PLUS10_FLOAT_MS     = 500;
const HAMMER_SWING_MS     = 180;
const TIMER_WARN_SEC      = 10;

const DEBUG_HITBOX = false;

/* ---------- 상태 ---------- */
let gameStatus = GameStatus.IDLE;
let score = 0;
let startTime = 0;
let rafId = null;
let pendingTimeouts = [];
let activeMole = null;     // { slotId, status, hit }
let lastSlotId = null;
let audioCtx = null;       // Phase 6: lazy-init

/* ---------- DOM ---------- */
const startScreenEl = document.getElementById("start-screen");
const gameScreenEl  = document.getElementById("game-screen");
const endScreenEl   = document.getElementById("end-screen");
const startBtn      = document.getElementById("start-btn");
const restartBtn    = document.getElementById("restart-btn");
const timerEl       = document.getElementById("timer");
const scoreEl       = document.getElementById("score");
const finalScoreEl  = document.getElementById("final-score");
const endMessageEl  = document.getElementById("end-message");
const stageEl       = document.getElementById("stage");
const moleContainer = document.getElementById("mole-container");
const hammerEl      = document.getElementById("hammer-cursor");

/* ---------- 유틸 ---------- */
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

function track(timeoutId) {
  pendingTimeouts.push(timeoutId);
  return timeoutId;
}

function clearAllTimers() {
  pendingTimeouts.forEach(clearTimeout);
  pendingTimeouts = [];
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/* ============================================================
   화면 전환
   ============================================================ */
function showScreen(name) {
  startScreenEl.hidden = name !== "start";
  gameScreenEl.hidden  = name !== "game";
  endScreenEl.hidden   = name !== "end";
}

/* ============================================================
   초기화 & 이벤트 바인딩
   ============================================================ */
function init() {
  buildSlots();
  showScreen("start");

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  // 게임 스테이지 단일 pointerdown (스펙 §8)
  stageEl.addEventListener("pointerdown", onStagePointerDown);

  // 망치 커서: 게임 화면에서 마우스 추적
  gameScreenEl.addEventListener("pointermove", onPointerMove, { passive: true });
  gameScreenEl.addEventListener("pointerdown", onPointerMove, { passive: true });
  gameScreenEl.addEventListener("pointerenter", () => {
    if (gameStatus === GameStatus.RUNNING) hammerEl.classList.add("visible");
  });
  gameScreenEl.addEventListener("pointerleave", () => hammerEl.classList.remove("visible"));

  // 스테이지 위에선 기본 우클릭/드래그 방지
  stageEl.addEventListener("contextmenu", (e) => e.preventDefault());
  stageEl.addEventListener("dragstart",   (e) => e.preventDefault());
}

document.addEventListener("DOMContentLoaded", init);

/* ============================================================
   슬롯 빌더
   ============================================================ */
function buildSlots() {
  moleContainer.innerHTML = "";
  TONGUE_SLOTS.forEach((slot) => {
    const wrap = document.createElement("div");
    wrap.className = "mole-slot" + (DEBUG_HITBOX ? " debug" : "");
    wrap.style.left = slot.x + "%";
    wrap.style.top  = slot.y + "%";
    wrap.dataset.slotId = slot.id;

    const mole = document.createElement("img");
    mole.className = "mole";
    mole.src = "assets/mole.png";
    mole.alt = "";
    wrap.appendChild(mole);

    moleContainer.appendChild(wrap);
  });
}

/* ============================================================
   게임 시작 / 종료
   ============================================================ */
function startGame() {
  clearAllTimers();
  hideAnyActiveMole(true);

  gameStatus  = GameStatus.RUNNING;
  score       = 0;
  lastSlotId  = null;
  activeMole  = null;

  updateScoreUI({ pulse: false });
  timerEl.textContent = "⏱ 60초";
  timerEl.classList.remove("warn");
  showScreen("game");
  hammerEl.classList.add("visible");

  ensureAudio();

  startTime = performance.now();
  rafId = requestAnimationFrame(tickTimer);
  scheduleNextMole(randInt(NEXT_MOLE_DELAY_MIN, NEXT_MOLE_DELAY_MAX));
}

function endGame() {
  if (gameStatus === GameStatus.ENDED) return;
  gameStatus = GameStatus.ENDED;

  clearAllTimers();
  hideAnyActiveMole(true);
  hammerEl.classList.remove("visible");

  finalScoreEl.textContent = String(score);
  endMessageEl.textContent = pickEndMessage(score);
  playEndSound();
  showScreen("end");
}

function pickEndMessage(s) {
  if (s <= 50) return "조금만 더 연습해요!";
  if (s <= 150) return "잘했어요!";
  return "두더지 마스터! 🏆";
}

/* ============================================================
   타이머 (performance.now 기반 RAF)
   ============================================================ */
function tickTimer() {
  if (gameStatus !== GameStatus.RUNNING) return;

  const elapsed = performance.now() - startTime;
  const remainingMs = Math.max(0, GAME_DURATION_MS - elapsed);
  const remainingSec = Math.ceil(remainingMs / 1000);

  timerEl.textContent = `⏱ ${remainingSec}초`;
  timerEl.classList.toggle("warn", remainingSec <= TIMER_WARN_SEC && remainingSec > 0);

  if (remainingMs <= 0) { endGame(); return; }
  rafId = requestAnimationFrame(tickTimer);
}

/* ============================================================
   두더지 스폰 / 등장 / 퇴장
   ============================================================ */
function scheduleNextMole(delayMs) {
  if (gameStatus !== GameStatus.RUNNING) return;
  track(setTimeout(spawnNextMole, delayMs));
}

function spawnNextMole() {
  if (gameStatus !== GameStatus.RUNNING) return;
  if (activeMole) return;

  // 직전 슬롯 제외하고 랜덤 선택
  const candidates = TONGUE_SLOTS.filter((s) => s.id !== lastSlotId);
  const pool = candidates.length > 0 ? candidates : TONGUE_SLOTS;
  const slot = pool[randInt(0, pool.length - 1)];
  lastSlotId = slot.id;

  const slotEl = moleContainer.querySelector(`[data-slot-id="${slot.id}"]`);
  if (!slotEl) return;
  const moleImg = slotEl.querySelector(".mole");
  if (!moleImg) return;

  activeMole = { slotId: slot.id, status: "entering", hit: false };

  // 등장
  moleImg.classList.remove("leaving");
  // reflow trick: 클래스 토글이 transition 발동되도록
  void moleImg.offsetWidth;
  moleImg.classList.add("up");

  // entering → up
  track(setTimeout(() => {
    if (!activeMole || activeMole.slotId !== slot.id) return;
    activeMole.status = "up";
  }, MOLE_ENTER_MS));

  // up → leaving (자동 퇴장, 미히트 시)
  const visibleMs = randInt(MOLE_VISIBLE_MIN_MS, MOLE_VISIBLE_MAX_MS);
  track(setTimeout(() => {
    if (!activeMole || activeMole.slotId !== slot.id) return;
    if (activeMole.hit) return; // 이미 히트 처리됨
    beginLeaving(slot.id, "timeout");
  }, MOLE_ENTER_MS + visibleMs));
}

function beginLeaving(slotId, reason) {
  if (!activeMole || activeMole.slotId !== slotId) return;
  activeMole.status = "leaving";

  const slotEl = moleContainer.querySelector(`[data-slot-id="${slotId}"]`);
  const moleImg = slotEl && slotEl.querySelector(".mole");
  if (moleImg) {
    moleImg.classList.remove("up");
    moleImg.classList.add("leaving");
  }

  track(setTimeout(() => {
    if (moleImg) moleImg.classList.remove("leaving");
    if (activeMole && activeMole.slotId === slotId) activeMole = null;
    if (gameStatus === GameStatus.RUNNING) {
      scheduleNextMole(randInt(NEXT_MOLE_DELAY_MIN, NEXT_MOLE_DELAY_MAX));
    }
  }, MOLE_LEAVE_MS));
}

function hideAnyActiveMole(immediate) {
  document.querySelectorAll(".mole").forEach((m) => {
    m.classList.remove("up", "leaving");
  });
  if (immediate) {
    document.querySelectorAll(".star-burst, .plus10-text").forEach((el) => el.remove());
  }
  activeMole = null;
}

/* ============================================================
   포인터 입력 (스테이지 단일 핸들러)
   ============================================================ */
function onPointerMove(e) {
  hammerEl.style.left = e.clientX + "px";
  hammerEl.style.top  = e.clientY + "px";
  if (gameStatus === GameStatus.RUNNING) hammerEl.classList.add("visible");
}

function onStagePointerDown(e) {
  // 망치는 항상 휘두름 (게임 중일 때만 의미가 있지만 시각효과는 통일)
  if (gameStatus === GameStatus.RUNNING) {
    onPointerMove(e);
    swingHammer();
  }

  if (gameStatus !== GameStatus.RUNNING) return;
  if (!activeMole || activeMole.hit) return;
  if (!["entering", "up"].includes(activeMole.status)) return;

  const rect = stageEl.getBoundingClientRect();
  const xPct = ((e.clientX - rect.left) / rect.width)  * 100;
  const yPct = ((e.clientY - rect.top)  / rect.height) * 100;

  const slot = TONGUE_SLOTS.find((s) => s.id === activeMole.slotId);
  if (!slot) return;

  const dx = xPct - slot.x;
  const dy = yPct - slot.y;
  const inside = (dx * dx) / (slot.rx * slot.rx) + (dy * dy) / (slot.ry * slot.ry) <= 1;

  if (inside) {
    onMoleHit(slot, e.clientX, e.clientY);
  }
}

function onMoleHit(slot, clientX, clientY) {
  if (!activeMole || activeMole.hit) return;
  activeMole.hit = true;

  updateScore(SCORE_PER_HIT);

  spawnStarBurst(slot);
  spawnPlus10(clientX, clientY);
  playHitSound();

  beginLeaving(slot.id, "hit");
}

/* ============================================================
   망치 휘두름
   ============================================================ */
function swingHammer() {
  hammerEl.classList.add("swinging");
  track(setTimeout(() => hammerEl.classList.remove("swinging"), HAMMER_SWING_MS));
}

/* ============================================================
   점수 & 이펙트
   ============================================================ */
function updateScore(delta) {
  score += delta;
  updateScoreUI({ pulse: delta > 0 });
}

function updateScoreUI({ pulse }) {
  scoreEl.textContent = `🌟 점수: ${score}`;
  if (pulse) {
    scoreEl.classList.remove("pulsing");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("pulsing");
  }
}

function spawnStarBurst(slot) {
  // 슬롯 wrapper의 overflow:hidden을 피해 mole-container에 직접 배치
  const star = document.createElement("img");
  star.src = "assets/star.png";
  star.className = "star-burst";
  star.alt = "";
  star.style.left = slot.x + "%";
  star.style.top  = (slot.y - 4) + "%";
  moleContainer.appendChild(star);
  star.addEventListener("animationend", () => star.remove(), { once: true });
  // 안전망: 애니메이션 이벤트 누락 시 강제 제거
  track(setTimeout(() => star.remove(), HIT_STAR_MS + 200));
}

function spawnPlus10(clientX, clientY) {
  const plus = document.createElement("img");
  plus.src = "assets/plus10.png";
  plus.className = "plus10-text";
  plus.alt = "";
  plus.style.left = clientX + "px";
  plus.style.top  = (clientY - 20) + "px";
  document.body.appendChild(plus);
  plus.addEventListener("animationend", () => plus.remove(), { once: true });
  track(setTimeout(() => plus.remove(), PLUS10_FLOAT_MS + 200));
}

/* ============================================================
   사운드 (Web Audio API) — Phase 6
   ============================================================ */
function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  } catch (_) { /* 무시 */ }
}

function playHitSound() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, t0);
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

function playEndSound() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.4);
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.45);
}
