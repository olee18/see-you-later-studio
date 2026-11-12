import { useFrame, type ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BLOOM_OPEN, FLOWERS, mulberry32, type Part } from '../data/flowers'
import { BELOW_BIND, BIND, HEAD_SCALE, R_MAX, nearestFreeSlot, stemTarget, type StemTarget } from '../state/layout'
import { freshIds, useDesign, useUI } from '../state/store'
import type { Design, Stem } from '../state/types'
import { mainStemGeo } from './geometry'
import { SAGE, accentMaterial, createPetalMaterial, setPetalColors, type PetalMaterial } from './materials'
import { stage } from './stage'

interface Mats {
  petal: PetalMaterial
  center: THREE.MeshStandardMaterial
  leaf: THREE.MeshStandardMaterial
  stem: THREE.MeshStandardMaterial
}

const _c = new THREE.Color()

function makeInstanced(p: Part, mats: Mats, seed: number) {
  const mat = p.role === 'accent' ? accentMaterial(p.accent ?? '#ffffff') : mats[p.role]
  const mesh = new THREE.InstancedMesh(p.geo, mat, p.matrices.length)
  const rnd = mulberry32(seed)
  p.matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m)
    // tiny per-petal brightness variation so nothing looks cloned
    mesh.setColorAt(i, _c.setScalar(0.9 + rnd() * 0.1))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.computeBoundingSphere()
  return mesh
}

interface Props {
  stem: Stem
  greenery: Design['greenery']
  interactive: boolean
  sway: boolean
  selected?: boolean
  removing?: boolean
}

