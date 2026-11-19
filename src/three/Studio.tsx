import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../data/flowers'
import { useUI } from '../state/store'
import { roomById, useRoom, type RoomTheme } from './rooms'
import { BENCH_ROOT, HERO_ROOT } from './stage'
import { checker, herringbone, marble, wood } from './textures'

const WALL_Z = -4
const TABLE_TOP = BENCH_ROOT.y - 0.06 // holder bottom sits on the surface

/* ------------------------------------------------------------------ helpers */

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

/** Window view: soft sky → horizon → blurred garden hedge. */
function viewTexture([top, mid, hedge]: [string, string, string]) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, top)
  g.addColorStop(0.62, mid)
  g.addColorStop(0.8, hedge)
  g.addColorStop(1, hedge)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ------------------------------------------------------------------ walls */

/** Lower wall panelling: base board, chair rail and framed panels (one merged mesh). */
function Wainscot({ theme }: { theme: RoomTheme }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const z = WALL_Z + 0.015
    parts.push(box(16, 0.14, 0.04, 0, 0.07, z + 0.01)) // base board
    parts.push(box(16, 0.05, 0.05, 0, 0.98, z + 0.012)) // chair rail
    parts.push(box(16, 0.02, 0.03, 0, 0.94, z + 0.008))
    const pw = 0.9
    const t = 0.025
    for (let x = -6.6; x <= 6.61; x += 1.1) {
      const y0 = 0.24
      const y1 = 0.82
      parts.push(box(pw, t, 0.02, x, y0, z), box(pw, t, 0.02, x, y1, z))
      parts.push(box(t, y1 - y0, 0.02, x - pw / 2, (y0 + y1) / 2, z), box(t, y1 - y0, 0.02, x + pw / 2, (y0 + y1) / 2, z))
    }
    return mergeGeometries(parts)!
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <group>
      <mesh position={[0, 0.5, WALL_Z + 0.005]} receiveShadow>
        <planeGeometry args={[16, 1.0]} />
        <meshStandardMaterial color={theme.wainscot} roughness={0.8} />
      </mesh>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={theme.trim} roughness={0.55} />
      </mesh>
    </group>
  )
}

/** Tall arched window with mullions, sill, linen curtains and a rod. */
function ArchWindow({ x, w = 1.7, h = 1.9, bottom = 1.0, theme }: { x: number; w?: number; h?: number; bottom?: number; theme: RoomTheme }) {
  const r = w / 2
  const t = 0.08
  const { glass, frame, curtainGeo, view } = useMemo(() => {
    const arch = (rr: number, hh: number) => {
      const s = new THREE.Shape()
      s.moveTo(-rr, 0)
      s.lineTo(rr, 0)
      s.lineTo(rr, hh)
      s.absarc(0, hh, rr, 0, Math.PI, false)
      s.lineTo(-rr, 0)
      return s
    }
    const glass = new THREE.ShapeGeometry(arch(r, h), 48)
    // map UVs to 0..1 so the view gradient fills the opening
    const uv = glass.attributes.uv as THREE.BufferAttribute
    const pos = glass.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + r) / w, pos.getY(i) / (h + r))
    const outer = arch(r + t, h)
    outer.holes.push(arch(r, h) as unknown as THREE.Path)
    const frame = new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: false, curveSegments: 48 })
    // gently folded curtain
    const cg = new THREE.PlaneGeometry(0.62, h + r + 0.75, 48, 1)
    const cp = cg.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < cp.count; i++) {
      const u = cp.getX(i) / 0.62 + 0.5
      cp.setZ(i, Math.sin(u * Math.PI * 7) * 0.035 + Math.sin(u * Math.PI * 2.3) * 0.02)
    }
    cg.computeVertexNormals()
    return { glass, frame, curtainGeo: cg, view: viewTexture(theme.view) }
  }, [r, w, h, theme.view])
  useEffect(() => () => { glass.dispose(); frame.dispose(); curtainGeo.dispose(); view.dispose() }, [glass, frame, curtainGeo, view])
  const glow = useMemo(() => new THREE.Color(1, 1, 1).multiplyScalar(theme.light.glowI), [theme.light.glowI])
  const top = h + r
  return (
    <group position={[x, bottom, WALL_Z + 0.02]}>
      <mesh geometry={glass}>
        <meshBasicMaterial map={view} color={glow} toneMapped={false} />
      </mesh>
      <mesh geometry={frame} castShadow>
        <meshStandardMaterial color={theme.trim} roughness={0.5} />
      </mesh>
      {/* mullions */}
      <mesh position={[0, top / 2, 0.04]} castShadow>
        <boxGeometry args={[0.04, top, 0.04]} />
        <meshStandardMaterial color={theme.trim} roughness={0.5} />
      </mesh>
      {[h * 0.36, h * 0.72, h].map((y) => (
        <mesh key={y} position={[0, y, 0.04]} castShadow>
          <boxGeometry args={[w, 0.035, 0.04]} />
          <meshStandardMaterial color={theme.trim} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, h, 0.04]}>
        <torusGeometry args={[r * 0.5, 0.018, 8, 32, Math.PI]} />
        <meshStandardMaterial color={theme.trim} roughness={0.5} />
      </mesh>
      {/* sill */}
      <mesh position={[0, -0.04, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.36, 0.06, 0.26]} />
        <meshStandardMaterial color={theme.trim} roughness={0.5} />
      </mesh>
      {/* rod + curtains */}
      <mesh position={[0, top + 0.28, 0.2]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.014, 0.014, w + 1.5, 12]} />
        <meshStandardMaterial color={theme.candles ? '#b89458' : '#d9cfc2'} metalness={theme.candles ? 0.8 : 0.1} roughness={0.35} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={curtainGeo} position={[side * (r + 0.42), top + 0.28 - (h + r + 0.75) / 2, 0.2]} castShadow receiveShadow>
          <meshStandardMaterial color={theme.curtain} roughness={1} side={THREE.DoubleSide} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  )
}

