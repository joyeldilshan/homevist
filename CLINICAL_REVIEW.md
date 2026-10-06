# Clinical review required

**Status: NOT REVIEWED. Not safe for clinical use.**

This file lists every test, parameter, unit and reference range currently in
the seed catalogue ([backend/utils/seed.js](backend/utils/seed.js)).

These values were **inherited from the original Sri Lanka build and carried
over unchanged**. Nothing here has been converted, recalculated or verified.
No clinical judgement has been applied to any of it.

A suitably qualified person (a consultant clinical biochemist, haematologist,
or the accredited laboratory providing the service) must review and sign off
every row below before this catalogue is used to report a real patient result.

---

## Known issues to raise with the reviewer

1. **Units are not UK-conventional.** Several parameters use `mg/dL` and
   `mill/cumm` — US / South Asian conventions. UK laboratories normally
   report in SI units (`mmol/L`, `×10⁹/L`, `×10¹²/L`). Converting these is a
   clinical decision, not a text substitution, and has deliberately not been
   attempted.
2. **Reference ranges are not stratified.** None of the ranges below vary by
   sex, age, pregnancy or ethnicity. Several of them normally do — notably
   haemoglobin, PCV and creatinine-adjusted measures.
3. **Provenance is unknown.** There is no record of where these ranges came
   from or which analytical method or instrument they apply to. Reference
   ranges are method-dependent.
4. **No units of measurement are recorded for the reporting laboratory.** The
   range must match the assay actually used.

---

## 1. Complete Blood Count (CBC)

Code `CBC` · Category: haematology · Turnaround: 24h
Preparation: No special preparation required.

| Parameter | Unit | Reference range as configured | Reviewed? |
|---|---|---|---|
| Haemoglobin | g/dL | 13.0 – 17.0 | ☐ |
| RBC | mill/cumm | 4.50 – 5.50 | ☐ |
| WBC | /cumm | 4,000 – 11,000 | ☐ |
| Platelets | /cumm | 150,000 – 400,000 | ☐ |
| PCV | % | 40 – 50 | ☐ |

## 2. Blood Glucose (Fasting)

Code `FBS` · Category: biochemistry · Turnaround: 2h
Preparation: Fast for at least 8 hours before the test. Water is allowed.

| Parameter | Unit | Reference range as configured | Reviewed? |
|---|---|---|---|
| Fasting Blood Sugar | mg/dL | 70 – 100 | ☐ |

## 3. Lipid Profile

Code `LIPID` · Category: biochemistry · Turnaround: 24h
Preparation: Fast for 9–12 hours before the test.

| Parameter | Unit | Reference range as configured | Reviewed? |
|---|---|---|---|
| Total Cholesterol | mg/dL | < 200 | ☐ |
| HDL | mg/dL | > 40 | ☐ |
| LDL | mg/dL | < 100 | ☐ |
| Triglycerides | mg/dL | < 150 | ☐ |

## 4. Thyroid Profile (TSH, T3, T4)

Code `THYROID` · Category: immunology · Turnaround: 48h
Preparation: No special preparation required.

| Parameter | Unit | Reference range as configured | Reviewed? |
|---|---|---|---|
| TSH | mIU/L | 0.4 – 4.0 | ☐ |
| T3 | ng/dL | 80 – 200 | ☐ |
| T4 | ug/dL | 5.0 – 12.0 | ☐ |

## 5. Liver Function Test (LFT)

Code `LFT` · Category: biochemistry · Turnaround: 24h
Preparation: Fast for 4–6 hours before the test.

| Parameter | Unit | Reference range as configured | Reviewed? |
|---|---|---|---|
| ALT | U/L | 7 – 56 | ☐ |
| AST | U/L | 10 – 40 | ☐ |
| Bilirubin Total | mg/dL | 0.2 – 1.2 | ☐ |

## 6. HbA1c

Code `HBA1C` · Category: biochemistry · Turnaround: 4h
Preparation: No fasting required.

| Parameter | Unit | Reference range as configured | Reviewed? |
|---|---|---|---|
| HbA1c | % | < 5.7 (Normal) | ☐ |

---

**17 parameters across 6 tests. 0 reviewed.**

Prices are held separately in [backend/config/locale.js](backend/config/locale.js)
and are placeholders — they are a commercial decision, not a clinical one.

| | |
|---|---|
| Reviewed by | |
| Role / registration number | |
| Date | |
| Signature | |
