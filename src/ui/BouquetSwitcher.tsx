import { useEffect, useRef, useState } from 'react'
import { MAX_BOUQUETS, useDesign } from '../state/store'
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
        <span className="switcher-name">{current?.name ?? 'My Bouquet'}</span>
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
                  api.renameBouquet(current.id, String(v ?? ''))
                  setRenaming(false)
                }}
              >
                <input name="name" className="text-input" defaultValue={current.name} maxLength={40} autoFocus onBlur={(e) => { api.renameBouquet(current.id, e.target.value); setRenaming(false) }} />
              </form>
            ) : (
              <button className="menu-title" onClick={() => setRenaming(true)} title="Rename">
                {current.name} <span className="muted">✎ rename</span>
              </button>
            )}
          </div>
          <div className="menu-actions">
            <button className="btn ghost sm" onClick={() => { api.newBouquet(); setOpen(false) }}>+ New</button>
            <button className="btn ghost sm" onClick={() => { api.duplicateBouquet(current.id); setOpen(false) }}>Duplicate</button>
            <button
              className={`btn ghost sm ${confirmDelete === current.id ? 'danger' : ''}`}
              onClick={() => {
                if (confirmDelete !== current.id) return setConfirmDelete(current.id)
                api.deleteBouquet(current.id)
                setConfirmDelete(null)
              }}
            >
              {confirmDelete === current.id ? 'Tap again to delete' : 'Delete'}
            </button>
          </div>
          <div className="menu-label muted">
            My bouquets · {bouquets.length}/{MAX_BOUQUETS}
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
                  <BouquetThumb design={b.design} size={34} />
                  <span className="menu-item-name">{b.name}</span>
                  <span className="muted">{b.design.items.length} flowers</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
