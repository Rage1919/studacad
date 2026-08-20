# Tutor availability and booking operations

## Availability

Approved active tutors manage recurring rules at `/tutor/availability`. Each rule records a local weekday/time window, IANA timezone, session format, duration, lead time, buffers, and effective dates. Tutors can also maintain subject prices, group capacity, location/joining notes, and future blackout periods.

The public slot API calculates timestamps on the server, including daylight-saving gaps and folds, and removes blackouts, tutor conflicts, expired lead-time slots, and full groups. Every booking request recalculates the selected slot after locking the tutor profile; a stale browser result cannot force a booking.

## Booking and credits

Booking creation is one database transaction:

1. Recheck the active learner, approved tutor, subject, format, server price, rule, lead time, blackout periods, overlap, and group capacity.
2. Lock the tutor and learner wallet rows.
3. Reject an insufficient or stale balance.
4. Create or join the booking and participant record.
5. Post equal-and-opposite learner and booking-escrow ledger entries.
6. Append booking status and audit events.

The client supplies an idempotency key, but never a trusted price, duration, capacity, or credit amount. Exact retries return the original booking without a second debit. Private bookings serialize on the tutor row, and group joins lock the shared booking before checking capacity.

## Statuses and valid actions

The data model supports pending, held, confirmed, learner/tutor cancellation, completed, no-show, disputed, expired, and refunded states. Current user actions are deliberately narrow:

- Learner or tutor: cancel a confirmed future lesson.
- Tutor: mark a lesson completed or record a no-show after its end time.
- Active learner participant: raise a dispute from the start time through seven days after the end.

Every transition is server-authorized, append-only in status history, audited, and idempotent.

## Interim cancellation policy requiring product confirmation

Until a final commercial policy is approved, Studacad uses the learner-friendly safe default: **a cancellation before the lesson starts receives a full credit refund; cancellation is blocked after the start time**. Tutor cancellation refunds every active participant. A learner leaving a group receives only their own refund; the group remains confirmed while another active participant remains.

Changing this policy later must be implemented and tested in the database transaction, not only in UI text.

## Operational recovery

- Do not edit bookings, status events, or ledger entries to fix an error.
- Use an authorized compensating ledger entry for financial corrections.
- If booking creation fails after a stale slot or balance response, reload slots and the wallet; the transaction rolls back without a partial booking or debit.
- If a downstream Meet, message, or notification integration fails, retain the confirmed booking and retry that downstream event. Those integrations must not recreate or charge the booking.
