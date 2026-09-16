# Supabase 연결

프로젝트와 테이블은 **이미 만들어져 있다.** 남은 건 키 하나뿐이다.

| 항목 | 값 |
|------|-----|
| 프로젝트 | `jipcatch` |
| ref | `orckemmbuunvvnvbzvtm` |
| 리전 | `ap-northeast-2` (서울) |
| URL | `https://orckemmbuunvvnvbzvtm.supabase.co` |
| 마이그레이션 | `jipcatch_crm_schema` — 테이블 10개, 전부 RLS 켜짐 |

## 남은 한 단계 — service_role 키

1. [Project Settings → API Keys](https://supabase.com/dashboard/project/orckemmbuunvvnvbzvtm/settings/api-keys)
2. **`service_role`** 키를 복사한다. `anon` 키가 아니다.
3. `.env.local` 의 빈 줄에 붙여넣는다.

```
SUPABASE_URL=https://orckemmbuunvvnvbzvtm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키
```

- 이 키는 **서버에서만** 읽는다. `NEXT_PUBLIC_` 를 절대 붙이지 않는다.
- `.env.local` 은 git 에 올라가지 않는다.
- 넣은 뒤 **개발 서버를 재시작**해야 반영된다.

## 확인

```bash
npm run db:check
```

테이블 10개가 모두 `✓` 로 나오면 연결된 것이다. 키가 없으면 어디서 받는지 알려준다.

## 데이터 채우기

앱을 켜고 `/admin` 에 접속 코드(`ADMIN_PASSCODE`)로 들어간 뒤:

| 버튼 | 결과 |
|------|------|
| 시연 데이터 생성 | 고객 100명 · 기회 60건 (전부 `is_demo = true`) |
| 공고 동기화 (청약홈 · LH) | 실제 모집공고 수집 (`is_demo = false`) |
| 데모 신규 공실 발생 | 매칭 → 점수 → 알림까지 연쇄 실행 |

시연 데이터와 실제 공고는 `is_demo` 로 끝까지 구분된다. 소비자 화면에는 실제 공고만 나간다.

## RLS 에 대해

10개 테이블 모두 `enable row level security` 이고 **허용 정책이 하나도 없다.**
서버가 `service_role` 로 접근해 RLS 를 우회하므로 동작에는 영향이 없고,
브라우저에서 `anon` 키로 직접 붙으면 전부 막힌다.

Supabase 보안 린터가 `rls_enabled_no_policy` (INFO) 10건을 띄우는데, 이게 의도한 상태다.
나중에 클라이언트에서 직접 읽어야 할 일이 생기면 그때 최소 권한 정책을 명시적으로 추가한다.
공고(`opportunities`)만 읽기 허용하는 예시는 `supabase/schema.sql` 맨 아래 주석에 있다.

## 스키마를 바꿀 때

[`supabase/schema.sql`](../../supabase/schema.sql) 이 원본이다. 전부 `create ... if not exists` 라
**여러 번 실행해도 안전하다.** 바꾼 뒤 SQL Editor 에 다시 붙여넣거나 마이그레이션으로 올린다.

## 안 될 때

| 증상 | 원인 |
|------|------|
| 전부 `401` | `anon` 키를 넣었다. `service_role` 로 교체 |
| `접속 실패` | `SUPABASE_URL` 에 경로가 붙었거나 오타. `https://xxxx.supabase.co` 형태여야 한다 |
| 일부 `테이블 없음` | 마이그레이션이 중간에 끊겼다. `schema.sql` 을 다시 실행 |
| 데이터가 안 남음 | `.env.local` 수정 후 개발 서버를 재시작하지 않았다 |
| 프로젝트가 멈춤 | 무료 플랜은 일정 기간 미사용 시 일시정지된다. 대시보드에서 Restore |
