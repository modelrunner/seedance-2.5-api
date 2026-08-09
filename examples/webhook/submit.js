/**
 * Submit a request with a webhook.
 *
 * Nothing is polled and nothing is held open: ModelRunner POSTs the result to
 * your URL when the request settles. This is the only pattern that survives a
 * restart on either side, which is what makes it right for multi-minute jobs.
 *
 * Requires @modelrunner/client >= 1.2.0. Older versions accept `webhookUrl`
 * and silently drop it - the submit succeeds and no callback ever arrives.
 *
 * Run the receiver first (see README.md in this directory), then:
 *   MODELRUNNER_KEY=... PUBLIC_WEBHOOK_URL=https://<tunnel>/webhooks/modelrunner node submit.js
 */

import { modelrunner } from "@modelrunner/client";

const webhookUrl = process.env.PUBLIC_WEBHOOK_URL;
if (!webhookUrl) {
  console.error("Set PUBLIC_WEBHOOK_URL to your receiver's public HTTPS URL.");
  process.exit(1);
}

const { request_id } = await modelrunner.queue.submit(
  "bytedance/seedance-v2.5/reference-to-video",
  {
    input: {
      reference_images: [
        "https://media.modelrunner.ai/D2FAkKEZ7WbZsyjLhyC7T.jpeg", // @Image1
        "https://media.modelrunner.ai/7BLQ9IGMlfwwjE2JPCNf8.jpeg", // @Image2
      ],
      prompt:
        "Place the matte black and copper stovetop espresso maker from @Image1 on the pale stone counter in @Image2. A thin curl of steam rises from its spout as the low morning sun tracks slowly across the room. The camera pushes in gently. The synchronized soundtrack carries the gurgle and hiss of coffee brewing and a cup set down on stone.",
      resolution: "480p",
      duration: 4,
    },

    webhookUrl,

    // Defaults to ["completed"]. `start` is best effort: a fast request can go
    // straight from IN_QUEUE to a terminal state between two provider polls, in
    // which case only `completed` is delivered. Never block waiting for `start`.
    webhookEvents: ["start", "completed"],

    // Your own tags. Never sent to the model, echoed back in the delivery -
    // the easiest way to correlate a callback with your records without a
    // database lookup. Max 16 keys, string values up to 512 chars.
    metadata: {
      example: "webhook-demo",
      submitted_by: "seedance-2.5-api",
    },
  },
);

console.log("Submitted:", request_id);
console.log("Waiting for the delivery to arrive at", webhookUrl);

// Note: `subscribe` also accepts webhookUrl, but it still blocks on an
// internal poll until the request finishes - which defeats the point.
// Use `queue.submit` when you want the webhook to be how you find out.
//
// An unusable webhook URL fails this submit with a 400 rather than being
// silently dropped: a non-HTTPS scheme, a malformed URL, credentials in the
// URL, a host resolving to a private address, or an unknown event name.