function Sconce({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, WALL_Z + 0.02]}>
      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
        <meshStandardMaterial color="#b89458" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0.1]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
        <meshStandardMaterial color="#b89458" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.1, 0.18]}>
        <cylinderGeometry args={[0.05, 0.075, 0.12, 24, 1, true]} />
        <meshStandardMaterial color="#fff1d6" emissive="#ffc77a" emissiveIntensity={2.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Shelf({ theme }: { theme: RoomTheme }) {
  const vases: [number, number, number, string][] = [
    [-0.45, 0.14, 0.05, theme.candles ? '#c9b89c' : '#e8ddd0'],
    [-0.2, 0.2, 0.04, '#c9d3c3'],
    [0.25, 0.11, 0.06, theme.id === 'blush' ? '#f7e9e4' : '#efd9d2'],
  ]
  return (
    <group position={[-0.55, 1.75, WALL_Z + 0.15]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.04, 0.26]} />
        <meshStandardMaterial color={theme.trim} roughness={0.6} />
      </mesh>
      {vases.map(([x, h, r, c], i) => (
        <mesh key={i} position={[x, 0.02 + h / 2, 0]} castShadow>
          <cylinderGeometry args={[r * 0.8, r, h, 24]} />
          <meshPhysicalMaterial color={c} roughness={0.35} clearcoat={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ plants */

const LEAF = (() => {
  const g = new THREE.SphereGeometry(1, 8, 6)
  g.scale(0.022, 0.006, 0.055)
  g.translate(0, 0, 0.045)
  return g
})()

/** Olive-style tree in a pot: instanced leaves on a few branch clusters. */
function PottedTree({ position, height = 1.6, theme, seed = 1 }: { position: [number, number, number]; height?: number; theme: RoomTheme; seed?: number }) {
  const leaves = useRef<THREE.InstancedMesh>(null!)
  const N = 520
  const trunk = useMemo(() => {
    const rand = mulberry32(seed)
    const pts = [0, 0.25, 0.55, 0.8, 1].map((t) => new THREE.Vector3((rand() - 0.5) * 0.08 * t, 0.32 + t * (height - 0.62), (rand() - 0.5) * 0.08 * t))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 8, false)
  }, [height, seed])
  useEffect(() => () => trunk.dispose(), [trunk])
  useLayoutEffect(() => {
    const rand = mulberry32(seed + 11)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    const ca = new THREE.Color(theme.leaf[0])
    const cb = new THREE.Color(theme.leaf[1])
    const c = new THREE.Color()
    const clusters = [
      [0, height - 0.12, 0, 0.32],
      [0.2, height - 0.4, 0.05, 0.22],
      [-0.2, height - 0.32, -0.04, 0.24],
      [0.05, height - 0.62, 0.12, 0.18],
    ]
    for (let i = 0; i < N; i++) {
      const [cx, cy, cz, cr] = clusters[i % clusters.length]
      const u = rand() * Math.PI * 2
      const v = Math.acos(2 * rand() - 1)
      const rr = cr * Math.cbrt(rand())
      p.set(cx + Math.sin(v) * Math.cos(u) * rr, cy + Math.cos(v) * rr * 0.75, cz + Math.sin(v) * Math.sin(u) * rr)
      e.set((rand() - 0.5) * 1.6, rand() * Math.PI * 2, (rand() - 0.5) * 1.2)
      q.setFromEuler(e)
      const k = 0.8 + rand() * 0.5
      s.set(k, k, k)
      m.compose(p, q, s)
      leaves.current.setMatrixAt(i, m)
      leaves.current.setColorAt(i, c.copy(ca).lerp(cb, rand()))
    }
    leaves.current.instanceMatrix.needsUpdate = true
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true
  }, [theme.leaf, height, seed])
  return (
    <group position={position}>
      <mesh position-y={0.17} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.34, 32]} />
        <meshStandardMaterial color={theme.pot} roughness={0.75} />
      </mesh>
      <mesh position-y={0.335}>
        <cylinderGeometry args={[0.185, 0.185, 0.01, 32]} />
        <meshStandardMaterial color="#5a4635" roughness={1} />
      </mesh>
      <mesh geometry={trunk} castShadow>
        <meshStandardMaterial color="#8a7560" roughness={0.9} />
      </mesh>
      <instancedMesh ref={leaves} args={[LEAF, undefined, N]} castShadow>
        <meshStandardMaterial roughness={0.7} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}

/* ------------------------------------------------------------------ hero pedestal */

function Pedestal({ theme }: { theme: RoomTheme }) {
  const top = theme.candles ? marble('#ece6dc', '#9c8f7c', 9) : undefined
  return (
    <group position={[HERO_ROOT.x, 0, HERO_ROOT.z]}>
      <mesh position-y={0.5} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.29, 1.0, 64]} />
        <meshPhysicalMaterial color={theme.pedestal} roughness={0.32} clearcoat={0.35} />
      </mesh>
      <mesh position-y={1.0 - 0.012} castShadow receiveShadow>
        <cylinderGeometry args={[0.31, 0.31, 0.024, 64]} />
        <meshPhysicalMaterial color={theme.pedestal} map={top} roughness={0.28} clearcoat={0.5} />
      </mesh>
      <mesh position-y={0.015} receiveShadow>
        <cylinderGeometry args={[0.33, 0.33, 0.03, 64]} />
        <meshPhysicalMaterial color={theme.pedestal} roughness={0.3} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ tables */

const BRASS = { color: '#c9a35e', metalness: 0.9, roughness: 0.28 }

/** Little things a florist leaves on the table. */
function TableProps({ at }: { at: { rolls: [number, number]; spool: [number, number]; vase?: [number, number] } }) {
  const [rx, rz] = at.rolls
  const [sx, sz] = at.spool
  return (
    <group>
      <mesh position={[sx, TABLE_TOP + 0.03, sz]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 32]} />
        <meshPhysicalMaterial color="#d8a3a5" roughness={0.4} sheen={1} />
      </mesh>
      <mesh position={[rx, TABLE_TOP + 0.045, rz]} rotation={[0, 0.25, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.46, 32]} />
        <meshStandardMaterial color="#c9a57c" roughness={0.9} />
      </mesh>
      <mesh position={[rx + 0.02, TABLE_TOP + 0.13, rz - 0.06]} rotation={[0, 0.1, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.42, 32]} />
        <meshStandardMaterial color="#efc9c3" roughness={0.85} />
      </mesh>
      {at.vase && (
        <mesh position={[at.vase[0], TABLE_TOP + 0.07, at.vase[1]]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.045, 0.14, 24]} />
          <meshPhysicalMaterial color="#e9eef0" roughness={0.1} transmission={0.6} thickness={0.05} />
        </mesh>
      )}
    </group>
  )
}

/** Oak frame, white marble top. */
function AtelierTable() {
  const top = marble('#f4f1ec', '#b9b2a8', 3)
  const oak = wood('#cfae84', '#8a6440', 5)
  const legs: [number, number][] = [[-0.86, -0.38], [0.86, -0.38], [-0.86, 0.38], [0.86, 0.38]]
  return (
    <group position={[BENCH_ROOT.x, 0, BENCH_ROOT.z]}>
      <mesh position-y={TABLE_TOP - 0.022} castShadow receiveShadow>
        <boxGeometry args={[1.94, 0.044, 0.94]} />
        <meshPhysicalMaterial map={top} roughness={0.22} clearcoat={0.6} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position-y={TABLE_TOP - 0.09} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.09, 0.82]} />
        <meshStandardMaterial map={oak} roughness={0.6} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, (TABLE_TOP - 0.05) / 2, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.032, 0.022, TABLE_TOP - 0.05, 4, 1]} />
          <meshStandardMaterial map={oak} roughness={0.6} />
        </mesh>
      ))}
      <TableProps at={{ rolls: [-0.62, -0.2], spool: [0.64, 0.2], vase: [0.66, -0.22] }} />
    </group>
  )
}

