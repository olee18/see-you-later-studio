import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, SSAO, ToneMapping } from '@react-three/postprocessing'
import gsap from 'gsap'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { dimsFor, type Dims } from '../gift/layout'
import { giftFromStyle } from '../gift/styles'
import { useDesign, useUI } from '../state/store'
import { GiftBouquet } from './GiftBouquet'
import { BENCH_ROOT, HERO_ROOT, stage } from './stage'
import { Studio } from './Studio'

const FOV = 35
const HERO_DESIGN = giftFromStyle('sweet-pink', 'L')
const HERO_DIMS = dimsFor(HERO_DESIGN)

/** Desktop: options panel on the right. Mobile: options sheet at the bottom. */
function panelOffset(w: number, h: number, mode: 'hero' | 'arrange') {
  if (mode !== 'arrange') return { x: 0, y: 0 }
  if (w >= 820) return { x: -Math.min(190, w * 0.15), y: 0 }
  return { x: 0, y: Math.min(200, h * 0.22) }
}

/** Frame the whole bouquet (paper peaks, flare and bow included). */
function shotFor(mode: 'hero' | 'arrange', w: number, h: number, dims: Dims) {
  const narrow = w < h * 0.95
  const root = mode === 'hero' ? HERO_ROOT : BENCH_ROOT
  const H = dims.topY + 0.26
  const W = 2 * (dims.rimR * 1.06 + 0.12 + 0.2 * dims.S)
  const t = Math.tan(((FOV / 2) * Math.PI) / 180)
  const aspect = (mode === 'arrange' && !narrow ? w * 0.7 : w) / h
  let d = Math.max(((H / 2) * 1.22) / t, ((W / 2) * 1.18) / (t * aspect))
  if (mode === 'arrange' && narrow) d *= 1.3
  const elev = (mode === 'hero' ? 22 : 30) * (Math.PI / 180)
  const target = root.clone().add(new THREE.Vector3(0, H * 0.46, 0))
  if (mode === 'hero' && !narrow) target.x -= d * 0.2
  if (mode === 'hero' && narrow) target.y -= H * 0.32
  const pos = target.clone().add(new THREE.Vector3(mode === 'hero' ? d * 0.12 : 0, Math.sin(elev) * d, Math.cos(elev) * d))
  return { pos, target }
}

function CameraRig() {
  const mode = useUI((s) => s.mode)
  const reduced = useUI((s) => s.reducedMotion)
  const style = useDesign((s) => s.design.style)
  const sizeId = useDesign((s) => s.design.size)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null!)
  const offset = useRef({ x: 0, y: 0 })
  const last = useRef<{ mode: string; S: number } | null>(null)
  const dims = useMemo(() => (mode === 'hero' ? HERO_DIMS : dimsFor({ style, size: sizeId })), [mode, style, sizeId])

  const applyOffset = () => {
    const { x, y } = offset.current
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) camera.clearViewOffset()
    else camera.setViewOffset(size.width, size.height, -x, y, size.width, size.height)
  }

  useEffect(() => {
    stage.controls = controls.current
    return () => {
      stage.controls = null
    }
  }, [])

  useLayoutEffect(() => {
    const c = controls.current
    const shot = shotFor(mode, size.width, size.height, dims)
    const off = panelOffset(size.width, size.height, mode)
    const prev = last.current
    last.current = { mode, S: dims.S }
    const modeChanged = !prev || prev.mode !== mode
    const sizeChanged = !!prev && Math.abs(prev.S - dims.S) > 1e-4

    if (!prev || reduced || (!modeChanged && !sizeChanged)) {
      // first frame, reduced motion, or a resize: jump straight to the framing
      camera.position.copy(shot.pos)
      c.target.copy(shot.target)
      offset.current = off
      applyOffset()
      c.update()
      c.enabled = mode === 'arrange'
      return
    }
    c.enabled = false
    useUI.getState().set({ cameraBusy: modeChanged })
    const tl = gsap.timeline({
      onUpdate: () => {
        applyOffset()
        c.update()
      },
      onComplete: () => {
        c.enabled = useUI.getState().mode === 'arrange'
        useUI.getState().set({ cameraBusy: false })
      },
    })
    if (modeChanged) {
      const mid = camera.position.clone().lerp(shot.pos, 0.5)
      mid.y += 0.35
      mid.z += 0.6
      tl.to(camera.position, { x: mid.x, y: mid.y, z: mid.z, duration: 1.0, ease: 'power2.in' }, 0)
        .to(camera.position, { x: shot.pos.x, y: shot.pos.y, z: shot.pos.z, duration: 1.1, ease: 'power3.out' }, 1.0)
        .to(c.target, { x: shot.target.x, y: shot.target.y, z: shot.target.z, duration: 2.1, ease: 'power3.inOut' }, 0)
        .to(offset.current, { x: off.x, y: off.y, duration: 2.1, ease: 'power3.inOut' }, 0)
    } else {
      // bouquet size changed: glide to the new framing
      tl.to(camera.position, { x: shot.pos.x, y: shot.pos.y, z: shot.pos.z, duration: 0.9, ease: 'power2.inOut' }, 0)
        .to(c.target, { x: shot.target.x, y: shot.target.y, z: shot.target.z, duration: 0.9, ease: 'power2.inOut' }, 0)
    }
    return () => {
      tl.kill()
      useUI.getState().set({ cameraBusy: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dims, size.width, size.height])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.6}
      maxDistance={5}
      minPolarAngle={0.2}
      maxPolarAngle={1.62}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
    />
  )
}

