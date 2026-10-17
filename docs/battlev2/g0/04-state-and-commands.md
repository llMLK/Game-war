# 04 — State, observation and orders / الحالة والأوامر

**G0, speculative schema proposal.** Versioned contracts, real men/resources, shared physics, persistent orders, fog of war and evidence are LOCKED requirements (V3 §5.6.3; replacement assignment §§5–8, 10–11). All field names, encodings, ranges, default values and examples below are **PROPOSED**, not implemented or owner-approved. [03](03-engine-architecture.md) defines deterministic processing; [05](05-tactics-and-terrain.md) defines mechanics; [06](06-objectives-and-results.md) owns terminal result semantics. Numbers are fixture values only.

<a id="state-schema"></a>
## 1. Proposed serializable schema

The following TypeScript-equivalent notation is a design declaration, not production code. JSON is the wire/storage format. `Int` is a safe integer; `Id` is a nonempty ASCII stable identifier; `Hash` is 64 lowercase hex characters. References must resolve in the same encounter or versioned content. Null means explicitly absent, never unknown defaults. No functions, DOM handles, dates, class instances or cyclic objects may enter state.

```typescript
type Int = number;
type Id = string;
type Hash = string;
type SideId = 'attacker' | 'defender';
type Vec2 = { x: Int; y: Int };                 // decimetres, provisional

type Personnel = {
  starting: Int; active: Int; wounded: Int; routed: Int;
  captured: Int; missing: Int; dead: Int;
};
type PersonnelCategory = 'active'|'wounded'|'routed'|'captured'|'missing'|'dead';
type PersonnelRange = { from: Int; to: Int; category: PersonnelCategory };
type Resource = { initial: Int; incoming: Int; remaining: Int;
  spent: Int; lost: Int; transferredOut: Int; transferEventSeqs?: Int[] };
type Role = 'spear_infantry'|'sword_infantry'|'archers'|'shock_cavalry'|
  'horse_archers'|'guard_reserve'|'siege_equipment';

type BattleState = {
  schemaVersion: 'battlev2-state-proposal-1';
  rulesVersion: Id; contentRevision: Hash; engineBuildId: Id;
  encounterId: Id; scenarioId: 'umayyad'; campaignId: Id|null;
  fixtureId: Id|null; mapId: Id; seed: Int;
  revision: Int; round: Int; microtick: Int;
  phase: 'reconnaissance'|'planning'|'execution'|'review'|'terminal';
  lastCommittedInputHash: Hash; eventSequence: Int;
  rng: { algorithm: 'sha256-counter-v1'; seed: Int; namespace: Id;
    channels: Array<{id: Id; requests: Int; requestKeyHash: Hash}> };
  clockRules: { microtickMs: Int; decisionWindowTicks: Int;
    declaredDaylightEndTick: Int|null; declaredMissionDeadlineTick: Int|null };
  battlefield: Battlefield;
  sides: SideState[]; formations: Formation[]; commanders: Commander[];
  observations: Observation[]; orders: Order[]; messages: CommandMessage[];
  sealedBatches: OrderBatch[];
  objectives: ObjectiveState[];       // typed predicates/evidence defined in 06
  eventChainHash: Hash;
  terminalResult: CompletedBattleResult|null;  // completed branch of contract in 06
};

type ObjectiveState = {
  id: Id; side: SideId; declared: Predicate; // Predicate from06
  state: 'unfulfilled'|'fulfilled'|'failed'|'unresolved'; evidenceSeqs: Int[];
  predicateProgress: Array<{predicatePath: Id; continuousTicks: Int;
    lastEvaluationTick: Int|null; fulfilledAtTick: Int|null}>;
};

type SideState = {
  id: SideId; role: 'attacking_force'|'defending_force'; factionId: Id;
  armyId: Id|null; formationIds: Id[]; commanderId: Id|null;
  missionId: Id; objectiveIds: Id[]; retreatExitIds: Id[]; supplyRouteIds: Id[];
  declaredInstructions: { priority: 'objective'|'preserve_force';
    riskCeiling: Int; withdrawalConditionId: Id|null; initiative: 'restricted'|'bounded' };
  concession: { declared: boolean; tick: Int|null; reasonCode: Id|null };
};

type Battlefield = {
  coordinateScale: { unitsPerMetre: Int; xPositive: 'east'; yPositive: 'north' };
  bounds: { minX: Int; maxX: Int; minY: Int; maxY: Int };
  terrain: TerrainFeature[]; zones: Zone[]; routes: RouteFeature[];
  elevationPatches: Array<{id: Id; polygon: Vec2[]; baseHeight: Int;
    slopeXQ1000: Int; slopeYQ1000: Int}>;
};
type TerrainFeature = {
  id: Id; kind: 'open'|'slope'|'hill'|'woods'|'river'|'ford'|'bridge'|
    'pass'|'road'|'gate'|'wall'|'breach';
  polygon: Vec2[]; navigableRoles: Role[]; occluderHeight: Int;
  movementCostQ1000: Int; maxUsableWidth: Int|null;
  state: 'intact'|'open'|'damaged'|'breached'|'closed';
  equipmentRequired: Id[]; controlZoneId: Id|null;
};
type Zone = {id: Id; kind: 'deployment'|'objective'|'retreat_exit'|'supply_entry'|
  'critical_point'; polygon: Vec2[]; permittedSides: SideId[];
  controller: SideId|'contested'|'vacated'; progressTicks: Int};
type RouteFeature = {id: Id; kind:'road'|'retreat'|'supply'|'crossing';
  waypoints: Vec2[]; width: Int; connectsZoneIds: Id[]; open: boolean};

type Formation = {
  id: Id; sideId: SideId; factionId: Id; bannerType: Id; role: Role;
  personnel: Personnel; personnelLedger: PersonnelRange[];
  morale: Int; cohesion: Int; readiness: Int; fatigue: Int; experience: Int;
  ammunition: Resource & { kind: Id|null };
  provisions: Resource & { unit: 'ration_portion' };
  equipment: Array<Resource & { kind: Id; serviceability: Int }>;
  position: Vec2; elevation: Int; facing: Int;
  footprint: {frontage: Int; depth: Int; spacing: Int};
  movement: {baseSpeedDmPerSecond: Int; turnBinsPerTick: Int; velocity: Vec2;
    distanceCarry: Int; vectorCarryX: Int; vectorCarryY: Int;
    pathIndex: Int; progressDm: Int; mobility: 'foot'|'mounted'|'wheeled'};
  commanderId: Id|null; stance: 'march'|'defend'|'engage'|'screen'|'withdraw'|'reserve';
  orderId: Id|null; fallback: Fallback;
  condition: {engagement: 'free'|'contact'|'disengaging';
    contactIds: Id[]; routing: boolean; regrouping: boolean;
    physicallyExited: boolean; capability: 'organized'|'disordered'|'incapable'};
  carry: {fatigue: Int; recovery: Int; pressure: Int};
  tacticalTimers: {nextVolleyTick: Int; chargeRunDm: Int; lastChargeContactTick: Int|null;
    braceTicks: Int; lowOrganizationTicks: Int; quietTicks: Int; disengageTicks: Int;
    nextRationTick: Int; equipmentUseTicks: Int; witnessedShockEventSeqs: Int[]};
};

type Commander = {
  id: Id; sideId: SideId; formationId: Id; rosterOrdinal: Int;
  influenceRadiusDm: Int; competence: Int;
  style: 'cautious'|'balanced'|'maneuver';
  condition: 'fit'|'injured'|'captured'|'dead'|'missing';
  injurySeverity: Int; successionIds: Id[]; actingForId: Id|null;
  deliveryProfileId: Id; decisionPolicyId: Id;
};

type IntelligenceContact = {
  contactId: Id; knownFormationId: Id|null; lastSeenTick: Int;
  lastSeenPosition: Vec2; positionRadiusDm: Int;
  countRange: {min: Int; max: Int}|null; roleEstimate: Role|null;
  confidence: 'high'|'medium'|'low';
  detection: 'direct_los'|'ally_report'|'last_seen';
  observedFacing: Int|null; observedCondition: Id|null;
};
type Observation = {
  observerId: SideId; tick: Int; round: Int;
  ownFormationIds: Id[]; contacts: IntelligenceContact[];
  knownTerrainIds: Id[]; visibleZoneIds: Id[]; knownMissionIds: Id[];
  perceivedEventSeqs: Int[]; observationHash: Hash;
};
```

