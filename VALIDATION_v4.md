# JCC FTL Calculator v4 — Validation Report

Branch: `feature/dual-rules-liquid-glass`

Validated against the supplied JCC source material:
- NCC: `2026_JCC_PART_NCC_OMA_I2R19`, Section 7.5, 29 June 2026.
- CAT/AOC: embedded Section-7 revision `20201201_JCC_OMA_I1R8` from the supplied UK Part-CAT OMA.

## Automated validation

Node validation suite result: **27,357 passed / 0 failed**.

The suite covers:
- Every NCC and CAT/AOC Table A cell.
- Every NCC and CAT/AOC Table B cell.
- Start-time band boundaries at 0559/0600, 0659/0700, 1259/1300, 1759/1800 and 2159/2200.
- Table B preceding-rest boundaries around 18h and 30h. Exactly 30h is deliberately returned as review-required because the supplied wording is ambiguous.
- NCC long-sector boundaries at 09:00/09:01, 11:00/>11:00.
- CAT long-sector boundaries at 07:00/>07:00, 09:00/>09:00, 11:00/>11:00.
- Actual-sector to modified-sector aggregation, including multi-sector duties.
- Additional-current-type-rated-pilot bypass of long-sector modified counts.
- In-flight relief boundaries below/at/above 3h, bunk/seat arithmetic, qualification/facility confirmation and absolute FDP caps.
- Split-duty qualifying-rest boundaries below/at 3h, 6h, 10h and >10h, plus NCC 20-minute versus CAT 30-minute excluded-duty minima and facility/accommodation qualification.
- CAT delayed reporting: <4h, exactly 4h, more limiting planned/actual band and ≥10h undisturbed-rest treatment.
- CAT standby: <6h, 6h, >6h, 12h and >12h.
- CAT interrupted-rest calculation and window boundaries.
- PIC discretion: NCC max 3h; CAT two-or-more-sector 2h restriction except single-sector / immediately before final sector.
- NCC planned variation approval paths; CAT planned-variation section treated as Reserved.
- NCC/CAT minimum-rest baselines, away-base reductions, travel additions and local-night triggers.
- NCC cumulative limits 65/105/190/2000.
- CAT cumulative limits 55/95/190/2000.
- 100h/28d and 900h/12m flying limits.
- Days-off checks including 7/28d, 24/12 weeks, NCC 16-day two-day-off sequence, CAT 14-day sequence and CAT 96 days/year.
- Legal threshold equality and exceedance.
- Cross-product stress tests across ruleset, acclimatisation, report-time band, sector count, preceding-rest band, long-sector boundary and extension method.
- Ruleset-switch invariant: switching NCC ⇄ CAT/AOC does **not mutate or reset input values**; only the applicable rule output changes.

## Deliberate review states

The engine does not invent a numerical answer where the supplied source is incomplete or ambiguous. It returns review/not-confirmed for:
- Exactly 30h preceding rest under Table B.
- CAT non-acclimatised two-pilot sector over 11h.
- Split-duty qualifying rest over 10h.
- Missing relief-crew or qualifying-rest-facility confirmations.
- CAT planned FTL variation because the supplied Section 7 marks that section Reserved.
- NCC delayed-report / interrupted-rest / standalone standby numerical treatment where the supplied current NCC Section 7.5 does not provide an equivalent numerical rule.
- Emergency PIC discretion, which remains a commander operational judgement.

## UI behaviour

The v4 UI is wired to `jcc-ftl-engine-v4.js`. Switching the ruleset preserves entered report time/date, airport/location, acclimatisation, sectors, preceding rest, long-sector data, extension inputs, advanced inputs and planned FDP. The result is recalculated under the newly selected ruleset without clearing those values.

For a true **LEGAL / NOT LEGAL** result, planned FDP must be supplied. If it is absent, the UI shows **LIMIT ONLY** rather than falsely certifying legality.
