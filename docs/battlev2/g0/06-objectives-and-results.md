# 06 — Objectives and results / الأهداف وعقد النتيجة

**DESIGNED / PENDING IMPLEMENTATION / OWNER REVIEW.** All schemas, predicates, quantities, durations and thresholds below are PROPOSED. Sources: V3 §5.6.3; V3.3 §3; V3.4 handoff §5; G0 assignment §§9–10. [Authority](01-authority-and-requirements.md) · [State](04-state-and-commands.md) · [Integration](10-future-phase-contracts.md).

<a id="result-separation"></a>
## 1. Independent meanings

`outcome` = نتيجة المهمة; `fieldControl` = السيطرة الميدانية; `personnel` = مصير الرجال; `withdrawal` = الانسحاب الفعلي. Success in one does not imply another. The canonical wire field is **outcome** with V3.3 values. V3.4's **objectiveOutcome is a conceptual alias only**: never serialize two disagreeing fields. Reject payloads containing both. `winner=null` is never a cancellation code.

Active battle: `getResult() -> null`. Completed legitimate standoff: `status=completed, outcome=unresolved` with all losses. `interrupted` is a technical fault with verified recovery state, never a draw; campaign effect application is forbidden until completed. `suspended` is legal only after resume capability has actually been implemented and verified. G0 promises no working suspension.

Objective evaluation uses one completed simultaneous microtick. A CPU chunk, animation or round ending is not a terminal predicate. Daylight/mission deadlines must be published in immutable initial mission rules; they may end unresolved or yield a defender success only when the objective explicitly says so beforehand. No hidden score selects a winner.

<a id="objective-predicates"></a>
## 2. Proposed predicates

```ts
// SPECULATIVE contract, pending owner P01/P02 and implementation.
type Predicate =
 | {kind:'control';zoneId:string;side:Side;continuousTicks:number}
 | {kind:'crossed';groupId:string;exitId:string;requiredPersonnel:number}
 | {kind:'routeOpen';routeId:string;side:Side;traversableWidthDm:number}
 | {kind:'withdrawn';side:Side;exitId:string}
 | {kind:'incapable';side:Side;recoveryPossible:false}
 | {kind:'surrenderAccepted';authorityId:string;scopeId:string}
 | {kind:'deadline';tick:number;child:Predicate}
 | {kind:'all'|'any';children:Predicate[]};
```

`control` provisionally requires organized active footprint occupying the marked zone via a legal route and no qualifying enemy contest. Routed passers-by cannot establish control. Qualifying reach/contact denying occupation is recorded geometrically; a distant banner cannot pin the entire map. A declared dwell, if selected, resets on a contested tick. There is no approved universal dwell.

Pilot default recommendation: A must control **HILL-CROWN and NORTH-APPROACH**, with no viable D contest because D has physically withdrawn/conceded the goal or lost organized ability without feasible recovery. D succeeds when A withdraws or cannot continue its goal and D controls HILL-CROWN. Brief occupation alone does not finish. A published hold-duration objective is an alternative awaiting approval, not an additional silent rule. References to [07](07-wing-collapse-regression.md) and [08](08-g1a-prototype-brief.md) use this default. If both remain viable, continue decision rounds until a legitimate disclosed daylight/ability condition. The two pilot FixtureSpecs propose starting20 simulated minutes before sunset, with declaredDaylightEndTick4800 at250ms. Resolve that tick physically and evaluate objectives first; absent a fulfilled objective, public sunset completes unresolved with real losses. This P02 proposal is neither a universal approved duration nor a defender-win timer.

Validate mission predicates at creation: references exist, thresholds are nonnegative, objectives cannot contradict their own geometry. Evaluate both sides together. Mutually exclusive objectives require a declared tie policy; proposed default is unresolved/contested with both evidence sets, not ID-based victory. Compatible objectives (convoy escapes while enemy controls abandoned ground) retain both facts and use the predeclared primary mission to derive outcome. Reject an ambiguous mission configuration before combat rather than invent a priority after results.

<a id="terminal-modes"></a>
## 3. Six ending modes

