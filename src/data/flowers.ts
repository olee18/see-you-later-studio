import * as THREE from 'three'
import { cylGeo, petalGeo, sphereGeo } from '../three/geometry'

/**
 * Procedural flower library. Each builder returns a list of "parts": one shared
 * geometry + many instance matrices (→ one InstancedMesh per part), expressed
 * in the flower-head frame (head base at origin, stem axis = +Y).
 */

export type FlowerType =
  | 'rose' | 'tulip' | 'peony' | 'sunflower' | 'hydrangea' | 'lily' | 'carnation'
  | 'orchid' | 'gerbera' | 'babysBreath' | 'eucalyptus' | 'fern' | 'ruscus'
  | 'daisy' | 'chrysanthemum' | 'ranunculus' | 'lisianthus' | 'calla' | 'lavender' | 'jasmine'

export type Role = 'petal' | 'center' | 'leaf' | 'stem' | 'accent'
export type BloomStage = 'bud' | 'half' | 'full'

export interface StemColors {
  petal: string
  petal2: string
  gradient: number // 0..1, how strongly petal2 blends in toward the tip
  center: string
}

export interface Part {
  geo: THREE.BufferGeometry
  role: Role
  matrices: THREE.Matrix4[]
  accent?: string
  /** rendered in the stem frame (not affected by head nod/turn) */
  onStem?: boolean
}

export interface FlowerDef {
  type: FlowerType
  name: string
  latin: string
  category: 'flower' | 'filler'
  colors: StemColors
  headRadius: number
  heightBias: number
  /** 0 = wants the bouquet centre, 1 = wants the edge (used by auto-arrange) */
  centerBias: number
  glyph: { petals: number; kind: 'round' | 'narrow' | 'cluster' | 'spray' | 'leafy' | 'frond' | 'cup' | 'spike' }
  build: (open: number, rnd: Rnd) => Part[]
}

type Rnd = () => number
type V3 = THREE.Vector3
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const DEG = Math.PI / 180
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const UP = V(0, 1, 0)
const lerp = THREE.MathUtils.lerp

export const BLOOM_OPEN: Record<BloomStage, number> = { bud: 0.12, half: 0.55, full: 1 }

export function mulberry32(seed: number): Rnd {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- matrix helpers

/**
 * A petal at azimuth `theta`, tilted `phi` from vertical (0 = closed upright,
 * 90° = flat open), with its concave face toward the flower axis.
 */
export function petalM(theta: number, phi: number, radius: number, y: number, len: number, width: number, roll = 0, depth = width) {
  const ox = Math.cos(theta), oz = Math.sin(theta)
  const sp = Math.sin(phi), cp = Math.cos(phi)
  const Y = V(ox * sp, cp, oz * sp)
  const Z = V(-ox * cp, sp, -oz * cp)
  if (roll) Z.applyAxisAngle(Y, roll)
  const X = V().crossVectors(Y, Z)
  const m = new THREE.Matrix4().makeBasis(X, Y, Z)
  m.scale(V(width, len, depth))
  m.setPosition(ox * radius, y, oz * radius)
  return m
}

function segM(a: V3, b: V3, r: number) {
  const d = b.clone().sub(a)
  const len = d.length()
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())
  return new THREE.Matrix4().compose(a, q, V(r, len, r))
}

function blobM(p: V3, sx: number, sy = sx, sz = sx, q = new THREE.Quaternion()) {
  return new THREE.Matrix4().compose(p, q, V(sx, sy, sz))
}

function frameM(p: V3, normal: V3, scale = 1, twist = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, normal.clone().normalize())
  if (twist) q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, twist))
  return new THREE.Matrix4().compose(p, q, V(scale, scale, scale))
}

interface RingOpts {
  n: number
  spiral?: boolean
  start?: number
  len: [number, number]
  width: [number, number] // ratio to length
  phiClosed: [number, number] // degrees
  phiOpen: [number, number]
  radius: [number, number]
  y?: [number, number]
  jitter?: number
}

function ring(open: number, rnd: Rnd, o: RingOpts) {
  const out: THREE.Matrix4[] = []
  for (let i = 0; i < o.n; i++) {
    const t = o.n > 1 ? i / (o.n - 1) : 0
    const j = o.jitter ?? 0.15
    const theta = (o.spiral ? i * GOLDEN : (o.start ?? 0) + (i * Math.PI * 2) / o.n) + (rnd() - 0.5) * j
    const phi = lerp(lerp(o.phiClosed[0], o.phiClosed[1], t), lerp(o.phiOpen[0], o.phiOpen[1], t), open) * DEG
    const len = lerp(o.len[0], o.len[1], t) * (0.78 + 0.22 * open) * (0.94 + rnd() * 0.12)
    const w = len * lerp(o.width[0], o.width[1], t)
    const radius = lerp(o.radius[0], o.radius[1], t) * (0.45 + 0.55 * open)
    const y = o.y ? lerp(o.y[0], o.y[1], t) : 0
    out.push(petalM(theta, phi + (rnd() - 0.5) * 6 * DEG, radius, y, len, w, (rnd() - 0.5) * 0.25))
  }
  return out
}

