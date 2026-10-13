# Asset production and feasibility

Proposed workflow, not implementation • 13 October 2026

## 1. Authorization and deliverable sequence

This assignment ends with documents. **No image generation has occurred.** After the owner approves this direction, obtain the scope of the first concept session from that approval. Begin with one tightly reviewed A concept and a small-scale B feasibility study if authorized, not a mass asset batch. Approval of A does not approve B, all cultures, production integration or Phase J.

| Stage | Concrete output | Exit check |
|---|---|---|
| Research | Dated feature card, topology sketch, unknowns, rights log | History reviewer accepts H/R/I boundaries |
| Blockout | Grayscale city massing under C01/L01, wall/road/shore sockets | Correct adjacency, silhouette readable at 64 CSS px |
| Style concept | A concept plus palette/edge/material notes | Owner accepts style; record exact image/version |
| Compact proof | B, hand-refined at 48/64/96 px | Mobile identity succeeds independently of A |
| Paired detail | C based on approved B guide | Same city, landmarks and upgrade state |
| Layer proof | One wall state and three successive facility changes | Walls persist, connectors and shadows align |
| Regional pilot | One Umayyad and one frontier brief, then images if authorized | Distinct architecture within shared visual language |
| Library | Limited culture/tier bases and reusable slots | Quality gate, device/performance evidence, owner approval |

Generation can explore pigment and composition; an artist is responsible for structural drawing, repeated landmarks, state continuity, masking and compact repainting. A simple 3D blockout is optional for camera/shadow guides, not a low-poly final style. No executable prototype is part of this delivery.

## 2. Registered source master

Maintain a layered PSD/KRA or equivalent with a fixed 1536×1024 strategic guide. Store C01 camera, L01 light, reference revision, authoring scale, ground anchor, road sockets, shoreline polyline and all masks in the source. Keep color management sRGB for runtime exports; preserve richer source color if the artist needs it, with a controlled conversion.

Suggested layer order, back to front:

1. Terrain contact and farm ground underlays.
2. Receiver-aware ground cast shadows.
3. Rear fortifications and distant district masses.
4. Fixed central districts and locked landmark/precinct group.
5. Market/service/military slots with their local receiver shadows.
6. Front fortifications, gate and occluding terrain edges.
7. Shore-contact elements, with docks/boats split by actual depth where necessary.
8. State-dependent damage/occupation accents, only when supported by data.
9. Independent UI selection, army, route and ownership layers at runtime.

This list is a default, not a painter's-algorithm guarantee. A tall crane, mast or tower may need splitting across two occlusion layers. Slot-specific receiver masks determine which neighboring surfaces a shadow can touch. Do not simply add every shadow at 50% opacity; overlap creates false black patches.

Keep a neutral empty slot beneath each replaceable facility, including surfaces normally hidden by it. Otherwise removing a market reveals a hole. Keep all variants on the same guide with no auto-crop until export metadata records the crop offset. Export optional contact shadows separately; self-shading remains inside the object.

## 3. Cumulative upgrade contract

Proposed art-state description: place identity, regional architecture family, settlement tier, wall level/condition, market level, port state/eligibility, farm level, granary level, barracks/stable state, civic state, terrain family, LOD and art revision. This is documentation vocabulary, **not a new save schema**.

The fixed base owns street topology, ordinary districts and place identity. Wall overlays own only defense geometry; facility slots own only their specified region. Changing market or port never selects a lower-tier base or lower wall asset. Switching tier preserves all active upgrade inputs and uses that tier's compatible slot adapters. Cross-tier overlays cannot be blindly pasted if their wall boundaries differ.

| Review state | Core | Walls | Market | Port | Granary | Expected change |
|---|---|---|---|---|---|---|
| S0 | T3 | W3 | M0 | P0 | G0 | Reference geometry |
| S1 | T3 | W3 | M2 | P0 | G0 | Trading court changes; wall silhouette unchanged |
| S2 | T3 | W3 | M2 | P1 | G0 | Eligible waterfront changes; market and walls remain |
| S3 | T3 | W3 | M2 | P1 | G2 | Storage court changes; all prior structures remain |
| S4 | T3 | W4 | M2 | P1 | G2 | Defensive reinforcement only; existing facilities persist |

Use S0–S3 for the minimum three successive upgrade comparisons. Use S4 to prove wall upgrades still work after facility additions. Add counterexamples: T1/W4; T4/W0; port requested inland; same city after capture; damaged wall with market upgrade. Illegal states should be flagged, not decorated into plausible screenshots. Damage may reduce visible defenses only when authoritative state says so.

