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
14. 배포 파일을 추가·삭제·이름 변경하면 sw.js의 PRECACHE를 함께 고치고 VERSION을 올린다.

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
교사 프리셋(Phase 9): ?mode= &level= &time= &tongues= &label= &song= &sub=

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
