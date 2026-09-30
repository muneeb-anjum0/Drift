# Product and Demo Guide

Drift preserves approved requirements, compares new client input with a baseline, saves meaningful analyses, generates change requests, and records approval decisions.

## Core workflow

1. Create a workspace and project.
2. Add or extract requirements.
3. Freeze a baseline.
4. Run drift analysis against a client message.
5. Review and explicitly save the preview.
6. Generate and save a change request.
7. Submit it for approval.
8. Approve, reject, or request revision.

For a short demo, create a clinic project with login, appointment, invoice, report, and notification requirements. Freeze the baseline, then analyze:

> Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.

The result should demonstrate requirement selection, a grouped drift preview, scoring, and a reviewable change request. Actual labels and model quality must be measured through the explicit evaluation workflow rather than assumed.

## Approval lifecycle

```text
draft -> pending_approval -> approved/rejected/needs_revision
needs_revision -> pending_approval
```

The Approvals page lists pending and decided requests. Each decision records its actor, note, timestamp, and status history.

## Evaluation

The Evaluation page can run the focused benchmark when the model profile is available. The CLI alternative is:

```bash
python tools/verification/evaluate_q4_quality.py
```

## Billing boundary

The Billing page and `GET /api/v1/billing/summary` are a product-readiness demo surface. They describe the local plan and usage, but no Stripe integration, payment method, invoice, subscription, trial, or webhook processing exists.

## Useful runtime regressions

The scripts under `tools/verification/` cover the approval workflow, billing summary, project requirement selection, change-request generation, route consistency, and runtime health. Model-dependent scripts require the explicitly started model profile.
