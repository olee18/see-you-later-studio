# Bloom Studio

A 3D flower-arranging studio (fictional brand). React Three Fiber + Drei + Zustand + GSAP + postprocessing.

```bash
npm install
npm run dev
```

## Round 1 (done)
- Studio scene: hero bouquet rotating on a pedestal, soft window light, SSAO + soft bloom
- "Start Arranging" → GSAP camera flight to the workbench with an empty wrapping cone
- Flower library: 9 flowers + 4 fillers, procedurally modelled with instanced petals/leaves
- Drag (mouse/touch) or tap to add; drop preview ring shows the exact spiral slot
- Hand-tied spiral layout: 40 golden-angle slots, tallest in the centre, stems cross at the binding point
- Select a stem → adjust position (around / outward), height, stem lean, head tilt, head turn; drag in 3D to re-snap; remove (button / Delete key)
- Auto-arrange, Clear, 40-stem cap, autosave (localStorage), reduced-motion fallback, mobile layout

## Code map
- `src/data/flowers.ts` — flower definitions + procedural builders (parts = geometry + instance matrices)
- `src/state/layout.ts` — spiral slot maths, stem targets, snapping
- `src/state/store.ts` — design store (persisted, sanitised) + UI store
- `src/three/` — scene, studio, bouquet (wrap/ribbon/holder), per-stem renderer, petal shader
- `src/ui/` — library, inspector, glyph icons

The `Design` shape in `src/state/types.ts` already holds colours, wrap, ribbon, background and card text for rounds 2–3.
