import { useFrame, type ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FLOWERS, mulberry32, type Part, type StemColors } from '../data/flowers'
import { buildHeads, headRadius, quatFromDir, slotDir, slotPos, type Dims, type Head } from '../gift/layout'
import { wrapById, type GiftDesign } from '../gift/styles'
import { BOX_TOP, bouquetLift, boxRadius, type ShapeId } from '../gift/shapes'
import { mainStemGeo } from './geometry'
import { useDesign, useUI } from '../state/store'
import { accentMaterial, createPetalMaterial, setPetalColors } from './materials'
import { slotAtScreen, stage } from './stage'
import { Stand } from './Stands'

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

/** Flowers needed before the leafy cap shows (with fewer it reads as a flat green disc). */
const FOLIAGE_MIN = 6

/** Dark leafy cap just under the flower heads, so no gaps show through to the stems. */
function FoliageBase({ dims, count }: { dims: Dims; count: number }) {
  if (count < FOLIAGE_MIN || dims.cap < 0.05) return null
  return (
    <mesh position-y={dims.cy} receiveShadow>
      <sphereGeometry args={[dims.R * 0.93, 40, 16, 0, Math.PI * 2, 0, dims.cap * 0.98]} />
      <meshStandardMaterial color="#3f5a34" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

function StemBatch({ heads, bindY, below = 0.13 }: { heads: Head[]; bindY: number; below?: number }) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ color: GREEN.stem, roughness: 0.5 })
    const m = new THREE.InstancedMesh(mainStemGeo(), mat, heads.length)
    const bind = new THREE.Vector3(0, bindY, 0)
    heads.forEach((h, i) => {
      const d = h.pos.clone().sub(bind)
      const len = d.length()
      const start = bind.clone().addScaledVector(d.normalize(), -below)
      m.setMatrixAt(i, new THREE.Matrix4().compose(start, new THREE.Quaternion().setFromUnitVectors(UP, d), new THREE.Vector3(1, len + below, 1)))
    })
    m.castShadow = true
    m.computeBoundingSphere()
    return m
  }, [heads, bindY, below])
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
    const innerSheets = ring(6, 0, 1.45, 0.01 + 0.2 * S, 0.04 + 0.08 * S, 0, 0.42)
    const midSheets = ring(7, 0.45, 1.3, -0.01 + 0.12 * S, 0.07 + 0.14 * S, 0.008, 0.38)
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

/** Tall florist cone: one big sheet, high at the back and open at the front. */
const CONE_Y0 = 0.03
const CONE_R0 = 0.026
const coneSlope = (d: Dims) => (d.rimR * 1.12 - CONE_R0) / (d.rimY - CONE_Y0)

