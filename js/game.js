/* js/game.js — 게임 시계, 상태 머신, 단일 strike 진입점, 다섯 가지 모드. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const { GameStatus, GAME, DIFFICULTY } = TDG.config;
  const pending = new Set();
  const listeners = new Map();
  let state = GameStatus.IDLE;
  let stateBeforePause = GameStatus.IDLE;
  let rafId = 0;
  let currentMode = null;
  let modeId = "classic";
  let modeState = {};
  let options = {};
  let durationMs = GAME.durationMs;
  let lastTimerSec = null;
  let lastCountdownSec = null;
  let currentGameTime = 0;
  let rng = Math.random;
  let seedOverride = null;
  let lastInputSource = "pointer";
  let lastResult = null;

  const clock = {
    startedAt: 0, pausedAt: 0, pausedTotal: 0,
    start(now) { this.startedAt = now; this.pausedAt = 0; this.pausedTotal = 0; },
    pause(now) { if (!this.pausedAt) this.pausedAt = now; },
    resume(now) { if (this.pausedAt) { this.pausedTotal += now - this.pausedAt; this.pausedAt = 0; } },
    t(now) { return (this.pausedAt || now) - this.startedAt - this.pausedTotal; },
  };

  function settings() {
    return TDG.effectiveSettings ? TDG.effectiveSettings() : (TDG.settings || {});
  }

  function makeRng() {
    const raw = new URLSearchParams(location.search).get("seed");
    const seed = seedOverride ?? (raw !== null && raw !== "" ? Number(raw) || 0 : null);
    return seed === null ? Math.random : TDG.rules.mulberry32(seed);
  }

  function later(fn, ms) {
    const id = setTimeout(() => { pending.delete(id); fn(); }, ms);
    pending.add(id); return id;
  }

  function clearTimers() {
    pending.forEach(clearTimeout); pending.clear();
  }

  function stopFrame() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name)?.delete(fn);
  }

  function emit(name, payload) {
    listeners.get(name)?.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
  }

  function allowedTongues() {
    const list = settings().tongues;
    if (!Array.isArray(list) || !list.length) return TDG.TONGUES.slice();
    const out = list.map((note) => TDG.tongues.byNote[note]).filter(Boolean);
    return out.length ? out : TDG.TONGUES.slice();
  }

  function panFor(t) { return Math.max(-0.5, Math.min(0.5, (t.x - 50) / 60)); }

  function playTongue(t, velocity = 0.9, when) {
    if (!t) return null;
    return TDG.audio.playNote(t.note, { velocity, pan: panFor(t), when });
  }

  function labelFor(t) {
    return TDG.ui.labelHTML(t.note, settings().label || "ko");
  }

  function visibleLabelFor(t) {
    return settings().label === "off" ? "" : labelFor(t);
  }

  const api = {
    showMole(id, opts) { TDG.effects.showMole(id, opts); },
    hideMole(id, opts) { TDG.effects.hideMole(id, opts); },
    hideAllMoles() { TDG.effects.hideAllMoles(true); },
    glowTongue(id, level) { TDG.effects.glowTongue(id, level); },
    flashLabel(id, html, ms) { TDG.effects.flashLabel(id, html, ms); },
    celebrate(id) { TDG.effects.celebrate(id); },
    setScore(n, opts) { TDG.ui.setScore(n, opts); },
    scorePop(id, points, opts) { TDG.effects.scorePop(id, points, opts); },
    setCombo(n) { TDG.ui.setCombo(n); },
    stopScheduled() { TDG.audio.stopAll(); modeState.playback = null; },
    playNote(note, opts) { return TDG.audio.playNote(note, opts); },
    tick(opts) { return TDG.audio.tick(opts); },
    setHud(value) { TDG.ui.setHud(value); },
    announce(text) { TDG.ui.announce(text); },
    end() { end(); },
    later,
    settings,
    allowedTongues,
    labelFor,
    get t() { return currentGameTime; },
    get rng() { return rng; },
  };

  function sanitizeOptions(input) {
    const s = settings();
    const picked = input && typeof input === "object" && !(input instanceof Event) ? input : (TDG.ui.getStartOptions?.() || {});
    const difficulty = s.levelLock || picked.difficulty || s.difficulty || "normal";
    return {
      mode: picked.mode || s.mode || "classic",
      difficulty: DIFFICULTY[difficulty] ? difficulty : "normal",
      songId: picked.songId || s.songId || "twinkle",
      sub: ["see", "hear"].includes(picked.sub) ? picked.sub : "see",
      time: [20, 30, 45, 60].includes(Number(picked.time || s.time)) ? Number(picked.time || s.time) : 30,
      startEvent: input instanceof Event ? input : picked.startEvent,
    };
  }

  function start(input) {
    resetRuntime(false);
    options = sanitizeOptions(input);
    modeId = MODES[options.mode] ? options.mode : "classic";
    currentMode = MODES[modeId];
    durationMs = options.time * 1000;
    rng = makeRng();
    currentGameTime = 0;
    lastTimerSec = null;
    lastCountdownSec = null;
    lastResult = null;
    modeState = {};
    TDG.audio.init();
    TDG.ui.showScreen("game");
    TDG.ui.resetGameUI({ mode: currentMode, durationMs });
    TDG.effects.clearGlows();
    TDG.effects.hideAllMoles(true);
    TDG.effects.renderKeyHints(!!settings().keyHints);
    TDG.effects.placeHammerAtStart(options.startEvent || input);
    clock.start(performance.now());
    currentMode.start(api, options);
    if (currentMode.usesTimer) {
      state = GameStatus.COUNTDOWN;
      showCountdown(3);
      if (settings().ticks !== "off") TDG.audio.tick();
    } else {
      state = GameStatus.RUNNING;
      TDG.ui.hideCountdown();
    }
    document.getElementById("game-screen")?.focus({ preventScroll: true });
    stopFrame();
    rafId = requestAnimationFrame(frame);
    emit("start", { mode: modeId, options: { ...options } });
  }

  function showCountdown(n) {
    TDG.ui.setCountdown(String(n));
    lastCountdownSec = n;
  }

  function frame(now) {
    rafId = 0;
    if (state === GameStatus.COUNTDOWN) {
      const elapsed = clock.t(now);
      const remain = Math.max(0, Math.ceil((GAME.countdownMs - elapsed) / 1000));
      if (remain > 0 && remain !== lastCountdownSec) {
        showCountdown(remain);
        if (settings().ticks !== "off") TDG.audio.tick();
      }
      if (elapsed >= GAME.countdownMs) {
        state = GameStatus.RUNNING;
        lastTimerSec = Math.ceil(durationMs / 1000);
        TDG.ui.setTimer(lastTimerSec, { warn: false });
        TDG.ui.setCountdown("시작!");
        if (settings().ticks !== "off") TDG.audio.tick({ accent: true });
        later(() => TDG.ui.hideCountdown(), 400);
        currentMode.onRunning?.(api);
        api.announce(`게임 시작! ${options.time}초 동안 두더지를 잡아요.`);
      }
    }

    if (state === GameStatus.RUNNING) {
      currentGameTime = Math.max(0, clock.t(now) - (currentMode.usesTimer ? GAME.countdownMs : 0));
      if (currentMode.usesTimer) {
        const remainingMs = Math.max(0, durationMs - currentGameTime);
        const sec = Math.ceil(remainingMs / 1000);
        if (sec !== lastTimerSec) {
          TDG.ui.setTimer(sec, { warn: sec <= GAME.timerWarnSec && sec > 0 });
          if (sec > 0 && tickAllowed(sec)) TDG.audio.tick({ accent: sec <= GAME.timerWarnSec });
          if (sec === 10) api.announce("10초 남았어요.");
          lastTimerSec = sec;
        }
        currentMode.frame(currentGameTime, api);
        if (remainingMs <= 0 && state === GameStatus.RUNNING) { end(); return; }
      } else {
        currentMode.frame(currentGameTime, api);
      }
    }
    if (state === GameStatus.RUNNING || state === GameStatus.COUNTDOWN) rafId = requestAnimationFrame(frame);
  }

  function tickAllowed(sec) {
    const policy = settings().ticks || "all";
    return policy === "all" || (policy === "last10" && sec <= 10);
  }

  function pause(reason = "manual") {
    if (![GameStatus.COUNTDOWN, GameStatus.RUNNING].includes(state)) return;
    stateBeforePause = state;
    clock.pause(performance.now());
    state = GameStatus.PAUSED;
    stopFrame();
    TDG.audio.stopAll();
    currentMode?.pause?.(api, reason);
    document.body.classList.add("game-paused");
    TDG.ui.showPause(true);
    emit("pause", { reason });
  }

  function resume() {
    if (state !== GameStatus.PAUSED) return;
    clock.resume(performance.now());
    state = stateBeforePause;
    TDG.audio.init();
    currentMode?.resume?.(api);
    document.body.classList.remove("game-paused");
    TDG.ui.showPause(false);
    document.getElementById("game-screen")?.focus({ preventScroll: true });
    rafId = requestAnimationFrame(frame);
    emit("resume", { state });
  }

  function togglePause() {
    if (state === GameStatus.PAUSED) resume();
    else pause("manual");
  }

  function resultMessage(stars, difficulty) {
    if (stars === 0) return "괜찮아요! 두더지가 나오는 텅을 잘 보세요.";
    if (stars === 1) return "좋아요! 조금 더 빨리 쳐 볼까요?";
    if (stars === 2) return "잘했어요!";
    return difficulty === "easy" ? "완벽해요! 이제 '보통'에 도전해요!" : "두더지 마스터! 🏆";
  }

  function updateRecord(result) {
    if (!result?.recordKey) return { isRecord: false, record: null };
    const key = TDG.config.STORAGE_KEYS.records;
    const all = TDG.storage.get(key, {});
    const old = all[result.recordKey] || { best: 0, bestStars: 0, plays: 0, last: "" };
    const value = Number(result.score) || 0;
    const isRecord = value > Number(old.best || 0);
    const next = {
      ...old,
      best: isRecord ? value : Number(old.best || 0),
      bestStars: Math.max(Number(old.bestStars || 0), Number(result.stars || 0)),
      plays: Number(old.plays || 0) + 1,
      last: new Date().toISOString().slice(0, 10),
    };
    if (result.bestTimeMs != null && result.completed) {
      next.bestTimeMs = old.bestTimeMs == null ? result.bestTimeMs : Math.min(old.bestTimeMs, result.bestTimeMs);
    }
    all[result.recordKey] = next;
    TDG.storage.set(key, all);
    return { isRecord, record: next };
  }

  function end() {
    if ([GameStatus.ENDED, GameStatus.IDLE].includes(state)) return;
    stopFrame();
    clearTimers();
    TDG.audio.stopAll();
    state = GameStatus.ENDED;
    TDG.ui.showPause(false);
    TDG.effects.hideAllMoles(true);
    TDG.effects.clearGlows();
    TDG.effects.resetHammer();
    document.body.classList.remove("game-paused");
    const result = currentMode?.result?.(api) || null;
    if (!result) { goHome(); return; }
    const rec = updateRecord(result);
    result.isRecord = rec.isRecord;
    result.record = rec.record;
    result.mode = modeId;
    result.modeTitle = currentMode.title;
    result.difficulty = options.difficulty;
    result.time = options.time;
    lastResult = result;
    TDG.ui.showResult(result);
    TDG.ui.showScreen("end");
    TDG.audio.jingle({ record: rec.isRecord });
    const summary = result.announcement || `게임 끝. 별 ${result.stars}개.`;
    api.announce(summary);
    later(() => document.getElementById("restart-btn")?.focus({ preventScroll: true }), 0);
    emit("end", result);
  }

  function goHome() {
    resetRuntime(false);
    state = GameStatus.IDLE;
    currentMode = null;
    modeId = "classic";
    TDG.ui.showPause(false);
    TDG.ui.showScreen("start");
    TDG.ui.refreshStart?.();
    document.getElementById("start-btn")?.focus({ preventScroll: true });
  }

  function restart(input) {
    start({ ...options, startEvent: input instanceof Event ? input : undefined });
  }

  function resetRuntime(showStart = true) {
    stopFrame(); clearTimers(); TDG.audio?.stopAll?.();
    TDG.effects?.hideAllMoles?.(true); TDG.effects?.clearGlows?.(); TDG.effects?.resetHammer?.();
    document.body.classList.remove("game-paused");
    TDG.ui?.showPause?.(false);
    state = GameStatus.IDLE;
    if (showStart) TDG.ui?.showScreen?.("start");
  }

  function strike(input = {}) {
    if (state !== GameStatus.RUNNING) return false;
    let tongue = null;
    let x = Number(input.x), y = Number(input.y);
    if (input.tongueId) {
      tongue = TDG.tongues.byId[input.tongueId] || null;
      if (tongue) { x = tongue.x; y = tongue.y; }
    } else if (Number.isFinite(x) && Number.isFinite(y)) {
      const tolerance = input.pointerType === "touch" ? GAME.touchTolerance : 1;
      tongue = TDG.tongues.pointToTongue(x, y, tolerance, allowedTongues())?.tongue || null;
    }
    lastInputSource = input.source || "pointer";
    const ev = {
      tongue, x, y, source: lastInputSource, pointerType: input.pointerType || "",
      clientX: input.clientX, clientY: input.clientY, hit: false, moleTongue: null,
    };
    currentMode?.strike?.(ev, api);
    emit("strike", ev);
    return !!ev.hit;
  }

  function nearestMole(candidates, ev) {
    const { x, y } = ev;
    let best = null;
    for (const m of candidates) {
      const t = TDG.tongues.byId[m.tongueId];
      if (!t) continue;
      const byTongue = ev.tongue?.id === t.id;
      const inside = byTongue || TDG.tongues.inMoleEllipse(x, y, t);
      if (!inside) continue;
      const d = (x - t.x) ** 2 + (y - t.y) ** 2;
      if (!best || d < best.d) best = { mole: m, tongue: t, d };
    }
    return best;
  }

  function classicStart() {
    const cfg = DIFFICULTY[options.difficulty];
    const stage = document.getElementById("stage");
    stage?.style.setProperty("--mole-enter-ms", `${cfg.enterMs}ms`);
    stage?.style.setProperty("--mole-leave-ms", `${cfg.leaveMs}ms`);
    const tongues = allowedTongues();
    modeState = {
      spawner: TDG.rules.createSpawner({ cfg, durationMs, rng, tongues, hitReactionMs: GAME.hitReactionMs }),
      cfg,
      stats: { hits: 0, escaped: 0, emptyStrikes: 0, combo: 0, bestCombo: 0, goldenHits: 0, score: 0 },
      rendered: new Set(),
    };
    api.setScore(0, { pulse: false }); api.setCombo(0);
    api.setHud({ title: "두더지잡기", progress: null, lives: null, big: "" });
    TDG.ui.setTimer(Math.ceil(durationMs / 1000), { warn: false });
  }

  function classicFrame(t) {
    const s = modeState;
    for (const ev of s.spawner.update(t)) {
      const m = ev.mole;
      if (ev.type === "spawn") {
        s.rendered.add(m.seq);
        const label = settings().label === "off" ? "" : labelFor(TDG.tongues.byId[m.tongueId]);
        api.showMole(m.tongueId, { golden: m.golden, label });
        if (lastInputSource === "key") api.setHud({ big: TDG.effects.keyLabel(TDG.tongues.byId[m.tongueId].note) });
      } else if (ev.type === "leave") {
        api.hideMole(m.tongueId, { leaving: true });
        if (ev.escaped) { s.stats.escaped += 1; s.stats.combo = 0; api.setCombo(0); }
      } else if (ev.type === "gone") {
        s.rendered.delete(m.seq); api.hideMole(m.tongueId, { leaving: false });
      }
    }
  }

  function classicStrike(ev) {
    const s = modeState;
    const t = currentGameTime;
    const candidates = s.spawner.moles.filter((m) => m.hitAt === null && t >= m.spawnAt && t < m.leaveAt);
    const match = Number.isFinite(ev.x) && Number.isFinite(ev.y) ? nearestMole(candidates, ev) : null;
    if (match) {
      const { mole, tongue } = match;
      s.spawner.hit(mole, t);
      s.stats.hits += 1; s.stats.combo += 1;
      s.stats.bestCombo = Math.max(s.stats.bestCombo, s.stats.combo);
      if (mole.golden) s.stats.goldenHits += 1;
      const points = TDG.rules.pointsFor({ golden: mole.golden, combo: s.stats.combo });
      s.stats.score += points;
      ev.hit = true; ev.moleTongue = tongue;
      playTongue(tongue, 1);
      api.celebrate(tongue.id);
      api.scorePop(tongue.id, points, { gold: mole.golden, clientX: ev.clientX, clientY: ev.clientY });
      api.setScore(s.stats.score, { pulse: true }); api.setCombo(s.stats.combo);
      if (settings().vibrate && navigator.vibrate) navigator.vibrate(12);
    } else if (ev.tongue) {
      s.stats.emptyStrikes += 1; playTongue(ev.tongue, 0.55); TDG.effects.rippleTongue(ev.tongue.id);
    }
  }

  function classicResult() {
    const s = modeState.stats;
    const decided = s.hits + s.escaped;
    const rate = decided ? Math.round((s.hits / decided) * 100) : 0;
    const stars = TDG.rules.starsFor(rate);
    return {
      title: "게임 끝!", stars, score: s.score,
      lines: [["잡은 두더지", `${s.hits} / ${decided}마리 (${rate}%)`], ["최고 콤보", `${s.bestCombo}`], ["황금 두더지", `${s.goldenHits}`]],
      message: resultMessage(stars, options.difficulty),
      recordKey: `classic.${options.difficulty}.${options.time}`,
      announcement: `게임 끝. ${decided}마리 중 ${s.hits}마리를 잡았어요. 별 ${stars}개.`,
      stats: { ...s, rate, decided }, completed: true,
    };
  }

  function freeStart() {
    modeState = { history: [], playback: null, startedAt: 0 };
    api.setHud({ title: "자유 연주", progress: null, lives: null, big: "마음껏 쳐 보세요" });
    TDG.ui.showModeActions({ replay: true, replayLabel: "🔁 방금 연주 듣기", end: true, endLabel: "끝내기" });
    api.announce("자유 연주를 시작해요. 원하는 텅을 쳐 보세요.");
  }

  function freeStrike(ev) {
    if (!ev.tongue) return;
    playTongue(ev.tongue, 0.9); TDG.effects.rippleTongue(ev.tongue.id);
    api.flashLabel(ev.tongue.id, labelFor(ev.tongue), 700);
    modeState.history.push({ note: ev.tongue.note, at: currentGameTime });
    if (modeState.history.length > 32) modeState.history.shift();
  }

  function preparePlayback(events, { beatTimes = false } = {}) {
    if (!events.length || !TDG.audio.ctx) return false;
    TDG.audio.stopAll();
    const baseT = currentGameTime + 100;
    const baseAudio = TDG.audio.ctx.currentTime + 0.1;
    const first = beatTimes ? 0 : events[0].at;
    const items = events.map((e) => {
      const offset = beatTimes ? e.offset : e.at - first;
      const t = TDG.tongues.byNote[e.note];
      playTongue(t, 0.8, baseAudio + offset / 1000);
      return { tongueId: t.id, showAt: baseT + offset, hideAt: baseT + offset + 420, shown: false, hidden: false };
    });
    modeState.playback = { items, endsAt: Math.max(...items.map((x) => x.hideAt)) + 50 };
    return true;
  }

  function playbackFrame(t) {
    const pb = modeState.playback;
    if (!pb) return;
    pb.items.forEach((item) => {
      if (!item.shown && t >= item.showAt) {
        item.shown = true;
        api.showMole(item.tongueId, { label: visibleLabelFor(TDG.tongues.byId[item.tongueId]) });
      }
      if (!item.hidden && t >= item.hideAt) { item.hidden = true; api.hideMole(item.tongueId); }
    });
    if (t >= pb.endsAt) { modeState.playback = null; TDG.ui.setReplayPlaying(false); }
  }

  function freeReplay() {
    if (modeState.playback) { api.stopScheduled(); api.hideAllMoles(); TDG.ui.setReplayPlaying(false); return; }
    if (preparePlayback(modeState.history)) TDG.ui.setReplayPlaying(true);
    else TDG.ui.toast("먼저 텅을 몇 번 쳐 보세요");
  }

  function stopReplayOnPause() {
    modeState.playback = null;
    api.hideAllMoles();
    TDG.ui.setReplayPlaying(false);
  }

  function pickDifferent(pool, previous) {
    if (pool.length <= 1) return pool[0];
    let out = pool[Math.floor(rng() * pool.length)];
    for (let i = 0; i < 20 && out?.id === previous?.id; i += 1) out = pool[Math.floor(rng() * pool.length)];
    return out;
  }

  function findAsk() {
    const s = modeState;
    const base = s.sub === "hear" && s.index < 4
      ? s.pool.filter((t) => ["C4", "D4", "E4", "F4", "G4"].includes(t.note))
      : s.pool;
    s.target = pickDifferent(base.length ? base : s.pool, s.target);
    s.attempts = 0; s.waitUntil = 0;
    TDG.effects.clearGlows();
    const shown = s.sub === "see" ? (settings().label === "off" ? TDG.ui.labelHTML(s.target.note, "ko") : labelFor(s.target)) : "";
    api.setHud({ title: s.sub === "hear" ? "듣고 찾기" : "보고 찾기", progress: [s.index + 1, 10], big: shown });
    playTongue(s.target, 0.75);
    api.announce(s.sub === "hear" ? `${s.index + 1}번 문제. 소리를 듣고 찾아요.` : `${s.index + 1}번 문제. ${TDG.tongues.noteLabel(s.target.note, "ko")}을 찾아요.`);
  }

  function findStart(_api, opts) {
    modeState = { sub: opts.sub || "see", pool: allowedTongues(), index: 0, firstTry: 0, answers: [], target: null, waitUntil: 0 };
    findAsk();
    TDG.ui.showModeActions({ prompt: modeState.sub === "hear", end: false, replay: false });
  }

  function findFrame(t) {
    if (modeState.waitUntil && t >= modeState.waitUntil) {
      api.hideMole(modeState.target.id); modeState.index += 1;
      if (modeState.index >= 10) end(); else findAsk();
    }
  }

  function findStrike(ev) {
    const s = modeState;
    if (!ev.tongue || s.waitUntil) return;
    const answer = ev.tongue.note;
    s.answers.push({ target: s.target.note, answer });
    if (answer === s.target.note) {
      if (s.attempts === 0) s.firstTry += 1;
      ev.hit = true; ev.moleTongue = s.target;
      playTongue(s.target, 1); api.showMole(s.target.id, { label: labelFor(s.target) }); api.celebrate(s.target.id);
      s.waitUntil = currentGameTime + 700;
      api.setHud({ big: "맞았어요!" });
    } else {
      s.attempts += 1; playTongue(ev.tongue, 0.8); TDG.effects.rippleTongue(ev.tongue.id);
      api.setHud({ big: "다시 해 봐요" });
      if (s.attempts >= 2) api.glowTongue(s.target.id, 2);
    }
  }

  function findReplayPrompt() { if (modeState.target) playTongue(modeState.target, 0.75); }

  function mostConfused(answers) {
    const count = new Map();
    answers.filter((a) => a.target !== a.answer).forEach((a) => {
      const k = `${a.target}|${a.answer}`; count.set(k, (count.get(k) || 0) + 1);
    });
    if (!count.size) return "없음 👍";
    const key = [...count].sort((a, b) => b[1] - a[1])[0][0];
    const [a, b] = key.split("|");
    const describe = (note) => `${TDG.tongues.noteLabel(note, "ko")}(${TDG.tongues.noteLabel(note, "num")})`;
    return `${describe(a)} ↔ ${describe(b)}`;
  }

  function findResult() {
    const stars = TDG.rules.starsFor(modeState.firstTry * 10);
    const messages = ["천천히 다시 해 봐요.", "조금씩 익숙해지고 있어요!", "잘 찾았어요!", "음 박사! 🎓"];
    return { title: "음 찾기 끝!", stars, score: modeState.firstTry, lines: [["한 번에 맞힘", `${modeState.firstTry} / 10`], ["가장 헷갈린 음", mostConfused(modeState.answers)]], message: messages[stars], recordKey: `find.${modeState.sub}`, stats: { firstTry: modeState.firstTry }, completed: true };
  }

  function melodyShowCurrent() {
    const s = modeState;
    TDG.effects.clearGlows();
    if (s.index >= s.notes.length) return;
    const current = TDG.tongues.byNote[s.notes[s.index].note];
    const next = s.notes[s.index + 1] ? TDG.tongues.byNote[s.notes[s.index + 1].note] : null;
    api.showMole(current.id, { label: settings().label === "off" ? "" : labelFor(current) });
    if (settings().previewNext && next && next.id !== current.id) api.glowTongue(next.id, 1);
    const queue = s.notes.slice(s.index, s.index + 4).map((n) => TDG.tongues.noteLabel(n.note, settings().label || "ko")).join(" · ");
    api.setHud({ title: s.song.title, progress: [s.index + 1, s.notes.length], big: queue });
    if (settings().label !== "off") api.announce(`다음 음은 ${TDG.tongues.noteLabel(current.note, "ko")}.`);
  }

  function melodyStart(_api, opts) {
    const song = TDG.songs.SONGS.find((x) => x.id === opts.songId) || TDG.songs.SONGS[0];
    const parsed = TDG.songs.parseSong(song.notes);
    modeState = { song, notes: parsed.events.filter((e) => e.note), index: 0, wrong: 0, startedAt: 0, completed: false, elapsed: 0, nextAt: 0, playback: null };
    melodyShowCurrent();
    TDG.ui.showModeActions({ replay: false, end: false, prompt: false });
  }

  function melodyFrame(t) {
    playbackFrame(t);
    const s = modeState;
    if (s.nextAt && t >= s.nextAt) { s.nextAt = 0; melodyShowCurrent(); }
  }

  function melodyStrike(ev) {
    const s = modeState;
    if (!ev.tongue || s.completed || s.nextAt || s.playback) return;
    const target = TDG.tongues.byNote[s.notes[s.index].note];
    if (ev.tongue.id === target.id) {
      ev.hit = true; ev.moleTongue = target; playTongue(target, 1); api.celebrate(target.id); api.hideMole(target.id);
      s.index += 1;
      if (s.index >= s.notes.length) {
        s.completed = true; s.elapsed = currentGameTime; TDG.effects.clearGlows();
        api.setHud({ title: s.song.title, progress: [s.notes.length, s.notes.length], big: "🎉 완주!" });
        TDG.ui.showModeActions({ replay: true, replayLabel: "다시 들어보기", end: true, endLabel: "결과 보기" });
        api.announce("멜로디를 끝까지 연주했어요!");
      } else { s.nextAt = currentGameTime + 120; }
    } else {
      s.wrong += 1; playTongue(ev.tongue, 0.75); TDG.effects.rippleTongue(ev.tongue.id);
      api.setHud({ big: "기다리던 두더지가 여기예요!" });
      api.glowTongue(target.id, 2); TDG.effects.playMoleHitReaction(target.id);
    }
  }

  function melodyReplay() {
    const s = modeState;
    if (!s.completed) return;
    if (s.playback) { api.stopScheduled(); api.hideAllMoles(); TDG.ui.setReplayPlaying(false); return; }
    let beats = 0;
    const events = s.notes.map((ev) => { const out = { note: ev.note, offset: beats * 60000 / s.song.bpm }; beats += ev.beats; return out; });
    if (preparePlayback(events, { beatTimes: true })) TDG.ui.setReplayPlaying(true);
  }

  function melodyResult() {
    const s = modeState;
    const accuracy = Math.round((s.notes.length / (s.notes.length + s.wrong || 1)) * 100);
    const stars = TDG.rules.starsFor(accuracy);
    return { title: "멜로디 완주!", stars, score: accuracy, bestTimeMs: s.elapsed, completed: s.completed, lines: [["정확도", `${accuracy}%`], ["걸린 시간", `${(s.elapsed / 1000).toFixed(1)}초`], ["틀린 텅", `${s.wrong}번`]], message: stars === 3 ? "멋진 연주였어요!" : "노래가 점점 익숙해지고 있어요!", recordKey: `melody.${s.song.id}`, stats: { accuracy, wrong: s.wrong } };
  }

  function echoPool(length) {
    const ranges = length <= 3 ? ["C4", "D4", "E4", "F4", "G4"] : length <= 5 ? ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] : Object.keys(TDG.NOTE);
    const allowed = new Set(allowedTongues().map((t) => t.note));
    let pool = ranges.filter((n) => allowed.has(n));
    if (!pool.length) pool = [...allowed];
    return pool;
  }

  function echoSequence(length) {
    const pool = echoPool(length); const out = [];
    for (let i = 0; i < length; i += 1) {
      let note = pool[Math.floor(rng() * pool.length)];
      for (let n = 0; n < 20 && pool.length >= 2 && i >= 2 && note === out[i - 1] && note === out[i - 2]; n += 1) note = pool[Math.floor(rng() * pool.length)];
      out.push(note);
    }
    return out;
  }

  function echoRound(t, reuse = false) {
    const s = modeState;
    if (!reuse) s.sequence = echoSequence(s.length);
    s.inputIndex = 0; s.listening = true; s.nextRoundAt = 0; s.playback = { items: [], endsAt: t + 100 + s.sequence.length * 600 };
    const baseAudio = TDG.audio.ctx ? TDG.audio.ctx.currentTime + 0.1 : 0;
    s.sequence.forEach((note, i) => {
      const tongue = TDG.tongues.byNote[note];
      if (TDG.audio.ctx) playTongue(tongue, 0.78, baseAudio + i * 0.6);
      s.playback.items.push({ tongueId: tongue.id, showAt: t + 100 + i * 600, hideAt: t + 520 + i * 600, shown: false, hidden: false });
    });
    s.listeningEnd = t + 150 + s.sequence.length * 600;
    api.setHud({ title: "따라 치기", progress: [s.inputIndex, s.length], lives: s.lives, big: "잘 들어요 👂" });
    api.announce("가락을 들려줄게요.");
  }

  function echoStart() {
    modeState = { lives: 3, length: 2, best: 2, sequence: [], inputIndex: 0, listening: true, listeningEnd: 0, nextRoundAt: 0, endAt: 0, reuse: false, playback: null };
    echoRound(0, false); TDG.ui.showModeActions({ replay: false, end: false, prompt: false });
  }

  function echoFrame(t) {
    const s = modeState;
    if (s.endAt && t >= s.endAt) { s.endAt = 0; end(); return; }
    playbackFrame(t);
    if (s.listening && t >= s.listeningEnd) {
      s.listening = false; s.playback = null;
      api.hideAllMoles(); api.setHud({ title: "따라 치기", progress: [0, s.length], lives: s.lives, big: "이제 따라 쳐요! 🔨" });
      api.announce("따라 쳐요.");
    }
    if (s.nextRoundAt && t >= s.nextRoundAt) echoRound(t, s.reuse);
  }

  function echoStrike(ev) {
    const s = modeState;
    if (s.listening || s.nextRoundAt || !ev.tongue) return;
    const expected = s.sequence[s.inputIndex];
    playTongue(ev.tongue, 0.9);
    api.showMole(ev.tongue.id, { label: visibleLabelFor(ev.tongue) });
    later(() => api.hideMole(ev.tongue.id), 420);
    if (ev.tongue.note === expected) {
      ev.hit = true; ev.moleTongue = ev.tongue; api.celebrate(ev.tongue.id); s.inputIndex += 1;
      api.setHud({ progress: [s.inputIndex, s.length], lives: s.lives, big: "좋아요!" });
      if (s.inputIndex >= s.length) {
        s.best = Math.max(s.best, s.length);
        if (s.length >= 8) { s.endAt = currentGameTime + 700; return; }
        s.length += 1; s.reuse = false; s.nextRoundAt = currentGameTime + 800;
      }
    } else {
      s.lives -= 1; s.reuse = true; api.setHud({ lives: s.lives, big: "앗! 다시 들어 봐요" });
      if (s.lives <= 0) s.endAt = currentGameTime + 500;
      else s.nextRoundAt = currentGameTime + 1000;
    }
  }

  function echoPause() { stopReplayOnPause(); }
  function echoResume() { if (modeState.lives > 0 && !modeState.endAt) echoRound(currentGameTime, true); }
  function echoResult() {
    const best = modeState.best;
    const stars = best >= 8 ? 3 : best >= 6 ? 2 : best >= 4 ? 1 : 0;
    return { title: "따라 치기 끝!", stars, score: best, lines: [["최고 길이", `${best}개 음`], ["남은 목숨", `${Math.max(0, modeState.lives)}개`]], message: stars === 3 ? "귀가 정말 밝아요!" : "한 음씩 천천히 기억해 봐요.", recordKey: "echo", stats: { best }, completed: true };
  }

  const MODES = {
    classic: { id: "classic", title: "두더지잡기", icon: "🔨", usesTimer: true, start: classicStart, frame: classicFrame, strike: classicStrike, result: classicResult },
    find: { id: "find", title: "음 찾기", icon: "🎯", usesTimer: false, start: findStart, frame: findFrame, strike: findStrike, replayPrompt: findReplayPrompt, result: findResult },
    melody: { id: "melody", title: "멜로디 두더지", icon: "🎵", usesTimer: false, start: melodyStart, frame: melodyFrame, strike: melodyStrike, replay: melodyReplay, pause: stopReplayOnPause, result: melodyResult },
    echo: { id: "echo", title: "따라 치기", icon: "👂", usesTimer: false, start: echoStart, frame: echoFrame, strike: echoStrike, pause: echoPause, resume: echoResume, result: echoResult },
    free: { id: "free", title: "자유 연주", icon: "🎹", usesTimer: false, start: freeStart, frame: playbackFrame, strike: freeStrike, replay: freeReplay, pause: stopReplayOnPause, result: () => null },
  };

  function replayPrompt() { currentMode?.replayPrompt?.(api); }
  function replayCurrent() { currentMode?.replay?.(api); }
  function endCurrent() { if (modeId === "free") goHome(); else if (modeId === "melody" && !modeState.completed) goHome(); else end(); }

  function forceMole(tongueId, { golden = false } = {}) {
    if (modeId !== "classic" || !modeState.spawner) return null;
    const gt = currentGameTime;
    const m = { seq: 100000 + modeState.spawner.moles.length, tongueId, spawnAt: gt, leaveAt: gt + 5000, goneAt: gt + 5180, golden, hitAt: null, left: false, gone: false };
    modeState.spawner.moles.push(m); TDG.effects.showMole(tongueId, { golden }); return m;
  }

  function skipCountdown() {
    if (state !== GameStatus.COUNTDOWN) return;
    clock.startedAt = performance.now() - GAME.countdownMs;
    state = GameStatus.RUNNING; currentGameTime = 0; TDG.ui.hideCountdown();
    lastTimerSec = Math.ceil(durationMs / 1000);
    TDG.ui.setTimer(lastTimerSec, { warn: false });
    currentMode?.onRunning?.(api); stopFrame(); rafId = requestAnimationFrame(frame);
    api.announce(`게임 시작! ${options.time}초 동안 두더지를 잡아요.`);
  }

  function stepTo(t) {
    if (state !== GameStatus.RUNNING) return currentGameTime;
    currentGameTime = Math.max(0, Number(t) || 0);
    currentMode?.frame?.(currentGameTime, api);
    return currentGameTime;
  }

  TDG.MODES = MODES;
  TDG.game = {
    start, restart, end, goHome, pause, resume, togglePause, strike, on, later,
    replayPrompt, replayCurrent, endCurrent,
    get status() { return state; },
    get score() { return modeState.stats?.score || 0; },
    get mode() { return modeId; },
    get stats() { return modeState.stats || modeState; },
    get lastResult() { return lastResult; },
    _debug: {
      get activeMole() { return modeState.spawner?.moles.find((m) => m.hitAt === null && currentGameTime >= m.spawnAt && currentGameTime < m.leaveAt) || null; },
      get clock() { return { ...clock, t: clock.t(performance.now()), gameTime: currentGameTime }; },
      get durationMs() { return durationMs; },
      get modeState() { return modeState; },
      forceMole, pendingCount: () => pending.size, reset: () => resetRuntime(true),
      setSeed(n) { seedOverride = n == null ? null : Number(n) || 0; }, skipCountdown, stepTo,
    },
  };
})();
