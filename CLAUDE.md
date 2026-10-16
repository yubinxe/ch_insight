@AGENTS.md

# ch_insight (청약 인사이트 대시보드)

## 세션 시작 시 할 일

1. `docs/WORKLOG.md` 를 먼저 읽고 '진행 중'부터 이어간다.
2. `git status` · `git log --oneline -5` · `gh pr list` 로 현재 위치를 확인한다.
3. 작업을 마치면 `docs/WORKLOG.md` 의 현재 상태·진행 중·다음 행동을 갱신해 같은 PR 에 커밋한다.

## 프로젝트 개요

청약홈 OpenAPI 기반 분양정보·경쟁률·당첨자 통계·AI 당첨 예측·핫플레이스 지도 대시보드(README 기준).
`main` 은 2026-06-01 시점의 초기 대시보드(커밋 11개)에 머물러 있다.

## 저장소 간 관계

- 이 저장소의 옛 이름은 `yubinxe/myhomeplz` 이다(GitHub API 가 `yubinxe/ch_insight` 로 리다이렉트). README·`.cursor/rules` 에는 그보다 앞선 이름 `yubinxe/260601_dashboard` 가 남아 있다.
- `yubinxe/zipcatch` 는 이 저장소와 **같은 히스토리**(루트 커밋 `4f234d0` 동일)를 이어받은 저장소다. 이 저장소의 `main`·`feat/housing-opportunity-crm`(`9d469bb`)·`claude/jibcatch-presentation-scenario-ppt-ynlm1c`(`84babb4`) 커밋이 모두 zipcatch `main` 에 포함돼 있고, zipcatch 는 그 뒤 27개 커밋(`2abbd62` 까지)과 PR #2(`4658e20`)를 더 갖는다.
- 운영 사이트 `https://zipcatch.vercel.app` 은 zipcatch 쪽 코드가 기본 도메인으로 쓰는 주소다(zipcatch `app/layout.tsx`·`app/sitemap.ts`). zipcatch PR #2 본문에 "운영(zipcatch.vercel.app)은 CLI 배포본 86139f2" 로 적혀 있다. 이 저장소 `main` 에는 해당 도메인 참조가 없다.
- 결론: 제품(집캐치) 개발의 최신 기준은 `yubinxe/zipcatch` 이다. 이 저장소에서 새 기능을 이어갈지, zipcatch 로 일원화할지는 **사용자 결정 필요**.

## 기술 스택

- Next.js 16.2.6 (App Router) · React 19.2.4 · TypeScript 5
- Tailwind CSS 4 (`@tailwindcss/postcss`) + `app/globals.css` 토큰
- recharts 3 · date-fns 4 · `@svg-maps/south-korea` · `svg-path-bbox`
- ESLint 9 (`eslint-config-next` 16.2.6)

## 구조

| 경로 | 역할 |
|------|------|
| `app/page.tsx` | 메인 대시보드(탭: 분양정보·경쟁률·당첨자·AI 예측·핫맵) |
| `app/property/[id]/` | 단지 상세 |
| `app/api/*` | announcements · competition · hotmap · prediction · property · winners 라우트 |
| `app/globals.css` | 디자인 토큰·전역 스타일 |
| `components/*` | 탭별 UI (announcements, competition, dashboard, hotmap, prediction, winners, layout, ui) |
| `lib/api.ts` | 클라이언트 API 호출 |
| `lib/subscription-score.ts` | 가점 계산 |
| `lib/korea-map-*.ts`, `lib/hotmap-*.ts` | 핫맵 좌표·뷰포트 |
| `sample/` | 청약홈 API 기술문서(docx)·디자인 샘플 |

## 명령 (package.json)

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint
```

테스트 스크립트는 없다.

## 클라우드 환경 변수(이름만)

- `PUBLIC_DATA_API_KEY` — 공공데이터포털 청약홈 API 인증키(`.env.example`). 빌드에는 필요 없고, 없으면 데이터 조회가 실패한다.

## 작업 규칙

- 모든 변경은 브랜치 → PR. `main` 병합·운영 배포는 사용자 승인 후에만.
- `.cursor/rules/post-work-deploy.mdc` 의 "작업 후 `git push origin main`" 지침은 Claude 세션에서는 따르지 않는다(위 규칙 우선).
- API 키·`.env`·개인정보 커밋 금지. 키는 Vercel/클라우드 환경 변수로만 둔다.
- 지어낸 수치·실적 금지. 데이터가 없으면 없다고 표시한다.
- 사용자 보고는 한국어로 간결하게(결론 → 검증 → 문제 → 결정 필요).

## 디자인 기준

`app/globals.css` 머리말 기준 "Apple-inspired modern minimal system".
강조색 `--accent: #0071e3`, 글꼴 Pretendard, 반경 10/14/20px, 라이트·다크 토큰(`[data-theme]`).

## 테스트·배포 정책

- 변경 후 최소 `npm run build` 통과를 확인한다. `npm run lint` 는 2026-10-16 기준 기존 코드에서 63 errors · 1 warning 이 난다(이번 정리 범위 밖).
- 배포는 Vercel(README). 운영 배포·도메인 변경은 사용자 승인 후에만.
