# Phase A: world, map and visual completion

The current branch and uncommitted implementation were retained. This phase changes the map and its presentation; earlier unfinished work in other systems remains in the working tree and is not certified by this report.

## Delivered

- 66 western locations spanning Iberia, North Africa, Egypt, Nubia, Arabia, Syria, Anatolia and the Caucasus. Regional resources, ports, mountain gates and maritime connections are part of the atlas.
- Separate Tartus and Tarsus. The land graph connects Tartus through Antioch and Tarsus to both Taurus approaches, then Amorium. Hostile checkpoints still require capture or permitted passage. No special bypass was added.
- Corrected starting frontier context for Derbent, Balanjar, the Volga crossing, Tarsus and Cyprus; historical caveats and sources are in `world-research.md`.
- Geographic coastlines and islands, cultivated river corridors, forest groups, shaded mountain ridges and curved dune fields. Political shading shows local game control rather than surveyed historical boundaries.
- Roman tiled/basilica settlements, Umayyad courtyards and steppe settlements retain their original architectural culture after conquest. Fortification and settlement tiers change silhouettes and scale.
- Coastal road drawings stay on land. Ships and blue dotted routes show sea connections. Nicaea and Seville have explicit regional landing connectors. Drawing bends also guide caravan animation; movement rules continue to use the existing graph.
- Readable army count banners with faction cloth, movement pips, selection and condition indicators. Names avoid army banners and each other; a focused city keeps a reserved label position.
- Camera limits account for HUD, controls and sheets. The overview fits the location footprint, reducing empty framing. Atlas search and regional navigation expose all locations.
- Portrait sheets preserve an interactive map area. Short landscape HUDs stay on one row. Urgent dispatches remain visible and open full details without crowding the smallest screens.
- Old 22-city saves expand without resetting armies, treasury, turn, captured cities or upgrades. Obsolete caravan paths and missing embarkation ports migrate; eliminated factions do not revive.
- New dynasty emblem, parchment/jade/brass UI styling and readable navigation controls. Portrait orientation is enabled.

## Validation

Commands run against the local static server at `http://127.0.0.1:8000`:

| Check | Coverage |
| --- | --- |
| `node tests/map-routes.cjs` | 10 checks: graph integrity, connectivity, route templates, ports, both Taurus approaches, hostile checkpoints, allied passage, exhausted armies and winter movement |
| `node tests/camera.cjs` | 12 checks: both scenarios, 3,096 city-focus cases, transforms, clamping, zoom anchors, resizing and old/new save migrations |
| `node tests/inspect-geometry.cjs` | All 66 city anchors are dry; sampled road drawings avoid open water; maritime drawings use water between port approaches |
| `node tests/map-preview.cjs` | Eight viewport sizes, every western city at three zoom levels with/without a sheet, focused labels, label collisions, HUD occlusion, modal fit, horizontal overflow and full-atlas framing |
| `node tests/map-interactions.cjs` | Real browser mouse/touch pan, wheel zoom, two-finger pinch, atlas search, army taps, army target bounds and urgent dispatches with a city sheet; eastern scenario remains runnable |
| JavaScript syntax | All 32 scripts loaded by `index.html` parse successfully |

Viewports: 1440×900, 1024×768, 844×390, 740×360, 568×320, 390×844, 360×740 and 320×568. Browser checks use headless Microsoft Edge with Playwright, including touch input through Chromium's input protocol. This is browser emulation, not testing on physical phones or Safari.

Screenshots and machine-readable results are in `artifacts/map/`. The overview, portrait map, smallest portrait city sheet, short landscape map/sheet, urgent dispatch and eastern scenario screenshots were visually inspected. Failures found during that review were corrected before the final run.

## Source and generation

The coastline asset is derived from [Natural Earth 1:50m land](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-land/), whose vector data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). It is clipped, projected and simplified into a roughly 55 KB local script with no runtime network dependency. This modern geographic backdrop is not a reconstruction of every shoreline in 715. Regional landings represent historical access where city symbols are inland.

Optional regeneration: save the upstream `ne_50m_land.geojson` under `artifacts/map/natural-earth-land.geojson`, then run `node tests/build-coast.cjs`. `tests/build-road-drawings.cjs` repairs cartographic land bends offline; it does not replace army pathfinding. The game needs neither generator nor the upstream download at runtime.

## Files in this phase

World and rendering:

- `js/atlas-data.js`, `js/atlas-coast.js`, `js/atlas-routes.js`
- `js/data.js`, `js/map-art.js`, `js/campaign-ui.js`, `js/engine.js`
- `js/campaign.js`, `js/world.js`, `js/explain.js`, `js/util.js`

Presentation and entry points:

- `atlas.css`, `index.html`, `manifest.json`, `icon.svg`
- `js/main.js`, `js/icons.js`, `js/ui.js`, `js/panels.js`

Verification and documentation:

- `tests/harness.cjs`, `tests/map-routes.cjs`, `tests/camera.cjs`
- `tests/map-preview.cjs`, `tests/map-interactions.cjs`, `tests/inspect-geometry.cjs`
- `tests/serve.cjs`, `tests/build-coast.cjs`, `tests/build-road-drawings.cjs`
- `docs/world-research.md`, `docs/phase-a.md`, generated evidence in `artifacts/map/`

## Known limits

No known blocking map defect remains in the tested scenarios and viewports. City spacing, population scales, regional ports and ownership borders are gameplay abstractions. Exact historical shoreline changes and layered sovereignty are not simulated. Physical-device performance and Safari behavior remain unverified. Economy, leaders, battles and other later-phase balance are outside this phase's completion claim.
