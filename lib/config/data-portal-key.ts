/**
 * 공공데이터포털(data.go.kr) 인증키 — 청약홈·LH 공통.
 *
 * 원래 이름은 `PUBLIC_DATA_API_KEY` 였다. '공공데이터'를 그대로 옮긴 말이지
 * "공개해도 되는 키"라는 뜻이 아니었는데, 배포 플랫폼은 `PUBLIC_` 접두사를
 * 브라우저에 노출해도 되는 값으로 읽는다. 이름 하나 때문에 자격증명이
 * 공개 설정으로 분류될 수 있어 `DATA_GO_KR_API_KEY` 로 바꿨다.
 *
 * 기존 로컬·배포 설정이 조용히 깨지지 않도록 옛 이름도 계속 읽는다.
 * 서버에서만 부른다 — 어느 이름이든 `NEXT_PUBLIC_` 을 붙이지 않는다.
 */
export function dataPortalKey(): string {
  return (process.env.DATA_GO_KR_API_KEY ?? process.env.PUBLIC_DATA_API_KEY ?? '').trim()
}

/** 키가 설정돼 있는지 */
export function hasDataPortalKey(): boolean {
  return dataPortalKey().length > 0
}
