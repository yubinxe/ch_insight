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

/**
 * 국토교통부 실거래가 전용 키.
 *
 * 공공데이터포털은 서비스마다 따로 활용신청을 받는다. 청약홈에 신청한 키로
 * 실거래를 부르면 인증은 통과하면서 자료만 비어 온다 — 실패가 '자료 없음'처럼
 * 보여서, 어느 동네에 거래가 없는 것인지 키가 막힌 것인지 구별되지 않는다.
 *
 * 그래서 실거래는 키를 따로 둔다. 없으면 공용 키로 물러서되, 그 경우 비어
 * 오는 것을 자료 없음으로 읽지 않도록 호출부가 사유를 함께 남긴다.
 */
export function molitKey(): string {
  return (process.env.MOLIT_API_KEY ?? '').trim() || dataPortalKey()
}

export function hasMolitKey(): boolean {
  return molitKey().length > 0
}

/** 키가 설정돼 있는지 */
export function hasDataPortalKey(): boolean {
  return dataPortalKey().length > 0
}
