# 텅드럼 두더지잡기(Tonguedrum_Game) 개선·보완 바이브코딩 프롬프트

| 항목 | 내용 |
|---|---|
| 대상 | https://kimyounggaur.github.io/Tonguedrum_Game/ |
| 저장소 | github.com/kimyounggaur/Tonguedrum_Game — `main` 최신 커밋 `1bae5d7` (2026-05-21) |
| 분석일 | 2026-09-23 |
| 분석 범위 | `index.html` 64줄 · `style.css` 471줄 · `game.js` 505줄 전체 정독, 에셋 6개(이미지·오디오) 분석, 커밋 18개 이력 |
| 실측 | 헤드리스 Chromium으로 ① 9개 화면 크기 정렬 측정 ② 반응속도별 봇 자동 플레이 7판 ③ CPU 4배 감속 프레임 측정 ④ 3G/4G 로딩(LCP) ⑤ axe 접근성 검사 ⑥ 탭 동결(백그라운드) 테스트 ⑦ 오디오 오프라인 렌더링 ⑧ 텅 숫자 라벨 이미지 판독 ⑨ 서비스워커 오프라인 동작 ⑩ 순수 로직 131개 자동 검사(Node) |
| 참고 | 형제 앱 **Tonguedrum_Play** (15키 E3~E5 C Major 음 데이터·음색 합성 코드) |
| 쓰는 법 | Claude Code · Codex · Cursor 등 어떤 AI 코딩 도구에도 그대로 붙여 넣도록 작성 |

> 이 문서의 수치는 전부 실제로 측정한 값입니다. 문서에 넣은 참조 코드(스테이지 비율 CSS, 일시정지, reduced-motion, 망치 수정, 그림자 레이어, 글리프 SVG, 이미지·아이콘 생성 스크립트, 음원 엔진, 곡 파서, 텅 판정, 키 매핑, 두더지 스케줄러·점수, 서비스워커, 검사 스크립트 4종)는 작성 중에 실제로 실행해 검증했습니다. Phase 3~9의 화면 구성(모드 선택·설정 창·결과 화면 등)은 동작 명세이고, 그 코드는 AI 도구가 작성합니다. 그래서 모든 Phase 끝에 `?selftest=1` 자가진단과 사람이 눈으로 볼 완료 기준을 붙였습니다.

---

## 목차