For Constantinople the historical monument and defense identity require a location policy in future implementation: gameplay weakness can represent damage/readiness, whereas the four-tier art study is expressly hypothetical. The art director does not decide that a real 715 capital loses its landmark because a population threshold changes.

## 4. Controlling combinatorial cost

Illustrate **a bounded kit**, not every permutation. Start with 12 regional bases (3 culture families × 4 tiers) only after pilot approval, plus dedicated landmark kits for exceptional cities. This is a proposed library scope, not a promise that 12 images can represent every geography well.

For one family, an illustrative inventory might be four cores, five defense states, four market states, three storage states, two military states and three port states: 21 logical choices before terrain adapters, rotations, splits and LOD exports. Drawing every possible combination would produce 4×5×4×3×2×3 = 1,440 states for that family. Layer composition avoids painting 1,440 complete cities, but it does not eliminate the work of connector, shadow and compatibility review.

Use two or three authored district arrangements per common regional family where repetition is obvious, shared material swatches, a consistent edge/texture hand, and a few distinct site landmarks. Do not rely on random tint/noise as variety. Coast-facing variants require re-authoring in the fixed lighting rig, not bitmap rotation/mirroring. Extraordinary topography receives a bespoke base rather than forcing a universal template.

## 5. Generative-image failure controls

| Failure | Prevention | Repair / reject condition |
|---|---|---|
| Architecture melts or violates load paths | Supply blockout/elevation, constrain landmark crop | Redraw major structures; reject if landmark cannot be corrected without replacement |
| Camera drifts | Shared grid, horizonless parallel reference | Overlay guide; reject a new camera instead of warping the whole city |
| Landmark changes across images | Locked landmark master and localized editing | Reuse corrected master, repaint transitions; prompt repetition alone is insufficient |
| Different style between cities | Approved palette/brushwork/material crops and one finishing pass | Shared paintover/grading review; compare images on one sheet |
| False transparency or white fringe | True alpha export where available, separate extraction review | Inspect on three backgrounds; rebuild masks and edge colors manually |
| Tiers lose previous development | Build next tier from registered prior core plus explicit edits | Compare invariant wall/slot masks and state sheet |
| Modules impossible to separate | Reserve slots/hidden surfaces from blockout stage | Hand-paint occluded geometry; reject contact-sheet fragments that cannot connect |
| Inconsistent or doubled shadows | One light rig and receiver masks | Paint coherent replacement shadow set |
| Unreadable microdetail | Reduce early at fixed CSS widths | Hand-repaint LOD, remove marks rather than sharpen everything |
| Beautiful but wrong era | H/R/I card and explicit negative references | Remove offending form; no aesthetic score can compensate for a hard date error |
| Model invents text | No generated inscriptions/labels | Remove pseudo-writing; add separately verified human lettering if needed |

Archive the model/version, prompt, supplied references, generation settings and seed where available, original output, edits, source layers and approval record. A seed is a provenance aid, not a guarantee of reproducibility or style lock. Do not claim generated output proves historical truth.

## 6. Resolution, formats and export targets

| Artifact | Authoring / runtime proposal | Notes |
|---|---|---|
| Strategic master | 1536×1024 layered | Authoring only; not retained per city in phone memory |
| Tiny strategic LOD | 96×64 RGBA | Repainted silhouette for a roughly 32 CSS px display |
| Normal strategic LOD | 256×192 padded RGBA container | Preserve source aspect ratio inside padding; supports approximately 48–96 CSS px widths at DPR 2 |
| Near strategic LOD | 512×384 padded RGBA container | Only when needed; bound cache by bytes |
| Expanded master | Target 3072×2048 | Generator size may differ; do not relabel an upscaled result native-resolution |
| Expanded runtime | 1536×1024, optionally 768×512 small derivative | Load on inspection; never preload all capitals |
| Module sheets | Up to 1024×1024 per packed page initially | 4–8 px extruded gutter at this resolution, then test filtering/alpha |

Use lossless PNG as editable exchange/reference output; evaluate alpha-capable WebP for strategic delivery. For large opaque detail paintings, compare WebP and AVIF at equal visible quality. PNG can serve as a compatibility fallback. The [MDN format guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types) documents format capabilities; specific encoding settings must be chosen by visual comparison, not a universal quality number.

