import type React from 'react'
import { FLOWERS, FLOWER_TYPES, type FlowerType, type StemColors } from '../data/flowers'
import { FLOWER_COLORS } from '../gift/palettes'
import { MAX_ITEMS } from '../gift/layout'
import { useDesign, useUI } from '../state/store'
import { slotAtScreen } from '../three/stage'
import { FlowerGlyph } from './FlowerGlyph'

const flowers = FLOWER_TYPES.filter((t) => FLOWERS[t].category === 'flower')
const fillers = FLOWER_TYPES.filter((t) => FLOWERS[t].category === 'filler')

const isOverCanvas = (x: number, y: number) => document.elementFromPoint(x, y)?.tagName === 'CANVAS'

/**
 * Tap a colour dot → the flower goes into the next spot around the rim.
 * Drag a dot onto the bouquet → it goes exactly where you drop it.
 */
function startDrag(e: React.PointerEvent, type: FlowerType, colors: StemColors) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const sx = e.clientX
  const sy = e.clientY
  const pid = e.pointerId
  let moved = false
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return
    moved = true
    const overCanvas = isOverCanvas(ev.clientX, ev.clientY)
    const n = useDesign.getState().design.items.length
    const slot = overCanvas ? slotAtScreen(ev.clientX, ev.clientY, n + 1) : null
    useUI.getState().set({ libDrag: { type, colors, x: ev.clientX, y: ev.clientY, overCanvas }, dropSlot: slot })
  }
  const cleanup = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('blur', blur)
  }
  const reset = () => useUI.getState().set({ libDrag: null, dropSlot: null })
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    cleanup()
    const st = useUI.getState()
    const drag = st.libDrag
    const slot = st.dropSlot
    reset()
    if (!moved) add(type, colors, null)
    else if (drag?.overCanvas) add(type, colors, slot)
  }
  const cancel = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    cleanup()
    reset()
  }
  const blur = () => {
    cleanup()
    reset()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('blur', blur)
}

function add(type: FlowerType, colors: StemColors, slot: number | null) {
  const ok = useDesign.getState().addItem(type, colors, slot)
  if (ok) {
    const items = useDesign.getState().design.items
    useUI.getState().set({ selected: slot != null && slot < items.length - 1 ? slot : items.length - 1 })
  }
}

function Row({ type }: { type: FlowerType }) {
  const def = FLOWERS[type]
  const options = FLOWER_COLORS[type]
  return (
    <div className="flower-row">
      <span className="lib-glyph">
        <FlowerGlyph type={type} colors={options[0].colors} size={40} />
      </span>
      <span className="flower-row-text">
        <span className="lib-name">{def.name}</span>
        <span className="flower-dots">
          {options.map((o) => (
            <button
              key={o.name}
              className="flower-dot"
              style={{ background: `radial-gradient(circle at 50% 60%, ${o.colors.petal2} 0 28%, ${o.colors.petal} 62%)` }}
              onPointerDown={(e) => startDrag(e, type, o.colors)}
              onClick={(e) => e.detail === 0 && add(type, o.colors, null)}
              onDragStart={(e) => e.preventDefault()}
              aria-label={`Add ${o.name.toLowerCase()} ${def.name.toLowerCase()}`}
              title={`${o.name} ${def.name.toLowerCase()} — tap to add, or drag onto the bouquet`}
            />
          ))}
        </span>
      </span>
    </div>
  )
}

export function FlowerLibrary() {
  const count = useDesign((s) => s.design.items.length)
  return (
    <div className="flower-lib">
      <p className="muted small">
        Tap a colour to add that flower, or drag it onto the bouquet to place it exactly. Tap a flower in the bouquet to change or remove it — drag it to move it.
      </p>
      <div className="lib-count">
        <span>{count} flowers</span>
        <div className="meter" aria-hidden="true">
          <div className="meter-fill" style={{ width: `${(count / MAX_ITEMS) * 100}%` }} />
        </div>
      </div>
      <h3 className="lib-section">Flowers</h3>
      {flowers.map((t) => (
        <Row key={t} type={t} />
      ))}
      <h3 className="lib-section">Fillers &amp; greens</h3>
      {fillers.map((t) => (
        <Row key={t} type={t} />
      ))}
    </div>
  )
}

/** Chip that follows the pointer while dragging a flower in. */
export function DragGhost() {
  const d = useUI((s) => s.libDrag)
  const slot = useUI((s) => s.dropSlot)
  if (!d) return null
  return (
    <div className="drag-ghost" style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
      <FlowerGlyph type={d.type} colors={d.colors} size={52} />
      <span>{!d.overCanvas ? 'Drop on the bouquet' : slot != null ? 'Release to place here' : 'Release to add'}</span>
    </div>
  )
}