| Mode | Required evidence | Outcome/control distinction | Negative oracle |
|---|---|---|---|
| T1 Field collapse | Organized ability lost, routing/surrender, no capable reserve/recovery under declared rules | Mission predicate still required; men may be alive | One broken wing is insufficient (QA07) |
| T2 Battlefield control | Required zone occupied; enemy unable/unwilling to contest | Record actual zones; only mission-linked control settles objective | Distant viable reserve must be evaluated (X10) |
| T3 Orderly withdrawal | Legal route traveled, rear guard and actual exit | Objective can fail with many survivors; abandoned field passes only if control holds | Blocked route cannot be reported as safe exit (X07) |
| T4 Standoff / mutual withdrawal | Public daylight/ability condition, or both sides physically withdrew | `unresolved` or `mutual_withdrawal`; contested/vacated as observed | CPU/round cutoff alone cannot end (X02/X06) |
| T5 Successful assault | Actual gate/critical-point occupation satisfying declared assault condition, or accepted surrender | City ownership is separately gated in G2 | Unoccupied breach cannot capture city (QA08) |
| T6 Failed assault / repelled attack | Objective unmet plus withdrawal/incapacity under declared rules | Defender objective only if declared; siege can remain | Repulse neither annihilates army nor necessarily lifts siege (X18) |

Commander injury/death/capture triggers logged succession and instruction fallback, not automatic defeat. Simultaneous double collapse applies both casualty ledgers first, then assesses reserves, recovery, control and ability. No first-processed side wins. A technical fault is `interrupted`, not T4.

Pursuit is actual legal movement/contact before finalization within declared encounter bounds. No abstract extra deaths outside reach. G2 may transfer pursuit beyond boundaries to a subsequent encounter, conserving identities/resources and preventing loss duplication; that transfer remains DEFERRED. Surrender needs recorded authority or formation surrender, captor control/contact and an actual personnel transfer. Capture rates are not fixed here.

<a id="six-missions"></a>
## 4. Six mission compatibility contracts

| ID | Geometry / declared goal | Success; failure; unresolved | Independent field and future effects |
|---|---|---|---|
| M1 Open field | Hill crown, approach, deployment, exits; §2 predicates | Qualifying control and no viable contest; own withdrawal/incapacity; valid standoff | Apply real army losses/positions; **only mandatory G1A mission** |
| M2 Transit interception | Road entry/exit, bypass, intercept corridor; prevent required force crossing until declared transit condition | Interdict crossing; target crosses; remaining trapped force inconclusive | Target can cross losing ground; preserve traveled distance/delay, no history rewind |
| M3 Hold pass | Narrow passage, impassable sides, rear route; deny crossing until known tick/event | Denial at deadline; qualifying enemy crossing before it; technical halt is not success | Defender can succeed then retreat; record road access/time gained |
| M4 Caravan protection/ambush | Convoy route, cargo origin/storage, safe exit; escort specified cargo/personnel | Required crossing; captured/destroyed cargo under declared threshold; trapped cargo at legitimate standoff | Caravan may escape while escort loses ground; unique lots debit/credit stores once, measured disruption to trade/finance |
| M5 Siege relief | Blockade arcs, city gate, supply corridor; open required capacity and deliver supply | Actual route traversal; relief withdraws/route stays blocked; contested access unresolved | Winning field need not lift all siege arcs; retain siege positions and real delivered supplies |
| M6 City assault | Gate/walls/breach, garrison, critical interior zones, exits | Actual qualifying occupation/surrender; repelled withdrawal/incapacity; contested breach continues | Breach changes terrain only; ownership requires approved occupation trigger |

M2–M6 remain DESIGN COMPATIBILITY / DEFERRED G2C. M4 forwards measured cargo/route facts to economic adapters; H owns final prices/rewards. G2A establishes result semantics and removes legacy paths; G2C deepens siege and remaining missions. No final art, additional factions or China battles. 715 CE troop roles are design abstractions awaiting content review, not independently verified historical rosters.

