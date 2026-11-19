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
          <path d="M8 16 L28 50 L48 16 L40 24 L34 12 L28 22 L22 12 L16 24 Z" fill="#f3ece4" stroke="#cbbfb2" strokeWidth="1.2" />
          {blooms(28, 22, 5)}
          <path d="M14 26 L28 50 L42 26 L36 32 L28 28 L20 32 Z" fill="#f4c3cd" stroke="#d9a3ae" strokeWidth="1" />
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
          <path d="M8 26 Q12 34 18 30 Q22 36 28 32 Q34 36 38 30 Q44 34 48 26 Q40 36 28 37 Q16 36 8 26 Z" fill="#fff" stroke="#d9cfc4" strokeWidth="1" />
          {blooms(28, 20, 6)}
          <rect x="25" y="36" width="6" height="16" rx="3" fill="#f2a7b8" />
          <circle cx="28" cy="37" r="2.6" fill="#e98fa3" />
        </svg>
      )
    case 'heartbox':
      return (
        <svg {...common}>
          {blooms(28, 22, 6)}
          <path d="M28 52 C20 46 8 40 9 30 C10 24 18 23 22 27 L28 31 L34 27 C38 23 46 24 47 30 C48 40 36 46 28 52 Z" fill="#c2607a" />
          <circle cx="28" cy="46" r="2.6" fill="#f4c3cd" />
        </svg>
      )
    case 'bag':
      return (
        <svg {...common}>
          <path d="M20 22 Q20 12 28 12 Q36 12 36 22" fill="none" stroke="#b88f58" strokeWidth="2" />
          {blooms(28, 20, 6)}
          <rect x="13" y="26" width="30" height="24" rx="1.5" fill="#d3ad80" />
          <rect x="13" y="26" width="30" height="4" fill="#f3e4d0" />
          <circle cx="28" cy="36" r="2.6" fill="#e98fa3" />
        </svg>
      )
    case 'bucket':
      return (
        <svg {...common}>
          <path d="M11 24 Q28 4 45 24" fill="none" stroke="#9aa3a8" strokeWidth="1.6" />
          {blooms(28, 20, 6)}
          <path d="M12 27 H44 L40 50 H16 Z" fill="#c3cacd" stroke="#9aa3a8" strokeWidth="1.2" />
          <path d="M12 27 Q16 22 20 27 Q24 22 28 27 Q32 22 36 27 Q40 22 44 27" fill="#f4c3cd" />
          <rect x="13.5" y="36" width="29" height="3.2" fill="#f2a7b8" />
        </svg>
      )
    case 'box':
      return (
        <svg {...common}>
          {blooms(28, 20, 6)}
          <path d="M10 26 H46 V46 Q46 50 42 50 H14 Q10 50 10 46 Z" fill="#34497a" />
          <ellipse cx="28" cy="26" rx="18" ry="3.5" fill="#f4f6fa" />
          <rect x="10" y="36" width="36" height="4" fill="#f2a7b8" />
          <circle cx="28" cy="38" r="3" fill="#e98fa3" />
        </svg>
      )
  }
}
