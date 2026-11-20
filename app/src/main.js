// Neon Coast Cover Studio — page wiring.
//
// Owns the editor: the studio state, the three photos, the selected cell,
// and every control on the page. It repaints the preview canvas after each
// change and exports the finished poster as a PNG. A `?shot=` query instead
// stages one fixed scene for screenshots (see shots.js).
//
// Photos are read locally and never leave the machine: samples come from
// app/samples/, uploads through an object URL that is revoked after use.

import { paintPoster, freshStudio, freshCrop, PLANS, TONES, SIZES, PRESETS } from './cover.js';
import { stageScene } from './shots.js';

const $ = (id) => document.getElementById(id);

const studio = {
  state: freshStudio(),
  photos: [null, null, null],
  cell: 0,
  size: 0,

  canvas: $('poster'),
  note: $('note'),

  say(text) {
    this.note.textContent = text;
  },

  paint() {
    paintPoster(this.canvas, this.state, this.photos);
    this.syncTabs();
    this.syncCrop();
  },

  syncTabs() {
    document.querySelectorAll('.cell-tab').forEach((btn) => {
      const i = Number(btn.dataset.cell);
      btn.classList.toggle('on', i === this.cell);
      btn.textContent = `Panel ${i + 1}${this.photos[i] ? ' ✓' : ''}`;
    });
  },

  syncCrop() {
    const crop = this.state.crops[this.cell];
    $('zoomRange').value = crop.k;
    $('panXRange').value = crop.x;
    $('panYRange').value = crop.y;
    $('zoomOut').textContent = `${Math.round(crop.k * 100)}%`;
    $('panXOut').textContent = `${Math.round(crop.x * 100)}`;
    $('panYOut').textContent = `${Math.round(crop.y * 100)}`;
  },

  async loadPhoto(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not load ${url}`));
      img.src = url;
    });
  },

  async putSample(name) {
    try {
      this.photos[this.cell] = await this.loadPhoto(`samples/${name}.jpg`);
      this.say(`Panel ${this.cell + 1}: sample “${name}” loaded.`);
    } catch {
      this.say(`Could not load sample “${name}”.`);
    }
    this.paint();
  },

  async fillEmpty(name) {
    try {
      const img = await this.loadPhoto(`samples/${name}.jpg`);
      this.photos.forEach((p, i) => {
        if (!p) this.photos[i] = img;
      });
      this.say(`Empty panels filled with “${name}”.`);
    } catch {
      this.say(`Could not load sample “${name}”.`);
    }
    this.paint();
  },

  applyPreset(preset) {
    this.state.headline = preset.headline;
    this.state.strapline = preset.strapline;
    this.state.city = preset.city;
    $('headlineInput').value = preset.headline;
    $('strapInput').value = preset.strapline;
    $('cityInput').value = preset.city;
    this.say(`Preset “${preset.name}” applied — edit the words if you like.`);
    this.paint();
  },

  exportPng() {
    const size = SIZES[this.size];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    paintPoster(off, this.state, this.photos);
    off.toBlob((blob) => {
      if (!blob) {
        this.say('Export failed — try again.');
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `neon-coast-cover-${size.w}x${size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      this.say(`Saved neon-coast-cover-${size.w}x${size.h}.png`);
    }, 'image/png');
  },
};

// One helper builds every row of toggle buttons: plans, tones, sizes and
// presets all work the same way — a button per entry, one active at a time.
function buildRow(boxId, entries, activeId, onPick) {
  const box = $(boxId);
  box.innerHTML = '';
  entries.forEach((entry) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.textContent = entry.name;
    btn.title = entry.blurb || entry.name;
    if (entry.id === activeId) btn.classList.add('on');
    btn.addEventListener('click', () => {
      onPick(entry);
      box.querySelectorAll('.pick').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      studio.paint();
    });
    box.appendChild(btn);
  });
}

function markRow(boxId, entries, activeId) {
  document.querySelectorAll(`#${boxId} .pick`).forEach((btn, i) => {
    btn.classList.toggle('on', entries[i].id === activeId);
  });
}

