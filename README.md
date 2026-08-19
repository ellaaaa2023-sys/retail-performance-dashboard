# Retail Performance Dashboard

一个面向零售财务分析场景的交互式作品集 Demo。页面打开后会自动加载固定的 Synthetic / Mock Dataset，无需上传文件或进行初始化操作，即可完整体验：

```text
Executive Overview → P&L Variance → Store Portfolio → Store Detail
```

Demo 当前展示 `2026 S1 vs 2025 S1`，包含 160 家 Current 门店和 150 家 Comparison 门店。所有页面、筛选、计算、图表和下钻都使用同一套 normalized model 与 Dashboard engine。

## Demo highlights

- **01 Executive Overview**：组合级 KPI、同比变化和规则式 Management Signals。
- **02 P&L Variance**：P&L Snapshot、可核对的 Customer Contribution Bridge、正负 Driver 排名。
- **03 Store Portfolio**：Current / Comparison / Movement、A&P × Customer Contribution 四象限、Risk Stores 和 Store Variance Ranking。
- **04 Store Detail**：默认选中有效门店，支持 Existing Store 与 New Store，展示 KPI、完整 P&L、A&P composition 与 movement。
- **Filters**：Region、City、Status、Store Productivity Tier；Reset 只重置筛选与选择，不改变当前数据源。
- **Source switching**：上传成功后切换到 Uploaded Workbook；上传失败保留当前数据；Clear Uploaded Data 返回 Demo，页面不会进入空 Dashboard。

## Data Preparation

Demo 模式只展示 normalized source readiness：

- Synthetic Summary
- Current Detail · 160 stores · Ready
- Comparison Detail · 150 stores · Ready

它不会伪造 `Workbook scanned`、`Cleaned Excel rows` 或 `Cleaning completed`。只有用户实际上传工作簿时，浏览器才会执行 workbook discovery、cleaning 与 normalization。

## Architecture

```text
Existing Mock Workbook
  └─ build-time normalization → js/data/demo-data.js

Demo artifact / Uploaded Workbook
  └─ normalized model
      └─ createDataService()
          └─ shared state, filters, calculations, charts, drill-down, rendering
```

`scripts/generate-demo-data.js` 将 `sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx` 确定性转换为 committed classic-script artifact。Fresh Load 不读取 Excel，也不执行 workbook cleaning。

## Run locally

直接打开 `index.html`，或启动静态服务器：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后访问 `http://127.0.0.1:4173/`。

如需开发模式：

```bash
pnpm install
pnpm dev
```

## Upload behavior

点击 **Upload Your Data** 可选择 `.xlsx`、`.xls`、`.xlsm` 或 `.csv`：

- 工作簿只在当前浏览器页面内存中解析。
- 页面 CSP 设置 `connect-src 'none'`，应用不通过 fetch、XHR 或 WebSocket 发送文件内容。
- 上传成功后复用 Demo 相同的 Dashboard engine。
- 上传失败不会清空当前 Demo 或已加载的 Uploaded Workbook。
- **Clear Uploaded Data** 会释放上传数据并立即恢复 Synthetic Demo Dataset。

## Tests

```bash
pnpm run check
pnpm test
```

测试覆盖 Core Data、Cleaning、Data Preparation、Quadrant / Movement / Risk、Store Detail、Demo artifact，以及 Demo / Upload source lifecycle。

重新生成 Demo artifact：

```bash
pnpm run generate:demo
```

生成结果必须与已提交的 `js/data/demo-data.js` 完全一致。

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

运行依赖固定在 `libs/`（Apache ECharts 5.5.1、SheetJS Community Edition 0.18.5），页面不依赖 CDN、外部 API、Analytics 或 Telemetry。
