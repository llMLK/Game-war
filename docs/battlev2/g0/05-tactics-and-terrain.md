# 05 — Physical tactics and terrain / التكتيك والتضاريس

**G0 proposals, no implementation.** Actual positioning, flank opportunities, reserves, morale/cohesion, meaningful retreat, equal AI rules and terrain geometry are LOCKED (V3 §5.6.2–5.6.4; replacement assignment §§3, 7, 12, 15). The equations, thresholds, spatial representation, personnel model and every number here are **PROPOSED P03/P04/P05**, pending owner review. They are deliberately explicit so future code can be reviewed; specificity is not approval, balance evidence or historical verification. Compare alternatives in [12](12-decisions-and-risks.md). [03](03-engine-architecture.md) governs simultaneous arithmetic; [04](04-state-and-commands.md) governs schema/orders; [06](06-objectives-and-results.md) governs ends.

<a id="physical-rules"></a>
## 1. Movement, formation shape and contact

Candidate space is continuous fixed-point geometry in integer decimetres. A banner represents a physical oriented rectangle, not a legacy left/center/right sector or a single point. Role describes equipment and behavior; it does not confer terrain-independent strength. The initial pilot uses five banners per side. More role types below are compatibility designs, not permission to enlarge G1A.

For active men N, frontage F and spacing s, `files=max(1,floor(F/s))`, `ranks=ceil(N/files)`, and `minimumDepth=ranks*s`. Actual depth must be at least minimumDepth; loose formation slack is explicit geometry. F and depth change only through timed reformation. Losing men does not instantly compress the rectangle or magically fill a gap. A proposed reformation tick changes frontage by at most a rules-table amount; sweep checks also apply to reshaping. Larger frontage creates a longer line but fewer supporting ranks and a wider terrain requirement. Denser files improve contact capacity but worsen congestion and vulnerability to disruption. Rank/spacing representation is a modeling choice, not a historical claim about exact formations.

Proposed speed calculation, evaluated from the shared snapshot:

```text
fatigueFactor = max(250, 1000 - floor(fatigue*3/4))
cohesionFactor = max(400, cohesion)
loadFactor = published role/load value in 0..1000
terrainFactor = minimum permitted speed factor across swept footprint
speedDmPerSecond = floor(baseSpeed * fatigueFactor * cohesionFactor
                         * loadFactor * terrainFactor / 1000^4)
distanceNumerator = speedDmPerSecond * microtickMs + distanceCarry
distanceThisTick = floor(distanceNumerator / 1000)
distanceCarry = distanceNumerator mod 1000
```

A slow formation accumulates movement rather than rounding to permanent immobility. Facing turns by at most `turnBinsPerTick`; travel may begin only within a published angular tolerance of intended heading. Turning consumes time/fatigue and uses swept geometry, so cavalry cannot instantly reverse into a second charge. Integer direction vectors and vector remainders preserve consistent diagonal motion. Uphill/downhill costs derive from actual segment gradient; excessive slope is impassable for the role. An order cannot walk straight through a forest/river while paying a damage penalty.

Path search proposal: deterministic visibility graph over expanded obstacle vertices and route portals; obstacles are expanded by the current footprint. Compare exact integer path costs; ties use coordinate/vertex ID order, not side. Re-evaluate if dynamic occupancy blocks the next corridor; keep old path history. Allied formation rectangles cannot overlap or phase through one another. A narrow passage requires smaller frontage/reformation or a different route. A stationary rear unit must move aside before a front unit can retreat through it. No superposition of several reserves on one banner.

Contact is created when legally facing attack reach intersects an enemy footprint after simultaneous movement. Frontage overlap controls how many men can apply pressure. Separate front/side/rear exposure uses the defender's forward-vector dot product with the direction toward contact: front if within proposed ±64 bins (±90 degrees), rear if beyond ±96 bins (±135 degrees), otherwise flank. Exact angular bounds remain tuning options. Reach is not teleportation: an attacker must actually be in the contact band and cannot strike through an ally or wall. Contact ends after distance exceeds weapon reach plus a published disengagement margin; canceled attack does not erase existing engagement.

### Candidate role table (fixture tuning only)

