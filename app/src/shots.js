// Fixed scenes for screenshots, driven by the page URL.
//
//   ?shot=editor  — the editor, with a sample photo already loaded
//   ?shot=cover   — the finished cover alone, full-bleed
//
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the words
// on the cover. Layout and grade come from the page state, which main.js
// reads from the same query before calling this. window.__shotReady is
// set once the scene has painted twice, so a screenshot tool knows the
// frame is settled and can capture it.
export async function runShot(shot, query, load) {
  // The cover scene hides the editor chrome and shows only the poster.
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  await load(`samples/${photo}.jpg`, caption);
  // Two animation frames: one for the load to land, one for the paint.
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
