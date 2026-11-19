import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useDesign, useUI } from '../state/store'
import type { LightMood } from '../state/types'
import { BENCH_ROOT, HERO_ROOT } from './stage'

const FLOOR = '#e7d9c7'

/** Lighting moods: hemisphere fill, key "sun" through the window, window glow, IBL strength. */
export const MOODS: Record<LightMood, { sky: string; ground: string; hemi: number; sun: string; sunI: number; sunOffset: [number, number, number]; glow: string; glowI: number; env: number }> = {
  morning: { sky: '#fffaf3', ground: '#eadccb', hemi: 0.9, sun: '#fff2e2', sunI: 2.6, sunOffset: [-2.2, 4.2, -2.4], glow: '#fffaf2', glowI: 2.2, env: 1.15 },
  golden: { sky: '#ffe6c8', ground: '#d9b48f', hemi: 0.65, sun: '#ffb25e', sunI: 3.4, sunOffset: [-3.4, 2.1, -1.6], glow: '#ffd29a', glowI: 2.5, env: 0.85 },
  studio: { sky: '#ffffff', ground: '#dcdcdc', hemi: 1.05, sun: '#ffffff', sunI: 1.9, sunOffset: [0.9, 4.6, 2.6], glow: '#f2f5ff', glowI: 1.5, env: 1.35 },
}

function Window({ position, size = [2.2, 2.6] as [number, number], glow }: { position: [number, number, number]; size?: [number, number]; glow: THREE.Color }) {
  const [w, h] = size
  const frame = '#fbf7f2'
  const bars: [number, number, number, number][] = [
    // x, y, width, height
    [0, h / 2, w + 0.12, 0.08],
    [0, -h / 2, w + 0.12, 0.08],
    [-w / 2, 0, 0.08, h],
    [w / 2, 0, 0.08, h],
    [0, 0, 0.05, h],
    [0, h / 6, w, 0.04],
    [0, -h / 6, w, 0.04],
  ]
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      {bars.map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0.03]} castShadow>
          <boxGeometry args={[bw, bh, 0.06]} />
          <meshStandardMaterial color={frame} roughness={0.6} />
        </mesh>
      ))}
      {/* sill */}
      <mesh position={[0, -h / 2 - 0.06, 0.1]} receiveShadow>
        <boxGeometry args={[w + 0.3, 0.05, 0.22]} />
        <meshStandardMaterial color={frame} roughness={0.5} />
      </mesh>
      {/* sheer curtain */}
      <mesh position={[-w / 2 - 0.25, -0.05, 0.12]}>
        <planeGeometry args={[0.55, h + 0.5, 1, 1]} />
        <meshStandardMaterial color="#fffaf5" transparent opacity={0.55} side={THREE.DoubleSide} roughness={1} />
      </mesh>
    </group>
  )
}

function Pedestal() {
  return (
    <group position={[HERO_ROOT.x, 0, HERO_ROOT.z]}>
      <mesh position-y={0.5} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.29, 1.0, 64]} />
        <meshPhysicalMaterial color="#f4efe9" roughness={0.32} clearcoat={0.35} />
      </mesh>
      <mesh position-y={1.0 - 0.012} castShadow receiveShadow>
        <cylinderGeometry args={[0.31, 0.31, 0.024, 64]} />
        <meshPhysicalMaterial color="#efe6dc" roughness={0.28} clearcoat={0.5} />
      </mesh>
      <mesh position-y={0.015} receiveShadow>
        <cylinderGeometry args={[0.33, 0.33, 0.03, 64]} />
        <meshPhysicalMaterial color="#efe6dc" roughness={0.3} />
      </mesh>
    </group>
  )
}

const TABLE_TOP = BENCH_ROOT.y - 0.06 // holder bottom sits on the surface

