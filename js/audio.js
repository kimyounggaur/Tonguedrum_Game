/* ============================================================
   js/audio.js — 텅드럼 음원 엔진 (참조 구현, 부록 A-7에서 검증)
   음색 합성은 형제 앱 Tonguedrum_Play의 playNote()/makeIR()/makeNoiseBurst()를 그대로 옮기고
   게임용으로 ① 보이스 제한 ② 같은 텅 재타격 시 이전 소리 감쇠(choke) ③ 세기(velocity)
   ④ 마스터 리미터 ⑤ 음소거/볼륨 ⑥ 합성 틱·징글을 추가했다.
   로드 순서: config.js → tongues.js → audio.js
   ============================================================ */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  const NOTE = TDG.NOTE;   // js/tongues.js에서 정의(먼저 로드돼야 한다)
  const PARTIALS = [[1.00, 1.00], [2.01, 0.40], [2.98, 0.20], [4.16, 0.10], [5.43, 0.05]];
  const MAX_VOICES = 10;

  function makeIR(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }

  const audio = {
    ctx: null, master: null, bus: null, noise: null, voices: [],
    volume: 0.7, muted: false, sfx: null,

    /** 첫 사용자 제스처(pointerdown/keydown) 안에서 호출. 테스트에서는 OfflineAudioContext를 넘길 수 있다. */
    init(ctxOverride) {
      // 아이폰·아이패드는 전화·앱 전환 뒤 "interrupted" 상태가 되므로 suspended만 보지 않는다
      if (this.ctx) { if (this.ctx.state !== "running" && this.ctx.state !== "closed" && this.ctx.resume) this.ctx.resume().catch(() => {}); return this.ctx; }
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (_) { /* iOS 무음 스위치 대응(지원 브라우저만) */ }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!ctxOverride && !Ctor) return null;
      const ctx = ctxOverride || new Ctor({ latencyHint: "interactive" });

      // 여러 음이 겹칠 때 클리핑 방지. 실측(부록 A-7): 리미터 없으면 6음 동시 +7.8dBFS·30연타 +8.4dBFS(찢어짐)
      // → 이 설정에서 6음 동시 -2.3dBFS, 30연타 -1.7dBFS, 단음 -4.2dBFS
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.001; limiter.release.value = 0.1;
      limiter.connect(ctx.destination);

      const master = ctx.createGain();                       // 음소거·볼륨은 여기 하나로만
      master.gain.value = this.muted ? 0 : this.volume;
      master.connect(limiter);

      const bus = ctx.createGain();                          // 모든 소리가 모이는 곳(드라이 + 리버브 송신)
      bus.connect(master);
      const convolver = ctx.createConvolver();
      convolver.buffer = makeIR(ctx, 2.8, 2.2);
      const wet = ctx.createGain(); wet.gain.value = 0.22;
      bus.connect(wet); wet.connect(convolver); convolver.connect(master);

      // 타격 잡음 버퍼는 한 번만 만들어 재사용 (형제 앱은 매 타격 생성)
      const n = Math.floor(ctx.sampleRate * 0.045);
      const noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < n; i += 1) d[i] = Math.random() * 2 - 1;

      // 틱 같은 짧은 효과음은 리미터를 거치면 과하게 눌리므로(실측 -27dB) 별도 버스로 직접 출력
      const sfx = ctx.createGain();
      sfx.gain.value = this.muted ? 0 : this.volume;
      sfx.connect(ctx.destination);

      Object.assign(this, { ctx, master, bus, noise, sfx });
      return ctx;
    },

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, Number(v) || 0));
      this._applyGain();
    },
    setMuted(m) {
      this.muted = !!m;
      this._applyGain();
    },
    _applyGain() {
      if (!this.ctx) return;
      const g = this.muted ? 0 : this.volume, t = this.ctx.currentTime;
      [this.master, this.sfx].forEach((n) => n.gain.setTargetAtTime(g, t, 0.015));
    },

    /** 텅 하나를 친다. velocity 0~1, pan -0.5~0.5, when = ctx 시각(생략 시 즉시) */
    playNote(noteId, { velocity = 1, pan = 0, when } = {}) {
      const ctx = this.ctx, info = NOTE[noteId];
      if (!ctx || !info) return null;
      const now = Math.max(when ?? ctx.currentTime, ctx.currentTime);
      const vel = Math.max(0.05, Math.min(1, velocity));

      // ② 같은 텅을 다시 치면 이전 울림을 빠르게 줄인다(실제 텅도 다시 치면 진동이 새로 시작됨)
      this.voices.filter((v) => v.noteId === noteId && v.endAt > now).forEach((v) => this.release(v, now, 0.04));
      // ① 보이스 수 제한: 가장 오래된 것부터 정리
      this.voices = this.voices.filter((v) => v.endAt > now);
      while (this.voices.length >= MAX_VOICES) this.release(this.voices.shift(), now, 0.03);

      const decay = Math.max(2.2, 4.8 - (info.midi - 52) * 0.08);   // 형제 앱과 동일
      const voice = ctx.createGain();
      voice.gain.setValueAtTime(0.0001, now);
      voice.gain.exponentialRampToValueAtTime(0.85 * vel, now + 0.009);
      voice.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass"; lowpass.Q.value = 0.7;
      // 약하게 치면 더 어둡게(세기 → 밝기)
      lowpass.frequency.setValueAtTime(Math.min(7000, info.freq * (4 + 4 * vel)), now);
      lowpass.frequency.exponentialRampToValueAtTime(Math.max(420, info.freq * 2.2), now + decay);

      let out = lowpass;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-0.5, Math.min(0.5, pan));
        lowpass.connect(p); out = p;
      }
      out.connect(this.bus);
      // 감쇠(choke) 전용 게인: 엔벨로프 자동화와 충돌하지 않게 별도 노드에서 끈다
      const choke = ctx.createGain();
      voice.connect(choke).connect(lowpass);

      const oscs = PARTIALS.map(([mult, g], i) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = info.freq * mult;
        if (i > 0) o.detune.value = i * 1.5;
        const pg = ctx.createGain();
        pg.gain.setValueAtTime(g, now);
        pg.gain.exponentialRampToValueAtTime(0.0001, now + decay * (i === 0 ? 1 : 0.7));
        o.connect(pg).connect(voice);
        o.start(now); o.stop(now + decay + 0.08);
        return o;
      });

      const src = ctx.createBufferSource();                 // 타격 잡음(말렛 소리)
      src.buffer = this.noise;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.022 * vel, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      src.connect(hp).connect(ng).connect(voice);
      src.start(now); src.stop(now + 0.06);

      const v = { noteId, choke, oscs: [...oscs, src], endAt: now + decay + 0.08 };
      this.voices.push(v);
      return v;
    },

    release(v, at, fade) {
      if (!v || v.released) return;
      v.released = true;
      try {
        v.choke.gain.setValueAtTime(1, at);
        v.choke.gain.linearRampToValueAtTime(0, at + fade);
        v.oscs.forEach((o) => { try { o.stop(at + fade + 0.01); } catch (_) {} });
      } catch (_) { /* 이미 정지된 노드 */ }
      v.endAt = at + fade + 0.01;
    },

    /** 울리는 소리와 when으로 예약해 둔 소리를 모두 멈춘다(일시정지·자동 연주 중단용) */
    stopAll(fade = 0.05) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.voices.forEach((v) => this.release(v, now, fade));
      this.voices = [];
    },

    /** 합성 틱(나무블록 느낌). accent=true면 높고 조금 크게 */
    tick({ accent = false, when } = {}) {
      const ctx = this.ctx; if (!ctx) return;
      const now = Math.max(when ?? ctx.currentTime, ctx.currentTime);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(accent ? 1900 : 1350, now);
      o.frequency.exponentialRampToValueAtTime(accent ? 1500 : 1050, now + 0.04);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.32, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      o.connect(g).connect(this.sfx);                      // 틱은 리버브·리미터 없이 효과음 버스로
      o.start(now); o.stop(now + 0.08);
    },

    /** 끝 알림: 도-미-솔-높은도 (+ 신기록이면 높은 미) */
    jingle({ record = false } = {}) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + 0.02;
      const seq = record ? ["C4", "E4", "G4", "C5", "E5"] : ["C4", "E4", "G4", "C5"];
      seq.forEach((n, i) => this.playNote(n, { velocity: 0.75, when: t0 + i * 0.1 }));
    },
  };

  TDG.audio = audio;
})();