/** A couple of leaves on the stem, a little below the head. */
function stemLeaves(rnd: Rnd, count: number, len: number, wRatio: number, y0 = -0.11): Part {
  const matrices: THREE.Matrix4[] = []
  let theta = rnd() * Math.PI * 2
  for (let i = 0; i < count; i++) {
    theta += Math.PI * (0.8 + rnd() * 0.4)
    const l = len * (0.85 + rnd() * 0.3)
    matrices.push(petalM(theta, (52 + rnd() * 14) * DEG, 0.004, y0 - i * 0.055, l, l * wRatio, (rnd() - 0.5) * 0.3))
  }
  return { geo: petalGeo('leaf', 0.35, -0.14), role: 'leaf', matrices, onStem: true }
}

// ---------------------------------------------------------------- builders

const rose: FlowerDef['build'] = (open, rnd) => {
  const n = 22
  const inner: THREE.Matrix4[] = []
  const outer: THREE.Matrix4[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const theta = i * GOLDEN + (rnd() - 0.5) * 0.3
    const len = (0.02 + 0.024 * t) * (0.75 + 0.25 * open)
    const w = len * (1.05 + 0.12 * t)
    const phi = lerp(6 + 22 * t, 10 + 82 * Math.pow(t, 1.3), open) * DEG
    const radius = (0.0015 + 0.007 * t) * (0.5 + 0.5 * open)
    const m = petalM(theta, phi, radius, 0.006 * (1 - t), len, w, (rnd() - 0.5) * 0.2)
    ;(t < 0.45 ? inner : outer).push(m)
  }
  const sepals = Array.from({ length: 5 }, (_, i) => petalM((i * 72 + rnd() * 10) * DEG, 118 * DEG, 0.005, -0.003, 0.022, 0.006))
  return [
    { geo: petalGeo('round', 0.95, 0.05), role: 'petal', matrices: inner },
    { geo: petalGeo('round', 0.6, -0.16), role: 'petal', matrices: outer },
    { geo: petalGeo('leaf', 0.2, -0.1), role: 'leaf', matrices: sepals },
    { geo: sphereGeo(), role: 'leaf', matrices: [blobM(V(0, -0.004, 0), 0.008, 0.01, 0.008)] },
    stemLeaves(rnd, 2, 0.05, 0.55),
  ]
}

const tulip: FlowerDef['build'] = (open, rnd) => {
  const base = { len: [0.056, 0.056] as [number, number], width: [0.58, 0.58] as [number, number], radius: [0.005, 0.005] as [number, number] }
  const outerRing = ring(open, rnd, { ...base, n: 3, start: 0, phiClosed: [5, 5], phiOpen: [42, 42] })
  const innerRing = ring(open, rnd, { ...base, n: 3, start: Math.PI / 3, phiClosed: [3, 3], phiOpen: [32, 32], radius: [0.003, 0.003] })
  const stamens = Array.from({ length: 6 }, (_, i) => segM(V(0, 0.004, 0), V(Math.cos(i) * 0.006, 0.026, Math.sin(i) * 0.006), 0.0012))
  return [
    { geo: petalGeo('oval', 1.3, 0.08), role: 'petal', matrices: [...outerRing, ...innerRing] },
    { geo: cylGeo(), role: 'center', matrices: stamens },
    { geo: petalGeo('strap', 0.5, -0.06), role: 'leaf', onStem: true, matrices: [petalM(rnd() * 6, 22 * DEG, 0.004, -0.2, 0.14, 0.026), petalM(rnd() * 6 + 3, 30 * DEG, 0.004, -0.26, 0.12, 0.024)] },
  ]
}

const peony: FlowerDef['build'] = (open, rnd) => {
  const innerM = ring(open, rnd, { n: 20, spiral: true, len: [0.018, 0.028], width: [1.0, 1.15], phiClosed: [6, 22], phiOpen: [14, 50], radius: [0.002, 0.009], y: [0.008, 0.004] })
  const midM = ring(open, rnd, { n: 16, spiral: true, len: [0.034, 0.042], width: [1.1, 1.2], phiClosed: [18, 28], phiOpen: [45, 78], radius: [0.009, 0.014] })
  const guardM = ring(open, rnd, { n: 8, len: [0.052, 0.056], width: [1.15, 1.15], phiClosed: [26, 26], phiOpen: [92, 92], radius: [0.015, 0.015], start: rnd() * 6 })
  return [
    { geo: petalGeo('round', 0.95, 0.06, 0.6), role: 'petal', matrices: innerM },
    { geo: petalGeo('round', 0.7, -0.02, 0.5), role: 'petal', matrices: midM },
    { geo: petalGeo('round', 0.55, -0.1, 0.35), role: 'petal', matrices: guardM },
    { geo: sphereGeo('lo'), role: 'center', matrices: [blobM(V(0, 0.004, 0), 0.007)] },
    stemLeaves(rnd, 2, 0.06, 0.45),
  ]
}

