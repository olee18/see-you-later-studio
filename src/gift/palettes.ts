import { FLOWERS, type FlowerType, type StemColors } from '../data/flowers'

/**
 * A few florist-realistic colours per flower — chosen for you, so every pick
 * looks good. (No colour wheel: tap a colour, the flower goes in.)
 */
export interface ColorOption {
  name: string
  colors: StemColors
}

const opt = (type: FlowerType, name: string, c: Partial<StemColors> = {}): ColorOption => ({ name, colors: { ...FLOWERS[type].colors, ...c } })

export const FLOWER_COLORS: Record<FlowerType, ColorOption[]> = {
  rose: [
    opt('rose', 'Red', { petal: '#a8102c', petal2: '#d22e4a', gradient: 0.3, center: '#5e0a1a' }),
    opt('rose', 'Pink', { petal: '#f29aae', petal2: '#fde2e9', gradient: 0.55, center: '#b84a63' }),
    opt('rose', 'Light pink', { petal: '#f7c1cc', petal2: '#fff0f3', gradient: 0.5, center: '#d27b8c' }),
    opt('rose', 'White', { petal: '#fbf6ee', petal2: '#ffffff', gradient: 0.3, center: '#e9dcc6' }),
    opt('rose', 'Peach', { petal: '#f6b49a', petal2: '#fde4d6', gradient: 0.5, center: '#c8735a' }),
    opt('rose', 'Yellow', { petal: '#ffcf4a', petal2: '#fff2a8', gradient: 0.5, center: '#c99a1a' }),
    opt('rose', 'Lilac', { petal: '#c9a7e3', petal2: '#efe3f8', gradient: 0.5, center: '#8a62b0' }),
  ],
  tulip: [
    opt('tulip', 'Pink', { petal: '#f4a6b7', petal2: '#fde3ea' }),
    opt('tulip', 'Red', { petal: '#c8213a', petal2: '#e8576d' }),
    opt('tulip', 'White', { petal: '#fbf8f1', petal2: '#ffffff' }),
    opt('tulip', 'Yellow', { petal: '#f6c945', petal2: '#fff2a8' }),
    opt('tulip', 'Purple', { petal: '#8e5aa8', petal2: '#c9a7e3' }),
  ],
  peony: [
    opt('peony', 'Pink', { petal: '#f0a6bb', petal2: '#fde3ea' }),
    opt('peony', 'Blush', { petal: '#f7cad3', petal2: '#fff2f4' }),
    opt('peony', 'White', { petal: '#fbf6f0', petal2: '#ffffff', center: '#f2d27a' }),
    opt('peony', 'Coral', { petal: '#f4897a', petal2: '#fcd5cc' }),
  ],
  sunflower: [opt('sunflower', 'Classic')],
  hydrangea: [
    opt('hydrangea', 'Blue', { petal: '#8fb1e6', petal2: '#cfe0f7', center: '#eef3fb' }),
    opt('hydrangea', 'Lilac', { petal: '#c8b0e6', petal2: '#efe6f8' }),
    opt('hydrangea', 'White', { petal: '#f6f4ee', petal2: '#e3ecd9', center: '#f6f3ea' }),
    opt('hydrangea', 'Pink', { petal: '#eeb4c8', petal2: '#fbe6ee' }),
  ],
  lily: [opt('lily', 'White'), opt('lily', 'Pink', { petal: '#f6b6c6', petal2: '#fbe3ea' })],
  carnation: [
    opt('carnation', 'Pink'),
    opt('carnation', 'Red', { petal: '#c41e3a', petal2: '#e8576d' }),
    opt('carnation', 'White', { petal: '#fbf8f1', petal2: '#ffffff' }),
    opt('carnation', 'Peach', { petal: '#f6c1a8', petal2: '#fde8dc' }),
  ],
  orchid: [opt('orchid', 'White'), opt('orchid', 'Purple', { petal: '#b36fc4', petal2: '#e2c3ea', center: '#7a2f8a' })],
  gerbera: [
    opt('gerbera', 'Orange', { petal: '#ff8a3d', petal2: '#ffc27a' }),
    opt('gerbera', 'Yellow', { petal: '#ffd23f', petal2: '#fff1a8' }),
    opt('gerbera', 'Pink', { petal: '#f48fb1', petal2: '#fde0ea' }),
    opt('gerbera', 'Red', { petal: '#d8283f', petal2: '#f26d7d' }),
  ],
  daisy: [opt('daisy', 'White')],
  chrysanthemum: [
    opt('chrysanthemum', 'Cream'),
    opt('chrysanthemum', 'Yellow', { petal: '#f6c945', petal2: '#fff2a8' }),
    opt('chrysanthemum', 'Pink', { petal: '#f2a7c3', petal2: '#fde3ee' }),
  ],
  ranunculus: [
    opt('ranunculus', 'Peach'),
    opt('ranunculus', 'Pink', { petal: '#f29aae', petal2: '#fde2e9' }),
    opt('ranunculus', 'White', { petal: '#fbf6ee', petal2: '#ffffff' }),
    opt('ranunculus', 'Yellow', { petal: '#ffd23f', petal2: '#fff1a8' }),
  ],
  lisianthus: [
    opt('lisianthus', 'Purple tip'),
    opt('lisianthus', 'White', { petal: '#ffffff', petal2: '#f3f0ea', gradient: 0.3 }),
    opt('lisianthus', 'Pink', { petal: '#fbe3ea', petal2: '#f29aae', gradient: 0.7 }),
  ],
  babysBreath: [
    opt('babysBreath', 'White'),
    opt('babysBreath', 'Pink', { petal: '#f5b3c8', petal2: '#ffe3ec' }),
    opt('babysBreath', 'Lilac', { petal: '#d7b8ef', petal2: '#f3e8fb' }),
    opt('babysBreath', 'Blue', { petal: '#a9c6f0', petal2: '#e3eefb' }),
  ],
  eucalyptus: [opt('eucalyptus', 'Silver green')],
  lavender: [opt('lavender', 'Purple')],
  jasmine: [opt('jasmine', 'White')],
}
