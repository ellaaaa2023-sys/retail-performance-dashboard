# Retail Performance Dashboard — Data Model

> Status: implemented data contract through Phase 2B Data Model Extension.
> Audit date: 2026-08-20 (Asia/Shanghai).

## 1. Source of Truth and Security Boundary

The only current standard Mock Dataset is:

```text
sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx
```

It is the default input for feature development, parser refactoring, field mapping, and Dashboard testing. Legacy workbooks are retained but are not compatibility targets and must not be read unless the user explicitly requests it.

Only Mock Data may enter the project directory, Git, GitHub, Vercel, or AI workflows. Real company data must remain in the approved company environment and must never be committed to Git.

### 1.1 Final shared calculation contracts

Ratio variance is a percentage-point difference mathematically, but the UI displays it with the normal percent sign:

```text
ratioVariance = currentRatio - comparisonRatio
```

Example: Current `-27.9%` minus Comparison `-27.6%` displays `-0.3%`. It is never divided by the comparison ratio, and a negative comparison base does not reverse the direction.

This contract applies to Total Minorations %, Gross Margin %, Customer Contribution %, CA Net % of Gross Sales, every P&L line `% OF SALES`, expense ratios, and Bridge driver ratio metadata. Metrics without an explicit ratio representation keep their existing amount/count comparison semantics.

Summary workbook percent columns use percentage-point representation. Parsing is semantic and unconditional:

```text
parseWorkbookPercentagePoint(71.4) = 0.714
parseWorkbookPercentagePoint(-0.2) = -0.002
```

There is no magnitude heuristic. Core-calculated ratios are already decimal ratios and are never sent through the workbook percentage-point parser. Formal finance ratios are calculated from canonical amounts, not selected from workbook percent cells; the workbook percentages remain available only as source-comparison metadata.

`js/data/core-data.js` owns the single line-level denominator registry:

| Denominator | P&L lines |
|---|---|
| Gross Sales | Gross Sales, Discount, Rebates, Promotional Allowance, Returns, VIP Redemption, OCA, Coupon, Total Minorations, and their Summary commercial-investment components |
| CONSO Net Sales | CONSO Net Sales onward: cost lines, Gross Margin, all A&P lines, Specific A&P, Specific SG&A, Customer Contribution, Non-specific Costs, Operating Profit |

Therefore Gross Sales and CONSO Net Sales each display `100%` on their own registered basis. The separate top-card `CA Net % of GS` remains `CONSO Net Sales / Gross Sales` and is not a P&L-line ratio.

Reconciliation validates levels before movement. Reported subtotals remain authoritative display values; component sums and residuals are metadata and never overwrite source values:

```text
level residual = derived component sum - reported subtotal
movement residual = derived component movement - reported subtotal movement
```

The centralized tolerance is `1 KRMB` for amounts because Detail and parts of Summary are whole-KRMB source values. The centralized ratio tolerance is `0.0001` decimal, equal to `0.01` percentage points and below the UI's `0.1` percentage-point display precision. Values outside either tolerance block the applicable Bridge view. No `Other`, `Rounding`, or residual driver is inserted.

Amount Bridge reconciliation is:

```text
Comparison amount + Σ driver amount variance = Current amount
driver amount variance = Current amount - Comparison amount
```

Customer Contribution ratio semantics use the same canonical amount hierarchy and denominator:

```text
CC% = Customer Contribution / CONSO Net Sales
CC% = Gross Margin% + Specific A&P% + Specific SG&A%
ΔCC% = ΔGross Margin% + ΔSpecific A&P% + ΔSpecific SG&A%
```

The Data Service returns parallel `customerContributionBridge.amount` and `.ratio` calculation views. Summary uses eight non-overlapping drivers; filtered scope uses the three reported subtotals. Granularity is explicit metadata. Required driver `null`, `undefined`, or non-finite values are unavailable/blocking; a finite zero remains valid.

Canonical A&P Expense is:

```text
signed A&P amount = store.pnl.specificAP
A&P spend magnitude = abs(store.pnl.specificAP)
```

Customer Samples, Promotional Gifts, Animations, POS Advertising, Specific Development, and the Specific A&P subtotal must not be summed as one formal total because that double-counts the subtotal.

## 2. Audited Workbook Structure

