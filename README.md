# Vice Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Nestaa404/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Nestaa404/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Entry for make.fun bounty `gta6-cover-art-01` — build the best GTA 6-style
cover art maker:
https://make.fun/bounty/gta6-cover-art-01

`app/` is a static, offline web app: load up to three of your own photos,
pick a multi-panel layout (Triptych, Duo, Quad, Single), choose a Vice City
colour grade (Sunset, Neon Night, Vice Pink, Golden Hour), write a caption,
then drag to crop each panel and zoom it — and export a PNG in the common
post sizes 1080 × 1080, 1080 × 1350 or 1920 × 1080. Photos are read on your
own machine and never uploaded; everything the app loads is a file under
`app/`, and the two sample photos under `app/samples/` were made with an
image model for make.fun and are free to use.

Try it with `node serve.ts`, then open http://localhost:8080.

`main.ts` (Node 22, standard library only) hands the entry in: it copies
`app/` and `screenshots/` to `/output` and writes `/output/dossier.json`
with the vendored make.fun library.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by Brio and sub-agents for @anesta-s-kurniawansyah.
