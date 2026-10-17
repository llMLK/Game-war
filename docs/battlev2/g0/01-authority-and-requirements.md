# 01 — Authority, source evidence and requirement traceability

**G0 design package; owner review pending.** Only the replacement assignment and latest resume authorize this work. The frozen V3 master remains unedited. Every design mechanism that is not expressly required is a proposal; see [decision register](12-decisions-and-risks.md). This matrix maps applicable requirements, including deferred ones; it does not assert implementation or runtime acceptance.

<a id="source-index"></a>
## 1. Verified source index

Read the replacement assignment in full before investigation. Located the actual ZIP at `C:/Users/Abdul/Downloads/Suyuf_AlMamalik_V3_4_Complete_Execution_Package.zip`; inspected its entries and read the following required texts directly as UTF-8 ZIP streams. No missing authoritative source was found. Full handoff and V3.4 annex were read; V3 was read at §5.6 in full (including §5.6.3-أ), relevant §4/G, §7 layers/QA07–11/19–23 and acceptance references; V3.3 §§2–4 in full. This is not a claim to reread all unrelated 189 requirements or to alter them.

| Key | Exact source / scope | SHA-256 of source bytes |
|---|---|---|
| G0 | `BattleV2_G0_Master_Prompt_Agent5.md`, all §§0–22, latest attached assignment | `c75f35f79a8c56707bae1c13300143438ffb93e303f7c6e7e20d1166b537880f` |
| ZIP | `Suyuf_AlMamalik_V3_4_Complete_Execution_Package.zip` | `ad16c8545b3c11b0404e9a241cc0e16ee751fa66a5e676f578c55751b1d48321` |
| H | `Suyuf_AlMamalik_Execution_Handoff_V3_4.md` | `4b2ef83a8e7e82c01d755b3ddfa7b6e8f3ca5aa47db33ee2fdda258f0745e066` |
| V3 | `Suyuf_AlMamalik_Master_Update_Prompt_v3.md` | `42e082275e3c011e88ee4c7f192e69d269a6e224a0db7c9e60939f93562ef1a6` |
| C33 | `Suyuf_AlMamalik_V3_3_Corrections_Annex.md` | `50c53564d29be197c971d1273050f57574def44e0415ea92da0ef62eee74015d` |
| C34 | `Suyuf_AlMamalik_V3_4_China_Removal_Annex.md` | `7eb2e86721686f3626750722549dbcfb939cab9f69cb530632b7f7b12a394a18` |
| R | Approved source commit, verified local and remote R branch | commit `29f34b333ff4c424e0b0a987838138a4bf697d94`; tree `df959632b38e23f5a178b55c50f56cae152b65b1` |

Source line numbers below use original ZIP entry text, line1 at its title. Section identifiers remain authoritative if a viewer wraps lines. The nine-game lessons use the supplied V3 study as design authority. This package does not claim independent review of the linked commercial game reviews, historical army verification, survey statistics or proprietary mechanics.

<a id="precedence"></a>
## 2. Precedence and narrowly resolved conflicts

Latest explicit owner decision/assignment > C34 > surviving C33 > frozen V3; H governs phase boundaries. The resume preserves original G0 scope and forbids another worktree/restart. No older G0 draft was combined.