Do not confuse web image compression with GPU texture compression. Canvas 2D draws decoded images; proposing KTX2/Basis or a WebGL rewrite is outside this art task. Alpha, saturated gold edges and terracotta detail must be inspected after encoding. A smaller download can still decode into a large RGBA allocation.

## 7. Proposed measurable budgets

These are conservative starting acceptance targets for the new artwork, **not observed performance, device guarantees, or replacements for later approved Phase J budgets**.

| Resource | Initial target | Measurement / response |
|---|---|---|
| Compressed strategic art needed for first region | ≤2 MiB | Network transfer, cold load; defer nonvisible cultures if exceeded |
| Total compressed strategic library | ≤12 MiB | Manifest byte sum, exclude authoring files and detail art; revise art inventory if exceeded |
| Expanded image transfer | ≤1 MiB per 1536×1024 image | Inspect encoded quality; load on demand |
| Decoded map-art resources | ≤32 MiB incremental | Count sources, sheet pages, composed images and scratch surfaces; browser/GPU copies separately observed |
| Decoded expanded resources | ≤16 MiB incremental | One active image plus transition buffer; release unused images |
| Warm city-art rendering | p95 ≤2 ms within existing frame on agreed midrange phone | Instrument city pass separately; retain original game comparison |
| Total frame during map pan | p95 ≤33.3 ms on agreed target device | Proposed 30 fps floor; report 60 fps where achieved, no invented measurement |
| State composition | No single main-thread task >8 ms | Spread invalidations, compose idle/offscreen when available; use approved previous LOD while loading |

Memory arithmetic: a 256×192 RGBA bitmap is 196,608 bytes (192 KiB); 64 such composed states total 12 MiB. A 512×384 bitmap is 768 KiB, so 64 would cost 48 MiB and exceed the map budget before source sheets. A 1024² RGBA source page costs 4 MiB; three pages add 12 MiB. Thus 12 MiB composites + 12 MiB source pages + up to 8 MiB scratch/active near LODs fits the **nominal** 32 MiB art allowance. This accounting does not promise that browser overhead or GPU duplication is zero. A 1536×1024 RGBA detail image is 6 MiB; two transitional copies nominally cost 12 MiB.

A 1536×1024 strategic master costs 6 MiB decoded; retaining 60 would nominally cost 360 MiB. This is why master images are not the phone runtime library. Cache eviction must use actual pixel bytes and asset type, not just an item count.

## 8. Runtime recommendations for a future implementer

The Phase F snapshot already has sprite caching and a `MapArt` layout/state path. Its tier uses population/capital and its radius includes wall level; the initial portrait camera is 1.45× and DPR is capped at 2. These read-only findings explain why 48/64/96 CSS px are useful starting review sizes; they are not a rendered measurement of each city's footprint. See `js/map-art.js:45`, `:60`, `:61`, `:409`, `js/campaign-ui.js:51`, `js/engine.js:88` at baseline `2deaa02`.

Future integration should compose a city on relevant state/LOD change, cache a small bitmap, then use one city draw plus necessary independent overlays per visible settlement. Cull offscreen cities. Keep a small visible-region source set and a byte-bounded LRU of compositions. A logical cache key includes all appearance-changing state and art revision; it must not be keyed only on population. Profile encoding/decoding, composition and draw separately.

Use a versioned manifest of asset IDs, crop offsets, anchors, sockets, layer order, valid states, source hashes and fallback IDs. Prefer immutable file versions so old caches cannot mix new landmarks with old wall sheets. A missing detail asset should fall back to an approved compact illustration and normal game UI, not block play. No caching of art requires modifying campaign saves. Damage/ownership overlays remain independently drawn.

## 9. Future verification plan

Use the same actual state and camera before/after three upgrades. Test a crowded region with routes, armies, selection and labels, not isolated cities on blank paper. Record exact device, browser/version, DPR, viewport, asset revision and warm/cold cache conditions. Exercise portrait 320×568 and 390×844, landscape 844×390, plus a physical iPhone/Safari and midrange Android/Chrome. Emulation is supplementary and explicitly labeled.

Collect at least three repeat captures of representative idle, pan/zoom and upgrade activity; report median/p95 and memory/transfer totals. Measure cold detail opening separately. Record a baseline run from the same approved game snapshot and device. Do not alter game/save logic to improve art timing. If budgets fail, first reduce visible LOD detail and decoded residency; if style still fails at the needed scale, return to art composition.

The mandatory five-person human comparison and owner acceptance are described in [05-quality-gate.md](05-quality-gate.md). No device, image, performance or human test in this plan has been executed in this document-only assignment.
