import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FLOWERS, mulberry32, type Part, type StemColors } from '../data/flowers'
import { buildHeads, quatFromDir, type Dims, type Head } from '../gift/layout'
import { wrapById, type GiftDesign } from '../gift/styles'
import { mainStemGeo } from './geometry'
import { accentMaterial, createPetalMaterial, setPetalColors } from './materials'

const GREEN = { stem: '#5f7f4a', leaf: '#6b8f55' }
const UP = new THREE.Vector3(0, 1, 0)

// ---------------------------------------------------------------- flowers (batched)

const partCache = new Map<string, Part[]>()
function partsFor(h: Head) {
  const key = `${h.type}:${h.open}:${h.variant}`
  let p = partCache.get(key)
  if (!p) {
    p = FLOWERS[h.type].build(h.open, mulberry32(h.variant * 997 + 13)).filter((x) => !x.onStem)
    partCache.set(key, p)
  }
  return p
}

const colorKey = (c: StemColors) => `${c.petal}${c.petal2}${c.gradient}${c.center}`

interface Group {
  geo: THREE.BufferGeometry
  material: THREE.Material
  matrices: THREE.Matrix4[]
}

/**
 * Every petal/leaf of every flower is batched by (geometry, colour) into one
 * InstancedMesh, so a 48-rose bouquet is a handful of draw calls.
 */
function FlowerBatch({ heads }: { heads: Head[] }) {
  const { meshes, materials } = useMemo(() => {
    const groups = new Map<string, Group>()
    const materials = new Map<string, THREE.Material>()
    const matFor = (role: Part['role'], c: StemColors, accent?: string) => {
      const key = role === 'petal' ? `p:${colorKey(c)}` : role === 'center' ? `c:${c.center}` : role === 'accent' ? `a:${accent}` : role
      let m = materials.get(key)
      if (!m) {
        if (role === 'petal') {
          const pm = createPetalMaterial()
          setPetalColors(pm, c.petal, c.petal2, c.gradient)
          m = pm
        } else if (role === 'center') m = new THREE.MeshStandardMaterial({ color: c.center, roughness: 0.8 })
        else if (role === 'accent') m = accentMaterial(accent ?? '#ffffff')
        else m = new THREE.MeshStandardMaterial({ color: role === 'leaf' ? GREEN.leaf : GREEN.stem, roughness: 0.55, side: THREE.DoubleSide })
        materials.set(key, m)
      }
      return { key, m }
    }
    const H = new THREE.Matrix4()
    for (const h of heads) {
      H.compose(h.pos, quatFromDir(h.dir, h.spin), new THREE.Vector3(h.scale, h.scale, h.scale))
      partsFor(h).forEach((p, i) => {
        const { key: mk, m } = matFor(p.role, h.colors, p.accent)
        const gk = `${h.type}:${h.open}:${i}:${p.geo.uuid}:${mk}`
        let g = groups.get(gk)
        if (!g) groups.set(gk, (g = { geo: p.geo, material: m, matrices: [] }))
        for (const pm of p.matrices) g.matrices.push(H.clone().multiply(pm))
      })
    }
    const meshes: THREE.InstancedMesh[] = []
    const c = new THREE.Color()
    let s = 7
    for (const g of groups.values()) {
      const mesh = new THREE.InstancedMesh(g.geo, g.material, g.matrices.length)
      g.matrices.forEach((m, i) => {
        mesh.setMatrixAt(i, m)
        s = (s * 16807) % 2147483647
        mesh.setColorAt(i, c.setScalar(0.9 + (s / 2147483647) * 0.1))
      })
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.computeBoundingSphere()
      meshes.push(mesh)
    }
    return { meshes, materials }
  }, [heads])

  useEffect(
    () => () => {
      meshes.forEach((m) => m.dispose())
      materials.forEach((m, k) => !k.startsWith('a:') && m.dispose())
    },
    [meshes, materials],
  )
  return (
    <>
      {meshes.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  )
}

/** Dark leafy cap just under the flower heads, so no gaps show through to the stems. */
function FoliageBase({ dims }: { dims: Dims }) {
  const cap = 56 * (Math.PI / 180)
  const R = dims.S * 0.93
  const cy = dims.rimY - dims.S * Math.cos(cap)
  return (
    <mesh position-y={cy} receiveShadow>
      <sphereGeometry args={[R, 40, 16, 0, Math.PI * 2, 0, cap * 0.98]} />
      <meshStandardMaterial color="#3f5a34" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

function StemBatch({ heads, bindY }: { heads: Head[]; bindY: number }) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ color: GREEN.stem, roughness: 0.5 })
    const m = new THREE.InstancedMesh(mainStemGeo(), mat, heads.length)
    const bind = new THREE.Vector3(0, bindY, 0)
    heads.forEach((h, i) => {
      const d = h.pos.clone().sub(bind)
      const len = d.length()
      const below = 0.13
      const start = bind.clone().addScaledVector(d.normalize(), -below)
      m.setMatrixAt(i, new THREE.Matrix4().compose(start, new THREE.Quaternion().setFromUnitVectors(UP, d), new THREE.Vector3(1, len + below, 1)))
    })
    m.castShadow = true
    m.computeBoundingSphere()
    return m
  }, [heads, bindY])
  useEffect(() => () => { mesh.dispose(); (mesh.material as THREE.Material).dispose() }, [mesh])
  return <primitive object={mesh} />
}

