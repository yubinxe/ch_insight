# WORKLOG — ch_insight

세션을 시작하면 이 파일을 먼저 읽고 '진행 중'부터 이어간다. 작업을 마치면 갱신한다.

## 현재 상태

- 기준일: 2026-10-16
- 기본 브랜치 `main` 최신: `b951787` feat: AI 당첨예측 무주택·통장 빠른 입력 누적 및 자동 다음 단계 (2026-06-01)
- 원격 브랜치: `main`, `feat/housing-opportunity-crm`(최신 `9d469bb`, 2026-09-18, main 대비 +57), `claude/jibcatch-presentation-scenario-ppt-ynlm1c`(최신 `84babb4`, main 대비 +7), `chore/cloud-continuity`(이 문서)
- 검증(2026-10-16, `main` 기준 클린 클론): `npm ci` 성공 · `npm run build` 성공 · `npm run lint` 실패(기존 코드 63 errors · 1 warning, 수정하지 않음) · 테스트 스크립트 없음
- 최신 제품 코드는 `yubinxe/zipcatch` 에 있다(CLAUDE.md '저장소 간 관계').

## 완료

`main` (2026-06-01)
- 청약 현황 대시보드 초기 구현, 경쟁률·당첨자 통계 미표시 버그 수정 (`263cb67`, `05cf26b`)
- 디자인 시스템 정비 및 핵심 기능 확장 (`2b86083`)
- 핫플레이스 지도를 시·도 SVG 경계로 교체, 마커 좌표 보정·호버 툴팁, 줌·팬 (`c03121c`, `f34268f`, `32df2f5`)
- 메인 KPI 마감 임박 클릭 시 5일 이내 분양 목록 (`a0b36b8`)
- 헤더 홈 링크·민영/국민 필터·분양정보 UI 개선, 국민주택 필터 코드 03 수정 (`bb5c51a`, `ad0951d`)
- AI 당첨예측 무주택·통장 빠른 입력 누적 및 자동 다음 단계 (`b951787`)

`feat/housing-opportunity-crm` (PR #1, 미병합, 2026-09-11~09-18)
- Housing Opportunity CRM 전환: 소비자 화면·관심공고·청약뉴스·카카오맵·마감 달력·주택형별 공급 표·실거래 비교·인근 경쟁률 등 57커밋 (최신 `9d469bb` 분양권 전매 비교)

`claude/jibcatch-presentation-scenario-ppt-ynlm1c` (PR #2, Draft)
- 집캐치 IR 덱 10장·발표 시나리오·사이트 PC 조판 패치 (`1313580` ~ `84babb4`)

## 진행 중

- 클라우드(웹·iPhone) 작업 연속성 준비: CLAUDE.md · docs/WORKLOG.md · `.claude/settings.json` 세션 훅 (브랜치 `chore/cloud-continuity`, PR 검토 대기)

## 미해결 문제

- PC 로컬(`C:\경국_김유빈\## 개인\청약_인사이트`)의 `feat/housing-opportunity-crm` 브랜치에 GitHub 미반영 커밋 27개(최신: `2abbd62` a11y(대비)…) — PC에서 `git push origin feat/housing-opportunity-crm` 필요(클라우드 작업 전 필수, 안 하면 PR #1 작업과 충돌).
  - 참고(2026-10-16 확인): `9d469bb..2abbd62` 27개 커밋은 이미 `yubinxe/zipcatch` 의 `main` 에 들어 있다. ch_insight 에도 올릴지, zipcatch 로 일원화할지 결정 필요.
- PC 로컬 저장소의 remote URL 이 옛 이름 `yubinxe/myhomeplz` 를 가리킨다(현재 `yubinxe/ch_insight` 로 리다이렉트). PC에서 `git remote set-url origin https://github.com/yubinxe/ch_insight.git` 권장.
- README 의 Vercel 연결 저장소명(`yubinxe/260601_dashboard`)과 `.cursor/rules/post-work-deploy.mdc`(main 직접 푸시 지침)가 현재 이름·작업 규칙과 맞지 않는다.
- `npm run lint` 기존 오류 63건(`components/announcements`, `components/competition`, `components/hotmap` 등).
- 이 저장소에 연결된 Vercel 프로젝트·운영 URL: 확인 필요.
- 열린 이슈 #3 "청약가점·예치금 정적 reference dataset 연계"(2026-10-02 등록) — 내용·담당 저장소 확인 필요.

## 열린 PR

| # | 브랜치 | 요약 | 리뷰 상태 |
|---|--------|------|-----------|
| 1 | `feat/housing-opportunity-crm` → `main` | Housing Opportunity CRM 전환 — 기회 탐지부터 지원관리까지 (57커밋) | Open · 리뷰 결정 없음 |
| 2 | `claude/jibcatch-presentation-scenario-ppt-ynlm1c` → `main` | 집캐치 IR 덱·발표 시나리오 + 사이트 PC 조판 패치 (문서 전용) | Draft · 리뷰 결정 없음 |
| 4 | `chore/cloud-continuity` → `main` | 클라우드 작업 연속성: CLAUDE.md · WORKLOG · 세션 훅 | Open · 검토 대기 |

## 다음 행동

1. PC에서 로컬 `feat/housing-opportunity-crm` 푸시 여부 결정·실행(위 미해결 1번).
2. ch_insight 와 zipcatch 중 어느 저장소에서 개발을 이어갈지 결정.
3. 이 PR(`chore/cloud-continuity`) 검토 후 병합 승인.
4. PR #1·#2 정리 방향 결정(병합·종료). 확인 필요.
