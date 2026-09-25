/* js/main.js — 초기화와 모든 사용자 이벤트 연결. 항상 마지막에 로드한다. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const $ = (id) => document.getElementById(id);
  let installPrompt = null;
  let teacherHold = 0;

  function unlock() { TDG.audio.init(); }

  function preloadImages(srcs) {
    srcs.forEach((src) => {
      const img = new Image(); img.src = src;
      if (img.decode) img.decode().catch(() => {});
    });
  }

  function saveStartChoices() {
    if (Object.keys(TDG.preset || {}).length) return;
    const picked = TDG.ui.getStartOptions();
    TDG.ui.saveSettings({ mode: picked.mode, difficulty: picked.difficulty, songId: picked.songId, sub: picked.sub });
  }

  function startFromUi(e) {
    saveStartChoices();
    TDG.game.start({ ...TDG.ui.getStartOptions(), startEvent: e });
  }

  function onStagePointerDown(e) {
    if (!["running"].includes(TDG.game.status)) return;
    if (e.pointerType === "touch") TDG.effects.touchStrike(e.clientX, e.clientY);
    else { TDG.effects.moveHammer(e.clientX, e.clientY); TDG.effects.swingHammer(); }
    const rect = TDG.effects.stageRect();
    const p = TDG.tongues.clientToDrum(e.clientX, e.clientY, rect);
    TDG.game.strike({ ...p, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY, source: "pointer" });
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    if (["running", "countdown"].includes(TDG.game.status)) TDG.effects.moveHammer(e.clientX, e.clientY);
  }

  function onKeyDown(e) {
    if (e.code === "Tab" && TDG.ui.trapDialogTab(e)) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
    if (e.code === "Escape") {
      e.preventDefault();
      if (!TDG.ui.closeTopDialog()) TDG.game.togglePause();
      return;
    }
    const inField = e.target.closest?.("input, textarea, select, [contenteditable='true']");
    if (inField || e.isComposing) return;
    if (e.code === "KeyP") { e.preventDefault(); TDG.game.togglePause(); return; }
    if (e.code === "KeyM") { e.preventDefault(); TDG.ui.toggleMute(); return; }
    if (e.code === "KeyK") { e.preventDefault(); TDG.ui.toggleKeyHints(); return; }
    if (e.code === "KeyL") { e.preventDefault(); TDG.game.replayPrompt(); return; }
    const note = TDG.tongues.keyToNote(e);
    if (!note) return;
    e.preventDefault();
    const t = TDG.tongues.byNote[note];
    TDG.effects.moveHammerToTongue(t);
    TDG.game.strike({ tongueId: t.id, source: "key" });
  }

  function setupSettings() {
    $("settings-btn")?.addEventListener("click", (e) => TDG.ui.showSettings(e.currentTarget));
    $("settings-close")?.addEventListener("click", () => TDG.ui.closeDialog("settings-modal"));
    document.querySelectorAll("[data-settings-tab]").forEach((btn) => btn.addEventListener("click", () => TDG.ui.showTeacherTab(btn.dataset.settingsTab === "teacher")));
    $("volume")?.addEventListener("input", (e) => TDG.audio.setVolume(Number(e.target.value) / 100));
    $("volume")?.addEventListener("change", () => { TDG.ui.applyStudentSettings(); TDG.audio.playNote("C4", { velocity: 0.65 }); });
    document.querySelectorAll('input[name="ticks"],#label-style,#key-hints,#preview-next,#vibrate').forEach((el) => el.addEventListener("change", TDG.ui.applyStudentSettings));
    document.querySelectorAll('#teacher-settings select:not(#teacher-tongues),#teacher-settings input[type="checkbox"]').forEach((el) => el.addEventListener("change", TDG.ui.applyTeacherSettings));
    $("teacher-tongues")?.addEventListener("change", applyTonguePreset);
    $("teacher-tongue-picker")?.addEventListener("click", toggleTeacherTongue);
    $("teacher-tongue-picker")?.addEventListener("keydown", (e) => {
      if (["Enter", "Space"].includes(e.code)) { e.preventDefault(); toggleTeacherTongue(e); }
    });
    const title = $("settings-title");
    title?.addEventListener("pointerdown", () => { teacherHold = setTimeout(() => TDG.ui.showTeacherTab(true), 2000); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => title?.addEventListener(name, () => clearTimeout(teacherHold)));
    if (new URLSearchParams(location.search).has("teacher")) TDG.ui.showTeacherTab(true);
  }

  function applyTonguePreset(e) {
    const value = e.target.value; const all = [...document.querySelectorAll("#teacher-tongue-picker .teacher-tongue")];
    document.querySelector(".tongue-picker-wrap")?.toggleAttribute("hidden", value !== "custom");
    if (value === "custom") return;
    const notes = value === "five" ? new Set(["C4", "D4", "E4", "F4", "G4"])
      : value === "mid" ? new Set(["C4", "D4", "E4", "F4", "G4", "A4", "B4"])
        : new Set(TDG.TONGUES.map((t) => t.note));
    all.forEach((el) => el.setAttribute("aria-pressed", String(notes.has(el.dataset.note))));
    TDG.ui.applyTeacherSettings();
  }

  function toggleTeacherTongue(e) {
    const el = e.target.closest?.(".teacher-tongue"); if (!el) return;
    const active = [...document.querySelectorAll('#teacher-tongue-picker .teacher-tongue[aria-pressed="true"]')];
    const pressed = el.getAttribute("aria-pressed") === "true";
    if (pressed && active.length <= 1) { TDG.ui.toast("텅을 하나 이상 골라 주세요"); return; }
    el.setAttribute("aria-pressed", String(!pressed));
    if ($("teacher-tongues")) $("teacher-tongues").value = "custom";
    TDG.ui.applyTeacherSettings();
  }

  function setupDialogsAndActions() {
    $("pause-btn")?.addEventListener("click", () => TDG.game.pause("button"));
    $("resume-btn")?.addEventListener("click", TDG.game.resume);
    $("mute-btn")?.addEventListener("click", () => TDG.ui.toggleMute());
    $("replay-btn")?.addEventListener("click", TDG.game.replayCurrent);
    $("prompt-replay-btn")?.addEventListener("click", TDG.game.replayPrompt);
    $("end-mode-btn")?.addEventListener("click", TDG.game.endCurrent);
    $("share-btn")?.addEventListener("click", TDG.ui.shareResult);
    $("card-btn")?.addEventListener("click", TDG.ui.openResultCard);
    $("card-save")?.addEventListener("click", TDG.ui.saveResultCard);
    $("card-share")?.addEventListener("click", TDG.ui.shareResultCard);
    $("board-btn")?.addEventListener("click", (e) => TDG.ui.showBoard(null, null, e.currentTarget));
    document.querySelectorAll('[data-action="open-board"]').forEach((btn) => btn.addEventListener("click", (e) => TDG.ui.showBoard(null, null, e.currentTarget)));
    $("board-name-form")?.addEventListener("submit", (e) => { e.preventDefault(); TDG.ui.saveBoardEntry($("board-name")?.value); });
    $("clear-board-btn")?.addEventListener("click", (e) => {
      if ($("clear-board-modal")) TDG.ui.openDialog("clear-board-modal", e.currentTarget);
      else { TDG.ui.clearBoard(); TDG.ui.toast("순위표를 지웠어요"); }
    });
    const returnToTeacherSettings = () => {
      TDG.ui.closeDialog("clear-board-modal", false);
      TDG.ui.showSettings($("settings-btn"));
      TDG.ui.showTeacherTab(true);
    };
    $("confirm-clear-board")?.addEventListener("click", () => { TDG.ui.clearBoard(); returnToTeacherSettings(); });
    $("cancel-clear-board")?.addEventListener("click", returnToTeacherSettings);
    $("board-close")?.addEventListener("click", () => TDG.ui.closeDialog("board-modal"));
    $("result-card-close")?.addEventListener("click", () => TDG.ui.closeDialog("result-card-modal"));
    document.querySelectorAll("[data-close-dialog]").forEach((btn) => btn.addEventListener("click", () => TDG.ui.closeDialog(btn.dataset.closeDialog)));
    const makePreset = async () => {
      const link = TDG.ui.createPresetLink();
      const output = $("preset-link-output") || $("preset-link");
      if (output) output.value = link;
      if ($("preset-link-row")) $("preset-link-row").hidden = false;
      try { await navigator.clipboard.writeText(link); TDG.ui.toast("수업 링크를 복사했어요"); } catch (_) {}
    };
    $("preset-link-btn")?.addEventListener("click", makePreset);
    $("make-preset-btn")?.addEventListener("click", makePreset);
    $("copy-preset-btn")?.addEventListener("click", async () => {
      const link = $("preset-link")?.value || TDG.ui.createPresetLink();
      try { await navigator.clipboard.writeText(link); TDG.ui.toast("수업 링크를 복사했어요"); } catch (_) {}
    });
    $("clear-preset-btn")?.addEventListener("click", () => {
      history.replaceState({}, "", `${location.pathname}${location.hash}`); TDG.preset = {}; TDG.ui.refreshStart();
    });
  }

  function setupInstall() {
    const btn = $("install-btn");
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; if (btn) btn.hidden = false; });
    btn?.addEventListener("click", async () => {
      if (!installPrompt) return;
      await installPrompt.prompt(); installPrompt = null; btn.hidden = true;
    });
    const standalone = matchMedia?.("(display-mode: standalone)").matches;
    if (standalone && btn) btn.hidden = true;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if ($("ios-install-hint")) $("ios-install-hint").hidden = standalone || !ios;
  }

  function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (new URLSearchParams(location.search).has("nosw")) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {}); return;
    }
    const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
    if (!secure) return;
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  function init() {
    TDG.ui.initSettings(); TDG.ui.buildSlots(); TDG.ui.showScreen("start");
    preloadImages(["assets/star.png", "assets/hammer.png", "assets/mole.png"]);
    $("start-btn")?.addEventListener("click", startFromUi);
    $("restart-btn")?.addEventListener("click", (e) => TDG.game.restart(e));
    $("home-btn")?.addEventListener("click", TDG.game.goHome);
    $("mode-group")?.addEventListener("change", () => { TDG.ui.updateModeOptions(); if (!Object.keys(TDG.preset || {}).length) saveStartChoices(); });
    $("difficulty-options")?.addEventListener("change", saveStartChoices);
    $("find-options")?.addEventListener("change", saveStartChoices);
    $("song-select")?.addEventListener("change", saveStartChoices);
    const stage = $("stage"), game = $("game-screen");
    stage?.addEventListener("pointerdown", onStagePointerDown);
    stage?.addEventListener("contextmenu", (e) => e.preventDefault());
    stage?.addEventListener("dragstart", (e) => e.preventDefault());
    game?.addEventListener("pointermove", onPointerMove, { passive: true });
    game?.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch" && ["running", "countdown"].includes(TDG.game.status)) $("hammer-cursor")?.classList.add("visible"); });
    game?.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") $("hammer-cursor")?.classList.remove("visible"); });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", () => { if (document.hidden) TDG.game.pause("hidden"); });
    window.addEventListener("pagehide", () => TDG.game.pause("pagehide"));
    window.addEventListener("online", TDG.ui.updateOfflineBadge);
    window.addEventListener("offline", TDG.ui.updateOfflineBadge);
    setupSettings(); setupDialogsAndActions(); setupInstall(); setupServiceWorker(); TDG.ui.updateOfflineBadge();
    TDG.debug?.init?.();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
