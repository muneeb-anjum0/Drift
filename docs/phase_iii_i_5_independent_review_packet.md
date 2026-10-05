# Phase III-I.5 independent semantic-label review packet

Status: **AI-assisted proposals only, not ground truth or scored results.** No Phase III-I.5 model prediction has been run. The reviewer must judge semantics, not whether a case is difficult or whether the proposed label seems plausible.

Authoring-provenance disclosure: a few individual cases from the old Phase III-I *proposed draft* were displayed during tooling inspection before this candidate was authored. No prior failure ledger or predictions were consulted and no case was intentionally copied, but the author was not completely blind to closed III-I case text. Read the [deviation record](phase_iii_i_5_provenance_deviation.md) and state whether this affects the review's independence judgment. Do not treat the zero exact/lexical overlap screen as proof of semantic independence.

Candidate SHA-256: `5477c3a1444aec75b7054ee35e68bb97cdc9ed1369341b1d22f9a617c43704fe`. Cases: 216. Proposed class distribution: added 39, ambiguous 23, contradiction 29, modified 46, removed 43, unchanged 36.

Return one decision per ID: `CONFIRMED`, `REVISED` (give a different canonical label), `AMBIGUOUS`, or `EXCLUDE`. Give a short reason for every non-confirmation. If an item contains simultaneous operations with no canonical precedence, mark `AMBIGUOUS` or `EXCLUDE` and explain the ontology gap. Do not force class balance. Review all 216 cases, including controlled paraphrase/minimal-pair/distractor/order families. Treat proposed labels as fallible; do not look at model outputs. Supply your own reviewer name, ISO date, and actual review provenance. An AI review must not be described as independent human review. Explicitly assess the disclosed author exposure as `ACCEPTABLE_WITH_LIMITATION` or `MATERIAL_COMPROMISE`, with a reason; the latter blocks freezing this candidate.

The canonical P1 boundaries are: unchanged = no material change; added = new capability/option/actor/channel/data item while baseline remains; removed = explicit baseline capability/option/permission/scope item eliminated even if others remain; modified = existing behavior survives with timing/value/format/access/rule changed; contradiction = incompatibility with an explicit must/must-not/only/never/required/optional/before/after invariant; ambiguous = unresolved/hypothetical/insufficient/internally conflicting intent. A question alone need not be ambiguous. Consider explicit partial removal and invariant priority carefully.

The companion blank JSON template has every ID in order. A signed text list of decisions is also acceptable; Codex can transcribe it without changing the reviewer's choices. Do not use the proposal file as a training set. Prior Phase III-I review was self-attested by the user but not independently observed; this packet does not silently upgrade that provenance.

## s01-01 — community-clinic-messaging / T3

Baseline: The clinic sends appointment reminders by email and SMS; the patient can choose either channel.

Message: Keep email reminders, but take texts off the menu altogether.

Proposed: `removed` — SMS is an explicit option being eliminated.

Family: `s01`; tags: lexical_trap, negation, partial_removal.

## s01-02 — community-clinic-messaging / T1

Baseline: The clinic sends appointment reminders by email and SMS; the patient can choose either channel.

Message: Keep email and text reminders, but send the texts two hours earlier.

Proposed: `modified` — SMS survives with changed timing.

Family: `s01`; tags: modification_control, temporal.

## s01-03 — community-clinic-messaging / T2

Baseline: The clinic sends appointment reminders by email and SMS; the patient can choose either channel.

Message: Patients can still get email. They shouldn't be offered the phone-message option now.

Proposed: `removed` — The SMS choice disappears while email survives.

Family: `s01`; tags: partial_removal, role.

## s01-04 — community-clinic-messaging / T4

Baseline: The clinic sends appointment reminders by email and SMS; the patient can choose either channel.

Message: tiny correction from ops: email stays, txt reminders don't. booking itself is same. The front desk is also redesigning the waiting-room sign, but that belongs to facilities. We had an unrelated conversation about whether appointment cards should be blue or green, and nobody expects that to affect how the reminder system works.

Proposed: `removed` — Only the SMS reminder channel is withdrawn.

Family: `s01`; tags: naturalistic, negation, partial_removal.

## s01-05 — community-clinic-messaging / T2

Baseline: The clinic sends appointment reminders by email and SMS; the patient can choose either channel.

Message: Could the reminder also go to the patient's portal inbox, without changing the existing channels?

Proposed: `added` — A third channel is added.

Family: `s01`; tags: channel, question.

## s01-06 — community-clinic-messaging / T4

Baseline: The clinic sends appointment reminders by email and SMS; the patient can choose either channel.

Message: Maybe we should rethink those reminders? The team hasn't settled what to do with email or texts.

Proposed: `ambiguous` — No definite change is specified.

Family: `s01`; tags: hypothetical, naturalistic.

## s02-01 — museum-access / T3

Baseline: Visitors may enter with a printed ticket or a ticket stored in the museum app; guards verify either at the door.

Message: App tickets are fine; please retire paper admission at the door.

Proposed: `removed` — Printed tickets are removed.

Family: `s02`; tags: lexical_trap, partial_removal.

## s02-02 — museum-access / T1

Baseline: Visitors may enter with a printed ticket or a ticket stored in the museum app; guards verify either at the door.

Message: App and printed tickets should both work, though guards will scan them at the desk rather than the door.

Proposed: `modified` — Both options survive with a changed verification location.

Family: `s02`; tags: modification_control, scope.

## s02-03 — museum-access / T2

Baseline: Visitors may enter with a printed ticket or a ticket stored in the museum app; guards verify either at the door.

Message: The guards should stop taking the printed version, not the one in the app.

Proposed: `removed` — One named admission format is withdrawn.

Family: `s02`; tags: negation, partial_removal.

## s02-04 — museum-access / T4

Baseline: Visitors may enter with a printed ticket or a ticket stored in the museum app; guards verify either at the door.

Message: Sorry, confusing note earlier. mobile pass yes; the printout no longer counts. door team unchanged. The exhibition team is installing new floor labels next week. Security asked whether that changes ticket scanning, and the answer is no: the entry workflow itself stays at the same door with the same guard role.

Proposed: `removed` — The printout ceases to be accepted.

Family: `s02`; tags: naturalistic, negation, partial_removal.

## s02-05 — museum-access / T2

Baseline: Visitors may enter with a printed ticket or a ticket stored in the museum app; guards verify either at the door.

Message: Keep checking both forms at entry; the sign explaining it could use friendlier wording.

Proposed: `unchanged` — Only signage copy changes, not ticket acceptance.

Family: `s02`; tags: distractor, lexical_trap.

## s02-06 — museum-access / T4

Baseline: Visitors may enter with a printed ticket or a ticket stored in the museum app; guards verify either at the door.

Message: can we take a PDF pass too? not replacing paper or the app, just another way in

Proposed: `added` — PDF is an additional ticket format.

Family: `s02`; tags: channel, naturalistic.

## s03-01 — cold-storage-monitoring / T3

Baseline: A warehouse sensor records freezer temperature every five minutes and displays readings in Celsius and Fahrenheit.

Message: Change the sampling interval to two minutes; don't change what the probe measures.

Proposed: `modified` — Existing sampling continues at a new frequency.

Family: `s03`; tags: lexical_trap, negation, numeric, temporal.

## s03-02 — cold-storage-monitoring / T1

Baseline: A warehouse sensor records freezer temperature every five minutes and displays readings in Celsius and Fahrenheit.

Message: Keep the five-minute Celsius reading and also show a Fahrenheit conversion.

Proposed: `added` — A new display option is added.

Family: `s03`; tags: channel, numeric.

## s03-03 — cold-storage-monitoring / T2

Baseline: A warehouse sensor records freezer temperature every five minutes and displays readings in Celsius and Fahrenheit.

Message: The freezer still needs a temperature point, only more often: every two minutes.

Proposed: `modified` — The interval changes, not the capability.

Family: `s03`; tags: modification_control, numeric, temporal.

## s03-04 — cold-storage-monitoring / T4

Baseline: A warehouse sensor records freezer temperature every five minutes and displays readings in Celsius and Fahrenheit.

Message: ops says 5 min feels laggy; make it 2. still Celsius, still the same probe. Facilities is pricing replacement freezer doors and the procurement spreadsheet has several draft quotes. Those costs are not part of this request; they are background from the same meeting and have no effect on the sensor's actual data fields.

Proposed: `modified` — The measurement frequency changes.

Family: `s03`; tags: naturalistic, numeric.

## s03-05 — cold-storage-monitoring / T2

Baseline: A warehouse sensor records freezer temperature every five minutes and displays readings in Celsius and Fahrenheit.

Message: Stop showing Celsius while retaining the temperature record in Fahrenheit.

Proposed: `removed` — The explicit Celsius display is removed.

Family: `s03`; tags: negation, partial_removal.

## s03-06 — cold-storage-monitoring / T4

Baseline: A warehouse sensor records freezer temperature every five minutes and displays readings in Celsius and Fahrenheit.

Message: maybe faster sampling? need to ask facilities what interval they actually want

Proposed: `ambiguous` — No final interval or instruction is settled.

Family: `s03`; tags: hypothetical, naturalistic.

## s04-01 — school-transcripts / T3

Baseline: The transcript portal must never show an unpublished grade to students; teachers may preview unpublished grades.

Message: Keep that privacy rule, but let students peek at grades before publication.

Proposed: `contradiction` — Student preview violates the explicit never invariant.

Family: `s04`; tags: lexical_trap, role.

## s04-02 — school-transcripts / T1

