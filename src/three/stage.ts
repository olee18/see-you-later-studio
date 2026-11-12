import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { DROP_PLANE_Y, R_MAX, nearestFreeSlot } from '../state/layout'

/** World placement of the two "stations" in the studio. */
export const HERO_ROOT = new THREE.Vector3(-2.8, 1.06, -0.2)
export const BENCH_ROOT = new THREE.Vector3(1.6, 0.885, 0)

export const CAMERAS = {
  hero: { pos: new THREE.Vector3(-2.5, 1.58, 1.85), target: new THREE.Vector3(-3.0, 1.4, -0.2) },
  heroNarrow: { pos: new THREE.Vector3(-2.8, 1.45, 2.75), target: new THREE.Vector3(-2.8, 1.12, -0.2) },
  benchNarrow: { pos: new THREE.Vector3(1.6, 2.1, 2.45), target: new THREE.Vector3(1.6, 1.3, 0) },
  bench: { pos: new THREE.Vector3(1.6, 1.92, 1.55), target: new THREE.Vector3(1.6, 1.34, 0) },
}

/**
 * Bridge between DOM pointer handling (library drag, 3D drag) and the R3F
 * camera. Filled in by <PickBridge/> inside the Canvas.
 */
export const stage = {
  camera: null as THREE.Camera | null,
  dom: null as HTMLElement | null,
  gl: null as THREE.WebGLRenderer | null,
  scene: null as THREE.Scene | null,
  controls: null as OrbitControlsImpl | null,
  _ray: new THREE.Raycaster(),
  _plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  _hit: new THREE.Vector3(),
  _ndc: new THREE.Vector2(),

  /** Ray from screen point onto a horizontal plane at bouquet-local height y. */
  bouquetPlaneHit(clientX: number, clientY: number, localY: number) {
    if (!this.camera || !this.dom) return null
    const rect = this.dom.getBoundingClientRect()
    this._ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this._ray.setFromCamera(this._ndc, this.camera)
    this._plane.constant = -(BENCH_ROOT.y + localY)
    if (!this._ray.ray.intersectPlane(this._plane, this._hit)) return null
    const x = this._hit.x - BENCH_ROOT.x
    const z = this._hit.z - BENCH_ROOT.z
    return { x, z, r: Math.hypot(x, z), a: Math.atan2(z, x) }
  },

  /** Nearest free spiral slot under a screen point, or null if off the bouquet. */
  slotAt(clientX: number, clientY: number, occupied: Set<number>) {
    const hit = this.bouquetPlaneHit(clientX, clientY, DROP_PLANE_Y)
    if (!hit || hit.r > R_MAX * 1.7) return null
    return nearestFreeSlot(hit.x, hit.z, occupied)
  },
}

// dev-only handle for profiling from the console
if (import.meta.env.DEV) (window as unknown as { __bloomStage: typeof stage }).__bloomStage = stage
