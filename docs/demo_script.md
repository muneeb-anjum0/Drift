# Three-Minute Demo Script

## 1. Landing Page

Open:

```text
http://localhost:5173
```

Point out the problem: client scope changes arrive in messages, but teams need proof against the approved baseline.

## 2. Open Or Create A Project

Go to Projects and open a demo project such as MediCare Clinic Portal.

If needed, create a project with a short original scope around a clinic portal.

## 3. Requirements And Baseline

Add requirements such as:

- patients can log in by email
- patients can book appointments
- admins can export clinic reports as CSV
- patients can view invoices and payment status

Create a baseline.

## 4. Run Drift Analysis

Use this client message:

```text
Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.
```

Explain that project-level analysis compares the message against relevant requirements one at a time.

## 5. Save Analysis

Save the drift analysis and show Saved Analysis History.

## 6. Generate Change Request

Open Change Requests, generate a draft from the saved analysis, review the business reason, timeline impact, cost impact, and approval note, then save it.

## 7. Submit And Approve

Submit the saved Change Request for approval.

Open Approvals, review the detail modal, add an optional note, and approve it.

## 8. Evaluation Dashboard

Open:

```text
http://localhost:5173/evaluation
```

Show the Q4_K_M model label, pass rate, latency, cases table, and approval quality cards.

If there is no report, run:

```powershell
python tools\evaluate_q4_quality.py
```

## 9. Billing / Plan

Open:

```text
http://localhost:5173/billing
```

Explain that this is a demo billing surface for SaaS readiness, not real payment processing.
