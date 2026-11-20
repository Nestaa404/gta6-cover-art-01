// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the finished cover alone, full-bleed.
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the words.
// Layout and grade come from the page state, which main.js sets from the
// same query before calling this. window.__shotReady is set once the
// scene has painted twice.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(`samples/${query.get('photo') ?? 'pier'}.jpg`, query.get('caption') ?? 'Sunset Heist');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
