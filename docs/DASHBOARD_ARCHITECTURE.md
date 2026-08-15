# Retail Performance Dashboard — Target Architecture

> Status: Phase 3 proposal. It describes the approved migration target but does not indicate that Phase 5 code exists.

## 1. Purpose

Retail Performance Dashboard is a Counter Business Review analysis tool for Finance Business Partners. Its analysis path remains:

```text
Portfolio
  → P&L Variance
  → P&L Driver
  → Store Variance Ranking
  → Store Detail
```

The migration changes the Workbook adapter and business logic while preserving the current offline security boundary, overall visual language, four-page navigation, and drill-down experience.

## 2. Current Architecture and Migration Impact

The current application selects one rectangular sheet, maps it into one `records[]` array, and expects Year and Review Period columns inside that sheet. The new Workbook separates Summary P&L and Store Detail across multiple sheets.

| Area | Current implementation | Required migration |
|---|---|---|
| Parser | `bestSource()` selects one highest-scoring sheet | Discover and classify all Summary and Detail sheets |
| Header detection | One header row for one table | Multi-row Summary header plus Detail header detection |
| Period detection | Year/Review Period fields inside each row | Parse Detail sheet names and Summary report metadata |
| Field Mapping | One mapping schema | Separate Summary line mapping and Detail column mapping |
| Data model | Flat Store × Period records | Dual Portfolio Summary + Store Detail model |
| Comparison | User mode: LY or Previous | Automatic Prior Year Same Period only |
| State | Year, comparison mode, one sheet | Review Period, period pair, summary/detail sources, scope mode |
| Calculations | Portfolio metrics always aggregate Store rows | Summary for Total Portfolio; Detail for Filtered Portfolio |
| Filters | Global independent option lists | Cascading option sets, including Tier → City |
| Overview | Store aggregation and timeline | Summary-led KPI + P&L Snapshot; no timeline |
| Variance | Operating Profit bridge | Three Summary-row Bridges with reconciliation |
| Portfolio | Quadrants, Bubble, Pareto | Productivity Bubble + Store Variance Ranking only |
| Store Detail | Existing store model | Remap new fields and reorder presentation |

Primary future code impact:

```text
index.html
assets/styles.css
js/app.js
```

Recommended Phase 5 module boundary, subject to user approval before creating new files:

```text
js/workbook-adapter.js
js/sheet-discovery.js
js/field-mapping.js
js/normalized-model.js
js/calculations.js
js/filter-engine.js
js/charts.js
js/app.js
```

Classic local scripts with explicit load order are preferred to preserve `file://` compatibility. ES Modules, runtime fetches, external APIs, CDNs, analytics, and telemetry remain prohibited.

## 3. Target Data Pipeline

```text
Workbook ArrayBuffer
  ↓
Workbook Reader
  ↓
Sheet Discovery
  ├── Summary P&L candidates
  └── Store Detail candidates
  ↓
Period Detection
  ├── S1
  └── Full Year
  ↓
Header / Row Detection
  ↓
Field Mapping
  ├── Summary P&L line mapping
  └── Store Detail column mapping
  ↓
Validation and Diagnostics
  ↓
Normalized Workbook Model
  ├── Portfolio Summary by period
  └── Store records by period
  ↓
Calculation Layer
  ├── Total Portfolio mode
  ├── Filtered Portfolio mode
  ├── KPI calculations
  ├── Bridge calculations
  └── Store variances
  ↓
Dashboard State
  ↓
Four-page rendering and drill-down
```

UI renderers must not receive raw SheetJS matrices, Sheet names, column indexes, or row numbers.

## 4. Adapter Responsibilities

### 4.1 Sheet Discovery

Classify every relevant worksheet without hard-coding Y25/Y26:

- Detail candidate: a tabular sheet whose name matches a Year + `S1`/`Full Year` pattern and whose header contains Terminal/Store plus P&L fields.
- Summary candidate: a financial-statement sheet with period headers and recognized P&L row labels.
- Ignore unrelated worksheets unless they are explicitly mapped by the user.

