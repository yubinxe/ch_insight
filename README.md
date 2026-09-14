# 집인사이트 (myhomeplz) — Housing Opportunity CRM

사용자의 주거조건을 한 번 저장하면, 적합한 청약·임대 기회를 자동 탐지하고 우선순위를 정해
알림부터 지원 일정까지 관리하는 AI 기반 Housing Opportunity CRM.

검색 서비스가 아니라 아래 Workflow를 반복 운영하는 CRM이다.

```
사용자 → 조건 → 기회 탐지 → 판단 → 알림 → 지원관리 → 재지원
```

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

API 키가 없어도 Mock/합성 데이터로 전체 데모가 동작한다.
(`/insights` 의 청약홈 공공데이터 탭만 `PUBLIC_DATA_API_KEY` 가 필요하다.)

## Hero Demo (30초)

1. `/dashboard` 접속 — 등록 고객 100 · 관리 주택 50 · 현재 공실 3 · 신규 이벤트 0 · 추천대상 0
2. **공실 이벤트 발생** 클릭
3. `H023` 공실 `0 → 1` 생성 → Matching Engine 실행 → 조건 일치 고객 추출
4. 지원 우선순위가 가장 높은 고객에게 맞춤 알림 생성 (카카오 payload)
5. 지원 절차 생성 → 접수·서류·발표 일정 자동 생성
6. "지금 일어나는 일" 스트림에 전 과정 기록

`데모 초기화` 버튼으로 언제든 정상상태로 되돌릴 수 있다.

## 화면

| 경로 | 설명 |
|------|------|
| `/` | 서비스 소개 |
| `/dashboard` | 종합현황 — 지표 · 처리 로그 · 전환 퍼널 · 통보 내역 · 마감 일정 |
| `/analyze` | 조건진단 — 3단계 입력(희망지역 → 가구유형 → 예산) 후 우선순위 산출 |
| `/matches` | 매칭현황 — 대조 결과 · 산출 근거 · 지원 등록 |
| `/customers` | 고객관리 — 등록 조건 · 지원이력 · 현재 매칭 건 |
| `/properties` | 물건관리 — 공고 일정 · 공실 현황 · 개별 이벤트 발생 |
| `/applications` | 지원관리 — 단계별 진행 현황 · 편성 일정 |
| `/insights` | 시장통계 — 청약홈 공공데이터 |

## 지원 우선순위 점수 (Opportunity Score)

"당첨확률"이 아니라 **지원 우선순위 점수**다. UI에는 항상 한국어로 노출한다. 통계적으로 검증되지 않은 확률은 생성하지 않는다.

```
지역 적합도   30%
가격 적합도   20%
면적 적합도   15%
주택유형 적합도 15%
경쟁강도      10%
마감 긴급도    10%
```

점수와 함께 항상 설명 가능한 `reason` 문장을 생성한다.

## 데이터 정책

실제 공개 API는 **개별 호실의 실시간 공실 정보를 제공하지 않는다.** 따라서 두 계층을 분리한다.

- `lib/adapters/housing-source.ts`
  - `applyHomeAdapter` — 청약홈 OpenAPI 등 실제 공고 데이터원 (키 없으면 빈 배열)
  - `syntheticAdapter` — 데모용 합성 공실 데이터 (`dataOrigin: 'SYNTHETIC'`)
- 모든 합성 레코드는 UI에서 `Demo 합성 데이터` / `Synthetic Event` 로 표시된다.
- 합성 데이터는 seed 기반 deterministic generator 로 생성되어 매 실행 시 동일하다.

## 알림 (카카오)

`lib/adapters/notification.ts` 의 Adapter 체인으로 처리한다.

1. `kakaoMemoAdapter` — `KAKAO_ACCESS_TOKEN` 이 있으면 카카오톡 *나에게 보내기* 로 실제 발송
2. `previewAdapter` — 발송 권한이 없으면 payload 를 그대로 저장하고 Dashboard 에 미리보기로 노출

발송이 불가능해도 Notification payload 생성 → `notifications` 저장 → Dashboard Preview 까지
동일하게 동작하므로 데모가 중단되지 않는다.

## UI · 문체 원칙

대상 독자는 중개·임대관리 실무자와 업계 관계자다. 소비자 앱 말투를 쓰지 않는다.

**문체**
- 명사형·개조식을 기본으로 한다. `~해요` / `~해드립니다` / `잘 모르겠어요` 금지.
- 업계 표기를 따른다. `빈 집` → `공실`, `주택` → `물건`, `할 일` → `처리 항목`,
  `추천 랭킹` → `매칭현황`, `알림` → `통보`.
- 영문 용어는 한국어 우선. `Opportunity Score` → `지원 우선순위 점수`,
  `Pipeline` → `지원 절차`, `Event Stream` → `처리 로그`.
- 화면명은 내비게이션·페이지 제목·`<title>` 을 동일하게 유지한다.

**디자인**
- 제목·수치는 명조(`--font-serif`, next/font 로 self-host). 본문은 Pretendard.
- 모서리는 2~4px. 소비자 SaaS 의 큰 라운드를 쓰지 않는다.
- 그림자 대신 괘선으로 구조를 만든다. 지표 카드는 상단 2px 괘선으로 구분하고,
  색은 의미가 있을 때만 쓴다 (적색=공실 경고, 남색=실시간 변동 지표).
- 강조색은 기관 남색 `#14508c`. 그라데이션을 쓰지 않는다.
- 내비게이션은 실무 동선 순서로 배열한다 (종합현황 → 조건진단 → 매칭 → 고객 → 물건 → 지원 → 통계).
  내부 조직 구분(사용자/운영)을 노출하지 않는다.

**디자인 토큰** — `app/crm.css` 상단에 간격(4px 베이스라인)·타입·색·괘선 스케일을 모아둔다.

## 구조

```
lib/crm/
  types.ts              도메인 모델
  rng.ts                seed 기반 deterministic PRNG
  seed-customers.ts     고객 100명 생성기
  seed-properties.ts    주택 50건 생성기
  store.ts              In-memory repository + 이벤트 오케스트레이션
  client.ts             클라이언트 API 래퍼
  services/
    scoring.ts          Opportunity Score · reason · 비교 해석
    matching.ts         Matching Engine
    scheduling.ts       공고 일정 → Application Task 생성
    analytics.ts        KPI · North Star 퍼널 · 마감 일정
lib/adapters/
  housing-source.ts     공고 데이터원 Adapter
  notification.ts       메시징 Adapter (카카오 / 미리보기)
app/api/crm/            snapshot · trigger · reset · applications · analyze
components/crm/         CRM UI (비즈니스 로직 없음)
```

Business logic 은 전부 `lib/` 에 있고 UI 컴포넌트는 표현만 담당한다.

## 안내 문구 정책

- AI 참고 분석이며 공식 청약자격 판정이 아니다.
- 지원 전 공식 공고문 확인이 필요하다.
- 공고에 날짜가 없으면 임의 날짜를 만들지 않고 `date pending` 으로 남긴다.

## 데이터 출처

공공데이터포털 청약홈 OpenAPI · 한국부동산원 (통계 화면)
공실 이벤트 및 임대주택 레코드는 데모용 합성 데이터
