import { buildStems, defaultDesign, type StemSpec } from '../state/design'
import type { Design } from '../state/types'
import { FLOWERS, type FlowerType } from './flowers'

// ---------------------------------------------------------------- colour maths (sRGB hex ⇄ HSL)

export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h /= 6
  return [h * 360, s, l]
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.min(1, Math.max(0, s))
  l = Math.min(1, Math.max(0, l))
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export const lighten = (hex: string, amt: number) => {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s * (1 - amt * 0.3), l + (1 - l) * amt)
}
export const darken = (hex: string, amt: number) => {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, l * (1 - amt))
}

// ---------------------------------------------------------------- swatches

export const PETAL_SWATCHES = [
  '#fbf8f1', '#f6e7da', '#f6d3d0', '#f2b0bd', '#e8879c', '#d4677f', '#b3263e', '#7a1f35',
  '#f4a38c', '#ff8a5c', '#f39a1e', '#f6c945', '#fff2a8', '#c9a7e3', '#8e6cc0', '#9fb3e0',
]
export const GREEN_SWATCHES = ['#5f7f4a', '#6b8f55', '#7f9f6a', '#8aa597', '#4c6b3c', '#3f5a34', '#a3b18a']
export const WRAP_SWATCHES = ['#f1d8cf', '#fbf3ee', '#f6efe4', '#c9a57c', '#e8d5c4', '#d9e2d0', '#cfd8e6', '#2f3a4f', '#3d3532', '#f4c7c3', '#efe3c2', '#ffffff']
export const RIBBON_SWATCHES = ['#c98b8f', '#b3263e', '#f2b0bd', '#d6a85c', '#8fa58a', '#3d3532', '#ffffff', '#9fb3e0', '#c9a7e3']
export const BACKGROUND_SWATCHES = ['#f6efe8', '#f8e6e2', '#e9efe4', '#ece7f3', '#e8eef4', '#efe6da', '#ddd3c8']

// ---------------------------------------------------------------- colour harmony

export type Scheme = 'complementary' | 'analogous' | 'monochrome'

export function harmony(base: string, scheme: Scheme): string[] {
  const [h, s, l] = hexToHsl(base)
  const L = Math.min(Math.max(l, 0.42), 0.72)
  const S = Math.max(s, 0.35)
  switch (scheme) {
    case 'complementary':
      return [hslToHex(h, S, L), hslToHex(h, S * 0.8, L + 0.15), hslToHex(h + 180, S * 0.75, L + 0.05), hslToHex(h + 180, S * 0.6, L + 0.2), hslToHex(h, S * 0.3, 0.94)]
    case 'analogous':
      return [hslToHex(h - 32, S * 0.9, L + 0.06), hslToHex(h - 16, S, L), hslToHex(h, S, L), hslToHex(h + 16, S, L + 0.08), hslToHex(h + 32, S * 0.85, L + 0.14)]
    case 'monochrome':
      return [hslToHex(h, S, 0.34), hslToHex(h, S, 0.5), hslToHex(h, S * 0.9, 0.64), hslToHex(h, S * 0.75, 0.78), hslToHex(h, S * 0.5, 0.9)]
  }
}

/**
 * Recolour flowers with a palette: every flower type gets its own colour,
 * the most-used type gets the first (lead) colour. Greens stay natural.
 */
export function applyPalette(design: Design, pal: string[]): Design {
  const counts = new Map<FlowerType, number>()
  for (const s of design.stems) if (FLOWERS[s.type].category === 'flower') counts.set(s.type, (counts.get(s.type) ?? 0) + 1)
  const order = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  const colorOf = new Map(order.map((t, i) => [t, pal[i % pal.length]]))
  return {
    ...design,
    stems: design.stems.map((s) => {
      const c = colorOf.get(s.type)
      if (!c) return s
      return { ...s, colors: { ...s.colors, petal: c, petal2: lighten(c, 0.55), gradient: Math.max(s.colors.gradient, 0.4) } }
    }),
    ribbon: { ...design.ribbon, color: darken(pal[0], 0.1) },
  }
}

// ---------------------------------------------------------------- themes

export interface Theme {
  id: string
  name: string
  blurb: string
  swatch: string[]
  build: () => Design
}

interface ThemeStyle {
  wrap?: Partial<Design['wrap']>
  ribbon?: Partial<Design['ribbon']>
  greenery?: Partial<Design['greenery']>
}

function themed(stems: StemSpec[], style: ThemeStyle): Design {
  const d = defaultDesign()
  return {
    ...d,
    stems: buildStems(stems),
    wrap: { ...d.wrap, ...style.wrap },
    ribbon: { ...d.ribbon, ...style.ribbon },
    greenery: { ...d.greenery, ...style.greenery },
  }
}

