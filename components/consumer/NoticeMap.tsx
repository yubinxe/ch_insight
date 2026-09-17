'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MAP_SCOPE, type MapScope } from '@/lib/consumer/geo'
import { formatManOr } from '@/lib/crm/services/scoring'
import { PillChoice } from './Choose'

/**
 * 지도로 보는 공고 (카카오맵).
 *
 * 목록은 "무엇이 있는지"를, 달력은 "언제인지"를 답한다. 지도는 "어디인지"다.
 * 집을 고르는 일은 결국 지도 위에서 끝나므로, 남은 날짜를 표시에 얹어
 * 어디가 급한지까지 한 번에 보이게 한다.
 *
 * 좌표의 출처를 숨기지 않는다. 주소를 좌표로 바꿔 찍은 점과 지역 기준의 대략
 * 위치를 다르게 그리고, 지도에 올리지 못한 공고 수를 아래에 적는다.
 * 지도에 없는 공고가 없는 공고처럼 읽히면 지도를 믿고 목록을 안 보게 된다.
 */

interface Pin {
  id: string
  name: string
  province: string
  region: string
  housingType: string
  address: string | null
  kind: 'SALE' | 'RENT'
  deposit: number | null
  monthlyRent: number | null
  applicationEnd: string | null
  daysLeft: number | null
  urgencyLabel: string
  lat: number
  lng: number
  coordSource: 'GEOCODED' | 'DISTRICT' | 'PROVINCE'
}

interface MapData {
  pins: Pin[]
  total: number
  noCoord: number
  noAddress: number
  geocoded: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ?? ''
const SCRIPT_ID = 'kakao-maps-sdk'

/**
 * 지도 SDK 를 한 번만 싣는다.
 *
 * `autoload=false` 로 받아 `kakao.maps.load()` 안에서 시작한다. 카카오가 정한
 * 방법이고, "언제 준비됐는지"를 이벤트 순서로 짐작하지 않아도 되는 유일한
 * 길이다 — 그 판단을 신호로 대신하려다 지도 없는 화면을 여러 번 만들었다.
 *
 * 도메인이 콘솔에 등록돼 있지 않으면 스크립트가 401 로 떨어진다. 그때는
 * 무엇을 해야 하는지까지 화면에 적는다. 회색 판만 남기지 않는다.
 */
function loadKakao(): Promise<KakaoNS> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저 전용'))
  const w = window as unknown as { kakao?: KakaoNS; __kakaoMapPromise?: Promise<KakaoNS> }
  if (w.kakao?.maps?.Map) return Promise.resolve(w.kakao)
  if (w.__kakaoMapPromise) return w.__kakaoMapPromise

  // 무엇을 등록해야 하는지 화면이 직접 말하게 한다. "도메인을 등록하세요"만
  // 적어두면, 무엇을 어디에 적어야 하는지는 여전히 사람이 찾아야 한다.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const DOMAIN_HINT =
    `카카오 개발자 콘솔 › 내 애플리케이션 › 앱 설정 › 플랫폼 › Web › 사이트 도메인에 ` +
    `「${origin}」 를 그대로 등록해 주세요. ` +
    `Redirect URI 가 아니라 사이트 도메인 칸이고, 이 키(${JS_KEY.slice(0, 8)}…)를 발급한 그 앱이어야 합니다.`

