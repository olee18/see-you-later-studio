import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { slotPos } from '../gift/layout'

/** World placement of the two "stations" in the studio. */
export const HERO_ROOT = new THREE.Vector3(-2.8, 1.06, -0.2)
export const BENCH_ROOT = new THREE.Vector3(1.6, 0.885, 0)

/** Handles filled in from inside the Canvas (camera rig, renderer). */
export const stage = {
  camera: null as THREE.Camera | null,
  gl: null as THREE.WebGLRenderer | null,
  scene: null as THREE.Scene | null,
  controls: null as OrbitControlsImpl | null,
  /** one-shot: called with the WebGL canvas right after the next frame is drawn */
  capture: null as ((canvas: HTMLCanvasElement) => void) | null,
  /** how far the bench bouquet is raised by its stand */
  lift: 0,
}

const _v = new THREE.Vector3()

/**
 * Which dome slot is under a screen point? Projects each slot to the screen and
 * picks the nearest (forgiving on touch screens). `count` = flowers in the
 * bouquet after the drop; slots 0..count-1 are candidates.
 */
export function slotAtScreen(clientX: number, clientY: number, count: number, maxPx = 70): number | null {
  const { camera, gl } = stage
  if (!camera || !gl || count <= 0) return null
  const rect = gl.domElement.getBoundingClientRect()
  let best: number | null = null
  let bestD = maxPx * maxPx
  for (let k = 0; k < count; k++) {
    _v.copy(slotPos(k, count)).add(BENCH_ROOT)
    _v.y += stage.lift
    _v.project(camera)
    if (_v.z > 1) continue
    const x = rect.left + ((_v.x + 1) / 2) * rect.width
    const y = rect.top + ((1 - _v.y) / 2) * rect.height
    const d = (x - clientX) ** 2 + (y - clientY) ** 2
    if (d < bestD) {
      bestD = d
      best = k
    }
  }
  return best
}

// dev-only handle for profiling from the console
if (import.meta.env.DEV) (window as unknown as { __bloomStage: typeof stage }).__bloomStage = stage
