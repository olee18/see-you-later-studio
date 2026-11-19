/** What the bouquet stands in on the table. `lift` raises the whole bouquet (tall stands). */
export type StandId = 'gold' | 'ceramic' | 'glass' | 'basket' | 'box'

export const STANDS: { id: StandId; lift: number }[] = [
  { id: 'gold', lift: 0.13 },
  { id: 'ceramic', lift: 0 },
  { id: 'glass', lift: 0.03 },
  { id: 'basket', lift: 0 },
  { id: 'box', lift: 0 },
]

export const DEFAULT_STAND: StandId = 'gold'
export const isStand = (v: unknown): v is StandId => STANDS.some((s) => s.id === v)
export const standLift = (id: StandId) => STANDS.find((s) => s.id === id)?.lift ?? 0
