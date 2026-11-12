import { useEffect, useState } from 'react'
import { MAX_STEMS } from './state/layout'
import { requestRemove, useDesign, useUI } from './state/store'
import { Scene } from './three/Scene'
import { Inspector } from './ui/Inspector'
import { DragGhost, Library } from './ui/Library'

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
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key !== 'Escape') return
      }
      const ui = useUI.getState()
      if (ui.mode !== 'arrange') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedId) {
        e.preventDefault()
        requestRemove(ui.selectedId)
      } else if (e.key === 'Escape') {
        ui.set({ selectedId: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Hero() {
  const mode = useUI((s) => s.mode)
  const hasDesign = useDesign((s) => s.design.stems.length > 0)
  return (
    <section className={`hero ${mode === 'hero' ? 'is-on' : ''}`} aria-hidden={mode !== 'hero'}>
      <p className="eyebrow">A flower-arranging studio</p>
      <h1>
        Bloom
        <br />
        Studio
      </h1>
      <p className="lede">Design a bouquet stem by stem — choose from popular blooms and greens and arrange them in a natural hand-tied spiral.</p>
      <button className="btn primary big" onClick={() => useUI.getState().set({ mode: 'arrange' })} tabIndex={mode === 'hero' ? 0 : -1}>
        {hasDesign ? 'Continue Arranging' : 'Start Arranging'}
      </button>
    </section>
  )
}

function Toolbar() {
  const count = useDesign((s) => s.design.stems.length)
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => {
    if (!confirmClear) return
    const t = setTimeout(() => setConfirmClear(false), 3000)
    return () => clearTimeout(t)
  }, [confirmClear])
  return (
    <div className="toolbar" role="toolbar" aria-label="Bouquet tools">
      <button className="btn ghost" onClick={() => useUI.getState().set({ mode: 'hero', selectedId: null })}>
        ← Studio
      </button>
      <span className="toolbar-count">
        {count}/{MAX_STEMS}
      </span>
      <button className="btn ghost" disabled={count < 2} onClick={() => useDesign.getState().autoArrange()} title="Tallest focal flowers to the centre, fillers to the edge">
        Auto-arrange
      </button>
      <button
        className={`btn ghost ${confirmClear ? 'danger' : ''}`}
        disabled={count === 0}
        onClick={() => {
          if (!confirmClear) return setConfirmClear(true)
          useDesign.getState().clear()
          useUI.getState().set({ selectedId: null })
          setConfirmClear(false)
        }}
      >
        {confirmClear ? 'Tap again to clear' : 'Clear'}
      </button>
    </div>
  )
}

function EmptyHint() {
  const count = useDesign((s) => s.design.stems.length)
  const busy = useUI((s) => s.cameraBusy)
  if (count > 0 || busy) return null
  return <div className="empty-hint">Drag a flower from the library into the cone to begin</div>
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
  const selected = useUI((s) => s.selectedId)
  return (
    <div className={`app mode-${mode} ${selected ? 'has-selection' : ''}`}>
      <div className="canvas-wrap">
        <Scene />
      </div>
      <div className="brand">Bloom Studio</div>
      <Hero />
      <div className="studio-ui" aria-hidden={mode !== 'arrange'}>
        <Library />
        <Inspector />
        <Toolbar />
        <EmptyHint />
      </div>
      <DragGhost />
      <Toast />
    </div>
  )
}
