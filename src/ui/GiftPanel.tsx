import { useState } from 'react'
import { FLOWERS } from '../data/flowers'
import { FLOWER_COLORS } from '../gift/palettes'
import { RIBBONS, SIZES, STYLES, WRAPS, styleById, type SizeId } from '../gift/styles'
import { useDesign, useUI } from '../state/store'
import { BouquetThumb } from './BouquetThumb'
import { FlowerLibrary } from './FlowerLibrary'


function Templates() {
  const design = useDesign((s) => s.design)
  const { applyTemplate, startEmpty } = useDesign.getState()
  const [size, setSize] = useState<SizeId>('M')
  return (
    <>
      <p className="muted small">Short on time? Start from a ready-made bouquet, then change any flower in <b>Arrange flowers</b>. (You can undo with ↶.)</p>
      <div className="size-row compact" role="radiogroup" aria-label="Template size">
        {SIZES.map((s) => (
          <button key={s.id} role="radio" aria-checked={s.id === size} className={`size-chip ${s.id === size ? 'is-on' : ''}`} onClick={() => setSize(s.id)}>
            <strong>{s.id}</strong>
            <span>{s.heads} flowers</span>
          </button>
        ))}
      </div>
      <div className="style-grid" role="list">
        {STYLES.map((s) => (
          <button key={s.id} role="listitem" className={`style-card ${s.id === design.style ? 'is-on' : ''}`} onClick={() => applyTemplate(s.id, size)}>
            <BouquetThumb styleId={s.id} />
            <span className="style-name">{s.name}</span>
            <span className="style-thai">{s.thai}</span>
          </button>
        ))}
        <button className="style-card empty" onClick={() => { startEmpty(); useUI.getState().set({ tab: 'flowers' }) }}>
          <span className="empty-plus">+</span>
          <span className="style-name">Start empty</span>
          <span className="style-thai">จัดเองตั้งแต่เริ่ม</span>
        </button>
      </div>
    </>
  )
}

function Paper() {
  const wrap = useDesign((s) => s.design.wrap)
  const ribbon = useDesign((s) => s.design.ribbon)
  const { update } = useDesign.getState()
  return (
    <>
      <h3 className="step-title">Wrapping paper</h3>
      <div className="wrap-row" role="radiogroup" aria-label="Wrapping paper">
        {WRAPS.map((w) => (
          <button key={w.id} role="radio" aria-checked={w.id === wrap} className={`wrap-chip ${w.id === wrap ? 'is-on' : ''}`} onClick={() => update({ wrap: w.id })} title={w.name}>
            <span className="wrap-swatch" style={{ background: `linear-gradient(135deg, ${w.outer} 0 55%, ${w.inner} 55% 100%)` }} />
            <span className="wrap-name">{w.name}</span>
          </button>
        ))}
      </div>
      <h3 className="step-title">Ribbon bow</h3>
      <div className="ribbon-row" role="radiogroup" aria-label="Ribbon colour">
        {RIBBONS.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={r.color === ribbon}
            aria-label={r.name}
            title={r.name}
            className={`ribbon-chip ${r.color === ribbon ? 'is-on' : ''}`}
            style={{ background: r.color }}
            onClick={() => update({ ribbon: r.color })}
          />
        ))}
      </div>
    </>
  )
}

/** Shown when a flower in the bouquet is tapped. */
function SelectedFlower() {
  const selected = useUI((s) => s.selected)
  const item = useDesign((s) => (selected != null ? s.design.items[selected] : undefined))
  if (selected == null || !item) return null
  const def = FLOWERS[item.type]
  const { recolorItem, removeItem } = useDesign.getState()
  return (
    <div className="selected-bar" role="group" aria-label={`Selected ${def.name}`}>
      <div className="selected-head">
        <strong>{def.name}</strong>
        <span className="muted">Drag it in the bouquet to move it</span>
        <button className="icon-btn" onClick={() => useUI.getState().set({ selected: null })} aria-label="Deselect">
          ×
        </button>
      </div>
      <div className="selected-actions">
        <span className="flower-dots">
          {FLOWER_COLORS[item.type].map((o) => (
            <button
              key={o.name}
              className={`flower-dot ${o.colors.petal === item.colors.petal ? 'is-on' : ''}`}
              style={{ background: `radial-gradient(circle at 50% 60%, ${o.colors.petal2} 0 28%, ${o.colors.petal} 62%)` }}
              onClick={() => recolorItem(selected, o.colors)}
              aria-label={`Make it ${o.name.toLowerCase()}`}
              title={o.name}
            />
          ))}
        </span>
        <button className="btn danger sm" onClick={() => removeItem(selected)}>
          Remove
        </button>
      </div>
    </div>
  )
}

export function GiftPanel() {
  const design = useDesign((s) => s.design)
  const name = useDesign((s) => s.bouquets.find((b) => b.id === s.currentId)?.name)
  const tab = useUI((s) => s.tab)
  const setTab = (t: typeof tab) => useUI.getState().set({ tab: t })
  const style = styleById(design.style)
  return (
    <aside className="panel gift-panel" aria-label="Create your bouquet">
      <header className="panel-head row">
        <div>
          <h2>{name ?? 'My Bouquet'}</h2>
          <p className="muted">{style ? style.thai : 'จัดเอง · arranged by you'} · {design.items.length} flowers</p>
        </div>
        <button className="btn ghost sm" onClick={() => useDesign.getState().surprise()} title="Pick a random bouquet">
          ✦ Surprise me
        </button>
      </header>
      <div className="tabs" role="tablist">
        {([['flowers', 'Arrange flowers'], ['templates', 'Ready-made'], ['paper', 'Paper & Bow']] as [typeof tab, string][]).map(([v, t]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'is-on' : ''} onClick={() => setTab(v)}>
            {t}
          </button>
        ))}
      </div>
      <div className="gift-body">
        {tab === 'templates' && <Templates />}
        {tab === 'flowers' && <FlowerLibrary />}
        {tab === 'paper' && <Paper />}
      </div>
      <SelectedFlower />
    </aside>
  )
}
