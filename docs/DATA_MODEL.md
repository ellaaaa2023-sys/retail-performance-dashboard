# Retail Performance Dashboard — Data Model

> Status: architecture contract for the next refactor. No Phase 5 code has been implemented.
> Audit date: 2026-08-15 (Asia/Shanghai).

## 1. Source of Truth and Security Boundary

The only current standard Mock Dataset is:

```text
sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx
```

It is the default input for feature development, parser refactoring, field mapping, and Dashboard testing. Legacy workbooks are retained but are not compatibility targets and must not be read unless the user explicitly requests it.

Only Mock Data may enter the project directory, Git, GitHub, Vercel, or AI workflows. Real company data must remain in the approved company environment and must never be committed to Git.

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

Detail sheet discovery must parse, without hard-coded years:

```text
LRP Counter Y<year> <S1|Full Year>
```

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
- AUP is not Store Productivity (`门店总单产`). Store Productivity remains a store-level field used for Tier, Bubble size, and store analysis.
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
  pnl: { ...mapped P&L amounts and ratios },
  source: { sheetName, rowNumber }
}
```

`TOTAL` and other total/subtotal rows are excluded before duplicate-key checks. The store key is `Terminal + periodKey`.

## 6. Field Mapping Rules

Mapping is semantic and header-based. Fixed column positions are forbidden.

High-risk Workbook mappings:

| Canonical field | Current Workbook header | Rule |
|---|---|---|
| Terminal | `Terminal` | Stable store identifier |
| Store Productivity Tier | `门店单产等级` | Values are discovered from data; never hard-code the tier list |
| Store Productivity | `门店总单产` | Bubble size source; do not infer from column I |
| POS count | Summary `POS no.` | Portfolio KPI; for filtered store scope use distinct Terminal count |
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
POS no. = distinct Terminal count
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

## 9. Known Gaps Before Phase 5

- No separate Full Year Mock fixture exists yet.
- Store-detail component rounding can create Bridge residuals; Phase 5 must report these as reconciliation errors rather than correcting them.
