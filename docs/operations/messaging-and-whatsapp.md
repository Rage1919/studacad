# Messaging and WhatsApp operations

## Authoritative channel

Studacad in-app messages are the durable source of truth. A learner starts one isolated conversation with an approved tutor, and both accounts remain explicit participants. Every list, send, report, and block action rechecks participation server-side. Browser storage, tutor query parameters, and public tutor data never grant access.

Messages are limited to 2,000 characters, use a sender-scoped idempotency key, and are rate limited. A block in either direction prevents further sends. Users can report an inbound message; admins review only reported content at `/admin/message-reports`, and all decisions are audited.

## Private WhatsApp mapping

WhatsApp is optional secondary delivery. A tutor number belongs only in `tutor_messaging_channels`; it is never returned by the public tutor API. An administrator must verify that the number belongs to the approved tutor before changing the channel to `verified`. Generated/demo numbers are prohibited.

Outbound delivery is queued only for a verified channel. The interface reports in-app and WhatsApp states separately. Missing credentials mark WhatsApp unavailable without changing the in-app `sent` state. Known-safe provider failures retry with capped backoff; unknown outcomes require support to avoid duplicate delivery.

Inbound replies must contain a provider `context.id` referencing a Studacad outbound WhatsApp message. The signed webhook maps that provider ID to exactly one delivery/conversation and verifies the sender against the private tutor channel. Context-free or mismatched messages are ignored rather than guessed into a learner conversation.

## Provider setup and recovery

1. Create the Meta WhatsApp Business/Cloud API account and register the production phone number.
2. Select and record a supported Graph API version; upgrades require staging delivery/status/replay tests.
3. Configure `GET/POST https://studacad.com/api/whatsapp` with the verify token and app secret. Production signatures always fail closed.
4. Store the access token and identifiers in the deployment secret store.
5. Call `POST /api/internal/messages/deliver` every minute with `Authorization: Bearer <MESSAGE_DELIVERY_SECRET>`.

Search `provider_webhook_events`, `message_deliveries`, and correlated audit events by provider message or conversation ID. Never put message bodies, phone numbers, tokens, or raw webhook payloads in ordinary logs/tickets. Replayed webhook envelopes and provider message IDs are deduplicated. During an outage, advise users that in-app messaging remains available and do not claim WhatsApp delivery.