/** Round pink-marble café table on a brass pedestal. */
function CafeTable() {
  const top = marble('#efd6d1', '#c79c95', 4)
  return (
    <group position={[BENCH_ROOT.x, 0, BENCH_ROOT.z]}>
      <mesh position-y={TABLE_TOP - 0.02} castShadow receiveShadow>
        <cylinderGeometry args={[0.66, 0.66, 0.04, 96]} />
        <meshPhysicalMaterial map={top} roughness={0.2} clearcoat={0.7} clearcoatRoughness={0.2} />
      </mesh>
      <mesh position-y={TABLE_TOP - 0.05} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.02, 64]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position-y={(TABLE_TOP - 0.06) / 2 + 0.03} castShadow>
        <cylinderGeometry args={[0.035, 0.045, TABLE_TOP - 0.1, 24]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position-y={0.025} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.05, 48]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <TableProps at={{ rolls: [-0.36, -0.28], spool: [0.42, 0.18], vase: [0.36, -0.3] }} />
    </group>
  )
}

/** One flickering candle flame. */
function Flame({ position, phase }: { position: [number, number, number]; phase: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const reduced = useUI((s) => s.reducedMotion)
  useFrame(({ clock }) => {
    if (reduced) return
    const t = clock.elapsedTime * 9 + phase
    const k = 1 + Math.sin(t) * 0.08 + Math.sin(t * 2.3) * 0.05
    ref.current.scale.set(1, k, 1)
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.011, 12, 10]} />
      <meshBasicMaterial color={new THREE.Color('#ffc46b').multiplyScalar(6)} toneMapped={false} />
    </mesh>
  )
}