<a id="result-contract"></a>
## 5. Speculative result schema

```ts
// PROPOSED. Side = 'attacker'|'defender'. Integers are bounded/nonnegative.
type Personnel={starting:number;active:number;wounded:number;routed:number;captured:number;missing:number;dead:number};
type FormationResult={id:string;side:Side;personnel:Personnel;commanderId:string;
 condition:{morale:number;cohesion:number;readiness:number;fatigue:number};
 resources:{ammo:ResourceLedger;provisions:ResourceLedger;equipment:ResourceLedger};
 positionDm:[number,number];stance:string;engagement:string;lastOrderId:string};
type ResourceLedger={before:number;consumed:number;lost:number;after:number;
 incoming?:number;transferredOut?:number;transferEntryIds?:string[]};
type CompletedResult={schemaVersion:string;encounterId:string;scenarioId:string;fixtureId?:string;
 rulesVersion:string;seed:number;initialStateHash:string;finalStateHash:string;
 status:'completed';
 outcome:'attacker_objective'|'defender_objective'|'mutual_withdrawal'|'unresolved';
 fieldControl:'attacker'|'defender'|'contested'|'vacated';terminalMode:string|null;
 duration:{microticks:number;microtickMs:number};withdrawal:Withdrawal[];objectives:ObjectiveRecord[];
 sides:{side:Side;personnel:Personnel;formationIds:string[]}[];formations:FormationResult[];
 commanderFates:CommanderFate[];reasonCode:string;evidence:Evidence[];
 ordersLog:ReportOrderProjection[];eventsLog:ReportEventProjection[];replay:ReplayReference;
 logProjection?:'excerpts_require_complete_replay';
 campaignEffects:{status:'proposal_only';items:EffectProposal[]}};
type RecoveryEnvelope={schemaVersion:string;encounterId:string;
 status:'suspended'|'interrupted';checkpointRef:string;checkpointHash:string;
 reasonCode:string;resumeSupported:boolean}; // no outcome or campaign effects
type ResultOrRecovery=CompletedResult|RecoveryEnvelope;
```

`Withdrawal`: side, why, routeId, quality `orderly|disorderly|forced`, eventIds. `ObjectiveRecord`: declared Predicate and fulfilled/failed/unresolved plus evidence IDs. `CommanderFate`: stable ID, ledger membership, injury/capture/death, severity, event and successor. Commanders counted in manpower never become extra soldiers. `Evidence`: tick, coordinates, source/target, before/after state references and objective/route/gate facts. Canonical replay orders/events conform to [04](04-state-and-commands.md). Result log excerpts are separately typed read-only ReportOrderProjection/ReportEventProjection (mapping below); they are not accepted as resolver inputs. Replay references must resolve to complete same-encounter state/orders/events. Hashes are canonical SHA-256 in production. `pending:` strings below are **uncomputed placeholders rejected by a production validator**, not fake simulated hashes.

<a id="result-example"></a>
## 6. Full aggregate specimen, G0-RESULT-900

This independent illustrative end state is not an asserted output from the G1A scripts. Its coordinates/IDs belong to its own example. Condition values 0–1000, counts, duration and resources are provisional. Complete ledgers and reports must be replay-produced later. Log excerpts are explicitly marked and require the complete referenced replay before ingestion.