| Conflict | Narrow source excerpts | Resolution / record |
|---|---|---|
| Old current phase | H§8: «نفِّذ ... F ... فقط»; G0§22: “Commit and push only the G0 documents” | Latest owner approves R and G0 alone; historical F-only instruction is superseded for this assignment, not re-executed |
| China support | C33§4: «استخدم BattleV2 للممالك الثلاث كذلك»; C34§1: «BattleV2 مستهدف للسيناريو الأموي فقط» | C34 wins; no China battles. Unsupported legacy save safety retained; QA18 old product coverage explicitly superseded |
| G1 breadth | V3§4/G1: «ثلاث ساحات»; C33§2: «ساحة ميدان واحدة أولًا» | One mandatory G1A field; pass/siege/other missions remain G2C compatibility, not removed |
| Campaign delegation gate | V3§5.6 acceptance: «جزء من بوابة G1» for dispatch delegation; C33§2: «هنا فقط أضف التفويض قبل إرسال القائد» in G2 | G1A manual; G1B tactical delegation; G2B campaign dispatch/review. QA20/22 deferred explicitly |
| Sequence | C33§2: “F → ... G0/G1أ”; C34§1: “F ← R ← G0 ← G1أ ← G1ب ← G2” | R inserted and approved by owner; G0 review now. No automatic G1A work |
| Result name | C33§3 names `outcome`; H§5 names `objectiveOutcome` | One canonical wire field outcome; conceptual alias only. No two conflicting fields |
| Legacy retirement timing | V3 says remove old combat entirely; G0§1/3 prohibits production changes now | Leave R unchanged during G0/G1; retire every active path at approved G2 migration, without fallback in final product |
| Phone preview | C34§4 permits preview only after explicit approval; G0§1/22 prohibits deployment | G0 has paper wireframes only, no playable URL or publishing. Later phone gate pending authorization/access |
| Research confidence | V3§5.6.2 labels qualitative impressions; G0§0 forbids fabricated validation | Source-derived design lessons, no statistical or historical claim; all gameplay/phone tests pending |

No unresolved conflict with a LOCKED requirement remains known. Open owner choices are P01–P15 in12; they are bounded proposals rather than silently fixed rules. A missing source or a new unresolved locked conflict would stop work, not be filled by guesswork.

<a id="baseline"></a>
## 3. Repository baseline and scope evidence

Original chat worktree `.../worktrees/e41f/Game-war` was clean, detached at approved R. Remote origin was `https://github.com/llMLK/Game-war.git`; read-only `git ls-remote` verified `refs/heads/codex/phase-r-umayyad-only` at the exact approved SHA and no remote G0 branch before creation. Local R branch matched. Main was not assumed to contain R and was neither checked out nor changed.

Created one isolated managed worktree `C:/Users/Abdul/.codex/worktrees/phase-g0-battlev2-design/Game-war` at that exact commit and branch `codex/phase-g0-battlev2-design`. On explicit resume, inspected this same worktree: clean at R with no saved G0 documents; research notes retained, no second worktree created. The initial write had been prevented by usage-limit approval-review failure; it was not an unsafe-action determination. Work continued after the user's explicit resume. Only the14 named Markdown deliverables are authorized.

