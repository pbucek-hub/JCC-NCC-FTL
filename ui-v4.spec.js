const { test, expect } = require('@playwright/test');

const URL = 'http://127.0.0.1:8000/JCC_FTL_Calculator_v4.html';

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page._jccErrors = errors;
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('JCC FTL Calculator');
});

test.afterEach(async ({ page }) => {
  expect(page._jccErrors, 'browser console/page errors').toEqual([]);
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  expect(dims.sw).toBeLessThanOrEqual(dims.iw + 1);
});

test('ruleset switching preserves inputs and only changes limits', async ({ page }) => {
  await page.locator('#report').fill('09:00');
  await page.locator('#apt').fill('LHR');
  await page.locator('#reportDate').fill('2026-09-21');
  await page.locator('#plus').click();
  await page.locator('#plus').click();
  await expect(page.locator('#sn')).toHaveText('4');
  await page.locator('[data-long="1"]').click();
  await page.locator('#longestSector').fill('10');
  await page.locator('#longSectorCount').fill('1');
  await page.locator('[data-acc="0"]').click();
  await page.locator('#precedingRest').fill('24');

  const before = await page.evaluate(() => ({
    report: report.value, apt: apt.value, date: reportDate.value,
    sectors: sn.textContent, long: longestSector.value, count: longSectorCount.value,
    preceding: precedingRest.value
  }));

  await page.locator('[data-rule="CAT"]').click();
  const catMax = await page.locator('#mf').textContent();
  await page.locator('[data-rule="NCC"]').click();
  const nccMax = await page.locator('#mf').textContent();

  const after = await page.evaluate(() => ({
    report: report.value, apt: apt.value, date: reportDate.value,
    sectors: sn.textContent, long: longestSector.value, count: longSectorCount.value,
    preceding: precedingRest.value
  }));
  expect(after).toEqual(before);
  expect(catMax).not.toEqual(nccMax);
});

test('same duty can be legal in NCC and not legal in CAT/AOC', async ({ page }) => {
  await page.locator('#report').fill('09:00');
  await page.locator('#apt').fill('LHR');
  await page.locator('#reportDate').fill('2026-09-21');
  await page.locator('#adv').click();
  await page.locator('#planned').fill('14');
  await page.locator('#aa').click();

  await page.locator('[data-rule="NCC"]').click();
  await page.locator('#calc').click();
  await expect(page.locator('#st')).toHaveText('LEGAL');

  await page.locator('[data-rule="CAT"]').click();
  await page.locator('#calc').click();
  await expect(page.locator('#st')).toHaveText('NOT LEGAL');

  await page.locator('[data-rule="NCC"]').click();
  await page.locator('#calc').click();
  await expect(page.locator('#st')).toHaveText('LEGAL');
});

test('airport/date conversion shows correct UTC and DST correction', async ({ page }) => {
  await page.locator('#reportDate').fill('2026-09-21');
  await page.locator('#report').fill('09:00');

  await page.locator('#apt').fill('LHR');
  await page.locator('#calc').click();
  await expect(page.locator('#utc')).toContainText('UTC 08:00');
  await expect(page.locator('#utc')).toContainText('UTC+1');

  await page.locator('#apt').fill('CDG');
  await page.locator('#calc').click();
  await expect(page.locator('#utc')).toContainText('UTC 07:00');
  await expect(page.locator('#utc')).toContainText('UTC+2');

  await page.locator('#apt').fill('TEB');
  await page.locator('#calc').click();
  await expect(page.locator('#utc')).toContainText('UTC 13:00');
  await expect(page.locator('#utc')).toContainText('UTC-4');
});

test('long-sector threshold label follows selected ruleset', async ({ page }) => {
  await expect(page.locator('#longQ')).toHaveText('Sector > 9h00?');
  await page.locator('[data-rule="CAT"]').click();
  await expect(page.locator('#longQ')).toHaveText('Sector > 7h00?');
  await page.locator('[data-rule="NCC"]').click();
  await expect(page.locator('#longQ')).toHaveText('Sector > 9h00?');
});

test('manual report-time override works without clearing original data', async ({ page }) => {
  await page.locator('#report').fill('09:00');
  await page.locator('[data-ov="1"]').click();
  await expect(page.locator('#ovfields')).toBeVisible();
  await page.locator('#actual').fill('10:30');
  await page.locator('#orig').fill('09:00');
  await page.locator('#calc').click();
  await page.locator('[data-rule="CAT"]').click();
  await page.locator('[data-rule="NCC"]').click();
  await expect(page.locator('#report')).toHaveValue('09:00');
  await expect(page.locator('#actual')).toHaveValue('10:30');
  await expect(page.locator('#orig')).toHaveValue('09:00');
  await page.locator('[data-ov="0"]').click();
  await expect(page.locator('#ovfields')).toBeHidden();
  await expect(page.locator('#report')).toHaveValue('09:00');
});

