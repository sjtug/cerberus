import { test, expect, type Page } from '@playwright/test';

const waitForAnswer = (page: Page, status: number) => page.waitForResponse(
  (response) =>
    response.url().endsWith('/.cerberus/answer') &&
    response.request().method() === 'POST' &&
    response.status() === status,
  { timeout: 60000 },
);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    console.error(error);
  });
});

test.describe('javascript disabled', () => {
  test('must show a javascript disabled message', async ({ page }) => {
    await page.goto('/nojs/foo.iso');

    await expect(page.getByText('You must enable JavaScript to proceed.')).toBeVisible();
  });
});

test.describe('webassembly disabled', () => {
  test.setTimeout(60000);
  test('must show a webassembly fallback warning', async ({ page }) => {
    const answerResponse = waitForAnswer(page, 303);

    await page.goto('/nowasm/foo.iso', { waitUntil: 'commit' });

    await expect(page.getByText('Your browser does not support WebAssembly. Computation may be slower.')).toBeVisible();

    await answerResponse;
    await expect(page.getByText('Hello, foo.iso!')).toBeVisible();
  });
});

test.describe('cerberus disabled', () => {
  test('must show real content immediately', async ({ page }) => {
    const response = await page.goto('/foo');

    expect(response?.headers()['x-cerberus-status']).toBe('DISABLED');
    await expect(page.getByText('Hello, foo!')).toBeVisible();
  });
});

test.describe(() => {
  test.setTimeout(60000);

  // NOTE This test runs slowly in Firefox due to Playwright's devtools integration causing WebAssembly performance degradation
  // NOTE See: https://github.com/microsoft/playwright/issues/11102
  test('must perform browser checks', async ({ page }) => {
    const answerResponse = waitForAnswer(page, 303);

    const response = await page.goto('/foo.iso', { waitUntil: 'commit' });

    expect(response?.headers()['x-cerberus-status']).toBe('CHALLENGE');
    await expect(page.getByText('Performing browser checks...')).toBeVisible();
    await expect(page.getByText('Difficulty:')).toHaveText(/Difficulty: \d+, Speed: \d+(\.\d+)?kH\/s/);

    await answerResponse;
    await expect(page.getByText('Hello, foo.iso!')).toBeVisible();
  });

  test('must fail when response is incorrect', async ({ page }) => {
    await page.route('**/.cerberus/answer', async (route, request) => {
      const formData = new URLSearchParams(request.postData() ?? '');
      formData.set('response', '1145141919810');

      await route.continue({
        postData: formData.toString(),
      });
    });

    const answerResponse = waitForAnswer(page, 403);

    await page.goto('/foo.iso');

    await answerResponse;
    await expect(page.getByText('Server returned an error that we cannot handle.')).toBeVisible();
  });
});
