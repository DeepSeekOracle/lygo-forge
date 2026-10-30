---
name: game-asset-sourcing
description: "Use when sourcing free assets for a game build."
---

# Sourcing free assets for a game build

Trigger: a game needs art, audio or UI and the budget is "free", especially when the owner says *"import as
many assets as possible so it's good"*. The deliverable is a local library, a licence answer for every
source, and a count proving what was pulled. Engine wiring for the Unity case lives in
`unity-agent-web-games`; this skill is the sourcing procedure and the licence gate, which apply to any engine.

## Order of operations

1. **Licence first, download second.** Nothing gets pulled until it is clear it can ship.
2. **Enumerate before you fetch.** Find an index, mirror or `kits.tsv`, not a list of guesses.
3. **Bulk-pull into a library directory outside the project.** The recipe:
   `references/cc0-library-pull.md`.
4. **Import selectively into the engine project.** See the rule below — this is where projects die.
5. **Count and record what actually arrived** (files, models, kits). "As many as possible" is only
   verifiable if the number is written down.

## The licence gate

- **CC0 is the target.** Public domain: publishable, sellable, remixable, no attribution, no review. When a
  source is CC0 the licence conversation is over and the assets can live in a public repo.
- **A free kit's *art* can be CC0 while its *code* is not.** Several Asset Store starters carry the standard
  Extension Asset EULA for the code and CC0 for the art (their attribution block names the CC0 sources).
  Take the CC0 art, write the logic yourself — then the kit is never a runtime dependency and the licence
  question is closed.
- **Never source from free-download aggregators.** Sites that redistribute paid Asset Store packages bury a
  shipping game in a licence problem; a game built on them cannot be published.
- **A GitHub game repo needs a real licence at the file.** Repos with no LICENSE, or "for educational
  purposes" wording, are not permission to ship. MIT/Apache only, read at the file.
- **Mixamo and similar free-for-use services are not redistributable.** Free in a shipped build, forbidden
  to redistribute as raw files — keep local copies and never commit them to a public repo.
- **Record the licence per source in the handoff notes.** "Everything is CC0" is a claim that has to survive
  the next session; write down which source each used asset came from.

## Enumerate before you fetch

- **Prefer an organised mirror or machine-readable index over scraping the vendor's site.** A JS-rendered
  catalogue returns zero links to `curl` even though a browser shows dozens — check whether an index file
  (`kits.tsv`, `index.tsv`, an API) exists before writing a scraper, and treat "curl found nothing" as a
  property of the site, not proof the packs do not exist.
- **When a vendor hides downloads behind a widget**, read the button: a `drive.google.com/drive/folders/<id>`
  href is fully scriptable, an itch.io or a login-gated link is not. Scrape the ids and report which packs
  resolved, rather than assuming all of them behave the same way.
- **Check the pack's own attribution block for its CC0 upstream.** It frequently names a cleaner source
  (e.g. a kit whose cars come from an explicitly CC0 vehicle pack), which is the version to use.

## Library outside the project, import selectively

Downloading broadly is right; importing broadly is not.

- Keep **one** library directory that every project can reach, so a later title reuses the same kits with no
  second download.
- Import only the kits the levels actually call for. Importing thousands of models inflates the project,
  slows every editor import, and inflates the shipped build with assets nobody sees.
- Check the **format against the engine** before promising a pulled library: a glTF-binary mirror needs a
  glTF importer in the engine project, while an FBX/OBJ pack imports natively. Note which kits need which.
- Downloaded packs are usually *staged*, not ready: expect `Blends/ FBX/ OBJ/` (or `Textures/` beside models)
  and pick the folder the engine wants rather than importing all three.

## Pitfalls

- **A bulk download outlives the tool call.** A large clone or a multi-pack pull can run past the terminal
  call's ceiling while still working. Launch it in the background, then **poll the filesystem** for growing
  artifact directories and re-run only when nothing is growing — relaunching a live job races the first copy.
- **Do not confuse "many files" with "useful files."** A 17,000-file library can still be missing the one
  thing the game needs (audio and fonts are the classic gap in a model-only mirror). Name the gap and pull
  it from a second source instead of implying the library is complete.
- **Never report a pulled library from the download list alone.** Count the files on disk (per category) and
  report those numbers; a claimed total that was never counted is the kind of "done" claim this owner checks.
