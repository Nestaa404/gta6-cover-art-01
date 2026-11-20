[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/Nestaa404/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/Nestaa404/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast Cover Studio

Entry for make.fun bounty [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) — a web app that turns your photo and a caption into GTA-style poster cover art.

## What it does

- **Multi-panel poster look** — three layouts (Hero + duo, Sunset trio, Hero + strip), each panel holding its own photo.
- **Any photo** — load the two built-in samples or your own photos from your machine (read locally, never uploaded). Fill all panels with one photo or mix several.
- **Crop each panel** — zoom and pan sliders per panel, with a reset.
- **Colour grades** — Vice Sunset, Neon Nights, Palm Noir, and Bubblegum washes over the whole poster, plus a vignette.
- **Bold caption lettering** — a big italic caption banner, a sub-caption line, and a city tag, all editable.
- **Fast export** — one click exports a PNG in the common post sizes: 1080 × 1080, 1080 × 1350, or 1920 × 1080.

## Try it

No build step, no network — the app is static files under `app/`:

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` with any static HTTP server and open `index.html`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` there with the vendored make.fun library.

## Notes

- Original design and artwork: no Rockstar Games logo, wordmark, official artwork, character, or font. The "Neon Coast" city name is fictional, and the lettering uses system fonts.
- The two sample photos under `app/samples/` were made for make.fun with an image model and are free to use.
- Screenshots in `screenshots/` were taken from this app with headless Chrome; `shots.json` records the scene (URL query + window size) behind each one.
