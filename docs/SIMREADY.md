# NVIDIA SimReady Central — Forge pointer

**Source:** https://x.com/slashui/status/2113408986406129844  
**Library:** https://huggingface.co/spaces/nvidia/simready-central  
**Blog:** https://huggingface.co/blog/nvidia/simready-central-assets-robotics-ai-factories  
**Format:** OpenUSD  
**Cost:** free, ungated  
**Decision:** **POINTER / manual asset source. No bulk download or install.**

## What is available

- 2,000+ (now 2,500+) simulation-ready OpenUSD assets on Hugging Face.
- Robot arms, grippers, warehouse equipment, racks, cooling infrastructure, engines,
  medical equipment and more.
- Natural-language USD Search in the Hub Space.
- Assets carry collision geometry, mass, friction, joints, semantic labels and materials
  depending on their SimReady profile.

## Verified licence

The inspected dataset
[`nvidia/PhysicalAI-SimReady-Warehouse-01`](https://huggingface.co/datasets/nvidia/PhysicalAI-SimReady-Warehouse-01)
is **CC BY 4.0** and contains **753 OpenUSD assets** (about 10 GB). Attribution is required.

**The library contains multiple OEM datasets.** Each dataset/asset can have its own licence.
Always read the exact dataset card and asset metadata; do not treat CC BY 4.0 on one dataset
as the licence for every SimReady asset.

## Why Forge does not bulk-ingest it

- The warehouse dataset alone is ~10 GB; Forge's asset-fetch cap is 20 MB.
- OpenUSD is a scene format; Forge's engines are Unity/Web. A conversion step is required.
- SimReady physics properties are intended for Isaac Sim/physX workflows; some metadata is lost
  or needs remapping after glTF export.
- A multi-GB blind download is not a job asset; select one asset for one task.

## Forge workflow

1. Search the Hub Space in plain English for a specific object.
2. Open the owning dataset card; record dataset name, asset path, licence and attribution.
3. Download only the selected USD asset/its dependencies manually, or ask the operator to stage it.
4. Blender worker imports the USD, fixes scale/origin, exports GLB/GLTF for the target engine.
5. Record the conversion log, source dataset, licence, asset path and hash in the Asset Pointer.
6. Technical Artist validates collision, scale and draw budget.

## Rules

- No automatic multi-GB download.
- No unknown OEM licence.
- No claim that SimReady physics properties survive USD→GLB unchanged.
- Attribution required where the dataset is CC BY; record exact text.
- Free only: do not add paid NVIDIA services or licensed asset packs.

## Pointers

- Library Space: https://huggingface.co/spaces/nvidia/simready-central
- Verified dataset: https://huggingface.co/datasets/nvidia/PhysicalAI-SimReady-Warehouse-01
- SimReady Foundation: https://github.com/NVIDIA/simready-foundation
- Skill: `forge-asset-pointer` (source `nvidia-simready`)
- Conversion worker: `forge-blender-worker`