All values are provisional design inputs for future tuning, not verified historical statistics. Speeds are dm/s, reach is dm, hazard is Q16 per engaged attacker per second before modifiers.

| Role | Base speed | Reach / effective ranks | Base hazardQ16 | Physical distinction and constraint |
|---|---:|---|---:|---|
| spear infantry | 10 | 30 / 3 | 1536 | Can brace front against charging mounted contact; slow turn/narrowing |
| sword infantry | 12 | 15 / 2 | 2048 | Flexible close assault, must close inside spear reach |
| archers | 11 | 10 melee / 1 | 512 melee | Volley pressure requires ammo, LOS and range; no free shooting through friends |
| shock cavalry | 30 | 20 / 1 | 2048 | Charge requires run distance, clear route and organization; horses need space |
| horse archers | 26 | 10 melee / 1 | 512 melee | Reposition/shoot with explicit facing and ammunition; no omnidirectional endless fire |
| guard/reserve | 11 | 15 / 2 | 2048 | Reserve is an assignment, not hidden combat boost; actual equipment may override role profile |
| siege equipment | 4 | equipment-specific | no field default | G2; deployment, crews, route width and equipment condition required |

Where equipment and tactical role differ, weapon profile supplies reach/hazard; reserve stance alone changes no combat coefficients. No commander personal damage multiplier is present.

<a id="combat-formula"></a>
## 2. Simultaneous melee, charges, ranged fire and losses

### 2.1 Contact pressure candidate

For each valid attacker/target contact after common movement:

```text
filesInContact = floor(contactLengthDm / attacker.spacing)
engaged = min(attackerActiveNonLeader,
              filesInContact * weapon.effectiveRanks)
readinessFactor = max(250, attacker.readiness)
organizationFactor = max(200, attacker.cohesion)
exposureFactor = 1000 front, 1250 flank, 1500 rear    // proposed only
weaponFactor = rule lookup from physical contact/brace/equipment state
hazardNumerator += engaged * baseHazardQ16PerSecond * microtickMs
                  * readinessFactor * organizationFactor
                  * exposureFactor * weaponFactor
hazardQ16 = min(65536, floor(hazardNumerator /
                (max(1,targetActiveNonLeader) * 1000 * 1000^4)))
```

Each target sums all incoming contact and ranged pressure before sampling. Every active nonleader ordinal exposed to that aggregate formation hazard gets one casualty draw. Candidate severity probability is 16384/65536 dead and the rest wounded; this is **unapproved tuning**, not medical/historical fact. One person's category can change only once in the transaction. Multiple attacks raise combined risk but cannot kill the same ordinal twice. Concurrent attackers still act if capable in the pre-hit snapshot, even if all are killed that tick. A leader uses a separately defined exposure sample on their own roster ordinal; that individual remains counted once.

This coarse model distributes exposed formation pressure across its eligible roster rather than simulating individual foot placement. Tradeoff: readable/cheap formation tactics versus less granular wounds. Alternative front-rank-only exposure or aggregate fractional ledger must be owner-reviewed under P04; either must conserve people and retain simultaneous application. No formula is approved by appearing in this document. Clamp operations and carried fractions must be serialized; changing probability arithmetic requires a rules revision.

### 2.2 Charge and spear interaction candidate

Charge readiness requires uninterrupted legal travel of a proposed 150 dm, heading variation no more than 16 bins, cohesion at least 600, fatigue below 700, and unobstructed contact frontage. Accumulated run distance is reset only by a physical stop/sharp turn/contact, not by renaming an order. Successful first contact may use `weaponFactor=1500` for the first contact tick, then 1000 sustained. It also raises fatigue and may disrupt the charger; it is not a repeated every-tick bonus. `chargeRunDm` and `lastChargeContactTick` persist across rounds.

Braced spear front requires hold/defend, published brace time, adequate depth and facing to the actual charge. A candidate `weaponFactor=500` for the cavalry's initial front pressure and `1500` for braced spear response makes preparation matter; flank/rear spears receive no automatic front brace protection. Those factors await owner/balance review. Dense spear **observation** may activate the cavalry's selected fallback before contact; hidden spears can surprise either side. Cavalry cannot read an unseen weapon to choose the perfect route. Countered charge shows range/contact/facing/brace evidence, then real losses/fatigue, not a generic cavalry-versus-infantry score.