/** Walnut table with pillar candles. */
function WalnutTable() {
  const top = wood('#6b4630', '#2e1b10', 8)
  const candles: [number, number, number][] = [
    [-0.66, -0.26, 0.16],
    [-0.54, -0.18, 0.11],
    [-0.72, -0.12, 0.08],
  ]
  return (
    <group position={[BENCH_ROOT.x, 0, BENCH_ROOT.z]}>
      <mesh position-y={TABLE_TOP - 0.03} castShadow receiveShadow>
        <boxGeometry args={[1.94, 0.06, 0.94]} />
        <meshPhysicalMaterial map={top} roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.3} />
      </mesh>
      {[-0.74, 0.74].map((x) => (
        <mesh key={x} position={[x, (TABLE_TOP - 0.06) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.07, TABLE_TOP - 0.06, 0.7]} />
          <meshStandardMaterial map={top} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[1.48, 0.05, 0.05]} />
        <meshStandardMaterial map={top} roughness={0.45} />
      </mesh>
      {/* brass tray + candles */}
      <mesh position={[-0.64, TABLE_TOP + 0.006, -0.19]} receiveShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.012, 48]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {candles.map(([x, z, h], i) => (
        <group key={i}>
          <mesh position={[x, TABLE_TOP + 0.012 + h / 2, z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.032, 0.032, h, 24]} />
            <meshPhysicalMaterial color="#fbf3e4" roughness={0.6} transmission={0.15} thickness={0.04} emissive="#ffb766" emissiveIntensity={0.08} />
          </mesh>
          <Flame position={[x, TABLE_TOP + 0.012 + h + 0.018, z]} phase={i * 2.1} />
        </group>
      ))}
      <pointLight position={[-0.62, TABLE_TOP + 0.3, -0.18]} color="#ffb870" intensity={1.6} distance={3.2} decay={2} />
      <TableProps at={{ rolls: [0.56, -0.24], spool: [0.66, 0.22] }} />
    </group>
  )
}

