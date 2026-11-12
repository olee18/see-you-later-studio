import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FLOWERS } from '../data/flowers'
import { BIND, HEAD_SCALE, stemTarget } from '../state/layout'
import { useDesign, useUI } from '../state/store'
import type { Design } from '../state/types'
import { StemView } from './StemView'

// ---------------------------------------------------------------- wrapping cone

const CONE_Y0 = 0.13
const CONE_R0 = 0.045
const CONE_SLOPE = 0.62

function coneRadius(y: number) {
  return CONE_R0 + (y - CONE_Y0) * CONE_SLOPE
}

/** Open paper cone, higher at the back, with a soft wavy, slightly crumpled rim. */
function makeWrapGeometry(scale: number, topBase: number, backRise: number, phase: number, seed: number) {
  const segA = 72
  const segV = 14
  const pos: number[] = []
  const uv: number[] = []
  const t: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= segV; j++) {
    const v = j / segV
    for (let i = 0; i <= segA; i++) {
      const th = (i / segA) * Math.PI * 2
      const top = topBase + backRise * Math.max(0, -Math.sin(th + phase)) + 0.012 * Math.sin(th * 6 + phase * 3)
      const y = CONE_Y0 + (top - CONE_Y0) * v
      const crumple = 1 + 0.035 * v * v * (Math.sin(th * 7 + seed) + 0.5 * Math.sin(th * 13 + seed * 2.3))
      const r = (coneRadius(y) + 0.025 * v * v * v) * scale * crumple
      pos.push(r * Math.cos(th), y, r * Math.sin(th))
      uv.push(i / segA, v)
      t.push(v)
    }
  }
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segA; i++) {
      const a = j * (segA + 1) + i
      const b = a + segA + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Wrap({ wrap }: { wrap: Design['wrap'] }) {
  const outer = useMemo(() => makeWrapGeometry(1, 0.4, 0.12, 0, 7), [])
  const inner = useMemo(() => makeWrapGeometry(0.965, 0.38, 0.1, 0.7, 13), [])
  useEffect(() => () => { outer.dispose(); inner.dispose() }, [outer, inner])
  return (
    <group>
      <mesh geometry={outer} castShadow receiveShadow>
        <meshPhysicalMaterial color={wrap.color} roughness={0.82} sheen={0.4} sheenColor="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={inner} receiveShadow>
        <meshPhysicalMaterial color={wrap.color2} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Ribbon({ ribbon }: { ribbon: Design['ribbon'] }) {
  const y = BIND.y
  const r = coneRadius(y) + 0.003
  return (
    <group position-y={y}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r * 0.98, ribbon.width, 48, 1, true]} />
        <meshPhysicalMaterial color={ribbon.color} roughness={0.35} sheen={1} sheenColor="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      {ribbon.bow !== 'none' && (
        <group position={[0, 0, r + 0.004]}>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.028, 0.004, 0.004]} rotation={[0.2, sx * 0.35, sx * 0.25]} scale={[1, 0.62, 0.45]} castShadow>
              <torusGeometry args={[0.026, 0.0055, 10, 32]} />
              <meshPhysicalMaterial color={ribbon.color} roughness={0.35} sheen={1} />
            </mesh>
          ))}
          <mesh scale={[1, 0.8, 0.7]} castShadow>
            <sphereGeometry args={[0.009, 16, 12]} />
            <meshPhysicalMaterial color={ribbon.color} roughness={0.35} sheen={1} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={`t${sx}`} position={[sx * 0.016, -0.045, 0.006]} rotation={[0.15, 0, sx * 0.32]} castShadow>
              <boxGeometry args={[ribbon.width * 0.8, 0.085, 0.0012]} />
              <meshPhysicalMaterial color={ribbon.color} roughness={0.35} sheen={1} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/** Ceramic stand that holds the bouquet upright. */
function Holder() {
  const geo = useMemo(() => {
    const pts = [
      [0.0, -0.06], [0.085, -0.06], [0.09, -0.05], [0.082, 0.0], [0.092, 0.085], [0.1, 0.098], [0.094, 0.102], [0.084, 0.094], [0.0, 0.05],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial color="#efe7de" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.3} />
    </mesh>
  )
}

/** Translucent preview of where a dragged flower will land. */
function DropGhost() {
  const libDrag = useUI((s) => s.libDrag)
  const drag3d = useUI((s) => s.drag3d)
  const stems = useDesign((s) => s.design.stems)
  const ring = useRef<THREE.Mesh>(null!)

  let spec: { type: keyof typeof FLOWERS; slot: number; dh: number } | null = null
  if (libDrag && libDrag.slot != null) spec = { type: libDrag.type, slot: libDrag.slot, dh: 0 }
  else if (drag3d && drag3d.snap != null) {
    const s = stems.find((x) => x.id === drag3d.id)
    if (s) spec = { type: s.type, slot: drag3d.snap, dh: s.dh }
  }

  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.08)
  })

  if (!spec) return null
  const t = stemTarget({ ...spec, dr: 0, da: 0, lean: 0 })
  const hr = FLOWERS[spec.type].headRadius * HEAD_SCALE
  return (
    <group position={BIND} quaternion={t.quat}>
      <mesh position-y={t.length / 2}>
        <cylinderGeometry args={[0.003, 0.003, t.length, 6]} />
        <meshBasicMaterial color="#7f9c79" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position-y={t.length}>
        <sphereGeometry args={[hr * 0.75, 20, 14]} />
        <meshBasicMaterial color="#9db596" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={ring} position-y={t.length} rotation-x={Math.PI / 2}>
        <torusGeometry args={[hr * 1.05, 0.0025, 8, 40]} />
        <meshBasicMaterial color="#6f8f6a" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- bouquet

interface BouquetProps {
  design: Design
  interactive?: boolean
  sway?: boolean
}

export function Bouquet({ design, interactive = false, sway = true }: BouquetProps) {
  const selectedId = useUI((s) => (interactive ? s.selectedId : null))
  const removing = useUI((s) => (interactive ? s.removing : null))
  return (
    <group>
      <Holder />
      <Wrap wrap={design.wrap} />
      <Ribbon ribbon={design.ribbon} />
      {design.stems.map((s) => (
        <StemView
          key={s.id}
          stem={s}
          greenery={design.greenery}
          interactive={interactive}
          sway={sway}
          selected={s.id === selectedId}
          removing={!!removing?.includes(s.id)}
        />
      ))}
      {interactive && <DropGhost />}
    </group>
  )
}
