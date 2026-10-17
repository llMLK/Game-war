# 03 — Engine architecture / بنية المحرك

**Status: G0 design only.** One deterministic tactical resolver, simultaneous orders, physical consequences, and absence of a future legacy fallback are **LOCKED** by V3 §5.6.3–5.6.4, V3.3 §§2–4, handoff §§4–5, and the replacement assignment §§3, 8, 11. Every module name, API, algorithm, numeric precision, random generator and cadence below is **PROPOSED**, chiefly P03–P05 in [12](12-decisions-and-risks.md). No BattleV2 implementation or benchmark is claimed.

## 1. Boundaries and R evidence

At approved R `29f34b333ff4c424e0b0a987838138a4bf697d94`, read-only inspection finds `WarSim.checkEnd()` in `js/warsim.js:1225`, `decideByScore()` at 1243, its phase-boundary call at 566, and a `runAuto()` cutoff call at 1711. `BattleScene.quickResolve()` calls `runAuto()` at `js/battle-scene.js:609`; rendering timers appear at 449–461. These are **observations of R**, not proof of the exact cause of the owner's unlogged past battle. The proposed design must not inherit those result predicates or convert renderer timers into tactical time. The integration inventory/removal checklist is in [10](10-future-phase-contracts.md); none is edited in G0/G1.

```text
mission + terrain + personnel + rules + seed
                    |
              createBattle
                    |
           authoritative BattleState
          /                         \
 observe(attacker)              observe(defender)
      |                              |
human order composer       opponent order planner
(G1A; delegated G1B)        (same observation contract)
          \                         /
       validate -> seal both -> commitOrders
                    |
              ONE resolver
                    |
      atomic state + ordered causal events
          /          |              \
 redacted view   replay/checkpoint  objective evaluator
 Canvas adapter                       |
                              typed result (terminal only)
                                      |
                              future G2 adapter
```

The planner never receives the opposing order draft or authoritative enemy records. The renderer receives observation/event projections and never mutates state. The report adapter translates evidence and localization keys; it cannot invent a reason. The future campaign adapter accepts one verified result and applies it once; it cannot supply damage or choose a winner.

| Proposed module | Owned responsibility | Forbidden dependency |
|---|---|---|
| rules/content registry | Versioned map, weapon tables, objectives, integer lookup tables | UI time, control mode |
| state validator/codec | Schema, IDs, conservation, canonical encoding, versions | Guessing losses or silently upgrading rules |
| observation projector | LOS, estimates, own-unit status, event redaction | Enemy plans leaked to UI/planner |
| order inbox | Draft revision, validation, sealed orders, delivery | Side-first combat execution |
| tactical resolver | Geometry, movement, fire, personnel ledger, morale, retreat | WarSim, probability-only quick result |
| objective evaluator | Published predicates over state/evidence | Hidden score or chunk winner |
| commander planner | Observations + instructions -> detailed orders/reasons | Mode damage multiplier |
| replay/checkpoint | Initial state, orders, versions, hashes | Rerunning AI to invent missing orders |
| Canvas/event adapter | Camera, interpolation, localized causes | Altering shots, seed or losses |

G1A has one field map, 4–6 banners per side and an opponent planner. G1B adds tactical delegation in the standalone engine. G2 adds campaign adapters and remaining mission execution. An unsupported future scenario rejects explicitly; it never falls back to legacy combat.

<a id="engine-api"></a>
## 2. Proposed API contract

These are prospective boundaries, not permission to change production methods. Returned states are immutable values; an encounter controller owns writes.

| API | Inputs -> output | Preconditions, failure and effects |
|---|---|---|
| `createBattle(config, rules)` | Validated state + initial hash or errors | Supported scenario/content/rules; conservation checked; no campaign write |
| `observe(state, observerId, viewPolicy)` | `Observation` at fixed tick/hash | Active view redacts truth; postbattle full replay is labeled separately |
| `validateOrder(state, observation, order)` | Accepted/errors/warnings/normalized order | Correct phase, ownership, known target, legal shape; warnings do not reveal hidden blockers |
| `commitOrders(state, sealedBatches)` | Execution state + detailed order log | Both sides sealed from same snapshot; duplicate batch ID idempotent; conflicting revision rejects batch |
| `advanceMicrotick(state, expectedRevision)` | One committed state/event transaction | Execution phase, correct revision/hash, nonreentrant; no wall-clock dependence |
| `runRound(state, budgetTicks)` | Repeated microticks, stop reason and state | Stops at review/terminal/fault; budget exhaustion never chooses a winner |
| `evaluateObjectives(state, events)` | Evidence and optional terminal decision | After simultaneous application; event ordering cannot break conflicting successes |
| `getResult(state)` | Result or `null` | `null` while ongoing; completed tactical result only; explicit suspend/fault returns a separate recovery envelope |
| `serialize(state)` | Canonical checkpoint bytes + hash | Completed microtick boundary; includes fractional carry/pending messages |
| `replay(envelope, rules)` | Trace + comparison report | Exact versions/content and all detailed orders; mismatch is a fault |
| `projectEvents(events, observer)` | Known evidence + localization keys | Same redaction as observation; no invented narration |
| future `applyBattleResult(campaign, result)` | Atomic G2 transaction or already-applied acknowledgment | Deferred; outcome, conservation and encounter idempotency checked before writing |

