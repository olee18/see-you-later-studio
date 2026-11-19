import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { FlowerType, StemColors } from '../data/flowers'
import { MAX_ITEMS } from '../gift/layout'
import {
  STYLES, defaultGift, emptyGift, giftFromStyle, makeItem, randomGift, sanitizeGift, styleById,
  type GiftDesign, type SizeId,
} from '../gift/styles'

export const MAX_BOUQUETS = 30

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)

export interface SavedBouquet {
  id: string
  name: string
  updatedAt: number
  /** name follows the chosen template until the user renames it */
  autoName?: boolean
  design: GiftDesign
}

interface DesignState {
  design: GiftDesign
  currentId: string
  bouquets: SavedBouquet[]
  // paper / ribbon / card
  update: (patch: Partial<Pick<GiftDesign, 'wrap' | 'ribbon' | 'card'>>) => void
  // starting points
  applyTemplate: (styleId: string, size?: SizeId) => void
  startEmpty: () => void
  surprise: () => void
  // arranging
  addItem: (type: FlowerType, colors: StemColors, slot?: number | null) => boolean
  removeItem: (i: number) => void
  swapItems: (i: number, j: number) => void
  recolorItem: (i: number, colors: StemColors) => void
  // saved bouquets
  newBouquet: () => void
  switchBouquet: (id: string) => void
  renameBouquet: (id: string, name: string) => void
  duplicateBouquet: (id: string) => void
  deleteBouquet: (id: string) => void
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try { return localStorage.getItem(k) } catch { return null }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v) } catch { /* storage full / blocked */ }
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  },
}

