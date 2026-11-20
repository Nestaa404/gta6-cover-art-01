// Neon Coast Cover Studio — cover renderer.
//
// Draws a multi-panel, GTA-poster-style cover onto any canvas: each panel
// holds one photo (cover-fit, with its own zoom and pan), a colour grade is
// washed over the whole poster, and a bold caption banner anchors the
// bottom. Everything is drawn with the plain 2D canvas API so the app stays
// a static offline page: no network, no library, no font file.

export const LAYOUTS = {
  hero: {
    label: 'Hero + duo',
    hint: 'One big panel, two stacked beside it',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  trio: {
    label: 'Sunset trio',
    hint: 'Three tall panels side by side',
    panels: [
      { x: 0, y: 0, w: 0.34, h: 1 },
      { x: 0.34, y: 0, w: 0.33, h: 1 },
      { x: 0.67, y: 0, w: 0.33, h: 1 },
    ],
  },
  strip: {
    label: 'Hero + strip',
    hint: 'One wide panel over a two-photo strip',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.68 },
      { x: 0, y: 0.68, w: 0.5, h: 0.32 },
      { x: 0.5, y: 0.68, w: 0.5, h: 0.32 },
    ],
  },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#ff9a3d', '#ff2e63', '#7b2ff7'],
    washAlpha: 0.16,
    deep: '#1b0f2e',
    captionBg: '#12081f',
    captionInk: '#ffd166',
    accent: '#ff2e63',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#00e5ff', '#ff2ec4', '#2b0a4d'],
    washAlpha: 0.14,
    deep: '#06121f',
    captionBg: '#04101c',
    captionInk: '#7df9ff',
    accent: '#ff2ec4',
  },
  noir: {
    label: 'Palm Noir',
    sky: ['#3a3a3a', '#0d0d0d', '#000000'],
    washAlpha: 0.1,
    deep: '#000000',
    captionBg: '#0a0a0a',
    captionInk: '#f5f0e6',
    accent: '#e8b64c',
  },
  bubble: {
    label: 'Bubblegum',
    sky: ['#ffb3d9', '#ff5e8a', '#7b2ff7'],
    washAlpha: 0.15,
    deep: '#2e0a2e',
    captionBg: '#2e0a2e',
    captionInk: '#ffe3f1',
    accent: '#ffd166',
  },
};

export const EXPORT_SIZES = [
  { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    caption: 'Sunset Heist',
    subcaption: 'NEON COAST • A STORY IN THREE FRAMES',
    tag: 'NEON COAST',
    panels: [
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

// Draw one photo into a rectangle, cover-fit, then zoomed about its centre
// and panned by (ox, oy) fractions of the rectangle size.
function drawPanelPhoto(ctx, img, rect, panel) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const zoom = Math.max(0.5, Math.min(3, panel.zoom || 1));
  const dw = img.naturalWidth * scale * zoom;
  const dh = img.naturalHeight * scale * zoom;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPanelFallback(ctx, rect, grade, index) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, grade.sky[0]);
  grad.addColorStop(0.55, grade.sky[1]);
  grad.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `900 ${Math.round(rect.w * 0.13)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+ PHOTO ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function fitFont(ctx, text, maxWidth, startPx, family) {
  let px = startPx;
  ctx.font = `900 italic ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = `900 italic ${px}px ${family}`;
  }
  return px;
}

export function drawCover(canvas, state, photos) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const family = `'Arial Black', 'Archivo Black', Impact, sans-serif`;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, W, H);

  // Panels, separated by thin gutters.
  const gap = Math.max(4, Math.round(W * 0.008));
  layout.panels.forEach((frac, i) => {
    const rect = {
      x: frac.x * W + (frac.x > 0 ? gap / 2 : 0),
      y: frac.y * H + (frac.y > 0 ? gap / 2 : 0),
      w: frac.w * W - (frac.x > 0 ? gap / 2 : 0) - (frac.x + frac.w < 1 ? gap / 2 : 0),
      h: frac.h * H - (frac.y > 0 ? gap / 2 : 0) - (frac.y + frac.h < 1 ? gap / 2 : 0),
    };
    const img = photos[i];
    if (img && img.naturalWidth > 0) drawPanelPhoto(ctx, img, rect, state.panels[i]);
    else drawPanelFallback(ctx, rect, grade, i);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Colour-grade wash over everything, then a vignette so the edges sink.
  const wash = ctx.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, grade.sky[0]);
  wash.addColorStop(1, grade.sky[2]);
  ctx.globalAlpha = grade.washAlpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Top-left city tag.
  const tagPad = Math.round(W * 0.02);
  ctx.font = `800 ${Math.round(W * 0.022)}px Arial, sans-serif`;
  const tagW = ctx.measureText(state.tag || '').width + tagPad * 2;
  const tagH = Math.round(W * 0.045);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(tagPad, tagPad, tagW, tagH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.tag || '', tagPad * 2, tagPad + tagH / 2 + 1);

  // Bottom caption banner.
  const bannerH = Math.round(H * 0.17);
  const bannerY = H - bannerH;
  ctx.fillStyle = grade.captionBg;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, bannerY, W, bannerH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, bannerY, W, Math.max(4, Math.round(H * 0.008)));

  const caption = (state.caption || '').trim() || 'Untitled';
  const capPx = fitFont(ctx, caption.toUpperCase(), W * 0.9, Math.round(H * 0.085), family);
  ctx.font = `900 italic ${capPx}px ${family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Hard offset shadow for the poster-lettering punch.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(caption.toUpperCase(), W * 0.045 + 4, bannerY + bannerH * 0.62 + 4);
  ctx.fillStyle = grade.captionInk;
  ctx.fillText(caption.toUpperCase(), W * 0.045, bannerY + bannerH * 0.62);

  const sub = (state.subcaption || '').trim();
  if (sub) {
    ctx.font = `700 ${Math.round(H * 0.02)}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(sub.toUpperCase(), W * 0.045, bannerY + bannerH * 0.88);
  }
}
