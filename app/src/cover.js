// Neon Coast Cover Studio — poster painter.
//
// Everything that turns a studio state into pixels lives here: the panel
// plans, the colour tones, the export sizes, the caption presets, and the
// one function that paints a finished cover onto a canvas.
//
// The painter never touches the network or the DOM beyond the canvas it is
// handed. Photos arrive as already-loaded <img> elements; a panel without
// one gets a gradient placeholder in the active tone so the poster still
// looks finished. All drawing is plain Canvas 2D, so the whole app stays a
// static offline page.

// ---------------------------------------------------------------- plans --
//
// A plan is three cells. Each cell is [x, y, w, h] as fractions of the
// poster, so a plan works at any export size without rescaling tables.

export const PLANS = [
  {
    id: 'hero',
    name: 'Hero + duo',
    blurb: 'One tall hero panel, two stacked beside it',
    cells: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  {
    id: 'trio',
    name: 'Sunset trio',
    blurb: 'Three tall panels standing side by side',
    cells: [
      [0, 0, 0.34, 1],
      [0.34, 0, 0.33, 1],
      [0.67, 0, 0.33, 1],
    ],
  },
  {
    id: 'strip',
    name: 'Hero + strip',
    blurb: 'One wide panel over a two-photo strip',
    cells: [
      [0, 0, 1, 0.68],
      [0, 0.68, 0.5, 0.32],
      [0.5, 0.68, 0.5, 0.32],
    ],
  },
  {
    id: 'split',
    name: 'Split top',
    blurb: 'Two panels up top, one wide panel below',
    cells: [
      [0, 0, 0.5, 0.62],
      [0.5, 0, 0.5, 0.62],
      [0, 0.62, 1, 0.38],
    ],
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));

// ---------------------------------------------------------------- tones --
//
// A tone is a wash of three colours plus the ink the lettering uses.
// `wash` is how strongly the diagonal gradient tints the photos,
// `line` is the city-tag chip, `banner` the caption band at the bottom.

export const TONES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    sky: ['#ff9a3d', '#ff2e63', '#7b2ff7'],
    wash: 0.16,
    base: '#1b0f2e',
    banner: '#12081f',
    ink: '#ffd166',
    line: '#ff2e63',
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    sky: ['#00e5ff', '#ff2ec4', '#2b0a4d'],
    wash: 0.14,
    base: '#06121f',
    banner: '#04101c',
    ink: '#7df9ff',
    line: '#ff2ec4',
  },
  {
    id: 'noir',
    name: 'Palm Noir',
    sky: ['#3a3a3a', '#0d0d0d', '#000000'],
    wash: 0.1,
    base: '#000000',
    banner: '#0a0a0a',
    ink: '#f5f0e6',
    line: '#e8b64c',
  },
  {
    id: 'bubble',
    name: 'Bubblegum',
    sky: ['#ffb3d9', '#ff5e8a', '#7b2ff7'],
    wash: 0.15,
    base: '#2e0a2e',
    banner: '#2e0a2e',
    ink: '#ffe3f1',
    line: '#ffd166',
  },
  {
    id: 'gold',
    name: 'Golden Hour',
    sky: ['#ffb347', '#ff7847', '#5b2a86'],
    wash: 0.15,
    base: '#241207',
    banner: '#1d0e05',
    ink: '#ffe9a8',
    line: '#ff9a3d',
  },
];

export const TONE_BY_ID = Object.fromEntries(TONES.map((t) => [t.id, t]));

// --------------------------------------------------------- export sizes --

