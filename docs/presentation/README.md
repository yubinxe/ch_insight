# 집캐치 발표 자료

제품 기준 브랜치: `feat/housing-opportunity-crm` (현재 사실상 main)

| 파일 | 설명 |
|---|---|
| `집캐치_IR.pptx` | **IR 핵심 요약 10장** — 발표 7분 + Q&A 5분 |
| `집캐치_발표시나리오.md` | 슬라이드별 대사 · 시간 배분 · Q&A 5종 |
| `build-ir.js` | PPTX 생성 스크립트 |

> 구버전 18장 덱(`집캐치_발표자료.pptx`)은 제거했다. 당첨 확률 78% 등
> 현재 제품이 더 이상 제공하지 않는 내용을 담고 있었다.

## 덱 구성 (10장)

표지 → 문제 → 솔루션(Before/After) → 소비자 흐름 6단계 → **판정 4원칙** →
정직성(만들지 않는 것) → 데이터 출처 → Claude Routines 12개 → 수익 모델 → 클로징

## 디자인 — 제품 규격 그대로

`docs/strategy/2026-09-14-consumer-design-direction.md` 를 따른다.

| 요소 | 값 |
|---|---|
| 지면 | `#F4F1EB` 한지 계열 따뜻한 중성 |
| 카드 | `#FFFFFF` |
| 제목 | `#14110C` 먹 |
| 본문 | `#3B352C` · 보조 `#6F6859` · 괘선 `#E2DBCF` |
| 채색 | 주묵 `#A83A20` 하나뿐 — 인장처럼 아껴 찍는다 (섹션번호 · 마감 · 강조) |
| 상태색 | 충족 `#3D5F43` · 확인필요 `#7D6320` |
| 시그니처 | 섹션 인덱스 번호(`01`, `001`)와 괘선 |

**주 행동에 색을 쓰지 않는다.** 화면에서 가장 붉은 것은 항상 마감이다.

## 재생성

```bash
npm i pptxgenjs
node docs/presentation/build-ir.js docs/presentation/집캐치_IR.pptx

# Pretendard 미설치 환경
DECK_FONT="맑은 고딕" node docs/presentation/build-ir.js docs/presentation/집캐치_IR.pptx
```
