import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang, useT, type StrKey } from '../i18n'
import {
  CARD_DESIGNS, PHOTO_ANGLES, canShareFiles, drawDecor, loadDecorFonts, photoFrame, savePhoto, sharePhoto, takePhoto, usePhoto, warmDownloads,
  type CardDesign,
} from '../state/photo'
import { useUI } from '../state/store'
import { ROOMS, useRoom } from '../three/rooms'

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

const ANGLE_ICON: Record<string, string> = { three: '◩', front: '▣', top: '◓', close: '⊕' }
const EMOJI = ['♡', '✿', '✨', '🌹', '💐', '🥰', '🎉', '🎓']

/** Live preview of the photo: dims outside the 4:5 frame and draws the message exactly as it will be saved. */
function Frame() {
  const { w, h } = useViewport()
  const f = photoFrame(w, h)
  const design = usePhoto((s) => s.design)
  const to = usePhoto((s) => s.to)
  const caption = usePhoto((s) => s.caption)
  const from = usePhoto((s) => s.from)
  const lang = useLang((s) => s.lang)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [fontsTick, setFontsTick] = useState(0)

  useEffect(() => {
    let alive = true
    loadDecorFonts(`${to}${caption}${from}`).then(() => alive && setFontsTick((n) => n + 1))
    return () => {
      alive = false
    }
  }, [to, caption, from, lang])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(f.w * dpr)
    c.height = Math.round(f.h * dpr)
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    drawDecor(ctx, c.width, c.height, { design, to, caption, from })
  }, [f.w, f.h, design, to, caption, from, lang, fontsTick])

  return (
    <div className="photo-frame" style={{ left: f.x, top: f.y, width: f.w, height: f.h }} aria-hidden="true">
      <canvas ref={canvas} className="photo-decor" />
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
    </div>
  )
}

function DesignIcon({ id }: { id: CardDesign }) {
  if (id === 'card')
    return (
      <svg viewBox="0 0 48 60" aria-hidden="true">
        <rect width="48" height="60" rx="4" fill="#e9dfd5" />
        <g transform="rotate(-4 34 44)">
          <rect x="20" y="34" width="24" height="18" rx="2.5" fill="#fffdf9" stroke="#e7b8c4" />
          <path d="M24 41 h14 M24 45 h10" stroke="#c2607a" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </svg>
    )
  if (id === 'polaroid')
    return (
      <svg viewBox="0 0 48 60" aria-hidden="true">
        <rect width="48" height="60" rx="3" fill="#fdfbf8" stroke="#e2d8cd" />
        <rect x="4" y="4" width="40" height="40" rx="1" fill="#e9dfd5" />
        <path d="M14 51 h20" stroke="#2f2826" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg viewBox="0 0 48 60" aria-hidden="true">
      <rect width="48" height="60" rx="4" fill="#e9dfd5" />
      <rect y="42" width="48" height="18" fill="#fdfaf7" opacity="0.92" />
      <path d="M12 50 h24" stroke="#2f2826" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MessageEditor() {
  const { t } = useT()
  const design = usePhoto((s) => s.design)
  const to = usePhoto((s) => s.to)
  const caption = usePhoto((s) => s.caption)
  const from = usePhoto((s) => s.from)
  const set = usePhoto.getState().set
  const area = useRef<HTMLTextAreaElement>(null)
  const MAX = 90
  const addEmoji = (e: string) => {
    const el = area.current
    const cur = usePhoto.getState().caption
    const at = el ? el.selectionStart ?? cur.length : cur.length
    const next = (cur.slice(0, at) + e + cur.slice(at)).slice(0, MAX)
    set({ caption: next })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(at + e.length, at + e.length)
    })
  }
  return (
    <div className="msg-editor">
      <div className="pb-label">{t('cardStyle')}</div>
      <div className="design-row" role="radiogroup" aria-label={t('cardStyle')}>
        {CARD_DESIGNS.map((d) => (
          <button key={d} role="radio" aria-checked={d === design} className={`design-tile ${d === design ? 'is-on' : ''}`} onClick={() => set({ design: d })}>
            <DesignIcon id={d} />
            <span>{t(`design_${d}` as StrKey)}</span>
          </button>
        ))}
      </div>
      <div className="msg-names">
        <label>
          <span>{t('toLabel')}</span>
          <input className="text-input" value={to} maxLength={24} placeholder={t('toPh')} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <label>
          <span>{t('fromLabel')}</span>
          <input className="text-input" value={from} maxLength={24} placeholder={t('fromPh')} onChange={(e) => set({ from: e.target.value })} />
        </label>
      </div>
      <div className="msg-box">
        <textarea
          ref={area}
          className="text-input msg-text"
          rows={3}
          value={caption}
          maxLength={MAX}
          placeholder={t('messagePh')}
          aria-label={t('caption')}
          onChange={(e) => set({ caption: e.target.value })}
        />
        <span className="msg-count">
          {caption.length}/{MAX}
        </span>
      </div>
      <div className="emoji-row">
        {EMOJI.map((e) => (
          <button key={e} className="emoji" onClick={() => addEmoji(e)} aria-label={e}>
            {e}
          </button>
        ))}
        {(to || caption || from) && (
          <button className="emoji clear" onClick={() => set({ to: '', caption: '', from: '' })}>
            {t('clearMsg')}
          </button>
        )}
      </div>
    </div>
  )
}

