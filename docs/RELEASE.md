# RELEASE

## Build (production)
1) Build OpenWork web UI:
   - `pnpm -C vendor/openwork install`
   - `pnpm -C vendor/openwork build:web`
2) Copy OpenWork dist into plugin assets:
   - `node scripts/copy-openwork-dist.mjs`
3) Build plugin:
   - `bun install`
   - `bun run build`

## Verify
- `assets/openwork/index.html` exists and references assets that are present.
- Plugin loads in Obsidian Desktop.

## Package
- Follow standard Obsidian community plugin packaging:
  - `manifest.json`
  - `main.js`
  - `styles.css` (if needed)
- Zip these into a release artifact.
