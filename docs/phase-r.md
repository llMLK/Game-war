# Phase R — Umayyad-only campaign and legacy-save protection

Owner approved Phase F and authorized R only on 2026-10-11. G0/BattleV2/H/I/J remain outside scope. No merge or deployment is authorized.

## Verified baseline

- Clean working tree and approved F HEAD: `2deaa02de02b1e87321d01651ec725da19930ede`.
- New branch: `codex/phase-r-umayyad-only`, branched from that exact commit.
- Remote: `https://github.com/llMLK/Game-war.git`.
- F PR #1 remains open, unmerged, targeting `claude/ai-strategy-war-game-1dghz2`; R PR must target `codex/phase-f-undo-end-turn`.
- A–E branch: `a721b9dee0298f74fe49d906dec6c32e1a7bb261`; main: `d32fff038b2feb5bb00a8383d4c89b1284535ab8`.
- Official Pages still uses the A–E branch. Approved preview `gh-pages` remains `d791cbaad94cfcbfff455f7fbf1d9845b89472a1`, source F `2deaa02…`. Neither deployment is changed.
- Baseline test runs use an isolated temporary snapshot; exact results and dependency inventory are in `artifacts/phase-r/`.

All seven authoritative ZIP documents were extracted, unchanged, into the durable local directory:
`C:/Users/Abdul/.codex/visualizations/2026/09/25/01a0da6c-e6c5-7900-bee6-a032e6e35bb8/suyuf-v3.4-execution-package/`.
Read READ_ME_FIRST, handoff, complete R prompt, V3.4 §§1–4, V3 §§2–3, and relevant V3.3 save safety. Latest human authorization supersedes older F-only/wait wording and clarifies that both Pages paths share an origin.

## R1 — protect startup and saves before deleting data

Umayyad 715 is the only selectable or directly activatable campaign. The Chinese definitions remain in this first commit deliberately, pending R2 coverage migration and R3 removal.

`SaveSafety` checks scenario, title consistency, supported versions and essential structure before normalization. Missing older titles are derived from supported state. Unsupported/corrupt slots are displayed as unavailable, with JSON export; raw bytes are retained. Unexpected optional-field load errors roll back the active campaign without rewriting the source. Guards in new-game wrappers preserve rejection instead of continuing leader/economy initialization.

Before starting or autosaving over any unsupported/corrupt autosave, exact raw text is written to a separate `swords-kingdoms-legacy:v1:` backup. Both backup and recoverable index are read back and compared. A deterministic content key makes interrupted/repeated attempts idempotent, keeps distinct saves separate, and never overwrites a different existing backup. Verification failure blocks replacement/start. V1 original keys remain intact. Manual unsupported slots cannot be overwritten; deletion requires a separate explicit UI confirmation. The save dialog exports original slots and legacy backups without attempting to convert them.

Storage access stays behind `store`, including raw read/write helpers. Local preview tooling namespaces these helpers as well as get/set/delete. This tooling change is **not** a publication or update of the approved F preview.

R1 verification: `tests/phase-r-saves.cjs` (39 cases), `tests/phase-r-ui.cjs` (60 checks over desktop 1365×900, portrait 320×568/390×844, landscape 568×320/844×390), local `tests/phase-f-preview.cjs` storage-isolation/build test. All fixtures are synthetic; browser interaction is Playwright Edge emulation, not a physical phone or the owner's personal save.

## Owner acceptance gate (pending)

1. هل اشتغلت اللعبة من أول مرة على جوالك دون خطأ؟
2. هل أصبح سيناريو الأمويين هو الوحيد المتاح عند لعبة جديدة؟
3. هل استطعت استكمال حفظك الأموي القديم كما كان؟
4. هل ظهر تفسير واضح للحفظ الصيني القديم ولم يختفِ أو يُستبدل صامتًا؟ (إذا لا يوجد حفظ صيني، ضع «لا ينطبق» واختبره آليًا)
5. هل اختفت الصين من القوائم والخريطة والبطاقات دون أن تتضرر خصائص اللعبة الأساسية؟

