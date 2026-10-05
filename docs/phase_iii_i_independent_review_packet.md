# Phase III-I independent semantic-label review packet

Status: proposed AI-assisted cases only. No Phase III-I decision-set model predictions have been run. A separate human reviewer must adjudicate these cases before the dataset may be frozen or scored.

Canonical draft: [`decision_draft_v1.json`](../evaluation/phase_iii_i/decision_draft_v1.json). SHA-256: `05e77f8327c17f73c02c7b63a8aa0279c047c77e0a7ca54a939769f7c5bcca2e`.

Response template: [`independent_review_template_v1.json`](../evaluation/phase_iii_i/independent_review_template_v1.json). Please copy it to a new file, enter your own reviewer identity and review date, and fill all 90 decisions. Do not edit the draft or template in place.

Read [`P1.json`](../evaluation/prompts/P1.json) for the canonical class definitions. Review the *pair* (baseline requirement plus new message); do not search for or view any model predictions. For each case enter `CONFIRMED`, `REVISED`, `AMBIGUOUS`, or `EXCLUDE`:

- `CONFIRMED`: reviewed label equals the proposed label. A brief note is optional.
- `REVISED`: enter the class you judge correct and a short explanation. A revision can keep the same class when the proposed rationale or boundary treatment needed correction.
- `AMBIGUOUS`: the ground truth genuinely cannot be assigned one canonical class from the pair. Set `reviewed_label` to `null` and explain.
- `EXCLUDE`: the case is invalid, contaminated, or otherwise unsuitable. Set `reviewed_label` to `null` and explain.

Keep the proposed label even when you disagree; it is audit evidence. Do not force balance. Please mark borderline cases on semantic grounds. In particular, consider explicit-option removal versus a surviving workflow, direct contradiction versus ordinary parameter modification, hypothetical intent, and same-domain messages that leave the baseline unaffected.

Pre-review archive screen: no exact normalized pair, exact baseline, exact message, numeric-mask message-template, or same-baseline high-Jaccard overlap with the supplied V5 train/validation/test files across these 90 cases. This is a limited screen; it does not prove the exact adapter's training bytes or every historical source.

## Cases

