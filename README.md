# Seedance 2.5 API

**Generate video with synchronized audio from a text prompt, a photo, or footage you
already have — single takes up to 30 seconds.**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020+-yellow.svg)](https://nodejs.org)
[![ModelRunner](https://img.shields.io/badge/Platform-ModelRunner-6E56CF.svg)](https://modelrunner.ai)

**Seedance 2.5** is ByteDance's latest video generation model, available as an API on
[ModelRunner](https://modelrunner.ai). Picture and sound are generated together — dialogue,
ambience and sound effects land in sync with the image instead of being dubbed on
afterwards. Five endpoints cover text to video, image to video, reference to video,
first-and-last-frame transitions, and video to video restyling.

This repository is documentation and runnable examples for the Seedance 2.5 API: model IDs,
every input parameter, real prices, prompt guidance, and working Python and JavaScript code.

> **[Run Seedance 2.5 in the playground →](https://modelrunner.ai/models/bytedance/seedance-v2.5/text-to-video)**

## Contents

- [What is Seedance 2.5?](#what-is-seedance-25)
- [Seedance 2.5 vs Seedance 2.0](#seedance-25-vs-seedance-20)
- [Quick Start](#quick-start)
- [Seedance 2.5 Pricing](#seedance-25-pricing)
- [API Reference](#api-reference)
  - [Text to Video](#text-to-video)
  - [Image to Video](#image-to-video)
  - [Reference to Video](#reference-to-video)
  - [First and Last Frame](#first-and-last-frame)
  - [Video to Video](#video-to-video)
- [Prompt Guide](#prompt-guide)
- [Output Format](#output-format)
- [Webhooks](#webhooks)
- [Authentication](#authentication)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## What is Seedance 2.5?

Seedance 2.5 is a video generation model from ByteDance, available through the ModelRunner
API as a text to video API, an image to video API, a reference to video API, a
first-and-last-frame API, and a video to video API. It produces 4 to 30 second clips at
24fps, at 480p or 720p, in seven frame shapes, with a synchronized soundtrack produced
alongside the picture.

The headline capability is **length**. A single take can run 30 seconds — double the
previous generation's ceiling — so a whole beat plays out in one continuous shot instead of
being cut together from fragments. Leave `duration` at its default of `-1` and the model
picks a length that suits the shot you described.

### Features

- **Native synchronized audio** — dialogue, ambience and sound effects generated with the
  picture, at no extra cost
- **30-second single takes** at 24fps, from 4 seconds up
- **Model-chosen duration** — `duration: -1` lets the model pick the length
- **Text to Video** — a written scene becomes a shot with sound
- **Image to Video** — your still becomes the first frame
- **Reference to Video** — up to **30** reference images steer identity, wardrobe, product,
  location or style
- **First and Last Frame** — pin both ends; the model invents the motion between them
- **Video to Video** — restyle, restage, reframe or extend footage, from up to **10** source
  clips
- **Seven frame shapes** — 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 and adaptive
- **480p and 720p**, priced per second of finished video

---

## Seedance 2.5 vs Seedance 2.0

Both generations are live. Pick on length versus resolution.

| | **Seedance 2.5** | Seedance 2.0 |
|---|---|---|
| Max duration | **30 seconds** | 15 seconds |
| Max resolution | 720p | **1080p** |
| Duration default | `-1` — model chooses | `5` |
| Reference images | **30** | 9 |
| Source videos (v2v) | **10** | 3 |
| Endpoints | 5 | 9 |
| Tiers | one | standard, fast, mini |

**Use Seedance 2.5** for long single takes, and for anything where a beat needs to play out
without a cut. **Use [Seedance 2.0](https://modelrunner.ai/models/bytedance/seedance-v2/text-to-video)**
when you need 1080p, or when a cheaper draft tier matters more than length.

Neither generation has a `seed` parameter — repeat runs of the same prompt produce
different clips.

---

## Quick Start

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
print(result["output"])  # a bare URL string
```

> Either style works: `run()` blocks until the result is ready, while `submit()` +
> `handle.get()` lets you do something else in between. On `modelrunner-ai` 0.3.x, `run()`
> returned the queue envelope rather than the result, so `result["output"]` raised a
> `KeyError` — fixed in 0.4.0.

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

console.log(result.data.output); // a bare URL string
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

To skip polling entirely, attach a [webhook](#webhooks).

---

## Seedance 2.5 Pricing

Four of the five endpoints are billed **per second of finished video**, at the same rate:

| Resolution | Price per second | 4s clip | 10s clip | 30s clip |
|---|---|---|---|---|
| **480p** | $0.154 | $0.62 | $1.54 | $4.62 |
| **720p** | $0.347 | $1.39 | $3.47 | $10.41 |

> These are rate-card figures. **Billing rounds up to the whole second and clips overshoot
> slightly**, so expect to pay one second more than the column says — our own 4-second 480p
> runs were charged $0.77, not $0.62. See [below](#two-things-the-rate-card-doesnt-tell-you).

Applies to `text-to-video`, `image-to-video`, `reference-to-video` and `first-last-frame`.
Audio is included — `generate_audio: false` returns a silent clip at the same price.

**Video to Video is metered on tokens instead**, and its bill counts *what you send* as well
as what you get back: a 30-second source costs about as much again as a 30-second output.
Trim every source clip to the part that matters. See the
[model page](https://modelrunner.ai/models/bytedance/seedance-v2.5/video-to-video) for the
current token rate.

Resolution is the largest cost driver and duration the second. Draft at 480p, then re-run
the keeper at 720p.

### Two things the rate card doesn't tell you

**You pay for one second more than you asked for.** Both of our `duration: 4` runs came back
as 97 frames — 4.06 seconds, a frame over the 96 that 4 seconds at 24fps would be — and both
were charged $0.77, which is exactly 5 × $0.154. Budget the next whole second up.

**The balance gate is not the clip price.** A submit is rejected with `402`
(`Insufficient balance: <yours> < <threshold>`) unless your available balance clears a fixed
threshold that does *not* scale down with the clip you request. We saw **$10.757** on both
endpoints we tested. That number is worth reading closely: it is exactly 31 × $0.347 — a
full 30-second clip at 720p, plus the same one-second overshoot above. In other words the
gate reserves the most the endpoint could possibly charge you. You must hold about $10.76 to
generate a clip that costs 77 cents, so budget for the gate, not the invoice.

---

## API Reference

All five endpoints share these parameters:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | Yes | — | The scene, the action, the camera move and the sound you want |
| `duration` | integer | No | `-1` | Clip length in seconds, `4` to `30`. `-1` lets the model choose |
| `resolution` | string | No | `"720p"` | `"480p"` or `"720p"` |
| `aspect_ratio` | string | No | varies | See each endpoint — two of them accept only `"adaptive"` |
| `generate_audio` | boolean | No | `true` | Synchronized soundtrack. `false` gives a silent clip at the same price |

Every endpoint returns the finished MP4 as a **bare URL string**.

---

### Text to Video

Build a shot from words alone.

**Model ID:** `bytedance/seedance-v2.5/text-to-video`

Common parameters only. `aspect_ratio` accepts `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`
or `adaptive`, and defaults to `16:9`.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/text-to-video",
    arguments={
        "prompt": "A glassblower turns a glowing gather of molten glass at the furnace mouth. Orange light flares across a scarred leather apron as the blowpipe rotates steadily. The camera stays tight and slightly low. The roar of the furnace, and the faint ring of a tool set down on steel.",
        "resolution": "720p",
        "aspect_ratio": "9:16",
        "duration": 12,
    },
)
```

---

### Image to Video

Your still becomes the first frame; the prompt describes what happens next.

**Model ID:** `bytedance/seedance-v2.5/image-to-video`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `image` | string (URL) | Yes | The first frame. 300–6000 px per side, under 30 MB, aspect ratio between 1:2.5 and 2.5:1. JPEG, PNG, WebP, BMP, TIFF, GIF, HEIC and HEIF |

`aspect_ratio` accepts **only `"adaptive"`** — the clip always inherits the source image's
shape, so a vertical phone photo gives a vertical clip with no re-crop and no letterboxing.
Crop the image beforehand if you need a different shape.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/image-to-video",
    arguments={
        "prompt": "Sea mist drifts across the still water. The gull lifts off the railing and glides out over the bay. The camera holds steady. Waves on shingle, a halyard tapping a mast.",
        "image": "https://example.com/harbour.jpg",
        "resolution": "720p",
        "duration": 8,
    },
)
```

Spend the prompt on what *moves* and what is *heard* — the still already fixes the subject.

---

### Reference to Video

Steer a generation with up to 30 reference images: a character, an outfit, a product, a
location, a style plate.

**Model ID:** `bytedance/seedance-v2.5/reference-to-video`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `reference_images` | list\<string\> | Yes | 1 to 30 images steering identity, wardrobe, product, location or style. JPEG, PNG, WebP, BMP, TIFF or GIF; 300–6000 px per side, under 30 MB each |
| `reference_audios` | list\<string\> | No | Up to 10 audio references, 2–30s each and 30s combined; WAV or MP3, under 15 MB each. Never on their own — at least one reference image is required. **Experimental** |

`aspect_ratio` accepts all seven shapes and defaults to `16:9`. **References do not fix the
framing here** — a 16:9 request against 3:2 references returns a 16:9 clip.

**Name every reference in the prompt.** References are addressed positionally as
`@Image1`…`@Image30` and `@Audio1`…`@Audio10`, numbered by their order in the arrays. Order
*is* the address, so keep the arrays stable while you iterate on the wording. A reference the
prompt never names is usually ignored or blended into the others.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/reference-to-video",
    arguments={
        "prompt": "@Image1 walks through the night market in @Image3, wearing the red jacket from @Image2. A handheld camera follows just behind her shoulder. Rain drums on canvas awnings, and the crowd chatters over a wok roaring to the left.",
        "reference_images": [
            "https://example.com/anna.jpg",
            "https://example.com/red-jacket.png",
            "https://example.com/night-market.jpg",
        ],
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "duration": 10,
    },
)
```

Packing many subjects into one shot lowers fidelity for each. Faces, logos and fine product
detail drift on large motions and extreme angles.

---

### First and Last Frame

Pin the opening and closing frames; the model invents the motion between them.

**Model ID:** `bytedance/seedance-v2.5/first-last-frame`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `image` | string (URL) | Yes | The **first** frame |
| `end_image` | string (URL) | Yes | The **last** frame. Pass the same URL as `image` to have the clip return to exactly where it started |

Same image limits as image-to-video. `aspect_ratio` accepts **only `"adaptive"`** — the clip
takes its shape from the supplied pair, so give both frames the same aspect ratio.

The two frames must share a scene and a subject: the model generates the transit between
them, it does not cut between unrelated shots.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/first-last-frame",
    arguments={
        "prompt": "The fog thins and lifts off the water as the cold blue light gives way to a low golden sun. The moored rowboat rocks gently on its line. Hold the camera fixed. Rope creaks against iron, water laps at the hull, and birdsong builds across the lake.",
        "image": "https://example.com/lake-fog.jpg",
        "end_image": "https://example.com/lake-golden.jpg",
        "resolution": "720p",
        "duration": 8,
    },
)
```

Describe only the middle — the endpoints are already fixed by the images.

---

### Video to Video

Restyle, restage, reframe or extend footage you already have.

**Model ID:** `bytedance/seedance-v2.5/video-to-video`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `reference_videos` | list\<string\> | Yes | 1 to 10 source clips. MP4 or MOV (H.264/H.265, AAC or MP3 audio), 2–30s each and **no more than 30s combined**, 300–6000 px per side, aspect ratio 0.4–2.5, 24–60fps, under 200 MB each |
| `reference_images` | list\<string\> | No | Up to 30 images. A still has no duration, so these add nothing to the price |
| `reference_audios` | list\<string\> | No | Up to 10 audio references. **Experimental** |

`aspect_ratio` accepts all seven shapes and defaults to `16:9` — the source does not dictate
framing, so a 16:9 source can come back as a 9:16 vertical cut. Use `adaptive` to keep the
source's shape.

References are addressed as `@Video1`…`@Video10`, `@Image1`…`@Image30` and
`@Audio1`…`@Audio10`.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/video-to-video",
    arguments={
        "prompt": "Match the camera movement and pacing of @Video1, but restage it on a snowbound forest trail at dusk. The hiker wears the red parka from @Image1. Boots compress in fresh snow, wind moves through the pines.",
        "reference_videos": ["https://example.com/handheld-walk.mp4"],
        "reference_images": ["https://example.com/red-parka.jpg"],
        "resolution": "720p",
        "aspect_ratio": "9:16",
        "duration": 8,
    },
)
```

The result is a new generation, not a re-encode — exact frames, faces and on-screen text are
not preserved. Say which property you are borrowing (motion, framing, lighting, wardrobe)
rather than "like the reference".

---

## Prompt Guide

A Seedance prompt works best as **Subject + Action + Camera + Scene/Lighting + Style**, at
roughly 50–150 words. Lighting has the largest single effect on how the output reads, and
the soundtrack follows the prompt just as the picture does — so describe what you want to
*hear* as specifically as what you want to see.

**What helps:**

- Put camera language in the prompt: "slow dolly push in", "handheld follow", not "the
  camera moves"
- Describe camera movement and subject movement in **separate clauses** — blending them
  produces shaky output
- Name the sound: "gulls calling, waves on shingle" beats leaving the audio to chance
- On first-and-last-frame, name what must **stay the same** — "preserve the jetty, the post
  and the rope exactly as they are, arriving precisely at the supplied closing arrangement"
- On reference and video endpoints, give each reference an explicit job: "@Image1 rests on
  the counter in @Image2"
- Draft at 480p, then re-run the keeper at 720p

**What hurts:**

- The word "fast" tends to introduce jitter. If you need pace, keep exactly one element fast
- Stacking many separate shots into one prompt drifts in character, wardrobe and lighting —
  a risk that grows with a 30-second take
- Text rendered inside the frame is frequently misspelled — don't rely on it
- Fast motion and crowds smear at 480p; 720p holds the detail

### Cinematic

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/text-to-video",
    arguments={
        "prompt": "A cartographer unrolls a water-stained map across a table in a canvas field tent. Lamplight swings gently overhead, throwing her shadow along the tent wall as she traces a river with one finger. The camera holds a slow push from a medium shot to a close-up on her hands. Rain drums steadily on the canvas, and a wooden pole creaks in the wind. Warm amber key light against cold blue outside, fine film grain, shallow focus.",
        "resolution": "720p",
        "aspect_ratio": "21:9",
        "duration": 12,
    },
)
```

### Product

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/text-to-video",
    arguments={
        "prompt": "A ceramic pour-over cone sits on a pale oak counter as water spirals into the grounds and blooms. The camera orbits slowly a few degrees off level, then settles into a macro shot of the first drops falling into the glass carafe below. Soft north-facing window light with a long gentle falloff, matte surfaces, one clean specular highlight along the rim. Only the trickle of water and the low hum of a kettle settling.",
        "resolution": "720p",
        "aspect_ratio": "1:1",
        "duration": 8,
    },
)
```

### The long take

Thirty seconds in one shot is what this generation is for. Give it a beat that actually
develops.

```python
result = modelrunner_ai.run(
    "bytedance/seedance-v2.5/text-to-video",
    arguments={
        "prompt": "A potter centres a lump of clay on the wheel, opens it with both thumbs, draws the wall up into a tall cylinder, then collars it in at the neck. The camera holds a steady low three-quarter frame throughout, never cutting. The wheel hums, water slicks under her hands, and a radio plays faintly in another room. Naturalistic colour, north light, fine grain.",
        "resolution": "720p",
        "duration": 30,
    },
)
```

---

## Output Format

Every endpoint returns the generated MP4 as a URL string in `output`:

```json
{
  "id": "mhEQyJzlcZf1kl1I5GzlN",
  "modelEndpoint": "bytedance/seedance-v2.5/first-last-frame",
  "status": "COMPLETED",
  "billingStatus": "charged",
  "output": "https://media.modelrunner.ai/EMRdbV28YTBivJ21hMylm.mp4",
  "input": { "prompt": "..." },
  "totalPrice": "0.77",
  "inferenceTime": 207000,
  "delayTime": 0,
  "error": "",
  "thumbnails": [{ "type": "video", "url": "https://media.modelrunner.ai/xyz.webm" }],
  "metadata": {}
}
```

In Python that object is what `handle.get()` returns, so the URL is `result["output"]`. In
JavaScript the client wraps it as `{ data, requestId }`, so it is **`result.data.output`** —
`result.output` is `undefined`.

The clips behind this README came back as H.264 video with AAC stereo audio at 24fps.

---

## Webhooks

Video generation takes minutes — the runs behind this README took 2 to 3.5 minutes of
inference each. Rather than hold a connection open or poll in a loop, pass a `webhook` URL
at submit time and ModelRunner POSTs the result when the request settles. It is the only
option that survives a restart on either side.

```javascript
const { request_id } = await modelrunner.queue.submit(
  "bytedance/seedance-v2.5/text-to-video",
  {
    input: { prompt: "...", resolution: "720p", duration: 8 },
    webhookUrl: "https://example.com/webhooks/modelrunner",
    webhookEvents: ["completed"], // the default
  },
);
```

```python
handle = modelrunner_ai.submit(
    "bytedance/seedance-v2.5/text-to-video",
    arguments={"prompt": "...", "resolution": "720p", "duration": 8},
    webhook_url="https://example.com/webhooks/modelrunner",
)
```

> Webhooks require `@modelrunner/client` >= 1.2.0 or `modelrunner-ai` >= 0.3.0. Earlier
> versions accept the URL and silently drop it.

> ⚠️ **Check `billingStatus`, not `status`.** A generation that failed at the provider is
> recorded as `status: "COMPLETED"` with `billingStatus: "failed"` — the *request*
> completed, it just produced no output. Keying off `status` alone reports every failure as
> a success. A real success is `COMPLETED` with `billingStatus` of `charged` or `partial`.

| Event | Fires when |
|---|---|
| `completed` | The request reached a terminal state. This is the one you want. |
| `start` | The provider began executing. Best effort — never block on it. |

Deliveries are signed with [Standard Webhooks](https://www.standardwebhooks.com)
(HMAC-SHA256 over the raw body), retried on a fixed schedule — ten attempts in all, the
original plus nine retries, spread over roughly three hours — and inspectable after the fact. **Verify against the raw bytes** — parsing and reserializing the JSON breaks
the signature.

Runnable receivers for Express and FastAPI, plus local tunnel setup and the four reasons a
delivery never arrives, are in **[examples/webhook/](examples/webhook/)**.

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
> `MODEL_RUNNER_KEY`. That was fixed — verified in 1.2.2, the version this repo pins, where
> `MODELRUNNER_KEY` alone authenticates. The exact release the fix landed in is not
> recorded, so if you are pinned to an older 1.2.x and see a `401`, set `MODEL_RUNNER_KEY`
> as well.

Over raw HTTP, send the key as `Authorization: Key $MODELRUNNER_KEY`. Create keys under
**Profile → Keys** in the [dashboard](https://modelrunner.ai). See `.env.example` for the
full set of variables the examples use.

---

## Examples

Runnable examples, verified against the live API:

| Example | File | Endpoint |
|---|---|---|
| First and Last Frame | [first_last_frame.py](examples/first_last_frame.py) | `bytedance/seedance-v2.5/first-last-frame` |
| Reference to Video | [reference_to_video.js](examples/reference_to_video.js) | `bytedance/seedance-v2.5/reference-to-video` |
| Webhook — submit | [submit.py](examples/webhook/submit.py) · [submit.js](examples/webhook/submit.js) | — |
| Webhook — receiver | [receiver_fastapi.py](examples/webhook/receiver_fastapi.py) · [receiver_express.js](examples/webhook/receiver_express.js) | — |

Both run at 480p for 4 seconds — the cheapest configuration — and carry commented variants
for the longer, higher-resolution and model-chosen-duration cases.

---

## Troubleshooting

**`402` — `Insufficient balance: 9.77 < 10.757`**
Your balance must clear a fixed per-endpoint threshold that does not scale down with the
clip you request. Top up past the threshold, not past the clip price. See
[Seedance 2.5 Pricing](#seedance-25-pricing).

**`401` on the JavaScript client only**
You are probably on a `@modelrunner/client` older than 1.2.2, which read `MODEL_RUNNER_KEY`
exclusively. Set that variable as well, or upgrade.

**`KeyError: 'output'` in Python**
`modelrunner-ai` 0.3.x returned the queue envelope from `run()` rather than the result.
Upgrade to 0.4.0 or later, where `run()` follows the envelope for you.

**`Cannot use import statement outside a module`**
The JavaScript examples are ESM. Add `"type": "module"` to your `package.json`, or use the
`.mjs` extension.

**The webhook never arrives**
Four causes account for almost all of it: the body was parsed before signature verification,
the URL redirects, the handler answered slower than 15 seconds, or the SDK is below the
version floor. See [examples/webhook/](examples/webhook/).

**A reference image seems to be ignored**
Name it in the prompt. References are addressed positionally — `@Image1` is the first entry
in the array — and one the prompt never mentions is usually ignored or blended into the
others.

---

## FAQ

#### How much does the Seedance 2.5 API cost?
$0.154 per second of video at 480p and $0.347 per second at 720p, with audio included.
Video-to-video is metered per token instead and counts your source footage as well as the
output. Note that billing rounds up to the whole second.

#### How long can a Seedance 2.5 video be?
Up to 30 seconds in a single continuous take, from a minimum of 4. Leave `duration` at `-1`
and the model picks a length itself.

#### Does Seedance 2.5 generate audio?
Yes — dialogue, ambience and sound effects are generated together with the picture, in sync,
at no extra cost. Set `generate_audio: false` for a silent clip; the price is the same.

#### Does Seedance 2.5 support 1080p?
No. This generation tops out at 720p. Use
[Seedance 2.0](https://modelrunner.ai/models/bytedance/seedance-v2/text-to-video) for 1080p.

#### Does Seedance 2.5 have a seed parameter?
No. Repeat runs of the same prompt produce different clips. Neither generation offers a seed.

#### What aspect ratios does Seedance 2.5 support?
16:9, 4:3, 1:1, 3:4, 9:16, 21:9 and adaptive — on text-to-video, reference-to-video and
video-to-video. Image-to-video and first-last-frame accept only `adaptive` and inherit the
shape of the images you supply.

#### How do I keep a character consistent across a clip?
Use `reference-to-video` with one or more photos of the character, and name them in the
prompt as `@Image1`, `@Image2` and so on.

#### Can I animate a photo I already have?
Yes — `image-to-video` takes your still as the first frame. The clip keeps the photo's exact
shape, so a vertical phone photo produces a vertical video.

#### Can I make a video loop?
Pass the same URL as both `image` and `end_image` on `first-last-frame` and the clip returns
to exactly where it started. That matches the endpoints; how cleanly the motion joins is
down to the shot.

#### How long does a generation take?
Minutes, not seconds — the two 4-second runs behind this README took 123 and 207 seconds of
inference. Use a [webhook](#webhooks) rather than holding a connection open.

---

## Resources

- [Seedance 2.5 Text to Video](https://modelrunner.ai/models/bytedance/seedance-v2.5/text-to-video) — try it in the playground
- [Seedance 2.5 Image to Video](https://modelrunner.ai/models/bytedance/seedance-v2.5/image-to-video)
- [Seedance 2.5 Reference to Video](https://modelrunner.ai/models/bytedance/seedance-v2.5/reference-to-video)
- [Seedance 2.5 First & Last Frame](https://modelrunner.ai/models/bytedance/seedance-v2.5/first-last-frame)
- [Seedance 2.5 Video to Video](https://modelrunner.ai/models/bytedance/seedance-v2.5/video-to-video)
- [ModelRunner Documentation](https://modelrunner.ai/docs) — platform docs
- [Python Client](https://modelrunner.ai/docs/clients/python-client) — `modelrunner-ai`
- [JavaScript Client](https://modelrunner.ai/docs/clients/js-client) — `@modelrunner/client`
- [Webhooks Guide](https://modelrunner.ai/docs/guides/webhooks) — payload, signing, retries
- [All models](https://modelrunner.ai/models) — full catalog and pricing

## Disclaimer

Seedance 2.5 is developed by ByteDance. [ModelRunner](https://modelrunner.ai) is an API
provider offering access to it. This repository contains documentation and examples for the
ModelRunner platform. Seedance is a trademark of ByteDance Ltd. For terms of use, see
[ModelRunner's Terms of Service](https://modelrunner.ai/terms).