Baseline: The transcript portal must never show an unpublished grade to students; teachers may preview unpublished grades.

Message: Let department heads preview unpublished grades as teachers already do; students still cannot.

Proposed: `added` — A new authorized preview actor is added without violating the student ban.

Family: `s04`; tags: permission, role.

## s04-03 — school-transcripts / T2

Baseline: The transcript portal must never show an unpublished grade to students; teachers may preview unpublished grades.

Message: A student preview link should work while the grade is still unpublished, even if it's read-only.

Proposed: `contradiction` — Read-only visibility still breaks the invariant.

Family: `s04`; tags: role, scope.

## s04-04 — school-transcripts / T4

Baseline: The transcript portal must never show an unpublished grade to students; teachers may preview unpublished grades.

Message: i know it says never for students, but could we show them draft marks just for a minute? yes please ship that The teacher dashboard has an open accessibility bug about contrast, and the school plans to handle it separately. The proposed visibility change below is specifically about the grade record and who can see it before publication.

Proposed: `contradiction` — A definite request violates the student-visibility prohibition.

Family: `s04`; tags: lexical_trap, naturalistic, negation, role.

## s04-05 — school-transcripts / T2

Baseline: The transcript portal must never show an unpublished grade to students; teachers may preview unpublished grades.

Message: Teachers can keep previewing drafts; publish the student-facing grades only when released.

Proposed: `unchanged` — The stated visibility boundary is preserved.

Family: `s04`; tags: negation, role.

## s04-06 — school-transcripts / T4

Baseline: The transcript portal must never show an unpublished grade to students; teachers may preview unpublished grades.

Message: Can we revisit who sees the draft? not decided whether that means staff or pupils yet

Proposed: `ambiguous` — The actor and decision are unresolved.

Family: `s04`; tags: naturalistic, role.

## s05-01 — rail-pass-renewal / T3

Baseline: Commuters can renew a monthly rail pass in the app or at a station kiosk before the pass expires.

Message: Leave renewal in the app, but drop kiosk renewals. The expiry rule stays.

Proposed: `removed` — The kiosk channel is explicitly eliminated.

Family: `s05`; tags: lexical_trap, partial_removal, temporal.

## s05-02 — rail-pass-renewal / T1

Baseline: Commuters can renew a monthly rail pass in the app or at a station kiosk before the pass expires.

Message: Keep both renewal channels but allow renewal for two days after expiry.

Proposed: `modified` — Renewal survives with a changed time window.

Family: `s05`; tags: modification_control, temporal.

## s05-03 — rail-pass-renewal / T2

Baseline: Commuters can renew a monthly rail pass in the app or at a station kiosk before the pass expires.

Message: Station kiosks will no longer renew passes; passengers still have the app before expiry.

Proposed: `removed` — The kiosk option is removed.

Family: `s05`; tags: negation, partial_removal.

## s05-04 — rail-pass-renewal / T4

Baseline: Commuters can renew a monthly rail pass in the app or at a station kiosk before the pass expires.

Message: quick one: the app route is good. kiosk renewal is out of scope now, not kiosk sales in general Marketing also asked for new rail-pass artwork and a different welcome email. Neither request concerns the renewal channel, and the customer-service team has not asked to alter pass pricing or the expiry rule.

Proposed: `removed` — Only kiosk renewal is withdrawn.

Family: `s05`; tags: naturalistic, partial_removal, scope.

## s05-05 — rail-pass-renewal / T2

Baseline: Commuters can renew a monthly rail pass in the app or at a station kiosk before the pass expires.

Message: Could riders also renew through the website while app and kiosk remain?

Proposed: `added` — The website is an additional renewal channel.

Family: `s05`; tags: channel, question.

## s05-06 — rail-pass-renewal / T4

Baseline: Commuters can renew a monthly rail pass in the app or at a station kiosk before the pass expires.

Message: The kiosk screen can have nicer colours, sure, but renewal still needs to work there and in-app before expiry.

Proposed: `unchanged` — Only presentation changes.

Family: `s05`; tags: distractor, naturalistic.

## s06-01 — expense-approval / T3

Baseline: A manager must approve an employee expense over 500 dollars before finance pays it; employees may draft expenses without approval.

Message: Keep the manager gate, but pay an $800 claim first and get approval afterward.

Proposed: `contradiction` — Paying before required approval violates the invariant.

Family: `s06`; tags: lexical_trap, numeric, temporal.

## s06-02 — expense-approval / T1

Baseline: A manager must approve an employee expense over 500 dollars before finance pays it; employees may draft expenses without approval.

Message: Require manager approval before payment for expenses over $400 rather than $500.

Proposed: `modified` — The approval gate remains with a new threshold.

Family: `s06`; tags: modification_control, numeric.

## s06-03 — expense-approval / T2

Baseline: A manager must approve an employee expense over 500 dollars before finance pays it; employees may draft expenses without approval.

Message: For a claim above the limit, finance should release funds while the manager's decision is still pending.

Proposed: `contradiction` — Payment precedes mandatory approval.

Family: `s06`; tags: role, temporal.

## s06-04 — expense-approval / T4

Baseline: A manager must approve an employee expense over 500 dollars before finance pays it; employees may draft expenses without approval.

Message: hey, big reimbursements are taking ages. Can payroll send them now and chase the signoff later? yes, even the $900 ones The finance dashboard's table headers are being reviewed by design. That is unrelated to when a claim is paid. The approval record and the manager's identity would still be stored for audit purposes.

Proposed: `contradiction` — A definite post-payment approval request conflicts with the before invariant.

Family: `s06`; tags: naturalistic, numeric, role.

## s06-05 — expense-approval / T2

Baseline: A manager must approve an employee expense over 500 dollars before finance pays it; employees may draft expenses without approval.

Message: Let employees save drafts without manager involvement, then keep the pre-payment gate for large claims.

Proposed: `unchanged` — Existing draft and approval behavior are restated.

Family: `s06`; tags: distractor, role.

## s06-06 — expense-approval / T4

Baseline: A manager must approve an employee expense over 500 dollars before finance pays it; employees may draft expenses without approval.

Message: Could finance send a receipt after approved payouts? approvals still happen first of course

Proposed: `added` — A receipt is added without changing the approval gate.

Family: `s06`; tags: naturalistic, temporal.

## s07-01 — photo-backup / T3

Baseline: The backup app saves original photos to local storage and to the user's cloud vault when both destinations are enabled.

Message: Keep the cloud copy, but remove the local copy from the backup flow.

Proposed: `removed` — Local storage is a named baseline destination being removed.

Family: `s07`; tags: lexical_trap, partial_removal.

## s07-02 — photo-backup / T1

Baseline: The backup app saves original photos to local storage and to the user's cloud vault when both destinations are enabled.

Message: Keep both copies, but upload the cloud one overnight instead of immediately.

Proposed: `modified` — Both destinations survive with changed timing.

Family: `s07`; tags: modification_control, temporal.

## s07-03 — photo-backup / T2

Baseline: The backup app saves original photos to local storage and to the user's cloud vault when both destinations are enabled.

Message: There should be no on-device backup file; the vault copy still happens.

Proposed: `removed` — The local destination is eliminated.

Family: `s07`; tags: negation, partial_removal.

## s07-04 — photo-backup / T4

Baseline: The backup app saves original photos to local storage and to the user's cloud vault when both destinations are enabled.

Message: phone storage is filling up. please cloud-only the backup; gallery display isn't what I'm asking to delete The gallery layout is changing on older phones and the photo editor may receive a new toolbar. Those are separate client tickets; this note is limited to what the backup engine writes to each destination.

Proposed: `removed` — Local backup storage is withdrawn.

Family: `s07`; tags: naturalistic, partial_removal, scope.

## s07-05 — photo-backup / T2

Baseline: The backup app saves original photos to local storage and to the user's cloud vault when both destinations are enabled.

Message: Add an optional encrypted USB backup alongside the current two destinations.

Proposed: `added` — A third backup destination is added.

Family: `s07`; tags: channel, security.

## s07-06 — photo-backup / T4

Baseline: The backup app saves original photos to local storage and to the user's cloud vault when both destinations are enabled.

Message: what if we don't keep every copy? not sure which place we'd trim yet

Proposed: `ambiguous` — Destination choice is unresolved.

Family: `s07`; tags: hypothetical, naturalistic.

## s08-01 — marketplace-disputes / T3

Baseline: If a buyer opens a dispute, the platform emails both buyer and seller within one hour and keeps the dispute visible in the portal.

Message: The portal record stays, and sellers still get the email; buyers no longer need that email.

Proposed: `removed` — The buyer email is explicitly removed.

Family: `s08`; tags: negation, partial_removal, role.

## s08-02 — marketplace-disputes / T1

Baseline: If a buyer opens a dispute, the platform emails both buyer and seller within one hour and keeps the dispute visible in the portal.

Message: Email both parties within thirty minutes; keep the portal record.

Proposed: `modified` — Both notifications survive with a shorter deadline.

Family: `s08`; tags: modification_control, numeric, temporal.

## s08-03 — marketplace-disputes / T2

Baseline: If a buyer opens a dispute, the platform emails both buyer and seller within one hour and keeps the dispute visible in the portal.

Message: Skip only the buyer's dispute email, not the seller's or the portal entry.

Proposed: `removed` — One actor's notification capability is removed.

Family: `s08`; tags: partial_removal, role.

## s08-04 — marketplace-disputes / T4

Baseline: If a buyer opens a dispute, the platform emails both buyer and seller within one hour and keeps the dispute visible in the portal.

