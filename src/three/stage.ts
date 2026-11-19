import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

/** World placement of the two "stations" in the studio. */
export const HERO_ROOT = new THREE.Vector3(-2.8, 1.06, -0.2)
export const BENCH_ROOT = new THREE.Vector3(1.6, 0.885, 0)

/** Handles filled in from inside the Canvas (camera rig, renderer). */
export const stage = {
  camera: null as THREE.Camera | null,
  gl: null as THREE.WebGLRenderer | null,
  scene: null as THREE.Scene | null,
  controls: null as OrbitControlsImpl | null,
}

// dev-only handle for profiling from the console
if (import.meta.env.DEV) (window as unknown as { __bloomStage: typeof stage }).__bloomStage = stage
