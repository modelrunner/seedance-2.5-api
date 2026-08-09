/**
 * Webhook receiver - Express.
 *
 * Every delivery is signed with Standard Webhooks (https://www.standardwebhooks.com).
 * The four things this file demonstrates are the four things receivers get wrong:
 *
 *   1. Verify against the RAW body. express.json() reserializes and the
 *      signature no longer matches.
 *   2. `await` the verify. It returns a promise, so a synchronous try/catch
 *      around it catches nothing and forged deliveries sail through.
 *   3. Deduplicate on `webhook-id`. Delivery is at-least-once and that id is
 *      stable across retries.
 *   4. Acknowledge BEFORE doing the work. A slow 200 is a failed attempt.
 *   5. Check `billingStatus`, not `status`. See handle() below.
 *
 *   npm install express @modelrunner/client
 *   MODELRUNNER_WEBHOOK_SECRET=whsec_... node receiver_express.js
 */

import express from "express";
import { modelrunner } from "@modelrunner/client";

const SECRET = process.env.MODELRUNNER_WEBHOOK_SECRET;
if (!SECRET) {
  console.error(
    "Set MODELRUNNER_WEBHOOK_SECRET. Fetch it once with:\n" +
      '  curl -H "Authorization: Key $MODELRUNNER_KEY" https://modelrunner.run/webhooks/default/secret',
  );
  process.exit(1);
}

const app = express();

// Deliveries already seen, by `webhook-id`. In production this belongs in
// Redis or a table with a TTL - an in-memory Set dies with the process and
// does not dedupe across replicas.
const seen = new Set();

app.post(
  "/webhooks/modelrunner",
  // The signature covers the delivered bytes. express.json() would destroy it.
  express.raw({ type: "application/json" }),
  // `verify` is async. The handler must be async and the call awaited - a
  // synchronous try/catch around it catches nothing, the rejection escapes as
  // an unhandled promise rejection, and execution carries on as though the
  // signature had passed. That accepts forged deliveries.
  async (req, res) => {
    let payload;
    try {
      payload = await modelrunner.webhooks.verify({
        secret: SECRET,
        headers: req.headers,
        body: req.body,
      });
    } catch {
      // Missing header, timestamp outside the 5-minute tolerance, or a
      // signature mismatch. Treat all three the same and never branch on the
      // message.
      return res.sendStatus(401);
    }

    // Acknowledge first, then work. The attempt times out at 15 seconds and a
    // slow 200 counts as a failure, which triggers a retry you did not want.
    res.sendStatus(200);

    const deliveryId = req.headers["webhook-id"];
    if (seen.has(deliveryId)) {
      console.log(`[dedupe] already handled delivery ${deliveryId}`);
      return;
    }
    seen.add(deliveryId);

    handle(payload);
  },
);

function handle(payload) {
  if (payload.event === "start") {
    console.log(`[start] ${payload.id} began generating`);
    return;
  }

  // A generation that failed at the provider is still recorded as
  // status: "COMPLETED" - the request completed, it just produced no output.
  // Code that keys off `status` alone reports every failure as a success.
  // A real success is COMPLETED with billingStatus "charged" or "partial".
  if (payload.billingStatus === "failed") {
    console.error(`[failed] ${payload.id}:`, payload.error);
    return;
  }

  console.log(`[completed] ${payload.id}`);
  console.log("  output:  ", payload.output);
  console.log("  metadata:", payload.metadata);
  console.log("  inference:", payload.inferenceTime, "ms");
}

// Reply 410 Gone from an endpoint you have retired and retries stop
// permanently, instead of running the full ~2 hour schedule.
app.post("/webhooks/retired", (_req, res) => res.sendStatus(410));

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000/webhooks/modelrunner");
  console.log("Expose it with a tunnel, then set PUBLIC_WEBHOOK_URL to the public URL.");
});