const sunflower: FlowerDef['build'] = (open, rnd) => {
  const r1 = ring(open, rnd, { n: 21, len: [0.052, 0.052], width: [0.34, 0.34], phiClosed: [22, 22], phiOpen: [84, 84], radius: [0.036, 0.036], jitter: 0.08 })
  const r2 = ring(open, rnd, { n: 21, start: Math.PI / 21, len: [0.046, 0.046], width: [0.34, 0.34], phiClosed: [16, 16], phiOpen: [76, 76], radius: [0.034, 0.034], y: [0.002, 0.002], jitter: 0.08 })
  const seeds: THREE.Matrix4[] = []
  const N = 110
  const discR = 0.036 * (0.7 + 0.3 * open)
  for (let i = 0; i < N; i++) {
    const rr = Math.sqrt((i + 0.5) / N) * discR * 0.95
    const a = i * GOLDEN
    seeds.push(blobM(V(Math.cos(a) * rr, 0.009 - (rr / discR) * 0.004, Math.sin(a) * rr), 0.0028))
  }
  return [
    { geo: petalGeo('pointed', 0.35, -0.05), role: 'petal', matrices: [...r1, ...r2] },
    { geo: sphereGeo(), role: 'center', matrices: [blobM(V(0, 0.002, 0), discR, 0.01, discR)] },
    { geo: sphereGeo('lo'), role: 'center', matrices: seeds },
    { geo: petalGeo('leaf', 0.2, -0.05), role: 'leaf', matrices: ring(open, rnd, { n: 12, len: [0.03, 0.03], width: [0.45, 0.45], phiClosed: [95, 95], phiOpen: [100, 100], radius: [0.03, 0.03], y: [-0.004, -0.004] }) },
    stemLeaves(rnd, 2, 0.075, 0.7),
  ]
}

const hydrangea: FlowerDef['build'] = (open, rnd) => {
  const N = 64
  const petals: THREE.Matrix4[] = []
  const dots: THREE.Matrix4[] = []
  const dome = 0.046 * (0.6 + 0.4 * open)
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 0.8
    const rr = Math.sqrt(1 - y * y)
    const a = i * GOLDEN
    const n = V(rr * Math.cos(a), y, rr * Math.sin(a))
    const p = n.clone().multiplyScalar(dome).add(V(0, 0.012, 0))
    const F = frameM(p, n, 0.85 + rnd() * 0.3, rnd() * 6)
    const phi = lerp(35, 82, open) * DEG
    for (let k = 0; k < 4; k++) petals.push(F.clone().multiply(petalM((k * Math.PI) / 2, phi, 0.0012, 0, 0.0145, 0.0145)))
    dots.push(F.clone().multiply(blobM(V(0, 0.002, 0), 0.0022)))
  }
  return [
    { geo: petalGeo('heart', 0.25, 0.02), role: 'petal', matrices: petals },
    { geo: sphereGeo('lo'), role: 'center', matrices: dots },
    stemLeaves(rnd, 2, 0.08, 0.6, -0.08),
  ]
}

const lily: FlowerDef['build'] = (open, rnd) => {
  const curl = lerp(0.05, -0.4, open)
  const outer = ring(open, rnd, { n: 3, start: 0, len: [0.078, 0.078], width: [0.3, 0.3], phiClosed: [7, 7], phiOpen: [64, 64], radius: [0.004, 0.004] })
  const inner = ring(open, rnd, { n: 3, start: Math.PI / 3, len: [0.074, 0.074], width: [0.4, 0.4], phiClosed: [5, 5], phiOpen: [58, 58], radius: [0.003, 0.003] })
  const filaments: THREE.Matrix4[] = []
  const anthers: THREE.Matrix4[] = []
  const reach = 0.03 + 0.03 * open
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    const tip = V(Math.cos(a) * reach * 0.42, reach, Math.sin(a) * reach * 0.42)
    filaments.push(segM(V(0, 0.004, 0), tip, 0.0011))
    anthers.push(blobM(tip, 0.0022, 0.0022, 0.0065, new THREE.Quaternion().setFromAxisAngle(UP, -a)))
  }
  filaments.push(segM(V(0, 0.004, 0), V(0.003, reach * 1.05, 0), 0.0016))
  return [
    { geo: petalGeo('pointed', 0.45, Math.round(curl * 20) / 20), role: 'petal', matrices: [...outer, ...inner] },
    { geo: cylGeo(), role: 'accent', accent: '#d8e3b0', matrices: filaments },
    { geo: sphereGeo('lo'), role: 'center', matrices: anthers },
    stemLeaves(rnd, 3, 0.07, 0.25, -0.09),
  ]
}

