import * as THREE from 'three'
import { FLOWERS, mulberry32, type FlowerType, type StemColors } from '../data/flowers'
import { SIZES, styleById, type GiftDesign, type MixEntry } from './styles'

/**
 * Florist-style layout: flower heads packed on a spherical cap ("dome"), all
 * facing outward, the way Thai/Korean florists build a round hand-tied bouquet.
 */

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
  /** dome sphere radius */
  S: number
  /** rim (edge of the dome) */
  rimY: number
  rimR: number
  /** top of the dome */
  topY: number
  /** where stems are bound / ribbon sits */
  bindY: number
}

export const BIND_Y = 0.2
const RIM_Y = 0.5
const CAP = 56 * (Math.PI / 180)
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const UP = new THREE.Vector3(0, 1, 0)
/** heads are modelled at true size; scaled up to read like a florist bouquet */
export const GIFT_HEAD_SCALE = 1.7

export function dimsFor(design: Pick<GiftDesign, 'style' | 'size'>): Dims {
  const style = styleById(design.style)
  const n = Math.round((SIZES.find((s) => s.id === design.size)?.heads ?? 20) * (style.density ?? 1))
  const a = Math.PI * style.headR * style.headR * 0.86
  const S = Math.sqrt((n * a) / (2 * Math.PI * (1 - Math.cos(CAP))))
  const rimR = S * Math.sin(CAP)
  const topY = RIM_Y + S * (1 - Math.cos(CAP))
  return { S, rimY: RIM_Y, rimR, topY, bindY: BIND_Y }
}

/** Heart test in the top view; the point of the heart faces the viewer (+z). */
function inHeart(x: number, z: number) {
  const X = x * 1.15
  const Y = -z * 1.12 + 0.24
  const q = X * X + Y * Y - 1
  return q * q * q - X * X * Y * Y * Y <= 0
}

function pickWeighted(mix: MixEntry[], rnd: () => number) {
  const total = mix.reduce((s, m) => s + m.weight, 0)
  let r = rnd() * total
  for (const m of mix) if ((r -= m.weight) <= 0) return m
  return mix[mix.length - 1]
}

function headFrom(entry: MixEntry, pos: THREE.Vector3, dir: THREE.Vector3, rnd: () => number, base = 1): Head {
  return {
    type: entry.type,
    colors: { ...FLOWERS[entry.type].colors, ...entry.colors },
    open: entry.open ?? 1,
    pos,
    dir,
    spin: rnd() * Math.PI * 2,
    scale: GIFT_HEAD_SCALE * base * (entry.scale ?? 1) * (0.94 + rnd() * 0.12),
    variant: Math.floor(rnd() * 5),
  }
}

export function buildHeads(design: Pick<GiftDesign, 'style' | 'size'>): { heads: Head[]; dims: Dims } {
  const style = styleById(design.style)
  const n = Math.round((SIZES.find((s) => s.id === design.size)?.heads ?? 20) * (style.density ?? 1))
  const dims = dimsFor(design)
  const rnd = mulberry32(design.style.length * 7919 + n * 31)
  const cy = dims.rimY - dims.S * Math.cos(CAP)
  const heads: Head[] = []
  const jitter = style.layout === 'garden' ? 0.14 : 0.07

  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const cz = 1 - (1 - Math.cos(CAP)) * t
    const sz = Math.sqrt(1 - cz * cz)
    const th = i * GOLDEN
    const dir = new THREE.Vector3(sz * Math.cos(th), cz, sz * Math.sin(th))
    const pos = dir.clone().multiplyScalar(dims.S).add(new THREE.Vector3(0, cy, 0))
    pos.y += (rnd() - 0.5) * 0.012
    // a little natural irregularity in where each head points
    const tilted = dir.clone().add(new THREE.Vector3((rnd() - 0.5) * jitter, 0, (rnd() - 0.5) * jitter)).normalize()

    let entry: MixEntry
    if (style.layout === 'ring' && style.edge && t > 1 - (style.edge.frac ?? 0.3)) entry = style.edge
    else if (style.layout === 'heart' && style.edge) entry = inHeart(pos.x / dims.rimR, pos.z / dims.rimR) ? style.mix[0] : style.edge
    else entry = pickWeighted(style.mix, rnd)
    heads.push(headFrom(entry, pos, tilted, rnd, style.headScale ?? 1))
  }

  // greenery / accents peeking out around the rim
  for (const acc of style.accents ?? []) {
    const count = Math.max(2, Math.round(acc.count * Math.sqrt(n / 20)))
    for (let k = 0; k < count; k++) {
      const th = (k / count) * Math.PI * 2 + rnd() * 0.5
      const polar = CAP * (0.82 + rnd() * 0.2)
      const dir = new THREE.Vector3(Math.sin(polar) * Math.cos(th), Math.cos(polar), Math.sin(polar) * Math.sin(th))
      const pos = dir.clone().multiplyScalar(dims.S + 0.03).add(new THREE.Vector3(0, cy, 0))
      heads.push(headFrom({ type: acc.type, weight: 1, colors: acc.colors, scale: 1.05 }, pos, dir, rnd))
    }
  }
  return { heads, dims }
}

export const quatFromDir = (dir: THREE.Vector3, spin: number) =>
  new THREE.Quaternion().setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin))
