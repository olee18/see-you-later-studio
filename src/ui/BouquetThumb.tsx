import { FLOWERS } from '../data/flowers'
import { styleById, wrapById, type GiftDesign, type StyleDef } from '../gift/styles'

interface Dot {
  fill: string
  ring: string
  small?: boolean
}

function styleDots(style: StyleDef): Dot[] {
  const pick = (e: StyleDef['mix'][number]): Dot => {
    const c = { ...FLOWERS[e.type].colors, ...e.colors }
    return { fill: c.petal, ring: c.petal2, small: e.type === 'babysBreath' }
  }
  return style.mix.map(pick).concat(style.edge ? [pick(style.edge)] : [])
}

/** Most-used flower colours of a custom bouquet (centre flowers first). */
function itemDots(d: GiftDesign): Dot[] {
  const seen = new Map<string, Dot & { n: number }>()
  for (const it of d.items) {
    if (FLOWERS[it.type].category === 'filler' && it.type !== 'babysBreath') continue
    const k = it.colors.petal
    const e = seen.get(k)
    if (e) e.n++
    else seen.set(k, { fill: it.colors.petal, ring: it.colors.petal2, small: it.type === 'babysBreath', n: 1 })
  }
  return [...seen.values()].sort((a, b) => b.n - a.n).slice(0, 4)
}

// rough dome of circles, back row first
const DOTS: [number, number, number][] = [
  [26, 25, 7], [38, 22, 7], [50, 25, 7], [20, 34, 7.5], [32, 32, 8], [44, 32, 8], [56, 34, 7.5], [26, 42, 8], [38, 41, 8.5], [50, 42, 8],
]
const EDGE = new Set([0, 2, 3, 6, 7, 9])

/** Tiny illustrated bouquet: layered paper fan + flower dome + bow. */
export function BouquetThumb({ styleId, design, size = 76 }: { styleId?: string; design?: GiftDesign; size?: number }) {
  const style = styleById(styleId ?? design?.style ?? null)
  const wrap = wrapById(design?.wrap ?? style?.wrap ?? 'pearl')
  const bow = design?.ribbon ?? style?.ribbon ?? '#f2a7b8'
  const cols = design ? itemDots(design) : style ? styleDots(style) : []
  const ringed = !design && (style?.layout === 'heart' || style?.layout === 'ring')
  return (
    <svg width={size} height={size} viewBox="0 0 76 76" aria-hidden="true">
      <path d="M8 30 L18 8 L28 24 L38 4 L48 24 L58 8 L68 30 L44 62 L32 62 Z" fill={wrap.inner} stroke="rgba(0,0,0,0.06)" />
      <path d="M4 36 L14 20 L22 34 L38 16 L54 34 L62 20 L72 36 L44 64 L32 64 Z" fill={wrap.outer} opacity="0.95" stroke="rgba(0,0,0,0.06)" />
      {cols.length === 0 && <ellipse cx="38" cy="34" rx="20" ry="10" fill="#4f6b43" opacity="0.35" />}
      {cols.length > 0 &&
        DOTS.map(([x, y, r], i) => {
          const c = ringed && cols.length > 1 ? (EDGE.has(i) ? cols[cols.length - 1] : cols[0]) : cols[i % cols.length]
          return c.small ? (
            <g key={i}>
              {[[-3, -2], [2, -3], [3, 2], [-2, 3], [0, 0]].map(([dx, dy], k) => (
                <circle key={k} cx={x + dx} cy={y + dy} r={2.3} fill={c.fill} />
              ))}
            </g>
          ) : (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={c.fill} />
              <circle cx={x} cy={y} r={r * 0.55} fill={c.ring} opacity="0.55" />
              <circle cx={x} cy={y} r={r * 0.22} fill={c.fill} />
            </g>
          )
        })}
      <path d="M10 44 L38 58 L66 44 L46 66 L30 66 Z" fill={wrap.outer} stroke="rgba(0,0,0,0.06)" />
      <path d="M38 62 C30 55 24 58 26 63 C28 67 34 65 38 62 Z M38 62 C46 55 52 58 50 63 C48 67 42 65 38 62 Z" fill={bow} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
      <path d="M37 63 L33 74 M39 63 L43 74" stroke={bow} strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="62.5" r="2.4" fill={bow} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
    </svg>
  )
}
