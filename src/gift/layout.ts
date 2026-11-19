import * as THREE from 'three'
import { FLOWERS, mulberry32, type FlowerType, type StemColors } from '../data/flowers'

/**
 * Florist-style dome with STABLE slots: slot k always sits at the same spot on
 * the dome (golden-angle spiral from the centre outward). Adding a flower fills
 * the next rim slot, so the bouquet grows outward and nothing else moves.
 */

export interface Item {
  type: FlowerType
  colors: StemColors
  seed: number
}

export interface Head {
  type: FlowerType
  colors: StemColors
  open: number
  pos: THREE.Vector3
  dir: THREE.Vector3
  spin: number
  scale: number
  variant: number
}

export interface Dims {
  /** "visual size" used to scale paper flare and bow */
  S: number
  rimY: number
  rimR: number
  topY: number
  bindY: number
  /** dome sphere centre height, radius and cap half-angle */
  cy: number
  R: number
  cap: number
}

export const MAX_ITEMS = 80
export const BIND_Y = 0.2
const R = 0.34 // dome sphere radius
const HEAD_R = 0.052
const AREA = Math.PI * HEAD_R * HEAD_R * 0.86
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const UP = new THREE.Vector3(0, 1, 0)
export const GIFT_HEAD_SCALE = 1.55

/** how big each flower looks relative to a rose (so mixed bouquets stay balanced) */
const TYPE_SCALE: Partial<Record<FlowerType, number>> = {
  peony: 0.85, hydrangea: 0.82, sunflower: 0.78, lily: 0.78, orchid: 0.85, gerbera: 0.9, babysBreath: 1.12,
  eucalyptus: 1.0, lavender: 1.05, jasmine: 1.05, tulip: 1.05, carnation: 1.1, daisy: 1.05,
}

/** rose heads read a little more cupped, like florist roses */
const TYPE_OPEN: Partial<Record<FlowerType, number>> = { rose: 0.72, peony: 0.82, ranunculus: 0.85, tulip: 0.8 }

const capAngle = (n: number) => Math.acos(Math.max(-0.2, 1 - (Math.max(n, 6) * AREA) / (2 * Math.PI * R * R)))

/** dome centre rises a little as the bouquet grows, so big bouquets stand taller */
const centerY = (n: number) => 0.27 + 0.16 * (1 - Math.cos(capAngle(n)))

export function slotDir(k: number) {
  const z = Math.max(-0.2, 1 - ((k + 0.5) * AREA) / (2 * Math.PI * R * R))
  const s = Math.sqrt(1 - z * z)
  const th = k * GOLDEN
  return new THREE.Vector3(s * Math.cos(th), z, s * Math.sin(th))
}

/** Slot position in bouquet-local space for a bouquet of n flowers. */
export function slotPos(k: number, n: number) {
  return slotDir(k).multiplyScalar(R).add(new THREE.Vector3(0, centerY(n), 0))
}

export function dimsFor(n: number): Dims {
  const a = capAngle(n)
  const cy = centerY(n)
  const rimR = R * Math.sin(a)
  return { S: rimR / 0.83, rimY: cy + R * Math.cos(a), rimR, topY: cy + R, bindY: BIND_Y, cy, R, cap: a }
}

export function buildHeads(items: Item[]): { heads: Head[]; dims: Dims } {
  const n = items.length
  const heads = items.map((it, k) => {
    const rnd = mulberry32(it.seed)
    const dir = slotDir(k)
      .add(new THREE.Vector3((rnd() - 0.5) * 0.1, 0, (rnd() - 0.5) * 0.1))
      .normalize()
    const pos = slotPos(k, n)
    pos.y += (rnd() - 0.5) * 0.01
    return {
      type: it.type,
      colors: it.colors,
      open: TYPE_OPEN[it.type] ?? 1,
      pos,
      dir,
      spin: rnd() * Math.PI * 2,
      scale: GIFT_HEAD_SCALE * (TYPE_SCALE[it.type] ?? 1) * (0.94 + rnd() * 0.12),
      variant: Math.floor(rnd() * 5),
    }
  })
  return { heads, dims: dimsFor(n) }
}

export const headRadius = (h: Head) => FLOWERS[h.type].headRadius * h.scale

export const quatFromDir = (dir: THREE.Vector3, spin = 0) =>
  new THREE.Quaternion().setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin))
