import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { FLOWERS, FLOWER_TYPES, type FlowerType, type StemColors } from '../data/flowers'
import { MAX_STEMS, autoSlot } from './layout'
import type { Design, Stem } from './types'

// ---------------------------------------------------------------- design model

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)

export function makeStem(type: FlowerType, slot: number, colors?: Partial<StemColors>): Stem {
  const seed = (Math.random() * 2 ** 31) | 0
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
    seed,
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

const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s)
const num = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt

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
    let slot = Number.isInteger(s.slot) && s.slot >= 0 && s.slot < MAX_STEMS && !used.has(s.slot) ? s.slot : autoSlot(s.type, used)
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
        petal: isHex(s.colors?.petal) ? s.colors.petal : dc.petal,
        petal2: isHex(s.colors?.petal2) ? s.colors.petal2 : dc.petal2,
        gradient: num(s.colors?.gradient, 0, 1, dc.gradient),
        center: isHex(s.colors?.center) ? s.colors.center : dc.center,
      },
      seed: num(s.seed, 0, 2 ** 31, 1) | 0,
    })
  }
  return {
    ...base,
    stems,
    greenery: { stem: isHex(r.greenery?.stem) ? r.greenery.stem : base.greenery.stem, leaf: isHex(r.greenery?.leaf) ? r.greenery.leaf : base.greenery.leaf },
    wrap: { ...base.wrap, ...(r.wrap && isHex(r.wrap.color) ? { color: r.wrap.color } : {}) },
    ribbon: { ...base.ribbon, ...(r.ribbon && isHex(r.ribbon.color) ? { color: r.ribbon.color } : {}) },
    card: { text: typeof r.card?.text === 'string' ? r.card.text.slice(0, 140) : '' },
  }
}

// ---------------------------------------------------------------- stores

/** ids of stems added this session → play the placement animation once */
export const freshIds = new Set<string>()

interface DesignState {
  design: Design
  addStem: (type: FlowerType, slot?: number | null) => string | null
  updateStem: (id: string, patch: Partial<Stem>) => void
  removeStem: (id: string) => void
  autoArrange: () => void
  clear: () => void
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try { return localStorage.getItem(k) } catch { return null }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v) } catch { /* storage full / blocked: ignore */ }
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  },
}

export const useDesign = create<DesignState>()(
  persist(
    (set, get) => ({
      design: defaultDesign(),
      addStem: (type, slot) => {
        const d = get().design
        if (d.stems.length >= MAX_STEMS) return null
        const occupied = new Set(d.stems.map((s) => s.slot))
        const s = slot != null && !occupied.has(slot) ? slot : autoSlot(type, occupied)
        if (s == null) return null
        const stem = makeStem(type, s)
        freshIds.add(stem.id)
        set({ design: { ...d, stems: [...d.stems, stem] } })
        return stem.id
      },
      updateStem: (id, patch) => {
        const d = get().design
        set({ design: { ...d, stems: d.stems.map((s) => (s.id === id ? { ...s, ...patch } : s)) } })
      },
      removeStem: (id) => {
        const d = get().design
        set({ design: { ...d, stems: d.stems.filter((s) => s.id !== id) } })
      },
      autoArrange: () => {
        const d = get().design
        set({ design: { ...d, stems: arrangeStems(d.stems) } })
      },
      clear: () => set({ design: { ...get().design, stems: [] } }),
    }),
    {
      name: 'bloom-studio:design',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ design: s.design }),
      merge: (persisted, current) => ({
        ...current,
        design: sanitizeDesign((persisted as { design?: unknown } | undefined)?.design),
      }),
    },
  ),
)

export interface LibDrag {
  type: FlowerType
  x: number
  y: number
  overCanvas: boolean
  slot: number | null
}

export interface Drag3D {
  id: string
  r: number
  a: number
  snap: number | null
}

interface UIState {
  mode: 'hero' | 'arrange'
  cameraBusy: boolean
  selectedId: string | null
  libDrag: LibDrag | null
  drag3d: Drag3D | null
  removing: string[]
  toast: { msg: string; key: number } | null
  reducedMotion: boolean
  lowQuality: boolean
  set: (p: Partial<Omit<UIState, 'set' | 'notify'>>) => void
  notify: (msg: string) => void
}

export const useUI = create<UIState>()((set) => ({
  mode: 'hero',
  cameraBusy: false,
  selectedId: null,
  libDrag: null,
  drag3d: null,
  removing: [],
  toast: null,
  reducedMotion: false,
  lowQuality: false,
  set: (p) => set(p),
  notify: (msg) => set({ toast: { msg, key: Date.now() } }),
}))

/** Add a stem from the UI (click or drop), with user feedback when full. */
export function placeFlower(type: FlowerType, slot?: number | null) {
  const id = useDesign.getState().addStem(type, slot)
  if (!id) useUI.getState().notify(`Your bouquet is full — ${MAX_STEMS} stems max.`)
  return id
}

export function requestRemove(id: string) {
  const ui = useUI.getState()
  if (ui.reducedMotion) {
    useDesign.getState().removeStem(id)
  } else if (!ui.removing.includes(id)) {
    ui.set({ removing: [...ui.removing, id] })
  }
  if (ui.selectedId === id) ui.set({ selectedId: null })
}
