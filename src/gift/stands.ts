/** What the bouquet stands in on the table. `lift` raises the whole bouquet (tall stands). */
export type StandId = 'gold' | 'ceramic' | 'glass' | 'basket' | 'box'

/**
 * `seat`: height (bouquet root space) where stems end inside the stand.
 * `seatR`: how far from the centre stems may spread there without poking through the walls.
 */
export const STANDS: { id: StandId; lift: number; seat: number; seatR: number }[] = [
  { id: 'gold', lift: 0.13, seat: 0.205, seatR: 0.035 },
  { id: 'ceramic', lift: 0, seat: 0.06, seatR: 0.065 },
  { id: 'glass', lift: 0.03, seat: -0.045, seatR: 0.05 },
  { id: 'basket', lift: 0, seat: 0.085, seatR: 0.085 },
  { id: 'box', lift: 0, seat: 0.075, seatR: 0.07 },
]

export const DEFAULT_STAND: StandId = 'gold'
export const isStand = (v: unknown): v is StandId => STANDS.some((s) => s.id === v)
export const standLift = (id: StandId) => STANDS.find((s) => s.id === id)?.lift ?? 0
export const standSeat = (id: StandId) => STANDS.find((s) => s.id === id)?.seat ?? 0.06
export const standSeatR = (id: StandId) => STANDS.find((s) => s.id === id)?.seatR ?? 0.05
