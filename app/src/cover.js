// Vice Cover Maker — the drawing engine. Renders a multi-panel GTA-style
// poster cover onto a canvas: photo panels with a sunset/neon colour grade,
// a bold gradient caption band, and a location tag pill. Everything is drawn
// with the canvas 2D API, no external assets.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

export const LAYOUTS = {
  triptych: 'Triptych — hero + 2 panels',
  duo: 'Duo — hero + 1 panel',
  quad: 'Quad — 2 × 2 grid',
  single: 'Single — one full photo',
};

export const GRADES = {
  sunset: 'Sunset',
  neon: 'Neon Night',
  vice: 'Vice Pink',
  gold: 'Golden Hour',
};

// Per-grade photo filter (canvas filter string) and the tint gradients laid
// over each panel afterwards. All grades push saturation and warm/cool
// contrast the way a Vice City sunset poster does. Rebuilt in the recorded
// session: same four grades, same wash order, kept identical on purpose so
// the preview and the export never disagree.
const GRADE_STYLE = {
  sunset: {
    filter: 'saturate(1.4) contrast(1.08) sepia(0.22) brightness(1.03)',
    washes: [
      ['soft-light', ['rgba(255,120,40,0.55)', 'rgba(255,40,120,0.45)']],
      ['overlay', ['rgba(255,90,40,0.10)', 'rgba(180,30,120,0.30)']],
    ],
    band: ['#2a0a3d', '#7a1046'],
    sun: ['rgba(255,214,110,0.95)', 'rgba(255,80,140,0.55)'],
    accent: '#ffd76a',
  },
  neon: {
    filter: 'saturate(1.7) contrast(1.18) brightness(0.95) hue-rotate(-12deg)',
    washes: [
      ['soft-light', ['rgba(0,229,255,0.5)', 'rgba(255,0,170,0.5)']],
      ['overlay', ['rgba(0,180,255,0.12)', 'rgba(255,0,160,0.28)']],
    ],
    band: ['#0a1030', '#3d0a5e'],
    sun: ['rgba(120,240,255,0.9)', 'rgba(255,0,180,0.5)'],
    accent: '#7df9ff',
  },
  vice: {
    filter: 'saturate(1.55) contrast(1.06) sepia(0.28) hue-rotate(-28deg)',
    washes: [
      ['soft-light', ['rgba(255,110,180,0.55)', 'rgba(150,40,200,0.45)']],
      ['overlay', ['rgba(255,60,160,0.12)', 'rgba(120,20,140,0.30)']],
    ],
    band: ['#3d0a2e', '#8a1050'],
    sun: ['rgba(255,170,220,0.9)', 'rgba(255,60,170,0.5)'],
    accent: '#ff9ed2',
  },
  gold: {
    filter: 'saturate(1.3) contrast(1.06) sepia(0.4) brightness(1.06)',
    washes: [
      ['soft-light', ['rgba(255,190,80,0.55)', 'rgba(200,90,20,0.45)']],
      ['overlay', ['rgba(255,180,60,0.10)', 'rgba(160,60,10,0.28)']],
    ],
    band: ['#2e1a05', '#6e2a10'],
    sun: ['rgba(255,230,150,0.95)', 'rgba(255,140,40,0.55)'],
    accent: '#ffe9a8',
  },
};

const GUTTER = 0.008; // panel gap, as a fraction of the cover's short side

