# Phase C: battles and war command

Completed on the current working tree, 2026-09-29. Existing Phase A/B changes were preserved. No Phase D work, reset, checkout, revert or commit was performed.

## Systems and design decisions

- **Preparation:** battles pause before their first tick. Orders commit once per phase and interruptions resolve before advancing. Formation previews use a separate deterministic random stream. Manual and Quick Resolve use the same simulator, decisions, casualties, wounds and fates.
- **Commands:** Arabic cards explain costs, effects, requirements, risks and counters. Duplicate orders, conflicting postures, repeat event choices and ammunition refill exploits are blocked. Reserve size, sector and timing are player decisions; fresh reserves blend fatigue with the front they reinforce.
- **Persistent condition:** casualties, fatigue, morale, cohesion, supply, ammunition, command strain and battles this turn carry forward. Marches consume condition; rest and safe military supply determine recovery. Garrisons retain fatigue and ammunition, including under siege. Spears counter charges; constrained terrain reduces mounted combat. Guards are capped at 12% of soldiers. Commanders affect execution, command points and morale without replacing numbers and troop quality.
- **Retreat/pursuit:** organized withdrawal tests execution and reduces pursuit losses. Emergency withdrawal needs no command point but causes disorder, morale loss and heavier pursuit. AI can use it at zero command points. No-pursuit orders prevent pursuit casualties; hard pursuit risks a reserve trap. Blocked campaign retreats lead to capture rather than teleportation.
- **Sieges:** walls, local breaches, ladders, ram, tower, catapults, defender exhaustion/starvation, defense in depth and siege specialists matter. Equipment can burn. Waves require eight supplies. An assault without equipment is postponed rather than logged as a fictitious defeat. Relief can leave part of the besieging army holding the siege; held troops return while combat condition costs persist.
- **AI:** decisions use commander ability/personality, terrain, composition, approximate enemy strength, own morale/fatigue/ammunition, phase and reserves. Hidden plans/supply remain unknown until scouted. Campaign leader personality is correctly passed to the simulator.
- **Reports/narrative:** initial factors, orders, casualties, readiness, final commander fates and actual turning points explain the result. Final header/sector counts include routed survivors and match the casualty report; broken sectors are labeled as retreating. The new library has **43 fact predicates and 129 distinct Arabic variants**. Narrative does not consume combat randomness; results/fates are cached.
- **UI:** scoped battle CSS, Arabic RTL cards, an illustrated command table, readable sector totals, scrollable details/logs and persistent primary controls. Portrait phones show a compact overview with larger totals below it. Short landscape views avoid stage/notification overlap.

Final testing found and fixed three counter defects: uncovered skirmishers were excluded from melee; failed evasion still received a second defensive discount; attrition always took priority over an enemy rapid approach. Skirmishers now evade or fight exposed, shooting bonuses require a skirmishing stance, and assault shortens the approach from either side. Specialist plans also require suitable troops/ammunition.

## Balance results

**5,824 simulations:** 21 fixtures × 160 seeds, 160 three-battle sequences, and 31 eligible plan/matchup combinations × 64 seeds. Full measurements: `artifacts/battles/balance.json`.

These are reproducible fixture results, not universal win probabilities. Counts below exclude commander guards; casualty percentages include participating guards. AI reacts unless stated otherwise. The fixed-plan terrain comparison isolates terrain more closely than the scenario using a different commander and experience.