Message: support clarified: no buyer mail on new disputes pls. seller gets theirs; portal page isn't going away The support team is updating its internal dispute playbook and discussing response scripts. Those changes are not part of the product behavior requested here, and the portal record must still be created for each dispute.

Proposed: `removed` — Buyer email is withdrawn while the other outputs persist.

Family: `s08`; tags: naturalistic, partial_removal, role.

## s08-05 — marketplace-disputes / T2

Baseline: If a buyer opens a dispute, the platform emails both buyer and seller within one hour and keeps the dispute visible in the portal.

Message: Add a push alert for the buyer, while keeping both existing emails and the portal record.

Proposed: `added` — A new notification channel is added.

Family: `s08`; tags: channel, role.

## s08-06 — marketplace-disputes / T4

Baseline: If a buyer opens a dispute, the platform emails both buyer and seller within one hour and keeps the dispute visible in the portal.

Message: Can we rename the dispute tab? no change to the emails, timing, or record itself

Proposed: `unchanged` — The requirement's behavior is unchanged.

Family: `s08`; tags: distractor, naturalistic.

## s09-01 — api-key-management / T3

Baseline: Only workspace owners may revoke an API key; editors may view a key's last-used timestamp but must not see the secret value.

Message: Keep owners as revokers; editors should also be able to revoke stale keys.

Proposed: `contradiction` — Editor revocation violates the only-owners invariant.

Family: `s09`; tags: lexical_trap, permission, role.

## s09-02 — api-key-management / T1

Baseline: Only workspace owners may revoke an API key; editors may view a key's last-used timestamp but must not see the secret value.

Message: Let editors export the last-used timestamps as CSV; secret values stay hidden.

Proposed: `added` — A timestamp export is added without breaking the secret restriction.

Family: `s09`; tags: format, role.

## s09-03 — api-key-management / T2

Baseline: Only workspace owners may revoke an API key; editors may view a key's last-used timestamp but must not see the secret value.

Message: An editor should be allowed to disable a compromised key immediately, even before an owner reviews it.

Proposed: `contradiction` — Editor disable/revocation conflicts with the exclusive owner permission.

Family: `s09`; tags: role, temporal.

## s09-04 — api-key-management / T4

Baseline: Only workspace owners may revoke an API key; editors may view a key's last-used timestamp but must not see the secret value.

Message: in an incident the editor on call needs to kill the key. owner can be asleep; let's enable that role Operations has a parallel ticket to revise how incident notes are filed. That ticket does not change how an API key is revoked or who can do it. Please keep these work items separate when reading the request.

Proposed: `contradiction` — The proposed editor revocation violates the owner-only invariant.

Family: `s09`; tags: naturalistic, permission, role.

## s09-05 — api-key-management / T2

Baseline: Only workspace owners may revoke an API key; editors may view a key's last-used timestamp but must not see the secret value.

Message: Keep secret values away from editors; last-used time is still visible to them.

Proposed: `unchanged` — The view boundary is restated.

Family: `s09`; tags: negation, role.

## s09-06 — api-key-management / T4

Baseline: Only workspace owners may revoke an API key; editors may view a key's last-used timestamp but must not see the secret value.

Message: Could the on-call person maybe get 'more control' over keys? we haven't decided which role or action

Proposed: `ambiguous` — Actor and permission are unresolved.

Family: `s09`; tags: hypothetical, naturalistic, role.

## s10-01 — sports-booking / T3

Baseline: Players may reserve a court for a 30-minute or 60-minute session; both durations appear in the booking picker.

Message: Make the half-hour slot unavailable. The hour slot is still bookable.

Proposed: `removed` — The 30-minute option is removed.

Family: `s10`; tags: lexical_trap, numeric, partial_removal.

## s10-02 — sports-booking / T1

Baseline: Players may reserve a court for a 30-minute or 60-minute session; both durations appear in the booking picker.

Message: Keep both durations but start every reservation ten minutes later than the displayed slot time.

Proposed: `modified` — Both options remain with changed start timing.

Family: `s10`; tags: modification_control, numeric, temporal.

## s10-03 — sports-booking / T2

Baseline: Players may reserve a court for a 30-minute or 60-minute session; both durations appear in the booking picker.

Message: People should only be offered the hour-long court session from now on.

Proposed: `removed` — The half-hour baseline option disappears.

Family: `s10`; tags: numeric, partial_removal.

## s10-04 — sports-booking / T4

Baseline: Players may reserve a court for a 30-minute or 60-minute session; both durations appear in the booking picker.

Message: small booking tweak: 30m is gone, 60m isn't. don't touch court inventory The court operator is redoing the lobby poster and pricing table, neither of which belongs to this booking change. We are talking about which duration the picker actually offers, not how the options are advertised.

Proposed: `removed` — The 30-minute option is eliminated.

Family: `s10`; tags: naturalistic, numeric, partial_removal.

## s10-05 — sports-booking / T2

Baseline: Players may reserve a court for a 30-minute or 60-minute session; both durations appear in the booking picker.

Message: Could we offer a 45-minute slot as well as the two existing lengths?

Proposed: `added` — A third duration is added.

Family: `s10`; tags: numeric, question.

## s10-06 — sports-booking / T4

Baseline: Players may reserve a court for a 30-minute or 60-minute session; both durations appear in the booking picker.

Message: maybe drop a length? haven't picked which one, and maybe we'd keep both after all

Proposed: `ambiguous` — No definite option removal is chosen.

Family: `s10`; tags: hypothetical, naturalistic.

## s11-01 — library-discovery / T3

Baseline: Readers can filter the catalogue by author or by subject; the filter panel works on desktop and mobile.

Message: Add language as another filter; don't replace author or subject.

Proposed: `added` — Language is a new filter option.

Family: `s11`; tags: lexical_trap, scope.

## s11-02 — library-discovery / T1

Baseline: Readers can filter the catalogue by author or by subject; the filter panel works on desktop and mobile.

Message: Keep author and subject filtering on both devices; rename the panel heading.

Proposed: `unchanged` — Only panel copy changes.

Family: `s11`; tags: distractor.

## s11-03 — library-discovery / T2

Baseline: Readers can filter the catalogue by author or by subject; the filter panel works on desktop and mobile.

Message: Let readers narrow results by language too. The existing author and subject controls stay.

Proposed: `added` — A third filtering facet is added.

Family: `s11`; tags: distractor, scope.

## s11-04 — library-discovery / T4

Baseline: Readers can filter the catalogue by author or by subject; the filter panel works on desktop and mobile.

Message: Side note: the mobile header is cramped and design will fix it later. For this ticket, add a language facet, leave the old filters alone. Library volunteers also mentioned a slow loading animation on the mobile page. That performance discussion is separate from the catalog filter behavior. The author and subject facets must continue to work on both device sizes.

Proposed: `added` — Irrelevant UI context does not alter the added filter.

Family: `s11`; tags: distractor, naturalistic.

## s11-05 — library-discovery / T2

Baseline: Readers can filter the catalogue by author or by subject; the filter panel works on desktop and mobile.

Message: Keep subject filtering, but stop offering author filtering on both desktop and mobile.

Proposed: `removed` — Author filtering is withdrawn.

Family: `s11`; tags: order, partial_removal.

## s11-06 — library-discovery / T4

Baseline: Readers can filter the catalogue by author or by subject; the filter panel works on desktop and mobile.

Message: On both devices, author filtering goes away; subject filtering stays. sorry for the wordy note.

Proposed: `removed` — Clause order changes, not the removal.

Family: `s11`; tags: naturalistic, order, partial_removal.

## s12-01 — payroll-export / T3

Baseline: Payroll clerks may export the monthly pay register as CSV, and each export includes employee ID and net pay.

Message: Change the export cadence to weekly; CSV and both columns remain.

Proposed: `modified` — The existing export occurs more frequently.

Family: `s12`; tags: lexical_trap, modification_control, temporal.

## s12-02 — payroll-export / T1

Baseline: Payroll clerks may export the monthly pay register as CSV, and each export includes employee ID and net pay.

Message: Omit employee ID from the CSV; net pay and the export remain.

Proposed: `removed` — One explicit output field is eliminated.

Family: `s12`; tags: partial_removal, scope.

## s12-03 — payroll-export / T2

Baseline: Payroll clerks may export the monthly pay register as CSV, and each export includes employee ID and net pay.

Message: Clerks still need the same CSV fields; generate the register every week instead of monthly.

Proposed: `modified` — Only frequency changes.

Family: `s12`; tags: distractor, temporal.

## s12-04 — payroll-export / T4

Baseline: Payroll clerks may export the monthly pay register as CSV, and each export includes employee ID and net pay.

Message: Finance mentioned filenames too, but that's a separate ticket. This one is weekly CSV, same ID/net fields. Finance will separately review the export filename and where it is stored on the shared drive. Neither of those housekeeping questions changes the content columns or the cadence requested in this ticket.

Proposed: `modified` — Filename context is irrelevant to a frequency modification.

Family: `s12`; tags: distractor, naturalistic, temporal.

## s12-05 — payroll-export / T2

Baseline: Payroll clerks may export the monthly pay register as CSV, and each export includes employee ID and net pay.

Message: Add gross pay as a third column, while preserving employee ID and net pay.

Proposed: `added` — An output field is added.

Family: `s12`; tags: order, scope.

## s12-06 — payroll-export / T4

Baseline: Payroll clerks may export the monthly pay register as CSV, and each export includes employee ID and net pay.

Message: Keep ID and net pay, and put gross pay in there too. monthly CSV otherwise unchanged.

Proposed: `added` — Clause order changes but the new field is the same.

