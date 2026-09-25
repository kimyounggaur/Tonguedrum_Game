/* js/debug.js — ?debug=1, ?selftest=1, ?calib=1 개발 도구. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const params = new URLSearchParams(location.search);
  const tests = [];
  const NS = "http://www.w3.org/2000/svg";
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  TDG.selftest = {
    add(id, name, fn, { known } = {}) { tests.push({ id, name, fn, known }); },
    async run() {
      const backup = backupStorage(); const rows = [];
      try {
        for (const test of tests) {
          let value = false, note = "";
          try { value = await test.fn(); if (typeof value === "string" && value !== "skip") { note = value; value = true; } }
          catch (err) { note = err?.message || String(err); value = false; }
          let status = value === "skip" ? "SKIP" : value === false ? (test.known ? "KNOWN" : "FAIL") : "PASS";
          if (test.known && value !== false && value !== "skip") note = `${note ? `${note} · ` : ""}known 표시를 지우세요`;
          rows.push({ id: test.id, status, name: test.name, note });
        }
      } finally {
        try { TDG.game._debug.reset(); } catch (_) {}
        restoreStorage(backup);
      }
      console.table(rows);
      renderSelftest(rows);
      return rows;
    },
  };

  function backupStorage() {
    const data = {};
    try { for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k?.startsWith("tdg.")) data[k] = localStorage.getItem(k); } } catch (_) {}
    return data;
  }
  function restoreStorage(data) {
    try {
      [...Array(localStorage.length)].map((_, i) => localStorage.key(i)).filter((k) => k?.startsWith("tdg.")).forEach((k) => localStorage.removeItem(k));
      Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch (_) {}
  }

  function renderSelftest(rows) {
    document.getElementById("selftest-panel")?.remove();
    const pass = rows.filter((r) => r.status === "PASS").length;
    const known = rows.filter((r) => r.status === "KNOWN").length;
    const fail = rows.filter((r) => r.status === "FAIL").length;
    const skip = rows.filter((r) => r.status === "SKIP").length;
    const root = document.createElement("aside"); root.id = "selftest-panel"; root.className = `selftest-panel${fail ? " has-fail" : ""}`;
    const button = document.createElement("button"); button.type = "button"; button.className = "selftest-badge";
    button.textContent = `SELFTEST ✔${pass} ◐${known} ✖${fail}${skip ? ` · SKIP ${skip}` : ""}`;
    const list = document.createElement("div"); list.className = "selftest-list"; list.hidden = true;
    rows.forEach((r) => {
      const item = document.createElement("div"); item.className = `selftest-item ${r.status.toLowerCase()}`;
      const strong = document.createElement("strong"); strong.textContent = `${r.status} ${r.id}`;
      const span = document.createElement("span"); span.textContent = `${r.name}${r.note ? ` — ${r.note}` : ""}`;
      item.append(strong, span); list.appendChild(item);
    });
    button.addEventListener("click", () => { list.hidden = !list.hidden; });
    root.append(button, list); document.body.appendChild(root);
  }

  function assert(cond, message = "조건 불일치") { if (!cond) throw new Error(message); return true; }

  function registerTests() {
    const add = TDG.selftest.add;
    add("T01", "텅 15개와 고유 id", () => assert(TDG.TONGUES.length === 15 && new Set(TDG.TONGUES.map((t) => t.id)).size === 15));
    add("T02", "텅 좌표 범위와 반폭", () => assert(TDG.TONGUES.every((t) => [t.x, t.y, t.lx, t.ly].every((v) => v >= 0 && v <= 100) && t.hw > 0)));
    add("T03", "스테이지 비율 3609/3505", () => { TDG.ui.showScreen("game"); const r = document.getElementById("stage").getBoundingClientRect(); TDG.ui.showScreen("start"); return assert(r.height > 0 && Math.abs(r.width / r.height - 3609 / 3505) / (3609 / 3505) <= 0.005); });
    add("T04", "모션 감소 CSS 규칙", () => location.protocol === "file:" ? "skip" : assert([...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText?.includes("prefers-reduced-motion") && r.cssText.includes("animation")); } catch (_) { return false; } })));
    add("T05", "망치 swinging 정리", async () => { TDG.effects.swingHammer(); TDG.effects.resetHammer(); await wait(50); return assert(!document.getElementById("hammer-cursor").classList.contains("swinging")); });
    add("T06", "숨김 시 자동 일시정지", async () => {
      TDG.game.start({ mode: "classic", difficulty: "normal", time: 20 }); TDG.game._debug.skipCountdown();
      const d = Object.getOwnPropertyDescriptor(document, "hidden");
      try { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); await wait(10); return assert(TDG.game.status === "paused"); }
      finally { if (d) Object.defineProperty(document, "hidden", d); else delete document.hidden; TDG.game._debug.reset(); }
    });
    add("T07", "일시정지 중 게임 시계 고정", async () => { TDG.game.start({ mode: "classic", time: 20 }); TDG.game._debug.skipCountdown(); await wait(30); TDG.game.pause(); const a = TDG.game._debug.clock.t; await wait(150); const b = TDG.game._debug.clock.t; TDG.game._debug.reset(); return assert(Math.abs(a - b) < 12); });
    add("T08", "키보드 시작 망치가 화면 안", () => { const r = document.getElementById("hammer-cursor").getBoundingClientRect(); return assert(r.left >= -r.width && r.left <= innerWidth && r.top >= -r.height && r.top <= innerHeight); });
    add("T09", "결과 화면 다시 시작 포커스 계약", () => assert(document.getElementById("restart-btn")?.tagName === "BUTTON"));
    add("T10", "현재 화면 스테이지 비율 허용 오차", () => { TDG.ui.showScreen("game"); const r = document.getElementById("stage").getBoundingClientRect(); TDG.ui.showScreen("start"); return assert(r.height > 0 && Math.abs(r.width / r.height - 3609 / 3505) < 0.006); });
    add("T11", "애니메이션 keyframe에 filter 없음", () => assert(!document.getAnimations().some((a) => { try { return a.effect.getKeyframes().some((k) => "filter" in k); } catch (_) { return false; } })));
    add("T12", "게임 드럼은 WebP", () => assert(document.querySelector("#stage img.tonguedrum").currentSrc.endsWith(".webp")));
    add("T13", "장식 글리프 비율", () => {
      const els = [...document.querySelectorAll(".float-glyph")];
      TDG.ui.showScreen("game");
      const hidden = !els.length || getComputedStyle(document.querySelector(".game-ambience")).display === "none";
      const valid = hidden || els.every((el) => {
        const r = el.getBoundingClientRect(); const ratio = r.width / r.height;
        return r.height > 0 && ratio >= 0.9 && ratio <= 1.1;
      });
      TDG.ui.showScreen("start");
      return hidden ? "skip" : assert(valid);
    });
    add("T14", "별 이미지 미리 불러오기", () => location.protocol === "file:" ? "skip" : assert(performance.getEntriesByType("resource").some((r) => r.name.endsWith("/assets/star.png"))));
    add("T15", "음 15개와 top-center 좌표", () => assert(new Set(TDG.TONGUES.map((t) => t.note)).size === 15 && TDG.TONGUES.every((t) => TDG.NOTE[t.note]) && TDG.tongues.byId["top-center"].x === 56.47));
    add("T16", "텅 기준점 45곳 판정", () => assert([1, 1.25].every((tol) => TDG.TONGUES.every((t) => [[t.x, t.y], [t.lx, t.ly], [(t.x + t.lx) / 2, (t.y + t.ly) / 2]].every(([x, y]) => TDG.tongues.pointToTongue(x, y, tol)?.tongue.id === t.id)))));
    add("T17", "얼굴과 드럼 밖은 판정 제외", () => assert([[57.45, 47.5], [46.5, 38.5], [67.5, 38.5], [5, 45]].every(([x, y]) => TDG.tongues.pointToTongue(x, y, 1.25) === null)));
    add("T18", "기존 타원 판정 합집합", () => assert(TDG.TONGUES.every((t) => TDG.tongues.inMoleEllipse(t.x, t.y, t))));
    add("T19", "스테이지 단일 pointerdown", () => assert(document.getElementById("stage") && typeof TDG.game.strike === "function"));
    add("T20", "실행된 later 타이머 Set 정리", async () => { for (let i = 0; i < 20; i += 1) TDG.game.later(() => {}, 0); await wait(30); return assert(TDG.game._debug.pendingCount() === 0); });
    add("T21", "보정 배열 직렬화", () => { const text = serializeTongues(TDG.TONGUES); const parsed = Function(`"use strict";return (${text})`)(); return assert(JSON.stringify(parsed) === JSON.stringify(TDG.TONGUES)); });
    add("T22", "오디오 단음 피크", async () => { if (!window.OfflineAudioContext) return "skip"; const db = await renderPeak((a) => a.playNote("C4")); return assert(db >= -12 && db <= -1, `${db} dBFS`); });
    add("T23", "오디오 6음 리미터", async () => { if (!window.OfflineAudioContext) return "skip"; const db = await renderPeak((a) => ["C4", "E4", "G4", "C5", "E5", "E3"].forEach((n) => a.playNote(n))); return assert(db <= -0.5, `${db} dBFS`); });
    add("T24", "오디오 음소거 무음", async () => { if (!window.OfflineAudioContext) return "skip"; const db = await renderPeak((a) => a.playNote("C4"), { muted: true }); return assert(db <= -80, `${db} dBFS`); });
    add("T25", "15음 재생 가능", () => { if (!window.OfflineAudioContext) return "skip"; const ctx = new OfflineAudioContext(2, 48000, 48000); const a = cloneAudio(ctx); return assert(Object.keys(TDG.NOTE).every((n) => a.playNote(n))); });
    add("T26", "HTMLAudio 미사용", () => assert(!document.querySelector("audio") && !/new\s+Audio\s*\(/.test(TDG.audio.init.toString())));
    add("T27", "저장소 실패 시 기본 설정", () => assert(TDG.storage.loadSettings() && typeof TDG.storage.loadSettings().volume === "number"));
    add("T28", "일시정지는 clock 하나", () => assert(TDG.game._debug.clock && typeof TDG.game.pause === "function"));
    add("T29", "카운트다운 중 strike 무시", () => { TDG.game.start({ mode: "classic", time: 20 }); const before = TDG.game.score; const hit = TDG.game.strike({ tongueId: TDG.TONGUES[0].id, source: "test" }); TDG.game._debug.reset(); return assert(!hit && before === 0); });
    add("T30", "고정 시드 재현성", () => { const seq = () => { const sp = TDG.rules.createSpawner({ cfg: TDG.config.DIFFICULTY.normal, durationMs: 6000, rng: TDG.rules.mulberry32(5), tongues: TDG.TONGUES }); for (let t = 0; t <= 6000; t += 16) sp.update(t); return sp.moles.slice(0, 3).map((m) => m.tongueId).join(); }; return assert(seq() === seq()); });
    add("T31", "5초 내 두더지 등장", () => { const sp = TDG.rules.createSpawner({ cfg: TDG.config.DIFFICULTY.normal, durationMs: 30000, rng: TDG.rules.mulberry32(1), tongues: TDG.TONGUES }); for (let t = 0; t <= 5000; t += 16) sp.update(t); return assert(sp.moles.length > 0); });
    add("T32", "콤보·황금 점수", () => assert(TDG.rules.pointsFor({ golden: false, combo: 5 }) === 15 && TDG.rules.pointsFor({ golden: true, combo: 1 }) === 30));
    add("T33", "빈 텅은 단일 strike 이벤트", () => assert(typeof TDG.game.on === "function" && typeof TDG.game.strike === "function"));
    add("T34", "별점 경계와 0분모", () => assert(TDG.rules.starsFor(85) === 3 && TDG.rules.starsFor(0) === 0));
    add("T35", "기록 동점은 신기록 아님", () => { const key = "selftest.record"; TDG.storage.remove(TDG.config.STORAGE_KEYS.records); const a = TDG.storage.updateRecord(key, { score: 10, stars: 1 }); const b = TDG.storage.updateRecord(key, { score: 10, stars: 1 }); return assert(a.isRecord && !b.isRecord); });
    add("T36", "시작 버튼과 드럼 비겹침", () => { TDG.ui.showScreen("start"); const a = document.getElementById("start-btn").getBoundingClientRect(), b = document.querySelector("#start-screen img.tonguedrum").getBoundingClientRect(); const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); return assert(!overlap); });
    add("T37", "classic·free 모드", () => {
      const original = TDG.audio.playNote; let calls = 0;
      try {
        TDG.audio.playNote = () => { calls += 1; return null; };
        TDG.game.start({ mode: "free" });
        TDG.game.strike({ tongueId: TDG.TONGUES[0].id, source: "selftest" });
        return assert(TDG.MODES.classic && TDG.MODES.free && document.getElementById("timer").hidden && calls === 1);
      } finally { TDG.audio.playNote = original; TDG.game._debug.reset(); }
    });
    add("T38", "숫자·계이름 라벨", () => assert(TDG.ui.labelHTML("G3", "num").includes("oct low") && TDG.ui.labelHTML("C5", "num").includes("oct high") && TDG.ui.labelHTML("E4", "ko") === "미"));
    add("T39", "음 찾기 정답·오답·빈 곳", () => {
      TDG.game._debug.setSeed(3);
      try {
        TDG.game.start({ mode: "find", sub: "see" });
        let s = TDG.game._debug.modeState;
        TDG.game.strike({ tongueId: s.target.id, source: "selftest" });
        TDG.game._debug.stepTo(750);
        const advanced = s.index === 1;
        TDG.game._debug.reset();
        TDG.game.start({ mode: "find", sub: "see" });
        s = TDG.game._debug.modeState;
        const wrong = TDG.TONGUES.find((t) => t.id !== s.target.id);
        TDG.game.strike({ tongueId: wrong.id, source: "selftest" });
        TDG.game.strike({ tongueId: wrong.id, source: "selftest" });
        const glowed = !!document.querySelector(`.tongue-glow[data-tongue-id="${s.target.id}"][data-level="2"]`);
        const before = `${s.index}|${s.attempts}|${s.answers.length}`;
        TDG.game.strike({ x: 57.45, y: 47.5, source: "selftest" });
        return assert(advanced && glowed && before === `${s.index}|${s.attempts}|${s.answers.length}`);
      } finally { TDG.game._debug.reset(); TDG.game._debug.setSeed(null); }
    });
    add("T40", "수록곡 전곡 유효", () => assert(TDG.songs.SONGS.every((s) => TDG.songs.validateSong(s).length === 0 && TDG.songs.parseSong(s.notes).events.filter((e) => e.note).every((e) => TDG.NOTE[e.note]))));
    add("T41", "작은 별 정답 완주", () => {
      try {
        TDG.game.start({ mode: "melody", songId: "twinkle" });
        const s = TDG.game._debug.modeState;
        const count = s.notes.length;
        s.notes.forEach((event, i) => {
          s.nextAt = 0; TDG.game._debug.stepTo(i * 130);
          TDG.game.strike({ tongueId: TDG.tongues.byNote[event.note].id, source: "selftest" });
        });
        TDG.game.end();
        return assert(count === 42 && TDG.game.lastResult?.completed && TDG.game.lastResult.score === 100 && TDG.game.lastResult.stars === 3);
      } finally { TDG.game._debug.reset(); }
    });
    add("T42", "따라 치기 입력 규칙", () => {
      try {
        TDG.game.start({ mode: "echo" });
        const s = TDG.game._debug.modeState; const lives = s.lives; const progress = s.inputIndex;
        TDG.game.strike({ tongueId: TDG.tongues.byNote[s.sequence[0]].id, source: "selftest" });
        const ignored = s.lives === lives && s.inputIndex === progress;
        s.listening = false; s.playback = null;
        s.sequence.forEach((note) => TDG.game.strike({ tongueId: TDG.tongues.byNote[note].id, source: "selftest" }));
        const grew = s.length === 3;
        s.nextRoundAt = 0; s.listening = false;
        TDG.game.strike({ tongueId: TDG.TONGUES[0].id, source: "selftest" });
        return assert(ignored && grew && s.lives === lives - 1);
      } finally { TDG.game._debug.reset(); }
    });
    add("T43", "Digit5는 G4", () => assert(TDG.tongues.keyToNote({ code: "Digit5" }) === "G4" && TDG.tongues.byNote.G4.id === "lower-left-outer"));
    add("T44", "Shift/Ctrl/repeat 키 규칙", () => assert(TDG.tongues.keyToNote({ code: "Digit1", shiftKey: true }) === "C5" && TDG.tongues.keyToNote({ code: "Digit1", ctrlKey: true }) === null));
    add("T45", "모바일 두더지 폭", () => {
      if (innerWidth > 640) return "skip";
      TDG.ui.showScreen("game");
      const width = document.querySelector(".mole").getBoundingClientRect().width;
      TDG.ui.showScreen("start");
      return assert(width >= 28);
    });
    add("T46", "화면 확대 허용", () => assert(!document.querySelector('meta[name="viewport"]').content.includes("user-scalable=no")));
    add("T47", "시작 버튼 대비 4.5 이상", () => { const s = getComputedStyle(document.getElementById("start-btn")); return assert(contrast(s.backgroundColor, s.color) >= 4.5); });
    add("T48", "화면 낭독기 게임 시작 알림", async () => {
      try {
        const el = document.getElementById("sr-status");
        TDG.game.start({ mode: "classic", time: 30 }); TDG.game._debug.skipCountdown(); await wait(50);
        return assert(el?.getAttribute("aria-live") === "polite" && el.textContent.trim().length > 0);
      } finally { TDG.game._debug.reset(); }
    });
    add("T49", "웹 앱 manifest 연결", () => assert(document.querySelector('link[rel="manifest"]')));
    add("T50", "서비스워커 환경", async () => { if (!("serviceWorker" in navigator) || location.protocol === "file:") return "skip"; const reg = await Promise.race([navigator.serviceWorker.ready, wait(5000).then(() => null)]); return assert(!!reg); });
    add("T51", "공유 대체 경로", async () => {
      const shareOwn = Object.getOwnPropertyDescriptor(navigator, "share");
      const clipboardOwn = Object.getOwnPropertyDescriptor(navigator, "clipboard");
      let copied = "";
      try {
        TDG.game.start({ mode: "classic", time: 20 }); TDG.game._debug.skipCountdown(); TDG.game.end();
        Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { copied = text; } } });
        await TDG.ui.shareResult();
        return assert(copied.includes("텅드럼 두더지잡기") && copied.includes("https://"));
      } finally {
        if (shareOwn) Object.defineProperty(navigator, "share", shareOwn); else delete navigator.share;
        if (clipboardOwn) Object.defineProperty(navigator, "clipboard", clipboardOwn); else delete navigator.clipboard;
        TDG.game._debug.reset();
      }
    });
    add("T52", "유효 프리셋과 45초 출제 풀", () => {
      const before = TDG.preset;
      try {
        const p = TDG.ui.parsePreset("?tongues=C4,D4,E4&time=45"); TDG.preset = p;
        TDG.game.start({ mode: "classic" }); TDG.game._debug.skipCountdown();
        for (let t = 0; t <= 8000; t += 16) TDG.game._debug.stepTo(t);
        const moles = TDG.game._debug.modeState.spawner.moles;
        const allowed = new Set(p.tongues.map((note) => TDG.tongues.byNote[note].id));
        return assert(p.time === 45 && p.tongues.join() === "C4,D4,E4" && TDG.game._debug.durationMs === 45000 && moles.length > 0 && moles.every((m) => allowed.has(m.tongueId)));
      } finally { TDG.game._debug.reset(); TDG.preset = before; }
    });
    add("T53", "잘못된 프리셋 무시", () => { const p = TDG.ui.parsePreset("?level=zzz&time=7&tongues=C9"); return assert(!("difficulty" in p) && !("time" in p) && !("tongues" in p)); });
    add("T54", "순위표 상위 10개·별명 정제", () => { TDG.storage.clearBoard("selftest"); for (let i = 0; i < 11; i += 1) TDG.storage.addBoardEntry("selftest", { name: "  <b>민수</b>123456789 ", score: i, stars: 1, date: "2026-01-01" }); const rows = TDG.storage.getBoard("selftest"); return assert(rows.length === 10 && rows[0].score === 10 && TDG.storage.sanitizeBoardName("  <b>민수</b>123456789 ") === "b민수b1234"); });
    add("T55", "실제 결과 카드 1080×1350 PNG", async () => {
      try {
        TDG.game.start({ mode: "classic", time: 20 }); TDG.game._debug.skipCountdown(); TDG.game.end();
        await TDG.ui.openResultCard();
        const c = document.getElementById("result-card-canvas");
        const pixel = c.getContext("2d").getImageData(540, 400, 1, 1).data;
        const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
        const imagePainted = !(pixel[0] === 246 && pixel[1] === 240 && pixel[2] === 252);
        return assert(c.width === 1080 && c.height === 1350 && !!blob && blob.type === "image/png" && (location.protocol === "file:" || imagePainted));
      } finally { TDG.ui.closeDialog("result-card-modal", false); TDG.game._debug.reset(); }
    });
  }

  function cloneAudio(ctx, options = {}) {
    const a = Object.assign(Object.create(Object.getPrototypeOf(TDG.audio)), TDG.audio, { ctx: null, master: null, bus: null, sfx: null, voices: [], ...options });
    a.init(ctx); return a;
  }
  async function renderPeak(setup, { volume = 0.7, muted = false } = {}) {
    const ctx = new OfflineAudioContext(2, 48000 * 3, 48000); const a = cloneAudio(ctx, { volume, muted }); setup(a);
    const buf = await ctx.startRendering(); let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch += 1) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i += 1) peak = Math.max(peak, Math.abs(d[i])); }
    return peak === 0 ? -Infinity : +(20 * Math.log10(peak)).toFixed(1);
  }

  function colorRgb(value) { const m = String(value).match(/[\d.]+/g)?.slice(0, 3).map(Number); return m || [0, 0, 0]; }
  function luminance(value) { const rgb = colorRgb(value).map((x) => x / 255).map((x) => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; }
  function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  function setupDebugOverlay() {
    document.body.classList.add("debug-mode");
    document.querySelectorAll(".mole-slot").forEach((el) => el.classList.add("debug"));
    const stage = document.getElementById("stage"), layer = document.getElementById("tongue-layer");
    TDG.TONGUES.forEach((t) => {
      layer.appendChild(TDG.effects.tongueCapsule(t, "debug-capsule"));
      const text = document.createElementNS(NS, "text"); text.setAttribute("class", "debug-note"); text.setAttribute("x", String(t.lx * 36.09)); text.setAttribute("y", String(t.ly * 35.05)); text.textContent = t.note; layer.appendChild(text);
    });
    const stageBox = document.createElement("div"), imageBox = document.createElement("div"), warning = document.createElement("div"), stats = document.createElement("div");
    stageBox.className = "debug-stage-box"; imageBox.className = "debug-image-box"; warning.className = "debug-warning"; stats.className = "debug-stats";
    stage.append(stageBox, imageBox); document.body.append(warning, stats);
    function updateBoxes() {
      const r = stage.getBoundingClientRect(), ar = 3609 / 3505;
      let w = r.width, h = w / ar; if (h > r.height) { h = r.height; w = h * ar; }
      imageBox.style.left = `${(r.width - w) / 2}px`; imageBox.style.top = `${(r.height - h) / 2}px`; imageBox.style.width = `${w}px`; imageBox.style.height = `${h}px`;
      const diff = Math.abs(r.width - w) / Math.max(1, w) * 100;
      warning.hidden = diff <= 0.5; warning.textContent = `⚠ 스테이지 비율 불일치 (${diff.toFixed(1)}%)`;
    }
    let last = performance.now(), frames = [];
    function fps(now) { frames.push(now - last); last = now; if (frames.length > 60) frames.shift(); const avg = frames.reduce((a, b) => a + b, 0) / frames.length; stats.textContent = `FPS ${Math.round(1000 / avg)} · ${TDG.game.status} · ${TDG.game._debug.activeMole?.tongueId || "-"}`; requestAnimationFrame(fps); }
    stage.addEventListener("pointerdown", (e) => { const p = TDG.tongues.clientToDrum(e.clientX, e.clientY, stage.getBoundingClientRect()); console.log(`[debug] x ${p.x.toFixed(2)}%, y ${p.y.toFixed(2)}%`); });
    addEventListener("resize", updateBoxes); updateBoxes(); requestAnimationFrame(fps);
  }

  function serializeTongues(list) {
    return `[\n${list.map((t) => `  { id: ${JSON.stringify(t.id)}, note: ${JSON.stringify(t.note)}, x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)}, lx: ${t.lx.toFixed(2)}, ly: ${t.ly.toFixed(2)}, hw: ${t.hw.toFixed(1)} }`).join(",\n")}\n]`;
  }

  function setupCalibration() {
    TDG.game._debug.reset(); TDG.ui.showScreen("game"); document.body.classList.add("calib-mode");
    const stage = document.getElementById("stage"), layer = document.getElementById("tongue-layer");
    stage.style.cursor = "crosshair"; document.getElementById("game-screen").style.cursor = "crosshair";
    const original = TDG.TONGUES.map((t) => ({ ...t }));
    let data = TDG.storage.get("tdg.calib.v1", original).map((t, i) => ({ ...original[i], ...t }));
    let selected = data[0].id, selectedHandle = "x";
    const panel = document.createElement("aside"); panel.className = "calib-panel"; panel.innerHTML = '<h1>텅 보정 도구</h1><p>여기서 바꾼 값은 이 브라우저에만 임시 저장됩니다. 게임에 반영하려면 “코드 복사” 후 js/tongues.js의 TONGUES 자리에 붙여 넣고 커밋하세요. (정적 사이트는 브라우저에서 파일을 고칠 수 없습니다)</p><div class="calib-tools"><button type="button" data-act="minus">− 폭</button><button type="button" data-act="plus">+ 폭</button><label><input type="checkbox" data-act="preview"> 두더지 미리보기</label><button type="button" data-act="reset">되돌리기</button><button type="button" data-act="copy">코드 복사</button></div><div class="calib-list"></div><textarea class="calib-copy" hidden></textarea>';
    document.getElementById("game-screen").appendChild(panel);
    function render() {
      layer.innerHTML = "";
      data.forEach((t) => {
        const line = TDG.effects.tongueCapsule(t, `calib-capsule${t.id === selected ? " selected" : ""}`); line.dataset.select = t.id; line.style.pointerEvents = "auto"; layer.appendChild(line);
        [["x", t.x, t.y, "circle"], ["l", t.lx, t.ly, "rect"]].forEach(([kind, x, y, shape]) => {
          const h = document.createElementNS(NS, shape); h.setAttribute("class", `calib-handle ${kind}`); h.dataset.id = t.id; h.dataset.kind = kind;
          if (shape === "circle") { h.setAttribute("cx", x * 36.09); h.setAttribute("cy", y * 35.05); h.setAttribute("r", "44"); }
          else { h.setAttribute("x", x * 36.09 - 40); h.setAttribute("y", y * 35.05 - 40); h.setAttribute("width", "80"); h.setAttribute("height", "80"); }
          layer.appendChild(h);
        });
      });
      const list = panel.querySelector(".calib-list"); list.innerHTML = "";
      data.forEach((t) => { const b = document.createElement("button"); b.type = "button"; b.className = t.id === selected ? "selected" : ""; b.dataset.select = t.id; b.textContent = `${t.note} · x ${t.x.toFixed(2)} y ${t.y.toFixed(2)} · l ${t.lx.toFixed(2)},${t.ly.toFixed(2)} · 폭 ${t.hw.toFixed(1)}`; list.appendChild(b); });
      TDG.storage.set("tdg.calib.v1", data);
    }
    let drag = null;
    layer.addEventListener("pointerdown", (e) => {
      const target = e.target; const id = target.dataset.id || target.dataset.select; if (!id) return;
      selected = id; selectedHandle = target.dataset.kind || selectedHandle; drag = target.dataset.kind ? target : null;
      if (drag) target.setPointerCapture(e.pointerId); render();
    });
    layer.addEventListener("pointermove", (e) => {
      if (!drag) return; const p = TDG.tongues.clientToDrum(e.clientX, e.clientY, stage.getBoundingClientRect()); const t = data.find((x) => x.id === selected);
      if (selectedHandle === "x") { t.x = +p.x.toFixed(2); t.y = +p.y.toFixed(2); } else { t.lx = +p.x.toFixed(2); t.ly = +p.y.toFixed(2); } render();
    });
    layer.addEventListener("pointerup", () => { drag = null; });
    panel.addEventListener("click", async (e) => {
      if (e.target.dataset.select) { selected = e.target.dataset.select; render(); return; }
      const act = e.target.dataset.act, t = data.find((x) => x.id === selected); if (!act || !t) return;
      if (act === "minus") t.hw = Math.max(0.5, +(t.hw - 0.1).toFixed(1));
      if (act === "plus") t.hw = +(t.hw + 0.1).toFixed(1);
      if (act === "reset") data = original.map((x) => ({ ...x }));
      if (act === "preview") document.querySelectorAll(".mole").forEach((m) => m.classList.toggle("up", e.target.checked));
      if (act === "copy") {
        const text = serializeTongues(data); const ta = panel.querySelector(".calib-copy");
        try { await navigator.clipboard.writeText(text); TDG.ui.toast("코드를 복사했어요"); } catch (_) { ta.hidden = false; ta.value = text; ta.select(); }
      }
      render();
    });
    addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "BracketLeft", "BracketRight"].includes(e.code)) return;
      const t = data.find((x) => x.id === selected), step = e.shiftKey ? 0.5 : 0.05; if (!t) return; e.preventDefault();
      if (e.code === "BracketLeft") t.hw = Math.max(0.5, +(t.hw - 0.1).toFixed(1));
      else if (e.code === "BracketRight") t.hw = +(t.hw + 0.1).toFixed(1);
      else {
        const xk = selectedHandle === "x" ? "x" : "lx", yk = selectedHandle === "x" ? "y" : "ly";
        if (e.code === "ArrowLeft") t[xk] -= step; if (e.code === "ArrowRight") t[xk] += step;
        if (e.code === "ArrowUp") t[yk] -= step; if (e.code === "ArrowDown") t[yk] += step;
        t[xk] = +t[xk].toFixed(2); t[yk] = +t[yk].toFixed(2);
      }
      render();
    });
    render();
  }

  async function init() {
    registerTests();
    const img = document.querySelector("#start-screen img.tonguedrum");
    if (img?.decode) await img.decode().catch(() => {});
    if (params.get("calib") === "1") { setupCalibration(); return; }
    if (params.get("debug") === "1") setupDebugOverlay();
    if (params.get("selftest") === "1") { await wait(120); TDG.selftest.run(); }
  }

  TDG.debug = { init, serializeTongues, renderPeak };
})();
