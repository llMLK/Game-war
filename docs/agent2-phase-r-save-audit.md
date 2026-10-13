# Agent 2 — Independent Phase R save-safety audit

Date: 2026-10-11 (owner's Asia/Riyadh date). This is independent QA of Phase F, not implementation or acceptance of Phase R.

## Isolation and authority

- Worktree: `C:\Users\Abdul\.codex\worktrees\88ed\Game-war`.
- Branch: `codex/agent2-phase-r-save-qa`.
- Starting HEAD / approved Phase F: `2deaa02de02b1e87321d01651ec725da19930ede`; ancestry verified; starting worktree clean and detached before creating this branch.
- Starting tree: `5e139484fb940efd29489cf29f61f7d8325b6d3c`.
- Local `main` reference: `89968ea0146f925ec0bed70e263d73882d3e3778`; local comparison with F shows 454 files changed, 163934 insertions and 1 deletion. This is existing history, not QA changes, and says nothing about the currently deployed SHA.
- The other checkout, `C:\Users\Abdul\Game-war`, was not modified. Only shared Git metadata needed to create this worktree's branch and commit is written. No other branch, deployment, browser storage, push, PR, merge or cherry-pick is involved.
- New files only: this audit, `tests/agent2-phase-r-save-safety.cjs`, and the two `tests/agent2-phase-r-*-fixture.json` synthetic fixtures. Production JS/HTML/CSS and existing tests remain unchanged.

Execution package found at `C:\Users\Abdul\Downloads\Suyuf_AlMamalik_V3_4_Complete_Execution_Package.zip` (SHA256 `AD16C8545B3C11B0404E9A241CC0E16EE751FA66A5E676F578C55751B1D48321`). Read directly without modifying/extracting the package:

- Complete Phase R implementation prompt.
- China Removal Annex V3.4, especially §§1–4.
- Execution Handoff V3.4, including save compatibility and preview requirements.
- Master V3 §§2–3; relevant V3.3 save/safety passages; package read-me.

The owner's current assignment authorizes QA after approved F and overrides the package's earlier “F only now” status. It does not authorize production implementation, publishing, or beginning G0.

## Method and reproducibility

Node v24.19.0, Windows, no dependencies required. The new runner independently discovers production scripts from the target's `index.html`, evaluates them in a fresh Node VM per case, and supplies a private in-memory implementation of `localStorage`. It does not import the existing test harness when run, open a browser, contact a website, or use real saves. Fault injection models rejected reads, quota exceptions, dropped backup writes, and a restart with preserved storage. Every destructive storage operation is recorded with its preceding snapshot, so a backup made *after* overwrite cannot pass.

The JSON fixtures were generated once using Phase F's existing Node harness with fixed seeds 211 (Umayyad) and 212 (Chinese). They are committed, frozen synthetic input, not regenerated from the branch under test. Umayyad includes a catalog `legacy` general, cities, armies, commanders, gold and food. Turn/resource sentinels were assigned intentionally; this is not evidence of simulating 17/23 turns. The Chinese fixture is used only as historical unsupported input; the runner never requires a Chinese catalog to construct it. The stale direct-start test intentionally calls the forbidden entry point and expects refusal.

The v1 fixture is synthesized from the frozen state into the old pool/general representation. v2/v3 cases downgrade the version and omit optional fields; these are synthetic compatibility probes, **not an exhaustive collection of genuine historical save formats**.

Run from this branch:

```powershell
node tests/agent2-phase-r-save-safety.cjs
node tests/agent2-phase-r-save-safety.cjs --group baseline
node tests/agent2-phase-r-save-safety.cjs --group phase-r
node tests/agent2-phase-r-save-safety.cjs --filter R05
```

Read-only reuse against Agent 1's future checkout, without copying or changing its files:

```powershell
node C:\Users\Abdul\.codex\worktrees\88ed\Game-war\tests\agent2-phase-r-save-safety.cjs --root C:\path\to\agent1-worktree
```

Use the actual checkout path. `--root` selects production inputs only; fixtures stay beside this independent runner. Any failure returns exit code 1, including failures expected on F. Group names express the baseline classification, not an exemption from assertions. No xfail/TODO conversion and no skipped cases. If future APIs or save envelopes change, review the adapter explicitly; do not remove cases to make the counts green.

## Executed results

Full run: **45 executed, 13 PASS, 32 FAIL, 0 skipped; exit code 1** on Phase F. All 13 baseline cases passed; all 32 Phase R cases failed. These results do not assess Agent 1's unreviewed future implementation.

| Case | Instances | F result | Property checked |
|---|---:|---|---|
| B01 | 1 | PASS | Frozen F Umayyad round trip preserves city IDs/owners/population/buildings/garrisons, armies/regiments, commander IDs/names/records and resources |
| B02 | 1 | PASS | Synthetic v1 migration retains cities/resources/regiments/general names and original v1 bytes |
| B03 | 1 | PASS | Repeated normalization/load preserves the selected core state |
| B09 | 2 | PASS | Synthetic v2/v3 Umayyad compatibility |
| B04 | 4 | PASS | Missing meta, unknown metadata scenario, and discontinued `rec`/`cid` reject without normalization/storage writes |
| B05 | 1 | PASS | Malformed JSON load alone preserves its bytes |
| B06 | 1 | PASS | A directly failed save returns false and preserves previous storage |
| B07 | 1 | PASS | New Umayyad game does not touch any of the three Chinese manual slots, including intermediate writes |
| B08 | 1 | PASS | Four empty/corrupt v2 menu and saves-panel render probes, with no storage writes |
| R01 | 4 | FAIL | Chinese v2 auto/manual slots must refuse load before normalization |
| R02 | 1 | FAIL | Chinese v1 must refuse before migration/normalization |
| R03 | 7 | FAIL | State/meta disagreement, missing/unknown state scenario, future/string version, missing nodes/factions |
| R04 | 2 | FAIL | Chinese auto preservation before new game and direct save |
| R05 | 3 | FAIL | Failed backup quota, dropped write, and source-read denial must block overwrite |
| R06 | 1 | FAIL | Repeated attempts/restart preserve original without duplicate backups |
| R07 | 1 | FAIL | Interruption before auto replacement and retry remain recoverable |
| R08 | 1 | FAIL | A second distinct Chinese save cannot destroy an earlier legacy backup |
| R09 | 3 | FAIL | Malformed, missing-metadata and future-version auto cannot be erased by new game |
| R10 | 1 | FAIL | Corrupt v2 auto cannot silently fall back to v1 and then overwrite v2 |
| R11 | 2 | FAIL | Unknown scenario and absent factions in v1 must not crash menus |
| R12 | 1 | FAIL | Chinese save must not be offered for resume; explain unsupported status and preservation/export |
| R13 | 1 | FAIL | New-game UI must default to Umayyad only |
| R14 | 1 | FAIL | Stale/direct Chinese start cannot replace current campaign/auto |
| R15 | 1 | FAIL | Manual-save UI must not claim success after quota failure |
| R16 | 1 | FAIL | A thrown normalization step must leave the previously active state intact |
| R17 | 1 | FAIL | Missing display name/turn must not render `undefined` or `NaN` |

Counts are top-level test cases; some cases contain multiple assertions or table-driven probes. `node --check` also passed. Production/existing-harness diff against HEAD was empty. Whitespace and staged-file checks are part of the final commit verification.

## Confirmed findings and reproducible scenarios

Line references below refer to the Phase F baseline, not future R code.

### A2-01 — High: autosave overwritten with no backup

`js/campaign.js:108` `save()`, `:38` `newGame()`, `:94` initial save; `js/leader-system.js:340` wraps newGame and saves again. There is no check of the old slot before `store.set`.

Seed AUTO with the frozen Chinese JSON, then call `Game.newGame('umayyad','umayyad','normal')` or assign an active Umayyad state and call `Game.save()`. The old auto is replaced and no recoverable copy exists. R04 reproduces the ordering, not just the final storage value. R05 proves that denying backup writes/read access does not protect auto because baseline does not attempt a backup. New-game callers and wrappers currently continue regardless of save failure.

**Agent 1:** centralize protection across every writer; preserve raw source in a distinct legacy location, verify read-back before replacement, or block for a conscious export flow. Do not let either newGame wrapper or a later action bypass the protection. Preserve old raw data even when parsing fails. A caught quota exception is not backup success.

### A2-02 — High: metadata-only validation admits wrong/unsupported state

`js/campaign.js:124` `saveProblem()` checks only `meta.scenario` existence and two obsolete shape markers. It does not reconcile `S.scenario`, validate required collections, or reject future/malformed schema versions. `load():135` assigns `Game.S` before normalization; `normalizeState():177` forces v5 and `:198` filters nodes by the selected scenario.

R03 reproduces acceptance of Chinese state under Umayyad metadata; missing/unknown state scenario crashes at `sc.factions`; missing nodes crashes at `.find`. Future `S.v=999` and string versions are accepted. Separately reproduced with synthetic v999 plus a `qa-future-city` node: `Game.load()` returned a state, version became 5, the extra city disappeared, and `Game.save()` persisted v5. This is confirmed destructive behavior on synthetic data, not merely a theoretical concern. No real owner's data was involved.

**Agent 1:** validate scenario identity, structure, and supported version before all migration/normalization paths. Never translate Chinese identity into Umayyad. Preserve and explain unsupported states. Node filtering needs an explicit compatible migration boundary; it must not be applied to future or unidentified state.

### A2-03 — High: v1 fallback bypasses compatibility guards and can crash startup

`js/campaign.js:114–120` `readSlot()` returns v1 without calling `saveProblem()`, dereferences `old.factions[old.player]`, and `hasSave():141` considers that result loadable. `js/main.js:67` and `js/panels.js:1230` dereference scenario metadata directly.

Put synthetic v1 with `scenario='missing-qa'` under V1, then show the menu: exception reading `.name`. Remove `factions`: exception reading the player key even earlier. Chinese v1 enters migration instead of unsupported-save handling (R02). Corrupt v2 plus valid v1 loads the older fallback, and a following save replaces the corrupt raw v2 (R10).

**Agent 1:** apply the same guard and status model to every old format and fallback. Distinguish absent storage from unreadable/corrupt data; preserve both old and new keys. Do not interpret fallback success as permission to discard the failed source.

### A2-04 — High: failed migration replaces the active in-memory campaign

`js/campaign.js:135` `load()` and `:150` `migrateV1()` replace `this.S` before completion. R16 injects a normalization exception and demonstrates that the previous active state is no longer installed, although the original slot remains byte-identical. Subsequent actions can save a partial state. R03 independently produces real malformed-input exceptions without injection.

**Agent 1:** stage validation/migration, retain the prior active state and restore it on failure. Audit the chained wrappers in `readiness.js`, `leader-system.js`, `economy.js`, `politics.js`, and `political-allies.js`; a return from the base guard alone must not allow later wrappers to run against rejected state.

### A2-05 — Medium: save failure is displayed as success

`js/util.js:92` reports false on storage exceptions, but `js/panels.js:1234` ignores that result and immediately toasts “حُفظت في …”. R15 opens the synthetic saves panel, invokes the real manual-save handler with quota failure, observes the success toast, and verifies no slot was created.

**Agent 1:** respect save/backup results in the UI and all new-game callers, explain the failed persistence, and retain access to the unsaved state/source. This is a confirmed misleading success message, not evidence of losing a pre-existing manual slot on quota error.

### A2-06 — Medium: manual slot affordances and deletion need explicit preservation UX

`js/panels.js:1234–1235` offers direct overwrite and a one-click delete for incompatible data; `js/campaign.js:129` `deleteSlot('auto')` deletes both v2 and v1 keys, while `clearSave():142` also removes both. No backup/export action exists in this baseline panel. `js/util.js:93` swallows deletion failures.

B07 **passes**: creating an Umayyad campaign alone does not modify manual slots. Do not report automatic manual-slot loss where it was not observed. Explicit click handlers are nevertheless a review risk: the user must understand what is being overwritten/deleted, and inaccessible saves need recovery/export rather than deletion as the sole offered action. A confirmation is a recommendation for this UX; the package does not prohibit an informed, expressly requested deletion. No real deletion was performed in this audit.

**Agent 1:** protect manual slots during every automatic migration; clearly label unsupported saves and offer recovery. Ensure UI reset/navigation never calls clear/delete implicitly. Document the scope of an intentional delete, including the second v1 key.

### A2-07 — High for migration delivery: no idempotent, verified backup protocol yet

R06–R08 exercise repeated save requests, reloading production in a new VM, failure at the final auto write, and two different legacy payloads. All currently fail at the first missing preservation guarantee. They **do not yet prove** the later collision/retry branches in a future implementation; those branches become reachable once initial preservation is implemented.

**Agent 1:** use auditable key/version conventions, identify the original payload, reuse its verified backup on retry, never overwrite an unrelated legacy payload, and recheck storage after failed/interrupted writes. A constant “backup complete” flag alone is insufficient. Multiple tabs require a separate concurrency review.

### A2-08 — Medium: startup identity and incomplete display metadata

`js/main.js:95` defaults to Chinese; `Game.newGame()` accepts direct Chinese requests; the menu exposes Chinese as resumable (R12–R14). A valid scenario with absent display fields renders `undefined`/`NaN` (R17). Removing the Chinese definition alone would leave the new-game default dereferencing undefined.

**Agent 1:** guard both entry points and UI before removing catalogs, show safe metadata fallbacks, and make Umayyad the sole start scenario. Do not silently start Umayyad as a recovery from rejected Chinese input.

### A2-09 — High: the proposed GitHub Pages paths do not isolate localStorage

The execution package claims that the suggested `https://llmlk.github.io/Game-war/` and `https://llmlk.github.io/Game-war-preview/` are separate origins. For these exact URLs that is incorrect: `new URL(a).origin === new URL(b).origin` evaluates **true**, because scheme/host/port are identical and path is not part of the origin. This was verified locally with URL parsing; no website or deployment was visited or changed.

**Agent 1 / owner:** do not assume a separate repository isolates saves. Verify the actual deployment hostname and storage keys before browser QA; use isolated browser contexts and synthetic data. If these exact paths are deployed on the same host with shared keys, a preview could access the same localStorage. A distinct origin or deliberate preview-only storage namespace is needed for isolation. Actual deployment origin/configuration is not verified here and remains outside this assignment.

## Test scope and remaining evidence

- The rendering probes replace only DOM construction/presentation with a small recorder; actual menu/save-panel decision and click-handler logic runs. They do not establish Chrome/Safari compatibility, event delivery, layout, accessibility, or mobile behavior.
- Preservation tests accept either a verified backup containing the original raw bytes/exact parsed data or leaving the original in place. They do not require a particular legacy key name or prescribe the implementation. A fail-closed path can pass the storage invariant while its export/consent UI still needs separate acceptance.
- R08's second-payload branch runs only when a backup is created; it is inapplicable if the implementation blocks and retains the first original. The report must not claim backup collision coverage from that alternative path.
- The silent-drop fault deliberately models an unverified backup result. Ordinary localStorage writes are atomic per operation; this is a fault-injection check, not a claim that all browsers silently drop successful writes. R07 models interruption between operations, not power-loss durability inside a browser engine.
- Core-state comparisons are explicitly enumerated in `core()`; passing them is not proof that every optional migration field is idempotent. Fixtures contain legacy commanders but do not exhaust every historical commander alias, retired/captive state or genuine midcampaign schema.
- Actual JSON export/download and loading that export in an older game remain **not automated** until a concrete recovery API/UI exists. Verify bytes and restore behavior once Agent 1 supplies it.
- Actual browser quota/security policies, two-tab races, page termination, physical iOS/Android tests, and the owner's own save acceptance remain **not performed**. Real owner saves are intentionally out of scope; no request to access them was made.
- Existing full economy/leader/combat/20+ turn/UI suites were not rerun; this assignment introduced only QA files. Agent 1 remains responsible for R's complete regression suite and deletion inventory. No blanket claim of R completion or release safety is made.

## Required follow-up for Agent 1

1. Guard every version/identity/shape before normalization, including v1 and direct start; preserve active state on failure (A2-02/03/04/08).
2. Protect auto with verified, repeatable legacy preservation before *any* write; handle read denial, corrupt JSON, backup quota, retry and collision without damaging the source (A2-01/07).
3. Keep manual slots untouched automatically; provide clear unsupported-save recovery and truthful save failure feedback (A2-05/06).
4. Preserve Umayyad `legacy` identity mappings and keep all baseline compatibility checks green.
5. Review the same-origin preview issue before any deployment or browser migration QA (A2-09).
6. Rerun this independent suite against the completed Phase R checkout; keep failures visible, add implementation-specific recovery/export/browser evidence, then seek the owner's R approval.

This audit stops at local QA delivery. It does not implement Phase R, remove Chinese production content, modify Agent 1's checkout, start G0, publish or deploy.
