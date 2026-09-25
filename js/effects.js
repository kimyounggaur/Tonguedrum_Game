/* js/effects.js — 화면 연출, 망치, 텅 SVG 레이어. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const NS = "http://www.w3.org/2000/svg";
  let swingTimer = 0;
  let touchTimer = 0;
  const timers = new Set();

  function later(fn, ms) {
    const schedule = TDG.game && TDG.game.later;
    if (schedule) return schedule(fn, ms);
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }

  function stageRect() {
    return document.getElementById("stage").getBoundingClientRect();
  }

  function tongueCapsule(t, className = "tongue-capsule") {
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", String(t.x * 36.09));
    line.setAttribute("y1", String(t.y * 35.05));
    line.setAttribute("x2", String(t.lx * 36.09));
    line.setAttribute("y2", String(t.ly * 35.05));
    line.setAttribute("stroke-width", String(2 * t.hw * 36.09));
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("class", className);
    line.dataset.tongueId = t.id;
    return line;
  }

  function layer() { return document.getElementById("tongue-layer"); }

  function clearLayer(selector) {
    const root = layer();
    if (!root) return;
    root.querySelectorAll(selector).forEach((el) => el.remove());
  }

  function glowTongue(tongueId, level = 0) {
    const root = layer();
    if (!root) return;
    let el = root.querySelector(`.tongue-glow[data-tongue-id="${tongueId}"]`);
    if (!level) { if (el) el.remove(); return; }
    const t = TDG.tongues.byId[tongueId];
    if (!t) return;
    if (!el) {
      el = tongueCapsule(t, "tongue-glow");
      root.appendChild(el);
    }
    el.dataset.level = String(level);
  }

  function clearGlows() { clearLayer(".tongue-glow,.tongue-ripple,.key-hint"); }

  function rippleTongue(tongueId) {
    const root = layer();
    const t = TDG.tongues.byId[tongueId];
    if (!root || !t) return;
    const el = tongueCapsule(t, "tongue-ripple");
    root.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    later(() => el.remove(), 500);
  }

  function keyLabel(note) {
    const map = {
      E3: "E", F3: "R", G3: "T", A3: "Y", B3: "U",
      C4: "1", D4: "2", E4: "3", F4: "4", G4: "5", A4: "6", B4: "7",
      C5: "⇧1", D5: "⇧2", E5: "⇧3",
    };
    return map[note] || "";
  }

  function renderKeyHints(show) {
    clearLayer(".key-hint");
    if (!show) return;
    const root = layer();
    if (!root) return;
    TDG.TONGUES.forEach((t) => {
      const x = (t.x + (t.lx - t.x) * 0.35) * 36.09;
      const y = (t.y + (t.ly - t.y) * 0.35) * 35.05;
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "key-hint");
      g.dataset.tongueId = t.id;
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", String(x - 78)); rect.setAttribute("y", String(y - 53));
      rect.setAttribute("width", "156"); rect.setAttribute("height", "106"); rect.setAttribute("rx", "30");
      const text = document.createElementNS(NS, "text");
      text.setAttribute("x", String(x)); text.setAttribute("y", String(y + 20));
      text.setAttribute("text-anchor", "middle"); text.textContent = keyLabel(t.note);
      g.append(rect, text); root.appendChild(g);
    });
  }

  function slotElement(id) {
    return document.querySelector(`.mole-slot[data-tongue-id="${id}"]`);
  }

  function showMole(tongueId, { golden = false, label = "" } = {}) {
    const slot = slotElement(tongueId);
    if (!slot) return;
    const mole = slot.querySelector(".mole");
    if (!mole) return;
    mole.classList.remove("leaving", "hit-shake");
    mole.classList.toggle("golden", !!golden);
    void mole.offsetWidth;
    mole.classList.add("up");
    slot.dataset.active = "true";
    let bubble = slot.querySelector(".mole-note-label");
    if (bubble) bubble.remove();
    if (label) {
      bubble = document.createElement("div");
      bubble.className = "mole-note-label note-bubble";
      bubble.innerHTML = label;
      slot.appendChild(bubble);
    }
    if (golden) goldenSparkle(tongueId);
  }

  function hideMole(tongueId, { leaving = true } = {}) {
    const slot = slotElement(tongueId);
    if (!slot) return;
    const mole = slot.querySelector(".mole");
    if (mole) {
      mole.classList.remove("up", "hit-shake");
      mole.classList.toggle("leaving", leaving);
      if (leaving) later(() => mole.classList.remove("leaving", "golden"), 260);
      else mole.classList.remove("leaving", "golden");
    }
    slot.dataset.active = "false";
    slot.querySelectorAll(".mole-note-label").forEach((el) => el.remove());
  }

  function hideAllMoles(immediate = true) {
    document.querySelectorAll(".mole-slot[data-tongue-id]").forEach((slot) => hideMole(slot.dataset.tongueId, { leaving: !immediate }));
    document.querySelectorAll(".star-burst,.orbit-stars,.score-pop,.golden-sparkles,.note-bubble.floating").forEach((el) => el.remove());
  }

  function playMoleHitReaction(tongueId) {
    const mole = slotElement(tongueId)?.querySelector(".mole");
    if (!mole) return;
    mole.classList.remove("hit-shake");
    void mole.offsetWidth;
    mole.classList.add("hit-shake");
    later(() => mole.classList.remove("hit-shake"), TDG.config.GAME.hitReactionMs + 80);
  }

  function spawnStarBurst(tongueId) {
    const t = TDG.tongues.byId[tongueId];
    const container = document.getElementById("mole-container");
    if (!t || !container) return;
    const star = document.createElement("img");
    star.src = "assets/star.png"; star.className = "star-burst"; star.alt = "";
    star.style.left = `${t.x}%`; star.style.top = `${t.y - 4}%`;
    container.appendChild(star);
    star.addEventListener("animationend", () => star.remove(), { once: true });
    later(() => star.remove(), TDG.config.GAME.hitStarMs + 220);
  }

  function spawnOrbitStars(tongueId) {
    const t = TDG.tongues.byId[tongueId];
    const container = document.getElementById("mole-container");
    if (!t || !container) return;
    const orbit = document.createElement("div");
    orbit.className = "orbit-stars";
    orbit.style.left = `${t.x}%`; orbit.style.top = `${t.y - 3}%`;
    for (let i = 0; i < 3; i += 1) {
      const star = document.createElementNS(NS, "svg");
      star.setAttribute("class", "orbit-star"); star.setAttribute("viewBox", "0 0 24 24");
      star.setAttribute("aria-hidden", "true");
      star.innerHTML = '<path d="M12 1.8 14.9 8l6.8.8-5 4.6 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.6L9.1 8 12 1.8Z"/>';
      orbit.appendChild(star);
    }
    container.appendChild(orbit);
    orbit.addEventListener("animationend", () => orbit.remove(), { once: true });
    later(() => orbit.remove(), TDG.config.GAME.hitReactionMs + 180);
  }

  function scorePop(tongueId, points, { gold = false, clientX, clientY } = {}) {
    if (clientX == null || clientY == null) {
      const t = TDG.tongues.byId[tongueId];
      if (!t) return;
      const p = TDG.tongues.drumToClient(t.x, t.y, stageRect());
      clientX = p.clientX; clientY = p.clientY;
    }
    const el = document.createElement("div");
    el.className = `score-pop${gold ? " gold" : ""}`;
    el.setAttribute("aria-hidden", "true"); el.textContent = `+${points}`;
    el.style.left = `${clientX}px`; el.style.top = `${clientY - 20}px`;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    later(() => el.remove(), TDG.config.GAME.scorePopMs + 220);
  }

  function goldenSparkle(tongueId) {
    const t = TDG.tongues.byId[tongueId];
    const container = document.getElementById("mole-container");
    if (!t || !container) return;
    const el = document.createElement("div");
    el.className = "golden-sparkles"; el.style.left = `${t.x}%`; el.style.top = `${t.y - 4}%`;
    el.innerHTML = "<i>✦</i><i>✦</i><i>✦</i>";
    container.appendChild(el); later(() => el.remove(), 520);
  }

  function celebrate(tongueId) {
    playMoleHitReaction(tongueId); spawnStarBurst(tongueId); spawnOrbitStars(tongueId);
  }

  function flashLabel(tongueId, html, ms = 700) {
    if (!html) return;
    const t = TDG.tongues.byId[tongueId];
    const stage = document.getElementById("stage");
    if (!t || !stage) return;
    const x = t.lx + (50 - t.lx) * 0.1;
    const y = t.ly + (50 - t.ly) * 0.1;
    const el = document.createElement("div");
    el.className = "note-bubble floating"; el.innerHTML = html;
    el.style.left = `${x}%`; el.style.top = `${y}%`;
    stage.appendChild(el); later(() => el.remove(), ms);
  }

  function hammer() { return document.getElementById("hammer-cursor"); }

  function moveHammer(clientX, clientY, show = true) {
    const el = hammer(); if (!el) return;
    el.style.left = `${clientX}px`; el.style.top = `${clientY}px`;
    if (show) el.classList.add("visible");
  }

  function moveHammerToTongue(t) {
    if (!t) return;
    const p = TDG.tongues.drumToClient(t.x, t.y, stageRect());
    moveHammer(p.clientX, p.clientY); swingHammer();
  }

  function swingHammer() {
    const el = hammer(); if (!el) return;
    clearTimeout(swingTimer);
    el.classList.remove("swinging"); void el.offsetWidth; el.classList.add("swinging");
    swingTimer = setTimeout(() => el.classList.remove("swinging"), TDG.config.GAME.hammerSwingMs);
  }

  function placeHammerAtStart(e) {
    const el = hammer(); if (!el) return;
    const r = stageRect();
    const hasPoint = e && typeof e.clientX === "number" && (e.clientX !== 0 || e.clientY !== 0);
    moveHammer(hasPoint ? e.clientX : r.left + r.width / 2, hasPoint ? e.clientY : r.top + r.height / 2);
    clearTimeout(touchTimer);
    if (window.matchMedia?.("(pointer: coarse)").matches) touchTimer = setTimeout(() => el.classList.remove("visible"), 2000);
  }

  function touchStrike(clientX, clientY) {
    const el = hammer(); if (!el) return;
    clearTimeout(touchTimer); moveHammer(clientX, clientY); swingHammer();
    touchTimer = setTimeout(() => {
      el.classList.add("touch-fade");
      setTimeout(() => el.classList.remove("visible", "touch-fade"), 170);
    }, 250);
  }

  function resetHammer() {
    clearTimeout(swingTimer); clearTimeout(touchTimer);
    const el = hammer(); if (el) el.classList.remove("visible", "swinging", "touch-fade");
  }

  TDG.effects = {
    tongueCapsule, glowTongue, clearGlows, rippleTongue, renderKeyHints, keyLabel,
    showMole, hideMole, hideAllMoles, playMoleHitReaction, celebrate, flashLabel, scorePop, goldenSparkle,
    moveHammer, moveHammerToTongue, swingHammer, placeHammerAtStart, touchStrike, resetHammer,
    stageRect,
  };
})();
