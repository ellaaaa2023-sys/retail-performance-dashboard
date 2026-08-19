# Retail Performance Dashboard — Architecture Decisions

> Confirmed decision log for the Workbook migration, Phase G product polish, and Phase 4 Data Cleaning UX integration; updated 2026-08-19.

## D-001 — Current Mock Dataset

**Decision:** `sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx` is the only current development Source of Truth.

**Consequence:** Legacy workbooks are not compatibility targets and are not read by default.

## D-002 — Review Periods

**Decision:** The only Review Periods are S1 and Full Year.

**Rejected:** S2, monthly, MoM, and monthly trend logic.

## D-003 — Comparison

**Decision:** Comparison is always Prior Year Same Period and is paired automatically.

**Consequence:** Remove the Comparison selector and Previous Review state during the later page migration.

## D-004 — One Workbook, One Review Period

**Decision:** Each Workbook contains one Review Period: either S1 or Full Year, with its Prior Year Same Period detail.

**Consequence:** Multi-period Workbooks are out of scope until a future business requirement explicitly introduces them. A separate Full Year Mock fixture is still needed for validation.

## D-005 — Summary and Detail Are Separate Semantic Layers

**Decision:** Portfolio Summary P&L and Store Detail are parsed independently and retained in one normalized Workbook model.

**Consequence:** Dashboard renderers cannot directly depend on raw Sheet names, row numbers, or column indexes.

## D-006 — Portfolio Source Resolution

**Decision:** Unfiltered Page 01/02 metrics use Summary P&L. Any active Region, City, Status, or Tier filter activates Filtered Portfolio mode and reaggregates Detail rows, except AUP.

**Consequence:** The UI must clearly label Total Portfolio versus Filtered Portfolio.

## D-007 — Actual and Actual Adjusted

**Decision:** Preserve both scopes in the normalized Summary model. Default and prioritize `Actual Adj.` for financial KPIs, P&L Snapshot, and Bridges. Raw `Actual` is fallback only when the required Adjusted value is absent, and fallback use remains visible in source metadata.

**Business meaning:** `Actual Adj.` is the final business scope formed after Store Detail adjustments.

**AUP rule:** AUP comes only from Summary P&L and remains the total-portfolio value even in Filtered Portfolio mode. AUP is not Store Productivity (`门店总单产`).

## D-008 — Field Mapping Before Position

**Decision:** All Detail columns and Summary rows are identified through Field Mapping and normalized aliases. Fixed coordinates are forbidden.

**Consequence:** `门店总单产` remains the Store Productivity / Tier / tooltip field regardless of its current column position; Quadrant point size is fixed.

## D-009 — POS Semantics

**Decision:** Summary `POS no.` is the Total Portfolio KPI. In filtered/store scope, POS count is the sum of mapped `城市POS数` / `cityPosNo` for active stores.

**Rejected:** Mapping Detail `POS.` to POS count. In the current Workbook, `POS.` is an expense component.

## D-010 — Productivity Tier

**Decision:** Tier options are derived from mapped `门店单产等级` values. No tier values are hard-coded.

## D-011 — Cascading City Filter

**Decision:** City options are recalculated from the current-period Detail records after applying Region, Status, and Productivity Tier. An invalid selected City resets to All.

## D-012 — Bridge API and Page 02 Scope

**Decision:** Core retains Total Minorations, Gross Margin, and Customer Contribution Bridge APIs. Page 02 intentionally displays only Customer Contribution Bridge.

**Consequence:** The Analyze selector and `selectedVarianceKpi` UI state are removed. Page 01 KPI drill-down selects a Page 02 P&L Snapshot row only; it never switches the Bridge.

## D-013 — Non-overlapping Bridge Drivers

**Decision:** Drivers use the finest available non-overlapping Summary P&L rows. Subtotals and their children are never added together.

**Example:** Customer Contribution Bridge uses individual A&P components plus Specific SG&A; it does not add the Specific A&P subtotal again.

## D-014 — Reconciliation Is a Gate

