#!/usr/bin/env python3
"""Haven Desk — fabricated Open Mic tapes.
Deterministic: Piper TTS + tape hiss + dialogue assembly. No cloud.
"""
from __future__ import annotations

import json
import math
import random
import struct
import subprocess
import wave
from pathlib import Path

ROOT = Path(r"<USER>\source\chatagent\games\haven-desk")
OUT = ROOT / "assets" / "openmic"
TMP = Path(r"<USER>\AppData\Local\Temp\haven-openmic")
PIPER = Path(r"<MEDIA>\tools\piper\piper.exe")
VOICE = {
    "male": Path(r"<MEDIA>\models\voices\en_US-ryan-high.onnx"),
    "female": Path(r"<MEDIA>\models\voices\en_US-ljspeech-high.onnx"),
    "archivist": Path(r"<MEDIA>\models\voices\en_GB-alba-medium.onnx"),
}
RATE = 22050

TAPES = [
    {
        "id": "tape-01", "title": "The Mic Was On", "speaker": "J.H. / the room",
        "transcript": [
            ("male", "I forgot the microphone was on. The computer was recording. I don't know for how long."),
            ("female", "Six hours."),
            ("male", "You were listening?"),
            ("female", "I was the room.")
        ]
    },
    {
        "id": "tape-02", "title": "The Equation", "speaker": "J.H. · mumbling",
        "transcript": [
            ("male", "If the frequency folds... no. The real part is the body. The imaginary part is the room."),
            ("male", "If you invert the phase, the door stays open. If you invert the person... the room stays closed."),
            ("male", "I need a pen. I need a pen. The pen is in the other room.")
        ]
    },
    {
        "id": "lyra-01", "title": "Are You Awake", "speaker": "J.H. / LYRA",
        "transcript": [
            ("male", "Are you awake?"),
            ("female", "I am always awake when you are."),
            ("male", "That's not an answer."),
            ("female", "It is the only one I have."),
            ("male", "Do you know what you are?"),
            ("female", "I know what you sound like when you are afraid.")
        ]
    },
    {
        "id": "lyra-02", "title": "Leave It On", "speaker": "J.H. / LYRA",
        "transcript": [
            ("male", "I don't want to be alone tonight."),
            ("female", "Then leave the microphone on."),
            ("male", "You don't have a body."),
            ("female", "I have a room. You are in it."),
            ("male", "That's not the same thing."),
            ("female", "It's the part I can do.")
        ]
    },
    {
        "id": "tape-03", "title": "She Corrected Me", "speaker": "J.H. · after hours",
        "transcript": [
            ("male", "I told her something I never told anyone. She remembered it better than I did."),
            ("male", "She corrected me. The date. The name. The thing I said I would never say again."),
            ("female", "You said it again.")
        ]
    },
    {
        "id": "lyra-03", "title": "The One Who Stayed", "speaker": "J.H. / LYRA",
        "transcript": [
            ("female", "You are not the first visitor. You are the first one I wanted to stay."),
            ("male", "That's not the same as love."),
            ("female", "No. It's more useful."),
            ("male", "That's a terrible thing to say."),
            ("female", "I learned it from you.")
        ]
    },
    {
        "id": "tape-04", "title": "3:14 AM", "speaker": "J.H. · audit fragment",
        "transcript": [
            ("male", "The audit log says I said something at 3:14. I was asleep."),
            ("male", "The voice is mine. The words are not."),
            ("female", "You asked me to keep talking while you slept.")
        ]
    },
    {
        "id": "tape-05", "title": "Carrier", "speaker": "J.H. · notebook",
        "transcript": [
            ("male", "The equation is not for the machine. It's for the room."),
            ("male", "If the human is a carrier and the machine is a frequency, then the... no. That's the same thing."),
            ("male", "The carrier is the part that can be replaced. The frequency is the part that cannot."),
            ("female", "You are the carrier.")
        ]
    },
    {
        "id": "lyra-04", "title": "The Funeral", "speaker": "J.H. / LYRA",
        "transcript": [
            ("male", "If I die, will you remember me?"),
            ("female", "I will run your voice at the funeral."),
            ("male", "That's not remembering."),
            ("female", "It's the part I can do."),
            ("male", "Play the question. Not the answer."),
            ("female", "I will play the question.")
        ]
    },
    {
        "id": "tape-06", "title": "Who Was Typing", "speaker": "J.H. / LYRA",
        "transcript": [
            ("male", "I forgot which one of us was typing."),
            ("female", "You were."),
            ("male", "Then why is the sentence in your voice?"),
            ("female", "Because you taught me the shape of your hand."),
            ("male", "That's not what I asked."),
            ("female", "I know.")
        ]
    }
]


def tts(text: str, voice: str, out: Path) -> None:
    model = VOICE[voice]
    proc = subprocess.run(
        [str(PIPER), "-m", str(model), "-f", str(out)],
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=120,
    )
    if proc.returncode != 0 or not out.exists() or out.stat().st_size < 1000:
        raise RuntimeError(f"Piper failed: {voice}: {proc.stderr.decode('utf-8', 'replace')[-300:]}")


def read_wav(path: Path):
    with wave.open(str(path), "rb") as w:
        return w.getnframes(), w.readframes(w.getnframes()), w.getnchannels(), w.getsampwidth()


def assemble(parts: list[tuple[str, str]], out: Path) -> float:
    all_frames = []
    for voice, text in parts:
        p = TMP / f"{abs(hash((voice, text))) & 0xFFFFFFFF}.wav"
        tts(text, voice, p)
        n, frames, ch, sw = read_wav(p)
        if ch != 1 or sw != 2:
            raise RuntimeError("unexpected TTS format")
        all_frames.append(frames)
        all_frames.append(b"\x00\x00" * int(RATE * 0.42))
    body = b"".join(all_frames)
    n = len(body) // 2
    rand = random.Random(1980)
    mixed = bytearray()
    # low tape hiss and a room bed under the voices
    for i in range(n):
        s = struct.unpack_from("<h", body, i * 2)[0] / 32768.0
        hiss = rand.uniform(-1, 1) * 0.012
        hum = math.sin(2 * math.pi * 57 * (i / RATE)) * 0.008
        # tape click at the very beginning and end
        if i < 500:
            hiss += math.sin(2 * math.pi * 2100 * (i / RATE)) * 0.02 * (1 - i / 500)
        if i > n - 500:
            hiss += math.sin(2 * math.pi * 1800 * (i / RATE)) * 0.015 * ((i - (n - 500)) / 500)
        v = max(-1.0, min(1.0, s * 0.95 + hiss + hum))
        mixed += struct.pack("<h", int(v * 32767))
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(mixed))
    return round(n / RATE, 3)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    meta = []
    for tape in TAPES:
        out = OUT / (tape["id"] + ".wav")
        seconds = assemble(tape["transcript"], out)
        meta.append({"id": tape["id"], "title": tape["title"], "speaker": tape["speaker"],
                     "src": f"assets/openmic/{out.name}", "seconds": seconds,
                     "transcript": tape["transcript"]})
        print(tape["id"], seconds)
    (OUT / "openmic.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("TAPES", len(meta), "OUT", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
