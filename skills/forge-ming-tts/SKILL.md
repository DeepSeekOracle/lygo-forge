# FORGE MING 3.0 TTS

Local open-weights speech generation through ComfyUI. Use for game character voice, narration,
barks and multi-speaker tests.

## Installed

```text
ComfyUI:  <VIDEO>\ComfyUI
Node:     custom_nodes/ComfyUI-Ming-3-tts
Model:    models/checkpoints/Ming-3.0-tts-0.5b-int8-convrot/
Weight:   2,602,496,328 bytes (~2.42 GiB INT8)
Licence:  MIT
```

Registered nodes:

```text
MingLoadModel
MingGenerate
MingReferenceSpeaker
MingPodcast
MingWhisperTranscribe
TextEncodeMingImageEdit
```

Tiny 9B is **not installed**; its INT8 weights need ~10.22 GiB and this GPU has 8 GB.

## Verified run

```text
Prompt:  92435603-c4af-4e87-912b-70f72d738e83
Model:   Ming-3.0-tts-0.5b-int8-convrot, precision auto, device auto
Task:    ip, voice US_James
Text:    "Forge voice check. This is Ming three point zero speaking locally."
Steps:   flow_steps 10, max_steps 60, seed 42
Output:  <VIDEO>\ComfyUI\output\forge_ming_check_00001.flac
Format:  4.000 s, 44.1 kHz mono, FLAC
Elapsed: ~40 s including first model load
```

## Tasks

| Task | Inputs | Use |
|---|---|---|
| `ip` | `voice` | built-in voices: US_Emma, US_James, US_Stella, UK_George, UK_Charlotte |
| `clone` | reference audio + exact transcript + language | clone a voice you have rights to |
| `voice_design` | style description | design a new voice |
| `freeform` | instruction + optional reference | director-style delivery |
| `basic` | reference + speed/pitch/volume | paced variation |
| `emotion` | reference + emotion | happy/sad/angry/etc. |
| `dialect` | reference + dialect | Sichuanese/Cantonese |
| `podcast` | Tiny 9B only | not available here |

Languages for cloning: Chinese, English, German, Spanish, French, Korean, Japanese.

Inline vocal tags: `[Laughter]`, `[Sigh]`, `[Breathing]`, `[Cough]`, `[Surprise-ah]`, `[Uhm]`, etc.

## Forge rules

- Use only voices you have rights to clone. A reference recording is not a licence.
- Record voice source/consent for every cloned line.
- Keep text short for barks; long clone/ip lines split automatically.
- `max_steps` caps duration (~80 ms per chunk); it does **not** set speaking speed.
- Do not install Tiny 9B on this 8 GB card; use 0.5B or CPU.
- One heavy ComfyUI model at a time; stop Wan/video jobs before a TTS batch.
- Do not ship a cloned celebrity/real-person voice without permission.
- Verify the generated audio; the node can stop early or mispronounce.
- Output is mono 44.1 kHz; convert only at the engine import step.

## API pattern

```json
{
  "4": {"class_type":"MingLoadModel","inputs":{
    "model":"Ming-3.0-tts-0.5b-int8-convrot",
    "precision":"auto","device":"auto","download_if_missing":false}},
  "5": {"class_type":"MingGenerate","inputs":{
    "model":["4",0],
    "text":"…",
    "task":"ip","task.voice":"US_James",
    "seed":42,"cfg":2.0,"flow_steps":10,"sigma":0.25,
    "temperature":0.0,"max_steps":60,"trim":true}},
  "6": {"class_type":"SaveAudioAdvanced","inputs":{
    "audio":["5",0],"filename_prefix":"forge_tts","format":"flac"}}
}
```

POST to `http://127.0.0.1:8188/prompt`; poll `/history/<id>`.

## Acceptance

- audible, intelligible speech
- correct language/voice
- no clipped ending
- voice rights recorded
- output path and duration noted
