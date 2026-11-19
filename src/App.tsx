import { useEffect } from 'react'
import { useDesign, useUI } from './state/store'
import { Scene } from './three/Scene'
import { BouquetSwitcher } from './ui/BouquetSwitcher'
import { DragGhost } from './ui/FlowerLibrary'
import { GiftPanel } from './ui/GiftPanel'

function useReducedMotionSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => useUI.getState().set({ reducedMotion: mq.matches })
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const ui = useUI.getState()
      if (ui.mode !== 'arrange') return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) useDesign.getState().redo()
        else useDesign.getState().undo()
        return
      }
      if (ui.selected == null) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        useDesign.getState().removeItem(ui.selected)
      } else if (e.key === 'Escape') ui.set({ selected: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** If they already have a bouquet in progress, let them jump back in. */
function ContinueLink() {
  const name = useDesign((s) => s.bouquets.find((b) => b.id === s.currentId)?.name)
  const n = useDesign((s) => s.design.items.length)
  if (!n) return null
  return (
    <button className="link-btn" onClick={() => useUI.getState().set({ mode: 'arrange', tab: 'flowers' })}>
      Continue “{name}” ({n} flowers) →
    </button>
  )
}

function Hero() {
  const mode = useUI((s) => s.mode)
  return (
    <section className={`hero ${mode === 'hero' ? 'is-on' : ''}`} aria-hidden={mode !== 'hero'}>
      <p className="eyebrow">Bouquets for someone special</p>
      <h1>
        Bloom
        <br />
        Studio
      </h1>
      <p className="lede">Arrange your own bouquet one flower at a time — every flower, every colour, your choice. Then wrap it, tie the bow, and surprise the one you love.</p>
      <div className="hero-actions">
        <button
          className="btn primary big"
          onClick={() => {
            useDesign.getState().arrangeFromScratch()
            useUI.getState().set({ mode: 'arrange', tab: 'flowers' })
          }}
          tabIndex={mode === 'hero' ? 0 : -1}
        >
          Arrange my own bouquet
        </button>
        <button className="btn ghost big" onClick={() => useUI.getState().set({ mode: 'arrange', tab: 'templates' })} tabIndex={mode === 'hero' ? 0 : -1}>
          Start from a ready-made one
        </button>
      </div>
      <ContinueLink />
    </section>
  )
}

function UndoRedo() {
  const canUndo = useDesign((s) => s.past.length > 0)
  const canRedo = useDesign((s) => s.future.length > 0)
  return (
    <>
      <button className="btn ghost icon" disabled={!canUndo} onClick={() => useDesign.getState().undo()} aria-label="Undo" title="Undo (Ctrl/⌘ Z)">
        ↶
      </button>
      <button className="btn ghost icon" disabled={!canRedo} onClick={() => useDesign.getState().redo()} aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)">
        ↷
      </button>
    </>
  )
}

function EmptyHint() {
  const n = useDesign((s) => s.design.items.length)
  const mode = useUI((s) => s.mode)
  const busy = useUI((s) => s.cameraBusy)
  if (n > 0 || mode !== 'arrange' || busy) return null
  return (
    <div className="empty-hint">
      <strong>Your bouquet starts here</strong>
      <span>Tap a colour in the flower list to add your first flower — or drag it right onto the bouquet.</span>
    </div>
  )
}

function Toolbar() {
  return (
    <div className="toolbar" role="toolbar" aria-label="Bouquet tools">
      <button className="btn ghost" onClick={() => useUI.getState().set({ mode: 'hero' })} aria-label="Back to the studio">
        ←<span className="desk-only"> Studio</span>
      </button>
      <BouquetSwitcher />
      <UndoRedo />
    </div>
  )
}

function Toast() {
  const toast = useUI((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useUI.getState().set({ toast: null }), 2600)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast && <span key={toast.key}>{toast.msg}</span>}
    </div>
  )
}

export default function App() {
  useReducedMotionSync()
  useKeyboard()
  const mode = useUI((s) => s.mode)
  return (
    <div className={`app mode-${mode}`}>
      <div className="canvas-wrap">
        <Scene />
      </div>
      <div className="brand">Bloom Studio</div>
      <Hero />
      <div className="studio-ui" aria-hidden={mode !== 'arrange'}>
        <GiftPanel />
        <Toolbar />
        <EmptyHint />
      </div>
      <DragGhost />
      <Toast />
    </div>
  )
}
