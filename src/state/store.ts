import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { STYLES, defaultGift, giftFromStyle, randomGift, sanitizeGift, styleById, type GiftDesign } from '../gift/styles'

export const MAX_BOUQUETS = 30

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)

export interface SavedBouquet {
  id: string
  name: string
  updatedAt: number
  /** name follows the chosen style until the user renames it */
  autoName?: boolean
  design: GiftDesign
}

interface DesignState {
  design: GiftDesign
  currentId: string
  bouquets: SavedBouquet[]
  update: (patch: Partial<GiftDesign>) => void
  chooseStyle: (styleId: string) => void
  surprise: () => void
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

function fresh(design = defaultGift(), list: SavedBouquet[] = []): SavedBouquet {
  return { id: uid(), name: uniqueName(list, styleById(design.style).name), updatedAt: Date.now(), autoName: true, design }
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
            b.id === currentId
              ? { ...b, design, updatedAt: Date.now(), name: b.autoName ? uniqueName(bouquets, styleById(design.style).name, b.id) : b.name }
              : b,
          ),
        })
      }
      const open = (b: SavedBouquet, list: SavedBouquet[]) => set({ bouquets: list, currentId: b.id, design: b.design })
      return {
        design: initial.design,
        currentId: initial.id,
        bouquets: [initial],
        update: (patch) => commit({ ...get().design, ...patch }),
        // picking a style also brings that style's own paper and ribbon (keeps the size)
        chooseStyle: (styleId) => commit({ ...giftFromStyle(styleId, get().design.size), card: get().design.card }),
        surprise: () => commit({ ...randomGift(), card: get().design.card }),
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

interface UIState {
  mode: 'hero' | 'arrange'
  cameraBusy: boolean
  toast: { msg: string; key: number } | null
  reducedMotion: boolean
  lowQuality: boolean
  set: (p: Partial<Omit<UIState, 'set' | 'notify'>>) => void
  notify: (msg: string) => void
}

export const useUI = create<UIState>()((set) => ({
  mode: 'hero',
  cameraBusy: false,
  toast: null,
  reducedMotion: false,
  lowQuality: false,
  set: (p) => set(p),
  notify: (msg) => set({ toast: { msg, key: Date.now() } }),
}))
