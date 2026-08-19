# Retail Performance Dashboard

An interactive retail finance portfolio demo that turns portfolio-level P&L movement into store-level actions.

[**Open the Live Demo →**](https://counter-performance-dashboard.vercel.app/)

> The live demo uses synthetic data for product demonstration and loads automatically—no upload or setup required.

## Product Preview

### Executive Overview

Portfolio-level performance, period comparison, filters, and management signals in one review surface.

![Executive Overview with portfolio KPIs, filters, and management signals](docs/images/dashboard-overview.jpg)

### Variance Analysis

Trace Customer Contribution movement from the P&L snapshot to a reconciled bridge and its key drivers.

![Customer Contribution bridge with reconciled variance and driver analysis](docs/images/variance-analysis.jpg)

### Store Portfolio

Compare store positioning and movement while surfacing quadrant transitions and portfolio risk context.

![Store Portfolio movement view with trajectory chart and movement summary](docs/images/store-portfolio.jpg)

### Store Detail

Drill into a single store's key figures, review signals, detailed P&L, and A&P economics.

![Existing Store detail with KPIs, review signals, and store P&L](docs/images/store-detail.jpg)

## Analysis Flow

```text
Executive Overview → P&L Variance → Store Portfolio → Store Detail
```

The demo presents `2026 S1 vs 2025 S1` across 160 Current stores and 150 Comparison stores. Every page, filter, calculation, chart, and drill-down uses the same normalized model and Dashboard engine.

## Key Features

- **Executive Overview** — Portfolio KPIs, period movement, and rule-based management signals.
- **P&L Variance** — P&L snapshot, reconciled Customer Contribution bridge, and positive/negative driver ranking.
- **Store Portfolio** — Current, Comparison, and Movement views; A&P × Customer Contribution quadrants; risk stores; and variance ranking.
- **Store Detail** — Existing and New Store profiles with KPIs, detailed P&L, A&P composition, and component movement.
- **Interactive filters** — Region, City, Status, and Store Productivity Tier.
- **Source switching** — Replace the demo with an uploaded workbook, reset selections without changing the source, or clear the upload to return to Demo.

## Data Preparation

```text
Excel Upload
  → Sheet Detection
  → Data Cleaning
  → Validation
  → Current / Comparison
  → Dashboard
```

Demo mode reports normalized source readiness without pretending that an Excel workbook was scanned or cleaned at runtime:

- Synthetic Summary
- Current Detail · 160 stores · Ready
- Comparison Detail · 150 stores · Ready

Workbook discovery, cleaning, and normalization run only after a user selects a workbook.

## Architecture

```text
Existing Mock Workbook
  └─ build-time normalization → js/data/demo-data.js

Demo artifact / Uploaded Workbook
  └─ normalized model
      └─ createDataService()
          └─ shared state, filters, calculations, charts, drill-down, rendering
```

`scripts/generate-demo-data.js` converts `sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx` into a deterministic, committed classic-script artifact. Fresh Load does not fetch or parse Excel.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- Apache ECharts 5.5.1
- SheetJS Community Edition 0.18.5
- Node.js test suite
- Static deployment on Vercel

Runtime dependencies are committed under `libs/`; the dashboard does not depend on a CDN, external API, analytics, or telemetry.

## Run locally

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

## Upload and Privacy

Select **Upload Your Data** to use an `.xlsx`, `.xls`, `.xlsm`, or `.csv` file:

- Workbook parsing and transformation happen client-side in the local browser session.
- The page CSP sets `connect-src 'none'`; the application does not send workbook content through fetch, XHR, or WebSocket.
- A successful upload reuses the same Dashboard engine as Demo mode.
- A failed upload preserves the currently active source.
- **Clear Uploaded Data** releases the upload and restores the Synthetic Demo Dataset.

## Tests

```bash
pnpm run check
pnpm test
```

The suite covers Core Data, Cleaning, Data Preparation, Quadrant / Movement / Risk, Store Detail, the deterministic Demo artifact, and Demo / Upload source lifecycle.

Regenerate the Demo artifact with:

```bash
pnpm run generate:demo
```

The generated output must match the committed `js/data/demo-data.js` artifact.

## Main files

```text
index.html
assets/styles.css
js/app.js
js/data/core-data.js
js/data/data-preparation-ui.js
js/data/source-lifecycle.js
js/data/demo-data.js
js/productivity-quadrant.js
js/store-detail.js
scripts/generate-demo-data.js
sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx
tests/
```
