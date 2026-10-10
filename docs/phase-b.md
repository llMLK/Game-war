# Phase B: leader system verification

Status: Phase B complete; final automated and visual checks passed. Scope is leaders only. All pre-existing Phase A and other working-tree changes were retained. No commit, reset, checkout, or Phase C work was performed.

## Implemented behavior

- An earned delegation contains two randomly drawn candidates, at most two delegations wait at once, and delegations are separated by at least four turns. A delegation expires after eight turns. Selection consumes the opportunity and withdraws the unchosen candidate.
- Recruitment influence is earned, capped at three, and allows one replacement per delegation. Repeated city/rank/reputation rewards are deduplicated, including rewards earned on turn zero. Loss relief has a campaign cap and a recent-hire lockout. Retirement does not produce a replacement opportunity.
- Candidate selection has a saved campaign seed and serial. Each candidate has a saved acceptance threshold and quoted salary. New campaigns vary, but restoring a saved negotiation cannot reroll its result. Offers have two attempts; an insulting offer ends that candidate's negotiation immediately.
- Salary reflects prestige, ability, experience, personality, specialty scarcity, reputation, treasury, territorial position and multiple active fronts. The UI shows reasons and a qualitative willingness estimate, not the probability formula. Acceptance pays one turn in advance; idle council service retains the existing half-salary rule.
- Leaders have trust, respect, ambition, gratitude, resentment and opinion of the ruler. These influence the existing loyalty system. The expanded starting empire has a bounded administrative loyalty penalty instead of the legacy -60 collapse pressure. Historical friendships/rivalries are seeded where appropriate and campaign relationships continue to develop. Honor, appointments, recalls, broken promises, ignored requests, defeat, rescue and abandonment change the relationship.
- Orders, growth, city captures, victories, losses and personal events produce personality-dependent Arabic dialogue. The optional future dialogue adapter is explicit and disabled by default. No paid API discovery, network generation or keys are used.
- Prestige unlocks social influence and, at the highest tier, limited mentorship. Growth preserves the original trait and flaw; experienced scouts/logisticians can gain one movement point. Basic commissioned officers cannot become an unlimited source of elite leaders through XP.
- Capture, execution, death, retirement, exile and defection feed relationship consequences and a council memorial. Invalid or repeated captive actions cannot pay money, kill leaders or grant loyalty repeatedly. Executions no longer mint fictional sons as replacement heroes.
- New-game historical assignments now resolve the existing Seville/Fustat identities correctly. Missing identities use a modest local officer rather than silently borrowing a ruler. Existing saves keep their armies, leader IDs, commands, XP and negotiated wages.
- The interface uses illustrated manuscript busts, prestige treatments, RTL recruitment comparisons, large touch controls, visible salary sliders, relationship profiles, and a memorial. Portrait layouts have candidate navigation; short landscape layouts have compact headers and a persistent footer.

## Definition of Done checks

| Requirement | Evidence |
|---|---|
| Scarce recruitment and late-game anti-spam | Earned-key, cooldown, bank cap, repeat-city, loss-cap and turn-300 treasury tests |
| Two candidates and limited replacements | All six campaign starts plus actual council-button/browser replacement flow |
| Expiry and migration | Expired delegates cannot accept contracts; legacy quotes and pending state normalized |
| Meaningful negotiation | Monotonic willingness, personality/prestige salary changes, offer validation and refusal tests |
| Stable reload behavior | Save/load preserves selection seed, candidate quotes, attempts, replacement usage and acceptance threshold |
| Relationships and loss matter | Action, promise, appointment, rescue, execution, direct death, defection and dismissal tests |
| Distinct contextual reactions | Personality-specific event lines, city/battle outcome hooks, scars, requests and memory |
| Historical context and no spoilers | Start-date/date-window/region gates, revised prestige, contextual bios and corrected initial assignments |
| No visible source references | All initial leader profiles scanned in the browser for source wording and links; biography data checked for spoilers |
| Mobile UI and interactions | Seven viewport sizes, real touch slider input, candidate navigation, contract submission and profile controls |
| Runnable campaign | Both scenarios advanced through 24 actual end-round/world-tick cycles, then saved and loaded |
| Map integration preserved | Existing route/connectivity harness rerun because leader mastery can affect movement allowance |

## Test commands and results

- `node tests/leaders.cjs`: **29/29** groups. Includes all six campaign/faction starts, deterministic saved randomness, late-game scarcity, negotiation, migrations, relationships, event integration and actual round/world-tick execution.
- `node tests/leader-preview.cjs`: **7/7 viewports**, **40 initial leader profiles**, no JavaScript errors, no horizontal clipping, contained dialogs and footers, correct RTL, no source wording/links. Visible buttons are at least 44px high. Tested 1440×900, 1024×768, 390×844, 360×740, 320×568, 844×390 and 568×320. Exercises council → comparison → reroll → slider → accepted contract → profile → save/load, plus keyboard focus/Escape and the memorial.
- `node tests/leader-actions.cjs`: visible salary-refusal feedback plus actual mobile taps for honor, salary request approval, cancellation/confirmation of dismissal, and persistent contract/relationship state.
- `node tests/map-routes.cjs`: **10/10** existing graph/access/movement tests, including Tartus/Tarsus/Amorium and maritime routes.
- JavaScript syntax checks for all **33** game scripts passed; `git diff --check`.

