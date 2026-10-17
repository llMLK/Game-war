# Generation and editing history

Tool: built-in **`image_gen.imagegen`**, exposed as `image_gen__imagegen`. Eight genuine raster calls were completed for this bounded pilot. No API/CLI fallback or procedural city renderer was used. The session tool did not expose a model version, seed or exact pixel-size parameter; these remain unknown. All returned files measured 1536×1024.

The [machine-readable record](generation-record.json) identifies every input, executed prompt, original output filename and SHA-256. All eight preserved outputs were compared byte-for-byte with the original tool files. IDs below express dependency order; two independent pairs ran concurrently and IDs do not assert completion order. Separate generation timestamps were not logged.

| ID | Inputs and role | Exact prompt | Preserved tool output |
|---|---|---|---|
| G01 | Annotated layout = geography/camera; C = atmosphere; A = structure; B = pigment, excluding its border | [A1 generation](prompts/A1-style-master.txt) | [A1 first pass](drafts/A1-first-pass.png) |
| G02 | G01 as edit target; local historical/style corrections, layout retained as a target | [A1 refinement](prompts/A1-refinement.txt) | [A1 style master](art/A1-style-master.png) |
| G03 | G02 = style/identity; blockout = geography; new compact composition requested | [A2 dedicated city](prompts/A2-strategic-city.txt) | [A2 detailed source](drafts/A2-generated.png) |
| G04 | G03 as repaint target, reducing small-scale detail | [First LOD](prompts/A2-compact-lod.txt) | [LOD first pass](drafts/A2-lod-generated.png) |
| G05 | G03 as fixed city reference; missing surroundings painted | [Expanded context](prompts/A3-expanded-context.txt) | [Environmental donor](drafts/A3-context-generated.png) |
| G06 | G04 = identity/style reference; stronger compact recomposition allowed | [Final bounded LOD attempt](prompts/A2-low-scale-recomposition.txt) | [LOD second pass](drafts/A2-lod2-generated.png) |
| G07 | Cleaned G06 = fixed target; annotated regions = allowed changes; market/port/granary only | [Facility donor](prompts/B-facility-patches.txt) | [Full donor, not a final state](drafts/B-facilities-donor.png) |
| G08 | Cleaned G06 = fixed target; annotated regions = allowed change; gateway only | [Defense donor](prompts/B-defense-patch.txt) | [Full donor, not a final state](drafts/B-defense-donor.png) |

## Controlled offline work

- Original files remain untouched in `drafts/` or, for selected G02, `art/`. Their source tool files also remain in the local generated-images directory.
- Alpha cleanup changed only alpha ≤8 to 0 and ≥250 to 255; intermediate values were retained. Actual transparent pixels exist in the generated inputs and exports. No checkerboard or background-color key was substituted for alpha.
- Registration applies a single uniform scale of 0.76 and translation (184,75) to the 1536×1024 source family. Ground anchor is (768,799). There is no automatic bounding-box fit for progression states.
- A3 is a composite: G03's cleaned detailed city over G05's painted surroundings. The 725,980 fully opaque source pixels retain their exact RGB values. G05 is not trusted to preserve architecture by itself.
- compact-v2 is a separate purposeful repaint. It corresponds topologically to G03/A3 but is not falsely described as an exact geometric match.
- S0 is fixed compact-v2. S1 replaces only the market region; S2 adds the port replacement; S3 adds the granary replacement; S3-defense replaces only the gateway over S3. Full-image donor drift is discarded.
- Replacement uses premultiplied RGBA interpolation under a bounded feathered mask. Each [crop and mask](layers/) has canvas coordinates in [the modularity record](evidence/modularity-verification.json); [the script](scripts/build_modularity.py) provides the reconstruction rule. The PNG crops are replacement sources, not standalone over-layers that can be blindly alpha-composited to erase old geometry.
- Final masks were fitted to local canopy, seaward pier and buttress extents after inspection. Earlier guide revisions are preserved. The change did not authorize a new coastline or whole-city repaint.

The [difference sheet](evidence/B-difference-comparison.png) and numeric checks distinguish added/replaced/removed coverage from unchanged regions. This verifies registration, not historical truth or mobile recognition.

## Reference and evidence provenance

The generator received only our prior generated concepts, our own guides and the new generated images listed above. Downloaded museum/Commons images were not fed into this pilot. Existing [reference rights and period boundaries](../exploration/reference-register.md) still apply; no generated-output copyright guarantee is inferred from public-domain references.

The Phase R screenshot was read from committed repository data at `29f34b333ff4c424e0b0a987838138a4bf697d94`, path `artifacts/phase-r/umayyad-390x844.png`. Its source test uses a fresh Playwright context, `Game.newGame` and synthetic save data. [Provenance and hash](references/phase-r-provenance.json) are retained. The original screenshot is unchanged; [the comparison](evidence/phaseR-dpr1.png) separately labels the constructed offline art placement. No owner save was opened and no other agent's worktree was modified.

Browser screenshots were captured from the isolated static preview at default 100% page zoom, with CSS widths checked by `getBoundingClientRect` at DPR1/2. [The capture record](evidence/browser-scale-verification.json) identifies emulation; no physical phone, QA17 participant result or performance pass is claimed. The temporary loopback server was closed after capture.

All earlier attempts are retained because their reduction failures are evidence. No further generation was performed after the eight calls simply to make the delivery appear successful.
