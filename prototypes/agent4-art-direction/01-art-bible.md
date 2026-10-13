# Suyuf Al-Mamalik — Imperial Illuminated Atlas

Art Bible v1.0 • 13 October 2026 • AGENT 4

**Status: proposed direction, awaiting owner approval.** This is an art specification, not a claim that assets, performance tests, or Phase J have been completed. Numerical art limits below are proposed production standards. Historical claims are qualified in the [research register](02-research-and-references.md); implementation budgets are in the [workflow](04-production-workflow.md).

## 1. Vision

Make the player feel that a consequential, inhabited eighth-century world has been painted into a precious imperial atlas. Architecture has structural weight and terrain has depth; pigment, edge control, selective ornament and gold reveal the hand of an illuminator. Grandeur must survive reduction to a phone map.

The synthesis operates **inside each building group**: volumetric masonry under coherent daylight; simplified, deliberate planes of pigment; fine descriptive marks only where they clarify material; occasional flat metallic accents that belong to the atlas surface. Never divide the image into a realistic city and an unrelated ornamental frame.

## 2. Signature visual identity

Every settlement uses five recurring devices:

1. **A defining mass:** a recognizable civic, defensive or religious building group, appropriate to the location and tier. Its silhouette leads before its decoration does.
2. **A route into the image:** a real gate, road, court or quay links the settlement to its surroundings. No disconnected picturesque entrance.
3. **Three spatial registers:** a grounded front edge, an interlocking middle district, a quieter distant skyline. This is depth, not three arbitrary asset rows.
4. **Unequal rhythms:** long roof runs against short courts, heavy towers against recessed curtain walls, a principal dome against low dwellings. Avoid equal spacing outside genuinely regular architecture.
5. **Precious restraint:** one small concentrated accent of crimson/purple, one cool water or shade family, and a few gold marks. Stone and earth remain the majority.

At strategic scale, aim for 60–70% calm connected shapes, 20–30% descriptive secondary masses, and at most 10% high-frequency accents. These are composition guides, not historical measurements. Detail artwork can add texture but must retain the same hierarchy.

## 3. Artistic influences and their boundaries

**Primary:** surviving late antique architecture and measured/site documentation for mass and material; late antique manuscript painting for deliberate contours and narrative grouping; early Byzantine and Umayyad mosaics for luminous pigment relationships and selective small accents. These traditions inform separate decisions, not a license to mix every motif everywhere.

**Secondary:** illuminated-book craftsmanship for the contrast between matte pigment and metallic leaf; modern archaeological reconstruction for explaining space; architectural gouache and tempera-like digital painting for controlled opaque planes and translucent shadows. Later manuscript examples are references for craft only, never evidence for buildings in 715.

The atlas itself is a contemporary synthesis. We do not claim that an eighth-century artist made this precise kind of strategic atlas. No named commercial game's city sprites, modern illustrator's composition, museum photograph or reconstruction is to be copied wholesale. Source images remain references until reuse rights are checked.

## 4. Historical research and accuracy boundaries

Use three labels in every asset brief:

| Label | Meaning | Required action |
|---|---|---|
| H — supported | Dated evidence supports this specific feature | Link a source and identify what it supports; a building's existence does not verify its roof color |
| R — reconstruction | A defensible interpretation fills a documented gap | State the gap and why the choice is plausible; record alternatives |
| I — idealization | A deliberate readability or presentation decision | Record the degree of exaggeration and preserve identity/topology |

Date the **feature**, not merely the monument. A present-day photograph of an ancient building includes later repairs. A source covering 661–750 does not prove a feature existed by 715. When evidence is weak, simplify rather than decorate with an unsupported claim. Religious symbols, inscriptions, flags and ship rigging need their own checks.

715 is the initial visual horizon. Do not depict the 717–718 siege as an event already occurring. Lower Constantinople tiers are explicit hypothetical game-state studies, not four historical reconstructions of the capital. They do not authorize removing historical monuments from a production campaign.

## 5. Perspective and camera standards