Family: `s12`; tags: naturalistic, order.

## s13-01 — bike-share / T3

Baseline: Riders unlock a bike with an app QR code, and a ride receipt appears in the app after the bike is returned.

Message: Show the same receipt immediately at unlock instead of at return; QR unlock still works.

Proposed: `modified` — Receipt timing changes while both capabilities survive.

Family: `s13`; tags: lexical_trap, modification_control, temporal.

## s13-02 — bike-share / T1

Baseline: Riders unlock a bike with an app QR code, and a ride receipt appears in the app after the bike is returned.

Message: Could receipts maybe happen earlier? We have not chosen when.

Proposed: `ambiguous` — Receipt timing is unresolved.

Family: `s13`; tags: hypothetical, temporal.

## s13-03 — bike-share / T2

Baseline: Riders unlock a bike with an app QR code, and a ride receipt appears in the app after the bike is returned.

Message: The receipt should arrive when the ride starts, not when it ends. Nothing about unlocking changes.

Proposed: `modified` — Receipt timing is set to the start.

Family: `s13`; tags: distractor, temporal.

## s13-04 — bike-share / T4

Baseline: Riders unlock a bike with an app QR code, and a ride receipt appears in the app after the bike is returned.

Message: QR scans are a little flaky but that's for another ticket. here: receipt at start of trip, not at dock-back.

Proposed: `modified` — QR commentary is irrelevant to a definite receipt-timing change.

Family: `s13`; tags: distractor, naturalistic, temporal.

## s13-05 — bike-share / T2

Baseline: Riders unlock a bike with an app QR code, and a ride receipt appears in the app after the bike is returned.

Message: Retain the QR unlock; discontinue the in-app ride receipt entirely.

Proposed: `removed` — The explicit receipt capability is eliminated.

Family: `s13`; tags: order, partial_removal.

## s13-06 — bike-share / T4

Baseline: Riders unlock a bike with an app QR code, and a ride receipt appears in the app after the bike is returned.

Message: No receipt in the app anymore, but leave the QR unlock alone pls.

Proposed: `removed` — Clause order does not alter removal of the receipt.

Family: `s13`; tags: naturalistic, negation, order.

## s14-01 — court-filing / T3

Baseline: A filing must be signed by the submitting lawyer before it is transmitted; clerks may preview the unsigned draft.

Message: Keep the signature rule, but transmit urgent unsigned filings and have counsel sign later.

Proposed: `contradiction` — Transmission before required signature violates the invariant.

Family: `s14`; tags: lexical_trap, temporal.

## s14-02 — court-filing / T1

Baseline: A filing must be signed by the submitting lawyer before it is transmitted; clerks may preview the unsigned draft.

Message: Keep signatures before transmission; add a 24-hour reminder to the lawyer if the draft is still unsigned.

Proposed: `added` — A reminder is added without relaxing the signing gate.

Family: `s14`; tags: addition, temporal.

## s14-03 — court-filing / T2

Baseline: A filing must be signed by the submitting lawyer before it is transmitted; clerks may preview the unsigned draft.

Message: Urgent filings should go out before the lawyer signs, with signature collected afterward.

Proposed: `contradiction` — The required order is reversed.

Family: `s14`; tags: distractor, temporal.

## s14-04 — court-filing / T4

Baseline: A filing must be signed by the submitting lawyer before it is transmitted; clerks may preview the unsigned draft.

Message: Clerks asked for bigger preview text, separate thing. For this one, send first, sign after if it's urgent.

Proposed: `contradiction` — UI detail distracts from an incompatible transmission order.

Family: `s14`; tags: distractor, naturalistic, temporal.

## s14-05 — court-filing / T2

Baseline: A filing must be signed by the submitting lawyer before it is transmitted; clerks may preview the unsigned draft.

Message: Counsel signs before sending; the clerk can still inspect an unsigned draft.

Proposed: `unchanged` — The signing and preview order is preserved.

Family: `s14`; tags: order, temporal.

## s14-06 — court-filing / T4

Baseline: A filing must be signed by the submitting lawyer before it is transmitted; clerks may preview the unsigned draft.

Message: Clerk preview is fine while unsigned; don't actually send until lawyer's signature is there.

Proposed: `unchanged` — Clause order differs but behavior is unchanged.

Family: `s14`; tags: naturalistic, negation, order.

## s15-01 — warehouse-returns / T3

Baseline: Receiving staff record returned parcels and supervisors approve disposal; staff can place parcels in quarantine pending review.

Message: Supervisors still approve disposal, but take quarantine off the receiving team's options.

Proposed: `removed` — One explicit staff capability is removed.

Family: `s15`; tags: lexical_trap, partial_removal, role.

## s15-02 — warehouse-returns / T1

Baseline: Receiving staff record returned parcels and supervisors approve disposal; staff can place parcels in quarantine pending review.

Message: Keep quarantine and disposal approval, but have staff record returns within two hours rather than at intake.

Proposed: `modified` — Return logging survives with changed timing.

Family: `s15`; tags: modification_control, temporal.

## s15-03 — warehouse-returns / T2

Baseline: Receiving staff record returned parcels and supervisors approve disposal; staff can place parcels in quarantine pending review.

Message: The team may log returns as before; they must not park them in quarantine anymore.

Proposed: `removed` — Quarantine is withdrawn.

Family: `s15`; tags: distractor, negation, partial_removal.

## s15-04 — warehouse-returns / T4

Baseline: Receiving staff record returned parcels and supervisors approve disposal; staff can place parcels in quarantine pending review.

Message: we still need parcel logging and boss signoff. quarantine button is confusing though—please remove that workflow, not just the text

Proposed: `removed` — Quarantine capability itself is removed.

Family: `s15`; tags: distractor, naturalistic, partial_removal.

## s15-05 — warehouse-returns / T2

Baseline: Receiving staff record returned parcels and supervisors approve disposal; staff can place parcels in quarantine pending review.

Message: Let auditors view the disposal approval log, without altering staff or supervisor powers.

Proposed: `added` — A read-only actor capability is added.

Family: `s15`; tags: order, role.

## s15-06 — warehouse-returns / T4

Baseline: Receiving staff record returned parcels and supervisors approve disposal; staff can place parcels in quarantine pending review.

Message: Staff and supervisor steps stay put; auditors can now read the disposal log. that's it.

Proposed: `added` — Clause order leaves the additional auditor access intact.

Family: `s15`; tags: naturalistic, order, role.

## s16-01 — subscription-billing / T3

Baseline: Customers may pay subscription invoices by card or bank transfer and can download a PDF receipt after settlement.

Message: Leave bank transfer in place; card payments should no longer be accepted for these invoices.

Proposed: `removed` — One explicit payment mechanism is removed.

Family: `s16`; tags: lexical_trap, negation, partial_removal.

## s16-02 — subscription-billing / T1

Baseline: Customers may pay subscription invoices by card or bank transfer and can download a PDF receipt after settlement.

Message: Retain card and transfer, but make receipts available before settlement instead of after.

Proposed: `modified` — The receipt survives with changed timing.

Family: `s16`; tags: modification_control, temporal.

## s16-03 — subscription-billing / T2

Baseline: Customers may pay subscription invoices by card or bank transfer and can download a PDF receipt after settlement.

Message: The finance portal can still take transfers. Take the card route out of subscription checkout.

Proposed: `removed` — Card payment is eliminated.

Family: `s16`; tags: distractor, partial_removal.

## s16-04 — subscription-billing / T4

Baseline: Customers may pay subscription invoices by card or bank transfer and can download a PDF receipt after settlement.

Message: unrelated: receipt PDF typography needs love. actual change is no cards for subs; transfers okay.

Proposed: `removed` — The typography remark does not change the card removal.

Family: `s16`; tags: distractor, naturalistic, partial_removal.

## s16-05 — subscription-billing / T2

Baseline: Customers may pay subscription invoices by card or bank transfer and can download a PDF receipt after settlement.

Message: Offer direct debit alongside the existing card and transfer routes; receipts stay as they are.

Proposed: `added` — A third payment mechanism is added.

Family: `s16`; tags: order.

## s16-06 — subscription-billing / T4

Baseline: Customers may pay subscription invoices by card or bank transfer and can download a PDF receipt after settlement.

Message: Keep the receipt thing and both current payment methods. Direct debit too, please.

Proposed: `added` — Clause order leaves the additional payment method intact.

Family: `s16`; tags: naturalistic, order.

## s17-01 — factory-safety / T3

Baseline: A machine must not restart while its maintenance lock is engaged; operators may inspect status during lockout, and the status display refreshes every five seconds.

Message: Keep the lock indicator, but let a supervisor restart the motor before removing the maintenance lock.

Proposed: `contradiction` — Restart during lockout violates the explicit prohibition.

Family: `s17`; tags: lexical_trap, role.

## s17-02 — factory-safety / T1

Baseline: A machine must not restart while its maintenance lock is engaged; operators may inspect status during lockout, and the status display refreshes every five seconds.

Message: Keep restart blocked during lockout; refresh the status display every second instead of every five.

Proposed: `modified` — The existing display refresh interval changes.

Family: `s17`; tags: modification_control, numeric.

## s17-03 — factory-safety / T2

Baseline: A machine must not restart while its maintenance lock is engaged; operators may inspect status during lockout, and the status display refreshes every five seconds.

Message: While the lock remains engaged, a remote operator should be able to resume the machine.

Proposed: `contradiction` — Restart under lock is forbidden.

Family: `s17`; tags: distractor, role.

## s17-04 — factory-safety / T4

