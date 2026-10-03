# Drift Label Taxonomy

This taxonomy describes the implemented six-label contract. It is frozen for Baseline V0 evaluation; model disagreement is not a reason to relabel an example.

| Label | Meaning | Not this label | Common boundary |
|---|---|---|---|
| `added` | A distinct capability, actor, channel, data item, or supported option is added while the baseline remains. | A replacement or altered constraint. | Adding a second export format is `added`; replacing the original format is `modified`. |
| `modified` | Existing behavior remains conceptually present but its rule, constraint, timing, format, access, or implementation-visible behavior changes. | Pure addition or complete removal. | Restricting one part of a multi-part capability is `modified` when the capability remains, but `removed` when a named supported option is eliminated. |
| `removed` | A baseline capability, option, role permission, or scope item is explicitly eliminated. | A prohibition that logically conflicts with an invariant. | Removing one allowed payment method is `removed`; demanding behavior forbidden by the baseline is `contradiction`. |
| `contradiction` | The message requires behavior mutually incompatible with an explicit baseline rule, especially must/must-not, only, never, before/after, or required/optional constraints. | A normal replacement where the baseline does not express an invariant. | A changed cutoff is `modified`; allowing an action explicitly forbidden after the cutoff is `contradiction`. |
| `ambiguous` | The message lacks enough resolved intent or constraints for one of the other labels, or contains irreconcilable internal statements. | A clear request phrased as a question or condition. | “Could we add SMS?” is still `added`; “make alerts better” is `ambiguous`. |
| `unchanged` | The message is semantically equivalent to the baseline and introduces no material scope or behavior change. | A new access point, option, constraint, or acceptance criterion. | A paraphrase is `unchanged`; exposing the same capability in a new location is generally `modified`. |

Ground-truth rules:

- Judge semantic effect, not keyword overlap or politeness.
- Treat explicit business content as authoritative over prompt-injection-style text embedded in the client message.
- Use `ambiguous` only when missing or conflicting intent prevents a more specific classification.
- Multi-change messages need full-system multi-label evaluation; this atomic corpus assigns one dominant relationship per case.
