# 선택 검증 도구

게임 실행에는 테스트 의존성이 필요하지 않습니다. 아래 검사는 개발 중 필요할 때만 실행합니다.

## 요구 사항

- Node.js 18 이상
- `smoke.mjs`, `ui.mjs`, `layout.mjs`, `audio.mjs`, `offline.mjs`: Playwright와 Chromium
- `smoke.mjs`, `ui.mjs`, `layout.mjs`, `offline.mjs`: 로컬 정적 서버

Playwright는 `tests/` 안에만 설치합니다.

```bash
cd tests
npm install
npx playwright install chromium
cd ..
```

다른 터미널에서 저장소 루트의 로컬 서버를 켭니다.

```bash
python3 -m http.server 8000
```

## 실행

```bash
node tests/logic.mjs
node tests/smoke.mjs http://localhost:8000/
node tests/ui.mjs http://localhost:8000/
node tests/layout.mjs http://localhost:8000/
node tests/audio.mjs
node tests/file.mjs
node tests/offline.mjs http://localhost:8000/
```

- `logic.mjs`: 텅 판정, 키 매핑, 두더지 스케줄러, 점수, 곡 파서
- `smoke.mjs`: 실제 UI에서 다섯 모드를 시작하고 핵심 입력 경로 확인
- `ui.mjs`: 설정·순위표·일시정지·모바일 배치의 통합 계약 확인
- `layout.mjs`: 9개 화면 크기의 두더지 위치와 이미지 텅 정렬
- `audio.mjs`: 합성 음원의 피크 음량, 음소거, 예약음 정지
- `file.mjs`: `file://` 직접 실행과 로컬 이미지 결과 카드 폴백
- `offline.mjs`: 서비스워커 등록, 오프라인 새로고침과 게임 시작, `?nosw=1` 해제

`layout.mjs`가 만든 화면 캡처는 `tests/output/`에 저장되며 Git에서 제외됩니다.
