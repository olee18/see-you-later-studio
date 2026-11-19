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
      if (ui.mode !== 'arrange' || ui.selected == null) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        useDesign.getState().removeItem(ui.selected)
      } else if (e.key === 'Escape') ui.set({ selected: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
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
      <p className="lede">Start from a beautiful ready-made bouquet or arrange your own flower by flower — then choose the paper and the bow, and surprise the one you love.</p>
      <button className="btn primary big" onClick={() => useUI.getState().set({ mode: 'arrange' })} tabIndex={mode === 'hero' ? 0 : -1}>
        Create a bouquet
      </button>
    </section>
  )
}

function Toolbar() {
  return (
    <div className="toolbar" role="toolbar" aria-label="Bouquet tools">
      <button className="btn ghost" onClick={() => useUI.getState().set({ mode: 'hero' })} aria-label="Back to the studio">
        ←<span className="desk-only"> Studio</span>
      </button>
      <BouquetSwitcher />
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
      </div>
      <DragGhost />
      <Toast />
    </div>
  )
}
