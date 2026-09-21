# JCC FTL v4 — Peer Test Guide

Test build: `JCC_FTL_Peer_Test_v4.html`

This is a **pre-release planning-aid build**. It must not replace the current OMA, Centrik FTL reporting, OCC/NPFO/SM approval, or commander judgement.

## What to test

Use normal operational examples and deliberately test boundaries.

1. Enter a duty under **NCC**, note maximum FDP and UTC duty-end time, then switch to **CAT/AOC**. Confirm **all entered values remain unchanged** and only the applicable limit/rule result changes.
2. Test acclimatised and not-acclimatised duties.
3. Test 1–8+ sectors.
4. Test report times immediately either side of 0600, 0700, 1300, 1800 and 2200.
5. Test long sectors around NCC 09:00/09:01 and 11:00/>11:00, and CAT 07:00/>07:00, 09:00/>09:00 and 11:00/>11:00.
6. Test split duty and in-flight relief.
7. Test CAT standby, delayed reporting and interrupted rest.
8. Test PIC discretion and NCC planned variation.
9. Test cumulative limits and days-off screens under both rule sets.
10. Enter a planned FDP in Advanced Options and confirm the result changes between **LEGAL**, **NOT LEGAL**, or **NOT CONFIRMED** as appropriate.
11. Test airport/location and UTC conversion for airports you know.
12. Test **Share** and **Save**.

## Report an issue with

- Rule set: NCC or CAT/AOC
- Exact inputs
- Result shown
- Result you expected
- OMA clause/table you believe applies
- Screenshot if possible
- Device/browser

Do not report a difference as a software defect until the underlying OMA interpretation has been checked.