### 2.3 Ranged pressure candidate

A volley is eligible only when reload tick is reached, formation can act, target/contact region is observed, target is within the weapon's published range, and at least one legal shot corridor is clear. Line-of-sight ray heights include terrain elevation and obstacle height. Candidate archer range is 1500 dm and volley interval 24 ticks; horse archer range 1200 dm and interval32 ticks. These are test values only. Enemy position uncertainty expands an area target; shots outside actual occupied geometry cause no casualties. No arcing fire over friendly troops is assumed in G1A; a later weapon-specific arc needs its own physical envelope.

Eligible shooters are bounded by active nonleader count and available ammunition. `arrowsSpent=min(ammoRemaining,eligibleShooters)`; record exact debit in `volley_fired`. Multiply spent arrows by published per-arrow pressureQ16, clear-target-area fraction, range band and cover factor to form a hazard numerator for the common loss sampler. Candidate baseline per-arrow pressureQ16=4096 at close range, decreasing linearly to 1024 at max range; integer formula is `4096-floor(3072*distance/maxRange)`. Sum pressure before division by target active count. Friendly obstruction or an opaque wall yields zero eligible corridor, so no volley is released and no ammunition is consumed; lost target/empty ammo triggers visible command failure/fallback. Once a valid volley is released, later same-tick casualties do not refund its arrows.

All calculations use one postmovement geometry snapshot. It models a volley within a microtick rather than arrows with flight objects; that approximation is explicit and applies equally in headless/manual. Equipment and exact distance/cover parameters are P04 proposals. Test misses, range-edge rounding, empty ammunition, disappearing target, friendly blockage and simultaneous last volleys.

### 2.4 Exposure and casualty evidence

Every `casualties_applied` event includes relevant contact/ranged causes, pre-hit active count, category transfers and position. Report loss categories independently. Morale, fatigue or an order name cannot directly delete people. Captures require actual custody of surrendering/isolated persons; retreat losses require actual contact/pursuit before exit. No percentage of survivors vanishes simply because an end screen appeared. Equipment dropped on death/dispersal is debited once; no automatic loot bonus is approved.

<a id="morale-retreat"></a>
## 3. Cohesion, morale, fatigue, retreat and surrender

These candidate rules use 0–1000 integer scales. They describe causal state transitions, not approved combat thresholds. Morale is willingness, cohesion is formation organization, readiness is current equipment/training preparedness, and fatigue is exertion. They must appear separately in the UI; one opaque strength meter cannot substitute for them.

| Cause | Candidate update / condition | Visible event and meaning |
|---|---|---|
| Local casualties | `lossRatio=floor(1000*newCasualties/max(1,activeBefore))`; morale subtract `floor(600*lossRatio/1000)`; cohesion subtract lossRatio | `morale_changed`, `cohesion_changed` cite casualty event; no extra deaths |
| Newly exposed rear | Once per new contact, morale -80 and cohesion -60 | `REAR_CONTACT`; repeated ticks do not repeat entry shock |
| Nearby witnessed rout | Morale -60 once per newly witnessed routing formation within1500 dm and LOS | `LOCAL_ROUT_WITNESSED`; hidden/far rout has no global magical shock |
| Rough turning/moving | Cohesion -2 per moving tick on rough ground, -1 per large turning tick; road/open movement alone no compulsory drain | Geometry/turn evidence |
| Exertion | Fatigue +1 moving, +2 in melee, +4 charge, summed and capped1000 | `fatigue_changed/EXERTION` |
| Safe holding | After proposed40 quiet ticks, fatigue -1/tick; cohesion +1/tick up to prebattle ceiling; morale +1 per4 ticks if safe leader/local instruction condition holds | `rally_started` then progress; men/ammo/equipment do not regenerate |
| Exhaustion | Fatigue>=950 prevents charge and constrains march to slow movement; organized retreat remains if geometry permits | `EXHAUSTION`, clear disabled command reason |
| Organization failure | Morale<=150 or cohesion<=150 for8 consecutive ticks -> routing condition | `formation_routing`; active people still physically present until transferred |
| Rally | Safe declared regroup zone, no contact/known pursuit within declared safety radius, eligible leader/local fallback and40 quiet ticks | Gradual organization; `rally_completed` only on published capability threshold |

