import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findOfficialProperty } from '@/lib/consumer/official'
import { checkUrgency } from '@/lib/crm/services/scoring'
import { isRental } from '@/lib/consumer/classify'

/**
 * 공고 하나를 링크로 보냈을 때 딸려 가는 그림.
 *
 * 사람이 카카오톡으로 보내는 것은 대개 서비스가 아니라 공고 하나다.
 * "이거 봐" 하고 붙이는데 미리보기가 서비스 소개면, 받는 사람은 무엇을
 * 보라는 건지 모른 채 눌러야 한다.
 *
 * 공고 이름과 남은 날을 그림에 적는다. 링크를 열지 않아도 급한지 아닌지는
 * 알 수 있어야 한다.
 */

export const alt = '집캐치 모집공고'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAPER = '#F4F1EB'
const INK = '#14110C'
const SALE = '#A83A20'
const RENT = '#2C4B75'
const BODY = '#3B352C'
const MUTED = '#6F6859'
const LINE = '#E2DBCF'

/** 제목이 길면 그림 밖으로 밀린다. 글자 수에 따라 크기를 낮춘다 */
function titleSize(len: number) {
  if (len <= 18) return 66
  if (len <= 28) return 56
  if (len <= 40) return 46
  return 38
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [jalnan, gmarket] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/JalnanGothicTTF.ttf')),
    readFile(join(process.cwd(), 'app/fonts/GmarketSansTTFMedium.ttf')),
  ])

  const { id } = await params
  // 공고를 못 찾아도 그림은 나와야 한다. 미리보기가 깨지는 것보다 낫다.
  const property = await findOfficialProperty(id).catch(() => null)

  const urgency = property ? checkUrgency(property, new Date()) : null
  const rent = property ? isRental(property.housingType) : false
  const tone = rent ? RENT : SALE
  const name = property?.name ?? '모집공고'
  const where = [property?.district, property?.region].filter(Boolean).join(' ')

  const dday =
    urgency === null || urgency.daysLeft === null
      ? null
      : urgency.daysLeft < 0
        ? '마감'
        : urgency.daysLeft === 0
          ? 'D-DAY'
          : `D-${urgency.daysLeft}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          backgroundImage: `radial-gradient(circle at 88% 12%, ${tone}14, transparent 42%)`,
          padding: 68,
        }}
      >
        {/* 위 — 무엇인지, 얼마나 급한지 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span
                style={{
                  display: 'flex',
                  padding: '7px 16px',
                  borderRadius: 999,
                  background: tone,
                  color: PAPER,
                  fontFamily: 'Gmarket',
                  fontSize: 21,
                }}
              >
                {rent ? '임대' : '분양'}
              </span>
              {property?.housingType && (
                <span
                  style={{
                    display: 'flex',
                    padding: '7px 16px',
                    borderRadius: 999,
                    border: `1px solid ${LINE}`,
                    color: BODY,
                    fontFamily: 'Gmarket',
                    fontSize: 21,
                  }}
                >
                  {property.housingType}
                </span>
              )}
            </div>
          </div>

          {dday && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 28px',
                borderRadius: 18,
                background: dday === '마감' ? LINE : tone,
                color: dday === '마감' ? MUTED : PAPER,
                fontFamily: 'Jalnan',
                fontSize: 44,
              }}
            >
              {dday}
            </div>
          )}
        </div>

        {/* 가운데 — 공고 이름. 이 그림에서 가장 무거운 것 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Jalnan',
              fontSize: titleSize(name.length),
              lineHeight: 1.22,
              color: INK,
            }}
          >
            {name.length > 56 ? `${name.slice(0, 56)}…` : name}
          </div>
          {where && (
            <div style={{ display: 'flex', fontFamily: 'Gmarket', fontSize: 27, color: BODY }}>{where}</div>
          )}
        </div>

        {/* 아래 — 누가 알려주는지 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 22,
            borderTop: `1px solid ${LINE}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', width: 34, height: 5, background: SALE }} />
            <span style={{ display: 'flex', fontFamily: 'Jalnan', fontSize: 27, color: INK }}>집캐치</span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Gmarket', fontSize: 20, color: MUTED }}>
            {property?.applicationEnd ? `접수 마감 ${property.applicationEnd}` : '청약홈 · LH 공식 모집공고'}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Jalnan', data: jalnan, style: 'normal', weight: 700 },
        { name: 'Gmarket', data: gmarket, style: 'normal', weight: 500 },
      ],
    },
  )
}