- [0. 먼저 읽기](#0-먼저-읽기)
- [1. 현행 앱 분석](#1-현행-앱-분석)
- [2. 결함 목록 D-01 ~ D-24](#2-결함-목록-d-01--d-24)
- [3. 마스터 컨텍스트 (AGENTS.md / CLAUDE.md)](#3-마스터-컨텍스트-agentsmd--claudemd)
- [Phase 0 — 작업 준비: 안전망](#phase-0--작업-준비-안전망)
- [Phase 1 — 치명 결함 수정](#phase-1--치명-결함-수정)
- [Phase 2 — 성능·에셋 경량화](#phase-2--성능에셋-경량화)
- [Phase 3 — 구조 정리와 '텅 데이터' 모델](#phase-3--구조-정리와-텅-데이터-모델)
- [Phase 4 — 진짜 텅드럼 소리](#phase-4--진짜-텅드럼-소리)
- [Phase 5 — 게임 루프 고도화](#phase-5--게임-루프-고도화)
- [Phase 6 — 음악 교육 모드](#phase-6--음악-교육-모드)
- [Phase 7 — 접근성·키보드·터치](#phase-7--접근성키보드터치)
- [Phase 8 — PWA·오프라인·공유](#phase-8--pwa오프라인공유)
- [Phase 9 — 수업 도구](#phase-9--수업-도구)
- [부록 A. 실측 데이터](#부록-a-실측-데이터)
- [부록 B. 텅 ↔ 음 매핑표와 TONGUES 데이터](#부록-b-텅--음-매핑표와-tongues-데이터)
- [부록 C. 곡 데이터 형식과 수록곡](#부록-c-곡-데이터-형식과-수록곡)
- [부록 D. 난이도 파라미터와 시뮬레이션](#부록-d-난이도-파라미터와-시뮬레이션)
- [부록 E. 검증 스크립트](#부록-e-검증-스크립트)
- [부록 F. 사람이 결정할 항목](#부록-f-사람이-결정할-항목)
- [부록 G. AI가 자주 틀리는 것](#부록-g-ai가-자주-틀리는-것)
- [부록 H. 형제 앱 Tonguedrum_Play 참고 사항](#부록-h-형제-앱-tonguedrum_play-참고-사항)

---

## 0. 먼저 읽기

### 0-1. 결론 먼저

이 앱은 작고(코드 1,040줄) 구조가 단순해서 고치기 쉽습니다. **문제는 셋, 기회는 하나**입니다.

1. **가로 화면에서 두더지가 텅을 벗어납니다 (P0).** 노트북·크롬북·데스크톱·태블릿 가로·폰 가로 6개 화면에서 두더지와 판정 영역이 그림 속 텅에서 **130~211px** 떨어져 뜹니다. 세로 폰·세로 태블릿에서만 정상(오차 0px)입니다. 원인은 CSS 한 줄(`max-height: 80vh`)입니다. 커밋 `994dad4`에서 스테이지 비율을 가로형 1536/847에서 그림의 실제 비율 3609/3505로 바로잡아 세로 화면은 정확해졌지만, 그때 남은 `max-height`가 가로 화면에서는 폭은 그대로 두고 높이만 줄여 비율을 다시 깨뜨립니다.
2. **탭을 바꾸거나 화면이 꺼져도 시간이 흐릅니다 (P0).** 페이지를 12.4초 동결했다가 돌아오면 남은 시간이 27초 → 15초로 줄어 있습니다. 일시정지 기능 자체가 없습니다.
3. **저사양 기기에서 끊깁니다 (P1).** CPU를 4배 느리게 하면 1920×947 화면에서 19.9fps, 1280×632에서 31.6fps. 장식용 `filter: drop-shadow` 두 곳만 바꾸면 60fps가 됩니다.
4. **가장 큰 기회는 소리입니다.** 지금은 어느 텅을 쳐도 똑같은 440Hz(라) 0.08초 '삑' 소리입니다. 그림의 15개 텅에는 이미 숫자 음이름(3̣ 4̣ 5̣ 6̣ 7̣ 1 2 3 4 5 6 7 1̇ 2̇ 3̇)이 인쇄돼 있고, 형제 앱 Tonguedrum_Play에는 같은 15키(E3~E5) 음원 엔진이 있습니다. 둘을 연결하면 두더지잡기가 **"텅 위치 = 음 이름 = 소리"를 몸으로 익히는 학습 게임**이 됩니다.

### 0-2. 작업 규칙

| 규칙 | 이유 |
|---|---|
| **Phase 하나 = 브랜치 하나** (`git switch -c phase-1`) | 실패하면 브랜치를 버리면 끝납니다. |
| **한 번에 프롬프트 하나** | 여러 Phase를 한꺼번에 시키면 AI가 앞 작업을 덮어씁니다. |
| **완료 기준을 통과해야 다음 Phase** | 각 Phase 끝의 체크리스트를 실제 기기(폰·노트북)에서 확인합니다. |
| **전체 재작성 금지** | §1-4의 잘 만든 부분(타이머, 판정 구조, 타격 연출)을 지킵니다. 국소 수정만 지시합니다. |
| **중단 규칙** | 같은 오류가 3번 반복되면 멈추고 브랜치를 버린 뒤 프롬프트를 더 작게 쪼개 다시 시작합니다. |
| **main 병합 = 즉시 배포** | `main`에 push하면 GitHub Actions가 1~2분 안에 사이트를 바꿉니다. 병합 전 로컬에서 확인합니다. |

### 0-3. 로드맵

| Phase | 목표 | 해결하는 결함 | 작업량 | 체감 효과 | 선행 |
|---|---|---|---|---|---|
| **0** | 안전망: 디버그 오버레이·자가진단·README | — | 작음 | 없음(기반) | — |
| **1** | 치명 결함: 정렬·일시정지·모션·망치·포커스 | D-01 D-02 D-03 D-05 D-18 (D-12 일부) | 중간 | ★★★★★ | 0 |
| **2** | 성능·에셋 경량화 | D-04 D-14 D-15 D-16 D-17 (D-20 일부) | 작음~중간 | ★★★★ | 1 |
| **3** | 구조 정리 + 텅 데이터 모델 + 보정 도구 | D-19 D-22 | 중간 | ★ (기반) | 1 |
| **4** | 진짜 텅드럼 소리 | D-06 D-08 | 중간 | ★★★★★ | 3 |
| **5** | 게임 루프: 카운트다운·난이도·콤보·결과·기록 | D-09 D-10 D-11 D-24 | 큼 | ★★★★ | 4 |
| **6** | 음악 교육 모드: 음 찾기·멜로디 두더지·따라 치기 | (기회) | 큼 | ★★★★★ | 5 |
| **7** | 접근성·키보드·터치 | D-07 D-12 D-13 | 중간 | ★★★ | 5 |
| **8** | PWA·오프라인·공유 | D-20 D-21 | 작음~중간 | ★★ | 2 |
| **9** | 수업 도구: 교사 설정·순위표·결과 카드 | (기회) | 중간 | ★★★ | 6 |

**시간이 없다면 Phase 0 → 1 → 2 → 3 → 4** 까지만 해도 "모든 화면에서 정확하고, 부드럽고, 진짜 텅드럼 소리가 나는" 게임이 됩니다. Phase 6(음악 교육 모드)은 협회 수업 도구로서 가치가 가장 큰 단계입니다.

### 0-4. 매 Phase 진행 순서

1. **(처음 한 번)** §3의 마스터 컨텍스트를 저장소 루트에 `AGENTS.md`로 저장하고, `CLAUDE.md`에는 `@AGENTS.md` 한 줄만 적습니다. (Claude Code는 CLAUDE.md, Codex·Cursor는 AGENTS.md를 자동으로 읽습니다.) **이 문서 파일도 `docs/PROMPTS.md`로 저장소에 넣습니다** — 프롬프트가 "부록 B-3 코드 그대로"처럼 이 문서의 부록을 직접 읽게 되어 있습니다. (`docs/`·`tests/`·`tools/`도 Pages에 함께 올라가지만 게임 페이지가 부르지 않으므로 학생 기기는 내려받지 않습니다.)
2. `git switch -c phase-N`
3. 해당 Phase의 **복사용 프롬프트**를 통째로 붙여 넣습니다. (프롬프트가 여러 개로 나뉜 Phase는 A → B → C 순서로 하나씩)
4. AI의 **완료 보고**를 읽고, 변경 파일이 범위를 벗어나지 않았는지 확인합니다.
5. 로컬 서버로 확인합니다: 저장소 폴더에서 `python3 -m http.server 8000` → http://localhost:8000
   - 폰 확인: 같은 와이파이에서 `http://(PC의 IP):8000`
6. `http://localhost:8000/?selftest=1` → 화면 오른쪽 위 배지가 **FAIL 0** 이어야 합니다.
7. Phase 끝의 **완료 기준** 체크리스트를 실제 기기에서 확인합니다.
8. `main`에 병합 → 1~2분 뒤 배포 사이트에서 한 번 더 확인합니다.

---

## 1. 현행 앱 분석

### 1-1. 저장소 구조

```
Tonguedrum_Game/                          배포 용량 약 640KB
├── index.html          64줄    화면 3개(시작·게임·종료), 배경 글리프 SVG, 망치 커서
├── style.css          471줄    레이아웃·HUD·두더지·타격 연출·망치·모바일·모션 감소
├── game.js            505줄    텅 슬롯 좌표 15개, 상태, 타이머, 스폰, 판정, 연출, 소리
├── assets/
│   ├── tonguedrum.png   517KB  3609×3505  캐릭터 텅드럼(15키, 텅마다 숫자 음이름 인쇄)
│   ├── mole.png          20KB    93×104
│   ├── hammer.png        26KB   231×222
│   ├── star.png          21KB   124×124
│   ├── plus10.png        11KB   136×52    "+10점" 글자 이미지
│   └── timer-tick.wav    23KB   0.24초 48kHz 모노
└── .github/workflows/pages.yml   main에 push하면 저장소 루트 전체를 Pages로 배포
```

- README·.gitignore·테스트 없음.
- 커밋 18개가 모두 2026-05-21 17:35~19:14(약 1시간 40분)에 작성됨. 작은 단위로 잘 나뉘어 있어 회귀 원인 추적이 쉽습니다.

### 1-2. 코드 지도 (`game.js`)

| 구역 | 줄 | 하는 일 | 평가 |
|---|---|---|---|
| `TONGUE_SLOTS` | 8–24 | 텅 15개 좌표(x, y %)와 판정 타원(rx 3.1, ry 5.8) | **좌표값은 정확**(비율이 맞는 화면에서 오차 0px). 음 정보 없음 |
| 게임 상수 | 27–44 | 30초, 10점, 등장 140 / 머묾 750~1200 / 퇴장 180ms, 간격 120~350ms | 양호. 난이도 개념 없음 |
| 상태 변수 | 47–56 | `gameStatus`·`score`·`activeMole` 등 전역 `let` | 단순함. 두더지 1마리 전제 |
| `init()` | 103–127 | 버튼·포인터 이벤트 연결 | `visibilitychange`·키보드 처리 없음 |
| `startGame()` / `endGame()` | 156–193 | 초기화·화면 전환·소리 | 망치 초기 위치·포커스 처리 없음 |
| `pickEndMessage()` | 195–199 | ≤50 / ≤150 / >150 세 단계 문구 | 기준이 너무 낮음 (D-09) |
| `tickTimer()` | 204–221 | `performance.now()` 기반 RAF 타이머 | 설계 좋음. 일시정지 불가 (D-02) |
| `spawnNextMole()` / `beginLeaving()` | 231–287 | 직전 슬롯 제외 랜덤 → 등장→머묾→퇴장 `setTimeout` 체인 | 동작은 정확. 규칙이 `setTimeout`에 흩어져 있어 일시정지·난이도 확장이 어려움 |
| `onStagePointerDown()` | 316–341 | 스테이지 단일 `pointerdown` → % 좌표 → 타원 판정 | 설계 좋음. 좌표 기준이 스테이지 박스라 D-01에 노출 |
| `onMoleHit()` | 343–357 | 점수·흔들림·별·+10·효과음, 420ms 뒤 퇴장 | 양호 |
| 연출 함수 4개 | 384–439 | 별 터짐·궤도 별·+10 이미지. `animationend` + 안전 타이머로 제거 | 양호 (DOM 누수 방지 이중 장치) |
| 사운드 | 444–505 | WebAudio 비프(타격 440Hz, 종료 880→660Hz) + `HTMLAudio` 틱 | 텅과 무관한 소리 (D-06), 볼륨 하드코딩 (D-08) |

### 1-3. 게임 흐름 (현행)

```
[시작 화면] ──Start!──▶ [게임 30초] ──시간 종료──▶ [결과 화면] ──다시 시작──▶ [게임]

두더지 한 마리의 일생 (항상 한 번에 1마리)
  대기 120~350ms → 올라옴 140ms → 머묾 750~1200ms → 내려감 180ms → 다음 두더지 대기
  맞히면: 흔들림·별 터짐·궤도 별·+10·삑 (420ms) → 내려감 180ms → 다음 두더지 대기
```

실측(봇 자동 플레이, 부록 A-2): 아무것도 안 치면 30초에 **19마리**(실제 머무는 시간 900~1338ms). 나오자마자 치는 완벽한 봇은 **36마리·360점**. 반응 900ms로 느리게 쳐도 170점으로 "두더지 마스터! 🏆"가 나옵니다.

### 1-4. 잘 만든 부분 — 지켜야 할 것

1. **`performance.now()` 기반 타이머** — `setInterval` 누적 오차가 없습니다.
2. **스테이지 한 곳에서 `pointerdown`을 받아 수학적으로 판정** — 마우스·터치·펜이 똑같이 동작하고 이벤트 버블링 문제가 없습니다.
3. **`track()` + `clearAllTimers()`** 로 모든 `setTimeout`을 추적 — 게임이 끝나면 잔여 타이머가 없습니다.
4. **슬롯 좌표값 자체는 정확** — 비율만 맞으면 오차 0px입니다. Phase 1 이후에도 이 값을 그대로 씁니다.
5. **타격 연출** — 흔들림 + 궤도 별 + 별 터짐이 짧고(420ms) 귀여워서 템포를 해치지 않습니다.
6. **연출 요소 제거를 `animationend` + 안전 타이머 이중으로 처리** — DOM 누수가 없습니다.
7. **직전 슬롯 제외 랜덤** — 같은 자리에 연속으로 나오지 않습니다.
8. **의존성 0·빌드 0·GitHub Pages 자동 배포** — 유지보수 비용이 매우 낮습니다.
9. **작은 커밋과 명확한 메시지** — D-01과 관련된 변경(스테이지 비율 수정)을 `994dad4` 하나로 짚어 낼 수 있었던 이유입니다.

### 1-5. 텅 15개 판독 (이 문서의 핵심 전제)

그림의 흰 글자 23개(숫자 15개 + 옥타브 점 8개)를 이미지 분석으로 찾아 슬롯과 짝지었습니다. 숫자는 윗부분이 드럼 중심을 향하도록 돌아가 있으므로, **점이 중심 쪽에 있으면 높은음, 테두리 쪽에 있으면 낮은음**입니다(가운데 텅은 똑바로 선 "3" 아래 점 = 낮은 미).

- 결과: **15키 E3~E5 C Major** — 형제 앱 Tonguedrum_Play의 15키 음 데이터와 정확히 같습니다.
- 가운데 E3에서 시작해 좌우로 지그재그로 올라가는 전형적인 텅드럼 배치입니다.
- 전체 표와 좌표는 [부록 B](#부록-b-텅--음-매핑표와-tongues-데이터).
- ⚠ 사람 확인 필요: 이 그림이 수업에서 쓰는 **실물 마레아 15키와 같은 배치인지** 강사가 한 번 확인해 주세요([부록 F](#부록-f-사람이-결정할-항목) F-1).

---

## 2. 결함 목록 D-01 ~ D-24

심각도: **P0** 게임이 제대로 안 됨 · **P1** 핵심 경험 손상 · **P2** 품질 · **P3** 정리

| ID | 심각도 | 내용 | 증거(실측) | 위치 | 해결 |
|---|---|---|---|---|---|
| **D-01** | **P0** | 가로 화면에서 두더지·판정 영역이 그림 속 텅을 벗어남 | 9개 화면 중 가로 6개에서 최대 130.5 / 170.9 / 204.6 / 211.1 / 142.0 / 151.8px 어긋남, 세로 3개는 0px (부록 A-1). 스테이지가 1200×526인데 그림은 542×526 | `style.css` 55–60(`.stage`의 `max-height: 80vh`), 441–454(모바일), `game.js` 139–140·327–329 | Phase 1 |
| **D-02** | **P0** | 탭 전환·화면 꺼짐에도 시간이 흐름, 일시정지 기능 없음 | 12.4초 동결 → 남은 시간 27초 → 15초, 상태는 계속 running | `game.js` 204–221, `visibilitychange` 처리 없음 | Phase 1 |
| **D-03** | P1 | `prefers-reduced-motion` 규칙이 무효 | `animation-duration: 50%`는 잘못된 값이라 선언이 통째로 버려짐. 모션 감소 설정에서도 배경 글리프 4.8초·드럼 1.8초·배경 5초 무한 애니메이션이 그대로 재생 | `style.css` 462–471 | Phase 1 |
| **D-04** | P1 | 저사양 기기 프레임 저하 | CPU 4배 감속: 1920×947 **19.9fps**, 1280×632 **31.6fps** → filter 애니메이션 교체 시 59.8 / 60fps | `style.css` 175–183(`.stage` drop-shadow 애니 + 안쪽 드럼 애니), 194–205(`.float-glyph` drop-shadow) | Phase 2 |
| **D-05** | P1 | 망치 상태 버그 ① 휘두르는 중 게임이 끝나면 `swinging`이 다음 판까지 남음 ② 시작 직후 망치가 화면 왼쪽 위 (-34, -100)에 걸쳐 보임 | 자가진단 재현: 종료 후·재시작 후 모두 `swinging` 잔류. 키보드(Enter)로 시작하거나 마우스를 안 움직이면 ② 발생 | `game.js` 170·181–193·362–365, `style.css` 425–426 | Phase 1 |
| **D-06** | P1 | 타격음이 텅과 무관 | 모든 텅이 440Hz 사인파 0.08초. 그림에 인쇄된 음 정보를 전혀 쓰지 않음 | `game.js` 466–479 | Phase 4 |
| **D-07** | P1 | 폰에서 두더지·판정이 너무 작고 망치가 두더지를 가림 | 390px 폰: 두더지 20×23px, 판정 타원 24×44px. 망치(82px)가 마지막으로 친 자리에 계속 떠 있음 | `style.css` 287–329·414–432 | Phase 7 |
| **D-08** | P1 | 음소거·볼륨·일시정지 버튼 없음, 틱 소리 매초 30회 | 수업 중 소리를 끌 방법이 없음. 틱은 `HTMLAudio`라 마스터 볼륨 통합 불가, 볼륨 0.42/0.58 하드코딩 | `game.js` 458–489 | Phase 4 |
| **D-09** | P2 | 결과 문구 기준이 게임 구조와 안 맞음 | ">150점 = 두더지 마스터"는 16마리. 반응 900ms 봇도 170점 마스터. 완벽 봇 360점 | `game.js` 195–199 | Phase 5 |
| **D-10** | P2 | 카운트다운 없음 | 첫 두더지가 시작 버튼 후 142~332ms 만에 등장 — 아이들은 준비 전에 놓침 | `game.js` 178 | Phase 5 |
| **D-11** | P2 | 결과 정보·기록 없음 | 적중률·놓친 수·최고 기록 없음, `localStorage` 미사용 | `game.js` 181–199 | Phase 5 |
| **D-12** | P2 | 접근성 | 시작 후·종료 후 포커스가 `BODY`로 유실, `aria-live` 0개, 시작·다시 시작 버튼 대비 **4.24:1**(18px 굵은 글씨는 4.5:1 필요), hover 3.28:1, `user-scalable=no`(axe `meta-viewport`) | `index.html` 5, `style.css` 7–8·72–87 | Phase 1·7 |
| **D-13** | P2 | 키보드로 플레이 불가 | Enter로 시작만 가능. 숫자키 등 무반응 | `game.js` 103–127 | Phase 7 |
| **D-14** | P2 | 배경 글리프(별·음표)가 찌그러짐 | `preserveAspectRatio="none"` → 1366×657에서 가로로 2.08배 늘어남 | `index.html` 23 | Phase 2 |
| **D-15** | P2 | 텅드럼 이미지 과대 | 3609×3505·517KB·디코딩 약 48MB. 실제 표시는 최대 820px 안팎. Fast 3G LCP **4.54초** | `index.html` 15·45 | Phase 2 |
| **D-16** | P2 | 효과 에셋 지연 로드 | `star.png`·`plus10.png`는 **첫 타격 순간** 요청, `timer-tick.wav`는 **시작 버튼 순간** 요청 → 첫 연출·첫 틱 지연 | `game.js` 386–388·430–431·458–464 | Phase 2 |
| **D-17** | P2 | 스프라이트 해상도 부족, "+10점"이 이미지 | 레티나(2x)에서 1.3~1.7배 확대 표시되어 흐림. "+10점" 흰 글씨 이미지는 대비가 낮고 +15·+30 같은 점수 변화를 못 보여줌 | `assets/*.png` | Phase 2 |
| **D-18** | P2 | `100vh` 사용 | iOS Safari 주소창 영역만큼 화면이 아래로 잘릴 수 있음 | `style.css` 36 | Phase 1 |
| **D-19** | P3 | `pendingTimeouts` 배열이 계속 커짐 | 10초 플레이에 27개 누적, 실행된 타이머도 지우지 않음(게임 종료 시에만 비움) | `game.js` 77–80 | Phase 3 |
| **D-20** | P3 | 파비콘·메타 설명·OG 태그·theme-color 없음 | `<head>`에 charset·viewport·title·stylesheet 4줄뿐. 카카오톡 공유 미리보기가 빈약하고 탭 아이콘이 기본 아이콘 | `index.html` 3–8 | Phase 2·8 |
| **D-21** | P3 | 오프라인 불가(PWA 아님) | 학교 와이파이가 불안정하면 수업 중단 | — | Phase 8 |
| **D-22** | P3 | README 없음, `DEBUG_HITBOX`가 코드 상수 | 보정하려면 코드를 고쳐야 함 | `game.js` 44 | Phase 0·3 |
| **D-23** | P3 | `Pretendard`를 지정만 하고 불러오지 않음 | 기기마다 글꼴이 다르게 보임 | `style.css` 12 | 부록 F-6 |
| **D-24** | P3 | 시작 화면 구성 | 제목(h1) 없음, 시작 버튼이 폰에서는 드럼 테두리와 겹치고 가로 화면에서는 드럼과 멀리 떨어짐 | `index.html` 13–19, `style.css` 90–95 | Phase 5 |

---

## 3. 마스터 컨텍스트 (AGENTS.md / CLAUDE.md)

> 저장소 루트에 아래 블록 전체를 `AGENTS.md`로 저장하세요. `CLAUDE.md`에는 `@AGENTS.md` 한 줄만 적습니다. 모든 Phase 프롬프트는 이 파일이 있다고 가정합니다.

`````markdown
# AGENTS.md — 텅드럼 두더지잡기 (Tonguedrum_Game)

## 프로젝트
- 텅드럼 캐릭터 그림의 15개 텅에서 튀어나오는 두더지를 망치로 잡는 음악 교육 미니 게임. 한국생활음악강사협회 텅드럼 수업용.
- 사용자: 초등학생~성인 수강생. 기기: 교실 크롬북·안드로이드 태블릿·아이패드·휴대폰·노트북.
- 배포: GitHub Pages https://kimyounggaur.github.io/Tonguedrum_Game/
  main에 push하면 .github/workflows/pages.yml이 저장소 루트 전체를 배포한다.
- 스택: 순수 HTML/CSS/JS. 빌드 도구·프레임워크·런타임 npm 의존성 추가 금지. (tests/ 안의 개발용 도구만 예외)
- 형제 앱: Tonguedrum_Play(같은 15키 텅드럼 연주 앱). 음 데이터와 음색은 그 앱과 같아야 한다.

## 절대 규칙
1. 좌표계
   - 텅 좌표(x, y, lx, ly, hw)는 "텅드럼 원본 이미지 3609×3505 기준 %"다.
   - #stage는 항상 이 이미지와 같은 비율(3609/3505 = 1.0297)을 유지한다. 크기 제한은 width의 min() 안에
     높이 제약을 비율로 환산해 넣는다. max-height로 높이만 줄이는 CSS는 금지(가로 화면 정렬 붕괴 D-01 재발).
   - 비율 계산에 img.naturalWidth/Height를 쓰지 않는다(srcset 적용 시 반올림 오차). 상수 DRUM_W=3609, DRUM_H=3505.
2. 타격 입력의 진입점은 하나: 포인터·키보드·테스트 봇 모두 TDG.game.strike()로 들어간다.
   (Phase 3 이전에는 onStagePointerDown 하나)
3. 게임 규칙(등장·퇴장·종료)의 시간은 "일시정지 시간을 뺀 게임 시계" 하나로 계산한다. 게임 규칙을
   setTimeout으로 예약하지 않는다(Phase 5부터). 연출용 짧은 타이머만 예외.
4. 소리는 TDG.audio 하나로만 낸다. new Audio()·HTMLAudioElement 금지. 모든 소리는 마스터 볼륨·음소거를 거친다.
   (Phase 4부터. 그 전까지는 기존 틱·효과음 코드를 그대로 둔다)
5. file://로 index.html을 직접 열어도 동작해야 한다 → <script type="module">, import, fetch() 금지.
   클래식 <script defer>를 정해진 순서로 로드하고 전역은 window.TDG 하나만 쓴다.
   (최상위 const/let은 window 속성이 아니다. 다른 파일과 공유할 값은 TDG에 명시적으로 넣는다.)
6. localStorage는 try/catch로 감싼 TDG.storage로만 접근한다. 키는 "tdg." + 이름 + 버전(예: tdg.settings.v1).
   저장이 실패해도 게임은 그대로 동작해야 한다.
7. 애니메이션은 transform·opacity만 쓴다. filter(drop-shadow·blur)를 애니메이션하거나,
   애니메이션되는 요소의 조상에 filter를 걸지 않는다(저사양 20fps 문제 D-04).
8. prefers-reduced-motion: reduce 이면 장식 애니메이션(배경·글리프·드럼 숨쉬기·타이머 깜빡임·궤도 별)을 끄고,
   게임에 필요한 움직임(두더지 등장·퇴장)은 60ms 이하로 짧게 한다.
9. 음 데이터: 15키 E3~E5 C Major. NOTE 표(freq·midi·num·ko)는 Tonguedrum_Play와 같은 값.
   숫자 표기는 ".3"(낮은음), "1'"(높은음). 텅↔음 매핑은 이 게임 그림 기준 표(docs/PROMPTS.md 부록 B)만 쓴다.
   Tonguedrum_Play의 POS_15 좌표는 다른 그림용이므로 가져오지 않는다.
10. 미디어쿼리는 같은 선택자의 기본 규칙보다 파일에서 뒤에 둔다(앞에 두면 무시된다).
    style.css 맨 끝의 "가로 화면 HUD" 블록(Phase 1) 뒤에는 어떤 규칙도 추가하지 않는다. 새 규칙은 그 블록 앞에 넣는다.
11. 한국어 UI. 아이 눈높이 문구(짧고 친절한 존댓말).
12. 전체 재작성 금지. 요청 범위만 수정하고, 잘 동작하는 기존 코드는 보존한다.
13. 작업을 마치면 ① 변경 파일 목록 ② ?selftest=1 결과(PASS/KNOWN/FAIL 개수) ③ 사람이 눈으로 확인할 항목을 보고한다.

## 참고 문서
docs/PROMPTS.md — 단계별 작업 지시(Phase 0~9)·참조 코드·실측 데이터·결정 사항(부록 A~H).
프롬프트에 "부록 X"라고 나오면 이 파일의 해당 부록을 읽는다.

## 지킬 것 (잘 만든 부분)
performance.now() 기반 시간 · 스테이지 단일 pointerdown 판정 · 타이머 추적/정리 ·
타격 연출(흔들림·궤도 별·별 터짐 420ms) · 직전 텅 제외 랜덤 · animationend + 안전 타이머 이중 제거

## 테스트가 의존하는 DOM 계약 (이름 변경 금지)
#start-screen #game-screen #end-screen #start-btn #restart-btn #stage "#stage img.tonguedrum"
.mole-slot[data-tongue-id] (Phase 3 이전은 data-slot-id) .mole #timer-value #score-value #pause-btn #hammer-cursor
#tongue-layer (Phase 3) · #mute-btn (Phase 4) · #countdown (Phase 5)

## URL 파라미터
?debug=1 판정 영역·음 라벨·FPS 오버레이 | ?selftest=1 자가진단 | ?calib=1 텅 보정 도구 |
?seed=N 난수 고정 | ?nosw=1 서비스워커 끄기 |
교사 프리셋(Phase 9): ?mode= &level= &time= &tongues= &label= &song=

## 파일 지도 (Phase 3 이후) — 이 순서대로 <script defer>로 로드한다
index.html · style.css
js/config.js   상수(DRUM, GAME, DIFFICULTY, STARS, KEYMAP, STORAGE_KEYS)        ← 순수
js/tongues.js  NOTE, TONGUES, 텅 판정·좌표 변환·키→음·라벨 함수                 ← 순수
js/storage.js  설정·기록 저장(try/catch)
js/audio.js    텅드럼 음원 엔진 (Phase 4)
js/effects.js  타격 연출·망치·텅 레이어
js/rules.js    시드 난수(Phase 3-B) · 두더지 스케줄러·점수·별점(Phase 5)           ← 순수
js/songs.js    곡 데이터·숫자 악보 파서 (Phase 6)                                 ← 순수
js/game.js     상태 머신·게임 시계·strike·모드
js/ui.js       화면·HUD·결과·설정·오버레이
js/debug.js    ?debug ?selftest ?calib
js/main.js     초기화·이벤트 연결 (항상 마지막)
sw.js · manifest.webmanifest   오프라인 (Phase 8)
tools/make_assets.py           이미지·아이콘 생성 (Phase 2, 개발용)
tests/         개발용 검사 스크립트(배포 동작과 무관)
"순수" 파일은 로드될 때 DOM·document를 건드리지 않는다(Node의 tests/logic.mjs가 그대로 읽어 검사한다).
`````

---

## Phase 0 — 작업 준비: 안전망

| 항목 | 내용 |
|---|---|
| 목적 | 고치기 전에 "보이고, 잴 수 있게" 만든다. 게임 동작은 한 줄도 바꾸지 않는다. |
| 해결 | D-22(일부) — 이후 모든 Phase의 검증 도구 |
| 선행 | `AGENTS.md` 저장(§0-4 1단계) |
| 작업량 | 작음 (AI 세션 1회) |

### 복사용 프롬프트 — Phase 0

`````
[Phase 0 — 안전망] AGENTS.md를 먼저 읽고 규칙을 따른다.
이번 작업은 도구와 문서만 추가한다. 게임 규칙·수치·레이아웃은 바꾸지 않는다.

[작업 1] js/debug.js 새 파일 + 연결
- index.html에서 game.js 바로 다음 줄에 <script src="js/debug.js" defer></script> 를 넣는다.
  (game.js의 최상위 const/let/function은 같은 전역 스코프라서 debug.js에서 이름으로 바로 접근할 수 있다.
   예: TONGUE_SLOTS, gameStatus, startGame, endGame. window.TONGUE_SLOTS 로는 접근되지 않으니 주의.)
- URL 파라미터가 없으면 debug.js는 아무것도 하지 않는다(함수 정의만).

[작업 2] ?debug=1 오버레이
a) 모든 .mole-slot에 기존 .debug 클래스를 붙여 판정 영역과 슬롯 id를 보이게 한다.
   game.js의 DEBUG_HITBOX 상수와 buildSlots()의 관련 코드는 지우고 이 기능으로 대체한다.
b) 게임 화면의 #stage 위에 두 박스를 그린다(pointer-events: none):
   - 파랑 점선 = #stage의 getBoundingClientRect()
   - 초록 점선 = 그림이 실제로 그려진 영역. object-fit: contain 계산으로 구하고
     비율은 상수 3609/3505를 쓴다(naturalWidth 금지).
   두 박스의 가로 폭 차이가 0.5%를 넘으면 화면 위쪽 가운데에 "⚠ 스테이지 비율 불일치 (±n.n%)" 배지를 띄운다.
   창 크기가 바뀌면 다시 계산한다.
c) 화면 왼쪽 아래에 작은 상태 표시: FPS(최근 60프레임 평균), gameStatus, 두더지 상태.
d) 스테이지 pointerdown마다 스테이지 기준 % 좌표를 console.log 한다(소수 둘째 자리).

[작업 3] ?selftest=1 자가진단
- 작은 러너를 만든다:
    const TDG = (window.TDG = window.TDG || {});
    TDG.selftest = { add(id, name, fn, { known } = {}), run() }
  fn은 동기/비동기 모두 허용. true(또는 undefined)면 PASS, false·예외면 FAIL,
  "skip"을 돌려주면 SKIP(회색, 합계에서 제외 — 그 기기에서 검사할 수 없는 항목용).
  known: "D-01" 처럼 알려진 결함이면 실패 시 FAIL 대신 KNOWN(주황).
  known인데 통과하면 "PASS — known 표시를 지우세요"라고 표시한다.
- 결과: console.table + 화면 오른쪽 위 배지 "SELFTEST ✔9 ◐2 ✖0". 배지를 누르면 목록이 펼쳐진다.
- 텅드럼 이미지 로드가 끝난 뒤(img.decode()) 실행하고, 테스트 후에는 반드시 시작 화면·IDLE 상태로 되돌린다.
- 러너는 시작할 때 localStorage에서 "tdg."로 시작하는 키를 모두 백업하고, 끝나면(try/finally) 원래대로 되돌린다
  (자가진단이 실제 기록·설정·순위표를 바꾸지 않게).
- 이번 Phase의 테스트:
  T01 TONGUE_SLOTS가 15개이고 id가 모두 다르다
  T02 모든 슬롯의 x·y가 0~100, rx·ry > 0
  T03 게임 화면에서 #stage의 (폭/높이)와 3609/3505의 차이가 0.5% 이내 ........ known "D-01"
  T04 CSSOM에서 prefers-reduced-motion 규칙 안에 animation 관련 선언이 실제로 존재 ... known "D-03"
      (document.styleSheets → CSSMediaRule → cssText에 "animation"이 들어 있는지)
  T05 startGame() → 스테이지에 pointerdown 1회 → 즉시 endGame() → 400ms 뒤
      #hammer-cursor에 swinging 클래스가 없다 ................................ known "D-05"
  T06 게임 중 document.hidden을 true로 흉내 내고 visibilitychange를 보내면
      gameStatus가 "paused"가 된다 ........................................... known "D-02"
      (document.hidden 과 document.visibilityState 둘 다 Object.defineProperty(…, { configurable: true, get: … }) 로
       hidden=true·visibilityState="hidden" 을 흉내 내고, 테스트 뒤 원래대로 되돌린다)

[작업 4] 문서·정리
- README.md: 앱 소개 한 문단 / 로컬 실행(python3 -m http.server 8000, VS Code Live Server) /
  파일 구조 / URL 파라미터(?debug=1 ?selftest=1) / 배포 방법(main push → Actions → Pages) /
  에셋 출처(칸만 만들고 "작성 필요")
- .gitignore: .DS_Store, Thumbs.db, node_modules/, tests/output/
- tests/layout.mjs: docs/PROMPTS.md 부록 E-1의 코드를 그대로 저장. tests/README.md에
  "Node 18+와 Playwright가 있을 때만 쓰는 선택 도구, 실행: node tests/layout.mjs http://localhost:8000/" 를 적는다.

[금지] game.js의 게임 로직·수치 변경, style.css 레이아웃 변경. (DEBUG_HITBOX 제거만 허용)

[완료 보고] 변경 파일 목록 / 노트북 가로 창과 폰 세로에서 각각 ?selftest=1 결과 / ?debug=1 화면 설명
`````

### 완료 기준

- [ ] `?debug=1` → 빨간 판정 영역 15개, 파랑·초록 박스가 보인다
- [ ] 노트북 가로 창에서 "⚠ 스테이지 비율 불일치" 배지가 뜬다 — D-01이 재현되는 게 정상
- [ ] 폰 세로(또는 개발자도구 390×844)에서는 배지가 없다
- [ ] `?selftest=1` → T01·T02 PASS, T03~T06 KNOWN (폰 세로에서는 T03 PASS)
- [ ] 파라미터 없이 열면 이전과 완전히 같다
- [ ] README대로 로컬 실행이 된다

### 흔한 실패

- `window.TONGUE_SLOTS`로 접근해 `undefined` → 최상위 `const`는 window 속성이 아니다. 이름으로 직접 접근한다.
- 자가진단이 게임을 시작한 채로 끝남 → 테스트 뒤 `endGame()` + `showScreen("start")` + `gameStatus = "idle"` 복구.
- KNOWN을 핑계로 테스트 조건을 느슨하게 만듦 → 조건은 "고쳐졌을 때 통과"하도록 엄격하게.

---

## Phase 1 — 치명 결함 수정

| 항목 | 내용 |
|---|---|
| 목적 | 모든 화면에서 두더지가 텅 위에 정확히 뜨고, 탭을 바꿔도 게임이 멈추고, 모션 감소·망치·포커스가 제대로 동작한다. |
| 해결 | **D-01** 정렬 · **D-02** 일시정지 · D-03 reduced-motion · D-05 망치 · D-18 100vh · D-12 일부(포커스) |
| 선행 | Phase 0 |
| 작업량 | 중간 (AI 세션 1~2회) |
| 검증 결과 | 아래 참조 코드를 실제로 적용해 9개 화면 모두 오차 0px, 12.4초 동결 후 남은 시간 그대로(27초 → 27초), reduced-motion에서 장식 애니메이션 전부 `none`, 망치 잔류 없음, 종료 후 포커스 `#restart-btn`을 확인했습니다. |

### 왜 어긋나는가 (D-01 원리)

```css
.stage { width: min(96vw, 1200px); aspect-ratio: 3609 / 3505; max-height: 80vh; }
```

`width`가 이미 정해져 있으면 `max-height`는 **높이만** 줄이고 폭은 줄이지 않습니다. 1366×657 노트북에서는 스테이지가 1200×526(가로로 긴 상자)이 되고, 그림은 `object-fit: contain` 때문에 가운데에 542×526으로 작게 그려집니다. 두더지와 판정은 넓어진 상자의 %로 계산되니 텅에서 최대 204.6px 벗어납니다. 해법은 **"높이 제한을 비율로 환산해 폭의 min() 안에 넣기"** 입니다.

### 복사용 프롬프트 — Phase 1

`````
[Phase 1 — 치명 결함 수정] AGENTS.md를 먼저 읽는다. 작업 1~6만 수행한다.
각 작업의 참조 코드는 실제로 검증된 것이다. 현재 파일에 맞춰 적용하되 값과 구조를 임의로 바꾸지 않는다.

────────────────────────────────
[작업 1] 스테이지 비율 고정 — D-01 (가장 중요)
────────────────────────────────
문제: .stage { width: min(96vw, 1200px); aspect-ratio: 3609/3505; max-height: 80vh; }
  → 폭이 고정된 채 max-height가 높이만 줄여 가로 화면에서 스테이지가 가로로 길어진다.
  → 그림은 가운데에 작게, 두더지·판정은 넓어진 스테이지 % 기준이라 텅에서 최대 211px 벗어난다.
원칙: 높이 제한을 비율로 환산해 width의 min() 안에 넣는다. max-height는 쓰지 않는다.

1) :root에 토큰 추가
   --drum-ar: 1.0297;     /* 3609 / 3505 */
   --hud-h: 76px;         /* 위쪽 HUD 줄 높이(여백 포함) */
   --hud-side-w: 160px;   /* 짧은 가로 화면의 좌우 HUD 기둥 폭 */

2) .stage 교체 — vh 줄을 먼저, dvh 줄을 뒤에(구형 브라우저는 dvh 줄을 무시하고 vh 줄을 쓴다)
   .stage {
     position: relative;
     width: min(96vw, 1200px, calc(80vh * var(--drum-ar)));
     width: min(96vw, 1200px, calc(80dvh * var(--drum-ar)));
     aspect-ratio: 3609 / 3505;
   }
   #game-screen .stage {
     width: min(96vw, 1200px, calc((100vh - 2 * var(--hud-h)) * var(--drum-ar)));
     width: min(96vw, 1200px, calc((100dvh - 2 * var(--hud-h)) * var(--drum-ar)));
   }
   (기존 #game-screen .stage 규칙의 z-index·animation 등 다른 속성은 그대로 둔다)

3) 모바일(@media (max-width: 640px)) 안의 스테이지 규칙 교체
   .stage { width: min(100vw, calc(86svh * var(--drum-ar))); }
   #game-screen .stage { width: min(100vw, calc((100svh - 2 * var(--hud-h)) * var(--drum-ar))); }

4) HUD를 "카드" 구조로 바꾼다. JS는 숫자만 바꾼다.
   <div id="timer" class="hud-card timer" role="timer" aria-label="남은 시간">
     <span class="hud-icon" aria-hidden="true">⏱</span><span class="hud-value" id="timer-value">30</span><span class="hud-unit">초</span>
   </div>
   <div id="score" class="hud-card score" aria-label="점수">
     <span class="hud-icon" aria-hidden="true">🌟</span><span class="hud-value" id="score-value">0</span><span class="hud-unit">점</span>
   </div>
   - game.js에서 timerEl.textContent / scoreEl.textContent 를 쓰던 3곳(startGame, tickTimer, updateScoreUI)을
     #timer-value / #score-value 의 textContent 갱신으로 바꾼다. 펄스·경고 클래스는 기존처럼 #timer·#score에 건다.
   - CSS:
     .hud-card { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; }
     .hud-card .hud-value { font-variant-numeric: tabular-nums; min-width: 2ch; text-align: right; }
     .hud-card .hud-unit { font-size: .6em; font-weight: 700; opacity: .8; }

5) 짧은 가로 화면(노트북·크롬북·폰 가로)은 HUD를 좌우 기둥으로.
   ⚠ 이 블록은 반드시 style.css의 맨 끝에 둔다. 기존 #game-screen .hud 규칙보다 앞에 두면
     우선순위가 같아서 무시된다(실제로 재현됨).
   /* === 가로 화면 HUD: 항상 style.css 맨 끝. 이 뒤에 규칙 추가 금지 === */
   @media (orientation: landscape) and (max-height: 820px) {
     #game-screen .hud { top: 50%; transform: translateY(-50%); padding: 0 16px; }
     #game-screen .hud-card {
       flex-direction: column; align-items: center; gap: 2px;
       width: calc(var(--hud-side-w) - 32px); padding: 10px 8px;
       font-size: clamp(22px, 3.2vh + 8px, 34px);
     }
     #game-screen .hud-card .hud-value { min-width: 0; text-align: center; }
     #game-screen .stage {
       width: min(calc(100vw - 2 * var(--hud-side-w)), 1200px, calc((100vh - 24px) * var(--drum-ar)));
       width: min(calc(100vw - 2 * var(--hud-side-w)), 1200px, calc((100dvh - 24px) * var(--drum-ar)));
     }
     .hud-actions { top: auto; bottom: 16px; left: 16px; transform: none; flex-direction: column; }
   }

6) 좌표 함수 통일: game.js에
     function drumRect() { return stageEl.getBoundingClientRect(); }  // .stage 비율 = 그림 비율이므로 곧 그림 박스
   를 만들고 onStagePointerDown·positionHammerForTouch가 이 함수만 쓰게 한다.
   비율 계산에 img.naturalWidth를 쓰지 않는다(srcset을 붙이면 1.0317처럼 반올림 오차가 생긴다).

────────────────────────────────
[작업 2] 일시정지 — D-02
────────────────────────────────
요구: ① 탭 전환·앱 전환·화면 꺼짐(visibilitychange hidden, pagehide) 시 자동 일시정지
      ② 자동 재개는 하지 않는다 — 돌아온 아이가 "계속하기"를 눌러야 재개
      ③ HUD의 ⏸ 버튼, Esc 또는 P 키로 멈춤/계속
      ④ 멈춘 동안 남은 시간·두더지·연출이 모두 멈춘다
구현(검증된 최소 패치 — Phase 5에서 게임 시계로 교체될 예정):
- GameStatus에 PAUSED: "paused" 추가. 전역 let pausedAt = 0, pausedTotal = 0; startGame()에서 둘 다 0으로.
- tickTimer의 경과 시간: performance.now() - startTime - pausedTotal
- function pauseGame(reason) {
    if (gameStatus !== GameStatus.RUNNING) return;
    gameStatus = GameStatus.PAUSED;
    pausedAt = performance.now();
    clearAllTimers();                       // 두더지 수명·연출 타이머 정리(RAF도 멈춤)
    hideAnyActiveMole(true);                // 떠 있던 두더지는 무효, 재개 후 새로 등장
    hammerEl.classList.remove("visible", "swinging");
    pauseOverlay.hidden = false;
    resumeBtn.focus({ preventScroll: true });
  }
- function resumeGame() {
    if (gameStatus !== GameStatus.PAUSED) return;
    pausedTotal += performance.now() - pausedAt;
    pausedAt = 0;
    gameStatus = GameStatus.RUNNING;
    pauseOverlay.hidden = true;
    gameScreenEl.focus({ preventScroll: true });
    rafId = requestAnimationFrame(tickTimer);
    scheduleNextMole(600);                  // 재개 직후 숨 돌릴 틈
  }
- 이벤트: document visibilitychange(hidden일 때만 pause), window pagehide → pause.
  keydown: Escape 또는 KeyP → RUNNING이면 pause, PAUSED면 resume (preventDefault).
- 마크업(#game-screen 안, 망치 이미지 앞):
  <div class="hud-actions"><button id="pause-btn" class="round-btn" type="button" aria-label="일시정지">⏸</button></div>
  <div id="pause-overlay" class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
    <div class="end-card">
      <h2 id="pause-title" class="end-title">잠깐 멈춤</h2>
      <button id="resume-btn" class="primary-btn" type="button">계속하기</button>
    </div>
  </div>
- CSS (작업 1-5의 가로 화면 블록보다 앞에 넣는다 — AGENTS.md 규칙 10):
  .hud-actions { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 30; display: flex; gap: 8px; }
  .round-btn { width: 48px; height: 48px; border-radius: 50%; border: none; background: rgba(255,255,255,.92);
               box-shadow: var(--shadow-soft); font-size: 20px; cursor: pointer; }
  .pause-overlay { position: absolute; inset: 0; z-index: 10000; display: flex; align-items: center;
                   justify-content: center; background: rgba(255,255,255,.8); cursor: auto; }
  .pause-overlay[hidden] { display: none; }
  (게임 화면은 cursor: none 이므로 오버레이에서 cursor: auto로 되살린다)

────────────────────────────────
[작업 3] prefers-reduced-motion 수정 — D-03
────────────────────────────────
문제: animation-duration: 50% 는 잘못된 값이라 선언이 통째로 버려진다. 모션 감소 사용자에게도 무한 애니메이션이 계속된다.
기존 @media (prefers-reduced-motion: reduce) 블록 전체를 아래로 교체:
  @media (prefers-reduced-motion: reduce) {
    #game-screen::before, #game-screen .stage, #game-screen .tonguedrum,
    .float-glyph, .orbit-stars, .orbit-star, .score.pulsing, .timer.warn { animation: none !important; }
    .game-ambience { display: none; }
    .mole, .mole.leaving, .hammer-cursor { transition-duration: 60ms !important; }
    .mole.hit-shake { animation: none !important; }
    .star-burst, .plus10-text { animation-duration: 200ms !important; }
  }

────────────────────────────────
[작업 4] 망치 — D-05
────────────────────────────────
a) 연타해도 매번 처음부터 휘두르고, 게임이 끝나도 swinging이 남지 않게:
   let swingTimer = null;
   function swingHammer() {
     clearTimeout(swingTimer);
     hammerEl.classList.remove("swinging");
     void hammerEl.offsetWidth;
     hammerEl.classList.add("swinging");
     swingTimer = setTimeout(() => hammerEl.classList.remove("swinging"), HAMMER_SWING_MS);
   }
   endGame()과 startGame()에서 hammerEl.classList.remove("swinging").
b) 시작 직후 망치가 왼쪽 위 구석(left:0, top:0)에 걸치지 않게:
   startGame(e)가 이벤트를 받게 하고(버튼 click 이벤트가 그대로 넘어온다),
   function placeHammerAtStart(e) {
     const hasPoint = e && typeof e.clientX === "number" && (e.clientX !== 0 || e.clientY !== 0);
     const r = drumRect();
     hammerEl.style.left = (hasPoint ? e.clientX : r.left + r.width / 2) + "px";
     hammerEl.style.top  = (hasPoint ? e.clientY : r.top + r.height / 2) + "px";
     hammerEl.classList.add("visible");
   }
   (키보드 Enter로 누른 버튼 click은 clientX·clientY가 0이다 → 드럼 중앙에 둔다)

────────────────────────────────
[작업 5] 포커스 — D-12 일부
────────────────────────────────
- #game-screen에 tabindex="-1". startGame() 끝에서 gameScreenEl.focus({ preventScroll: true }).
- endGame() 끝에서 restartBtn.focus({ preventScroll: true }) → 결과 화면에서 Enter로 바로 다시 시작.

────────────────────────────────
[작업 6] 100vh — D-18
────────────────────────────────
#game-container { height: 100vh; height: 100dvh; }

────────────────────────────────
[자가진단 갱신]
────────────────────────────────
- T03~T06의 known 표시를 지운다(이제 모두 PASS여야 한다).
- 추가:
  T07 일시정지 상태에서 2초 기다려도 #timer-value가 바뀌지 않는다
  T08 키보드로 시작했을 때 망치 중심이 화면 안(0 ≤ x ≤ innerWidth, 0 ≤ y ≤ innerHeight)에 있다
  T09 endGame() 직후 document.activeElement가 #restart-btn
  T10 #stage 폭/높이 비율이 창 크기를 1366×657, 390×844, 844×390으로 바꿔도 1.0297 ± 0.5%
      (window.resizeTo가 안 되는 환경이면 현재 크기만 검사하고 note에 적는다)

[완료 보고] 변경 파일 / ?selftest=1 결과(노트북 가로·폰 세로·폰 가로) / tests/layout.mjs를 돌릴 수 있으면 그 표
`````

### 완료 기준

- [ ] 노트북 가로 창: 두더지가 텅 위에 정확히 뜨고, 타이머·점수가 좌우 기둥에 있다
- [ ] 폰 세로·폰 가로·태블릿 가로·세로 모두 텅 위에 정확히 뜬다 (`?debug=1`에서 파랑·초록 박스가 겹침)
- [ ] (선택) `node tests/layout.mjs http://localhost:8000/` → **LAYOUT PASS** (9개 화면 0px)
- [ ] 게임 중 다른 탭에 갔다 오면 "잠깐 멈춤" 창이 떠 있고 남은 시간이 그대로다
- [ ] ⏸ 버튼, Esc, P로 멈추고 "계속하기"·Esc·P로 이어진다
- [ ] OS의 "동작 줄이기(애니메이션 줄이기)"를 켜면 배경·드럼이 움직이지 않는다
- [ ] Enter로 시작하면 망치가 드럼 가운데에 있다 (왼쪽 위 구석에 분홍 조각 없음)
- [ ] 휘두르는 순간 시간이 끝나도 다음 판 망치가 정상이다
- [ ] 결과 화면에서 Enter 한 번이면 다시 시작된다
- [ ] `?selftest=1` → FAIL 0, KNOWN 0

### 흔한 실패

- 가로 화면 미디어쿼리를 파일 앞쪽에 둬서 무시됨 → **맨 끝**으로.
- `max-height`를 "보험"으로 남겨 둠 → 다시 D-01. 스테이지에는 `max-height`가 없어야 한다.
- `dvh` 줄만 쓰고 `vh` 대체 줄을 빼먹음 → 구형 사파리에서 폭이 계산되지 않음.
- 일시정지 중에도 `setTimeout` 두더지 타이머가 살아 있어 재개 직후 두더지가 두 마리 → `clearAllTimers()` 필수.
- `visibilitychange`에서 **자동 재개**까지 구현 → 돌아오자마자 두더지를 놓친다. 재개는 사람이 누른다.
- `focus()`에 `preventScroll`을 빼서 화면이 튐.

---

## Phase 2 — 성능·에셋 경량화

| 항목 | 내용 |
|---|---|
| 목적 | 저사양 크롬북·안드로이드 태블릿에서도 60fps, 느린 학교 와이파이에서도 2초 안에 첫 화면 |
| 해결 | **D-04** 프레임 저하 · D-14 글리프 찌그러짐 · D-15 이미지 과대 · D-16 지연 로드 · D-17 "+10점" 이미지 · D-20 일부(메타·아이콘) |
| 선행 | Phase 1 |
| 작업량 | 작음~중간 (AI 세션 1회) |
| 검증 결과 | 작업 1의 그림자 레이어 방식: CPU 4배 감속에서 1280×632 **59.6fps**, 1920×947 **59.6fps** (현행 21.1~37.5fps). WebP 교체: Fast 3G LCP **4.54~4.71초 → 1.97~1.99초**, Slow 4G 1.56초 → 0.64초. 글리프 SVG 5개 모두 도형이 viewBox 안에 들어감(getBBox 검사). `tools/make_assets.py` 실행 결과 WebP 79KB·161KB, 아이콘 5종, 공유 이미지 58KB 생성 확인. (부록 A-3·A-4·A-9) |

### 복사용 프롬프트 — Phase 2

`````
[Phase 2 — 성능·에셋 경량화] AGENTS.md를 먼저 읽는다. 작업 1~7만 수행한다.
게임 규칙·판정·수치·레이아웃(Phase 1 결과)은 바꾸지 않는다.

────────────────────────────────
[작업 1] filter 애니메이션 제거 — D-04 (저사양 20fps의 원인)
────────────────────────────────
원인: #game-screen .stage 의 stage-play-pulse 가 filter: drop-shadow 값을 매 프레임 바꿔서
      드럼 그림 전체의 그림자를 매 프레임 다시 계산한다(실측: 이 애니메이션과 글리프 그림자만 없애도 21fps → 60fps).
a) style.css에서 #game-screen .stage 의 animation 줄과 @keyframes stage-play-pulse 를 지운다.
   #game-screen .stage 의 z-index: 2 는 반드시 남긴다(아래 그림자 레이어가 드럼 뒤에 깔리는 기준).
b) 대신 드럼 아래 "숨 쉬는 그림자"를 opacity·transform만으로 만든다:
     #game-screen .stage::before {
       content: ""; position: absolute; left: 18%; right: 18%; bottom: 2%; height: 10%;
       border-radius: 50%;
       background: radial-gradient(closest-side, rgba(89, 60, 120, .28), transparent);
       animation: shadow-breathe 1.8s ease-in-out infinite;
       pointer-events: none; z-index: -1;
     }
     @keyframes shadow-breathe {
       0%, 100% { opacity: .55; transform: scaleX(1); }
       50%      { opacity: .9;  transform: scaleX(1.06); }
     }
c) .float-glyph 와 .orbit-star 의 filter: drop-shadow(...) 줄을 지운다(외곽선 stroke가 있어 모양 차이는 거의 없다).
d) 드럼 숨쉬기(drum-play-bounce)를 두더지 층에도 똑같이 건다.
   지금은 그림만 1.2% 커졌다 작아져서 가장자리 텅에서 두더지가 최대 약 3px(데스크톱) 어긋난다.
     #game-screen .tonguedrum,
     #game-screen #mole-container { animation: drum-play-bounce 1.8s ease-in-out infinite; }
   (두 요소는 같은 순간에 보이기 시작하므로 박자가 맞는다)
e) Phase 1에서 만든 prefers-reduced-motion 블록의 animation: none 목록에
   #game-screen .stage::before, #game-screen #mole-container 를 추가한다.

────────────────────────────────
[작업 2] 배경 별·음표 찌그러짐 — D-14
────────────────────────────────
원인: <svg class="game-ambience" viewBox="0 0 100 100" preserveAspectRatio="none"> 하나에 5개를 그려서
      가로 화면에서 도형이 가로로 최대 2.08배 늘어난다.
a) index.html의 <svg class="game-ambience" ...>…</svg> 전체를 아래로 교체:
     <div class="game-ambience" aria-hidden="true">
       <svg class="float-glyph" style="--x:14%;--y:78%;--s:1.1;--d:-0.6s" viewBox="-4 -4 8 8"><path d="M0 -3.5 0.9 -0.9 3.7 -0.9 1.4 0.7 2.2 3.4 0 1.8 -2.2 3.4 -1.4 0.7 -3.7 -0.9 -0.9 -0.9Z"/></svg>
       <svg class="float-glyph pink" style="--x:82%;--y:24%;--s:.9;--d:-2.1s" viewBox="-4 -4 8 8"><path d="M0 -3.5 0.9 -0.9 3.7 -0.9 1.4 0.7 2.2 3.4 0 1.8 -2.2 3.4 -1.4 0.7 -3.7 -0.9 -0.9 -0.9Z"/></svg>
       <svg class="float-glyph blue" style="--x:74%;--y:82%;--s:.75;--d:-3.2s" viewBox="-4 -4 8 8"><path d="M0 -3.5 0.9 -0.9 3.7 -0.9 1.4 0.7 2.2 3.4 0 1.8 -2.2 3.4 -1.4 0.7 -3.7 -0.9 -0.9 -0.9Z"/></svg>
       <svg class="float-glyph blue" style="--x:22%;--y:32%;--s:.85;--d:-1.4s" viewBox="-6 -9 11 15"><path d="M0 -5v7.2a2.7 2.7 0 1 1-1.1-2.1v-8.4h1.1l4 1.3v2.1Z"/></svg>
       <svg class="float-glyph" style="--x:88%;--y:56%;--s:.7;--d:-3.8s" viewBox="-6 -9 11 15"><path d="M0 -5v7.2a2.7 2.7 0 1 1-1.1-2.1v-8.4h1.1l4 1.3v2.1Z"/></svg>
     </div>
b) style.css의 .game-ambience · .float-glyph · .glyph-a/.glyph-b/.glyph-c/.note-a/.note-b · @keyframes float-glyph 를 아래로 교체:
     .game-ambience { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
     .float-glyph {
       position: absolute; left: var(--x); top: var(--y);
       width: clamp(28px, 5vmin, 60px); height: auto; aspect-ratio: 1;
       fill: rgba(255, 226, 91, .9); stroke: rgba(113, 73, 135, .32); stroke-width: .35;
       transform: translate(-50%, -50%) scale(var(--s));
       animation: float-glyph 4.8s ease-in-out infinite; animation-delay: var(--d);
     }
     .float-glyph.pink { fill: rgba(255, 153, 218, .86); }
     .float-glyph.blue { fill: rgba(111, 176, 247, .8); }
     @keyframes float-glyph {
       0%   { opacity: 0;   transform: translate(-50%, calc(-50% + 4vmin)) scale(var(--s)) rotate(-10deg); }
       18%  { opacity: .95; }
       50%  {               transform: translate(-50%, calc(-50% - 3vmin)) scale(var(--s)) rotate(10deg); }
       82%  { opacity: .85; }
       100% { opacity: 0;   transform: translate(-50%, calc(-50% - 9vmin)) scale(var(--s)) rotate(22deg); }
     }
   (모바일 미디어쿼리의 .game-ambience { display: none; } 은 그대로 둔다)

────────────────────────────────
[작업 3] 텅드럼 이미지 경량화 — D-15 (517KB PNG, 디코딩 48MB)
────────────────────────────────
a) tools/make_assets.py 를 docs/PROMPTS.md 부록 E-5 코드 그대로 만들고 실행한다:
     pip install pillow        (한 번만)
     python3 tools/make_assets.py
   → assets/tonguedrum-1024.webp(약 79KB) · tonguedrum-2048.webp(약 161KB) ·
     assets/icons/ 아이콘 5종 · assets/og-image.jpg 가 생긴다.
   (파이썬을 쓸 수 없으면 실행하지 말고 "사람이 squoosh.app에서 만들 것"이라고 보고한다)
b) index.html의 <img class="tonguedrum"> 두 곳(시작 화면·게임 화면)을 모두 바꾼다:
     <img class="tonguedrum" src="assets/tonguedrum-2048.webp"
          srcset="assets/tonguedrum-1024.webp 1024w, assets/tonguedrum-2048.webp 2048w"
          sizes="(max-width: 640px) 100vw, 820px"
          width="3609" height="3505" decoding="async" alt="텅드럼 캐릭터">
   시작 화면 쪽에만 fetchpriority="high" 를 추가한다.
c) 원본 assets/tonguedrum.png 는 지우지 않는다(보정·재생성용 원본). 페이지는 더 이상 이 파일을 부르지 않는다.
d) 비율 계산에 naturalWidth를 쓰는 코드가 없는지 다시 확인한다(1024는 1024×994라서 비율이 1.0302로 달라진다).

────────────────────────────────
[작업 4] 효과 에셋 미리 불러오기 — D-16
────────────────────────────────
지금은 star.png가 "첫 타격 순간", timer-tick.wav가 "시작 버튼 순간"에 처음 요청된다.
init()에 추가:
  function preloadImages(srcs) {
    srcs.forEach((src) => { const img = new Image(); img.src = src; if (img.decode) img.decode().catch(() => {}); });
  }
  preloadImages(["assets/star.png", "assets/hammer.png", "assets/mole.png"]);
  ensureTimerTickAudio();   // 파일만 미리 받는다(재생 안 함). Phase 4에서 합성 틱으로 바뀌면 이 줄은 지운다.

────────────────────────────────
[작업 5] "+10점" 이미지를 글자로 — D-17 일부
────────────────────────────────
a) spawnPlus10(clientX, clientY) 를 spawnScorePop(clientX, clientY, points) 로 바꾼다.
   <img src="plus10.png"> 대신 <div class="score-pop" aria-hidden="true">+10</div> (textContent = "+" + points).
   onMoleHit 에서는 spawnScorePop(clientX, clientY, SCORE_PER_HIT) 로 부른다.
b) CSS(.plus10-text 규칙은 지운다. @keyframes plus10-float 는 그대로 재사용):
     .score-pop {
       position: fixed; z-index: 9998; pointer-events: none; white-space: nowrap;
       font: 900 clamp(22px, 3.2vw, 40px)/1 var(--font-display); color: #fff;
       text-shadow: 0 2px 0 #C72C63, 2px 0 0 #C72C63, -2px 0 0 #C72C63, 0 -2px 0 #C72C63,
                    2px 2px 0 #C72C63, -2px 2px 0 #C72C63, 2px -2px 0 #C72C63, -2px -2px 0 #C72C63,
                    0 4px 8px rgba(0, 0, 0, .25);
       animation: plus10-float 500ms ease-out forwards;
     }
c) ".plus10-text" 를 쓰던 곳(hideAnyActiveMole 의 선택자, reduced-motion 블록)을 모두 ".score-pop" 으로 바꾼다.
d) assets/plus10.png 는 더 이상 쓰지 않으므로 지운다.

────────────────────────────────
[작업 6] 고해상도 스프라이트 — D-17 (사람이 파일을 넣은 경우에만)
────────────────────────────────
assets/mole@2x.png, hammer@2x.png, star@2x.png 가 저장소에 있으면:
  - buildSlots()의 mole 이미지: mole.srcset = "assets/mole.png 1x, assets/mole@2x.png 2x"
  - index.html의 망치 <img>: srcset="assets/hammer.png 1x, assets/hammer@2x.png 2x"
  - spawnStarBurst(): star.srcset = "assets/star.png 1x, assets/star@2x.png 2x"
파일이 없으면 이 작업은 건너뛰고 완료 보고에 "@2x 파일 없음 — 부록 F-9"라고 적는다.

────────────────────────────────
[작업 7] <head> 메타·아이콘 — D-20 일부
────────────────────────────────
<title> 아래에 추가:
  <meta name="description" content="텅드럼 그림의 15개 텅에서 튀어나오는 두더지를 잡으며 텅 위치와 음을 익히는 음악 게임">
  <meta name="theme-color" content="#FFFFFF">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png">
  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:title" content="텅드럼 두더지잡기">
  <meta property="og:description" content="텅에서 튀어나오는 두더지를 잡으며 텅드럼 음을 익혀요!">
  <meta property="og:image" content="https://kimyounggaur.github.io/Tonguedrum_Game/assets/og-image.jpg">
  <meta property="og:url" content="https://kimyounggaur.github.io/Tonguedrum_Game/">
(og:image 는 반드시 https로 시작하는 절대 주소. 상대 주소면 카카오톡 미리보기가 안 뜬다)

────────────────────────────────
[자가진단 추가]
────────────────────────────────
  T11 게임 화면에서 document.getAnimations() 중 키프레임(effect.getKeyframes())에 filter 속성이 있는 것이 0개
  T12 "#stage img.tonguedrum" 의 currentSrc 가 ".webp" 로 끝난다
  T13 .float-glyph 5개 모두 getBoundingClientRect() 가로/세로가 0.9~1.1 (찌그러지지 않음)
      — .game-ambience 가 display:none 이면(폭 640px 이하·모션 감소) "skip"
  T14 게임 시작 직후(첫 타격 전) performance.getEntriesByType("resource") 에 star.png 가 있다

[금지] 게임 규칙·판정·수치 변경. 새 라이브러리·CDN 추가.
[완료 보고] 변경·추가·삭제 파일 목록 / 생성된 이미지 파일 크기 / ?selftest=1 결과 / 작업 6을 했는지
`````

### 완료 기준

- [ ] 크롬 개발자도구 → Performance → CPU 4× slowdown → 게임 화면 5초 녹화: 프레임 막대가 대부분 60fps 선 근처
- [ ] Network 탭(Disable cache 켬): 첫 화면에서 `tonguedrum-*.webp` 하나만 받고 `tonguedrum.png`는 받지 않는다
- [ ] 노트북 가로 창에서 배경 별·음표가 동그랗게 보인다(가로로 늘어나지 않음)
- [ ] 드럼 아래 그림자가 은은하게 숨 쉬고, 두더지가 드럼과 함께 움직인다
- [ ] 첫 두더지를 칠 때 별 연출이 바로 뜬다
- [ ] "+10"이 선명한 글자로 뜬다(레티나에서도 흐리지 않음)
- [ ] 브라우저 탭에 드럼 아이콘이 보인다
- [ ] (배포 후) 카카오톡에 링크를 보내면 드럼 그림 미리보기가 뜬다
- [ ] `?selftest=1` → FAIL 0

### 흔한 실패

- `#game-screen .stage`의 `z-index: 2`까지 지워서 그림자가 사라지거나 드럼 위로 올라옴.
- WebP로 바꾸면서 `<img>` 두 곳 중 한 곳만 바꿈 → 시작 화면과 게임 화면이 서로 다른 파일을 받음.
- `og:image`에 `assets/og-image.jpg` 같은 상대 주소 → 미리보기 안 뜸. 카카오톡은 미리보기를 오래 기억하므로, 고친 뒤에는 카카오 개발자 사이트의 공유 디버거에서 캐시를 지운다.
- `.plus10-text` 선택자를 남겨 두어 게임 종료 때 `+10`이 화면에 남음.
- `filter`를 지우는 김에 `.mole.hit-shake` 같은 transform 애니메이션까지 지움 → 타격 연출이 사라짐. 지우는 것은 `filter`뿐이다.

---

## Phase 3 — 구조 정리와 '텅 데이터' 모델

| 항목 | 내용 |
|---|---|
| 목적 | ① 한 파일 550줄을 역할별 파일로 나누고 ② 텅마다 "음 이름"을 붙인 데이터 모델을 만들고 ③ 판정을 "두더지 둘레 타원"에서 "텅 전체"로 넓히고 ④ 텅 좌표를 화면에서 고칠 수 있게 한다. Phase 4~9는 모두 이 구조 위에 올라간다. |
| 해결 | D-19 타이머 누적 · D-22 보정 도구 · (D-07 일부: 판정 영역 1.9배) |
| 선행 | Phase 2 |
| 작업량 | 중간 (프롬프트 3개: 3-A → 3-B → 3-C) |
| 검증 결과 | 부록 B-3 `tongues.js`로 `tests/logic.mjs` 104개 검사 통과(Phase 3 시점 범위). 텅 캡슐 판정: 15개 텅의 두더지 자리·숫자 자리·중간점 45곳 모두 자기 텅, 콧수염·눈·드럼 밖은 판정 없음. 캡슐 평균 면적은 기존 타원의 **1.88배**. 다만 캡슐만 쓰면 기존 타원 안쪽 점의 21.4%가 빗나감이 되므로 **"기존 타원 ∪ 텅 캡슐" 합집합**으로 판정한다 → 기존보다 절대 엄격해지지 않는다. |

### 3-A. 파일 분리 (동작 변화 0)

`````
[Phase 3-A — 파일 분리] AGENTS.md를 먼저 읽는다.
목표: 루트의 game.js 한 파일을 AGENTS.md "파일 지도"대로 나눈다.
게임 동작·화면·수치·문구는 한 글자도 바뀌지 않아야 한다(순수 리팩터링).

[규칙]
- 각 파일은 이 모양:
    (function () {
      "use strict";
      const TDG = (window.TDG = window.TDG || {});
      /* ... */
      TDG.effects = { ... };      // 밖으로 내보낼 것만
    })();
- <script type="module">, import/export, fetch() 금지(file://로 열어도 동작해야 한다).
- 파일 사이 호출은 TDG.* 로만. 로드되는 순간에는 앞에서 로드된 config·tongues만 읽고,
  다른 파일의 함수는 함수 안에서(실행 시점에) 부른다.
- 루트의 game.js 는 지운다. index.html 맨 아래 <script src="game.js"></script> 와
  Phase 0의 debug.js 줄을 아래 순서로 교체:
    <script src="js/config.js" defer></script>
    <script src="js/tongues.js" defer></script>
    <script src="js/storage.js" defer></script>
    <script src="js/effects.js" defer></script>
    <script src="js/game.js" defer></script>
    <script src="js/ui.js" defer></script>
    <script src="js/debug.js" defer></script>
    <script src="js/main.js" defer></script>
  (audio.js는 Phase 4, rules.js는 3-B, songs.js는 Phase 6에서 추가. 지금 사운드 함수 5개는 js/game.js 맨 아래
   "사운드(Phase 4에서 audio.js로 교체)" 구역에 그대로 둔다)

[옮기는 표]
| 지금(game.js)                                               | 옮길 곳          | 내보내는 이름 |
| TONGUE_SLOTS                                                | js/tongues.js    | TDG.TONGUE_SLOTS (3-B에서 TONGUES로 교체) |
| GameStatus, *_MS·SCORE_PER_HIT·TIMER_* 상수                  | js/config.js     | 이름은 부록 B-2와 똑같이: TDG.config.GameStatus, GAME.{durationMs, scorePerHit, hitReactionMs, hitStarMs, scorePopMs, hammerSwingMs, timerWarnSec}. 두더지 시간 상수 6개는 DIFFICULTY.normal = { enterMs: 140, visibleMs: [750, 1200], leaveMs: 180, gapMs: [120, 350] } |
| showScreen, buildSlots, 점수·타이머 숫자 표시, 결과 화면 채우기, 일시정지 창 열고 닫기 | js/ui.js | TDG.ui.{showScreen, buildSlots, setScore(n,{pulse}), setTimer(sec,{warn}), showResult({score,message}), showPause(open)} |
| swingHammer, placeHammerAtStart, positionHammerForTouch, onPointerMove, spawnStarBurst, playMoleHitReaction, spawnOrbitStars, spawnScorePop | js/effects.js | TDG.effects.{같은 이름} |
| 상태 변수, startGame, endGame, pauseGame, resumeGame, tickTimer, scheduleNextMole, spawnNextMole, beginLeaving, hideAnyActiveMole, onStagePointerDown의 판정부, onMoleHit, updateScore, pickEndMessage, track, clearAllTimers, rand/randInt, 사운드 5개 | js/game.js | TDG.game.{start(e), end(), pause(reason), resume(), onStagePointer(e), status(게터), score(게터)} |
| init()의 이벤트 연결(버튼·스테이지·키·visibilitychange·pagehide) | js/main.js | (내보내지 않음. 파일 끝에서 init 실행) |
| Phase 0의 debug.js (전역 이름으로 접근)                         | js/debug.js      | 전역 이름(TONGUE_SLOTS, gameStatus, startGame…) 대신 TDG.* 로 접근하도록 고친다 |

- js/main.js 의 실행: defer 스크립트는 문서 파싱이 끝난 뒤 순서대로 실행되므로
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
- 자가진단용 내부 접근은 TDG.game._debug 하나로만 연다:
    { get activeMole(), forceMole(id), pendingCount(), reset(), setSeed(n) }
  reset() = 타이머 정리 + 시작 화면 + IDLE. setSeed(n)의 내용은 3-B에서 채운다. (Phase 5에서 skipCountdown() 추가)

[새 파일] js/storage.js (아직 사용처 없음. Phase 4부터 씀)
    (function () {
      "use strict";
      const TDG = (window.TDG = window.TDG || {});
      function get(key, fallback) {
        try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
        catch (_) { return fallback; }          // 사생활 보호 모드·저장 공간 부족·잘못된 JSON
      }
      function set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
      }
      function remove(key) { try { localStorage.removeItem(key); } catch (_) { /* 무시 */ } }
      TDG.storage = { get, set, remove };
    })();

[확인]
- 분리 전과 똑같이 동작: ?selftest=1 결과가 분리 전과 같다(FAIL 0, T01~T14).
- 콘솔 오류 0. file://로 index.html을 직접 열어도 게임이 된다.
- 전역에 새로 생긴 이름은 TDG 하나뿐: 콘솔에서 Object.keys(window).filter(k => /^(TDG|TONGUE|game|start)/.test(k)) → ["TDG"]

[완료 보고] 새 파일별 줄 수 / 옮긴 함수 목록 / selftest 결과 / file:// 확인 결과
`````

### 3-B. 텅 데이터 모델·판정·단일 진입점

`````
[Phase 3-B — 텅 데이터와 판정] AGENTS.md와 docs/PROMPTS.md의 부록 B를 먼저 읽는다.

[작업 1] 데이터
- js/config.js 에 부록 B-2의 DRUM_W, DRUM_H, KEYMAP, SHIFT_HIGH, GAME.touchTolerance 를 추가한다.
- js/tongues.js 를 부록 B-3 코드 그대로 교체한다(NOTE·TONGUES·판정 함수).
  TONGUES의 x·y는 기존 TONGUE_SLOTS와 같은 값이다(순서만 낮은음→높은음). TDG.TONGUE_SLOTS를 쓰던 곳은 모두 TDG.TONGUES로.
- js/rules.js 를 새로 만들고 지금은 mulberry32 만 넣는다(부록 D-2의 mulberry32 함수, TDG.rules = { mulberry32 }).
  index.html에서 effects.js 다음 줄에 <script src="js/rules.js" defer></script>.

[작업 2] 슬롯 DOM
- .mole-slot 의 data-slot-id → data-tongue-id 로 바꾸고 data-note 를 추가한다. 슬롯 크기·위치 CSS는 그대로.
- 슬롯을 찾던 querySelector(`[data-slot-id=...]`)를 모두 바꾼다.

[작업 3] 텅 레이어 (Phase 4~7의 연출·힌트·보정이 모두 여기에 그린다)
- #stage 안, 드럼 <img> 다음·#mole-container 앞에:
    <svg id="tongue-layer" viewBox="0 0 3609 3505" aria-hidden="true"></svg>
    #tongue-layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  viewBox를 원본 이미지 픽셀로 잡았으므로 기본값(meet)으로도 그림과 정확히 겹친다. preserveAspectRatio="none" 금지.
- TDG.effects.tongueCapsule(t, className) → 텅 모양 캡슐 하나를 <line>으로 그려 돌려준다:
    x1 = t.x * 36.09, y1 = t.y * 35.05, x2 = t.lx * 36.09, y2 = t.ly * 35.05,
    stroke-width = 2 * t.hw * 36.09, stroke-linecap = "round"
- ?debug=1 이면 15개 캡슐을 반투명(stroke: rgba(255,0,0,.25))으로 그리고 숫자 자리(lx,ly)에 음 이름(C4 등)을 쓴다.
  Phase 0의 빨간 타원 표시(.mole-slot.debug)도 그대로 둔다(두 판정을 겹쳐 보기 위해).

[작업 4] 단일 진입점 strike — AGENTS.md 규칙 2
  TDG.game.strike(input)
    input = { x, y, pointerType, clientX, clientY, source: "pointer" }   ← 포인터: 드럼 % 좌표(clientToDrum 결과) + 화면 좌표
          | { tongueId, source }    ← 키보드·자동 테스트(Phase 7)
  처리 순서:
   1) RUNNING이 아니면 끝.
   2) 좌표 입력: tolerance = (pointerType === "touch") ? TDG.config.GAME.touchTolerance : 1
                tongue = TDG.tongues.pointToTongue(x, y, tolerance)?.tongue ?? null
      텅 입력:  tongue = TDG.tongues.byId[tongueId], 좌표는 (tongue.x, tongue.y)
   3) 명중 = 올라온(또는 올라오는 중인) 아직 안 맞은 두더지가 있고,
            (tongue?.id === 두더지의 텅 id)  또는  inMoleEllipse(x, y, 두더지의 텅)
      ※ 뒤쪽 조건이 기존 타원 판정이다. 합집합이라서 새 판정은 기존보다 절대 엄격해지지 않는다.
   4) 명중이면 onMoleHit(두더지의 텅, clientX, clientY). input에 clientX가 없으면(키보드·테스트) drumToClient로 화면 좌표를 구한다.
   5) 구독자에게 알린다: TDG.game.on("strike", fn) 으로 등록한 함수에
        { tongue, hit: 명중 여부, x, y, source: "pointer"|"key"|"test" } 를 넘긴다.
      (지금은 구독자가 없다. Phase 4 소리, Phase 6 모드, Phase 7 키보드가 쓴다.
       간단한 on/emit 두 함수면 충분하다. 라이브러리 금지)
  js/main.js:
    stage pointerdown → const r = stageEl.getBoundingClientRect(); const p = TDG.tongues.clientToDrum(e.clientX, e.clientY, r);
                        TDG.game.strike({ x: p.x, y: p.y, pointerType: e.pointerType,
                                          clientX: e.clientX, clientY: e.clientY, source: "pointer" });
    망치 휘두르기·이동은 지금처럼 pointerdown마다 effects 쪽에서 한다(명중과 무관).
  기존 onStagePointerDown 의 판정 코드는 지운다(strike가 대신한다).

[작업 5] 타이머 누적 — D-19
  track()+pendingTimeouts 배열(실행된 타이머를 지우지 않아 10초에 27개 누적)을 Set으로 바꾼다:
    const pending = new Set();
    function later(fn, ms) {
      const id = setTimeout(() => { pending.delete(id); fn(); }, ms);
      pending.add(id);
      return id;
    }
    function clearAllTimers() { pending.forEach(clearTimeout); pending.clear(); /* + 기존 RAF 취소 */ }
  모든 track(setTimeout(fn, ms)) → later(fn, ms). effects.js 의 안전 타이머도 TDG.game.later 를 쓴다.

[작업 6] ?seed=N — 재현 가능한 난수
  js/game.js:
    let seedOverride = null;                                   // _debug.setSeed(n) 가 바꾼다
    function makeRng() {
      const q = new URLSearchParams(location.search).get("seed");
      const seed = seedOverride ?? (q !== null && q !== "" ? Number(q) || 0 : null);
      return seed === null ? Math.random : TDG.rules.mulberry32(seed);
    }
  rng = makeRng() 는 start() 안에서 매 판 새로 만든다(같은 시드로 다시 시작하면 같은 순서가 나와야 한다).
  rand()·randInt()·직전 텅 제외 랜덤이 모두 rng()를 쓰게 한다.

[작업 7] tests/logic.mjs 를 부록 E-2 코드 그대로 만든다(Node만 있으면 됨, 설치 불필요).
  node tests/logic.mjs → 지금 단계에서는 rules.js의 스케줄러·songs.js가 없어 해당 검사를 건너뛰고
  "104 passed, 0 failed" 가 나와야 한다.

[자가진단 추가]
  (먼저 T01·T02의 대상을 TDG.TONGUES로 바꾼다: T01 15개·id 중복 없음 / T02 x·y·lx·ly가 0~100이고 hw > 0.
   rx·ry가 없어졌기 때문이며, 조건을 느슨하게 하는 것이 아니다)
  T15 TDG.TONGUES 15개, note 15개 중복 없음, 모두 TDG.NOTE에 있음, top-center의 x·y가 56.47·17.20
  T16 각 텅의 (x,y)·(lx,ly)·중간점 45곳을 pointToTongue(tolerance 1과 1.25) → 모두 자기 텅
  T17 콧수염(57.45,47.5)·눈(46.5,38.5)(67.5,38.5)·드럼 밖(5,45) → null
  T18 forceMole(id)로 두더지를 세우고, 기존 타원 안 8방향 점(반지름의 90%)을 strike → 8번 모두 명중(매번 다시 세움)
  T19 #stage에 pointerdown 1회 → TDG.game.strike 호출 1회(함수를 감싸 호출 수를 센다)
  T20 later()로 타이머 20개를 걸고 모두 실행된 뒤 _debug.pendingCount() === 0

[금지] 점수·시간·두더지 등장 규칙 변경. 텅 좌표 값 변경(좌표 조정은 3-C 도구로 사람이 한다).
[완료 보고] 변경 파일 / node tests/logic.mjs 결과 / ?selftest=1 결과 / ?debug=1 화면에서 캡슐과 타원이 겹치는지
`````

### 3-C. 텅 보정 도구 (`?calib=1`)

`````
[Phase 3-C — 텅 보정 도구] AGENTS.md를 먼저 읽는다. js/debug.js 안에서만 작업한다(게임 코드 수정 금지).
목적: 텅드럼 그림을 바꾸거나 좌표를 다듬을 때, 코드를 몰라도 화면에서 맞추고 결과를 복사할 수 있게 한다.

[화면]
- ?calib=1 이면 시작 화면 대신 보정 화면을 연다: 게임 화면의 #stage를 그대로 쓰고 HUD·망치·배경 장식은 숨긴다.
  게임은 시작하지 않는다(gameStatus는 idle 유지).
  #game-screen·#stage 의 cursor: none 때문에 마우스 포인터가 안 보이므로 두 요소에 style.cursor = "crosshair".
- #tongue-layer 에 15개 캡슐(tongueCapsule, 반투명 보라)과 텅마다 핸들 2개:
    ● 두더지 자리(x,y) — 원, 지름 18px 이상
    ■ 숫자 자리(lx,ly) — 네모, 한 변 16px 이상
  핸들은 SVG 요소이므로 이 요소들에만 pointer-events: auto 를 준다.
- 오른쪽(세로 화면에서는 아래) 패널: 텅 15개 목록(음 이름·숫자 표기·현재 x,y,lx,ly,hw), 선택한 텅 강조.

[조작]
- 핸들 드래그: pointerdown → setPointerCapture → pointermove → pointerup.
  좌표는 TDG.tongues.clientToDrum(… , stage.getBoundingClientRect()) 로 % 변환, 소수 둘째 자리 반올림.
- 캡슐이나 목록을 누르면 그 텅 선택. 선택한 텅의 반폭 hw: [−][+] 버튼(0.1 단위) 또는 [ ] 키.
- 방향키: 마지막으로 잡은 핸들을 0.05%씩 이동(Shift = 0.5%).
- "두더지 미리보기" 토글: 15마리를 모두 올려서 텅 위에 제대로 앉는지 본다.
- "되돌리기": 이 도구를 연 시점의 값으로.
- "코드 복사": 부록 B-3의 TONGUES 배열과 똑같은 모양의 배열 텍스트 "[ … ]"만 클립보드에 복사한다
  (앞의 "const TONGUES ="와 끝의 ";"는 빼고, 한 텅 한 줄, 키 순서 id, note, x, y, lx, ly, hw).
  화면 안내: "js/tongues.js 에서 const TONGUES = 뒤의 [ … ] 를 통째로 바꿔 붙이세요."
  navigator.clipboard.writeText 가 실패하면 <textarea>에 넣고 전체 선택해 둔다.

[정직한 안내 — 화면에 항상 표시]
  "여기서 바꾼 값은 이 브라우저에만 임시 저장됩니다. 게임에 반영하려면 '코드 복사' 후
   js/tongues.js 의 TONGUES 자리에 붙여 넣고 커밋하세요. (정적 사이트는 브라우저에서 파일을 고칠 수 없습니다)"
- 임시 저장: TDG.storage 키 "tdg.calib.v1". 보정 화면을 다시 열면 이어서 작업. 게임은 이 값을 쓰지 않는다.

[자가진단 추가]
  T21 보정하지 않은 상태에서 '코드 복사' 텍스트를 new Function("return " + text)() 로 평가하면
      TDG.TONGUES와 모든 값이 같다

[완료 보고] 조작 방법 요약(사람용 3줄) / 선택한 텅 하나를 움직였다가 되돌린 결과
`````

### 완료 기준

- [ ] 3-A 후: 겉으로 달라진 것이 전혀 없다. `?selftest=1` FAIL 0, `file://`로 열어도 된다
- [ ] 3-B 후: `?debug=1`에서 텅 모양 캡슐 15개가 그림 속 텅과 겹친다
- [ ] 두더지 몸통 바깥쪽, 텅의 숫자 근처를 쳐도 잡힌다(판정이 넓어짐)
- [ ] 콧수염·눈·테두리를 치면 아무 일도 없다
- [ ] `node tests/logic.mjs` → `104 passed, 0 failed`
- [ ] `?seed=7`로 두 번 시작하면 두더지가 같은 순서로 나온다
- [ ] 3-C 후: `?calib=1`에서 핸들을 끌어 옮기고 "코드 복사" 결과를 메모장에 붙여 볼 수 있다

### 흔한 실패

- 파일을 나누면서 `const`를 최상위에 두고 다른 파일에서 이름으로 접근 → 3-A 규칙대로 모두 `TDG.*`로.
- `defer`를 빼먹어 `main.js`가 DOM보다 먼저 실행 → `null` 오류.
- `type="module"`로 바꿈 → `file://`에서 CORS 오류로 전부 멈춤.
- 텅 레이어에 `preserveAspectRatio="none"` → 모바일에서 캡슐이 어긋남.
- 새 판정을 "캡슐만"으로 구현 → 두더지 머리 위쪽을 친 것이 빗나감이 됨(기존 대비 21% 영역 손실). 반드시 합집합.
- 보정 도구가 게임 코드의 TONGUES를 직접 바꿔 버림 → 도구는 복사본으로만 작업한다.

---

## Phase 4 — 진짜 텅드럼 소리

| 항목 | 내용 |
|---|---|
| 목적 | 텅을 치면 **그 텅의 음**이 난다. 두더지가 없어도 텅은 운다 — 게임을 하면서 "텅 위치 = 음"이 귀와 손에 붙는다. 수업 중 소리를 끄고 줄일 수 있다. |
| 해결 | **D-06** 텅과 무관한 440Hz 비프 · **D-08** 음소거·볼륨 없음, HTMLAudio 틱, 볼륨 하드코딩 |
| 선행 | Phase 3 (strike 이벤트·TDG.NOTE) |
| 작업량 | 중간 (프롬프트 2개: 4-A → 4-B) |
| 검증 결과 | 아래 참조 코드를 OfflineAudioContext로 실제 렌더링: 단음 −4.2dBFS, 6음 동시 −2.3dBFS, 30연타 −1.7dBFS, 같은 텅 2번 −4.1dBFS(소리가 쌓이지 않음), 음소거 무음. 리미터가 없으면 6음 동시 **+7.8dBFS**·30연타 **+8.4~8.6dBFS**로 소리가 찢어진다(부록 A-7). |

### 4-A. 음원 엔진과 타격음

`````
[Phase 4-A — 진짜 텅드럼 소리] AGENTS.md와 docs/PROMPTS.md의 부록 H를 먼저 읽는다.

[작업 1] 음원 엔진
- js/audio.js 를 docs/PROMPTS.md의 "Phase 4 참조 코드 — js/audio.js" 그대로 만든다(값·구조 임의 변경 금지).
- index.html: storage.js 다음 줄에 <script src="js/audio.js" defer></script>
  (audio.js는 TDG.NOTE를 읽으므로 반드시 tongues.js 뒤. AGENTS.md 파일 지도 순서)

[작업 2] 소리 켜기(잠금 해제)
- js/main.js:
    function unlock() { TDG.audio.init(); }
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
  { once: true } 를 쓰지 않는다. 아이폰은 다른 앱에 다녀오면 소리가 다시 멈추므로 매번 호출한다
  (init()은 이미 만들어져 있으면 멈춘 상태일 때 resume만 한다).
- 기존 ensureAudio()·audioCtx 변수는 지우고 모두 TDG.audio 로 바꾼다.

[작업 3] 타격음 — TDG.game.on("strike", ev => …) 구독 한 곳에서만 소리를 낸다
    const pan = (x) => Math.max(-0.5, Math.min(0.5, (x - 50) / 60));
  - 명중(ev.hit): 두더지가 있던 텅의 음 — TDG.audio.playNote(두더지텅.note, { velocity: 1, pan: pan(두더지텅.x) })
    (합집합 판정 때문에 명중이어도 ev.tongue가 null이거나 옆 텅일 수 있다. 명중이면 반드시 두더지 텅의 음)
  - 빈 텅을 침(명중 아님, ev.tongue 있음): playNote(ev.tongue.note, { velocity: 0.55, pan: pan(ev.tongue.x) })
  - 텅이 아닌 곳(콧수염·테두리·드럼 밖): 소리 없음
  - 기존 playHitSound()(440Hz 비프)는 삭제
  strike 이벤트에 명중한 두더지의 텅(ev.moleTongue)을 함께 실어 보내도록 3-B의 strike를 보완한다.

[작업 4] 틱 — HTMLAudio 제거 (AGENTS.md 규칙 4)
- ensureTimerTickAudio, timerTickAudio, TIMER_TICK_SOUND_SRC, Phase 2에서 넣은 미리 받기 줄을 지운다.
  assets/timer-tick.wav 파일도 지운다.
- 남은 초가 바뀔 때: TDG.audio.tick({ accent: 남은초 <= TIMER_WARN_SEC })
  틱 정책 설정 ticks: "all"(매초, 지금과 같음) | "last10"(남은 10초부터) | "off". 설정 화면은 4-B에서. 지금은 "all".
- 게임 시작 순간의 첫 틱 1회는 그대로 둔다(Phase 5에서 카운트다운으로 바뀜).

[작업 5] 끝 소리: playEndSound()(880→660Hz)를 지우고 TDG.audio.jingle({ record: false }) 로.
  (Phase 5에서 신기록이면 record: true)

[자가진단 추가] OfflineAudioContext로 실제 소리를 렌더링해 잰다. docs/PROMPTS.md 부록 E-3의 renderPeak 함수를 debug.js에 넣어 쓴다.
  T22 단음 C4 피크가 −12 ~ −1 dBFS
  T23 6음 동시(C4 E4 G4 C5 E5 E3) 피크 ≤ −0.5 dBFS (찢어짐 없음)
  T24 음소거 상태 피크가 −80 dBFS 이하(무음)
  T25 TDG.NOTE 15음 모두 playNote가 null이 아닌 값을 돌려준다(렌더링용 컨텍스트에서)
  T26 window.Audio 를 감싸 생성 횟수를 센 뒤 게임을 시작·종료 → 0회 (HTMLAudio 미사용)

[금지] new Audio(), <audio>, 오디오 파일 추가, 페이지 로드 시 AudioContext 생성, 소리마다 새 AudioContext.
[완료 보고] 변경·삭제 파일 / 자가진단 결과 / 사람이 귀로 확인할 것(아래 완료 기준)
`````

### Phase 4 참조 코드 — `js/audio.js`

형제 앱 Tonguedrum_Play의 음색 합성(`playNote`·`makeIR`·`makeNoiseBurst`)을 그대로 옮기고, 게임에 필요한 여섯 가지를 더했습니다. 이 문서 작성 중 헤드리스 크롬의 OfflineAudioContext로 렌더링해 부록 A-7의 수치를 확인했습니다.

```js
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
```

### 4-B. 소리 설정

`````
[Phase 4-B — 소리 설정] AGENTS.md를 먼저 읽는다.

[작업 1] 설정 값
- js/config.js 에 STORAGE_KEYS = { settings: "tdg.settings.v1", records: "tdg.records.v1", board: "tdg.board.v1" } 추가.
- js/storage.js 에 설정 헬퍼 추가:
    // 모든 Phase의 설정 키를 여기서 한 번에 정한다(뒤 Phase에서 쓸 키도 미리 기본값을 둔다 — 없으면 NaN·undefined 버그)
    const SETTINGS_DEFAULTS = {
      volume: 0.7, muted: false, ticks: "all",                                 // Phase 4
      difficulty: "normal",                                                    // Phase 5
      mode: "classic", label: "ko", songId: "twinkle", previewNext: true,      // Phase 6
      keyHints: false, vibrate: true,                                          // Phase 7
      time: 30, levelLock: null, tongues: null, labelLock: false,             // Phase 9
      modesVisible: ["classic", "find", "melody", "echo", "free"], boardEnabled: false,
    };
    function loadSettings() { return { ...SETTINGS_DEFAULTS, ...get(TDG.config.STORAGE_KEYS.settings, {}) }; }
    function saveSettings(s) { set(TDG.config.STORAGE_KEYS.settings, s); }
    TDG.storage.loadSettings / saveSettings 로 내보내고, main.js 시작 때 TDG.settings = TDG.storage.loadSettings().
- 시작 때 TDG.audio.setVolume(TDG.settings.volume); TDG.audio.setMuted(TDG.settings.muted);
  (init 전에 불러도 값이 저장되어 있다가 init 때 적용된다 — 참조 코드가 그렇게 되어 있다)

[작업 2] 음소거 버튼
- .hud-actions 안, #pause-btn 옆:
    <button id="mute-btn" class="round-btn" type="button" aria-pressed="false" aria-label="소리 끄기">🔊</button>
  누르면 muted 토글 → 아이콘 🔊/🔇, aria-pressed, aria-label("소리 끄기"/"소리 켜기") 갱신, 저장.
- M 키: 게임·일시정지·결과 화면 어디서든 음소거 토글. 단 input·textarea·select에 포커스가 있으면 무시.

[작업 3] 소리 설정 묶음 — 한 벌만 만들고, 일시정지 창이나 ⚙ 설정 창(이번에 새로 만든다)을 열 때 그 창 안으로 appendChild로 옮겨 쓴다
  (두 벌을 만들면 id·라디오 name이 겹쳐 한쪽이 동작하지 않는다)
    <fieldset class="sound-settings">
      <legend>소리</legend>
      <label>볼륨 <input id="volume" type="range" min="0" max="100" step="5"></label>
      <div role="radiogroup" aria-label="시간 알림 소리">
        <label><input type="radio" name="ticks" value="all"> 매초</label>
        <label><input type="radio" name="ticks" value="last10"> 마지막 10초만</label>
        <label><input type="radio" name="ticks" value="off"> 끄기</label>
      </div>
      <p class="hint">아이폰에서 소리가 안 나면 옆면의 무음 스위치를 확인하세요.</p>
    </fieldset>
  - 볼륨: input 이벤트마다 setVolume(v/100), change(손을 뗄 때)에 C4 한 번 들려주고 저장.
  - ⚙ 설정 창: 시작 화면 오른쪽 위 ⚙ 버튼(44px 이상)으로 연다. <div class="modal" role="dialog" aria-modal="true" aria-labelledby=…>.
    열면 첫 컨트롤에 포커스, Esc·닫기 버튼으로 닫고 ⚙ 버튼으로 포커스를 돌려준다.
    (Phase 5~9의 설정 항목도 이 창에 추가된다)

[자가진단 추가]
  T27 Storage.prototype.getItem 을 잠시 예외를 던지는 함수로 바꿔도 loadSettings()가 기본값을 돌려주고 게임 시작이 된다
      (localStorage.getItem = … 처럼 대입하면 "getItem"이라는 저장 항목이 생길 뿐이다. 테스트 뒤 원상복구)

[완료 보고] 변경 파일 / 설정 창 스크린샷 설명 / 자가진단 결과
`````

### 완료 기준

- [ ] 텅마다 다른 음이 난다: 가운데 큰 텅 = 낮은 미, 맨 아래 = 낮은 파, 맨 위 = 높은 미 (형제 앱 Tonguedrum_Play의 15키와 같은 높이)
- [ ] 두더지가 없는 텅을 쳐도 그 텅 소리가 조금 작게 난다. 콧수염·테두리는 소리가 없다
- [ ] 여러 텅을 빠르게 연타해도 소리가 찢어지지 않는다
- [ ] 같은 텅을 빠르게 두 번 치면 소리가 겹겹이 커지지 않고 새로 울린다
- [ ] 아이폰 사파리: 첫 터치 뒤 소리가 나고, 다른 앱에 다녀온 뒤에도 난다
- [ ] 🔊 버튼·M 키로 음소거되고, 새로고침해도 유지된다
- [ ] 틱 설정 3가지(매초·마지막 10초·끄기)가 동작한다
- [ ] 게임이 끝나면 "도-미-솔-도" 징글
- [ ] `?selftest=1` → FAIL 0

### 흔한 실패

- 페이지를 열자마자 `AudioContext`를 만듦 → 크롬 경고, 아이폰 무음. 반드시 사용자 동작 안에서 `init()`.
- `exponentialRampToValueAtTime(0, …)` → 오류. 0 대신 0.0001(참조 코드 그대로면 문제없음).
- 소리마다 `new AudioContext()` → 몇 번 치면 브라우저가 거부. 컨텍스트는 하나.
- 음소거를 소리 함수마다 `if (muted) return`으로 처리 → 이미 울리는 소리가 안 꺼짐. master gain 하나로 처리.
- 틱을 리미터 뒤에 연결 → 리미터에 눌려 거의 안 들림. 틱은 `sfx` 버스.
- `pointerdown`과 `click` 두 곳에서 소리를 냄 → 두 번 울림. 소리는 strike 이벤트 구독 한 곳에서만.
- 명중일 때 `ev.tongue`의 음을 냄 → 두더지 머리 위를 쳐서 명중하면 옆 텅 음이 날 수 있음. 명중이면 두더지 텅의 음.

---

## Phase 5 — 게임 루프 고도화

| 항목 | 내용 |
|---|---|
| 목적 | ① 게임 규칙을 `setTimeout` 사슬에서 **게임 시계 하나**로 옮겨 일시정지·난이도·동시 두더지를 쉽게 하고 ② 3·2·1 카운트다운 ③ 쉬움·보통·어려움, 황금 두더지, 콤보 ④ 결과 화면에 별점·적중률·최고 기록 ⑤ 시작 화면 정리 |
| 해결 | D-09 결과 문구 기준 · D-10 카운트다운 · D-11 결과·기록 · D-24 시작 화면 (+ Phase 1 일시정지 패치를 정식 구조로 교체) |
| 선행 | Phase 4 |
| 작업량 | 큼 (프롬프트 3개: 5-A → 5-B → 5-C) |
| 검증 결과 | 부록 D의 `rules.js`로 30초를 16ms 간격 시뮬레이션: '보통'은 현행과 같은 수치(안 치면 21마리, 현행 실측 19마리). 같은 텅 중복 등장 0, 동시 등장 수 초과 0, 같은 시드 = 같은 순서, 텅 1개만 허용해도 계속 등장. 사람 흉내 봇(반응 0.45~1.1초, 15% 빗나감)의 잡은 비율: 쉬움 73~94%, 보통 64~77%, 어려움 30~44% → 별점 기준 40·65·85%로 "보통에서 대부분 별 2개, 잘하면 3개". `tests/logic.mjs` 전체 131개 통과. |

### 5-A. 게임 시계와 스케줄러, 카운트다운

`````
[Phase 5-A — 게임 시계] AGENTS.md(특히 규칙 3)와 docs/PROMPTS.md 부록 D를 먼저 읽는다.

[작업 1] 규칙 파일
- js/rules.js 를 부록 D-2 코드 그대로 교체(스케줄러 createSpawner·pointsFor·starsFor·mulberry32).
- js/config.js 를 부록 B-2(최종 config.js)와 똑같이 맞춘다 — GameStatus·GAME·DIFFICULTY·STARS에 빠진 키가 없어야 한다(값의 뜻은 부록 D-1).
- node tests/logic.mjs → "112 passed, 0 failed" 여야 한다(songs.js는 Phase 6에서 추가되므로 곡 검사는 아직 건너뜀).
  FAIL이 하나라도 있으면 멈추고 보고한다.

[작업 2] 게임 시계 — Phase 1의 pausedAt/pausedTotal 변수를 이 객체로 흡수한다
    const clock = {
      startedAt: 0, pausedAt: 0, pausedTotal: 0,
      start(now) { this.startedAt = now; this.pausedAt = 0; this.pausedTotal = 0; },
      pause(now) { if (!this.pausedAt) this.pausedAt = now; },
      resume(now) { if (this.pausedAt) { this.pausedTotal += now - this.pausedAt; this.pausedAt = 0; } },
      t(now) { return (this.pausedAt || now) - this.startedAt - this.pausedTotal; },   // 일시정지 시간을 뺀 ms
    };

[작업 3] 상태와 한 개의 프레임 루프
- 상태: idle → countdown → running ⇄ paused → ended (paused는 직전 상태를 기억했다가 돌아간다)
- _debug.skipCountdown(): 카운트다운 중이면 시계를 앞당겨 바로 running으로 (자가진단 전용)
- start({ difficulty }):
    spawner = TDG.rules.createSpawner({ cfg: DIFFICULTY[difficulty], durationMs: GAME.durationMs,
                                        rng: makeRng(),            // 3-B의 함수. 매 판 새로 만든다
                                        tongues: TDG.TONGUES, hitReactionMs: GAME.hitReactionMs });
    stats = { hits: 0, escaped: 0, emptyStrikes: 0, combo: 0, bestCombo: 0, goldenHits: 0, score: 0 }
    clock.start(performance.now()); state = "countdown"; requestAnimationFrame(frame)
- frame(now):
    const t = clock.t(now)
    countdown: 남은 = ceil((GAME.countdownMs − t)/1000) → 3·2·1이 바뀔 때마다 #countdown 표시 + TDG.audio.tick()
               t ≥ countdownMs 가 되면 "시작!" 표시 + tick({accent:true}), state = "running"
               (틱 정책이 "off"면 카운트다운도 소리 없이 숫자만 보여 준다)
    running:   gt = t − GAME.countdownMs
               for (const ev of spawner.update(gt)) applyEvent(ev)
               남은초 = ceil((durationMs − gt)/1000) 가 바뀌면 HUD 갱신 + 틱 정책대로 tick
               gt ≥ durationMs 이면 end() 하고 루프 종료
    paused·ended·idle 이면 다음 프레임을 요청하지 않는다.
- applyEvent(ev):
    spawn → 그 텅 슬롯의 .mole 에 "up" (+ ev.mole.golden 이면 "golden")
    leave → "up" 제거, "leaving" 추가. ev.escaped 이면 stats.escaped++, stats.combo = 0
    gone  → "leaving"·"golden" 제거
  ※ 적중률의 분모는 hits + escaped(결판이 난 두더지). 끝나는 순간 올라와 있던 두더지는 세지 않는다.
- 자가진단용 TDG.game._debug.forceMole(tongueId, { golden }) 은 스케줄러 방식으로 고친다:
  spawner.moles 에 { tongueId, spawnAt: gt, leaveAt: gt + 5000, goneAt: gt + 5180, golden, hitAt: null } 를 넣고 화면에 올린다.
- 삭제: scheduleNextMole, spawnNextMole, beginLeaving의 타이머, tickTimer, onMoleHit의 퇴장 타이머 —
  두더지 등장·퇴장·게임 종료를 setTimeout으로 예약하는 코드는 하나도 남기지 않는다(AGENTS.md 규칙 3).
  연출(별·흔들림·점수 팝·"시작!" 숨기기)의 짧은 타이머는 예외로 허용.

[작업 4] strike의 명중 판정을 스케줄러 기준으로
    gt = clock.t(performance.now()) − GAME.countdownMs
    후보 = spawner.moles 중 hitAt === null 이고 spawnAt ≤ gt < leaveAt 인 것
    명중 두더지 = 후보 중 (tongue?.id === m.tongueId) 또는 inMoleEllipse(x, y, byId[m.tongueId]) 인 것
                 (여러 마리면 두더지 중심에 가장 가까운 것)
    명중이면 spawner.hit(m, gt) → 흔들림·별·점수 팝(연출은 지금과 같게)
  countdown·paused 상태의 strike는 무시(소리도 내지 않음).

[작업 5] 일시정지는 이제 시계만 멈춘다
- pause(): countdown·running 두 상태 모두에서 동작하고 직전 상태를 기억한다. clock.pause(now), RAF 취소, 오버레이 표시.
  visibilitychange(hidden)·pagehide·Esc·P·⏸ 버튼이 모두 이 pause() 하나를 부른다(Phase 1의 "RUNNING일 때만" 조건을 바꾼다).
  두더지는 숨기지 않고 그 자리에 멈춘다.
- resume(): clock.resume(now), 직전 상태(countdown 또는 running)로, RAF 재개. 두더지는 남은 시간만큼 더 머문다.
- pause()·resume()에서 Phase 1의 clearAllTimers()·hideAnyActiveMole(true)·scheduleNextMole(600) 호출을 지운다.
  (clearAllTimers를 남기면 흔들림(hit-shake) 클래스를 떼는 연출 타이머가 사라지고, 끝 프레임을 유지하는 흔들림 애니메이션이
   퇴장 transform을 덮어서 두더지가 올라온 채 남는다)
- 같은 이유로 leave·gone 이벤트에서 "hit-shake" 클래스도 함께 뗀다.

[작업 6] 카운트다운 표시
- #stage 위 가운데: <div id="countdown" class="countdown" aria-live="assertive" hidden></div>
  글자 크기 clamp(64px, 18vmin, 160px), 흰 글자 + 진한 보라 외곽선(text-shadow), 숫자가 바뀔 때 scale 1.3→1 (transform만).
  "시작!"은 400ms 뒤 숨긴다. reduced-motion이면 확대 애니메이션 없이 글자만 바뀐다.

[자가진단 추가]
  T28 (skipCountdown 후) running 중 pause → 3초 대기 → resume: 떠 있던 두더지의 (leaveAt − 게임시계)가 pause 직전과 ±20ms 이내로 같다
  T29 countdown 중 strike는 점수·소리·통계를 바꾸지 않는다 / countdown 중 탭 숨김(visibilitychange) → paused, 계속하기 → countdown
  T30 _debug.setSeed(5) 후 두 번 시작(각각 skipCountdown)했을 때 처음 3마리의 텅 순서가 같다(각 판 최대 6초 대기)
  T31 게임 진행 중 5초 동안 두더지 등장이 1번 이상 있다(루프가 살아 있다)

[완료 보고] 지운 함수 목록 / 남아 있는 setTimeout 목록과 각각의 용도(모두 연출용이어야 함) / 자가진단 결과
`````

### 5-B. 난이도·황금 두더지·콤보·점수

`````
[Phase 5-B — 난이도와 점수] AGENTS.md와 docs/PROMPTS.md 부록 D를 먼저 읽는다.

[작업 1] 난이도
- start({ difficulty }) 의 기본값은 TDG.settings.difficulty ?? "normal". 선택하면 설정에 저장.
- 시작 화면에 난이도 선택(임시 위치여도 됨. 5-C에서 배치를 다듬는다):
    <div class="seg" role="radiogroup" aria-label="난이도">
      <label><input type="radio" name="level" value="easy"> 쉬움</label>
      <label><input type="radio" name="level" value="normal"> 보통</label>
      <label><input type="radio" name="level" value="hard"> 어려움</label>
    </div>
  값: config.js DIFFICULTY (쉬움 = 오래 머묾·간격 넓음 / 보통 = 현행 수치 / 어려움 = 짧게 머묾·10초부터 동시 2마리)

[작업 2] 황금 두더지
- spawn 이벤트의 mole.golden 이면 .mole 에 golden 클래스:
    .mole.golden { filter: grayscale(1) sepia(1) saturate(5) brightness(1.2); }
  (정적 필터라서 규칙 7 위반이 아니다. 필터 값을 애니메이션하지 않는다)
- 등장 순간 작은 반짝임: 두더지 위에 ✦ 3개가 0.4초 동안 퍼지며 사라짐(transform·opacity만)
- 명중하면 점수 팝을 금색 외곽선(.score-pop.gold: 외곽선 색 #B8860B)으로, stats.goldenHits++

[작업 3] 점수·콤보
- 명중: stats.hits++, stats.combo++, stats.bestCombo = max, points = TDG.rules.pointsFor({ golden, combo: stats.combo })
        (기본 10 · 황금 30 · 연속 5마리째부터 +5), stats.score += points, spawnScorePop(…, points)
- 놓침(leave 이벤트 escaped): combo = 0
- 빈 텅 치기: stats.emptyStrikes++ — 콤보는 끊지 않는다(텅을 쳐 보는 건 벌받을 일이 아니다)
- 콤보 배지: combo ≥ 3 이면 점수 카드 아래 "콤보 N" (aria-hidden="true", 숫자가 바뀔 때 scale 1.2→1)

[자가진단 추가]
  (모두 _debug.skipCountdown() 뒤에 한다)
  T32 연속 명중 5번째의 점수 증가가 15, 황금 두더지 1번째 명중은 30 (forceMole(id, { golden: true }) 사용)
  T33 escaped 이벤트 뒤 combo가 0, 빈 텅 strike 뒤에는 combo 유지

[완료 보고] 변경 파일 / 자가진단 결과 / 어려움에서 두 마리가 동시에 뜨는 장면 확인 여부
`````

### 5-C. 결과 화면·기록·시작 화면

`````
[Phase 5-C — 결과·기록·시작 화면] AGENTS.md를 먼저 읽는다.

[작업 1] 결과 계산 (js/game.js end())
    decided = stats.hits + stats.escaped
    rate    = decided ? Math.round(stats.hits / decided * 100) : 0
    stars   = TDG.rules.starsFor(rate)          // 40·65·85%
    문구: 0★ "괜찮아요! 두더지가 나오는 텅을 잘 보세요."
          1★ "좋아요! 조금 더 빨리 쳐 볼까요?"
          2★ "잘했어요!"
          3★ 쉬움 "완벽해요! 이제 '보통'에 도전해요!" / 보통·어려움 "두더지 마스터! 🏆"
  (pickEndMessage의 점수 기준 50/150은 지운다 — D-09)

[작업 2] 기록 (TDG.storage, 키 STORAGE_KEYS.records) — "기록 이름(recordKey)"으로 찾는 평평한 표
    { "classic.normal.30": { best: 210, bestStars: 2, plays: 14, last: "2026-09-23" },
      "classic.easy.30":   { ... } }
  recordKey = `classic.${difficulty}.${판 길이 초}` (Phase 6·9의 다른 모드도 이 표에 자기 recordKey로 저장한다)
  판이 끝날 때 plays++, last = 날짜(YYYY-MM-DD), 점수가 best보다 크면 best 갱신 + isRecord = true.
  신기록이면 TDG.audio.jingle({ record: true }), 아니면 jingle().

[작업 3] 결과 화면(#end-screen .end-card) 구성
    <h1 class="end-title">게임 끝!</h1>
    <p class="stars" aria-label="별 2개">★★☆</p>
    <p class="end-score">점수 <span id="final-score">180</span>점 <span class="badge-record" hidden>🎉 신기록!</span></p>
    <dl class="end-stats">
      <dt>잡은 두더지</dt><dd>17 / 20마리 (85%)</dd>
      <dt>최고 콤보</dt><dd>9</dd>
      <dt>황금 두더지</dt><dd>2</dd>
      <dt>최고 기록(보통)</dt><dd>210점</dd>
    </dl>
    <p id="end-message" class="end-message">잘했어요!</p>
    <div class="end-actions">
      <button id="restart-btn" class="primary-btn" type="button">다시 하기</button>
      <button id="home-btn" class="secondary-btn" type="button">처음 화면</button>
    </div>
  - 끝나면 #restart-btn 에 포커스(Phase 1 유지). 별은 하나씩 0.15초 간격으로 켜진다(transform·opacity만).

[작업 4] 시작 화면 정리 — D-24
- 지금: 제목이 없고, 시작 버튼이 드럼 그림 위(왼쪽 위 4%·6%)에 떠 있어 폰에서는 드럼 테두리와 겹친다.
- 바꿀 모양:
    <section id="start-screen" class="screen">
      <div class="start-layout">
        <div class="stage start-stage"> (드럼 이미지) </div>
        <div class="start-panel">
          <h1 class="title">텅드럼 두더지잡기</h1>
          <p class="hint">텅에서 튀어나오는 두더지를 망치로 콩! 30초 동안 몇 마리 잡을까요?</p>
          (난이도 선택)
          <button id="start-btn" class="primary-btn" type="button">Start!</button>
          <p class="best-line">최고 기록 · 보통 ★★☆ 210점</p>
        </div>
        <button id="settings-btn" class="round-btn" type="button" aria-label="설정">⚙</button>
      </div>
    </section>
  - 세로 화면: 드럼 위, 패널 아래(세로로 쌓기). 가로 화면: 드럼 왼쪽 55%, 패널 오른쪽.
  - 시작 버튼은 드럼 그림과 절대 겹치지 않는다. 버튼 문구 "Start!"와 #start-btn id는 그대로 둔다.
  - 시작 화면 드럼의 크기도 Phase 1 원칙(높이 제한을 비율로 환산해 width의 min()에)으로 정한다. max-height 금지.

[자가진단 추가]
  T34 가짜 통계 { hits: 17, escaped: 3 } → rate 85, stars 3 / { hits: 0, escaped: 0 } → rate 0 (0으로 나누지 않음)
  T35 기록 저장 후 TDG.storage.get(records)에 best가 반영되고, 같은 점수로 다시 끝나면 isRecord가 false
  T36 #start-btn 의 사각형이 시작 화면 드럼 이미지 사각형과 겹치지 않는다(현재 창 크기 기준)

[완료 보고] 변경 파일 / 결과 화면 예시(숫자 포함) / 시작 화면을 폰 세로·노트북 가로에서 본 설명 / 자가진단 결과
`````

### 완료 기준

- [ ] 시작하면 3·2·1·"시작!" 뒤에 첫 두더지가 나온다
- [ ] 일시정지했다가 이어 하면 두더지가 그 자리에서 이어서 움직인다(사라지지 않음)
- [ ] 쉬움은 확실히 느긋하고, 어려움은 10초 뒤부터 두 마리가 동시에 나올 때가 있다
- [ ] 가끔 금색 두더지가 나오고 잡으면 +30
- [ ] 연속으로 잡으면 "콤보" 배지, 5마리째부터 +15
- [ ] 결과 화면에 별·잡은 수/나온 수(%)·최고 콤보·최고 기록, 신기록이면 "🎉 신기록!"과 긴 징글
- [ ] 반응이 느려도 150점만 넘으면 "마스터"가 나오던 문제가 사라졌다(별은 비율로 매김)
- [ ] 시작 화면에 제목이 있고, 시작 버튼이 드럼과 겹치지 않는다
- [ ] `node tests/logic.mjs` FAIL 0, `?selftest=1` FAIL 0

### 흔한 실패

- 스케줄러에 `performance.now()`를 그대로 넣음 → 일시정지 시간이 섞여 재개하자마자 두더지가 사라짐. 반드시 `clock.t()`.
- 카운트다운 3초를 판 시간에 포함 → 실제로는 27초 게임. 판 시계는 `t − countdownMs`.
- `spawn` 이벤트마다 `stats.spawned++` 하고 적중률 분모로 씀 → 끝나는 순간 올라온 두더지 때문에 100%가 안 나옴. 분모는 `hits + escaped`.
- 두더지 퇴장을 CSS `transitionend`에 맡김 → 탭 전환·모션 감소에서 이벤트가 안 와서 두더지가 남음. 퇴장은 스케줄러 이벤트로.
- 황금 두더지에 `filter` 애니메이션(반짝임)을 넣음 → D-04 재발. 반짝임은 별도 요소의 transform·opacity로.
- 시작 화면을 고치면서 `#start-btn` id를 바꿈 → 테스트·키보드 흐름이 깨짐.

---

## Phase 6 — 음악 교육 모드

| 항목 | 내용 |
|---|---|
| 목적 | 두더지잡기를 **텅드럼 수업 도구**로 확장한다. 같은 드럼·같은 판정·같은 소리 위에 "음 찾기·멜로디 두더지·따라 치기·자유 연주" 네 모드를 올린다. 협회 수업에서 가치가 가장 큰 단계다. |
| 해결 | (기회) 텅 위치 ↔ 음 이름 ↔ 소리 연결 학습, 곡 연주 체험, 청음 |
| 선행 | Phase 5 |
| 작업량 | 큼 (프롬프트 4개: 6-A → 6-B → 6-C → 6-D. 6-B~D는 서로 독립이라 필요한 것만 해도 된다) |
| 검증 결과 | 부록 C의 숫자 악보 파서로 수록곡 7곡(15음 음계·작은 별·비행기·런던 다리·환희의 송가·생일 축하합니다·징글벨 후렴) 마디 박 수 검사 통과, 음역 밖·오타 토큰 5종 거부 확인. 모든 곡의 음이 15개 텅 안에 있음. |

| 모드 | 아이가 하는 일 | 익히는 것 | 화면 없이 소리만으로 |
|---|---|---|---|
| 🔨 두더지잡기 | 30초 동안 두더지 잡기 (Phase 5) | 텅 위치·반응 | — |
| 🎯 음 찾기 | "솔"을 보거나 듣고 그 텅 치기 | 텅 ↔ 음 이름 ↔ 소리 | 듣고 찾기는 가능 |
| 🎵 멜로디 두더지 | 곡 순서대로 나오는 두더지 잡기 → 노래가 됨 | 곡의 텅 순서 | — |
| 👂 따라 치기 | 들려준 가락을 똑같이 치기 | 청음·기억 | 가능 |
| 🎹 자유 연주 | 마음대로 치고, 방금 친 것 다시 듣기 | 탐색 | 가능 |

### 6-A. 모드 틀과 자유 연주

`````
[Phase 6-A — 모드 틀과 자유 연주] AGENTS.md를 먼저 읽는다.

[작업 1] 모드 구조 (js/game.js)
- 모드 객체 모양:
    { id, title, icon,
      usesTimer,                     // true면 카운트다운 + 판 시계 + HUD 타이머를 쓴다
      start(api, options),           // 판 시작 시 1회
      frame(t, api),                 // 매 프레임. t = 카운트다운 이후 게임 시계(ms)
      strike(ev, api),               // strike 이벤트 { tongue, x, y, source }
      result(api) → { title, stars, lines: [[이름, 값], …], message, recordKey, score } }
- api = 게임이 모드에 빌려주는 기능(모드는 DOM을 직접 만지지 않는다):
    showMole(tongueId, { golden, label }) · hideMole(tongueId) · hideAllMoles()
    glowTongue(tongueId, level)        // 0 끔 · 1 옅게 · 2 진하게 (#tongue-layer 캡슐, opacity 애니메이션만)
    flashLabel(tongueId, html, ms)     // 텅 위 말풍선 라벨
    celebrate(tongueId)                // 기존 별·흔들림 연출 재사용
    setScore(n, { pulse }) · scorePop(tongueId, points, { gold }) · setCombo(n)   // 두더지잡기의 점수 표시·점수 팝·콤보 배지
    stopScheduled()                    // 예약해 둔 소리(TDG.audio.stopAll)와 두더지 표시 예약을 모두 멈춤
    playNote(note, opts) · tick(opts)
    setHud({ title, progress: [n, total], lives, big })   // big = HUD 가운데 큰 글자(목표 음 등)
    announce(text)                     // Phase 7-C의 화면 낭독기 알림(없으면 무시)
    end()
- Phase 5의 두더지잡기 로직을 MODES.classic 으로 옮긴다. 동작·점수·결과는 완전히 같아야 한다.
- 소리를 누가 내는가: Phase 4-A의 strike 구독 소리는 MODES.classic.strike 안으로 옮기고 전역 구독은 지운다.
  이제 소리는 각 모드가 api.playNote로 낸다(모드마다 규칙이 다르다 — 따라 치기는 들려주는 중 무음,
  멜로디는 틀린 텅도 울림). 전역 구독을 남겨 두면 소리가 두 번 난다.
- usesTimer가 false인 모드(자유 연주·음 찾기·멜로디·따라 치기)는 카운트다운 없이 바로 running 상태로 시작한다.
- 기록: 5-C의 기록 표(recordKey로 찾는 평평한 표)를 모든 모드가 같이 쓴다. 값은 { best, bestStars, plays, last }이고
  best는 "높을수록 좋은 수" — 두더지잡기 = 점수, 음 찾기 = 한 번에 맞힌 수, 멜로디 = 정확도(%), 따라 치기 = 최고 길이.
  멜로디만 bestTimeMs(작을수록 좋음, Math.min)를 더 둔다. (9-B 순위표도 같은 기준)
- 일시정지와 예약 재생: 들려주기·자동 연주 중에 일시정지되면 api.stopScheduled()로 모두 멈춘다. 재개하면 따라 치기는
  그 가락을 처음부터 다시 들려주고, 자유 연주 '방금 연주 듣기'와 멜로디 '다시 들어보기'는 멈춘 채로 둔다.
- TDG.game.start({ mode = "classic", difficulty, songId, sub })

[작업 2] 시작 화면 모드 선택 — 카드 5개(아이콘·이름·한 줄 설명), 선택은 settings.mode 에 저장
    🔨 두더지잡기 — 30초 동안 두더지를 잡아요
    🎯 음 찾기 — 말해 주는 음의 텅을 찾아요
    🎵 멜로디 두더지 — 두더지를 잡으면 노래가 돼요
    👂 따라 치기 — 들려준 가락을 똑같이 쳐요
    🎹 자유 연주 — 마음대로 쳐 봐요
  카드는 role="radiogroup" 안의 라디오(키보드 화살표로 이동). 6-A에서는 두더지잡기·자유 연주만 켜고
  나머지는 disabled + "준비 중"(6-B~D에서 켠다). 난이도 선택은 두더지잡기일 때만 보인다.

[작업 3] 라벨 표시 설정 (settings.label: "num" | "ko" | "abc" | "off", 기본 "ko")
- ⚙ 설정 창에 "텅 이름 표시: 숫자 · 계이름 · 음이름 · 끄기"
- js/ui.js 에 labelHTML(noteId, style):
    num → <span class="nl">5<i class="oct low"></i></span>  (".5" = 숫자 아래 점, "1'" = 숫자 위 점)
          점은 CSS로 그린다: .nl{position:relative} .oct{position:absolute;left:50%;width:.22em;height:.22em;
          border-radius:50%;background:currentColor;transform:translateX(-50%)} .oct.low{bottom:-.3em} .oct.high{top:-.25em}
          (결합 문자 "3̣ 1̇"은 글꼴마다 점 위치가 깨지므로 쓰지 않는다)
    ko  → TDG.tongues.noteLabel(noteId, "ko")   예: "낮은 솔"
    abc → "G3"
    off → ""
- 말풍선 .note-bubble: 흰 바탕 둥근 캡슐, 진한 보라 글자, 텅의 숫자 자리(lx,ly) 근처에 표시,
  위로 8px 떠오르며 사라짐(transform·opacity). 그림에 인쇄된 숫자를 가리지 않도록 lx,ly에서 드럼 중심 쪽으로 10% 옮긴 자리.

[작업 4] 자유 연주 모드 (MODES.free)
- usesTimer false. 두더지 없음. HUD 제목 "자유 연주", 오른쪽 위 [끝내기] 버튼(→ 시작 화면).
- strike: 텅이면 playNote(velocity 0.9) + flashLabel(라벨 설정, 700ms) + 텅 잔물결
  (그 텅 캡슐을 #tongue-layer에 복제해 opacity .5→0, 300ms 뒤 제거). 텅 밖은 아무 일 없음.
- 최근 32번 타격(음, 시각)을 기억. HUD [🔁 방금 연주 듣기]: 같은 간격으로 다시 들려주며 그 텅에서
  두더지가 잠깐 나왔다 들어간다. 소리는 audio.playNote(note, { when }) 으로 한꺼번에 예약하고,
  두더지 표시는 같은 시각에 맞춰 requestAnimationFrame에서 처리한다. 재생 중 다시 누르면 멈춤.
- 결과 화면 없음.

[자가진단 추가]
  T37 MODES에 classic·free가 있고, start({ mode: "free" }) 뒤 HUD 타이머가 숨겨지며, strike 1회 → playNote 1회(감싸서 셈)
  T38 labelHTML("G3","num")에 .oct.low, labelHTML("C5","num")에 .oct.high, labelHTML("E4","ko") === "미"

[완료 보고] 변경 파일 / 모드 객체 구조 요약 / 두더지잡기가 전과 똑같은지 확인한 방법
`````

### 6-B. 음 찾기

`````
[Phase 6-B — 음 찾기] AGENTS.md와 6-A의 모드 구조를 따른다. MODES.find 를 만들고 모드 카드를 켠다.

- 선택지(모드 카드 아래): 보고 찾기(sub "see") · 듣고 찾기(sub "hear"). 한 판 10문제.
- 문제 풀: 교사 설정 settings.tongues(Phase 9)가 있으면 그 텅만, 없으면 15개 전부.
  듣고 찾기는 처음 4문제를 도~솔(C4 D4 E4 F4 G4) 안에서 낸다(풀에 있을 때만). 같은 음을 연달아 내지 않는다.
  (풀이 1개뿐이면 '연달아 금지'를 건너뛴다. 무작위 재추첨은 최대 20번 — 무한 반복 금지)
- 한 문제:
    보고 찾기: HUD 가운데 큰 글자로 목표 음(labelHTML, 라벨 설정이 "off"면 "ko"로) + 목표 음을 한 번 들려준다.
    듣고 찾기: 글자 없이 목표 음만 들려준다. HUD에 [🔊 다시 듣기] 버튼, L 키도 같은 동작.
      (R 키는 낮은 파(F3) 연주 키라서 쓰지 않는다)
    아이가 텅을 친다:
      정답 → 그 텅에서 두더지가 튀어나와 기뻐함(celebrate) + 그 음, 0.7초 뒤 다음 문제
      오답 → 친 텅의 음이 그대로 난다(무엇이 틀렸는지 귀로 비교) + 친 텅에 잔물결(자유 연주와 같은 효과),
             HUD에 "다시 해 봐요". 같은 문제에서 2번 틀리면 정답 텅을 빛낸다(glowTongue 2) — 힌트
      텅 밖(콧수염 등): 무시
- 기록: firstTry(한 번에 맞힌 수), 문제별 { target, answers: [친 음들] }
- 결과(result):
    stars = TDG.rules.starsFor(firstTry / 10 * 100)
    lines: ["한 번에 맞힘", "8 / 10"], ["가장 헷갈린 음", "파(4) ↔ 솔(5)"]   ← 오답 (목표, 친 음) 쌍 중 가장 많은 것. 없으면 "없음 👍"
    recordKey: "find." + sub
- 문구: 3★ "음 박사! 🎓" 2★ "잘 찾았어요!" 1★ "조금씩 익숙해지고 있어요!" 0★ "천천히 다시 해 봐요."

[자가진단 추가]
  T39 (_debug.setSeed(3) 후) 첫 문제의 정답 텅을 strike → 문제 번호 +1 / 오답 텅 2번 → 정답 텅 glow / 콧수염 strike → 변화 없음

[완료 보고] 변경 파일 / 보고 찾기·듣고 찾기 한 판씩 해 본 결과
`````

### 6-C. 멜로디 두더지

`````
[Phase 6-C — 멜로디 두더지] AGENTS.md와 docs/PROMPTS.md 부록 C를 먼저 읽는다.

[작업 1] 곡 데이터
- js/songs.js 를 부록 C-2 코드 그대로 만든다. index.html: rules.js 다음 줄.
- node tests/logic.mjs → "131 passed, 0 failed"

[작업 2] 곡 고르기 — 멜로디 두더지를 고르면 곡 목록(제목 · 난이도 ●○○ · 음표 수 · 약 몇 초)
  마지막으로 고른 곡을 settings.songId 에 저장.

[작업 3] MODES.melody (usesTimer false)
- notes = TDG.songs.parseSong(song.notes).events.filter(e => e.note)   // 쉼표는 건너뜀
- 지금 칠 음의 텅에 두더지가 올라와 기다린다(시간 제한 없음). 라벨 설정이 켜져 있으면 두더지 위에 라벨.
- 다음 음 미리 보기(설정 "다음 음 미리 보기" settings.previewNext, 기본 켬): 다음 텅을 옅게(glowTongue 1). 같은 텅이 연속이면 표시 안 함.
- 맞는 텅을 침 → 그 음이 나고 두더지가 들어감 → 120ms 뒤 다음 두더지
  (같은 음이 연속이면 같은 자리에서 다시 튀어나와야 하므로 hide → 120ms → show 순서를 지킨다)
- 다른 텅을 침 → 그 텅의 음이 난다(벌 없음). 기다리던 두더지가 "여기예요!" 하며 살짝 흔들림. wrong++
- HUD: 곡 제목, 진행 막대(n / 전체), 맨 위에 다음 4개 음의 라벨 줄(악보 느낌)
- 마지막 음을 치면 "🎉 완주!" + [다시 들어보기] [결과 보기]
  다시 들어보기: 곡 전체를 bpm대로 자동 연주. 각 음의 시각 = 누적 박 × 60/bpm 초.
  소리는 audio.playNote(note, { when: ctx.currentTime + 초 }) 로 한꺼번에 예약하고,
  두더지는 같은 시각에 맞춰 requestAnimationFrame에서 올렸다 내린다. 재생 중 [멈춤] 가능.
- 결과: accuracy = notes.length / (notes.length + wrong) × 100 → starsFor, 줄: 걸린 시간, 틀린 텅 수
  recordKey: "melody." + song.id  (best = 정확도 %, bestTimeMs = 가장 빠른 완주 시간)

[작업 4] 리듬 모드(두더지가 박자에 맞춰 나오고 박 안에 쳐야 성공)는 이번에 만들지 않는다. 버튼도 만들지 않는다.

[자가진단 추가]
  T40 SONGS 전곡 validateSong 오류 0, 모든 음이 TDG.NOTE에 있음
  T41 "작은 별"에서 정답 텅만 순서대로 strike(자동) → 완주, 정확도 100%, 별 3

[완료 보고] 변경 파일 / 작은 별을 끝까지 쳐 본 결과 / 다시 들어보기가 박자에 맞는지
`````

### 6-D. 따라 치기

`````
[Phase 6-D — 따라 치기] AGENTS.md와 6-A의 모드 구조를 따른다. MODES.echo 를 만들고 모드 카드를 켠다.

- 목숨 3(♥♥♥), 가락 길이 2에서 시작, 최대 8.
- 음 풀: 길이 2~3 = 도~솔(C4~G4) / 길이 4~5 = 도~높은 도(C4~C5) / 길이 6~8 = 15음 전체.
  교사 설정 settings.tongues가 있으면 그 안에서만. 한 가락 안에서 같은 음이 3번 연속 나오지 않게.
  (풀이 2개 미만이면 '3번 연속 금지'를 건너뛴다. 재추첨은 최대 20번)
- 한 라운드:
  ① "잘 들어요 👂" — 가락을 들려준다: 음마다 그 텅에서 두더지가 0.45초 나왔다 들어감 + playNote. 음 간격 600ms.
     (소리는 when으로 한꺼번에 예약, 두더지는 같은 시각에 맞춰 RAF에서)
  ② "이제 따라 쳐요! 🔨" — 아이가 친다. 친 텅마다 두더지가 잠깐 올라오고 소리가 난다.
     순서대로 맞으면 계속, 끝까지 맞으면 🎉 + 길이 +1 → 다음 라운드
     틀리면 그 텅 소리 + "앗!" → 목숨 −1 → 1초 뒤 같은 가락을 다시 들려준다
  ③ 들려주는 동안에는 strike를 무시한다(소리도 내지 않음).
- 목숨이 0이 되면 끝. HUD: ♥ 목숨, 지금 길이, 최고 길이.
- 결과: 최고 길이 → 별(4 이상 ★, 6 이상 ★★, 8 ★★★), recordKey "echo"
- 이 모드는 키보드(Phase 7)와 소리만으로 끝까지 할 수 있다 → 7-C에서 안내 표시.

[자가진단 추가]
  T42 들려주는 중 strike → 무시(목숨·진행 변화 없음) / 올바른 순서 strike → 길이 +1 / 틀린 텅 → 목숨 −1

[완료 보고] 변경 파일 / 길이 4까지 해 본 결과
`````

### 완료 기준

- [ ] 시작 화면에서 모드 5개를 고를 수 있고, 두더지잡기는 Phase 5와 똑같이 동작한다
- [ ] 자유 연주: 텅을 치면 소리와 이름 말풍선이 뜨고, "방금 연주 듣기"가 친 박자 그대로 재생된다
- [ ] 음 찾기: 틀리면 친 텅 소리가 나서 비교가 되고, 두 번 틀리면 정답 텅이 빛난다
- [ ] 멜로디 두더지: 작은 별을 끝까지 치면 노래가 되고, "다시 들어보기"가 박자에 맞다
- [ ] 따라 치기: 길이가 늘어나고, 틀리면 같은 가락을 다시 들려준다
- [ ] 라벨 설정(숫자·계이름·음이름·끄기)이 모든 모드에 적용된다. 숫자 표기의 점이 제자리(낮은음 아래, 높은음 위)에 있다
- [ ] `node tests/logic.mjs` 131 passed, `?selftest=1` FAIL 0

### 흔한 실패

- 모드마다 판정·소리 코드를 따로 만듦 → strike 하나를 구독해서 쓴다(AGENTS.md 규칙 2).
- 자동 재생 박자를 `setTimeout` 여러 개로 맞춤 → 탭이 느려지면 박자가 무너진다. 소리는 `when`으로 오디오 시계에 예약.
- 같은 음이 연속인 곡(작은 별 "1 1 5 5")에서 두더지가 안 내려갔다 올라옴 → 아이는 두 번째를 쳐야 하는지 모른다. hide → 120ms → show.
- 따라 치기에서 들려주는 중에 친 것을 답으로 받음 → 들려주기 중 strike 무시.
- 라벨 점을 결합 문자(3̣, 1̇)로 씀 → 크롬북·안드로이드에서 점이 옆으로 밀린다.
- 곡 데이터를 파서 없이 배열로 직접 적음 → 박 수 검사가 안 돼서 틀린 박자가 그대로 들어간다. 반드시 숫자 악보 문자열 + validateSong.

---

## Phase 7 — 접근성·키보드·터치

| 항목 | 내용 |
|---|---|
| 목적 | ① 키보드로 15개 텅을 모두 칠 수 있게 ② 폰에서 두더지를 크게, 망치가 두더지를 가리지 않게 ③ 확대·대비·화면 낭독기·포커스 문제를 고친다 |
| 해결 | **D-07** 폰에서 작은 두더지·망치 가림 · **D-12** 접근성 · **D-13** 키보드 플레이 불가 |
| 선행 | Phase 6-A (모드 틀의 setHud·announce를 쓴다. 6-B~D와는 순서 무관) |
| 작업량 | 중간 (프롬프트 3개: 7-A → 7-B → 7-C) |
| 검증 결과 | 키 매핑 `keyToNote`: 15음 모두 키가 있고, Ctrl·Alt·Meta 조합과 Shift+4 이상은 무시(부록 E-2 검사). 폰 두더지 150% CSS: 390px 폰에서 20.3×22.7px → **30.4×34.0px**, 내려간 두더지는 가려져 안 보임(스크린샷 확인). 버튼 색 #3D6DB8 대비 **5.15:1**(현행 4.24:1), hover #2F5FA8 **6.32:1**(현행 3.28:1). |

### 7-A. 키보드로 연주하기

`````
[Phase 7-A — 키보드 연주] AGENTS.md와 docs/PROMPTS.md 부록 B-4(키 배치)를 먼저 읽는다.

[작업 1] 키 처리를 js/main.js 의 onKeyDown 하나로 합친다 (Phase 1의 Esc·P, 4-B의 M도 여기로 옮긴다)
    function onKeyDown(e) {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;         // 브라우저·OS 단축키, 누르고 있기는 무시
      if (e.code === "Escape") {                                          // Esc는 여기서만 처리한다
        e.preventDefault();
        if (!closeTopDialog()) togglePause();                             // 열린 창이 있으면 그 창만 닫는다
        return;
      }
      const inField = e.target.closest && e.target.closest("input, textarea, select, [contenteditable='true']");
      if (inField || e.isComposing) return;                               // 이름 입력칸 등에서는 글자 입력이 우선
      if (e.code === "KeyP") { e.preventDefault(); togglePause(); return; }
      if (e.code === "KeyM") { e.preventDefault(); toggleMute(); return; }
      if (e.code === "KeyK") { e.preventDefault(); toggleKeyHints(); return; }
      if (e.code === "KeyL") { e.preventDefault(); TDG.game.replayPrompt(); return; }   // 음 찾기 '다시 듣기'(다른 모드는 무시)
      const note = TDG.tongues.keyToNote(e);                              // 부록 B-3 (Shift+1~3 = 높은음)
      if (!note) return;
      e.preventDefault();
      const t = TDG.tongues.byNote[note];
      TDG.effects.moveHammerToTongue(t);                                  // 망치를 그 텅 가운데로 옮기고 휘두른다
      TDG.game.strike({ tongueId: t.id, source: "key" });
    }
    document.addEventListener("keydown", onKeyDown);
  - closeTopDialog(): 열린 대화 상자(일시정지·설정·도움말)가 있으면 닫고 true. 일시정지 창을 닫는 것 = resume. 없으면 false.
  - 대화 상자 안에 Esc 리스너를 따로 달지 않는다(한 번 누른 Esc가 두 번 처리되어 다시 멈춘다).
  - 한글 입력 상태에서도 연주 키는 e.code로 판단하므로 그대로 동작한다. e.key로 판단하지 않는다.
- 모든 모드(두더지잡기·음 찾기·멜로디·따라 치기·자유 연주)에서 그대로 동작해야 한다(strike 하나로 들어가므로).
- 기능 키(Esc·P·M·K·L)와 연주 키(E R T Y U, 1~7, Shift+1~3)는 겹치지 않는다. Enter·Space는 포커스된 버튼이 처리한다.

[작업 2] 키 안내
- ⚙ 설정 "키 안내 보기"(settings.keyHints, 기본 끔) 또는 K 키로 켜고 끔:
  각 텅의 두더지 자리→숫자 자리 선분의 35% 지점에 작은 키캡 배지(1~7 / E R T Y U / ⇧1 ⇧2 ⇧3)를 #tongue-layer에 그린다.
- 두더지잡기에서 마지막 입력이 키보드였다면, HUD 가운데에 지금 두더지가 있는 텅의 키를 크게 보여 준다("5", "⇧1", "E").
- ⚙ 설정 창 안에 "⌨ 키 안내" 표(부록 B-4 표와 같은 내용).

[자가진단 추가]
  T43 keydown { code: "Digit5" } → strike 1회, tongueId가 G4 텅(lower-left-outer)
  T44 Shift+Digit1 → C5 텅 / Ctrl+Digit1 → strike 없음 / repeat: true → strike 없음

[완료 보고] 변경 파일 / 키 안내 켠 화면 설명 / 키보드로만 두더지잡기 한 판 해 본 결과
`````

### 7-B. 터치·모바일

`````
[Phase 7-B — 터치와 모바일] AGENTS.md를 먼저 읽는다.

[작업 1] 폰에서 두더지 크게 — D-07 (390px 폰 기준 20×23px → 30×34px, 실측 검증됨)
  style.css 맨 끝(기존 모바일 미디어쿼리보다 뒤)에:
    @media (max-width: 640px) {
      .mole-slot { overflow: visible; clip-path: inset(-120% -60% 0 -60%); }
      .mole { width: 150%; max-width: none; }
    }
  (overflow: hidden 대신 clip-path로 아래쪽만 잘라서, 커진 두더지가 위·옆으로는 보이고 내려간 두더지는 숨는다)
  판정은 3-B의 합집합(타원 ∪ 텅 캡슐)이 이미 넓으므로 판정 코드는 건드리지 않는다.

[작업 2] 터치 망치가 두더지를 가리지 않게 — D-07
- pointerType === "touch" 인 pointerdown: 망치를 누른 자리에 보여 주고 휘두른 뒤 250ms 후 숨긴다
  (.hammer-cursor.touch-fade { opacity: 0; transition: opacity 150ms; } 를 붙였다 떼는 방식).
  마지막으로 친 자리에 망치가 계속 떠 있어 다음 두더지를 가리던 문제를 없앤다.
- 마우스·펜은 지금처럼 커서를 따라다닌다.
- 게임 시작 때 터치 기기에서 망치를 드럼 위에 미리 보여 주는 동작(positionHammerForTouch)은 유지하되 2초 뒤 숨긴다.

[작업 3] 터치 편의
- #game-screen { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; } (길게 누르기 메뉴·글자 선택 방지)
- 진동: 설정 "진동"(settings.vibrate, 기본 켬). 명중 때 if (navigator.vibrate) navigator.vibrate(12)
  (안드로이드만 동작. 아이폰은 지원하지 않으므로 설정 옆에 "안드로이드만" 표시)
- 멀티터치: 두 손가락으로 두 텅을 동시에 쳐도 둘 다 처리되는지 확인. "처리 중" 전역 플래그로 두 번째 터치를 막는 코드가 있으면 지운다.

[자가진단 추가]
  T45 (창 폭 ≤ 640px일 때만) 첫 .mole 의 getBoundingClientRect().width ≥ 28

[완료 보고] 변경 파일 / 폰(또는 개발자도구 390×844, 터치 에뮬레이션)에서 확인한 내용
`````

### 7-C. 접근성

`````
[Phase 7-C — 접근성] AGENTS.md를 먼저 읽는다.

[작업 1] 확대 허용 — axe meta-viewport
  <meta name="viewport" content="width=device-width, initial-scale=1">
  (user-scalable=no 삭제. 게임 화면의 확대·스크롤 방지는 이미 있는 #game-screen { touch-action: none } 이 한다.
   버튼·링크에는 touch-action: manipulation 을 준다 — 두 번 탭 확대 지연 방지)

[작업 2] 색 대비 — 흰 글자 18px 굵게는 4.5:1 이상 필요
  --color-primary:     #3D6DB8;   /* 흰 글자 대비 5.15:1 (현행 #4A7BC8 = 4.24:1) */
  --color-primary-hov: #2F5FA8;   /* hover는 밝게가 아니라 어둡게: 6.32:1 (현행 #5E8FD8 = 3.28:1) */

[작업 3] 화면 낭독기 알림
- <div id="sr-status" class="sr-only" aria-live="polite"></div>  (#game-container 안 맨 끝)
- .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
             clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
- 알릴 때(두더지 하나하나는 알리지 않는다 — 너무 잦다):
    게임 시작 "게임 시작! 30초 동안 두더지를 잡아요." / 남은 10초 "10초 남았어요." /
    끝 "게임 끝. 20마리 중 17마리를 잡았어요. 별 2개." /
    음 찾기 "3번 문제. 솔을 찾아요." / 따라 치기 "가락을 들려줄게요." → "따라 쳐요." /
    멜로디 두더지 "다음 음은 솔."(라벨 설정이 켜져 있을 때만)
  6-A의 api.announce(text)가 이 요소의 textContent를 바꾼다(같은 문장을 연속으로 알릴 때는 비웠다가 다음 프레임에 넣는다).

[작업 4] 대화 상자(일시정지·설정·도움말)
- #pause-overlay 와 ⚙ 설정 창을 #game-container 바로 아래(세 .screen section 밖)로 옮긴다.
  (Phase 1에서는 #pause-overlay가 #game-screen 안에 있다. 그대로 두고 #game-screen에 inert를 걸면 "계속하기"까지 눌리지 않는다)
- 열 때 첫 버튼에 포커스, Tab이 창 밖으로 나가지 않게(마지막 → 첫 번째로 순환).
- 창이 열린 동안 세 .screen section에만 inert 속성(지원하지 않는 브라우저는 aria-hidden="true")을 건다. 대화 상자나 그 조상에는 걸지 않는다.
- Esc는 7-A의 onKeyDown 한 곳에서만 처리한다(대화 상자에 따로 달지 않는다).
- 닫으면 연 버튼으로 포커스를 돌려준다. 단 일시정지 창을 닫아 게임이 이어질 때는 #game-screen에 포커스(Phase 1과 같음).
- 결과 화면은 대화 상자가 아니라 화면이므로 Esc로 닫지 않는다.

[작업 5] 그 밖
- 모든 버튼·라디오·카드에 :focus-visible { outline: 3px solid #FFB74D; outline-offset: 3px; } (기존 primary-btn 규칙을 공통으로)
- 소리만으로 할 수 있는 모드 카드(따라 치기·음 찾기의 듣고 찾기·자유 연주)에 "⌨🔊 키보드와 소리만으로 할 수 있어요" 표시
- 버튼 누를 자리는 44×44px 이상(⏸·🔊·⚙ 확인)

[자가진단 추가]
  T46 meta viewport의 content에 "user-scalable=no" 가 없다
  T47 #start-btn 의 배경색·글자색 대비(getComputedStyle 값으로 WCAG 식 계산) ≥ 4.5
  T48 #sr-status 가 있고 aria-live="polite", 게임 시작 1초 뒤 textContent가 비어 있지 않다

[확인 도구] 크롬 개발자도구 → Lighthouse → 접근성 점수, (선택) axe DevTools 확장
[완료 보고] 변경 파일 / Lighthouse 접근성 점수 / 자가진단 결과
`````

### 완료 기준

- [ ] 키보드만으로 시작 → 연주 → 일시정지 → 결과 → 다시 시작까지 된다
- [ ] 숫자 1~7, E R T Y U, Shift+1~3으로 15개 텅이 모두 울린다. Ctrl+숫자는 브라우저 탭 전환에 그대로 양보된다
- [ ] K 키로 텅 위에 키 안내가 나타난다
- [ ] 폰 세로에서 두더지가 눈에 띄게 커졌고, 내려간 두더지는 보이지 않는다
- [ ] 폰에서 친 뒤 망치가 사라져 다음 두더지를 가리지 않는다
- [ ] 폰에서 두 손가락으로 확대가 된다(게임 화면 안은 제외)
- [ ] 화면 낭독기(아이폰 VoiceOver·안드로이드 TalkBack·크롬 확장 등)로 시작·10초 남음·결과가 읽힌다
- [ ] Lighthouse 접근성 90점 이상
- [ ] `?selftest=1` → FAIL 0

### 흔한 실패

- 음 찾기의 "다시 듣기"를 R 키로 만듦 → R은 낮은 파(F3) 연주 키. L 키를 쓴다.
- 대화 상자의 조상(#game-screen)에 inert → 창 안 버튼까지 눌리지 않는다. 대화 상자는 .screen 밖에 둔다.
- Esc를 document와 대화 상자 두 곳에서 처리 → 한 번 누른 Esc로 재개했다가 곧바로 다시 멈춘다.
- `keydown`에서 `e.key`("1", "!", "ㄷ")로 판단 → 한글 입력 상태·Shift 상태에 따라 값이 바뀐다. 반드시 `e.code`.
- 연주 키에 `preventDefault()`를 안 해서 스페이스·숫자가 페이지 스크롤이나 버튼 클릭을 같이 일으킴.
- 폰 두더지 키우기 블록을 파일 앞쪽에 둠 → 기존 `.mole-slot { overflow: hidden }`에 덮여 효과 없음(AGENTS.md 규칙 10).
- `aria-live="assertive"`로 모든 알림을 보냄 → 낭독기가 계속 끊긴다. 카운트다운만 assertive, 나머지는 polite.
- 확대를 허용하면서 `#game-screen`의 `touch-action: none`까지 지움 → 게임 중 화면이 스크롤·확대된다.

---

## Phase 8 — PWA·오프라인·공유

| 항목 | 내용 |
|---|---|
| 목적 | 학교 와이파이가 끊겨도 수업이 멈추지 않게(한 번 연 기기는 오프라인에서도 동작), 태블릿 홈 화면에 앱처럼 설치, 결과 공유 |
| 해결 | D-20 공유 미리보기·설치 정보 · **D-21** 오프라인 불가 |
| 선행 | Phase 2 (아이콘·공유 이미지). 파일 목록이 거의 확정된 뒤(Phase 6 이후)에 하는 것이 편하다 |
| 작업량 | 작음~중간 (AI 세션 1회) |
| 검증 결과 | 아래 `sw.js`를 Phase 1·2 적용본에 붙여 헤드리스 크롬으로 확인: 두 번째 방문부터 서비스워커가 페이지를 제어, **오프라인 새로고침에서 첫 화면·드럼 그림·게임 시작 정상**, `?selftest=1`처럼 주소 뒤에 값이 붙어도 오프라인에서 열림, 서버 파일을 바꾸면 **온라인 새로고침 한 번에 새 버전**, 목록에 없는 파일을 일부러 넣어도 설치 성공(그 파일만 경고), `?nosw=1`로 등록 해제 확인. (부록 E-4) |

### 복사용 프롬프트 — Phase 8

`````
[Phase 8 — 오프라인·설치·공유] AGENTS.md를 먼저 읽는다.

[작업 1] manifest.webmanifest (저장소 루트)
    {
      "name": "텅드럼 두더지잡기",
      "short_name": "텅드럼 게임",
      "description": "텅드럼 그림의 15개 텅에서 튀어나오는 두더지를 잡으며 텅 위치와 음을 익히는 음악 게임",
      "lang": "ko",
      "start_url": "./",
      "scope": "./",
      "display": "standalone",
      "orientation": "any",
      "background_color": "#FFFFFF",
      "theme_color": "#FFFFFF",
      "icons": [
        { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
      ]
    }
  index.html <head>에 <link rel="manifest" href="manifest.webmanifest">
  (아이콘은 Phase 2의 tools/make_assets.py가 이미 만들었다. 없으면 다시 실행한다)

[작업 2] sw.js (저장소 루트. js/ 폴더에 두면 안 된다)
- docs/PROMPTS.md의 "Phase 8 참조 코드 — sw.js" 그대로 만든다.
- PRECACHE 목록을 실제 파일과 하나씩 대조한다. 없는 파일이 있어도 설치는 되지만 콘솔에 경고가 난다 → 경고 0이 되게 맞춘다.

[작업 3] 등록 (js/main.js)
    function setupServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
      if (new URLSearchParams(location.search).has("nosw")) {          // 문제가 생겼을 때 탈출구
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
        return;
      }
      const secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
      if (!secure) return;                                                // file://에서는 등록하지 않는다
      window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
    }

[작업 4] 설치 안내 (⚙ 설정 창 아래쪽)
- 안드로이드 크롬: beforeinstallprompt 이벤트를 preventDefault 하고 보관 → [📲 앱으로 설치] 버튼 → 보관한 이벤트.prompt()
- 아이폰·아이패드 사파리: "공유 버튼 → 홈 화면에 추가" 안내 문구(설치 버튼 없음)
- 이미 설치된 앱으로 실행 중이면(matchMedia("(display-mode: standalone)").matches) 안내를 숨긴다.

[작업 5] 결과 공유
- 결과 화면에 [공유] 버튼:
    const url = "https://kimyounggaur.github.io/Tonguedrum_Game/";   // 현재 주소가 아니라 배포 주소 고정
    const text = `텅드럼 두더지잡기 ${모드 이름}에서 ${점수 또는 핵심 결과}! ${"★".repeat(stars)}`;
    if (navigator.share) navigator.share({ title: "텅드럼 두더지잡기", text, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(`${text} ${url}`).then(() => toast("링크를 복사했어요"));
- toast(): 화면 아래 가운데, 2초, role="status".

[작업 6] 오프라인 배지: navigator.onLine 이 false면 시작 화면 구석에 "오프라인 — 저장된 게임으로 실행 중"
  (online·offline 이벤트로 갱신)

[작업 7] AGENTS.md "절대 규칙"에 한 줄 추가:
  14. 파일을 추가·삭제·이름 변경하면 sw.js의 PRECACHE를 고치고 VERSION을 올린다.
      (내용만 바꾼 경우는 올리지 않아도 된다 — 네트워크 우선이라 온라인이면 항상 최신 파일을 받는다)

[자가진단 추가]
  T49 link[rel=manifest] 가 있다
  T50 https 또는 localhost 이면 navigator.serviceWorker.ready 를 최대 5초 기다려 등록이 있다
      (첫 방문은 load 뒤에 등록되므로 기다린다) / file://이면 "skip". (?nosw=1 해제는 tests/offline.mjs가 확인한다)
  T51 navigator.share 를 잠시 없애고 공유 버튼 → navigator.clipboard.writeText 가 호출된다(감싸서 확인 후 원상복구)

[완료 보고] 추가 파일 / PRECACHE 목록과 실제 파일 대조 결과 / 자가진단 결과 / (가능하면) node tests/offline.mjs 결과
`````

### Phase 8 참조 코드 — `sw.js`

"네트워크 우선 → 실패하면 캐시" 전략입니다. 캐시 우선 방식은 빠르지만, 배포할 때 버전 올리는 것을 한 번만 잊어도 학생 기기에 옛 버전이 계속 남습니다. 이 게임은 파일이 작아서(약 700KB) 네트워크 우선의 비용이 거의 없습니다.

```js
/* sw.js — 오프라인 지원 (저장소 루트에 둔다. 부록 E-4에서 검증).
   전략: 같은 출처 GET은 "네트워크 우선 → 실패·시간 초과면 캐시".
   온라인이면 항상 최신 파일을 받으므로 배포 후 옛 파일이 남는 문제가 없고, 오프라인이면 마지막으로 받은 파일로 동작한다. */
const VERSION = "tdg-v1";                 // 캐시 이름. PRECACHE 목록을 바꿀 때만 올린다.
const PRECACHE = [                        // 모두 상대 경로(GitHub Pages 하위 경로 /Tonguedrum_Game/ 대응)
  "./", "index.html", "style.css", "manifest.webmanifest",
  "js/config.js", "js/tongues.js", "js/storage.js", "js/audio.js", "js/effects.js",
  "js/rules.js", "js/songs.js", "js/game.js", "js/ui.js", "js/debug.js", "js/main.js",
  "assets/tonguedrum-1024.webp", "assets/tonguedrum-2048.webp",
  "assets/mole.png", "assets/hammer.png", "assets/star.png",
  "assets/icons/favicon-32.png", "assets/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // addAll은 파일 하나만 없어도 전체가 실패하므로 하나씩 넣고, 실패한 파일은 콘솔에만 알린다
    const results = await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: "reload" }))));
    results.forEach((r, i) => { if (r.status === "rejected") console.warn("[sw] 미리 저장 실패:", PRECACHE[i]); });
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tdg-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // cache: "no-cache" = 브라우저 HTTP 캐시가 있어도 서버에 "바뀌었나?"를 물어본다(안 바뀌었으면 304로 가볍게 끝남).
      // 이게 없으면 GitHub Pages의 10분 캐시 때문에 새 index.html과 옛 js가 섞일 수 있다.
      const res = await Promise.race([fetch(req, { cache: "no-cache" }), timeout(req.mode === "navigate" ? 4000 : 8000)]);
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    } catch (_) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === "navigate") {
        const shell = (await cache.match("index.html")) || (await cache.match("./"));
        if (shell) return shell;
      }
      return new Response("오프라인이에요. 인터넷에 연결한 뒤 다시 열어 주세요.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  })());
});
```

### 완료 기준

- [ ] (배포 후) 크롬 개발자도구 → Application → Manifest: 오류 없음, 아이콘 3개 보임
- [ ] Application → Service workers: `sw.js` 가 activated
- [ ] 한 번 연 기기에서 비행기 모드 → 새로고침 → 두더지잡기 한 판이 된다(소리 포함)
- [ ] 파일을 고쳐 배포한 뒤 온라인에서 새로고침 한 번이면 새 버전이 보인다
- [ ] 안드로이드: "앱으로 설치" → 홈 화면 아이콘으로 전체 화면 실행 / 아이폰: "홈 화면에 추가" 안내가 보인다
- [ ] 공유 버튼: 폰에서는 공유 창, PC에서는 "링크를 복사했어요"
- [ ] `?nosw=1`로 열면 서비스워커가 해제된다
- [ ] `?selftest=1` → FAIL 0

### 흔한 실패

- `sw.js`를 `js/` 폴더에 둠 → 제어 범위가 `/js/`로 좁아져 페이지를 제어하지 못한다. 루트에 둔다.
- 캐시 우선(cache-first)으로 바꾸고 `VERSION` 올리는 것을 잊음 → 배포해도 학생 기기에 옛 버전이 남는다.
- `cache.addAll()`에 없는 파일이 하나 있어 설치 전체가 실패 → 오프라인이 조용히 안 된다. 참조 코드는 하나씩 넣어 실패를 격리한다.
- `/index.html`처럼 `/`로 시작하는 경로 → GitHub Pages의 `/Tonguedrum_Game/` 아래에서 깨진다. 전부 상대 경로.
- 개발 중 옛 서비스워커가 붙잡고 있어 수정이 안 보임 → `?nosw=1` 또는 개발자도구 Application → Unregister.
- `fetch(req)`만 쓰고 `cache: "no-cache"`를 빼먹음 → GitHub Pages의 10분 캐시 때문에 새 `index.html`과 옛 `js`가 섞일 수 있다.

---

## Phase 9 — 수업 도구

| 항목 | 내용 |
|---|---|
| 목적 | 선생님이 수업 목표에 맞게 게임을 좁히고(시간·난이도·쓰는 텅·보이는 모드), **링크 하나로 반 전체 설정을 맞추고**, 교실 공용 태블릿에서 순위표를 쓰고, 결과를 카드 이미지로 남긴다 |
| 해결 | (기회) 수업 운영 |
| 선행 | Phase 6 (모드), Phase 5 (기록) |
| 작업량 | 중간 (프롬프트 3개: 9-A → 9-B → 9-C. 9-B·9-C는 서로 독립) |

### 9-A. 선생님 설정과 링크 프리셋

`````
[Phase 9-A — 선생님 설정과 링크 프리셋] AGENTS.md를 먼저 읽는다.

[작업 1] ⚙ 설정 창에 탭 두 개: [학생] 소리·라벨·진동·키 안내 / [선생님] 아래 항목
- 선생님 탭은 설정 창 제목을 2초 길게 누르거나 주소에 ?teacher=1 을 붙이면 보인다
  (아이들이 실수로 바꾸지 않게 하는 장치일 뿐 보안 기능은 아니다 — 화면에도 그렇게 적는다).
- 항목(모두 settings에 저장):
    게임 시간: 20 · 30 · 45 · 60초 (time, 기본 30) — 두더지잡기
    난이도 고정: 없음 · 쉬움 · 보통 · 어려움 (levelLock) — 고정하면 시작 화면 난이도 선택을 숨긴다
    사용할 텅: [15개 전부] [가운데 1~7] [도~솔 1~5] [직접 고르기] (tongues: null 또는 ["C4","D4",…])
      직접 고르기 = 작은 드럼 그림(#tongue-layer 캡슐 재사용) 위에서 텅을 눌러 켜고 끔. 최소 1개.
      두더지잡기(spawner의 tongues)·음 찾기·따라 치기의 출제 범위가 된다.
    보이는 모드: 5개 체크(modesVisible, 최소 1개)
    텅 이름 표시 고정: 학생 탭에서 못 바꾸게(labelLock)
    순위표 사용: 끔(기본)·켬 (boardEnabled, 9-B)

[작업 2] 링크 프리셋 — 링크 하나로 반 전체를 같은 설정으로
- 읽는 주소 파라미터:
    mode=classic|find|melody|echo|free   level=easy|normal|hard   time=20|30|45|60
    tongues=all|mid|five|C4,D4,E4(쉼표 목록)   label=num|ko|abc|off   song=곡 id   sub=see|hear
- 알 수 없는 값은 조용히 무시하고 기본값을 쓴다(오류 창 금지).
- 파라미터 해석은 순수 함수 TDG.ui.parsePreset(searchString) → { mode, level, time, tongues, label, song, sub } 로 만든다
  (알 수 없는 값은 결과에서 빠진다).
- 저장된 설정을 덮어쓰지 않고 "이번 접속에만" 적용한다:
    프리셋은 TDG.preset 에 따로 두고, 게임은 항상 TDG.effectiveSettings() = { ...TDG.settings, ...TDG.preset } 로 읽는다.
    저장(saveSettings)은 TDG.settings 만 한다 — 프리셋을 TDG.settings에 섞으면 다음 음소거 저장 때 함께 저장되어 버린다.
    지금까지 TDG.settings.x 를 직접 읽던 곳은 모두 effectiveSettings()로 바꾼다.
- 시작 화면 위에 배지:
    "👩‍🏫 선생님 설정 적용 중 (45초 · 쉬움 · 도~솔) [해제]" — 해제하면 파라미터 없는 주소로 이동.
- 선생님 탭 [이 설정으로 링크 만들기]: 현재 선생님 설정을 위 파라미터로 만든 배포 주소
  (https://kimyounggaur.github.io/Tonguedrum_Game/?…)를 화면에 보여 주고 복사 버튼.
  QR 코드는 만들지 않는다(라이브러리 금지) — "QR이 필요하면 복사한 링크를 QR 생성 사이트에 붙여 넣으세요" 안내.

[작업 3] 게임 반영
- durationMs = time × 1000. HUD 타이머·결과·기록 키에 시간 반영(기록 키 예: classic.normal.45).
- 출제 풀 = 허용 텅. 따라 치기의 단계별 풀과 허용 텅의 교집합이 비면 허용 텅 전체를 쓴다.

[자가진단 추가]
  T52 TDG.ui.parsePreset("?tongues=C4,D4,E4&time=45") → tongues ["C4","D4","E4"], time 45.
      그 값을 TDG.preset에 잠시 넣고 시작(skipCountdown) → 판 길이 45초, 8초 동안 나온 두더지가 모두 C4·D4·E4 텅 → 원상복구
  T53 TDG.ui.parsePreset("?level=zzz&time=7&tongues=C9") → 세 값이 모두 빠진 빈 프리셋, 콘솔 오류 없음

[완료 보고] 변경 파일 / 만든 링크 예시 3개(초등 저학년용·고학년용·청음용)와 각각의 설정
`````

### 9-B. 교실 순위표 (같은 기기)

`````
[Phase 9-B — 교실 순위표] AGENTS.md를 먼저 읽는다. 선생님 설정 "순위표 사용"이 켜져 있을 때만 보인다.

- 저장: TDG.storage 키 STORAGE_KEYS.board. 구조 { "classic.normal.30": [ { name, score, stars, date } … ], … }
  (모드·난이도·시간 조합마다 따로, 점수 높은 순 최대 10개. 같은 점수면 먼저 세운 기록이 위)
  모드별 점수: 두더지잡기 = 점수, 음 찾기 = 한 번에 맞힌 수, 멜로디 = 정확도(%), 따라 치기 = 최고 길이. 자유 연주는 없음.
- 판이 끝났을 때 10위 안이면 결과 화면에 이름 입력:
    <input maxlength="8" placeholder="별명을 써 주세요" autocomplete="off">
    앞뒤 공백 제거, 한글·영문·숫자·공백만 남김, 비면 "익명". [저장] 후 순위표에서 내 줄을 강조.
- 보기: 결과 화면 🏆 탭, 시작 화면 🏆 버튼(현재 선택한 모드·난이도·시간의 순위표).
- 지우기: 선생님 탭의 [순위표 지우기] → 앱 안 확인 창("정말 지울까요? 되돌릴 수 없어요" [지우기] [취소]).
  window.confirm·alert는 쓰지 않는다(전체 화면·설치 앱에서 어색하고 테스트를 멈춘다).
- 안내 문구: "순위표는 이 기기에만 저장돼요. 실명 대신 별명을 써 주세요."
- 이름 입력칸에서 글자를 칠 때 P·M·K·L 단축키나 연주 키가 끼어들지 않는지 확인한다(7-A onKeyDown의 입력칸 가드).

[자가진단 추가]
  T54 (Phase 0 규칙대로 저장소를 백업·복원) 같은 조합에 기록 11개를 넣으면 10개만 남고 점수 높은 순 / 이름 "  <b>민수</b>123456789 " → "b민수b1234" 처럼 허용 글자만 8자

[완료 보고] 변경 파일 / 순위표 화면 설명
`````

### 9-C. 결과 카드 이미지

`````
[Phase 9-C — 결과 카드] AGENTS.md를 먼저 읽는다.

- 결과 화면 [🖼 결과 카드] → <canvas width="1080" height="1350"> 에 그린다(화면에는 줄여서 미리보기):
    배경 #F6F0FC, 위쪽에 드럼 그림(이미 불러온 텅드럼 이미지를 재사용, 폭 70%),
    제목 "텅드럼 두더지잡기", 모드·난이도·시간, 큰 글자 핵심 결과(점수 또는 "8 / 10"), 별,
    보조 줄 2~3개(잡은 비율·최고 콤보 등), 날짜 YYYY.MM.DD, 순위표 이름이 있으면 이름.
    글꼴은 CSS와 같은 목록. 그리기 전에 await document.fonts.ready.
- [이미지 저장]: canvas.toBlob(png) → URL.createObjectURL → <a download="tonguedrum-결과-YYYYMMDD.png">.click() → revokeObjectURL
- [공유]: const file = new File([blob], 이름, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "텅드럼 두더지잡기" })
          else 저장으로 대신한다.
- file://로 연 경우: 로컬 이미지를 캔버스에 그리면 캔버스가 '오염'되어 toBlob이 SecurityError를 낸다
  → try/catch로 잡아 드럼 그림 없이 다시 그리고 저장한다.

[자가진단 추가]
  T55 결과 카드 캔버스가 1080×1350이고 toBlob이 blob을 돌려준다(file://에서는 그림 없는 대체본으로 성공)

[완료 보고] 변경 파일 / 카드 이미지 예시 설명
`````

### 완료 기준

- [ ] 선생님 탭에서 "도~솔 1~5"를 고르면 두더지·음 찾기·따라 치기가 그 다섯 텅에서만 나온다
- [ ] "이 설정으로 링크 만들기"로 만든 링크를 다른 기기에서 열면 같은 설정으로 시작되고, 배지의 [해제]로 풀린다
- [ ] 잘못된 주소 값(`?level=zzz`)을 넣어도 오류 없이 기본값으로 동작한다
- [ ] 순위표: 10위 안에 들면 별명을 넣고, 공용 태블릿에서 반 아이들 기록이 쌓인다. 지우기는 선생님 탭에서만
- [ ] 결과 카드 이미지를 저장·공유할 수 있다
- [ ] `?selftest=1` → FAIL 0

### 흔한 실패

- 링크 프리셋을 저장된 설정에 덮어씀 → 다음 날 다른 반이 쓰면 설정이 꼬인다. "이번 접속에만".
- 알 수 없는 파라미터 값에 오류 창 → 선생님이 링크를 손으로 고치다 틀리면 수업이 멈춘다. 조용히 무시.
- 순위표 이름을 `innerHTML`로 넣음 → `<b>` 같은 글자가 그대로 해석된다. `textContent`로만 넣는다.
- QR 코드를 만들려고 외부 라이브러리·CDN 추가 → AGENTS.md 스택 규칙 위반. 링크 복사로 충분.
- 결과 카드에서 `document.fonts.ready`를 기다리지 않음 → 첫 카드만 기본 글꼴로 그려진다.

---

## 부록 A. 실측 데이터

측정 환경: 헤드리스 Chromium(Playwright 1.56), 로컬 서버, 커밋 `1bae5d7`. "수정안"은 Phase 1·2의 참조 코드를 실제로 적용한 사본에서 잰 값입니다. 같은 측정을 두 번 한 항목은 두 값을 모두 적었습니다(측정마다 조금씩 다릅니다).

### A-1. 두더지 자리 ↔ 그림 속 텅 정렬 (9개 화면, D-01)

| 화면 | 스테이지 (현행) | 그림이 실제로 그려진 크기 (현행) | 최대 오차 (현행) | 스테이지 = 그림 (수정안) | 최대 오차 (수정안) |
|---|---|---|---|---|---|
| 데스크톱 1920×947 | 1200×758 (비율 1.584) | 780×758 | **130.5px** | 819×795 | 0.1px |
| 노트북 1440×789 | 1200×631 (1.901) | 650×632 | **170.9px** | 788×765 | 0.2px |
| 노트북 1366×657 | 1200×526 (2.283) | 542×526 | **204.6px** | 652×633 | 0.1px |
| 크롬북 1280×632 | 1200×506 (2.373) | 521×506 | **211.1px** | 626×608 | 0.1px |
| 아이패드 가로 1180×820 | 1133×656 (1.727) | 676×656 | **142.0px** | 820×796 | 0.3px |
| 아이패드 세로 820×1180 | 787×765 (1.030) | 788×765 | 0.3px | 787×765 | 0.2px |
| 폰 세로 390×844 | 390×379 (1.030) | 391×380 | 0.3px | 390×379 | 0.3px |
| 폰 가로 844×390 | 810×312 (2.597) | 322×313 | **151.8px** | 377×366 | 0.2px |
| 안드로이드 360×740 | 360×350 (1.030) | 361×351 | 0.3px | 360×350 | 0.3px |

- 그림 비율은 1.0297(3609/3505). 스테이지 비율이 이 값에서 벗어난 만큼 두더지가 어긋납니다. 1px 미만은 반올림 오차입니다.
- 가장 크게 어긋나는 텅은 모든 가로 화면에서 `right-mid-outer`(A4, 오른쪽 가운데 바깥)였습니다.
- 현행에서 HUD(타이머·점수)가 그림과 겹친 화면: 1366×657, 1280×632, 844×390. 수정안에서는 0개.
- 수정안에서 1366×657 노트북의 드럼은 542px → 652px로 **20% 커집니다**.

### A-2. 봇 자동 플레이 (현행 코드, 30초)

| 봇 | 나온 두더지 | 잡은 두더지 | 점수 | 결과 문구 |
|---|---|---|---|---|
| 안 침 | 19 | 0 | 0 | 조금만 더 연습해요! |
| 나오자마자 침(0ms) | 36 | 36 | 360 | 두더지 마스터! 🏆 |
| 300ms 뒤 | 26 | 26 | 260 | 두더지 마스터! 🏆 |
| 450ms 뒤 | 24 | 23 | 230 | 두더지 마스터! 🏆 |
| 600ms 뒤 | 21 | 20 | 200 | 두더지 마스터! 🏆 |
| 750ms 뒤 | 19 | 18 | 180 | 두더지 마스터! 🏆 |
| 900ms 뒤 | 18 | 17 | 170 | 두더지 마스터! 🏆 |

- 첫 두더지: 시작 버튼 후 142~332ms (D-10). 안 맞은 두더지가 실제로 머문 시간: 900~1338ms.
- 느린 봇(900ms)도 "마스터" — 150점 기준은 16마리라서 게임 구조와 맞지 않습니다(D-09).

### A-3. 저사양 프레임 (CPU 4배 감속, 게임 화면 5초 평균, D-04)

| 조건 | 1280×632 | 1920×947 |
|---|---|---|
| 현행 (1차 측정) | 31.6fps | 19.9fps |
| 현행 (2차 측정) | 37.5fps · 33ms 넘는 프레임 36개 | 21.1fps · 33ms 넘는 프레임 78개, 긴 프레임 21개(합 1.7초) |
| filter 애니메이션 2개만 제거 (1차 / 2차) | 60 / 59.6fps | 59.8 / 60fps |
| 장식 애니메이션 전부 제거 | 60fps | 60fps |
| **제안안: 그림자 레이어(Phase 2 작업 1)** | **59.6fps** | **59.6fps** |

### A-4. 첫 화면 로딩 (폰 390×844 에뮬레이션, D-15)

| 네트워크 | 현행 PNG 517KB | WebP 79~161KB (Phase 2) |
|---|---|---|
| Fast 3G | LCP **4.54초** (1차) / 4.71초 (2차), load 4.48초 | LCP **1.97초** (1차) / 1.99초 (2차), load 2.26초 |
| Slow 4G | LCP 1.56초 | LCP 0.64초 |

### A-5. 접근성 (axe-core 검사 + 직접 확인, D-03·D-12)

| 항목 | 결과 |
|---|---|
| 시작 화면 | color-contrast(심각) `#start-btn`, meta-viewport(보통) |
| 게임 화면 | meta-viewport |
| 결과 화면 | color-contrast `#restart-btn`, meta-viewport |
| 버튼 대비 | 흰 글자 / `#4A7BC8` **4.24:1**, hover `#5E8FD8` **3.28:1** → 제안 `#3D6DB8` 5.15:1, hover `#2F5FA8` 6.32:1 |
| 포커스 | 시작 후·종료 후 모두 `BODY`로 사라짐 |
| aria-live | 0개 |
| 모션 감소 | 설정을 켜도 배경 5초·드럼 1.8초·스테이지 1.8초·글리프 4.8초 무한 애니메이션이 그대로. 브라우저가 해석한 규칙에는 `transition-duration: 70ms`만 남고 `animation-duration: 50%`는 버려짐 |

### A-6. 탭 동결 (D-02)

| | 동결 전 | 12.4초 동결 후 | 재개 2.2초 뒤 |
|---|---|---|---|
| 현행 | 남은 27초, running | **남은 15초**, running (일시정지 없음) | — |
| 수정안(Phase 1) | 남은 27초 | **남은 27초**, paused, "잠깐 멈춤" 창, 포커스 `#resume-btn` | 남은 25초, running, 포커스 `#game-screen` |

### A-7. 음원 엔진 (OfflineAudioContext 렌더링, 피크 dBFS — 0을 넘으면 찢어짐)

| 상황 | 제안 엔진 (볼륨 0.7) | 리미터 없음 | 볼륨 0.35 | 음소거 |
|---|---|---|---|---|
| 단음 C4 | −4.2 | −5.2 | −5.9 | 무음 |
| 6음 동시 | −2.3 | **+7.8** | −3.4 | 무음 |
| 30연타(10ms 간격) | −1.7 | **+8.6** | −2.7 | 무음 |
| 같은 텅 2번(50ms) | −4.1 | −2.5 | −4.6 | 무음 |
| 틱 / 틱(강조) | −13.1 / −9.3 | −13.1 / −9.3 | −19.1 / −15.3 | 무음 |
| 끝 징글 | −3.8 | −3.1 | −4.6 | 무음 |

- 리버브 임펄스를 난수로 만들기 때문에 측정마다 ±0.3dB 정도 달라집니다(이전 측정: 리미터 없음 30연타 +8.4dBFS).
- 볼륨 0.82·리미터 없는 초기 구성에서는 6음 동시 +9.1dBFS였습니다.
- 현행 타격음: 모든 텅이 440Hz 사인파 0.08초. 틱: `timer-tick.wav` 0.24초 48kHz 모노 23KB를 `HTMLAudio`로 재생, 볼륨 0.42(마지막 10초 0.58).

### A-8. 망치·타이머·키보드 (D-05·D-13·D-19)

| 항목 | 현행 | 수정안 |
|---|---|---|
| 휘두르는 중 게임 종료 → 결과 화면 | `swinging` 남음 | 없음 |
| 그 상태로 다시 시작 | `swinging` 남음 | 없음 |
| Tab → Enter로 시작했을 때 망치 위치 | (−34, −100) 화면 왼쪽 위 구석 | 드럼 가운데 |
| 시작 10초 뒤 추적 중인 타이머 수 | 27개(계속 증가) | 실행된 타이머는 즉시 제거(Phase 3) |
| 숫자 키로 치기 | 점수 0 (반응 없음) | 15개 텅 모두(Phase 7) |

### A-9. 이미지 용량

| 파일 | 크기 | 용량 | 디코딩 메모리 |
|---|---|---|---|
| `tonguedrum.png` (현행) | 3609×3505 | 517KB | 48.3MB |
| `tonguedrum-2048.webp` | 2048×1989 | 161KB | 15.5MB |
| `tonguedrum-1024.webp` | 1024×994 | 79KB | 3.9MB |
| (참고) 1600px WebP / 2048px PNG | 1600×1554 / 2048×1989 | 126KB / 807KB | 9.5MB / 15.5MB |
| `mole.png` · `hammer.png` · `star.png` · `plus10.png` | 93×104 · 231×222 · 124×124 · 136×52 | 20 · 26 · 21 · 11KB | — |

### A-10. 폰에서 두더지·판정 크기 (390×844, D-07)

| 항목 | 현행 | 개선 |
|---|---|---|
| 두더지 그림 | 20.3×22.7px | **30.4×34.0px** (150%, Phase 7-B) |
| 판정 영역 | 타원 24×44px | 타원 ∪ 텅 캡슐 — 캡슐 평균 면적이 타원의 **1.88배** (Phase 3-B), 손가락은 여유 1.25배 |
| 망치 | 마지막으로 친 자리에 계속 떠 있음 | 친 뒤 250ms 후 사라짐 (Phase 7-B) |

---

## 부록 B. 텅 ↔ 음 매핑표와 TONGUES 데이터

### B-1. 15개 텅

그림에 인쇄된 흰 숫자 15개와 옥타브 점 8개를 이미지 분석으로 찾아 두더지 자리와 짝지었습니다. 숫자는 윗부분이 드럼 중심을 향하도록 돌아가 있으므로 **점이 중심 쪽이면 높은음, 테두리 쪽이면 낮은음**입니다.

| 순서 | 텅 id (두더지 자리) | 음 | 숫자 | 계이름 | 그림 속 위치 | 키보드 |
|---|---|---|---|---|---|---|
| 1 | `center-upper` | E3 | .3 | 낮은 미 | 가운데 큰 텅(얼굴 코 자리) | E |
| 2 | `bottom-center` | F3 | .4 | 낮은 파 | 맨 아래 | R |
| 3 | `lower-left-inner` | G3 | .5 | 낮은 솔 | 왼쪽 아래 안쪽 | T |
| 4 | `lower-right-inner` | A3 | .6 | 낮은 라 | 오른쪽 아래 안쪽 | Y |
| 5 | `left-mid-inner` | B3 | .7 | 낮은 시 | 왼쪽 가운데 안쪽 | U |
| 6 | `right-mid-inner` | C4 | 1 | 도 | 오른쪽 가운데 안쪽 | 1 |
| 7 | `upper-left-inner` | D4 | 2 | 레 | 위 왼쪽 안쪽 | 2 |
| 8 | `upper-right-inner` | E4 | 3 | 미 | 위 오른쪽 안쪽 | 3 |
| 9 | `lower-right-outer` | F4 | 4 | 파 | 오른쪽 아래 바깥 | 4 |
| 10 | `lower-left-outer` | G4 | 5 | 솔 | 왼쪽 아래 바깥 | 5 |
| 11 | `right-mid-outer` | A4 | 6 | 라 | 오른쪽 가운데 바깥 | 6 |
| 12 | `left-mid-outer` | B4 | 7 | 시 | 왼쪽 가운데 바깥 | 7 |
| 13 | `right-upper-outer` | C5 | 1' | 높은 도 | 오른쪽 위 바깥 | Shift+1 |
| 14 | `left-upper-outer` | D5 | 2' | 높은 레 | 왼쪽 위 바깥 | Shift+2 |
| 15 | `top-center` | E5 | 3' | 높은 미 | 맨 위 | Shift+3 |

- 가운데 E3에서 시작해 아래 → 왼쪽 → 오른쪽으로 번갈아 올라가는 전형적인 텅드럼 배치이고, 형제 앱 Tonguedrum_Play의 15키 음 목록(E3~E5, C Major)과 같습니다.
- 텅 id는 현행 `TONGUE_SLOTS`의 id를 그대로 씁니다(x·y 값도 같음).
- ⚠ 이 그림이 수업에서 쓰는 실물 15키와 같은 배치인지 강사 확인이 필요합니다(부록 F-1).

### B-2. `js/config.js` (최종 모습)

Phase 3-A에서 `GameStatus`·`GAME` 기본값(현행 상수를 이 이름으로)·`DIFFICULTY.normal`(현행 두더지 시간), 3-B에서 `DRUM_W`·`DRUM_H`·`KEYMAP`·`SHIFT_HIGH`·`GAME.touchTolerance`, 4-B에서 `STORAGE_KEYS`, 5-A에서 나머지(카운트다운·점수 규칙·쉬움/어려움·`STARS`·`COUNTDOWN` 상태)를 채워 이 모습이 됩니다. 이름을 바꾸지 마세요 — 뒤 Phase의 프롬프트와 `tests/logic.mjs`가 이 이름을 씁니다.

```js
/* js/config.js — 상수만 둔다. DOM·window 이외 전역 접근 금지(Node 테스트에서도 읽힘). */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});

  TDG.config = {
    DRUM_W: 3609,                 // 텅드럼 원본 이미지 크기 — 비율 계산은 이 상수로만(naturalWidth 금지)
    DRUM_H: 3505,

    GameStatus: { IDLE: "idle", COUNTDOWN: "countdown", RUNNING: "running", PAUSED: "paused", ENDED: "ended" },

    GAME: {
      durationMs: 30000,          // 한 판 시간(교사 설정으로 20/30/45/60초)
      countdownMs: 3000,          // 3·2·1
      scorePerHit: 10,
      goldenScore: 30,            // 황금 두더지
      comboBonusFrom: 5,          // 연속 5마리부터
      comboBonus: 5,              //   한 마리당 +5
      hitReactionMs: 420,         // 맞은 두더지가 흔들리다 내려가기까지 (현행 HIT_REACTION_MS)
      hitStarMs: 300,             // 별 터짐 연출 (현행 HIT_STAR_MS)
      scorePopMs: 500,            // 점수 팝 연출 (현행 PLUS10_FLOAT_MS)
      hammerSwingMs: 180,         // (현행 HAMMER_SWING_MS)
      timerWarnSec: 10,           // (현행 TIMER_WARN_SEC)
      touchTolerance: 1.25,       // 손가락 판정 여유(텅 캡슐 반폭의 배수). 마우스·펜은 1.0
    },

    // 부록 D — 시뮬레이션으로 확인한 값. 'normal'은 현행 수치와 같다.
    DIFFICULTY: {
      easy:   { label: "쉬움",   enterMs: 160, visibleMs: [1400, 1900], leaveMs: 200, gapMs: [300, 600], maxConcurrent: 1, rampTo: 1.0,  goldenChance: 0.10 },
      normal: { label: "보통",   enterMs: 140, visibleMs: [750, 1200],  leaveMs: 180, gapMs: [120, 350], maxConcurrent: 1, rampTo: 0.85, goldenChance: 0.08 },
      hard:   { label: "어려움", enterMs: 120, visibleMs: [560, 900],   leaveMs: 160, gapMs: [80, 250],  maxConcurrent: 2, rampTo: 0.8,  goldenChance: 0.06, secondMoleFromMs: 10000 },
    },

    // 별점 = 나온 두더지 중 잡은 비율(%) — 점수 절댓값이 아니라 비율로 매긴다(D-09)
    STARS: [40, 65, 85],

    // 부록 B — 가운데 옥타브는 숫자, 낮은 옥타브는 숫자 3~7 바로 아래 글쇠, 높은 옥타브는 Shift+1~3
    KEYMAP: {
      Digit1: "C4", Digit2: "D4", Digit3: "E4", Digit4: "F4", Digit5: "G4", Digit6: "A4", Digit7: "B4",
      Numpad1: "C4", Numpad2: "D4", Numpad3: "E4", Numpad4: "F4", Numpad5: "G4", Numpad6: "A4", Numpad7: "B4",
      KeyE: "E3", KeyR: "F3", KeyT: "G3", KeyY: "A3", KeyU: "B3",
    },
    SHIFT_HIGH: { Digit1: "C5", Digit2: "D5", Digit3: "E5" },

    STORAGE_KEYS: { settings: "tdg.settings.v1", records: "tdg.records.v1", board: "tdg.board.v1" },
  };
})();
```

### B-3. `js/tongues.js`

`tests/logic.mjs`로 검사: 45개 기준점(두더지 자리·숫자 자리·중간점)이 손가락 여유(1.25)를 줘도 모두 자기 텅, 콧수염·눈·드럼 밖은 판정 없음.

```js
/* js/tongues.js — 음 데이터·텅 좌표·판정(순수 함수, DOM 없음). 부록 B. */
(function () {
  "use strict";
  const TDG = (window.TDG = window.TDG || {});
  const { DRUM_W, DRUM_H, KEYMAP, SHIFT_HIGH } = TDG.config;

  // Tonguedrum_Play와 같은 값. num: ".3"=낮은 3(점 아래), "1'"=높은 1(점 위)
  const NOTE = {
    E3: { freq: 164.81, midi: 52, num: ".3", ko: "낮은 미" },
    F3: { freq: 174.61, midi: 53, num: ".4", ko: "낮은 파" },
    G3: { freq: 196.00, midi: 55, num: ".5", ko: "낮은 솔" },
    A3: { freq: 220.00, midi: 57, num: ".6", ko: "낮은 라" },
    B3: { freq: 246.94, midi: 59, num: ".7", ko: "낮은 시" },
    C4: { freq: 261.63, midi: 60, num: "1",  ko: "도" },
    D4: { freq: 293.66, midi: 62, num: "2",  ko: "레" },
    E4: { freq: 329.63, midi: 64, num: "3",  ko: "미" },
    F4: { freq: 349.23, midi: 65, num: "4",  ko: "파" },
    G4: { freq: 392.00, midi: 67, num: "5",  ko: "솔" },
    A4: { freq: 440.00, midi: 69, num: "6",  ko: "라" },
    B4: { freq: 493.88, midi: 71, num: "7",  ko: "시" },
    C5: { freq: 523.25, midi: 72, num: "1'", ko: "높은 도" },
    D5: { freq: 587.33, midi: 74, num: "2'", ko: "높은 레" },
    E5: { freq: 659.25, midi: 76, num: "3'", ko: "높은 미" },
  };

  // 좌표는 모두 "텅드럼 원본 이미지 3609×3505 기준 %".
  // x,y = 두더지 자리(기존 TONGUE_SLOTS와 같은 값) / lx,ly = 그림에 인쇄된 숫자 위치 / hw = 텅 캡슐 반폭(가로 % 단위)
  const TONGUES = [
    { id: "center-upper",      note: "E3", x: 57.16, y: 35.09, lx: 57.74, ly: 40.11, hw: 4.6 },
    { id: "bottom-center",     note: "F3", x: 57.42, y: 62.66, lx: 57.33, ly: 77.02, hw: 4.4 },
    { id: "lower-left-inner",  note: "G3", x: 41.90, y: 54.90, lx: 32.96, ly: 61.19, hw: 4.0 },
    { id: "lower-right-inner", note: "A3", x: 73.92, y: 55.86, lx: 81.73, ly: 61.50, hw: 4.0 },
    { id: "left-mid-inner",    note: "B3", x: 36.92, y: 38.35, lx: 28.74, ly: 36.10, hw: 3.8 },
    { id: "right-mid-inner",   note: "C4", x: 76.94, y: 37.42, lx: 86.44, ly: 34.05, hw: 3.6 },
    { id: "upper-left-inner",  note: "D4", x: 48.61, y: 24.52, lx: 44.33, ly: 15.25, hw: 3.6 },
    { id: "upper-right-inner", note: "E4", x: 64.96, y: 22.71, lx: 67.88, ly: 14.47, hw: 3.6 },
    { id: "lower-right-outer", note: "F4", x: 68.43, y: 65.78, lx: 73.05, ly: 73.64, hw: 3.6 },
    { id: "lower-left-outer",  note: "G4", x: 45.32, y: 66.75, lx: 41.80, ly: 74.13, hw: 3.6 },
    { id: "right-mid-outer",   note: "A4", x: 81.08, y: 47.52, lx: 88.30, ly: 48.28, hw: 3.3 },
    { id: "left-mid-outer",    note: "B4", x: 32.25, y: 47.65, lx: 26.73, ly: 49.01, hw: 3.3 },
    { id: "right-upper-outer", note: "C5", x: 75.03, y: 26.14, lx: 79.04, ly: 22.43, hw: 3.2 },
    { id: "left-upper-outer",  note: "D5", x: 37.08, y: 26.75, lx: 32.89, ly: 23.45, hw: 3.2 },
    { id: "top-center",        note: "E5", x: 56.47, y: 17.20, lx: 56.16, ly: 11.99, hw: 3.0 },
  ];

  // 점(px,py)과 텅 중심선(두더지 자리→숫자 자리) 사이 거리. 세로 %를 가로 % 단위로 바꿔 등방성으로 잰다.
  function segDist(px, py, t) {
    const k = DRUM_H / DRUM_W;
    const ax = t.x, ay = t.y * k, bx = t.lx, by = t.ly * k, qx = px, qy = py * k;
    const vx = bx - ax, vy = by - ay;
    const len2 = vx * vx + vy * vy || 1e-9;
    const u = Math.max(0, Math.min(1, ((qx - ax) * vx + (qy - ay) * vy) / len2));
    return Math.hypot(qx - (ax + u * vx), qy - (ay + u * vy));
  }

  // 가장 가까운 텅(거리/반폭 최소). tolerance 1 = 캡슐 안쪽만, 1.25 = 손가락 여유. 없으면 null
  function pointToTongue(px, py, tolerance = 1, pool = TONGUES) {
    let best = null;
    for (const t of pool) {
      const r = segDist(px, py, t) / t.hw;
      if (r <= tolerance && (!best || r < best.r)) best = { tongue: t, r };
    }
    return best;
  }

  // 기존 판정(두더지 중심 타원 rx 3.1 · ry 5.8)과 같은 식 — 새 판정이 기존보다 엄격해지지 않게 합집합으로 쓴다
  function inMoleEllipse(px, py, t, rx = 3.1, ry = 5.8) {
    const dx = px - t.x, dy = py - t.y;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  // rect = #stage.getBoundingClientRect() (Phase 1 이후 스테이지 비율 = 그림 비율)
  function clientToDrum(clientX, clientY, rect) {
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  }
  function drumToClient(x, y, rect) {
    return { clientX: rect.left + (x / 100) * rect.width, clientY: rect.top + (y / 100) * rect.height };
  }

  // 키 → 음. 조합키(Ctrl·Alt·Meta)는 브라우저·OS 단축키에 양보한다.
  function keyToNote(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return null;
    if (e.shiftKey) return SHIFT_HIGH[e.code] || null;
    return KEYMAP[e.code] || null;
  }

  // 글자 라벨. style: "num"(숫자 표기 ".5"·"1'") | "ko"(계이름 "낮은 솔") | "abc"(음이름 "G3") | "off"
  // 화면에 숫자를 그릴 때는 ui.js의 labelHTML이 ".5"의 점을 CSS 점으로 바꿔 그린다.
  function noteLabel(noteId, style = "num") {
    const n = NOTE[noteId];
    if (!n || style === "off") return "";
    if (style === "ko") return n.ko;
    if (style === "abc") return noteId;
    return n.num;
  }

  const byId = Object.fromEntries(TONGUES.map((t) => [t.id, t]));
  const byNote = Object.fromEntries(TONGUES.map((t) => [t.note, t]));

  TDG.NOTE = NOTE;
  TDG.TONGUES = TONGUES;
  TDG.tongues = { NOTE, TONGUES, byId, byNote, segDist, pointToTongue, inMoleEllipse, clientToDrum, drumToClient, keyToNote, noteLabel };
})();
```

### B-4. 키보드 배치

```
 숫자 줄   [1 도] [2 레] [3 미] [4 파] [5 솔] [6 라] [7 시]        ← 가운데 옥타브(그림의 숫자 그대로)
 바로 아래          [E 낮은 미][R 낮은 파][T 낮은 솔][Y 낮은 라][U 낮은 시]   ← 숫자 3~7 바로 아래 글쇠 = 점 아래 음(.3~.7)
 Shift +  [1 높은 도] [2 높은 레] [3 높은 미]                     ← 점 위 음(1'~3')
```

- 외우는 법: "숫자 바로 아래 글쇠는 그 숫자의 낮은음" (E는 3 아래, U는 7 아래).
- 숫자패드 1~7도 가운데 옥타브. Ctrl·Alt·Cmd 조합은 받지 않고 브라우저 단축키에 양보합니다.
- 형제 앱은 낮은음을 Ctrl+3~7로 칩니다. 게임에서 다르게 한 이유와 선택지는 부록 F-5.
- 기능 키: Esc·P 일시정지 / M 음소거 / K 키 안내 / L 다시 듣기(음 찾기). 연주 키와 겹치지 않습니다.

---

## 부록 C. 곡 데이터 형식과 수록곡

### C-1. 숫자 악보 문법

| 쓰는 법 | 뜻 | 예 |
|---|---|---|
| `1`~`7` | 가운데 옥타브 도~시 | `5` = 솔 |
| `.3`~`.7` | 낮은음(점 아래) | `.5` = 낮은 솔 |
| `1'`~`3'` | 높은음(점 위) | `1'` = 높은 도 |
| (길이 기호 없음) | 1박 | `5` |
| `_` | 0.5박 | `3_` |
| `*` | 1.5박(점음표) | `5*` |
| `-` | 1박씩 늘임 | `5-` = 2박, `1---` = 4박 |
| `0` | 쉼표(1박, 길이 기호 가능) | `0-` = 2박 쉼 |
| `\|` | 마디선(박 수 검사용) | |

`meter`(한 마디 박 수), `pickup`(못갖춘마디 첫 마디 박 수), `bpm`, `level`(1~3)을 함께 적습니다. 15키 음역(E3~E5) 밖의 음이나 오타는 파서가 오류로 막습니다.

### C-2. `js/songs.js`

수록곡은 모두 퍼블릭 도메인 선율이고 가사는 싣지 않습니다.

```js
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
```

### C-3. 검증 결과

| 곡 | 박자 | 음표 | 박 | 길이(bpm 기준) | 쓰는 음 |
|---|---|---|---|---|---|
| 15음 음계 오르내리기 | 4/4 | 30 | 32 | 19.2초 | 15음 전부 |
| 작은 별 | 4/4 | 42 | 48 | 30.0초 | 도 레 미 파 솔 라 |
| 비행기 | 4/4 | 25 | 32 | 19.2초 | 도 레 미 솔 |
| 런던 다리 | 4/4 | 24 | 32 | 19.2초 | 도 레 미 파 솔 라 |
| 환희의 송가 | 4/4 | 62 | 64 | 38.4초 | 낮은 솔 도 레 미 파 솔 |
| 생일 축하합니다 | 3/4 (못갖춘마디 1박) | 25 | 24 | 16.0초 | 낮은 솔·라·시 도 레 미 파 솔 |
| 징글벨 (후렴) | 4/4 | 51 | 64 | 34.3초 | 도 레 미 파 솔 |

잘못된 토큰 거부 확인: `4'`(음역 밖) · `.2`(음역 밖) · `8`(없는 숫자) · `5x`(오타) · `.5'`(낮은음·높은음 동시).

### C-4. 선생님이 곡을 추가하는 법

1. 교재의 숫자 악보를 C-1 문법으로 옮겨 `SONGS` 배열에 한 줄 추가합니다(`id`는 영문 소문자).
2. 터미널에서 `node tests/logic.mjs` → `FAIL`이 없으면 박 수와 음역이 맞는 것입니다.
3. 저작권이 남아 있는 곡(최근 창작 동요·가요)은 넣지 않습니다(부록 F-7).

---

## 부록 D. 난이도 파라미터와 시뮬레이션

### D-1. 난이도 값 (`TDG.config.DIFFICULTY`)

| 값 | 뜻 | 쉬움 | 보통 (= 현행) | 어려움 |
|---|---|---|---|---|
| `enterMs` | 올라오는 시간 | 160 | 140 | 120 |
| `visibleMs` | 머무는 시간(무작위 범위) | 1400~1900 | 750~1200 | 560~900 |
| `leaveMs` | 내려가는 시간 | 200 | 180 | 160 |
| `gapMs` | 다음 두더지까지 간격 | 300~600 | 120~350 | 80~250 |
| `maxConcurrent` | 동시에 나올 수 있는 수 | 1 | 1 | 2 (10초부터) |
| `rampTo` | 판 끝에서 머무는 시간 배율(점점 빨라짐) | 1.0 (그대로) | 0.85 | 0.8 |
| `goldenChance` | 황금 두더지 확률 | 10% | 8% | 6% |

점수: 기본 10 · 황금 30 · 연속 5마리째부터 한 마리당 +5. 별: 나온 두더지 중 잡은 비율 40% ★ · 65% ★★ · 85% ★★★.

### D-2. `js/rules.js`

```js
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
```

### D-3. 시뮬레이션 결과 (`node tests/logic.mjs`)

반응 속도가 일정한 봇 — 잡은 수 / 나온 수(잡은 비율):

| 난이도 | 안 침 | 300ms | 600ms | 900ms | 1200ms |
|---|---|---|---|---|---|
| 쉬움 | 0/13 | 22/22 (100%) | 18/18 (100%) | 15/16 (94%) | 13/14 (93%) |
| 보통 | 0/21 | 26/27 (96%) | 21/22 (95%) | 19/21 (90%) | 3/21 (14%) |
| 어려움 | 0/46 | 48/49 (98%) | 44/46 (96%) | 3/46 (7%) | 0/46 (0%) |

사람 흉내 봇(반응 0.45~1.1초 고르게, 15%는 빗나감), 시드 8개:

| 난이도 | 잡은 비율 | 별 |
|---|---|---|
| 쉬움 | 73~94% | ★★ ~ ★★★ |
| 보통 | 64~77% | 대부분 ★★ |
| 어려움 | 30~44% | ☆ ~ ★ |

- 불변식 검사: 같은 텅에 두 마리 0회, 동시 등장 수 초과 0회, 같은 시드 = 같은 순서, 텅을 1개만 허용해도 계속 등장.
- '보통'의 안 침 21마리는 현행 실측 19마리와 같은 범위입니다(시드에 따라 16~24).
- 별 기준 40·65·85%는 "보통에서 대부분 별 2개, 잘하면 3개"가 되도록 잡은 초기값입니다. 수업에서 조정하세요(부록 F-11).

---

## 부록 E. 검증 스크립트

모두 `tests/`(개발용) 또는 `tools/`에 두는 파일이며, 배포된 게임 동작과는 무관합니다. 이 문서를 쓰면서 실제로 실행해 결과를 확인했습니다.

| 파일 | 하는 일 | 필요한 것 | 작성 중 실행 결과 |
|---|---|---|---|
| `tests/layout.mjs` | 9개 화면에서 두더지 자리 ↔ 그림 속 텅 오차 | Node 18+, Playwright, 로컬 서버 | 현행 **LAYOUT FAIL (최대 211.2px)** / Phase 1 적용본 **LAYOUT PASS (9개 화면 0px)** |
| `tests/logic.mjs` | 텅 판정·키 매핑·스케줄러·점수·곡 파서 | Node 18+만 | **131 passed, 0 failed** (Phase 3 시점 104개, Phase 5 시점 112개) |
| `tests/audio.mjs` | 음원 엔진을 렌더링해 피크 음량 | Node 18+, Playwright | **AUDIO PASS** (단음 −4.2 · 6음 −2.3 · 30연타 −1.6~−1.8 dBFS, 음소거·`stopAll` 무음) |
| `tests/offline.mjs` | 서비스워커 오프라인 동작 | Node 18+, Playwright, 로컬 서버 | **OFFLINE PASS** (Phase 1·2 적용본 + 참조 `sw.js`) |
| `tools/make_assets.py` | WebP·아이콘·공유 이미지 생성 | Python 3, Pillow | WebP 79·161KB, 아이콘 5종, 공유 이미지 58KB |

Playwright 준비(한 번만, `tests/` 안에만 설치 — AGENTS.md 스택 규칙의 예외 범위):

```bash
cd tests && npm init -y && npm install -D playwright && npx playwright install chromium && cd ..
python3 -m http.server 8000          # 다른 터미널에서 켜 둔다
node tests/layout.mjs http://localhost:8000/
```

### E-1. `tests/layout.mjs`

```js
// tests/layout.mjs — 9개 화면 크기에서 "두더지 자리(DOM) ↔ 그림 속 텅(이미지 좌표)" 오차를 잰다.
// 사용: node tests/layout.mjs http://localhost:8000/     (Node 18+, Playwright 필요)
// 기준: 모든 화면에서 최대 오차 ≤ 1px 이면 통과(종료 코드 0), 아니면 1.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:8000/";
const OUT = "tests/output";
const DRUM_W = 3609, DRUM_H = 3505;              // 텅드럼 원본 이미지 크기(비율 기준, naturalWidth 쓰지 않음)
const VIEWPORTS = [
  ["desktop-1920x947", 1920, 947], ["laptop-1440x789", 1440, 789], ["laptop-1366x657", 1366, 657],
  ["chromebook-1280x632", 1280, 632], ["ipad-land-1180x820", 1180, 820, true], ["ipad-port-820x1180", 820, 1180, true],
  ["phone-port-390x844", 390, 844, true], ["phone-land-844x390", 844, 390, true], ["android-360x740", 360, 740, true],
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let worst = 0;
const rows = [];
for (const [name, width, height, touch] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: !!touch, isMobile: !!touch && width < 900 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click("#start-btn");
  await page.waitForTimeout(600);                 // 카운트다운이 있으면 넉넉히
  // 숨쉬기(scale) 애니메이션이 측정값을 흔들지 않도록 측정 순간에는 모든 애니메이션을 끈다
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(100);
  const r = await page.evaluate(({ DRUM_W, DRUM_H }) => {
    // Phase 3 이후: window.TDG.TONGUES / 현행: 전역 const TONGUE_SLOTS (const 전역은 window 속성이 아님에 주의)
    const slots = (window.TDG && window.TDG.TONGUES) || (typeof TONGUE_SLOTS !== "undefined" ? TONGUE_SLOTS : []);
    const img = document.querySelector("#stage img.tonguedrum, #stage .tonguedrum img, #stage img");
    const ir = img.getBoundingClientRect();
    const s = Math.min(ir.width / DRUM_W, ir.height / DRUM_H);          // object-fit: contain
    const cw = DRUM_W * s, ch = DRUM_H * s;
    const cx = ir.x + (ir.width - cw) / 2, cy = ir.y + (ir.height - ch) / 2;
    let max = 0, maxId = "";
    for (const t of slots) {
      const el = document.querySelector(`.mole-slot[data-tongue-id="${t.id}"], .mole-slot[data-slot-id="${t.id}"]`);
      if (!el) continue;
      const b = el.getBoundingClientRect();
      const dx = b.x + b.width / 2 - (cx + (t.x / 100) * cw);
      const dy = b.y + b.height / 2 - (cy + (t.y / 100) * ch);
      const d = Math.hypot(dx, dy);
      if (d > max) { max = d; maxId = t.id; }
    }
    return { max: +max.toFixed(1), maxId, drum: `${Math.round(cw)}×${Math.round(ch)}` };
  }, { DRUM_W, DRUM_H });
  await page.screenshot({ path: `${OUT}/${name}.png` });
  worst = Math.max(worst, r.max);
  rows.push({ 화면: name, 드럼: r.drum, 최대오차px: r.max, 위치: r.maxId, 판정: r.max <= 1 ? "PASS" : "FAIL" });
  await ctx.close();
}
await browser.close();
console.table(rows);
console.log(worst <= 1 ? "LAYOUT PASS" : `LAYOUT FAIL (최대 ${worst}px)`);
process.exit(worst <= 1 ? 0 : 1);
```

### E-2. `tests/logic.mjs`

```js
// tests/logic.mjs — 순수 로직(텅 판정·키 매핑·스케줄러·점수·곡 파서)을 브라우저 없이 검사한다.
// 사용: node tests/logic.mjs      (Node 18+, 설치할 것 없음)
// js/*.js는 클래식 스크립트(window.TDG)라서 vm으로 가짜 window를 만들어 읽는다.
// 아직 없는 파일·기능은 건너뛴다: rules.js의 스케줄러는 Phase 5(3-B에는 mulberry32만), songs.js는 Phase 6.
import fs from "node:fs";
import vm from "node:vm";

const win = {};
const sandbox = vm.createContext({ window: win, console, Math });
for (const f of ["config.js", "tongues.js", "rules.js", "songs.js"]) {
  const url = new URL(`../js/${f}`, import.meta.url);
  if (!fs.existsSync(url)) { console.log(`(건너뜀: js/${f} 없음)`); continue; }
  vm.runInContext(fs.readFileSync(url, "utf8"), sandbox, { filename: f });
}
const TDG = win.TDG;
const { TONGUES, NOTE, pointToTongue, inMoleEllipse, keyToNote } = TDG.tongues;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL", msg); } };

// 1) 텅 데이터와 판정
ok(TONGUES.length === 15, "텅 15개");
ok(new Set(TONGUES.map((t) => t.note)).size === 15 && TONGUES.every((t) => NOTE[t.note]), "음 15개, 모두 NOTE에 있음");
for (const tol of [1, TDG.config.GAME.touchTolerance]) {
  for (const t of TONGUES) {
    ok(pointToTongue(t.x, t.y, tol)?.tongue.id === t.id, `tol ${tol} 두더지 자리 → ${t.id}`);
    ok(pointToTongue(t.lx, t.ly, tol)?.tongue.id === t.id, `tol ${tol} 숫자 자리 → ${t.id}`);
    ok(pointToTongue((t.x + t.lx) / 2, (t.y + t.ly) / 2, tol)?.tongue.id === t.id, `tol ${tol} 텅 중간 → ${t.id}`);
  }
  ok(pointToTongue(57.45, 47.5, tol) === null, `tol ${tol} 콧수염 → null`);
  ok(pointToTongue(46.5, 38.5, tol) === null && pointToTongue(67.5, 38.5, tol) === null, `tol ${tol} 눈 → null`);
  ok(pointToTongue(5, 45, tol) === null, `tol ${tol} 드럼 밖 → null`);
}
ok(TONGUES.every((t) => inMoleEllipse(t.x, t.y, t) && !inMoleEllipse(t.x + 3.2, t.y, t)), "기존 타원 식");

// 2) 키보드
const K = (code, m = {}) => keyToNote({ code, shiftKey: !!m.s, ctrlKey: !!m.c, altKey: !!m.a, metaKey: !!m.m });
ok(K("Digit1") === "C4" && K("Digit7") === "B4" && K("Numpad5") === "G4", "숫자 1~7 = 가운데 옥타브");
ok(K("Digit1", { s: 1 }) === "C5" && K("Digit3", { s: 1 }) === "E5" && K("Digit4", { s: 1 }) === null, "Shift+1~3 = 높은음");
ok(K("KeyE") === "E3" && K("KeyU") === "B3" && K("KeyQ") === null, "E R T Y U = 낮은음");
ok(K("Digit1", { c: 1 }) === null && K("Digit1", { a: 1 }) === null && K("Digit1", { m: 1 }) === null, "Ctrl·Alt·Meta 조합은 무시");
const mapped = new Set([...Object.values(TDG.config.KEYMAP), ...Object.values(TDG.config.SHIFT_HIGH)]);
ok(TONGUES.every((t) => mapped.has(t.note)), "15음 모두 키가 있음");

// 3) 스케줄러 — 16ms 스텝으로 30초를 돌리며 reaction(ms) 뒤에 때리는 봇
if (TDG.rules && TDG.rules.createSpawner && TDG.config.DIFFICULTY && TDG.config.DIFFICULTY.easy) {
const { createSpawner, mulberry32, pointsFor, starsFor } = TDG.rules;
function simulate(difficulty, reaction, seed = 7, durationMs = 30000) {
  const cfg = TDG.config.DIFFICULTY[difficulty];
  const sp = createSpawner({ cfg, durationMs, rng: mulberry32(seed), tongues: TONGUES });
  const botRng = mulberry32(seed + 1000);
  let escaped = 0, maxAlive = 0;
  for (let t = 0; t <= durationMs; t += 16) {
    for (const ev of sp.update(t)) if (ev.type === "leave" && ev.escaped) escaped++;
    for (const m of sp.moles) {
      if (m.hitAt !== null || m.tried) continue;
      const rt = typeof reaction === "function" ? (m.rt ??= reaction(botRng)) : reaction;
      if (rt === null || t < m.spawnAt + rt) continue;
      m.tried = true;                                                   // 한 마리에 한 번만 시도
      if (m.miss ??= (typeof reaction === "function" && botRng() < 0.15)) continue;   // 사람 봇: 15%는 빗나감
      if (sp.hittable(m.tongueId, t) === m && t < durationMs) sp.hit(m, t);
    }
    const alive = sp.moles.filter((m) => t >= m.spawnAt && t < m.goneAt);
    if (new Set(alive.map((m) => m.tongueId)).size !== alive.length) throw new Error("같은 텅에 두 마리");
    if (alive.length > cfg.maxConcurrent) throw new Error("동시 등장 수 초과");
    maxAlive = Math.max(maxAlive, alive.length);
  }
  const spawns = sp.moles.filter((m) => m.spawnAt < durationMs).length;
  const hits = sp.moles.filter((m) => m.hitAt !== null).length;
  return { spawns, hits, rate: Math.round((hits / spawns) * 100), escaped, maxAlive, seq: sp.moles.map((m) => m.tongueId).join(",") };
}
for (const d of ["easy", "normal", "hard"]) {
  const rows = [null, 300, 600, 900, 1200].map((r) => ({ r, ...simulate(d, r) }));
  console.log(d.padEnd(6), rows.map((x) => `${x.r === null ? "안 침" : x.r + "ms"} ${x.hits}/${x.spawns}(${x.rate}%)`).join(" | "));
}
const idle = simulate("normal", null);
ok(idle.spawns >= 16 && idle.spawns <= 24, `보통·안 침 등장 16~24마리(현행 실측 19): ${idle.spawns}`);
ok(simulate("normal", 300, 42).seq === simulate("normal", 300, 42).seq, "같은 시드 = 같은 순서(재현성)");
ok(simulate("normal", 300, 42).seq !== simulate("normal", 300, 43).seq, "다른 시드 = 다른 순서");
ok(simulate("hard", 300).maxAlive === 2 && simulate("normal", 300).maxAlive === 1, "어려움만 동시 2마리");
const one = createSpawner({ cfg: TDG.config.DIFFICULTY.normal, durationMs: 30000, rng: mulberry32(1), tongues: [TONGUES[5]] });
let n1 = 0; for (let t = 0; t <= 30000; t += 16) n1 += one.update(t).filter((e) => e.type === "spawn").length;
ok(n1 >= 10, `텅 1개만 쓰는 설정에서도 계속 나옴: ${n1}마리`);

// 사람 흉내 봇(반응 450~1100ms 고르게, 15% 빗나감) — 별점 기준 참고용(부록 D)
const human = (rng) => 450 + rng() * 650;
for (const d of ["easy", "normal", "hard"]) {
  const rates = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => simulate(d, human, s).rate);
  console.log(`사람봇 ${d.padEnd(6)} 잡은 비율 ${rates.join("% ")}% → 별 ${rates.map((r) => starsFor(r)).join(" ")}`);
}

// 4) 점수·별점
ok(pointsFor({ golden: false, combo: 1 }) === 10 && pointsFor({ golden: true, combo: 1 }) === 30, "기본 10 · 황금 30");
ok(pointsFor({ golden: false, combo: 5 }) === 15 && pointsFor({ golden: true, combo: 7 }) === 35, "연속 5마리째부터 +5");
ok(starsFor(39) === 0 && starsFor(40) === 1 && starsFor(65) === 2 && starsFor(85) === 3 && starsFor(100) === 3, "별점 경계 40·65·85");
}

// 5) 곡
if (TDG.songs) {
const { parseSong, validateSong, SONGS } = TDG.songs;
for (const s of SONGS) {
  const errs = validateSong(s);
  ok(errs.length === 0, `${s.id}: ${errs.join(", ")}`);
  const notes = parseSong(s.notes).events.filter((e) => e.note);
  ok(notes.every((e) => TONGUES.some((t) => t.note === e.note)), `${s.id}: 모든 음이 텅에 있음`);
}
for (const bad of ["4'", ".2", "8", "5x", ".5'"]) {
  let threw = false; try { parseSong(bad); } catch (_) { threw = true; }
  ok(threw, `잘못된 토큰 거부: ${bad}`);
}
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

### E-3. `tests/audio.mjs` (+ 자가진단용 `renderPeak`)

Phase 4의 자가진단(T22~T25)은 아래 `renderPeak` 함수를 `js/debug.js`에 넣어 브라우저 안에서 같은 방식으로 잽니다.

```js
// tests/audio.mjs — 음원 엔진을 실제로 렌더링해 피크 음량(dBFS)을 잰다. 0을 넘으면 소리가 찢어진다.
// 사용: node tests/audio.mjs      (Node 18+, Playwright 필요: tests/README.md)
import { chromium } from "playwright";
import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(`../js/${f}`, import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (const f of ["config.js", "tongues.js", "audio.js"]) await page.addScriptTag({ content: read(f) });

const rows = await page.evaluate(async () => {
  async function renderPeak(setup, { volume = 0.7, muted = false } = {}) {
    const ctx = new OfflineAudioContext(2, 48000 * 3, 48000);
    const a = Object.assign(Object.create(Object.getPrototypeOf(TDG.audio)), TDG.audio, { ctx: null, voices: [], volume, muted });
    a.init(ctx);
    setup(a);
    const buf = await ctx.startRendering();
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    }
    return peak === 0 ? -Infinity : +(20 * Math.log10(peak)).toFixed(1);
  }
  const cases = {
    "단음 C4": (a) => a.playNote("C4"),
    "6음 동시": (a) => ["C4", "E4", "G4", "C5", "E5", "E3"].forEach((n) => a.playNote(n)),
    "30연타": (a) => { const ns = Object.keys(TDG.NOTE); for (let i = 0; i < 30; i++) a.playNote(ns[i % 15], { when: i * 0.01 }); },
    "틱": (a) => a.tick(),
    "예약 3음 뒤 stopAll": (a) => { ["C4", "E4", "G4"].forEach((n, i) => a.playNote(n, { when: 0.3 + i * 0.3 })); a.stopAll(); },
  };
  const out = [];
  for (const [name, fn] of Object.entries(cases)) out.push({ 상황: name, 피크: await renderPeak(fn), 음소거: await renderPeak(fn, { muted: true }) });
  return out;
});
await browser.close();
console.table(rows);
const bad = rows.filter((r) => r.피크 > -0.5 || r.음소거 > -80 || (r.상황.includes("stopAll") && r.피크 > -60));
console.log(bad.length ? `AUDIO FAIL: ${bad.map((r) => r.상황).join(", ")}` : "AUDIO PASS");
process.exit(bad.length ? 1 : 0);
```

### E-4. `tests/offline.mjs`

작성 중에는 Phase 1·2 적용본에 참조 `sw.js`를 붙여 실행했습니다. 게임 상태는 `TDG.game.status`(Phase 3 이후)와 옛 전역 `gameStatus`를 모두 읽습니다. "파일을 바꾸면 새로고침 한 번에 새 버전"은 별도로 확인했습니다(서버의 `index.html` 제목을 바꾼 뒤 온라인 새로고침 → 새 제목).

```js
// tests/offline.mjs — 서비스워커 오프라인 동작을 확인한다.
// 사용: python3 -m http.server 8000 을 켠 상태에서  node tests/offline.mjs http://localhost:8000/
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:8000/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 } });
const page = await ctx.newPage();
const r = {};
await page.goto(BASE, { waitUntil: "load" });
r.registered = await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
await page.reload({ waitUntil: "load" });                               // 두 번째 로드부터 서비스워커가 제어
r.controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true);
await page.reload({ waitUntil: "load" });
r.offlineDrum = await page.evaluate(async () => {
  const img = document.querySelector("#start-screen img.tonguedrum");
  if (img && !img.complete) await new Promise((res) => img.addEventListener("load", res, { once: true }));
  return !!img && img.naturalWidth > 0;
});
await page.goto(BASE + "?selftest=1", { waitUntil: "load" });
r.offlineWithQuery = (await page.title()).length > 0;
await page.goto(BASE, { waitUntil: "load" });
await page.click("#start-btn");
await page.waitForTimeout(1500);
r.offlineStart = await page.evaluate(() => (window.TDG && TDG.game ? TDG.game.status : typeof gameStatus !== "undefined" ? gameStatus : null));
await ctx.setOffline(false);
await page.goto(BASE + "?nosw=1", { waitUntil: "load" });
await page.waitForTimeout(500);
r.unregisteredByNosw = (await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0;
await browser.close();
console.log(r);
const ok = r.registered && r.controlled && r.offlineDrum && r.offlineWithQuery && ["countdown", "running"].includes(r.offlineStart) && r.unregisteredByNosw;
console.log(ok ? "OFFLINE PASS" : "OFFLINE FAIL");
process.exit(ok ? 0 : 1);
```

### E-5. `tools/make_assets.py`

```python
# tools/make_assets.py — 텅드럼 원본(assets/tonguedrum.png)에서 배포용 이미지를 만든다.
# 사용: python3 tools/make_assets.py      (필요: pip install pillow)
from pathlib import Path
from PIL import Image

SRC = Path("assets/tonguedrum.png")          # 3609×3505 원본(투명 배경)
OUT = Path("assets"); ICONS = OUT / "icons"
ICONS.mkdir(parents=True, exist_ok=True)
im = Image.open(SRC).convert("RGBA")

# 1) 게임용 WebP (비율 유지)
for w in (1024, 2048):
    h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(OUT / f"tonguedrum-{w}.webp", "WEBP", quality=85, method=6)

# 2) 아이콘: 정사각형 캔버스 가운데에 드럼을 놓는다. pad = 여백 비율, bg = None(투명) 또는 색
def square(size, pad=0.04, bg=None):
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    box = int(size * (1 - 2 * pad))
    scale = min(box / im.width, box / im.height)
    d = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(d, ((size - d.width) // 2, (size - d.height) // 2))
    return canvas

square(32, pad=0.0).save(ICONS / "favicon-32.png", optimize=True)
square(192).save(ICONS / "icon-192.png", optimize=True)
square(512).save(ICONS / "icon-512.png", optimize=True)
square(512, pad=0.14, bg=(255, 255, 255, 255)).save(ICONS / "icon-maskable-512.png", optimize=True)   # 안드로이드 원형 마스크 안전 영역
square(180, pad=0.08, bg=(255, 255, 255, 255)).convert("RGB").save(ICONS / "apple-touch-icon.png", optimize=True)

# 3) 공유 미리보기(카카오톡·문자) 1200×630: 연보라 배경 + 드럼
og = Image.new("RGBA", (1200, 630), (246, 240, 252, 255))
scale = 560 / im.height
d = im.resize((round(im.width * scale), 560), Image.LANCZOS)
og.alpha_composite(d, ((1200 - d.width) // 2, 35))
og.convert("RGB").save(OUT / "og-image.jpg", "JPEG", quality=85)

for p in sorted(list(OUT.glob("*.webp")) + list(OUT.glob("og-image.jpg")) + list(ICONS.glob("*.png"))):
    print(f"{p}  {Image.open(p).size}  {p.stat().st_size // 1024}KB")
```

---

## 부록 F. 사람이 결정할 항목

AI에게 맡기면 안 되는 결정입니다. 표의 "추천"은 이 문서의 기본값이며, 다르게 정하면 해당 Phase 프롬프트의 값만 바꾸면 됩니다.

| ID | 결정할 것 | 선택지 | 추천(문서 기본값) | 필요한 시점 |
|---|---|---|---|---|
| F-1 | 그림 속 텅 배치가 수업용 실물 15키와 같은가 | 같다 / 다르다(어느 텅이 다른지) | 강사가 부록 B-1 표를 실물과 대조 | Phase 3 전 |
| F-2 | 처음 켰을 때 난이도 | 쉬움 / 보통 | 초등 저학년 수업이면 쉬움, 그 외 보통 | Phase 5 |
| F-3 | 한 판 시간 | 30초 유지 / 다른 값 | 30초 유지(선생님 설정으로 20~60초) | Phase 5·9 |
| F-4 | 시간 알림 틱 기본값 | 매초(현행) / 마지막 10초 / 끄기 | 매초(원작자가 커밋 3개로 공들인 기능) | Phase 4 |
| F-5 | 낮은음 키 | E R T Y U(게임 권장) / 형제 앱처럼 Ctrl+3~7도 추가 | E R T Y U만. Windows·크롬북 크롬에서 Ctrl+1~8은 탭 전환 단축키와 겹쳐 게임 중 탭이 바뀔 수 있다. 두 앱을 맞추고 싶으면 `keyToNote`에 Ctrl+3~7 → 낮은음 한 줄 추가 | Phase 7 |
| F-6 | 글꼴 (D-23: `Pretendard`를 지정만 하고 불러오지 않음) | ① 목록에서 빼고 기기 기본 글꼴 ② 저장소에 woff2를 넣어 직접 불러오기 | ①. ②는 용량이 늘고 오프라인 캐시 목록에도 넣어야 함 | Phase 2 이후 아무 때나 |
| F-7 | 멜로디 두더지 수록곡 | 부록 C 7곡 / 추가·교체 | 7곡으로 시작. 추가는 퍼블릭 도메인 선율만(저작권 남은 창작 동요·가요 제외) | Phase 6 |
| F-8 | 교실 순위표 | 끔 / 켬 | 기본 끔. 켤 때 별명 사용 안내 | Phase 9 |
| F-9 | 고해상도(@2x) 두더지·망치·별 그림 | 원본에서 2배로 다시 내보내기 / 현행 유지 | 원본 파일이 있으면 제공(186×208, 462×444, 248×248) | Phase 2 |
| F-10 | 카카오톡 공유 미리보기 이미지 | 자동 생성본(드럼만) / 디자인 제작(1200×630) | 자동 생성본으로 시작, 여유가 있으면 제목 글자를 넣은 디자인 | Phase 2 |
| F-11 | 별 기준(잡은 비율) | 40·65·85% / 조정 | 40·65·85%로 시작해 수업 후 조정 | Phase 5 |
| F-12 | 텅 이름 기본 표시 | 계이름 / 숫자 / 음이름 | 계이름(그림에 숫자가 이미 인쇄되어 있으므로 말풍선은 계이름) | Phase 6 |

---

## 부록 G. AI가 자주 틀리는 것

### G-1. 이 앱에서 특히 조심할 것

| # | AI가 흔히 하는 것 | 결과 | 바른 방법 |
|---|---|---|---|
| 1 | 스테이지에 `max-height`를 "보험"으로 남김 | D-01 재발(가로 화면 211px 어긋남) | 높이 제한은 `width: min(…, calc(높이 × 1.0297))`로만 |
| 2 | 비율을 `img.naturalWidth / naturalHeight`로 계산 | WebP 1024(1.0302)에서 오차 | 상수 3609/3505 |
| 3 | 가로 화면용 미디어쿼리를 파일 앞쪽에 넣음 | 같은 우선순위의 뒤 규칙에 덮여 무시 | 미디어쿼리는 기본 규칙보다 뒤에 |
| 4 | `<script type="module">`·`import`·`fetch()` 사용 | `file://`로 열면 전부 멈춤 | 클래식 `<script defer>` + `window.TDG` |
| 5 | 최상위 `const`를 `window.이름`으로 접근 | `undefined` | 최상위 `const`는 window 속성이 아님. `TDG`에 명시적으로 넣기 |
| 6 | `filter: drop-shadow` 애니메이션, 애니메이션 요소의 조상에 `filter` | 저사양 20fps | `transform`·`opacity`만 애니메이션 |
| 7 | 탭에서 돌아오면 자동으로 이어 하기 | 돌아오자마자 두더지를 놓침 | 자동 일시정지, 재개는 사람이 누름 |
| 8 | 게임 규칙(등장·퇴장·종료)을 `setTimeout`으로 예약 | 일시정지·난이도·동시 두더지가 꼬임 | 게임 시계 `clock.t()` + `rules.js` 스케줄러 |
| 9 | 페이지 로드 때 `AudioContext` 생성, 소리마다 새 컨텍스트 | 아이폰 무음, 브라우저 거부 | 사용자 동작 안에서 `TDG.audio.init()` 하나 |
| 10 | `new Audio()`·`<audio>`로 효과음 | 음소거·볼륨이 안 먹음 | `TDG.audio`만 |
| 11 | `localStorage`를 그대로 사용 | 사생활 보호 모드·저장 공간 부족에서 게임이 멈춤 | `TDG.storage`(try/catch) |
| 12 | 판정을 "캡슐만"으로 교체 | 기존에 맞던 자리의 21%가 빗나감 | 기존 타원 ∪ 텅 캡슐 |
| 13 | 키 판정에 `e.key` 사용 | 한글 입력·Shift 상태에 따라 값이 바뀜 | `e.code` |
| 14 | 서비스워커를 캐시 우선으로 만들고 버전 올리기를 잊음 | 학생 기기에 옛 버전이 남음 | 네트워크 우선 참조 코드 |
| 15 | 경로를 `/`로 시작 | GitHub Pages `/Tonguedrum_Game/`에서 깨짐 | 전부 상대 경로 |
| 16 | "개선하는 김에" 파일 전체를 다시 씀 | 잘 되던 타이머·연출·판정이 사라짐 | 요청 범위만 국소 수정(AGENTS.md 규칙 12) |
| 17 | 자가진단 KNOWN을 통과시키려고 조건을 느슨하게 | 결함이 가려짐 | 조건은 "고쳐졌을 때 통과"하도록 엄격하게 |
| 18 | 순위표 이름을 `innerHTML`로 표시 | 입력한 글자가 태그로 해석됨 | `textContent` |
| 19 | Esc를 document와 대화 상자 두 곳에서 처리 | 한 번 누른 Esc로 재개했다가 곧바로 다시 멈춤 | `main.js` `onKeyDown` 한 곳(7-A) |
| 20 | 대화 상자의 조상에 `inert` | 창 안 버튼까지 눌리지 않음(태블릿에서 일시정지에 갇힘) | 대화 상자는 `.screen` 밖, `inert`는 `.screen`에만 |
| 21 | 링크 프리셋을 저장 설정에 섞음 | 다음 반 수업 때 설정이 꼬임 | `TDG.preset` 따로, 저장은 `TDG.settings`만 |
| 22 | 일시정지에서 `clearAllTimers()` 유지 | 흔들림 클래스가 안 떨어져 두더지가 올라온 채 남음 | Phase 5부터 일시정지는 시계만 멈춤 |

### G-2. 막혔을 때 쓰는 프롬프트

**① 버그 신고** — 증상을 AI에게 정확히 넘길 때

`````
[버그] AGENTS.md를 먼저 읽는다. 코드를 고치기 전에 원인부터 찾는다.
- 기기·브라우저: (예: 갤럭시 탭 A8, 크롬 / 아이폰 13, 사파리)
- 재현 순서: 1) … 2) … 3) …
- 기대: …
- 실제: … (콘솔 오류가 있으면 그대로 붙여 넣기)
- ?selftest=1 결과: (FAIL 항목)
요청: ① 원인을 코드 위치(파일·함수)와 함께 3줄 이내로 설명 ② 가장 작은 수정 ③ 이 버그를 잡는 자가진단 항목 추가.
수정 범위 밖의 파일은 건드리지 않는다.
`````

**② 되돌리기** — AI가 여러 파일을 망가뜨렸을 때

```bash
git status                 # 무엇이 바뀌었는지 확인
git restore .              # 커밋하지 않은 변경을 모두 버린다
git switch main && git branch -D phase-N   # 그 Phase 브랜치를 통째로 버린다
```

**③ 범위 줄이기** — 같은 실패가 반복될 때(§0-2 중단 규칙)

`````
[범위 축소] 방금 작업을 모두 버렸다. 이번에는 [작업 N]의 첫 번째 항목만 한다.
다른 작업·다른 파일은 건드리지 않는다. 끝나면 바꾼 줄만 diff로 보여 주고 멈춘다.
`````

---

## 부록 H. 형제 앱 Tonguedrum_Play 참고 사항

같은 협회 수업에서 쓰는 텅드럼 연주 앱(https://kimyounggaur.github.io/Tonguedrum_Play/, 저장소 최신 커밋 `508f946` 기준)을 함께 분석했습니다.

| 항목 | Tonguedrum_Play | 이 게임에서 |
|---|---|---|
| 음 데이터 `NOTE` (주파수·MIDI·숫자·계이름) | 15음 E3~E5, 11음 G3~C5 | **15음 표를 그대로 복사**(부록 B-3). 두 앱의 음 높이·이름이 같아야 한다 |
| 음색 `playNote`·`makeIR`·`makeNoiseBurst` | 배음 5개, 감쇠 `max(2.2, 4.8 − (midi−52)×0.08)`초, 로우패스, 리버브 2.8초 | **그대로 옮김** + 게임용 6가지 추가(보이스 제한·같은 텅 감쇠·세기·리미터·음소거·틱/징글) |
| 타격 잡음 버퍼 | 칠 때마다 새로 만듦 | 한 번 만들어 재사용(연타 부담 감소) |
| 리미터 | 없음 | 있음(없으면 6음 동시 +7.8dBFS로 찢어짐 — 연주 앱에도 도입을 권장) |
| 텅 좌표 `POS_15` | 연주 앱의 그림(`play-15.png`) 기준 | **가져오지 않는다.** 그림이 다르다. 이 게임은 부록 B-3의 `TONGUES`만 |
| 키보드 | 숫자 1~7 가운데, Shift+1~3 높은음, **Ctrl+3~7 낮은음** | 숫자·Shift는 같게, 낮은음은 **E R T Y U** (부록 F-5) |
| 자가진단 | `root.__tongueDrumTest`로 내부 함수 노출 + `tests/app-contract.test.mjs`(Node) | 같은 생각: 순수 파일을 Node가 읽는 `tests/logic.mjs` + 브라우저 `?selftest=1` |

- 두 앱이 따로 배포되므로 지금은 코드를 **복사**합니다. 나중에 세 번째 텅드럼 앱이 생기면 `NOTE`와 음색만 담은 공통 파일(예: `tonguedrum-core.js`)로 합치는 것을 검토하세요.
- 이 문서의 음원 엔진 개선(리미터·보이스 제한·같은 텅 감쇠)은 연주 앱에도 그대로 이득입니다. 연주 앱을 다시 손볼 때 부록 A-7의 수치를 근거로 제안할 수 있습니다.

---

*작성: 2026-09-23 · 분석 대상 커밋 `1bae5d7` · 형제 앱 Tonguedrum_Play `508f946`*
