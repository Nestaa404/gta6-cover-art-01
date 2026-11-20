// Neon Coast Cover Studio — page wiring.
//
// Owns the editor state (layout, grade, caption, per-panel crop), loads
// sample photos and the user's own files (read locally, never uploaded),
// repaints the preview canvas on every change, and exports the finished
// cover as a PNG in the post size the user picks. A `?shot=` query instead
// stages one fixed scene for screenshots (see shots.js).

import { drawCover, defaultState, LAYOUTS, GRADES, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
const photos = [null, null, null];
let selectedPanel = 0;
let exportIndex = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state, photos);
  document.querySelectorAll('[data-panel-tab]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.panelTab) === selectedPanel);
    btn.textContent = `Panel ${Number(btn.dataset.panelTab) + 1}${photos[Number(btn.dataset.panelTab)] ? ' ✓' : ''}`;
  });
  const panel = state.panels[selectedPanel];
  document.getElementById('zoom').value = panel.zoom;
  document.getElementById('panx').value = panel.ox;
  document.getElementById('pany').value = panel.oy;
  document.getElementById('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('panxVal').textContent = `${Math.round(panel.ox * 100)}`;
  document.getElementById('panyVal').textContent = `${Math.round(panel.oy * 100)}`;
}

function setStatus(text) {
  status.textContent = text;
}

async function useSample(name) {
  try {
    photos[selectedPanel] = await loadImage(`samples/${name}.jpg`);
    setStatus(`Panel ${selectedPanel + 1}: sample “${name}” loaded.`);
  } catch {
    setStatus(`Could not load sample “${name}”.`);
  }
  redraw();
}

function buildPicker(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, def]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.textContent = def.label;
    btn.title = def.hint || def.label;
    if (key === current) btn.classList.add('active');
    btn.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.pick').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    box.appendChild(btn);
  });
}

buildPicker('layoutPicker', LAYOUTS, state.layout, (key) => { state.layout = key; });
buildPicker('gradePicker', GRADES, state.grade, (key) => { state.grade = key; });

// Export size picker.
const sizeBox = document.getElementById('sizePicker');
EXPORT_SIZES.forEach((size, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `pick${i === 0 ? ' active' : ''}`;
  btn.textContent = size.label;
  btn.addEventListener('click', () => {
    exportIndex = i;
    sizeBox.querySelectorAll('.pick').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
  sizeBox.appendChild(btn);
});

// Panel tabs and per-panel crop sliders.
document.querySelectorAll('[data-panel-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedPanel = Number(btn.dataset.panelTab);
    redraw();
  });
});
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('panx').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  redraw();
});
document.getElementById('pany').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  redraw();
});

// Photo sources for the selected panel: two samples, or the user's file.
document.getElementById('samplePier').addEventListener('click', () => useSample('pier'));
document.getElementById('sampleBoulevard').addEventListener('click', () => useSample('boulevard'));
document.getElementById('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    photos[selectedPanel] = await loadImage(URL.createObjectURL(file));
    setStatus(`Panel ${selectedPanel + 1}: “${file.name}” loaded from your machine.`);
  } catch {
    setStatus(`Could not read “${file.name}”. Try another image file.`);
  }
  e.target.value = '';
  redraw();
});

// Fill every empty panel with one sample, or swap all panels to it.
document.getElementById('fillAll').addEventListener('click', async () => {
  const name = document.getElementById('fillSample').value;
  try {
    const img = await loadImage(`samples/${name}.jpg`);
    photos.forEach((p, i) => { if (!p) photos[i] = img; });
    setStatus(`Empty panels filled with “${name}”.`);
  } catch {
    setStatus(`Could not load sample “${name}”.`);
  }
  redraw();
});

// Caption fields.
document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('subcaption').addEventListener('input', (e) => {
  state.subcaption = e.target.value;
  redraw();
});
document.getElementById('tag').addEventListener('input', (e) => {
  state.tag = e.target.value;
  redraw();
});

// Export: render the same cover at the chosen post size, download the PNG.
document.getElementById('export').addEventListener('click', () => {
  const size = EXPORT_SIZES[exportIndex];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, photos);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved neon-coast-cover-${size.w}x${size.h}.png`);
  }, 'image/png');
});

// Reset the crop of the selected panel.
document.getElementById('resetCrop').addEventListener('click', () => {
  state.panels[selectedPanel] = { zoom: 1, ox: 0, oy: 0 };
  redraw();
  setStatus(`Panel ${selectedPanel + 1} crop reset.`);
});

// Screenshot scenes: layout/grade come from the same query, then the
// named sample is loaded into every panel and the caption is set, so a
// headless screenshot shows a finished cover.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  const wantLayout = query.get('layout');
  const wantGrade = query.get('grade');
  if (wantLayout && LAYOUTS[wantLayout]) {
    state.layout = wantLayout;
    document.querySelectorAll('#layoutPicker .pick').forEach((b, i) => {
      b.classList.toggle('active', Object.keys(LAYOUTS)[i] === wantLayout);
    });
  }
  if (wantGrade && GRADES[wantGrade]) {
    state.grade = wantGrade;
    document.querySelectorAll('#gradePicker .pick').forEach((b, i) => {
      b.classList.toggle('active', Object.keys(GRADES)[i] === wantGrade);
    });
  }
  runShot(shot, query, async (sample, text) => {
    const img = await loadImage(sample);
    photos[0] = img;
    photos[1] = img;
    photos[2] = img;
    state.caption = text;
    document.getElementById('caption').value = text;
    redraw();
  });
} else {
  // First paint: fill the panels with the two samples so the editor opens
  // on a finished-looking cover instead of empty boxes.
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')])
    .then(([pier, boulevard]) => {
      photos[0] = pier;
      photos[1] = boulevard;
      photos[2] = pier;
      redraw();
    })
    .catch(() => redraw());
  redraw();
}