function Workbench() {
  const legs: [number, number][] = [[-0.82, -0.36], [0.82, -0.36], [-0.82, 0.36], [0.82, 0.36]]
  return (
    <group position={[BENCH_ROOT.x, 0, BENCH_ROOT.z]}>
      <mesh position-y={TABLE_TOP - 0.025} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.05, 0.92]} />
        <meshStandardMaterial color="#dcc6a8" roughness={0.55} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, (TABLE_TOP - 0.05) / 2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, TABLE_TOP - 0.05, 12]} />
          <meshStandardMaterial color="#cbb291" roughness={0.6} />
        </mesh>
      ))}
      {/* linen runner */}
      <mesh position={[0, TABLE_TOP + 0.001, 0.02]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[0.9, 0.62]} />
        <meshStandardMaterial color="#f3ece2" roughness={1} />
      </mesh>
      {/* ribbon spool + paper roll props */}
      <mesh position={[0.62, TABLE_TOP + 0.03, 0.2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 32]} />
        <meshPhysicalMaterial color="#d8a3a5" roughness={0.4} sheen={1} />
      </mesh>
      <mesh position={[-0.62, TABLE_TOP + 0.045, -0.18]} rotation={[0, 0.25, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.5, 32]} />
        <meshStandardMaterial color="#c9a57c" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, TABLE_TOP + 0.13, -0.24]} rotation={[0, 0.1, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.46, 32]} />
        <meshStandardMaterial color="#efc9c3" roughness={0.85} />
      </mesh>
    </group>
  )
}

function Shelf() {
  const vases: [number, number, number, string][] = [
    [-0.45, 0.12, 0.05, '#e8ddd0'],
    [-0.2, 0.18, 0.04, '#c9d3c3'],
    [0.25, 0.1, 0.06, '#efd9d2'],
  ]
  return (
    <group position={[-0.55, 1.55, -3.85]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.04, 0.26]} />
        <meshStandardMaterial color="#e4d3bd" roughness={0.6} />
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

/** Key light follows whichever station is active so its shadow map stays crisp. */
function SunLight({ mood }: { mood: LightMood }) {
  const mode = useUI((s) => s.mode)
  const m = MOODS[mood]
  const light = useRef<THREE.DirectionalLight>(null!)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const at = mode === 'hero' ? HERO_ROOT : BENCH_ROOT
    const l = light.current
    l.position.set(at.x + m.sunOffset[0], m.sunOffset[1], at.z + m.sunOffset[2])
    l.target.position.set(at.x, at.y, at.z)
    scene.add(l.target)
    l.shadow.needsUpdate = true
    return () => void scene.remove(l.target)
  }, [mode, scene, m])
  return (
    <directionalLight
      ref={light}
      intensity={m.sunI}
      color={m.sun}
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

export function Studio() {
  const bg = useDesign((s) => s.design.background)
  const m = MOODS[bg.mood]
  const wall = useMemo(() => new THREE.Color(bg.color).multiplyScalar(0.975), [bg.color])
  const glow = useMemo(() => new THREE.Color(m.glow).multiplyScalar(m.glowI), [m])
  return (
    <>
      <color attach="background" args={[bg.color]} />
      <fog attach="fog" args={[bg.color, 7, 18]} />
      <hemisphereLight args={[m.sky, m.ground, m.hemi]} />
      <SunLight mood={bg.mood} />
      <Environment resolution={256} frames={1} environmentIntensity={m.env}>
        <Lightformer form="rect" intensity={4} color="#fff6ea" position={[-3, 2.5, -5]} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#fff6ea" position={[2, 2.5, -5]} scale={[3, 3, 1]} />
        <Lightformer form="circle" intensity={1.6} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={6} />
        <Lightformer form="rect" intensity={1.2} color="#ffe6d6" position={[5, 2, 3]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.0} color="#fff9f2" position={[0, 2, 6]} rotation-y={Math.PI} scale={[8, 4, 1]} />
      </Environment>

      {/* room */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color={FLOOR} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.6, -4]} receiveShadow>
        <planeGeometry args={[16, 5.2]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[-7, 2.6, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 5.2]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[7, 2.6, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 5.2]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.6, 6]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[16, 5.2]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      {/* baseboard */}
      <mesh position={[0, 0.06, -3.98]}>
        <boxGeometry args={[16, 0.12, 0.03]} />
        <meshStandardMaterial color="#fbf7f2" roughness={0.6} />
      </mesh>

      <Window position={[-3.4, 2.15, -3.97]} glow={glow} />
      <Window position={[2.4, 2.15, -3.97]} size={[1.8, 2.6]} glow={glow} />
      <Shelf />
      <Pedestal />
      <Workbench />
    </>
  )
}
