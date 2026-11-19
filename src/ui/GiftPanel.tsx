import { useState } from 'react'
import { FLOWER_COLORS } from '../gift/palettes'
import { RIBBONS, SIZES, STYLES, WRAPS, type SizeId } from '../gift/styles'
import { bouquetLabel, useT } from '../i18n'
import { useDesign, useUI } from '../state/store'
import { BouquetThumb } from './BouquetThumb'
import { StandIcon } from './StandIcon'
import { ShapeIcon } from './ShapeIcon'
import { SHAPES } from '../gift/shapes'
import { STANDS } from '../gift/stands'
import type { StrKey } from '../i18n'
import { FlowerLibrary } from './FlowerLibrary'


function Templates() {
  const design = useDesign((s) => s.design)
  const { applyTemplate, startEmpty } = useDesign.getState()
  const [size, setSize] = useState<SizeId>('M')
  const { t, style } = useT()
  return (
    <>
      <p className="intro">{t('tplIntro')} <b>{t('tabFlowers')}</b>.</p>
      <h3 className="step-title">{t('size')}</h3>
      <div className="size-row compact" role="radiogroup" aria-label="Template size">
        {SIZES.map((s) => (
          <button key={s.id} role="radio" aria-checked={s.id === size} className={`size-chip ${s.id === size ? 'is-on' : ''}`} onClick={() => setSize(s.id)}>
            <strong>{s.id}</strong>
            <span>{t('nFlowers', { n: s.heads })}</span>
          </button>
        ))}
      </div>
      <h3 className="step-title">{t('bouquets')}</h3>
      <div className="style-grid" role="list">
        {STYLES.map((s) => (
          <button key={s.id} role="listitem" className={`style-card ${s.id === design.style ? 'is-on' : ''}`} onClick={() => applyTemplate(s.id, size)}>
            <BouquetThumb styleId={s.id} size={96} />
            <span className="style-name">{style(s.id)}</span>
          </button>
        ))}
        <button className="style-card empty" onClick={() => { startEmpty(); useUI.getState().set({ tab: 'flowers' }) }}>
          <span className="empty-plus">+</span>
          <span className="style-name">{t('startEmpty')}</span>
          <span className="style-thai">{t('startEmptySub')}</span>
        </button>
      </div>
    </>
  )
}

function Paper() {
  const wrap = useDesign((s) => s.design.wrap)
  const ribbon = useDesign((s) => s.design.ribbon)
  const stand = useDesign((s) => s.design.stand)
  const shape = useDesign((s) => s.design.shape)
  const { update } = useDesign.getState()
  const { t, color } = useT()
  return (
    <>
      <h3 className="step-title">{t('shape')}</h3>
      <div className="shape-row" role="radiogroup" aria-label={t('shape')}>
        {SHAPES.map((s) => (
          <button key={s} role="radio" aria-checked={s === shape} className={`stand-chip ${s === shape ? 'is-on' : ''}`} onClick={() => update({ shape: s })}>
            <ShapeIcon id={s} size={56} />
            <span className="wrap-name">{t(`shape_${s}` as StrKey)}</span>
          </button>
        ))}
      </div>
      <h3 className="step-title">{t('stand')}</h3>
      <div className="stand-row" role="radiogroup" aria-label={t('stand')}>
        {STANDS.map((s) => (
          <button key={s.id} role="radio" aria-checked={s.id === stand} className={`stand-chip ${s.id === stand ? 'is-on' : ''}`} onClick={() => update({ stand: s.id })}>
            <StandIcon id={s.id} size={52} />
            <span className="wrap-name">{t(`stand_${s.id}` as StrKey)}</span>
          </button>
        ))}
      </div>
      <h3 className="step-title">{t('wrapping')}</h3>
      <div className="wrap-row" role="radiogroup" aria-label={t('wrapping')}>
        {WRAPS.map((w) => (
          <button key={w.id} role="radio" aria-checked={w.id === wrap} className={`wrap-chip ${w.id === wrap ? 'is-on' : ''}`} onClick={() => update({ wrap: w.id })} title={color(w.name)}>
            <span className="wrap-swatch" style={{ background: `linear-gradient(135deg, ${w.outer} 0 55%, ${w.inner} 55% 100%)` }} />
            <span className="wrap-name">{color(w.name)}</span>
          </button>
        ))}
      </div>
      <h3 className="step-title">{t('ribbon')}</h3>
      <div className="ribbon-row" role="radiogroup" aria-label={t('ribbon')}>
        {RIBBONS.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={r.color === ribbon}
            aria-label={color(r.name)}
            title={color(r.name)}
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
  const { t, flower, color } = useT()
  if (selected == null || !item) return null
  const fname = flower(item.type)
  const { recolorItem, removeItem } = useDesign.getState()
  return (
    <div className="selected-bar" role="group" aria-label={fname}>
      <div className="selected-head">
        <strong>{fname}</strong>
        <span className="muted">{t('selHint')}</span>
        <button className="icon-btn" onClick={() => useUI.getState().set({ selected: null })} aria-label={t('deselect')}>
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
              aria-label={t('makeIt', { color: color(o.name) })}
              title={color(o.name)}
            />
          ))}
        </span>
        <button className="btn danger" onClick={() => removeItem(selected)}>
          {t('removeFlower')}
        </button>
      </div>
    </div>
  )
}

export function GiftPanel() {
  const design = useDesign((s) => s.design)
  const current = useDesign((s) => s.bouquets.find((b) => b.id === s.currentId))
  const { t, style, lang } = useT()
  const tab = useUI((s) => s.tab)
  const setTab = (t: typeof tab) => useUI.getState().set({ tab: t })
  return (
    <aside className="panel gift-panel" aria-label={t('panelAria')}>
      <header className="panel-head">
        <div>
          <h2>{current ? bouquetLabel(current, lang) : t('myBouquet')}</h2>
          <div className="panel-sub">
            <span className="count-badge">✿ {t('nFlowers', { n: design.items.length })}</span>
            <span>{design.style ? style(design.style) : t('ownStyle')}</span>
          </div>
        </div>
        <button className="btn ghost sm" onClick={() => useDesign.getState().surprise()} title={t('surpriseTitle')}>
          {t('surprise')}
        </button>
      </header>
      <div className="tabs" role="tablist">
        {([['flowers', t('tabFlowers')], ['templates', t('tabReady')], ['paper', t('tabPaper')]] as [typeof tab, string][]).map(([v, t]) => (
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
