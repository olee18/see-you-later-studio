import type { Dims } from './layout'
import { standLift, type StandId } from './stands'

/** How the bouquet is wrapped / presented. */
export type ShapeId = 'korean' | 'cone' | 'handtied' | 'posy'
export const SHAPES: ShapeId[] = ['korean', 'cone', 'handtied', 'posy']
export const DEFAULT_SHAPE: ShapeId = 'korean'
/** Older saves may name shapes that no longer exist; those fall back to the default. */
export const isShape = (v: unknown): v is ShapeId => SHAPES.includes(v as ShapeId)

/** How far the flowers + wrap are raised by the stand. */
export function bouquetLift(_shape: ShapeId, stand: StandId, _d: Dims) {
  return standLift(stand)
}
