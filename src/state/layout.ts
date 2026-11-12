import * as THREE from 'three'
import { FLOWERS, type FlowerType } from '../data/flowers'
import type { Stem } from './types'

/**
 * Hand-tied "spiral" bouquet layout.
 *
 * All stems cross at one binding point (where the ribbon sits). Heads sit on a
 * phyllotaxis (golden-angle) spiral of 40 slots: slot 0 is the centre, higher
 * slots spiral outward. Heads are tallest in the centre and drop toward the
 * edge, so each stem naturally leans outward from the binding point.
 */

export const MAX_STEMS = 40
export const BIND = new THREE.Vector3(0, 0.17, 0)
export const BELOW_BIND = 0.12 // stem length below the binding point
export const R_MAX = 0.26
export const H_TOP = 0.6
export const H_DROP = 0.1
/** flower heads are modelled at true size; scale up a touch so they read well on screen */
export const HEAD_SCALE = 1.85
export const DROP_PLANE_Y = 0.55
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const UP = new THREE.Vector3(0, 1, 0)

export function slotPolar(slot: number) {
  const rn = Math.sqrt((slot + 0.5) / MAX_STEMS)
  return { r: rn * R_MAX, a: slot * GOLDEN }
}

export interface StemTarget {
  dir: THREE.Vector3
  length: number
  head: THREE.Vector3
  quat: THREE.Quaternion
  r: number
  a: number
}

export function headHeight(type: FlowerType, r: number, dh = 0) {
  const rn = Math.min(r / R_MAX, 1.2)
  return H_TOP - H_DROP * rn * rn + FLOWERS[type].heightBias + dh
}

export function stemTarget(
  stem: Pick<Stem, 'type' | 'slot' | 'dr' | 'da' | 'dh' | 'lean'>,
  override?: { r: number; a: number } | null,
  out?: StemTarget,
): StemTarget {
  const sp = slotPolar(stem.slot)
  const r = THREE.MathUtils.clamp(override ? override.r : sp.r + stem.dr, 0, R_MAX * 1.25)
  const a = override ? override.a : sp.a + stem.da
  const h = headHeight(stem.type, r, stem.dh)
  const res = out ?? { dir: new THREE.Vector3(), length: 0, head: new THREE.Vector3(), quat: new THREE.Quaternion(), r: 0, a: 0 }
  res.head.set(r * Math.cos(a), h, r * Math.sin(a))
  res.dir.copy(res.head).sub(BIND)
  res.length = res.dir.length()
  res.dir.normalize()
  if (stem.lean) {
    // positive lean tilts the stem further outward around the tangent axis
    const axis = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a))
    res.dir.applyAxisAngle(axis, stem.lean)
    res.head.copy(BIND).addScaledVector(res.dir, res.length)
  }
  res.quat.setFromUnitVectors(UP, res.dir)
  res.r = r
  res.a = a
  return res
}

export function nearestFreeSlot(x: number, z: number, occupied: Set<number>): number | null {
  let best: number | null = null
  let bestD = Infinity
  for (let i = 0; i < MAX_STEMS; i++) {
    if (occupied.has(i)) continue
    const { r, a } = slotPolar(i)
    const d = (r * Math.cos(a) - x) ** 2 + (r * Math.sin(a) - z) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Where a newly added stem goes when it is clicked (not dropped). */
export function autoSlot(type: FlowerType, occupied: Set<number>): number | null {
  const filler = FLOWERS[type].category === 'filler'
  const minSlot = filler ? 12 : 0
  for (let i = minSlot; i < MAX_STEMS; i++) if (!occupied.has(i)) return i
  for (let i = 0; i < MAX_STEMS; i++) if (!occupied.has(i)) return i
  return null
}
