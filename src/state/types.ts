import type { BloomStage, FlowerType, StemColors } from '../data/flowers'

export interface Stem {
  id: string
  type: FlowerType
  /** spiral slot 0..39 (0 = centre) */
  slot: number
  /** fine position offsets from the slot: radial (m) and around (rad) */
  dr: number
  da: number
  /** height offset (m) */
  dh: number
  /** extra outward lean of the whole stem (rad) */
  lean: number
  /** head tilt relative to the stem (rad) */
  nod: number
  /** head turn around its own axis (rad) */
  spin: number
  bloom: BloomStage
  colors: StemColors
  seed: number
}

export type WrapMaterial = 'kraft' | 'matte' | 'cellophane' | 'fabric'
export type LightMood = 'morning' | 'golden' | 'studio'

/** Everything needed to rebuild a bouquet. Round 2/3 features read the same shape. */
export interface Design {
  v: 1
  stems: Stem[]
  greenery: { stem: string; leaf: string }
  wrap: { color: string; color2: string; material: WrapMaterial; pattern: 'none' | 'dots' | 'stripes' | 'botanical' }
  ribbon: { color: string; width: number; bow: 'classic' | 'loop' | 'none' }
  background: { color: string; mood: LightMood }
  card: { text: string }
}
