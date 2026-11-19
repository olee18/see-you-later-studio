import { create } from 'zustand'
import { t } from '../i18n'
import { stage } from '../three/stage'
import { useUI } from './store'

export type PhotoAngle = 'front' | 'three' | 'top' | 'close'
export const PHOTO_ANGLES: PhotoAngle[] = ['three', 'front', 'top', 'close']

interface PhotoState {
  angle: PhotoAngle
  caption: string
  /** last photo taken (shown in the result sheet) */
  result: { url: string; blob: Blob } | null
  busy: boolean
  flash: number
  set: (p: Partial<Omit<PhotoState, 'set'>>) => void
}

export const usePhoto = create<PhotoState>()((set) => ({
  angle: 'three',
  caption: '',
  result: null,
  busy: false,
  flash: 0,
  set: (p) => set(p),
}))

/** Portrait 4:5 frame (good for chat apps and Instagram), placed between the top bar and the photo controls. */
export function photoFrame(w: number, h: number) {
  const mobile = w < 820
  const top = mobile ? 64 : 84
  const bottom = mobile ? 226 : 176
  const side = mobile ? 14 : 40
  const availH = Math.max(160, h - top - bottom)
  const availW = w - side * 2
  let fh = availH
  let fw = (fh * 4) / 5
  if (fw > availW) {
    fw = availW
    fh = (fw * 5) / 4
  }
  return { x: (w - fw) / 2, y: top + (availH - fh) / 2, w: fw, h: fh, cx: w / 2, cy: top + availH / 2 }
}

export const CAPTION_FONT = `'Cormorant Garamond', 'Noto Serif Lao', 'Noto Serif Thai', Georgia, serif`
const SANS = `'Inter', 'Noto Sans Lao', 'Noto Sans Thai', sans-serif`

/** Grab the next rendered frame (after post-processing) straight from the WebGL canvas. */
function grabFrame(): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    stage.capture = resolve
  })
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  // Lao/Thai have no spaces between words: break on spaces when there are some, else by characters
  const tokens = text.includes(' ') ? text.split(/(\s+)/) : Array.from(text)
  const lines: string[] = []
  let cur = ''
  for (const tok of tokens) {
    const next = cur + tok
    if (ctx.measureText(next).width > maxW && cur.trim()) {
      lines.push(cur.trim())
      cur = tok.trimStart()
    } else cur = next
  }
  if (cur.trim()) lines.push(cur.trim())
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…')
  }
  return lines
}

/** Draw the soft cream message band at the bottom of the photo. */
function drawCaption(ctx: CanvasRenderingContext2D, W: number, H: number, caption: string) {
  const bandH = H * 0.2
  const y0 = H - bandH
  const g = ctx.createLinearGradient(0, y0, 0, H)
  g.addColorStop(0, 'rgba(253,250,247,0)')
  g.addColorStop(0.35, 'rgba(253,250,247,0.86)')
  g.addColorStop(1, 'rgba(253,250,247,0.94)')
  ctx.fillStyle = g
  ctx.fillRect(0, y0, W, bandH)
  const size = Math.round(H * 0.044)
  ctx.font = `500 ${size}px ${CAPTION_FONT}`
  ctx.fillStyle = '#2f2826'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = wrapLines(ctx, caption, W * 0.84, 2)
  const lh = size * 1.3
  const mid = H - bandH * 0.42
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, mid - ((lines.length - 1) * lh) / 2 + i * lh))
  ctx.font = `600 ${Math.round(H * 0.014)}px ${SANS}`
  ctx.fillStyle = 'rgba(110,98,93,0.8)'
  ctx.fillText('B L O O M   S T U D I O', W / 2, H - bandH * 0.1)
}

export async function takePhoto() {
  const ph = usePhoto.getState()
  if (ph.busy) return
  ph.set({ busy: true })
  useUI.getState().set({ selected: null, dropSlot: null })
  try {
    const caption = ph.caption.trim()
    if (caption) {
      await Promise.all(
        ['Cormorant Garamond', 'Noto Serif Lao', 'Noto Serif Thai'].map((f) => document.fonts.load(`500 40px "${f}"`, caption).catch(() => null)),
      )
    }
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
    if (caption) drawCaption(ctx, W, H, caption)
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
  return `bloom-studio-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`
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
    await navigator.share({ files: [file], title: 'Bloom Studio' })
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') useUI.getState().notify(t('saveFailed'))
  }
}