export const SIZES = [
  { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

// ------------------------------------------------------ caption presets --
//
// One tap fills headline, strapline and city tag together. The fields stay
// editable afterwards, so a preset is a starting point, not a lock.

export const PRESETS = [
  {
    id: 'heist',
    name: 'Sunset Heist',
    headline: 'Sunset Heist',
    strapline: 'Neon Coast • A story in three frames',
    city: 'NEON COAST',
  },
  {
    id: 'queen',
    name: 'Boulevard Queen',
    headline: 'Boulevard Queen',
    strapline: 'Neon Coast • She owns the night',
    city: 'NEON COAST',
  },
  {
    id: 'vice',
    name: 'Vice Nights',
    headline: 'Vice Nights',
    strapline: 'Neon Coast • Lights out, engines on',
    city: 'VICE CITY',
  },
];

// ------------------------------------------------------------- fresh state --

export function freshStudio() {
  return {
    plan: 'hero',
    tone: 'sunset',
    headline: 'Sunset Heist',
    strapline: 'Neon Coast • A story in three frames',
    city: 'NEON COAST',
    crops: [
      { k: 1, x: 0, y: 0 },
      { k: 1, x: 0, y: 0 },
      { k: 1, x: 0, y: 0 },
    ],
  };
}

export function freshCrop() {
  return { k: 1, x: 0, y: 0 };
}

// ------------------------------------------------------------ crop maths --
//
// Cropping works on the *source* rectangle, not the destination: given a
// photo and the cell it must fill, find the largest centred source rect
// with the cell's aspect ratio (a cover fit), then shrink it by the zoom
// factor and slide it by the pan fractions. drawImage then maps that
// source rect onto the cell. Zooming in never leaves a gap at the edges
// because the source rect only ever shrinks inside the photo.

function sourceWindow(img, cellW, cellH, crop) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const want = cellW / cellH;
  const have = iw / ih;
  let sw;
  let sh;
  if (have > want) {
    sh = ih;
    sw = ih * want;
  } else {
    sw = iw;
    sh = iw / want;
  }
  const k = Math.min(3, Math.max(0.5, crop.k || 1));
  sw /= k;
  sh /= k;
  const slackX = iw - sw;
  const slackY = ih - sh;
  const px = Math.min(0.5, Math.max(-0.5, crop.x || 0));
  const py = Math.min(0.5, Math.max(-0.5, crop.y || 0));
  // Pan moves the window toward the edge the user drags toward; the
  // window is clamped so it never slides past the photo's edge.
  const sx = Math.min(Math.max((iw - sw) / 2 + px * slackX, 0), slackX);
  const sy = Math.min(Math.max((ih - sh) / 2 + py * slackY, 0), slackY);
  return { sx, sy, sw, sh };
}

function paintPhoto(ctx, img, cell, crop) {
  const win = sourceWindow(img, cell.w, cell.h, crop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.w, cell.h);
  ctx.clip();
  ctx.drawImage(img, win.sx, win.sy, win.sw, win.sh, cell.x, cell.y, cell.w, cell.h);
  ctx.restore();
}

function paintPlaceholder(ctx, cell, tone, slot) {
  const grad = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.w, cell.y + cell.h);
  grad.addColorStop(0, tone.sky[0]);
  grad.addColorStop(0.5, tone.sky[1]);
  grad.addColorStop(1, tone.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `900 ${Math.round(cell.w * 0.12)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+ PHOTO ${slot + 1}`, cell.x + cell.w / 2, cell.y + cell.h / 2);
}

// Shrink the headline until it fits, halving the step each round instead
// of walking down one point at a time.
function shrinkToFit(ctx, text, limit, top, family) {
  let lo = 24;
  let hi = top;
  const probe = (px) => {
    ctx.font = `900 italic ${px}px ${family}`;
    return ctx.measureText(text).width;
  };
  if (probe(hi) <= limit) return hi;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (probe(mid) <= limit) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------------------------------------------------------------- painter --

export function paintPoster(canvas, studio, photos) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const tone = TONE_BY_ID[studio.tone] || TONE_BY_ID.sunset;
  const plan = PLAN_BY_ID[studio.plan] || PLAN_BY_ID.hero;
  const family = `'Arial Black', 'Archivo Black', Impact, sans-serif`;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = tone.base;
  ctx.fillRect(0, 0, W, H);

  // Cells, separated by thin gutters that eat half a gap on each side.
  const gap = Math.max(4, Math.round(W * 0.008));
  const cells = plan.cells.map(([fx, fy, fw, fh]) => {
    const left = fx > 0 ? gap / 2 : 0;
    const top = fy > 0 ? gap / 2 : 0;
    const right = fx + fw < 1 ? gap / 2 : 0;
    const bottom = fy + fh < 1 ? gap / 2 : 0;
    return {
      x: fx * W + left,
      y: fy * H + top,
      w: fw * W - left - right,
      h: fh * H - top - bottom,
    };
  });
  cells.forEach((cell, i) => {
    const img = photos[i];
    if (img && img.naturalWidth > 0) paintPhoto(ctx, img, cell, studio.crops[i]);
    else paintPlaceholder(ctx, cell, tone, i);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
    ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
  });

  // Tone wash over the photos, then a vignette that sinks the corners.
  const wash = ctx.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, tone.sky[0]);
  wash.addColorStop(1, tone.sky[2]);
  ctx.save();
  ctx.globalAlpha = tone.wash;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.32,
    W / 2, H / 2, Math.max(W, H) * 0.72,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // City chip, top left.
  const pad = Math.round(W * 0.02);
  const chipH = Math.round(W * 0.045);
  ctx.font = `800 ${Math.round(W * 0.022)}px Arial, sans-serif`;
  const chipW = ctx.measureText(studio.city || '').width + pad * 2;
  ctx.fillStyle = tone.line;
  ctx.fillRect(pad, pad, chipW, chipH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(studio.city || '', pad * 2, pad + chipH / 2 + 1);

  // Caption band across the bottom.
  const bandH = Math.round(H * 0.17);
  const bandY = H - bandH;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = tone.banner;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.restore();
  ctx.fillStyle = tone.line;
  ctx.fillRect(0, bandY, W, Math.max(4, Math.round(H * 0.008)));

  const headline = ((studio.headline || '').trim() || 'Untitled').toUpperCase();
  const size = shrinkToFit(ctx, headline, W * 0.9, Math.round(H * 0.085), family);
  ctx.font = `900 italic ${size}px ${family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Hard offset shadow, then the headline itself — the poster punch.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(headline, W * 0.045 + 4, bandY + bandH * 0.62 + 4);
  ctx.fillStyle = tone.ink;
  ctx.fillText(headline, W * 0.045, bandY + bandH * 0.62);

  const strap = (studio.strapline || '').trim();
  if (strap) {
    ctx.font = `700 ${Math.round(H * 0.02)}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(strap.toUpperCase(), W * 0.045, bandY + bandH * 0.88);
  }
}
