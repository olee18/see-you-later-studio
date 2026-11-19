import { FLOWERS } from '../data/flowers'
import { styleById, wrapById, type StyleDef } from '../gift/styles'

/** Flower colours a style shows from the front (for the little preview drawing). */
function headColors(style: StyleDef): { fill: string; ring: string; small?: boolean }[] {
  const pick = (e: StyleDef['mix'][number]) => {
    const c = { ...FLOWERS[e.type].colors, ...e.colors }
    return { fill: c.petal, ring: c.petal2, small: e.type === 'babysBreath' }
  }
  return style.mix.map(pick).concat(style.edge ? [pick(style.edge)] : [])
}

// rough dome of circles, back row first
const DOTS: [number, number, number][] = [
  [26, 25, 7], [38, 22, 7], [50, 25, 7], [20, 34, 7.5], [32, 32, 8], [44, 32, 8], [56, 34, 7.5], [26, 42, 8], [38, 41, 8.5], [50, 42, 8],
]

/** Tiny illustrated bouquet: layered paper fan + flower dome + bow. */
export function BouquetThumb({ styleId, wrapId, ribbon, size = 76 }: { styleId: string; wrapId?: string; ribbon?: string; size?: number }) {
  const style = styleById(styleId)
  const wrap = wrapById(wrapId ?? style.wrap)
  const bow = ribbon ?? style.ribbon
  const cols = headColors(style)
  const heartish = style.layout === 'heart' || style.layout === 'ring'
  return (
    <svg width={size} height={size} viewBox="0 0 76 76" aria-hidden="true">
      {/* paper: back peaks, then front fan */}
      <path d="M8 30 L18 8 L28 24 L38 4 L48 24 L58 8 L68 30 L44 62 L32 62 Z" fill={wrap.inner} stroke="rgba(0,0,0,0.06)" />
      <path d="M4 36 L14 20 L22 34 L38 16 L54 34 L62 20 L72 36 L44 64 L32 64 Z" fill={wrap.outer} opacity="0.95" stroke="rgba(0,0,0,0.06)" />
      {DOTS.map(([x, y, r], i) => {
        const edge = heartish && (i === 0 || i === 2 || i === 3 || i === 6 || i === 7 || i === 9)
        const c = edge && cols.length > 1 ? cols[cols.length - 1] : cols[i % (heartish ? 1 : cols.length)]
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
      {/* front paper flap */}
      <path d="M10 44 L38 58 L66 44 L46 66 L30 66 Z" fill={wrap.outer} stroke="rgba(0,0,0,0.06)" />
      {/* bow */}
      <path d="M38 62 C30 55 24 58 26 63 C28 67 34 65 38 62 Z M38 62 C46 55 52 58 50 63 C48 67 42 65 38 62 Z" fill={bow} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
      <path d="M37 63 L33 74 M39 63 L43 74" stroke={bow} strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="62.5" r="2.4" fill={bow} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
    </svg>
  )
}