`ObjectiveState` extends the declared predicate/evidence structure named `ObjectiveRecord` in06 with serialized progress per predicate path, including unfulfilled initial state; result projection maps canonical evidenceSeqs to evidence IDs and classifies every still-unfulfilled objective as failed or unresolved according to its declared rule, retaining every initial declared condition. Progress initializes with continuousTicks0, lastEvaluationTick null and fulfilledAtTick null. Continuous-hold counters reset on any committed tick lacking qualifying own control, including contested or vacated state; deadline progress uses absolute simulation ticks, never wall time. This supports checkpoint replay without requiring hidden historical counters; it does not choose a dwell threshold. `CompletedBattleResult` is an alias of06 `CompletedResult`. These and the separate recovery envelope are defined by [06 objective/result contract](06-objectives-and-results.md), not free-form text. Both declarations require mission ID, declared typed predicate and fulfilled evidence. Mission limits must be published at creation. A field result does not determine city ownership. `objectiveOutcome` is only the conceptual alias for canonical result **`outcome`**, never a second disagreeing field.

`scenarioId='umayyad'` identifies supported campaign content; `fixtureId='G1A-HILL-OPEN'` identifies a test configuration. Neither implies a historical battle. `campaignId=null` means standalone prototype. A role enum permits future compatible content; it does not prove every role existed in a particular 715 army or authorize new factions/units.

<a id="state-invariants"></a>
## 2. Authoritative fields, units and rejection rules

