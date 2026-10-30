# Upgrade the LLM

Forge ships with **QwenPaw**. That model is the basic coder. It is enough to open a project and answer the Build desk. It is not the model you keep for a large game.

Hermes is the Forge Master in the Build desk. QwenPaw is the model Hermes uses until you upgrade.

## What you have on a fresh install

- Brain: QwenPaw (`qwenpaw-9b`).
- Where Forge looks: `http://127.0.0.1:8080/v1` on this PC.
- QwenPaw starts with the Hermes desktop app. Forge does not download a second copy and does not send the desk to a paid API on its own.

If QwenPaw is not running, the Build desk tells you. Start Hermes desktop, or add an API key.

## Look for a local model

On startup, and when you press **Scan this PC** on the Brain card, Forge checks loopback servers only:

1. QwenPaw on port 8080.
2. A LYGO engine on port 8081.
3. An NVIDIA bridge on port 8082.
4. Ollama on port 11434.
5. llama-server on port 11441.

If QwenPaw answers, Forge stays on it. That is the basic shipped brain.

If QwenPaw is down and a local model with "coder" in its name answers, Forge uses that coder so the desk still runs. That is a stand-in, not a replacement for the upgrade notes.

Forge does not silently switch the desk to a general chat model or to the NVIDIA bridge. Pin one of those from the Brain card if you want it. Forge will not call a model that is not on this computer unless you add an API key.

## Add an API key

Use this when the PC has no local server.

1. Open **Brain** in the Forge window.
2. Choose API.
3. Pick the provider: OpenAI, OpenRouter, Anthropic, xAI, or a custom HTTPS base URL.
4. Enter the model id that provider expects.
5. Paste the key once. Forge stores it in the local Forge data folder and does not show it again.

The key is sent only with the Hermes turn. It is not written into the project, the build log, or this document.

Clear the key from the same card when you are done with it.

## Upgrade off QwenPaw

QwenPaw is the floor, not the ceiling.

- For a stronger local coder, run that model on one of the loopback ports above, open **Brain**, scan, and pin it. A 7B-class coder is a normal next step on an 8 GB GPU. Larger models need more card or RAM than this basic install assumes.
- For a hosted model, add an API key as above. That is an upgrade you pay for. Forge does not start one for you.
- One heavy model at a time. Stop image, video, and music jobs before you expect QwenPaw or a larger coder to answer quickly.

After an upgrade, the Build desk starts a new Hermes session for that model. Publish, push, deploy, buy, and delete still wait for you.
