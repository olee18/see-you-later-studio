import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, SSAO, ToneMapping } from '@react-three/postprocessing'
import gsap from 'gsap'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { sampleDesign, useDesign, useUI } from '../state/store'
import { Bouquet } from './Bouquet'
import { BENCH_ROOT, CAMERAS, HERO_ROOT, stage } from './stage'
import { Studio } from './Studio'

/** Desktop: library panel on the left. Mobile: library sheet at the bottom. */
function panelOffset(w: number, h: number, mode: 'hero' | 'arrange') {
  if (mode !== 'arrange') return { x: 0, y: 0 }
  if (w >= 820) return { x: 150, y: 0 }
  return { x: 0, y: Math.min(110, h * 0.12) }
}

function presetFor(mode: 'hero' | 'arrange', narrow: boolean) {
  if (mode === 'hero') return narrow ? CAMERAS.heroNarrow : CAMERAS.hero
  return narrow ? CAMERAS.benchNarrow : CAMERAS.bench
}

function CameraRig() {
  const mode = useUI((s) => s.mode)
  const reduced = useUI((s) => s.reducedMotion)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null!)
  const first = useRef(true)
  const offset = useRef({ x: 0, y: 0 })
  const narrow = size.width < size.height * 0.95

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
    const preset = presetFor(mode, narrow)
    const off = panelOffset(size.width, size.height, mode)
    const ui = useUI.getState()
    c.enabled = false
    if (first.current || reduced) {
      first.current = false
      camera.position.copy(preset.pos)
      c.target.copy(preset.target)
      offset.current = off
      applyOffset()
      c.update()
      c.enabled = mode === 'arrange'
      return
    }
    ui.set({ cameraBusy: true })
    // lift the camera slightly mid-flight for a gentle arc
    const mid = camera.position.clone().lerp(preset.pos, 0.5)
    mid.y += 0.35
    mid.z += 0.6
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
    tl.to(camera.position, { x: mid.x, y: mid.y, z: mid.z, duration: 1.0, ease: 'power2.in' }, 0)
      .to(camera.position, { x: preset.pos.x, y: preset.pos.y, z: preset.pos.z, duration: 1.1, ease: 'power3.out' }, 1.0)
      .to(c.target, { x: preset.target.x, y: preset.target.y, z: preset.target.z, duration: 2.1, ease: 'power3.inOut' }, 0)
      .to(offset.current, { x: off.x, y: off.y, duration: 2.1, ease: 'power3.inOut' }, 0)
    return () => {
      tl.kill()
      useUI.getState().set({ cameraBusy: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // keep the panel offset right when the window resizes
  useEffect(() => {
    if (useUI.getState().cameraBusy) return
    offset.current = panelOffset(size.width, size.height, mode)
    applyOffset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height])

  // portrait <-> landscape: re-frame the shot
  const lastNarrow = useRef(narrow)
  useEffect(() => {
    if (lastNarrow.current === narrow || useUI.getState().cameraBusy) return
    lastNarrow.current = narrow
    const preset = presetFor(mode, narrow)
    camera.position.copy(preset.pos)
    controls.current.target.copy(preset.target)
    controls.current.update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.65}
      maxDistance={3.0}
      minPolarAngle={0.2}
      maxPolarAngle={1.62}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
    />
  )
}

function PickBridge() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    stage.camera = camera
    stage.dom = gl.domElement
    stage.gl = gl
    stage.scene = scene
  }, [camera, gl, scene])
  return null
}

function HeroStation() {
  const design = useMemo(sampleDesign, [])
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
        <Bouquet design={design} sway={!reduced} />
      </group>
    </group>
  )
}

function BenchStation() {
  const design = useDesign((s) => s.design)
  const reduced = useUI((s) => s.reducedMotion)
  return (
    <group position={BENCH_ROOT}>
      <Bouquet design={design} interactive sway={!reduced} />
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
      camera={{ fov: 35, near: 0.05, far: 40, position: CAMERAS.hero.pos.toArray() }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => {
        const ui = useUI.getState()
        if (!ui.drag3d && !ui.libDrag) ui.set({ selectedId: null })
      }}
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
      <PickBridge />
      <Effects />
    </Canvas>
  )
}
