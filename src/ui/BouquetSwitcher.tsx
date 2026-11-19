import { useEffect, useRef, useState } from 'react'
import { MAX_BOUQUETS, useDesign } from '../state/store'
import { bouquetLabel, useT } from '../i18n'
import { BouquetThumb } from './BouquetThumb'

/** "My bouquets" menu: switch, create, rename, duplicate, delete. */
export function BouquetSwitcher() {
  const bouquets = useDesign((s) => s.bouquets)
  const currentId = useDesign((s) => s.currentId)
  const current = bouquets.find((b) => b.id === currentId)
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const api = useDesign.getState()
  const { t, lang } = useT()
  const label = current ? bouquetLabel(current, lang) : t('myBouquet')

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setRenaming(false)
      setConfirmDelete(null)
    }
  }, [open])

  return (
    <div className="switcher" ref={root}>
      <button className="btn ghost switcher-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="switcher-name">{label}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && current && (
        <div className="menu" role="menu">
          <div className="menu-head">
            {renaming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const v = new FormData(e.currentTarget).get('name')
                  if (String(v ?? '').trim() !== label) api.renameBouquet(current.id, String(v ?? ''))
                  setRenaming(false)
                }}
              >
                <input name="name" className="text-input" defaultValue={label} maxLength={40} autoFocus onBlur={(e) => { if (e.target.value.trim() !== label) api.renameBouquet(current.id, e.target.value); setRenaming(false) }} />
              </form>
            ) : (
              <button className="menu-title" onClick={() => setRenaming(true)} title={t('rename')}>
                {label} <span className="muted">✎ {t('rename')}</span>
              </button>
            )}
          </div>
          <div className="menu-actions">
            <button className="btn ghost sm" onClick={() => { api.newBouquet(); setOpen(false) }}>{t('newBouquet')}</button>
            <button className="btn ghost sm" onClick={() => { api.duplicateBouquet(current.id); setOpen(false) }}>{t('duplicate')}</button>
            <button
              className={`btn ghost sm ${confirmDelete === current.id ? 'danger' : ''}`}
              onClick={() => {
                if (confirmDelete !== current.id) return setConfirmDelete(current.id)
                api.deleteBouquet(current.id)
                setConfirmDelete(null)
              }}
            >
              {confirmDelete === current.id ? t('delConfirm') : t('del')}
            </button>
          </div>
          <div className="menu-label muted">
            {t('myBouquets')} · {bouquets.length}/{MAX_BOUQUETS}
          </div>
          <ul className="menu-list">
            {bouquets.map((b) => (
              <li key={b.id}>
                <button
                  className={`menu-item ${b.id === currentId ? 'is-on' : ''}`}
                  onClick={() => {
                    api.switchBouquet(b.id)
                    setOpen(false)
                  }}
                >
                  <BouquetThumb design={b.design} size={44} />
                  <span className="menu-item-name">{bouquetLabel(b, lang)}</span>
                  <span className="muted">{t('nFlowers', { n: b.design.items.length })}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