/** Panel rectangles (fractions of w/h) for a layout at a given aspect. */
export function panelRects(layout, w, h) {
  const wide = w >= h;
  if (layout === 'single') return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (layout === 'duo') {
    return wide
      ? [{ x: 0, y: 0, w: 0.62, h: 1 }, { x: 0.62, y: 0, w: 0.38, h: 1 }]
      : [{ x: 0, y: 0, w: 1, h: 0.62 }, { x: 0, y: 0.62, w: 1, h: 0.38 }];
  }
  if (layout === 'quad') {
    return [
      { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ];
  }
  // triptych
  return wide
    ? [
      { x: 0, y: 0, w: 0.6, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 0.5 }, { x: 0.6, y: 0.5, w: 0.4, h: 0.5 },
    ]
    : [
      { x: 0, y: 0, w: 1, h: 0.58 },
      { x: 0, y: 0.58, w: 0.5, h: 0.42 }, { x: 0.5, y: 0.58, w: 0.5, h: 0.42 },
    ];
}

/** Default per-panel crop state: which photo slot, zoom and pan offsets. */
export function defaultPanel(slot) {
  return { photo: slot, zoom: 1, ox: 0, oy: 0 };
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `900 ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(10, size - 2);
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

function drawPhotoPanel(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
    // No user pan yet and the photo is cropped vertically: favour its top,
    // where faces usually are, instead of the dead centre.
    const topBias = panel.oy ? 0 : Math.max(0, dh - h) * 0.18;
    const dy = y + (h - dh) / 2 + (panel.oy || 0) * h + topBias;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    for (const [mode, stops] of grade.washes) {
      const wash = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
      wash.addColorStop(0, stops[0]);
      wash.addColorStop(1, stops[1]);
      ctx.globalCompositeOperation = mode;
      ctx.fillStyle = wash;
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  } else {
    const empty = ctx.createLinearGradient(x, y, x + w, y + h);
    empty.addColorStop(0, '#241a3d');
    empty.addColorStop(1, '#120b22');
    ctx.fillStyle = empty;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([w * 0.02, w * 0.02]);
    ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.strokeRect(x + w * 0.04, y + h * 0.04, w * 0.92, h * 0.92);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fs = fitFont(ctx, 'ADD A PHOTO', w * 0.7, h * 0.09, 'Arial, sans-serif');
    ctx.font = `800 ${fs}px Arial, sans-serif`;
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  // Vignette: darken the panel edges so the panels read as poster art.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10,4,24,0)');
  vig.addColorStop(1, 'rgba(10,4,24,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawSun(ctx, rect, grade) {
  const r = Math.min(rect.w, rect.h) * 0.17;
  const cx = rect.x + rect.w * 0.78;
  const cy = rect.y + rect.h * 0.3;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.7;
  const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  sun.addColorStop(0, grade.sun[0]);
  sun.addColorStop(0.55, grade.sun[1]);
  sun.addColorStop(1, 'rgba(255,80,140,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCaptionBand(ctx, w, h, bandY, bandH, state, grade) {
  const band = ctx.createLinearGradient(0, bandY, w, bandY + bandH);
  band.addColorStop(0, grade.band[0]);
  band.addColorStop(1, grade.band[1]);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, bandY, w, Math.max(3, bandH * 0.045));

  const family = `'Arial Black', 'Liberation Sans', 'DejaVu Sans', sans-serif`;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = w / 2;
  const titleY = bandY + bandH * (subtitle ? 0.62 : 0.52);
  if (subtitle) {
    const spaced = subtitle.split('').join(' ');
    const subSize = fitFont(ctx, spaced, w * 0.9, bandH * 0.16, family);
    ctx.font = `800 ${subSize}px ${family}`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(spaced, cx, bandY + bandH * 0.26);
  }
  if (title) {
    // Condensed feel: squeeze horizontally, then a dark outline, a warm
    // gradient fill and a soft neon drop shadow.
    const size = fitFont(ctx, title, w * 0.92, bandH * 0.52, family);
    const grad = ctx.createLinearGradient(0, titleY - size * 0.55, 0, titleY + size * 0.55);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffe9a8');
    grad.addColorStop(1, '#ff5e8a');
    ctx.save();
    ctx.translate(cx, titleY);
    ctx.scale(0.88, 1);
    ctx.font = `900 ${size}px ${family}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a2e';
    ctx.lineWidth = size * 0.09;
    ctx.shadowColor = 'rgba(255,60,160,0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.04;
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
}

function drawTagPill(ctx, w, h, state, grade) {
  const tag = (state.tag || '').trim().toUpperCase();
  if (!tag) return;
  const padX = w * 0.02;
  const fs = Math.max(14, Math.min(w, h) * 0.026);
  const family = `'Arial Black', 'Liberation Sans', 'DejaVu Sans', sans-serif`;
  ctx.font = `900 ${fs}px ${family}`;
  const tw = ctx.measureText(tag).width;
  const x = w * 0.025;
  const y = h * 0.025;
  const pw = tw + padX * 2;
  const ph = fs * 1.9;
  ctx.save();
  ctx.fillStyle = 'rgba(16,6,32,0.85)';
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, fs * 0.08);
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, ph / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, x + pw / 2, y + ph / 2 + fs * 0.04);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (its own pixel size) from `state`:
 * { layout, grade, size, title, subtitle, tag, photos, panels }.
 * photos is an array of images (or null); panels aligns with the layout's
 * panel rects and holds { photo, zoom, ox, oy } per panel.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADE_STYLE[state.grade] || GRADE_STYLE.sunset;
  const short = Math.min(w, h);
  const gutter = Math.max(4, short * GUTTER);

  ctx.fillStyle = '#0d0819';
  ctx.fillRect(0, 0, w, h);

  const bandH = h * 0.15;
  const artH = h - bandH;
  const rects = panelRects(state.layout || 'triptych', w, artH);
  const panels = state.panels || [];
  rects.forEach((r, i) => {
    const px = r.x * w + gutter / 2;
    const py = r.y * artH + gutter / 2;
    const pw = r.w * w - gutter;
    const ph = r.h * artH - gutter;
    const panel = panels[i] || defaultPanel(0);
    const img = state.photos ? state.photos[panel.photo] : null;
    drawPhotoPanel(ctx, img, { x: px, y: py, w: pw, h: ph }, panel, grade);
    if (i === 0 && img) drawSun(ctx, { x: px, y: py, w: pw, h: ph }, grade);
  });

  drawCaptionBand(ctx, w, h, artH, bandH, state, grade);
  drawTagPill(ctx, w, h, state, grade);

  // Outer frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(2, short * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Renders the cover at export resolution into a fresh canvas. */
export function renderExport(state) {
  const size = SIZES[state.size] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return canvas;
}
