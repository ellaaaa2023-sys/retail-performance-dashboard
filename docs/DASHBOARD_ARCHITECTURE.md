# Retail Performance Dashboard — Target Architecture

> Status: implemented architecture through Phase 4 Page 03 Store Portfolio redesign; updated 2026-08-20.

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
  → Page 03: Performance / Efficiency / Variance Contribution lenses
  → Page 04: 4 KPI cards + Store P&L + non-overlapping A&P component analysis
```

Shared business contracts:

- Ratio variance = Current ratio − Comparison ratio and is displayed with `%`.
- Bridge and Store Ranking retain Current amount − Comparison amount.
- Canonical signed A&P = `store.pnl.specificAP`; chart spend = its absolute magnitude.
- Whenever an amount and ratio describe the same business metric, they use one inline `Amount · Ratio` display model.
- A&P component charts analyze non-overlapping expense lines and do not redefine or overwrite canonical Specific A&P.
- `js/store-portfolio.js` and `js/store-detail.js` isolate pure, testable UI-domain logic while preserving classic relative script loading and `file://` compatibility.

Phase 3 adds the parser foundation beneath this UI: shared Detail schema metadata, client-side Cleaning, canonical intermediate sheets, scan/capability metadata, and schema-independent role assignment. Phase 4 renders that metadata in a compact, collapsible Data Preparation status area without introducing a fifth analysis page.

### 1.2 Phase 4 Data Preparation UI boundary

```text
metadata.workbookScan + metadata.capabilities
  → js/data/data-preparation-ui.js (pure user-facing view model)
  → js/app.js safe HTML renderer
  → compact summary + native <details>
```

The formatter exposes business labels, store counts, role assignments, preserved/ignored statistics, near-compatible warnings, and capability limitations. It deliberately excludes canonical keys, source indices, raw formula metadata, complete rows, and stack traces. Summary P&L is shown as a Dashboard source for which Detail Cleaning is not required.

