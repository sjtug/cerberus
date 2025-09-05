import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, { tags }) => {
  page.on('pageerror', (error) => {
    console.error(error);
  });
  if (tags.includes('@nojs')) {
    await page.goto('/nojs/foo.iso');
  } else if (tags.includes('@nowasm')) {
    await page.goto('/nowasm/foo.iso');
  } else if (tags.includes('@nocerberus')) {
    await page.goto('/foo');
  } else {
    await page.goto('/foo.iso');
  }
});

test.describe('javascript disabled', { tag: '@nojs' }, () => {
  test('must show a javascript disabled message', async ({ page }) => {
    await expect(page.getByText('You must enable JavaScript to proceed.')).toBeVisible();
  });
});

test.describe('webassembly disabled', { tag: '@nowasm' }, () => {
  test('must show a webassembly disabled message', async ({ page }) => {
    await expect(page.getByText('Please enable WebAssembly to proceed.')).toBeVisible();
  });
});

test.describe('cerberus disabled', { tag: '@nocerberus' }, () => {
  test('must show real content immediately', async ({ page }) => {
    await expect(page.getByText('Hello, foo!')).toBeVisible({ timeout: 100 });
  });
});

test.describe(() => {
  // NOTE This test runs slowly in Firefox due to Playwright's devtools integration causing WebAssembly performance degradation
  // NOTE See: https://github.com/microsoft/playwright/issues/11102
  test('must perform browser checks', async ({ page }) => {
    await expect(page.getByText('Performing browser checks...')).toBeVisible();
    await expect(page.getByText('Difficulty:')).toHaveText(/Difficulty: \d+, Speed: \d+(\.\d+)?kH\/s/, { timeout: 500 });

    await expect(page.getByText('Hello, foo.iso!')).toBeVisible({ timeout: 30000 });
  });
});