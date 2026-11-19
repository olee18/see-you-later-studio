import { DEFAULT_STAND, isStand, type StandId } from './stands'
import { DEFAULT_SHAPE, isShape, type ShapeId } from './shapes'
import { FLOWERS, FLOWER_TYPES, mulberry32, type FlowerType, type StemColors } from '../data/flowers'
import { MAX_ITEMS, dimsFor, slotPos, type Item } from './layout'

/**
 * Ready-made bouquets are TEMPLATES: they fill the dome slots with flowers,
 * and the person can then add, swap, recolour or remove any flower.
 */

export type SizeId = 'S' | 'M' | 'L' | 'XL'
export type Layout = 'dome' | 'ring' | 'heart' | 'garden'

export interface MixEntry {
  type: FlowerType
  weight: number
  colors?: Partial<StemColors>
}

export interface StyleDef {
  id: string
  name: string
  thai: string
  layout: Layout
  mix: MixEntry[]
  /** border (ring) or outside-of-heart flower */
  edge?: MixEntry & { frac?: number }
  /** greenery tucked around the rim */
  accents?: { type: FlowerType; count: number; colors?: Partial<StemColors> }[]
  defaultSize?: SizeId
  wrap: string
  ribbon: string
}

export interface GiftDesign {
  v: 3
  items: Item[]
  wrap: string
  ribbon: string
  /** what the bouquet stands in */
  stand: StandId
  /** wrap style: Korean layers, tall cone, hand-tied, hat box */
  shape: ShapeId
  /** template it was started from (for naming) */
  style: string | null
  card: { text: string }
}

export const SIZES: { id: SizeId; label: string; heads: number }[] = [
  { id: 'S', label: 'Small', heads: 16 },
  { id: 'M', label: 'Medium', heads: 28 },
  { id: 'L', label: 'Large', heads: 44 },
  { id: 'XL', label: 'Grand', heads: 64 },
]

export interface WrapDef {
  id: string
  name: string
  outer: string
  inner: string
}

export const WRAPS: WrapDef[] = [
  { id: 'pink-white', name: 'Pink & White', outer: '#f4c3cd', inner: '#ffffff' },
  { id: 'pearl', name: 'Pearl White', outer: '#ffffff', inner: '#f3ebe6' },
  { id: 'blush', name: 'Blush', outer: '#efcfc6', inner: '#fbf3ee' },
  { id: 'lilac', name: 'Lilac', outer: '#d9c7ef', inner: '#ffffff' },
  { id: 'sky', name: 'Sky Blue', outer: '#c6dbf1', inner: '#ffffff' },
  { id: 'navy', name: 'Navy & White', outer: '#34497a', inner: '#f4f6fa' },
  { id: 'sage', name: 'Sage', outer: '#c9d8bf', inner: '#ffffff' },
  { id: 'kraft', name: 'Kraft', outer: '#c79f74', inner: '#f3e4d0' },
  { id: 'orange', name: 'Tangerine', outer: '#f39a3c', inner: '#ffe2b8' },
  { id: 'black', name: 'Black', outer: '#2b2a2c', inner: '#ece6df' },
]

export const RIBBONS: { id: string; name: string; color: string }[] = [
  { id: '#f2a7b8', name: 'Pink', color: '#f2a7b8' },
  { id: '#b3263e', name: 'Red', color: '#b3263e' },
  { id: '#ffffff', name: 'White', color: '#ffffff' },
  { id: '#e3cfa4', name: 'Champagne', color: '#e3cfa4' },
  { id: '#b9a3e3', name: 'Lilac', color: '#b9a3e3' },
  { id: '#9ec3e6', name: 'Sky', color: '#9ec3e6' },
  { id: '#24324f', name: 'Navy', color: '#24324f' },
  { id: '#9fb58f', name: 'Sage', color: '#9fb58f' },
  { id: '#2b2a2c', name: 'Black', color: '#2b2a2c' },
]

const pinkRose = { petal: '#f29aae', petal2: '#fde2e9', gradient: 0.55, center: '#b84a63' }
const lightPinkRose = { petal: '#f7c1cc', petal2: '#fff0f3', gradient: 0.5, center: '#d27b8c' }
const redRose = { petal: '#a8102c', petal2: '#d22e4a', gradient: 0.3, center: '#5e0a1a' }
const whiteRose = { petal: '#fbf6ee', petal2: '#ffffff', gradient: 0.3, center: '#e9dcc6' }
const peachRose = { petal: '#f6b49a', petal2: '#fde4d6', gradient: 0.5, center: '#c8735a' }
const BB_WHITE = { petal: '#fbfaf4', petal2: '#ffffff' }