function uniqueName(list: SavedBouquet[], base: string, exceptId?: string) {
  const names = new Set(list.filter((b) => b.id !== exceptId).map((b) => b.name))
  if (!names.has(base)) return base
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`
}

const baseName = (d: GiftDesign) => styleById(d.style)?.name ?? 'My Bouquet'

function fresh(design = defaultGift(), list: SavedBouquet[] = []): SavedBouquet {
  return { id: uid(), name: uniqueName(list, baseName(design)), updatedAt: Date.now(), autoName: true, design }
}

const initial = fresh()
const full = () => useUI.getState().notify(`You can keep up to ${MAX_BOUQUETS} bouquets — delete one first.`)

export const useDesign = create<DesignState>()(
  persist(
    (set, get) => {
      const commit = (design: GiftDesign) => {
        const { currentId, bouquets } = get()
        set({
          design,
          bouquets: bouquets.map((b) =>
            b.id === currentId ? { ...b, design, updatedAt: Date.now(), name: b.autoName ? uniqueName(bouquets, baseName(design), b.id) : b.name } : b,
          ),
        })
      }
      const open = (b: SavedBouquet, list: SavedBouquet[]) => {
        set({ bouquets: list, currentId: b.id, design: b.design })
        useUI.getState().set({ selected: null })
      }
      const keepCard = (d: GiftDesign) => ({ ...d, card: get().design.card })
      return {
        design: initial.design,
        currentId: initial.id,
        bouquets: [initial],

        update: (patch) => commit({ ...get().design, ...patch }),

        applyTemplate: (styleId, size) => {
          useUI.getState().set({ selected: null })
          commit(keepCard(giftFromStyle(styleId, size)))
        },
        startEmpty: () => {
          useUI.getState().set({ selected: null })
          const d = get().design
          commit({ ...emptyGift(), wrap: d.wrap, ribbon: d.ribbon, card: d.card })
        },
        surprise: () => {
          useUI.getState().set({ selected: null })
          commit(keepCard(randomGift()))
        },

        addItem: (type, colors, slot) => {
          const d = get().design
          if (d.items.length >= MAX_ITEMS) {
            useUI.getState().notify(`The bouquet is full — ${MAX_ITEMS} flowers max.`)
            return false
          }
          const it = makeItem(type, colors)
          const items = [...d.items]
          if (slot != null && slot < items.length) {
            // the new flower takes that spot; the one that was there moves to the rim
            items.push(items[slot])
            items[slot] = it
          } else items.push(it)
          commit({ ...d, items })
          return true
        },
        removeItem: (i) => {
          const d = get().design
          if (i < 0 || i >= d.items.length) return
          // fill the hole with the outermost flower so nothing else moves
          const items = [...d.items]
          const last = items.pop()!
          if (i < items.length) items[i] = last
          commit({ ...d, items })
          useUI.getState().set({ selected: null })
        },
        swapItems: (i, j) => {
          const d = get().design
          if (i === j || i < 0 || j < 0 || i >= d.items.length || j >= d.items.length) return
          const items = [...d.items]
          ;[items[i], items[j]] = [items[j], items[i]]
          commit({ ...d, items })
          useUI.getState().set({ selected: j })
        },
        recolorItem: (i, colors) => {
          const d = get().design
          commit({ ...d, items: d.items.map((it, k) => (k === i ? { ...it, colors } : it)) })
        },

        newBouquet: () => {
          const st = get()
          if (st.bouquets.length >= MAX_BOUQUETS) return full()
          const b = fresh(giftFromStyle(STYLES[Math.floor(Math.random() * STYLES.length)].id, 'M'), st.bouquets)
          open(b, [b, ...st.bouquets])
        },
        switchBouquet: (id) => {
          const b = get().bouquets.find((x) => x.id === id)
          if (b) open(b, get().bouquets)
        },
        renameBouquet: (id, name) => {
          const clean = name.trim().slice(0, 40)
          set({ bouquets: get().bouquets.map((b) => (b.id === id ? { ...b, name: clean || b.name, autoName: clean ? false : b.autoName } : b)) })
        },
        duplicateBouquet: (id) => {
          const st = get()
          const src = st.bouquets.find((b) => b.id === id)
          if (!src) return
          if (st.bouquets.length >= MAX_BOUQUETS) return full()
          const b: SavedBouquet = { id: uid(), name: uniqueName(st.bouquets, `${src.name} copy`), updatedAt: Date.now(), design: { ...src.design } }
          open(b, [b, ...st.bouquets])
        },
        deleteBouquet: (id) => {
          const st = get()
          let list = st.bouquets.filter((b) => b.id !== id)
          if (list.length === 0) list = [fresh()]
          if (id === st.currentId) open(list[0], list)
          else set({ bouquets: list })
        },
      }
    },
    {
      name: 'bloom-studio:gifts',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ bouquets: s.bouquets, currentId: s.currentId }),
      merge: (persisted, current) => {
        const p = persisted as { bouquets?: unknown; currentId?: unknown } | undefined
        const raw = Array.isArray(p?.bouquets) ? (p!.bouquets as Partial<SavedBouquet>[]) : []
        const bouquets: SavedBouquet[] = raw.slice(0, MAX_BOUQUETS).map((b) => ({
          id: typeof b.id === 'string' ? b.id.slice(0, 16) : uid(),
          name: typeof b.name === 'string' && b.name ? b.name.slice(0, 40) : 'My Bouquet',
          updatedAt: typeof b.updatedAt === 'number' ? b.updatedAt : Date.now(),
          autoName: !!b.autoName,
          design: sanitizeGift(b.design),
        }))
        if (bouquets.length === 0) return current
        const cur = bouquets.find((b) => b.id === p?.currentId) ?? bouquets[0]
        return { ...current, bouquets, currentId: cur.id, design: cur.design }
      },
    },
  ),
)

/** A flower being dragged from the library. */
export interface LibDrag {
  type: FlowerType
  colors: StemColors
  x: number
  y: number
  overCanvas: boolean
}

interface UIState {
  mode: 'hero' | 'arrange'
  cameraBusy: boolean
  toast: { msg: string; key: number } | null
  reducedMotion: boolean
  lowQuality: boolean
  /** index of the selected flower in design.items */
  selected: number | null
  libDrag: LibDrag | null
  /** flower being dragged inside the bouquet */
  dragHead: number | null
  /** slot the dragged flower would land in (preview ring) */
  dropSlot: number | null
  set: (p: Partial<Omit<UIState, 'set' | 'notify'>>) => void
  notify: (msg: string) => void
}

export const useUI = create<UIState>()((set) => ({
  mode: 'hero',
  cameraBusy: false,
  toast: null,
  reducedMotion: false,
  lowQuality: false,
  selected: null,
  libDrag: null,
  dragHead: null,
  dropSlot: null,
  set: (p) => set(p),
  notify: (msg) => set({ toast: { msg, key: Date.now() } }),
}))