export const THEMES: Theme[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    blurb: 'Sunny and cheerful',
    swatch: ['#f6c945', '#ff8a5c', '#f2b0bd'],
    build: () =>
      themed(
        [
          ['sunflower', 2], ['gerbera', 2, { petal: '#ff8a5c', petal2: '#ffc6a3' }], ['gerbera', 1, { petal: '#f2b0bd', petal2: '#fde8ec' }],
          ['daisy', 3], ['marigold', 2], ['babysBreath', 2], ['ruscus', 2], ['eucalyptus', 2],
        ],
        { wrap: { color: '#c9a57c', color2: '#f6efe4', material: 'kraft', pattern: 'dots' }, ribbon: { color: '#d6a85c', bow: 'loop' } },
      ),
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    blurb: 'Deep red romance',
    swatch: ['#b3263e', '#f2b0bd', '#fbf8f1'],
    build: () =>
      themed(
        [
          ['rose', 7, { petal: '#b3263e', petal2: '#d4677f', gradient: 0.35 }], ['ranunculus', 3, { petal: '#f2b0bd', petal2: '#fde8ec' }],
          ['babysBreath', 3], ['eucalyptus', 3],
        ],
        { wrap: { color: '#f4c7c3', color2: '#fbf3ee', material: 'matte', pattern: 'none' }, ribbon: { color: '#7a1f35', bow: 'classic' } },
      ),
  },
  {
    id: 'graduation',
    name: 'Graduation',
    blurb: 'Bold and proud',
    swatch: ['#f6c945', '#fbf8f1', '#2f3a4f'],
    build: () =>
      themed(
        [
          ['sunflower', 1], ['lily', 2], ['rose', 3, { petal: '#f6c945', petal2: '#fff2a8' }], ['chrysanthemum', 2],
          ['calla', 2], ['ruscus', 2], ['fern', 2],
        ],
        { wrap: { color: '#2f3a4f', color2: '#efe3c2', material: 'fabric', pattern: 'stripes' }, ribbon: { color: '#d6a85c', bow: 'classic' } },
      ),
  },
  {
    id: 'thankyou',
    name: 'Thank You',
    blurb: 'Soft pastel gratitude',
    swatch: ['#f6d3d0', '#c9a7e3', '#8aa597'],
    build: () =>
      themed(
        [
          ['peony', 2], ['lisianthus', 3], ['carnation', 3, { petal: '#f6d3d0', petal2: '#fff3ef' }],
          ['lavender', 3], ['eucalyptus', 2], ['jasmine', 2],
        ],
        { wrap: { color: '#f6efe4', color2: '#e9efe4', material: 'fabric', pattern: 'botanical' }, ribbon: { color: '#8fa58a', bow: 'loop' } },
      ),
  },
  {
    id: 'getwell',
    name: 'Get Well',
    blurb: 'Fresh and uplifting',
    swatch: ['#fff2a8', '#f4a38c', '#ffffff'],
    build: () =>
      themed(
        [
          ['tulip', 4, { petal: '#f6c945', petal2: '#fff2a8' }], ['daisy', 3], ['chrysanthemum', 2, { petal: '#fbf8f1', petal2: '#fff6dc' }],
          ['gerbera', 2, { petal: '#f4a38c', petal2: '#fde1d4' }], ['eucalyptus', 2], ['babysBreath', 2],
        ],
        { wrap: { color: '#ffffff', color2: '#e8eef4', material: 'cellophane', pattern: 'none' }, ribbon: { color: '#f6c945', bow: 'classic' } },
      ),
  },
]

// ---------------------------------------------------------------- surprise me

const FOCAL: FlowerType[] = ['rose', 'peony', 'lily', 'hydrangea', 'ranunculus', 'lisianthus', 'gerbera', 'tulip', 'calla', 'chrysanthemum', 'orchid', 'carnation', 'sunflower', 'marigold', 'daisy']
const FILLERS: FlowerType[] = ['babysBreath', 'eucalyptus', 'ruscus', 'fern', 'jasmine', 'lavender']
const SCHEMES: Scheme[] = ['complementary', 'analogous', 'monochrome']

const WRAP_LOOKS: Design['wrap'][] = [
  { color: '#c9a57c', color2: '#f6efe4', material: 'kraft', pattern: 'none' },
  { color: '#fbf3ee', color2: '#e9efe4', material: 'fabric', pattern: 'botanical' },
  { color: '#ffffff', color2: '#f6efe4', material: 'cellophane', pattern: 'none' },
  { color: '#e8d5c4', color2: '#fbf3ee', material: 'matte', pattern: 'dots' },
  { color: '#2f3a4f', color2: '#efe3c2', material: 'matte', pattern: 'stripes' },
]

function pick<T>(list: T[], rnd: () => number): T {
  return list[Math.floor(rnd() * list.length)]
}
function pickN<T>(list: T[], n: number, rnd: () => number): T[] {
  const pool = [...list]
  const out: T[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  return out
}
const between = (lo: number, hi: number, rnd: () => number) => lo + Math.floor(rnd() * (hi - lo + 1))

/** A random but balanced bouquet: 1 star, 2 supporting, 1 accent, 2 fillers, harmonious palette. */
export function surpriseDesign(rnd: () => number = Math.random): Design {
  const [star, sup1, sup2, accent] = pickN(FOCAL, 4, rnd)
  const fillers = pickN(FILLERS, 2, rnd)
  const specs: StemSpec[] = [
    [star, between(3, 5, rnd)],
    [sup1, between(2, 4, rnd)],
    [sup2, between(2, 3, rnd)],
    [accent, between(1, 3, rnd)],
    [fillers[0], between(2, 3, rnd)],
    [fillers[1], between(2, 3, rnd)],
  ]
  const base = hslToHex(rnd() * 360, 0.45 + rnd() * 0.35, 0.55 + rnd() * 0.15)
  const pal = harmony(base, pick(SCHEMES, rnd))
  const d = defaultDesign()
  const design = applyPalette({ ...d, stems: buildStems(specs), wrap: pick(WRAP_LOOKS, rnd), ribbon: { ...d.ribbon, bow: rnd() < 0.5 ? 'classic' : 'loop' } }, pal)
  return design
}