Stop after R delivery until **«اعتمد R»**. R public/mobile preview awaits separate authorization; the approved F public build remains intact.

R1 actual result: 39/39 save cases, 60/60 browser checks and local preview isolation passed. The baseline archived snapshot recorded 27/28 suite passes; its preview test failed only because its workspace directory is itself under the temporary directory and the correct overwrite rejection text differs. The original failure is preserved, not counted as a pass. Current workspace preview isolation test passed.

### R1 corrective follow-up after independent QA

AGENT 2 supplied commit 07877163acffcc487953e6df7f58ce22d7339a76 with 45 frozen-fixture tests (F baseline 13 passed / 32 failed). R1 was already committed as be5342b, so no history was rewritten. Its missing-envelope-metadata policy was tightened: absent/corrupt title objects are rejected and backed up before replacement; missing display fields inside a title remain safely derived from validated Umayyad state. Independent B04 4/4 and R09 3/3 targeted checks and the 39/39 implementation tests passed. The complete unchanged independent suite subsequently passed 45/45. Original external QA files/worktree and all owner saves are untouched.

## R2 — preserve and migrate test coverage

Nine existing suites moved China-dependent behavior to the three supported player factions. No test group was deleted or disabled. Leader groups remain 29, camera 12, routes 10 and trade 12; 16 main economy cases still simulate 840 turns (18/920 including replacement controls). Friendship/rival/mentor fixtures are explicitly synthetic, confined to VMs. Political integration now runs six 24-round full AI/world/save samples instead of six 12-round samples. The unchanged full controlled political matrix passed in the post-removal R3 run.

Independent AGENT 2 test runner, both frozen synthetic fixtures and its original audit were copied unchanged from commit 07877163; no source worktree edits or unrelated imports. The same 45 cases now pass 45/45, improving all 32 F-baseline failures. Initial diagnostic R1 run logged 44/45; its missing-metadata rejection was corrected in a348360 and a clean full rerun passed. No cases were weakened/skipped. The independent suite is imported once and used across stages; implementation-specific backup/index/export tests complement it.

Root verification ran nine migrated/affected suites in an isolated snapshot: 9/9 passed, including map touch at eight sizes, Byzantine/Khazar phone maps, leader UI at seven sizes with 51 supported profiles, all campaign parity checks, economic simulation and local preview storage isolation. Original A–F artifacts and both deployments remain untouched. Detailed before/after mapping and assertion-call-site audit: artifacts/phase-r/coverage-inventory.md. Test relocation now accepts either correct root-output protection message while retaining the rejection assertion.

### Additional R1 identity correction found during final review

The inherited-property guard allowed direct requests with __proto__/constructor/toString to replace the active campaign; an explicit metadata player mismatch was also accepted. Seven focused negative tests reproduced five failures (2/7 passed). Canonical own-faction checks and metadata/player consistency now reject those inputs before migration; an eighth malformed-player-object startup case also passes. No supported campaign behavior or balance parameters changed. This follow-up was committed separately as 51fdfe6 rather than rewriting R1/R2 history. Only the identity guard hunk of campaign.js entered that commit; R3 removals were preserved for their own delivery.

### Complete coercion-safe startup boundary

The same negative-input review added six cases: three inherited difficulty names, malformed node-owner/army-faction objects, and non-string faction names. All six failed before the correction (the complete focused suite was 8/14), including two confirmed startup exceptions during storage inspection. Canonical difficulty checks and type/own-key checks now protect the essential lookup/display fields; all 14 focused cases passed after f13ea76. Valid dynamic faction IDs remain allowed when they are actual own save records, so hordes and migrant gameplay are preserved. No full schema redesign or balance change is involved.

## R3 — selective production removal

Removed the former Chinese scenario and its 20-city graph, 67 commander records, three exclusive unit definitions/aliases, campaign-specific faction/diplomacy/objective/world records, fictional Han name pool and generated Han/map-art branches. No separate China-only asset files existed. Shared assets, western settlement art, steppe/Caucasus cultures, generic units, combat, leadership, politics, economy and Umayyad migrations remain. Historical development reports and synthetic unsupported-save fixtures intentionally retain the removed scenario as evidence. The Turgesh off-map historical reference to "بلاد الصين" remains; it is not a playable Chinese faction, city or campaign.

