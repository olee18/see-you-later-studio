import { RIBBONS, SIZES, STYLES, WRAPS, styleById } from '../gift/styles'
import { useDesign } from '../state/store'
import { BouquetThumb } from './BouquetThumb'

/** The whole editor: four simple choices. */
export function GiftPanel() {
  const design = useDesign((s) => s.design)
  const { chooseStyle, update, surprise } = useDesign.getState()
  const style = styleById(design.style)

  return (
    <aside className="panel gift-panel" aria-label="Create your bouquet">
      <header className="panel-head row">
        <div>
          <h2>{style.name}</h2>
          <p className="muted">{style.thai}</p>
        </div>
        <button className="btn ghost sm" onClick={surprise} title="Pick a random bouquet">
          ✦ Surprise me
        </button>
      </header>

      <div className="gift-body">
        <section className="step">
          <h3 className="step-title"><span>1</span> Choose a bouquet</h3>
          <div className="style-grid" role="radiogroup" aria-label="Bouquet style">
            {STYLES.map((s) => (
              <button key={s.id} role="radio" aria-checked={s.id === design.style} className={`style-card ${s.id === design.style ? 'is-on' : ''}`} onClick={() => chooseStyle(s.id)}>
                <BouquetThumb styleId={s.id} />
                <span className="style-name">{s.name}</span>
                <span className="style-thai">{s.thai}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="step">
          <h3 className="step-title"><span>2</span> Size</h3>
          <div className="size-row" role="radiogroup" aria-label="Bouquet size">
            {SIZES.map((s) => (
              <button key={s.id} role="radio" aria-checked={s.id === design.size} className={`size-chip ${s.id === design.size ? 'is-on' : ''}`} onClick={() => update({ size: s.id })}>
                <strong>{s.id}</strong>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="step">
          <h3 className="step-title"><span>3</span> Wrapping paper</h3>
          <div className="wrap-row" role="radiogroup" aria-label="Wrapping paper">
            {WRAPS.map((w) => (
              <button key={w.id} role="radio" aria-checked={w.id === design.wrap} className={`wrap-chip ${w.id === design.wrap ? 'is-on' : ''}`} onClick={() => update({ wrap: w.id })} title={w.name}>
                <span className="wrap-swatch" style={{ background: `linear-gradient(135deg, ${w.outer} 0 55%, ${w.inner} 55% 100%)` }} />
                <span className="wrap-name">{w.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="step">
          <h3 className="step-title"><span>4</span> Ribbon bow</h3>
          <div className="ribbon-row" role="radiogroup" aria-label="Ribbon colour">
            {RIBBONS.map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={r.color === design.ribbon}
                aria-label={r.name}
                title={r.name}
                className={`ribbon-chip ${r.color === design.ribbon ? 'is-on' : ''}`}
                style={{ background: r.color }}
                onClick={() => update({ ribbon: r.color })}
              />
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