test('extension controls progressively reveal only required fields', async ({ page }) => {
  await page.locator('[data-ext="split"]').click();
  await expect(page.locator('#groundInterval')).toBeVisible();
  await expect(page.locator('#splitFacilityOK')).toBeVisible();

  await page.locator('[data-ext="relief"]').click();
  await expect(page.locator('#reliefRest')).toBeVisible();
  await expect(page.locator('[data-fac="jump"]')).toBeVisible();
  await expect(page.locator('[data-fac="seat"]')).toBeVisible();
  await expect(page.locator('[data-fac="bunk"]')).toBeVisible();
  await expect(page.locator('#reliefQualified')).toBeVisible();

  await page.locator('[data-ext="none"]').click();
  await expect(page.locator('#extfields')).toBeHidden();
});

test('advanced options modal opens, applies, and preserves values across rulesets', async ({ page }) => {
  await page.locator('#adv').click();
  await expect(page.locator('#am')).toHaveClass(/open/);
  await page.locator('#sb').check();
  await page.locator('#sbs').fill('06:00');
  await page.locator('#sbc').fill('13:00');
  await page.locator('#pic').fill('2');
  await page.locator('#planned').fill('12');
  await page.locator('#aa').click();
  await expect(page.locator('#am')).not.toHaveClass(/open/);

  await page.locator('[data-rule="CAT"]').click();
  await page.locator('[data-rule="NCC"]').click();
  await page.locator('#adv').click();
  await expect(page.locator('#sb')).toBeChecked();
  await expect(page.locator('#sbs')).toHaveValue('06:00');
  await expect(page.locator('#sbc')).toHaveValue('13:00');
  await expect(page.locator('#pic')).toHaveValue('2');
  await expect(page.locator('#planned')).toHaveValue('12');
});

test('OMA reference opens and contains both rule sets', async ({ page }) => {
  await page.locator('#oma').click();
  await expect(page.locator('#rm')).toHaveClass(/open/);
  await expect(page.locator('#refs')).toContainText('NCC');
  await expect(page.locator('#refs')).toContainText('CAT/AOC');
  await page.locator('#rc').click();
  await expect(page.locator('#rm')).not.toHaveClass(/open/);
});

test('rest and cumulative tabs function with ruleset-specific values', async ({ page }) => {
  await page.locator('[data-tab="rest"]').click();
  await expect(page.locator('#rest')).toBeVisible();
  await page.locator('#pd').fill('8');
  await page.locator('[data-rule="NCC"]').click();
  await expect(page.locator('#rr')).toHaveText('10:00');
  await page.locator('[data-rule="CAT"]').click();
  await expect(page.locator('#rr')).toHaveText('12:00');

  await page.locator('[data-tab="cum"]').click();
  await expect(page.locator('#cum')).toBeVisible();
  await page.locator('#d7').fill('60');
  await page.locator('[data-rule="CAT"]').click();
  await expect(page.locator('#cr')).toContainText('55 / 95 / 190 / 2000');
  await expect(page.locator('#cr')).toContainText('LIMIT BREACH');
  await page.locator('[data-rule="NCC"]').click();
  await expect(page.locator('#cr')).toContainText('65 / 105 / 190 / 2000');
});

test('save stores current calculation locally', async ({ page }) => {
  await page.locator('#save').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jcc-ftl-last')));
  expect(saved).toBeTruthy();
  expect(saved.input.rule).toBe('NCC');
  expect(saved.result).toBeTruthy();
});

test('share sends calculation and result via native share when available', async ({ page }) => {
  await page.evaluate(() => {
    window.__shared = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.__shared = payload; } });
  });
  await page.locator('#adv').click();
  await page.locator('#planned').fill('12');
  await page.locator('#aa').click();
  await page.locator('#share').click();
  const shared = await page.evaluate(() => window.__shared);
  expect(shared).toBeTruthy();
  expect(shared.text).toContain('Ruleset: NCC');
  expect(shared.text).toContain('Maximum FDP:');
  expect(shared.text).toContain('Result: LEGAL');
});

test('unknown airport fails visibly rather than silently assuming UTC', async ({ page }) => {
  await page.locator('#apt').fill('ZZZZ');
  await page.locator('#calc').click();
  await expect(page.locator('#utc')).toHaveText('Location not resolved');
  await expect(page.locator('#de')).toHaveText('—');
});