  w.__kakaoMapPromise = new Promise<KakaoNS>((resolve, reject) => {
    if (!JS_KEY) {
      reject(new Error('지도 키가 설정되지 않았습니다.'))
      return
    }

    const start = () => {
      const k = (window as unknown as { kakao?: KakaoNS }).kakao
      if (!k?.maps) {
        reject(new Error(`지도를 불러오지 못했습니다. ${DOMAIN_HINT}`))
        return
      }
      k.maps.load(() => resolve(k))
    }

    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', start)
      return
    }

    const el = document.createElement('script')
    el.id = SCRIPT_ID
    el.async = true
    el.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false`
    el.onload = start
    el.onerror = () => reject(new Error(`지도를 불러오지 못했습니다. ${DOMAIN_HINT}`))
    document.head.appendChild(el)

    setTimeout(() => reject(new Error('지도를 불러오는 데 너무 오래 걸립니다.')), 15000)
  }).catch(err => {
    // 실패한 약속을 캐시에 남기면 다시 들어와도 영영 지도가 없다.
    delete (window as unknown as { __kakaoMapPromise?: unknown }).__kakaoMapPromise
    throw err
  })

  return w.__kakaoMapPromise
}

/** 남은 날을 사람 말로. 표시 안에 들어가므로 짧아야 한다 */
function dday(n: number | null) {
  if (n === null) return '미정'
  if (n === 0) return 'D-DAY'
  if (n < 0) return '마감'
  return `D-${n}`
}

function priceLine(p: Pin) {
  if (p.deposit === null && p.monthlyRent === null) return '공급금액 공고문 확인'
  const dep = formatManOr(p.deposit)
  if (p.monthlyRent === null || p.monthlyRent === 0) return dep
  return `${dep} · 월 ${p.monthlyRent.toLocaleString()}만원`
}

/**
 * 카카오의 level 은 작을수록 확대이고, 한 단 오를 때마다 대략 두 배씩 넓어진다.
 * 7 은 가로 1km 남짓 — 서울 도심 몇 블록이다. 처음에 이 값을 "서울"로 잡았더니
 * 지도 범위가 37.53~37.59 로 잡혀, 의정부·시흥·양주에 있는 공고가 전부 화면
 * 밖으로 나갔다. 표시는 102개 다 만들어졌는데 하나도 안 보였던 이유다.
 *
 *   9 ≈ 4km    서울 전역
 *  11 ≈ 16km   수도권
 *  13 ≈ 64km   전국
 */
const LEVEL: Record<MapScope, number> = { 서울: 9, 수도권: 11, 전국: 13 }

export default function NoticeMap() {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoNS>(null)
  const overlaysRef = useRef<KakaoNS[]>([])

  const [scope, setScope] = useState<MapScope>('서울')
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  /** 지금 화면에 들어온 공고 — 지도를 움직이면 따라 바뀐다 */
  const [visible, setVisible] = useState<Pin[]>([])
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/notices/map', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('공고를 불러오지 못했어요.'))))
      .then(json => {
        if (!alive) return
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '공고를 불러오지 못했어요.')
      })
    return () => {
      alive = false
    }
  }, [])

  // 지도를 세운다. 데이터가 오기 전에 먼저 띄워 빈 판이 깜빡이지 않게 한다.
  useEffect(() => {
    let alive = true
    loadKakao()
      .then(kakao => {
        if (!alive || !host.current || mapRef.current) return
        const s = MAP_SCOPE.서울
        mapRef.current = new kakao.maps.Map(host.current, {
          center: new kakao.maps.LatLng(s.center.lat, s.center.lng),
          level: LEVEL.서울,
        })
        setReady(true)
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
  }, [])

  // 범위를 누르면 옮긴다. 다시 만들지 않는다 — 다시 만들면 눈이 끊긴다.
  useEffect(() => {
    const w = window as unknown as { kakao?: KakaoNS }
    if (!ready || !mapRef.current || !w.kakao?.maps) return
    const s = MAP_SCOPE[scope]
    mapRef.current.setLevel(LEVEL[scope])
    mapRef.current.panTo(new w.kakao.maps.LatLng(s.center.lat, s.center.lng))
  }, [scope, ready])

  // 표시를 그린다. 기본 핀 대신 지면의 글자꼴로 만든 표를 얹는다.
  useEffect(() => {
    const w = window as unknown as { kakao?: KakaoNS }
    if (!ready || !mapRef.current || !data || !w.kakao?.maps) return
    const kakao = w.kakao
    const map = mapRef.current

    overlaysRef.current.forEach(o => {
      try {
        o.setMap(null)
      } catch {
        /* 이미 떨어져 나간 표시 */
      }
    })
    overlaysRef.current = []

    // 표시는 HTML 문자열로 넘긴다. DOM 요소를 넘기면 React 가 다시 그릴 때
    // 그 요소가 바뀌어 지도 위에서 사라지는 일이 생긴다. 실패를 조용히
    // 삼키지 않고 한 번만 모아서 화면에 알린다 — 지난번에 표시가 하나도
    // 안 뜨는데 아무 말도 없어 원인을 찾는 데 오래 걸렸다.
    let failed = 0
    data.pins.forEach(pin => {
      const urgent = pin.daysLeft !== null && pin.daysLeft <= 3
      const approx = pin.coordSource !== 'GEOCODED'
      const cls = [
        'cs-pin',
        `cs-pin--${pin.kind.toLowerCase()}`,
        urgent ? 'cs-pin--urgent' : '',
        approx ? 'cs-pin--approx' : '',
      ]
        .filter(Boolean)
        .join(' ')
      const label = dday(pin.daysLeft)
      const title = `${pin.name} · ${pin.province}`.replace(/"/g, '&quot;')

      try {
        const ov = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(pin.lat, pin.lng),
          content: `<a class="${cls}" href="/notices/${pin.id}" title="${title}">${label}</a>`,
          yAnchor: 0.5,
          xAnchor: 0.5,
          clickable: true,
          zIndex: urgent ? 3 : pin.kind === 'SALE' ? 2 : 1,
        })
        ov.setMap(map)
        overlaysRef.current.push(ov)
      } catch {
        failed++
      }
    })
    if (failed > 0 && failed === data.pins.length) {
      // 효과 안에서 곧바로 상태를 바꾸면 그리기가 한 번 더 돈다. 한 박자 뒤로 미룬다.
      queueMicrotask(() => setError('지도에 공고를 표시하지 못했습니다. 잠시 뒤 새로고침해 주세요.'))
    }

    // 지도를 움직이면 옆 목록이 따라온다. 보이는 것과 읽는 것을 어긋나게 두지 않는다.
    const sync = () => {
      const b = map.getBounds()
      if (!b) return
      const sw = b.getSouthWest()
      const ne = b.getNorthEast()
      const inView = data.pins.filter(
        p =>
          p.lat >= sw.getLat() &&
          p.lat <= ne.getLat() &&
          p.lng >= sw.getLng() &&
          p.lng <= ne.getLng(),
      )
      inView.sort((a, z) => (a.daysLeft ?? 9999) - (z.daysLeft ?? 9999))
      setVisible(inView)
    }
    /**
     * 화면에 표시가 하나도 없으면 공고가 있는 데로 맞춘다.
     *
     * 빈 지도를 보여주는 것은 지도가 없는 것보다 나쁘다 — 공고가 없다고 읽히기
     * 때문이다. 축척을 아무리 잘 잡아도 데이터가 어디에 몰릴지는 그때그때 다르다.
     * 처음 한 번만 맞추고, 그 뒤 사용자가 움직인 화면은 건드리지 않는다.
     */
    let fitted = false
    const fitIfEmpty = () => {
      if (fitted) return
      const b = map.getBounds()
      if (!b) return
      const sw = b.getSouthWest()
      const ne = b.getNorthEast()
      const anyInView = data.pins.some(
        p =>
          p.lat >= sw.getLat() &&
          p.lat <= ne.getLat() &&
          p.lng >= sw.getLng() &&
          p.lng <= ne.getLng(),
      )
      if (anyInView || data.pins.length === 0) return
      fitted = true
      try {
        // 전부를 담으면 제주까지 들어와 수도권이 좁쌀이 된다. 지금 고른 범위
        // 안의 공고에만 맞추고, 그것도 없으면 그때 전체로 물러선다.
        const s = MAP_SCOPE[scope]
        const near = data.pins
          .map(p => ({ p, d: Math.hypot(p.lat - s.center.lat, p.lng - s.center.lng) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, Math.max(8, Math.round(data.pins.length * 0.35)))
          .map(x => x.p)
        const target = near.length ? near : data.pins
        const box = new kakao.maps.LatLngBounds()
        target.forEach(p => box.extend(new kakao.maps.LatLng(p.lat, p.lng)))
        map.setBounds(box, 28, 28, 28, 28)
      } catch {
        /* 못 맞춰도 지도는 그대로 쓸 수 있다 */
      }
    }

    sync()
    // 지도가 자리를 잡기 전에 한 번 더 — 처음 그릴 때 bounds 가 아직 0 인 순간이 있다
    const settle = setTimeout(() => {
      fitIfEmpty()
      sync()
    }, 400)
    kakao.maps.event.addListener(map, 'idle', sync)

    return () => {
      clearTimeout(settle)
      try {
        kakao.maps.event.removeListener(map, 'idle', sync)
      } catch {
        /* 떠나는 길에 난 예외로 다음 화면을 망치지 않는다 */
      }
      overlaysRef.current.forEach(o => {
        try {
          o.setMap(null)
        } catch {
          /* 같은 이유 */
        }
      })
      overlaysRef.current = []
    }
    // scope 가 바뀌면 다시 맞출 기회를 준다
  }, [ready, data, scope])

  return (
    <section className="cs-wrap cs-section" id="map">
      <header>
        <h2 className="cs-section-title">지도로 보는 공고</h2>
        <p className="cs-sub" style={{ marginTop: 12, marginBottom: 22 }}>
          서울부터 보여 드려요. 표시의 숫자는 접수 마감까지 남은 날입니다. 지도를 움직이면 옆 목록이
          보이는 범위의 공고로 바뀝니다.
        </p>
      </header>

      <div className="cs-map__bar">
        <PillChoice
          label="범위"
          value={scope}
          onChange={v => setScope(v as MapScope)}
          items={(Object.keys(MAP_SCOPE) as MapScope[]).map(k => ({ value: k, label: k }))}
        />
        <div className="cs-map__legend" aria-hidden="true">
          <span className="cs-map__key">
            <i className="cs-pin cs-pin--sale cs-pin--chip" />
            분양
          </span>
          <span className="cs-map__key">
            <i className="cs-pin cs-pin--rent cs-pin--chip" />
            임대
          </span>
          <span className="cs-map__key">
            <i className="cs-pin cs-pin--rent cs-pin--approx cs-pin--chip" />
            지역 기준
          </span>
        </div>
      </div>

      <div className="cs-map">
        {error ? (
          <div className="cs-map__fallback">
            <span className="cs-vacancy__eyebrow">지도를 열지 못했습니다</span>
            <p className="cs-vacancy__title">{error}</p>
            <p className="cs-vacancy__desc">지도가 없어도 공고는 아래 목록에서 전부 보실 수 있어요.</p>
          </div>
        ) : (
          <div className="cs-map__canvas" ref={host} role="application" aria-label="공고 지도" />
        )}

        <aside className="cs-map__side" aria-label="보이는 범위의 공고">
          <div className="cs-map__side-head">
            <strong>보이는 범위의 공고</strong>
            <span className="cs-num">{visible.length}건</span>
          </div>
          {visible.length === 0 ? (
            <p className="cs-note" style={{ padding: '18px 16px' }}>
              {error
                ? '지도를 열지 못해 범위를 셀 수 없어요.'
                : '이 범위에는 표시된 공고가 없어요. 지도를 넓히거나 범위를 바꿔 보세요.'}
            </p>
          ) : (
            <ul className="cs-map__list">
              {visible.map(p => (
                <li key={p.id} data-hover={hovered === p.id} data-kind={p.kind.toLowerCase()}>
                  <Link
                    href={`/notices/${p.id}`}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className="cs-map__dday">
                      {dday(p.daysLeft)}
                    </span>
                    <span className="cs-map__name">{p.name}</span>
                    <span className="cs-map__meta">
                      {p.province} · {p.housingType} · {priceLine(p)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {data && (
        <p className="cs-note" style={{ marginTop: 16 }}>
          지도에 표시된 공고 {data.pins.length}건
          {data.geocoded > 0 && ` · 주소로 정확히 찍은 공고 ${data.geocoded}건`}
          {data.noAddress > 0 &&
            ` · 주소가 없어 지역 기준으로 표시한 공고 ${data.noAddress}건(LH 목록에는 주소 칸이 없습니다)`}
          {data.noCoord > 0 && ` · 위치를 찾지 못한 공고 ${data.noCoord}건`}.{' '}
          <Link href="/notices" className="cs-btn cs-btn--text" style={{ padding: 0 }}>
            목록에서 전체 보기
          </Link>
        </p>
      )}
    </section>
  )
}
