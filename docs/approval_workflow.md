# Approval Workflow

DriftLedger change requests now have a separate approval lifecycle:

```text
draft -> pending_approval -> approved
draft -> pending_approval -> rejected
draft -> pending_approval -> needs_revision -> pending_approval
```

Existing saved change requests without approval fields load as `draft`.

## Frontend

- Main route: `http://localhost:5173/approvals`
- Dock item: `Approvals`, placed after `Evaluation`
- Project Change Requests tab:
  - shows approval status
  - can submit saved requests for approval
  - links directly to the approval page with `?requestId=...`

## API

All routes require the normal app auth token.

```text
GET  /api/v1/change-requests/approvals
GET  /api/v1/change-requests/approvals/:changeRequestId
POST /api/v1/change-requests/:changeRequestId/submit
POST /api/v1/change-requests/:changeRequestId/approve
POST /api/v1/change-requests/:changeRequestId/reject
POST /api/v1/change-requests/:changeRequestId/needs-revision
```

Decision body:

```json
{
  "note": "Optional decision context"
}
```

## Stored Fields

Change requests keep their existing `status` field and add approval-specific fields:

```text
approvalStatus
submittedAt
decisionBy
decisionByName
decisionAt
decisionNote
approvalHistory[]
```

`approvalHistory` records status, note, actor, actor name, and timestamp for each approval action.

## Runtime Check

Start Docker, then run:

```powershell
python tools\test_approval_workflow.py
```

The script creates real change requests, submits one for approval, approves it, submits another, rejects it, and verifies the approval list returns both decisions.
