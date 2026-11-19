import { useState } from 'react'
import { FLOWERS, type BloomStage } from '../data/flowers'
import { PETAL_SWATCHES, lighten } from '../data/presets'
import { requestRemove, useDesign, useUI } from '../state/store'
import type { Stem } from '../state/types'
import { ColorField, Section, Segmented, Slider, Tabs } from './controls'

const DEG = Math.PI / 180
const cm = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} cm`
const deg = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v / DEG)}°`

export function Inspector() {
  const id = useUI((s) => s.selectedId)
  const stem = useDesign((s) => s.design.stems.find((x) => x.id === id))
  const sameType = useDesign((s) => (stem ? s.design.stems.filter((x) => x.type === stem.type).length : 0))
  const update = useDesign((s) => s.updateStem)
  const [tab, setTab] = useState<'color' | 'arrange'>('color')
  if (!stem) return null
  const def = FLOWERS[stem.type]
  const filler = def.category === 'filler'
  const set = (p: Partial<Stem>) => update(stem.id, p)
  const setColors = (c: Partial<Stem['colors']>) => set({ colors: { ...stem.colors, ...c } })
  const index = useDesign.getState().design.stems.filter((s) => s.type === stem.type).findIndex((s) => s.id === stem.id) + 1
  const twoTone = stem.colors.gradient > 0.02

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
      <Tabs value={tab} tabs={[['color', 'Colour'], ['arrange', 'Arrange']]} onChange={setTab} />

      <div className="insp-body">
        {tab === 'color' ? (
          <>
            <ColorField
              label={filler ? 'Foliage / bloom' : 'Petals'}
              value={stem.colors.petal}
              swatches={PETAL_SWATCHES}
              onChange={(v) => setColors({ petal: v, petal2: twoTone ? stem.colors.petal2 : lighten(v, 0.5) })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={twoTone}
                onChange={(e) => setColors(e.target.checked ? { gradient: 0.6, petal2: lighten(stem.colors.petal, 0.6) } : { gradient: 0 })}
              />
              Two-tone petals (blend toward the tips)
            </label>
            {twoTone && (
              <>
                <ColorField label="Tip colour" value={stem.colors.petal2} swatches={PETAL_SWATCHES} onChange={(v) => setColors({ petal2: v })} />
                <Slider label="Blend" value={stem.colors.gradient} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setColors({ gradient: v })} />
              </>
            )}
            <ColorField label="Centre" value={stem.colors.center} swatches={['#f2c230', '#f2d27a', '#4a2e17', '#3b2a1c', '#7d9a52', '#a2482a', '#c43d6b', '#fbfaf4']} onChange={(v) => setColors({ center: v })} />
            <Segmented<BloomStage>
              label="Bloom stage"
              value={stem.bloom}
              options={[['bud', 'Bud'], ['half', 'Half-open'], ['full', 'Full bloom']]}
              onChange={(v) => set({ bloom: v })}
            />
            {sameType > 1 && (
              <button className="btn ghost wide" onClick={() => useDesign.getState().recolorType(stem.type, { ...stem.colors })}>
                Apply these colours to all {sameType} {def.name.toLowerCase()} stems
              </button>
            )}
          </>
        ) : (
          <>
            <Section title="Position">
              <Slider label="Around" value={stem.da} min={-0.6} max={0.6} step={0.01} format={deg} onChange={(v) => set({ da: v })} />
              <Slider label="Outward" value={stem.dr} min={-0.08} max={0.08} step={0.002} format={cm} onChange={(v) => set({ dr: v })} />
              <Slider label="Height" value={stem.dh} min={-0.14} max={0.14} step={0.002} format={cm} onChange={(v) => set({ dh: v })} />
            </Section>
            <Section title="Angle">
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
            </Section>
          </>
        )}
      </div>

      <footer className="insp-foot">
        <button
          className="btn ghost"
          onClick={() => (tab === 'color' ? set({ colors: { ...def.colors }, bloom: 'full' }) : set({ dr: 0, da: 0, dh: 0, lean: 0, nod: 0 }))}
        >
          Reset
        </button>
        <button className="btn danger" onClick={() => requestRemove(stem.id)}>
          Remove flower
        </button>
      </footer>
    </aside>
  )
}