Hysteresis and one-time shock markers are serialized. Repeated pause/resume, replacing the same order or crossing a round boundary cannot reset fatigue, brace time, charge preparation or rout persistence. Readiness does not restore from a UI button: equipment loss and previous campaign condition persist; any future rest/supply improvement needs resources and actual time. Proposed experience changes reaction/planning or disclosed preparation, not a command-mode multiplier; permanent advancement is outside G0/G1.

**Disengagement:** withdraw turns toward a legal exit while still exposed until reach separation exists. Candidate retreat speed is 75% of current march speed while in contact, with extra fatigue2/tick. A cover formation can occupy the pursuer's approach; it does not grant invulnerability. At legal separation emit `contact_ended`; then normal withdrawal movement continues. Frontage/reformation and allied congestion are checked throughout. A safe exit is a map zone with an actual traversable corridor; the existence of an icon does not guarantee it remains open.

**Rout:** a routing formation cannot execute a fresh charge. Its local policy chooses among predeclared own exits by reachable path cost and known threat; it cannot choose through walls or hidden-perfect knowledge. It moves under the same collision/speed rules, often with lower cohesion and disordered frontage. Only ordinals that physically leave/disperse transfer active->routed/missing. A physically exited formation cannot reenter during this encounter. Regrouping concerns known locally present scattered personnel; it cannot resurrect exited, dead, captured or missing men. Later campaign recovery rates remain OPEN/DEFERRED.

**Blocked retreat:** stop at blockage, emit `retreat_route_blocked`, show the detected obstruction and activate the selected local fallback. If every path fails, the formation remains in place and may fight, surrender or continue disordered; it does not teleport home or instantly vanish. A proposed forced-custody condition is incapable/routing, no traversable exit, enemy in actual custody contact and40 continuous ticks without relief; after this declared condition, eligible ordinals transfer to captured, with `surrender_accepted`/`personnel_transferred`. Alternatives are explicit player surrender or a longer negotiated condition; **owner decision required**, not a locked trigger. If not approved, G1A can reject unsupported capture behavior and limit the pilot to open viable exits rather than silently invent surrender rules.

**Pursuit:** capable pursuers must be ordered or governed by a documented local pursuit envelope, travel the actual distance and reach the target before exit. Their fatigue, contact frontage, supplies and retreat risk constrain pursuit. No post-result percentage casualty roll. The battle may remain in a withdrawal-resolution stage until physical exit/custody is recorded; end conditions refer to actual state and declared objective, not a count of animation frames. Late leader injury is applied before terminal evidence and cannot be discarded because another event already suggested victory.

**Daylight/exhaustion:** a publicly declared daylight limit can prohibit further effective engagement or trigger a mutual withdrawal/standoff evaluation. A declared pass-holding deadline can fulfill that mission. An implementation time budget or decision window cannot. If both forces remain viable and objectives are unmet, continue to review; if neither can legally continue under published conditions, [06](06-objectives-and-results.md) yields unresolved/mutual withdrawal with real losses retained. There is no hidden score tiebreak or arbitrary fixed duration.

<a id="terrain-contract"></a>
## 4. Terrain changes paths, sight, contact and timing

Every feature has actual polygon, height/surface, role navigability and route portals. Below are proposed behaviors; exact factors require owner/tuning review. G1A uses open ground/hill/slope and sufficient route structure to test the wing opening; other terrain is a G2 compatibility contract.

