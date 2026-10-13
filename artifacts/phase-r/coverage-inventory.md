# Phase R coverage inventory (before runtime removal)

Baseline: `2deaa02de02b1e87321d01651ec725da19930ede` (approved Phase F). Baseline commands run in an immutable `git archive` snapshot with copied Git metadata; only the temporary test/server localhost URL changes from port 8000 to 8107. Default test outputs remain in the temporary tree, preserving every previously committed Phase F artifact. Results and actual exit statuses are recorded in `baseline-tests.json`.

No tests or production files have been edited during this inventory. A `PASS` output-line count is diagnostic, not an assertion count: suites print final summary lines and simulation/UI suites may use different reporting styles.

## China-dependent coverage to transfer in R2

| Suite | Existing coverage | Proposed replacement (retain behavioral assertions) |
| --- | --- | --- |
| `leaders.cjs` | 29 groups; six campaign starts, execution/defection/death friend consequences, historical late-hire rivalry, mentorship and peer honor, 24-round integration in both campaigns | Umayyad, Byzantine and Khazar starts; explicitly synthetic relationship fixtures among supported leaders for shared friend/rival/mentor behavior; retain every fate, idempotency, trust, loyalty and save assertion. Replace the two integration samples with supported factions and retain their 24-turn duration. Starting western relationships are empty, so do not invent production historical ties merely to satisfy tests. |
| `camera.cjs` | 12 groups; five transform/focus/clamp/zoom/resize groups iterate both scenarios; one accepts a 20-city Chinese legacy save | Exercise camera groups for all three supported Umayyad factions; replace Chinese loading acceptance with rejection plus exact raw-slot preservation and unchanged current Umayyad state; retain all western atlas/caravan/ownership migration groups. Chinese rejection is the new required behavior, not a removed compatibility assertion. |
| `economy-balance.cjs` | 16 scenario cases, 840 turns, 120 actual endRound turns; six early factions; Chinese fixtures for mid-realm, conquest, payroll and standing armies | Keep six opening samples using the three supported factions with two stated seeds or difficulty contexts. Move controlled mid/payroll/army fixtures to supported western territories, explicitly developing five/ten cities where needed so financial stress retains its size rather than inheriting the much larger Umayyad start. Preserve 16 cases and 840 turns, all ledger/population/replacement invariants, and all deliberate deficit/hoarding findings. No balance parameter changes. |
| `economy-trade.cjs` | 12 groups; the legacy active-route migration group covers both scenarios | Run supported Umayyad and Byzantine ownership contexts while preserving route migration, guards, disruption, no duplicate trade collection and save assertions. Chinese blocked-load coverage belongs in the dedicated save-protection suite. |
| `map-routes.cjs` | 10 groups; two generic groups enumerate actual `SCENARIOS`; fallback starter uses Shu | Enumerate supported scenario(s), assert the Umayyad campaign is present and is the only supported new-game scenario, and keep all graph/route/embarkation assertions. Remove the now-invalid Shu starter branch without removing graph checks. |
| `leader-preview.cjs` | Seven viewport review loop, initial profile scan for western/Chinese leaders, Chinese culture/profile/loss memorial checks, modal keyboard trapping | Scan all supported faction profiles at phone width; use supported profiles and a synthetic supported loss for memorial/keyboard checks. Preserve source-free copy, clipping, RTL, touch and focus assertions. China culture presentation is intentionally removed; its reusable profile behavior is transferred. |
| `map-interactions.cjs` | Eight viewport pointer/touch/army/alert checks plus a 20-node Chinese renderer smoke | Preserve all eight viewports and interactions; replace final Chinese renderer smoke with supported Byzantine or Khazar campaign at phone width and assert 66-node world and army/map availability. |
| `political-sim.cjs` | 192 controlled campaigns / 6,912 turns; 60 espionage turns; six integrated samples / 72 rounds across two campaigns | Keep all controlled cases unchanged; replace three China integrations with supported Byzantine/Khazar context or second supported start seed set. Keep six samples, 12 rounds per sample and all live military/AI/save assertions. |

