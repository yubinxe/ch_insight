import type { ReactNode } from 'react'

/**
 * 화면에 실제 공고가 한 건도 없을 때 예시 목록 앞에 세우는 안내.
 *
 * 예시 공고를 곧장 늘어놓으면, 카드의 '예시' 배지를 읽지 않은 사람에게는
 * 그대로 진행 중인 공고로 보인다. 목록을 지우는 대신 순서를 바꾼다 —
 * 없다는 사실을 먼저 말하고, 예시는 그 다음에 예시로 보여준다.
 *
 * 문장은 사과하지 않는다. 공고가 없는 것은 우리 잘못이 아니라 지금의 사실이고,
 * 사용자가 알아야 할 것은 "왜 비어 있는지"와 "그래서 무엇을 할 수 있는지"다.
 */
export default function SampleOnlyNotice({
  scope,
  sampleCount,
  actions,
}: {
  /** 무엇을 기준으로 찾았는지. "관악구 · 동작구 조건으로" 처럼 붙는다 */
  scope?: string
  /** 아래에 예시가 몇 건 따라오는지. 0 이면 예시 안내 문장을 적지 않는다 */
  sampleCount: number
  actions?: ReactNode
}) {
  return (
    <div className="cs-vacancy" role="status">
      <span className="cs-vacancy__eyebrow">공식 공고 0건</span>
      <p className="cs-vacancy__title">현재 진행 중인 공고가 없습니다</p>
      <p className="cs-vacancy__desc">
        {scope ? `${scope} ` : ''}접수 중인 공식 모집공고를 찾지 못했습니다.
        {sampleCount > 0 && (
          <>
            {' '}
            아래 {sampleCount}건은 화면 구성을 보여드리는 예시이며, 신청 대상이 아닙니다.
          </>
        )}
      </p>
      {actions && <div className="cs-vacancy__actions">{actions}</div>}
    </div>
  )
}
