"""
Webhook receiver - FastAPI.

Every delivery is signed with Standard Webhooks (https://www.standardwebhooks.com).
The four things this file demonstrates are the four things receivers get wrong:

  1. Verify against the RAW body. Parsing and reserializing the JSON breaks
     the signature.
  2. Deduplicate on `webhook-id`. Delivery is at-least-once and that id is
     stable across retries.
  3. Acknowledge BEFORE doing the work. A slow 200 is a failed attempt.
  4. Check `billingStatus`, not `status`. See handle() below.

  pip install fastapi uvicorn "modelrunner-ai>=0.3.0"
  MODELRUNNER_WEBHOOK_SECRET=whsec_... uvicorn receiver_fastapi:app --port 3000

If you redirect the output to a file, Python block-buffers stdout and these
prints will not appear when you expect them. The prints below pass flush=True
for that reason; PYTHONUNBUFFERED=1 does the same job globally.
"""

import os
import sys

from fastapi import BackgroundTasks, FastAPI, Request, Response
from modelrunner_ai import WebhookVerificationError, verify_webhook

SECRET = os.environ.get("MODELRUNNER_WEBHOOK_SECRET")
if not SECRET:
    sys.exit(
        "Set MODELRUNNER_WEBHOOK_SECRET. Fetch it once with:\n"
        '  curl -H "Authorization: Key $MODELRUNNER_KEY" '
        "https://modelrunner.run/webhooks/default/secret"
    )

app = FastAPI()

# Deliveries already seen, by `webhook-id`. In production this belongs in
# Redis or a table with a TTL - an in-process set dies with the worker and
# does not dedupe across replicas.
seen: set[str] = set()


@app.post("/webhooks/modelrunner")
async def receive(request: Request, background: BackgroundTasks) -> Response:
    raw = await request.body()  # raw bytes, before any JSON parsing

    try:
        payload = verify_webhook(SECRET, request.headers, raw)
    except WebhookVerificationError:
        # Missing header, timestamp outside the 5-minute tolerance, or a
        # signature mismatch. Treat all three the same and never branch on the
        # message.
        return Response(status_code=401)

    delivery_id = request.headers.get("webhook-id")
    if delivery_id in seen:
        print(f"[dedupe] already handled delivery {delivery_id}", flush=True)
        return Response(status_code=200)
    seen.add(delivery_id)

    # Acknowledge first, then work. The attempt times out at 15 seconds and a
    # slow 200 counts as a failure, which triggers a retry you did not want.
    background.add_task(handle, payload)
    return Response(status_code=200)


@app.post("/webhooks/retired")
async def retired() -> Response:
    # Reply 410 Gone from an endpoint you have retired and retries stop
    # permanently, instead of running the full ~2 hour schedule.
    return Response(status_code=410)


def handle(payload: dict) -> None:
    if payload.get("event") == "start":
        print(f"[start] {payload['id']} began generating", flush=True)
        return

    # A generation that failed at the provider is still recorded as
    # status: "COMPLETED" - the request completed, it just produced no output.
    # Code that keys off `status` alone reports every failure as a success.
    # A real success is COMPLETED with billingStatus "charged" or "partial".
    if payload.get("billingStatus") == "failed":
        print(f"[failed] {payload['id']}: {payload.get('error')}", flush=True)
        return

    print(f"[completed] {payload['id']}", flush=True)
    print(f"  output:    {payload.get('output')}", flush=True)
    print(f"  metadata:  {payload.get('metadata')}", flush=True)
    print(f"  inference: {payload.get('inferenceTime')} ms", flush=True)