Observed battle files and actual function/load-order seams are in [10 §5](10-future-phase-contracts.md#future-seams). In particular `resolveEnc` lives in campaign-ai.js, not assumed campaign.js. Active BattleScene simulation was observed as instance/closure state, while campaign save serializes Game.S; [10 §6](10-future-phase-contracts.md#future-save) states recovery limits. No real save touched. Relevant historical test inventory and51 matching runtime blobs are recorded in10§9. No game test was run in G0; runtime/artifact writes were avoided. Final diff/tree/push checks and static document checks are recorded in [13](13-final-three-pass-audit.md).

<a id="v3-trace"></a>
## 4. V3 §5.6 line-by-line semantic coverage

D = design documented, runtime **PENDING**; F = design compatibility retained, implementation **DEFERRED** to shown phase. `QA/X/UX` references resolve to [11](11-qa-and-failure-matrix.md). Every row carries a design location and observable future check; no row implies a passed test.

| ID | Exact V3 location / decision | Future phase | Design file / section | Observable check | Status |
|---|---|---|---|---|---|
| V001 | §5.6.1 L190 owner wing/intact-army complaint | G1A | [07§1/6](07-wing-collapse-regression.md#oracle) | QA07 | D |
| V002 | §5.6.1 L192 old phases/checkEnd/score; incident cause unproven | G0 evidence/G2A removal | [10§5.2](10-future-phase-contracts.md#future-seams) | D01/X19; no invented replay | D |
| V003 | §5.6.2 L198 Total War movement/flank/morale, few banners/fair AI | G1A | [02§2](02-player-experience-and-references.md#nine-references),05 | QA19/X09/X16 | D |
| V004 | L199 Field of Glory cohesion/disengage choice | G1A | 02§2;05 disengage | X07/X15 | D |
| V005 | L200 Bad North readable roles/touch | G1A | 02§2;09 flows | UX01/02 | D |
| V006 | L201 Into the Breach intelligible risk, no future omniscience | G1A | [04§7](04-state-and-commands.md#observation-contract) | X09/UX08 | D |
| V007 | L202 Dominions orders/planning, later meaningful intervention | G1A | [02§3](02-player-experience-and-references.md#round-contract) | UX03/QA19 | D |
| V008 | L203 Grand Tactician delay/status/fallback | G1A/G1B | 04§6;05 command | X11/QA23 | D |
| V009 | L204 Wartales consequential personnel/leader loss | G1A/G2A | 05;06§7;10§6 | X01/X12/QA09 | D |
| V010 | L205 Frozen Synapse simultaneous formation planning | G1A | [03§3](03-engine-architecture.md#engine-resolution) | QA19/X08 | D |
| V011 | L206 Phantom Brigade readable execution, no certain future/one exploit | G1A |02§2;09 review;05 counters| QA21/X16/UX08 | D |
| V012 | L208–218 qualitative impressions: maneuver, terrain, meaningful commanders/orders, manageable surprise, persistent losses | G1A/B/G2A | [02§1/2](02-player-experience-and-references.md#promise-contract);06§7 | human gate;X01/09/16 | D |
| V013 | L219 supplied review confidence/remaining “from study” | G0 |02§2 source confidence;01§1| D04 provenance | D |
| V014 | §5.6.3 L223 Canvas2D/2.5D, camera-independent physical terrain | G1A/G2C |03§1;04§1;05 terrain| X04/QA19 | D/F |
| V015 | L225 roles, actual men, conditions/ammo/commander,4–6 initial | G1A/G2C roles |04§1;07§3| X01/QA19 | D/F |
| V016 | L227(1) reconnaissance from knowledge | G1A |02§3;04§7| X09/UX08 | D |
| V017 | L227(2) destination/mission/one fallback/risk/maintain | G1A |04§4–6;09 flows| UX02–05/X11 | D |
| V018 | L227(3) precommit both, simultaneous shared microticks/all physical updates | G1A |03§3| QA10/19/X08 | D |
| V019 | L227(4) review and continue if no legitimate end | G1A |02§3;06§1| QA07/X02 | D |
| V020 | L229 move/occupy,hold,attack/flank,intercept,withdraw,reserve,shoot/conserve/breach | G1A contextual siegeG2C |[04§5](04-state-and-commands.md#order-table)| command validation/X04/X11/UX02–05 | D/F |
| V021 | L231 secret simultaneous plans, estimates, equal resources, commander delivery | G1A/B |04§7;05 AI| X09/QA23 | D |
| V022 | §5.6.3-أ L235 new one engine/two decision modes, no relabel | G1A/B/G2A |03§1;10§2| QA10/21/X19 | D/F |
| V023 | L237 item1 dispatch mode/default mission/risk/issuer/time/mail | G2B |[10§3](10-future-phase-contracts.md#future-g2b)| QA20/22 | F |
| V024 | L238 item2 commander campaign routes/supply/authority/fallback | G2B |10§3| QA20/23 | F |
| V025 | L239 item3 optional prebattle review/communication/no rewind | G2B |10§3| QA22 | F |
| V026 | L240 item4 delegated same state/physics, accelerated display, report | G1B/G2B |10§1;03§4| QA10/21/23 | F |
| V027 | L241 item5 human4–6 banners, meaningful orders persist | G1A |08;04§6| QA19/UX03 | D |
| V028 | L242 item6 orders explain difference, no strength buffs, succession | G1B |05;10§1| QA23/X12 | F |
| V029 | L243 item7 seed/state/detailed-order parity, mode metadata | G1A/B |03§3/4;04§4| QA10/21 | D |
| V030 | L244 item8 two Arabic choices, concise instructions/risk/report | G1B/G2B |09;10§1/3| G1B human gate/QA20 | F |
| V031 | L245 item9 no required midbattle handoff | all gates |12L04/P14;10§1| D04/QA22 | D |
| V032 | L247 acceptance(a,b) campaign delegation vs manual field | G1A/G2B corrected |08;10§3| QA19/20 | D/F |
| V033 | L247(c,d) no history rewrite; visual/headless equality | G1A/G2B |03§4;10§3| QA21/22 | D/F |
| V034 | L247(e,f) different commander decisions; fair travel/mail | G1B/G2B |05;10§1/3| QA23/20 | F |
| V035 | L247(g,h) no active legacy path; mobile distinguishes modes | G2A/B |10§5.3;09| X19/G1B human questions | F |
| V036 | L249 wing gap, real reserve arrival/choice,1400vs1600 illustrative | G1A |07§2–7| QA07/X10 | D |
| V037 | L252 ending1 field collapse | G1A |06§3T1| QA07/X08 | D |
| V038 | L253 ending2 field control | G1A |06§2/3T2| X10/QA19 | D |
| V039 | L254 ending3 orderly withdrawal | G1A/G2A |06§3T3| QA09/X07 | D |
| V040 | L255 ending4 standoff/daylight/no forced index | G1A |06§3T4| X02/05/06 | D |
| V041 | L256 ending5 actual assault control/surrender | G2C |06§3T5| QA08 | F |
| V042 | L257 ending6 repulse/possible siege continuation | G2A/C |06§3T6;10§2| X18 | F |
| V043 | L259 objective/control/loss separate, escaped convoy/intercept delay | G1A/G2C |06§1/4| QA09/11 | D/F |
| V044 | L261 missions1–6 and meaningful daylight/supply, no kill80% universal | G1A M1/G2C rest |[06§4M1–M6](06-objectives-and-results.md#six-missions)| QA08/11/X06/18 | D/F |
| V045 | L263 four indicators and significant decision pauses | G1A |09 wireframes/flows;02§3| UX01/06/07/08 | D |
| V046 | L265 persistent men/wounds/captives/resources/leader, recovery over time | G1A/G2A |04§1/2;06§5–7;10§6| X01/13,QA09 | D/F |
| V047 | L267 causal report,900 survivors, timeline/test-only replay | G1A |06§8;07§7/8;09| QA09/UX07 | D |
| V048 | L269 prohibitions1/2: timer winner/free reinforcements/AI cheating | G1A |03§3;05 AI;06§1| X02/09/10 | D |
| V049 | L269 prohibitions3/4: command overload/superhuman leaders/fantasy | G1A/G1B |02§1;05;12P06/P14| QA19/23,UX02 | D/F |
| V050 | L269 prohibitions5/6: unexplained random buffs/separate engine; no copying IP | G1A |02§2;03;05| QA10/21/23,D04 | D |
| V051 | §5.6.4 L273 test1 fixed wing regression, modes/orders | G1A/G1B |07 oracle;11QA07| QA07/10 | D |
| V052 | L274 test2 execution steps end, continue not score | G1A |03§3;07D| X02 | D |
| V053 | L275 test3 statistical manpower/formation sanity1000+ diverse | G2C |11§4| X17;1200-case plan pending | F |
| V054 | L276 test4 skilled timing/avoid known spears | G1A/B |05;10§1| QA23/X16 | D/F |
| V055 | L277 test5 pass/river/hill/fort/convoy | G1A terrain/G2C missions |05;06§4| X04/QA08/11 | D/F |
| V056 | L278 test6 defeat900 and replay ledger | G1A/G2A |06§6/8;07§8| QA09 | D |
| V057 | L279 test7 deterministic seed/state/commands/frame order | G1A |03§3/4| QA10/21/X03/14 | D |
| V058 | L280 test8 campaign personnel/resources/commander correspondence | G2A |06§7;10§6| X01/13 | F |
| V059 | L281 test9 phone ≤3 interactions where feasible, crowding/render | G1A |09 flows;08 gate| UX01/02,performance later | D |
| V060 | L282 test10 two modes one engine, same orders vs explained different | G1B/G2B |10§1/3;03| QA10/21/23 | F |
| V061 | L283 test11 dispatch commander, mission, risk, saved travel/supply | G2B |10§3| QA20 | F |
| V062 | L284 test12 optional prebattle choice, no forced viewing/old quick resolve | G2B |10§3| QA22/X19 | F |
| V063 | L286 file inventory/real calls/saves, China clause superseded | G0/G2A |10§5/6;01§2| D01/X19/20 | D/F |
| V064 | L288 acceptance corrected byC33: human prototype before integration, reason/evidence, parity,1000+,indicators,persistence | G1A/B/G2 |08 gate;10;11| all10QA/human gate | D/F |

<a id="annex-trace"></a>
## 5. Corrections, override and gate trace

| ID | Exact source / decision | Future phase | Design location | Observable check | Status |
|---|---|---|---|---|---|
| C01 | C33§2 L17 G0 contracts/phone/wing, no final art | G0 |03–09;12L01| D01–04 | D |
| C02 | C33§2 L20 field first4–6/manual/no campaign dependency | G1A |08;12L07| QA19/UX02 | D |
| C03 | C33§2 L21 two seed scenarios, phone accessible;3 environments later | G1A/G2C |07§3;08;10§4| QA07/19;G2 environment checks | D/F |
| C04 | C33§2 L22 owner two battles/5questions then stop | G1A |08 gate| owner answers pending | D |
| C05 | C33§2 L25 tactical delegated same engine/report | G1B |10§1| QA10/21/23 | F |
| C06 | C33§2 L26 no strategic travel/mail/reinforcements G1B | G1B/G2B |10§1/3| scope audit;QA20 deferred | F |
| C07 | C33§2 L27 five human questions, no false approval | G1B |10§1| owner answers pending | F |
| C08 | C33§2 L30 campaign/result/mail basics not full politics | G2A/B |10§2/3| QA20/22/X13 | F |
| C09 | C33§2 L31 all missions/old retirement/no release before; China superseded | G2A/C |10§2/4/5| X19/QA08/11;01§2 | F |
| C10 | C33§2 L33 sequence/H independence modified byC34 and latest stop | all |12§3;README| D04 no extra work | D |
| C11 | C33§3 L37 serializable versioned encounter contract, no winner-only | G1A/G2A |04;06§5| D02/QA09 | D/F |
| C12 | C33§3 L39 three statuses, interruption not draw | G1A/G2A |06§1/5 clarifications| X05/14 | D |
| C13 | C33§3 L40 four outcome values from objective, not score | G1A |06§1/2| QA07/X02 | D |
| C14 | C33§3 L41 independent fieldControl | G1A/G2C |06§1/4| QA09/11 | D |
| C15 | C33§3 L42 withdrawal quality/route/personnel/leader | G1A/G2A |06§5–7| QA09/X01/07 | D |
| C16 | C33§3 L43 objectives/reasons/spatial evidence/orders/events | G1A |04§8;06§5/8| QA07/09,UX07 | D |
| C17 | C33§3 L44 campaignEffects unique ID once-only | G2A |06§7;10§6| X13 | F |
| C18 | C33§3 L46 actual call inventory/no runAuto AI fallback | G2A |10§5| X19 | F |
| C19 | C33§3 L49 actual capture/repulse no unearned reward | G2A/C |06§3/4;10§2| QA08/X18 | F |
| C20 | C33§3 L50 draw keeps ownership/applies loss/fatigue/pursuit | G2A |06§7;10§6| X05/13/18 | F |
| C21 | C33§3 L51 withdrawal independent/legal route/surrender | G1A/G2A |05;06§3| QA09/X07 | D/F |
| C22 | C33§3 L52 same seed/orders, mode changes no troops | G1A/B/G2B |03;10§3| QA10/21/22 | D/F |
| C23 | C33§3 L53 survivors/wounds/conservation no free men | G1A/G2A |04§2;06§7| X01 | D/F |
| C24 | C33§3 L55 inspect active save,backup/version/idempotency/recovery | G2A |10§6| X13/14/20 | F |
| C25 | C33§4 L59 one headless physics/no probability shortcut | G1A/G2A |03;10§7| QA21/X19 | D/F |
| C26 | C33§4 L60 baseline light/crowded median/p95/memory/batching | G2C |10§7;11§4| measured future device evidence | F |
| C27 | C33§4 L61 China support, L62 China release condition | superseded C34 |01§2;12L02| X20 replaces support, no China battles | F (superseded scope) |
| C28 | C33§4 L62 performance blocks release/no legacy fallback retained | G2C |10§4/7;12risks| performance review/X19 | F |
| O01 | C34§1 items1–3 Umayyad only/removal/QA18/sequence | G0/G2A |01§2;12L02;10§6| X20 | D/F |
| O02 | C34§1 item4 two modes dispatch/prebattle, tactical first | G1B/G2B |10§1/3| QA20/22/23 | F |
| O03 | C34§2 previous code snapshot must recheck at R | G0 |10§5 actual files/lines| D01 | D |
| O04 | C34§3 safe unsupported save/backup/no silent overwrite | R invariant/G2A regression |10§6| X20 | F |
| O05 | C34§4 preview permission/source-save cautions | later phone delivery |08gate;10§7;README| no G0 deploy;future owner phone evidence | D/F |
| O06 | C34§5 phase reading/stop/G2A-B-C/no unrelated rewrite | all |10§1–4;12L01| D01/D04 | D |
| O07 | C34§6 recruitment influence deferredI | I |12P14| no G0 system expansion | F |
| O08 | C34§7 nine override rows, originalA001–189 frozen | G0/G2 |01§2 and§7 below| D01/D04 | D |
| O09 | C34§8 no invented execution/approval | all |11status;13evidence| D04 | D |
| H01 | H§1 source selection G0; §2 final Umayyad/one engine | G0/G1A |01§1;03| D04/QA10 | D |
| H02 | H§3 baseline,isolated branch,truthful test counts/human gate | G0 |01§3;13| D01–04 | D |
| H03 | H§4 G0 technical/design review, G1A→G1B stop gates | G0/G1A/B |README;08;10§1| owner review pending | D/F |
| H04 | H§4 G2A/B/C split, H/I/J remain separate | G2 |10§2–4;12P08–P14| scope/QA20/22 | F |
| H05 | H§5 result/call removal/headless/performance/save inspection | G2A/C |06;10§5–7| QA08/21,X13/19 | F |
| H06 | H§6 preview requires approval, no real-save transfer | future G1A |08gate;10§7| owner phone pending | F |
| H07 | H§7 five G1A/five G1B questions/free text/seed | G1A/B |08;10§1| human evidence pending | F |
| H08 | H§8 historical F-only superseded by current G0 owner assignment | G0 |01§2;12L01| D01/D04 | D |

<a id="qa-trace"></a>
## 6. Explicit QA trace and relevant surrounding acceptance

| ID | Exact source | Decision / future phase | Design location and test | Status |
|---|---|---|---|---|
| Q07 | V3§7 L404 QA07 | intact centers no forced result /G1A |07oracle →11QA07| D/PENDING |
| Q08 | V3§7 L405 QA08 | breach not control /G2C |06T5/M6 →11QA08| F/PENDING |
| Q09 | V3§7 L406 QA09 | survivors explained/preserved /G1A/G2A |06/07§8 →11QA09| D/PENDING |
| Q10 | V3§7 L407 QA10 | same detailed-order parity /G1A/B |03 →11QA10| D/PENDING |
| Q11 | V3§7 L408 QA11 | convoy/trade/stores/finance /G2C/H |06M4/10 →11QA11| F/PENDING |
| Q19 | V3§7 L416 QA19 | genuine manual simultaneous formation commands /G1A |04/08/09 →11QA19| D/PENDING |
| Q20 | V3§7 L417 QA20 | dispatch through delegated campaign /G2B |10§3 →11QA20| F/PENDING |
| Q21 | V3§7 L418 QA21 | visible/headless identical events/results /G1A/B/G2A |03 →11QA21| D/PENDING |
| Q22 | V3§7 L419 QA22 | predispatch/preclash mode no history rewrite /G2B |10§3 →11QA22| F/PENDING |
| Q23 | V3§7 L420 QA23 | cautious commander obeys instruction, no buffs /G1B/G2B |05/10§1 →11QA23| F/PENDING |
| Q24 | V3§4 L72–76; §7 L388–392/L422 | G0 design, prototype human review,1000+,unit/integration/mobile/history evidence |08/10/11§1–5; optional5testers/4of5 suggested not proven| D/F/PENDING |
| Q25 | V3§8 item6 and§9 battle exclusions | only new engine/two modes/no control-switch obligation |03/10/12L03/L04;QA10/22/X19| D/F/PENDING |

<a id="assignment-trace"></a>
## 7. Replacement assignment coverage and override preservation

C34§7 override ledger explicitly preserves: V3§1/2 “two scenarios” superseded; V3QA18 China BattleV2 superseded by R unsupported-save safety; C33§4 China canceled but performance retained; C33§7 §2/T10–11/§9/QA18 only China support canceled; C33§9 China paths becomes R removal and G2 Umayyad no-fallback; old V3.3 execution program replaced byH; oldF China checks canceled; V3§10/A001–A189 text frozen; old quick resolve prohibited in future final product. None silently deletes save safety or other H/I/J requirements.

| ID | G0 assignment section / requirement bundle | Document / exact section | Evidence / future phase |
|---|---|---|---|
| A00 | §0 authority, statuses, ambiguity/no fake evidence |01§1–2;12§1–4| D04;owner choices remain open |
| A01 | §1 exact R/new isolated branch/docs-only/git safety |01§3;13 repository checks| D01/G0 |
| A02 | §2 required sources/trace/all tenQA |01§1/4–6;11§1| D04/G0;future gates preserved |
| A03 | §3 ten player promises operationalized |02§1;03;06| QA07/09/10/19/21,X01/09,UX01 |
| A04 | §4 all nine lessons/principle/mechanic/failure/evidence/cost/confidence |02§2| D04;G1A human gate |
| A05 | §5 full four-phase loop/persistence/visibility/errors |02§3–5;04§6/7| X09/11,UX03/08 |
| A06 | §6 versioned state/all world/personnel/leader/intel/event/invariants/examples |04§1–3/7/8| D02/03;X01/03/14 |
| A07 | §7 physical rules/formulas/all terrain/resources/full order table |05;04§5| X04/07/15/16;G1A/G2C |
| A08 | §8 deterministic streams/precision/snapshot/replay/API/traces/conservation |03§2–5| QA10/21,X03/08/14 |
| A09 | §9 six endings/six missions/objectives/deadlines |06§1–4| QA07/08/11,X02/05/06 |
| A10 | §10 result schema/example/aliases/evidence/conservation/once/save/old seams |06§5–8;10§5/6| D02/03;QA09,X13/19/20 |
| A11 | §11 modes/oneengine/G1B/G2/5questions/succession |10§1/3;03;05| QA10/20/21/22/23,X12 |
| A12 | §12 wing roster/map/JSON/A–E/oracle/evidence |07§2–8| QA07/X02/07/10 |
| A13 | §13 one G1A field/two configs/three scripts/mobile human gate |08;07§3| QA19/UX01/02;owner5questions |
| A14 | §14 RTL320/390/landscape/safeareas/taps/8journeys/4indicators |09;02§3| UX01–08;device pending |
| A15 | §15 fairAI/command/retreat/10exploits |05;04§7;10§1| X02/04/09/10/11/15/16,QA23 |
| A16 | §16 G2A/B/C adapter/allmissions/campaign consistency |10§2–6;06§4/7| QA08/11/20/22,X13/19 |
| A17 | §17 performance/reliability/accessibility/safetransitions |10§7/8;03§6;09| FUT01–20,QA21,UX01–08 |
| A18 | §18 tenQA detailed steps/negative/metamorphic/1000+ |11§1–4| allQA/X/UX pending |
| A19 | §19 no unilateral final choices/bounded options/comparison |12§2/3 P01–P15| D04/owner review |
| A20 | §20 exact14files/bilingual terms/crosslinks/illustration honesty |README;04/06;13| D02/G0 |
| A21 | §21 three distinct audits/counts/severity/fixes/open choices |13 three passes| D04/G0 |
| A22 | §22 acceptance/commit/push/Arabic report/stop |README;13;delivery message| D01–04;owner review pending |

Matrix status means location+future observation supplied, not that a future test passed. The only executed evidence may be source/code inspection, source-byte hashing, structural JSON/link/ledger checks and git verification as individually recorded in13. Runtime correctness, phone usability, fun, historical accuracy and performance remain unproven.
