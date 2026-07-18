<div align="center">

# Collective Merch Closet

Wear the ecosystem. 328 clothing pieces across 21 Collective AI divisions, with an AI fitting room.

[![License: MIT](https://img.shields.io/badge/license-MIT-191919?style=flat-square)](LICENSE)
[![Node 22+](https://img.shields.io/badge/node-22%2B-191919?style=flat-square)](package.json)

</div>

![The Collective Closet gallery](docs/screenshots/gallery.png)

![Outfit Studio fitting room](docs/screenshots/editor.png)

## What it is

A single-page merch storefront for the Collective AI portfolio:

- **The closet** — every clothing piece, filterable by division, garment type, and full-text search (including OCR'd text from the product photography). Clothing only: non-wearable merchandise (bags, pins, mugs, desk objects) is intentionally excluded from the app.
- **Divisions** — 21 brand worlds, each with its own accent color, tagline, and tags.
- **Favorites** — heart pieces from the grid and browse just your saved picks.
- **Outfit Studio** — choose one of three models (JR, Hataalii, or Gustavo), pick up to six pieces, then generate an AI try-on photo of the outfit via the OpenAI Images API. When no API key is connected, the studio falls back to a hand-styled board composed on-device, so the button always produces a shareable image.
- **AI Stylist** — "Complete my fit" keeps your picks and fills the remaining slots (top, bottom, shoes, layer, up to two accessories) with pieces matched by division, accent color, and price tier; "Surprise me" builds a fresh full look, sometimes as a single-division kit.

All product imagery ships as a single static sprite atlas that the service worker precaches alongside the app shell, so the gallery works fully offline and the JS bundle stays small enough for mobile connections. Only the try-on generation calls out to the API.

## Quick start

```bash
git clone https://github.com/jrmoyler/Collective-Merch-Closet.git
cd Collective-Merch-Closet
npm install
cp .env.example .env   # add AGNES_API_KEY or OPENAI_API_KEY to enable the fitting room
npm run dev
```

Open [localhost:5173](http://localhost:5173). The closet works without a key; the **Generate try-on** button needs `AGNES_API_KEY` (Agnes AI, free tier) or `OPENAI_API_KEY` in `.env` (dev) or in your Vercel project settings (production). When both are set, Agnes wins — force a choice with `TRY_ON_PROVIDER`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `AGNES_API_KEY` | — | Agnes AI key for `/api/try-on` (preferred when present; `AGNES_API_TOKEN` / `APIHUB_AGNES_API_KEY` also accepted) |
| `OPENAI_API_KEY` | — | OpenAI key for `/api/try-on` (used when no Agnes key is set) |
| `TRY_ON_PROVIDER` | auto | Force `agnes` or `openai` when both keys exist |
| `AGNES_IMAGE_MODEL` | `agnes-image-2.1-flash` | Agnes image model |
| `AGNES_IMAGE_SIZE` | `1024x1536` | Agnes output size (tier values like `2K` also work) |
| `AGNES_API_BASE_URL` | `https://apihub.agnes-ai.com/v1` | Agnes API base override |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` | OpenAI image edit model |
| `OPENAI_IMAGE_QUALITY` | `high` | OpenAI image quality |
| `OPENAI_API_BASE_URL` | `https://api.openai.com/v1` | OpenAI API base override |

Environment variable names are matched case-insensitively (`agnes_api_key` works too), and stray quotes/whitespace around the key are stripped. To check whether a deployment sees a key, open `/api/try-on` in the browser — the GET response reports `provider`, `keyDetected`, and which variable name matched, without exposing the key.

## Fitting-room models

Models live in `src/models.js` (picker + identity prompt) and `src/model-sheets.js` (server-side reference sheets). The studio shows three model slots; add a model from a sheet image with:

```bash
node scripts/add-model.mjs path/to/sheet.webp maya "MAYA CHEN" "5'9\" · Columbus, Ohio" "Preserve her recognizable face, …"
```

The script copies the image to `public/models/`, embeds the server-side sheet, and registers the model everywhere. Each try-on request carries the chosen `modelId`, and the identity portion of the generation prompt comes from that model's entry.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | The whole storefront UI |
| `src/data.js` | Joins catalog, assets, and OCR data into the `MERCH` list |
| `data/merch-map.json` | Hand-verified mapping of each product photo to its catalog entry |
| `public/merch-sprite.webp` | Generated 18×19 sprite atlas of all product photos |
| `src/model-sheets/` | Model reference sheets embedded for the serverless fitting room |
| `api/try-on.js` | Vercel serverless function that generates try-on images |
| `data/` | Source catalog, asset index, and OCR text |
| `scripts/` | Generators for the sprite atlas and catalog JSON |

## Deploying

The repo is set up for Vercel (`vercel.json`): static Vite build plus the `api/try-on.js` function. Set `AGNES_API_KEY` (or `OPENAI_API_KEY`) in the project's environment variables.

## Credits

Forked from [tandpfun/wardrobe](https://github.com/tandpfun/wardrobe) and rebuilt as the Collective AI merch storefront.

## License

[MIT](LICENSE)
