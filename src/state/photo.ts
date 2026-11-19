import { create } from 'zustand'
import { t, useLang } from '../i18n'
import { stage } from '../three/stage'
import { useUI } from './store'

export type PhotoAngle = 'front' | 'three' | 'top' | 'close'
export const PHOTO_ANGLES: PhotoAngle[] = ['three', 'front', 'top', 'close']

/** How the message is laid onto the photo. */
export type CardDesign = 'band' | 'card' | 'polaroid'
export const CARD_DESIGNS: CardDesign[] = ['card', 'polaroid', 'band']

interface PhotoState {
  angle: PhotoAngle
  design: CardDesign
  to: string
  caption: string
  from: string
  /** last photo taken (shown in the result sheet) */
  result: { url: string; blob: Blob } | null
  busy: boolean
  flash: number
  set: (p: Partial<Omit<PhotoState, 'set'>>) => void
}

export const usePhoto = create<PhotoState>()((set) => ({
  angle: 'three',
  design: 'card',
  to: '',
  caption: '',
  from: '',
  result: null,
  busy: false,
  flash: 0,
  set: (p) => set(p),
}))

/** Desktop: message panel on the right, camera bar at the bottom. Phone: one bottom sheet. */
export const PHOTO_PANEL_W = 380
export function photoFrame(w: number, h: number) {
  const mobile = w < 820
  const top = mobile ? 58 : 84
  const bottom = mobile ? 322 : 112
  const left = mobile ? 12 : 32
  const right = mobile ? 12 : PHOTO_PANEL_W + 18 + 32
  const availH = Math.max(160, h - top - bottom)
  const availW = Math.max(120, w - left - right)
  let fh = availH
  let fw = (fh * 4) / 5
  if (fw > availW) {
    fw = availW
    fh = (fw * 5) / 4
  }
  const cx = left + availW / 2
  const cy = top + availH / 2
  return { x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh, cx, cy }
}

export const SERIF = `'Cormorant Garamond', 'Noto Serif Lao', 'Noto Serif Thai', Georgia, serif`
export const SCRIPT = `'Dancing Script', 'Charm', 'Noto Sans Lao Looped', cursive`
const SANS = `'Inter', 'Noto Sans Lao', 'Noto Sans Thai', sans-serif`
export const BRAND_MARK = 'SEE YOU LATER · STUDIO'
const INK = '#2f2826'
const ROSE = '#c2607a'
const SOFT = 'rgba(110,98,93,0.85)'

/** Grab the next rendered frame (after post-processing) straight from the WebGL canvas. */
function grabFrame(): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    stage.capture = resolve
  })
}

/** Break text into lines; Lao/Thai have no spaces, so split on words with Intl.Segmenter when available. */
function tokens(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter
  if (Seg) return Array.from(new Seg(useLang.getState().lang, { granularity: 'word' }).segment(text), (x) => x.segment)
  return text.includes(' ') ? text.split(/(\s+)/) : Array.from(text)
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const lines: string[] = []
  let cur = ''
  for (const tok of tokens(text)) {
    const next = cur + tok
    if (ctx.measureText(next).width > maxW && cur.trim()) {
      lines.push(cur.trim())
      cur = tok.trimStart()
    } else cur = next
  }
  if (cur.trim()) lines.push(cur.trim())
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/u, '…')
  }
  return lines
}

