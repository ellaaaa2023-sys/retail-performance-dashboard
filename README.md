# Retail Performance Dashboard

[**English**](README.md) | [简体中文](README.zh-CN.md)

An interactive retail performance analysis tool that turns store-level P&L data into a structured workflow—from portfolio performance and variance drivers to individual store diagnosis.

## Live Demo

[**Open the live demo →**](https://counter-performance-dashboard.vercel.app/)

The demo uses a 100% synthetic, fictional dataset for product demonstration. It opens in English and supports Simplified Chinese from the sidebar language switch.

## Product Preview

### 01 · Executive Overview

Review the portfolio through Store Count, DA HC, AUP, Gross Sales, Total Minorations, CONSO Net Sales, Gross Margin, and Customer Contribution. Region, City, Status, and Productivity Tier filters update the analysis consistently.

![Executive Overview with portfolio KPIs, DA HC, filters, and management signals](docs/images/dashboard-overview.jpg)

### 02 · Variance Analysis

Move from the P&L Snapshot to one reconciled Customer Contribution Bridge. The `Amount | %` control switches between absolute contribution movement and percentage-point movement, while Driver Analysis and store ranking support drill-down.

![P&L Snapshot and Customer Contribution percentage bridge](docs/images/variance-analysis.jpg)

### 03 · Store Portfolio

Use three complementary lenses without turning the dashboard into a prediction model:

- **Performance** — Customer Contribution % on X, Productivity Evol % on Y, and Current Productivity as bubble size. The four business states are Healthy Growth; High Return, Productivity Decline; Growth, Low Return; and Priority Review.
- **Efficiency** — Productivity on X and DA HC on Y. It screens higher-headcount stores whose Productivity overlaps with adjacent lower-headcount groups. This is a review signal, not a staffing recommendation.
- **Variance Contribution** — Shows which stores contribute most to the selected portfolio variance.

![Store Portfolio Performance view with the current four-state bubble map](docs/images/store-portfolio.jpg)

### 04 · Store Detail

Inspect an Existing Store with Current/LY metadata, DA HC, Store P&L, line-specific `% OF SALES`, the signed hierarchy from Specific A&P through Total Specific Costs, Customer Contribution and Operating Profit, plus A&P component analysis and formal Total A&P.

![Existing Store detail with Current and LY P&L hierarchy and A&P analysis](docs/images/store-detail.jpg)

## Business Problem

Store performance reviews often split portfolio KPIs, P&L variance explanations, staffing context, and store detail across separate files. This dashboard organizes them into one repeatable review path while keeping financial definitions and reconciliation rules explicit.

## Analysis Flow

```text
01 Executive Overview
   → 02 Variance Analysis
      → 03 Store Portfolio
         → 04 Store Detail
```

Store selection is shared across portfolio analysis and Store Detail: search or click a store on Page 03, then open Page 04 to review the same Terminal. After activating a workbook, users may also open Page 04 directly without visiting the earlier pages.

## Current Product Features

- One normalized model and Finance Contract across cards, P&L tables, bridges, ratios, and store views.
- Canonical line-level `% OF SALES` denominators and explicit amount/ratio reconciliation gates.
- Exact-Terminal Current/LY matching, Productivity Evol %, DA HC aggregation, and store-level CC amount/ratio payloads.
- English and Simplified Chinese Public interface with state-preserving language switching.
- Demo-first Public experience and Upload-first English-only Internal package on the same Core.
- Classic local scripts with no framework, module loader, CDN, or backend dependency.

The public dataset contains 160 Current stores, 150 exact-Terminal comparison stores, and 10 New Stores. The Public Demo and sample workbook use the same business semantics.

## Data and Privacy Architecture

```text
Synthetic Demo / Uploaded Workbook
  → Data Preparation
  → Normalized Data Model
  → Data Service + Finance Contract
  → Dashboard Views
```

- Data is processed locally in your browser.
- Excel parsing, cleaning, validation, matching, and calculations run client-side.
- The application has no backend, database, analytics, or telemetry.
- Runtime assets are local; the Content Security Policy disables network connections from the dashboard.
- Public examples use only synthetic, fictional data.

## Technical Implementation

- Vanilla HTML, CSS, and JavaScript
- Apache ECharts 5.5.1 and SheetJS Community Edition 0.18.5
- Deterministic synthetic Demo artifact generated from the sample workbook
- Shared Public/Internal Core with classic scripts and `file://` compatibility
- Node.js contract and regression tests covering Finance, parsing, data services, UI behavior, and packaging

AI agents supported coding, debugging, testing, and iteration. Financial definitions, business logic, the analysis framework, and acceptance validation remained human-driven.

## Run Locally

Open `index.html` directly, or start a static server:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173/`.

For the package-based development workflow:

```bash
pnpm install
pnpm dev
```

## Tests

```bash
pnpm run check
pnpm test
pnpm run generate:demo
pnpm run build:internal-edge
pnpm run test:internal-edge
```

The suite verifies Finance contracts, denominator rules, reconciliation, workbook cleaning, Demo/Upload consistency, Page 03 portfolio behavior, Store P&L hierarchy, bilingual UI, classic-script compatibility, and Internal package integrity.