**Decision:** A Bridge is marked reconciled only when Comparison + all driver variances equals Current within numeric tolerance.

**Failure behavior:** Display `Bridge reconciliation error`; do not silently draw a reconciled chart.

**Filtered Bridge rule:** Target KPI and Driver variances must be calculated from the same filtered Store Detail aggregates. A non-zero residual is a data or calculation defect. Never add a rounding/residual bar or silently correct the result.

## D-015 — Four-page Information Architecture

**Decision:** Preserve the four-page path:

```text
Executive Overview
→ P&L Variance
→ Store Portfolio
→ Store Detail
```

## D-016 — Executive Overview

**Decision:** Use 8 cards: Store Count, POS no., AUP, Gross Sales, Total Minorations %, CONSO Net Sales, Gross Margin [amount + ratio], Customer Contribution [amount + ratio]. Page 01 contains no P&L Snapshot and focuses on Executive KPI Overview plus Management Signals.

**Navigation:** Every KPI with a natural Page 02 P&L row is clickable and opens that highlighted row. Store Count stays non-clickable. The Customer Contribution Bridge never changes with KPI selection.

## D-017 — Store Portfolio

**Decision:** Keep Productivity and Store Variance Ranking. Productivity is the Store Investment Productivity Quadrant.

**Quadrant:** X = Customer Contribution amount; Y = `abs(Specific A&P)`; point size is fixed. Current and Comparison views use their own visible-scope medians; `>= median` is High. Movement uses one pooled median frame for both endpoints.

## D-018 — Snapshot Switching

**Decision:** Current/Comparison/Movement switching applies to Productivity only. Store Variance Ranking always represents Current minus Prior Year Same Period.

## D-019 — Store Detail

**Decision:** Preserve the overall Store Detail architecture with 4 top cards: Gross Sales, CA Net [amount + % of GS], Gross Margin %, Customer Contribution [amount + ratio]. Store P&L uses ratio variance. A&P uses canonical Specific A&P spend plus two non-overlapping component analysis charts.

## D-020 — Security and Offline Operation

**Decision:** Preserve local browser processing, local libraries, `file://` compatibility, `connect-src 'none'`, and zero external data transfer.

**Prohibited:** Real company data in the repository, Git, GitHub, Vercel, AI, analytics, telemetry, external APIs, or unnecessary CDNs.

## D-021 — Migration Safety

**Decision:** Do not delete old logic at the start of migration. Build and validate the replacement adapter and pages first; clean up S2/Year/Comparison/Store Type/Timeline/Quadrants/Pareto/old Bubble state only after regression tests pass.

## D-022 — Ratio Variance Semantics

**Decision:** For every metric with an explicit ratio representation:

```text
ratio variance = Current ratio - Comparison ratio
```

**Presentation:** Display `+0.1%` / `-0.3%`, not relative growth and not `pp`.

**Consequence:** Bridge reconciliation and Store Variance Ranking remain amount-based and are not converted to ratio variance.

## D-023 — Canonical A&P Expense

**Decision:** Signed A&P Expense = `store.pnl.specificAP`; spend magnitude = `abs(store.pnl.specificAP)`.

**Rejected:** Summing Customer Samples, Promotional Gifts, Animations, POS Advertising, Specific Development, and Specific A&P as a formal total because Specific A&P is a subtotal and the result double-counts.

## D-024 — Customer Contribution Bridge Presentation

**Decision:** Summary Page 02 uses the 8 non-overlapping Customer Contribution drivers. Filtered Page 02 uses only Gross Margin, Specific A&P, and Specific SG&A.

**Consequence:** A rounded filtered slice that does not reconcile returns `BRIDGE_RECONCILIATION_ERROR`; no residual bar or forced tie-out is permitted.

## D-025 — Median Quadrant Scope

**Decision:** Region, City, Status, Tier, and Current/Comparison changes rebuild the visible store dataset, medians, and classifications. Selected Driver context belongs only to Ranking and does not filter Productivity.

## D-026 — Pure Browser-compatible Helpers