Browser checks use installed Microsoft Edge through Playwright with touch emulation. The final screenshots were opened and visually inspected; the initial small-phone slider position and short-landscape framing were corrected before the final pass.

## Main final previews

- Recruitment desktop: [recruit-1440x900.png](../artifacts/leaders/recruit-1440x900.png)
- Recruitment portrait: [recruit-390x844.png](../artifacts/leaders/recruit-390x844.png)
- Recruitment landscape: [recruit-844x390.png](../artifacts/leaders/recruit-844x390.png)
- Small-phone negotiation: [offer-320x568.png](../artifacts/leaders/offer-320x568.png)
- Leader profile desktop: [guan-yu-1440x900.png](../artifacts/leaders/guan-yu-1440x900.png)
- Leader profile portrait: [profile-390x844.png](../artifacts/leaders/profile-390x844.png)
- Profile record/actions: [profile-record-390x844.png](../artifacts/leaders/profile-record-390x844.png)
- Memorial: [memorial-1440x900.png](../artifacts/leaders/memorial-1440x900.png)
- Machine-readable layout verification: [verification.json](../artifacts/leaders/verification.json)

## Known limits

No blocking leader defect is known in the tested flows. Portraits are deterministic illustrations, not authenticated likenesses. Minor local officers and the unnamed Khazar office are explicitly modest abstractions rather than fabricated famous biographies. Skill values, salaries, personality intensity, invitation windows and regional access are game design interpretations; the campaign can diverge from history after its start. Existing saves are preserved rather than retroactively moving their commanders to new starting posts. Physical phones and Safari have not been tested. Long-campaign numerical balance beyond the tested scenarios remains an area for playtesting.

## Phase B source and test files

1. `index.html` — loads the leader layer and stylesheet.
2. `leaders.css` — leader cards, dossiers, recruitment, negotiation, portraits and mobile layouts.
3. `js/leader-system.js` — recruitment, contracts, persistent relationships, growth, consequences, migration and leader hooks.
4. `js/commander-data.js` — contextual historical identities, current prestige, aptitudes, relationships and availability.
5. `js/cmd-ui.js` — leader-facing UI, council, recruitment, profile, memorial and accessibility.
6. `js/portraits.js` — coherent illustrated portrait renderer.
7. `js/voices.js` — local contextual reactions and optional future adapter seam.
8. `js/commanders.js` — promise fulfillment requires the promised army size on capture.
9. `js/campaign.js` — execution consequences use surviving companions instead of generating fictional replacement leaders.
10. `js/realm.js` — revenge chronicle no longer invents a father/son relationship.
11. `tests/leaders.cjs` — deterministic leader logic/integration checks.
12. `tests/leader-preview.cjs` — browser interaction, copy, layout and screenshot verification.
13. `tests/leader-actions.cjs` — touch interaction and persistent relationship/contract checks.
14. `docs/leader-research.md` — historical reference notes and interpretation boundaries.
15. `docs/phase-b.md` — this implementation, verification and file report.

Generated previews and their complete file manifest follow. Other dirty files in this repository belong to the existing baseline and were not reset or discarded.

## Generated preview file manifest

- `artifacts/leaders/guan-yu-1440x900.png`
- `artifacts/leaders/memorial-1440x900.png`
- `artifacts/leaders/negotiate-1024x768.png`
- `artifacts/leaders/negotiate-1440x900.png`
- `artifacts/leaders/negotiate-320x568.png`
- `artifacts/leaders/negotiate-360x740.png`
- `artifacts/leaders/negotiate-390x844.png`
- `artifacts/leaders/negotiate-568x320.png`
- `artifacts/leaders/negotiate-844x390.png`
- `artifacts/leaders/offer-1024x768.png`
- `artifacts/leaders/offer-1440x900.png`
- `artifacts/leaders/offer-320x568.png`
- `artifacts/leaders/offer-360x740.png`
- `artifacts/leaders/offer-390x844.png`
- `artifacts/leaders/offer-568x320.png`
- `artifacts/leaders/offer-844x390.png`
- `artifacts/leaders/profile-1024x768.png`
- `artifacts/leaders/profile-1440x900.png`
- `artifacts/leaders/profile-320x568.png`
- `artifacts/leaders/profile-360x740.png`
- `artifacts/leaders/profile-390x844.png`
- `artifacts/leaders/profile-568x320.png`
- `artifacts/leaders/profile-844x390.png`
- `artifacts/leaders/profile-record-1024x768.png`
- `artifacts/leaders/profile-record-1440x900.png`
- `artifacts/leaders/profile-record-320x568.png`
- `artifacts/leaders/profile-record-360x740.png`
- `artifacts/leaders/profile-record-390x844.png`
- `artifacts/leaders/profile-record-568x320.png`
- `artifacts/leaders/profile-record-844x390.png`
- `artifacts/leaders/recruit-1024x768.png`
- `artifacts/leaders/recruit-1440x900.png`
- `artifacts/leaders/recruit-320x568.png`
- `artifacts/leaders/recruit-360x740.png`
- `artifacts/leaders/recruit-390x844.png`
- `artifacts/leaders/recruit-568x320.png`
- `artifacts/leaders/recruit-844x390.png`
- `artifacts/leaders/recruit-first-desktop.png`
- `artifacts/leaders/verification.json`
