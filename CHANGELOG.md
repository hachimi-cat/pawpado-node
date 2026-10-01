# Changelog

## 0.3.0
- `verifyWebhook(rawBody, signatureHeader, secret)` returns a webhook delivery's event (`PawpadoWebhookEvent`: `id`, `type`, `occurredAt`, `workspaceId`, `data`) or throws `PawpadoWebhookError`; `verifyWebhookSignature(...)` answers true/false. Both check `Pawpado-Signature` (`t=…,v1=…`) over the raw body and refuse a timestamp more than 5 minutes off (`toleranceSeconds`).
- `client.api`: the webhook delivery log and the event catalogue — `webhooksDeliveries({ subscriptionId, status, type, limit, cursor })`, `webhooksGetDeliveries(deliveryId)`, `webhooksDeliveriesRetry(deliveryId)`, `webhooksEventTypes()`; `webhooksUpdate(id, { url, events, active })` takes `url` and `events` as well as `active` (regenerated).

## 0.2.0
- `client.api.<area><Action>(...)`: every Pawpado feature route, one method each, generated from
  the API spec (`src/api.generated.ts`, made by `scripts/apigen.sh`). `client.api` keeps the raw
  `get` / `post` / `patch` / `put` / `delete` / `paginate` it always had.
- `apiKey` takes a Pawpado API key (`paw_live_…`) or a Huudis access token; every customer
  route now accepts both.
- Breaking — the hand-written methods now match what the server takes and returns:
  `credits.topup({ amountIdr } | { amountUsdCents })` (was `{ amountCents, currency }`),
  `settings.update({ idleAutoStopMinutes, playMode, launchOptions })` (was `storageGb`,
  `region`, `autoStopMinutes`, which the server ignored), `sessions.pair({ pin })` (the PIN
  was never sent), `billing.storage()` returns `{ presets, min, max }`, new
  `billing.resizeStorage({ storageGb })`, `account.delete()` POSTs `{ confirm: 'DELETE' }`
  (it sent DELETE, which the server does not serve; person-only — browser session). Response
  types for sessions, credits and connect follow the server.
- Removed: `account.session()` (the browser's own session probe; a key or token cannot use
  it) and the `admin` namespace (operator-only: admin session or cron secret).

## 0.1.1
- Package metadata now points at the public mirror repo (github.com/hachimi-cat/pawpado-node).

## 0.1.0
- Prior release.
