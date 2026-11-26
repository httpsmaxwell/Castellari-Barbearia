// Run with Playwright installed: node --test tests/booking-flow.cjs
// Firebase is replaced only in these isolated browser contexts. No production writes.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

let browser, server, origin;
before(async () => {
  const allowed = new Set(['index.html', 'planos.html', 'agendar.html', 'castellari.css', 'castellari.js', 'castellari-data.js']);
  server = createServer(async (req, res) => {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1);
    if (!allowed.has(file) && !/^img\/equipe\/[a-z0-9-]+\.jpg$/.test(file)) { res.writeHead(404).end(); return; }
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.jpg') ? 'image/jpeg' : 'text/html';
    try {
      res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
      res.end(await readFile(path.join(__dirname, '..', file)));
    } catch (_) { res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

const firebaseFixture = `
  const fixture = window.bookingTest;
  const user = { uid: 'test-user', displayName: 'Cliente Teste', email: 'cliente@example.test' };
  let observer;
  const signIn = async () => {
    if (fixture.failLogin) throw new Error('E-mail ou senha incorretos. Tente novamente.');
    await observer(user);
    return user;
  };
  window.CastellariFirebase = {
    onAuthChange(callback) { observer = callback; callback(fixture.signedIn ? user : null); },
    getUserProfile: async () => {
      if (fixture.failProfile) throw new Error('Profile unavailable');
      return { name: 'Cliente Teste', phone: '' };
    },
    loadCatalogFromFirestore: async () => ({}),
    getBookedTimesForDay: async () => [],
    signInWithEmail: signIn,
    signInWithGoogle: signIn,
    registerWithEmail: async ({ email, password }) => {
      fixture.registered = { email, password };
      return signIn();
    },
    resetPassword: async email => {
      if (fixture.failRecovery) throw new Error('Não foi possível enviar o link. Tente novamente.');
      fixture.recoveryEmails = [...(fixture.recoveryEmails || []), email];
    },
    formatFirebaseError: error => error.message,
    createBooking: async (payload) => {
      fixture.bookings.push(payload);
      await new Promise(resolve => { fixture.finishBooking = resolve; });
      if (fixture.failBooking) throw new Error('Horário ocupado. Escolha outro horário.');
      return { code: 'TEST-ONLY', barberId: payload.barberId };
    },
  };
  fixture.signOut = () => observer(null);
  window.dispatchEvent(new CustomEvent('castellari:firebase-ready', { detail: window.CastellariFirebase }));
`;

async function openBooking(options = {}) {
  const context = await browser.newContext({ viewport: options.desktop ? { width: 1280, height: 900 } : { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(opts => {
    window.bookingTest = { ...opts, bookings: [] };
    if (opts.light) localStorage.setItem('castellari-theme-preference', 'light');
  }, options);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/castellari-firebase.js') return route.fulfill({ contentType: 'text/javascript', body: firebaseFixture });
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(origin + '/agendar.html');
  await page.locator('[data-quick-choice="corte-tradicional"]').click();
  await page.locator(options.desktop ? '#btn-step-1-next' : '#booking-continue').click();
  await page.locator('[data-barber-choice="felipe"]').click();
  await page.locator(options.desktop ? '#btn-step-2-next' : '#booking-continue').click();
  await page.locator('[data-day]').first().click();
  await page.locator('[data-time]:not([disabled])').first().click();
  await page.locator(options.desktop ? '#btn-step-3-next' : '#booking-continue').click();
  await page.locator('[data-booking-step="4"]').waitFor({ state: 'visible' });
  const next = page.locator(options.desktop ? '#booking-review-next' : '#booking-continue');
  return { context, page, errors, next };
}

test('mobile: summary, email login, contact, explicit confirmation and duplicate protection', async () => {
  const { context, page, next, errors } = await openBooking({ failLogin: true });
  try {
    const recap = await page.locator('.booking-recap-box').innerText();
    assert.equal(await page.locator('#client-name').isVisible(), false);
    assert.equal(await next.innerText(), 'Próximo →');
    assert.equal(await next.evaluate(el => getComputedStyle(el.parentElement).position), 'static');
    const gap = await page.evaluate(() => document.querySelector('#booking-sticky-bar').getBoundingClientRect().top - document.querySelector('#booking-workflow').getBoundingClientRect().bottom);
    assert.ok(gap >= 0 && gap <= 24, 'Actions should sit directly below the workflow');
    await next.click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#booking-login-panel').isVisible(), true);
    assert.equal(await page.locator('#client-name').isVisible(), false);
    assert.equal(await page.locator('#booking-google-login svg').count(), 1);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    assert.equal(await next.evaluate(el => el === document.activeElement), true);
    await next.click();
    await page.locator('#booking-email').fill('cliente@example.test');
    await page.locator('#booking-password').fill('test-only-password');
    await page.getByRole('button', { name: 'Entrar com e-mail', exact: true }).click();
    await page.locator('#booking-dialog-error').waitFor({ state: 'visible' });
    assert.match(await page.locator('#booking-dialog-error').innerText(), /incorretos/);
    await page.evaluate(() => { window.bookingTest.failLogin = false; });
    await page.getByRole('button', { name: 'Entrar com e-mail', exact: true }).click();
    await page.locator('#booking-contact-form').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#booking-login-panel').isVisible(), false);
    await page.locator('#client-name').fill('   ');
    await page.locator('#client-phone').fill('123');
    await page.getByRole('button', { name: 'Revisar agendamento' }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.locator('#client-name').fill('Cliente Teste');
    await page.locator('#client-phone').fill('92999990000');
    await page.getByRole('button', { name: 'Revisar agendamento' }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    assert.equal(await page.locator('.booking-recap-box').innerText(), recap);
    assert.equal(await page.evaluate(() => window.bookingTest.bookings.length), 0);
    assert.equal(await next.innerText(), 'Confirmar →');
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-review-mobile.png'), fullPage: true });
    await next.click();
    assert.equal(await next.isDisabled(), true);
    await page.locator('#booking-form').evaluate(form => form.requestSubmit());
    assert.equal(await page.evaluate(() => window.bookingTest.bookings.length), 1);
    await page.evaluate(() => window.bookingTest.finishBooking());
    await page.locator('#booking-success').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('desktop: signed-in user skips login, edits contact, and session loss requires login again', async () => {
  const { context, page, next, errors } = await openBooking({ desktop: true, signedIn: true, light: true, failProfile: true });
  try {
    assert.equal(await page.locator('.booking-summary').isVisible(), false);
    const stepperTop = await page.locator('.booking-stepper').evaluate(el => el.getBoundingClientRect().top);
    assert.ok(stepperTop >= 0 && stepperTop <= 32, 'The active step should open near the top of the notebook viewport');
    await page.reload();
    assert.equal(await page.locator('[data-step-indicator="4"]').getAttribute('aria-current'), 'step');
    const restoredTop = await page.locator('.booking-stepper').evaluate(el => el.getBoundingClientRect().top);
    assert.ok(restoredTop >= 0 && restoredTop <= 32, 'A restored booking should reopen at its active step');
    await next.click();
    assert.equal(await page.locator('#booking-login-panel').isVisible(), false);
    assert.equal(await page.locator('#client-name').isVisible(), true);
    await page.locator('#client-phone').fill('92999990000');
    await page.getByRole('button', { name: 'Revisar agendamento' }).click();
    await page.getByRole('button', { name: 'Editar dados' }).click();
    await page.locator('#client-name').fill('Nome revisado');
    await page.getByRole('button', { name: 'Revisar agendamento' }).click();
    assert.equal(await page.locator('#recap-client-name').innerText(), 'Nome revisado');
    await page.evaluate(() => window.bookingTest.signOut());
    assert.equal(await next.innerText(), 'Próximo →');
    await next.click();
    assert.equal(await page.locator('#booking-login-panel').isVisible(), true);
    assert.equal(await page.evaluate(() => window.bookingTest.bookings.length), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('mobile: Google login, small viewport, and failed booking keep the selection for retry', async () => {
  const { context, page, next, errors } = await openBooking({ failBooking: true });
  try {
    await page.setViewportSize({ width: 320, height: 568 });
    await next.click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-login-mobile.png') });
    await page.locator('#booking-google-login').click();
    await page.locator('#booking-contact-form').waitFor({ state: 'visible' });
    await page.locator('#client-phone').fill('92999990000');
    await page.getByRole('button', { name: 'Revisar agendamento' }).click();
    await next.click();
    await page.evaluate(() => window.bookingTest.finishBooking());
    await page.locator('#booking-error').waitFor({ state: 'visible' });
    assert.match(await page.locator('#booking-error').innerText(), /ocupado/);
    assert.equal(await next.isEnabled(), true);
    assert.equal(await page.locator('#booking-success').isVisible(), false);
    assert.equal(await page.locator('#recap-services').innerText(), 'Corte');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('mobile: create an email account inside the dialog without losing the selected appointment', async () => {
  const { context, page, next, errors } = await openBooking();
  try {
    const recap = await page.locator('.booking-recap-box').innerText();
    await next.click();
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    assert.equal(await page.locator('#booking-register-form').isVisible(), true);
    await page.locator('#booking-register-email').fill('novo@example.test');
    await page.locator('#booking-register-password').fill('password123');
    await page.locator('#booking-register-confirm').fill('mismatch');
    await page.getByRole('button', { name: 'Criar conta e continuar' }).click();
    assert.equal(await page.evaluate(() => window.bookingTest.registered || null), null);
    await page.locator('#booking-register-confirm').fill('password123');
    await page.getByRole('button', { name: 'Criar conta e continuar' }).click();
    await page.locator('#booking-contact-form').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#booking-register-form').isVisible(), false);
    await page.locator('#client-phone').fill('92999990000');
    await page.getByRole('button', { name: 'Revisar agendamento' }).click();
    assert.equal(await page.locator('.booking-recap-box').innerText(), recap);
    assert.equal(await page.evaluate(() => window.bookingTest.bookings.length), 0);
    assert.equal(await next.innerText(), 'Confirmar →');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('mobile: service controls follow scrolling; selecting a time waits for Próximo', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 640 } });
  try {
    await context.addInitScript(() => { window.bookingTest = { bookings: [] }; });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/castellari-firebase.js') return route.fulfill({ contentType: 'text/javascript', body: firebaseFixture });
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin + '/agendar.html');
    await page.locator('#booking-catalog-toggle').click();
    await page.locator('[data-service-tab="all"]').click();
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
    const bar = await page.locator('#booking-sticky-bar').boundingBox();
    assert.equal(await page.locator('#booking-sticky-bar').evaluate(el => getComputedStyle(el).position), 'fixed');
    assert.ok(bar.y + bar.height <= 641);
    await page.locator('input[value="corte-tradicional"]').check();
    await page.locator('#booking-continue').click();
    await page.locator('[data-barber-choice="felipe"]').click();
    assert.equal(await page.locator('[data-booking-step="2"]').isVisible(), true);
    await page.locator('#booking-continue').click();
    await page.locator('[data-day]').first().click();
    await page.locator('[data-time]:not([disabled])').first().click();
    assert.equal(await page.locator('[data-booking-step="3"]').isVisible(), true);
    await page.locator('#booking-continue').click();
    assert.equal(await page.locator('[data-booking-step="4"]').isVisible(), true);
  } finally { await context.close(); }
});

test('mobile: common choices are shown first; the full catalog remains searchable and additive', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(() => { window.bookingTest = { bookings: [] }; });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/castellari-firebase.js') return route.fulfill({ contentType: 'text/javascript', body: firebaseFixture });
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin + '/agendar.html');
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-service-choices-mobile.png') });
    assert.deepEqual(await page.locator('.booking-quick-text strong').allTextContents(), [
      'Corte', 'Barba', 'Corte Infantil', 'Barboterapia', 'Limpeza de Sobrancelha', 'Terapia Capilar',
    ]);
    assert.equal(await page.locator('#booking-catalog-panel').isVisible(), false);
    await page.locator('[data-quick-choice="corte-tradicional"]').click();
    await page.locator('[data-quick-choice="barba-tradicional"]').click();
    assert.equal(await page.locator('#selected-service-count').innerText(), '2 serviços selecionados');
    assert.equal(await page.locator('[data-quick-choice="corte-tradicional"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-quick-choice="barba-tradicional"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-quick-choice="corte-tradicional"]').click();
    assert.equal(await page.locator('#selected-service-count').innerText(), '1 serviço selecionado');
    assert.equal(await page.locator('[data-quick-choice="barba-tradicional"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-quick-choice="corte-tradicional"]').click();
    await page.locator('#booking-catalog-toggle').click();
    await page.locator('#booking-service-search').fill('depilação');
    await page.locator('input[value="depilacao-cera-avulsa"]').check();
    assert.equal(await page.locator('#selected-service-count').innerText(), '3 serviços selecionados');
    assert.equal(await page.locator('[data-quick-choice="corte-tradicional"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-quick-choice="barba-tradicional"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#booking-catalog-toggle').click();
    assert.equal(await page.locator('#booking-catalog-panel').isVisible(), false);
    assert.equal(await page.locator('#selected-service-count').innerText(), '3 serviços selecionados');
    await page.locator('#booking-continue').click();
    assert.equal(await page.locator('[data-booking-step="2"]').isVisible(), true);
  } finally { await context.close(); }
});

test('mobile: choices fit above persistent navigation and the barber stays selected until Próximo', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(() => { window.bookingTest = { bookings: [] }; });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/castellari-firebase.js') return route.fulfill({ contentType: 'text/javascript', body: firebaseFixture });
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin + '/agendar.html');
    const visibleAboveNavigation = async selector => page.evaluate(selector => {
      const bottom = document.querySelector(selector).getBoundingClientRect().bottom;
      const navigationTop = document.querySelector('#booking-sticky-bar').getBoundingClientRect().top;
      return bottom <= navigationTop;
    }, selector);
    assert.equal(await visibleAboveNavigation('#booking-catalog-toggle'), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-compact-services.png') });
    await page.locator('[data-quick-choice="corte-tradicional"]').click();
    assert.equal(await visibleAboveNavigation('#booking-catalog-toggle'), true);
    await page.locator('#booking-continue').click();
    assert.equal(await page.locator('#booking-sticky-bar').evaluate(el => getComputedStyle(el).position), 'fixed');
    assert.equal(await visibleAboveNavigation('[data-barber-choice="sem-preferencia"]'), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-compact-barbers.png') });
    await page.locator('[data-barber-choice="felipe"]').click();
    assert.equal(await page.locator('[data-booking-step="2"]').isVisible(), true);
    assert.equal(await page.locator('[data-barber-choice="felipe"]').evaluate(el => el === document.activeElement), true);
    await page.locator('#booking-continue').click();
    await page.locator('[data-day]').first().click();
    await page.locator('[data-time]:not([disabled])').first().click();
    assert.equal(await page.locator('#booking-sticky-bar').evaluate(el => getComputedStyle(el).position), 'fixed');
    assert.equal(await visibleAboveNavigation('#booking-times'), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-compact-times.png') });
    assert.equal(await page.locator('[data-booking-step="3"]').isVisible(), true);
  } finally { await context.close(); }
});

test('mobile: password recovery sends the email and keeps the selected booking', async () => {
  const { context, page, next, errors } = await openBooking({ failRecovery: true });
  try {
    const recap = await page.locator('.booking-recap-box').innerText();
    await next.click();
    await page.locator('#booking-email').fill('cliente@example.test');
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
    assert.equal(await page.locator('#booking-recovery-email').inputValue(), 'cliente@example.test');
    await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();
    await page.locator('#booking-dialog-error').waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.evaluate(() => { window.bookingTest.failRecovery = false; });
    await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();
    await page.getByText('Se esse e-mail tiver uma conta').waitFor({ state: 'visible' });
    assert.deepEqual(await page.evaluate(() => window.bookingTest.recoveryEmails), ['cliente@example.test']);
    await page.getByRole('button', { name: 'Voltar para o login' }).click();
    assert.equal(await page.locator('#booking-login-form').isVisible(), true);
    await page.locator('#booking-dialog-close').click();
    assert.equal(await page.locator('.booking-recap-box').innerText(), recap);
    assert.equal(await page.evaluate(() => window.bookingTest.bookings.length), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('homepage: booking stays prominent and two plans replace the service and team previews', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(() => { window.bookingTest = { bookings: [] }; });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/castellari-firebase.js') return route.fulfill({ contentType: 'text/javascript', body: firebaseFixture });
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/index.html');
    assert.equal(await page.locator('.hero-booking-button').getAttribute('href'), 'agendar.html');
    assert.equal(await page.locator('.hero-actions a[href="#clube"]').count(), 1);
    assert.equal(await page.locator('#featured-services').count(), 0);
    assert.equal(await page.locator('#home-team-preview').count(), 0);
    assert.deepEqual(await page.locator('.home-club-card h3').allTextContents(), ['ESSENCIAL - Corte', 'ESSENCIAL - Corte + Barba']);
    assert.equal(await page.locator('.home-club-plan-label').count(), 2);
    assert.deepEqual(await page.locator('.home-club-price small').allTextContents(), ['Mensalidade', 'Mensalidade']);
    assert.match(await page.locator('#home-club-more-copy').innerText(), /mais 4 planos mensais/);
    assert.equal(await page.locator('#home-club-all-link').innerText(), 'Ver os 6 planos mensais →');
    assert.deepEqual(await page.locator('.home-club-card a').evaluateAll(links => links.map(link => new URL(link.href).searchParams.get('plano'))), ['essencial-corte', 'essencial-corte-barba']);
    assert.equal(await page.locator('a[href="planos.html"]').count() > 0, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'castellari-home-plans-mobile.png'), fullPage: true });
    await page.locator('#home-club-all-link').click();
    assert.equal(await page.locator('h1').innerText(), 'Planos mensais');
    assert.equal(await page.locator('.plan-card h3').count(), 6);
    await page.goto(origin + '/index.html');
    await page.setViewportSize({ width: 1280, height: 900 });
    const cards = await page.locator('.home-club-card').evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
    assert.equal(cards[0], cards[1]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