Baseline: A machine must not restart while its maintenance lock is engaged; operators may inspect status during lockout, and the status display refreshes every five seconds.

Message: Safety still owns the lock process; remote restart during a locked service window would save time. yes, enable it.

Proposed: `contradiction` — Context does not remove the lockout invariant.

Family: `s17`; tags: distractor, naturalistic, role.

## s17-05 — factory-safety / T2

Baseline: A machine must not restart while its maintenance lock is engaged; operators may inspect status during lockout, and the status display refreshes every five seconds.

Message: Operators can inspect status during maintenance, and the machine stays stopped until unlocked.

Proposed: `unchanged` — The inspection and restart constraints remain.

Family: `s17`; tags: order.

## s17-06 — factory-safety / T4

Baseline: A machine must not restart while its maintenance lock is engaged; operators may inspect status during lockout, and the status display refreshes every five seconds.

Message: while locked, show status to ops. no restart till lock is off, obviously.

Proposed: `unchanged` — Clause order and casual wording preserve the rule.

Family: `s17`; tags: naturalistic, negation, order.

## s18-01 — hr-onboarding / T3

Baseline: New employees upload identity documents to the HR portal; HR officers verify them and employees can view the verification status.

Message: Let team leads see the status too; HR still verifies and employees still see their own status.

Proposed: `added` — A new viewer role is added.

Family: `s18`; tags: lexical_trap, role.

## s18-02 — hr-onboarding / T1

Baseline: New employees upload identity documents to the HR portal; HR officers verify them and employees can view the verification status.

Message: Keep HR as the verifier and employees as status viewers; change the portal heading to 'Onboarding'.

Proposed: `unchanged` — Only UI wording changes.

Family: `s18`; tags: distractor.

## s18-03 — hr-onboarding / T2

Baseline: New employees upload identity documents to the HR portal; HR officers verify them and employees can view the verification status.

Message: Keep the current identity workflow and expose status to the recruit's team lead as well.

Proposed: `added` — Another actor gains status visibility.

Family: `s18`; tags: distractor, role.

## s18-04 — hr-onboarding / T4

Baseline: New employees upload identity documents to the HR portal; HR officers verify them and employees can view the verification status.

Message: Design also wants a new icon, but that's later. Main ask: lead can read status, not verify docs.

Proposed: `added` — Icon commentary does not alter the added lead-view capability.

Family: `s18`; tags: distractor, naturalistic, role.

## s18-05 — hr-onboarding / T2

Baseline: New employees upload identity documents to the HR portal; HR officers verify them and employees can view the verification status.

Message: Employees should still upload documents, but remove their status view; HR verification remains.

Proposed: `removed` — Employee status visibility is eliminated.

Family: `s18`; tags: order, partial_removal, role.

## s18-06 — hr-onboarding / T4

Baseline: New employees upload identity documents to the HR portal; HR officers verify them and employees can view the verification status.

Message: HR still checks the ID and new hires still upload it. they just don't get to see the status anymore.

Proposed: `removed` — Clause order preserves the status-view removal.

Family: `s18`; tags: naturalistic, negation, order, role.

## s19-01 — water-usage / T3

Baseline: The utility dashboard shows daily water consumption in litres and lets households download a monthly CSV summary.

Message: Display the same daily amount in cubic metres; keep the monthly download.

Proposed: `modified` — The display unit changes while usage reporting survives.

Family: `s19`; tags: lexical_trap, modification_control, numeric.

## s19-02 — water-usage / T1

Baseline: The utility dashboard shows daily water consumption in litres and lets households download a monthly CSV summary.

Message: End the monthly CSV download, but keep daily consumption on screen.

Proposed: `removed` — A named export capability is removed.

Family: `s19`; tags: partial_removal.

## s19-03 — water-usage / T2

Baseline: The utility dashboard shows daily water consumption in litres and lets households download a monthly CSV summary.

Message: The daily chart is still there; express volume in m³ instead of L.

Proposed: `modified` — A display unit changes.

Family: `s19`; tags: distractor, numeric.

## s19-04 — water-usage / T4

Baseline: The utility dashboard shows daily water consumption in litres and lets households download a monthly CSV summary.

Message: CSV isn't the issue. change the daily chart units to m3 so it matches bills, same measurements.

Proposed: `modified` — CSV context is irrelevant to the unit modification.

Family: `s19`; tags: distractor, naturalistic, numeric.

## s19-05 — water-usage / T2

Baseline: The utility dashboard shows daily water consumption in litres and lets households download a monthly CSV summary.

Message: Add a weekly PDF digest without removing the daily chart or monthly CSV.

Proposed: `added` — A new summary is added.

Family: `s19`; tags: format, order.

## s19-06 — water-usage / T4

Baseline: The utility dashboard shows daily water consumption in litres and lets households download a monthly CSV summary.

Message: Daily chart + monthly CSV stay. also could we have a weekly PDF? yes that's the ask.

Proposed: `added` — Clause order does not alter the added digest.

Family: `s19`; tags: format, naturalistic, order.

## s20-01 — telemedicine-consent / T3

Baseline: Clinicians must obtain patient consent before recording a video visit; the consent prompt appears when the call begins, and patients may withdraw consent at any time to stop recording.

Message: Keep the consent banner, but begin recording before patients respond so we don't miss the greeting.

Proposed: `contradiction` — Recording before consent violates the explicit invariant.

Family: `s20`; tags: lexical_trap, temporal.

## s20-02 — telemedicine-consent / T1

Baseline: Clinicians must obtain patient consent before recording a video visit; the consent prompt appears when the call begins, and patients may withdraw consent at any time to stop recording.

Message: Show the consent prompt during scheduling instead of at call start; recording still waits for consent.

Proposed: `modified` — The existing prompt moves earlier without weakening the consent rule.

Family: `s20`; tags: modification_control, temporal.

## s20-03 — telemedicine-consent / T2

Baseline: Clinicians must obtain patient consent before recording a video visit; the consent prompt appears when the call begins, and patients may withdraw consent at any time to stop recording.

Message: Capture the start of the call, then ask permission to keep that footage.

Proposed: `contradiction` — Capture occurs before mandatory consent.

Family: `s20`; tags: distractor, temporal.

## s20-04 — telemedicine-consent / T4

Baseline: Clinicians must obtain patient consent before recording a video visit; the consent prompt appears when the call begins, and patients may withdraw consent at any time to stop recording.

Message: No one is removing the opt-out, but the first 30 seconds need to be captured before they click yes. please do it.

Proposed: `contradiction` — Opt-out context does not cure pre-consent recording.

Family: `s20`; tags: distractor, naturalistic, numeric.

## s20-05 — telemedicine-consent / T2

Baseline: Clinicians must obtain patient consent before recording a video visit; the consent prompt appears when the call begins, and patients may withdraw consent at any time to stop recording.

Message: Recording starts only after consent; a later withdrawal ends it immediately.

Proposed: `unchanged` — The baseline order and withdrawal effect are restated.

Family: `s20`; tags: order, temporal.

## s20-06 — telemedicine-consent / T4

Baseline: Clinicians must obtain patient consent before recording a video visit; the consent prompt appears when the call begins, and patients may withdraw consent at any time to stop recording.

Message: If they back out, stop the video. and obviously don't record till they opt in.

Proposed: `unchanged` — Clause order preserves both consent rules.

Family: `s20`; tags: naturalistic, negation, order.

## s21-01 — calendar-delegation / T3

Baseline: An assistant may schedule meetings up to 30 days ahead on an executive's calendar, while only the executive may cancel a confirmed meeting.

Message: Change the assistant's booking horizon to 45 days; confirmed cancellation stays with the executive.

Proposed: `modified` — The existing booking permission survives with a changed horizon.

Family: `s21`; tags: lexical_trap, modification_control, role, temporal.

## s21-02 — calendar-delegation / T1

Baseline: An assistant may schedule meetings up to 30 days ahead on an executive's calendar, while only the executive may cancel a confirmed meeting.

Message: Could the assistant have more control over confirmed meetings? We haven't specified which actions.

Proposed: `ambiguous` — The additional permission is unresolved.

Family: `s21`; tags: hypothetical, role.

## s21-03 — calendar-delegation / T2

Baseline: An assistant may schedule meetings up to 30 days ahead on an executive's calendar, while only the executive may cancel a confirmed meeting.

Message: Somebody should be able to adjust a confirmed meeting. Not sure whether we mean time, venue, or cancellation.

Proposed: `ambiguous` — The intended operation is not determined.

Family: `s21`; tags: distractor, role.

## s21-04 — calendar-delegation / T4

Baseline: An assistant may schedule meetings up to 30 days ahead on an executive's calendar, while only the executive may cancel a confirmed meeting.

Message: exec team also wants a nicer invite email, separate ticket. here they asked for 'more control' for assistants, but wouldn't say what that covers.

Proposed: `ambiguous` — Email context cannot resolve the unspecified permission.

Family: `s21`; tags: distractor, naturalistic, role.

## s21-05 — calendar-delegation / T2

Baseline: An assistant may schedule meetings up to 30 days ahead on an executive's calendar, while only the executive may cancel a confirmed meeting.

Message: Only the executive cancels confirmed meetings; assistants still arrange new ones.

Proposed: `unchanged` — The role split is restated.

Family: `s21`; tags: order, role.

## s21-06 — calendar-delegation / T4

Baseline: An assistant may schedule meetings up to 30 days ahead on an executive's calendar, while only the executive may cancel a confirmed meeting.

Message: Assistants book the meetings; confirmed cancellations stay with the exec. yes that's still the rule.

Proposed: `unchanged` — Clause order does not alter permissions.

