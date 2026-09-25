/* js/config.js — 상수만 둔다. DOM·window 이외 전역 접근 금지(Node 테스트에서도 읽힘). */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  TDG.config = {
    DRUM_W: 3609,                 // 텅드럼 원본 이미지 크기 — 비율 계산은 이 상수로만(naturalWidth 금지)
    DRUM_H: 3505,

    GameStatus: { IDLE: "idle", COUNTDOWN: "countdown", RUNNING: "running", PAUSED: "paused", ENDED: "ended" },

    GAME: {
      durationMs: 30000,          // 한 판 시간(교사 설정으로 20/30/45/60초)
      countdownMs: 3000,          // 3·2·1
      scorePerHit: 10,
      goldenScore: 30,            // 황금 두더지
      comboBonusFrom: 5,          // 연속 5마리부터
      comboBonus: 5,              //   한 마리당 +5
      hitReactionMs: 420,         // 맞은 두더지가 흔들리다 내려가기까지 (현행 HIT_REACTION_MS)
      hitStarMs: 300,             // 별 터짐 연출 (현행 HIT_STAR_MS)
      scorePopMs: 500,            // 점수 팝 연출 (현행 PLUS10_FLOAT_MS)
      hammerSwingMs: 180,         // (현행 HAMMER_SWING_MS)
      timerWarnSec: 10,           // (현행 TIMER_WARN_SEC)
      touchTolerance: 1.25,       // 손가락 판정 여유(텅 캡슐 반폭의 배수). 마우스·펜은 1.0
    },

    // 부록 D — 시뮬레이션으로 확인한 값. 'normal'은 현행 수치와 같다.
    DIFFICULTY: {
      easy:   { label: "쉬움",   enterMs: 160, visibleMs: [1400, 1900], leaveMs: 200, gapMs: [300, 600], maxConcurrent: 1, rampTo: 1.0,  goldenChance: 0.10 },
      normal: { label: "보통",   enterMs: 140, visibleMs: [750, 1200],  leaveMs: 180, gapMs: [120, 350], maxConcurrent: 1, rampTo: 0.85, goldenChance: 0.08 },
      hard:   { label: "어려움", enterMs: 120, visibleMs: [560, 900],   leaveMs: 160, gapMs: [80, 250],  maxConcurrent: 2, rampTo: 0.8,  goldenChance: 0.06, secondMoleFromMs: 10000 },
    },

    // 별점 = 나온 두더지 중 잡은 비율(%) — 점수 절댓값이 아니라 비율로 매긴다(D-09)
    STARS: [40, 65, 85],

    // 부록 B — 가운데 옥타브는 숫자, 낮은 옥타브는 숫자 3~7 바로 아래 글쇠, 높은 옥타브는 Shift+1~3
    KEYMAP: {
      Digit1: "C4", Digit2: "D4", Digit3: "E4", Digit4: "F4", Digit5: "G4", Digit6: "A4", Digit7: "B4",
      Numpad1: "C4", Numpad2: "D4", Numpad3: "E4", Numpad4: "F4", Numpad5: "G4", Numpad6: "A4", Numpad7: "B4",
      KeyE: "E3", KeyR: "F3", KeyT: "G3", KeyY: "A3", KeyU: "B3",
    },
    SHIFT_HIGH: { Digit1: "C5", Digit2: "D5", Digit3: "E5" },

    STORAGE_KEYS: { settings: "tdg.settings.v1", records: "tdg.records.v1", board: "tdg.board.v1" },
  };
})();