| Sheet | Used business area | Role | Header | Data scope |
|---|---|---|---|---|
| `P&L review Y26` | `A1:AN42` | Portfolio Summary P&L | Multi-row header: rows 1–4 | 2026 S1 vs 2025 S1, plus tier cuts |
| `LRP Counter Y26 S1` | `A1:BQ162` | Current-period Store P&L detail | Row 1 | 160 stores plus one `TOTAL` row |
| `LRP Counter Y25 S1` | `A1:BQ152` | Prior-year same-period Store P&L detail | Row 1 | 150 stores plus one `TOTAL` row |

All three sheets contain cached/static values and no Excel formulas. Therefore, the application must validate the P&L relationships itself; it cannot rely on workbook formulas as an executable specification.

### 2.1 Summary P&L layout

The Summary sheet is a financial statement, not a rectangular store fact table:

- Row 1: report title, including `2026 S1`.
- Row 2: period labels (`2025 S1`, `2026 S1`).
- Row 3: value scope (`Actual`, `Actual Adj.`) and tier labels.
- Row 4: units (`KRMB`, value, percent).
- Rows 5–42: ordered P&L lines and KPI rows.
- Columns C/D: prior-year Actual value / percent.
- Columns E/F: prior-year Actual Adjusted value / percent.
- Columns G/H: current Actual value / percent.
- Columns I/J: current Actual Adjusted value / percent.
- Column K: workbook-provided rate/variance presentation; it is not the absolute bridge variance and must not be used as such.
- Columns L:AN: tier-level summary blocks.

`Actual` and `Actual Adj.` are separate source scopes and must both be preserved in the normalized model. They must not be collapsed during parsing. In the current Workbook, AUP is populated only in the Adjusted columns, while most financial amount rows are populated in both scopes.

### 2.2 Store Detail layout

Each Detail sheet is a wide table:

- One row per Terminal for one Review Period.
- Year and Review Period are encoded in the Sheet name, not repeated as columns.
- The final `TOTAL` row is a workbook control row and must be excluded from store records.
- Current and comparison are stored on separate sheets.
- The Header is currently row 1, but header discovery must remain dynamic.

The current detail sheets contain 69 named business columns plus one empty trailing column. Important headers include:

```text
Terminal; Store; City; Region; Nature; 门店单产等级; 城市POS数; 门店总单产;
Status; RSP; Gross Sales; Discount; Rebates; Bom PA; PA Retro Funding;
TTL PA; Actual Returns; VIP Redemp.; OCA; Coupon; Total Minorations;
Total Minorations% of GS; CA NET; COGS; Royalty; PD; PLV1; OBSL;
Gross Margin; Trade Relation; Sample; PLV2; Amort.Y2025; Bal. Capex;
Amort. + Writeoff; POS.; Mer.; ANM.; Tester; DA HC; DA Cost;
specific dev.; DA Cost+specific dev.; Others; Specific A&P; Specific SG&A;
Client Contribution; Unspecific Costs; Operating Profit
```

### 2.3 Integrated Detail Cleaning contract

`js/data/detail-schema.js` is the single source for Detail canonical keys, exact aliases, types, Cleaning requirements, Dashboard Core requirements, and feature capability membership. The active browser sequence is:

```text
XLSX Workbook
  → isolate and parse Summary P&L unchanged
  → scan every remaining worksheet by Detail schema
  → clean compatible sheets into canonical intermediate sheets
  → validate Dashboard Core readiness
  → extract period metadata independently
  → assign exactly one Current and one Prior-Year Same-Period Comparison
  → normalize only those assigned sheets into store records
```

Cleaning compatibility requires exact, whitespace-normalized matches for `terminal`, `store`, `city`, `region`, `grossSales`, `netSales`, `grossMargin`, and `customerContribution`. It never depends on the Sheet name. Unknown columns are preserved in scan metadata; near-compatible and incompatible sheets do not enter the normalized Detail model.

The canonical intermediate sheet retains source row/column indices, raw and cleaned cell values, formula metadata, diagnostics, and per-sheet capabilities. It is an adapter boundary only: it does not create store objects and does not assign Current/Comparison roles.

## 3. Review Period Contract

The only valid Review Periods are:

```text
S1
Full Year
```

There is no S2, monthly, MoM, or monthly trend model.

Canonical values:

```text
S1        → S1
Full Year → FULL_YEAR
```

