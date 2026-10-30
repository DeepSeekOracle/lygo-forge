# FORGE PIXEL-3D RENDER

Make a real Three.js 3D scene read as pixel art without shimmer.

## Core method

1. Render at a **low internal resolution** (e.g. 320×480, or 480 px tall).
2. Upscale with nearest-neighbor and `image-rendering: pixelated`.
3. Disable antialiasing and set pixel ratio to 1.
4. Snap the camera to the **pixel grid every frame** so world motion does not slide across texels.
5. Test motion: pan/orbit and watch for crawling edges.

## Renderer

```js
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
renderer.setPixelRatio(1);
renderer.setSize(INTERNAL_W, INTERNAL_H, false); // canvas CSS size is separate
renderer.outputColorSpace = THREE.SRGBColorSpace;

const canvas = renderer.domElement;
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.imageRendering = 'pixelated';
```

Do not enable MSAA, FXAA, SMAA or a pixel-ratio above 1. Those defeat the look.

## Camera snapping

For an **orthographic** camera, one screen pixel equals:

```js
const worldPerPixel = (camera.top - camera.bottom) / INTERNAL_H;
camera.position.x = Math.round(camera.position.x / worldPerPixel) * worldPerPixel;
camera.position.y = Math.round(camera.position.y / worldPerPixel) * worldPerPixel;
```

For a **perspective** camera, snap at the focus plane:

```js
const dist = camera.position.distanceTo(focus);
const worldPerPixel = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist) / INTERNAL_H;
camera.position.x = Math.round(camera.position.x / worldPerPixel) * worldPerPixel;
camera.position.y = Math.round(camera.position.y / worldPerPixel) * worldPerPixel;
```

Snap the camera **after** controls update and **before** render. If the camera has a target, snap
both position and target by the same offset so the view direction stays consistent.

## Materials and textures

```js
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
texture.colorSpace = THREE.SRGBColorSpace;
```

- Use flat/low-poly geometry and hard edges.
- Avoid normal maps and high-frequency noise at low resolution.
- Keep a limited palette; posterize in a post pass if needed.
- Turn off tone mapping or use a fixed exposure; dithering must be deliberate.

## Motion test

1. Orbit slowly around a high-contrast object.
2. Watch silhouette edges and thin geometry.
3. If edges crawl, the camera is not snapped or the render size is changing.
4. Test at the actual CSS size and device pixel ratio.
5. Record internal resolution, camera type, snap formula and a short capture.

## Forge rules

- Pixel look is a **rendering choice**, not a licence for copied pixel art.
- Keep the source scene and the low-res settings in the project.
- Do not upscale a high-res render; render low once.
- Verify text/UI separately; pixel fonts need their own sizing.
- Record the exact internal resolution and whether camera snapping is orthographic or perspective.

## Acceptance

- no shimmer during a slow pan
- nearest-neighbor edges, no blur
- stable frame time at the target resolution
- UI remains legible
- capture and settings recorded in the job note