**Canonical camera C01:** parallel projection, elevation 35° above the ground, looking northeast from southwest, no lens distortion, no converging verticals. Ground axes project approximately 30° above the horizontal. Screen north is upper-left; east upper-right; west lower-left; south lower-right. Attach a compass to the working guide, never bake it into the gameplay sprite.

The camera is fixed for all five initial concepts, including the expanded view. A later marketing image may use perspective only as a separately approved variant; it cannot serve as the production camera reference.

**Constantinople topology:** land walls at the western/lower-left edge; Golden Horn at the northern/upper-left edge; Marmara at the southern/lower-right edge; peninsula tip to upper-right. Hagia Sophia in the eastern urban core; Hippodrome southwest of it; palace precinct toward the southeast. The working layout is schematic, not a surveyed plan. Keep these relationships through compression.

**Strategic authoring guide:** 1536×1024 transparent master; ground anchor at (768, 799), equivalent to (0.50, 0.78). Keep solid architecture within x=12–88%, y=10–83%; allow soft shadow to y=90%. All tiers use this same canvas and pixel-per-authoring-unit scale. The guide defines a compressed city symbol, not meters of actual Constantinople. No automatic per-tier fit-to-frame resizing.

In detail views use the same guide projected onto a wider 3:2 landscape, retaining landmark geometry and relative placement. A–C may add or subtract minor districts, but not rotate the principal church, move the harbor across the peninsula, or reverse the light. Never mirror assets to fit a shore: it reverses historical topology and illumination. Re-author a controlled orientation variant when necessary.

## 6. Lighting, values and shadows

**Light L01:** warm, broad daylight from screen upper-left; projected cast shadows run lower-right. Use a sun elevation near 40° for the authoring rig. This is an art-light standard, not a reconstruction of an astronomical time on a dated day. Model a neutral/cool sky fill and warm ground bounce under eaves.

Establish three value families before texture: lit stone roughly 70–85% perceptual lightness, roofs/mid-tones 40–60%, occlusion/shadow 20–35%. Check visually in grayscale; HEX values are not linear light measurements. Preserve a useful separation between the main landmark and its immediate background.

Hardest edges: gate opening, principal roof profile, front tower overlap. Softer edges: distant housing and contact transitions. No universal dark outline. Shadows should reveal tower height and roof overhangs; avoid black ambient-occlusion gutters around every object. Long theatrical sunset shadows that swallow the road are unacceptable.

Keep building self-shadow in its painted layer. Put cast shadows affecting neighboring modules in separately authored receiver-aware masks. Ground shadow is a soft irregular footprint, never an oval pedestal. Highlight gold with a short pale streak plus ochre mid-tone, not bloom, emissive glow or animated sparkle.

## 7. Pigment-inspired color system

All values are **sRGB production suggestions**, not chemical pigment analyses or verified historic paint colors. Use these named families in every generation/edit brief and paintover. Color grading must be shared; no independent automatic grading per city.

| Family / token | Light | Body | Shadow | Use |
|---|---|---|---|---|
| Parchment | `#F3E8CD` | `#DDCBA7` | `#B39A73` | Atlas page and optional UI plate only, never opaque sprite background |
| Limestone / aged ivory | `#E9DFC8` | `#C7BDA7` | `#8B857C` | Byzantine masonry, sculpted openings |
| Sandstone | `#DFC89E` | `#B89A70` | `#796752` | Region-appropriate warm stone, not every city's geology |
| Weathered plaster | `#EFE2C8` | `#CFC1A4` | `#969084` | Broad matte planes; small edge losses |
| Terracotta | `#CB8C64` | `#A95E45` | `#714C43` | Roof groups and selected brick bands |
| Slate / lead-like roof metal | `#A7A7A0` | `#777E7C` | `#4E6064` | Quiet reconstructed roof treatment, not gilded domes |
| Lapis / deep water | `#7895A5` | `#36586C` | `#243D51` | Sea and distant cool accents |
| Muted turquoise | `#A2BCB4` | `#688F89` | `#436D6B` | Shallow water; sparing cloth, not ubiquitous glazed roofs |
| Olive / vegetation | `#A5A57B` | `#727C59` | `#465848` | Cultivation, scrub, trees |
| Timber | `#BA9164` | `#876646` | `#534638` | Wharf piles, doors, exposed framing |
| Linen / felt | `#E1D3B4` | `#B6A88C` | `#817A6A` | Sails, awnings, tents |
| Crimson / madder-inspired | `#B46C60` | `#883F40` | `#582F37` | Small cloth emphasis and civic detail |
| Imperial purple | `#947F96` | `#65506D` | `#40394F` | Byzantine accents; never a substitute for architectural identity |
| Gold leaf | `#EEDB98` | `#B99449` | `#776034` | A few atlas-surface illumination marks |
| Shared ink / deepest cool | `#69645B` | `#454844` | `#303B42` | Selective joints and openings, no pure-black contour ring |