The user-facing selector displays the single detected value, `S1` or `Full Year`; the internal canonical value may use `FULL_YEAR`.

### 3.1 Workbook form

The current architecture is `One Workbook = One Review Period`.

An S1 Workbook contains one current/prior-year pair:

```text
P&L review Y26
LRP Counter Y26 S1
LRP Counter Y25 S1
```

The Full Year Workbook follows the same pattern:

```text
LRP Counter Y26 Full Year
LRP Counter Y25 Full Year
```

Multi-period Workbooks are out of scope. They may be added later only if the business workflow changes. The current Mock Workbook provides the S1 fixture; a separate Full Year fixture is still required for validation.

### 3.2 Period detection

After schema-based Cleaning eligibility succeeds, period metadata may be extracted from an exact Sheet-name suffix, without hard-coded years:

```text
... Y<year> <S1|Full Year>
```

Examples include `LRP Counter Y26 S1` and `Counter Data Y26 S1`. A compatible sheet named only `Counter Data` is cleaned but remains `unassigned`; Sheet order and row count are never used to guess its role.

Summary period detection must use visible report metadata such as the title and period header cells, because `P&L review Y26` does not include `S1` in the Sheet name.

Every detected period becomes:

```text
{
  year,
  reviewPeriod,      // S1 | FULL_YEAR
  periodKey,         // e.g. 2026:S1
  displayLabel,      // e.g. 2026 S1
  currentDetailSheet,
  summarySource
}
```

## 4. Comparison Contract

Comparison is always:

```text
Prior Year Same Period
```

Examples:

- 2026 S1 → 2025 S1.
- 2026 Full Year → 2025 Full Year.

There is no user-selectable Comparison mode and no Previous Review comparison. The normalized model must create an explicit comparison pair for each selectable current period and report a data-quality error when the prior-year same-period sheet is absent.

## 5. Dual-Layer Normalized Model

```text
WorkbookModel
├── metadata
│   ├── workbookScan
│   └── capabilities { current, comparison, resolved }
├── periods[]
├── periodPairs{}
├── portfolioSummaryByPeriod{}
├── storeRecordsByPeriod{}
├── fieldMappings{}
└── diagnostics[]
```

### 5.1 Portfolio Summary model

Each Summary P&L line is normalized by semantic identity rather than row number:

```text
{
  lineKey,
  sourceLabel,
  hierarchyLevel,
  currentActual,
  currentActualPct,
  currentAdjusted,
  currentAdjustedPct,
  comparisonActual,
  comparisonActualPct,
  comparisonAdjusted,
  comparisonAdjustedPct
}
```

Rows are identified by mapped P&L labels and aliases. Row numbers from the audited fixture are evidence, not implementation constants.

Default Portfolio rules:

- Financial KPIs, P&L Snapshot, and Bridges default to Summary `Actual Adj.` values.
- `Actual Adj.` is the final business scope formed after detail adjustments and is the authoritative presentation basis.
- Raw `Actual` is retained only as a fallback when the required Adjusted value is absent; fallback use must remain visible in source metadata.
- AUP is read only from Summary P&L. It is never calculated from Store Detail and is not affected by Region, City, Status, or Productivity Tier filters.
- AUP is not Store Productivity (`门店总单产`). Store Productivity remains a store-level field used for Tier, tooltip, Store Detail, and store analysis; Quadrant points use a fixed size.
- Column K is not an absolute variance source; absolute variance is calculated as Current minus Prior Year Same Period.

### 5.2 Store record model

Each Detail row becomes:

```text
{
  year,
  reviewPeriod,
  periodKey,
  terminal,
  store,
  city,
  region,
  status,
  productivityTier,
  storeProductivity,
  daHeadcount,
  cityPosNo,
  pnl: { ...mapped P&L amounts and ratios },
  metrics: {
    ...portfolio metrics,
    daHeadcount,
    apExpense,          // signed Specific A&P
    apExpenseMagnitude // abs(Specific A&P)
  },
  source: { sheetName, rowNumber }
}
```

`TOTAL` and other total/subtotal rows are excluded before duplicate-key checks. The store key is `Terminal + periodKey`.

Cleaning retains `TOTAL` in the intermediate rows; only the Core Detail parser excludes it. Known optional fields that are absent or invalid remain `null`, not zero. Signed financial values, including `specificAP`, pass through unchanged.

