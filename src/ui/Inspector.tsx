import { FLOWERS } from '../data/flowers'
import { requestRemove, useDesign, useUI } from '../state/store'
import type { Stem } from '../state/types'

const DEG = Math.PI / 180

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <label className="slider">
      <span className="slider-row">
        <span>{label}</span>
        <span className="muted">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  )
}

const cm = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} cm`
const deg = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v / DEG)}°`

export function Inspector() {
  const id = useUI((s) => s.selectedId)
  const stem = useDesign((s) => s.design.stems.find((x) => x.id === id))
  const update = useDesign((s) => s.updateStem)
  if (!stem) return null
  const def = FLOWERS[stem.type]
  const set = (p: Partial<Stem>) => update(stem.id, p)
  const index = useDesign.getState().design.stems.filter((s) => s.type === stem.type).findIndex((s) => s.id === stem.id) + 1

  return (
    <aside className="panel inspector" aria-label="Adjust selected flower">
      <header className="panel-head row">
        <div>
          <h2>
            {def.name} <span className="muted">#{index}</span>
          </h2>
          <p className="muted">Drag it in 3D to move · it snaps to the spiral</p>
        </div>
        <button className="icon-btn" onClick={() => useUI.getState().set({ selectedId: null })} aria-label="Close">
          ×
        </button>
      </header>

      <div className="insp-body">
        <h3 className="lib-section">Position</h3>
        <Slider label="Around" value={stem.da} min={-0.6} max={0.6} step={0.01} format={deg} onChange={(v) => set({ da: v })} />
        <Slider label="Outward" value={stem.dr} min={-0.08} max={0.08} step={0.002} format={cm} onChange={(v) => set({ dr: v })} />
        <Slider label="Height" value={stem.dh} min={-0.14} max={0.14} step={0.002} format={cm} onChange={(v) => set({ dh: v })} />

        <h3 className="lib-section">Angle</h3>
        <Slider label="Stem lean" value={stem.lean} min={-0.6} max={0.6} step={0.01} format={deg} onChange={(v) => set({ lean: v })} />
        <Slider label="Head tilt" value={stem.nod} min={-0.9} max={0.9} step={0.01} format={deg} onChange={(v) => set({ nod: v })} />
        <Slider
          label="Head turn"
          value={((stem.spin % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)}
          min={0}
          max={2 * Math.PI}
          step={0.02}
          format={(v) => `${Math.round(v / DEG)}°`}
          onChange={(v) => set({ spin: v })}
        />
      </div>

      <footer className="insp-foot">
        <button className="btn ghost" onClick={() => set({ dr: 0, da: 0, dh: 0, lean: 0, nod: 0 })}>
          Reset
        </button>
        <button className="btn danger" onClick={() => requestRemove(stem.id)}>
          Remove flower
        </button>
      </footer>
    </aside>
  )
}