| Field group | Unit/range; authority | Invariant or rejection |
|---|---|---|
| identity/version/seed | Stable IDs; seed uint32 candidate; authoritative | Unsupported scenario/rules/content reject; seed must equal rng.seed; seed/namespace cannot change after creation |
| round/microtick/revision/seq | Nonnegative integers; authoritative | Tick never resets at round boundary; one committed revision/tick; event seq strictly increases |
| position/elevation/footprint | Integer dm; positive width/depth/spacing; authoritative | In bounds and nonpenetrating at checkpoint; elevation matches terrain surface |
| facing/turn | Facing0..255; turn0..128 bins/tick candidate | No runtime floating heading; facing change obeys swept footprint |
| speed/progress/carry | dm/s and integer remainders; authoritative | Negative speed/carry out of declared denominator range reject |
| morale/cohesion/readiness/fatigue/experience | Integer0..1000 candidate | Reject out-of-range input; internal updates clamp explicitly and log causes |
| personnel | Integer counts; ledger authoritative, counts validated projection | `starting=active+wounded+routed+captured+missing+dead`; each ordinal0..starting-1 appears in one range exactly once |
| resources | Nonnegative integer pieces/portions | `initial+incoming=remaining+spent+lost+transferredOut`; incoming must reference a real transfer/source |
| observation confidence | Disclosed estimate/age | No hidden IDs, exact unknown counts, future paths or enemy draft orders |
| objective/control | Published predicate plus state/evidence | No score-only winner, no changing predicate after start |
| render/provenance | Derived/audit-only | Never changes physical state or RNG/hash |

`active` means a person is still physically with the formation and not placed in another accounting category; **combat-ready is derived**, not another pile of men. A routing but unexited formation may have active personnel and zero organized combat-ready strength. Routing/engagement/fatigue are overlapping conditions, not casualty categories. At a verified dispersal/exit/capture event transfer individual ordinals once from active to routed/missing/captured. A wounded soldier is not also active or dead; later death is a wounded->dead transfer with evidence. Regroup/rally can transfer routed->active only for known locally present personnel, at actual travel/time cost. No postbattle healing or new men is granted here.

Commander `rosterOrdinal` belongs to one formation's ledger; leaders are not extra uncounted troops. Their ordinal is excluded from ordinary troop casualty sampling and uses the commander exposure stream, then **the same** personnel ledger changes. An incapacitating injury moves that ordinal active->wounded, death active/wounded->dead, capture active/wounded->captured as justified; succession never creates a soldier. No leader fights hundreds of men as a bonus unit. This is a proposed accounting representation, not final historical modeling.

Captives remain counted under their army of origin and have separate custody references; the captor does not add them to its active manpower. A `Resource` transfer debits source and credits destination in one transaction. A resource with nonzero incoming/transferredOut must carry `transferEventSeqs` in its enclosing ledger record, referencing matching debit/credit events; no-transfer examples omit this conditional field. Unmatched transfers reject the transaction. Equipment serviceability deteriorates with use; worn items are not recreated by rest. Derived strength/frontage capacity/LOS/control projections are recomputed from authoritative data and checked against any cached projection; caches are disposable.

The elevation patch origin is polygon[0]. Surface height = baseHeight + floorDiv(slopeXQ1000*(x-origin.x)+slopeYQ1000*(y-origin.y),1000). Adjacent patch edges must agree; reject an undefined elevation transition. Select a boundary patch by stable ID only after verifying equal shared-edge height. Formation elevation is the surface at its centroid; slope feasibility samples the full swept footprint.

`movement.velocity` is last committed displacement in dm per microtick; vector remainders follow03. tacticalTimers and witnessedShockEventSeqs preserve reload, charge, brace, rout hysteresis, quiet/rally time, disengage, rations, wear and one-time rear/rout shocks. In this proposed first rule revision, carry.pressure/fatigue/recovery are reserved at zero where the explicit formulas already use integer updates; nonzero values reject until a version defines their meaning.

Version policy: schema changes require explicit migrator or rejection; rules changes never resume a battle under altered physics. G1 checkpoint support, if implemented, supports exact rules only. Future G2 migration preserves originals/backups and once-only effects; unsupported China backups remain protected. Unknown enum values, extra physical fields, duplicate IDs, missing references, noncanonical integers, invalid polygons, impossible personnel totals, absent causal evidence or invalid objective type reject before resolution. No silent repair to a convenient winner.

<a id="state-examples"></a>
## 3. Valid JSON component examples

These are **representative component objects**, not a complete BattleState, executable fixtures or observed results. [07](07-wing-collapse-regression.md) and [08](08-g1a-prototype-brief.md) supply the ten-formation test configurations; a future fixture loader expands defaults, validates all components and computes real hashes. Hashes are not invented here.

The following formation is an initial component: 400 men, all active, including the assigned commander ordinal0. Values are test-only. `orderId=null` is allowed in this pre-normalization component only. createBattle materializes a stable initial hold_defend order (or the explicitly supplied keep_reserve/conserve_ammo instruction) before validating and hashing executable state; ongoing capable formations never depend on an unrecorded implicit order.

