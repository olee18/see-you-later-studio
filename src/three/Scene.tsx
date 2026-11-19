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
import { photoFrame, usePhoto, type PhotoAngle } from '../state/photo'
import { useDesign, useUI } from '../state/store'
import { GiftBouquet } from './GiftBouquet'
import { bagSize, bouquetLift, boxRadius, bucketRadius, heartWidth, isContainer, type ShapeId } from '../gift/shapes'
import { BENCH_ROOT, HERO_ROOT, stage } from './stage'
import { Studio } from './Studio'

const FOV = 35
const HERO_DESIGN = giftFromStyle('sweet-pink', 'L')
const HERO_DIMS = dimsFor(HERO_DESIGN.items.length)

type Mode = 'hero' | 'arrange' | 'photo'

/** Desktop: options panel on the right. Mobile: options sheet at the bottom. Photo: centre of the photo frame. */
function panelOffset(w: number, h: number, mode: Mode) {
  if (mode === 'photo') {
    const f = photoFrame(w, h)
    return { x: f.cx - w / 2, y: h / 2 - f.cy }
  }
  if (mode !== 'arrange') return { x: 0, y: 0 }
  if (w >= 820) return { x: -219, y: 0 }
  return { x: 0, y: Math.min(220, h * 0.25) }
}

/** Frame the whole bouquet (paper peaks, flare and bow included). */
const ANGLES: Record<PhotoAngle, { elev: number; az: number; dist: number }> = {
  three: { elev: 22, az: 32, dist: 1 },
  front: { elev: 9, az: 0, dist: 1 },
  top: { elev: 55, az: 0, dist: 1 },
  close: { elev: 20, az: -18, dist: 0.6 },
}

/** Half-width of the whole bouquet for each shape (wrap flare, box, or just the flowers). */
function halfWidth(shape: ShapeId, d: Dims) {
  if (shape === 'handtied') return d.rimR * 1.06 + 0.06
  if (shape === 'cone') return d.rimR * 1.12 + 0.08 + 0.1 * d.S
  if (shape === 'box') return Math.max(boxRadius(d), d.rimR * 1.06) + 0.05
  if (shape === 'posy') return d.rimR * 1.3 + 0.06
  if (shape === 'heartbox') return Math.max(heartWidth(d) / 2, d.rimR * 1.06) + 0.04
  if (shape === 'bag') return Math.max(bagSize(d).w / 2, d.rimR * 1.06) + 0.05
  if (shape === 'bucket') return Math.max(bucketRadius(d), d.rimR * 1.06) + 0.05
  return d.rimR * 1.06 + 0.12 + 0.2 * d.S
}

function shotFor(mode: Mode, w: number, h: number, dims: Dims, angle: PhotoAngle = 'three', lift = 0, shape: ShapeId = 'korean') {
  const narrow = w < h * 0.95
  const root = mode === 'hero' ? HERO_ROOT : BENCH_ROOT
  // containers have no paper peaking above the flowers: frame table-to-top instead
  const box = isContainer(shape)
  const H = box ? dims.topY + lift + 0.06 + 0.14 : dims.topY + 0.26 + lift
  const W = 2 * halfWidth(shape, dims)
  const t = Math.tan(((FOV / 2) * Math.PI) / 180)
  if (mode === 'photo') {
    // fit the bouquet inside the 4:5 photo frame
    const f = photoFrame(w, h)
    const a = ANGLES[angle]
    const d = Math.max(((H / 2) * 1.3 * h) / (t * f.h), ((W / 2) * 1.18 * h) / (t * f.w)) * a.dist
    const elev = (a.elev * Math.PI) / 180
    const az = (a.az * Math.PI) / 180
    const target = root.clone().add(new THREE.Vector3(0, angle === 'close' ? lift + dims.topY * 0.78 : box ? -0.06 + H * 0.42 : H * (angle === 'top' ? 0.5 : 0.4), 0))
    const pos = target.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(elev) * d, Math.sin(elev) * d, Math.cos(az) * Math.cos(elev) * d))
    return { pos, target }
  }
  const aspect = (mode === 'arrange' && !narrow ? w - 456 : w) / h
  // arrange: a little extra room so the toolbar never covers the bottom of the bouquet
  const fit = mode === 'arrange' ? 1.12 : 1
  let d = Math.max(((H / 2) * 1.22 * fit) / t, ((W / 2) * 1.18 * fit) / (t * aspect))
  if (mode === 'arrange' && narrow) d *= 1.4
  const elev = (mode === 'hero' ? 22 : 30) * (Math.PI / 180)
  const target = root.clone().add(new THREE.Vector3(0, box ? -0.06 + H * 0.46 : H * (mode === 'arrange' ? 0.42 : 0.46), 0))
  if (mode === 'hero' && !narrow) target.x -= d * 0.2
  if (mode === 'hero' && narrow) target.y -= H * 0.32
  const pos = target.clone().add(new THREE.Vector3(mode === 'hero' ? d * 0.12 : 0, Math.sin(elev) * d, Math.cos(elev) * d))
  return { pos, target }
}

