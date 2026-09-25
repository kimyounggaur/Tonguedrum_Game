/* js/ui.js — 화면, 설정, 결과, 대화 상자, 교사 프리셋과 공유. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const $ = (id) => document.getElementById(id);
  const validModes = ["classic", "find", "melody", "echo", "free"];
  let activeDialog = null;
  let dialogOpener = null;
  let replayPlaying = false;
  let cardBlob = null;

  function showScreen(name) {
    $("start-screen").hidden = name !== "start";
    $("game-screen").hidden = name !== "game";
    $("end-screen").hidden = name !== "end";
    document.body.dataset.screen = name;
  }

  function buildSlots() {
    const container = $("mole-container");
    if (!container) return;
    container.innerHTML = "";
    TDG.TONGUES.forEach((t) => {
      const wrap = document.createElement("div");
      wrap.className = "mole-slot";
      wrap.style.left = `${t.x}%`; wrap.style.top = `${t.y}%`;
      wrap.dataset.tongueId = t.id; wrap.dataset.note = t.note;
      const mole = document.createElement("img");
      mole.className = "mole"; mole.src = "assets/mole.png"; mole.alt = ""; mole.draggable = false;
      wrap.appendChild(mole); container.appendChild(wrap);
    });
  }

  function setScore(n, { pulse = false } = {}) {
    $("score-value").textContent = String(n);
    const card = $("score");
    if (pulse && card) { card.classList.remove("pulsing"); void card.offsetWidth; card.classList.add("pulsing"); }
  }

  function setTimer(n, { warn = false } = {}) {
    $("timer-value").textContent = String(n);
    $("timer")?.classList.toggle("warn", !!warn);
  }

  function setCombo(n) {
    const el = $("combo-badge"); if (!el) return;
    el.hidden = n < 3; el.textContent = n >= 3 ? `콤보 ${n}` : "";
    if (n >= 3) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  }

  function setHud({ title, progress, lives, big } = {}) {
    if (title != null) $("hud-mode-title").textContent = title;
    if (progress !== undefined) {
      const el = $("hud-progress");
      el.textContent = progress ? `${progress[0]} / ${progress[1]}` : ""; el.hidden = !progress;
    }
    if (lives !== undefined) {
      const el = $("hud-lives"); el.textContent = lives == null ? "" : `♥`.repeat(Math.max(0, lives)); el.hidden = lives == null;
    }
    if (big != null) { $("hud-big").innerHTML = big; $("hud-big").hidden = !big; }
  }

  function resetGameUI({ mode, durationMs }) {
    setScore(0); setTimer(Math.ceil(durationMs / 1000)); setCombo(0);
    setHud({ title: mode.title, progress: null, lives: null, big: "" });
    $("timer").hidden = !mode.usesTimer; $("score").hidden = mode.id !== "classic";
    $("countdown").hidden = true;
    showModeActions({ replay: false, prompt: false, end: mode.id === "free", endLabel: "끝내기" });
    document.querySelectorAll(".score-pop,.note-bubble.floating").forEach((el) => el.remove());
  }

  function setCountdown(text) {
    const el = $("countdown"); if (!el) return;
    el.hidden = false; el.textContent = text;
    el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
  }
  function hideCountdown() { if ($("countdown")) $("countdown").hidden = true; }

  function showModeActions({ replay = false, replayLabel = "🔁 다시 듣기", prompt = false, end = false, endLabel = "끝내기" } = {}) {
    const replayBtn = $("replay-btn"), promptBtn = $("prompt-replay-btn"), endBtn = $("end-mode-btn");
    if (replayBtn) { replayBtn.hidden = !replay; replayBtn.textContent = replayLabel; replayBtn.dataset.label = replayLabel; }
    if (promptBtn) promptBtn.hidden = !prompt;
    if (endBtn) { endBtn.hidden = !end; endBtn.textContent = endLabel; }
    replayPlaying = false;
  }

  function setReplayPlaying(value) {
    replayPlaying = !!value;
    const btn = $("replay-btn"); if (!btn || btn.hidden) return;
    btn.textContent = replayPlaying ? "■ 멈춤" : (btn.dataset.label || "🔁 다시 듣기");
    btn.setAttribute("aria-pressed", String(replayPlaying));
  }

  function labelHTML(noteId, style = "ko") {
    const value = TDG.tongues.noteLabel(noteId, style);
    if (!value || style === "off") return "";
    if (style !== "num") return value;
    const low = value.startsWith("."); const high = value.endsWith("'");
    const digit = value.replace(/[.']/g, "");
    return `<span class="nl">${digit}${low ? '<i class="oct low"></i>' : ""}${high ? '<i class="oct high"></i>' : ""}</span>`;
  }

  function announce(text) {
    const el = $("sr-status"); if (!el || !text) return;
    el.textContent = "";
    requestAnimationFrame(() => { el.textContent = text; });
  }

  function dialogScreens(inert) {
    document.querySelectorAll(".screen").forEach((el) => {
      if (inert) { el.setAttribute("inert", ""); el.setAttribute("aria-hidden", "true"); }
      else { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); }
    });
  }

  function focusables(root) {
    return [...root.querySelectorAll('button:not([disabled]),summary,[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.hidden && !el.closest("[hidden]") && el.getClientRects().length > 0);
  }

  function openDialog(id, opener) {
    const dialog = $(id); if (!dialog) return;
    if (activeDialog && activeDialog !== dialog) closeDialog(activeDialog.id, false);
    activeDialog = dialog; dialogOpener = opener || document.activeElement;
    dialog.hidden = false; dialogScreens(true);
    requestAnimationFrame(() => focusables(dialog)[0]?.focus({ preventScroll: true }));
  }

  function closeDialog(id, restore = true) {
    const dialog = typeof id === "string" ? $(id) : id;
    if (!dialog || dialog.hidden) return false;
    dialog.hidden = true; dialogScreens(false);
    if (activeDialog === dialog) activeDialog = null;
    const target = dialogOpener; dialogOpener = null;
    if (restore) target?.focus?.({ preventScroll: true });
    return true;
  }

  function closeTopDialog() {
    if (!activeDialog) return false;
    if (activeDialog.id === "pause-overlay") { TDG.game.resume(); return true; }
    return closeDialog(activeDialog.id, true);
  }

  function trapDialogTab(e) {
    if (!activeDialog || e.key !== "Tab") return false;
    const list = focusables(activeDialog); if (!list.length) return false;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return true;
  }

  function moveSoundSettings(targetId) {
    const fieldset = $("sound-settings"), host = $(targetId);
    if (fieldset && host && fieldset.parentElement !== host) host.appendChild(fieldset);
  }

  function showPause(open) {
    if (open) { moveSoundSettings("pause-sound-host"); openDialog("pause-overlay", $("pause-btn")); }
    else { closeDialog("pause-overlay", false); moveSoundSettings("settings-sound-host"); }
  }

  function parsePreset(searchString) {
    const p = new URLSearchParams(String(searchString || "").replace(/^\?/, ""));
    const out = {};
    if (validModes.includes(p.get("mode"))) out.mode = p.get("mode");
    if (["easy", "normal", "hard"].includes(p.get("level"))) { out.level = p.get("level"); out.difficulty = p.get("level"); }
    if ([20, 30, 45, 60].includes(Number(p.get("time")))) out.time = Number(p.get("time"));
    if (["num", "ko", "abc", "off"].includes(p.get("label"))) out.label = p.get("label");
    if (["see", "hear"].includes(p.get("sub"))) out.sub = p.get("sub");
    if (TDG.songs.SONGS.some((s) => s.id === p.get("song"))) { out.song = p.get("song"); out.songId = p.get("song"); }
    const rawTongues = p.get("tongues");
    if (rawTongues === "all") out.tongues = null;
    else if (rawTongues === "mid") out.tongues = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
    else if (rawTongues === "five") out.tongues = ["C4", "D4", "E4", "F4", "G4"];
    else if (rawTongues) {
      const notes = rawTongues.split(",").filter((n) => TDG.NOTE[n]);
      if (notes.length && notes.length === rawTongues.split(",").length) out.tongues = [...new Set(notes)];
    }
    return out;
  }

  function effectiveSettings() {
    const merged = { ...(TDG.settings || {}), ...(TDG.preset || {}) };
    if (TDG.preset?.difficulty) merged.levelLock = TDG.preset.difficulty;
    return merged;
  }

  function saveSettings(patch) {
    Object.assign(TDG.settings, patch);
    TDG.storage.saveSettings(TDG.settings);
    refreshStart(); syncSettingsForm();
  }

  function modeInput() { return document.querySelector('#mode-group input[name="mode"]:checked'); }
  function getStartOptions() {
    const s = effectiveSettings();
    const mode = modeInput()?.value || s.mode || "classic";
    return {
      mode,
      difficulty: document.querySelector('#difficulty-options input[name="level"]:checked')?.value || s.difficulty,
      sub: document.querySelector('#find-options input[name="find-sub"]:checked')?.value || s.sub || "see",
      songId: $("song-select")?.value || s.songId,
      time: s.time,
    };
  }

  function toggleMute(force) {
    const muted = typeof force === "boolean" ? force : !TDG.settings.muted;
    saveSettings({ muted }); TDG.audio.setMuted(muted); updateMuteButton();
  }

  function updateMuteButton() {
    const btn = $("mute-btn"); if (!btn) return;
    const muted = !!TDG.settings.muted;
    btn.textContent = muted ? "🔇" : "🔊";
    btn.setAttribute("aria-pressed", String(muted)); btn.setAttribute("aria-label", muted ? "소리 켜기" : "소리 끄기");
  }

  function toggleKeyHints(force) {
    const value = typeof force === "boolean" ? force : !TDG.settings.keyHints;
    saveSettings({ keyHints: value }); TDG.effects.renderKeyHints(value);
  }

  function populateSongs() {
    const select = $("song-select"); if (!select) return;
    select.innerHTML = "";
    TDG.songs.SONGS.forEach((song) => {
      const parsed = TDG.songs.parseSong(song.notes);
      const notes = parsed.events.filter((e) => e.note).length;
      const beats = parsed.events.reduce((a, e) => a + e.beats, 0);
      const option = document.createElement("option");
      option.value = song.id; option.textContent = `${song.title} · ${"●".repeat(song.level)}${"○".repeat(3 - song.level)} · ${notes}음 · 약 ${Math.round(beats * 60 / song.bpm)}초`;
      select.appendChild(option);
    });
  }

  function updateModeOptions() {
    const mode = modeInput()?.value || effectiveSettings().mode || "classic";
    $("difficulty-options").hidden = mode !== "classic" || !!effectiveSettings().levelLock;
    $("find-options").hidden = mode !== "find";
    $("song-options").hidden = mode !== "melody";
    $("echo-assistive").hidden = mode !== "echo";
    $("free-assistive").hidden = mode !== "free";
    updateStartMeta();
  }

  function syncSettingsForm() {
    const s = TDG.settings;
    if ($("volume")) $("volume").value = String(Math.round((s.volume ?? 0.7) * 100));
    document.querySelectorAll('input[name="ticks"]').forEach((el) => { el.checked = el.value === s.ticks; });
    if ($("label-style")) { $("label-style").value = s.label; $("label-style").disabled = !!s.labelLock; }
    if ($("key-hints")) $("key-hints").checked = !!s.keyHints;
    if ($("preview-next")) $("preview-next").checked = s.previewNext !== false;
    if ($("vibrate")) $("vibrate").checked = !!s.vibrate;
    if ($("teacher-time")) $("teacher-time").value = String(s.time);
    if ($("teacher-level")) $("teacher-level").value = s.levelLock || "";
    if ($("teacher-tongues")) {
      const value = !s.tongues ? "all" : s.tongues.join(",") === "C4,D4,E4,F4,G4" ? "five" : s.tongues.join(",") === "C4,D4,E4,F4,G4,A4,B4" ? "mid" : "custom";
      $("teacher-tongues").value = value;
      document.querySelector(".tongue-picker-wrap")?.toggleAttribute("hidden", value !== "custom");
    }
    if ($("label-lock")) $("label-lock").checked = !!s.labelLock;
    if ($("board-enabled")) $("board-enabled").checked = !!s.boardEnabled;
    document.querySelectorAll('#teacher-modes input[type="checkbox"]').forEach((el) => { el.checked = s.modesVisible.includes(el.value); });
    updateMuteButton();
  }

  function refreshStart() {
    const s = effectiveSettings();
    const configured = Array.isArray(s.modesVisible) ? s.modesVisible.filter((mode) => validModes.includes(mode)) : validModes;
    const visibleModes = configured.length ? [...configured] : ["classic"];
    if (TDG.preset?.mode && !visibleModes.includes(TDG.preset.mode)) visibleModes.push(TDG.preset.mode);
    const selectedMode = visibleModes.includes(s.mode) ? s.mode : visibleModes[0];
    document.querySelectorAll('#mode-group input[name="mode"]').forEach((input) => {
      const card = input.closest("label"); const visible = visibleModes.includes(input.value);
      if (card) card.hidden = !visible;
      input.checked = input.value === selectedMode;
    });
    document.querySelectorAll('#difficulty-options input[name="level"]').forEach((input) => { input.checked = input.value === (s.levelLock || s.difficulty); });
    document.querySelectorAll('#find-options input[name="find-sub"]').forEach((input) => { input.checked = input.value === (s.sub || "see"); });
    if ($("song-select")) $("song-select").value = s.songId || "twinkle";
    updateModeOptions();
    const hasPreset = Object.keys(TDG.preset || {}).length > 0;
    $("preset-badge").hidden = !hasPreset;
    if (hasPreset) {
      const parts = [s.time ? `${s.time}초` : "", s.difficulty ? TDG.config.DIFFICULTY[s.difficulty]?.label : "", Array.isArray(s.tongues) ? `${s.tongues.length}개 텅` : "15개 텅"].filter(Boolean);
      $("preset-summary").textContent = `👩‍🏫 선생님 설정 적용 중 (${parts.join(" · ")})`;
    }
  }

  function initSettings() {
    TDG.settings = TDG.storage.loadSettings();
    TDG.preset = parsePreset(location.search);
    TDG.effectiveSettings = effectiveSettings;
    populateSongs(); syncSettingsForm(); refreshStart();
    TDG.audio.setVolume(TDG.settings.volume); TDG.audio.setMuted(TDG.settings.muted);
  }

  function applyStudentSettings() {
    const ticks = document.querySelector('input[name="ticks"]:checked')?.value || "all";
    saveSettings({
      volume: Number($("volume")?.value || 70) / 100,
      ticks, label: $("label-style")?.value || "ko",
      keyHints: !!$("key-hints")?.checked, previewNext: !!$("preview-next")?.checked,
      vibrate: !!$("vibrate")?.checked,
    });
    TDG.audio.setVolume(TDG.settings.volume); TDG.effects.renderKeyHints(TDG.settings.keyHints);
  }

  function selectedTeacherTongues() {
    const picked = [...document.querySelectorAll('#teacher-tongue-picker [aria-pressed="true"]')].map((el) => el.dataset.note).filter(Boolean);
    return picked.length === TDG.TONGUES.length ? null : (picked.length ? picked : null);
  }

  function applyTeacherSettings() {
    const visible = [...document.querySelectorAll('#teacher-modes input[type="checkbox"]:checked')].map((el) => el.value);
    saveSettings({
      time: Number($("teacher-time")?.value || 30), levelLock: $("teacher-level")?.value || null,
      tongues: selectedTeacherTongues(), modesVisible: visible.length ? visible : ["classic"],
      labelLock: !!$("label-lock")?.checked, boardEnabled: !!$("board-enabled")?.checked,
    });
  }

  function renderTeacherTongues() {
    const svg = $("teacher-tongue-picker"); if (!svg) return;
    svg.innerHTML = ""; const selected = new Set(TDG.settings.tongues || TDG.TONGUES.map((t) => t.note));
    TDG.TONGUES.forEach((t) => {
      const line = TDG.effects.tongueCapsule(t, "teacher-tongue");
      line.dataset.note = t.note; line.setAttribute("role", "button"); line.setAttribute("tabindex", "0");
      line.setAttribute("aria-label", TDG.tongues.noteLabel(t.note, "ko")); line.setAttribute("aria-pressed", String(selected.has(t.note)));
      svg.appendChild(line);
    });
  }

  function showSettings(opener) {
    moveSoundSettings("settings-sound-host"); syncSettingsForm(); renderTeacherTongues(); openDialog("settings-modal", opener || $("settings-btn"));
  }

  function showTeacherTab(show = true) {
    const panel = $("teacher-settings"); if (!panel) return;
    if (show && $("teacher-settings-tab")) $("teacher-settings-tab").hidden = false;
    panel.hidden = !show; $("student-settings").hidden = show;
    document.querySelectorAll("[data-settings-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.settingsTab === (show ? "teacher" : "student"))));
  }

  function resultLines(result) {
    const lines = [...(result.lines || [])];
    if (result.record) lines.push(["최고 기록", formatRecordScore(result.mode, result.record.best)]);
    return lines;
  }

  function showResult(result) {
    $("result-title").textContent = result.title || "게임 끝!";
    const stars = $("stars"); stars.textContent = "";
    for (let i = 0; i < 3; i += 1) {
      const star = document.createElement("span"); star.className = "result-star";
      star.style.setProperty("--star-index", i); star.textContent = i < result.stars ? "★" : "☆";
      stars.appendChild(star);
    }
    stars.setAttribute("aria-label", `별 ${result.stars}개`);
    $("final-score").textContent = String(result.score ?? 0);
    const scoreText = result.mode === "melody" ? ["정확도", "%"]
      : result.mode === "find" ? ["한 번에 맞힘", "개"]
        : result.mode === "echo" ? ["최고 길이", "개 음"] : ["점수", "점"];
    $("final-score-label").textContent = scoreText[0];
    $("final-score-unit").textContent = scoreText[1];
    $("record-badge").hidden = !result.isRecord;
    $("end-message").textContent = result.message || "잘했어요!";
    const dl = $("end-stats"); dl.innerHTML = "";
    resultLines(result).forEach(([name, value]) => {
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = name; dd.textContent = value; dl.append(dt, dd);
    });
    $("board-name-form").hidden = !shouldOfferBoard(result);
    document.querySelectorAll('[data-action="open-board"]').forEach((el) => { el.hidden = !effectiveSettings().boardEnabled; });
    if ($("board-name")) $("board-name").value = "";
    $("share-btn").hidden = false; $("card-btn").hidden = false;
  }

  function sanitizeName(value) {
    const clean = String(value || "").trim().replace(/[^가-힣a-zA-Z0-9 ]/g, "").slice(0, 8);
    return clean || "익명";
  }

  function shouldOfferBoard(result) {
    if (!effectiveSettings().boardEnabled || !result?.recordKey || result.mode === "free") return false;
    return TDG.storage.qualifiesForBoard(result.recordKey, result.score);
  }

  function saveBoardEntry(name) {
    const result = TDG.game.lastResult; if (!result?.recordKey) return;
    const added = TDG.storage.addBoardEntry(result.recordKey, { name, score: result.score, stars: result.stars });
    if (added.accepted) result.boardName = added.entry.name;
    $("board-name-form").hidden = true;
    showBoard(result.recordKey, added.rank, document.querySelector('#end-screen [data-action="open-board"]') || $("restart-btn"));
  }

  function recordKeyFor(options) {
    if (options.mode === "find") return `find.${options.sub || "see"}`;
    if (options.mode === "melody") return `melody.${options.songId || "twinkle"}`;
    if (options.mode === "echo") return "echo";
    if (options.mode === "classic") return `classic.${options.difficulty || "normal"}.${options.time || 30}`;
    return null;
  }

  function formatRecordScore(mode, score) {
    if (mode === "find") return `${score} / 10`;
    if (mode === "melody") return `${score}%`;
    if (mode === "echo") return `${score}개 음`;
    return `${score}점`;
  }

  function updateStartMeta() {
    const options = getStartOptions();
    const recordKey = recordKeyFor(options);
    const record = recordKey ? TDG.storage.get(TDG.config.STORAGE_KEYS.records, {})[recordKey] : null;
    if ($("start-best")) {
      $("start-best").textContent = !recordKey
        ? "기록 걱정 없이 자유롭게 연주해요!"
        : record
          ? `최고 기록 · ${"★".repeat(record.bestStars)}${"☆".repeat(3 - record.bestStars)} ${formatRecordScore(options.mode, record.best)}`
          : "첫 기록에 도전해요!";
    }
    if ($("board-btn")) $("board-btn").hidden = !effectiveSettings().boardEnabled || !recordKey;
  }

  function showBoard(key, highlightRank, opener) {
    const result = TDG.game.lastResult;
    const onResult = document.body.dataset.screen === "end";
    const recordKey = key || (onResult ? result?.recordKey : null) || recordKeyFor(getStartOptions());
    if (!recordKey) { toast("자유 연주에는 순위표가 없어요"); return; }
    const rows = TDG.storage.getBoard(recordKey); const list = $("board-list"); list.innerHTML = "";
    if (!rows.length) { const p = document.createElement("p"); p.textContent = "아직 기록이 없어요."; list.appendChild(p); }
    rows.forEach((row, i) => {
      const item = document.createElement("li"); item.className = "board-row"; if (highlightRank === i + 1) item.classList.add("mine");
      const rank = document.createElement("b"), name = document.createElement("span"), score = document.createElement("span");
      rank.textContent = `${i + 1}`; name.textContent = row.name; score.textContent = `${row.score} ${"★".repeat(row.stars)}`;
      item.append(rank, name, score); list.appendChild(item);
    });
    openDialog("board-modal", opener || document.activeElement || $("board-btn"));
  }

  function clearBoard() { TDG.storage.set(TDG.config.STORAGE_KEYS.board, {}); toast("순위표를 지웠어요"); }

  function toast(text) {
    const el = $("toast"); if (!el) return;
    el.textContent = text; el.hidden = false; clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 2000);
  }

  async function shareResult() {
    const r = TDG.game.lastResult; if (!r) return;
    const url = "https://kimyounggaur.github.io/Tonguedrum_Game/";
    const text = `텅드럼 두더지잡기 ${r.modeTitle}에서 ${r.score}! ${"★".repeat(r.stars)}`;
    try {
      if (navigator.share) await navigator.share({ title: "텅드럼 두더지잡기", text, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text} ${url}`); toast("링크를 복사했어요"); }
    } catch (_) { /* 사용자가 공유 창을 닫음 */ }
  }

  function dateText() {
    const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  }

  async function drawResultCard({ omitImage = false } = {}) {
    const canvas = $("result-card-canvas"), ctx = canvas.getContext("2d"); const r = TDG.game.lastResult;
    canvas.width = 1080; canvas.height = 1350;
    if (document.fonts?.ready) await document.fonts.ready;
    ctx.fillStyle = "#F6F0FC"; ctx.fillRect(0, 0, 1080, 1350);
    if (!omitImage) {
      const img = document.querySelector("#start-screen img.tonguedrum");
      if (img?.complete) ctx.drawImage(img, 162, 55, 756, 735);
    }
    ctx.textAlign = "center"; ctx.fillStyle = "#32233f"; ctx.font = "900 56px sans-serif";
    ctx.fillText("텅드럼 두더지잡기", 540, 850);
    ctx.font = "700 34px sans-serif"; ctx.fillStyle = "#59466a";
    ctx.fillText(`${r.modeTitle}${r.mode === "classic" ? ` · ${TDG.config.DIFFICULTY[r.difficulty].label} · ${r.time}초` : ""}`, 540, 910);
    const core = r.mode === "find" ? `${r.score} / 10`
      : r.mode === "melody" ? `${r.score}%`
        : r.mode === "echo" ? `${r.score}개 음` : `${r.score}점`;
    ctx.font = "900 94px sans-serif"; ctx.fillStyle = "#C72C63"; ctx.fillText(core, 540, 1030);
    ctx.font = "900 64px sans-serif"; ctx.fillStyle = "#D28A12"; ctx.fillText(`${"★".repeat(r.stars)}${"☆".repeat(3 - r.stars)}`, 540, 1110);
    ctx.font = "500 28px sans-serif"; ctx.fillStyle = "#59466a";
    ctx.fillText((r.lines || []).slice(0, 3).map(([a, b]) => `${a} ${b}`).join("  ·  "), 540, 1180);
    if (r.boardName) ctx.fillText(`기록 이름 · ${r.boardName}`, 540, 1225);
    ctx.fillText(dateText(), 540, 1260);
    return canvas;
  }

  function canvasBlob(canvas) { return new Promise((resolve) => canvas.toBlob(resolve, "image/png")); }

  async function makeCardBlob() {
    try { cardBlob = await canvasBlob(await drawResultCard()); }
    catch (_) { cardBlob = await canvasBlob(await drawResultCard({ omitImage: true })); }
    return cardBlob;
  }

  async function openResultCard() { await makeCardBlob(); openDialog("result-card-modal", $("card-btn")); }
  async function saveResultCard() {
    const blob = cardBlob || await makeCardBlob(); if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tonguedrum-결과-${dateText().replaceAll(".", "")}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function shareResultCard() {
    const blob = cardBlob || await makeCardBlob(); if (!blob) return;
    const file = new File([blob], `tonguedrum-결과-${dateText().replaceAll(".", "")}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "텅드럼 두더지잡기" }); } catch (_) {} }
    else saveResultCard();
  }

  function presetValueTongues(list) {
    if (!list) return "all";
    if (list.join(",") === "C4,D4,E4,F4,G4") return "five";
    if (list.join(",") === "C4,D4,E4,F4,G4,A4,B4") return "mid";
    return list.join(",");
  }

  function createPresetLink() {
    const s = TDG.settings; const q = new URLSearchParams();
    q.set("mode", s.mode); q.set("level", s.levelLock || s.difficulty); q.set("time", String(s.time));
    q.set("tongues", presetValueTongues(s.tongues)); q.set("label", s.label); q.set("song", s.songId);
    if (s.mode === "find") q.set("sub", s.sub || "see");
    return `https://kimyounggaur.github.io/Tonguedrum_Game/?${q}`;
  }

  function updateOfflineBadge() {
    const el = $("offline-badge"); if (!el) return;
    el.hidden = navigator.onLine !== false; el.textContent = "오프라인 — 저장된 게임으로 실행 중";
  }

  TDG.ui = {
    showScreen, buildSlots, setScore, setTimer, setCombo, setHud, resetGameUI,
    setCountdown, hideCountdown, showModeActions, setReplayPlaying, labelHTML, announce,
    openDialog, closeDialog, closeTopDialog, trapDialogTab, showPause, showSettings, showTeacherTab,
    parsePreset, getStartOptions, saveSettings, applyStudentSettings, applyTeacherSettings,
    toggleMute, toggleKeyHints, updateMuteButton, updateModeOptions, refreshStart, initSettings,
    renderTeacherTongues, sanitizeName, saveBoardEntry, showBoard, clearBoard,
    showResult, toast, shareResult, openResultCard, saveResultCard, shareResultCard,
    createPresetLink, updateOfflineBadge, updateStartMeta,
  };
})();