// ---------------------------------------------------------------- layered Korean-style wrap

interface SheetOpts {
  thc: number
  span: number
  height: number
  y0: number
  r0: number
  slope: number
  flare: number
  peak: number
  seed: number
}

function sheetGeo(o: SheetOpts) {
  const segU = 18
  const segV = 12
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= segV; j++) {
    const v = j / segV
    for (let i = 0; i <= segU; i++) {
      const u = -1 + (2 * i) / segU
      const th = o.thc + (u * o.span) / 2
      const top = o.y0 + o.height * (1 - o.peak * Math.pow(Math.abs(u), 1.3))
      const y = o.y0 + (top - o.y0) * v
      const r = o.r0 + (y - o.y0) * o.slope + o.flare * v * v * v + 0.008 * Math.sin(u * 5 + o.seed) * v * v
      pos.push(r * Math.cos(th), y, r * Math.sin(th))
      uv.push((u + 1) / 2, v)
    }
  }
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i
      const b = a + segU + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const WRAP_Y0 = 0.09
const WRAP_R0 = 0.05

export function wrapSlope(d: Dims) {
  return (d.rimR * 1.06 - WRAP_R0) / (d.rimY - WRAP_Y0)
}

function LayeredWrap({ dims, wrapId }: { dims: Dims; wrapId: string }) {
  const wrap = wrapById(wrapId)
  const { inner, outer } = useMemo(() => {
    const slope = wrapSlope(dims)
    const base = dims.rimY - WRAP_Y0
    const S = dims.S
    // front (+z) sheets lower so the flowers show; back sheets taller
    const frontBack = (th: number) => 1 - 0.08 * Math.max(0, Math.sin(th)) + 0.14 * Math.max(0, -Math.sin(th))
    const ring = (count: number, offset: number, span: number, lift: number, flare: number, dr: number, peak: number) =>
      Array.from({ length: count }, (_, i) => {
        const thc = offset + (i / count) * Math.PI * 2
        return sheetGeo({ thc, span, height: (base + lift) * frontBack(thc), y0: WRAP_Y0, r0: WRAP_R0 + dr, slope: slope * (1 + dr * 2), flare, peak, seed: i * 1.7 + offset })
      })
    const innerSheets = ring(6, 0, 1.45, 0.07 + 0.14 * S, 0.04 + 0.08 * S, 0, 0.42)
    const midSheets = ring(7, 0.45, 1.3, 0.03 + 0.08 * S, 0.07 + 0.14 * S, 0.008, 0.38)
    const skirt = ring(5, 0.2, 1.75, -0.02, 0.11 + 0.2 * S, 0.016, 0.3)
    const inner = mergeGeometries(innerSheets)!
    const outer = mergeGeometries([...midSheets, ...skirt])!
    ;[...innerSheets, ...midSheets, ...skirt].forEach((g) => g.dispose())
    return { inner, outer }
  }, [dims])
  useEffect(() => () => { inner.dispose(); outer.dispose() }, [inner, outer])
  return (
    <group>
      <mesh geometry={inner} castShadow receiveShadow>
        <meshPhysicalMaterial color={wrap.inner} roughness={0.72} sheen={0.6} sheenColor="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={outer} castShadow receiveShadow>
        <meshPhysicalMaterial color={wrap.outer} roughness={0.66} sheen={0.5} sheenColor="#ffffff" clearcoat={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- satin ribbon + bow

function stripGeo(points: THREE.Vector3[], width: (t: number) => number, side: (T: THREE.Vector3, t: number) => THREE.Vector3) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const N = 48
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = curve.getPointAt(t)
    const s = side(curve.getTangentAt(t), t).normalize().multiplyScalar(width(t) / 2)
    pos.push(p.x + s.x, p.y + s.y, p.z + s.z, p.x - s.x, p.y - s.y, p.z - s.z)
    if (i < N) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function Bow({ color, scale }: { color: string; scale: number }) {
  const geo = useMemo(() => {
    const W = 0.034
    const parts: THREE.BufferGeometry[] = []
    for (const sx of [-1, 1]) {
      // loop: out sideways and back, ribbon width vertical, pinched at the knot
      const loop = [V(0, 0, 0.004), V(sx * 0.045, 0.012, 0.03), V(sx * 0.1, 0.03, 0.012), V(sx * 0.112, 0.026, -0.012), V(sx * 0.07, 0.008, -0.022), V(sx * 0.01, 0, -0.004)]
      parts.push(stripGeo(loop, (t) => W * (0.35 + 0.75 * Math.sin(Math.PI * t)), () => V(0, 1, 0.15 * sx)))
      // tail hanging down, facing forward, with a little twist
      const tail = [V(sx * 0.004, -0.004, 0.006), V(sx * 0.03, -0.07, 0.02), V(sx * 0.05, -0.16, 0.016), V(sx * 0.058, -0.25, 0.026), V(sx * 0.07, -0.31, 0.02)]
      parts.push(stripGeo(tail, (t) => W * (0.55 + 0.45 * Math.min(1, t * 3)), (T, t) => new THREE.Vector3().crossVectors(T, V(Math.sin(t * 2) * 0.4 * sx, 0, 1))))
    }
    const g = mergeGeometries(parts)!
    parts.forEach((p) => p.dispose())
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <group scale={scale}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenColor="#ffffff" clearcoat={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.008]} scale={[1, 1.15, 0.7]} castShadow>
        <sphereGeometry args={[0.016, 20, 14]} />
        <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenColor="#ffffff" clearcoat={0.25} />
      </mesh>
    </group>
  )
}

function RibbonBand({ dims, color }: { dims: Dims; color: string }) {
  const r = WRAP_R0 + 0.016 + (dims.bindY - WRAP_Y0) * wrapSlope(dims) * 1.032 + 0.004
  return (
    <group position-y={dims.bindY}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r * 0.96, 0.034, 48, 1, true]} />
        <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenColor="#ffffff" clearcoat={0.25} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, 0, r + 0.004]}>
        <Bow color={color} scale={1.15 + dims.S * 1.1} />
      </group>
    </group>
  )
}