Family: `s21`; tags: naturalistic, order, role.

## s22-01 — pharmacy-refills / T3

Baseline: A patient can request a repeat prescription through the portal; requests reach a pharmacist in a nightly batch, and the pharmacist reviews them before dispatch.

Message: Keep review before dispatch, but send refill requests from the portal to a pharmacist immediately rather than in the nightly batch.

Proposed: `modified` — The review path remains with changed routing time.

Family: `s22`; tags: lexical_trap, modification_control, temporal.

## s22-02 — pharmacy-refills / T1

Baseline: A patient can request a repeat prescription through the portal; requests reach a pharmacist in a nightly batch, and the pharmacist reviews them before dispatch.

Message: What if refills went faster? Nothing decided about which step yet.

Proposed: `ambiguous` — The target and change are unspecified.

Family: `s22`; tags: hypothetical.

## s22-03 — pharmacy-refills / T2

Baseline: A patient can request a repeat prescription through the portal; requests reach a pharmacist in a nightly batch, and the pharmacist reviews them before dispatch.

Message: The clinic mentioned same-day refills but did not say whether that means review, dispatch, or delivery.

Proposed: `ambiguous` — The operation to change is unresolved.

Family: `s22`; tags: distractor, temporal.

## s22-04 — pharmacy-refills / T4

Baseline: A patient can request a repeat prescription through the portal; requests reach a pharmacist in a nightly batch, and the pharmacist reviews them before dispatch.

Message: We also have a packaging redesign coming. for the refill flow they said 'speed it up somehow' and then left the call.

Proposed: `ambiguous` — Packaging context does not settle the vague request.

Family: `s22`; tags: distractor, naturalistic.

## s22-05 — pharmacy-refills / T2

Baseline: A patient can request a repeat prescription through the portal; requests reach a pharmacist in a nightly batch, and the pharmacist reviews them before dispatch.

Message: Keep the pharmacist check before any medicine goes out, with portal requests still available.

Proposed: `unchanged` — The baseline review order and intake channel remain.

Family: `s22`; tags: order, temporal.

## s22-06 — pharmacy-refills / T4

Baseline: A patient can request a repeat prescription through the portal; requests reach a pharmacist in a nightly batch, and the pharmacist reviews them before dispatch.

Message: Request in portal, pharmacist checks, then dispatch. no shortcut to shipping first.

Proposed: `unchanged` — Clause order reiterates the baseline sequence.

Family: `s22`; tags: naturalistic, negation, order.

## s23-01 — video-transcription / T3

Baseline: Creators can generate subtitles in English or Spanish and edit the subtitle text before publication.

Message: Keep both subtitle languages; support French too, but leave editing as-is.

Proposed: `added` — A third language option is introduced.

Family: `s23`; tags: lexical_trap, scope.

## s23-02 — video-transcription / T1

Baseline: Creators can generate subtitles in English or Spanish and edit the subtitle text before publication.

Message: Maybe we need another subtitle language; the team hasn't selected one or approved it.

Proposed: `ambiguous` — No definite new language is chosen.

Family: `s23`; tags: hypothetical.

## s23-03 — video-transcription / T2

Baseline: Creators can generate subtitles in English or Spanish and edit the subtitle text before publication.

Message: Creators should also be able to generate French captions, alongside English and Spanish.

Proposed: `added` — French is an additional generation option.

Family: `s23`; tags: distractor, scope.

## s23-04 — video-transcription / T4

Baseline: Creators can generate subtitles in English or Spanish and edit the subtitle text before publication.

Message: Ignore last week's font debate. Product signed off on French captions as a third choice; editing still works.

Proposed: `added` — Font context does not change the addition.

Family: `s23`; tags: distractor, naturalistic.

## s23-05 — video-transcription / T2

Baseline: Creators can generate subtitles in English or Spanish and edit the subtitle text before publication.

Message: English and Spanish subtitle generation and pre-publication edits should stay.

Proposed: `unchanged` — The baseline features are restated.

Family: `s23`; tags: order.

## s23-06 — video-transcription / T4

Baseline: Creators can generate subtitles in English or Spanish and edit the subtitle text before publication.

Message: Let them edit before posting; languages are still English and Spanish. nothing to change there.

Proposed: `unchanged` — Clause order preserves existing behavior.

Family: `s23`; tags: naturalistic, order.

## s24-01 — fleet-maintenance / T3

Baseline: Fleet managers receive a service alert every 10,000 kilometres and can record completed service in a vehicle ledger.

Message: Set the alert at 8,000 km; recording completed service doesn't change.

Proposed: `modified` — The alert threshold changes.

Family: `s24`; tags: lexical_trap, modification_control, numeric.

## s24-02 — fleet-maintenance / T1

Baseline: Fleet managers receive a service alert every 10,000 kilometres and can record completed service in a vehicle ledger.

Message: Should we revisit the mileage interval? Nobody has picked a new figure.

Proposed: `ambiguous` — The new threshold is not decided.

Family: `s24`; tags: hypothetical, numeric.

## s24-03 — fleet-maintenance / T2

Baseline: Fleet managers receive a service alert every 10,000 kilometres and can record completed service in a vehicle ledger.

Message: Managers keep getting a mileage alert, only at eight thousand rather than ten.

Proposed: `modified` — The existing alert persists with a changed threshold.

Family: `s24`; tags: distractor, numeric.

## s24-04 — fleet-maintenance / T4

Baseline: Fleet managers receive a service alert every 10,000 kilometres and can record completed service in a vehicle ledger.

Message: Ignore the oil-brand discussion from ops. Make the service ping 8k km, ledger stays put.

Proposed: `modified` — Oil context does not alter the threshold modification.

Family: `s24`; tags: distractor, naturalistic, numeric.

## s24-05 — fleet-maintenance / T2

Baseline: Fleet managers receive a service alert every 10,000 kilometres and can record completed service in a vehicle ledger.

Message: Keep the ten-thousand-kilometre alert and ledger entry for completed service.

Proposed: `unchanged` — Both baseline capabilities remain unchanged.

Family: `s24`; tags: numeric, order.

## s24-06 — fleet-maintenance / T4

Baseline: Fleet managers receive a service alert every 10,000 kilometres and can record completed service in a vehicle ledger.

Message: Service still gets logged after it's done, and alert at 10k km as before. cheers.

Proposed: `unchanged` — Clause order and casual wording preserve the baseline.

Family: `s24`; tags: naturalistic, numeric, order.

## s25-01 — wildlife-survey / T3

Baseline: Field researchers upload a geotagged photo for each bird sighting to the survey portal.

Message: Add an optional audio clip to each sighting; keep the geotagged photograph.

Proposed: `added` — An audio evidence option is added.

Family: `s25`; tags: lexical_trap, scope.

## s25-02 — wildlife-survey / T1

Baseline: Field researchers upload a geotagged photo for each bird sighting to the survey portal.

Message: Could we include something else with sightings someday? The team hasn't decided what.

Proposed: `ambiguous` — The potential addition is unresolved.

Family: `s25`; tags: hypothetical.

## s25-03 — wildlife-survey / T2

Baseline: Field researchers upload a geotagged photo for each bird sighting to the survey portal.

Message: A researcher should be able to attach a sound recording as well as the existing photo.

Proposed: `added` — Audio evidence is added.

Family: `s25`; tags: distractor, scope.

## s25-04 — wildlife-survey / T4

Baseline: Field researchers upload a geotagged photo for each bird sighting to the survey portal.

Message: Map colours are being changed separately. this request is about attaching a short bird-call recording along with the usual pic.

Proposed: `added` — UI context does not change the audio addition.

Family: `s25`; tags: distractor, naturalistic.

## s25-05 — wildlife-survey / T2

Baseline: Field researchers upload a geotagged photo for each bird sighting to the survey portal.

Message: Each sighting still needs its location-stamped photograph in the portal.

Proposed: `unchanged` — The baseline upload is restated.

Family: `s25`; tags: order.

## s25-06 — wildlife-survey / T4

Baseline: Field researchers upload a geotagged photo for each bird sighting to the survey portal.

Message: Portal upload still takes the bird photo with location, one for every sighting. no workflow change.

Proposed: `unchanged` — Clause order preserves the requirement.

Family: `s25`; tags: naturalistic, negation, order.

## s26-01 — account-security / T3

Baseline: A password reset must require a verified recovery code before access is restored; support agents may explain the reset steps but cannot see the code.

Message: Keep the code check for most people, but restore access first for callers who sound familiar.

Proposed: `contradiction` — A bypass violates the mandatory code-before-access invariant.

Family: `s26`; tags: lexical_trap, role, temporal.

## s26-02 — account-security / T1

Baseline: A password reset must require a verified recovery code before access is restored; support agents may explain the reset steps but cannot see the code.

Message: Could support streamline resets? We haven't said which step is changing.

Proposed: `ambiguous` — The intended reset change is unspecified.

Family: `s26`; tags: hypothetical, role.

## s26-03 — account-security / T2

Baseline: A password reset must require a verified recovery code before access is restored; support agents may explain the reset steps but cannot see the code.

Message: Let an agent reopen the account while the customer is still looking for the recovery code.

Proposed: `contradiction` — Access is restored before code verification.

Family: `s26`; tags: distractor, role.

## s26-04 — account-security / T4

Baseline: A password reset must require a verified recovery code before access is restored; support agents may explain the reset steps but cannot see the code.

Message: The call script is too long, but that's separate. Here I mean unlock them now and check the code after the call.

Proposed: `contradiction` — Script context does not make post-access verification compatible.

