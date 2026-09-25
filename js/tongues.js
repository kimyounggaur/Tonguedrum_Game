/* js/tongues.js — 음 데이터·텅 좌표·판정(순수 함수, DOM 없음). 부록 B. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const { DRUM_W, DRUM_H, KEYMAP, SHIFT_HIGH } = TDG.config;

  // Tonguedrum_Play와 같은 값. num: ".3"=낮은 3(점 아래), "1'"=높은 1(점 위)
  const NOTE = {
    E3: { freq: 164.81, midi: 52, num: ".3", ko: "낮은 미" },
    F3: { freq: 174.61, midi: 53, num: ".4", ko: "낮은 파" },
    G3: { freq: 196.00, midi: 55, num: ".5", ko: "낮은 솔" },
    A3: { freq: 220.00, midi: 57, num: ".6", ko: "낮은 라" },
    B3: { freq: 246.94, midi: 59, num: ".7", ko: "낮은 시" },
    C4: { freq: 261.63, midi: 60, num: "1",  ko: "도" },
    D4: { freq: 293.66, midi: 62, num: "2",  ko: "레" },
    E4: { freq: 329.63, midi: 64, num: "3",  ko: "미" },
    F4: { freq: 349.23, midi: 65, num: "4",  ko: "파" },
    G4: { freq: 392.00, midi: 67, num: "5",  ko: "솔" },
    A4: { freq: 440.00, midi: 69, num: "6",  ko: "라" },
    B4: { freq: 493.88, midi: 71, num: "7",  ko: "시" },
    C5: { freq: 523.25, midi: 72, num: "1'", ko: "높은 도" },
    D5: { freq: 587.33, midi: 74, num: "2'", ko: "높은 레" },
    E5: { freq: 659.25, midi: 76, num: "3'", ko: "높은 미" },
  };

  // 좌표는 모두 "텅드럼 원본 이미지 3609×3505 기준 %".
  // x,y = 두더지 자리(기존 TONGUE_SLOTS와 같은 값) / lx,ly = 그림에 인쇄된 숫자 위치 / hw = 텅 캡슐 반폭(가로 % 단위)
  const TONGUES = [
    { id: "center-upper",      note: "E3", x: 57.16, y: 35.09, lx: 57.74, ly: 40.11, hw: 4.6 },
    { id: "bottom-center",     note: "F3", x: 57.42, y: 62.66, lx: 57.33, ly: 77.02, hw: 4.4 },
    { id: "lower-left-inner",  note: "G3", x: 41.90, y: 54.90, lx: 32.96, ly: 61.19, hw: 4.0 },
    { id: "lower-right-inner", note: "A3", x: 73.92, y: 55.86, lx: 81.73, ly: 61.50, hw: 4.0 },
    { id: "left-mid-inner",    note: "B3", x: 36.92, y: 38.35, lx: 28.74, ly: 36.10, hw: 3.8 },
    { id: "right-mid-inner",   note: "C4", x: 76.94, y: 37.42, lx: 86.44, ly: 34.05, hw: 3.6 },
    { id: "upper-left-inner",  note: "D4", x: 48.61, y: 24.52, lx: 44.33, ly: 15.25, hw: 3.6 },
    { id: "upper-right-inner", note: "E4", x: 64.96, y: 22.71, lx: 67.88, ly: 14.47, hw: 3.6 },
    { id: "lower-right-outer", note: "F4", x: 68.43, y: 65.78, lx: 73.05, ly: 73.64, hw: 3.6 },
    { id: "lower-left-outer",  note: "G4", x: 45.32, y: 66.75, lx: 41.80, ly: 74.13, hw: 3.6 },
    { id: "right-mid-outer",   note: "A4", x: 81.08, y: 47.52, lx: 88.30, ly: 48.28, hw: 3.3 },
    { id: "left-mid-outer",    note: "B4", x: 32.25, y: 47.65, lx: 26.73, ly: 49.01, hw: 3.3 },
    { id: "right-upper-outer", note: "C5", x: 75.03, y: 26.14, lx: 79.04, ly: 22.43, hw: 3.2 },
    { id: "left-upper-outer",  note: "D5", x: 37.08, y: 26.75, lx: 32.89, ly: 23.45, hw: 3.2 },
    { id: "top-center",        note: "E5", x: 56.47, y: 17.20, lx: 56.16, ly: 11.99, hw: 3.0 },
  ];

  // 점(px,py)과 텅 중심선(두더지 자리→숫자 자리) 사이 거리. 세로 %를 가로 % 단위로 바꿔 등방성으로 잰다.
  function segDist(px, py, t) {
    const k = DRUM_H / DRUM_W;
    const ax = t.x, ay = t.y * k, bx = t.lx, by = t.ly * k, qx = px, qy = py * k;
    const vx = bx - ax, vy = by - ay;
    const len2 = vx * vx + vy * vy || 1e-9;
    const u = Math.max(0, Math.min(1, ((qx - ax) * vx + (qy - ay) * vy) / len2));
    return Math.hypot(qx - (ax + u * vx), qy - (ay + u * vy));
  }

  // 가장 가까운 텅(거리/반폭 최소). tolerance 1 = 캡슐 안쪽만, 1.25 = 손가락 여유. 없으면 null
  function pointToTongue(px, py, tolerance = 1, pool = TONGUES) {
    let best = null;
    for (const t of pool) {
      const r = segDist(px, py, t) / t.hw;
      if (r <= tolerance && (!best || r < best.r)) best = { tongue: t, r };
    }
    return best;
  }

  // 기존 판정(두더지 중심 타원 rx 3.1 · ry 5.8)과 같은 식 — 새 판정이 기존보다 엄격해지지 않게 합집합으로 쓴다
  function inMoleEllipse(px, py, t, rx = 3.1, ry = 5.8) {
    const dx = px - t.x, dy = py - t.y;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  // rect = #stage.getBoundingClientRect() (Phase 1 이후 스테이지 비율 = 그림 비율)
  function clientToDrum(clientX, clientY, rect) {
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  }
  function drumToClient(x, y, rect) {
    return { clientX: rect.left + (x / 100) * rect.width, clientY: rect.top + (y / 100) * rect.height };
  }

  // 키 → 음. 조합키(Ctrl·Alt·Meta)는 브라우저·OS 단축키에 양보한다.
  function keyToNote(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return null;
    if (e.shiftKey) return SHIFT_HIGH[e.code] || null;
    return KEYMAP[e.code] || null;
  }

  // 글자 라벨. style: "num"(숫자 표기 ".5"·"1'") | "ko"(계이름 "낮은 솔") | "abc"(음이름 "G3") | "off"
  // 화면에 숫자를 그릴 때는 ui.js의 labelHTML이 ".5"의 점을 CSS 점으로 바꿔 그린다.
  function noteLabel(noteId, style = "num") {
    const n = NOTE[noteId];
    if (!n || style === "off") return "";
    if (style === "ko") return n.ko;
    if (style === "abc") return noteId;
    return n.num;
  }

  const byId = Object.fromEntries(TONGUES.map((t) => [t.id, t]));
  const byNote = Object.fromEntries(TONGUES.map((t) => [t.note, t]));

  TDG.NOTE = NOTE;
  TDG.TONGUES = TONGUES;
  TDG.tongues = { NOTE, TONGUES, byId, byNote, segDist, pointToTongue, inMoleEllipse, clientToDrum, drumToClient, keyToNote, noteLabel };
})();
