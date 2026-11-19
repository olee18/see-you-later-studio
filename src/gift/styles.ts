import type { FlowerType, StemColors } from '../data/flowers'

/**
 * Ready-made gift bouquets. A design is just four choices — style, size,
 * wrapping paper and ribbon — so anyone can make something beautiful fast.
 */

export type SizeId = 'S' | 'M' | 'L' | 'XL'
export type Layout = 'dome' | 'ring' | 'heart' | 'garden'

export interface MixEntry {
  type: FlowerType
  weight: number
  colors?: Partial<StemColors>
  open?: number
  scale?: number
}

export interface StyleDef {
  id: string
  name: string
  thai: string
  layout: Layout
  /** main flowers (weighted random over the dome) */
  mix: MixEntry[]
  /** border (ring) or outside-of-heart flower */
  edge?: MixEntry & { frac?: number }
  /** sprigs poking out around the rim */
  accents?: { type: FlowerType; count: number; colors?: Partial<StemColors> }[]
  headR: number
  /** more, smaller heads (e.g. heart shapes need resolution) */
  density?: number
  headScale?: number
  wrap: string
  ribbon: string
}

export interface GiftDesign {
  v: 2
  style: string
  size: SizeId
  wrap: string
  ribbon: string
  card: { text: string }
}

export const SIZES: { id: SizeId; label: string; heads: number }[] = [
  { id: 'S', label: 'Small', heads: 12 },
  { id: 'M', label: 'Medium', heads: 20 },
  { id: 'L', label: 'Large', heads: 32 },
  { id: 'XL', label: 'Grand', heads: 48 },
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
    id: 'sweet-pink',
    name: 'Sweet Pink Roses',
    thai: 'กุหลาบชมพูหวาน',
    layout: 'dome',
    mix: [{ type: 'rose', weight: 3, colors: pinkRose, open: 0.72 }, { type: 'rose', weight: 1, colors: lightPinkRose, open: 0.72 }],
    headR: 0.052,
    density: 1.4,
    headScale: 0.9,
    wrap: 'pearl',
    ribbon: '#f2a7b8',
  },
  {
    id: 'red-heart',
    name: 'Red Rose Heart',
    thai: 'หัวใจกุหลาบแดง',
    layout: 'heart',
    mix: [{ type: 'rose', weight: 1, colors: redRose, open: 0.7 }],
    edge: { type: 'babysBreath', weight: 1, colors: BB_WHITE, scale: 1.1 },
    headR: 0.046,
    density: 2,
    headScale: 0.8,
    wrap: 'pink-white',
    ribbon: '#b3263e',
  },
  {
    id: 'classic-red',
    name: 'Classic Red',
    thai: 'กุหลาบแดงคลาสสิก',
    layout: 'ring',
    mix: [{ type: 'rose', weight: 1, colors: redRose, open: 0.72 }],
    edge: { type: 'babysBreath', weight: 1, colors: BB_WHITE, frac: 0.3, scale: 1.1 },
    headR: 0.05,
    density: 1.5,
    headScale: 0.88,
    wrap: 'black',
    ribbon: '#b3263e',
  },
  {
    id: 'peony-luxe',
    name: 'Peony Luxury',
    thai: 'โบตั๋นหรู',
    layout: 'dome',
    mix: [
      { type: 'peony', weight: 3, colors: { petal: '#f0a6bb', petal2: '#fde3ea', gradient: 0.6 }, open: 0.85 },
      { type: 'peony', weight: 1, colors: { petal: '#f7cad3', petal2: '#fff2f4', gradient: 0.55 }, open: 0.75 },
    ],
    headR: 0.075,
    wrap: 'pearl',
    ribbon: '#f2a7b8',
  },
  {
    id: 'pastel-garden',
    name: 'Pastel Garden',
    thai: 'สวนพาสเทล',
    layout: 'garden',
    mix: [
      { type: 'rose', weight: 3, colors: lightPinkRose, open: 0.75 },
      { type: 'rose', weight: 1, colors: peachRose, open: 0.75 },
      { type: 'hydrangea', weight: 1, colors: { petal: '#e6c9e9', petal2: '#f7ecf8' } },
      { type: 'peony', weight: 1, colors: { petal: '#f2b0bd', petal2: '#fde8ec' }, open: 0.8 },
      { type: 'carnation', weight: 1, colors: { petal: '#f4c1c9', petal2: '#fff1f3' } },
    ],
    accents: [{ type: 'eucalyptus', count: 6 }],
    headR: 0.062,
    wrap: 'blush',
    ribbon: '#f2a7b8',
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    thai: 'ฟ้าใส',
    layout: 'garden',
    mix: [
      { type: 'rose', weight: 5, colors: whiteRose, open: 0.75 },
      { type: 'hydrangea', weight: 1.3, colors: { petal: '#8fb1e6', petal2: '#cfe0f7', center: '#eef3fb' } },
      { type: 'lisianthus', weight: 1, colors: { petal: '#ffffff', petal2: '#cfe0f7', gradient: 0.4 } },
      { type: 'babysBreath', weight: 1, colors: BB_WHITE, scale: 1.1 },
    ],
    headR: 0.062,
    wrap: 'navy',
    ribbon: '#ffffff',
  },
  {
    id: 'pure-white',
    name: 'Pure White',
    thai: 'ขาวบริสุทธิ์',
    layout: 'ring',
    mix: [{ type: 'rose', weight: 1, colors: whiteRose, open: 0.75 }],
    edge: { type: 'babysBreath', weight: 1, colors: BB_WHITE, frac: 0.25, scale: 1.1 },
    accents: [{ type: 'eucalyptus', count: 7 }],
    headR: 0.052,
    density: 1.4,
    headScale: 0.9,
    wrap: 'sage',
    ribbon: '#ffffff',
  },
  {
    id: 'sunshine',
    name: 'Sunshine',
    thai: 'สดใสซันไชน์',
    layout: 'garden',
    mix: [
      { type: 'gerbera', weight: 2, colors: { petal: '#ff8a3d', petal2: '#ffc27a' } },
      { type: 'gerbera', weight: 1, colors: { petal: '#ffd23f', petal2: '#fff1a8' } },
      { type: 'sunflower', weight: 1 },
      { type: 'daisy', weight: 1 },
      { type: 'rose', weight: 1, colors: { petal: '#ffcf4a', petal2: '#fff2a8', gradient: 0.5 }, open: 0.75 },
    ],
    accents: [{ type: 'lavender', count: 6 }],
    headR: 0.065,
    wrap: 'orange',
    ribbon: '#24324f',
  },
  {
    id: 'pink-cloud',
    name: 'Pink Cloud',
    thai: 'เมฆชมพู',
    layout: 'dome',
    mix: [
      { type: 'babysBreath', weight: 2, colors: { petal: '#f5b3c8', petal2: '#ffe3ec' }, scale: 1.35 },
      { type: 'babysBreath', weight: 1, colors: { petal: '#e9a7d6', petal2: '#fbe1f2' }, scale: 1.35 },
    ],
    headR: 0.055,
    density: 1.4,
    wrap: 'pink-white',
    ribbon: '#f2a7b8',
  },
]

