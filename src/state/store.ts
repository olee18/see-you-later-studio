import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { FlowerType, StemColors } from '../data/flowers'
import { arrangeStems, defaultDesign, makeStem, sanitizeDesign, uid } from './design'
import { MAX_STEMS, autoSlot } from './layout'
import type { Design, Stem } from './types'

export { defaultDesign, makeStem, sampleDesign, sanitizeDesign } from './design'

/** ids of stems added this session → play the placement animation once (value = delay in s) */
export const freshIds = new Map<string, number>()

export const MAX_BOUQUETS = 30

export interface SavedBouquet {
  id: string
  name: string
  updatedAt: number
  /** made by a theme / Surprise Me and not edited since → safe to replace in place */
  generated?: boolean
  design: Design
}

type DesignPatch = { [K in keyof Omit<Design, 'v' | 'stems'>]?: Partial<Design[K]> }

interface DesignState {
  design: Design
  currentId: string
  bouquets: SavedBouquet[]
  // stems
  addStem: (type: FlowerType, slot?: number | null) => string | null
  updateStem: (id: string, patch: Partial<Stem>) => void
  removeStem: (id: string) => void
  recolorType: (type: FlowerType, colors: Partial<StemColors>) => void
  autoArrange: () => void
  clear: () => void
  // whole-design styling
  updateDesign: (patch: DesignPatch) => void
  setDesign: (design: Design) => void
  // bouquet collection
  applyGenerated: (design: Design, name: string) => void
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
    try { localStorage.setItem(k, v) } catch { /* storage full / blocked: ignore */ }
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  },
}

