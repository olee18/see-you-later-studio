import * as THREE from 'three'
import { mulberry32 } from '../data/flowers'

/** Procedural canvas textures for the room (no image files to load). */

const cache = new Map<string, THREE.CanvasTexture>()

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  draw(ctx, size)
  const tex = new THREE.CanvasTexture(c)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

const hashPos = (x: number, y: number) => {
  let h = Math.imul(Math.round(x) | 0, 73856093) ^ Math.imul(Math.round(y) | 0, 19349663)
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

function shade(hex: string, k: number) {
  const c = new THREE.Color(hex)
  c.offsetHSL(0, 0, k)
  return `#${c.getHexString()}`
}

/**
 * Herringbone parquet. One tile = 2 plank lengths square and repeats seamlessly
 * (lattice (W, W) and (L, -L), plank L = 4W).
 */
export function herringbone(a: string, b: string) {
  return make(`hb:${a}:${b}`, 1024, (ctx, S) => {
    const L = S / 2
    const W = L / 4
    const rand = mulberry32(7)
    const plank = (x: number, y: number, w: number, h: number, horizontal: boolean) => {
      const r = hashPos(((x % S) + S) % S, ((y % S) + S) % S)
      ctx.fillStyle = shade(r < 0.5 ? a : b, (r - 0.5) * 0.06)
      ctx.fillRect(x, y, w, h)
      // grain
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()
      ctx.strokeStyle = 'rgba(80,50,25,0.08)'
      ctx.lineWidth = 1.2
      for (let g = 0; g < 7; g++) {
        const o = (g + rand()) / 7
        ctx.beginPath()
        if (horizontal) {
          ctx.moveTo(x, y + o * h)
          ctx.bezierCurveTo(x + w * 0.3, y + o * h + (rand() - 0.5) * 6, x + w * 0.7, y + o * h + (rand() - 0.5) * 6, x + w, y + o * h)
        } else {
          ctx.moveTo(x + o * w, y)
          ctx.bezierCurveTo(x + o * w + (rand() - 0.5) * 6, y + h * 0.3, x + o * w + (rand() - 0.5) * 6, y + h * 0.7, x + o * w, y + h)
        }
        ctx.stroke()
      }
      ctx.restore()
      ctx.strokeStyle = 'rgba(60,35,20,0.35)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
    }
    for (let i = -6; i <= 10; i++) {
      for (let j = -4; j <= 6; j++) {
        const x = i * W + j * L
        const y = i * W - j * L
        plank(x, y, L, W, true) // horizontal
        plank(x + L, y + W - L, W, L, false) // vertical, rising from its right end
      }
    }
  })
}

/** Diagonal two-tone tiles (texture.rotation turns them into a harlequin floor). */
export function checker(a: string, b: string) {
  return make(`ck:${a}:${b}`, 512, (ctx, S) => {
    const h = S / 2
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? b : a
        ctx.fillRect(i * h, j * h, h, h)
        // faint glaze variation
        const g = ctx.createRadialGradient(i * h + h * 0.3, j * h + h * 0.3, 4, i * h + h / 2, j * h + h / 2, h * 0.8)
        g.addColorStop(0, 'rgba(255,255,255,0.10)')
        g.addColorStop(1, 'rgba(0,0,0,0.04)')
        ctx.fillStyle = g
        ctx.fillRect(i * h, j * h, h, h)
      }
    ctx.strokeStyle = 'rgba(120,100,90,0.35)'
    ctx.lineWidth = 3
    for (let k = 0; k <= 2; k++) {
      ctx.beginPath(); ctx.moveTo(k * h, 0); ctx.lineTo(k * h, S); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, k * h); ctx.lineTo(S, k * h); ctx.stroke()
    }
  })
}

/** Soft marble with wandering veins. */
export function marble(base: string, vein: string, seed = 3) {
  return make(`mb:${base}:${vein}:${seed}`, 1024, (ctx, S) => {
    const rand = mulberry32(seed)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, S, S)
    // cloudy patches
    for (let i = 0; i < 40; i++) {
      const x = rand() * S, y = rand() * S, r = 80 + rand() * 220
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(255,255,255,${0.05 + rand() * 0.08})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    const veins = (n: number, width: number, alpha: number) => {
      for (let v = 0; v < n; v++) {
        let x = rand() * S, y = rand() * S
        let ang = rand() * Math.PI * 2
        ctx.strokeStyle = vein
        ctx.globalAlpha = alpha * (0.5 + rand() * 0.5)
        ctx.lineWidth = width * (0.5 + rand())
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let k = 0; k < 60; k++) {
          ang += (rand() - 0.5) * 0.6
          x += Math.cos(ang) * 14
          y += Math.sin(ang) * 14
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    ctx.filter = 'blur(2px)'
    veins(10, 5, 0.25)
    ctx.filter = 'blur(0.6px)'
    veins(18, 1.6, 0.45)
    ctx.filter = 'none'
  })
}

/** Long-grain wood for table tops. */
export function wood(base: string, dark: string, seed = 5) {
  return make(`wd:${base}:${dark}:${seed}`, 1024, (ctx, S) => {
    const rand = mulberry32(seed)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 160; i++) {
      const y0 = rand() * S
      const amp = 4 + rand() * 14
      const f = 1 + rand() * 3
      const ph = rand() * 6.28
      ctx.strokeStyle = dark
      ctx.globalAlpha = 0.05 + rand() * 0.12
      ctx.lineWidth = 0.6 + rand() * 2.2
      ctx.beginPath()
      for (let x = 0; x <= S; x += 8) {
        const y = y0 + Math.sin((x / S) * Math.PI * 2 * f + ph) * amp
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
}
