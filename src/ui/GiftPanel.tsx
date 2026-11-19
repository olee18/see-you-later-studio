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


/** Size whose flower count is closest to n. */
const nearestSize = (n: number) => SIZES.reduce((a, b) => (Math.abs(b.heads - n) < Math.abs(a.heads - n) ? b : a)).id

function Templates() {
  const design = useDesign((s) => s.design)
  const { applyTemplate, startEmpty } = useDesign.getState()
  // a ready-made bouquet shows its own size; a self-arranged one remembers the size picked for the next template
  const [picked, setPicked] = useState<SizeId>('M')
  const size = design.style ? nearestSize(design.items.length) : picked
  const { t, style } = useT()
  const chooseSize = (id: SizeId) => {
    setPicked(id)
    if (design.style) applyTemplate(design.style, id)
  }
  return (
    <>
      <h3 className="step-title">{t('size')}</h3>
      <div className="size-row compact" role="radiogroup" aria-label="Template size">
        {SIZES.map((s) => (
          <button key={s.id} role="radio" aria-checked={s.id === size} className={`size-chip ${s.id === size ? 'is-on' : ''}`} onClick={() => chooseSize(s.id)}>
            <strong>{s.id}</strong>
            <span>{t('nFlowers', { n: s.heads })}</span>
          </button>
        ))}
      </div>
      {!design.style && <p className="muted size-hint">{t('sizeHint')}</p>}
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

/** The guided flow: choose a bouquet → flowers → wrap & ribbon → photo. */
const STEPS: { id: 'templates' | 'flowers' | 'paper' | 'photo'; short: StrKey; title: StrKey; hint: StrKey }[] = [
  { id: 'templates', short: 'st1', title: 'st1Title', hint: 'st1Hint' },
  { id: 'flowers', short: 'st2', title: 'st2Title', hint: 'st2Hint' },
  { id: 'paper', short: 'st3', title: 'st3Title', hint: 'st3Hint' },
  { id: 'photo', short: 'st4', title: 'st4Title', hint: 'st4Title' },
]

export function GiftPanel() {
  const design = useDesign((s) => s.design)
  const current = useDesign((s) => s.bouquets.find((b) => b.id === s.currentId))
  const { t, style, lang } = useT()
  const tab = useUI((s) => s.tab)
  const setTab = (t: typeof tab) => useUI.getState().set({ tab: t })
  const at = STEPS.findIndex((s) => s.id === tab)
  const go = (i: number) => {
    const s = STEPS[i]
    if (!s) return
    if (s.id === 'photo') useUI.getState().set({ mode: 'photo', selected: null })
    else setTab(s.id)
  }
  const step = STEPS[at]
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
      </header>
      <ol className="stepper" aria-label={t('stepsAria')}>
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button className={`step ${i === at ? 'is-on' : ''} ${i < at ? 'is-done' : ''}`} onClick={() => go(i)} aria-current={i === at ? 'step' : undefined}>
              <b>{i < at ? '✓' : i + 1}</b>
              <span>{t(s.short)}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="step-head">
        <h3>{t(step.title)}</h3>
        <p>{t(step.hint)}</p>
      </div>
      <div className="gift-body">
        {tab === 'templates' && <Templates />}
        {tab === 'flowers' && <FlowerLibrary />}
        {tab === 'paper' && <Paper />}
      </div>
      <SelectedFlower />
      <footer className="step-foot">
        {at > 0 ? (
          <button className="btn ghost big" onClick={() => go(at - 1)}>
            ← {t('back')}
          </button>
        ) : (
          <span />
        )}
        <button className="btn primary big" onClick={() => go(at + 1)}>
          {at === STEPS.length - 2 ? `📷 ${t('toPhoto')}` : `${t('next')} →`}
        </button>
      </footer>
    </aside>
  )
}