| Comparison | Result |
|---|---|
| 400 average vs 190 three-star tactician, open ground | Smaller force wins **14.4%** |
| 400 average vs 190 experienced mountain specialists defending hills | Smaller force wins **42.5%** |
| 320 vs 260, same balanced/defensive initial plans | Defender wins **6.3%** on plains, **16.3%** on hills |
| 400 severely exhausted/disorganized vs 190 fresh | Smaller force wins **96.9%**, versus **0.6%** against fresh 400 |
| 180 cavalry vs 200 swords/archers | Cavalry wins **100%** on plains, **81.9%** in forest |
| Same cavalry vs 240 spearmen | Cavalry wins **25.6%** |
| Three-star leader with 240 militia vs average leader with 250 swordsmen | Better-equipped army wins **100%** |
| Equal 190-troop armies; attacker one-star, then three-star tactician; defender two-star | Attacker wins **31.9%**, then **64.4%** |
| Matched field force versus level-two fortification | Defender wins **0%**, then **83.1%** |
| Fresh garrison behind wall levels one and three | Defender wins **40.6%** and **100%** |
| Level-two walls, fresh versus starved/exhausted garrison | Defender wins **83.1%** versus **0%** |
| Ladders only versus ram/tower/catapults plus ladders | Any breach in **1.3%** versus **81.9%** |
| Same-rank siege specialist, full equipment, reacting AI | Breach rate rises from **81.9%** to **97.5%** |
| Specialist control with same initial plans and tactical card orders disabled | Attacker wins **32.5%** without specialty, **49.4%** with it; losses fall from **35.3%** to **34.1%** |

The siege specialist does not guarantee victory: with reacting tactical orders, attacker wins were 16.9% without the specialty and 13.7% with it, despite more breaches. Opening a breach can trigger defense in depth. The control disables card orders but retains the same contextual-event policy; it does not claim every event decision is identical.

No plan was best in every eligible matchup (at least three eligible cases required). Cavalry versus exposed archers favored flanking (98.4%) over attrition (92.2%); mixed troops versus spears favored attrition (98.4%). A ranged army using attrition against rapid cavalry assault won 32.8%. Invalid plans were excluded rather than forced into unsuitable armies.

### Three consecutive battles without recovery

The same 190 experienced hill defenders face fresh 400-troop forces. Actual surviving regiments, fates and condition carry forward. This stress test forces another encounter after defeat; the real campaign may instead retreat or capture the army. Values are averages on entry, and seeds differ slightly from the standalone fixture.

| Fight | Soldiers | Fatigue | Morale | Cohesion | Supply | Ammo | Strain | Readiness | Wins |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 190.0 | 0.0 | 72.0 | 100.0 | 100.0 | 100.0 | 0.0 | 99.0 | 41.9% |
| 2 | 104.8 | 48.6 | 43.8 | 49.9 | 75.8 | 2.6 | 25.9 | 53.5 | 0% |
| 3 | 54.3 | 69.9 | 6.7 | 5.6 | 56.3 | 0.0 | 49.4 | 24.0 | 0% |

## Verification

- **31 battle logic groups passed:** preparation/phase boundaries; once-only orders/events; exact manual/quick parity over 40 seeds; preview stability; finite ammunition; bounded guards; reserve fatigue; 100-seed withdrawal comparison; persistent readiness; cached results; imperfect AI observations; siege equipment; save migration; idempotent application and casualty baseline; march/rest; narrative evidence; split/merge condition; relief commitment; postponed assaults; blocked retreats; no-pursuit; pursuit traps; zero-point AI retreat; wave supplies; campaign personality transfer; contextual AI decisions; factual commander reports; skirmisher melee; assault/attrition timing.
- **5,824 balance simulations passed** all directional invariants, including the six requested comparisons and additional siege/tactic checks.
- **29/29 Phase B regressions passed**, including recruitment scarcity, historical starts, relationships, capture, saved randomness and campaign/world-tick integration.
- **34 HTML-referenced scripts passed syntax checking.** `git diff --check` passed.
- **10/10 route/connectivity tests passed earlier during Phase C.** Final combat-only changes did not require repeating the route test.
- Browser click/touch checks: **1440×900, 1024×768, 390×844, 360×740, 320×568, 844×390, 568×320**. Each covers intelligence, plan, formation, reserve selection, paused preparation, card selection/issue, execution, report, story, factors, log and siege Quick Resolve. Portrait tests also cover withdrawal confirmation and a morale interruption. Bounds, overflow, RTL, accessible footers and minimum 44 CSS-pixel buttons passed.
- A real browser assault was applied **and finished** before saving. Two full page reloads preserved fatigue, morale, cohesion, ammunition, supply, strain, battle count, surviving regiments, garrison condition and leader relationships exactly. This respects normal end-of-encounter removal of shattered units below five soldiers.
- Final screenshots were visually inspected on desktop, smallest portrait, ordinary portrait and both landscape sizes, including command details, reports, siege, story and factors. Run output: `artifacts/battles/test-results.json` and `visual-verification.json`.

