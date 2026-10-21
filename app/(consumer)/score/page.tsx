import type { Metadata } from 'next'
import ScoreCalculator from '@/components/consumer/ScoreCalculator'

export const metadata: Metadata = {
  title: '청약 가점 계산 — 집캐치',
  description:
    '무주택 기간·부양가족·청약통장 가입기간으로 청약 가점을 계산하고, 공개된 당첨가점 통계와 비교해 봅니다.',
}

export default function ScorePage() {
  return <ScoreCalculator />
}