export const STYLES: StyleDef[] = [
  {
    id: 'sweet-pink', name: 'Sweet Pink Roses', thai: 'กุหลาบชมพูหวาน', layout: 'dome',
    mix: [{ type: 'rose', weight: 3, colors: pinkRose }, { type: 'rose', weight: 1, colors: lightPinkRose }],
    wrap: 'pearl', ribbon: '#f2a7b8',
  },
  {
    id: 'red-heart', name: 'Red Rose Heart', thai: 'หัวใจกุหลาบแดง', layout: 'heart', defaultSize: 'L',
    mix: [{ type: 'rose', weight: 1, colors: redRose }],
    edge: { type: 'babysBreath', weight: 1, colors: BB_WHITE },
    wrap: 'pink-white', ribbon: '#b3263e',
  },
  {
    id: 'classic-red', name: 'Classic Red', thai: 'กุหลาบแดงคลาสสิก', layout: 'ring',
    mix: [{ type: 'rose', weight: 1, colors: redRose }],
    edge: { type: 'babysBreath', weight: 1, colors: BB_WHITE, frac: 0.3 },
    wrap: 'black', ribbon: '#b3263e',
  },
  {
    id: 'peony-luxe', name: 'Peony Luxury', thai: 'โบตั๋นหรู', layout: 'dome',
    mix: [
      { type: 'peony', weight: 3, colors: { petal: '#f0a6bb', petal2: '#fde3ea', gradient: 0.6 } },
      { type: 'peony', weight: 1, colors: { petal: '#f7cad3', petal2: '#fff2f4', gradient: 0.55 } },
    ],
    wrap: 'pearl', ribbon: '#f2a7b8',
  },
  {
    id: 'pastel-garden', name: 'Pastel Garden', thai: 'สวนพาสเทล', layout: 'garden',
    mix: [
      { type: 'rose', weight: 3, colors: lightPinkRose },
      { type: 'rose', weight: 1, colors: peachRose },
      { type: 'hydrangea', weight: 1, colors: { petal: '#e6c9e9', petal2: '#f7ecf8' } },
      { type: 'peony', weight: 1, colors: { petal: '#f2b0bd', petal2: '#fde8ec' } },
      { type: 'carnation', weight: 1, colors: { petal: '#f4c1c9', petal2: '#fff1f3' } },
    ],
    accents: [{ type: 'eucalyptus', count: 6 }],
    wrap: 'blush', ribbon: '#f2a7b8',
  },
  {
    id: 'sky-blue', name: 'Sky Blue', thai: 'ฟ้าใส', layout: 'garden',
    mix: [
      { type: 'rose', weight: 5, colors: whiteRose },
      { type: 'hydrangea', weight: 1.3, colors: { petal: '#8fb1e6', petal2: '#cfe0f7', center: '#eef3fb' } },
      { type: 'lisianthus', weight: 1, colors: { petal: '#ffffff', petal2: '#cfe0f7', gradient: 0.4 } },
      { type: 'babysBreath', weight: 1, colors: BB_WHITE },
    ],
    wrap: 'navy', ribbon: '#ffffff',
  },
  {
    id: 'pure-white', name: 'Pure White', thai: 'ขาวบริสุทธิ์', layout: 'ring',
    mix: [{ type: 'rose', weight: 1, colors: whiteRose }],
    edge: { type: 'babysBreath', weight: 1, colors: BB_WHITE, frac: 0.25 },
    accents: [{ type: 'eucalyptus', count: 7 }],
    wrap: 'sage', ribbon: '#ffffff',
  },
  {
    id: 'sunshine', name: 'Sunshine', thai: 'สดใสซันไชน์', layout: 'garden',
    mix: [
      { type: 'gerbera', weight: 2, colors: { petal: '#ff8a3d', petal2: '#ffc27a' } },
      { type: 'gerbera', weight: 1, colors: { petal: '#ffd23f', petal2: '#fff1a8' } },
      { type: 'sunflower', weight: 1 },
      { type: 'daisy', weight: 1 },
      { type: 'rose', weight: 1, colors: { petal: '#ffcf4a', petal2: '#fff2a8', gradient: 0.5 } },
    ],
    accents: [{ type: 'lavender', count: 6 }],
    wrap: 'orange', ribbon: '#24324f',
  },
  {
    id: 'pink-cloud', name: 'Pink Cloud', thai: 'เมฆชมพู', layout: 'dome',
    mix: [
      { type: 'babysBreath', weight: 2, colors: { petal: '#f5b3c8', petal2: '#ffe3ec' } },
      { type: 'babysBreath', weight: 1, colors: { petal: '#e9a7d6', petal2: '#fbe1f2' } },
    ],
    wrap: 'pink-white', ribbon: '#f2a7b8',
  },
]

export const styleById = (id: string | null) => STYLES.find((s) => s.id === id)
export const wrapById = (id: string) => WRAPS.find((w) => w.id === id) ?? WRAPS[0]

/** Heart test in the top view; the point of the heart faces the viewer (+z). */
function inHeart(x: number, z: number) {
  const X = x * 1.15
  const Y = -z * 1.12 + 0.24
  const q = X * X + Y * Y - 1
  return q * q * q - X * X * Y * Y * Y <= 0
}

const newSeed = () => (Math.random() * 2 ** 31) | 0
export const makeItem = (type: FlowerType, colors?: Partial<StemColors>, seed = newSeed()): Item => ({
  type,
  colors: { ...FLOWERS[type].colors, ...colors },
  seed,
})

