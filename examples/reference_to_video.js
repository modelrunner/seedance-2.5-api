/**
 * Seedance 2.5 - Reference to Video
 *
 * Build a shot out of reference images. Send 1 to 30 stills - a product, a
 * character, a location, a style plate - and address each one positionally in
 * the prompt as @Image1, @Image2 and so on. That is what makes compositing
 * work: the product from the first reference ends up in the room from the
 * second, and both survive into the finished take.
 * https://modelrunner.ai/models/bytedance/seedance-v2.5/reference-to-video
 *
 * Video and sound are generated together - ambience, effects and dialogue land
 * in sync with the picture instead of being dubbed on afterwards.
 *
 * Requires @modelrunner/client >= 1.2.0 and MODELRUNNER_KEY in the environment.
 */

import { modelrunner } from "@modelrunner/client";

const result = await modelrunner.subscribe(
  "bytedance/seedance-v2.5/reference-to-video",
  {
    input: {
      // Order IS the address: this array's first entry is @Image1 in the
      // prompt, the second is @Image2. Keep the array stable while you iterate
      // on the wording, or every reference silently changes meaning.
      reference_images: [
        "https://media.modelrunner.ai/D2FAkKEZ7WbZsyjLhyC7T.jpeg", // @Image1 - the moka pot
        "https://media.modelrunner.ai/7BLQ9IGMlfwwjE2JPCNf8.jpeg", // @Image2 - the cafe interior
      ],
      prompt:
        "Place the matte black and copper stovetop espresso maker from @Image1 on the pale stone counter in @Image2, centred above the row of wooden stools. A thin curl of steam rises from its spout and thickens as the low morning sun tracks slowly across the room, the brass pendant lights above catching it one after another. The camera performs one smooth arc, beginning level with the pot and ending slightly above it. Warm directional light rakes through the arched window and lays a long soft shadow across the polished concrete floor. The synchronized soundtrack carries the low gurgle and hiss of coffee brewing, a cup set down on stone, and quiet footsteps somewhere off frame.",

      // The references do NOT fix the framing on this endpoint - whatever shape
      // they are, you get the shape you ask for. 16:9, 4:3, 1:1, 3:4, 9:16,
      // 21:9, or "adaptive" to let the model choose.
      aspect_ratio: "16:9",

      // 480p and 4s is the cheapest run that proves the call. Billing is per
      // second of finished video, so resolution and duration are the two cost
      // drivers - draft here, then re-run the keeper at "720p" (the ceiling on
      // this generation) and a longer duration.
      resolution: "480p",
      duration: 4,

      // Generated with the picture, at no extra cost. false gives a silent
      // clip for the same price.
      generate_audio: true,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  },
);

// The output is a bare URL string, not an object.
console.log("Video URL:", result.data.output);

// -------------------------------------------------------------------
// Intelligent duration. Leave `duration` at its default of -1 and the
// model picks a whole-second length that suits the shot you described,
// anywhere from 4 to 30 seconds. Convenient, but it leaves the cost of
// the run open-ended - set the number yourself when that matters.
// -------------------------------------------------------------------
// const openEnded = await modelrunner.subscribe(
//   "bytedance/seedance-v2.5/reference-to-video",
//   {
//     input: {
//       reference_images: ["https://example.com/character.jpg"],
//       prompt:
//         "@Image1 steps out of a bookshop into heavy rain, pauses under the awning, then lifts a folded newspaper over her head and walks out into it. The camera tracks alongside at shoulder height. Neon from the storefront across the street reflects in the wet pavement. Rain on the awning, tyres hissing past, no dialogue.",
//       duration: -1,
//     },
//   },
// );

// -------------------------------------------------------------------
// One reference, one long take. 30 seconds in a single continuous shot
// is this generation's headline capability - twice the 2.0 ceiling - so
// a whole beat can play out without a cut.
// -------------------------------------------------------------------
// const longTake = await modelrunner.subscribe(
//   "bytedance/seedance-v2.5/reference-to-video",
//   {
//     input: {
//       reference_images: ["https://example.com/workshop.jpg"],
//       prompt:
//         "A potter centres a lump of clay on the wheel in @Image1, opens it with both thumbs and draws the wall up into a tall cylinder, then collars it in at the neck. The camera holds a steady low three-quarter frame throughout. The wheel hums, water slicks under her hands, and a radio plays faintly in another room.",
//       aspect_ratio: "9:16",
//       duration: 30,
//       resolution: "720p",
//     },
//   },
// );

// -------------------------------------------------------------------
// Name every reference you send. A reference the prompt never mentions
// is usually ignored, or blended into the others - which reads as the
// model "losing" it. Nine, twenty, thirty images all behave the same
// way: address them, or don't send them.
//
// Note that packing many subjects into one shot lowers fidelity for
// each of them, and faces, logos and fine product detail drift on large
// motions and extreme angles.
// -------------------------------------------------------------------
// const composed = await modelrunner.subscribe(
//   "bytedance/seedance-v2.5/reference-to-video",
//   {
//     input: {
//       reference_images: [
//         "https://example.com/anna.jpg",
//         "https://example.com/red-jacket.png",
//         "https://example.com/night-market.jpg",
//       ],
//       prompt:
//         "@Image1 walks through the night market in @Image3 wearing the red jacket from @Image2. A handheld camera follows just behind her shoulder. Rain drums on the canvas awnings and the crowd chatters over a wok roaring somewhere to the left.",
//       aspect_ratio: "21:9",
//       duration: 12,
//     },
//   },
// );