buildRow('planRow', PLANS, studio.state.plan, (plan) => {
  studio.state.plan = plan.id;
});
buildRow('toneRow', TONES, studio.state.tone, (tone) => {
  studio.state.tone = tone.id;
});
buildRow('presetRow', PRESETS, null, (preset) => {
  studio.applyPreset(preset);
  // Presets are not a sticky choice: clear the highlight right away.
  document.querySelectorAll('#presetRow .pick').forEach((b) => b.classList.remove('on'));
});

// Export sizes carry no id on the entry in the same way, so they get their
// own small loop over the same button shape.
SIZES.forEach((size, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `pick${i === 0 ? ' on' : ''}`;
  btn.textContent = size.name;
  btn.addEventListener('click', () => {
    studio.size = i;
    document.querySelectorAll('#sizeRow .pick').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
  });
  $('sizeRow').appendChild(btn);
});

// Cell tabs and the three crop sliders for the selected cell.
document.querySelectorAll('.cell-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    studio.cell = Number(btn.dataset.cell);
    studio.paint();
  });
});
$('zoomRange').addEventListener('input', (e) => {
  studio.state.crops[studio.cell].k = Number(e.target.value);
  studio.paint();
});
$('panXRange').addEventListener('input', (e) => {
  studio.state.crops[studio.cell].x = Number(e.target.value);
  studio.paint();
});
$('panYRange').addEventListener('input', (e) => {
  studio.state.crops[studio.cell].y = Number(e.target.value);
  studio.paint();
});
$('cropReset').addEventListener('click', () => {
  studio.state.crops[studio.cell] = freshCrop();
  studio.paint();
  studio.say(`Panel ${studio.cell + 1} crop reset.`);
});

// Photo sources for the selected cell: two samples, or the user's file.
$('usePier').addEventListener('click', () => studio.putSample('pier'));
$('useBoulevard').addEventListener('click', () => studio.putSample('boulevard'));
$('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  try {
    studio.photos[studio.cell] = await studio.loadPhoto(url);
    studio.say(`Panel ${studio.cell + 1}: “${file.name}” loaded from your machine.`);
  } catch {
    studio.say(`Could not read “${file.name}”. Try another image file.`);
  }
  URL.revokeObjectURL(url);
  e.target.value = '';
  studio.paint();
});
$('fillEmpty').addEventListener('click', () => studio.fillEmpty($('fillChoice').value));

// Words: headline, strapline and city tag, kept in sync with the state.
$('headlineInput').addEventListener('input', (e) => {
  studio.state.headline = e.target.value;
  studio.paint();
});
$('strapInput').addEventListener('input', (e) => {
  studio.state.strapline = e.target.value;
  studio.paint();
});
$('cityInput').addEventListener('input', (e) => {
  studio.state.city = e.target.value;
  studio.paint();
});

$('exportBtn').addEventListener('click', () => studio.exportPng());

// Startup: a ?shot= query stages one fixed scene for screenshots, with
// the plan and tone read from the same query. Otherwise the editor opens
// on a finished-looking poster by pre-loading the two samples.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const wantPlan = params.get('layout');
  const wantTone = params.get('grade');
  if (wantPlan && PLANS.some((p) => p.id === wantPlan)) {
    studio.state.plan = wantPlan;
    markRow('planRow', PLANS, wantPlan);
  }
  if (wantTone && TONES.some((t) => t.id === wantTone)) {
    studio.state.tone = wantTone;
    markRow('toneRow', TONES, wantTone);
  }
  stageScene(shot, params, async (sample, words) => {
    const img = await studio.loadPhoto(sample);
    studio.photos = [img, img, img];
    studio.state.headline = words;
    $('headlineInput').value = words;
    studio.paint();
  });
} else {
  Promise.all([studio.loadPhoto('samples/pier.jpg'), studio.loadPhoto('samples/boulevard.jpg')])
    .then(([pier, boulevard]) => {
      studio.photos = [pier, boulevard, pier];
      studio.paint();
    })
    .catch(() => studio.paint());
  studio.paint();
}
