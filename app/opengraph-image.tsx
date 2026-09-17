import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * 링크를 보냈을 때 딸려 가는 그림.
 *
 * 카카오톡·슬랙에 주소만 붙이면 회색 칸 하나가 뜬다. 그 칸이 비어 있으면
 * 받는 사람은 열어 보기 전에 이미 한 번 판단을 내린다.
 *
 * 지면과 같은 것을 쓴다 — 한지 바탕에 먹, 주묵 낙관. 링크로 먼저 만나는
 * 사람에게도 같은 인상이어야 브랜드가 한 덩어리로 남는다.
 *
 * satori(ImageResponse 의 엔진)는 flexbox 만 알아듣는다. 자식이 둘 이상인
 * 요소에는 `display: flex` 를 빠짐없이 적어야 하고, woff2 는 읽지 못한다.
 * 그래서 프로젝트의 TTF 를 그대로 먹인다.
 */

export const alt = '집캐치 — 청약부터 공공임대까지, 내 조건에 맞는 공고만'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** 한지 · 먹 · 주묵 — 지면과 같은 색 */
const PAPER = '#F4F1EB'
const INK = '#14110C'
const ACCENT = '#A83A20'
const BODY = '#3B352C'
const MUTED = '#6F6859'
const LINE = '#E2DBCF'

export default async function Image() {
  const [jalnan, gmarket] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/JalnanGothicTTF.ttf')),
    readFile(join(process.cwd(), 'app/fonts/GmarketSansTTFMedium.ttf')),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: PAPER,
          // 한지의 결 — 아주 옅게 깔아 판판한 색면이 되지 않게 한다
          backgroundImage:
            'radial-gradient(circle at 18% 22%, rgba(168,58,32,0.05), transparent 45%), radial-gradient(circle at 88% 82%, rgba(20,17,12,0.05), transparent 46%)',
          padding: 72,
          position: 'relative',
        }}
      >
        {/* 왼쪽 — 이름과 문구 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
            <div style={{ display: 'flex', width: 52, height: 5, background: ACCENT }} />
            <div
              style={{
                display: 'flex',
                marginLeft: 16,
                fontFamily: 'Gmarket',
                fontSize: 25,
                color: ACCENT,
                letterSpacing: 4,
              }}
            >
              ZIPCATCH
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontFamily: 'Jalnan',
              fontSize: 96,
              color: INK,
              lineHeight: 1.05,
              marginBottom: 26,
            }}
          >
            집캐치
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Jalnan',
              fontSize: 41,
              color: BODY,
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex' }}>청약부터 공공임대까지,</div>
            <div style={{ display: 'flex', color: INK }}>내 조건에 맞는 공고만.</div>
          </div>

          <div style={{ display: 'flex', width: 132, height: 1, background: LINE, marginTop: 40 }} />

          <div
            style={{
              display: 'flex',
              fontFamily: 'Gmarket',
              fontSize: 22,
              color: MUTED,
              marginTop: 20,
            }}
          >
            청약홈 · LH 청약플러스 공식 모집공고
          </div>
        </div>

        {/* 오른쪽 — 낙관. 이름 옆에 찍는 붉은 도장 하나가 지면을 여민다 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 244,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 196,
              height: 196,
              background: ACCENT,
              borderRadius: 30,
              fontFamily: 'Jalnan',
              fontSize: 104,
              color: PAPER,
            }}
          >
            집
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
