# HD-2D Game Building

HD-2D is a **presentation discipline**: sprite-forward characters in a lit, depth-rich 3D diorama, usually with selective depth of field, bloom, tilt-shift and warm/cool contrast.

It is not "2D sprites with a blur on top."

## The look

- Sprite characters with strong silhouettes, readable at gameplay distance.
- 3D sets with real depth, occlusion and light response.
- A shallow depth-of-field band that isolates the play plane, not the whole screen.
- Bloom on practical lights, not on UI.
- One camera pitch, one focal treatment; consistency is the style.
- Foreground framing elements at the edges; keep the centre clear.

## Production order

1. Lock gameplay camera and sprite scale.
2. Build a grey-box set with the final depth and occlusion.
3. Light the set for silhouette first.
4. Add sprites and contact shadows.
5. Add post: DOF, bloom, colour grade, vignette.
6. Build a **low preset** with post off and 1× render scale.
7. Compare screenshots at 1280×720; the low preset must still read.

## Low-end budget

- DOF and bloom off by default on integrated/low-end GPUs.
- One shadow-casting light; bake everything else.
- Transparent overdraw is the hidden killer: cap foliage cards and particles.
- One post volume per scene; no stacked volumes.
- 3D set triangles and texture memory count against the profile budget.

## References

- [RPG Maker HD-2D performance discussion](https://automaton-media.com/en/news/rpg-makers-new-unity-based-hd-2d-entry-will-address-some-of-the-performance-concerns-users-had-with-rpg-maker-unite-according-to-producer/)
- [Unity WebGL frame costs](https://www.gauravgo.com/blog/shipping-a-unity-game-to-the-browser-what-actually-costs-you-frames/)
