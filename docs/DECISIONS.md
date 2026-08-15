# Retail Performance Dashboard — Architecture Decisions

> Confirmed decision log for the 2026-08-15 Workbook migration.

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

**Consequence:** `门店总单产` is the Bubble-size field regardless of its current column position.

## D-009 — POS Semantics

**Decision:** Summary `POS no.` is the Portfolio KPI. In filtered store scope, POS count is distinct Terminal count unless a confirmed store-level POS-count field is mapped.

**Rejected:** Mapping Detail `POS.` to POS count. In the current Workbook, `POS.` is an expense component.

## D-010 — Productivity Tier

**Decision:** Tier options are derived from mapped `门店单产等级` values. No tier values are hard-coded.

## D-011 — Cascading City Filter

**Decision:** City options are recalculated from the current-period Detail records after applying Region, Status, and Productivity Tier. An invalid selected City resets to All.

## D-012 — Three Portfolio Bridges

**Decision:** Page 02 supports Total Minorations, Gross Margin, and Customer Contribution only. One selected KPI state drives Bridge, Readout, Driver Table, and Top Drivers.

**Consequence:** Net Sales and Operating Profit are removed from the Analyze control during Phase 6.

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

**Decision:** Replace Review Timeline with a finance-style P&L Snapshot. Retain only the nine approved KPIs from the migration brief.

## D-017 — Store Portfolio

**Decision:** Keep Productivity and Store Variance Ranking. Remove Quadrants and Variance Pareto after the replacement views pass validation.

**Productivity Bubble:** X = Customer Contribution amount, Y = Gross Margin amount, size = mapped `门店总单产` using bounded square-root scaling.

## D-018 — Snapshot Switching

**Decision:** Current/Comparison switching applies to Productivity only. Store Variance Ranking always represents Current minus Prior Year Same Period.

## D-019 — Store Detail

**Decision:** Preserve the overall Store Detail architecture and A&P charts. Remove Operating Profit only from the top Key Figures and reorder the Store P&L columns as specified.

## D-020 — Security and Offline Operation

**Decision:** Preserve local browser processing, local libraries, `file://` compatibility, `connect-src 'none'`, and zero external data transfer.

**Prohibited:** Real company data in the repository, Git, GitHub, Vercel, AI, analytics, telemetry, external APIs, or unnecessary CDNs.

## D-021 — Migration Safety

**Decision:** Do not delete old logic at the start of migration. Build and validate the replacement adapter and pages first; clean up S2/Year/Comparison/Store Type/Timeline/Quadrants/Pareto/old Bubble state only after regression tests pass.

## Confirmed Filter Dimensions

The only store-level filters are Region, City, Status, and Store Productivity Tier. `Nature`, Channel, and Store Type are not valid analysis dimensions and are excluded from the normalized model and Dashboard filters.

## Remaining Validation Dependency

A separate Full Year Mock fixture is needed before Full Year detection can pass Phase 7 validation. This does not change the One Workbook = One Review Period architecture.
