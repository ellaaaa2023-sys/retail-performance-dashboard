# Retail Performance Dashboard

## Source of Truth

Project facts come from the current code, Git history, and:

- `docs/HANDOFF.md`
- `docs/DATA_MODEL.md`
- `docs/DASHBOARD_ARCHITECTURE.md`
- `docs/DECISIONS.md`

Do not treat prior chat context as a project fact source.

## Active Development Scope

Read and modify only the active source files required for the current website. Unless a task explicitly requires them, do not inspect `archive`, `legacy`, offline packages, ZIP files, old deployment copies, or other historical experiments.

## Data Safety

- Never send real company data to AI or place it in Git.
- Development and testing use Mock Dataset only.
- Keep processing local; do not introduce external APIs, Analytics, or Telemetry.

## Data Architecture

- Do not rebuild parser, field mapping, period detection, or calculation logic in page code.
- Prefer the existing `RetailDashboardData` / Data Service API.
- For changes to the Data Model, Parser, Field Mapping, Calculation Engine, Filter Engine, Bridge Engine, or shared multi-page data structures: state the impact scope before editing.
- Small page or UI changes may be made directly, but do not refactor unrelated modules.

## Current Business Rules

- Review Period is `S1` or `Full Year`; there is no `S2`.
- Comparison is `Prior Year Same Period`.
- Summary defaults to `Actual Adj.`.
- AUP is not Store Productivity: it comes only from Summary and does not change with store filters.
- Nature and Channel are not analysis dimensions.
- One Workbook equals one Review Period.

## Git and Handoff

Before work, run:

```bash
git status
git log --oneline -5
```

Do not overwrite unknown uncommitted changes. After an independent stage: inspect `git diff`, run relevant tests, and update `docs/HANDOFF.md`. Commit only after user confirmation; never push automatically.

Before an agent handoff after a completed stage or architecture change, update `docs/HANDOFF.md`. The next agent must read it and the latest commit first.
