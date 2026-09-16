# 집캐치 발표 자료

| 파일 | 설명 | 용도 |
|---|---|---|
| `집캐치_IR.pptx` | **10장 IR 핵심 요약** | 투자·심사 피칭 (5~7분) |
| `집캐치_발표자료.pptx` | 18장 상세 덱 | 데모 포함 발표 (10분) |
| `집캐치_발표시나리오.md` | 슬라이드별 대사·시간 배분·데모 동선·예상 질문 | 리허설 |
| `build-ir.js` / `build-deck.js` | 각 PPTX 생성 스크립트 | |

## IR 10장 구성

표지 → 문제 → 솔루션(Before/After) → 제품 5탭 → 핵심 기능(입력 3개 → 64점 → 78%) → 포지셔닝 맵(2×2) → 타깃 → 수익 모델(계단) → 로드맵(타임라인) → 클로징

한 장 = 한 메시지 원칙. 표·나열 대신 대비·좌표·계단·타임라인으로 시각화.

## 폰트 — Pretendard

덱 전체가 **Pretendard** 기준으로 조판돼 있습니다. 서비스 UI(`app/layout.tsx`)와 동일한 서체라 화면과 발표자료의 톤이 일치합니다.

**발표 PC에 반드시 설치하세요.** 미설치 시 굴림 등으로 대체되며 자간·줄바꿈이 무너집니다.

- 설치: [Pretendard 릴리스](https://github.com/orioncactus/pretendard/releases) → `Pretendard-*.otf` 전체 설치
- 설치가 불가능한 환경이라면 Windows 기본 탑재 서체로 다시 생성하세요.

```bash
DECK_FONT="맑은 고딕" node docs/presentation/build-ir.js docs/presentation/집캐치_IR.pptx
```

## 덱 다시 만들기

```bash
npm i pptxgenjs          # 프로젝트 의존성 아님 — 문서 빌드 전용
node docs/presentation/build-ir.js   docs/presentation/집캐치_IR.pptx
node docs/presentation/build-deck.js docs/presentation/집캐치_발표자료.pptx
```

## 디자인 시스템

| 요소 | 값 | 용도 |
|---|---|---|
| 주조색 | `#0B1F3A` 네이비 | 전체 60~70% — 신뢰·금융 |
| 강조색 | `#FF6B2C` 오렌지 | D-day·CTA·핵심 수치에만 |
| 카드 배경 | `#EEF3F9` / `#FFF1E9` | 정보 카드 / 강조 배너 |
| 헤더 구조 | kicker(영문 소제목) + 헤드라인 36pt + 서브카피 14.5pt | 국내 기업 PT 표준 |
| 구성 | 표지 · 섹션 구분 3장 · 본문 13장 · 클로징 | 섹션마다 진행 위치 표시 |

카피 원칙: 슬라이드당 강조 숫자 1개, 기능이 아니라 사용자의 질문을 문장으로, 한글 본문은 마침표 생략.
