import type { ReactNode } from 'react'

/** Shared small form controls for the side panels. */

export function ColorField({ label, value, swatches, onChange }: { label: string; value: string; swatches: string[]; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <div className="field-row">
        <span>{label}</span>
        <label className="picker" title="Pick any colour">
          <span className="picker-chip" style={{ background: value }} />
          <span className="muted">{value.toUpperCase()}</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} colour`} />
        </label>
      </div>
      <div className="swatches" role="list">
        {swatches.map((c) => (
          <button
            key={c}
            role="listitem"
            className={`swatch ${c.toLowerCase() === value.toLowerCase() ? 'is-on' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`Use ${c}`}
          />
        ))}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      {label && <div className="field-row"><span>{label}</span></div>}
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} role="radio" aria-checked={v === value} className={v === value ? 'is-on' : ''} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}

export function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
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

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([v, text]) => (
        <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'is-on' : ''} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3 className="lib-section">{title}</h3>
      {children}
    </section>
  )
}
