import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

test.describe('VowOS iPhone shell', () => {
  test('keeps primary navigation simple, reachable, and overflow-free', async ({ page }) => {
    await page.goto('/demoapp/', { waitUntil: 'domcontentloaded' });

    const mobileNav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
    await expect(mobileNav).toBeVisible();

    const primaryTabs = mobileNav.locator('[data-tour-id^="mobile-tab-"]');
    await expect(primaryTabs.first()).toBeVisible();
    expect(await primaryTabs.count()).toBeLessThanOrEqual(3);

    const moreButton = mobileNav.getByRole('button', { name: 'More VowOS navigation' });
    await expect(moreButton).toBeVisible();

    const navButtons = mobileNav.getByRole('button');
    for (let index = 0; index < await navButtons.count(); index += 1) {
      const box = await navButtons.nth(index).boundingBox();
      expect(box, `mobile nav button ${index} should have a measurable hit target`).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const overflow = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      mobileMode: document.body.classList.contains('vowos-mobile-active'),
    }));

    expect(overflow.mobileMode).toBe(true);
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

    await moreButton.click();
    const menu = page.getByRole('dialog', { name: 'VowOS mobile menu' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Advanced' })).toBeVisible();
    await expect(menu.getByText('Use desktop view')).toHaveCount(0);

    await menu.getByRole('button', { name: 'Advanced' }).click();
    await expect(menu.getByText('Use desktop view')).toBeVisible();
  });
});