`content-preservation.json` records identical before/after SHA256 `bf9316dcd09f00188b5a720cfc8cd50a7586fee23852809956ffa05bc2f5b8b3` for supported scenario/world/catalog/objectives/diplomacy, shared units, traits, flaws and economic/building formulas. The 66-city atlas and all 63 Umayyad catalog entries, including 20 legacy identities, are preserved exactly. No gameplay balance adjustment is included.

## Final execution evidence and limits

The complete post-removal batch recorded **32/33 suites passed**. Its single failure was `leader-preview` during Edge launch before the page or game assertions ran. The original failed log is retained. A subsequent **21/21** affected-suite retry passed, including leader UI (50 actual profiles, seven sizes, zero errors), original independent 45/45, campaign parity, save/load and mobile interaction. These are separate runs, not one invented 34/34 batch. The latest save-boundary correction passed its tagged **7/7** final run: unchanged independent QA 45/45, implementation saves 39/39, identity 14/14, R UI 60/60, content six groups, campaign parity five groups and local preview/storage isolation. Consolidated provenance is in `artifacts/phase-r/acceptance-results.json`. All 34 distinct standalone suites have passing evidence; there are no unresolved automated failures.

Delivery history preserves the required stages: R1 `be5342b11acc89e75260301d083aa15597af3a7d`, R2 `2de898dbbcc42376df6b274358d23fa8446eb378`, followed by the separate R3 removal/evidence commit. Corrective R1 follow-ups are `a348360c1063622920675480c89055fa57bf3abd`, `51fdfe6211a01cc59fd671c8147a990833607929`, and `f13ea76fbce0b46598434d556295ea912fb49a0f`. No commit was rewritten. The full changed-file inventory (including synthetic screenshots/logs) is `artifacts/phase-r/changed-files.txt`.

- Existing logic: 179 groups across routes/camera/leaders/battles/economy/trade/politics/espionage/allied coordination/Undo/campaign parity.
- Balance regressions: 5,824 battle simulations; 16 main economy scenarios / 840 turns (18 / 920 including replacement controls); 192 controlled political simulations / 6,912 turns, 60 espionage turns, six integrated AI/world/save samples of 24 rounds each (144 rounds).
- Phase F: 127/127 representative mobile touch attempts across six phone sizes, Undo dismissal through 25 refreshes per size, no duplicate turn processing, lifecycle/error recovery and real Umayyad round/save checks.
- R browser checks: 60/60 across five desktop/portrait/landscape sizes, exact-byte JSON download, failed backup blocks startup, manual slot preservation, new supported campaign, 44px End Turn target, save/load, RTL and no missing assets/page errors. Map interaction covers eight sizes; battle/economy/leader views seven sizes each; political and espionage UI suites also passed.
- Latest malformed-identity/startup tests: 14/14; implementation save suite: 39/39; China-content/preservation checks: six groups. No skipped or weakened independent QA cases.

Each snapshot records its pre-commit `sourceCommit` and all runtime Git blob IDs. R3 was tested as working-tree content; its exact manifest is compared with the final committed runtime. Earlier A–F evidence and independent QA worktrees were not edited. All saves used in tests are synthetic in Node VMs or new browser contexts; no owner's real saves were read or modified.

Visual inspection covered portrait legacy warnings and leader profile scrolling, landscape backup export and close controls, supported campaign map, and retained battle narrative. Screenshots are linked from the final acceptance record. Physical owner phone/Safari, real owner's old save, actual device quota/power-loss and concurrent-tab races were not exercised. Storage failures and interrupted writes were injected deterministically; restoring exported Chinese JSON in an older deployed game was not tested, but downloaded bytes match the source exactly.

Offline atlas regeneration tools were deliberately not executed; existing geometry inspection passed. The public-preview test is excluded from R runtime checks because R publication is not authorized. Read-only GitHub/Pages verification confirms F remains published. No PR is merged, no main/A–E/deployment branch is changed, and the owner's R acceptance remains pending.