function CameraRig() {
  const mode = useUI((s) => s.mode)
  const reduced = useUI((s) => s.reducedMotion)
  // re-frame only when the bouquet grows/shrinks noticeably (not on every flower)
  const bucket = useDesign((s) => Math.round(s.design.items.length / 6))
  const angle = usePhoto((s) => s.angle)
  const shape = useDesign((s) => s.design.shape)
  const stand = useDesign((s) => s.design.stand)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null!)
  const offset = useRef({ x: 0, y: 0 })
  const last = useRef<{ mode: string; S: number; angle: PhotoAngle } | null>(null)
  const dims = useMemo(() => (mode === 'hero' ? HERO_DIMS : dimsFor(Math.max(12, bucket * 6))), [mode, bucket])
  const lift = mode === 'hero' ? bouquetLift(HERO_DESIGN.shape, HERO_DESIGN.stand, HERO_DIMS) : bouquetLift(shape, stand, dims)

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
    const shot = shotFor(mode, size.width, size.height, dims, angle, lift, mode === 'hero' ? HERO_DESIGN.shape : shape)
    const off = panelOffset(size.width, size.height, mode)
    const prev = last.current
    last.current = { mode, S: dims.S + lift + halfWidth(shape, dims), angle }
    const modeChanged = !prev || prev.mode !== mode
    const sizeChanged = !!prev && (Math.abs(prev.S - (dims.S + lift + halfWidth(shape, dims))) > 1e-4 || (mode === 'photo' && prev.angle !== angle))
    // the long arcing move is only for travelling between the two stations
    const travel = modeChanged && (prev?.mode === 'hero' || mode === 'hero')

    if (!prev || reduced || (!modeChanged && !sizeChanged)) {
      // first frame, reduced motion, or a resize: jump straight to the framing
      camera.position.copy(shot.pos)
      c.target.copy(shot.target)
      offset.current = off
      applyOffset()
      c.update()
      c.enabled = mode !== 'hero'
      return
    }
    c.enabled = false
    useUI.getState().set({ cameraBusy: travel })
    const tl = gsap.timeline({
      onUpdate: () => {
        applyOffset()
        c.update()
      },
      onComplete: () => {
        c.enabled = useUI.getState().mode !== 'hero'
        useUI.getState().set({ cameraBusy: false })
      },
    })
    if (travel) {
      const mid = camera.position.clone().lerp(shot.pos, 0.5)
      mid.y += 0.35
      mid.z += 0.6
      tl.to(camera.position, { x: mid.x, y: mid.y, z: mid.z, duration: 1.0, ease: 'power2.in' }, 0)
        .to(camera.position, { x: shot.pos.x, y: shot.pos.y, z: shot.pos.z, duration: 1.1, ease: 'power3.out' }, 1.0)
        .to(c.target, { x: shot.target.x, y: shot.target.y, z: shot.target.z, duration: 2.1, ease: 'power3.inOut' }, 0)
        .to(offset.current, { x: off.x, y: off.y, duration: 2.1, ease: 'power3.inOut' }, 0)
    } else {
      // bouquet size, photo angle or arrange <-> photo: glide to the new framing
      const dur = modeChanged ? 1.1 : 0.9
      tl.to(camera.position, { x: shot.pos.x, y: shot.pos.y, z: shot.pos.z, duration: dur, ease: 'power2.inOut' }, 0)
        .to(c.target, { x: shot.target.x, y: shot.target.y, z: shot.target.z, duration: dur, ease: 'power2.inOut' }, 0)
        .to(offset.current, { x: off.x, y: off.y, duration: dur, ease: 'power2.inOut' }, 0)
    }
    return () => {
      tl.kill()
      useUI.getState().set({ cameraBusy: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dims, size.width, size.height, angle, lift, shape])

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

/** Hands the finished frame (after post-processing) to a pending photo capture. */
function Capturer() {
  useFrame(({ gl }) => {
    const job = stage.capture
    if (!job) return
    stage.capture = null
    job(gl.domElement)
  }, 2)
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
  const n = design.items.length
  useEffect(() => {
    stage.lift = bouquetLift(design.shape, design.stand, dimsFor(n))
  }, [design.shape, design.stand, n])
  const reduced = useUI((s) => s.reducedMotion)
  return (
    <group position={BENCH_ROOT}>
      <GiftBouquet design={design} sway={!reduced} animate={!reduced} interactive />
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
      onPointerMissed={() => {
        const ui = useUI.getState()
        if (ui.dragHead == null && !ui.libDrag) ui.set({ selected: null })
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
      <StageBridge />
      <Capturer />
      <Effects />
    </Canvas>
  )
}