An execution budget bounds scheduling. A proposed decision window of 80 microticks (20 simulated seconds at 250 ms/tick) is a pacing candidate, **not a battle duration or terminal threshold**. Significant disclosed events may request review after an atomic tick. Both sides then get the same new planning time. Hidden events alone do not cause an extra pause visible to the opponent. Headless honors the same review boundaries/order schedule; it omits animation waiting, not tactical ticks.

<a id="engine-resolution"></a>
## 3. Deterministic simultaneous resolution

### 3.1 Canonical input and integer math — PROPOSED P03/P04/P05

Coordinates are integer decimetres, 10 units/metre; x increases east and y north. Microtick is an absolute integer index, provisionally 250 ms. Facing has 256 bins: 0 north, 64 east, 128 south, 192 west. Rules ship an integer direction table scaled by 1,000,000; its bytes belong to `contentRevision`. No runtime trigonometric library creates it. Positions, resources, morale, cohesion and counters are integers; morale/cohesion/readiness/fatigue are 0–1000. Scale and continuous fixed-point space remain owner-review choices; grid/hex alternatives are in [12](12-decisions-and-risks.md).

Authoritative JSON integers fit signed 53-bit safe range; products/ratios use exact integer intermediates (candidate `BigInt`) and explicit rounding. Rational comparisons use cross-products. `floorDiv(a,b)` is mathematical floor for b>0, including negative a; `truncDiv` rounds toward zero for symmetric vector steps. `isqrt(n)` is greatest d with d*d<=n. Movement keeps numerator remainders. Directions come from the fixed table; a heading tie chooses clockwise, never a side. Coordinate magnitude is provisionally bounded at 1,000,000 units; overflow or invalid denominator rejects a state rather than wrapping.