| Terrain | Legal path and timing | LOS / combat geometry | Tactical consequence and future check |
|---|---|---|---|
| Open ground | Full width, role base speed | Clear ground-level rays unless formations obstruct | Cavalry can prepare charge but is exposed; `TER-OPEN-01` |
| Slope/hill | Gradient costs speed; steep grades prohibit mounted/wheeled ascent; crest approach consumes travel | Height raises observation horizon; far crest can mask lower ground; range uses terrain coordinates | Hold crown versus use covered approach; no hill bonus from merely naming a zone; `TER-HILL-01` |
| Woods | Reduced legal width/spacing, role-dependent speed; dense woods prohibit charge preparation | Occluder polygons shorten detection and block some shot rays | Hidden approach but disorganized movement; cavalry can be intercepted; `TER-WOODS-01` |
| River | Non-navigable polygon except registered ford/bridge portals; no direct crossing | Water itself may not block sight, banks/height can | Crossing forces predictable route, not a damage multiplier; `TER-RIVER-01` |
| Ford | Shallow crossing width, slower passage, extra fatigue; bank entry/exit explicit | Bank can mask troops; narrow frontage during crossing | Cover a withdrawal or catch a force midcrossing; `TER-FORD-01` |
| Bridge | Width/capacity controlled by footprints; no passing without room; destroyed state blocks path | Rails/height defined, archers can cover entrance if ray clear | Congestion delays reserve; friendly blockers matter; `TER-BRIDGE-01` |
| Mountain pass | Narrow navigable corridor, impassable surrounding polygons; turn/reform constraints | Bends block sight, elevated banks alter lines | Cavalry cannot invent a flank outside bounds; timed hold is distinct objective; `TER-PASS-01` |
| Road | Lower movement cost if whole traversed footprint fits; cannot ignore blocked bridge/gate | Usually clear lane but bends/woods still occlude | Quicker reserve travel and predictable interception; `TER-ROAD-01` |
| Gate | Closed state blocks; open/breached state exposes exact portal width; siege effort consumes time/equipment | Gate/wall occludes until geometry changed | Breaking gate creates opportunity; defenders behind it remain; `TER-GATE-01`, QA08 |
| Wall | Impassable unless approved ladder/assault interface later exists; actual wall edges | Opaque height; firing requires modeled firing position | No crossing because attack score high; `TER-WALL-01` |
| Breach/assault zone | New traversable gap with rubble cost and limited width; actual occupation required | Gap changes rays/contact arcs; inner defenders can block | A breach alone never captures city; `TER-BREACH-01`, QA08 |

Map elevations use explicit planar patches in the state. For ray height at segment parameter t, compute integer/rational interpolation and compare against terrain/obstacle tops; touching an opaque boundary counts blocked under the proposed conservative convention. This rule avoids browser-dependent epsilon tests. Friendly obstruction uses physical footprints, not a side-wide prohibition: a clear lateral angle is legal, a ray through allies is not. High ground can expand observed/clear-shot area; it does not reveal plans or grant unlimited range.

Retreat and supply routes use the same terrain graph as attack. A blocked bridge can sever a route; control of a remote map label alone cannot. Objectives require their own declared ability to hold/cross/occupy. Gate/wall/occupation/convoy depth is deferred to G2; declaring schemas now is not implementing those missions.

<a id="commander-ai"></a>
## 5. Command delivery, leader loss and fair opponent decisions

Local delivery candidate: `delayTicks=ceil(routeDistanceDm/messageSpeedDmPerTick)+competenceDelayTicks+formationReorientationTicks`. The route and receiver state are physical; profile ranges are disclosed. Candidate messageSpeed=100 dm/tick, competenceDelay=`floor((1000-competence)/100)` ticks. These are provisional pacing values, not historical courier measurements. Delivery cannot happen before actual travel/receipt. At proposed retry interval8 ticks a blocked route can be retried from its last position; after declared expiry80 ticks it fails visibly. Existing orders persist while the message is delayed. No random delivery failure occurs without physical cause.

A human choosing detailed orders uses the same local delivery/facing mechanics as an AI commander with identical orders and the same physical command chain. Manual mode is not an instantaneous strength buff; delegated mode does not get a penalty. The source of orders is audit metadata. G1A includes only local battlefield latency; campaign roads/mail/predeparture instructions are deferred G2.

Leader exposure uses the formation's physical per-person hazard while its commander ordinal is active/fit. One fate draw selects harm; a severity draw uses the provisional death probability16384/65536, otherwise an incapacitating wound. This transfers that ordinal once, records the commander condition and invokes succession. Already incapacitated wounded leaders do not keep drawing active-combat hazard in this first model; capture still requires physical custody. Different future wound detail is an owner-review choice, not a random leader energy system.