## Retained unchanged behavior

`battles.cjs` (31 groups), `economy.cjs` (18), `politics.cjs` (23), `political-spy.cjs` (15), and `political-allies.cjs` (12) already use Umayyad or campaign-independent fixtures. Battle balance, battle mobile/save review, economy mobile/save review, leader actions, political slider/confirm/mobile review, espionage UI, and all Phase F Undo/End Turn regressions remain required.

The `phase-f-regression.cjs` wrapper duplicates eight individually executed suites (150 groups), so its execution adds no independent coverage. The published-preview checker is excluded from R runtime validation because the approved F publication must remain unchanged; it cannot validate an unpublished R HEAD. Generators (`build-coast`, `build-road-drawings`), geometry inspection, server and fixture modules are not standalone acceptance suites and must not be executed as mutations during a compatibility/removal phase.

## Additional required R coverage

Dedicated save protection must cover supported old saves and current save roundtrip; missing/corrupt/incomplete/unsupported metadata; Chinese scenario and contradictory metadata; manual raw-slot preservation; export; verified separate auto backup; quota, denied, interrupted/readback corruption, repeat-safe behavior, and no normalizer call or current-state change on rejection. Chinese fixtures must be synthetic and must not call the newly forbidden Chinese `Game.newGame` in the final runtime.

Before/after reports must distinguish suite groups, nested cases, viewport samples, simulations and turns rather than combining unlike units. All runs here use seeded/synthetic state and browser emulation; no real personal save or physical phone is claimed.

## Completed baseline result and context-specific failure

All 28 standalone suites ran: 27 exited successfully, one failed. The eight A–E suites retained 150 groups; camera adds 12, Phase F Undo 12 and campaign parity 5, giving 179 logic groups. Successful statistical runs covered 5,824 battle simulations, 16 economic scenarios / 840 turns / 120 actual endRound turns, and 192 political controlled campaigns / 6,912 turns, 60 espionage turns and 72 integrated political rounds. The initial leader profile scan covered 40 profiles.

The original `phase-f-preview.cjs` failure is retained in `baseline-tests.json` and archived stdout/stderr. It checks that using the repository root as output throws text matching `/fresh directory/`. In this temporary snapshot, the repository root is also beneath the system temporary directory, so that path passes the allowed-location check and instead reaches the existing-directory guard: `Output already exists; refusing to overwrite`. This is a mismatch in expected protective error wording caused by test relocation. Overwrite protection held and the test stopped before its subsequent preview/storage browser assertions. Do not classify the entire preview suite as passed, and do not infer a runtime/gameplay/storage-isolation failure from this result. No baseline test assertion was changed to hide it.

## R2 implementation and verified comparison

R1 was committed as `be5342b`, with metadata QA follow-up `a348360`, before any of these existing tests changed. No test group was deleted. Nine files changed: the eight China-dependent suites above and `phase-f-campaign.cjs`. The latter now reads the historical `a721b9d:index.html` before loading historical scripts; the current index legitimately includes the R save guard, which never existed at the historical revision. All five original campaign parity assertions remain.

