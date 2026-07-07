# Billing Demo

The Billing page is a product-readiness surface, not a real payment integration.

Route:

```text
http://localhost:5173/billing
```

Backend endpoint:

```text
GET /api/v1/billing/summary
```

## Demo Plan

```text
DriftLedger Local Pro
$19/month
Status: active_demo
```

Included capabilities:

- unlimited local projects
- requirement baselines
- AI drift analysis
- saved analysis history
- change request generation
- approval workflow
- evaluation dashboard
- local Q4_K_M inference
- no hosted AI dependency
- local-first data posture

## Runtime Check

After Docker is running:

```powershell
python tools\test_billing_summary.py
```

This creates a temporary authenticated project and verifies the summary reports the Local Pro plan and Q4_K_M runtime.

## Limitation

No Stripe, invoices, cards, subscriptions, trials, webhooks, or real payment state are implemented.
