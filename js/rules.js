/* js/rules.js — 게임 규칙(순수 함수, DOM·setTimeout 없음): 두더지 스케줄러·점수·별점·시드 난수. 부록 D.
   스케줄러는 게임 시계 t(ms, 일시정지 시간 제외)를 넣으면 그 시각에 일어난 일을 이벤트 배열로 돌려준다. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  // 시드 고정 난수(?seed=N 재현용). 0 이상 1 미만
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * cfg: TDG.config.DIFFICULTY[...]  durationMs: 판 길이  rng: () => [0,1)
   * tongues: 두더지가 나올 텅 목록(교사 설정으로 일부만 쓸 수 있음)
   * 이벤트: {type:"spawn"|"leave"|"gone", mole, escaped?}
   */
  function createSpawner({ cfg, durationMs, rng, tongues, hitReactionMs = 420 }) {
    const moles = [];            // { seq, tongueId, spawnAt, leaveAt, goneAt, hitAt, golden, left, gone }
    let seq = 0;
    let lastTongueId = null;
    const lerp = ([a, b], r) => a + (b - a) * r;
    let nextSpawnAt = lerp(cfg.gapMs, rng());

    const ramp = (t) => 1 + (cfg.rampTo - 1) * Math.min(1, t / durationMs);   // 뒤로 갈수록 머무는 시간이 짧아진다
    const active = (t) => moles.filter((m) => t < m.goneAt);
    const maxAt = (t) => (cfg.maxConcurrent > 1 && t >= (cfg.secondMoleFromMs || 0) ? cfg.maxConcurrent : 1);

    function update(t) {
      const events = [];
      // 1) 퇴장·소멸 처리
      for (const m of moles) {
        if (!m.left && t >= m.leaveAt) { m.left = true; events.push({ type: "leave", mole: m, escaped: m.hitAt === null }); }
        if (!m.gone && t >= m.goneAt) { m.gone = true; events.push({ type: "gone", mole: m }); }
      }
      if (t >= durationMs) return events;

      // 2) 등장 — 가능 여부는 항상 '현재 시각 t' 기준(과거 시각 기준으로 판단하면 영원히 막힌다)
      while (nextSpawnAt <= t && nextSpawnAt < durationMs) {
        const alive = active(t);
        if (alive.length >= maxAt(t)) { nextSpawnAt = Infinity; break; }
        const busy = new Set(alive.map((m) => m.tongueId));
        let pool = tongues.filter((x) => x.id !== lastTongueId && !busy.has(x.id));
        if (!pool.length) pool = tongues.filter((x) => !busy.has(x.id));      // 텅을 1개만 쓰는 교사 설정 대비
        if (!pool.length) { nextSpawnAt = Infinity; break; }
        const tongue = pool[Math.floor(rng() * pool.length)];
        const golden = rng() < cfg.goldenChance;
        const at = nextSpawnAt;
        const vis = lerp(cfg.visibleMs, rng()) * ramp(at) * (golden ? 0.8 : 1);
        const m = { seq: ++seq, tongueId: tongue.id, spawnAt: at, leaveAt: at + cfg.enterMs + vis, golden, hitAt: null, left: false, gone: false };
        m.goneAt = m.leaveAt + cfg.leaveMs;
        moles.push(m); lastTongueId = tongue.id;
        events.push({ type: "spawn", mole: m });
        // 동시 1마리: 사라질 때까지 대기 / 동시 2마리 이상: 짧은 간격 뒤 다음 두더지
        nextSpawnAt = maxAt(at) > 1 ? at + cfg.enterMs + lerp(cfg.gapMs, rng()) : Infinity;
      }
      // 3) 자리가 비었는데 예약이 없으면: 가장 최근에 빈 시각 + 간격 뒤로 예약
      if (nextSpawnAt === Infinity && active(t).length < maxAt(t)) {
        const freedAt = Math.max(0, ...moles.filter((m) => m.goneAt <= t).map((m) => m.goneAt));
        nextSpawnAt = Math.max(t, freedAt + lerp(cfg.gapMs, rng()));
      }
      return events;
    }

    // 지금 이 텅에서 맞힐 수 있는 두더지(등장 중·올라온 상태, 아직 안 맞음)
    function hittable(tongueId, t) {
      return moles.find((m) => m.tongueId === tongueId && m.hitAt === null && t >= m.spawnAt && t < m.leaveAt) || null;
    }

    function hit(mole, t) {        // 맞으면 반응 연출 뒤 퇴장
      mole.hitAt = t;
      mole.leaveAt = Math.min(mole.leaveAt, t + hitReactionMs);
      mole.goneAt = mole.leaveAt + cfg.leaveMs;
    }

    return { update, hittable, hit, moles };
  }

  // 점수: 기본 10, 황금 30, 연속 5마리째부터 +5
  function pointsFor({ golden, combo }) {
    const G = TDG.config.GAME;
    return (golden ? G.goldenScore : G.scorePerHit) + (combo >= G.comboBonusFrom ? G.comboBonus : 0);
  }

  // 별점: 나온 두더지 중 잡은 비율(%) → 0~3
  function starsFor(ratePct) {
    return TDG.config.STARS.filter((th) => ratePct >= th).length;
  }

  TDG.rules = { createSpawner, mulberry32, pointsFor, starsFor };
})();