**Culture mixes:** Byzantine: ivory + terracotta + cool lead-like roofs, purple/crimson accents. Umayyad Levant: warm stone + plaster + shaded arcades, restrained vegetal/mosaic color in specific monuments. Khazar/frontier: local earth + timber + felt, with regional masonry where supported. Do not recolor the same castle three ways and call it three cultures. Military ownership colors remain separate UI marks; capture does not instantly rebuild local architecture.

## 8. Materials and architectural surfaces

| Surface | Large-scale read | Detail treatment | Reject |
|---|---|---|---|
| Stone masonry | Heavy connected planes, deep opening reveals | A few irregular joints, chipped corners, repair zones | Every block outlined like a checkerboard |
| Brick bands | Narrow warm strata wrapping structural faces | Variable mortar and occasional repairs | Decorative red stripes ignoring corners or chronology |
| Plaster | Broad soft matte light | Worn bases and exposed edges, no uniform grunge | Plastic gloss or blanket decay |
| Roof tile | Interlocking planes, clear ridge/eave | Tile courses follow pitch; vary clusters, not individual random pixels | Identical red triangular huts |
| Timber | Dark structural rhythm | End grain only in detail view; joinery at load-bearing points | Oversized fantasy beams or modern milled decking |
| Cloth | One readable folded canopy mass | Seams, tension points, repaired hem | Floating awnings, neon flags |
| Metal / gold | Sparse controlled reflectance | Different highlight character from stone | Chrome, glitter filters, brass roofs everywhere |
| Water | Calm connected negative space | Short directional glints, pier/contact reflections | Decorative ocean oval bundled with every city |

At 64 CSS px, texture is subordinate to plane changes. If a joint cannot survive reduction, remove it rather than sharpen it into noise. Building age varies: active imperial structures are maintained, with localized weathering; 715 is not a universal ruin filter.

## 9. Byzantine identity and Constantinople

Use a hierarchy of substantial ecclesiastical volumes, civic courts, terracotta roof districts and defensible edges. Hagia Sophia's recognition depends on a broad central dome, supporting mass and semi-domes, not a sphere perched on a generic tower. Use the post-sixth-century dome form as the research starting point; verify the dated silhouette before final paint approval. Current external details are not automatically period-correct. [Research H02](02-research-and-references.md).

For Constantinople, three anchors suffice at small scale: dome complex; weighty landward fortifications; a coastal opening/dock relationship. The Hippodrome's elongated open form is valuable in A/C but can collapse to one restrained ground shape in B. The Great Palace is a coherent lower precinct, not a tall western keep. Neighborhoods bend around courts and principal approaches; modest terrain steps interrupt the roof carpet. Urban spacing is R: do not claim a known 715 population or block-by-block density.

Represent the land-wall system as layered defense rather than a ring of identical towers. Do not project that double landward treatment continuously around the sea front. Use stone/brick material relationships selectively. The exact state of minor gates, sea-wall repairs and precinct roofs requires review. Exclude modern Istanbul's additions and later Blachernai palatial silhouettes unless individually dated.

## 10. Umayyad identity

Build an identity from courtyard organization, columned/arcaded spaces, horizontal prayer-hall or civic masses, local stone and plaster, and routes shaped by trade and water. Damascus is a specific reference, not a stencil for all Umayyad territory. The artistic exchange with late antique and Sasanian traditions is historically grounded; applying a motif to a particular 715 façade remains a separate claim. [Research H04–H05](02-research-and-references.md).