Successor policy: eligible named living subordinate in the side's serialized succession order, physically able to communicate, takes command after the same delivery rules; if none, formations keep their last delivered orders plus selected local fallback. No frozen engine and no invented new commander. `succession_activated` identifies original leader, successor, affected messages and actual delay. Local fallback is limited to known conditions and existing authorization; it cannot create a new strategic mission. Political influence/cards/recruitment belong to later I/J, not this design.

Candidate opponent pipeline, applied to either side planner:

1. Receive immutable current observation, declared objective, own resources and last known contacts. Never read human draft or concealed state.
2. Generate at most three meaningful candidate plans: preserve/hold, legal maneuver/commit, withdraw/regroup. Reject geometry/resource/authority violations first.
3. Compare declared objective progress opportunity, exposed flank risk, retreat-route viability, fatigue/ammo and reserve travel time. Use uncertainty intervals; a candidate that only works against the least threatening estimate is marked risky.
4. Respect mission risk ceiling and withdrawal condition. Cautious style prefers a reserve/escape route under uncertainty; maneuver style may choose the legal flank within the same ceiling. Competence changes estimate use, route/commit timing and delivery, never damage.
5. Seal detailed formation orders from that snapshot before either batch is visible. Log plan reason and which observed evidence supported it.
6. Respond to newly detected threats only at the next legal decision opportunity plus delivery latency, or the one previously authorized local fallback. Hidden threats cannot trigger perfect preemptive reserve movement.

Objective preference is explicit: an interception commander may prioritize blocking route over chasing casualties; a caravan protector may cover crossing and relinquish ground. No adaptive-learning claim is made. Future difficulty options remain PROPOSED: stronger planning within the same rules; or openly labeled initial resources/position handicaps. Hidden damage, exact fogged coordinates, instant reinforcements, ammo creation or favorable seed changes are prohibited.

<a id="resources-exploits"></a>
## 6. Supplies, equipment and anti-exploit constraints

Ammunition is counted pieces and spent only on actual release. Provisions are integer ration portions; no tactical refill is automatic. Candidate long-encounter consumption is one portion per living supported person per declared ration interval, with interval provisionally14400 ticks (one simulated hour), tracked by a serialized next-consumption tick and resource ledger. This cadence is a feasibility placeholder, not nutrition/history/balance canon. An army entering with poor supplies/readiness starts with explicit fixture/campaign values. It does not acquire a campaign economy in G1A. If a long mission exhausts food/water, declared fatigue/readiness constraints apply gradually; running out does not instantly kill the army or decide its mission.

Equipment has counted items and serviceability0..1000. Candidate wear is one serviceability point per40 actual melee/charge-contact ticks or per released volley interval, accumulated with carry; at a declared unusable threshold the associated action fails with `MISSING_EQUIPMENT`/`EQUIPMENT_UNUSABLE`. Broken item counts transfer remaining->lost when destruction is actually recorded. Rest does not repair, refill arrows or replace horses. Supplies transferred during future relief/convoy/siege missions require an actual route, source inventory and atomic debit/credit references. Resource conservation applies across both armies and field caches; captured stores do not appear as bonus money. Capture rewards, exact recovery and strategic economic conversion remain OPEN/DEFERRED G2/H.

Siege compatibility: machine needs live crew, intact equipment, road/gap width, time to deploy, material/ammunition and reachable target. Proposed gate integrity loss follows physical siege strikes; reaching zero changes gate geometry and emits `breach_opened`. Occupation or surrender still needs [06](06-objectives-and-results.md) evidence. No full siege weapons, ladders, wall art or city-capture implementation in G0/G1A.

