"""
Submit a request with a webhook.

Nothing is polled and nothing is held open: ModelRunner POSTs the result to
your URL when the request settles. This is the only pattern that survives a
restart on either side, which is what makes it right for multi-minute jobs.

Requires modelrunner-ai >= 0.3.0. Older versions accept `webhook_url` and
silently drop it - the submit succeeds and no callback ever arrives.

Run the receiver first (see README.md in this directory), then:
  MODELRUNNER_KEY=... PUBLIC_WEBHOOK_URL=https://<tunnel>/webhooks/modelrunner python submit.py
"""

import os
import sys

import modelrunner_ai

webhook_url = os.environ.get("PUBLIC_WEBHOOK_URL")
if not webhook_url:
    sys.exit("Set PUBLIC_WEBHOOK_URL to your receiver's public HTTPS URL.")

handle = modelrunner_ai.submit(
    "bytedance/seedance-v2.5/first-last-frame",
    arguments={
        "image": "https://media.modelrunner.ai/pyJMS2iOt5vEEKWQo5aWD.jpeg",
        "end_image": "https://media.modelrunner.ai/90cxOiEMl16l485iLZghi.jpeg",
        "prompt": (
            "In one uninterrupted take, the fog thins and lifts off the water as "
            "the cold blue light gives way to a low golden sun. The moored rowboat "
            "rocks gently on its line and ripples spread across the glassy surface. "
            "Hold the camera fixed. Rope creaks against iron, water laps at the "
            "hull, and birdsong builds gradually across the lake."
        ),
        "resolution": "480p",
        "duration": 4,
    },
    webhook_url=webhook_url,
    # Defaults to ["completed"]. `start` is best effort: a fast request can go
    # straight from IN_QUEUE to a terminal state between two provider polls, in
    # which case only `completed` is delivered. Never block waiting for `start`.
    webhook_events=["start", "completed"],
    # Your own tags. Never sent to the model, echoed back in the delivery -
    # the easiest way to correlate a callback with your records without a
    # database lookup. Max 16 keys, string values up to 512 chars.
    metadata={
        "example": "webhook-demo",
        "submitted_by": "seedance-2.5-api",
    },
)

print(f"Submitted: {handle.request_id}")
print(f"Waiting for the delivery to arrive at {webhook_url}")

# An unusable webhook URL fails this submit rather than being silently
# dropped: a non-HTTPS scheme, a malformed URL, credentials in the URL, a host
# resolving to a private address, or an unknown event name.