function ConeWrap({ dims, wrapId }: { dims: Dims; wrapId: string }) {
  const wrap = wrapById(wrapId)
  const { inner, outer } = useMemo(() => {
    const slope = coneSlope(dims)
    const height = dims.rimY - CONE_Y0 + 0.16 + 0.14 * dims.S
    const frontTop = dims.rimY - 0.06 - 0.03 * dims.S
    const peak = 1 - (frontTop - CONE_Y0) / height
    const back = -Math.PI / 2
    const inner = sheetGeo({ thc: back, span: Math.PI * 2 * 1.02, height, y0: CONE_Y0, r0: CONE_R0, slope, flare: 0.05 + 0.06 * dims.S, peak, seed: 1 })
    const outer = sheetGeo({ thc: back, span: Math.PI * 2 * 0.72, height: height * 0.9, y0: CONE_Y0, r0: CONE_R0 + 0.005, slope: slope * 1.04, flare: 0.08 + 0.08 * dims.S, peak: peak * 0.96, seed: 4 })
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

/** Hand-tied: just a small paper collar at the binding, stems show below. */
const CUFF_R0 = 0.04
const CUFF_SLOPE = 0.32
function CuffWrap({ dims, wrapId }: { dims: Dims; wrapId: string }) {
  const wrap = wrapById(wrapId)
  const { inner, outer } = useMemo(() => {
    const y0 = dims.bindY - 0.06
    const ring = (count: number, offset: number, h: number, dr: number, flare: number) =>
      Array.from({ length: count }, (_, i) =>
        sheetGeo({ thc: offset + (i / count) * Math.PI * 2, span: 1.5, height: h, y0, r0: CUFF_R0 + dr, slope: CUFF_SLOPE, flare, peak: 0.35, seed: i * 2.3 + offset }),
      )
    const a = ring(6, 0, 0.15 + 0.04 * dims.S, 0, 0.04)
    const b = ring(6, 0.5, 0.12 + 0.03 * dims.S, 0.006, 0.06)
    const inner = mergeGeometries(a)!
    const outer = mergeGeometries(b)!
    ;[...a, ...b].forEach((g) => g.dispose())
    return { inner, outer }
  }, [dims])
  useEffect(() => () => { inner.dispose(); outer.dispose() }, [inner, outer])
  return (
    <group>
      <mesh geometry={inner} castShadow receiveShadow>
        <meshPhysicalMaterial color={wrap.inner} roughness={0.75} sheen={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={outer} castShadow receiveShadow>
        <meshPhysicalMaterial color={wrap.outer} roughness={0.7} sheen={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Round hat box (outer = paper colour, lining = inner colour) with a ribbon and bow. Sits on the table. */
function HatBox({ dims, wrapId, ribbon }: { dims: Dims; wrapId: string; ribbon: string }) {
  const wrap = wrapById(wrapId)
  const r = boxRadius(dims)
  const h = BOX_TOP + 0.06
  const y = -0.06 + h / 2
  return (
    <group>
      <mesh position-y={y} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 72, 1, true]} />
        <meshPhysicalMaterial color={wrap.outer} roughness={0.45} clearcoat={0.35} clearcoatRoughness={0.4} side={THREE.FrontSide} />
      </mesh>
      <mesh position-y={y}>
        <cylinderGeometry args={[r - 0.004, r - 0.004, h, 72, 1, true]} />
        <meshStandardMaterial color={wrap.inner} roughness={0.8} side={THREE.BackSide} />
      </mesh>
      <mesh position-y={BOX_TOP} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[r - 0.002, 0.004, 8, 72]} />
        <meshStandardMaterial color={wrap.inner} roughness={0.6} />
      </mesh>
      <mesh position-y={-0.058} receiveShadow>
        <cylinderGeometry args={[r, r, 0.004, 72]} />
        <meshStandardMaterial color={wrap.outer} roughness={0.6} />
      </mesh>
      {/* floral foam / moss just under the flowers */}
      <mesh position-y={BOX_TOP - 0.012}>
        <cylinderGeometry args={[r - 0.006, r - 0.006, 0.01, 64]} />
        <meshStandardMaterial color="#2f4127" roughness={1} />
      </mesh>
      {/* ribbon around the box + bow at the front */}
      <mesh position-y={BOX_TOP - 0.07} castShadow>
        <cylinderGeometry args={[r + 0.003, r + 0.003, 0.03, 72, 1, true]} />
        <meshPhysicalMaterial color={ribbon} roughness={0.32} sheen={1} sheenColor="#ffffff" clearcoat={0.25} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, BOX_TOP - 0.07, r + 0.006]}>
        <Bow color={ribbon} scale={1.0 + dims.S * 0.8} />
      </group>
    </group>
  )
}

/** Ribbon radius at the binding for each shape. */
function bandRadius(shape: ShapeId, d: Dims) {
  if (shape === 'cone') return CONE_R0 + 0.005 + (d.bindY - CONE_Y0) * coneSlope(d) * 1.04 + 0.006
  if (shape === 'handtied') return CUFF_R0 + 0.006 + 0.06 * CUFF_SLOPE + 0.008
  return WRAP_R0 + 0.016 + (d.bindY - WRAP_Y0) * wrapSlope(d) * 1.032 + 0.004
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

function RibbonBand({ dims, color, shape }: { dims: Dims; color: string; shape: ShapeId }) {
  const r = bandRadius(shape, dims)
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

// ---------------------------------------------------------------- interaction

const invisible = new THREE.MeshBasicMaterial({ visible: false })
const unitSphere = new THREE.SphereGeometry(1, 10, 8)

/** One invisible sphere per flower: cheap, reliable picking for click & drag. */
function PickProxy({ heads }: { heads: Head[] }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(unitSphere, invisible, Math.max(1, heads.length))
    m.count = heads.length
    heads.forEach((h, i) => {
      const r = headRadius(h) * 0.95
      m.setMatrixAt(i, new THREE.Matrix4().compose(h.pos, new THREE.Quaternion(), new THREE.Vector3(r, r, r)))
    })
    m.computeBoundingSphere()
    return m
  }, [heads])
  useEffect(() => () => {
    mesh.dispose()
  }, [mesh])

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId == null) return
    if (e.nativeEvent.pointerType === 'mouse' && e.nativeEvent.button !== 0) return
    e.stopPropagation()
    const i = e.instanceId
    const ui = useUI.getState()
    if (ui.mode !== 'arrange') return
    ui.set({ selected: i })
    if (stage.controls) stage.controls.enabled = false
    const sx = e.nativeEvent.clientX
    const sy = e.nativeEvent.clientY
    const pid = e.nativeEvent.pointerId
    let active = false
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      active = true
      document.body.style.cursor = 'grabbing'
      const n = useDesign.getState().design.items.length
      const slot = slotAtScreen(ev.clientX, ev.clientY, n)
      useUI.getState().set({ dragHead: i, dropSlot: slot != null && slot !== i ? slot : null })
    }
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.body.style.cursor = ''
      const st = useUI.getState()
      if (active && st.dropSlot != null && ev.type === 'pointerup') useDesign.getState().swapItems(i, st.dropSlot)
      st.set({ dragHead: null, dropSlot: null })
      if (stage.controls) stage.controls.enabled = st.mode === 'arrange'
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <primitive
      object={mesh}
      onPointerDown={onDown}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    />
  )
}

