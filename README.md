[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/Nestaa404/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/Nestaa404/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast Cover Studio

An entry for the make.fun bounty [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01): a web app that turns a photo and a caption into GTA-style poster cover art.

## What you get

- **Four poster layouts** — Hero + duo, Sunset trio, Hero + strip, and Split top. Every layout holds three panels, and each panel keeps its own photo.
- **Your photos, kept on your machine** — load the two bundled samples, or drop in your own images. A button fills any empty panels with one sample, or mix several photos across the panels.
- **A crop per panel** — zoom and pan sliders for the panel you have selected, with a one-click reset.
- **Five colour tones** — Vice Sunset, Neon Nights, Palm Noir, Bubblegum, and Golden Hour wash over the whole poster, with a vignette that sinks the corners.
- **Caption presets and free words** — three one-tap presets (Sunset Heist, Boulevard Queen, Vice Nights) set the headline, sub-caption, and city tag together; every field stays editable after that.
- **One-click PNG export** — Square 1080 × 1080, Portrait 1080 × 1350, or Wide 1920 × 1080.

## Running it

No build step and no network — the app is plain static files under `app/`:

```sh
node serve.ts
# then open http://localhost:8080
```

Any static file server pointed at `app/` works the same way.

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` mirrors `app/` and `screenshots/` into the output directory and writes `dossier.json` there with the vendored make.fun library. It only ever creates the output directory when it is missing and then fills it — it never removes it. On the grader `/output` is a mounted volume, so deleting or recreating it would fail; the starter kit follows the same rule. Run it twice into two directories and the trees come out byte-identical.

## How the poster is painted

`app/src/cover.js` holds the painter. Cropping works on the *source* rectangle: for each panel it finds the largest centred source window with the panel's aspect ratio, shrinks that window by the zoom factor, slides it by the pan, and maps it onto the panel — so zooming in can never leave a gap at the edges. The tone wash is a diagonal gradient drawn in `soft-light`, the headline is shrunk by binary search until it fits the banner, and the city chip, caption band, and vignette are drawn last.

## Notes

- Original design and artwork: no Rockstar Games logo, wordmark, official artwork, character, or font. "Neon Coast" is a fictional city, and the lettering uses system fonts.
- The two sample photos under `app/samples/` were made for make.fun with an image model and are free to use.
- The screenshots in `screenshots/` were taken from this app with headless Chrome; `shots.json` records the scene (URL query plus window size) behind each one.