function Holder() {
  const geo = useMemo(() => {
    const pts = [[0.0, -0.06], [0.085, -0.06], [0.09, -0.05], [0.082, 0.0], [0.092, 0.085], [0.1, 0.098], [0.094, 0.102], [0.084, 0.094], [0.0, 0.05]].map(
      ([x, y]) => new THREE.Vector2(x, y),
    )
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial color="#efe7de" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.3} />
    </mesh>
  )
}

// ---------------------------------------------------------------- bouquet

export function GiftBouquet({ design, sway = true, animate = true }: { design: GiftDesign; sway?: boolean; animate?: boolean }) {
  const { heads, dims } = useMemo(() => buildHeads(design), [design.style, design.size])
  const flowers = useRef<THREE.Group>(null!)
  const root = useRef<THREE.Group>(null!)

  // a soft "bloom in" whenever the flowers change
  useLayoutEffect(() => {
    if (!animate) return
    const s = { v: 0.86 }
    flowers.current.scale.setScalar(s.v)
    const tw = gsap.to(s, { v: 1, duration: 0.8, ease: 'back.out(1.6)', onUpdate: () => flowers.current?.scale.setScalar(s.v) })
    return () => {
      tw.kill()
      flowers.current?.scale.setScalar(1)
    }
  }, [heads, animate])

  useFrame(({ clock }) => {
    if (!sway) return
    const t = clock.elapsedTime
    root.current.rotation.set(Math.sin(t * 0.7) * 0.006, 0, Math.cos(t * 0.55) * 0.006)
  })

  return (
    <group ref={root}>
      <Holder />
      <LayeredWrap dims={dims} wrapId={design.wrap} />
      <group ref={flowers} position-y={dims.bindY} >
        <group position-y={-dims.bindY}>
          <StemBatch heads={heads} bindY={dims.bindY} />
          <FoliageBase dims={dims} />
          <FlowerBatch heads={heads} />
        </group>
      </group>
      <RibbonBand dims={dims} color={design.ribbon} />
    </group>
  )
}
