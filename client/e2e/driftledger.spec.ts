import { expect, test } from '@playwright/test';

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const register = async (page: import('@playwright/test').Page, name: string) => {
  await page.goto('/register');
  await page.getByPlaceholder('Alex Morgan').fill(name);
  await page.getByPlaceholder('you@company.com').fill(uniqueEmail());
  await page.locator('input[type="password"]').nth(0).fill('password123');
  await page.locator('input[type="password"]').nth(1).fill('password123');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test('protects app routes when logged out', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('registers a user and loads dashboard data', async ({ page }) => {
  await register(page, 'E2E User');

  await expect(page.getByText('Command center')).toBeVisible();
  await expect(page.getByText('Scope protection pipeline')).toBeVisible();
});

test('creates a project from the projects page', async ({ page }) => {
  await register(page, 'Project E2E User');

  await page.goto('/projects');
  await page.getByRole('button', { name: /new project/i }).click();
  await page.getByLabel('Workspace').nth(1).selectOption({ index: 1 });
  await page.getByLabel('Project name').fill('E2E Project');
  await page.getByLabel('Client name').fill('E2E Client');
  await page.getByPlaceholder('Describe the project in plain language').fill('Browser-created project');
  await page.getByPlaceholder('Summarize what was originally promised').fill('Users can login and view reports.');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();

  await expect(page.getByText('E2E Project')).toBeVisible();
  await expect(page.getByText('E2E Client')).toBeVisible();
});