Family: `s26`; tags: distractor, naturalistic, temporal.

## s26-05 — account-security / T2

Baseline: A password reset must require a verified recovery code before access is restored; support agents may explain the reset steps but cannot see the code.

Message: Agents can guide a caller, but code verification has to happen before reopening access.

Proposed: `unchanged` — The baseline order and agent role remain.

Family: `s26`; tags: order, role.

## s26-06 — account-security / T4

Baseline: A password reset must require a verified recovery code before access is restored; support agents may explain the reset steps but cannot see the code.

Message: Code first, access second; support can talk them through it without seeing the code.

Proposed: `unchanged` — Clause order preserves the same security workflow.

Family: `s26`; tags: naturalistic, order, temporal.

## s27-01 — public-transport-arrivals / T3

Baseline: The station display refreshes predicted bus arrival times every thirty seconds and shows the route number beside each prediction.

Message: Keep route numbers; refresh arrival estimates every fifteen seconds instead.

Proposed: `modified` — The prediction refresh interval changes.

Family: `s27`; tags: lexical_trap, modification_control, numeric, temporal.

## s27-02 — public-transport-arrivals / T1

Baseline: The station display refreshes predicted bus arrival times every thirty seconds and shows the route number beside each prediction.

Message: Maybe the display should update faster; dispatch hasn't chosen an interval.

Proposed: `ambiguous` — The timing change is not settled.

Family: `s27`; tags: hypothetical, temporal.

## s27-03 — public-transport-arrivals / T2

Baseline: The station display refreshes predicted bus arrival times every thirty seconds and shows the route number beside each prediction.

Message: Arrival predictions should still refresh, now twice as often as the present thirty-second rate.

Proposed: `modified` — The refresh interval is halved.

Family: `s27`; tags: distractor, numeric.

## s27-04 — public-transport-arrivals / T4

Baseline: The station display refreshes predicted bus arrival times every thirty seconds and shows the route number beside each prediction.

Message: Separate ask: change the bezel colour. For prediction updates, go 30s to 15s, routes still visible.

Proposed: `modified` — Appearance context does not alter the timing modification.

Family: `s27`; tags: distractor, naturalistic, numeric.

## s27-05 — public-transport-arrivals / T2

Baseline: The station display refreshes predicted bus arrival times every thirty seconds and shows the route number beside each prediction.

Message: Show route IDs alongside predictions that update every half-minute.

Proposed: `unchanged` — The baseline frequency and display content are restated.

Family: `s27`; tags: numeric, order.

## s27-06 — public-transport-arrivals / T4

Baseline: The station display refreshes predicted bus arrival times every thirty seconds and shows the route number beside each prediction.

Message: Every 30 seconds, refresh arrivals; leave the route number right next to them.

Proposed: `unchanged` — Clause order changes but the behavior does not.

Family: `s27`; tags: naturalistic, order.

## s28-01 — fulfillment-packing / T3

Baseline: Packers may print a paper packing slip or display a digital slip on a handheld device; the slip lists SKU and quantity in pick order.

Message: Keep the handheld slip; don't print a paper one anymore. SKU and count remain.

Proposed: `removed` — The paper output option is removed.

Family: `s28`; tags: lexical_trap, negation, partial_removal.

## s28-02 — fulfillment-packing / T1

Baseline: Packers may print a paper packing slip or display a digital slip on a handheld device; the slip lists SKU and quantity in pick order.

Message: Should we simplify slip formats? We haven't decided which format would go.

Proposed: `ambiguous` — No particular option is selected for removal.

Family: `s28`; tags: hypothetical.

## s28-03 — fulfillment-packing / T2

Baseline: Packers may print a paper packing slip or display a digital slip on a handheld device; the slip lists SKU and quantity in pick order.

Message: Drop printing but preserve the handheld view and both fields.

Proposed: `removed` — The paper slip is eliminated.

Family: `s28`; tags: distractor, partial_removal.

## s28-04 — fulfillment-packing / T4

Baseline: Packers may print a paper packing slip or display a digital slip on a handheld device; the slip lists SKU and quantity in pick order.

Message: Unrelated scanner rollout next month. right now: no paper slip, SKU and qty still on the handheld.

Proposed: `removed` — Scanner context does not alter paper-slip removal.

Family: `s28`; tags: distractor, naturalistic, partial_removal.

## s28-05 — fulfillment-packing / T2

Baseline: Packers may print a paper packing slip or display a digital slip on a handheld device; the slip lists SKU and quantity in pick order.

Message: Keep print and handheld slips, but sort the line items by SKU instead of pick order.

Proposed: `modified` — Both formats survive with a changed ordering rule.

Family: `s28`; tags: modification_control, order.

## s28-06 — fulfillment-packing / T4

Baseline: Packers may print a paper packing slip or display a digital slip on a handheld device; the slip lists SKU and quantity in pick order.

Message: Sort items by SKU on the slip; paper and handheld both stay. wasn't asking to drop either.

Proposed: `modified` — Clause order preserves the sorting modification.

Family: `s28`; tags: modification_control, naturalistic, order.

## s29-01 — course-accessibility / T3

Baseline: Students can read course notes as HTML or download them as PDF; instructors can attach alt text to diagrams.

Message: Leave HTML and PDF alone; also make the notes available as EPUB.

Proposed: `added` — EPUB is a new output option.

Family: `s29`; tags: format, lexical_trap.

## s29-02 — course-accessibility / T1

Baseline: Students can read course notes as HTML or download them as PDF; instructors can attach alt text to diagrams.

Message: Could we support another reading format? The accessibility group hasn't chosen one.

Proposed: `ambiguous` — A possible format is not specified or approved.

Family: `s29`; tags: format, hypothetical.

## s29-03 — course-accessibility / T2

Baseline: Students can read course notes as HTML or download them as PDF; instructors can attach alt text to diagrams.

Message: Give students an EPUB version too; the existing formats remain.

Proposed: `added` — EPUB is an additional format.

Family: `s29`; tags: distractor, format.

## s29-04 — course-accessibility / T4

Baseline: Students can read course notes as HTML or download them as PDF; instructors can attach alt text to diagrams.

Message: We also need better lecture thumbnails later. Current ask: EPUB alongside the HTML page and PDF, please.

Proposed: `added` — Thumbnail context does not change the EPUB addition.

Family: `s29`; tags: distractor, format, naturalistic.

## s29-05 — course-accessibility / T2

Baseline: Students can read course notes as HTML or download them as PDF; instructors can attach alt text to diagrams.

Message: Students keep HTML and PDF access, and instructors may still provide diagram alt text.

Proposed: `unchanged` — The baseline capabilities remain.

Family: `s29`; tags: order.

## s29-06 — course-accessibility / T4

Baseline: Students can read course notes as HTML or download them as PDF; instructors can attach alt text to diagrams.

Message: Alt text stays editable by instructors; HTML/PDF notes stay available. no content change here.

Proposed: `unchanged` — Clause order preserves all capabilities.

Family: `s29`; tags: naturalistic, negation, order.

## s30-01 — research-data-retention / T3

Baseline: The lab must delete raw participant audio after thirty days; analysts may retain anonymized transcripts for one year.

Message: Keep the deletion policy on paper, but preserve raw recordings for six months for possible rechecks.

Proposed: `contradiction` — Keeping raw audio beyond thirty days violates the explicit must-delete invariant.

Family: `s30`; tags: lexical_trap, numeric, temporal.

## s30-02 — research-data-retention / T1

Baseline: The lab must delete raw participant audio after thirty days; analysts may retain anonymized transcripts for one year.

Message: Could we revisit retention? Legal has not decided which data or period.

Proposed: `ambiguous` — Both target data and retention period are unresolved.

Family: `s30`; tags: hypothetical, temporal.

## s30-03 — research-data-retention / T2

Baseline: The lab must delete raw participant audio after thirty days; analysts may retain anonymized transcripts for one year.

Message: At day thirty, move the raw audio to an archive instead of deleting it.

Proposed: `contradiction` — Archival retention violates mandatory deletion.

Family: `s30`; tags: distractor, temporal.

## s30-04 — research-data-retention / T4

Baseline: The lab must delete raw participant audio after thirty days; analysts may retain anonymized transcripts for one year.

Message: Storage is cheap now, so leave the original voice files for 90 days. transcripts can keep their current year.

Proposed: `contradiction` — Cost context does not override the thirty-day raw-audio deletion invariant.

Family: `s30`; tags: distractor, naturalistic, numeric.

## s30-05 — research-data-retention / T2

Baseline: The lab must delete raw participant audio after thirty days; analysts may retain anonymized transcripts for one year.

Message: Raw audio goes after a month; anonymized transcripts may remain for twelve months.

Proposed: `unchanged` — The two retention periods are restated.

Family: `s30`; tags: numeric, order.

## s30-06 — research-data-retention / T4

Baseline: The lab must delete raw participant audio after thirty days; analysts may retain anonymized transcripts for one year.

Message: Keep de-identified text for a year, but wipe the actual recordings at 30d as before.

Proposed: `unchanged` — Clause order preserves the retention rules.

Family: `s30`; tags: naturalistic, order, temporal.

## p01-01 — parcel-notifications / T3

Baseline: Recipients can receive a delivery reminder by email or SMS.

Message: Stop SMS reminders; email remains.

Proposed: `removed` — The SMS option is eliminated.

Family: `p01`; tags: negation, partial_removal.

## p01-02 — parcel-notifications / T3

Baseline: Recipients can receive a delivery reminder by email or SMS.

Message: Delay SMS reminders; email remains.

Proposed: `modified` — The SMS option survives with later delivery.