```json
{
  "id": "A-SPEAR", "sideId": "attacker", "factionId": "umayyad",
  "bannerType": "test_spear_banner", "role": "spear_infantry",
  "personnel": {"starting":400,"active":400,"wounded":0,"routed":0,"captured":0,"missing":0,"dead":0},
  "personnelLedger": [{"from":0,"to":399,"category":"active"}],
  "morale":800,"cohesion":800,"readiness":800,"fatigue":0,"experience":500,
  "ammunition":{"kind":null,"initial":0,"incoming":0,"remaining":0,"spent":0,"lost":0,"transferredOut":0},
  "provisions":{"unit":"ration_portion","initial":400,"incoming":0,"remaining":400,"spent":0,"lost":0,"transferredOut":0},
  "equipment":[{"kind":"spear","initial":400,"incoming":0,"remaining":400,"spent":0,"lost":0,"transferredOut":0,"serviceability":900}],
  "position":{"x":3000,"y":1300},"elevation":0,"facing":0,
  "footprint":{"frontage":400,"depth":200,"spacing":10},
  "movement":{"baseSpeedDmPerSecond":10,"turnBinsPerTick":2,"velocity":{"x":0,"y":0},"distanceCarry":0,"vectorCarryX":0,"vectorCarryY":0,"pathIndex":0,"progressDm":0,"mobility":"foot"},
  "commanderId":"A-CMD","stance":"defend","orderId":null,
  "fallback":{"trigger":"route_blocked","threshold":null,"action":"hold","targetId":null},
  "condition":{"engagement":"free","contactIds":[],"routing":false,"regrouping":false,"physicallyExited":false,"capability":"organized"},
  "carry":{"fatigue":0,"recovery":0,"pressure":0},
  "tacticalTimers":{"nextVolleyTick":0,"chargeRunDm":0,"lastChargeContactTick":null,"braceTicks":0,"lowOrganizationTicks":0,"quietTicks":0,"disengageTicks":0,"nextRationTick":14400,"equipmentUseTicks":0,"witnessedShockEventSeqs":[]}
}
```