Create three regional briefs before later production: Syrian stone cities; irrigated river settlements with mudbrick/plaster; fortified frontier towns using inherited local fabric. They share palette control and brushwork, not identical roofs. No automatic dome/minaret pair on every settlement. Do not copy modern Damascus minarets, later tiled skins, Ottoman pencil minarets, monumental muqarnas or Timurid onion domes into 715. Later Umayyad palaces can inform period discussion only after their dates are checked against the campaign year.

In expanded art, concentrate mosaic-like luminosity in a documented monumental court rather than spraying ornament over domestic walls. Early Arabic inscriptions require verified wording and a specialist-reviewed lettering layer; never retain generator pseudo-Arabic.

## 11. Khazar and frontier identity

There is no single securely reconstructed universal Khazar city in 715. Treat this as a **regional, evidence-limited design family**. Distinguish seasonal encampment, settled trading community, and Caucasian stone frontier. Mixed habitation, open working yards, animal enclosures and local terrain can differentiate them without reducing a complex society to tents.

Timber/earth enclosures, felt shelter clusters and modest permanent dwellings are R proposals requiring site-specific checking, not verified drawings of Balanjar or Samandar. Build an elongated riverbank or ridge silhouette instead of a circular fantasy wooden castle. Do not promote a speculative administrative hall into a documented khagan's palace.

Exclude Sarkel as a 715 reference building: its later date is recorded in the research register. Derbent's inherited Sasanian fortifications are a location-specific frontier precedent, not proof of a generic Khazar style. Do not add universal religious emblems based on later traditions. Frontier identity follows settlement history and construction resources rather than the current owner's banner.

## 12. Settlement silhouettes and development hierarchy

Settlement tier and upgrade level are **independent visual axes**. The word “fortified” in the tier-3 study below describes its selected demonstration state; it must not force walls to exist in game data. No thresholds or save fields are changed by this document.

| Study | Silhouette transformation at identical camera/scale | Spatial story | Compact mass budget |
|---|---|---|---|
| T1 small settlement | Low, broken, open outline; one modest service/religious mass | Road and working yard; large gaps | 3–5 grouped masses, about 38% of master width |
| T2 developed town | Continuous roof shoulder around a clear court; one slightly taller hall | Legible main street and market slot | 5–7 masses, about 50% width |
| T3 fortified-city example | Districts arranged behind a weighty defensive edge; gate breaks the silhouette | Civic center, service district, separate port slot if eligible | 7–9 masses, about 64% width |
| T4 imperial capital | Asymmetric monumental summit above multiple lower districts and civic voids | Landmark/precinct, defense, harbor all distinguishable | 8–12 masses, at most 76% width |

These counts concern readable **groups**, not literal houses. Expanded paintings can contain many buildings inside a group. Do not increase every dimension together: change the roofline, open-space organization, defense hierarchy and civic focal mass. T4 needs an original landmark study; a T3 duplicated twice fails.

For actual Constantinople, preserve its dated monuments as place identity. If gameplay requires a weakened capital, show less maintained districts or changed active facilities rather than claiming Hagia Sophia was never built. The intentionally small T1–T3 Constantinople comparison is separately labeled hypothetical outside the image. Capital status alone never fabricates an upgrade.

## 13. Fortifications, gates and towers

Draw the enclosure as a relationship to slope and access. Tower bases meet terrain, parapets have plausible thickness, gates penetrate walls, and roads traverse the gate openings. A wall crossing a slope steps or follows it; it never floats above a painted hill.

Proposed W0–W4 art vocabulary (mapping to authoritative rules remains a later implementation task): W0 clear open edge; W1 modest enclosure suitable to local context; W2 substantial curtain and gate; W3 thicker/deeper defended gateway with stronger tower rhythm; W4 a site-appropriate second defensive element or major reinforcement. A second enceinte is **not universal** and is especially not a reason to add a later medieval keep. Constantinople's documented defenses belong to its identity, with gameplay condition represented separately.