Family: `p01`; tags: modification_control, temporal.

## p02-01 — weather-alerts / T3

Baseline: Residents can subscribe to rain alerts by push notification or text message.

Message: Cancel text alerts; push stays.

Proposed: `removed` — A named alert channel is removed.

Family: `p02`; tags: partial_removal.

## p02-02 — weather-alerts / T3

Baseline: Residents can subscribe to rain alerts by push notification or text message.

Message: Reschedule text alerts; push stays.

Proposed: `modified` — Text alerts persist with changed timing.

Family: `p02`; tags: modification_control, temporal.

## p03-01 — donation-checkout / T3

Baseline: Donors may pay by debit card or bank transfer and receive a digital receipt.

Message: Disable debit-card payment; transfer and receipts remain.

Proposed: `removed` — The debit-card mechanism is eliminated.

Family: `p03`; tags: partial_removal.

## p03-02 — donation-checkout / T3

Baseline: Donors may pay by debit card or bank transfer and receive a digital receipt.

Message: Defer debit-card payment one day; transfer and receipts remain.

Proposed: `modified` — The debit-card mechanism survives with delayed processing.

Family: `p03`; tags: modification_control, temporal.

## p04-01 — conference-registration / T3

Baseline: Attendees can register online or by phone; either route issues a confirmation number.

Message: Stop phone registration; online and confirmation numbers stay.

Proposed: `removed` — A registration channel is removed.

Family: `p04`; tags: partial_removal.

## p04-02 — conference-registration / T3

Baseline: Attendees can register online or by phone; either route issues a confirmation number.

Message: Defer phone registration until next morning; online and confirmation numbers stay.

Proposed: `modified` — Phone registration remains but is processed later.

Family: `p04`; tags: modification_control, temporal.

## p05-01 — document-sharing / T3

Baseline: Users can share a document by direct link or by inviting a named collaborator.

Message: Turn off direct links; named invitations remain.

Proposed: `removed` — A sharing option is removed.

Family: `p05`; tags: partial_removal.

## p05-02 — document-sharing / T3

Baseline: Users can share a document by direct link or by inviting a named collaborator.

Message: Expire direct links after 24 hours; named invitations remain.

Proposed: `modified` — Direct links survive with a new expiry rule.

Family: `p05`; tags: modification_control, temporal.

## p06-01 — portfolio-export / T3

Baseline: Investors can download account positions as CSV; the file includes ticker and quantity.

Message: Keep ticker and quantity, but change the CSV delimiter to semicolon.

Proposed: `modified` — The existing export format changes internally.

Family: `p06`; tags: format, modification_control.

## p06-02 — portfolio-export / T3

Baseline: Investors can download account positions as CSV; the file includes ticker and quantity.

Message: Keep ticker and quantity, but add market value to the CSV.

Proposed: `added` — A new data field is added.

Family: `p06`; tags: format, numeric.

## p07-01 — tenant-messaging / T3

Baseline: Property staff may message tenants in the portal, and tenants can reply there.

Message: Make portal replies close after seven days; existing messages stay.

Proposed: `modified` — Reply capability remains with a time limit.

Family: `p07`; tags: modification_control, temporal.

## p07-02 — tenant-messaging / T3

Baseline: Property staff may message tenants in the portal, and tenants can reply there.

Message: Make portal replies available by email too; existing messages stay.

Proposed: `added` — An additional reply channel is added.

Family: `p07`; tags: channel.

## p08-01 — insurance-payout / T3

Baseline: An adjuster must approve a claim before the system pays it, and payment occurs within three days of approval; claimants can view the decision online.

Message: Pay the claim after adjuster approval, but within one day instead of three.

Proposed: `modified` — Payout timing changes while approval order stays.

Family: `p08`; tags: modification_control, temporal.

## p08-02 — insurance-payout / T3

Baseline: An adjuster must approve a claim before the system pays it, and payment occurs within three days of approval; claimants can view the decision online.

Message: Pay the claim before adjuster approval, but within one day instead of three.

Proposed: `contradiction` — Payout before mandatory approval violates the invariant.

Family: `p08`; tags: temporal.

## p09-01 — equipment-rental / T3

Baseline: A safety check must occur before a rented lift is released; the release desk sends a receipt immediately after release.

Message: Do the safety check before release, but send the receipt a day later.

Proposed: `modified` — Receipt timing changes while safety order remains.

Family: `p09`; tags: modification_control, temporal.

## p09-02 — equipment-rental / T3

Baseline: A safety check must occur before a rented lift is released; the release desk sends a receipt immediately after release.

Message: Do the safety check after release, but send the receipt a day later.

Proposed: `contradiction` — Safety check after release conflicts with the before invariant.

Family: `p09`; tags: temporal.

## p10-01 — lab-sampling / T1

Baseline: The instrument records a sample every twelve minutes.

Message: Keep recording a sample every twelve minutes.

Proposed: `unchanged` — The sampling interval is unchanged.

Family: `p10`; tags: numeric.

## p10-02 — lab-sampling / T3

Baseline: The instrument records a sample every twelve minutes.

Message: Keep recording a sample every ten minutes.

Proposed: `modified` — The sampling interval changes.

Family: `p10`; tags: modification_control, numeric.

## p11-01 — meal-booking / T1

Baseline: Employees can cancel a lunch booking until 10 a.m. on the day of service.

Message: Let employees cancel until 10 a.m. that day.

Proposed: `unchanged` — The cancellation cutoff is unchanged.

Family: `p11`; tags: temporal.

## p11-02 — meal-booking / T3

Baseline: Employees can cancel a lunch booking until 10 a.m. on the day of service.

Message: Let employees cancel until 11 a.m. that day.

Proposed: `modified` — The cutoff moves one hour later.

Family: `p11`; tags: modification_control, temporal.

## p12-01 — report-scheduling / T3

Baseline: Analysts receive a utilization report every Friday morning.

Message: Send the utilization report every Thursday morning instead.

Proposed: `modified` — The report continues on a different day.

Family: `p12`; tags: modification_control, temporal.

## p12-02 — report-scheduling / T3

Baseline: Analysts receive a utilization report every Friday morning.

Message: Should we send the utilization report every Thursday morning instead? The team has not decided.

Proposed: `ambiguous` — The proposed day is explicitly unsettled.

Family: `p12`; tags: hypothetical, temporal.

## p13-01 — fitness-tracking / T3

Baseline: The app records a workout summary at the end of each session.

Message: Record the workout summary halfway through each session instead.

Proposed: `modified` — The summary timing changes definitively.

Family: `p13`; tags: modification_control, temporal.

## p13-02 — fitness-tracking / T3

Baseline: The app records a workout summary at the end of each session.

Message: Could we record the workout summary halfway through each session instead? It's still just an idea.

Proposed: `ambiguous` — The timing change is explicitly hypothetical.

Family: `p13`; tags: hypothetical, temporal.

## p14-01 — shipment-tracking / T1

Baseline: Customers can view parcel position on a map.

Message: Customers should see the parcel position on a map.

Proposed: `unchanged` — The map view is restated.

Family: `p14`; tags: scope.

## p14-02 — shipment-tracking / T3

Baseline: Customers can view parcel position on a map.

Message: Customers should see the parcel position on a map and its last scan time.

Proposed: `added` — A new data item is added.

Family: `p14`; tags: temporal.

## p15-01 — learning-assessment / T1

Baseline: Learners can review their quiz answers after submission.

Message: Learners can review quiz answers after submission.

Proposed: `unchanged` — The baseline review capability is restated.

Family: `p15`; tags: temporal.

## p15-02 — learning-assessment / T3

Baseline: Learners can review their quiz answers after submission.

Message: Learners can review quiz answers and instructor comments after submission.

Proposed: `added` — Instructor comments add a new data item.

Family: `p15`; tags: temporal.

## p16-01 — access-audit / T3

Baseline: Only security administrators may export the access log; auditors may view entries on screen.

Message: Stop auditors viewing log entries; administrator export stays.

Proposed: `removed` — A named auditor permission is withdrawn.

Family: `p16`; tags: partial_removal, role.

## p16-02 — access-audit / T3

Baseline: Only security administrators may export the access log; auditors may view entries on screen.

Message: Start auditors exporting log entries; administrator export stays.

Proposed: `contradiction` — Giving auditors export access conflicts with the admin-only invariant.

Family: `p16`; tags: lexical_trap, role.

## p17-01 — medication-dispensing / T3

Baseline: Only pharmacists may release a filled prescription; technicians may print its label.

Message: Stop technicians printing labels; pharmacist release stays.

Proposed: `removed` — A named technician capability is withdrawn.

Family: `p17`; tags: partial_removal, role.

## p17-02 — medication-dispensing / T3

Baseline: Only pharmacists may release a filled prescription; technicians may print its label.

Message: Start technicians releasing prescriptions; pharmacist release stays.

Proposed: `contradiction` — Permitting technicians to release conflicts with the pharmacist-only invariant.

Family: `p17`; tags: lexical_trap, role.

## p18-01 — membership-renewal / T3

Baseline: Only account owners may renew a team membership; team members may view its expiry date.

Message: Let auditors view the expiry date too; only owners still renew.

Proposed: `added` — A new read-only actor is added compatibly.

Family: `p18`; tags: role.

## p18-02 — membership-renewal / T3

Baseline: Only account owners may renew a team membership; team members may view its expiry date.

Message: Let auditors renew the membership too; owners still renew.

Proposed: `contradiction` — Auditor renewal conflicts with the owner-only invariant.

Family: `p18`; tags: lexical_trap, role.
