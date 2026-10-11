import { expect, test, type Page } from '@playwright/test';

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
const register = async (page: Page, name: string) => {
  await page.goto('/register');
  await page.getByPlaceholder('Alex Morgan').fill(name);
  await page.getByPlaceholder('you@company.com').fill(uniqueEmail());
  await page.locator('input[type="password"]').nth(0).fill('password123');
  await page.locator('input[type="password"]').nth(1).fill('password123');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};
const createProject = async (page: Page, name: string) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Create project', exact: true }).first().click();
  await page.getByLabel('Project name').fill(name);
  await page.getByLabel('Client name').fill('Example client');
  await page.getByLabel('Original agreement').fill('Admins can export monthly reports.');
  await page.getByRole('dialog').getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
};

test('protects app routes when logged out', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('first-run path creates project, scope item and snapshot without claiming approval', async ({ page }) => {
  await register(page, 'First Run User');
  await expect(page.getByRole('heading', { name: /create your first project/i })).toBeVisible();
  await createProject(page, `First Run ${Date.now()}`);
  await page.getByRole('button', { name: 'Agreed scope', exact: true }).click();
  await page.getByRole('button', { name: 'Add scope item' }).click();
  await page.getByRole('dialog').getByLabel('Title').fill('Export monthly reports');
  await page.getByRole('dialog').getByLabel('Description').fill('Admins can export reports as CSV.');
  await page.getByRole('dialog').getByRole('button', { name: 'Add scope item' }).click();
  await expect(page.getByText('Export monthly reports', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create scope snapshot' }).first().click();
  await expect(page.getByRole('dialog').getByText(/not a formal approval/i)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Create scope snapshot', exact: true }).click();
  await expect(page.getByText(/Scope snapshot #1 created/)).toBeVisible();
});

test('model-unavailable state blocks comparison and does not fabricate saved results', async ({ page }) => {
  await register(page, 'Unavailable Model User');
  await createProject(page, `Unavailable ${Date.now()}`);
  await page.getByRole('button', { name: 'Agreed scope', exact: true }).click();
  await page.getByRole('button', { name: 'Add scope item' }).click();
  await page.getByRole('dialog').getByLabel('Title').fill('Monthly reports');
  await page.getByRole('dialog').getByLabel('Description').fill('Provide monthly reports.');
  await page.getByRole('dialog').getByRole('button', { name: 'Add scope item' }).click();
  await page.getByRole('button', { name: 'Create scope snapshot' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create scope snapshot', exact: true }).click();
  await page.route('**/api/v1/drift/readiness', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { available: false, reason: 'unavailable' } }) }));
  await page.getByRole('button', { name: 'Changes', exact: true }).click();
  await expect(page.getByText(/Change analysis isn't available right now/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare with scope' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save proposed analysis' })).toHaveCount(0);
});

test('API failure is not shown as an empty project list', async ({ page }) => {
  await register(page, 'API Error User');
  await page.route('**/api/v1/projects', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Service unavailable' }) }));
  await page.goto('/projects');
  await expect(page.getByRole('alert').getByText(/Projects couldn't be loaded/)).toBeVisible();
  await expect(page.getByText('No projects yet')).toHaveCount(0);
});

test('viewer UI hides mutation controls; server remains the authority', async ({ page }) => {
  await register(page, 'Viewer Fixture User');
  const projectName = `Viewer ${Date.now()}`;
  await createProject(page, projectName);
  await page.route('**/api/v1/workspaces', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.workspaces = body.data.workspaces.map((workspace: { role?: string }) => ({ ...workspace, role: 'viewer' }));
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Agreed scope', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add scope item' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create scope snapshot' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Compare with scope' })).toHaveCount(0);
});
