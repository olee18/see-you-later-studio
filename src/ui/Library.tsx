import type React from 'react'
import { FLOWERS, FLOWER_TYPES, type FlowerType } from '../data/flowers'
import { MAX_STEMS } from '../state/layout'
import { placeFlower, useDesign, useUI } from '../state/store'
import { stage } from '../three/stage'
import { FlowerGlyph } from './FlowerGlyph'

const flowers = FLOWER_TYPES.filter((t) => FLOWERS[t].category === 'flower')
const fillers = FLOWER_TYPES.filter((t) => FLOWERS[t].category === 'filler')

const isOverCanvas = (x: number, y: number) => document.elementFromPoint(x, y)?.tagName === 'CANVAS'

/**
 * Pointer-based drag (works for mouse, pen and touch). A tap / click without
 * movement simply adds the flower to the next natural spiral position.
 */
function startDrag(e: React.PointerEvent, type: FlowerType) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const sx = e.clientX
  const sy = e.clientY
  const pid = e.pointerId
  let moved = false
  const ui = useUI.getState()

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return
    if (!moved) ui.set({ selectedId: null })
    moved = true
    const overCanvas = isOverCanvas(ev.clientX, ev.clientY)
    const stems = useDesign.getState().design.stems
    let slot: number | null = null
    if (overCanvas && stems.length < MAX_STEMS) slot = stage.slotAt(ev.clientX, ev.clientY, new Set(stems.map((s) => s.slot)))
    useUI.getState().set({ libDrag: { type, x: ev.clientX, y: ev.clientY, overCanvas, slot } })
  }
  const cleanup = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('blur', abort)
  }
  const abort = () => {
    cleanup()
    useUI.getState().set({ libDrag: null })
  }
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    cleanup()
    const st = useUI.getState().libDrag
    useUI.getState().set({ libDrag: null })
    if (!moved) placeFlower(type)
    else if (st?.overCanvas) placeFlower(type, st.slot)
  }
  const cancel = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    cleanup()
    useUI.getState().set({ libDrag: null })
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('blur', abort)
}

function Item({ type }: { type: FlowerType }) {
  const def = FLOWERS[type]
  return (
    <button
      className="lib-item"
      onPointerDown={(e) => startDrag(e, type)}
      onClick={(e) => {
        // keyboard activation (Enter / Space) has detail === 0
        if (e.detail === 0) placeFlower(type)
      }}
      onDragStart={(e) => e.preventDefault()}
      aria-label={`Add ${def.name}`}
    >
      <span className="lib-glyph">
        <FlowerGlyph type={type} />
      </span>
      <span className="lib-text">
        <span className="lib-name">{def.name}</span>
        <span className="lib-latin">{def.latin}</span>
      </span>
    </button>
  )
}

export function Library() {
  const count = useDesign((s) => s.design.stems.length)
  return (
    <aside className="panel library" aria-label="Flower library">
      <header className="panel-head">
        <h2>Flower Library</h2>
        <p className="muted">Drag onto the bouquet, or tap to add</p>
      </header>
      <div className="lib-scroll">
        <h3 className="lib-section">Flowers</h3>
        <div className="lib-grid">
          {flowers.map((t) => (
            <Item key={t} type={t} />
          ))}
        </div>
        <h3 className="lib-section">Fillers &amp; Greens</h3>
        <div className="lib-grid">
          {fillers.map((t) => (
            <Item key={t} type={t} />
          ))}
        </div>
      </div>
      <footer className="lib-foot">
        <div className="meter" aria-hidden="true">
          <div className="meter-fill" style={{ width: `${(count / MAX_STEMS) * 100}%` }} />
        </div>
        <span className="muted">
          {count} / {MAX_STEMS} stems
        </span>
      </footer>
    </aside>
  )
}

/** Floating chip that follows the pointer while dragging from the library. */
export function DragGhost() {
  const d = useUI((s) => s.libDrag)
  if (!d) return null
  const hint = !d.overCanvas ? 'Drop on the bouquet' : d.slot != null ? 'Release to place' : 'Release to add'
  return (
    <div className="drag-ghost" style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
      <FlowerGlyph type={d.type} size={52} />
      <span>{hint}</span>
    </div>
  )
}