Resolved Dashboard capabilities combine the Current and Comparison sheet capabilities. A capability is `available` only when both sides are available, `unavailable` when both are unavailable, and otherwise `partial`; missing fields remain separated by period.

DA HC has an additional row-completeness contract in the Data Service. A period is `available` when every in-scope store has a finite value, `partial` when only some do, and `unavailable` when none do. A finite zero is valid. The contract returns store count, valid count, missing count, and valid subtotal; the formal filtered total is `null` unless completeness is `available`. Unfiltered Total Portfolio uses authoritative Summary DA HC when present and otherwise falls back to a complete Detail sum.

### 5.3 Store Current / LY comparison contract

`js/store-portfolio.js` contains neutral store-portfolio calculations. The Data Service builds one comparison record per Current store using exact `Terminal` equality only. Store name, City, and fuzzy matching are prohibited; Comparison-only stores do not enter the Current portfolio collection.

Each record exposes Current and LY DA HC, Productivity, canonical Customer Contribution amount, and canonical CC%. CC% is calculated through the shared Finance Contract as Customer Contribution divided by CONSO Net Sales. Workbook percentage fields are not used.

```text
productivityEvolPct = (Current Productivity - LY Productivity) / LY Productivity
```

The value is a decimal ratio. Missing LY, zero LY, missing Current, and new-store cases return `null` with separate calculation reasons; new-store lifecycle status is not conflated with calculation status. Negative LY is also rejected as an invalid comparison base.

Performance eligibility requires finite Current CC%, Current Productivity, and Productivity Evol %. Excluded stores retain a reason and are counted. The reusable threshold helper returns the median Current CC% over eligible stores in the active Current filter scope only; an empty eligible set returns `null`.

The Headcount Efficiency dataset contains Current Terminal, Store, Region, City, DA HC, and Productivity. Per-DA-HC descriptive statistics use Tukey median-of-halves quartiles: for odd samples the overall median is excluded from both halves; one observation has Q1 = median = Q3 and IQR = 0; empty groups return `null` statistics. Adjacent DA HC groups expose IQR overlap range and width as descriptive metadata only, never as a staffing recommendation.

## 6. Field Mapping Rules

Mapping is semantic and header-based. Fixed column positions are forbidden.

High-risk Workbook mappings:

| Canonical field | Current Workbook header | Rule |
|---|---|---|
| Terminal | `Terminal` | Stable store identifier |
| Store Productivity Tier | `门店单产等级` | Values are discovered from data; never hard-code the tier list |
| Store Productivity | `门店总单产` | Tier/tooltip/store detail source; it no longer controls point size |
| DA HC | `DA HC` | Sales headcount; finite zero remains valid and missing remains `null` |
| POS count | Summary `POS no.` / Detail `城市POS数` | Total Portfolio uses Summary; filtered/store views sum active `cityPosNo` |
| POS advertising component | Detail `POS.` | Expense component; must never auto-map to POS count |
| CONSO Net Sales | Detail `CA NET ` | Header normalization must trim whitespace |
| Customer Contribution | Detail `Client Contribution` | Supported alias |
| Ignored dimensions | `Nature` and Store Type | Neither is normalized or exposed as a filter |

Automatic mapping must use exact normalized alias matches first. Fuzzy matching must not map amount and percentage variants, subtotals and components, or `POS.` and `POS no.` without conflict checks.

## 7. Portfolio Source Rules

### 7.1 Total Portfolio mode

When Region, City, Status, and Productivity Tier are all unfiltered:

- Executive Overview uses Summary P&L.
- P&L Snapshot uses Summary P&L.
- Portfolio Bridges and Driver Analysis use Summary P&L rows.
- Store views continue using Detail rows.

### 7.2 Filtered Portfolio mode

When any store-level filter is active:

- Portfolio KPIs are recalculated from filtered Detail rows.
- AUP remains the unfiltered Summary P&L value and is explicitly exempt from filtered recomputation.
- The UI must explicitly display `Filtered Portfolio`.
- Ratios use ratio-of-sums, not averages of store percentages.
- The unfiltered Summary total must not be presented as if it were filtered.

Core calculations:

```text
Gross Margin % = Σ Gross Margin / Σ CONSO Net Sales
Customer Contribution % = Σ Customer Contribution / Σ CONSO Net Sales
Total Minorations % = Σ Total Minorations / Σ Gross Sales
POS no. = Σ active store cityPosNo
```

