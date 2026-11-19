import type { Dims } from './layout'
import { standLift, type StandId } from './stands'

/** How the bouquet is wrapped / presented. */
export type ShapeId = 'korean' | 'cone' | 'handtied' | 'posy' | 'box' | 'heartbox' | 'bag' | 'bucket'
export const SHAPES: ShapeId[] = ['korean', 'cone', 'handtied', 'posy', 'box', 'heartbox', 'bag', 'bucket']
export const DEFAULT_SHAPE: ShapeId = 'korean'
export const isShape = (v: unknown): v is ShapeId => SHAPES.includes(v as ShapeId)

/** Containers sit on the table (y = -0.06 in bouquet space); value = height of the top edge. */
const CONTAINER_TOP: Partial<Record<ShapeId, number>> = { box: 0.16, heartbox: 0.12, bag: 0.25, bucket: 0.17 }
export const isContainer = (s: ShapeId) => s in CONTAINER_TOP
export const containerTop = (s: ShapeId) => CONTAINER_TOP[s] ?? 0

/** Hat box. */
export const BOX_TOP = 0.16
export const boxRadius = (d: Dims) => Math.max(0.12, d.rimR + 0.02)
/** Heart box: width of the heart so the round dome fits inside it. */
export const heartWidth = (d: Dims) => Math.max(0.4, d.rimR * 3.2)
/** Flower bag: front width and depth. */
export const bagSize = (d: Dims) => ({ w: Math.max(0.24, 2 * (d.rimR + 0.05)), dep: Math.max(0.18, 2 * (d.rimR + 0.012)) })
/** Bucket top radius. */
export const bucketRadius = (d: Dims) => Math.max(0.12, d.rimR + 0.025)

/**
 * How far the flowers + wrap are raised from the default height:
 * a stand lifts them, a container lowers the dome so it sits on its rim.
 */
export function bouquetLift(shape: ShapeId, stand: StandId, d: Dims) {
  if (isContainer(shape)) return containerTop(shape) + 0.015 - d.rimY
  return standLift(stand)
}
