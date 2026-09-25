# 텅드럼 두더지잡기

텅드럼 캐릭터 그림의 15개 텅에서 튀어나오는 두더지를 잡으며 텅 위치와 음을 익히는 음악 교육 미니 게임입니다. 초등학생부터 성인 수강생까지 교실의 크롬북, 태블릿, 휴대폰, 노트북에서 사용할 수 있도록 순수 HTML/CSS/JavaScript로 만들었습니다.

두더지잡기·음 찾기·멜로디·따라 치기·자유 연주 5개 모드, 합성 텅드럼 음원, 키보드/터치 조작, 교사용 범위·시간 프리셋, 기기 내 순위표, 결과 카드, 설치형 PWA와 오프라인 실행을 지원합니다.

## 로컬 실행

저장소 루트에서 정적 서버를 실행합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 <http://localhost:8000/>을 엽니다. VS Code의 Live Server를 사용해도 됩니다. 앱의 기본 기능은 `index.html`을 `file://`로 직접 열어도 동작합니다. 서비스워커와 오프라인 검사는 HTTPS 또는 localhost가 필요합니다.

## 파일 구조

```text
index.html                  화면 구조와 스크립트 연결
style.css                   레이아웃, 반응형 화면, 애니메이션
js/                         설정, 텅 데이터, 소리, 규칙, 게임, UI, 디버그
assets/                     텅드럼·두더지·망치·별 이미지와 앱 아이콘
manifest.webmanifest        설치형 웹앱 정보
sw.js                       오프라인 캐시
docs/PROMPTS.md             전체 개선 설계와 단계별 구현 명세
tests/                      선택 실행하는 자동 검사
tools/make_assets.py        WebP·아이콘·공유 이미지 생성 도구
```

## URL 파라미터

- `?debug=1`: 판정 영역, 음 라벨, FPS와 게임 상태 표시
- `?selftest=1`: 브라우저 자가진단 실행
- `?calib=1`: 텅 좌표 보정 도구
- `?seed=N`: 두더지 순서를 재현할 수 있도록 난수 고정
- `?nosw=1`: 등록된 서비스워커 해제
- 교사 프리셋: `mode`, `level`, `time`, `tongues`, `label`, `song`, `sub`

자세한 사용법과 검증 기준은 [docs/PROMPTS.md](docs/PROMPTS.md)를 참고하세요.

## 테스트

Node.js 18 이상이 필요합니다. 순수 로직 검사는 별도 패키지 없이 실행할 수 있습니다.

```bash
node tests/logic.mjs
```

레이아웃, 오디오, 오프라인 및 5개 모드·UI 통합 검사는 Playwright가 있을 때 실행합니다. 준비 및 명령은 [tests/README.md](tests/README.md)에 있습니다.

## 배포

`main` 브랜치에 push하면 `.github/workflows/pages.yml`이 저장소 루트 전체를 GitHub Pages에 배포합니다. 배포 전 로컬 자가진단과 관련 자동 검사를 통과시켜야 합니다.

## 에셋 출처

- 텅드럼·두더지·망치·별 원본: 기존 프로젝트 제공 에셋(외부 배포 전 소유권·출처 확인 필요)
- WebP, 앱 아이콘, OG 공유 이미지: `tools/make_assets.py`로 텅드럼 원본에서 생성
