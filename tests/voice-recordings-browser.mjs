import assert from 'node:assert/strict';
const { chromium } = await import(process.env.JSC_PLAYWRIGHT || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.JSC_CHROMIUM, headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = []; page.on('pageerror', e => errors.push(String(e)));
const base = process.env.JSC_URL || 'http://127.0.0.1:5175';
try {
  await page.goto(base + '/?debug=voice');
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await page.getByRole('button', { name: 'Say hello to Rocky', exact: true }).waitFor();
  // Real first gesture, with no autoplay-policy override or saved preferences.
  for (const id of ['Rocky', 'Max', 'Elsa', 'Charles', 'Lea']) {
    await page.getByRole('button', { name: 'Say hello to ' + id, exact: true }).click();
    await page.waitForFunction(async () => { const { narration } = await import('/src/narration.js'); return narration.state.owner === 'title-greeting' && narration.state.status === 'speaking'; });
    console.log('Homepage greeting speaks:', id);
  }
  await page.getByRole('button', { name: 'Start mission', exact: false }).click();
  await page.getByRole('button', { name: 'Start Beginner →', exact: true }).click();
  await page.waitForFunction(async () => { const { narration } = await import('/src/narration.js'); return narration.state.owner === 'first-flight' && narration.state.status === 'speaking'; });
  console.log('First-flight tour speaks its prepared recording');
  await page.screenshot({ path: '/private/tmp/jsc-prepared-tour.png' });
  // Missing recordings must not advertise speech; prepared tour lines must play.
  const result = await page.evaluate(async () => {
    const { voiceControls } = await import('/src/voice-ui.js');
    const { narration } = await import('/src/narration.js');
    const { FIRST_FLIGHT_LINES } = await import('/src/data/first-flight-lines.js');
    const root = document.createElement('div'); document.body.append(root);
    const missing = voiceControls({ text: 'This is deliberately not a prepared recording 984715.', owner: 'missing-check', automatic: true });
    root.append(missing);
    const prepared = await narration.prepare(FIRST_FLIGHT_LINES[0]);
    await new Promise(r => setTimeout(r, 100));
    const hidden = missing.hidden && missing.querySelector('.voice-actions').hidden;
    root.remove();
    return { prepared, missingControlsHidden: hidden, unavailableText: document.body.textContent.includes('Voice unavailable. You can keep reading.') };
  });
  assert.equal(result.prepared, true); assert.equal(result.missingControlsHidden, true); assert.equal(result.unavailableText, false);
  console.log(result);
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
