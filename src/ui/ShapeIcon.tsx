import type { ShapeId } from '../gift/shapes'

/** Little drawings for the bouquet-shape picker. */
export function ShapeIcon({ id, size = 56 }: { id: ShapeId; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 56 56', 'aria-hidden': true } as const
  const blooms = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#e98fa3" />
      <circle cx={cx - r * 1.1} cy={cy + 2} r={r * 0.85} fill="#f4b6c4" />
      <circle cx={cx + r * 1.1} cy={cy + 2} r={r * 0.85} fill="#f4b6c4" />
      <circle cx={cx - r * 0.55} cy={cy - r * 0.9} r={r * 0.8} fill="#f2a7b8" />
      <circle cx={cx + r * 0.55} cy={cy - r * 0.9} r={r * 0.8} fill="#e98fa3" />
    </g>
  )
  switch (id) {
    case 'korean':
      return (
        <svg {...common}>
          <path d="M10 18 Q28 4 46 18 L28 50 Z" fill="#f3ece4" stroke="#cbbfb2" strokeWidth="1.2" />
          {blooms(28, 22, 5)}
          <path d="M13 25 Q28 34 43 25 L28 50 Z" fill="#f4c3cd" stroke="#d9a3ae" strokeWidth="1" />
          <circle cx="28" cy="40" r="2.6" fill="#e98fa3" />
        </svg>
      )
    case 'cone':
      return (
        <svg {...common}>
          <path d="M12 6 Q30 2 46 10 L28 52 Z" fill="#f4c3cd" stroke="#d9a3ae" strokeWidth="1.2" />
          {blooms(27, 22, 5)}
          <path d="M16 30 L28 52 L38 28 Q28 34 16 30 Z" fill="#f3ece4" stroke="#cbbfb2" strokeWidth="1" />
          <circle cx="28" cy="42" r="2.4" fill="#e98fa3" />
        </svg>
      )
    case 'handtied':
      return (
        <svg {...common}>
          {blooms(28, 16, 5.5)}
          <path d="M26 28 L20 52 M28 28 L28 52 M30 28 L36 52 M27 28 L24 52 M29 28 L32 52" stroke="#5f7f4a" strokeWidth="1.6" />
          <path d="M20 26 H36 L33 36 H23 Z" fill="#c9a57c" stroke="#9c7745" strokeWidth="1" />
          <rect x="22" y="33" width="12" height="3" rx="1.5" fill="#e98fa3" />
        </svg>
      )
    case 'posy':
      return (
        <svg {...common}>
          <path d="M16 26 L28 39 L40 26 Z" fill="#f3ece4" stroke="#d9cfc4" strokeWidth="1" />
          {blooms(28, 20, 6)}
          <rect x="25" y="36" width="6" height="16" rx="3" fill="#f2a7b8" />
          <circle cx="28" cy="37" r="2.6" fill="#e98fa3" />
        </svg>
      )
  }
}
