import type { StandId } from '../gift/stands'

/** Little drawings for the stand picker. */
export function StandIcon({ id, size = 56 }: { id: StandId; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 56 56', 'aria-hidden': true } as const
  switch (id) {
    case 'gold':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="si-gold" x1="0" x2="1">
              <stop offset="0" stopColor="#b8913f" />
              <stop offset="0.5" stopColor="#f0d48e" />
              <stop offset="1" stopColor="#b8913f" />
            </linearGradient>
          </defs>
          <path d="M14 10 Q28 26 42 10 L36 22 Q30 26 28 30 Q26 26 20 22 Z" fill="url(#si-gold)" />
          <rect x="26.6" y="28" width="2.8" height="16" rx="1.2" fill="url(#si-gold)" />
          <circle cx="28" cy="36" r="3" fill="url(#si-gold)" />
          <ellipse cx="28" cy="47" rx="12" ry="3.4" fill="url(#si-gold)" />
        </svg>
      )
    case 'ceramic':
      return (
        <svg {...common}>
          <path d="M14 18 H42 L39 44 Q38 47 35 47 H21 Q18 47 17 44 Z" fill="#f4eee7" stroke="#cbbfb2" strokeWidth="1.5" />
          <ellipse cx="28" cy="18" rx="14" ry="3.5" fill="#e7ddd2" stroke="#cbbfb2" strokeWidth="1.5" />
        </svg>
      )
    case 'glass':
      return (
        <svg {...common}>
          <rect x="17" y="10" width="22" height="38" rx="3" fill="#e9f5f4" stroke="#9fc3c0" strokeWidth="1.5" />
          <rect x="18.5" y="28" width="19" height="18.5" rx="2" fill="#bfe1de" opacity="0.8" />
          <path d="M24 46 L25 14 M28 46 L28 12 M32 46 L31 14" stroke="#5f7f4a" strokeWidth="1.6" />
        </svg>
      )
    case 'basket':
      return (
        <svg {...common}>
          <path d="M10 22 H46 L41 46 Q40 48 37 48 H19 Q16 48 15 46 Z" fill="#d7b37b" stroke="#9c7745" strokeWidth="1.5" />
          <path d="M12 30 H44 M13.5 38 H42.5 M20 22 L21 48 M28 22 V48 M36 22 L35 48" stroke="#9c7745" strokeWidth="1.2" />
          <rect x="8.5" y="18.5" width="39" height="5" rx="2.5" fill="#b88f58" />
          <ellipse cx="28" cy="19" rx="16" ry="4" fill="#6f8a4f" />
        </svg>
      )
    case 'box':
      return (
        <svg {...common}>
          <rect x="11" y="20" width="34" height="28" rx="1.5" fill="#d3ad80" stroke="#8a6440" strokeWidth="1.5" />
          <path d="M11 29 H45 M11 38 H45" stroke="#8a6440" strokeWidth="1.2" />
          <rect x="11" y="31" width="34" height="2.5" fill="#e6d4ae" />
          <rect x="13" y="16" width="30" height="5" rx="2" fill="#6f8a4f" />
        </svg>
      )
  }
}
