# 배포

Next.js 16 앱이라 Vercel 이 가장 짧다. 계정 로그인이 필요하므로 **첫 연결은 사람이 한 번** 해야 한다.

```bash
npx vercel login      # 브라우저로 계정 인증 (1회)
npx vercel link       # 이 폴더를 Vercel 프로젝트에 연결
npx vercel --prod     # 배포
```

GitHub 연동을 쓰면 `feat/housing-opportunity-crm` 을 `main` 에 머지할 때마다 자동 배포된다.

## 환경변수 — 이걸 빠뜨리면 조용히 반쪽으로 뜬다

Vercel 프로젝트 **Settings → Environment Variables** 에 넣는다.
로컬 `.env.local` 은 배포에 올라가지 않는다.

| 변수 | 없으면 생기는 일 |
|------|-----------------|
| `SUPABASE_URL` | 메모리 저장으로 폴백. 배포 인스턴스가 재시작될 때마다 데이터가 사라진다 |
| `SUPABASE_SERVICE_ROLE_KEY` | 같음. **서버 전용 — `NEXT_PUBLIC_` 금지** |
| `DATA_GO_KR_API_KEY` | 청약홈·LH 동기화가 전부 실패로 보고된다. **`PUBLIC_` 접두사를 붙이지 않는다** — 배포 플랫폼이 공개 노출로 분류한다 |
| `ADMIN_PASSCODE` | `/admin/*` 전체가 잠긴다 (의도된 기본값) |
| `NEXT_PUBLIC_SITE_URL` | **알림 링크가 localhost 를 가리킨다.** 배포 도메인으로 반드시 바꾼다 |
| `RESEND_API_KEY` | 알림이 발송되지 않고 `PREVIEW` 로만 저장된다 |
| `NOTIFICATION_FROM` | `onboarding@resend.dev` 로 나간다 |

값은 `~/.config/supabase/jipcatch.env` 와 로컬 `.env.local` 에 있다.

```bash
# 한 번에 넣기 (Vercel CLI)
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATA_GO_KR_API_KEY production
vercel env add ADMIN_PASSCODE production
vercel env add NEXT_PUBLIC_SITE_URL production
```

`NEXT_PUBLIC_SITE_URL` 만 로컬과 값이 다르다 — 배포 도메인(`https://…vercel.app` 또는 연결한 도메인).

## 배포 후 확인

1. `/` 가 뜨고 공고 목록에 `공식 공고` 배지가 보인다
2. `/admin` 접속 코드로 로그인 → 상단 칩이 **저장소 Supabase** 인지 확인
   (메모리라고 나오면 Supabase 환경변수가 안 들어간 것이다)
3. 공고 동기화를 한 번 누른다 — 청약홈·LH 건수가 보고된다
4. 알림 미리보기의 링크가 `localhost` 가 아닌 배포 도메인인지 확인

## Supabase 쪽에서 할 일

없다. 서버가 service role 로 접근하므로 도메인 허용 목록을 따로 설정할 필요가 없다.
RLS 는 전 테이블 차단이고 브라우저는 DB 에 직접 붙지 않는다.

무료 플랜은 장기 미사용 시 프로젝트가 일시정지되므로, 시연 전에 한 번 열어 깨워 둔다.
