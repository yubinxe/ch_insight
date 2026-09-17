'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MAP_SCOPE, type MapScope } from '@/lib/consumer/geo'
import { formatManOr } from '@/lib/crm/services/scoring'
import { PillChoice } from './Choose'

/**
 * 지도로 보는 공고.
 *
 * 목록은 "무엇이 있는지"를, 달력은 "언제인지"를 답한다. 지도는 "어디인지"다.
 * 집을 고르는 일은 결국 지도 위에서 끝나므로, 남은 날짜를 표시에 얹어
 * 어디가 급한지까지 한 번에 보이게 한다.
 *
 * 좌표의 출처를 숨기지 않는다. 주소를 지오코딩해 얻은 점과 지역 기준의 대략
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
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type NaverNS = any

const KEY_ID = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID ?? ''
const SCRIPT_ID = 'naver-maps-v3'

/**
 * 지도 API 를 한 번만 싣는다.
 *
 * 로더가 언제 준비되는지는 이벤트 하나로 알 수 없다. 실측해 보면 이렇다.
 *
 *   callback  → 이때 `naver.maps` 는 아직 **null**
 *   onload    → 이때는 채워져 **있다**
 *
 * 문서가 안내하는 callback 이 오히려 이른 셈이라, 둘 중 하나만 믿으면
 * 키가 멀쩡한데도 "지도를 불러오지 못했습니다"로 끝난다. 실제로 그렇게 끝났다.
 *
 * 그래서 신호를 기다리지 않고 **결과를 확인한다.** `naver.maps` 가 생기면
 * 그때가 준비된 때다. 이벤트 순서가 나중에 또 바뀌어도 이 방식은 버틴다.
 */
