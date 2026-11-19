import { useEffect } from 'react'
import { LANGS, bouquetLabel, useLang, useT } from './i18n'
import { useDesign, useUI } from './state/store'
import { Scene } from './three/Scene'
import { BouquetSwitcher } from './ui/BouquetSwitcher'
import { DragGhost } from './ui/FlowerLibrary'
import { GiftPanel } from './ui/GiftPanel'
import { PhotoMode } from './ui/PhotoMode'
import { usePhoto } from './state/photo'

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
      if (ui.mode === 'photo' && e.key === 'Escape') {
        const ph = usePhoto.getState()
        if (ph.result) ph.set({ result: null })
        else ui.set({ mode: 'arrange' })
        return
      }
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
  const current = useDesign((s) => s.bouquets.find((b) => b.id === s.currentId))
  const n = useDesign((s) => s.design.items.length)
  const { t, lang } = useT()
  if (!n || !current) return null
  return (
    <button className="link-btn" onClick={() => useUI.getState().set({ mode: 'arrange', tab: 'flowers' })}>
      {t('continue', { name: bouquetLabel(current, lang), n })}
    </button>
  )
}

/** ລາວ · ไทย · EN */
function LangSwitch({ tabbable = true }: { tabbable?: boolean }) {
  const lang = useLang((s) => s.lang)
  const { t } = useT()
  return (
    <div className="lang-switch" role="radiogroup" aria-label={t('language')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={l.id === lang}
          className={l.id === lang ? 'is-on' : ''}
          onClick={() => useLang.getState().setLang(l.id)}
          title={l.name}
          lang={l.id}
          tabIndex={tabbable ? 0 : -1}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** Phone toolbar: one button that steps ລາວ → ไทย → EN. */
function LangCycle() {
  const lang = useLang((s) => s.lang)
  const { t } = useT()
  const i = LANGS.findIndex((l) => l.id === lang)
  const next = LANGS[(i + 1) % LANGS.length]
  return (
    <button className="btn ghost lang-cycle" onClick={() => useLang.getState().setLang(next.id)} aria-label={`${t('language')}: ${LANGS[i].name} → ${next.name}`}>
      {LANGS[i].label}
    </button>
  )
}

function Hero() {
  const mode = useUI((s) => s.mode)
  const { t } = useT()
  return (
    <section className={`hero ${mode === 'hero' ? 'is-on' : ''}`} aria-hidden={mode !== 'hero'}>
      <LangSwitch tabbable={mode === 'hero'} />
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1>
        Bloom
        <br />
        Studio
      </h1>
      <p className="lede">{t('lede')}</p>
      <div className="hero-actions">
        <button
          className="btn primary big"
          onClick={() => {
            useDesign.getState().arrangeFromScratch()
            useUI.getState().set({ mode: 'arrange', tab: 'flowers' })
          }}
          tabIndex={mode === 'hero' ? 0 : -1}
        >
          {t('arrangeOwn')}
        </button>
        <button className="btn ghost big" onClick={() => useUI.getState().set({ mode: 'arrange', tab: 'templates' })} tabIndex={mode === 'hero' ? 0 : -1}>
          {t('startReady')}
        </button>
      </div>
      <ContinueLink />
    </section>
  )
}

function UndoRedo() {
  const canUndo = useDesign((s) => s.past.length > 0)
  const canRedo = useDesign((s) => s.future.length > 0)
  const { t } = useT()
  return (
    <>
      <button className="btn ghost icon" disabled={!canUndo} onClick={() => useDesign.getState().undo()} aria-label={t('undo')} title={`${t('undo')} (Ctrl/⌘ Z)`}>
        ↶
      </button>
      <button className="btn ghost icon" disabled={!canRedo} onClick={() => useDesign.getState().redo()} aria-label={t('redo')} title={`${t('redo')} (Ctrl/⌘ Shift Z)`}>
        ↷
      </button>
    </>
  )
}

function EmptyHint() {
  const n = useDesign((s) => s.design.items.length)
  const mode = useUI((s) => s.mode)
  const busy = useUI((s) => s.cameraBusy)
  const { t } = useT()
  if (n > 0 || mode !== 'arrange' || busy) return null
  return (
    <div className="empty-hint">
      <strong>{t('emptyTitle')}</strong>
      <span>{t('emptyBody')}</span>
    </div>
  )
}

function Toolbar() {
  const { t } = useT()
  return (
    <div className="toolbar" role="toolbar" aria-label={t('tools')}>
      <button className="btn ghost" onClick={() => useUI.getState().set({ mode: 'hero' })} aria-label={t('backAria')}>
        ←<span className="desk-only"> {t('studio')}</span>
      </button>
      <BouquetSwitcher />
      <UndoRedo />
      <button className="btn primary photo-btn" onClick={() => useUI.getState().set({ mode: 'photo', selected: null })} aria-label={t('photoMode')}>
        📷<span className="desk-only"> {t('photo')}</span>
      </button>
      <LangSwitch />
      <LangCycle />
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
      <PhotoMode />
      <DragGhost />
      <Toast />
    </div>
  )
}
