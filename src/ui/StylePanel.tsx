import { useState } from 'react'
import { FLOWERS } from '../data/flowers'
import {
  BACKGROUND_SWATCHES, GREEN_SWATCHES, PETAL_SWATCHES, RIBBON_SWATCHES, THEMES, WRAP_SWATCHES,
  applyPalette, harmony, surpriseDesign, type Scheme,
} from '../data/presets'
import { useDesign, useUI } from '../state/store'
import type { Design, LightMood, WrapMaterial } from '../state/types'
import { ColorField, Section, Segmented, Slider, Tabs } from './controls'

type Tab = 'bouquet' | 'wrap' | 'scene'

function BouquetTab() {
  const design = useDesign((s) => s.design)
  const { applyGenerated, updateDesign, setDesign, autoArrange, clear } = useDesign.getState()
  const [base, setBase] = useState('#e8879c')
  const [confirmClear, setConfirmClear] = useState(false)
  const hasFlowers = design.stems.some((s) => FLOWERS[s.type].category === 'flower')
  const schemes: [Scheme, string][] = [['complementary', 'Complementary'], ['analogous', 'Analogous'], ['monochrome', 'Monochrome']]

  return (
    <>
      <Section title="Ready-made bouquets">
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button key={t.id} className="theme-card" onClick={() => applyGenerated(t.build(), t.name)}>
              <span className="theme-dots">
                {t.swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="theme-name">{t.name}</span>
              <span className="muted">{t.blurb}</span>
            </button>
          ))}
          <button className="theme-card surprise" onClick={() => applyGenerated(surpriseDesign(), 'Surprise')}>
            <span className="theme-dots">
              <i style={{ background: 'conic-gradient(#f2b0bd, #f6c945, #8fa58a, #9fb3e0, #c9a7e3, #f2b0bd)' }} />
            </span>
            <span className="theme-name">Surprise Me</span>
            <span className="muted">Random, but balanced</span>
          </button>
        </div>
        <p className="muted small">An empty or generated bouquet is replaced; otherwise a new bouquet is started, so your work is kept.</p>
      </Section>

      <Section title="Colour harmony">
        <ColorField label="Base colour" value={base} swatches={PETAL_SWATCHES.slice(0, 12)} onChange={setBase} />
        {schemes.map(([sc, name]) => {
          const pal = harmony(base, sc)
          return (
            <div key={sc} className="palette-row">
              <span className="palette-name">{name}</span>
              <span className="palette">
                {pal.map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              <button className="btn ghost sm" disabled={!hasFlowers} onClick={() => setDesign(applyPalette(design, pal))}>
                Apply
              </button>
            </div>
          )
        })}
        {!hasFlowers && <p className="muted small">Add some flowers first, then recolour them in one click.</p>}
      </Section>

      <Section title="Leaves & stems">
        <ColorField label="Leaves" value={design.greenery.leaf} swatches={GREEN_SWATCHES} onChange={(v) => updateDesign({ greenery: { leaf: v } })} />
        <ColorField label="Stems" value={design.greenery.stem} swatches={GREEN_SWATCHES} onChange={(v) => updateDesign({ greenery: { stem: v } })} />
      </Section>

      <Section title="Arrangement">
        <div className="btn-row">
          <button className="btn ghost" disabled={design.stems.length < 2} onClick={autoArrange}>
            Auto-arrange
          </button>
          <button
            className={`btn ghost ${confirmClear ? 'danger' : ''}`}
            disabled={design.stems.length === 0}
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true)
                setTimeout(() => setConfirmClear(false), 3000)
                return
              }
              clear()
              useUI.getState().set({ selectedId: null })
              setConfirmClear(false)
            }}
          >
            {confirmClear ? 'Tap again to clear' : 'Clear flowers'}
          </button>
        </div>
      </Section>
    </>
  )
}

function WrapTab() {
  const wrap = useDesign((s) => s.design.wrap)
  const ribbon = useDesign((s) => s.design.ribbon)
  const { updateDesign } = useDesign.getState()
  const setWrap = (p: Partial<Design['wrap']>) => updateDesign({ wrap: p })
  const setRibbon = (p: Partial<Design['ribbon']>) => updateDesign({ ribbon: p })
  return (
    <>
      <Section title="Wrapping paper">
        <Segmented<WrapMaterial>
          label="Material"
          value={wrap.material}
          options={[['kraft', 'Kraft'], ['matte', 'Matte'], ['cellophane', 'Cellophane'], ['fabric', 'Fabric']]}
          onChange={(v) => setWrap(v === 'kraft' && wrap.material !== 'kraft' ? { material: v, color: '#c9a57c' } : { material: v })}
        />
        <ColorField label="Paper colour" value={wrap.color} swatches={WRAP_SWATCHES} onChange={(v) => setWrap({ color: v })} />
        <Segmented
          label="Pattern"
          value={wrap.pattern}
          options={[['none', 'Plain'], ['dots', 'Dots'], ['stripes', 'Stripes'], ['botanical', 'Botanical']]}
          onChange={(v) => setWrap({ pattern: v })}
        />
        <ColorField label="Lining & pattern colour" value={wrap.color2} swatches={WRAP_SWATCHES} onChange={(v) => setWrap({ color2: v })} />
      </Section>
      <Section title="Ribbon">
        <ColorField label="Ribbon colour" value={ribbon.color} swatches={RIBBON_SWATCHES} onChange={(v) => setRibbon({ color: v })} />
        <Slider label="Width" value={ribbon.width} min={0.01} max={0.04} step={0.001} format={(v) => `${(v * 100).toFixed(1)} cm`} onChange={(v) => setRibbon({ width: v })} />
        <Segmented label="Bow" value={ribbon.bow} options={[['classic', 'Classic'], ['loop', 'Loops'], ['none', 'No bow']]} onChange={(v) => setRibbon({ bow: v })} />
      </Section>
    </>
  )
}

function SceneTab() {
  const bg = useDesign((s) => s.design.background)
  const { updateDesign } = useDesign.getState()
  return (
    <Section title="Background">
      <ColorField label="Wall colour" value={bg.color} swatches={BACKGROUND_SWATCHES} onChange={(v) => updateDesign({ background: { color: v } })} />
      <Segmented<LightMood>
        label="Lighting mood"
        value={bg.mood}
        options={[['morning', 'Morning'], ['golden', 'Golden hour'], ['studio', 'Studio']]}
        onChange={(v) => updateDesign({ background: { mood: v } })}
      />
    </Section>
  )
}

export function StylePanel() {
  const open = useUI((s) => s.styleOpen)
  const selected = useUI((s) => s.selectedId)
  const [tab, setTab] = useState<Tab>('bouquet')
  if (!open || selected) return null
  return (
    <aside className="panel inspector style-panel" aria-label="Bouquet style">
      <header className="panel-head row">
        <div>
          <h2>Style</h2>
          <p className="muted">Colours, wrapping and mood — all live</p>
        </div>
        <button className="icon-btn" onClick={() => useUI.getState().set({ styleOpen: false })} aria-label="Close style panel">
          ×
        </button>
      </header>
      <Tabs<Tab> value={tab} tabs={[['bouquet', 'Bouquet'], ['wrap', 'Wrap & Ribbon'], ['scene', 'Scene']]} onChange={setTab} />
      <div className="insp-body">
        {tab === 'bouquet' && <BouquetTab />}
        {tab === 'wrap' && <WrapTab />}
        {tab === 'scene' && <SceneTab />}
      </div>
    </aside>
  )
}