**Decision:** Keep `js/productivity-quadrant.js` and `js/store-detail.js` as small UMD/global classic-script helpers loaded before `app.js`.

**Consequence:** They remain usable by Node tests without introducing ES Modules, runtime fetches, or external dependencies.

## D-027 — Final Validation Baseline

**Decision:** The Phase F baseline is Core 27/27, Quadrant 10/10, Store Detail 10/10 (47/47 total), plus standard Mock browser journeys and zero console warnings/errors.

## D-028 — Inline Amount and Ratio

**Decision:** When amount and ratio describe the same business metric, render them at the same visual level as `Amount · Ratio`. This applies to current and comparison values across Pages 01–04.

**Consequence:** Ratio-only metrics remain ratio-only; the design does not invent an amount. Ratio variance stays on its own line or column.

## D-029 — Page 02 Driver Analysis Columns

**Decision:** Driver Analysis exposes independent Current Amount, Current % of Net Sales, Comparison Amount, Comparison % of Net Sales, Variance %, and Drill-down columns.

**Rejected:** Stacking ratios below amounts, restoring absolute Variance, or restoring Contribution.

## D-030 — A&P Component Analysis

**Decision:** Restore two Store Detail A&P component views using the finest non-overlapping Workbook lines: Trade Relation, Customer Samples, Promotional Gifts, POS Advertising Amortization, POS Advertising Expense, Merchandising, Animations, Tester, DA Cost and Specific Development, and Other A&P.

**Boundary:** Specific A&P is the formal subtotal and is excluded from the component pool. Component charts do not redefine canonical A&P, claim reconciliation, or invent a residual when source rounding prevents an exact tie.

## D-031 — Quadrant Summary Local State

**Decision:** Dynamic Star, Risk, Balanced High, and Balanced Low counts sum to the current scope. `selectedQuadrant` changes only chart visibility and never mutates Region, City, Status, Tier, Ranking, or Priority Risk Stores.

## D-032 — Priority Risk Ranking

**Decision:** Only Low-CC + High-A&P stores are eligible. Average-rank percentiles are calculated across the current filtered quadrant dataset, including ties, and drive this score:

```text
riskScore = 0.5 × expensePercentile + 0.5 × (1 − ccPercentile)
```

**Consequence:** The score has no hard-coded business threshold. Stable tie-breaks preserve deterministic ordering.

## D-033 — Movement Matching and Coordinate Frame

**Decision:** Movement matches stores only by exact normalized Terminal key and excludes unmatched stores. It calculates pooled CC and A&P medians from both periods' observations and classifies both endpoints against that one frame.

**Filter rule:** Region, City, Status, and Tier apply to the matched current-store scope. Tier deliberately uses Current Tier because Dashboard filters describe the current portfolio.

## D-034 — Phase G Validation Baseline

**Decision:** Phase G validation is Core 27/27, Quadrant 25/25, and Store Detail 14/14 (66/66 total), plus five consecutive Current → Comparison → Movement → Ranking → Productivity → Movement browser cycles with stable chart canvases and no console warnings/errors.

## D-035 — One Shared Detail Schema

**Decision:** `js/data/detail-schema.js` is the only manually maintained source for Detail canonical keys, exact aliases, data types, Cleaning requirements, Dashboard Core requirements, and capability membership.

**Consequence:** Core derives mappings from shared metadata, and Cleaning cannot maintain a second field dictionary.

## D-036 — Summary P&L Isolation

**Decision:** Summary detection and `parseSummarySheet()` remain unchanged and execute outside Detail Cleaning. Summary receives `classification = summary` and `cleaningStatus = notApplicable`.

**Rejected:** Applying Detail header normalization, blank masks, type normalization, or Detail schema validation to the Summary multi-row financial statement.

## D-037 — Cleaning Eligibility Is Not Role Assignment

**Decision:** Exact Detail schema matches determine Cleaning eligibility. A separate exact Sheet-name suffix supplies `year` and `reviewPeriod`; it never determines whether a Sheet may be cleaned.

