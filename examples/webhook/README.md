# Webhooks

Pass a `webhook` URL when you submit and ModelRunner POSTs the result to it when the
request settles. No polling loop, no long-lived connection, and nothing lost if your
process restarts mid-request — which is why it is the right pattern for video jobs that
run for minutes.

| File | What it is |
|---|---|
| `submit.js` / `submit.py` | Submit a request with a webhook attached |
| `receiver_express.js` | Receiver — Express |
| `receiver_fastapi.py` | Receiver — FastAPI |

> **Version floors.** Webhooks require `@modelrunner/client` >= 1.2.0 or
> `modelrunner-ai` >= 0.3.0. Earlier versions accept the URL and silently drop it: the
> submit succeeds and the callback never arrives. If you see nothing at all, check this
> first.

> **One key covers both clients.** `MODELRUNNER_KEY` is read by the Python client and by
> the JavaScript one as well — verified in `@modelrunner/client` 1.2.2, which falls back to
> `MODEL_RUNNER_KEY` only when `MODELRUNNER_KEY` is unset. On an older 1.2.x, set both.

## Run it locally

**1. Fetch your signing secret.** It is per-account — fetch it once and cache it, don't
call this on every delivery.

```bash
curl -H "Authorization: Key $MODELRUNNER_KEY" \
  https://modelrunner.run/webhooks/default/secret
```

```json
{ "key": "whsec_EXAMPLE0000000000000000000000000000000000" }
```

**2. Start a receiver** on port 3000.

```bash
npm install express @modelrunner/client
MODELRUNNER_WEBHOOK_SECRET=whsec_... node receiver_express.js
```

```bash
pip install fastapi uvicorn "modelrunner-ai>=0.3.0"
MODELRUNNER_WEBHOOK_SECRET=whsec_... uvicorn receiver_fastapi:app --port 3000
```

**3. Expose it over HTTPS.** Deliveries only go to publicly resolvable HTTPS hosts —
localhost, private and link-local addresses are rejected both at submit time and again at
delivery time.

```bash
cloudflared tunnel --url http://localhost:3000
# or: ngrok http 3000
```

**4. Submit**, pointing at the tunnel plus the receiver's path.

```bash
export MODELRUNNER_KEY=your_key
export PUBLIC_WEBHOOK_URL=https://your-tunnel.example.com/webhooks/modelrunner

node submit.js
# or: python submit.py
```

The receiver logs a verified `completed` delivery within a few seconds.

## The payload

The body is the same object the request endpoint returns, plus `event` and `billingStatus`.

```json
{
  "event": "completed",
  "id": "V1StGXR8_Z5jdHi6B",
  "modelEndpoint": "bytedance/seedance-v2.5/first-last-frame",
  "status": "COMPLETED",
  "billingStatus": "charged",
  "input": { "prompt": "..." },
  "output": "https://media.modelrunner.ai/abc123.mp4",
  "error": null,
  "metadata": { "example": "webhook-demo" },
  "inferenceTime": 207000,
  "delayTime": 0,
  "createdAt": "2026-08-07T12:00:00.000Z"
}
```

Whatever `metadata` you attached at submit time comes back untouched — the easiest way to
correlate a delivery with your own records without a database lookup.

> ⚠️ **Check `billingStatus`, not `status`.** A generation that failed at the provider is
> recorded as `status: "COMPLETED"` with `billingStatus: "failed"` and a populated `error`,
> because the *request* completed — it just produced no output. Code that keys off `status`
> alone reports every failure as a success. A real success is `COMPLETED` with a
> `billingStatus` of `charged` or `partial`.

If `input` serializes to more than 64KB it is replaced with `{ "_elided": "..." }`; fetch
the request itself if you need it.

## Events

| Event | Fires when |
|---|---|
| `completed` | The request reached a terminal state. This is the one you want. |
| `start` | The provider began executing (`IN_QUEUE` → `IN_PROGRESS`). |

`webhook_events_filter` defaults to `["completed"]`. `start` is best effort — a fast request
can go from `IN_QUEUE` straight to a terminal state between two provider polls, in which
case only `completed` is delivered. Never block waiting for `start`, and don't assume
ordering between the two.

## Verifying a delivery

Deliveries are signed with [Standard Webhooks](https://www.standardwebhooks.com), so an
off-the-shelf library verifies them — no hand-rolled crypto. Three headers are sent:

| Header | Meaning |
|---|---|
| `webhook-id` | Unique id for this delivery. **Stable across retries** — use it to deduplicate. |
| `webhook-timestamp` | Unix seconds. Reject deliveries far outside your tolerance. |
| `webhook-signature` | Space-delimited list of `v1,<base64>`. Match **any** one of them. |

It is HMAC-SHA256 over `{webhook-id}.{webhook-timestamp}.{rawBody}`, keyed by the base64
portion of the secret *after* the `whsec_` prefix. The header carries more than one
signature during a secret rotation, which is why you always iterate rather than comparing
against the first.

## Retries

A delivery succeeds on any `2xx` returned within **15 seconds**. Anything else — including
a `3xx`, since redirects are not followed — is a failed attempt, retried on a fixed
schedule:

```
5s → 30s → 2m → 5m → 10m → 20m → 30m → 45m → 60m
```

Ten attempts in all — the original plus the nine retries above — spread over roughly three
hours. Two things stop retries immediately: a `410 Gone`, and a URL that resolves to a
private address.

## When nothing arrives

Four failure modes account for almost all of it:

- **The body was parsed before verification.** `express.json()` or `await request.json()`
  reserializes the payload and the signature no longer matches the bytes that were signed.
  Use `express.raw()` / `await request.body()`.
- **A redirect.** A missing trailing slash, an `http`→`https` upgrade, or a `www.`
  canonicalization returns a `301` — recorded as a failed attempt, and you see silence.
  Point the webhook at its final URL.
- **A slow `200`.** Work done inside the request handler pushes you past the 15-second
  timeout, so a delivery you *did* process is recorded as failed and retried. Acknowledge
  first, then work.
- **An SDK below the version floor.** See the note at the top.

Inspect what actually happened:

```bash
# Recent deliveries, newest first. Filter by requestId, status or event.
curl -H "Authorization: Key $MODELRUNNER_KEY" \
  "https://modelrunner.run/webhooks/deliveries?limit=25"

# Re-send one after fixing your endpoint.
curl -X POST -H "Authorization: Key $MODELRUNNER_KEY" \
  https://modelrunner.run/webhooks/deliveries/{deliveryId}/replay
```

A replay reuses the original delivery's `webhook-id`, so a receiver that deduplicates on
that header will treat the replay as already handled and skip it. Clear the id from your
dedupe store first if you actually want the work to run again.

Each record carries `status` (`pending`, `delivering`, `delivered`, `failed`), `attempts`,
`lastResponseStatus` and `lastError` — enough to tell a broken endpoint from a broken
payload.

## Rotating the secret

```bash
curl -X POST -H "Authorization: Key $MODELRUNNER_KEY" \
  https://modelrunner.run/webhooks/default/secret/rotate
```

The previous secret keeps verifying for 24 hours and deliveries are signed with both during
that window, so you can roll the new value out without dropping anything.
