/* js/songs.js — 곡 데이터와 숫자 악보 파서(순수 함수). 부록 C.
   토큰: [.]?[0-7]['] + 길이기호   (없음)=1박  _=0.5박  *=1.5박  -=1박씩 추가(5- = 2박, 5--- = 4박)  0=쉼표  |=마디선 */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  const NUM_TO_NOTE = {
    ".3": "E3", ".4": "F3", ".5": "G3", ".6": "A3", ".7": "B3",
    "1": "C4", "2": "D4", "3": "E4", "4": "F4", "5": "G4", "6": "A4", "7": "B4",
    "1'": "C5", "2'": "D5", "3'": "E5",
  };

  function parseSong(src) {
    const events = [];
    const bars = [[]];
    for (const tok of src.trim().split(/\s+/)) {
      if (tok === "|") { bars.push([]); continue; }
      const m = /^(\.?)([0-7])(')?(_|\*)?(-*)$/.exec(tok);
      if (!m) throw new Error(`알 수 없는 토큰: "${tok}"`);
      const [, low, digit, high, mod, dashes] = m;
      if (low && high) throw new Error(`낮은음·높은음 표시가 동시에 있음: "${tok}"`);
      let beats = mod === "_" ? 0.5 : mod === "*" ? 1.5 : 1;
      beats += dashes.length;
      let note = null;
      if (digit !== "0") {
        note = NUM_TO_NOTE[`${low}${digit}${high || ""}`];
        if (!note) throw new Error(`15키 텅드럼(E3~E5)에 없는 음: "${tok}"`);
      }
      const ev = { note, beats, token: tok };
      events.push(ev);
      bars[bars.length - 1].push(ev);
    }
    return { events, bars };
  }

  // 마디마다 박 수가 meter와 맞는지 검사. 못갖춘마디(pickup)는 첫 마디 + 마지막 마디 = meter
  function validateSong(song) {
    const errors = [];
    let parsed;
    try { parsed = parseSong(song.notes); } catch (e) { return [e.message]; }
    const sums = parsed.bars.map((b) => b.reduce((a, e) => a + e.beats, 0));
    sums.forEach((s, i) => {
      const isFirst = i === 0, isLast = i === sums.length - 1;
      if (isFirst && song.pickup) { if (Math.abs(s - song.pickup) > 1e-9) errors.push(`못갖춘마디 ${s}박 ≠ pickup ${song.pickup}`); return; }
      const expect = isLast && song.pickup ? song.meter - song.pickup : song.meter;
      if (Math.abs(s - expect) > 1e-9 && !(isLast && Math.abs(s - song.meter) < 1e-9)) errors.push(`${i + 1}마디: ${s}박 (기대 ${expect}박)`);
    });
    return errors;
  }

  // 모두 퍼블릭 도메인 선율. 가사는 싣지 않는다.
  const SONGS = [
    { id: "scale15", title: "15음 음계 오르내리기", meter: 4, bpm: 100, level: 1,
      notes: ".3 .4 .5 .6 | .7 1 2 3 | 4 5 6 7 | 1' 2' 3'- | 3' 2' 1' 7 | 6 5 4 3 | 2 1 .7 .6 | .5 .4 .3-" },
    { id: "twinkle", title: "작은 별", meter: 4, bpm: 96, level: 1, origin: "프랑스 민요",
      notes: "1 1 5 5 | 6 6 5- | 4 4 3 3 | 2 2 1- | 5 5 4 4 | 3 3 2- | 5 5 4 4 | 3 3 2- | 1 1 5 5 | 6 6 5- | 4 4 3 3 | 2 2 1-" },
    { id: "airplane", title: "비행기", meter: 4, bpm: 100, level: 1, origin: "미국 민요 'Mary Had a Little Lamb' 선율",
      notes: "3 2 1 2 | 3 3 3- | 2 2 2- | 3 5 5- | 3 2 1 2 | 3 3 3- | 2 2 3 2 | 1---" },
    { id: "london", title: "런던 다리", meter: 4, bpm: 100, level: 2, origin: "영국 전래 동요",
      notes: "5* 6_ 5 4 | 3 4 5- | 2 3 4- | 3 4 5- | 5* 6_ 5 4 | 3 4 5- | 2- 5- | 3 1--" },
    { id: "ode", title: "환희의 송가", meter: 4, bpm: 100, level: 2, origin: "베토벤 교향곡 9번",
      notes: "3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3* 2_ 2- | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2* 1_ 1- | 2 2 3 1 | 2 3_ 4_ 3 1 | 2 3_ 4_ 3 2 | 1 2 .5- | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2* 1_ 1-" },
    { id: "birthday", title: "생일 축하합니다", meter: 3, pickup: 1, bpm: 90, level: 2, origin: "'Happy Birthday to You' 선율",
      notes: ".5_ .5_ | .6 .5 1 | .7- .5_ .5_ | .6 .5 2 | 1- .5_ .5_ | 5 3 1 | .7 .6 4_ 4_ | 3 1 2 | 1-" },
    { id: "jingle", title: "징글벨 (후렴)", meter: 4, bpm: 112, level: 3, origin: "J. Pierpont 1857",
      notes: "3 3 3- | 3 3 3- | 3 5 1* 2_ | 3--- | 4 4 4* 4_ | 4 3 3 3_ 3_ | 3 2 2 3 | 2- 5- | 3 3 3- | 3 3 3- | 3 5 1* 2_ | 3--- | 4 4 4* 4_ | 4 3 3 3_ 3_ | 5 5 4 2 | 1---" },
  ];

  TDG.songs = { NUM_TO_NOTE, parseSong, validateSong, SONGS };
})();