function nextName(bouquets: SavedBouquet[], base: string) {
  const names = new Set(bouquets.map((b) => b.name))
  if (!names.has(base)) return base
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`
}

function firstBouquet(): SavedBouquet {
  return { id: uid(), name: 'My Bouquet', updatedAt: Date.now(), design: defaultDesign() }
}

const initial = firstBouquet()

export const useDesign = create<DesignState>()(
  persist(
    (set, get) => {
      /** Write a new version of the current design (and mark it user-edited). */
      const commit = (design: Design, generated = false) => {
        const { currentId, bouquets } = get()
        set({
          design,
          bouquets: bouquets.map((b) => (b.id === currentId ? { ...b, design, updatedAt: Date.now(), generated } : b)),
        })
      }
      const openBouquet = (b: SavedBouquet, list: SavedBouquet[]) => {
        set({ bouquets: list, currentId: b.id, design: b.design })
        useUI.getState().set({ selectedId: null, removing: [] })
      }

      return {
        design: initial.design,
        currentId: initial.id,
        bouquets: [initial],

        addStem: (type, slot) => {
          const d = get().design
          if (d.stems.length >= MAX_STEMS) return null
          const occupied = new Set(d.stems.map((s) => s.slot))
          const s = slot != null && !occupied.has(slot) ? slot : autoSlot(type, occupied)
          if (s == null) return null
          const stem = makeStem(type, s)
          freshIds.set(stem.id, 0)
          commit({ ...d, stems: [...d.stems, stem] })
          return stem.id
        },
        updateStem: (id, patch) => {
          const d = get().design
          commit({ ...d, stems: d.stems.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
        },
        removeStem: (id) => {
          const d = get().design
          commit({ ...d, stems: d.stems.filter((s) => s.id !== id) })
        },
        recolorType: (type, colors) => {
          const d = get().design
          commit({ ...d, stems: d.stems.map((s) => (s.type === type ? { ...s, colors: { ...s.colors, ...colors } } : s)) })
        },
        autoArrange: () => {
          const d = get().design
          commit({ ...d, stems: arrangeStems(d.stems) })
        },
        clear: () => commit({ ...get().design, stems: [] }),

        updateDesign: (patch) => {
          const d = get().design
          const next = { ...d } as Design
          for (const k of Object.keys(patch) as (keyof DesignPatch)[]) {
            ;(next as unknown as Record<string, unknown>)[k] = { ...d[k], ...patch[k] }
          }
          commit(next)
        },
        setDesign: (design) => commit(design),

        applyGenerated: (design, name) => {
          const st = get()
          const cur = st.bouquets.find((b) => b.id === st.currentId)
          design.stems.forEach((s, i) => freshIds.set(s.id, i * 0.035))
          if (cur && (cur.generated || cur.design.stems.length === 0)) {
            set({
              design,
              bouquets: st.bouquets.map((b) =>
                b.id === cur.id ? { ...b, design, generated: true, updatedAt: Date.now(), name: b.generated || b.name.startsWith('My Bouquet') ? nextName(st.bouquets.filter((x) => x.id !== b.id), name) : b.name } : b,
              ),
            })
            useUI.getState().set({ selectedId: null })
          } else {
            if (st.bouquets.length >= MAX_BOUQUETS) return useUI.getState().notify(`You can keep up to ${MAX_BOUQUETS} bouquets — delete one first.`)
            const b: SavedBouquet = { id: uid(), name: nextName(st.bouquets, name), updatedAt: Date.now(), generated: true, design }
            openBouquet(b, [b, ...st.bouquets])
            useUI.getState().notify(`Started a new bouquet: ${b.name}`)
          }
        },
        newBouquet: () => {
          const st = get()
          if (st.bouquets.length >= MAX_BOUQUETS) return useUI.getState().notify(`You can keep up to ${MAX_BOUQUETS} bouquets — delete one first.`)
          const d = defaultDesign()
          // keep the current styling so a new bouquet feels like "same studio, fresh stems"
          const b: SavedBouquet = { id: uid(), name: nextName(st.bouquets, 'My Bouquet'), updatedAt: Date.now(), design: { ...d, background: st.design.background } }
          openBouquet(b, [b, ...st.bouquets])
        },
        switchBouquet: (id) => {
          const b = get().bouquets.find((x) => x.id === id)
          if (b && id !== get().currentId) openBouquet(b, get().bouquets)
        },
        renameBouquet: (id, name) => {
          const clean = name.trim().slice(0, 40) || 'Untitled bouquet'
          set({ bouquets: get().bouquets.map((b) => (b.id === id ? { ...b, name: clean } : b)) })
        },
        duplicateBouquet: (id) => {
          const st = get()
          const src = st.bouquets.find((b) => b.id === id)
          if (!src) return
          if (st.bouquets.length >= MAX_BOUQUETS) return useUI.getState().notify(`You can keep up to ${MAX_BOUQUETS} bouquets — delete one first.`)
          const design: Design = { ...src.design, stems: src.design.stems.map((s) => ({ ...s, id: uid() })) }
          const b: SavedBouquet = { id: uid(), name: nextName(st.bouquets, `${src.name} copy`), updatedAt: Date.now(), design }
          openBouquet(b, [b, ...st.bouquets])
        },
        deleteBouquet: (id) => {
          const st = get()
          let list = st.bouquets.filter((b) => b.id !== id)
          if (list.length === 0) list = [firstBouquet()]
          if (id === st.currentId) openBouquet(list[0], list)
          else set({ bouquets: list })
        },
      }
    },
    {
      name: 'bloom-studio:design',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ bouquets: s.bouquets, currentId: s.currentId }),
      migrate: (persisted, version) => {
        // v1 stored a single design
        if (version < 2) {
          const p = persisted as { design?: unknown } | undefined
          const b = { ...firstBouquet(), design: sanitizeDesign(p?.design) }
          return { bouquets: [b], currentId: b.id }
        }
        return persisted
      },
      merge: (persisted, current) => {
        const p = persisted as { bouquets?: unknown; currentId?: unknown } | undefined
        const raw = Array.isArray(p?.bouquets) ? (p!.bouquets as Partial<SavedBouquet>[]) : []
        const bouquets: SavedBouquet[] = raw.slice(0, MAX_BOUQUETS).map((b) => ({
          id: typeof b.id === 'string' ? b.id.slice(0, 16) : uid(),
          name: typeof b.name === 'string' ? b.name.slice(0, 40) : 'My Bouquet',
          updatedAt: typeof b.updatedAt === 'number' ? b.updatedAt : Date.now(),
          generated: !!b.generated,
          design: sanitizeDesign(b.design),
        }))
        if (bouquets.length === 0) return current
        const cur = bouquets.find((b) => b.id === p?.currentId) ?? bouquets[0]
        return { ...current, bouquets, currentId: cur.id, design: cur.design }
      },
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
  styleOpen: boolean
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
  styleOpen: typeof window !== 'undefined' ? window.innerWidth >= 820 : true,
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