const carnation: FlowerDef['build'] = (open, rnd) => {
  const petals = ring(open, rnd, { n: 38, spiral: true, len: [0.016, 0.026], width: [1.0, 1.15], phiClosed: [6, 26], phiOpen: [22, 88], radius: [0.002, 0.008], y: [0.026, 0.022] })
  return [
    { geo: petalGeo('heart', 0.5, -0.04, 1.2), role: 'petal', matrices: petals },
    { geo: cylGeo(), role: 'leaf', matrices: [new THREE.Matrix4().compose(V(0, -0.002, 0), new THREE.Quaternion(), V(0.0085, 0.026, 0.0085))] },
    { geo: petalGeo('leaf', 0.2, 0.02), role: 'leaf', matrices: ring(1, rnd, { n: 5, len: [0.016, 0.016], width: [0.4, 0.4], phiClosed: [8, 8], phiOpen: [8, 8], radius: [0.008, 0.008], y: [0.008, 0.008] }) },
    stemLeaves(rnd, 2, 0.06, 0.12, -0.08),
  ]
}

const orchid: FlowerDef['build'] = (open, rnd) => {
  const blooms = [
    { p: V(0, 0.004, 0), s: 1 },
    { p: V(0.042, -0.026, 0.008), s: 0.92 },
    { p: V(0.078, -0.07, 0.014), s: 0.78 },
  ]
  const sepals: THREE.Matrix4[] = []
  const wide: THREE.Matrix4[] = []
  const lips: THREE.Matrix4[] = []
  const columns: THREE.Matrix4[] = []
  const pedicels: THREE.Matrix4[] = []
  const phi = lerp(38, 88, open) * DEG
  blooms.forEach((b, k) => {
    const bo = k === 2 ? open * 0.6 : open
    const F = frameM(b.p, V(0.25, 0.35, 1), b.s * (0.7 + 0.3 * bo), rnd() * 0.3)
    for (const a of [90, 210, 330]) sepals.push(F.clone().multiply(petalM(a * DEG, phi, 0.002, 0, 0.036, 0.016)))
    for (const a of [25, 155]) wide.push(F.clone().multiply(petalM(a * DEG, phi, 0.002, 0, 0.034, 0.038)))
    lips.push(F.clone().multiply(petalM(270 * DEG, phi * 0.7, 0.003, 0.002, 0.022, 0.017)))
    columns.push(F.clone().multiply(blobM(V(0, 0.005, 0.001), 0.0035, 0.006, 0.0035)))
    if (k > 0) pedicels.push(segM(blooms[k - 1].p, b.p, 0.0016))
  })
  return [
    { geo: petalGeo('oval', 0.15, -0.02), role: 'petal', matrices: sepals },
    { geo: petalGeo('round', 0.12, -0.03), role: 'petal', matrices: wide },
    { geo: petalGeo('heart', 1.1, 0.12), role: 'center', matrices: lips },
    { geo: sphereGeo('lo'), role: 'accent', accent: '#f6efd8', matrices: columns },
    { geo: cylGeo(), role: 'stem', matrices: pedicels },
  ]
}

const gerbera: FlowerDef['build'] = (open, rnd) => {
  const r1 = ring(open, rnd, { n: 24, len: [0.046, 0.046], width: [0.24, 0.24], phiClosed: [28, 28], phiOpen: [88, 88], radius: [0.017, 0.017], jitter: 0.06 })
  const r2 = ring(open, rnd, { n: 24, start: Math.PI / 24, len: [0.04, 0.04], width: [0.22, 0.22], phiClosed: [20, 20], phiOpen: [80, 80], radius: [0.015, 0.015], y: [0.002, 0.002], jitter: 0.06 })
  const r3 = ring(open, rnd, { n: 28, len: [0.013, 0.013], width: [0.25, 0.25], phiClosed: [20, 20], phiOpen: [55, 55], radius: [0.013, 0.013], y: [0.004, 0.004], jitter: 0.2 })
  return [
    { geo: petalGeo('strap', 0.25, -0.03), role: 'petal', matrices: [...r1, ...r2, ...r3] },
    { geo: sphereGeo(), role: 'center', matrices: [blobM(V(0, 0.004, 0), 0.016, 0.006, 0.016)] },
    stemLeaves(rnd, 1, 0.06, 0.5, -0.16),
  ]
}