Repeatable commands:

```text
node tests/battles.cjs
node tests/battle-balance.cjs
node tests/leaders.cjs
node tests/battle-preview.cjs
```

Browser preview expects the existing static server at `http://127.0.0.1:8000`.

## Known limitations

- Saves remain campaign saves between encounters. **Mid-battle save/resume is unsupported.** Loading an intentionally older slot still rewinds the campaign; no Ironman/anti-rewind mode was added.
- Visual checks use Chromium/Edge viewport and touch emulation, not physical Android/iOS devices. Small-phone maps intentionally use a compact overview; detailed controls remain in the scrollable panel.
- Finite fixtures do not enumerate every composition or campaign state. Very strong walls and severe exhaustion intentionally produce extreme results. No failing checks or known blocking Phase C issues remain.

## Phase C changed files

This identifies battle work; other dirty Phase A/B files are preserved and are not relabeled as Phase C changes.

| File | Purpose |
|---|---|
| `index.html` | Battle CSS/module registration |
| `battles.css` | RTL cards and responsive battle layout |
| `js/warsim.js` | Simulator, preparation, formations, combat, AI and retreats |
| `js/battlecmd.js` | Commands, condition costs and causal reports |
| `js/battle-scene.js` | Phase/reserve controls, responsive battle and report UI |
| `js/battle-narrative.js` | Fact-bound story library and factor explanations |
| `js/readiness.js` | Army/garrison condition, supply/rest, migration and leader integration |
| `js/campaign.js` | Result application, initial counts, guard estimates and safe retreat |
| `js/campaign-ai.js` | Cancelled-march restoration and post-encounter saves |
| `js/commanders.js` | Prebattle casualty baseline for leader consequences |
| `js/panels.js` | Postponed equipment-less assault message |
| `tests/battle-fixtures.cjs` | Deterministic fixtures |
| `tests/battles.cjs` | Logic and persistence tests |
| `tests/battle-balance.cjs` | Seeded balance and tactic comparisons |
| `tests/battle-preview.cjs` | Touch, visual and full-reload verification |
| `docs/battle-progress.md`, `docs/phase-c.md` | Completion status and this report |
| `artifacts/battles/balance.json` | Final simulation measurements |
| `artifacts/battles/test-results.json` | Logic/regression/syntax output |
| `artifacts/battles/visual-verification.json` | Viewport and browser persistence results |
| `artifacts/battles/*.png` described below | Final screenshot evidence |

Complete final screenshot set: prefixes `intel`, `plans`, `formation`, `preparation`, `command`, `report`, `story`, `factors`, `siege-report`, each at suffixes `1440x900`, `1024x768`, `390x844`, `360x740`, `320x568`, `844x390`, `568x320`; plus `withdrawal-390x844.png` and `turning-point-390x844.png`. Naming is `<prefix>-<suffix>.png`: **65 screenshots**. Older scratch previews are not final evidence.

Representative previews:

- [Desktop preparation](../artifacts/battles/preparation-1440x900.png)
- [Small phone command](../artifacts/battles/command-320x568.png)
- [Portrait report](../artifacts/battles/report-390x844.png)
- [Short landscape report](../artifacts/battles/report-568x320.png)
- [Desktop siege report](../artifacts/battles/siege-report-1440x900.png)
- [Contextual interruption](../artifacts/battles/turning-point-390x844.png)

Phase C ends here. Phase D requires a new instruction.
