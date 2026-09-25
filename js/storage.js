/* js/storage.js — 예외 안전 설정·기록·기기 내 순위표 저장소. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  const SETTINGS_DEFAULTS = {
    volume: 0.7, muted: false, ticks: "all",
    difficulty: "normal",
    mode: "classic", label: "ko", songId: "twinkle", previewNext: true,
    keyHints: false, vibrate: true,
    time: 30, levelLock: null, tongues: null, labelLock: false,
    modesVisible: ["classic", "find", "melody", "echo", "free"], boardEnabled: false,
  };

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (_) { /* 사생활 보호 모드·저장소 차단은 무시 */ }
  }

  function settingsKey() {
    return TDG.config.STORAGE_KEYS.settings;
  }

  function recordsKey() {
    return TDG.config.STORAGE_KEYS.records;
  }

  function boardKey() {
    return TDG.config.STORAGE_KEYS.board;
  }

  function loadSettings() {
    const stored = get(settingsKey(), {});
    const source = isObject(stored) ? stored : {};
    const settings = { ...SETTINGS_DEFAULTS, ...source };
    // 호출자가 기본 배열을 직접 바꾸지 않도록 매번 독립된 배열을 돌려준다.
    settings.modesVisible = Array.isArray(settings.modesVisible)
      ? [...settings.modesVisible]
      : [...SETTINGS_DEFAULTS.modesVisible];
    settings.tongues = Array.isArray(settings.tongues) ? [...settings.tongues] : null;
    return settings;
  }

  function saveSettings(settings) {
    const source = isObject(settings) ? settings : {};
    return set(settingsKey(), { ...SETTINGS_DEFAULTS, ...source });
  }

  function todayISO(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function loadRecords() {
    const records = get(recordsKey(), {});
    return isObject(records) ? records : {};
  }

  function saveRecords(records) {
    return set(recordsKey(), isObject(records) ? records : {});
  }

  function getRecord(recordName) {
    const record = loadRecords()[recordName];
    return isObject(record) ? { ...record } : null;
  }

  /**
   * 점수가 높은 모드의 공통 기록 갱신. 같은 점수는 신기록이 아니다.
   * melody처럼 낮은 시간이 좋은 보조 기록은 bestTimeMs를 함께 넘긴다.
   */
  function updateRecord(recordName, { score = 0, stars = 0, date = todayISO(), bestTimeMs } = {}) {
    const records = loadRecords();
    const previous = isObject(records[recordName]) ? records[recordName] : null;
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const numericStars = Math.max(0, Math.min(3, Number(stars) || 0));
    const oldBest = previous && Number.isFinite(Number(previous.best)) ? Number(previous.best) : null;
    const isRecord = oldBest === null || numericScore > oldBest;
    const record = {
      best: isRecord ? numericScore : oldBest,
      bestStars: Math.max(previous && Number(previous.bestStars) || 0, numericStars),
      plays: Math.max(0, previous && Number(previous.plays) || 0) + 1,
      last: String(date || todayISO()),
    };

    const time = Number(bestTimeMs);
    const oldTime = previous && Number(previous.bestTimeMs);
    if (Number.isFinite(time) && time >= 0) {
      record.bestTimeMs = Number.isFinite(oldTime) && oldTime >= 0 ? Math.min(oldTime, time) : time;
    } else if (Number.isFinite(oldTime) && oldTime >= 0) {
      record.bestTimeMs = oldTime;
    }

    records[recordName] = record;
    const saved = saveRecords(records);
    return { record: { ...record }, isRecord, records, saved };
  }

  function loadBoard() {
    const board = get(boardKey(), {});
    return isObject(board) ? board : {};
  }

  function saveBoard(board) {
    return set(boardKey(), isObject(board) ? board : {});
  }

  function sanitizeBoardName(raw) {
    const cleaned = String(raw ?? "")
      .replace(/[^0-9A-Za-zㄱ-ㅎㅏ-ㅣ가-힣 ]/g, "")
      .trim()
      .slice(0, 8)
      .trim();
    return cleaned || "익명";
  }

  function normalizedBoardEntries(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(isObject)
      .map((entry) => ({
        name: sanitizeBoardName(entry.name),
        score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : 0,
        stars: Math.max(0, Math.min(3, Number(entry.stars) || 0)),
        date: String(entry.date || todayISO()),
      }));
  }

  function getBoard(boardName) {
    return normalizedBoardEntries(loadBoard()[boardName])
      .map((item, order) => ({ item, order }))
      .sort((a, b) => b.item.score - a.item.score || a.order - b.order)
      .slice(0, 10)
      .map((row) => row.item);
  }

  function qualifiesForBoard(boardName, score) {
    const entries = getBoard(boardName);
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    return entries.length < 10 || numericScore > entries[entries.length - 1].score;
  }

  /** 점수 내림차순, 동점은 기존(먼저 저장된) 기록 우선으로 최대 10개를 보관한다. */
  function addBoardEntry(boardName, { name, score = 0, stars = 0, date = todayISO() } = {}) {
    const board = loadBoard();
    const entries = normalizedBoardEntries(board[boardName]);
    const entry = {
      name: sanitizeBoardName(name),
      score: Number.isFinite(Number(score)) ? Number(score) : 0,
      stars: Math.max(0, Math.min(3, Number(stars) || 0)),
      date: String(date || todayISO()),
    };
    const marker = Symbol("new-board-entry");
    const ranked = [...entries.map((item, order) => ({ item, order })), { item: entry, order: entries.length, marker }]
      .sort((a, b) => b.item.score - a.item.score || a.order - b.order)
      .slice(0, 10);
    const index = ranked.findIndex((row) => row.marker === marker);
    if (index < 0) return { entries: entries.slice(0, 10), entry, rank: null, accepted: false, saved: true };

    const nextEntries = ranked.map((row) => row.item);
    board[boardName] = nextEntries;
    const saved = saveBoard(board);
    return { entries: nextEntries, entry, rank: index + 1, accepted: true, saved };
  }

  function clearBoard(boardName) {
    if (boardName === undefined || boardName === null) {
      remove(boardKey());
      return;
    }
    const board = loadBoard();
    delete board[boardName];
    saveBoard(board);
  }

  TDG.storage = {
    SETTINGS_DEFAULTS,
    get,
    set,
    remove,
    loadSettings,
    saveSettings,
    todayISO,
    loadRecords,
    saveRecords,
    getRecord,
    updateRecord,
    loadBoard,
    saveBoard,
    getBoard,
    qualifiesForBoard,
    sanitizeBoardName,
    addBoardEntry,
    clearBoard,
  };
})();
