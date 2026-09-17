/** seed 기반 deterministic PRNG (mulberry32) — 데모 재현성 보장 */
export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    /** [{ value, weight }] 분포에서 가중 추출 */
    weighted: <T,>(items: readonly { value: T; weight: number }[]): T => {
      const total = items.reduce((s, i) => s + i.weight, 0)
      let r = next() * total
      for (const item of items) {
        r -= item.weight
        if (r <= 0) return item.value
      }
      return items[items.length - 1].value
    },
    bool: (p: number) => next() < p,
  }
}

export type Rng = ReturnType<typeof createRng>