**Consequence:** All compatible sheets are cleaned, but only one maximum-year Current and one prior-year same-period Comparison enter the normalized model. Older compatible sheets are historical; compatible sheets without reliable metadata remain unassigned. No concatenation or sheet-order guessing is allowed.

## D-038 — Canonical Intermediate Sheet Boundary

**Decision:** Cleaning returns canonical intermediate sheets with source indices, cleaned cells, formula metadata, diagnostics, readiness, and capabilities. Core consumes this IR and remains responsible for TOTAL exclusion, final store objects, matching, ratios, P&L calculations, and the Data Service.

**Rejected:** Mutating SheetJS worksheets or letting Cleaning create final Dashboard store objects.

## D-039 — Missing and Formula Safety

**Decision:** Missing known values remain `null`; signed amounts remain unchanged. Cached formulas use `.v`; uncached required numeric formulas block Dashboard readiness; uncached optional formulas remain `null` with a warning. Ambiguous unmarked ratios do not enter Core.

## D-040 — Two-period Capability Resolution

**Decision:** The model retains Current and Comparison sheet capabilities plus resolved Dashboard capabilities. Resolved status is available only when both periods are available, unavailable when both are unavailable, and partial otherwise.

**Consequence:** Phase 3 records capability data; Phase 4 consumes resolved capabilities without recomputing schema matches or business calculations.

## D-041 — Phase 3 Validation Baseline

**Decision:** Phase 3 baseline is Cleaning 54/54, Core 60/60, Quadrant 25/25, and Store Detail 15/15, plus syntax, diff, classic-script load-order, Standard Mock, and synthetic Full Year validation.

## D-042 — Data Preparation Is a Status Surface

**Decision:** Workbook Scan / Cleaning / Validation results live in one compact source/status panel after Upload. Success is collapsed by default; details use a native disclosure control. Data Cleaning is not a fifth Dashboard page.

**Consequence:** Summary, Current, Comparison, historical, unassigned, near-compatible, and unrelated sheets receive distinct business wording without exposing canonical keys, source coordinates, full rows, formula payloads, or stack traces.

## D-043 — Capability Limitations Do Not Redefine Calculations

**Decision:** Resolved capability metadata gates UI availability. Missing optional fields may disable a filter or show an unavailable/partial module, but do not block otherwise-ready Dashboard data and are never converted to zero.

**Consequence:** Filtered Customer Contribution Bridge, Investment Quadrant / Productivity Risk, A&P Components, and Store P&L missing values degrade explicitly. The standard full-feature Mock retains unchanged 01–04 calculations and presentation.

## D-044 — Upload and Demo Preparation Lifecycle

**Decision:** A new Workbook upload clears the previous scan state before parsing. Filter Reset preserves the preparation summary; Clear Data removes it. Demo data bypasses Excel Cleaning and may only display `Demo Dataset · Synthetic data · Ready for analysis`.

**Security consequence:** The UX adds no fetch, backend, telemetry, persistence, worker, or external dependency. It consumes anonymous parser metadata and keeps workbook values in browser memory only.

## D-045 — Phase 4 Validation Baseline

**Decision:** Phase 4 adds 16/16 pure Data Preparation UI tests to the existing 154 tests, for 170/170 numbered tests. Browser regression covers Standard Mock 01–04, multi-compatible/near-compatible/no-period sheets, capability limitations, blocking state, new upload replacement, Reset/Clear behavior, and zero console warnings/errors.

**Remaining dependency:** Browser automation policy blocks direct `file://` navigation. Classic-script load order and no-network checks pass; Windows company-browser double-click verification remains a manual acceptance step.

## Confirmed Filter Dimensions

The only store-level filters are Region, City, Status, and Store Productivity Tier. `Nature`, Channel, and Store Type are not valid analysis dimensions and are excluded from the normalized model and Dashboard filters.

## Remaining Validation Dependency

A separate Full Year Mock fixture is needed before Full Year detection can pass Phase 7 validation. This does not change the One Workbook = One Review Period architecture.