const babysBreath: FlowerDef['build'] = (open, rnd) => {
  const branches: THREE.Matrix4[] = []
  const florets: THREE.Matrix4[] = []
  for (let b = 0; b < 9; b++) {
    const a = rnd() * Math.PI * 2
    const p = (8 + rnd() * 42) * DEG
    const start = V(0, -0.04 + rnd() * 0.04, 0)
    const len = 0.035 + rnd() * 0.04
    const end = start.clone().add(V(Math.cos(a) * Math.sin(p), Math.cos(p), Math.sin(a) * Math.sin(p)).multiplyScalar(len))
    branches.push(segM(start, end, 0.0011))
    const k = 11 + Math.floor(rnd() * 6)
    for (let i = 0; i < k; i++) {
      const tip = end.clone().add(V((rnd() - 0.5) * 0.032, rnd() * 0.02, (rnd() - 0.5) * 0.032))
      branches.push(segM(end, tip, 0.0005))
      florets.push(blobM(tip, (0.0028 + rnd() * 0.0016) * (0.55 + 0.45 * open)))
    }
  }
  return [
    { geo: cylGeo(), role: 'stem', matrices: branches },
    { geo: sphereGeo('lo'), role: 'petal', matrices: florets },
  ]
}

const eucalyptus: FlowerDef['build'] = (open, rnd) => {
  const leaves: THREE.Matrix4[] = []
  const nodes = 11
  for (let i = 0; i < nodes; i++) {
    const t = i / (nodes - 1)
    const y = -0.27 + t * 0.31
    const len = lerp(0.036, 0.02, t) * (0.8 + 0.2 * open)
    const theta = i * (Math.PI / 2) + (rnd() - 0.5) * 0.3
    const phi = lerp(78, 52, t) * DEG
    leaves.push(petalM(theta, phi, 0.003, y, len, len * 0.95, (rnd() - 0.5) * 0.4))
    leaves.push(petalM(theta + Math.PI, phi, 0.003, y, len, len * 0.95, (rnd() - 0.5) * 0.4))
  }
  return [
    { geo: petalGeo('oval', 0.18, -0.06), role: 'petal', matrices: leaves },
    { geo: cylGeo(), role: 'stem', matrices: [segM(V(0, -0.01, 0), V(0.004, 0.05, 0), 0.0024)] },
  ]
}

const ruscus: FlowerDef['build'] = (open, rnd) => {
  const leaves: THREE.Matrix4[] = []
  const n = 14
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const len = lerp(0.042, 0.026, t) * (0.8 + 0.2 * open)
    leaves.push(petalM(i * Math.PI + (rnd() - 0.5) * 0.5, lerp(55, 35, t) * DEG, 0.003, -0.26 + t * 0.32, len, len * 0.4, (rnd() - 0.5) * 0.5))
  }
  return [
    { geo: petalGeo('leaf', 0.15, -0.08), role: 'petal', matrices: leaves },
    { geo: cylGeo(), role: 'stem', matrices: [segM(V(0, -0.01, 0), V(-0.004, 0.075, 0.002), 0.002)] },
  ]
}

const fern: FlowerDef['build'] = (open, rnd) => {
  const P = (s: number) => V(0.07 * s * s, -0.2 + 0.3 * s, 0.01 * Math.sin(s * 3))
  const segs: THREE.Matrix4[] = []
  const steps = 10
  for (let i = 0; i < steps; i++) segs.push(segM(P(i / steps), P((i + 1) / steps), lerp(0.0018, 0.0008, i / steps)))
  const pinnae: THREE.Matrix4[] = []
  for (let s = 0.08; s < 0.98; s += 0.042) {
    const T = P(s + 0.01).sub(P(s - 0.01)).normalize()
    const S = V(0, 0, 1)
    const N = V().crossVectors(T, S).normalize()
    const len = lerp(0.05, 0.012, s) * (0.7 + 0.3 * open)
    for (const side of [1, -1]) {
      const Y = S.clone().multiplyScalar(side).lerp(T, 0.35 + rnd() * 0.1).normalize()
      const Z = N.clone().multiplyScalar(-1).add(V(0, 0.3, 0)).normalize()
      const X = V().crossVectors(Y, Z).normalize()
      const Zo = V().crossVectors(X, Y)
      const m = new THREE.Matrix4().makeBasis(X, Y, Zo)
      m.scale(V(len * 0.26, len, len * 0.26))
      m.setPosition(P(s))
      pinnae.push(m)
    }
  }
  return [
    { geo: petalGeo('leaf', 0.3, -0.12), role: 'petal', matrices: pinnae },
    { geo: cylGeo(), role: 'stem', matrices: segs },
  ]
}

