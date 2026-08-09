"""
Seedance 2.5 - First and Last Frame

Pin both ends of a shot. `image` is the opening frame, `end_image` is the
closing frame, and the prompt describes only the transit between them - the
model invents the motion, not a cross-fade.

https://modelrunner.ai/models/bytedance/seedance-v2.5/first-last-frame

Video and sound are generated together, so the soundtrack follows the prompt
just as the picture does.

Requires modelrunner-ai >= 0.4.0 and MODELRUNNER_KEY in the environment.

This uses submit() + handle.get(), which leaves you free to do something else
while the clip renders. modelrunner_ai.run() is equally valid and simply blocks
until the result is ready. (On 0.3.x, run() returned the queue envelope instead
of the result, so result["output"] raised KeyError - fixed in 0.4.0.)
"""

import modelrunner_ai

handle = modelrunner_ai.submit(
    "bytedance/seedance-v2.5/first-last-frame",
    arguments={
        # The two frames must share a scene and a subject. These are the same
        # jetty, mooring post and rowboat - one in cold morning fog, one in
        # clear golden light. The model generates the weather turning over;
        # it does not cut between unrelated shots.
        "image": "https://media.modelrunner.ai/pyJMS2iOt5vEEKWQo5aWD.jpeg",
        "end_image": "https://media.modelrunner.ai/90cxOiEMl16l485iLZghi.jpeg",
        # Both endpoints are already fixed by the images, so spend the prompt
        # on the middle: what moves, what stays put, and what is heard.
        "prompt": (
            "In one uninterrupted take, the fog thins and lifts off the water as the "
            "cold blue light gives way to a low golden sun, the far treeline resolving "
            "out of the haze ridge by ridge until the far shore stands clear. The "
            "moored rowboat rocks gently on its line and ripples spread out across the "
            "glassy surface, breaking its reflection. Hold the camera position fixed "
            "and preserve the jetty, the mossy mooring post, the iron ring and the "
            "rope exactly as they are, arriving precisely at the supplied closing "
            "arrangement. The synchronized soundtrack follows the transit with rope "
            "creaking against iron, water lapping at the hull and the jetty timbers, "
            "and birdsong building gradually across the lake."
        ),
        # 480p and 4s is the cheapest run that proves the call. Billing is per
        # second of finished video, so resolution and duration are the two cost
        # drivers - draft here, then re-run the keeper at "720p" (the ceiling
        # on this generation) and a longer duration.
        "resolution": "480p",
        "duration": 4,
        # Generated with the picture, at no extra cost. False gives a silent
        # clip for the same price.
        "generate_audio": True,
        # aspect_ratio is omitted deliberately: "adaptive" is the only value
        # this endpoint accepts. The clip inherits the shape of the frames you
        # supply, so crop both images beforehand if you need a different one -
        # and give them the SAME shape as each other.
    },
)

print(f"Request: {handle.request_id}")

result = handle.get()  # blocks until the request settles

# The output is a bare URL string, not an object.
print(f"Video URL: {result['output']}")


# -------------------------------------------------------------------
# Intelligent duration. Leave `duration` at its default of -1 and the
# model picks a whole-second length that suits the transit you asked
# for, anywhere from 4 to 30 seconds. Convenient, but it leaves the cost
# of the run open-ended - set the number yourself when that matters.
# -------------------------------------------------------------------
# handle = modelrunner_ai.submit(
#     "bytedance/seedance-v2.5/first-last-frame",
#     arguments={
#         "image": "https://example.com/empty-cup.jpg",
#         "end_image": "https://example.com/full-cup.jpg",
#         "prompt": (
#             "The portafilter locks into place and the first dark stream falls "
#             "into the cup, steam curling up as it fills. The camera holds a "
#             "tight macro frame. The grinder's whine fades out, the pump hums, "
#             "and the crema hisses faintly as it settles."
#         ),
#         "duration": -1,
#     },
# )
# result = handle.get()


# -------------------------------------------------------------------
# A seamless loop. Pass the same URL as both frames and the clip returns
# to exactly where it started, so it can be looped without a visible cut.
# -------------------------------------------------------------------
# frame = "https://example.com/prayer-flags.jpg"
# handle = modelrunner_ai.submit(
#     "bytedance/seedance-v2.5/first-last-frame",
#     arguments={
#         "image": frame,
#         "end_image": frame,
#         "prompt": (
#             "The line of flags lifts and falls on a steady breeze and settles "
#             "back exactly as it began. The camera does not move. Cloth snaps "
#             "softly, wind moves through the valley, no music."
#         ),
#         "duration": 8,
#     },
# )
# result = handle.get()


# -------------------------------------------------------------------
# The long take. 30 seconds in a single continuous shot is this
# generation's headline capability - twice the 2.0 ceiling - which makes
# a slow transformation between two frames worth pinning rather than
# cutting. Note that a long transit gives character, wardrobe and
# lighting more room to drift in the middle.
# -------------------------------------------------------------------
# handle = modelrunner_ai.submit(
#     "bytedance/seedance-v2.5/first-last-frame",
#     arguments={
#         "image": "https://example.com/bare-orchard.jpg",
#         "end_image": "https://example.com/orchard-in-blossom.jpg",
#         "prompt": (
#             "Winter gives way to spring across the orchard: snow recedes from "
#             "the rows, buds swell and open along the branches until the trees "
#             "carry full blossom. The camera holds a locked wide frame. Wind "
#             "drops away, meltwater runs, and birdsong builds through the take."
#         ),
#         "duration": 30,
#         "resolution": "720p",
#     },
# )
# result = handle.get()
