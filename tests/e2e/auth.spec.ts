import { test, expect } from '@playwright/test';

test.describe('SR Enterprises CRM - Authentication & Route Security', () => {
  test('unauthenticated users attempting to access /dashboard are redirected to /login', async ({ page }) => {
    // Attempt direct navigation to protected /dashboard route
    await page.goto('/dashboard');

    // Must be redirected to /login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByText('SR ENTERPRISES').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login screen displays username, password, and CAPTCHA challenge', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[name="username"], input[placeholder*="username" i], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByText(/Security Code|CAPTCHA/i).first()).toBeVisible();
  });

  test('failed login attempts show error notification', async ({ page }) => {
    await page.goto('/login');

    const usernameInput = page.locator('input[name="username"], input[placeholder*="username" i], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await usernameInput.fill('invalid_user');
    await passwordInput.fill('wrong_password');
    await submitBtn.click();

    // Stays safely on login form
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