export const StemView = memo(function StemView({ stem, greenery, interactive, sway, selected = false, removing = false }: Props) {
  const def = FLOWERS[stem.type]

  const parts = useMemo(
    () => def.build(BLOOM_OPEN[stem.bloom], mulberry32(stem.seed)),
    [def, stem.bloom, stem.seed],
  )

  const mats = useMemo<Mats>(
    () => ({
      petal: createPetalMaterial(),
      center: new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      leaf: new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])

  useEffect(() => {
    setPetalColors(mats.petal, stem.colors.petal, stem.colors.petal2, stem.colors.gradient)
    mats.center.color.set(stem.colors.center)
    mats.leaf.color.set(greenery.leaf)
    mats.stem.color.set(greenery.stem)
  }, [mats, stem.colors, greenery])

  const meshes = useMemo(() => {
    const head: THREE.InstancedMesh[] = []
    const onStem: THREE.InstancedMesh[] = []
    parts.forEach((p, i) => (p.onStem ? onStem : head).push(makeInstanced(p, mats, stem.seed + i)))
    return { head, onStem }
  }, [parts, mats, stem.seed])
  useEffect(() => () => [...meshes.head, ...meshes.onStem].forEach((m) => m.dispose()), [meshes])

  // ---- animation state
  const root = useRef<THREE.Group>(null!)
  const stemMesh = useRef<THREE.Mesh>(null!)
  const top = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const cur = useRef({ q: new THREE.Quaternion(), len: 0, init: false })
  const tgt = useRef<StemTarget>({ dir: new THREE.Vector3(), length: 0, head: new THREE.Vector3(), quat: new THREE.Quaternion(), r: 0, a: 0 })
  const anim = useRef({ s: 1, lift: 0 })
  const fresh = useRef<boolean | null>(null)
  if (fresh.current === null) fresh.current = freshIds.has(stem.id)
  const started = useRef(false)
  const phase = useMemo(() => (stem.seed % 1000) / 159, [stem.seed])
  const swayQ = useMemo(() => new THREE.Quaternion(), [])
  const swayE = useMemo(() => new THREE.Euler(), [])

  // placement animation: grow out of the cone and settle into the spiral
  useLayoutEffect(() => {
    if (!fresh.current || started.current) return
    started.current = true
    freshIds.delete(stem.id)
    if (useUI.getState().reducedMotion) return
    anim.current.s = 0.001
    anim.current.lift = 0.16
    gsap.to(anim.current, { s: 1, duration: 0.75, ease: 'back.out(1.5)' })
    gsap.to(anim.current, { lift: 0, duration: 1.0, ease: 'power3.out' })
  }, [stem.id])

  // removal animation
  useEffect(() => {
    if (!removing) return
    const done = () => {
      useDesign.getState().removeStem(stem.id)
      const ui = useUI.getState()
      ui.set({ removing: ui.removing.filter((r) => r !== stem.id) })
    }
    gsap.to(anim.current, { s: 0.001, duration: 0.35, ease: 'back.in(1.7)', onComplete: done })
  }, [removing, stem.id])

  useFrame((state, dt) => {
    const d3 = useUI.getState().drag3d
    const ov = d3 && d3.id === stem.id ? d3 : null
    const t = stemTarget(stem, ov, tgt.current)
    const c = cur.current
    if (!c.init) {
      c.q.copy(t.quat)
      c.len = t.length
      c.init = true
    } else {
      const k = 1 - Math.exp(-Math.min(dt, 0.1) * (ov ? 18 : 7))
      c.q.slerp(t.quat, k)
      c.len += (t.length - c.len) * k
    }
    const g = root.current
    g.quaternion.copy(c.q)
    if (sway) {
      const time = state.clock.elapsedTime
      swayQ.setFromEuler(swayE.set(Math.sin(time * 0.9 + phase) * 0.012, 0, Math.cos(time * 0.7 + phase * 1.3) * 0.012))
      g.quaternion.multiply(swayQ)
    }
    g.scale.setScalar(anim.current.s)
    const L = c.len + anim.current.lift
    stemMesh.current.scale.set(1, L + BELOW_BIND, 1)
    top.current.position.y = L
    head.current.rotation.set(stem.nod, stem.spin, 0)
    if (ringRef.current) {
      ringRef.current.visible = selected
      if (selected) ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.05)
    }
  })

  // highlight selected stem
  useEffect(() => {
    const e = selected ? SAGE : new THREE.Color(0)
    mats.petal.emissive.copy(e).multiplyScalar(selected ? 0.12 : 0)
    mats.leaf.emissive.copy(e).multiplyScalar(selected ? 0.15 : 0)
    mats.stem.emissive.copy(e).multiplyScalar(selected ? 0.15 : 0)
  }, [selected, mats])

  // ---- interaction: select + drag to a new spiral slot
  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        },
        onPointerOut: () => {
          document.body.style.cursor = ''
        },
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          if (e.nativeEvent.pointerType === 'mouse' && e.nativeEvent.button !== 0) return
          const ui = useUI.getState()
          if (ui.mode !== 'arrange') return
          ui.set({ selectedId: stem.id })
          if (stage.controls) stage.controls.enabled = false
          const sx = e.nativeEvent.clientX
          const sy = e.nativeEvent.clientY
          const pid = e.nativeEvent.pointerId
          const occupied = new Set(useDesign.getState().design.stems.filter((s) => s.id !== stem.id).map((s) => s.slot))
          let active = false
          const move = (ev: PointerEvent) => {
            if (ev.pointerId !== pid) return
            if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
            active = true
            document.body.style.cursor = 'grabbing'
            const hit = stage.bouquetPlaneHit(ev.clientX, ev.clientY, tgt.current.head.y)
            if (!hit) return
            const r = Math.min(hit.r, R_MAX * 1.2)
            const x = r * Math.cos(hit.a)
            const z = r * Math.sin(hit.a)
            useUI.getState().set({ drag3d: { id: stem.id, r, a: hit.a, snap: nearestFreeSlot(x, z, occupied) } })
          }
          const end = (ev: PointerEvent) => {
            if (ev.pointerId !== pid) return
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', end)
            window.removeEventListener('pointercancel', end)
            document.body.style.cursor = ''
            const st = useUI.getState()
            if (active && st.drag3d && st.drag3d.snap != null && ev.type === 'pointerup') {
              useDesign.getState().updateStem(stem.id, { slot: st.drag3d.snap, dr: 0, da: 0 })
            }
            st.set({ drag3d: null })
            if (stage.controls) stage.controls.enabled = st.mode === 'arrange'
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', end)
          window.addEventListener('pointercancel', end)
        },
      }
    : {}

  return (
    <group position={BIND} ref={root} {...handlers}>
      <mesh ref={stemMesh} geometry={mainStemGeo()} material={mats.stem} position-y={-BELOW_BIND} castShadow />
      <group ref={top} scale={HEAD_SCALE}>
        {meshes.onStem.map((m) => (
          <primitive key={m.uuid} object={m} />
        ))}
        <group ref={head}>
          {meshes.head.map((m) => (
            <primitive key={m.uuid} object={m} />
          ))}
        </group>
        {interactive && (
          <mesh ref={ringRef} rotation-x={Math.PI / 2} position-y={0.004} visible={false}>
            <torusGeometry args={[def.headRadius * 1.15, 0.0022, 8, 48]} />
            <meshBasicMaterial color="#7f9c79" toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  )
})