| Coverage | Before F | R2 | Status before R3 |
| --- | --- | --- | --- |
| Leader groups | 29 | 29 | 29/29 passed |
| Starting leader cases | 6 campaigns/factions | 3 supported factions × normal/hard = 6 | Passed |
| Leader actual endRound/worldTick samples | 2 × 24 = 48 rounds | 3 × 24 = 72 rounds | Passed |
| Camera/migration groups | 12 | 12 | 12/12 passed |
| Camera geography contexts | Western and Chinese | Umayyad/Byzantine/Khazar on supported 66-city atlas | Passed |
| Chinese legacy loading | Accept 20-city campaign | Reject before normalization; preserve exact manual raw bytes and entire current state | Passed; required compatibility-policy change |
| Trade groups | 12 | 12 | 12/12 passed |
| Route groups | 10 | 10 | 10/10 passed |
| Historical A–E parity groups | 5 | 5 | 5/5 passed |
| Economic main scenarios/turns | 16 / 840; 120 actual endRound turns | 16 / 840; 120 actual endRound turns | Passed |
| Economic executed totals, including replacement controls | 18 / 920; 200 actual endRound turns | 18 / 920; 200 actual endRound turns | Passed |
| Early economy cases | 6 starting factions | 3 supported factions × seeds 42/43 = 6 | Passed |
| Controlled economic sizes | Five/ten-city Chinese fixtures | Exactly five/ten-city Byzantine fixtures with surplus fixture ownership released | Passed; assert stated city count |
| Map pointer/touch viewport cases | 8 + Chinese phone renderer | Same 8 + Byzantine and Khazar phone renderer | Execution deferred to full post-R3 runner |
| Leader mobile/profile viewport cases | 7 + profile scan + Chinese profile/memorial | Same 7 + three supported faction profile scans + Byzantine profile/memorial | Execution deferred to full post-R3 runner |
| Political controlled matrix | 192 campaigns / 6,912 turns | Unchanged | Execution deferred to full post-R3 runner |
| Espionage targeted simulations | 60 turns | Unchanged | Execution deferred to full post-R3 runner |
| Political integrated gameplay | 6 samples × 12 = 72 actual rounds | 3 factions × 2 samples × 24 = 144 actual AI/endRound/worldTick/save rounds | Execution deferred to full post-R3 runner; exceeds 20 turns per sample |

Leader capture/execution/defection/direct-death/peer-honor tests use labeled synthetic friendships between existing Umayyad commanders. The late-hire rivalry fixture injects catalog rivals only inside its isolated VM, and the mentoring fixture models earned prestige at the existing threshold. Production relationships, biographies, parameters and balance are untouched. The original trust, rivalry, memorial, no-replacement, repeated-event and mentorship assertions remain.

Static `assert.*` call-site counts are a secondary audit, not executed-assertion totals: leaders 159→160, camera 34→37, economy balance 12→14, trade 54→54, routes 32→33, map interactions 13→14, leader preview 23→23, political simulation 9→9, historical campaign parity 8→8. No transferred suite loses assertion call sites. Actual group/case results above, rather than these static counts, establish execution coverage.

The six migrated pre-R3 suites all passed in an isolated R1 archive containing the edited tests; evidence is `r2-migrated-tests.json`, `r2-logs/`, and `r2-economy-balance.json`. The 58-city late-economy control values remain identical to baseline (closing treasuries 162,011 / 294,961 / 435,477 for the three late controls); relocated small-realm results are explicitly different fixtures, not a production rebalance. No preview was published or changed.

## Post-R3 execution (supersedes the deferred statuses above)

Map interaction passed all eight sizes plus Byzantine/Khazar phone contexts. Leader UI passed seven sizes and 50 actual supported profiles in the successful retry; the original full-batch attempt failed at Edge launch and its log is retained. The controlled political matrix passed 192 campaigns / 6,912 turns, espionage 60 turns, and six integrated samples / 144 actual AI/world/save rounds. All pre-existing logic groups and economic/battle balance invariants passed after selective content removal.

The primary batch was 32/33, its affected retry 21/21. Across recorded runs all 34 distinct standalone suites have passing evidence; this is not a claim of one full 34/34 execution. Final save-boundary revalidation and per-suite provenance are recorded separately in `acceptance-results.json`. Original AGENT 2 runner and both fixtures remain byte-identical to commit 07877163; its baseline was 13/45 and current post-removal full runs passed 45/45. Latest R-specific identity tests have 14 cases, separately from those 45.