function loadNaver(): Promise<NaverNS> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저 전용'))
  const w = window as unknown as { naver?: NaverNS; __naverMapPromise?: Promise<NaverNS> }
  if (w.naver?.maps) return Promise.resolve(w.naver)
  if (w.__naverMapPromise) return w.__naverMapPromise

  w.__naverMapPromise = new Promise<NaverNS>((resolve, reject) => {
    if (!KEY_ID) {
      reject(new Error('지도 키가 설정되지 않았습니다.'))
      return
    }

    let settled = false
    let timer: ReturnType<typeof setInterval> | null = null
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      stop()
      fn()
    }

    // 인증이 막히면 스크립트는 정상 로드되고 이 전역만 불린다. 잡지 않으면
    // 회색 판이 이유 없이 남는다.
    ;(window as unknown as Record<string, unknown>).navermap_authFailure = () =>
      finish(() =>
        reject(new Error('지도 인증에 실패했습니다. 콘솔에 이 주소가 등록돼 있는지 확인해 주세요.')),
      )

    const settleIfReady = () => {
      const n = (window as unknown as { naver?: NaverNS }).naver
      if (n?.maps) finish(() => resolve(n))
    }

    const el = document.createElement('script')
    el.id = SCRIPT_ID
    el.async = true
    // 지오코더 서브모듈은 부르지 않는다. 키에 Geocoding 이 열려 있지 않으면
    // 그 요청이 401 을 받고, 그 여파로 `naver.maps` 가 끝내 세워지지 않는다.
    el.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${KEY_ID}`
    el.onload = settleIfReady
    el.onerror = () => finish(() => reject(new Error('지도를 불러오지 못했습니다.')))
    document.head.appendChild(el)

    // onload 뒤에도 한 박자 늦게 채워지는 경우가 있어 짧게 되짚는다.
    timer = setInterval(settleIfReady, 120)

    setTimeout(
      () => finish(() => reject(new Error('지도를 불러오는 데 너무 오래 걸립니다.'))),
      15000,
    )
  }).catch(err => {
    // 실패한 약속을 캐시에 남기면 다시 들어와도 영영 지도가 없다.
    delete (window as unknown as { __naverMapPromise?: unknown }).__naverMapPromise
    throw err
  })

  return w.__naverMapPromise
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

export default function NoticeMap() {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<NaverNS>(null)
  const markersRef = useRef<NaverNS[]>([])

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

  // 지도를 세운다. 데이터가 오기 전에도 먼저 띄워 빈 판이 깜빡이지 않게 한다.
  useEffect(() => {
    let alive = true
    if (!host.current) return
    loadNaver()
      .then(naver => {
        if (!alive || !host.current || mapRef.current) return
        const s = MAP_SCOPE[scope]
        mapRef.current = new naver.maps.Map(host.current, {
          center: new naver.maps.LatLng(s.center.lat, s.center.lng),
          zoom: s.zoom,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.TOP_LEFT },
          scaleControl: false,
          mapDataControl: false,
          logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT },
        })
        setReady(true)
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
    // scope 는 아래 별도 효과에서 다룬다 — 지도를 다시 만들지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 범위 탭을 누르면 지도를 옮긴다. 다시 만들지 않는다 — 다시 만들면 눈이 끊긴다.
  useEffect(() => {
    const w = window as unknown as { naver?: NaverNS }
    if (!ready || !mapRef.current || !w.naver?.maps) return
    const s = MAP_SCOPE[scope]
    mapRef.current.morph(new w.naver.maps.LatLng(s.center.lat, s.center.lng), s.zoom)
  }, [scope, ready])

  // 표시를 그린다. 지도의 기본 핀 대신 지면의 글자꼴로 만든 표를 쓴다.
  useEffect(() => {
    const w = window as unknown as { naver?: NaverNS }
    // `naver` 는 있는데 `naver.maps` 가 비는 순간이 있다. 한 겹 더 확인하지
    // 않으면 표시를 그리다 페이지 전체가 내려앉는다.
    if (!ready || !mapRef.current || !data || !w.naver?.maps) return
    const naver = w.naver
    const map = mapRef.current

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

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

      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(pin.lat, pin.lng),
        title: pin.name,
        icon: {
          content: `<span class="${cls}" data-id="${pin.id}">${dday(pin.daysLeft)}</span>`,
          anchor: new naver.maps.Point(26, 14),
        },
      })
      naver.maps.Event.addListener(marker, 'click', () => {
        window.location.href = `/notices/${pin.id}`
      })
      markersRef.current.push(marker)
    })

    // 지도를 움직이면 옆 목록이 따라온다. 보이는 것과 읽는 것을 어긋나게 두지 않는다.
    const sync = () => {
      const b = map.getBounds()
      const inView = data.pins.filter(p => b.hasLatLng(new naver.maps.LatLng(p.lat, p.lng)))
      inView.sort((a, z) => (a.daysLeft ?? 9999) - (z.daysLeft ?? 9999))
      setVisible(inView)
    }
    sync()
    const l1 = naver.maps.Event.addListener(map, 'idle', sync)

    return () => {
      naver.maps.Event.removeListener(l1)
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
    }
  }, [ready, data])

  const geocodedCount = data?.pins.filter(p => p.coordSource === 'GEOCODED').length ?? 0

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
        </div>
      </div>

      {error ? (
        <div className="cs-error" style={{ marginTop: 20 }}>
          <span>{error}</span>
        </div>
      ) : (
        <div className="cs-map">
          <div className="cs-map__canvas" ref={host} role="application" aria-label="공고 지도" />

          <aside className="cs-map__side" aria-label="보이는 범위의 공고">
            <div className="cs-map__side-head">
              <strong>보이는 범위의 공고</strong>
              <span className="cs-num">{visible.length}건</span>
            </div>
            {visible.length === 0 ? (
              <p className="cs-note" style={{ padding: '18px 16px' }}>
                이 범위에는 표시된 공고가 없어요. 지도를 넓히거나 범위를 바꿔 보세요.
              </p>
            ) : (
              <ul className="cs-map__list">
                {visible.map(p => (
                  <li key={p.id} data-hover={hovered === p.id}>
                    <Link
                      href={`/notices/${p.id}`}
                      onMouseEnter={() => setHovered(p.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <span
                        className="cs-map__dday"
                        data-urgent={p.daysLeft !== null && p.daysLeft <= 3}
                      >
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
      )}

      {data && (
        <p className="cs-note" style={{ marginTop: 16 }}>
          지도에 표시된 공고 {data.pins.length}건
          {geocodedCount > 0 && ` · 주소로 정확히 찍은 공고 ${geocodedCount}건`}
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