Each wall state owns front and rear segments, gate opening, towers and its cast-shadow masks. Upgrade replacements occupy the same registered boundary. Markets cannot repaint this boundary. Damage may break a segment only if the state indicates damage; art upgrades do not silently heal it. A small settlement with W4 retains a small urban core within strong defenses; a large unwalled city retains its large core without a fabricated enclosure.

## 14. Markets, ports, farms and military infrastructure

| System | First readable sign | Advanced transformation | Layer strategy |
|---|---|---|---|
| Market | One court/awning cluster beside a route | Larger organized trading court with covered edges and loading space | Replace market slot only; keep through-route |
| Port | Shore-aligned landing and one modest vessel | Longer quay, waterside storage, multiple berths | Shore-specific dock + warehouse + separate boats; no water disk |
| Farm | Irregular cultivated strip beyond gate | Wider bounded cultivation, irrigation where locally plausible | Ground underlay; never displace walls |
| Granary | Broad storage roof and loading entrance | Larger store-yard with repeated bays | Service slot; no modern grain silos |
| Barracks | Enclosed working/drill court and long ranges | Denser service ranges with readable yard | Military slot; no parade of oversized soldiers |
| Stables | Low stable range and fenced yard | More yard capacity and shade | Companion service slot, detail LOD first |
| Civic/administrative | Court and substantial hall | More articulated precinct with colonnaded connection | Civic slot; distinct from military keep |
| Citadel | Site-specific inner fortified precinct if justified | Reinforced access and towers following its hill | Dedicated location family, never generic crown castle |

At small zoom, show only the strongest shape for an upgrade. Farms, stables and granaries can defer detail to a larger LOD; their absence from the tiny view must not imply absence from state. Port presence must follow geographic eligibility and construction state. Cosmetic boats do not assert military fleet strength.

## 15. Terrain and environment integration

Use three terrain families initially: temperate coastal, dry inland, rocky frontier. They share light and pigment treatment; ground colors may shift within the common value envelope. Only the contact strip travels with the city; expansive landscape belongs to the map/detail background.

Each authoring guide records ground anchor, road sockets, waterfront polyline, building footprint and occlusion masks. Road sockets meet visible gate thresholds. Docks extend from a specific shore into actual water. For Constantinople B, strategic geographic compression remains consistent with the real map's water direction; a production adapter may need a bespoke layout instead of rotating the whole sprite.

Use irregular, locally opaque contact textures with a narrow alpha falloff. No floating plinth, hard rectangular crop, large opaque parchment patch or universal circular shadow. Test against pale land, dark land and blue water. Front walls can hide the bottom of interior buildings; unrelated armies and UI remain legible above the city. Selection and attack overlays are independent of the painting. Collision and tap geometry do not have to equal the painted silhouette.

## 16. Gold illumination and ornament

Distinguish physical decoration from the atlas's illustrative finish. Physical gilding needs a dated reason at the depicted location. Atlas illumination is I, confined to a few composition accents and any separate detail-view frame.

Strategic B/D/E: gold-colored decorative pixels below 1% of opaque subject area; never a continuous gold outline. Detail C: target 1–2%, excluding an optional separate frame. Signature A: maximum 3% across the painting; optional border separately capped at 4% of canvas area. These limits are checked on an artist-maintained mask, not by unreliable color detection alone.

Use tiny leaf-like interruptions along selected illuminated architectural edges or a restrained framing motif. No full gold domes, gold seawater, gold streets, ornamental halos around every building, floating magical dust, or later heraldic double-headed eagles as default 715 emblems. Ornament must reinforce the focal route and remain quieter than it.

## 17. Mobile readability and level of detail

Measure in **CSS pixels at actual game zoom**, not just export resolution. Initial review widths: 48, 64 and 96 px; 32 px is a stress test for a dedicated simplified LOD. At 64 px the dome profile, landward wall/gate and coastal notch must separate without labels. Gates and landmark gaps should resolve to roughly 2 CSS px where needed. Repaint simplifications at each LOD; blind downsampling is insufficient.

