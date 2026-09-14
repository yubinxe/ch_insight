import localFont from 'next/font/local'

export const pretendard = localFont({
  src: [
    { path: './fonts/Pretendard-Regular.otf', weight: '400 500', style: 'normal' },
    { path: './fonts/Pretendard-Bold.otf', weight: '600 900', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  fallback: ['Arial', 'system-ui', 'sans-serif'],
})

/**
 * Gmarket Sans — 브랜드 인상과 짧은 후킹 문구 전용.
 * 긴 설명·숫자가 많은 상세 UI 에는 쓰지 않는다 (G마켓 공식 가이드).
 * TTF 를 프로젝트에 포함해 next/font 로 self-host 한다.
 */
export const gmarket = localFont({
  src: [
    { path: './fonts/GmarketSansTTFMedium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/GmarketSansTTFBold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-brand',
  display: 'swap',
  // 폰트 로딩 실패·지연 시에도 레이아웃이 흔들리지 않도록 대체 글꼴을 지정한다.
  fallback: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
})