Canonical serialization: UTF-8 without BOM; keys sorted by Unicode code point; ASCII stable IDs; compact JSON; no floats/NaN/Infinity/negative zero; no implicit defaults; explicit null only where nullable. Set arrays sort by declared keys; ordered waypoints/events/history retain semantic order. Translation and camera data stay outside physical hashes. Duplicate IDs, invalid bounds and conflicting revisions reject input; normalization never silently changes a route. See [04 invariants](04-state-and-commands.md#state-invariants).

### 3.2 Random generator and all consumption — PROPOSED

Candidate `sha256-counter-v1`: draw key is canonical JSON array `["BattleV2Rng1",seed,namespace,channel,absoluteTick,sourceId,targetId,ordinal,slot]`. SHA-256 its UTF-8 bytes; `u16=firstByte+256*secondByte`; compare `u16<probabilityQ16` (0..65536). No modulo bias. The algorithm/byte order belong to rulesVersion. `namespace` is immutable rng.namespace: the fixture/encounter stream namespace is recorded in initial state. An injected WING-PIVOT checkpoint has its own namespace and fresh declared request ledger; it is not a claim about RNG history of a naturally played opening. This is a design choice, **not proven fast enough**; measure its cost before accepting G1A. A faster generator requires a new rules revision and golden vectors.

Only the following draws exist. Eligible slots are requested even at probability 0 or 65536; ineligible actions request none. Duplicate use of an identical key in one transaction rejects the transaction. Per-channel request count and rolling key hash are serialized for checkpoint verification; counts do not seed later values. Initial request hash is SHA256 of canonical empty array. At each committed tick, sort eligible draw-key arrays lexicographically by their canonical bytes, then update channel hash as SHA256(UTF8(previousRequestHash)||0x0A||canonical(sortedKeys)); add the number of keys to requests. This reduction is independent of traversal order. Planner keys belong only to the audit ledger; physical rng.channels excludes planner.

| Channel / slot | Eligibility and exact count | Effect |
|---|---|---|
| `combat/casualty` | One per active roster ordinal exposed to combined nonzero physical hazard this tick | Whether that person is a casualty; concurrent sources cannot hit one person twice |
| `combat/severity` | One per casualty selected above | Wounded vs dead from provisional severity table |
| `commander/fate` | One per active fit commander physically exposed in contact/ranged zone each tick | Harm; never based on command mode |
| `commander/severity` | One only if fate selected harm | Injury severity/death; capture follows custody, not luck |
| `planner/tie` | One per equal-utility candidate set, side/round/revision, only if planner permits lottery | Detailed order choice; provenance outside physical RNG ledger |

No random morale punishment, message loss, collision priority, teleport, surrender or reinforcement. The initial combat candidate models aggregate projectile pressure, not individual projectile flight: volley spends real ammunition, geometry constrains exposure, and troop losses use the same casualty draw. A later projectile model needs an explicitly versioned consumption contract.

`Math.random`, date/time, frame count, renderer order, locale collation, network arrival order, device entropy and async completion order are forbidden in simulation/planning decisions. Cosmetic variation uses a renderer-only stream unable to write state. Replay uses recorded AI detailed orders directly, not rerun AI.

### 3.3 Snapshot / intent / apply pseudocode

Illustrative documentation, not executed implementation. Parameters refer to [05](05-tactics-and-terrain.md#physical-rules).

```text
advanceMicrotick(S, expectedRevision):
  require execution phase; verify revision and previous hash
  acquire single-writer encounter transaction or reject REENTRANT_ADVANCE
  B = immutable snapshot(S)                         // both sides read B
  O = messages due at B.microtick + continuing orders + legal fallbacks
  validate delivery against present knowledge and issuer/successor state
  intents = derive facing/path/stance/fire/fallback for every formation from B+O
  positions = resolveAllSweptFootprints(B, intents)
  G = shared geometry view(B, positions)             // no casualties yet
  contacts = all contacts/ranges/obstructions from G
  releases = eligible simultaneous volleys/strikes from B+G
      // ammo and active strength from B; capable actors in B may all act
  hazards = aggregate physical releases/contact pressure per target
  losses = sample distinct active ordinals from B with canonical RNG keys
  commanderFates = sample all exposed commanders from B+G
  N = apply geometry/ammo/loss/fate deltas ONCE, atomically
  derive morale/cohesion/fatigue shocks from B, contacts and deltas
  derive routing, disengagement, custody, succession and control
      // rout movement begins next tick, never retroactively cancels a hit
  update permitted observations from N
  evaluate published objectives from complete N and evidence
  sort events by stage and stable causal key; assign sequence once
  assert conservation, legal footprints, valid references
  commit events and N with tick+1, revision+1 and hash
  on failed assertion: discard entire tick; preserve valid checkpoint;
      emit technical interruption, never winner/draw
```

Sides share planning time, not knowledge: each sees its own detected units. Both batches seal before execution; slow human input gives AI no newer snapshot. Each formation has one primary order and one fallback. A later draft replaces an earlier draft only during planning. After seal, cancellation is a delivered order with latency and cannot undo resources or hits. Conflicting same-revision orders reject the whole batch (`CONFLICTING_ORDER_REVISIONS`).

### 3.4 Collision, contact and disappearing targets

Use swept oriented rectangles and exact rational earliest contact. Terrain constrains sweeps first. Build an undirected graph of conflicting sweeps including allies; every formation in each connected component advances to the same earliest legal normalized progress fraction, rounded toward its old position. Recheck rounded rectangles; if rounding overlaps, reduce that component's fraction deterministically until legal. No actor wins because it is first or attacker. Nonmoving allies are obstacles; troops pass only where entire footprints fit side by side. Turning is also a swept shape and may require narrowing/reformation at a bridge.

Touching enemies can engage without penetrating footprints. Equal trajectories stop/contact; no coin-toss space ownership. Path ties use terrain vertex IDs/coordinates, never side index. Stable formation IDs order events only. Mirroring a test also mirrors geometry/headings; compare motion and eligibility exactly, and random keys under the same mirrored identity mapping or casualty distributions rather than claiming one seed guarantees geometric symmetry.

Targets resolve against shared postmovement geometry. A charge at a vacated point does not automatically strike its former occupant. Known enemy IDs track only while observed within the order's pursuit envelope; lost targets retain their last-seen point, never their hidden live position. Geometry can invalidate a valid submitted route. Emit `movement_blocked` or `order_invalidated`, activate the declared fallback and allow later adjustment. Details: [04 lifecycle](04-state-and-commands.md#order-lifecycle).

### 3.5 Event sequence is evidence order, not combat priority

Stages: 0 delivery/order; 1 movement/contact; 2 release/ammunition; 3 personnel/commander deltas; 4 morale/cohesion/fatigue/routing/succession; 5 observation/control/objectives; 6 review/terminal/checkpoint. Within stage sort `(tick,eventTypeRank,actorId-or-empty,sorted targetIds,localOrdinal)` using a versioned type-rank table. Reserve sequence numbers only after validation. Same-tick causes use stable provisional keys resolved to sequence numbers at commit; causal cycles reject. A casualty may cite several simultaneous attacks; no false exclusive kill credit. Objective evaluation sees both collapses before any result, regardless of serialized event order.

<a id="engine-replay"></a>
## 4. Replay, hashes, recovery and portability

`getResult()` returns only a genuine `completed` tactical result, or null. An explicit suspend/fault operation returns the separately discriminated `suspended`/`interrupted` recovery envelope from [06](06-objectives-and-results.md); it has no outcome or campaignEffects field and is never unresolved or a draw. Serialization preserves the last valid tactical phase for recovery. These states are not false battle endings.

Replay envelope: schema/rules versions, engine build ID, immutable content hash, encounter/scenario IDs, seed, **initial authoritative state and SHA-256**, planning boundaries, full normalized orders for both sides (including maintained orders by reference), delivery/decision provenance, physical RNG ledger, per-tick event-chain hashes, final state hash and terminal result. Final result is absent until terminal. Full postbattle replay may expose both sides only with visible `postbattle_full_information` labeling; original observation snapshots remain inspectable to explain what each decision-maker knew.

Two hashes serve different purposes:

- `physicalStateHash`: fields affecting simulation, tick, outstanding orders/messages, personnel, geometry, observations and physical RNG ledger. Excludes command-source labels, translations, camera, speed, cosmetic assets, user clocks and AI prose. Equal state + seed + detailed orders must match across manual/delegated/headless.
- `auditEnvelopeHash`: includes `commandMode`, selection time and decision provenance. It may differ while physical hashes match. Physical events exclude mode labels; reports join provenance by order ID.

Canonical physical projection explicitly excludes its enclosing `eventChainHash`, any stored `physicalStateHash`, and the `terminalResult` report wrapper, preventing self-reference through finalStateHash. It retains schema/rules/content identifiers, RNG namespace and request ledger, physical orders/timing, phase, objective predicates/states/evidence and every personnel/resource/geometry field. Compute observation hashes from their canonical projection excluding only their own observationHash. Once final physical state and event hash are fixed, construct CompletedResult referring to those hashes; result/audit hashes are separate and exclude their own hash field.

Event-chain candidate: `H0=SHA256(canonical(initialPhysicalState))`; `Ht=SHA256(UTF8(Ht-1)||0x0A||canonical(tickPhysicalEvents)||0x0A||canonical(physicalStateAtTick))`. Actual hashes must be 64 lowercase hex digits. **No digest for the unimplemented simulation is asserted.** This is valid JSON for a future comparison specification, not a generated replay or test result:

```json
{
  "fixtureId": "DET-PARITY-01",
  "status": "PENDING_IMPLEMENTATION",
  "algorithm": "sha256",
  "runs": ["manual-visible-1x", "same-orders-visible-8x", "same-orders-headless", "resume-at-tick-40"],
  "expected": {
    "initialPhysicalHashes": "all_equal",
    "perTickEventChainHashes": "all_equal",
    "finalPhysicalHashes": "all_equal",
    "canonicalResults": "all_equal",
    "auditEnvelopeHashes": "may_differ_only_in_provenance"
  },
  "actualDigests": null,
  "actualOutcome": null
}
```

G1A creates first golden vectors from reviewed code, stores actual digests with fixture/rules/build IDs, then independently reruns them. Key-order permutation must preserve hashes; real route changes may change events; UI speed must not; wrong rules reject replay rather than compare unlike simulations. Replay identical bytes in Chromium, Firefox, WebKit and named Android/iOS phones; distinguish browser emulation from device evidence. Test negative rounding, overflow rejection, equal collisions, RNG byte order and invalid IDs. All **PENDING**.

Checkpoint contains completed tick, phase, sealed batches, pending deliveries, order progress, fractional motion/damage/fatigue carry, personnel identities, observations and RNG request ledger. Restore verifies hashes/versions before enabling orders. Interrupted ticks never partly resume. Backgrounding pauses scheduling; elapsed real time never catches up tactical time. Duplicate expected-revision advances return already-committed data or stale-revision error, never double-spend. Campaign save migration is deferred in [10](10-future-phase-contracts.md).

<a id="engine-traces"></a>
## 5. Two hand-worked traces and future assertions

These are **designed symbolic traces**, not run logs. Full collapsed-wing fixtures: [07](07-wing-collapse-regression.md).

**Normal round:** tick 0 observations show own deployment and detected enemies. Human orders `A-SWORD` along the west route and keeps `A-SPEAR` holding. Opponent seals reserve cover from its own observation. A message may take ticks 1–3: `order_delayed` leaves the previous hold active. Delivery emits `order_delivered` and `movement_started`. Travel follows real path, slope/fatigue and speed; reaching a hill edge does not claim its crown. Defender `observation_updated` appears only on detection and a reaction obeys the next planning/delivery opportunity. At execution-window end emit `execution_window_ended`; absent objective completion, `getResult()` is null, review opens and valid orders persist. Required observations: no `battle_ended`, no reserve teleport, maintained orders explicit, neither observation contains enemy drafts.

**Pathological simultaneous contact/loss:** isolated microfixture has two formations of 2 active personnel, no prior losses. Both sweep into the same narrow gap. Equal-time contact stops both at one rational progress fraction; neither gets priority. Both strike from the same snapshot. Deliberately extreme **test-only** hazard 65536 makes every ordinal a casualty; test-only death probability 65536 produces active0/dead2 on each side. Both attacks still occur. Both become incapable in one committed tick. Field control follows actual presence/ability, never attacker index. If no independent objective and the fixture's published mutual-incapacity termination applies, result is completed/unresolved; if a supported recovery phase remains, battle continues. This distinction belongs in declared fixture rules before combat.

| Future check | Required observation | Status |
|---|---|---|
| `DET-SNAPSHOT-01` | Reversing storage order preserves both attacks and hashes | PENDING |
| `DET-COLLISION-01` | Equal sweeps share stop fraction; no overlap/side-first winner | PENDING |
| `CONS-MEN-01` | Each formation's disjoint current categories sum to starting; roster IDs unique | PENDING |
| `CONS-AMMO-01` | Initial+authorized incoming=remaining+spent+lost+transferred out; no negative ammo | PENDING |
| `DET-CUTOFF-01` | Scheduler chunks change neither trace nor end conditions | PENDING |
| `DET-RESUME-01` | Resume at any completed tick preserves suffix chain/result | PENDING |
| `DET-DOUBLE-COLLAPSE-01` | Published evidence controls result; no first-side winner | PENDING |

<a id="engine-performance"></a>
## 6. Feasibility and containment

Canvas 2D/2.5D is locked; no heavy 3D replacement. The proposed ten-formation prototype can use broad-phase spatial bins, swept tests for neighboring candidates, exact visibility caches keyed by changed geometry, event batching and simple shapes. Cache invalidation cannot change results. Culling/interpolation changes drawing only. Chunked headless yields between committed ticks without skipping physics.

Before G2, measure R light/crowded campaign turns and a real G1A build on a named midrange phone: device/OS/browser/build, encounter/formation counts, median/p95 encounter/turn time, longest main-thread stall, peak memory, replay bytes/tick and Arabic UI responsiveness. **No production p95 budget is selected in G0.** Hashing and geometry are feasibility risks; optimize equivalent arithmetic/batching, never use a headless winner formula. Performance and device tests remain PENDING.

| Fault | Proposed safe response | Future check |
|---|---|---|
| Invalid state, unsupported version, missing rules | Reject before start or preserve verified checkpoint; invent no losses | `FAULT-STATE-01` |
| Missing commander reference | Fail creation; actual leader casualty uses succession | `FAULT-LEADER-01` |
| Duplicate/corrupt event or chain | Reject application, quarantine data, restore verified point | `FAULT-EVENT-01` |
| Missing art/audio | Simple shapes/text if authoritative rules remain available | `FAULT-ASSET-01` |
| Zero ammo/provisions | Physical depletion; fail/conserve command, no refill | `FAULT-SUPPLY-01` |
| All formations incapable | Explicit capability/objective/recovery evaluation | `FAULT-INCAPABLE-01` |
| Blocked retreat/illegal order | Observable failure/fallback, no teleport | `FAULT-RETREAT-01` |
| Scheduler time exhausted | Yield/review; only declared daylight/deadline affects mission | `FAULT-TIME-01` |
| Background/resume/reentrancy | Atomic checkpoint and revision lock | `FAULT-RESUME-01` |

All checks are **PENDING IMPLEMENTATION**. R's unsupported-China backup protection must survive future G2 integration; BattleV2 accepts no China scenario.
