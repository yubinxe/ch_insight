# Supabase 연결 — 10분

지금은 Supabase 없이도 앱이 뜬다. 대신 모든 데이터가 **메모리**에 있어서 서버를 끄면 사라진다.
아래를 마치면 고객·조건·공고·알림·지원이 실제로 남는다.

> 프로젝트 생성과 키 발급은 계정 소유자만 할 수 있다. 아래 3단계만 직접 하면 나머지는 명령 하나로 확인된다.

## 1. 프로젝트 만들기

1. https://supabase.com/dashboard → **New project**
2. Name `jipcatch` · Region **Northeast Asia (Seoul)** · Database password는 임의 생성 후 **따로 보관**
3. 생성까지 1~2분

## 2. 스키마 넣기

1. 좌측 **SQL Editor** → **New query**
2. 이 저장소의 [`supabase/schema.sql`](../../supabase/schema.sql) **전체**를 붙여넣고 **Run**
3. `Success. No rows returned` 이면 끝. 테이블 10개가 만들어진다.

스키마는 전부 `create table if not exists` 라서 **여러 번 실행해도 안전**하다.

## 3. 키 넣기

**Project Settings → API** 에서 두 값을 복사해 `.env.local` 에 넣는다.

```
SUPABASE_URL=https://<프로젝트ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
```

- `anon` 키가 아니라 **`service_role`** 키다.
- 이 키는 **서버에서만** 읽는다. `NEXT_PUBLIC_` 를 절대 붙이지 않는다.
- `.env.local` 은 git 에 올라가지 않는다(`.gitignore` 확인 완료).

## 4. 확인

```bash
npm run db:check
```

테이블 10개가 모두 `✓` 로 나오면 연결된 것이다. 하나라도 `테이블 없음` 이면 2단계를 다시 실행한다.

## 5. 데이터 채우기

앱을 켜고 `/admin` 에 접속 코드(`ADMIN_PASSCODE`)로 들어간 뒤:

| 버튼 | 결과 |
|------|------|
| 시연 데이터 생성 | 고객 100명 · 기회 60건 (전부 `is_demo = true`) |
| 청약홈 동기화 | 공공데이터 API 키로 **실제** 모집공고 수집 (`is_demo = false`) |
| 데모 신규 공실 발생 | 매칭 → 점수 → 알림까지 연쇄 실행 |

시연 데이터와 실제 공고는 `is_demo` 로 끝까지 구분된다. 화면에서 섞어 표시하지 않는다.

## RLS 에 대해

모든 테이블에 `enable row level security` 가 걸려 있고 **허용 정책이 하나도 없다.**
서버가 `service_role` 로 접근하므로 RLS 를 우회하고, 브라우저에서 직접 접근하면 전부 막힌다.

나중에 클라이언트에서 직접 읽어야 할 일이 생기면 그때 최소 권한 정책을 명시적으로 추가한다.
지금 상태에서 `anon` 키를 브라우저에 노출해도 데이터는 읽히지 않는다.

## 안 될 때

| 증상 | 원인 |
|------|------|
| `접속 실패` | `SUPABASE_URL` 에 경로가 붙었거나 오타. `https://xxxx.supabase.co` 형태여야 한다 |
| 전부 `401` | `anon` 키를 넣었다. `service_role` 로 교체 |
| 일부만 `테이블 없음` | SQL 실행이 중간에 끊겼다. `schema.sql` 을 처음부터 다시 Run |
| 앱은 뜨는데 데이터가 안 남음 | `.env.local` 수정 후 **개발 서버를 재시작**해야 반영된다 |
