/** What the bouquet stands in on the table. `lift` raises the whole bouquet (tall stands). */
export type StandId = 'gold' | 'ceramic' | 'glass' | 'basket' | 'box'

/** `seat`: height (bouquet root space) where stems end inside the stand. */
export const STANDS: { id: StandId; lift: number; seat: number }[] = [
  { id: 'gold', lift: 0.13, seat: 0.205 },
  { id: 'ceramic', lift: 0, seat: 0.06 },
  { id: 'glass', lift: 0.03, seat: -0.045 },
  { id: 'basket', lift: 0, seat: 0.085 },
  { id: 'box', lift: 0, seat: 0.075 },
]

export const DEFAULT_STAND: StandId = 'gold'
export const isStand = (v: unknown): v is StandId => STANDS.some((s) => s.id === v)
export const standLift = (id: StandId) => STANDS.find((s) => s.id === id)?.lift ?? 0
export const standSeat = (id: StandId) => STANDS.find((s) => s.id === id)?.seat ?? 0.06