| Exploit/adversarial pattern | Contract guard and player-visible consequence | Future measurable test |
|---|---|---|
| Unlimited cavalry flank wins | Travel, turning, charge buildup, fatigue, observed spears, legal intercept and return route all apply | Same flank plan against open route vs guarded route produces different contact/time; neither fixture may force winner text; `EXP-CAV-01` |
| Passive infinite defense | Published mission deadline/daylight/capacity rules; if none applies remain ongoing with optional explicit suspension, never hidden score | Hold through window ends: no winner; declared pass deadline fulfills only published objective; `EXP-STALL-01` |
| One formation pins whole army | Contact only within reach/frontage; uncontacted enemies can move around if footprints fit | One narrow guard does not freeze a second enemy outside contact graph; `EXP-PIN-01` |
| Crossing blocked river | Navigable graph and swept footprint must use ford/bridge portals | Direct illegal crossing rejected/blocked with no far-bank position jump; `EXP-RIVER-01` |
| Exact fogged enemy knowledge | Planner takes observation only; contact uncertainty grows | Move hidden enemy within unseen region: pre-detection AI orders do not change from forbidden truth; `EXP-FOG-01` |
| Cancel attack to avoid losses | Seal/delivery semantics retain committed contact/ammo/fatigue; concurrent hits resolve | Repeated cancellations cannot refund arrows or erase pending same-tick hits; `EXP-CANCEL-01` |
| AI never retreats | Explicit risk/capability/route policies and tested withdrawal orders | Cautious planner given observed danger+legal exit generates real withdraw; physically moves; `EXP-AI-RETREAT-01` |
| Reserve teleportation | Commit is ordinary path/facing/speed/collision movement | Arrival cannot precede shortest legal travel lower bound; blocked bridge delays it; `EXP-RESERVE-01` |
| Broken wing auto-ends | Rout changes geometry and local organization; objective evaluator separate | Both centers viable and objective contested -> no battle_ended; `EXP-WING-01`, QA07 |
| Stale vanished target | Last-seen envelope + fallback, not hidden live tracking | Remove observation: attack follows permitted last point or invalidates; no free remote hit; `EXP-STALE-01` |
| Free commander succession buff | Named living successor and actual delivery delay; no combat multiplier | Same detailed orders/physical state across provenance modes yield same hashes; `EXP-LEADER-01`, QA10/21/23 |
| Exploiting simultaneous last hit | Snapshot eligibility and summed distinct-person losses | Both formations can collapse; no side-index victory; `EXP-DOUBLE-01` |
| Surrender heals or duplicates | Origin ledger/custody and once-only transfer | Repeated surrender event cannot add captive or restore active soldiers; `EXP-CUSTODY-01` |
| Hill icon grants remote control | Control requires actual viable presence and declared predicate | Unit outside crown polygon cannot contribute just because its order targets crown; `EXP-HILL-01` |

Every test is DESIGNED/PENDING IMPLEMENTATION. Mechanic presence does not prove fun or prevent every exploit. G1A must observe whether these costs create understandable choices, not merely accumulate penalties.

## 7. Tactical acceptance examples and decision limits

At least these distinct interactions must be demonstrated later: cavalry into braced front versus exposed flank; sword disengagement with/without a covering reserve; bow range/LOS from crest versus masked slope; friendly missile obstruction versus clear lateral angle; river crossing through a ford versus impassable bank; bridge congestion delaying a reserve; pass frontage denying cavalry detour; gate breach without inner occupation; uphill movement versus road approach; fatigue preventing repeated charge while allowing orderly withdrawal. Each is tied to events, coordinates and resources above, not adjective-only unit bonuses. The first four and hill/path/reserve cases can support the one-map G1A; full river/pass/siege demonstrations belong to G2.

The collapsed enemy right wing creates a physical western opening, while both centers remain independent coherent formations. Exploiting it requires real route/turn/contact; the enemy reserve may intercept and deny the crown. The player can instead reinforce their center or withdraw; objective loss can coexist with900 survivors. A decision-window end with both viable centers is a review point, not a result. Exact A/B/C/D/E fixture branches and oracle are in [07](07-wing-collapse-regression.md), not a canned narrative injected by these formulas.

Future monotonicity study: vary manpower/equipment/formation quality across1000+ seeded diverse G2 battles while retaining mission and terrain strata. More men should improve aggregate capacity/opportunity under comparable legal deployment; it must **not guarantee** every fixed-seed win because congestion, objective deadline, role mix and retreat options matter. Record effect ranges and pathological reversals rather than advertise a win-rate target. This is a proposed study, not a completed experiment or statistical proof.

Owner-sensitive unresolved choices remain explicit: spatial model/scale, per-person versus aggregate exposure, combat/damage/brace thresholds, formation representation, capture trigger, pacing/decision window and recovery rates. Recommended defaults are proposals in [12](12-decisions-and-risks.md). G0 does not implement them, set final balance, add a control mode, introduce midbattle switching or advance any phase gate.