```json
{
 "schemaVersion":"battlev2.result/0-proposal","encounterId":"G0-RESULT-900","scenarioId":"umayyad","fixtureId":"G0-RESULT-900","rulesVersion":"g0-proposed-1","seed":715001,
 "initialStateHash":"pending:initial-state","finalStateHash":"pending:final-state",
 "status":"completed","outcome":"defender_objective","fieldControl":"defender","terminalMode":"orderly_withdrawal","duration":{"microticks":480,"microtickMs":250},
 "withdrawal":[{"side":"attacker","why":"OBJECTIVE_CONCEDED","routeId":"west-exit","quality":"orderly","eventIds":["e478","e479"]}],
 "objectives":[
  {"id":"take-hill","side":"attacker","declared":{"kind":"all","children":[{"kind":"control","zoneId":"hill","side":"attacker","continuousTicks":0},{"kind":"withdrawn","side":"defender","exitId":"east-exit"}]},"state":"failed","evidenceIds":["e479"]},
  {"id":"deny-hill","side":"defender","declared":{"kind":"all","children":[{"kind":"control","zoneId":"hill","side":"defender","continuousTicks":0},{"kind":"withdrawn","side":"attacker","exitId":"west-exit"}]},"state":"fulfilled","evidenceIds":["e477","e479"]}
 ],
 "sides":[
  {"side":"attacker","personnel":{"starting":1400,"active":900,"wounded":180,"routed":100,"captured":40,"missing":30,"dead":150},"formationIds":["A-C","A-L","A-R","A-B","A-V"]},
  {"side":"defender","personnel":{"starting":1600,"active":1300,"wounded":120,"routed":60,"captured":20,"missing":10,"dead":90},"formationIds":["D-C","D-L","D-R","D-B","D-V"]}
 ],
 "formations":[
  {"id":"A-C","side":"attacker","personnel":{"starting":500,"active":350,"wounded":60,"routed":30,"captured":10,"missing":10,"dead":40},"commanderId":"AC","condition":{"morale":570,"cohesion":650,"readiness":600,"fatigue":650},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":500,"consumed":40,"lost":10,"after":450},"equipment":{"before":500,"consumed":20,"lost":30,"after":450}},"positionDm":[0,2400],"stance":"withdraw","engagement":"exited","lastOrderId":"o-A-C"},
  {"id":"A-L","side":"attacker","personnel":{"starting":300,"active":180,"wounded":40,"routed":20,"captured":10,"missing":10,"dead":40},"commanderId":"AC","condition":{"morale":550,"cohesion":600,"readiness":600,"fatigue":650},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":300,"consumed":25,"lost":5,"after":270},"equipment":{"before":300,"consumed":15,"lost":25,"after":260}},"positionDm":[0,2300],"stance":"withdraw","engagement":"exited","lastOrderId":"o-A-L"},
  {"id":"A-R","side":"attacker","personnel":{"starting":250,"active":140,"wounded":40,"routed":30,"captured":10,"missing":0,"dead":30},"commanderId":"AC","condition":{"morale":490,"cohesion":550,"readiness":550,"fatigue":700},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":250,"consumed":20,"lost":10,"after":220},"equipment":{"before":250,"consumed":10,"lost":20,"after":220}},"positionDm":[0,2500],"stance":"withdraw","engagement":"exited","lastOrderId":"o-A-R"},
  {"id":"A-B","side":"attacker","personnel":{"starting":200,"active":120,"wounded":30,"routed":20,"captured":0,"missing":10,"dead":20},"commanderId":"AC","condition":{"morale":550,"cohesion":600,"readiness":650,"fatigue":600},"resources":{"ammo":{"before":4000,"consumed":2800,"lost":200,"after":1000},"provisions":{"before":200,"consumed":15,"lost":5,"after":180},"equipment":{"before":200,"consumed":10,"lost":10,"after":180}},"positionDm":[0,2200],"stance":"withdraw","engagement":"exited","lastOrderId":"o-A-B"},
  {"id":"A-V","side":"attacker","personnel":{"starting":150,"active":110,"wounded":10,"routed":0,"captured":10,"missing":0,"dead":20},"commanderId":"AC","condition":{"morale":600,"cohesion":700,"readiness":650,"fatigue":500},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":150,"consumed":10,"lost":0,"after":140},"equipment":{"before":150,"consumed":5,"lost":5,"after":140}},"positionDm":[0,2600],"stance":"cover_retreat","engagement":"exited","lastOrderId":"o-A-V"},
  {"id":"D-C","side":"defender","personnel":{"starting":550,"active":470,"wounded":40,"routed":10,"captured":0,"missing":0,"dead":30},"commanderId":"DC","condition":{"morale":750,"cohesion":780,"readiness":650,"fatigue":600},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":550,"consumed":40,"lost":10,"after":500},"equipment":{"before":550,"consumed":10,"lost":20,"after":520}},"positionDm":[4000,2500],"stance":"hold","engagement":"free","lastOrderId":"o-D-C"},
  {"id":"D-L","side":"defender","personnel":{"starting":300,"active":260,"wounded":15,"routed":10,"captured":5,"missing":0,"dead":10},"commanderId":"DC","condition":{"morale":700,"cohesion":700,"readiness":650,"fatigue":650},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":300,"consumed":25,"lost":5,"after":270},"equipment":{"before":300,"consumed":5,"lost":5,"after":290}},"positionDm":[4200,3100],"stance":"hold","engagement":"free","lastOrderId":"o-D-L"},
  {"id":"D-R","side":"defender","personnel":{"starting":250,"active":150,"wounded":40,"routed":30,"captured":10,"missing":5,"dead":15},"commanderId":"DC","condition":{"morale":450,"cohesion":420,"readiness":450,"fatigue":800},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":250,"consumed":20,"lost":10,"after":220},"equipment":{"before":250,"consumed":10,"lost":15,"after":225}},"positionDm":[5700,1700],"stance":"regroup","engagement":"regrouping","lastOrderId":"o-D-R"},
  {"id":"D-B","side":"defender","personnel":{"starting":250,"active":210,"wounded":15,"routed":10,"captured":5,"missing":0,"dead":10},"commanderId":"DC","condition":{"morale":700,"cohesion":720,"readiness":600,"fatigue":600},"resources":{"ammo":{"before":5000,"consumed":3000,"lost":100,"after":1900},"provisions":{"before":250,"consumed":20,"lost":5,"after":225},"equipment":{"before":250,"consumed":5,"lost":5,"after":240}},"positionDm":[4600,2300],"stance":"conserve_ammo","engagement":"free","lastOrderId":"o-D-B"},
  {"id":"D-V","side":"defender","personnel":{"starting":250,"active":210,"wounded":10,"routed":0,"captured":0,"missing":5,"dead":25},"commanderId":"DC","condition":{"morale":700,"cohesion":730,"readiness":650,"fatigue":650},"resources":{"ammo":{"before":0,"consumed":0,"lost":0,"after":0},"provisions":{"before":250,"consumed":20,"lost":0,"after":230},"equipment":{"before":250,"consumed":5,"lost":10,"after":235}},"positionDm":[4000,1900],"stance":"hold","engagement":"free","lastOrderId":"o-D-V"}
 ],
 "commanderFates":[{"id":"AC","ledgerFormationId":"A-C","countedInPersonnel":true,"fate":"wounded","severity":"light-proposed","eventId":"e350","successorId":"AC2"},{"id":"DC","ledgerFormationId":"D-C","countedInPersonnel":true,"fate":"alive","severity":null,"eventId":null,"successorId":null}],
 "reasonCode":"OBJECTIVE_CONCEDED_AFTER_WITHDRAWAL",
 "evidence":[{"eventId":"e350","tick":350,"atDm":[2800,2500],"sourceId":"AC","targetIds":["A-C"],"fact":"commander_injured","beforeRef":"snapshot/349","afterRef":"snapshot/350","objectiveId":null},{"eventId":"e477","tick":477,"atDm":[4000,2500],"sourceId":"D-C","targetIds":["hill"],"fact":"control_changed","beforeRef":"snapshot/476","afterRef":"snapshot/477","objectiveId":"deny-hill"},{"eventId":"e479","tick":479,"atDm":[0,2500],"sourceId":"A-V","targetIds":["west-exit"],"fact":"last_organized_formation_exited","beforeRef":"snapshot/478","afterRef":"snapshot/479","objectiveId":"deny-hill"}],
 "logProjection":"excerpts_require_complete_replay",
 "ordersLog":[{"id":"o-A-C","formationId":"A-C","mode":"manual","issuerId":"owner","observationHash":"pending:obs-400","issuedTick":400,"deliveredTick":404,"canceledTick":null,"type":"withdraw","routeId":"west-exit","fallback":"hold_if_blocked","state":"completed","reasonCode":"EXIT_REACHED"}],
 "eventsLog":[{"id":"e478","tick":478,"type":"withdrawal_progress","sourceId":"A-C","targetIds":["west-exit"],"atDm":[0,2400],"reasonCode":"EXIT_REACHED"},{"id":"e479","tick":479,"type":"withdrawal_completed","sourceId":"A-V","targetIds":["west-exit"],"atDm":[0,2500],"reasonCode":"LAST_ORGANIZED_FORMATION_EXITED"},{"id":"e480","tick":480,"type":"battle_ended","sourceId":null,"targetIds":["take-hill","deny-hill"],"atDm":[0,2500],"reasonCode":"OBJECTIVE_CONCEDED_AFTER_WITHDRAWAL"}],
 "replay":{"initialStateRef":"G0-RESULT-900/initial","ordersRef":"G0-RESULT-900/all-orders","eventsRef":"G0-RESULT-900/all-events","rulesBuild":"g0-proposed-1","eventChainHash":"pending:full-replay"},
 "campaignEffects":{"status":"proposal_only","items":[{"kind":"replace_army_ledger","armyId":"army-A","fromResultSide":"attacker"},{"kind":"replace_army_ledger","armyId":"army-D","fromResultSide":"defender"},{"kind":"record_commander_fate","commanderId":"AC","eventId":"e350"}]}
}
```

