import { useEffect, useMemo, useState } from 'react'
import { useT, type StrKey } from '../i18n'
import { CAPTION_FONT, PHOTO_ANGLES, canShareFiles, photoFrame, savePhoto, sharePhoto, takePhoto, usePhoto, warmDownloads } from '../state/photo'
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

/** Live preview of the photo: dims everything outside the 4:5 frame and shows the message band. */
function Frame() {
  const { w, h } = useViewport()
  const caption = usePhoto((s) => s.caption.trim())
  const f = photoFrame(w, h)
  return (
    <div className="photo-frame" style={{ left: f.x, top: f.y, width: f.w, height: f.h }} aria-hidden="true">
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {caption && (
        <div className="photo-band" style={{ fontFamily: CAPTION_FONT, fontSize: Math.round(f.h * 0.044) }}>
          <span>{caption}</span>
          <small>B L O O M &nbsp; S T U D I O</small>
        </div>
      )}
    </div>
  )
}

function Bar() {
  const { t } = useT()
  const angle = usePhoto((s) => s.angle)
  const caption = usePhoto((s) => s.caption)
  const busy = usePhoto((s) => s.busy)
  const room = useRoom((s) => s.room)
  const set = usePhoto.getState().set
  return (
    <div className="photo-bar" role="group" aria-label={t('photoMode')}>
      <div className="pb-row">
        <div className="pb-group" role="radiogroup" aria-label={t('angle')}>
          <span className="pb-label">{t('angle')}</span>
          {PHOTO_ANGLES.map((a) => (
            <button key={a} role="radio" aria-checked={a === angle} className={`chip ${a === angle ? 'is-on' : ''}`} onClick={() => set({ angle: a })}>
              <span aria-hidden="true">{ANGLE_ICON[a]}</span> {t(`angle_${a}` as StrKey)}
            </button>
          ))}
        </div>
        <div className="pb-group" role="radiogroup" aria-label={t('room')}>
          <span className="pb-label">{t('room')}</span>
          {ROOMS.map((r) => (
            <button key={r.id} role="radio" aria-checked={r.id === room} className={`chip room-chip ${r.id === room ? 'is-on' : ''}`} onClick={() => useRoom.getState().setRoom(r.id)}>
              <span className="room-swatch" style={{ background: `conic-gradient(${r.swatch[0]} 0 50%, ${r.swatch[1]} 50% 75%, ${r.swatch[2]} 75%)` }} />
              {t(`room_${r.id}` as StrKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="pb-row">
        <input
          className="text-input caption-input"
          value={caption}
          maxLength={60}
          onChange={(e) => set({ caption: e.target.value })}
          placeholder={t('captionPh')}
          aria-label={t('caption')}
        />
        <button className="btn primary big shutter" onClick={() => takePhoto()} disabled={busy}>
          <span aria-hidden="true">📷</span>
          <span className="shutter-label">{t('shutter')}</span>
        </button>
      </div>
    </div>
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
          📷 {t('photoMode')} <small className="muted">· {t('dragHint')}</small>
        </span>
      </div>
      <Bar />
      <Flash />
      <Result />
    </div>
  )
}
