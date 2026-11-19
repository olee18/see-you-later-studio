import * as THREE from 'three'
import type { Design } from '../state/types'

/** Small generated canvas textures for wrapping-paper patterns (no image assets). */

const cache = new Map<string, THREE.CanvasTexture>()
const SIZE = 256

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

function drawLeafSprig(g: CanvasRenderingContext2D, x: number, y: number, rot: number, scale: number) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(scale, scale)
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(0, 18)
  g.quadraticCurveTo(2, 0, 0, -20)
  g.stroke()
  for (let i = 0; i < 4; i++) {
    const yy = 12 - i * 9
    for (const side of [-1, 1]) {
      g.save()
      g.translate(0, yy)
      g.rotate(side * 0.9)
      g.beginPath()
      g.ellipse(0, -6, 3, 6.5, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
  }
  g.beginPath()
  g.ellipse(0, -23, 3, 6, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

export function wrapTexture(wrap: Design['wrap']): THREE.CanvasTexture | null {
  const kraft = wrap.material === 'kraft'
  if (wrap.pattern === 'none' && !kraft) return null
  const key = `${wrap.pattern}:${wrap.color}:${wrap.color2}:${kraft}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const g = canvas.getContext('2d')!
  g.fillStyle = wrap.color
  g.fillRect(0, 0, SIZE, SIZE)

  if (kraft) {
    // paper fibres
    const rnd = seeded(7)
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = rnd() < 0.5 ? 'rgba(60,40,20,0.07)' : 'rgba(255,255,255,0.08)'
      g.lineWidth = 0.6 + rnd()
      const x = rnd() * SIZE
      const y = rnd() * SIZE
      const a = rnd() * Math.PI
      const l = 3 + rnd() * 9
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      g.stroke()
    }
  }

  g.fillStyle = wrap.color2
  g.strokeStyle = wrap.color2
  switch (wrap.pattern) {
    case 'dots':
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 5; col++) {
          const x = col * 64 + (row % 2 ? 32 : 0)
          const y = row * 64 + 32
          for (const dx of [-SIZE, 0, SIZE]) {
            g.beginPath()
            g.arc(x + dx, y, 9, 0, Math.PI * 2)
            g.fill()
          }
        }
      break
    case 'stripes':
      g.lineWidth = 16
      for (let i = -SIZE; i < SIZE * 2; i += 64) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + SIZE, SIZE)
        g.stroke()
      }
      break
    case 'botanical': {
      const rnd = seeded(11)
      const spots = [[48, 56], [176, 40], [112, 140], [220, 170], [40, 200], [150, 236]]
      for (const [x, y] of spots)
        for (const [dx, dy] of [[0, 0], [SIZE, 0], [-SIZE, 0], [0, SIZE], [0, -SIZE]])
          drawLeafSprig(g, x + dx, y + dy, (rnd() - 0.5) * 1.6, 1.1)
      break
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(9, 3)
  tex.anisotropy = 4
  if (cache.size > 12) {
    const [oldKey, old] = cache.entries().next().value as [string, THREE.CanvasTexture]
    old.dispose()
    cache.delete(oldKey)
  }
  cache.set(key, tex)
  return tex
}
