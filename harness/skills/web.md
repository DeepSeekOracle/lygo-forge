# Web Game Building

## Stack choice

| Need | Default |
|---|---|
| 2D sprites/tilemaps | Phaser or PixiJS |
| 2.5D / HD-2D | Three.js |
| 3D | Three.js |
| Tiny/no dependency | Canvas 2D |

Keep one renderer and one game loop. Do not mix DOM animation loops with canvas loops.

## Performance

- `requestAnimationFrame` + delta clamped (max ~50 ms).
- No allocations in the loop: reuse vectors, arrays, objects.
- One texture atlas; power-of-two when possible.
- Limit transparent overdraw; avoid full-screen post on low-end.
- Use `visibilitychange` to pause and stop audio.
- Test with CPU throttling, not just a fast desktop.

## Input

- Keyboard, pointer/touch, and gamepad where relevant.
- `preventDefault` only on game keys; preserve browser escape.
- Pause when the tab loses focus.
- Test A/D and vertical signs explicitly.

## Audio

- WebAudio must start after a user gesture.
- Separate music/SFX buses; persist mute.
- No autoplay surprise; show a sound-on/off control.
- Use short, compressed loops.

## Preview and QA

- Serve over HTTP, not `file://`.
- Check console errors, 404s, memory, and first interaction.
- Test at 1280×720 and phone width.
- Record exact browser and machine.

## Sources

- [Phaser](https://phaser.io/)
- [PixiJS](https://pixijs.com/)
- [Three.js](https://threejs.org/)
- [Unity WebGL costs](https://www.gauravgo.com/blog/shipping-a-unity-game-to-the-browser-what-actually-costs-you-frames/)