| ID | Baseline requirement | New message | Proposed | Proposed rationale |
| --- | --- | --- | --- | --- |
| i-mod-01 | District meters shall record flow every fifteen minutes. | Could we take a reading every ten minutes instead? | modified | The same flow measurement remains, with a shorter sampling interval. |
| i-mod-02 | Patrons may borrow ordinary books for fourteen days. | Set the ordinary-book loan period to twenty-one days for everyone. | modified | The loan capability persists with a changed duration. |
| i-mod-03 | The cargo desk shall acknowledge a temperature alarm within thirty minutes of receipt. | Make that response window twenty minutes; the desk still owns the acknowledgement. | modified | Only the acknowledgement deadline changes. |
| i-mod-04 | School office staff shall correct a student's attendance record after a documented appeal. | After an appeal, let the class teacher make that correction instead of the office team. | modified | The correction workflow remains but the authorized actor changes. |
| i-mod-05 | The public flood dashboard shall display river depth in metres to one decimal place. | Display that depth in centimetres, retaining the same one-decimal precision. | modified | The same measurement remains with a changed unit. |
| i-mod-06 | A driver may extend a parking session during the five-minute grace period after expiry. | The grace period should last twelve minutes after expiry. | modified | Extension remains available with a different cutoff. |
| i-mod-07 | Unanswered high-priority triage calls shall escalate to the on-call nurse after eight minutes. | Please make the escalation happen after five minutes, without changing who receives it. | modified | The escalation route remains and only the delay changes. |
| i-mod-08 | The irrigation planner shall recalculate the field schedule each Monday morning. | Could it recalculate at the start of every day instead? | modified | Recalculation remains, with higher frequency. |
| i-mod-09 | The collections team shall receive a weekly PDF summary of gallery humidity readings. | Keep the weekly summary, but send it as an HTML page rather than a PDF. | modified | The report survives with a different presentation format. |
| i-mod-10 | Quality staff shall inspect one valve from each lot of twenty manufactured valves. | Inspect one valve per ten in the lot from now on. | modified | The sampling workflow remains with a denser rate. |
| i-mod-11 | Volunteers may claim up to forty dollars for approved local travel per event. | Raise the local-travel reimbursement ceiling to sixty dollars per event. | modified | The reimbursement remains with an increased cap. |
| i-mod-12 | Specimen labels shall show the eight-character accession code beside the sample date. | The accession code is moving to twelve characters; keep the date beside it. | modified | Label content remains but a field constraint changes. |
| i-mod-13 | A zoning clerk shall review each permit application before the building unit receives it. | Route that first review to the planning officer, then continue sending the file to the building unit. | modified | The review sequence persists with a changed reviewer role. |
| i-mod-14 | The battery operator shall publish a monthly utilisation summary on the first business day of the next month. | Publish the same utilisation summary quarterly, on the first business day after each quarter closes. | modified | The report persists while cadence and deadline change. |
| i-mod-15 | Digitised film previews shall be available at 1080p resolution. | Make the preview stream 4K while leaving the archive download unchanged. | modified | The preview capability continues with higher resolution. |
| i-add-01 | Passengers shall receive a printable boarding pass by email after booking. | Let passengers also show a boarding pass inside the mobile app; keep the emailed copy. | added | An additional boarding channel is introduced while email remains. |
| i-add-02 | The clinic shall email owners when a pet's laboratory result is ready. | Can owners opt into a text alert as well as the existing email? | added | SMS is an additional notification option. |
| i-add-03 | Ground staff shall view a flight's assigned gate on the operations board. | Show an estimated boarding-start time next to the gate on that board. | added | A new data item is requested without replacing the gate. |
| i-add-04 | Ticket buyers shall select an available numbered seat. | Keep seat selection and add an optional field for access needs at checkout. | added | An optional checkout field is added to an intact seat-selection flow. |
| i-add-05 | The warning service shall sound a riverside siren when the flood threshold is crossed. | The siren still sounds; send an app push alert at the same threshold too. | added | Push delivery is a new parallel alert channel. |
| i-add-06 | Field sensors shall upload soil moisture readings each hour. | Alongside moisture, could those uploads include soil pH? | added | Soil pH is a new measured data item. |
| i-add-07 | Patrons shall search the catalogue by book title. | Please add author-name search without removing title search. | added | A second search key is offered while the first remains. |
| i-add-08 | Patients shall view their appointment letters in the patient portal. | Allow a patient to nominate a caregiver who may also view those letters. | added | A delegated actor is added to existing patient access. |
| i-add-09 | Managers shall download a monthly PDF of completed repair counts. | Could we offer a CSV download of the same counts beside the PDF? | added | CSV is a new export option; PDF remains. |
| i-add-10 | Pickers shall confirm each picked item by scanning its barcode. | Keep barcode confirmation, but let a picker attach an optional spoken note when a shelf is damaged. | added | An optional voice-note capability is added. |
| i-add-11 | Inspectors shall attach a photograph to each track defect report. | Let inspectors attach a short video clip too, while continuing to require the photograph. | added | Video is a new attachment type alongside the required photo. |
| i-add-12 | Applicants shall lodge permit applications through the city website. | Keep the website, and let the service desk record applications made by phone. | added | Telephone intake is an additional application channel. |
| i-add-13 | Analysts shall annotate images by drawing polygons around observed land changes. | Can analysts also mark uncertain areas with freehand strokes? Polygon annotation stays available. | added | Freehand annotation is an additional tool. |
| i-add-14 | A donor shall receive a PDF receipt for each contribution. | Add a yearly gift total to the donor dashboard; individual PDF receipts should continue. | added | An aggregate dashboard data item is introduced. |
| i-add-15 | Claimants may upload photographs of damaged property with a claim. | Give claimants an optional voice-note attachment as well as photos. | added | A new attachment modality is added. |
| i-rem-01 | Inspectors shall attach photographs and notes to every failed vehicle inspection. | Stop collecting the photographs; retain the written notes. | removed | An explicitly supported evidence item is eliminated. |
| i-rem-02 | Guests may request room service through both the mobile app and the front desk. | Retire in-app room-service requests; the desk can still take them. | removed | One supported request channel is removed. |
| i-rem-03 | Visitors shall search the public docket by case number or party name. | Take away party-name lookup, but leave case-number search. | removed | One search option is withdrawn. |
| i-rem-04 | Applicants shall receive both email and SMS when an award decision is issued. | We no longer want the text message; send only the email. | removed | SMS notification is removed. |
| i-rem-05 | Ticket holders may present either a QR code or a printable ticket at entry. | Retire printable admission tickets; QR entry stays. | removed | The printable option is withdrawn. |
| i-rem-06 | Students shall open course notes in the browser or download them as PDF. | Disable PDF downloads of notes while keeping browser access. | removed | The download option is removed. |
| i-rem-07 | The public forecast shall display wind speed and relative humidity. | Hide relative humidity from the public forecast, but retain wind speed. | removed | A displayed data item is removed. |
| i-rem-08 | Donors may choose a one-time or monthly contribution. | The donation form should offer monthly contributions only. | removed | One contribution option is withdrawn. |
| i-rem-09 | Pilots may approve a berth plan from the web console or mobile app. | Remove berth-plan approval from phones; leave the web console alone. | removed | Mobile approval is eliminated. |
| i-rem-10 | Staff may export specimen results as PDF or CSV. | We can do without the CSV export; preserve the PDF. | removed | One export format is removed. |
| i-rem-11 | Workers shall sign into the assembly terminal using either a badge or PIN. | Drop PIN sign-in; badges will still work. | removed | One authentication option is withdrawn. |
| i-rem-12 | Dispensing alerts shall appear on the dashboard and be emailed to the pharmacist. | Stop the email copy of dispensing alerts; the dashboard alert remains. | removed | An alert channel is removed. |
| i-rem-13 | Students may enroll through the online portal or a campus kiosk. | Close kiosk enrollment after term ends; online enrollment remains. | removed | A supported enrollment channel is withdrawn. |
| i-rem-14 | Patrons may renew eligible loans online or at the circulation desk. | Please end in-person renewal but keep online renewal. | removed | A renewal channel is removed. |
| i-rem-15 | Customers may pay bills by card or bank transfer. | Remove card payments from the bill screen; bank transfer continues. | removed | One payment option is removed. |
| i-con-01 | The crossing barrier must remain closed until the last train carriage clears the crossing. | Raise the barrier while the train is still passing so traffic can move. | contradiction | The request directly violates the required closed-until-clear invariant. |
| i-con-02 | The public appointment display must never show a patient's full national identifier. | Put each patient's full national identifier on the public display. | contradiction | The request directly violates a never-display constraint. |
| i-con-03 | Only a certified flight dispatcher may approve a flight release. | Let an uncertified trainee approve a release alone. | contradiction | The proposed actor is expressly excluded by the only rule. |
| i-con-04 | Vaccines must remain below five degrees Celsius throughout transit. | Allow vaccine boxes to travel at ten degrees Celsius for the full route. | contradiction | The requested temperature is incompatible with a strict upper bound. |
| i-con-05 | The ballot-counting terminal must never connect to an external network. | Sync ballot totals directly from that terminal to a cloud service. | contradiction | Cloud syncing contradicts the network isolation rule. |
| i-con-06 | A maintenance crew may enter the pump chamber only after electrical isolation is confirmed. | Send the crew into the chamber before isolation is confirmed. | contradiction | The requested sequence breaches an only-after condition. |
| i-con-07 | Ultraviolet lamps must never be used in the manuscript display case. | Install a UV lamp inside that display case for the exhibition. | contradiction | The prohibited device is expressly requested. |
| i-con-08 | Student grades must not be visible to students before the official release time. | Give students a preview of their own grades an hour before release. | contradiction | Early visibility is forbidden by the baseline. |
| i-con-09 | Every high-value transfer must be approved by two distinct authorizers before execution. | Execute a high-value transfer after just one person approves it. | contradiction | One approval violates the explicit two-person minimum. |
| i-con-10 | Hazardous-goods deliveries must never be routed through residential streets. | Route a hazardous-goods delivery through the nearby housing estate. | contradiction | The proposed route uses a prohibited street type. |
| i-con-11 | A blood specimen may be collected only after informed consent is recorded. | Collect the specimen first and record consent afterward. | contradiction | Collection precedes the required consent record. |
| i-con-12 | Every visitor must be escorted while inside the restricted laboratory. | Let a visitor tour the restricted laboratory unaccompanied. | contradiction | Unescorted access conflicts with the every-visitor escort rule. |
| i-con-13 | The exact coordinates of protected nesting sites must never be shown publicly. | Publish a public map with each protected nest's exact coordinates. | contradiction | The requested disclosure is explicitly barred. |
| i-con-14 | The turbine must be shut down before anyone enters its service enclosure. | Keep the turbine running while a technician enters the enclosure. | contradiction | Entry with the turbine running breaches the before-entry rule. |
| i-con-15 | Dispensing staff must verify the patient's identifier before handing over any prescription. | For repeat prescriptions, hand over the medicine without checking the identifier. | contradiction | The exception contradicts the universal verification requirement. |
| i-amb-01 | Dispatchers shall assign an ambulance within six minutes of a priority-one call. | Can we make the handoff feel faster somehow? | ambiguous | No measurable change or specific workflow is identified. |
| i-amb-02 | Patrons may borrow ordinary books for fourteen days. | Perhaps ordinary loans should be a bit more generous. We have not settled on a duration. | ambiguous | A direction is suggested but the intended constraint is unresolved. |
| i-amb-03 | Applicants shall upload a site plan and an ownership document with each permit request. | Maybe tighten the attachment rules next year; we have not chosen which files. | ambiguous | Neither the attachments nor rule change is specified. |
| i-amb-04 | The museum shall open at nine each morning and close at five each evening. | The opening hours are not working well; let's discuss a better schedule. | ambiguous | A dissatisfaction statement does not settle a new schedule. |
| i-amb-05 | The irrigation scheduler shall publish a daily watering plan for each field. | Should we automate more of the field work one day? This is only an idea. | ambiguous | The hypothetical does not define a specific change to the daily plan. |
| i-amb-06 | The system shall email a pharmacist each time a stock item reaches its reorder point. | Alerts should be more helpful, without getting annoying. | ambiguous | Neither the alert behavior nor threshold is determinable. |
| i-amb-07 | Students shall see final grades only after the registrar publishes them. | We need to revisit when students can see marks, but faculty disagree about timing. | ambiguous | There is no chosen replacement rule. |
| i-amb-08 | A vehicle shall be flagged when its payload exceeds twelve tonnes. | Could we use the threshold we had last year? I cannot remember what it was. | ambiguous | The requested threshold is unknown. |
| i-amb-09 | Attendees may request a refund until forty-eight hours before a performance. | Some staff want a longer cancellation window and others want a shorter one; no decision yet. | ambiguous | Conflicting proposals do not identify a decided change. |
| i-amb-10 | The ward shall send discharge summaries to the attending physician at the end of each day. | Nurses say send these earlier; doctors say later. We have not agreed. | ambiguous | The new delivery time is unresolved. |
| i-amb-11 | The control room shall report the battery's peak output each day. | Could we make the peak figures better for the board? | ambiguous | Better is underspecified; no distinct data or format change is settled. |
| i-amb-12 | Residents shall receive a text alert when the coastal flood level reaches the red band. | Maybe drop texts and use the app instead, or maybe keep both; we're still debating. | ambiguous | Mutually different changes are proposed without a decision. |
| i-amb-13 | Reviewers shall score each application against four published criteria. | We should make the scoring fairer, but the revised formula is still being worked out. | ambiguous | No concrete scoring rule can be inferred. |
| i-amb-14 | Pickers shall scan a shelf label before removing each item. | Do we still need all these scans, or is there a less manual approach? | ambiguous | The question offers no committed alternative workflow. |
| i-amb-15 | Claimants may attach a photograph when submitting a new claim. | Let them do it again like before; I mean the other thing. | ambiguous | The referent and intended action cannot be resolved from the pair. |
| i-unc-01 | Patrons may borrow ordinary books for twenty-one days. | So ordinary books can be kept for three weeks, right? | unchanged | Three weeks is semantically equivalent to twenty-one days. |
| i-unc-02 | The system shall email a boarding pass to each passenger after booking. | After someone books, send their boarding pass to their email address. | unchanged | The same delivery action and timing are restated. |
| i-unc-03 | Each custody transfer record shall contain the receiving staff member's name and transfer time. | Record who received the specimen and when the handoff happened. | unchanged | The same two custody data fields are requested. |
| i-unc-04 | Visitors shall search issued permits by street address. | Please add a fee estimator for permit applicants. | unchanged | A fee estimator is same-domain but does not change address lookup. |
| i-unc-05 | Baggage handlers shall see the last scan location of each checked bag. | Give passengers a seat-map preview before check-in. | unchanged | Seat-map preview does not change baggage scan location access. |
| i-unc-06 | Operators shall be able to stop an irrigation pump remotely. | Let an operator switch off the irrigation pump from elsewhere. | unchanged | Remote pump stopping is restated in different words. |
| i-unc-07 | Managers shall download a monthly summary of discharge counts. | Let patients preselect a meal from the ward menu. | unchanged | Meal selection is unrelated to the discharge-count report. |
| i-unc-08 | Door staff shall scan a visitor's QR ticket to admit them. | Add Spanish narration to the audio guide. | unchanged | Audio-guide language does not alter QR admission. |
| i-unc-09 | Operators shall receive an alert after battery temperature exceeds forty degrees for ten minutes. | Notify the operator when the battery stays above forty degrees for a full ten minutes. | unchanged | The same threshold and duration are restated. |
| i-unc-10 | The inventory screen shall show each bin's SKU identifier. | Display the SKU code beside each storage bin. | unchanged | The same identifier visibility is restated. |
| i-unc-11 | The public map shall display the next bus arrival time for each stop. | Change the wording on emailed fare receipts. | unchanged | Receipt wording does not modify arrival times on the map. |
| i-unc-12 | The system shall email a receipt after each completed donation. | Once a contribution goes through, send its receipt to the donor by email. | unchanged | The same receipt action is paraphrased. |
| i-unc-13 | Students shall book available study rooms through the campus portal. | Show lecture timetable colours in the student portal. | unchanged | Timetable presentation does not alter study-room booking. |
| i-unc-14 | Claimants shall download a PDF copy of their submitted claim. | Add a camera shortcut for taking claim photos. | unchanged | The shortcut does not alter PDF claim download. |
| i-unc-15 | The station shall sample wind speed every five minutes. | Take a wind-speed reading once every five minutes. | unchanged | The same sampling cadence is restated. |

## Return

Return the completed JSON review record to the project owner. All 90 entries need a decision; ambiguous and excluded entries need explicit reasons. The freeze validator will reject missing entries, invalid labels, stale draft SHA, missing reviewer identity/date, or notes required for non-confirmed decisions. Only then can the reviewed corpus be frozen and model inference begin.