Capability degradation is a rendering gate, not a new calculation system. Missing fields can disable Tier/Status controls or replace Filtered Bridge, Performance Portfolio, Headcount Efficiency, A&P Components, and unavailable Store P&L values with explicit states. Missing components remain unavailable rather than becoming zero.

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
js/store-portfolio.js
js/store-detail.js
js/app.js
tests/*.test.js
```

Classic local scripts with explicit load order are preferred to preserve `file://` compatibility. ES Modules, runtime fetches, external APIs, CDNs, analytics, and telemetry remain prohibited.

## 3. Target Data Pipeline

```text
Workbook ArrayBuffer / Workbook object
  ↓
Local SheetJS Reader
  ↓
Summary isolation
  └── existing Summary detection and parseSummarySheet()
  ↓
Detail scanner for every non-Summary worksheet
  ├── compatible → Cleaning IR
  ├── near-compatible → diagnostics only
  └── incompatible → ignored unless blocking collision
  ↓
Dashboard Core readiness
  ↓
Period metadata extraction
  └── exact Y<year> S1 / Full Year Sheet-name suffix
  ↓
Independent role assignment
  ├── Current = maximum eligible year
  ├── Comparison = Current - 1, same Review Period
  └── historical / unassigned compatible sheets are not concatenated
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

### 4.1 Sheet Discovery and Cleaning eligibility

Summary is identified first using the existing `P&L review Yxx` rule and Summary structure validation. It retains its multi-row header, Actual/Actual Adj. resolution, year reconciliation, and line mapping, and receives `cleaningStatus = notApplicable`.

Every other worksheet is scanned using the shared Detail schema. Cleaning eligibility uses whitespace-normalized, case-insensitive exact aliases and never a Sheet-name rule. Unknown columns are preserved; fuzzy matching is prohibited. Compatible sheets receive cleaned intermediate rows, near-compatible sheets retain missing-field diagnostics, and unrelated sheets are ignored.

Mapping collisions and uncached required numeric formulas are blocking. Successful parses retain sheet diagnostics in model metadata; Phase 4 presents only safe user-facing summaries. Parser errors are mapped to blocking guidance without exposing raw stack traces.

### 4.2 Period Detection

Cleaning produces no role. A separate function extracts Detail period metadata from an exact `Y<year> S1` or `Y<year> Full Year` Sheet-name suffix. A compatible sheet without that suffix remains unassigned; the parser never guesses from sheet order, row count, or first/last position.

One Workbook contains exactly one Review Period. The adapter detects either S1 or Full Year, groups the current and prior-year Detail sheets under that period, and builds the Prior Year Same Period pair. Multi-period Workbook handling is out of scope.

### 4.3 Shared schema and intermediate model

`js/data/detail-schema.js` is the single Detail field dictionary used by Cleaning and Core. `js/data/data-cleaning.js` returns canonical intermediate sheets containing header matching, source indices, cleaned rows, formula metadata, diagnostics, readiness, and sheet capabilities.

Core consumes the cleaned canonical cells directly. It does not repeat header normalization, text cleaning, or numeric-string parsing. Core still owns TOTAL exclusion, store normalization, ratio derivation already supported by the model, P&L calculations, matching, and Data Service construction.

Phase 2B adds `js/store-portfolio.js` between Cleaning and Core in classic-script order. It owns exact-Terminal Current/LY pairing, Productivity evolution, Performance eligibility and median, and DA HC distribution statistics. Core/Data Service supplies the normalized store records and canonical Finance ratios. The helper contains no old Star/Risk vocabulary and no UI code.

Unknown columns remain in scan metadata but are not copied into final store objects.

### 4.4 Validation

Load-blocking errors:

- No current Detail sheet.
- No Prior Year Same Period Detail sheet for a selected Review Period.
- No schema-compatible and Dashboard-ready Current or Comparison Detail sheet.
- Missing one of the eight Cleaning/Dashboard Core fields.
- Mapping collisions.
- Uncached required numeric formulas.
- Duplicate Terminal within one period after total-row removal.
- Missing Bridge target or required driver lines in Summary.
- Ambiguous amount/ratio or POS/POS no. mapping.

Warnings:

- Near-compatible Detail sheets and missing optional fields.
- Uncached optional formulas and conservative numeric conversion diagnostics.
- Ambiguous unmarked ratio scale; Core retains it as `null` rather than using an unsafe value.
- Compatible historical or no-period sheets that remain outside the Current/Comparison model.
- Summary versus Detail rounding differences.
- Stores present in only one side of the period pair.

Runtime calculation error:

- Any non-zero Filtered Bridge reconciliation residual outside numeric tolerance.

### 4.5 Store comparison and DA HC service boundary

The Data Service is the only consumer-facing calculation boundary for the new store portfolio data:

- `getDAHeadcountSummary(filters)` returns Current/Comparison totals, source, available/partial/unavailable status, and valid/missing counts.
- `getStoreComparisons(filters)` returns one exact-Terminal Current/LY payload per Current store, including Productivity evolution and canonical CC amount/ratio pairs.
- `getPerformancePortfolio(filters)` returns eligible/excluded records, exclusion counts by reason, and the eligible filtered median CC%.
- `getHeadcountEfficiency(filters)` returns the Current scoped dataset plus DA HC group median, Q1, Q3, IQR, and adjacent-group IQR overlap.

Total Portfolio DA HC prefers authoritative Summary values. Filtered DA HC is a complete Detail sum; partial Detail never becomes an apparently complete total. No page may duplicate Terminal matching, CC ratio calculation, eligibility, or quartile logic.

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
portfolioLens              // performance | efficiency | contribution
performanceSelection       // healthy-growth | high-return-decline | growth-low-return | priority-review | null
contributionMetric         // existing Store Variance Ranking metric
selectedStore
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
| Current % OF SALES
| Comparison Amount
| Comparison % OF SALES
| Variance %
| Drill-down
```

`Variance %` is Current ratio − Comparison ratio. Each ratio resolves its denominator from the shared Finance registry; Page 02 does not infer a denominator. There is no absolute Variance column and no Contribution column. Top Drivers remain sorted by amount movement.

Bridge definitions come from normalized non-overlapping P&L rows and must pass Current level, Comparison level, and movement reconciliation before receiving `reconciled` status. Amount and ratio views use the same canonical amounts and expose separate centralized gates.

Page 02 renders those parallel Core results through a lightweight `Amount | %` segmented control. Amount is the default. Ratio anchors use percentage formatting and ratio-driver movements use percentage points (`pp`). Switching modes changes only local presentation state; it does not replace the active filters, data source, page, or reconciliation result. A blocked amount mode does not block ratio, and a blocked ratio mode does not block amount.

### 8.3 Page 03 — Store Portfolio

Page 03 uses one compact lens control and renders one primary analysis at a time:

```text
Performance | Efficiency | Variance Contribution
```

Performance consumes `getPerformancePortfolio(filters)` without page-local matching or financial calculations. Its bubble map is `X = Current CC%`, `Y = Productivity Evol %`, and `size = Current Productivity` with square-root scaling bounded to 10–38 pixels. Both reference thresholds are fixed at zero. Boundary rules are `CC% >= 0` and `Productivity Evol % >= 0`; equality belongs to the non-negative side. The four descriptive states are Healthy Growth, High Return / Productivity Decline, Growth / Low Return, and Priority Review. New Stores and stores with unavailable comparison metrics remain outside the map with reason counts.

Efficiency consumes `getHeadcountEfficiency(filters)`. It renders horizontal headcount lanes with `X = Current Productivity`, `Y = discrete DA HC`, and deterministic jittered store dots. Tukey Q1/Q3 remains a hidden screening contract: a higher-HC store is highlighted only when its Productivity falls inside the adjacent lower-HC group's IQR. Median/IQR markers, the raw distribution table, and box plots are not rendered. Zoom is an explicit toolbox action with undo and restore; no inside-wheel zoom state is installed. The signal is explicitly not a staffing recommendation.

Variance Contribution reuses the existing Store Variance Ranking calculation, metric selection, favorable/adverse lists, and Store Detail drill-down. Region, City, Status, and Tier filters apply to all three lenses. Performance state selection is chart-local and does not mutate global filters; Reset clears both global filters and that local selection.

Page 03 Store Search resolves only an exact Current Terminal identity. It writes the shared `selectedStore` state but never changes Region, City, Status, Tier, eligibility, or chart population. Performance and Efficiency retain their complete filtered populations and add the same independent dark diamond overlay at the selected store position. Performance keeps its business-state fill; Efficiency keeps its orange candidate outline, so selected and candidate semantics can coexist. An ineligible Performance selection remains selected and receives an explicit unavailable notice instead of a synthetic point.

Navigation origin is not a filter. Page 02 may open Page 03 on Variance Contribution and pass a ranking metric, but Performance and Efficiency always rebuild from the four explicit global filters only. Both charts omit persistent inside-zoom state and run a post-visibility resize on lens activation so hidden-panel sizing cannot collapse the first render.

The old Current/Comparison/Movement snapshot toggle, CC × A&P states, Risk Score, Priority Risk Stores, and `js/productivity-quadrant.js` are removed from active runtime.

### 8.4 Page 04 — Store Detail

Final top cards are Gross Sales; CA Net [amount + % of GS]; Gross Margin %; Customer Contribution [amount + ratio]. Operating Profit, A&P KPI, and Gross Margin amount are not top cards; their mapped data remains available where required.

Store P&L presentation order:

```text
P&L Line
Current
Current % OF SALES
Comparison
Comparison % OF SALES
Variance %
```

The visible heading is always `% OF SALES`, while each row uses the shared line-level denominator registry. Gross Sales through Total Minorations use Gross Sales; CONSO Net Sales onward uses CONSO Net Sales. Both Gross Sales and CONSO Net Sales therefore display `100%`.

Store P&L Variance % uses Current ratio − Comparison ratio on the registered denominator. New Store comparison and variance cells display `—`.

From Gross Margin onward, Store P&L uses an explicit non-double-counting hierarchy. `Animations toward the distributor` reads AZ `ANM.` and remains separate from `Animations of immo POS adv`, which reads AV `Amort. + Writeoff`. `Other POS advertising costs` is derived as AX `POS.` + AY `Mer.` + BA `Tester` + BG `Others`. `Specific development` reads BE `DA Cost+specific dev.` and is split into BC `DA Cost` plus derived `Non DA Cost = BE - BC`; those two sub-details do not re-enter the Specific A&P sum. `Total Specific Costs = Specific A&P + Specific SG&A`, then Customer Contribution and Operating Profit follow their signed additive hierarchy. Store-level whole-KRMB reconciliation uses a centralized 3 KRMB amount tolerance and the corresponding denominator-scaled ratio tolerance; reported source subtotals are never rewritten.

CA Net and Customer Contribution use inline `Amount · Ratio`; Gross Margin % remains ratio-only.

The A&P component view and Store P&L share one `specificAP` child registry. Its ten top-level rows are Transactional media specific, Customer Samples, Livestreamers, E-shop in shop websites, Total Promotional gift cost, Other promotions, Animations toward the distributor, Animations of immo POS adv, Other POS advertising costs, and Specific development. DA Cost and Non DA Cost appear only inside the Specific development tooltip/breakdown, never as additional top-level bars.

- A&P Component Composition compares Current and Comparison amount plus share of the component pool.
- The former A&P Component Movement Bridge is no longer rendered on Page 04; its pure helper remains available for later dead-code review.
- Total A&P is displayed beside the composition using formal `abs(store.pnl.specificAP)` for Current and Comparison. Variance wording states whether spend increased, decreased, or stayed unchanged.

Current and Comparison chart periods each expose reconciliation metadata against canonical signed `store.pnl.specificAP`, including residual, tolerance, and structural-placeholder keys. Structural placeholders may display as zero for layout continuity but remain distinguishable from confirmed source zeroes. The chart never adds a residual or changes source values; canonical spend remains `abs(store.pnl.specificAP)`.

Public language switching is mounted in a sidebar-bottom utility area so the desktop title remains on one line. The English-only Internal runtime returns before creating either the switch or its utility container.

The Store Detail metadata includes Current DA HC and LY DA HC when the exact-Terminal comparison exists. Store P&L also starts with an operational DA HC row: Current and Comparison show counts, both ratio columns show an em dash, and Variance is an absolute headcount movement. Page 01 exposes DA HC in place of the visible POS no. KPI, but the normalized POS fields and other consumers remain intact.

Data-source activation selects the configured default Current store or the first Current store before any page render. Pages 01–04 therefore consume an already activated Data Service independently; opening Store Detail after Demo or Upload does not depend on visiting another page first.

The standard Synthetic Workbook is also the sole source for the Public Demo business results. `scripts/generate-demo-data.js` performs only Workbook parsing, Demo metadata normalization, and serialization; it does not alter Current/LY Productivity or any other normalized business value. Manual Upload and generated Demo therefore converge at the same Core/Data Service contract.

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