const daisy: FlowerDef['build'] = (open, rnd) => [
  { geo: petalGeo('strap', 0.15, -0.02), role: 'petal', matrices: ring(open, rnd, { n: 22, len: [0.03, 0.03], width: [0.22, 0.22], phiClosed: [20, 20], phiOpen: [86, 86], radius: [0.009, 0.009], jitter: 0.08 }) },
  { geo: sphereGeo(), role: 'center', matrices: [blobM(V(0, 0.003, 0), 0.01, 0.006, 0.01)] },
  stemLeaves(rnd, 2, 0.04, 0.3, -0.1),
]

const chrysanthemum: FlowerDef['build'] = (open, rnd) => [
  { geo: petalGeo('strap', 0.9, 0.06), role: 'petal', matrices: ring(open, rnd, { n: 72, spiral: true, len: [0.01, 0.03], width: [0.28, 0.24], phiClosed: [4, 30], phiOpen: [8, 84], radius: [0.001, 0.006], y: [0.012, 0.002] }) },
  stemLeaves(rnd, 2, 0.05, 0.55),
]

const ranunculus: FlowerDef['build'] = (open, rnd) => [
  { geo: petalGeo('round', 1.0, 0.04), role: 'petal', matrices: ring(open, rnd, { n: 48, spiral: true, len: [0.011, 0.026], width: [1.05, 1.15], phiClosed: [4, 32], phiOpen: [8, 76], radius: [0.001, 0.01], y: [0.01, 0.002] }) },
  { geo: sphereGeo('lo'), role: 'center', matrices: [blobM(V(0, 0.011, 0), 0.0032)] },
  { geo: petalGeo('leaf', 0.2, -0.1), role: 'leaf', matrices: Array.from({ length: 5 }, (_, i) => petalM((i * 72 + rnd() * 10) * DEG, 115 * DEG, 0.005, -0.002, 0.016, 0.006)) },
  stemLeaves(rnd, 2, 0.045, 0.4),
]

const lisianthus: FlowerDef['build'] = (open, rnd) => {
  const stamens = Array.from({ length: 5 }, (_, i) => segM(V(0, 0.003, 0), V(Math.cos(i * 1.26) * 0.005, 0.02, Math.sin(i * 1.26) * 0.005), 0.0009))
  return [
    { geo: petalGeo('round', 0.9, -0.04, 0.6), role: 'petal', matrices: ring(open, rnd, { n: 5, len: [0.042, 0.042], width: [1.05, 1.05], phiClosed: [6, 6], phiOpen: [52, 52], radius: [0.003, 0.003], jitter: 0.25 }) },
    { geo: cylGeo(), role: 'accent', accent: '#e9e3a4', matrices: stamens },
    { geo: sphereGeo('lo'), role: 'center', matrices: [blobM(V(0, 0.022, 0), 0.0025, 0.004, 0.0025)] },
    stemLeaves(rnd, 2, 0.045, 0.35),
  ]
}

const calla: FlowerDef['build'] = (open) => [
  { geo: petalGeo('heart', 2.2, -0.12), role: 'petal', matrices: [petalM(0, lerp(4, 16, open) * DEG, 0.002, 0, 0.078, 0.062)] },
  { geo: cylGeo(), role: 'center', matrices: [segM(V(-0.004, 0, 0), V(-0.006, 0.046, 0), 0.0035)] },
]

const lavender: FlowerDef['build'] = (open, rnd) => {
  const florets: THREE.Matrix4[] = []
  for (let i = 0; i < 16; i++) {
    const t = i / 15
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + i * 0.5 + rnd() * 0.3
      const r = 0.0036 * (1 - t * 0.5)
      florets.push(blobM(V(Math.cos(a) * r, i * 0.0062, Math.sin(a) * r), 0.0026 * (1 - t * 0.45) * (0.7 + 0.3 * open), 0.0034 * (1 - t * 0.45)))
    }
  }
  return [
    { geo: sphereGeo('lo'), role: 'petal', matrices: florets },
    { geo: cylGeo(), role: 'stem', matrices: [segM(V(0, -0.01, 0), V(0, 0.095, 0), 0.0012)] },
    stemLeaves(rnd, 2, 0.05, 0.12, -0.12),
  ]
}