Discovery output includes confidence and reasons. Ambiguous classification must open Data Settings instead of silently selecting a sheet.

### 4.2 Period Detection

Period detection combines:

- Detail Sheet name metadata.
- Summary title and period header cells.
- User mapping only when automatic detection is ambiguous.

One Workbook contains exactly one Review Period. The adapter detects either S1 or Full Year, groups the current and prior-year Detail sheets under that period, and builds the Prior Year Same Period pair. Multi-period Workbook handling is out of scope.

### 4.3 Field Mapping

Data Settings needs two mapping modes:

- Portfolio Summary mapping: identify P&L lines and Current/Comparison value columns.
- Store Detail mapping: identify semantic columns by header.

Exact aliases take precedence. Fuzzy matching may suggest, but low-confidence or conflicting mappings require user confirmation. The mapping version must change because the current single-table mapping is not schema-compatible.

### 4.4 Validation

Load-blocking errors:

- No current Detail sheet.
- No Prior Year Same Period Detail sheet for a selected Review Period.
- Missing Terminal or Store identity.
- Duplicate Terminal within one period after total-row removal.
- Missing Bridge target or required driver lines in Summary.
- Ambiguous amount/ratio or POS/POS no. mapping.

Warnings:

- Summary versus Detail rounding differences.
- Stores present in only one side of the period pair.

Runtime calculation error:

- Any non-zero Filtered Bridge reconciliation residual outside numeric tolerance.

## 5. Dashboard State

Proposed state shape:

```text
workbookModel
selectedReviewPeriod       // S1 | FULL_YEAR
periodPair                 // current + prior-year same period
scopeMode                  // total | filtered
filters
  region
  city
  status
  productivityTier
activePage
selectedVarianceKpi        // minorations | grossMargin | contribution
selectedDriver
portfolioView              // productivity | ranking
snapshot                   // current | comparison; Productivity only
selectedStore
storeSearch
diagnostics
charts
```

Removed state concepts:

```text
selectedYear
comparisonMode
storeTypeFilter
timelineMetric
quadrant state
pareto state
```

Cleanup happens only after the new adapter and page migrations pass validation.

## 6. Review Context and Filters

The context bar contains:

```text
Review Period
Region
City
Status
Store Productivity Tier / 门店单产等级
```

Year, Comparison, and Store Type are removed.

### 6.1 Cascading option engine

Filter values are data-driven. Tier values come directly from the mapped `门店单产等级` field.

City candidates are computed from records in the selected current period after applying all active upstream filters except City itself:

```text
cityOptions = currentPeriodRows
  → apply Region
  → apply Status
  → apply Productivity Tier
  → distinct City
```

If the selected City is no longer valid after another filter changes, reset City to All and refresh once. Reset clears all four store filters.

The same principle may be applied symmetrically to other filter candidates, but the first required implementation is Region/Tier/Status → City.

## 7. Portfolio Scope Resolver

Every Page 01/02 calculation requests a `PortfolioScope`:

```text
if no store filter is active:
  mode = Total Portfolio
  source = Portfolio Summary
else:
  mode = Filtered Portfolio
  source = aggregated Store Detail
```

The mode label must be visible. The Summary and Detail sources must not be blended inside one KPI calculation without explicit source metadata.

Summary value resolution defaults to `Actual Adj.` because it is the final adjusted business scope. Raw `Actual` is fallback only when the required Adjusted value is absent.

## 8. Page Architecture

### 8.1 Page 01 — Executive Overview

Keep these KPIs:

```text
POS no.
AUP
Gross Sales
Total Minorations %
CONSO Net Sales
Gross Margin
Gross Margin %
Customer Contribution
Customer Contribution %
```

Default source is Portfolio Summary. Filtered mode reaggregates supported measures from Detail and clearly labels the scope. AUP is the exception: it always remains the unfiltered Summary P&L value and never responds to store filters. AUP and Store Productivity are distinct metrics.

