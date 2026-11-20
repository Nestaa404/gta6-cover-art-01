// Vice Cover Maker — wires the editor: photo slots, layout/grade/size picks,
// caption text, per-panel crop (drag to pan, slider to zoom) and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (shots.js).
import { drawCover, renderExport, panelRects, defaultPanel, SIZES, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const tagInput = document.getElementById('tag');

// One state object drives every redraw, so the preview and the export are
// always the same picture.
const state = {
  layout: 'triptych',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'A Vice City Story',
  tag: 'Vice City',
  photos: [null, null, null],
  panels: [defaultPanel(0), defaultPanel(1), defaultPanel(2)],
};
let selectedPanel = 0;

function panelCount() {
  return panelRects(state.layout, 100, 100).length;
}

function syncPanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push(defaultPanel(state.panels.length % 3));
  state.panels.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

function redraw() {
  syncPanels();
  // Preview at the export aspect, capped at 900 px on the long side.
  const size = SIZES[state.size];
  const scale = Math.min(1, 900 / Math.max(size.w, size.h));
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  drawCover(canvas, state);
  document.querySelectorAll('#panel-picker button').forEach((b, i) => {
    b.classList.toggle('on', i === selectedPanel);
    b.disabled = i >= panelCount();
  });
  const panel = state.panels[selectedPanel];
  document.getElementById('zoom').value = panel.zoom;
  document.getElementById('zoom-val').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('panel-photo').textContent = `Panel ${selectedPanel + 1} uses photo ${'ABC'[panel.photo]}`;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setPhotoSlot(slot, file) {
  const data = await readFile(file);
  state.photos[slot] = await loadImage(data);
  const thumb = document.querySelector(`#slot-${slot} .thumb`);
  thumb.style.backgroundImage = `url(${data})`;
  thumb.textContent = '';
  document.querySelector(`#slot-${slot} .slot-name`).textContent = file.name.slice(0, 18);
  redraw();
}

// Photo slots: pick a file per slot, or fill every panel with one slot.
document.querySelectorAll('.slot input[type=file]').forEach((input, slot) => {
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await setPhotoSlot(slot, file);
      status.textContent = `Photo ${'ABC'[slot]} loaded — drag the preview to position it.`;
    } catch {
      status.textContent = 'That file could not be read as an image.';
    }
  });
});
document.querySelectorAll('.slot .fill-all').forEach((btn, slot) => {
  btn.addEventListener('click', () => {
    if (!state.photos[slot]) {
      status.textContent = `Load photo ${'ABC'[slot]} first.`;
      return;
    }
    state.panels.forEach((p) => { p.photo = slot; });
    redraw();
    status.textContent = `All panels now use photo ${'ABC'[slot]}.`;
  });
});

// Option groups: one button row each for layout, grade and export size.
function optionGroup(id, values, current, onPick) {
  const group = document.getElementById(id);
  Object.entries(values).forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = typeof label === 'string' ? label : label.label;
    b.dataset.value = key;
    b.classList.toggle('on', key === current);
    b.addEventListener('click', () => {
      onPick(key);
      group.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      redraw();
    });
    group.appendChild(b);
  });
}
optionGroup('layout-picker', LAYOUTS, state.layout, (v) => { state.layout = v; });
optionGroup('grade-picker', GRADES, state.grade, (v) => { state.grade = v; });
optionGroup('size-picker', SIZES, state.size, (v) => { state.size = v; });

// Caption text.
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
tagInput.addEventListener('input', () => { state.tag = tagInput.value; redraw(); });

// Panel picker + zoom + reset crop.
const picker = document.getElementById('panel-picker');
for (let i = 0; i < 4; i++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = `Panel ${i + 1}`;
  b.addEventListener('click', () => { selectedPanel = i; redraw(); });
  picker.appendChild(b);
}
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  state.panels[selectedPanel] = defaultPanel(state.panels[selectedPanel].photo);
  redraw();
});

// Drag on the preview to pan the photo inside the panel under the cursor.
let drag = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const artH = 1 - 0.15;
  const rects = panelRects(state.layout, 1, artH);
  const hit = rects.findIndex((r) => fx >= r.x && fx < r.x + r.w && fy / artH >= r.y && fy / artH < r.y + r.h);
  return hit === -1 ? 0 : hit;
}
canvas.addEventListener('pointerdown', (e) => {
  selectedPanel = panelAt(e.clientX, e.clientY);
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[selectedPanel].ox, oy: state.panels[selectedPanel].oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[selectedPanel];
  panel.ox = Math.max(-0.45, Math.min(0.45, drag.ox + (e.clientX - drag.x) / rect.width));
  panel.oy = Math.max(-0.45, Math.min(0.45, drag.oy + (e.clientY - drag.y) / rect.height));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('pointerleave', () => { drag = null; });

// Export: render at full export resolution and download the PNG.
document.getElementById('export').addEventListener('click', () => {
  const out = renderExport(state);
  const size = SIZES[state.size];
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// Sample buttons under the preview: load a bundled sample into a slot.
document.querySelectorAll('.samples button').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const slot = Number(btn.dataset.slot);
    state.photos[slot] = await loadImage(`samples/${btn.dataset.sample}.jpg`);
    const thumb = document.querySelector(`#slot-${slot} .thumb`);
    thumb.style.backgroundImage = `url(samples/${btn.dataset.sample}.jpg)`;
    thumb.textContent = '';
    document.querySelector(`#slot-${slot} .slot-name`).textContent = `${btn.dataset.sample}.jpg`;
    redraw();
    status.textContent = `Sample photo loaded into slot ${'ABC'[slot]}.`;
  });
});

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (slot, sample) => {
    state.photos[slot] = await loadImage(sample);
    redraw();
  }, state).then(() => redraw());
} else {
  redraw();
}