function StageBridge() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    stage.camera = camera
    stage.gl = gl
    stage.scene = scene
  }, [camera, gl, scene])
  return null
}

function HeroStation() {
  const mode = useUI((s) => s.mode)
  const busy = useUI((s) => s.cameraBusy)
  const reduced = useUI((s) => s.reducedMotion)
  const spin = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    if (!reduced) spin.current.rotation.y += Math.min(dt, 0.1) * 0.12
  })
  return (
    <group position={HERO_ROOT} visible={mode === 'hero' || busy}>
      <group ref={spin}>
        <GiftBouquet design={HERO_DESIGN} sway={!reduced} animate={false} />
      </group>
    </group>
  )
}

function BenchStation() {
  const design = useDesign((s) => s.design)
  const reduced = useUI((s) => s.reducedMotion)
  return (
    <group position={BENCH_ROOT}>
      <GiftBouquet design={design} sway={!reduced} animate={!reduced} />
    </group>
  )
}

function Effects() {
  const low = useUI((s) => s.lowQuality)
  // mount SSAO one tick after the composer so its normal pass exists
  const [aoReady, setAoReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAoReady(true), 0)
    return () => clearTimeout(t)
  }, [])
  if (low || !aoReady)
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    )
  return (
    <EffectComposer multisampling={4} enableNormalPass>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={16}
        rings={4}
        radius={0.08}
        intensity={6}
        luminanceInfluence={0.5}
        worldDistanceThreshold={1.2}
        worldDistanceFalloff={0.4}
        worldProximityThreshold={0.08}
        worldProximityFalloff={0.04}
        color={new THREE.Color('#5a4038')}
      />
      <Bloom mipmapBlur intensity={0.32} luminanceThreshold={0.95} luminanceSmoothing={0.2} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}

export function Scene() {
  const low = useUI((s) => s.lowQuality)
  return (
    <Canvas
      shadows
      dpr={low ? [1, 1.25] : [1, 1.75]}
      camera={{ fov: FOV, near: 0.05, far: 40, position: [-2.4, 1.6, 2.2] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => useUI.getState().set({ lowQuality: true })}
        onIncline={() => useUI.getState().set({ lowQuality: false })}
        onFallback={() => useUI.getState().set({ lowQuality: true })}
      />
      <Studio />
      <HeroStation />
      <BenchStation />
      <CameraRig />
      <StageBridge />
      <Effects />
    </Canvas>
  )
}
