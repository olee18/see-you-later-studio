import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { standLift, type StandId } from '../gift/stands'
import { wood } from './textures'

/**
 * Bouquet stands. Coordinates are in the bouquet's root space: the table is at
 * y = -0.06 and the wrap starts at y = 0.09 (+ the stand's lift).
 */

const lathe = (pts: [number, number][], seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)

function useGeo<T extends THREE.BufferGeometry>(make: () => T) {
  const g = useMemo(make, [])
  useEffect(() => () => g.dispose(), [g])
  return g
}

/** Woven texture for the rattan basket. */
let weaveTex: THREE.CanvasTexture | null = null
function weave() {
  if (weaveTex) return weaveTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#c9a26b'
  ctx.fillRect(0, 0, 256, 256)
  const n = 8
  const s = 256 / n
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const over = (i + j) % 2 === 0
      const g = over ? ctx.createLinearGradient(i * s, 0, i * s + s, 0) : ctx.createLinearGradient(0, j * s, 0, j * s + s)
      g.addColorStop(0, '#9c7745')
      g.addColorStop(0.5, over ? '#e2c08a' : '#d6b27a')
      g.addColorStop(1, '#9c7745')
      ctx.fillStyle = g
      ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2)
    }
  weaveTex = new THREE.CanvasTexture(c)
  weaveTex.colorSpace = THREE.SRGBColorSpace
  weaveTex.wrapS = weaveTex.wrapT = THREE.RepeatWrapping
  weaveTex.repeat.set(10, 2)
  weaveTex.anisotropy = 8
  return weaveTex
}

/** Tall florist display stand: weighted foot, slim stem with a bead, trumpet cup. */
function GoldStand() {
  const geo = useGeo(() =>
    lathe([
      [0, -0.06], [0.118, -0.06], [0.122, -0.054], [0.116, -0.047], [0.07, -0.04], [0.03, -0.03], [0.016, -0.012],
      [0.012, 0.03], [0.022, 0.045], [0.026, 0.055], [0.022, 0.065], [0.012, 0.08],
      [0.011, 0.15], [0.02, 0.165], [0.045, 0.185], [0.072, 0.212], [0.088, 0.236], [0.093, 0.246], [0.088, 0.248], [0.08, 0.24], [0.0, 0.2],
    ]),
  )
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial color="#d8b46a" metalness={1} roughness={0.22} clearcoat={0.4} side={THREE.DoubleSide} />
    </mesh>
  )
}

function CeramicCup() {
  const geo = useGeo(() => lathe([[0.0, -0.06], [0.085, -0.06], [0.09, -0.05], [0.082, 0.0], [0.092, 0.085], [0.1, 0.098], [0.094, 0.102], [0.084, 0.094], [0.0, 0.05]], 48))
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial color="#efe7de" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.3} />
    </mesh>
  )
}

/** Clear glass cylinder with water and a bundle of stems. */
function GlassVase() {
  const glass = useGeo(() =>
    lathe([[0, -0.06], [0.07, -0.06], [0.074, -0.054], [0.076, 0.1], [0.082, 0.128], [0.078, 0.13], [0.07, 0.1], [0.066, -0.05], [0, -0.05]]),
  )
  const stems = useGeo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996
      const r = 0.012 + 0.03 * Math.sqrt(i / 14)
      const g = new THREE.CylinderGeometry(0.0045, 0.0045, 0.2, 6)
      g.rotateZ(Math.cos(a) * 0.12)
      g.rotateX(Math.sin(a) * 0.12)
      g.translate(Math.cos(a) * r, 0.05, Math.sin(a) * r)
      parts.push(g)
    }
    const merged = mergeAll(parts)
    parts.forEach((p) => p.dispose())
    return merged
  })
  return (
    <group>
      <mesh geometry={stems} castShadow>
        <meshStandardMaterial color="#5f7f4a" roughness={0.6} />
      </mesh>
      <mesh position-y={-0.005}>
        <cylinderGeometry args={[0.064, 0.064, 0.09, 48]} />
        <meshPhysicalMaterial color="#dff0ee" transmission={1} roughness={0.05} thickness={0.06} ior={1.33} transparent opacity={0.55} />
      </mesh>
      <mesh geometry={glass} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f4fbfa" transmission={1} roughness={0.04} thickness={0.01} ior={1.5} clearcoat={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Round rattan basket with a braided rim and moss on top. */
function Basket() {
  const body = useGeo(() => lathe([[0, -0.06], [0.08, -0.06], [0.096, -0.04], [0.108, 0.03], [0.118, 0.095]]))
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial map={weave()} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.097} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.118, 0.012, 10, 64]} />
        <meshStandardMaterial color="#b88f58" roughness={0.8} />
      </mesh>
      <mesh position-y={0.1 - 0.234} receiveShadow>
        <sphereGeometry args={[0.234, 32, 8, 0, Math.PI * 2, 0, 0.5]} />
        <meshStandardMaterial color="#6f8a4f" roughness={1} />
      </mesh>
    </group>
  )
}

/** Small square wooden box with moss. */
function WoodBox() {
  const tex = wood('#c79e72', '#7a5532', 12)
  const w = 0.2
  const h = 0.15
  const t = 0.014
  const y = -0.06 + h / 2
  return (
    <group>
      {[
        [0, y, w / 2 - t / 2, w, h, t],
        [0, y, -w / 2 + t / 2, w, h, t],
        [w / 2 - t / 2, y, 0, t, h, w - 2 * t],
        [-w / 2 + t / 2, y, 0, t, h, w - 2 * t],
        [0, -0.06 + t / 2, 0, w, t, w],
      ].map(([x, yy, z, bw, bh, bd], i) => (
        <mesh key={i} position={[x, yy, z]} castShadow receiveShadow>
          <boxGeometry args={[bw, bh, bd]} />
          <meshStandardMaterial map={tex} roughness={0.75} />
        </mesh>
      ))}
      {/* twine band */}
      <mesh position-y={y + 0.02}>
        <boxGeometry args={[w + 0.004, 0.01, w + 0.004]} />
        <meshStandardMaterial color="#d9c49c" roughness={1} />
      </mesh>
      <mesh position-y={0.072} receiveShadow>
        <boxGeometry args={[w - 2 * t, 0.02, w - 2 * t]} />
        <meshStandardMaterial color="#6f8a4f" roughness={1} />
      </mesh>
    </group>
  )
}

function mergeAll(parts: THREE.BufferGeometry[]) {
  // tiny local merge to avoid importing BufferGeometryUtils twice
  const pos: number[] = []
  const nor: number[] = []
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p
    pos.push(...(g.attributes.position.array as Float32Array))
    nor.push(...(g.attributes.normal.array as Float32Array))
    if (g !== p) g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  return out
}

export function Stand({ id }: { id: StandId }) {
  switch (id) {
    case 'ceramic':
      return <CeramicCup />
    case 'glass':
      return <GlassVase />
    case 'basket':
      return <Basket />
    case 'box':
      return <WoodBox />
    default:
      return <GoldStand />
  }
}

export { standLift }