/* ------------------------------------------------------------------ light */

/** Key light follows whichever station is active so its shadow map stays crisp. */
function KeyLight({ theme }: { theme: RoomTheme }) {
  const mode = useUI((s) => s.mode)
  const l = theme.light
  const light = useRef<THREE.DirectionalLight>(null!)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const at = mode === 'hero' ? HERO_ROOT : BENCH_ROOT
    const d = light.current
    d.position.set(at.x + l.keyOffset[0], l.keyOffset[1], at.z + l.keyOffset[2])
    d.target.position.set(at.x, at.y, at.z)
    scene.add(d.target)
    d.shadow.needsUpdate = true
    return () => void scene.remove(d.target)
  }, [mode, scene, l])
  return (
    <directionalLight
      ref={light}
      intensity={l.keyI}
      color={l.key}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-radius={6}
      shadow-camera-left={-1.4}
      shadow-camera-right={1.4}
      shadow-camera-top={1.4}
      shadow-camera-bottom={-1.4}
      shadow-camera-near={0.5}
      shadow-camera-far={10}
    />
  )
}

/* ------------------------------------------------------------------ room */

function Floor({ theme }: { theme: RoomTheme }) {
  const map = useMemo(() => {
    const f = theme.floor
    const src = f.kind === 'herringbone' ? herringbone(f.a, f.b) : checker(f.a, f.b)
    const t = src.clone()
    t.needsUpdate = true
    t.repeat.set(16 / f.tile, 12 / f.tile)
    if (f.kind === 'checker') {
      t.center.set(0.5, 0.5)
      t.rotation = Math.PI / 4
    }
    return t
  }, [theme.floor])
  useEffect(() => () => map.dispose(), [map])
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial map={map} roughness={theme.floor.rough} />
    </mesh>
  )
}

export function Studio() {
  const room = useRoom((s) => s.room)
  const theme = roomById(room)
  const l = theme.light
  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.bg, 7, 18]} />
      <hemisphereLight args={[l.sky, l.ground, l.hemi]} />
      <KeyLight theme={theme} />
      {/* soft front fill so paper facing the viewer stays bright */}
      <directionalLight position={[0.6, 3, 6]} intensity={l.fill} color={l.fillColor} />
      <Environment key={theme.id} resolution={256} frames={1} environmentIntensity={l.env}>
        <Lightformer form="rect" intensity={4} color={l.forms[0]} position={[-3, 2.5, -5]} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={2.5} color={l.forms[0]} position={[2, 2.5, -5]} scale={[3, 3, 1]} />
        <Lightformer form="circle" intensity={1.6} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={6} />
        <Lightformer form="rect" intensity={1.2} color={l.forms[1]} position={[5, 2, 3]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.0} color={l.forms[2]} position={[0, 2, 6]} rotation-y={Math.PI} scale={[8, 4, 1]} />
      </Environment>

      <Floor theme={theme} />
      <mesh position={[0, 2.6, WALL_Z]} receiveShadow>
        <planeGeometry args={[16, 5.2]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-7, 2.6, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 5.2]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>
      <mesh position={[7, 2.6, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 5.2]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.6, 6]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[16, 5.2]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>
      <Wainscot theme={theme} />

      <ArchWindow x={-3.3} theme={theme} />
      <ArchWindow x={2.2} w={1.6} theme={theme} />
      {theme.sconces && (
        <>
          <Sconce x={0.45} y={1.95} />
          <Sconce x={4.0} y={1.95} />
        </>
      )}
      <Shelf theme={theme} />
      <PottedTree position={[-1.3, 0, -3.35]} height={1.9} theme={theme} seed={2} />
      <PottedTree position={[3.85, 0, -3.15]} height={1.55} theme={theme} seed={5} />
      <Pedestal theme={theme} />
      {theme.table === 'atelier' && <AtelierTable />}
      {theme.table === 'cafe' && <CafeTable />}
      {theme.table === 'walnut' && <WalnutTable />}
    </>
  )
}
