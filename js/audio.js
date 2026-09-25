/* ============================================================
   js/audio.js — 스틸 텅드럼 합성 음원 엔진
   외부 샘플 없이 Web Audio의 모달 공진·말렛 타격·짧은 공간 잔향을 합성한다.
   게임용으로 ① 보이스 제한 ② 같은 텅 재타격 시 이전 소리 감쇠(choke) ③ 세기(velocity)
   ④ 마스터 리미터 ⑤ 음소거/볼륨 ⑥ 합성 틱·징글을 지원한다.
   로드 순서: config.js → tongues.js → audio.js
   ============================================================ */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  const NOTE = TDG.NOTE;   // js/tongues.js에서 정의(먼저 로드돼야 한다)

  // 강철 텅은 정수 배음만 울리지 않는다. 첫 모드는 음높이를 또렷하게 잡고,
  // 뒤의 짧은 비조화 모드는 "딱" 하고 금속이 열리는 질감을 만든다.
  // gain은 전체 보이스 엔벌로프 안의 상대 크기, decay는 기본 울림 시간의 비율이다.
  const STEEL_MODES = [
    { ratio: 1.000, gain: 1.00, decay: 1.00, bloom: 1.0 },
    { ratio: 2.006, gain: 0.27, decay: 0.55, bloom: 1.3 },
    { ratio: 2.758, gain: 0.14, decay: 0.34, bloom: 1.7 },
    { ratio: 3.916, gain: 0.080, decay: 0.24, bloom: 2.1 },
    { ratio: 5.207, gain: 0.038, decay: 0.16, bloom: 2.8 },
    { ratio: 6.490, gain: 0.018, decay: 0.11, bloom: 3.5 },
  ];
  // 6개 공진 모드와 타격 노이즈를 쓰므로 저사양 교실 기기에서는 8보이스로 제한한다.
  const MAX_VOICES = 8;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  // 같은 리버브가 매번 달라지면 학습용 악기의 인상이 흔들린다. 고정 난수로
  // 초기 반사음과 잔향을 만들고, 저음은 덜 붐비도록 뒤에서 필터링한다.
  function makeIR(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      let seed = 0x9e3779b9 ^ (ch * 0x85ebca6b);
      for (let i = 0; i < length; i += 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const random = seed / 0x100000000 * 2 - 1;
        data[i] = random * 0.14 * Math.pow(1 - i / length, decay);
      }
      // 작은 연습실의 근접 반사. 좌·우 반사 시간을 살짝 달리해 답답한 모노 잔향을 피한다.
      [[0.013, 0.34], [0.021, 0.22], [0.037, 0.16], [0.061, 0.10]].forEach(([at, gain], i) => {
        const index = Math.min(length - 1, Math.round((at + ch * 0.0017 * (i + 1)) * rate));
        data[index] += gain * (ch ? (i % 2 ? -1 : 1) : 1);
      });
    }
    return buffer;
  }

  function makeNoise(ctx) {
    // 하나의 긴 버퍼에서 매 타격마다 다른 구간을 읽어 반복되는 클릭음을 없앤다.
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.19));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x6d2b79f5;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = seed / 0x100000000 * 2 - 1;
    }
    return buffer;
  }

  function nextVoiceRandom(audio) {
    // 타격마다 달라지는 질감은 유지하되, 오프라인 품질 검사는 재현 가능하게 한다.
    audio._voiceSeed = ((audio._voiceSeed || 0x1234abcd) * 1664525 + 1013904223) >>> 0;
    return audio._voiceSeed / 0x100000000;
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
      convolver.buffer = makeIR(ctx, 1.35, 3.6);
      const wet = ctx.createGain(); wet.gain.value = 0.13;
      const preDelay = ctx.createDelay(0.06); preDelay.delayTime.value = 0.018;
      const roomHighpass = ctx.createBiquadFilter(); roomHighpass.type = "highpass"; roomHighpass.frequency.value = 170;
      const roomLowpass = ctx.createBiquadFilter(); roomLowpass.type = "lowpass"; roomLowpass.frequency.value = 6200;
      bus.connect(wet); wet.connect(preDelay); preDelay.connect(convolver); convolver.connect(roomHighpass); roomHighpass.connect(roomLowpass); roomLowpass.connect(master);

      // 타격 잡음 버퍼는 한 번만 만들고 각 보이스가 다른 구간을 읽는다.
      const noise = makeNoise(ctx);

      // 카운트다운 틱은 극히 짧아 리미터를 거치면 너무 작아진다.
      // 전용 게인을 써도 음량·음소거는 마스터와 똑같이 적용한다.
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
      [this.master, this.sfx].forEach((n) => n?.gain.setTargetAtTime(g, t, 0.015));
    },

    /** 텅 하나를 친다. velocity 0~1, pan -0.5~0.5, when = ctx 시각(생략 시 즉시) */
    playNote(noteId, { velocity = 1, pan = 0, when } = {}) {
      const ctx = this.ctx, info = NOTE[noteId];
      if (!ctx || !info) return null;
      const now = Math.max(when ?? ctx.currentTime, ctx.currentTime);
      const vel = clamp(Number(velocity) || 0, 0.05, 1);

      // ② 같은 텅을 다시 치면 이전 울림을 빠르게 줄인다(실제 텅도 다시 치면 진동이 새로 시작됨)
      this.voices.filter((v) => v.noteId === noteId && v.endAt > now).forEach((v) => this.release(v, now, 0.04));
      // ① 보이스 수 제한: 가장 오래된 것부터 정리
      this.voices = this.voices.filter((v) => v.endAt > now);
      while (this.voices.length >= MAX_VOICES) this.release(this.voices.shift(), now, 0.03);

      // 낮은 텅은 길고 포근하게, 높은 텅은 짧고 맑게. 짧은 타격은 속도와 함께 밝아진다.
      const decay = Math.max(2.45, 5.25 - (info.midi - 52) * 0.10);
      const nyquist = ctx.sampleRate * 0.5;
      const variation = nextVoiceRandom(this) * 2 - 1;
      const voice = ctx.createGain();
      voice.gain.setValueAtTime(0.0001, now);
      voice.gain.exponentialRampToValueAtTime(0.78 * (0.38 + 0.62 * vel), now + 0.0055);
      voice.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass"; lowpass.Q.value = 0.7;
      // 약하게 치면 포근하고, 세게 치면 막 튀어나온 금속성 모드가 더 들린다.
      const brightCutoff = Math.min(nyquist * 0.43, Math.max(1250, info.freq * (5.5 + 10.5 * vel)));
      lowpass.frequency.setValueAtTime(brightCutoff, now);
      lowpass.frequency.exponentialRampToValueAtTime(Math.max(360, info.freq * 2.05), now + Math.min(decay, 1.6));

      // 공명통의 아주 좁은 부스트가 저음의 몸통을 살리고, 필터가 차가운 고역을 부드럽게 정리한다.
      const body = ctx.createBiquadFilter();
      body.type = "peaking"; body.frequency.value = Math.min(nyquist * 0.42, info.freq * 1.015);
      body.Q.value = 1.35; body.gain.value = 1.9;

      let out = lowpass;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-0.5, Math.min(0.5, pan));
        lowpass.connect(p); out = p;
      }
      out.connect(this.bus);
      // 감쇠(choke) 전용 게인: 엔벨로프 자동화와 충돌하지 않게 별도 노드에서 끈다
      const choke = ctx.createGain();
      voice.connect(choke).connect(body).connect(lowpass);

      const oscs = STEEL_MODES.flatMap((mode, i) => {
        const frequency = info.freq * mode.ratio;
        // 모바일의 저샘플레이트 환경에서는 나이퀴스트 근처 모드를 만들지 않는다.
        if (frequency >= nyquist * 0.42) return [];
        const o = ctx.createOscillator();
        o.type = "sine";
        const bloomCents = (4.5 + 7.5 * vel) * mode.bloom + variation * (0.9 + i * 0.35);
        o.frequency.setValueAtTime(frequency * Math.pow(2, bloomCents / 1200), now);
        // 처음 몇십 ms의 높은 피치가 안정되며 강철판이 자리 잡는 느낌을 만든다.
        o.frequency.linearRampToValueAtTime(frequency, now + 0.038 + i * 0.006);
        const pg = ctx.createGain();
        // 고차 공진은 강한 타격에서 훨씬 또렷해야 말렛의 세기가 귀에 느껴진다.
        const upperEnergy = i === 0 ? 1 : (0.26 + 0.74 * vel);
        const modeGain = mode.gain * upperEnergy;
        pg.gain.setValueAtTime(modeGain, now);
        const modeDecay = i === 0 ? decay : Math.max(0.07, decay * mode.decay);
        if (i > 0) pg.gain.exponentialRampToValueAtTime(0.0001, now + modeDecay);
        o.connect(pg).connect(voice);
        o.start(now); o.stop(now + modeDecay + 0.08);
        return o;
      });

      const src = ctx.createBufferSource();                 // 다른 부분을 쓰는 말렛 타격 잡음
      src.buffer = this.noise;
      src.playbackRate.setValueAtTime(0.94 + variation * 0.05, now);
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 720 + 820 * vel;
      const strikeTone = ctx.createBiquadFilter(); strikeTone.type = "bandpass";
      strikeTone.frequency.value = Math.min(nyquist * 0.38, 1650 + 4300 * vel + info.freq * 1.25);
      strikeTone.Q.value = 0.62;
      const ng = ctx.createGain();
      const strikeDuration = 0.026 + 0.052 * vel;
      ng.gain.setValueAtTime(0.006 + 0.042 * Math.pow(vel, 1.35), now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + strikeDuration);
      src.connect(hp).connect(strikeTone).connect(ng).connect(voice);
      const maxOffset = Math.max(0, this.noise.duration - strikeDuration - 0.002);
      src.start(now, nextVoiceRandom(this) * maxOffset, strikeDuration);
      src.stop(now + strikeDuration + 0.01);

      const v = { noteId, choke, oscs: [...oscs, src], modalCount: oscs.length, endAt: now + decay + 0.08 };
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
