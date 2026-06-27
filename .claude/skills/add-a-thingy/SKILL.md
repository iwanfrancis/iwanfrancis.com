---
name: add-a-thingy
description: Scaffold and register a new /thingies tile — pick the next sequential id, create a contract-conforming index.tsx from a template, and append the registry entry (append-only, never reordering). Use when the user wants to add a thingy / tile to the /thingies canvas.
metadata:
  author: iwan
  version: "1.0"
---

Add a new tile ("thingy") to the `/thingies` canvas. You handle the boilerplate —
next id, folder, contract-conforming component, registry entry — so the author only
has to write the drawing.

The tile contract and id convention are canonical in
[`src/features/thingies/thingies/README.md`](../../../src/features/thingies/thingies/README.md).
**Do not restate the contract; follow it.** The registry is
[`src/features/thingies/thingies.ts`](../../../src/features/thingies/thingies.ts).

**Input**: the tile's name (e.g. "spinning glyph"). Optionally a palette colour
(`amber` | `teal` | `blue` | `rose` | `violet`) and a one-line idea of what it
draws. If no name is given, ask for one.

## Steps

### 1. Derive names

- `title` = the name as given, in sentence case (e.g. `Spinning glyph`).
- `slug` = kebab-case of the name (e.g. `spinning-glyph`).
- `ComponentName` = PascalCase of the slug (e.g. `SpinningGlyph`).

### 2. Compute the next id

- Read `src/features/thingies/thingies.ts`.
- For every entry, parse the leading four digits of its `id`. Take the **max**, add
  1, and zero-pad to four digits → `NNNN`.
- The new id is `NNNN-<slug>` (e.g. `0006-spinning-glyph`).
- **Abort** if `src/features/thingies/thingies/NNNN-<slug>/` already exists — the id
  or slug collides; resolve before continuing.

### 3. Scaffold the tile

Create `src/features/thingies/thingies/NNNN-<slug>/index.tsx` from this template,
substituting `{{ComponentName}}`, `{{Title}}`, and the palette colour
(default `blue`). It is a contract-conforming starter — decorative, `aria-hidden`,
fills the square, palette colour via `currentColor`, motion gated behind
`motion-safe:`. The author replaces the drawing inside.

```tsx
/**
 * {{Title}} — TODO: describe what this draws.
 * Decorative; animation is gated behind motion-safe, so reduced-motion visitors
 * see a static result. Tile contract: ../README.md.
 */
export default function {{ComponentName}}() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-thingy-blue"
      aria-hidden="true"
    >
      {/* TODO: replace with your drawing. Use currentColor for the palette colour,
          relative coords (0–100), and motion-safe: for any animation. */}
      <circle
        cx="50"
        cy="50"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="motion-safe:animate-pulse"
        style={{ transformOrigin: 'center', animationDuration: '3s' }}
      />
    </svg>
  )
}
```

Prefer SVG / CSS animation as above. If the idea genuinely needs a `<div>` layout
instead (like `0004-orbiting-dot` / `0005-wave-bars`), that's fine — keep every
contract guarantee (fills the square, **scale-independent: size via `viewBox` /
percentages, not fixed px**, `motion-safe:`, palette via `bg-current` /
`border-current`, no interactivity). Avoid JS/`requestAnimationFrame`/canvas loops:
off-screen tiles freeze by pausing **CSS** animations only, so a JS loop keeps
running unseen (see the README).

Libraries are welcome for experiments — `yarn add` one and import it in the tile
file; it rides in the tile's own lazy chunk. Mind bundle size and the JS-loop /
WebGL caveats in the README.

### 4. Append the registry entry

Append **one** entry to the END of the `thingies` array in
`src/features/thingies/thingies.ts`, immediately after the last existing entry and
before the closing `]`. Match the file's Biome formatting (2-space indent, single
quotes, no semicolons, trailing comma). Use today's date for `date` (ISO,
`YYYY-MM-DD`).

```ts
  {
    id: '{{NNNN-slug}}',
    title: '{{Title}}',
    date: '{{YYYY-MM-DD}}',
    load: () => import('./thingies/{{NNNN-slug}}'),
  },
```

**Never** insert before an existing entry or reorder — that reshuffles every later
tile's position on the canvas.

### 5. Verify

- The new id appears exactly once in `thingies.ts`, and the `load` import path
  matches the folder you created.
- The `thingies` array still parses (balanced braces/brackets, trailing comma).
- Every existing entry is unchanged and still in its original order.
- The new tile satisfies the README contract.

Then tell the author the id, the file to edit
(`src/features/thingies/thingies/NNNN-<slug>/index.tsx`), and that running
`yarn dev` shows it at the frontier edge of the blob on `/thingies`. Formatting is
enforced by the pre-commit hook, so no manual format step is needed.