/** Fill the dome slots for a template at a given size. */
export function templateItems(styleId: string, size: SizeId): Item[] {
  const style = styleById(styleId) ?? STYLES[0]
  const sz = SIZES.find((s) => s.id === size) ?? SIZES[1]
  const accents = (style.accents ?? []).flatMap((a) => Array.from({ length: Math.max(2, Math.round((a.count * sz.heads) / 28)) }, () => a))
  const n = Math.min(MAX_ITEMS, sz.heads + accents.length)
  const main = n - accents.length
  const rnd = mulberry32(styleId.length * 7919 + n * 31)
  const pick = (mix: MixEntry[]) => {
    let r = rnd() * mix.reduce((s, m) => s + m.weight, 0)
    for (const m of mix) if ((r -= m.weight) <= 0) return m
    return mix[mix.length - 1]
  }
  const dims = dimsFor(n)
  const items: Item[] = []
  for (let k = 0; k < main; k++) {
    let e: MixEntry
    if (style.layout === 'ring' && style.edge && k >= main * (1 - (style.edge.frac ?? 0.3))) e = style.edge
    else if (style.layout === 'heart' && style.edge) {
      const p = slotPos(k, n)
      e = inHeart(p.x / dims.rimR, p.z / dims.rimR) ? style.mix[0] : style.edge
    } else e = pick(style.mix)
    items.push(makeItem(e.type, e.colors, (rnd() * 2 ** 31) | 0))
  }
  // greenery goes in the outermost (rim) slots
  for (const a of accents) items.push(makeItem(a.type, a.colors, (rnd() * 2 ** 31) | 0))
  return items
}

export function giftFromStyle(styleId: string, size?: SizeId): GiftDesign {
  const s = styleById(styleId) ?? STYLES[0]
  return { v: 3, items: templateItems(s.id, size ?? s.defaultSize ?? 'M'), wrap: s.wrap, ribbon: s.ribbon, stand: DEFAULT_STAND, shape: DEFAULT_SHAPE, style: s.id, card: { text: '' } }
}

export const emptyGift = (): GiftDesign => ({ v: 3, items: [], wrap: 'pearl', ribbon: '#f2a7b8', stand: DEFAULT_STAND, shape: DEFAULT_SHAPE, style: null, card: { text: '' } })
export const defaultGift = () => giftFromStyle('sweet-pink', 'M')

export function randomGift(): GiftDesign {
  const s = STYLES[Math.floor(Math.random() * STYLES.length)]
  const g = giftFromStyle(s.id, SIZES[1 + Math.floor(Math.random() * 2)].id)
  if (Math.random() < 0.4) g.wrap = WRAPS[Math.floor(Math.random() * WRAPS.length)].id
  if (Math.random() < 0.4) g.ribbon = RIBBONS[Math.floor(Math.random() * RIBBONS.length)].color
  return g
}

const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s)

/** Anything loaded from storage is untrusted. Older (v2) saves become their template. */
export function sanitizeGift(raw: unknown): GiftDesign {
  if (!raw || typeof raw !== 'object') return defaultGift()
  const r = raw as Partial<GiftDesign> & { size?: SizeId }
  if ((raw as { v?: unknown }).v === 2 && typeof r.style === 'string') {
    const g = giftFromStyle(r.style, SIZES.some((s) => s.id === r.size) ? r.size : undefined)
    return { ...g, wrap: WRAPS.some((w) => w.id === r.wrap) ? (r.wrap as string) : g.wrap, ribbon: isHex(r.ribbon) ? r.ribbon : g.ribbon, stand: isStand(r.stand) ? r.stand : DEFAULT_STAND, shape: isShape(r.shape) ? r.shape : DEFAULT_SHAPE }
  }
  const items: Item[] = []
  for (const it of Array.isArray(r.items) ? r.items : []) {
    if (items.length >= MAX_ITEMS) break
    if (!it || !FLOWER_TYPES.includes(it.type)) continue
    const d = FLOWERS[it.type].colors
    items.push({
      type: it.type,
      seed: typeof it.seed === 'number' && Number.isFinite(it.seed) ? it.seed | 0 : newSeed(),
      colors: {
        petal: isHex(it.colors?.petal) ? it.colors.petal : d.petal,
        petal2: isHex(it.colors?.petal2) ? it.colors.petal2 : d.petal2,
        gradient: typeof it.colors?.gradient === 'number' ? Math.min(1, Math.max(0, it.colors.gradient)) : d.gradient,
        center: isHex(it.colors?.center) ? it.colors.center : d.center,
      },
    })
  }
  return {
    v: 3,
    items,
    wrap: WRAPS.some((w) => w.id === r.wrap) ? (r.wrap as string) : 'pearl',
    ribbon: isHex(r.ribbon) ? r.ribbon : '#f2a7b8',
    stand: isStand(r.stand) ? r.stand : DEFAULT_STAND,
    shape: isShape(r.shape) ? r.shape : DEFAULT_SHAPE,
    style: typeof r.style === 'string' && styleById(r.style) ? r.style : null,
    card: { text: typeof r.card?.text === 'string' ? r.card.text.slice(0, 140) : '' },
  }
}
