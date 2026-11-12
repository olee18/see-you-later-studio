import * as THREE from 'three'

/**
 * Procedural, cached base geometries. Every petal/leaf is a unit-sized shape
 * (length 1 along +Y, concave side facing +Z) that is scaled per instance, so
 * one geometry is shared by hundreds of instanced petals.
 *
 * Each geometry carries an `aT` attribute (0 at base → 1 at tip) used by the
 * petal shader for gradients / two-tone petals.
 */

export type PetalShape = 'round' | 'oval' | 'pointed' | 'strap' | 'leaf' | 'heart'

// [widest point along length, base exponent, tip exponent]
const SHAPES: Record<PetalShape, [number, number, number]> = {
  round: [0.62, 1.6, 2.4],
  oval: [0.5, 2, 2],
  pointed: [0.36, 2, 1.1],
  strap: [0.45, 5, 3],
  leaf: [0.42, 2, 1.25],
  heart: [0.55, 1.5, 1.8],
}

function widthAt(shape: PetalShape, v: number) {
  const [c, pb, pt] = SHAPES[shape]
  const w =
    v < c
      ? Math.pow(Math.max(0, 1 - Math.pow((c - v) / c, pb)), 1 / pb)
      : Math.pow(Math.max(0, 1 - Math.pow((v - c) / (1 - c), pt)), 1 / pt)
  return Math.max(w, 0.04)
}

const cache = new Map<string, THREE.BufferGeometry>()

const r2 = (n: number) => Math.round(n * 100) / 100

export function petalGeo(shape: PetalShape, cup = 0.5, curl = 0, ruffle = 0): THREE.BufferGeometry {
  const key = `petal:${shape}:${r2(cup)}:${r2(curl)}:${r2(ruffle)}`
  const hit = cache.get(key)
  if (hit) return hit
  const segX = ruffle > 0 ? 8 : 5
  const segY = 8
  const g = new THREE.PlaneGeometry(1, 1, segX, segY)
  const pos = g.attributes.position as THREE.BufferAttribute
  const t = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) // -0.5..0.5
    const v = pos.getY(i) + 0.5 // 0..1
    const w = widthAt(shape, v)
    const x = u * w
    let z = cup * Math.pow(2 * u, 2) * w * 0.5 + curl * v * v
    if (ruffle) z += ruffle * 0.07 * Math.sin(u * w * 22 + v * 9) * Math.pow(v, 1.5)
    pos.setXYZ(i, x, v, z)
    t[i] = v
  }
  g.setAttribute('aT', new THREE.BufferAttribute(t, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  cache.set(key, g)
  return g
}

function withT(g: THREE.BufferGeometry, fn: (y: number) => number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const t = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) t[i] = fn(pos.getY(i))
  g.setAttribute('aT', new THREE.BufferAttribute(t, 1))
  return g
}

/** Unit sphere (radius 1). */
export function sphereGeo(detail: 'lo' | 'hi' = 'hi') {
  const key = `sphere:${detail}`
  let g = cache.get(key)
  if (!g) {
    g = detail === 'hi' ? new THREE.SphereGeometry(1, 16, 12) : new THREE.IcosahedronGeometry(1, 0)
    withT(g, (y) => (y + 1) / 2)
    cache.set(key, g)
  }
  return g
}

/** Unit cylinder from y=0 to y=1, radius 1. */
export function cylGeo() {
  let g = cache.get('cyl')
  if (!g) {
    g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
    g.translate(0, 0.5, 0)
    withT(g, (y) => y)
    cache.set('cyl', g)
  }
  return g
}

/** Main flower stem: slightly tapered, y=0..1 (scaled to length per stem). */
export function mainStemGeo() {
  let g = cache.get('mainStem')
  if (!g) {
    g = new THREE.CylinderGeometry(0.0042, 0.0058, 1, 10, 1, false)
    g.translate(0, 0.5, 0)
    withT(g, (y) => y)
    cache.set('mainStem', g)
  }
  return g
}
