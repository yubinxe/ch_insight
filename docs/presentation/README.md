# 집캐치 발표 자료

| 파일 | 설명 |
|---|---|
| `집캐치_발표시나리오.md` | 10분 발표 + 5분 Q&A 시나리오. 슬라이드별 대사·시간 배분·데모 동선·예상 질문 답변 |
| `집캐치_발표자료.pptx` | 14장 슬라이드 (16:9 와이드, 발표자 노트 포함) |
| `build-deck.js` | 위 PPTX 생성 스크립트 |

## 덱 다시 만들기

```bash
npm i pptxgenjs          # 프로젝트 의존성 아님 — 문서 빌드 전용
node docs/presentation/build-deck.js docs/presentation/집캐치_발표자료.pptx
```

폰트는 `맑은 고딕` 기준. 발표 PC에 없으면 `build-deck.js` 상단의 `F` 상수를 바꿔 다시 생성.
