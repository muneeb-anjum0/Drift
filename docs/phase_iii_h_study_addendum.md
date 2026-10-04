# Phase III-H study-plan addendum — constrained singleton comparison

Recorded after the frozen H-A1 run began, but before any constrained-generation
request or batch experiment. The original preregistration and gate are unchanged.
The directive also requires a like-for-like constrained **single-item** comparison;
the original table omitted an explicit row for it.

H-C0 uses the same P1 prompt and six already selected open-development cases,
one per canonical label: `add_health_01`, `mod_bank_01`, `rem_shop_01`,
`con_health_01`, `amb_health_01`, `same_bank_01`. The only changed variable
relative to each case's H-A1 call is the pinned runtime's request-scoped
`json_schema` for P1's four required fields and canonical label enum. It runs
once per case, sequentially. Report raw strict validity, label agreement against
H-A1 and development labels, tokens, latency, any schema/runtime error, and do
not change model, prompt, output budget, generation settings, parser, or gates.

This addendum is not part of the original freeze, and results must be identified
as such. It does not turn the cases into an independent holdout.

## Post-result diagnostic H-I1 (not part of the gate)

After H-D2's semantic failures became visible, record two exact P1 singleton
comparators for the already-open `g-two-removals` development message against
its `co-guest` and `co-pay` requirements. The other two positive batch cases
have exact-message and exact-requirement singleton comparators in H-A1
(`add_health_01`, `mod_bank_01`), so no repeat is needed. H-I1 is exploratory,
does not alter labels/gates, and does not score unrelated candidates as if P1
had an affectedness/no-target class. Run only these two calls, sequentially.