function Ring({ pos, dir, radius, color, pulse = 0.05 }: { pos: THREE.Vector3; dir: THREE.Vector3; radius: number; color: string; pulse?: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir), [dir])
  useFrame(({ clock }) => ref.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * pulse))
  return (
    <mesh ref={ref} position={pos.clone().addScaledVector(dir, 0.02)} quaternion={q} renderOrder={5}>
      <torusGeometry args={[radius, 0.0035, 8, 48]} />
      <meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={0.95} />
    </mesh>
  )
}

function Markers({ heads }: { heads: Head[] }) {
  const selected = useUI((s) => s.selected)
  const dropSlot = useUI((s) => s.dropSlot)
  const libDrag = useUI((s) => s.libDrag)
  const sel = selected != null ? heads[selected] : null
  const count = heads.length + (libDrag ? 1 : 0)
  return (
    <>
      {sel && <Ring pos={sel.pos} dir={sel.dir} radius={headRadius(sel) * 1.05} color="#6f8f6a" />}
      {dropSlot != null && <Ring pos={slotPos(dropSlot, count)} dir={slotDir(dropSlot)} radius={0.06} color="#c2607a" pulse={0.12} />}
    </>
  )
}

/** The flower you just added grows into its spot, then joins the main batch. */
function PopFlower({ head, popKey }: { head: Head; popKey: number }) {
  const g = useRef<THREE.Group>(null!)
  const heads = useMemo(() => [{ ...head, pos: new THREE.Vector3() }], [head])
  useLayoutEffect(() => {
    const s = { v: 0.01, lift: 0.06 }
    const apply = () => {
      g.current.scale.setScalar(s.v)
      g.current.position.copy(head.pos).addScaledVector(head.dir, s.lift)
    }
    apply()
    const done = () => {
      const ui = useUI.getState()
      if (ui.pop?.key === popKey) ui.set({ pop: null })
    }
    if (useUI.getState().reducedMotion) {
      done()
      return
    }
    const tl = gsap.timeline({ onUpdate: apply, onComplete: done })
    tl.to(s, { v: 1, duration: 0.55, ease: 'back.out(1.8)' }, 0).to(s, { lift: 0, duration: 0.6, ease: 'power3.out' }, 0)
    return () => {
      tl.kill()
    }
  }, [head, popKey])
  return (
    <group ref={g}>
      <FlowerBatch heads={heads} />
    </group>
  )
}

// ---------------------------------------------------------------- bouquet

export function GiftBouquet({ design, sway = true, animate = true, interactive = false }: { design: GiftDesign; sway?: boolean; animate?: boolean; interactive?: boolean }) {
  const { heads, dims } = useMemo(() => buildHeads(design.items), [design.items])
  const shape = design.shape
  const pop = useUI((s) => (interactive ? s.pop : null))
  const popHead = pop && pop.index < heads.length ? heads[pop.index] : null
  const batched = useMemo(() => (popHead ? heads.filter((h) => h !== popHead) : heads), [heads, popHead])
  const flowers = useRef<THREE.Group>(null!)
  const root = useRef<THREE.Group>(null!)
  const lastCount = useRef(heads.length)

  // a soft "bloom in" when the flowers change (bigger for a whole new bouquet)
  useLayoutEffect(() => {
    const delta = Math.abs(heads.length - lastCount.current)
    lastCount.current = heads.length
    // single additions get their own grow-in instead of a whole-bouquet bounce
    if (!animate || delta <= 1) return
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
      {shape === 'box' ? <HatBox dims={dims} wrapId={design.wrap} ribbon={design.ribbon} /> : <Stand id={design.stand} />}
      <group position-y={bouquetLift(shape, design.stand, dims)}>
      {shape === 'korean' && <LayeredWrap dims={dims} wrapId={design.wrap} />}
      {shape === 'cone' && <ConeWrap dims={dims} wrapId={design.wrap} />}
      {shape === 'handtied' && <CuffWrap dims={dims} wrapId={design.wrap} />}
      <group ref={flowers} position-y={dims.bindY}>
        <group position-y={-dims.bindY}>
          <StemBatch heads={heads} bindY={dims.bindY} below={shape === 'handtied' ? 0.2 : 0.13} />
          <FoliageBase dims={dims} count={heads.length} />
          <FlowerBatch heads={batched} />
          {popHead && pop && <PopFlower head={popHead} popKey={pop.key} />}
          {interactive && <PickProxy heads={heads} />}
          {interactive && <Markers heads={heads} />}
        </group>
      </group>
      {shape !== 'box' && <RibbonBand dims={dims} color={design.ribbon} shape={shape} />}
      </group>
    </group>
  )
}
