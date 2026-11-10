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
  await page.route('**/api/v1/drift/readiness*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { available: false, reason: 'unavailable', providerType: 'local' } }) }));
  await page.getByRole('button', { name: 'Changes', exact: true }).click();
  await expect(page.getByText(/Analysis provider isn't available right now/)).toBeVisible();
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
  await page.route('**/api/v1/workspaces/*/provider', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { provider: { providerType: 'local', displayName: 'Local model', credentialConfigured: false } } }) }));
  await page.goto('/settings');
  await expect(page.getByText('Current:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save provider' })).toHaveCount(0);
  await expect(page.getByLabel('API key')).toHaveCount(0);
});

test('synthetic provider setup flows through a proposed change and human decision', async ({ page }) => {
  test.setTimeout(90000);
  await register(page, 'Provider Owner Fixture');
  const syntheticKey = 'synthetic-ci-provider-key-not-real';
  let metadata = { providerType: 'local', displayName: 'Local model', credentialConfigured: false };
  await page.route('**/api/v1/workspaces/*/provider', async (route) => {
    if (route.request().method() === 'PUT') {
      const submitted = route.request().postDataJSON();
      expect(submitted.apiKey).toBe(syntheticKey);
      expect(submitted.privacyAcknowledged).toBe(true);
      metadata = { providerType: 'openai_compatible', displayName: 'Fixture provider', credentialConfigured: true };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { provider: { ...metadata, endpoint: metadata.providerType === 'openai_compatible' ? 'https://api.example.com/v1' : undefined, model: metadata.providerType === 'openai_compatible' ? 'mock-model' : undefined } } }) });
  });
  await page.route('**/api/v1/workspaces/*/provider/test', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { status: 'connected' } }) }));
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Analysis provider' })).toBeVisible();
  await page.getByLabel('Provider name').fill('Fixture provider');
  await page.getByLabel('Model', { exact: true }).fill('mock-model');
  await page.getByLabel('HTTPS endpoint').fill('https://api.example.com/v1');
  await page.getByLabel('API key').fill(syntheticKey);
  await page.getByLabel(/selected agreed requirement and new client input used for analysis/i).check();
  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByText(/Connected. No project text/)).toBeVisible();
  await page.getByRole('button', { name: 'Save provider' }).click();
  await expect(page.getByText(/External provider saved/)).toBeVisible();
  await expect(page.getByText(/API key configured/)).toBeVisible();
  await expect(page.getByLabel('Replace API key')).toHaveValue('');
  await expect(page.getByText(syntheticKey)).toHaveCount(0);

  await createProject(page, `Provider Journey ${Date.now()}`);
  await page.getByRole('button', { name: 'Agreed scope', exact: true }).click();
  await page.getByRole('button', { name: 'Add scope item' }).click();
  await page.getByRole('dialog').getByLabel('Title').fill('Monthly reports');
  await page.getByRole('dialog').getByLabel('Description').fill('Admins can export monthly reports.');
  await page.getByRole('dialog').getByRole('button', { name: 'Add scope item' }).click();
  await page.getByRole('button', { name: 'Create scope snapshot' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create scope snapshot', exact: true }).click();

  await page.route('**/api/v1/drift/readiness*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { available: true, reason: 'ready', providerType: 'openai_compatible', model: 'mock-model' } }) }));
  let mockAnalyzed = false;
  const previewId = 'a'.repeat(64);
  const analysisId = 'b'.repeat(24);
  const changeRequestId = 'c'.repeat(24);
  let preview: Record<string, unknown> | null = null;
  let savedAnalysis: Record<string, unknown> | null = null;
  let approvalStatus = 'draft';
  let savedRequest: Record<string, unknown> | null = null;
  await page.route('**/api/v1/drift/analyze', (route) => {
    const input = route.request().postDataJSON();
    mockAnalyzed = true;
    preview = {
      previewId, projectId: input.projectId, baselineVersionId: input.baselineVersionId, baselineVersionNumber: 1,
      inputType: 'client_message', inputText: input.inputText, driftScore: 45, riskLevel: 'medium',
      summary: 'The client requested an additional report format.',
      detectedChanges: [{ changeType: 'modified', title: 'Monthly reports', description: 'Add a PDF export option.', newText: input.inputText, oldText: 'Admins can export monthly reports.', impact: 'medium', confidence: 90, recommendation: 'Review the revised export format.' }],
      requirementResults: [], addedCount: 0, modifiedCount: 1, removedCount: 0, ambiguousCount: 0, contradictionCount: 0,
      estimatedExtraHours: 4, analysisEngine: 'openai_compatible',
    };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { analysis: preview } }) });
  });
  await page.route('**/api/v1/drift/save', (route) => {
    expect(route.request().postDataJSON()).toEqual({ previewId });
    if (!preview || savedAnalysis) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Analysis preview is unavailable or already saved.' }) });
    savedAnalysis = { ...preview, _id: analysisId, project: preview.projectId, workspace: 'fixture-workspace', baselineVersion: preview.baselineVersionId, status: 'saved', provenanceVersion: 'server_bound_v1', createdBy: 'fixture-user', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { analysis: savedAnalysis } }) });
  });
  await page.route('**/api/v1/drift/project/*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { analyses: savedAnalysis ? [savedAnalysis] : [] } }) }));
  await page.route('**/api/v1/change-requests**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path.endsWith('/generate') && method === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ driftAnalysisId: analysisId });
      const draft = { driftAnalysisId: analysisId, title: 'Monthly reports', clientName: 'Example client', summary: 'Add PDF export.', changesRequested: [{ title: 'Monthly reports', description: 'Add a PDF export option.', changeType: 'modified', impact: 'medium' }], businessReason: 'Client request', timelineImpact: 'Review effort', costImpact: 'Review cost', recommendedAction: 'Review the change', approvalNote: '', status: 'draft', generatedBy: 'openai_compatible' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { changeRequest: draft } }) });
    }
    if (path.endsWith('/change-requests') && method === 'POST') {
      const draft = route.request().postDataJSON();
      savedRequest = { ...draft, _id: changeRequestId, project: savedAnalysis?.project, workspace: 'fixture-workspace', driftAnalysis: analysisId, approvalStatus, createdBy: 'fixture-user', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { changeRequest: savedRequest } }) });
    }
    if (path.endsWith('/submit') || path.endsWith('/approve')) {
      approvalStatus = path.endsWith('/submit') ? 'pending_approval' : 'approved';
      savedRequest = { ...savedRequest, approvalStatus };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data: { changeRequest: savedRequest } }) });
    }
    const data = path.endsWith('/approvals') ? { changeRequests: savedRequest ? [savedRequest] : [] } : { changeRequests: savedRequest ? [savedRequest] : [] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data }) });
  });
  await page.getByRole('button', { name: 'Changes', exact: true }).click();
  await expect(page.getByText(/Analysis provider:/)).toBeVisible();
  await page.getByLabel('What did the client say?').fill('Please add PDF export for monthly reports.');
  await page.getByRole('button', { name: 'Compare with scope' }).click();
  await expect(page.getByText('Add a PDF export option.')).toBeVisible();
  expect(mockAnalyzed).toBe(true);
  await page.getByRole('button', { name: 'Save proposed analysis' }).click();
  await expect(page.getByText('Analysis saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Prepare change request' }).click();
  await page.getByRole('button', { name: 'Prepare draft' }).click();
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page.getByText('Pending approval', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review decision' }).click();
  await expect(page).toHaveURL(/\/approvals/);
  await page.getByRole('dialog').getByRole('button', { name: 'Close Monthly reports' }).click();
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
});
