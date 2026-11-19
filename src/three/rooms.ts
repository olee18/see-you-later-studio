import { create } from 'zustand'

/** Room + table themes. Each one changes walls, floor, table, light and window view. */
export type RoomId = 'atelier' | 'blush' | 'evening'

export interface RoomTheme {
  id: RoomId
  /** swatch for the picker: [wall, floor, table] */
  swatch: [string, string, string]
  bg: string
  wall: string
  wainscot: string
  trim: string
  floor: { kind: 'herringbone' | 'checker'; a: string; b: string; rough: number; tile: number }
  table: 'atelier' | 'cafe' | 'walnut'
  pedestal: string
  pot: string
  leaf: [string, string]
  curtain: string
  /** window view gradient: top, horizon, hedge */
  view: [string, string, string]
  light: {
    sky: string; ground: string; hemi: number
    key: string; keyI: number; keyOffset: [number, number, number]
    glowI: number; env: number; fill: number; fillColor: string
    forms: [string, string, string]
  }
  candles?: boolean
  sconces?: boolean
}

export const ROOMS: RoomTheme[] = [
  {
    id: 'atelier',
    swatch: ['#f3ebe2', '#d6b893', '#f4f1ec'],
    bg: '#f4ece4',
    wall: '#f1e8de',
    wainscot: '#f5eee6',
    trim: '#fbf7f2',
    floor: { kind: 'herringbone', a: '#dfcbb0', b: '#d5bf9f', rough: 0.62, tile: 1.3 },
    table: 'atelier',
    pedestal: '#f4efe9',
    pot: '#efe7dc',
    leaf: ['#7f9a7a', '#a3b89b'],
    curtain: '#fbf6ef',
    view: ['#f7fbff', '#fff9ef', '#b9cfa6'],
    light: {
      sky: '#fffaf3', ground: '#eadccb', hemi: 0.9,
      key: '#fff2e2', keyI: 2.6, keyOffset: [-2.2, 4.2, -2.4],
      glowI: 2.1, env: 1.15, fill: 0.85, fillColor: '#fff6ee',
      forms: ['#fff6ea', '#ffe6d6', '#fff9f2'],
    },
  },
  {
    id: 'blush',
    swatch: ['#ecd3cd', '#f3e6dc', '#e7c4c0'],
    bg: '#efdad5',
    wall: '#ead0ca',
    wainscot: '#efdcd7',
    trim: '#f8ede9',
    floor: { kind: 'checker', a: '#f6efe7', b: '#ead2cc', rough: 0.35, tile: 0.7 },
    table: 'cafe',
    pedestal: '#f3e1dc',
    pot: '#f2dcd6',
    leaf: ['#7f9a7a', '#a9bd9f'],
    curtain: '#fff5f2',
    view: ['#fff4f0', '#fff3e6', '#c6d6ae'],
    light: {
      sky: '#fff1ea', ground: '#e8cfc8', hemi: 0.88,
      key: '#ffe2c8', keyI: 2.5, keyOffset: [-2.4, 3.8, -2.2],
      glowI: 2.0, env: 1.1, fill: 0.8, fillColor: '#fff0ea',
      forms: ['#fff0ea', '#ffd9d0', '#fff6f2'],
    },
  },
  {
    id: 'evening',
    swatch: ['#2e3b35', '#5a3d2b', '#f2c879'],
    bg: '#232c28',
    wall: '#2f3c36',
    wainscot: '#28342f',
    trim: '#3b4a43',
    floor: { kind: 'herringbone', a: '#5c3f2c', b: '#4d3424', rough: 0.5, tile: 1.3 },
    table: 'walnut',
    pedestal: '#e9e1d6',
    pot: '#3f4b45',
    leaf: ['#5f7a5a', '#839c79'],
    curtain: '#d9cbb8',
    view: ['#4a5a86', '#d99a7e', '#2f3b33'],
    light: {
      sky: '#8a95b0', ground: '#4a382b', hemi: 0.62,
      key: '#ffd3a1', keyI: 2.6, keyOffset: [-1.6, 3.4, 2.6],
      glowI: 0.95, env: 0.7, fill: 0.8, fillColor: '#ffe2c2',
      forms: ['#ffcf9a', '#ffb37a', '#ffe2c4'],
    },
    candles: true,
    sconces: true,
  },
]

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id) ?? ROOMS[0]

const KEY = 'bloom-studio:room'
function initialRoom(): RoomId {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'atelier' || v === 'blush' || v === 'evening') return v
  } catch { /* storage blocked */ }
  return 'atelier'
}

export const useRoom = create<{ room: RoomId; setRoom: (r: RoomId) => void }>()((set) => ({
  room: initialRoom(),
  setRoom: (room) => {
    try { localStorage.setItem(KEY, room) } catch { /* ignore */ }
    set({ room })
  },
}))