Equipment consumed means worn/destroyed; units are proposed pieces, arrows, provision portions. `before=consumed+lost+after`. Captured supplies require paired transfer entries, not independent new stock. Result projections above are human-review examples; missing replay material cannot pass an ingestion validator. The full runtime contract requires every event, order and reference to resolve.

<a id="conservation"></a>
## 7. Conservation and application

For G1, original formation roster membership is immutable: `starting = active+wounded+routed+captured+missing+dead`. Interformation personnel transfers are rejected; category changes preserve original identity/formation. Future G2 roster reorganization would require a new versioned identity-aware contract and owner review, not an undeclared transfer field. Sum each category across formations to its side. In this specimen all900 active survivors are additionally asserted organized, adequately ready and disengaged at the exit, so its derived combatReady is900. Generally active is not combatReady: an active person can still belong to a routing/disordered formation. **900 active survivors is not900 total living people**: wounded, routed and captives also survive; missing remains unknown. Routing flags must not double-count active men in routed. A wounded-to-active or routed-to-active transition requires a logged real recovery/rally process; serialization/load grants none. Captives retain original identity and do not become free captor manpower.

G2A transactional application: validate payload/encounter identity, rules and full replay hashes independently of current campaign revisions; calculate its full-result digest; check the appliedEncounterIds receipt first and return an identical prior receipt on retry (reject a different payload on the same ID). Only for a new encounter validate input army revisions, derive deltas and enforce personnel/resources, then commit deltas and the receipt atomically. Retry returns the saved receipt. A used encounter ID with different payload fails. Persistence failure restores the exact pre-application snapshot, not fresh prebattle troops. Draw/standoff applies losses. Capture/retreat/siege effects depend on actual predicates, not `winner` truthiness.

