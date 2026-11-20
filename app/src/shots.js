// Fixed scenes for screenshots, driven by the page URL.
//
//   ?shot=editor  — the editor, with a sample photo already loaded
//   ?shot=cover   — the finished cover alone, full-bleed
//
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the words
// on the cover. Plan and tone come from the page state, which main.js
// reads from the same query before staging the scene.
//
// Once the scene has painted, window.__shotReady is set: a screenshot
// tool can poll for it instead of guessing a delay. The double
// requestAnimationFrame gives the image load one frame to land and the
// paint one frame to settle.

export async function stageScene(kind, params, fill) {
  if (kind === 'cover') {
    document.body.classList.add('shot-cover');
  }
  const photo = params.get('photo') || 'pier';
  const words = params.get('caption') || 'Sunset Heist';
  await fill(`samples/${photo}.jpg`, words);
  const settle = () =>
    new Promise((done) => {
      requestAnimationFrame(() => requestAnimationFrame(done));
    });
  await settle();
  window.__shotReady = true;
}