function AnglePicker() {
  const { t } = useT()
  const angle = usePhoto((s) => s.angle)
  return (
    <div className="pb-group" role="radiogroup" aria-label={t('angle')}>
      <span className="pb-label">{t('angle')}</span>
      {PHOTO_ANGLES.map((a) => (
        <button key={a} role="radio" aria-checked={a === angle} className={`chip ${a === angle ? 'is-on' : ''}`} onClick={() => usePhoto.getState().set({ angle: a })}>
          <span aria-hidden="true">{ANGLE_ICON[a]}</span> {t(`angle_${a}` as StrKey)}
        </button>
      ))}
    </div>
  )
}

function RoomPicker() {
  const { t } = useT()
  const room = useRoom((s) => s.room)
  return (
    <div className="pb-group" role="radiogroup" aria-label={t('room')}>
      <span className="pb-label">{t('room')}</span>
      {ROOMS.map((r) => (
        <button key={r.id} role="radio" aria-checked={r.id === room} className={`chip room-chip ${r.id === room ? 'is-on' : ''}`} onClick={() => useRoom.getState().setRoom(r.id)}>
          <span className="room-swatch" style={{ background: `conic-gradient(${r.swatch[0]} 0 50%, ${r.swatch[1]} 50% 75%, ${r.swatch[2]} 75%)` }} />
          {t(`room_${r.id}` as StrKey)}
        </button>
      ))}
    </div>
  )
}

function Shutter() {
  const { t } = useT()
  const busy = usePhoto((s) => s.busy)
  return (
    <button className="btn primary big shutter" onClick={() => takePhoto()} disabled={busy} aria-label={t('shutter')}>
      <span aria-hidden="true">📷</span>
      <span className="shutter-label">{t('shutter')}</span>
    </button>
  )
}

function Result() {
  const { t } = useT()
  const result = usePhoto((s) => s.result)
  const shareable = useMemo(() => canShareFiles(), [])
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  if (!result) return null
  const close = () => usePhoto.getState().set({ result: null })
  return (
    <div className="photo-result" role="dialog" aria-modal="true" aria-label={t('yourPhoto')} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="result-card">
        <div className="result-head">
          <h3>{t('yourPhoto')}</h3>
          <button className="icon-btn" onClick={close} aria-label={t('close')}>
            ×
          </button>
        </div>
        <img src={result.url} alt={t('yourPhoto')} />
        <div className="result-actions">
          <button className="btn primary big" onClick={() => savePhoto(result.blob, result.url)}>
            ⤓ {t('savePhoto')}
          </button>
          {shareable && (
            <button className="btn ghost big" onClick={() => sharePhoto(result.blob)}>
              ↗ {t('sharePhoto')}
            </button>
          )}
          <button className="btn ghost big" onClick={close}>
            {t('retake')}
          </button>
        </div>
        {touch && <p className="muted result-tip">{t('longPress')}</p>}
      </div>
    </div>
  )
}

function Flash() {
  const flash = usePhoto((s) => s.flash)
  if (!flash) return null
  return <div key={flash} className="photo-flash" aria-hidden="true" />
}

export function PhotoMode() {
  const mode = useUI((s) => s.mode)
  const { t } = useT()
  const { w } = useViewport()
  const mobile = w < 820
  const [sheet, setSheet] = useState<'camera' | 'message'>('message')
  useEffect(() => {
    if (mode === 'photo') void warmDownloads()
  }, [mode])
  if (mode !== 'photo') return null
  return (
    <div className="photo-ui">
      <Frame />
      <div className="photo-top">
        <button className="btn ghost" onClick={() => useUI.getState().set({ mode: 'arrange' })}>
          ← {t('backToArrange')}
        </button>
        <span className="photo-title">
          📷 {t('photoMode')} <small>· {t('dragHint')}</small>
        </span>
      </div>
      {mobile ? (
        <div className="photo-sheet">
          <div className="sheet-head">
            <div className="tabs sheet-tabs" role="tablist">
              {(['message', 'camera'] as const).map((k) => (
                <button key={k} role="tab" aria-selected={sheet === k} className={sheet === k ? 'is-on' : ''} onClick={() => setSheet(k)}>
                  {k === 'message' ? '✍ ' : '📷 '}
                  {t(k === 'message' ? 'tabMessage' : 'tabCamera')}
                </button>
              ))}
            </div>
            <Shutter />
          </div>
          <div className="sheet-body">
            {sheet === 'message' ? (
              <MessageEditor />
            ) : (
              <>
                <AnglePicker />
                <RoomPicker />
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <aside className="photo-side" aria-label={t('msgCard')}>
            <h3 className="side-title">✍ {t('msgCard')}</h3>
            <MessageEditor />
            <div className="side-sep" />
            <RoomPicker />
          </aside>
          <div className="photo-bar">
            <AnglePicker />
            <Shutter />
          </div>
        </>
      )}
      <Flash />
      <Result />
    </div>
  )
}