Remove Review Timeline. Replace it with a finance-style P&L Snapshot containing:

```text
P&L Line | Current | % NS | Comparison | % NS | Variance | Variance %
```

Ratio KPIs are rendered as ratios, not as duplicate amount and `% NS` rows.

### 8.2 Page 02 — P&L Variance Analysis

Analyze supports:

```text
Total Minorations
Gross Margin
Customer Contribution
```

One `selectedVarianceKpi` controls:

- Bridge Chart.
- Variance Readout.
- Driver Table.
- Top Positive Drivers.
- Top Negative Drivers.

Bridge definitions come from normalized non-overlapping P&L rows and must run reconciliation before receiving `reconciled` status.

### 8.3 Page 03 — Store Portfolio

Keep only:

- Productivity.
- Store Variance Ranking.

Remove Quadrants and Variance Pareto after migration validation.

Productivity Bubble:

```text
X = Customer Contribution amount
Y = Gross Margin amount
Size = mapped 门店总单产
```

Size uses bounded square-root scaling. Tier filtering is the primary density control. The lightweight Selected Tier Summary may show store count, POS/Terminal count, ratio-of-sums Gross Margin %, ratio-of-sums Customer Contribution %, and average mapped store productivity.

Current/Comparison snapshot switching applies only to Productivity. Store Variance Ranking always calculates Current minus Prior Year Same Period; snapshot state must not alter ranking.

Store Variance Ranking retains metric selection, Top Positive Stores, Top Negative Stores, search, and Store Detail navigation.

### 8.4 Page 04 — Store Detail

Preserve the page structure, Store Signals, P&L table, A&P comparison, A&P variance, and drill-down.

Remove Operating Profit only from the top Key Figure cards. Do not remove its mapped data until dependency analysis confirms it is unused elsewhere.

Store P&L presentation order:

```text
P&L Line
Current
Current % of Net Sales
Comparison
Comparison % of Net Sales
Variance %
```

Ratio rows must not repeat meaningless `% of Net Sales` cells.

## 9. Drill-down Contract

```text
Overview KPI
  → selectedVarianceKpi
  → P&L Variance
  → selectedDriver
  → Store Variance Ranking
  → selectedStore
  → Store Detail
```

Review Period, Prior Year Same Period, store filters, selected KPI, and selected driver persist through navigation. Opening Store Detail must use the same period pair and scope context.

## 10. Reconciliation and Data Quality

Every Bridge returns:

```text
startValue
drivers[]
endValue
calculatedEnd
residual
status
```

`status = reconciled` only when the residual is within the defined tolerance. Filtered KPI and Driver values must come from the same filtered Store Detail aggregates. Otherwise, show `Bridge reconciliation error` and retain diagnostic source references without logging workbook values to the console. Do not add a rounding/residual bar or silently correct the result.

Summary and Detail totals are checked separately. Summary remains authoritative for unfiltered Portfolio amounts; Detail rounding differences are diagnostics, not reasons to overwrite Summary.

## 11. Offline and Privacy Architecture

Must remain true:

- User-initiated local file selection only.
- Browser-memory processing.
- No workbook values in localStorage, IndexedDB, cookies, cache, logs, analytics, or telemetry.
- Mapping metadata only may be saved locally.
- Local ECharts and SheetJS.
- Relative paths and `file://` compatibility.
- CSP `connect-src 'none'`.
- No real company data in Git, Vercel, or AI workflows.

## 12. Migration Sequence After Approval

Phase 5 should migrate in dependency order:

1. Sheet Discovery and Period Detection.
2. Summary and Detail Mapping.
3. Normalized Model and validation.
4. Calculation and Filter engines.
5. Page 01, then 02, then 03, then 04.
6. Regression tests.
7. Cleanup of old state, UI, calculations, and CSS only after replacements pass.

This document does not authorize Phase 5.
