# SEE YOU LATER · STUDIO

A 3D bouquet maker in the browser: arrange flowers one by one (or start from a
ready-made bouquet), wrap them, tie a bow, put them on a stand, then take a
photo with a message card to send to someone special.

UI in **Lao, Thai and English**. Works on desktop and phones.

Built with React, React Three Fiber, Drei, postprocessing, Zustand and GSAP.
All flowers, rooms and textures are generated in code (no image or model files).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build a static site (relative paths, so it can be hosted in any folder):

```bash
npm run build -- --base=./
npm run preview -- --host   # serve dist/ on your local network
```

## How it works for customers

A guided 4-step flow:

1. **Bouquet**: start from an empty bouquet, or pick one of 8 ready-made bouquets in size M / L / XL
2. **Flowers**: tap a colour to add a flower, drag it onto the bouquet to place it, tap a flower to recolour or remove it (17 kinds of flowers and fillers)
3. **Wrap**: shape (Korean wrap, tall cone, hand-tied, round posy), stand (gold stand, ceramic cup, glass vase, rattan basket, wooden box), wrapping paper and ribbon colour
4. **Photo**: 4:5 photo with four camera angles and a message card (gift card, polaroid or elegant band, with To / From), saved as JPG

Also: three rooms (Morning Atelier, Pink Café, Candlelight), undo / redo, and
several saved bouquets kept in the browser (localStorage).

## Code map

| Path | What it holds |
|---|---|
| `src/data/flowers.ts` | Flower types and their procedural 3D builders |
| `src/gift/layout.ts` | Dome layout: stable flower slots, bouquet dimensions |
| `src/gift/styles.ts` | Ready-made bouquets, sizes, wrapping papers, ribbons, save sanitising |
| `src/gift/palettes.ts` | Colour choices per flower |
| `src/gift/shapes.ts`, `stands.ts` | Bouquet shapes and stands |
| `src/state/store.ts` | Bouquet store (persisted, undo/redo) and UI state |
| `src/state/photo.ts` | Photo framing, capture, message-card drawing, save/share |
| `src/three/` | Scene and camera, rooms and lighting, bouquet wrap/ribbon/foliage, stands, textures |
| `src/ui/` | Panel steps, flower list, photo mode, icons, bouquet switcher |
| `src/i18n.ts` | Lao / Thai / English text |