The footprint permits 40 files at spacing10 and requires 10 ranks for 400 active men; depth200 includes rank interval and formation slack. Occupancy density/reformation proposal in [05](05-tactics-and-terrain.md#physical-rules) validates it, rather than interpreting every rectangle pixel as one soldier. No per-soldier drawing is required.

```json
{
  "id":"A-CMD","sideId":"attacker","formationId":"A-SPEAR","rosterOrdinal":0,
  "influenceRadiusDm":1500,"competence":650,"style":"balanced",
  "condition":"fit","injurySeverity":0,"successionIds":["A-LT4","A-LT1","A-LT2","A-LT3"],"actingForId":null,
  "deliveryProfileId":"g0-local-message","decisionPolicyId":"g0-balanced"
}
```

Each named A-LT successor must exist as a distinct living roster ordinal in a complete fixture; the component alone intentionally does not instantiate a full roster. Succession resolves known eligible IDs and falls back to the standing local instruction when none is available.

<a id="order-schema"></a>
## 4. Orders, batches and messages

```typescript
type OrderType = 'move_occupy'|'hold_defend'|'attack_assault'|'flank_route'|
  'intercept_cover'|'withdraw_regroup'|'keep_reserve'|'commit_reserve'|
  'shoot'|'conserve_ammo'|'breach_gate';
type Fallback = {
  trigger: 'route_blocked'|'target_lost'|'dense_spears_seen'|'cohesion_below'|
    'retreat_threatened'|'leader_lost';
  threshold: Int|null; action: 'hold'|'withdraw_to'|'regroup_at'|'conserve_ammo';
  targetId: Id|null;
};
type Order = {
  id: Id; formationId: Id; sideId: SideId; revision: Int;
  issuedRound: Int; issuedTick: Int; observationTick: Int;
  type: OrderType;
  target: {kind: 'position'|'formation'|'zone'|'route'|'gate'|'none';
    id: Id|null; position: Vec2|null};
  route: Vec2[]; stance: 'march'|'defend'|'engage'|'screen'|'withdraw'|'reserve';
  riskCeiling: Int; fallback: Fallback;
  status: 'new'|'maintained'|'delayed'|'active'|'canceled'|'completed'|'invalid';
  delivery: {issuedBy: Id; deliverAtTick: Int|null; routeId: Id|null;
    state: 'queued'|'in_transit'|'delivered'|'failed'};
  progress: {waypointIndex: Int; startedTick: Int|null; completedTick: Int|null};
  reasonCode: Id;
};
type CommandMessage = {
  id: Id; orderId: Id; senderCommanderId: Id; receiverFormationId: Id;
  sentTick: Int; position: Vec2; route: Vec2[]; pathIndex: Int;
  deliverAtTick: Int|null; state:'queued'|'in_transit'|'delivered'|'failed';
  failureReason: Id|null;
};
type OrderBatch = {
  id: Id; sideId: SideId; round: Int; revision: Int;
  observationHash: Hash; orderIds: Id[]; maintainedOrderIds: Id[];
  normalizedInputHash: Hash; sealed: boolean;
};
```

All tactical orders are formation-level. Campaign destination, march, dispatch, mail, reinforcement request and pre-departure delegation are **not** this order enum; their future G2 contract is [10](10-future-phase-contracts.md). G1B uses the same tactical order object and seals with the same rules. Provenance `{commandMode, authorKind, missionOrderId, decisionReason, selectionTime}` is kept in the audit envelope, not as mode modifiers inside physical orders. Identical detailed commands normalize to identical physical payloads even if provenance differs.

Example submitted order component (route/fallback numbers provisional). A known retreat zone must resolve in the full map:

```json
{
  "id":"A-ORD-3","formationId":"A-SWORD","sideId":"attacker","revision":1,
  "issuedRound":1,"issuedTick":80,"observationTick":80,"type":"flank_route",
  "target":{"kind":"zone","id":"HILL-CROWN","position":null},
  "route":[{"x":1800,"y":3000},{"x":1800,"y":4900},{"x":2500,"y":4900}],
  "stance":"march","riskCeiling":600,
  "fallback":{"trigger":"cohesion_below","threshold":300,"action":"withdraw_to","targetId":"A-EXIT"},
  "status":"new",
  "delivery":{"issuedBy":"A-CMD","deliverAtTick":null,"routeId":null,"state":"queued"},
  "progress":{"waypointIndex":0,"startedTick":null,"completedTick":null},
  "reasonCode":"PLAYER_ORDER"
}
```

Fixture macros in [07](07-wing-collapse-regression.md)/[08](08-g1a-prototype-brief.md) are explicitly **FixtureSpec inputs**, not complete Order objects: `{formationId,type,targetId,route,fallback}` expands using a documented side/round/issuer context. The future loader creates stable order IDs, resolves target kind from known map/contact registries, supplies declared default stance/risk, expands all ten formation components and computes hashes. Unknown fields/targets fail; it never invents an outcome. Regression pivotal snapshots may be injected fixtures, but cannot be described as achieved by the opening script without an executed trace.

<a id="order-table"></a>
## 5. Formation command table

Tap counts are **proposed** actions for an already visible default command strip; optional fallback editing may add interactions. A route is an offered broad corridor plus adjustable waypoints, not per-soldier tracing. All accepted orders emit `order_submitted`, then `order_delayed` or `order_delivered`; unchanged valid orders emit `order_maintained`. The tables specify additional exact observable events. Only effects the observer can know are shown.

| Order / Arabic label | Preconditions, target and touch sequence | Movement, duration, uncertainty and risk |
|---|---|---|
| `move_occupy` / تحرّك | Mobile formation; position/known zone. Select banner -> tap destination -> confirm (3) | Legal path then face/hold; persists until arrived/changed/invalid. Hidden obstruction and enemy interception can delay; occupying target does not itself fulfill every mission |
| `hold_defend` / ثبّت | Any non-incapable formation; present/near known position. Select -> hold -> confirm (3) | Remain/reform and defend arc; persists indefinitely subject to capability/objective. Risk of outflank, missile depletion or mission time cost |
| `attack_assault` / هاجم | Capable formation, known contact or assault zone; siege equipment when needed. Select -> target -> confirm (3) | Approach within order envelope, turn, engage; persists until target invalid/withdrawn or instruction completes. Exact hidden strength is unknown; contact can pin or exhaust |
| `flank_route` / التف | Legal broad corridor + objective/contact; select -> choose offered route -> confirm (3 where feasible) | Traverse actual waypoints; face/attack at final authorized point. Interception, woods, turn time, spears and return-route danger are previewed as estimates. No automatic flank bonus before position exists |
| `intercept_cover` / غطِّ | Capable unit and known friendly withdrawal route/zone or detected threat. Select -> cover zone -> confirm (3) | Travel to screen, face threats, engage within bounded screen area; persists through protected crossing or changed order. Can be bypassed/overwhelmed; does not pin entire enemy army |
| `withdraw_regroup` / انسحب | Known own exit/regroup zone; may be in contact. Select -> withdrawal destination -> confirm (3) | Turn/disengage, follow path under exposure; on regroup site recover organization gradually, on exit transfer only physically exited personnel. Persists until success/blocked; does not erase losses |
| `keep_reserve` / احتياط | Capable formation; safe staging position. Select -> reserve -> confirm (3) | Hold/reform, observe and preserve route; no autoarrival or replenishment. Persists until commit/change; risks arriving too late |
| `commit_reserve` / ادفع الاحتياط | Existing reserve; known reinforce/control zone. Select -> destination -> confirm (3) | Normal travel/facing/contact physics; order ends on arrival/role transition. Unseen interception can block; no bonus for the word reserve |
| `shoot` / ارمِ | Ranged role, ammo, known contact/area and currently clear shot. Select -> known target -> confirm (3) | Face and fire within range/LOS; may close only if explicit approach allowed. Persists while fire legal; bad angle, friendly blockage and target movement consume time, not imaginary hits |
| `conserve_ammo` / احفظ السهام | Ranged role; no target required. Select -> conserve -> confirm (3) | Hold fire/reposition only by explicit route; persists. Gives up pressure; no ammo regeneration |
| `breach_gate` / اكسر البوابة | **G2 deferred**: authorized equipment, reachable gate/wall target. Select -> gate -> confirm (3) | Move equipment, deploy, strike obstruction with time/resources until breach or invalidation. Breach is navigable opening only, not city ownership |

| Order | Default candidate fallback; failure/rejection reason | Exact additional events when condition occurs | Likely counter / future test |
|---|---|---|---|
| move_occupy | Hold if blocked; `NO_LEGAL_ROUTE`/`DESTINATION_BLOCKED` | `movement_started`, `movement_progress`, `movement_blocked`, `control_changed`, `order_completed` | Screen destination; `ORD-MOVE-01` |
| hold_defend | Regroup if cohesion breaks; `FORMATION_INCAPABLE` | `contact_started`, `cohesion_changed`, `fallback_activated` | Flank or objective bypass; `ORD-HOLD-01` |
| attack_assault | Hold at last known position if target lost; `TARGET_NOT_KNOWN`/`TARGET_LOST` | `contact_started`, `casualties_applied`, `contact_ended`, `order_invalidated` | Brace spears, reserve/withdraw; `ORD-ATTACK-01` |
| flank_route | Hold on detected dense spears; `ROUTE_BLOCKED` | `movement_progress`, `movement_blocked`, `contact_started`, `fallback_activated` | Reserves/intercept/cut return; `ORD-FLANK-01` |
| intercept_cover | Withdraw to own exit if cohesion below threshold; `COVER_ZONE_INVALID` | `contact_started`, `withdrawal_progress`, `order_completed` | Bypass frontage, ranged suppression; `ORD-COVER-01` |
| withdraw_regroup | Hold/regroup at nearest **declared** safe route node if blocked; `RETREAT_ROUTE_BLOCKED` | `withdrawal_started`, `withdrawal_progress`, `retreat_route_blocked`, `withdrawal_completed`, `personnel_transferred`, `rally_started`, `rally_completed` | Pursuit/cut route; `ORD-WITHDRAW-01` |
| keep_reserve | Hold if leader lost; `RESERVE_SITE_INVALID` | `order_maintained`, `succession_activated`, `fallback_activated` | Attack distant objective; `ORD-RESERVE-01` |
| commit_reserve | Hold if blocked; `NO_LEGAL_ROUTE` | `reserve_committed`, `movement_started`, `movement_progress`, `contact_started`, `order_completed` | Delay on narrow ground; `ORD-COMMIT-01` |
| shoot | Conserve if target lost; `NO_AMMO`/`LOS_BLOCKED` | `volley_fired`, `ammo_depleted`, `movement_blocked` only if approach blocked, `order_invalidated` if target invalid | Cover/friendly screen/close assault; `ORD-SHOOT-01` |
| conserve_ammo | Hold if threatened route blocked; `WRONG_ROLE` | `order_maintained`, `order_completed` on replacement | Close attack; `ORD-CONSERVE-01` |
| breach_gate | Hold when equipment unusable; `MISSING_EQUIPMENT`/`GATE_UNREACHABLE` | `equipment_changed`, `gate_damaged`, `breach_opened`, `order_completed`; **no city transfer** | Repair/defend interior; `ORD-BREACH-01`, QA08 |

No default fallback quietly adds a second conditional chain. Each order has **one** selected condition/action. Safety/capability constraints still apply unconditionally (cannot walk through a wall or fire empty bow). For withdraw, a safe route-node fallback must be explicit in the initial route; the engine cannot reveal a hidden safe path. A completion event means the order task ended, not the battle ended. Every future test in the table is PENDING IMPLEMENTATION.

<a id="order-lifecycle"></a>
## 6. Lifecycle, validation and abnormal situations

```text
draft -> confirmed/new -> sealed -> delayed -> active -> completed
   |          |                         |        |
 cancel     reject                   failed   invalid/fallback
                                               |
                               maintained at next planning boundary
```

Drafts are UI-only and undoable during planning. Submitted invalid input returns structured errors and does not replace the old valid order. A maintained order is a new-round provenance/status projection of the same physical instruction, not a reset of route/ammo/charge. A delivered replacement atomically cancels the prior active instruction and preserves effects already incurred. Event reasons distinguish player cancellation, target invalidation, delivery failure, physical blocking, completion and normal maintenance. Mode cannot change during battle.

| Situation | Engine behavior and visible feedback | Future check |
|---|---|---|
| Invalid/hidden target at submission | `order_rejected/TARGET_NOT_KNOWN`; keep old order; preview never resolves hidden ID | `ORD-FOG-01` |
| Target moved after submission | Recompute authorized pursuit toward currently observed position; if lost, last-seen point + uncertainty; `order_invalidated/TARGET_LOST` only when task no longer legal | `ORD-STALE-01` |
| Path blocked after seal | Stop before collision; `movement_blocked/ROUTE_BLOCKED`; one fallback may activate; next round adjust | `ORD-BLOCK-01` |
| Flank intercepted | Contact and facing resolve at real location; `contact_started/FLANK_INTERCEPTED`; no remote strike on intended center | `ORD-INTERCEPT-01` |
| Formation breaks up | Record cohesion/routing, lose organized action; retain people/route; local retreat policy takes over | `ORD-BREAK-01` |
| Commander lost in transit | Existing delivered orders persist; pending orders revalidate sender/succession; `command_failed/ISSUER_INCAPACITATED` or `succession_activated` | `ORD-LEADER-01` |
| Message cannot reach unit | `order_delayed/COMMAND_ROUTE_BLOCKED`; if declared expiry reached `command_failed/MESSAGE_EXPIRED`; old order/local fallback remains | `ORD-MESSAGE-01` |
| No legal action / all incapable | Show explicit capability reason and legal review/retreat possibilities; objective engine decides continuation, no frozen UI or invented winner | `ORD-INCAPABLE-01` |
| Duplicate/reentrant command | Same ID+payload idempotent; different payload same ID rejects; no duplicated ammunition or movement | `ORD-REPEAT-01` |
| Cancel spam | Cannot retract a sealed action retroactively; latency/reformation/fatigue persist; next legal cancellation replaces only future behavior | `ORD-CANCEL-01` |

A message's lateness is deterministic: distance/path, known communication obstruction and competence profile; a failed message is physically interrupted or its sender incapacitated, not an invisible lottery. G1 prototype communication is local battlefield timing only; campaign roads/mail are deferred G2.

<a id="observation-contract"></a>
## 7. Truth, knowledge and fair risk

Authoritative state knows every formation, actual count, sealed order, personnel identity and contact. An active player or AI sees only its `Observation` projection. Own orders/capability are exact; distant enemy numbers are ranges or unknown, and enemy orders are never disclosed before execution. Prebattle terrain geography/mission constraints may be published; dynamic hidden enemy occupancy and hidden gate changes are not automatically known. LOS and detection use the same rules for both sides.

Candidate deterministic visibility: compare observer/target footprint sample points (center plus four corners) against range, terrain surface height, woods opacity and obstacle polygons. A contact is visible if any permitted observer-target sample ray clears the versioned occlusion test. Range and sample selection are proposed rule data, not final realism claims. Enemy counts start as role-based intervals until identification criteria permit a narrower estimate; estimates never silently become true engine counts. Hidden contact `positionRadiusDm` grows with `ageTicks * knownMaximumSpeedDmPerTick` plus initial uncertainty, clipped to navigable known terrain. It is a **possible region**, not a revealed route. Confidence decays by published age bands; exact bands await tuning.

```json
{
  "contactId":"CONTACT-D-WEST","knownFormationId":null,
  "lastSeenTick":80,"lastSeenPosition":{"x":1800,"y":5000},
  "positionRadiusDm":120,"countRange":{"min":150,"max":300},
  "roleEstimate":"shock_cavalry","confidence":"medium",
  "detection":"last_seen","observedFacing":128,"observedCondition":"disordered"
}
```

Risk preview uses this observation, own readiness, known geometry and declared route: range/time interval, known spear contact, possible obstruction, retreat exposure. It may say «طريق الالتفاف مكشوف؛ آخر رصد لفرسان هنا» with age/estimate. It must not say a hidden reserve will arrive at an exact future tick. Numeric risk ceilings constrain planner choices; they are not a success probability claim without validated calibration. UI own-unit counts are exact; opposing losses remain estimated until enough evidence or postbattle inspection exists.

At review, show observed changes and causal event excerpts, not enemy sealed commands. A casualty cause can be «رمي من جهة الغابة» before the firing banner is identified. Preserve source evidence internally; don't substitute an invented named unit. Hidden events never appear as empty visible timeline slots: UI assigns consecutive observer-local indices, while internal `perceivedEventSeqs` retains global references for audit. Postbattle full replay can reveal hidden truth, explicitly labeled, and can toggle back to knowledge-at-the-time. It must never rewrite the original risk preview or imply the human should have known a concealed plan.

Future checks: `FOG-LOS-01` blocked rays hide formation and detailed orders; `FOG-AGE-01` stale region grows without tracking truth; `FOG-MODE-01` AI sees exactly its projector output; `FOG-REPORT-01` a causal report redacts unknown identity; `FOG-REPLAY-01` full replay remains separate from historical observation. All PENDING.

<a id="event-contract"></a>
## 8. Event/evidence schema and exact vocabulary

```typescript
type JSONValue = null|boolean|number|string|JSONValue[]|{[key:string]:JSONValue};
type BattleEvent = {
  seq: Int; tick: Int; type: Id; actorId: Id|null; targetIds: Id[];
  position: Vec2|null; reasonCode: Id; causes: Int[];
  before: {[key:string]:JSONValue}|null; after: {[key:string]:JSONValue}|null;
  objectiveContributions: Array<{objectiveId: Id; predicateId: Id; delta: Int}>;
  visibility: {knownTo: SideId[]; revealAtConclusion: boolean};
};
```

A reason code is machine-readable and localization-friendly. The report maps `reasonCode` to a translation key and arguments after projection, e.g. `RETREAT_ROUTE_BLOCKED -> battle.reason.retreat_route_blocked -> طريق الانسحاب مقطوع`. Event type describes **what changed**; reason describes **why**, with causes referring to actual events. A report never infers a reserve arrival without movement/contact evidence. Before/after use only relevant authoritative fields; no unexplained narrative strings. Objective contributions reference an existing predicate, not a hidden score.

The following order within each row defines the proposed `eventTypeRank`; rank is `stage*100 + zero-based position within row`. New types require versioned registry changes. Sorting by rank controls serialization only, never side action precedence.

| Stage | Exact types in rank order | Example reason codes |
|---|---|---|
| 0 orders/delivery | `order_submitted`, `order_maintained`, `order_rejected`, `order_delayed`, `order_delivered`, `order_canceled`, `order_completed`, `order_invalidated`, `fallback_activated`, `command_failed`, `message_intercepted` | `PLAYER_ORDER`, `COMMAND_IN_TRANSIT`, `TARGET_LOST`, `ROUTE_BLOCKED`, `MESSAGE_EXPIRED`, `ISSUER_INCAPACITATED` |
| 1 movement/contact | `movement_started`, `movement_progress`, `movement_blocked`, `contact_started`, `contact_ended`, `reserve_committed`, `withdrawal_started`, `withdrawal_progress`, `withdrawal_completed`, `retreat_route_blocked` | `WAYPOINT_REACHED`, `FOOTPRINT_CONGESTION`, `FLANK_INTERCEPTED`, `EXIT_CROSSED` |
| 2 releases/resources/structures | `volley_fired`, `ammo_depleted`, `provisions_changed`, `equipment_changed`, `gate_damaged`, `breach_opened` | `CLEAR_SHOT`, `NO_AMMO`, `USE_WEAR`, `GATE_INTEGRITY_ZERO` |
| 3 personnel/leader | `casualties_applied`, `personnel_transferred`, `commander_injured`, `commander_captured`, `commander_killed`, `surrender_accepted` | `MELEE_EXPOSURE`, `RANGED_EXPOSURE`, `PHYSICAL_CUSTODY`, `OBSERVED_DISPERSAL` |
| 4 organization | `morale_changed`, `cohesion_changed`, `fatigue_changed`, `formation_routing`, `rally_started`, `rally_completed`, `succession_activated` | `LOCAL_CASUALTY_SHOCK`, `REAR_CONTACT`, `EXHAUSTION`, `SUCCESSOR_AVAILABLE` |
| 5 knowledge/objectives | `observation_updated`, `control_changed`, `objective_progress`, `objective_fulfilled` | `DIRECT_LOS`, `LAST_SEEN_AGED`, `UNCONTESTED_PRESENCE`, `DECLARED_PREDICATE_MET` |
| 6 boundary/result | `execution_window_ended`, `battle_ended`, `technical_interrupted`, `checkpoint_created` | `DECISION_WINDOW_COMPLETE`, declared objective/ending code from 06, `STATE_VALIDATION_FAILED`, `ATOMIC_CHECKPOINT` |

Some events arise after their nominal stage's calculations (e.g. surrender eligibility after morale). They are computed before commit and their explicit causes preserve dependency; serialization rank does not claim a within-tick causal timestamp. Cause references must be acyclic and may refer to a later seq in the same tick when rank sorts presentation differently. A consumer must not apply physical effects by replaying row order; it uses committed state/deltas.

Representative **hand-authored event component**, not claimed execution evidence:

```json
{
  "seq":42,"tick":120,"type":"movement_blocked","actorId":"A-SWORD",
  "targetIds":["D-RESERVE"],"position":{"x":1800,"y":4900},
  "reasonCode":"FLANK_INTERCEPTED","causes":[40,41],
  "before":{"pathIndex":1,"engagement":"free"},
  "after":{"pathIndex":1,"engagement":"contact"},
  "objectiveContributions":[],
  "visibility":{"knownTo":["attacker","defender"],"revealAtConclusion":true}
}
```

In a real event log, 40 and 41 must exist and justify contact; the component does not assert that they occurred. G1A telemetry must log physical state revisions, order revisions/delays, distance traveled, contact flank classification, resource deltas, personnel transfers, exposed observations, objective predicate evaluations and review triggers. A missing causal reference fails validation; it is not repaired by prose.

## 9. Required future contract checks

All are **DESIGNED / PENDING IMPLEMENTATION**: valid component round-trip; reject unknown schemas/rules and bad personnel partitions; ledger/count equality at every tick; commander casualty counted once; captured origin/custody separation; per-resource conservation; stale order invalidation; unchanged order persistence; exactly one fallback; duplicate batches idempotent; same detailed orders across source modes produce equal physical hashes; fog projector rejects omniscient planner input; full result only at a legitimate terminal boundary; corrupted events rejected; no unsupported China scenario or save overwrite. Detailed QA IDs and phases are in [11](11-qa-and-failure-matrix.md).
