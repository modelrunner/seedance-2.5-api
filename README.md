# Seedance 2.0 API

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020+-yellow.svg)](https://nodejs.org)
[![ModelRunner](https://img.shields.io/badge/Platform-ModelRunner-6E56CF.svg)](https://modelrunner.ai)

**Seedance 2.0** is ByteDance's video generation model, available as an API on
[ModelRunner](https://modelrunner.ai). Video and sound are generated together — dialogue,
ambience and effects land in sync with the picture instead of being dubbed on afterwards.

> **[Get started](https://modelrunner.ai/models/bytedance/seedance-v2/text-to-video)** — run
> Seedance 2.0 in the playground.

<!-- SWAP:start status-note -->
> **Note on the examples.** The runnable code in `examples/` targets **Seedance 2.5**
> (`bytedance/seedance-v2.5/*`), the newest generation: single takes up to 30 seconds, but
> a 720p ceiling. The API reference below still describes **Seedance 2.0**, whose endpoints
> reach 1080p and remain available. The two generations take almost the same parameters —
> 2.5 adds `duration: -1` for model-chosen length, raises `reference_images` to 30, and
> drops 1080p.
<!-- SWAP:end status-note -->

## What is Seedance 2.0?

Seedance 2.0 is a video generation model from ByteDance, available through the ModelRunner
API as a text to video API, an image to video API, and a reference to video API. It
generates 4–15 second clips at 24fps from 480p up to 1080p, in seven frame shapes, with a
synchronized soundtrack produced alongside the picture. Prompts are understood in English,
Chinese, Japanese, Indonesian, Spanish and Portuguese.

Nine endpoints cover text-to-video, image-to-video, reference-to-video, first-and-last-frame
transitions and video-to-video restyling, across three price tiers.

## Features

- **Native synchronized audio** — dialogue, ambience and sound effects generated with the
  picture, not dubbed over it
- **Text to Video** — a written scene description becomes a shot with sound
- **Image to Video** — your still becomes the first frame
- **Reference to Video** — up to 9 reference images steer identity, wardrobe, product,
  location or style
- **First and Last Frame** — pin the opening and closing frames; the model invents the
  motion between them
- **Video to Video** — restyle, restage or extend footage you already have
- **4 to 15 seconds** at 24fps, from **480p to 1080p**
- **Seven frame shapes** — 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 and adaptive
- **Six prompt languages** — English, Chinese, Japanese, Indonesian, Spanish, Portuguese
- **Three tiers** — standard, fast, and mini, from $0.053/sec

## Quick Start

<!-- SWAP:start quick-start -->

### Python

```bash
pip install "modelrunner-ai>=0.4.0"
```

```python
import modelrunner_ai

handle = modelrunner_ai.submit(
    "bytedance/seedance-v2.5/text-to-video",
    arguments={
        "prompt": "A lighthouse keeper climbs the spiral stair at dawn, lamp glass catching the first light. The camera follows a step behind. Gulls call outside as the storm clears.",
        "resolution": "480p",
        "aspect_ratio": "16:9",
        "duration": 4,
    },
)

result = handle.get()  # blocks until the request settles
print(result["output"])
```

> Either works: `run()` blocks until the result is ready, while `submit()` + `handle.get()`
> lets you do something else in between. On `modelrunner-ai` 0.3.x, `run()` returned the
> queue envelope (`request_id`, `status_url`, `response_url`) rather than the result, so
> `result["output"]` raised a `KeyError` — fixed in 0.4.0, which follows the envelope for
> you.

### JavaScript

```bash
npm install "@modelrunner/client@>=1.2.0"
```

```javascript
import { modelrunner } from "@modelrunner/client";

const result = await modelrunner.subscribe(
  "bytedance/seedance-v2.5/text-to-video",
  {
    input: {
      prompt:
        "A lighthouse keeper climbs the spiral stair at dawn, lamp glass catching the first light. The camera follows a step behind. Gulls call outside as the storm clears.",
      resolution: "480p",
      aspect_ratio: "16:9",
      duration: 4,
    },
  },
);

console.log(result.data.output);
```

### cURL

Requests are queued, so this is two steps: submit, then read the result.

```bash
# 1. Submit. Returns request_id, status_url and response_url.
curl -X POST https://queue.modelrunner.run/bytedance/seedance-v2.5/text-to-video \
  -H "Authorization: Key $MODELRUNNER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A lighthouse keeper climbs the spiral stair at dawn, gulls calling outside as the storm clears.",
    "resolution": "480p",
    "duration": 4
  }'

# 2. Once status is COMPLETED, fetch the output.
curl -H "Authorization: Key $MODELRUNNER_KEY" "$RESPONSE_URL"
```

To skip the polling entirely, attach a webhook — see below.

<!-- SWAP:end quick-start -->

---

## Webhooks

Video generation takes minutes. Rather than hold a connection open or poll in a loop, pass
a `webhook` URL at submit time and ModelRunner POSTs the result when the request settles.
It is the only option that survives a restart on either side.

```javascript
const { request_id } = await modelrunner.queue.submit(
  "bytedance/seedance-v2/text-to-video",
  {
    input: { prompt: "...", resolution: "1080p", duration: 8 },
    webhookUrl: "https://example.com/webhooks/modelrunner",
    webhookEvents: ["completed"], // the default
  },
);
```

```python
handle = modelrunner_ai.submit(
    "bytedance/seedance-v2/text-to-video",
    arguments={"prompt": "...", "resolution": "1080p", "duration": 8},
    webhook_url="https://example.com/webhooks/modelrunner",
)
```

> Webhooks require `@modelrunner/client` >= 1.2.0 or `modelrunner-ai` >= 0.3.0. Earlier
> versions accept the URL and silently drop it.

### The delivery

The body is the request object plus `event` and `billingStatus`:

```json
{
  "event": "completed",
  "id": "V1StGXR8_Z5jdHi6B",
  "modelEndpoint": "bytedance/seedance-v2/text-to-video",
  "status": "COMPLETED",
  "billingStatus": "charged",
  "output": "https://media.modelrunner.ai/abc123.mp4",
  "error": null,
  "metadata": { "jobId": "42" },
  "inferenceTime": 41200,
  "createdAt": "2026-08-07T12:00:00.000Z"
}
```

> ⚠️ **Check `billingStatus`, not `status`.** A generation that failed at the provider is
> recorded as `status: "COMPLETED"` with `billingStatus: "failed"` — the *request*
> completed, it just produced no output. Keying off `status` alone reports every failure as
> a success. A real success is `COMPLETED` with `billingStatus` of `charged` or `partial`.

| Event | Fires when |
|---|---|
| `completed` | The request reached a terminal state. This is the one you want. |
| `start` | The provider began executing. Best effort — never block on it. |

Deliveries are signed with [Standard Webhooks](https://www.standardwebhooks.com)
(HMAC-SHA256 over the raw body), retried ten times over roughly two hours, and inspectable
after the fact. **Verify against the raw bytes** — parsing and reserializing the JSON breaks
the signature.

Runnable receivers for Express and FastAPI, plus local tunnel setup and the four reasons a
delivery never arrives, are in **[examples/webhook/](examples/webhook/)**.

---

## Endpoints

Three tiers. Rates are per second of generated video.

### Standard

Full quality, up to 1080p, and the only tier with the reference, first-last-frame and
video-to-video endpoints.

| Endpoint | Model ID | 480p | 720p | 1080p |
|---|---|---|---|---|
| [Text to Video](https://modelrunner.ai/models/bytedance/seedance-v2/text-to-video) | `bytedance/seedance-v2/text-to-video` | $0.105 | $0.227 | $0.561 |
| [Image to Video](https://modelrunner.ai/models/bytedance/seedance-v2/image-to-video) | `bytedance/seedance-v2/image-to-video` | $0.105 | $0.227 | $0.561 |
| [Reference to Video](https://modelrunner.ai/models/bytedance/seedance-v2/reference-to-video) | `bytedance/seedance-v2/reference-to-video` | $0.105 | $0.227 | $0.561 |
| [First and Last Frame](https://modelrunner.ai/models/bytedance/seedance-v2/first-last-frame) | `bytedance/seedance-v2/first-last-frame` | $0.105 | $0.227 | $0.561 |
| [Video to Video](https://modelrunner.ai/models/bytedance/seedance-v2/video-to-video) | `bytedance/seedance-v2/video-to-video` | usage-based — see below | | |

### Fast

Lower cost and quicker turnaround, up to 720p.

| Endpoint | Model ID | 480p | 720p |
|---|---|---|---|
| [Text to Video](https://modelrunner.ai/models/bytedance/seedance-v2-fast/text-to-video) | `bytedance/seedance-v2-fast/text-to-video` | $0.084 | $0.181 |
| [Image to Video](https://modelrunner.ai/models/bytedance/seedance-v2-fast/image-to-video) | `bytedance/seedance-v2-fast/image-to-video` | $0.084 | $0.181 |

### Mini

The cheapest tier — for drafting, batching and high-volume work. Up to 720p.

| Endpoint | Model ID | 480p | 720p |
|---|---|---|---|
| [Text to Video](https://modelrunner.ai/models/bytedance/seedance-v2-mini/text-to-video) | `bytedance/seedance-v2-mini/text-to-video` | $0.053 | $0.113 |
| [Image to Video](https://modelrunner.ai/models/bytedance/seedance-v2-mini/image-to-video) | `bytedance/seedance-v2-mini/image-to-video` | $0.053 | $0.113 |

> **Video to Video is metered on tokens, not seconds** — $7.05 per million output tokens.
> Tokens scale with the output's width, height, frame rate and duration, *and* with the
> duration of the reference footage you send, so a long source clip costs more than a short
> one. Trim references to the part that matters. See the
> [model page](https://modelrunner.ai/models/bytedance/seedance-v2/video-to-video) for
> current pricing.

Resolution is the largest cost driver and duration the second. Iterate at 480p, then re-run
the keeper at 1080p.

> The tiers overlap in price but not in kind: mini at 720p ($0.113/sec) costs slightly more
> than standard at 480p ($0.105/sec). Choose between them on resolution versus fidelity —
> mini buys 720p at mini quality, standard's 480p buys less resolution at full quality.

---

## API Reference

### Common parameters

Every Seedance 2.0 endpoint accepts these:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | Yes | — | The scene, the action, the camera move and the sound you want |
| `duration` | integer | No | `5` | Clip length in seconds, `4` to `15` |
| `resolution` | string | No | `"720p"` | `"480p"`, `"720p"` or `"1080p"` (fast and mini: no 1080p) |
| `aspect_ratio` | string | No | varies | `"16:9"`, `"4:3"`, `"1:1"`, `"3:4"`, `"9:16"`, `"21:9"` or `"adaptive"` |
| `generate_audio` | boolean | No | `true` | Generate a synchronized soundtrack. `false` gives a silent clip at the same price |

There is no `seed` parameter — repeat runs of the same prompt produce different clips.

---

### Text to Video

Build a shot from words alone.

**Model IDs:** `bytedance/seedance-v2/text-to-video` · `bytedance/seedance-v2-fast/text-to-video` · `bytedance/seedance-v2-mini/text-to-video`

Common parameters only. `aspect_ratio` defaults to `"16:9"`.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/text-to-video",
    arguments={
        "prompt": "A lighthouse keeper climbs the spiral stair at dawn, lamp glass catching the first light. Gulls call outside as the storm clears.",
        "resolution": "1080p",
        "duration": 8,
        "aspect_ratio": "9:16",
        "generate_audio": True,
    },
)
```

---

### Image to Video

Your still becomes the first frame; the prompt describes what happens next.

**Model IDs:** `bytedance/seedance-v2/image-to-video` · `bytedance/seedance-v2-fast/image-to-video` · `bytedance/seedance-v2-mini/image-to-video`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `image` | string (URL) | Yes | — | The first frame. 300–6000 px per side, under 30 MB, aspect ratio between 1:2.5 and 2.5:1 |

Plus the common parameters. `aspect_ratio` defaults to `"adaptive"`, which keeps the source
image's shape — set it explicitly only when you want a deliberate re-frame.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/image-to-video",
    arguments={
        "prompt": "Sea mist drifts across the still water. The gull lifts off the railing and glides out over the bay.",
        "image": "https://example.com/harbour.jpg",
        "resolution": "720p",
        "duration": 6,
    },
)
```

Spend the prompt on what *moves* and what is *heard* — the still already fixes the subject.

---

### Reference to Video

Steer a generation with up to 9 reference images: a character, an outfit, a product, a
location, a style plate.

**Model ID:** `bytedance/seedance-v2/reference-to-video`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `reference_images` | list\<string\> | Yes | — | 1 to 9 images steering identity, wardrobe, product, location or style. JPEG, PNG or WebP, under 30 MB each |
| `reference_audios` | list\<string\> | No | — | Up to 3 audio references. MP3 or WAV, under 15 MB each and 15 seconds combined. Never on their own — at least one reference image is required. **Experimental** |

Plus the common parameters. `aspect_ratio` defaults to `"16:9"` — reference images do not
fix the framing, so set the shape you want.

**Name every reference in the prompt.** References are addressed positionally as
`@Image1`…`@Image9` and `@Audio1`…`@Audio3`, numbered by their order in the arrays. Order
*is* the address, so keep the arrays stable while you iterate on the prompt. A reference the
prompt never names is usually ignored or misapplied.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/reference-to-video",
    arguments={
        "prompt": "@Image1 walks through the night market in @Image3, wearing the red jacket from @Image2. Handheld camera follows just behind her shoulder; rain drums on canvas awnings, distant chatter.",
        "reference_images": [
            "https://example.com/anna.jpg",
            "https://example.com/red-jacket.png",
            "https://example.com/night-market.jpg",
        ],
        "resolution": "720p",
        "duration": 10,
        "aspect_ratio": "16:9",
    },
)
```

Nine references is the cap, and packing many subjects into one shot lowers fidelity for
each. Faces, logos and fine product detail drift on large motions and extreme angles.

---

### First and Last Frame

Pin the opening and closing frames; the model invents the motion between them.

**Model ID:** `bytedance/seedance-v2/first-last-frame`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `image` | string (URL) | Yes | — | The **first** frame |
| `end_image` | string (URL) | Yes | — | The **last** frame. Pass the same URL as `image` for a seamless loop |

Plus the common parameters. `aspect_ratio` defaults to `"adaptive"`. If the two frames have
different aspect ratios the first wins and the last is cropped to fit, so match them
yourself when the crop matters.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/first-last-frame",
    arguments={
        "prompt": "The espresso machine's portafilter locks into place, the first dark stream falls into the cup, and steam curls up as it fills.",
        "image": "https://example.com/empty-cup.jpg",
        "end_image": "https://example.com/full-cup.jpg",
        "resolution": "720p",
        "duration": 6,
    },
)
```

The two frames should be plausibly connected — the model invents a story between them
rather than a cross-fade. A full scene or identity change can drift in the middle.

---

### Video to Video

Restyle, restage or extend footage you already have.

**Model ID:** `bytedance/seedance-v2/video-to-video`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `reference_videos` | list\<string\> | Yes | — | 1 to 3 clips steering motion, camera movement and pacing. MP4 or MOV (H.264/H.265), 2–15s each and no more than 15s combined, 480p–4k, 24–60fps, under 200 MB each |
| `reference_images` | list\<string\> | No | — | Up to 9 images steering identity, wardrobe, product, location or style |
| `reference_audios` | list\<string\> | No | — | Up to 3 audio references |

Plus the common parameters. References are addressed as `@Video1`…`@Video3`,
`@Image1`…`@Image9` and `@Audio1`…`@Audio3`.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/video-to-video",
    arguments={
        "prompt": "Match the camera movement and pacing of @Video1, but restage it on a snowbound forest trail at dusk. The hiker wears the red parka from @Image1.",
        "reference_videos": ["https://example.com/handheld-walk.mp4"],
        "reference_images": ["https://example.com/red-parka.jpg"],
        "resolution": "720p",
        "duration": 8,
    },
)
```

The result is a new generation, not a re-encode — exact frames, faces and on-screen text
are not preserved. Say which property you are borrowing (motion, framing, lighting,
wardrobe) rather than "like the reference".

---

## Prompt Guide

A Seedance prompt works best as **Subject + Action + Camera + Scene/Lighting + Style**, at
roughly 50–150 words. Lighting has the single largest effect on how the output reads, and
the soundtrack follows the prompt just as the picture does — so describe what you want to
*hear* as specifically as what you want to see.

**What helps:**

- Put camera language in the prompt: "slow dolly push in", "handheld follow", not "the
  camera moves"
- Describe camera movement and subject movement in separate clauses — blending them
  produces shaky output
- Name the sound: "gulls calling, waves on shingle" beats leaving the audio to chance
- Draft at 480p on the mini tier, then re-run the keeper at 1080p on standard

**What hurts:**

- The word "fast" tends to introduce jitter. If you need pace, keep exactly one element fast
- Stacking many separate shots into one prompt drifts in character, wardrobe and lighting
- Text rendered inside the frame is frequently misspelled — don't rely on it
- Fast motion and crowds smear at 480p; 720p or higher holds the detail

### Cinematic

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/text-to-video",
    arguments={
        "prompt": "A cartographer unrolls a water-stained map across a table in a canvas field tent. Lamplight swings gently overhead, throwing her shadow along the tent wall as she traces a river with one finger. The camera holds a slow push from a medium shot to a close-up on her hands. Rain drums steadily on the canvas, and a wooden pole creaks in the wind. Warm amber key light against cold blue outside, fine film grain, shallow focus.",
        "resolution": "1080p",
        "duration": 10,
        "aspect_ratio": "21:9",
    },
)
```

### Product

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/text-to-video",
    arguments={
        "prompt": "A ceramic pour-over cone sits on a pale oak counter as water spirals into the grounds and blooms. The camera orbits slowly a few degrees off level, then settles into a macro shot of the first drops falling into the glass carafe below. Soft north-facing window light with a long gentle falloff, matte surfaces, one clean specular highlight along the rim. Only the trickle of water and the low hum of a kettle settling.",
        "resolution": "1080p",
        "duration": 8,
        "aspect_ratio": "16:9",
    },
)
```

### Nature

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/text-to-video",
    arguments={
        "prompt": "Fog moves through a valley of black spruce as dawn light reaches the ridgeline and works its way down the slope. A river below catches the first light in broken silver. The camera holds a wide, locked establishing frame with an almost imperceptible push in. Birdsong builds gradually over the constant low rush of water. Naturalistic colour, deep dynamic range, no stylisation.",
        "resolution": "1080p",
        "duration": 12,
        "aspect_ratio": "21:9",
    },
)
```

### Character consistency

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2/reference-to-video",
    arguments={
        "prompt": "@Image1 steps out of a bookshop into heavy rain, pauses under the awning, then lifts a folded newspaper over her head and walks out into it. The camera tracks alongside at shoulder height. Neon from the storefront across the street reflects in the wet pavement. Rain on the awning, tyres hissing past, no dialogue.",
        "reference_images": ["https://example.com/character.jpg"],
        "resolution": "720p",
        "duration": 10,
        "aspect_ratio": "16:9",
    },
)
```

### Vertical / social

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2-fast/text-to-video",
    arguments={
        "prompt": "A glassblower turns a glowing gather of molten glass at the furnace mouth. Orange light flares across a scarred leather apron as the blowpipe rotates steadily. The camera stays tight and slightly low, framed for vertical. The workshop falls away dark behind. The roar of the furnace and the faint ring of a tool set down on steel.",
        "resolution": "720p",
        "duration": 6,
        "aspect_ratio": "9:16",
    },
)
```

> **[Try these prompts](https://modelrunner.ai/models/bytedance/seedance-v2/text-to-video)**
> in the playground.

---

## Output Format

Every endpoint returns the generated file as a URL string in `output`:

```json
{
  "id": "9aslrhFD7Wz4V2AY1TYn3",
  "modelEndpoint": "bytedance/seedance-v2/text-to-video",
  "status": "COMPLETED",
  "output": "https://media.modelrunner.ai/abc123.mp4",
  "input": { "prompt": "..." },
  "createdAt": "2026-08-07T20:34:14.764Z",
  "inferenceTime": 41200,
  "delayTime": 0,
  "logs": "Generated 1 successful outputs, 0 failed",
  "error": "",
  "thumbnails": [{ "type": "image", "url": "https://media.modelrunner.ai/xyz.webp" }],
  "metadata": {}
}
```

In Python that object is what `handle.get()` returns, so the URL is `result["output"]`. In
JavaScript the client wraps it as `{ data, requestId }`, so it is **`result.data.output`** —
`result.output` is `undefined`.

---

## Authentication

One variable covers both clients:

```bash
export MODELRUNNER_KEY="your_modelrunner_api_key"
```

`MODELRUNNER_KEY` is the canonical spelling across the platform — the Python client, the
proxy and the REST API all read it. `@modelrunner/client` reads it too, falling back to
`MODEL_RUNNER_KEY` (with the extra underscore) only when it is unset.

> Older notes tell you to set both because the JavaScript client once read *only*
> `MODEL_RUNNER_KEY`. That was fixed — verified in 1.2.2, the version this repo pins,
> where `MODELRUNNER_KEY` alone authenticates. The exact release the fix landed in is not
> recorded, so if you are pinned to an older 1.2.x and see a `401`, set `MODEL_RUNNER_KEY`
> as well.

Over raw HTTP, send the key as `Authorization: Key $MODELRUNNER_KEY`. Create keys under
**Profile → Keys** in the [dashboard](https://modelrunner.ai). See `.env.example` for the
full set of variables the examples use.

---

## Examples

<!-- SWAP:start examples-table -->

Runnable examples, against Seedance 2.5:

| Example | File | Endpoint |
|---|---|---|
| First and Last Frame | [first_last_frame.py](examples/first_last_frame.py) | `bytedance/seedance-v2.5/first-last-frame` |
| Reference to Video | [reference_to_video.js](examples/reference_to_video.js) | `bytedance/seedance-v2.5/reference-to-video` |
| Webhook — submit | [submit.py](examples/webhook/submit.py) · [submit.js](examples/webhook/submit.js) | — |
| Webhook — receiver | [receiver_fastapi.py](examples/webhook/receiver_fastapi.py) · [receiver_express.js](examples/webhook/receiver_express.js) | — |

Both examples run at 480p for 4 seconds — the cheapest configuration — and carry
commented variants for the longer, higher-resolution and model-chosen-duration cases. Each
was **charged $0.77** and took 2–3.5 minutes of inference.

> **The balance gate is not the clip price.** A submit is rejected with `402`
> (`Insufficient balance: <yours> < <threshold>`) unless your available balance clears a
> threshold set per endpoint, and that threshold does not scale down with the clip you ask
> for. Both examples were first rejected against a threshold of **$10.757** — the average
> cost per run the catalog advertises for these endpoints — and then, once the balance
> cleared it, were charged **$0.77** each. So you must hold roughly $10.76 to generate a
> clip that costs 77 cents. Budget for the gate, not the invoice, and check the model page
> for the current figure rather than trusting this one.

See **[examples/webhook/](examples/webhook/)** for the full webhook walkthrough.

<!-- SWAP:end examples-table -->

---

## Resources

- [Seedance 2.0 on ModelRunner](https://modelrunner.ai/models/bytedance/seedance-v2/text-to-video) — try it in the playground
- [ModelRunner Documentation](https://modelrunner.ai/docs) — platform docs
- [Python Client](https://modelrunner.ai/docs/clients/python-client) — `modelrunner-ai`
- [JavaScript Client](https://modelrunner.ai/docs/clients/js-client) — `@modelrunner/client`
- [Webhooks Guide](https://modelrunner.ai/docs/guides/webhooks) — payload, signing, retries
- [All models](https://modelrunner.ai/models) — full catalog and pricing

## Disclaimer

Seedance 2.0 is developed by ByteDance. [ModelRunner](https://modelrunner.ai) is an API
provider offering access to it. This repository contains documentation and examples for the
ModelRunner platform. Seedance is a trademark of ByteDance Ltd. For terms of use, see
[ModelRunner's Terms of Service](https://modelrunner.ai/terms).
