import { expect, test } from '@playwright/test';

/**
 * Slash command menu spec — Lane 7 P2 (review-2026-04-28).
 *
 * Mounted on:
 *   - Homepage search composer (HomepageSearchExperience.tsx)
 *   - Sandbox vertical chooser composer (SandboxApp.tsx)
 *
 * The slash menu is intentionally NOT mounted on chess.bookedai.au or
 * aimentor.bookedai.au surfaces.
 */

const HOMEPAGE_PATH = '/?homepage_variant=product_first';

async function openHomepageComposer(page: Parameters<typeof test>[0]['page']) {
  await page.goto(HOMEPAGE_PATH);
  // The hero heading anchors the page-ready signal across variants.
  await expect(
    page.getByRole('heading', { name: /Never miss a paying enquiry again\./i }),
  ).toBeVisible();
  const composer = page.getByTestId('homepage-search-composer');
  await composer.scrollIntoViewIfNeeded();
  await composer.click();
  return composer;
}

test.describe('homepage composer slash commands', () => {
  test('typing "/" opens the menu with all 6 default commands', async ({ page }) => {
    const composer = await openHomepageComposer(page);
    await composer.fill('/');

    const menu = page.getByTestId('slash-menu');
    await expect(menu).toBeVisible();
    const rows = page.getByTestId('slash-menu-row');
    await expect(rows).toHaveCount(6);
    // Verb labels we expect to ship.
    await expect(menu).toContainText('/find a service');
    await expect(menu).toContainText('/compare options');
    await expect(menu).toContainText('/book');
    await expect(menu).toContainText('/quote');
    await expect(menu).toContainText('/portal');
    await expect(menu).toContainText('/help');
  });

  test('typing "/fi" filters to only /find a service', async ({ page }) => {
    const composer = await openHomepageComposer(page);
    await composer.fill('/fi');

    const rows = page.getByTestId('slash-menu-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('/find a service');
  });

  test('clicking /find replaces the input with the template and selects the first placeholder', async ({ page }) => {
    const composer = await openHomepageComposer(page);
    await composer.fill('/find');

    const findRow = page.locator('[data-slash-row-id="find"]');
    await expect(findRow).toBeVisible();
    await findRow.click();

    // The textarea value is now the template.
    await expect(composer).toHaveValue('Find {service} near {location}');

    // The first placeholder ({service}) should be selected. Read selection
    // from the DOM (Playwright doesn't expose it on the locator directly).
    const selection = await page.evaluate(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="homepage-search-composer"]',
      );
      if (!el) return null;
      return {
        start: el.selectionStart,
        end: el.selectionEnd,
        value: el.value,
      };
    });
    expect(selection).not.toBeNull();
    if (selection) {
      const expectedStart = selection.value.indexOf('{service}');
      const expectedEnd = expectedStart + '{service}'.length;
      expect(selection.start).toBe(expectedStart);
      expect(selection.end).toBe(expectedEnd);
    }

    // Menu should hide once the value no longer parses as a slash verb
    // (template contains spaces).
    await expect(page.getByTestId('slash-menu')).toBeHidden();
  });

  test('ESC closes the menu and clears the slash buffer', async ({ page }) => {
    const composer = await openHomepageComposer(page);
    await composer.fill('/');
    await expect(page.getByTestId('slash-menu')).toBeVisible();

    await composer.press('Escape');
    await expect(page.getByTestId('slash-menu')).toBeHidden();
    await expect(composer).toHaveValue('');
  });

  test('Up/Down/Enter keyboard nav picks a command', async ({ page }) => {
    const composer = await openHomepageComposer(page);
    await composer.fill('/');

    const rows = page.getByTestId('slash-menu-row');
    // First row is active by default.
    await expect(rows.nth(0)).toHaveAttribute('data-slash-active', 'true');

    await composer.press('ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('data-slash-active', 'true');
    await expect(rows.nth(0)).toHaveAttribute('data-slash-active', 'false');

    await composer.press('ArrowDown');
    await expect(rows.nth(2)).toHaveAttribute('data-slash-active', 'true');

    await composer.press('ArrowUp');
    await expect(rows.nth(1)).toHaveAttribute('data-slash-active', 'true');

    // Enter picks the active command (/compare options at index 1).
    await composer.press('Enter');
    await expect(composer).toHaveValue('Compare {option_1} vs {option_2}');
    await expect(page.getByTestId('slash-menu')).toBeHidden();
  });

  test('mobile viewport renders the menu as a full-width bottom drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const composer = await openHomepageComposer(page);
    await composer.fill('/');

    const menu = page.getByTestId('slash-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('data-slash-position', 'mobile-drawer');

    // Bottom-pinned: bottom edge near viewport bottom.
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // The menu should anchor to the bottom (within ~12px including
      // safe-area padding) of the 844px viewport.
      expect(box.y + box.height).toBeGreaterThan(844 - 24);
    }
  });
});