For repeatable comparisons, these widths mean the full registered 3:2 authoring canvas displayed on screen; record the opaque subject's width separately. A capital occupying 76% of the guide is about 49 px wide inside a 64 px display. All tiers retain the same guide-to-screen scale, so the small tier stays visibly smaller. Runtime padding/crop offsets must preserve that scale rather than stretch or auto-fit each subject. Actual map placement may require recalibration, which must be recorded rather than silently enlarging the test.

Below 40 px use the approved three-mass city silhouette and strongest development cue; omit most awnings, people and joints. From 40–79 px preserve 3–5 dominant groups. At 80–128 px introduce secondary facility shapes. Above that, reveal the prepared larger strategic LOD or open the separate detail artwork. These are proposed bands, to calibrate against real node spacing.

Keep touch targets and labels independent. A 44 CSS px minimum hit area is a usability proposal, not permission to enlarge artwork into neighbors. RTL changes text and panel layout; it must never mirror historical geography. Grayscale checks ensure tier recognition does not depend on purple, gold or faction tint.

## 18. Asset production and consistency

Research card → geographic diagram → grayscale mass study → owner-approved style anchor → controlled concept → architectural paintover → layered master → hand-refined compact LODs → alpha/shadow checks → performance/owner gates. Full specifications are in the [workflow](04-production-workflow.md).

Keep a reference bundle for every generation: same camera diagram, palette strip, landmark elevation/mass drawing and approved style sample. Before a style sample exists, label it PENDING; do not invent an “approved reference.” Generation seeds or a repeated prompt do not guarantee geometry. Change one region at a time under a mask and redraw off-model sections by hand.

Scale production through 3 culture families × 4 base tiers, regional material variants and bounded upgrade slots. Famous capitals receive a dedicated landmark/precinct kit. Do not generate all combinations independently. Separate assets are painted onto one registered master and only then exported; an attractive contact sheet is not a production sprite sheet.

## 19. Technical feasibility

The intended runtime is Canvas 2D. Offline-generated/painted raster assets can be drawn and cached without reproducing their masonry procedurally each frame. Compose valid states on change, then draw the cached result. No new engine, shader pipeline or integration is authorized here.

Working images can be large; runtime assets cannot all remain large and decoded. Use alpha-capable WebP/PNG strategic exports, lazy-loaded detail images, visible-region loading and bounded decoded caches. Compressed bytes and decoded memory are different budgets. Proposed measurable limits and fallback behavior are specified in [04](04-production-workflow.md). No current performance claim is made.

The early approval experiment must show that the style works at normal phone scale before commissioning dozens of cities. If the lavish source collapses into noise, redesign the compact composition; buying more resolution does not solve that failure.

## 20. Anti-patterns and rejection conditions

- Plastic/toy miniatures, low-poly blocks, voxel/pixel-art cities, glossy mobile-game castles, photobashed collage or photographic buildings with a decorative frame pasted on.
- Mechanically repeated house grids; every tower equidistant; circular city layout used regardless of coastline or slope.
- Fantasy spires, Gothic keeps, Renaissance palaces, artillery bastions, Ottoman Constantinople, late rigged galleons, or monumental later Islamic decoration imported without dating.
- Flattened pseudo-miniature with no structural depth; equally, photographic realism that loses pigment and hand-painted edge decisions.
- Landmark distortion, disappearing windows/arches, implausible load paths, repeated inconsistent domes, and ornamental pseudo-writing.
- “More detailed” as the sole upgrade; higher tier created only by larger export or brighter gold; successful image enlarged during review to hide failure at normal zoom.
- Independently regenerated tiers whose gates, lights, coastline or existing walls move; town growth that removes prior upgrades.
- Opaque background disguised as transparency, white matte fringe, double shadows, assets floating above roads or docked on land.
- Claims that visual quality, human approval or mobile performance passed because files exist or a model rated its own output highly.

The new direction succeeds only when the image is recognizably authored, structurally convincing, historically bounded, and readable without narration. Apply the [quality gate](05-quality-gate.md); all image-level judgments remain pending until images are authorized and reviewed.
