import { FLOWERS, FLOWER_TYPES, type FlowerType, type StemColors } from '../data/flowers'
import { MAX_STEMS, autoSlot } from './layout'
import type { Design, LightMood, Stem, WrapMaterial } from './types'

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)

export function makeStem(type: FlowerType, slot: number, colors?: Partial<StemColors>): Stem {
  return {
    id: uid(),
    type,
    slot,
    dr: 0,
    da: 0,
    dh: 0,
    lean: 0,
    nod: 0,
    spin: Math.random() * Math.PI * 2,
    bloom: 'full',
    colors: { ...FLOWERS[type].colors, ...colors },
    seed: (Math.random() * 2 ** 31) | 0,
  }
}

export function defaultDesign(): Design {
  return {
    v: 1,
    stems: [],
    greenery: { stem: '#5f7f4a', leaf: '#6b8f55' },
    wrap: { color: '#f1d8cf', color2: '#fbf3ee', material: 'matte', pattern: 'none' },
    ribbon: { color: '#c98b8f', width: 0.022, bow: 'classic' },
    background: { color: '#f6efe8', mood: 'morning' },
    card: { text: '' },
  }
}

/** Order stems centre → edge by type preference and give them slots 0..n-1. */
export function arrangeStems(stems: Stem[]): Stem[] {
  const sorted = [...stems].sort((a, b) => FLOWERS[a.type].centerBias - FLOWERS[b.type].centerBias)
  return sorted.map((s, i) => ({ ...s, slot: i, dr: 0, da: 0 }))
}

export type StemSpec = [FlowerType, number, Partial<StemColors>?]

/** Build a balanced bouquet from a recipe: [type, count, colours]. */
export function buildStems(specs: StemSpec[]): Stem[] {
  const stems: Stem[] = []
  for (const [type, count, colors] of specs)
    for (let i = 0; i < count && stems.length < MAX_STEMS; i++) stems.push(makeStem(type, stems.length, colors))
  return arrangeStems(stems)
}

/** The finished bouquet shown on the hero pedestal. */
export function sampleDesign(): Design {
  const d = defaultDesign()
  const list: [FlowerType, Partial<StemColors>?][] = [
    ['peony'], ['peony', { petal: '#f6d3d0', petal2: '#fff3ef' }],
    ['rose'], ['rose', { petal: '#f3e2d4', petal2: '#fff7ef' }], ['rose', { petal: '#e8a0ac' }], ['rose'],
    ['hydrangea', { petal: '#f3f0ea', petal2: '#dfe8d6', center: '#f6f3ea' }], ['lily'],
    ['carnation', { petal: '#f2b7c0' }], ['carnation', { petal: '#f2b7c0' }], ['orchid'],
    ['rose', { petal: '#f3e2d4', petal2: '#fff7ef' }], ['peony', { petal: '#eaa3b2' }], ['rose', { petal: '#e8a0ac' }],
    ['hydrangea', { petal: '#f3f0ea', petal2: '#dfe8d6', center: '#f6f3ea' }], ['carnation', { petal: '#f6e4dc' }], ['tulip', { petal: '#f4b6b9', petal2: '#fde3df' }],
    ['ruscus'], ['ruscus'], ['eucalyptus'], ['eucalyptus'], ['babysBreath'], ['babysBreath'], ['eucalyptus'], ['fern'], ['babysBreath'], ['eucalyptus'],
  ]
  d.stems = arrangeStems(list.map(([t, c], i) => ({ ...makeStem(t, i, c), seed: 1000 + i * 77, spin: i * 1.7 })))
  return d
}

// ---------------------------------------------------------------- validation

const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s)
const hex = (v: unknown, d: string) => (isHex(v) ? v : d)
const num = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)

const MATERIALS: readonly WrapMaterial[] = ['kraft', 'matte', 'cellophane', 'fabric']
const PATTERNS = ['none', 'dots', 'stripes', 'botanical'] as const
const BOWS = ['classic', 'loop', 'none'] as const
const MOODS: readonly LightMood[] = ['morning', 'golden', 'studio']

/** Defensive load: anything from storage (or a share link later) is untrusted. */
export function sanitizeDesign(raw: unknown): Design {
  const base = defaultDesign()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Design>
  const used = new Set<number>()
  const stems: Stem[] = []
  for (const s of Array.isArray(r.stems) ? r.stems : []) {
    if (stems.length >= MAX_STEMS) break
    if (!s || !FLOWER_TYPES.includes(s.type)) continue
    const slot = Number.isInteger(s.slot) && s.slot >= 0 && s.slot < MAX_STEMS && !used.has(s.slot) ? s.slot : autoSlot(s.type, used)
    if (slot == null) continue
    used.add(slot)
    const dc = FLOWERS[s.type].colors
    stems.push({
      id: typeof s.id === 'string' ? s.id.slice(0, 16) : uid(),
      type: s.type,
      slot,
      dr: num(s.dr, -0.08, 0.08, 0),
      da: num(s.da, -0.6, 0.6, 0),
      dh: num(s.dh, -0.14, 0.14, 0),
      lean: num(s.lean, -0.6, 0.6, 0),
      nod: num(s.nod, -0.9, 0.9, 0),
      spin: num(s.spin, -10, 10, 0),
      bloom: s.bloom === 'bud' || s.bloom === 'half' ? s.bloom : 'full',
      colors: {
        petal: hex(s.colors?.petal, dc.petal),
        petal2: hex(s.colors?.petal2, dc.petal2),
        gradient: num(s.colors?.gradient, 0, 1, dc.gradient),
        center: hex(s.colors?.center, dc.center),
      },
      seed: num(s.seed, 0, 2 ** 31, 1) | 0,
    })
  }
  return {
    v: 1,
    stems,
    greenery: { stem: hex(r.greenery?.stem, base.greenery.stem), leaf: hex(r.greenery?.leaf, base.greenery.leaf) },
    wrap: {
      color: hex(r.wrap?.color, base.wrap.color),
      color2: hex(r.wrap?.color2, base.wrap.color2),
      material: oneOf(r.wrap?.material, MATERIALS, base.wrap.material),
      pattern: oneOf(r.wrap?.pattern, PATTERNS, base.wrap.pattern),
    },
    ribbon: {
      color: hex(r.ribbon?.color, base.ribbon.color),
      width: num(r.ribbon?.width, 0.01, 0.04, base.ribbon.width),
      bow: oneOf(r.ribbon?.bow, BOWS, base.ribbon.bow),
    },
    background: { color: hex(r.background?.color, base.background.color), mood: oneOf(r.background?.mood, MOODS, base.background.mood) },
    card: { text: typeof r.card?.text === 'string' ? r.card.text.slice(0, 140) : '' },
  }
}