The current store rows contain whole-KRMB rounding. Aggregated Detail totals differ slightly from Summary totals, which confirms that Summary remains the authoritative unfiltered source.

## 8. Audited Bridge Definitions

All Bridge deltas use:

```text
driverVariance = currentActual - comparisonActual
```

### 8.1 Total Minorations Bridge

Summary drivers, using real P&L lines:

```text
Structural Conditions On
Structural Conditions Off
Total Active Support
Promo allow on invoice
Promo allow applied separately
Promo allow loyalty
Total Returns/var provisions
```

Audited S1 result:

```text
Target variance: -1,840 KRMB
Driver sum:      -1,840 KRMB
Residual:             0 KRMB
```

### 8.2 Gross Margin Bridge

```text
CONSO Net Sales impact
Std COS
Royal / TA / MS
Special Operations cost
Obsolete / Slow moving / Returns
Physical Distribution
```

Audited S1 result:

```text
Target variance: +1,943 KRMB
Driver sum:      +1,943 KRMB
Residual:             0 KRMB
```

### 8.3 Customer Contribution Bridge

The finest non-overlapping Summary lines are:

```text
Gross Margin impact
Customer Samples
Promotional gifts
Animations
Amortization of POS advertising
Other POS advertising costs
Specific development
Total Specific SG&A
```

`Specific A&P` is the subtotal of the A&P component lines and must not be added again, or the Bridge will double count.

Audited S1 result:

```text
Target variance: +519 KRMB
Driver sum:      +519 KRMB
Residual:          0 KRMB
```

### 8.4 Reconciliation behavior

The Bridge must verify:

```text
Comparison KPI + Σ driver variances = Current KPI
```

If the residual exceeds the configured numeric tolerance, the Dashboard must show `Bridge reconciliation error` and must not mark the chart reconciled.

Filtered Bridges must calculate the target KPI and every Driver variance from the same filtered Store Detail aggregates. No rounding/residual bar is permitted. Any non-zero residual outside numeric tolerance is a data or calculation defect and must produce `Bridge reconciliation error` without silent correction.

### 8.5 Final Bridge UI and ratio metadata

Core retains the three Summary Bridge APIs: Total Minorations, Gross Margin, and Customer Contribution. Page 02 intentionally consumes only Customer Contribution.

- Summary Customer Contribution: 8 non-overlapping drivers listed in 8.3.
- Filtered Customer Contribution: Gross Margin, Specific A&P, Specific SG&A only.
- Each Bridge and driver exposes `currentRatio`, `comparisonRatio`, and `ratioVariance` for readouts/tables.
- Those ratio fields never replace the amount fields used by waterfall reconciliation or Store Variance Ranking.

Page 02 presents the parallel contracts through one `Amount | %` control. Amount is the default. Ratio anchors are formatted as percentages and driver movements as percentage points; the two reconciliation gates remain independent, so one mode may remain available when the other is blocked. The Driver Analysis table continues to show both amount and `% OF SALES` columns regardless of the selected Bridge mode.

## 9. Phase 3 UI Consumption Contracts

- Page 01 obtains Current and Comparison DA HC only through `getDAHeadcountSummary(filters)`. Total Portfolio follows the authoritative Summary/Detail rule; filtered scopes use the Data Service aggregate. Missing or partial formal totals display unavailable and are never converted to zero.
- Page 04 reads Current and Comparison DA HC from the matched store payload. The visible metadata uses Current DA HC and may show LY DA HC as secondary context.
- Formal Total A&P is the spend magnitude `abs(store.pnl.specificAP)` for each period. Its displayed spend movement is `Current spend - Comparison spend`; canonical signed P&L amounts remain unchanged.
- The A&P component pool stays a descriptive composition dataset. It is not substituted for formal Total A&P and is not adjusted to close a rounding difference.

## 10. Known Limitations After Phase F

- No separate Full Year Mock fixture exists yet.
- Filtered Customer Contribution cannot safely expand beyond Gross Margin / Specific A&P / Specific SG&A with the current Detail hierarchy.
- Store-detail KRMB rounding can create filtered Bridge residuals; the implementation reports `BRIDGE_RECONCILIATION_ERROR` and does not correct them.
- The old A&P component list remains useful only as source-line reference; it is not a complete, non-overlapping bridge to the Specific A&P subtotal.