export interface Decor {
  design: CardDesign
  to: string
  caption: string
  from: string
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function brand(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center') {
  ctx.font = `600 ${size}px ${SANS}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = `${size * 0.35}px`
  ctx.fillText(BRAND_MARK, x, y)
  ctx.letterSpacing = '0px'
}

/**
 * Draw the message decoration on top of a photo of size W×H. Used for both
 * the live preview (over the frame) and the saved image, so they match.
 */
export function drawDecor(ctx: CanvasRenderingContext2D, W: number, H: number, d: Decor) {
  const to = d.to.trim()
  const msg = d.caption.trim()
  const from = d.from.trim()
  const any = !!(to || msg || from)
  const toText = to ? `${t('toLabel')} ${to}` : ''
  const fromText = from ? `♡ ${t('fromLabel')} ${from}` : ''

  if (d.design === 'polaroid') {
    const m = W * 0.055
    const bb = H * 0.2
    ctx.fillStyle = '#fdfbf8'
    ctx.fillRect(0, 0, W, m)
    ctx.fillRect(0, 0, m, H)
    ctx.fillRect(W - m, 0, m, H)
    ctx.fillRect(0, H - bb, W, bb)
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = Math.max(1, W * 0.002)
    ctx.strokeRect(m, m, W - 2 * m, H - m - bb)
    const cx = W / 2
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let y = H - bb + bb * 0.22
    if (toText) {
      ctx.font = `600 ${H * 0.024}px ${SCRIPT}`
      ctx.fillStyle = ROSE
      ctx.fillText(toText, cx, y)
      y += H * 0.04
    } else y += H * 0.012
    if (msg) {
      const size = H * 0.042
      ctx.font = `500 ${size}px ${SCRIPT}`
      ctx.fillStyle = INK
      const lines = wrapLines(ctx, msg, W * 0.86, 2)
      lines.forEach((ln) => {
        ctx.fillText(ln, cx, y)
        y += size * 1.2
      })
    }
    if (fromText) {
      ctx.font = `600 ${H * 0.022}px ${SCRIPT}`
      ctx.fillStyle = SOFT
      ctx.textAlign = 'right'
      ctx.fillText(fromText, W - m * 1.4, H - bb * 0.2)
    }
    brand(ctx, fromText ? m * 1.4 : W / 2, H - bb * 0.2, H * 0.0105, 'rgba(110,98,93,0.6)', fromText ? 'left' : 'center')
    return
  }

  if (!any) return

  if (d.design === 'band') {
    const bandH = H * 0.26
    const y0 = H - bandH
    const g = ctx.createLinearGradient(0, y0, 0, H)
    g.addColorStop(0, 'rgba(253,250,247,0)')
    g.addColorStop(0.3, 'rgba(253,250,247,0.86)')
    g.addColorStop(1, 'rgba(253,250,247,0.95)')
    ctx.fillStyle = g
    ctx.fillRect(0, y0, W, bandH)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines: { text: string; font: string; color: string; h: number }[] = []
    if (toText) lines.push({ text: toText, font: `italic 500 ${H * 0.024}px ${SERIF}`, color: ROSE, h: H * 0.038 })
    if (msg) {
      const size = H * 0.042
      ctx.font = `500 ${size}px ${SERIF}`
      for (const ln of wrapLines(ctx, msg, W * 0.84, 2)) lines.push({ text: ln, font: `500 ${size}px ${SERIF}`, color: INK, h: size * 1.22 })
    }
    if (fromText) lines.push({ text: fromText, font: `italic 500 ${H * 0.022}px ${SERIF}`, color: SOFT, h: H * 0.036 })
    const total = lines.reduce((s, l) => s + l.h, 0)
    let y = H - H * 0.045 - total + lines[0].h / 2
    for (const l of lines) {
      ctx.font = l.font
      ctx.fillStyle = l.color
      ctx.fillText(l.text, W / 2, y)
      y += l.h
    }
    brand(ctx, W / 2, H - H * 0.018, H * 0.0105, 'rgba(110,98,93,0.65)')
    return
  }

  // gift card: a small tilted card in the lower right corner
  const cw = W * 0.54
  const p = W * 0.045
  const msgSize = H * 0.036
  ctx.font = `500 ${msgSize}px ${SCRIPT}`
  const msgLines = msg ? wrapLines(ctx, msg, cw - 2 * p, 4) : []
  const ch = p * 1.5 + (toText ? H * 0.036 : 0) + msgLines.length * msgSize * 1.22 + (fromText ? H * 0.04 : 0) + H * 0.026 + p * 0.6
  const x = W - cw - W * 0.05
  const y = H - ch - H * 0.05
  ctx.save()
  ctx.translate(x + cw / 2, y + ch / 2)
  ctx.rotate((-3 * Math.PI) / 180)
  ctx.translate(-cw / 2, -ch / 2)
  ctx.shadowColor = 'rgba(60,35,30,0.28)'
  ctx.shadowBlur = W * 0.03
  ctx.shadowOffsetY = W * 0.01
  ctx.fillStyle = '#fffdf9'
  roundRect(ctx, 0, 0, cw, ch, W * 0.018)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(194,96,122,0.35)'
  ctx.lineWidth = Math.max(1, W * 0.0022)
  roundRect(ctx, W * 0.012, W * 0.012, cw - W * 0.024, ch - W * 0.024, W * 0.012)
  ctx.stroke()
  // little punched hole + string
  ctx.fillStyle = 'rgba(194,96,122,0.5)'
  ctx.beginPath()
  ctx.arc(cw * 0.5, W * 0.03, W * 0.008, 0, Math.PI * 2)
  ctx.fill()
  ctx.textBaseline = 'middle'
  let cy = p * 1.5
  if (toText) {
    ctx.font = `600 ${H * 0.024}px ${SCRIPT}`
    ctx.fillStyle = ROSE
    ctx.textAlign = 'left'
    ctx.fillText(toText, p, cy)
    cy += H * 0.036
  }
  ctx.font = `500 ${msgSize}px ${SCRIPT}`
  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  for (const ln of msgLines) {
    cy += msgSize * 0.5
    ctx.fillText(ln, p, cy)
    cy += msgSize * 0.72
  }
  if (fromText) {
    cy += H * 0.02
    ctx.font = `600 ${H * 0.023}px ${SCRIPT}`
    ctx.fillStyle = SOFT
    ctx.textAlign = 'right'
    ctx.fillText(fromText, cw - p, cy)
    cy += H * 0.02
  }
  brand(ctx, cw / 2, ch - p * 0.75, H * 0.0095, 'rgba(110,98,93,0.55)')
  ctx.restore()
}

/** Make sure the message fonts are ready before drawing (canvas does not wait for them). */
export function loadDecorFonts(text: string) {
  const fams = ['Dancing Script', 'Charm', 'Noto Sans Lao Looped', 'Cormorant Garamond', 'Noto Serif Lao', 'Noto Serif Thai', 'Inter']
  return Promise.all(fams.map((f) => document.fonts.load(`500 40px "${f}"`, text || 'Aa').catch(() => null)))
}

export async function takePhoto() {
  const ph = usePhoto.getState()
  if (ph.busy) return
  ph.set({ busy: true })
  useUI.getState().set({ selected: null, dropSlot: null })
  try {
    const decor: Decor = { design: ph.design, to: ph.to, caption: ph.caption, from: ph.from }
    await loadDecorFonts(`${ph.to}${ph.caption}${ph.from}${t('toLabel')}${t('fromLabel')}`)
    // let the selection ring disappear before grabbing
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const src = await grabFrame()
    const rect = src.getBoundingClientRect()
    const k = src.width / rect.width
    const f = photoFrame(rect.width, rect.height)
    const sw = f.w * k
    const sh = f.h * k
    const W = Math.max(1080, Math.round(sw))
    const H = Math.round((W * 5) / 4)
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const ctx = out.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, f.x * k, f.y * k, sw, sh, 0, 0, W, H)
    drawDecor(ctx, W, H, decor)
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/jpeg', 0.92))
    if (!blob) throw new Error('encode failed')
    const prev = usePhoto.getState().result
    if (prev) URL.revokeObjectURL(prev.url)
    usePhoto.getState().set({ result: { url: URL.createObjectURL(blob), blob }, flash: Date.now() })
  } catch {
    useUI.getState().notify(t('saveFailed'))
  } finally {
    usePhoto.getState().set({ busy: false })
  }
}

const fileName = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `see-you-later-studio-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`
}

interface DownloadsApi {
  save: (r: { filename: string; data: Blob }) => Promise<unknown>
}
type ClaudeHost = { use?: (name: string) => Promise<unknown> }

/** Inside claude.ai the page asks the viewer to save through the `downloads` capability; elsewhere a normal download link. */
let downloadsApi: Promise<DownloadsApi | null> | null = null
export function warmDownloads() {
  const host = (window as unknown as { claude?: ClaudeHost }).claude
  if (!downloadsApi) downloadsApi = host?.use ? (host.use('downloads') as Promise<DownloadsApi | null>).catch(() => null) : Promise.resolve(null)
  return downloadsApi
}

export async function savePhoto(blob: Blob, url: string) {
  const api = await warmDownloads()
  const name = fileName()
  if (api) {
    try {
      await api.save({ filename: name, data: blob })
      useUI.getState().notify(t('saved'))
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code !== 'declined') useUI.getState().notify(t('saveFailed'))
    }
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function canShareFiles() {
  try {
    const f = new File([new Blob(['x'], { type: 'image/jpeg' })], 'x.jpg', { type: 'image/jpeg' })
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] })
  } catch {
    return false
  }
}

export async function sharePhoto(blob: Blob) {
  try {
    const file = new File([blob], fileName(), { type: 'image/jpeg' })
    await navigator.share({ files: [file], title: 'SEE YOU LATER · STUDIO' })
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') useUI.getState().notify(t('saveFailed'))
  }
}
