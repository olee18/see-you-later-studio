import type { Dims } from './layout'
import { standLift, type StandId } from './stands'

/** How the bouquet is wrapped / presented. */
export type ShapeId = 'korean' | 'cone' | 'handtied' | 'box'
export const SHAPES: ShapeId[] = ['korean', 'cone', 'handtied', 'box']
export const DEFAULT_SHAPE: ShapeId = 'korean'
export const isShape = (v: unknown): v is ShapeId => SHAPES.includes(v as ShapeId)

/** Hat box: sits on the table (y = -0.06 in bouquet space), top edge here. */
export const BOX_TOP = 0.16
export const boxRadius = (d: Dims) => Math.max(0.12, d.rimR + 0.02)

/**
 * How far the flowers + wrap are raised from the default height:
 * a stand lifts them, the hat box lowers the dome so it sits on the box rim.
 */
export function bouquetLift(shape: ShapeId, stand: StandId, d: Dims) {
  if (shape === 'box') return BOX_TOP + 0.015 - d.rimY
  return standLift(stand)
}