export const styleById = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0]
export const wrapById = (id: string) => WRAPS.find((w) => w.id === id) ?? WRAPS[0]

export function giftFromStyle(styleId: string, size: SizeId = 'M'): GiftDesign {
  const s = styleById(styleId)
  return { v: 2, style: s.id, size, wrap: s.wrap, ribbon: s.ribbon, card: { text: '' } }
}

export const defaultGift = () => giftFromStyle('sweet-pink', 'M')

export function randomGift(): GiftDesign {
  const s = STYLES[Math.floor(Math.random() * STYLES.length)]
  const size = SIZES[1 + Math.floor(Math.random() * 3)].id
  // mostly the style's own paper/ribbon, sometimes a fresh combination
  const wrap = Math.random() < 0.6 ? s.wrap : WRAPS[Math.floor(Math.random() * WRAPS.length)].id
  const ribbon = Math.random() < 0.6 ? s.ribbon : RIBBONS[Math.floor(Math.random() * RIBBONS.length)].color
  return { v: 2, style: s.id, size, wrap, ribbon, card: { text: '' } }
}

/** Anything loaded from storage is untrusted. */
export function sanitizeGift(raw: unknown): GiftDesign {
  const d = defaultGift()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<GiftDesign>
  return {
    v: 2,
    style: STYLES.some((s) => s.id === r.style) ? (r.style as string) : d.style,
    size: SIZES.some((s) => s.id === r.size) ? (r.size as SizeId) : d.size,
    wrap: WRAPS.some((w) => w.id === r.wrap) ? (r.wrap as string) : d.wrap,
    ribbon: typeof r.ribbon === 'string' && /^#[0-9a-f]{6}$/i.test(r.ribbon) ? r.ribbon : d.ribbon,
    card: { text: typeof r.card?.text === 'string' ? r.card.text.slice(0, 140) : '' },
  }
}