const jasmine: FlowerDef['build'] = (open, rnd) => {
  const branches: THREE.Matrix4[] = []
  const petals: THREE.Matrix4[] = []
  const centers: THREE.Matrix4[] = []
  const leaves: THREE.Matrix4[] = []
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + rnd() * 0.6
    const p = (15 + rnd() * 40) * DEG
    const start = V(0, -0.05 + rnd() * 0.05, 0)
    const end = start.clone().add(V(Math.cos(a) * Math.sin(p), Math.cos(p), Math.sin(a) * Math.sin(p)).multiplyScalar(0.05 + rnd() * 0.04))
    branches.push(segM(start, end, 0.0011))
    leaves.push(petalM(a + 1.2, 60 * DEG, 0.002, start.y + 0.02, 0.03, 0.013))
    const k = 4 + Math.floor(rnd() * 3)
    for (let i = 0; i < k; i++) {
      const tip = end.clone().add(V((rnd() - 0.5) * 0.035, rnd() * 0.02, (rnd() - 0.5) * 0.035))
      branches.push(segM(end, tip, 0.0006))
      const n = tip.clone().sub(end).normalize().add(V(0, 0.8, 0))
      const F = frameM(tip, n, 0.85 + rnd() * 0.3, rnd() * 6)
      const bud = rnd() < 0.25
      for (let q = 0; q < 5; q++) petals.push(F.clone().multiply(petalM((q * 72 * DEG), lerp(15, bud ? 25 : 84, open) * DEG, 0.0008, 0, 0.0085, 0.0052)))
      centers.push(F.clone().multiply(blobM(V(0, 0.0005, 0), 0.0012)))
    }
  }
  return [
    { geo: cylGeo(), role: 'stem', matrices: branches },
    { geo: petalGeo('oval', 0.2, -0.04), role: 'petal', matrices: petals },
    { geo: sphereGeo('lo'), role: 'center', matrices: centers },
    { geo: petalGeo('leaf', 0.3, -0.08), role: 'leaf', matrices: leaves },
  ]
}

// ---------------------------------------------------------------- registry

