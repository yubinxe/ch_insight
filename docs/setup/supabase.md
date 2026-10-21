# Supabase

**연결 완료.** 데이터가 실제로 남는다 — 서버를 껐다 켜도 고객·조건·공고·매칭·알림이 그대로 있다.

| 항목 | 값 |
|------|-----|
| 프로젝트 | `jipcatch` (조직 YubinKim · Free) |
| ref | `orckemmbuunvvnvbzvtm` |
| 리전 | `ap-northeast-2` 서울 |
| URL | `https://orckemmbuunvvnvbzvtm.supabase.co` |
| 마이그레이션 | `jipcatch_crm_schema` — 테이블 10개, 전부 RLS 켜짐 |

## 확인

```bash
npm run db:check
```

테이블 10개가 `✓` 와 행 수로 나오면 정상이다.

## 키는 어디 있나

레포 안이 아니라 사용자 홈에 둔다. 새 기기·새 프로젝트에서 재사용하기 위해서다.

```
~/.config/supabase/jipcatch.env     ← 원본
~/.config/supabase/README.md        ← 사용법
```

이 프로젝트의 `.env.local` 에는 여기서 복사해 넣었다.

```bash
cat ~/.config/supabase/jipcatch.env >> .env.local   # 새 클론에서
```

`.env.local` 은 `.gitignore` 에 있다 (`git check-ignore -v .env.local` 로 확인).

### 키 두 종류

| 키 | 변수 | 용도 |
|----|------|------|
| secret (service_role) | `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용.** RLS 를 우회한다 |
| publishable (anon) | `SUPABASE_PUBLISHABLE_KEY` | 브라우저 노출 가능. RLS 적용 |

secret 키에 `NEXT_PUBLIC_` 을 붙이면 브라우저 번들에 들어가 전 테이블이 열린다. 붙이지 않는다.
앱은 서버 라우트에서만 secret 키를 읽는다 ([`lib/db/supabase.ts`](../../lib/db/supabase.ts)).

유출이 의심되면 [API Keys](https://supabase.com/dashboard/project/orckemmbuunvvnvbzvtm/settings/api-keys) 에서
rotate 하고 `~/.config/supabase/jipcatch.env` 와 `.env.local` 을 새 값으로 바꾼다.

## 데이터 채우기

`/admin` 에 접속 코드(`ADMIN_PASSCODE`)로 들어간 뒤:

| 버튼 | 결과 |
|------|------|
| 시연 데이터 생성 | 고객 100명 · 기회 60건 (전부 `is_demo = true`) |
| 공고 동기화 (청약홈 · LH) | 실제 모집공고 수집 (`is_demo = false`) |
| 데모 신규 공실 발생 | 매칭 → 점수 → 알림까지 연쇄 실행 |

동기화는 `(source, external_id)` 로 upsert 하므로 **여러 번 눌러도 중복되지 않는다.**
시연 데이터와 실제 공고는 `is_demo` 로 끝까지 구분되고, 소비자 화면에는 실제 공고만 나간다.

## RLS

10개 테이블 모두 `enable row level security` 이고 **허용 정책이 하나도 없다.**
서버가 secret 키로 접근해 RLS 를 우회하므로 동작에 영향이 없고,
publishable 키로 브라우저에서 직접 붙으면 전부 막힌다.

Supabase 보안 린터의 `rls_enabled_no_policy` (INFO) 10건이 의도한 상태다.
클라이언트에서 직접 읽어야 할 일이 생기면 그때 최소 권한 정책을 명시적으로 추가한다
([`supabase/schema.sql`](../../supabase/schema.sql) 맨 아래 주석에 예시).

## 스키마를 바꿀 때

[`supabase/schema.sql`](../../supabase/schema.sql) 이 원본이다. 전부 `create ... if not exists` 라
여러 번 실행해도 안전하다. 바꾼 뒤 SQL Editor 에 다시 붙여넣는다.

## 안 될 때

| 증상 | 원인 |
|------|------|
| 전부 `401` | publishable 키를 넣었다. secret 키로 교체 |
| `접속 실패` | `SUPABASE_URL` 에 경로가 붙었거나 오타 |
| 일부 `테이블 없음` | 마이그레이션이 중간에 끊겼다. `schema.sql` 을 다시 실행 |
| 데이터가 안 남음 | `.env.local` 수정 후 개발 서버를 재시작하지 않았다 |
| 프로젝트 일시정지 | 무료 플랜은 장기 미사용 시 멈춘다. 대시보드에서 Restore |
