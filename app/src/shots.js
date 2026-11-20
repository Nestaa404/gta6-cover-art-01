// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone, at the export size the
// `size` query names. Query knobs: photo slots via `photos` (comma list of
// sample names), `layout`, `grade`, `title`, `subtitle`, `tag`, `size`.
// window.__shotReady is set once the scene is painted. The double
// requestAnimationFrame gives the canvas one full paint before the flag
// flips, so a screenshot never catches a half-drawn cover.
import { SIZES } from './cover.js';

export async function runShot(shot, query, load, state) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('title')) {
    state.title = query.get('title');
    document.getElementById('title').value = state.title;
  }
  if (query.get('subtitle')) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }
  if (query.get('tag')) {
    state.tag = query.get('tag');
    document.getElementById('tag').value = state.tag;
  }
  const names = (query.get('photos') || query.get('photo') || 'pier').split(',');
  for (let slot = 0; slot < names.length && slot < 3; slot++) {
    await load(slot, `samples/${names[slot].trim()}.jpg`);
    // Keep the editor's slot thumbnails in sync with the loaded sample.
    const thumb = document.querySelector(`#slot-${slot} .thumb`);
    if (thumb) {
      thumb.style.backgroundImage = `url(samples/${names[slot].trim()}.jpg)`;
      thumb.textContent = '';
    }
    const slotName = document.querySelector(`#slot-${slot} .slot-name`);
    if (slotName) slotName.textContent = `${names[slot].trim()}.jpg`;
  }
  // A sample in every panel: slot A in the hero, then B and C across the rest.
  state.panels.forEach((panel, i) => { panel.photo = i % Math.max(1, names.length); });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