export const FLOWERS: Record<FlowerType, FlowerDef> = {
  rose: { type: 'rose', name: 'Rose', latin: 'Rosa', category: 'flower', colors: { petal: '#d4677f', petal2: '#f3b3bf', gradient: 0.45, center: '#7a2e3d' }, headRadius: 0.045, heightBias: 0, centerBias: 0.35, glyph: { petals: 7, kind: 'round' }, build: rose },
  tulip: { type: 'tulip', name: 'Tulip', latin: 'Tulipa', category: 'flower', colors: { petal: '#ef7f63', petal2: '#ffd3b8', gradient: 0.5, center: '#3a2a2a' }, headRadius: 0.035, heightBias: 0.01, centerBias: 0.5, glyph: { petals: 3, kind: 'cup' }, build: tulip },
  peony: { type: 'peony', name: 'Peony', latin: 'Paeonia', category: 'flower', colors: { petal: '#f2b0bd', petal2: '#fde8ec', gradient: 0.6, center: '#f2d27a' }, headRadius: 0.065, heightBias: 0, centerBias: 0.2, glyph: { petals: 10, kind: 'round' }, build: peony },
  sunflower: { type: 'sunflower', name: 'Sunflower', latin: 'Helianthus', category: 'flower', colors: { petal: '#f2ae00', petal2: '#ffd54a', gradient: 0.45, center: '#4a2e17' }, headRadius: 0.085, heightBias: 0.04, centerBias: 0.15, glyph: { petals: 14, kind: 'narrow' }, build: sunflower },
  hydrangea: { type: 'hydrangea', name: 'Hydrangea', latin: 'Hydrangea', category: 'flower', colors: { petal: '#9fb3e0', petal2: '#d9c9f0', gradient: 0.6, center: '#eee9f7' }, headRadius: 0.062, heightBias: -0.02, centerBias: 0.25, glyph: { petals: 9, kind: 'cluster' }, build: hydrangea },
  lily: { type: 'lily', name: 'Lily', latin: 'Lilium', category: 'flower', colors: { petal: '#fbf5ee', petal2: '#f2b2c2', gradient: 0.4, center: '#a2482a' }, headRadius: 0.075, heightBias: 0.05, centerBias: 0.1, glyph: { petals: 6, kind: 'narrow' }, build: lily },
  carnation: { type: 'carnation', name: 'Carnation', latin: 'Dianthus', category: 'flower', colors: { petal: '#e86f8a', petal2: '#fbd2da', gradient: 0.45, center: '#6b8f5a' }, headRadius: 0.035, heightBias: -0.01, centerBias: 0.55, glyph: { petals: 9, kind: 'round' }, build: carnation },
  orchid: { type: 'orchid', name: 'Orchid', latin: 'Phalaenopsis', category: 'flower', colors: { petal: '#f6f0f7', petal2: '#e3b0da', gradient: 0.35, center: '#c43d6b' }, headRadius: 0.07, heightBias: 0.03, centerBias: 0.3, glyph: { petals: 5, kind: 'round' }, build: orchid },
  gerbera: { type: 'gerbera', name: 'Gerbera', latin: 'Gerbera', category: 'flower', colors: { petal: '#ff8a5c', petal2: '#ffc6a3', gradient: 0.4, center: '#3b2a1c' }, headRadius: 0.06, heightBias: 0.01, centerBias: 0.45, glyph: { petals: 16, kind: 'narrow' }, build: gerbera },
  daisy: { type: 'daisy', name: 'Daisy', latin: 'Bellis', category: 'flower', colors: { petal: '#fbfaf5', petal2: '#f6d6e0', gradient: 0.25, center: '#f2c230' }, headRadius: 0.045, heightBias: 0.01, centerBias: 0.6, glyph: { petals: 16, kind: 'narrow' }, build: daisy },
  chrysanthemum: { type: 'chrysanthemum', name: 'Chrysanthemum', latin: 'Chrysanthemum', category: 'flower', colors: { petal: '#f3e3b0', petal2: '#fff6dc', gradient: 0.5, center: '#c9b26a' }, headRadius: 0.05, heightBias: 0, centerBias: 0.4, glyph: { petals: 20, kind: 'narrow' }, build: chrysanthemum },
  ranunculus: { type: 'ranunculus', name: 'Ranunculus', latin: 'Ranunculus', category: 'flower', colors: { petal: '#f4a38c', petal2: '#fde1d4', gradient: 0.55, center: '#7d9a52' }, headRadius: 0.042, heightBias: -0.005, centerBias: 0.4, glyph: { petals: 10, kind: 'round' }, build: ranunculus },
  lisianthus: { type: 'lisianthus', name: 'Lisianthus', latin: 'Eustoma', category: 'flower', colors: { petal: '#fbf7fb', petal2: '#8e5aa8', gradient: 0.75, center: '#d9d48a' }, headRadius: 0.045, heightBias: 0.02, centerBias: 0.45, glyph: { petals: 5, kind: 'round' }, build: lisianthus },
  calla: { type: 'calla', name: 'Calla Lily', latin: 'Zantedeschia', category: 'flower', colors: { petal: '#fbf8f1', petal2: '#f2ead2', gradient: 0.3, center: '#f2c94c' }, headRadius: 0.04, heightBias: 0.04, centerBias: 0.35, glyph: { petals: 1, kind: 'cup' }, build: calla },
  babysBreath: { type: 'babysBreath', name: "Baby's Breath", latin: 'Gypsophila', category: 'filler', colors: { petal: '#fbfaf4', petal2: '#ffffff', gradient: 0.2, center: '#e8e4d0' }, headRadius: 0.06, heightBias: 0.03, centerBias: 0.8, glyph: { petals: 0, kind: 'spray' }, build: babysBreath },
  eucalyptus: { type: 'eucalyptus', name: 'Eucalyptus', latin: 'Eucalyptus', category: 'filler', colors: { petal: '#8aa597', petal2: '#bccdc2', gradient: 0.4, center: '#6f8a7c' }, headRadius: 0.05, heightBias: 0.05, centerBias: 0.75, glyph: { petals: 0, kind: 'leafy' }, build: eucalyptus },
  fern: { type: 'fern', name: 'Fern', latin: 'Rumohra', category: 'filler', colors: { petal: '#4c7a42', petal2: '#7fa66b', gradient: 0.5, center: '#3f6a35' }, headRadius: 0.06, heightBias: 0.03, centerBias: 0.9, glyph: { petals: 0, kind: 'frond' }, build: fern },
  ruscus: { type: 'ruscus', name: 'Ruscus', latin: 'Ruscus', category: 'filler', colors: { petal: '#5b8a48', petal2: '#93b673', gradient: 0.35, center: '#4a7038' }, headRadius: 0.045, heightBias: 0.05, centerBias: 0.7, glyph: { petals: 0, kind: 'leafy' }, build: ruscus },
  lavender: { type: 'lavender', name: 'Lavender', latin: 'Lavandula', category: 'filler', colors: { petal: '#8f7cc4', petal2: '#b9a9e0', gradient: 0.5, center: '#6f5aa8' }, headRadius: 0.03, heightBias: 0.07, centerBias: 0.85, glyph: { petals: 0, kind: 'spike' }, build: lavender },
  jasmine: { type: 'jasmine', name: 'Jasmine', latin: 'Jasminum', category: 'filler', colors: { petal: '#fffdf6', petal2: '#ffffff', gradient: 0.15, center: '#f1e7b8' }, headRadius: 0.05, heightBias: 0.03, centerBias: 0.8, glyph: { petals: 0, kind: 'spray' }, build: jasmine },
}

export const FLOWER_TYPES = Object.keys(FLOWERS) as FlowerType[]
