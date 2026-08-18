# Retail Performance Dashboard — Target Architecture

> Status: implemented architecture through Phase G; updated 2026-08-18.

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

### 1.1 Phase G final implementation snapshot

```text
Workbook
  → RetailDashboardData normalized model / Data Service
  → Page 01: 8 KPI cards + Management Signals
  → Page 02: Snapshot-first + Customer Contribution amount Bridge
  → Page 03: Current / Comparison / pooled-frame Movement + risk prioritization / amount Ranking
  → Page 04: 4 KPI cards + Store P&L + non-overlapping A&P component analysis
```

Shared business contracts:

- Ratio variance = Current ratio − Comparison ratio and is displayed with `%`.
- Bridge and Store Ranking retain Current amount − Comparison amount.
- Canonical signed A&P = `store.pnl.specificAP`; chart spend = its absolute magnitude.
- Whenever an amount and ratio describe the same business metric, they use one inline `Amount · Ratio` display model.
- A&P component charts analyze non-overlapping expense lines and do not redefine or overwrite canonical Specific A&P.
- `js/productivity-quadrant.js` and `js/store-detail.js` isolate pure, testable UI-domain logic while preserving classic relative script loading and `file://` compatibility.

## 2. Pre-migration Architecture and Migration Impact (historical)

Before Phase 5, the application selected one rectangular sheet, mapped it into one `records[]` array, and expected Year and Review Period columns inside that sheet. The implemented Workbook architecture now separates Summary P&L and Store Detail across multiple sheets.

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
| Overview | Store aggregation and timeline | Summary-led KPI drill-down + Management Signals; no duplicate Snapshot |
| Variance | Operating Profit bridge | Three Summary-row Bridges with reconciliation |
| Portfolio | Quadrants, Bubble, Pareto | Median Productivity Quadrant + Store Variance Ranking only |
| Store Detail | Existing store model | Remap new fields and reorder presentation |

Primary implemented code surfaces:

```text
index.html
assets/styles.css
js/data/core-data.js
js/productivity-quadrant.js
js/store-detail.js
js/app.js
tests/*.test.js
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
selectedPnlLine            // Snapshot row context only
selectedDriver
portfolioView              // productivity | ranking
snapshot                   // current | comparison | movement; Productivity only
selectedQuadrant           // all | Star | Risk | Balanced High | Balanced Low; local chart view only
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

Final 8 cards:

```text
Store Count
POS no.
AUP
Gross Sales
Total Minorations %
CONSO Net Sales
Gross Margin [amount + ratio]
Customer Contribution [amount + ratio]
```

Default source is Portfolio Summary. Filtered mode reaggregates supported measures from Detail and clearly labels the scope. AUP is the exception: it always remains the unfiltered Summary P&L value and never responds to store filters. AUP and Store Productivity are distinct metrics.

Page 01 contains no P&L Snapshot. It intentionally focuses on Executive KPI Overview plus Management Signals. Every KPI with a natural Page 02 line is a drill-down entry: it stores `selectedPnlLine`, opens Page 02, highlights the corresponding Snapshot row, and scrolls it into view when needed. Store Count remains non-clickable because no natural P&L row exists. The Page 02 Bridge remains Customer Contribution regardless of the selected KPI.

Gross Margin and Customer Contribution show `Amount · Ratio` on one line at one visual level. The same rule applies to their comparison values.

### 8.2 Page 02 — P&L Variance Analysis

Page order is P&L Snapshot first, followed by one Customer Contribution Bridge Analysis group. The old Analyze selector is removed.

The group contains Bridge Chart, ratio-based Variance Readout, Driver Analysis, and Top Positive/Negative Drivers. The Customer Contribution readout uses inline `Amount · Ratio` for Current and Comparison.

Driver Analysis columns are independent fields:

```text
Driver
| Current Amount
| Current % of Net Sales
| Comparison Amount
| Comparison % of Net Sales
| Variance %
| Drill-down
```

`Variance %` is Current ratio − Comparison ratio. There is no absolute Variance column and no Contribution column. Top Drivers remain sorted by amount movement.

Bridge definitions come from normalized non-overlapping P&L rows and must run reconciliation before receiving `reconciled` status.

### 8.3 Page 03 — Store Portfolio

Keep only:

- Productivity.
- Store Variance Ranking.

Productivity is a median-based Store Investment Productivity Quadrant:

```text
X = Customer Contribution amount
Y = abs(Specific A&P)
Point = Store, fixed size
```

In Current or Comparison view, the X/Y medians come from the currently visible period/filter dataset and are recomputed after Region, City, Status, Tier, or snapshot changes. Boundary rule is `>= median → High`. Classifications are Star, Risk, Balanced High, and Balanced Low. Their summary counts always sum to the visible scope count. Clicking a summary segment filters only the chart display; clicking it again or clicking All restores all points. This local state does not mutate global filters or Ranking.

Priority Risk Stores is independently rebuilt from the full current filtered scope and therefore remains useful even when the chart is locally highlighting another quadrant. Only Risk stores are eligible. Percentile ranks are calculated across the current filtered quadrant dataset, with average ranks for ties:

```text
riskScore = 0.5 × A&P spend percentile + 0.5 × (1 − CC percentile)
```

The list is stably sorted by score and opens Page 04 through the shared store-detail navigation.

Movement uses exact Terminal matching and excludes Current-only and Comparison-only stores. It filters matched pairs through the current store's Region, City, Status, and Tier; Current Tier is deliberate because global portfolio filters describe the current portfolio. Both periods share one coordinate frame built from pooled matched observations:

```text
pooled CC median  = median(Comparison CC + Current CC)
pooled A&P median = median(Comparison A&P spend + Current A&P spend)
```

Both endpoints are classified with those same pooled medians. Changed-quadrant trajectories are emphasized; same-quadrant paths remain faint. The Movement summary reports Changed Quadrant and Stayed Same plus stable key transitions such as Risk → Star, Risk → non-Risk, non-Risk → Risk, and Star → non-Star.

Current/Comparison/Movement switching applies only to Productivity. Store Variance Ranking always calculates Current minus Prior Year Same Period; snapshot and local selected-quadrant state must not alter ranking.

Store Variance Ranking retains metric selection, Top Positive Stores, Top Negative Stores, search, and Store Detail navigation.

### 8.4 Page 04 — Store Detail

Final top cards are Gross Sales; CA Net [amount + % of GS]; Gross Margin %; Customer Contribution [amount + ratio]. Operating Profit, A&P KPI, and Gross Margin amount are not top cards; their mapped data remains available where required.

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

Store P&L Variance % uses Current % of Net Sales − Comparison % of Net Sales. New Store comparison and variance cells display `—`.

CA Net and Customer Contribution use inline `Amount · Ratio`; Gross Margin % remains ratio-only.

The two A&P component views use the Workbook's finest available non-overlapping lines: Trade Relation, Customer Samples, Promotional Gifts, POS Advertising Amortization, POS Advertising Expense, Merchandising, Animations, Tester, DA Cost and Specific Development, and Other A&P. Specific A&P is excluded from the component pool because it is the formal subtotal.

- A&P Component Composition compares Current and Comparison amount plus share of the component pool.
- A&P Component Movement shows each component's signed spend change.

These views are analytical and never claim reconciliation when rounded components do not exactly tie to the formal subtotal. They never add a residual. Canonical signed A&P remains `store.pnl.specificAP`, and canonical spend remains `abs(store.pnl.specificAP)`.

## 9. Drill-down Contract

```text
Overview KPI / Page 02 Snapshot row
  → selectedPnlLine
  → P&L Variance Snapshot highlight
  → fixed Customer Contribution Bridge
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

## 12. Completed Migration Sequence

The migration completed in dependency order:

1. Sheet Discovery and Period Detection.
2. Summary and Detail Mapping.
3. Normalized Model and validation.
4. Calculation and Filter engines.
5. Page 01, then 02, then 03, then 04.
6. Shared ratio semantics and canonical A&P contract.
7. Phase G product polish: inline amount/ratio, Page 01 Snapshot removal, independent Driver columns, risk prioritization, pooled-frame Movement, and restored non-overlapping A&P component analysis.
8. Pure helper tests, five-cycle ECharts lifecycle regression, and proven dead-code cleanup.

Final automated validation: Core 27/27 + Quadrant 25/25 + Store Detail 14/14 = 66/66. Browser regression covers five consecutive Current → Comparison → Movement → Ranking → Productivity → Movement cycles, stable canvas counts, full option replacement, resize behavior, and zero console warnings/errors. Filtered Customer Contribution remains intentionally limited to Gross Margin / Specific A&P / Specific SG&A and may stop with `BRIDGE_RECONCILIATION_ERROR` on rounded slices.