M6 alone can change city ownership under approved control/surrender rules. M5 may deliver supply without lifting every blockade arc. M6 repulse may preserve siege if besiegers remain supplied/in place. G2 retreat chooses a legal campaign location and keeps losses, wounds and pursuit context. [10](10-future-phase-contracts.md#future-save) records observed save boundaries and safe migration; no active BattleScene migration is promised without persisted source data.

<a id="causal-reports"></a>
## 8. Evidence-derived Arabic reports

| Localization key | Text / dependency |
|---|---|
| report.objective_conceded | «لم تحقق هدف المرتفع. خرجت آخر راية منظّمة، وبقي الخصم مسيطرًا على الهدف.» Only with control and exit evidence |
| report.survivors_active | «بقي 900 قادر على القتال؛ 180 جريحًا، 100 متفرق، 40 أسيرًا، 30 مفقودًا، و150 قتيلًا.» Exact ledger projection |
| report.reserve_arrived | «وصل احتياط الخصم إلى الممر.» Requires travel and arrival events; omit if absent |
| report.round_continues | «انتهت الجولة؛ المعركة مستمرة.» Execution window alone |
| report.unresolved | «لم يُحسم الهدف.» Only legitimate completed standoff |
| report.interrupted | «توقفت المحاكاة تقنيًا؛ لم تُحسم المعركة.» Verified recovery explanation, no defeat or refunded losses |

Enemy losses during battle remain observed intervals with last-seen time/confidence. Optional full postbattle replay can show truth while retaining each decision maker's historical observation. Reports do not retrofit intelligence into previous orders. Clarity and fun remain **PENDING** human/device evidence; see QA07/08/09/11 and X01–X20 in [11](11-qa-and-failure-matrix.md).

### Contract clarifications after consistency review

`getResult` returns a CompletedResult only after a genuine tactical terminal condition, otherwise null. Status/serialization may expose RecoveryEnvelope after an explicit supported suspend or technical interruption. That envelope has no tactical outcome and no campaign effects; it does not falsely encode unresolved. This discriminated union realizes V3.3's three statuses without calling a technical failure a draw.

Resource transfer totals are omitted only in explicitly no-transfer specimens such as G0-RESULT-900, where they default to zero. Full invariant: `before + incoming = consumed + lost + transferredOut + after`. A transfer entry has stable ID, tick, resource/unit, amount, fromLedgerId, toLedgerId, sourceEventId; both ledgers reference that ID and debit/credit the same quantity exactly once. Captured materiel becomes an incoming transfer only after a recorded capture, never an increase unpaired with a source.

The example's exit e479 and terminal e480 are distinct events. The full replay must include commander injury e350, an eligible-successor state and succession_activated event authorizing AC2; the excerpt is not sufficient evidence to ingest the result. Report rendering must resolve those records or reject the report, not invent succession.

Resource naming projection from04 is explicit: result before = state initial; result after = state remaining; result consumed = state spent; incoming and transferredOut preserve their meaning. Transfer entry IDs resolve the source event sequence refs in the complete ledger. No independently writable duplicate of a state resource is introduced.


### Read-only result projection types

The illustrative result deliberately uses human-report field names; the adapter mapping is explicit and one-way. `ReportOrderProjection = {id, formationId, mode, issuerId, observationHash, issuedTick, deliveredTick, canceledTick, type, routeId, fallback, state, reasonCode}`. Canonical04 `withdraw_regroup` maps to report `type: withdraw`; canonical `status: completed` maps to report `state: completed`; target exit/route resolves routeId. `hold_if_blocked` is the report summary of the single conditional fallback whose trigger is route_blocked and action hold; the full canonical order in the referenced replay is authoritative. These report tags cannot be fed back as canonical commands.

`ReportEventProjection = {id, tick, type, sourceId, targetIds, atDm, reasonCode}`. Map canonical seqN to report id eN, actorId to sourceId, position{x,y} to atDm[x,y]; type and reasonCode retain the canonical vocabulary. Evidence's `fact` is a semantic claim validated against event+state, not a renamed event type. `last_organized_formation_exited` is supported by withdrawal_completed plus ledger/exit state; it is not a new resolver event.

FormationResult is also a report projection: stance holds order intent (`hold`, `withdraw`, `regroup`, `cover_retreat`, `conserve_ammo`), while canonical formation stance remains the physical stance enum in04. Report engagement `exited` means a completed exit record and no active contact; `regrouping` means a withdraw_regroup order plus observed regroup process. Neither is a new canonical engagement enum. The adapter must derive these tags from the actual order, canonical stance/engagement and evidence, never mutate physics to match prose. Last-order IDs not repeated in the excerpt resolve through replay.ordersRef; omitted evidence/succession/state snapshots resolve through replay.eventsRef/initialStateRef and verified checkpoint series. Unresolved refs fail validation. Example hashes and external refs remain PENDING runtime evidence, explicitly distinct from this document's parse/arithmetic checks.
