import { FLOWERS, type FlowerType } from '../data/flowers'

/** Small illustrative icon for the library, drawn from the flower's own colours. */
export function FlowerGlyph({ type, size = 44 }: { type: FlowerType; size?: number }) {
  const def = FLOWERS[type]
  const { petal, petal2, center } = def.colors
  const { petals, kind } = def.glyph
  const id = `g-${type}`
  const body = (() => {
    switch (kind) {
      case 'spray':
        return (
          <g stroke="#7d9873" strokeWidth="1.2" fill="none">
            <path d="M24 44 L24 26 M24 32 L15 20 M24 30 L33 18 M24 26 L22 12 M15 20 L11 14 M33 18 L37 12" />
            {[[15, 20], [11, 14], [33, 18], [37, 12], [22, 12], [26, 16], [18, 15], [30, 13], [13, 18], [35, 16], [24, 10]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.4" fill={petal} stroke="#d9d4c4" strokeWidth="0.6" />
            ))}
          </g>
        )
      case 'leafy':
        return (
          <g>
            <path d="M24 44 C24 30 25 18 27 6" stroke="#6f8a5c" strokeWidth="1.4" fill="none" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <ellipse cx={18.5 + i * 0.4} cy={38 - i * 7} rx={type === 'eucalyptus' ? 5 : 6} ry={type === 'eucalyptus' ? 4.5 : 2.6} fill={i % 2 ? petal2 : petal} transform={`rotate(${type === 'eucalyptus' ? 0 : -30} ${18.5 + i * 0.4} ${38 - i * 7})`} />
                <ellipse cx={30 + i * 0.4} cy={35 - i * 7} rx={type === 'eucalyptus' ? 5 : 6} ry={type === 'eucalyptus' ? 4.5 : 2.6} fill={i % 2 ? petal : petal2} transform={`rotate(${type === 'eucalyptus' ? 0 : 30} ${30 + i * 0.4} ${35 - i * 7})`} />
              </g>
            ))}
          </g>
        )
      case 'spike':
        return (
          <g>
            <path d="M24 46 L24 8" stroke="#7d9873" strokeWidth="1.3" />
            {Array.from({ length: 9 }, (_, i) => (
              <g key={i}>
                <ellipse cx={22.2} cy={30 - i * 2.6} rx={2.2 - i * 0.12} ry={2.6} fill={i % 2 ? petal2 : petal} />
                <ellipse cx={25.8} cy={31 - i * 2.6} rx={2.2 - i * 0.12} ry={2.6} fill={i % 2 ? petal : petal2} />
              </g>
            ))}
          </g>
        )
      case 'frond':
        return (
          <g>
            <path d="M14 44 C20 30 26 18 36 6" stroke="#4f7442" strokeWidth="1.3" fill="none" />
            {Array.from({ length: 9 }, (_, i) => {
              const t = i / 9
              const x = 14 + t * 22 + (t * t) * 2
              const y = 44 - t * 38
              const l = 9 * (1 - t) + 2
              return (
                <g key={i}>
                  <ellipse cx={x - l / 2} cy={y - 1} rx={l / 2} ry={1.4} fill={petal} transform={`rotate(-20 ${x} ${y})`} />
                  <ellipse cx={x + l / 2} cy={y - 2} rx={l / 2} ry={1.4} fill={petal2} transform={`rotate(-50 ${x} ${y})`} />
                </g>
              )
            })}
          </g>
        )
      case 'cluster':
        return (
          <g>
            {Array.from({ length: 13 }, (_, i) => {
              const a = i * 2.4
              const r = Math.sqrt(i / 13) * 14
              const x = 24 + Math.cos(a) * r
              const y = 22 + Math.sin(a) * r
              return (
                <g key={i} transform={`translate(${x} ${y}) rotate(${i * 23})`}>
                  {[0, 90, 180, 270].map((d) => (
                    <ellipse key={d} cx="0" cy="-2.6" rx="2.2" ry="2.8" fill={i % 3 ? petal : petal2} transform={`rotate(${d})`} />
                  ))}
                </g>
              )
            })}
          </g>
        )
      case 'cup':
        return (
          <g>
            <path d="M24 44 L24 28" stroke="#6b8f55" strokeWidth="1.6" />
            <path d="M14 12 C13 26 18 30 24 30 C30 30 35 26 34 12 C31 16 28 17 27 12 C25 16 23 16 21 12 C20 17 17 16 14 12 Z" fill={`url(#${id})`} />
          </g>
        )
      default: {
        const narrow = kind === 'narrow'
        const n = petals
        const rx = narrow ? 2.6 : 6
        const ry = narrow ? 10 : 8
        return (
          <g>
            {Array.from({ length: n }, (_, i) => (
              <ellipse key={i} cx="24" cy={24 - ry * 0.85} rx={rx} ry={ry} fill={`url(#${id})`} transform={`rotate(${(i * 360) / n} 24 24)`} opacity="0.95" />
            ))}
            {!narrow && Array.from({ length: Math.max(3, n - 3) }, (_, i) => (
              <ellipse key={`i${i}`} cx="24" cy={24 - 4} rx={4} ry={5} fill={petal} transform={`rotate(${(i * 360) / (n - 3) + 20} 24 24)`} />
            ))}
            <circle cx="24" cy="24" r={narrow ? 6 : 3} fill={center} />
          </g>
        )
      }
    }
  })()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="50%" cy="80%" r="80%">
          <stop offset="0%" stopColor={petal} />
          <stop offset="100%" stopColor={petal2} />
        </radialGradient>
      </defs>
      {body}
    </svg>
  )
}
