# Retail Performance Dashboard — Codex Handoff

> 更新时间：2026-08-16（Asia/Shanghai）
> 交接目的：让新的 Codex 对话窗口在不依赖聊天历史的情况下，安全地继续维护本项目。  
> 事实边界：本文基于当前仓库、`js/app.js`、HTML/CSS、现有文档、Git 状态及 Mock 工作簿的实际审计结果编写。本文不代表 Enterprise Release 已完成。

## 1. 项目基本信息

- **当前名称**：Retail Performance Dashboard
- **本地路径**：`/Users/ellaaa/Documents/AI黑客松--财务自动化/Retail_Performance_Dashboard`
- **GitHub 仓库**：`git@github.com:ellaaaa2023-sys/retail-performance-dashboard.git`（private）
- **开发预览站**：<https://retail-performance-dashboard-dev.vercel.app>
- **技术形态**：纯 HTML + CSS + JavaScript 的静态 Dashboard；Vite 只用于本地开发和 Vercel 构建，不是本地离线运行的必要条件。
- **业务目标**：基于 Counter P&L 数据，支持 Finance Business Partner 按半年度完成从整体到单店的经营复盘。

核心分析路径：

```text
Overview
  ↓
Variance Analysis
  ↓
Driver Identification
  ↓
Store Analysis
  ↓
Store Detail
```

真实业务数据边界：

- AI、Codex、GitHub、Vercel 和开发预览站只允许接触 Mock Data。
- 真实公司 Excel 只能在公司电脑上由用户主动选择，并在本地浏览器内读取和计算。
- 不要要求用户将真实 Excel、真实截图、真实金额、门店明细或内部链接发送给 AI。
- 真实公司数据禁止放入项目目录或进入 Git；Git、GitHub、Vercel 与 AI 仅允许 Mock Data。

### 当前标准 Mock Dataset（2026-08-15 起生效）

- 唯一 Source of Truth：`sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx`。
- 新功能开发、Parser 重构、Field Mapping 和 Dashboard 测试默认只使用该 Workbook。
- Workbook 同时包含 Summary P&L 与 Store-level P&L detail。
- Review Period 数据契约为 `S1` / `Full Year`；Comparison 固定为 `Prior Year Same Period`。
- 当前 Workbook 提供 S1 示例；Full Year 后续按同一数据契约接入。
- `sample_data/Mock_Counter_PnL.xlsx` 为 legacy，仅保留，不再作为兼容目标；未经用户明确要求不得读取。
- 若本文后续旧审计记录与本节冲突，以本节和 `docs/DATA_MODEL.md` 为准。

## 2. 当前状态摘要

### Phase 5 — Core Data Refactor（已完成）

- 新增 `js/data/core-data.js` 和 `tests/core-data.test.js`。
- 新数据架构：

  ```text
  Workbook
    → Sheet Discovery
    → Review Period Detection
    → Summary / Detail Parsing
    → Exact Field Mapping
    → Normalized Dual-layer Model
    → Portfolio / Filter / Bridge APIs
  ```

- 已确认：Current = `2026 S1`，Comparison = `2025 S1`；Summary 默认使用 `Actual Adj.`；Total Portfolio 使用 Summary，Filtered Portfolio 使用 Detail aggregation；AUP 始终使用 Summary，不随筛选变化；Tier 直接读取 Excel，不写死；Nature / Channel 已从后续分析维度删除。
- 实测：18/18 PASS；160 家 Current stores；150 家 Comparison stores；3 个 Summary Bridges 均 reconcile。
- 尚未迁移：02 P&L Variance、03 Store Portfolio、04 Store Detail。
- 已知事项：部分 Filtered Bridge slice 会因 Detail KRMB 取整触发 `BRIDGE_RECONCILIATION_ERROR`；不添加 residual 柱，留到 02 阶段处理。

### Phase 6A — 01 Executive Overview Migration（已完成，2026-08-15）

- 01 Executive Overview 已迁移到新版 `RetailDashboardData` + `createDataService`（`service.getPortfolioMetrics` / `service.getFilterOptions`），未在页面复刻 parser / calculation / filter 逻辑。
- 顶部 Key Figures 共 10 个：
  - 第一行 4 个大卡：Store Count / POS no. / AUP / Gross Sales
  - 第二行 6 个小卡：Total Minorations % / CONSO Net Sales / Gross Margin / Gross Margin % / Customer Contribution / Customer Contribution %
- Store Count 来自 `service.getStores('current', filters).length`，随 Region/City/Status/Tier 筛选动态变化（Total Portfolio 下 = 160）。
- Total Portfolio 使用 Summary `Actual Adj.`；Filtered Portfolio 使用 Detail aggregation；页面标题右侧有轻量 Total / Filtered Portfolio 状态提示。
- AUP 始终来自 Summary P&L，不随筛选变化（AUP ≠ 门店单产）。
- City 已支持 Region / Status / Tier 级联（`service.getFilterOptions` 驱动，无效选中自动回落 All）。
- 顶部筛选器保留 Review Period（静态显示）/ Region / City / Status / 门店单产等级；Year / Comparison / Store Type / Channel 已删除。
- Review Timeline 已删除，替换为 P&L Snapshot，最终列结构：`P&L Line | Current | % of Net Sales | Comparison | % of Net Sales | Variance %`。
- Management Signals 已改为两层：有 Material Signal 时显示显著异常；否则显示 2–3 个 Key Movements（不再出现无信息量空状态）。
- 02 / 03 / 04 尚未迁移（仍走旧 `state.records`，新 workbook 下优雅降级为空态）。
- 下一步：02 P&L Variance Migration（消费 Summary/Filtered Bridge API）。

### Phase 6B — 02 P&L Variance Migration（已完成，2026-08-16）

- 02 P&L Variance 已迁移到新版 `RetailDashboardData` Data Service；Analyze Selector、Bridge、Variance Readout、Driver Table、Top Positive Drivers 和 Top Negative Drivers 共用单一 `selectedVarianceKpi` 状态并已完成联动。
- Analyze 只保留 `Total Minorations` / `Gross Margin` / `Customer Contribution`，已删除旧 Net Sales / Operating Profit 入口。
- 页面只调用 `service.getBridgeData(metric, filters)`，不在 `app.js` 重写 Bridge hierarchy 或 reconciliation calculation。
- Total Portfolio 消费 Summary P&L `Actual Adj.` Bridge；Total Minorations、Gross Margin、Customer Contribution 三个 Total Portfolio Bridge 均为 `residual = 0` / `Reconciled`。Filtered Portfolio 消费 Detail aggregation，并在页面显示当前 scope。
- Filtered Bridge 的 `BRIDGE_RECONCILIATION_ERROR` 继续按现有逻辑处理：阻止 ECharts Bridge 绘制并显示 detail-level reconciliation 提示，不增加 residual / rounding 柱。
- 已知 Data API 颗粒度限制：Summary Customer Contribution Bridge 提供 8 个非重叠细分 Driver；Filtered Customer Contribution detail hierarchy 目前只能安全返回 Gross Margin / Specific A&P / Specific SG&A。Detail A&P 列同时含 component 和 subtotal，在未确认非重叠 hierarchy 前不得在页面或 Core 中凭列名强行拆分。
- 01 的 Total Minorations / Gross Margin / Customer Contribution KPI 均能带入正确的 `selectedVarianceKpi`。02 点击 Driver 时保留 `selectedDriver` 导航上下文，本阶段未迁移 03。
- Analyze selector bug fix：`selectedVarianceKpi` 只保存 `minorations` / `grossMargin` / `contribution`，在 `getBridgeData()` 边界显式映射到 Core API metric；三个按钮直接绑定同一 `renderVariance()` 路径，可在 Total/Filtered scope 下连续切换，并能从 reconciliation error 恢复为正常 Bridge。
- Waterfall renderer fix（2026-08-16）：移除不具备区间柱语义的普通 `bar` + `[start,end]` 写法，改用 ECharts `custom` series 按真实 cumulative start/end 像素坐标绘制 Driver，并增加 connector line。Bridge 专用金额标签按 `>=1000 KRMB → M` / `<1000 KRMB → K` / `0 → —` 动态显示；Total Minorations 的小额 Driver 使用 K、大额 Comparison / Current Anchor 使用 M。Total Minorations、Gross Margin、Customer Contribution 三个 Bridge 均已完成浏览器视觉测试并通过实际页面验收。
- 验证：Core Data 18/18 PASS；三个 Summary Bridge 均 reconcile；浏览器 Mock upload、3 指标切换、Region/Tier Filtered scope、City 联动、Filtered 正常/错误 Bridge、01→02 下钻均通过；无 console error。
- 03 Store Portfolio / 04 Store Detail 仍未迁移。下一步为 Phase 6C — 03 Store Portfolio Migration。

### Phase 6C — 03 Store Portfolio Migration（已完成，2026-08-16）

- 03 Store Portfolio 已迁移到新版 `RetailDashboardData` Data Service，仅消费 `service.getStores(role, filters)`，未在页面复刻 store 级解析 / 筛选 / 计算逻辑。
- 已删除旧模块：两个 Quadrant Charts（Customer Contribution × Net Sales、Gross Margin % × Net Sales）与 Variance Pareto（含 UI、render 逻辑、event 逻辑及仅服务这些图的无用 state / `DRIVER_SETS` / `DRIVER_META`）。
- 03 最终保留两个模式：
  - **Productivity（Bubble）**：X = Customer Contribution **amount**（`store.metrics.customerContribution`）；Y = Gross Margin **amount**（`store.metrics.grossMargin`）；Bubble Size = `store.storeProductivity`（门店总单产，非 Net Sales / AUP / Net Sales÷POS），sqrt scaling（10~41px）。
  - **Store Variance Ranking**（原 Variance Concentration 改名）：Rank Stores By 支持 Gross Sales / CONSO Net Sales / Gross Margin / Customer Contribution 四核心指标；variance = current − comparison（按 terminal 匹配）；Top Positive / Top Negative 各 8 条；**恒为 Current vs Comparison**，不受 Current/Comparison toggle 影响（toggle 仅 Productivity 模式显示）。
- Store Productivity Tier 来自 Excel `门店单产等级` 字段，不前端重算、不写死区间（0~30K / 30~60K / 60~70K / 70~80K / 80~93K / 93~136K / >136K）。All Tier 允许展示全部门店（透明度 + hover + search 高亮，避免不可读）。
- **Selected Tier Summary**（Bubble 上方轻量条）：Store Count / POS Count / Avg Gross Margin % / Avg Customer Contribution % / Avg Store Productivity。Avg GM%/CC% 为 ratio-of-sums（ΣGM÷ΣNS、ΣCC÷ΣNS）；Avg Store Productivity 为简单平均（不叫 AUP）。
- **POS Count 使用真实 `cityPosNo` 字段**（Detail Sheet H 列 `城市POS数`，header mapping 读取，非固定列号）：`sum(store.cityPosNo)`，不再用 distinct terminal、不默认 1 店 = 1 POS。`cityPosNo` 已在 `parseDetailSheet` 中作为 normalized store 顶层与 `metrics` 字段最小暴露（`core-data.js` 仅 +2 行，未改 mapping / Summary `posNo` / AUP / storeProductivity）。
- 实测：Current **160 stores / 196 POS**；Comparison **150 stores / 186 POS**（Store Count ≠ POS Count，字段真实；TOTAL 行已被 `isTotalOrBlankRow` 过滤）。
- Productivity 支持 Current / Comparison 切换（各自当期真实门店，门店数可不同）；Store Search 保留（命中高亮、其余降透明度）。
- 02→03 `selectedDriver` 导航上下文保留；driver 属四核心指标则自动切 Rank Stores By，否则回退 Customer Contribution。03→04 `selectedStore` drill-down 保留（04 未迁移）。
- 已知限制（非 Data API 硬缺口）：非核心 P&L Driver（Summary bridge 的细分 driver field 如 specificDevelopment / stdCos）与 Detail 字段名非一一对应，暂不能直接映射到 store-level ranking；仅四核心指标可用，其余回退 Customer Contribution 并保留 `selectedDriver` 供未来。
- 验证：Core Data 18/18 PASS；`git diff --check` PASS；无头验证 Bubble X/Y/size 字段、Tier / Region+Tier 联动门店数、四指标 ranking Top± 与 sum variance、cityPosNo 求和均正确。
- 04 Store Detail 仍未迁移。下一步为 Phase 6D — 04 Store Detail Migration。

### 2.1 已完成并在代码中存在

#### Mock P&L 数据与数据模型

- `sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx` 是当前唯一标准 Mock Dataset。
- Workbook 包含 Summary P&L 与 Store-level P&L detail；当前样本覆盖 2026 S1 及 2025 S1 同期对比。
- Review Period 契约为 `S1` / `Full Year`，Comparison 为 `Prior Year Same Period`。
- 旧 Workbook 的结构、行数和检查结果不构成新版 Parser 或 Dashboard 的兼容要求。
- P&L 采用收入/利润为正、扣减/费用为负的符号约定。

#### Dashboard 页面和信息架构

- 四个独立 Tab 已实现：Executive Overview、P&L Variance、Store Portfolio、Store Detail。
- 页面具有统一侧边导航、Review Context、全局筛选器、数据提示区、映射 Dialog 和隐私提示。
- UI 为暖白背景、白色 Card、深蓝/香槟金/少量绿橙红配色，未直接引入 AdminLTE 或 Bootstrap 运行库。

#### Executive Overview

- KPI Cards：Net Sales、Gross Margin、Gross Margin %、Customer Contribution、Customer Contribution %、Operating Profit、Operating Margin %、Store Count、POS Count、Average Sales per Store。
- KPI 同时显示 Current、Comparison、变化额和变化率；金额类 KPI 可点击下钻到 Variance Tab。
- Review Timeline 支持 Net Sales、Gross Margin、Customer Contribution、Operating Profit 切换。
- Management Signals 使用纯 JavaScript 规则生成，不调用 AI。
- Year、Review Period 和 Comparison（vs Last Year / vs Previous Review）均为动态控件，不写死 2025/2026。

#### P&L Variance Analysis

- Operating Profit Variance Bridge 已实现并执行加法式核对：

  ```text
  Comparison OP
  + Δ Net Sales
  + Δ Cost of Sales
  + Δ DA Cost
  + Δ Specific A&P
  + Δ Specific SG&A
  + Δ Non-specific Costs
  = Current OP
  ```

- Driver Analysis 支持 Net Sales、Gross Margin、Customer Contribution、Operating Profit。
- Driver 表展示 Current、Comparison、Variance、Variance %、Share of Movement。
- Top Positive Drivers、Top Negative Drivers 及规则式 Variance Readout 已实现。
- 点击 KPI 或 Driver 可继续下钻到相应分析视图。

#### Store Portfolio

- Customer Contribution × Net Sales 四象限散点图已实现，基准线为筛选后门店中位数。
- Gross Margin % × Net Sales 四象限散点图已实现，基准线为筛选后门店中位数。
- Bubble Chart 已实现：X = Net Sales，Y = Customer Transactions；若 Customer Transactions 整列不可用则回退到 POS；**bubble size = Net Sales**。
- Bubble 大小采用平方根缩放，避免最大门店占满图表。
- Current / Comparison 快照切换、Store/Terminal 搜索高亮、图点点击下钻已实现。
- Top Positive Stores、Top Negative Stores、Variance Pareto 和 Top 10 adverse concentration 已实现。
- Store Ranking 可按 Net Sales、Gross Margin、Customer Contribution、Operating Profit 或下钻进来的 Driver 排序。

#### Store Detail

- 点击散点、气泡、Pareto 或 Store Ranking 中门店会自动打开 Store Detail。
- 单店 KPI 显示 Net Sales、Gross Margin、Customer Contribution、Operating Profit 的 Current vs Comparison。
- 完整签名 P&L 表按真实科目顺序展示金额、Variance、Variance % 和 % of Net Sales。
- 单店 P&L tie-out 状态已实现。
- A&P Expense Comparison 与 A&P Expense Variance Waterfall 已实现。
- A&P 组成使用 Customer Samples、Promotional Gifts、Animations、POS Advertising、Specific Development、Specific A&P；费用展示取绝对值，不修改源数据。
- Store Signals 使用 JavaScript 规则生成，不调用 AI。

#### 交互、筛选与图表操作

- 全局筛选：Region、City、Channel、Store Type、Status。
- Upload 支持点击选择和单文件拖拽；支持 `.xlsx`、`.xls`、`.xlsm`、`.csv`。
- Clear Data 会清空 workbook、矩阵、records、图表和 DOM 业务值，但保留 Field Mapping 配置。
- 所有 ECharts 图表使用 inside dataZoom；支持鼠标滚轮缩放、拖动、工具箱框选/回退/复位和双击复位。
- ECharts 点选、KPI、Driver、排名和门店详情之间存在联动。

#### Excel 读取、字段映射与数据验证

- SheetJS 从用户选择的 `File.arrayBuffer()` 在浏览器内解析工作簿。
- 自动扫描所有工作表，并在前 60 行中按字段别名得分寻找表头。
- 列识别按 Header / Alias，不依赖固定列号或列顺序。
- Data Settings 支持手工选择 Worksheet、Header row 和字段映射。
- 必要字段缺失时显示 `Missing required field`，不会直接渲染不完整 Dashboard。
- Mapping 可保存到 localStorage，也可导出/导入 JSON；保存内容仅为字段名和映射关系。
- 空行和合计行会排除；重复 `Store ID × Period Key` 会阻止加载。
- 百分比、括号负数、货币符号和逗号文本可规范化。
- 汇总比率采用 `Σ numerator ÷ Σ Net Sales`，不平均单店百分比。
- 未缓存公式、P&L tie-out、空行、合计行和未映射 recommended 字段会形成警告。

#### 本地/离线设计

- `index.html` 使用相对路径和经典 `defer` 脚本，不使用 ES Modules。
- ECharts 5.5.1 与 SheetJS CE 0.18.5 已保存在 `libs/`，无运行时 CDN。
- CSP 包含 `connect-src 'none'`；应用代码未使用 fetch、XHR、WebSocket、Beacon、Analytics 或 Telemetry。
- 代码设计为可以通过 `file://` 双击 `index.html` 运行；不需要 Python、Node、npm 或本地服务器。
- 开发预览站部署在 Vercel，属于联网的 Mock Data 开发环境；它与公司电脑本地离线使用场景必须严格区分。

### 2.2 审计和测试证据

- 以下为 2026-08-14 对 legacy `Mock_Counter_PnL.xlsx` 的历史审计，不代表当前 Source of Truth，也不是兼容要求：
  - 6 个工作表：`README`、`Counter_PnL`、`Drivers`、`Checks`、`Row_Checks`、`Data_Dictionary`。
  - `Counter_PnL` 范围为 `A1:BP641`，即 68 列、640 条事实记录。
  - 160 个 distinct Store ID；4 个期间；0 个重复 Store-Period 主键；主表 0 个空值。
  - 工作簿公式错误扫描未发现 `#REF!`、`#DIV/0!`、`#VALUE!`、`#NAME?` 或 `#N/A`。
  - `Checks` 页所有 P&L tie-out、符号、百分比和行数检查均为 `OK`。
- `node --check js/app.js` 通过。
- 当前仓库没有自动化浏览器测试套件；“所有交互均长期无回归”不能仅凭语法检查保证。
- 此次交接没有改动 Dashboard 功能，也没有重新执行完整的跨浏览器 `file://` 手工测试。

## 3. 技术架构

### 3.1 Frontend

| 层 | 实现 |
|---|---|
| 页面 | `index.html`，单页、四 Tab、原生 Dialog 与表单控件 |
| 样式 | `assets/styles.css`，原生 CSS、响应式布局、无 Bootstrap |
| 业务逻辑 | `js/app.js`，IIFE + strict mode，原生 JavaScript |
| 图表 | 本地 `libs/echarts.min.js`，ECharts 5.5.1，Canvas renderer |
| Excel | 本地 `libs/xlsx.full.min.js`，SheetJS CE 0.18.5 |
| 开发工具 | Vite 7，仅用于 Hot Reload / Build；生产逻辑仍是静态文件 |

### 3.2 数据处理流程

```text
用户选择或拖入 Excel
  ↓
File.arrayBuffer()
  ↓
XLSX.read() 在浏览器内解析
  ↓
扫描 Sheet + 识别 Header row
  ↓
自动别名映射 / 用户手工 Mapping
  ↓
必要字段校验 + 行过滤 + 数字规范化
  ↓
派生比率和部分 subtotal + P&L tie-out
  ↓
Store × Period 内存语义模型
  ↓
Current / Comparison + 全局筛选
  ↓
KPI / Variance / Driver / Store / Detail
  ↓
ECharts 本地渲染
```

### 3.3 运行模式

| 问题 | 当前结论 |
|---|---|
| `file://` 直接打开 | 代码结构支持；需目标公司的浏览器策略允许本地 JS 和本地文件访问 |
| 完全断网使用 | 本地文件夹版本支持，所有运行库已本地化 |
| 外部 CDN | 无 |
| 应用主动网络请求 | 无；CSP 为 `connect-src 'none'` |
| 开发预览站是否联网 | 是，Vercel 页面加载本身需要互联网；仅允许 Mock Data |
| 真实数据持久化 | 不写 localStorage / IndexedDB / Cookie；只在页面内存和当前 DOM 中存在 |
| localStorage | 仅保存字段名、映射和结构签名 |

## 4. 当前文件结构与用途

```text
Retail_Performance_Dashboard/
├── index.html                         # 单页 Dashboard、四 Tab、上传与 Mapping Dialog
├── assets/
│   ├── styles.css                     # 全部 UI、响应式、卡片、表格和导航样式
│   └── favicon.svg                    # 本地图标
├── js/
│   └── app.js                         # 字段层、解析、验证、计算、筛选、图表和联动（944 行）
├── libs/
│   ├── echarts.min.js                 # ECharts 5.5.1，本地运行依赖
│   └── xlsx.full.min.js               # SheetJS CE 0.18.5，本地运行依赖
├── config/
│   └── default-mapping.json           # 人工参考映射；页面不会 fetch 此文件
├── sample_data/
│   ├── Retail_Performance_Dashboard_Mock_Data.xlsx # 当前唯一标准 Mock Dataset
│   ├── Mock_Counter_PnL.xlsx          # legacy；保留但默认不读取
│   └── README.md                      # Mock 文件用途说明
├── docs/
│   ├── DATA_MODEL.md                  # 当前 Source of Truth、期间与比较口径
│   └── HANDOFF.md                     # 本交接文档
├── README.md                          # 使用、离线运行、图表操作和常见问题
├── ARCHITECTURE.md                    # 本地数据流、语义层、比较期和 Drill-down 设计
├── DATA_REQUIREMENTS.md               # Excel 必要/推荐字段和 P&L 关系
├── FIELD_MAPPING_GUIDE.md             # 自动/手工映射、配置迁移和安全 Debug
├── SECURITY.md                        # 数据隐私控制和残余风险
├── MIGRATION_SECURITY_REPORT.md       # 可迁移性与网络依赖审计说明
├── DEVELOPMENT.md                     # Vite、Git Push、Vercel 持续部署流程
├── THIRD_PARTY_NOTICES.md             # ECharts / SheetJS 第三方声明
├── package.json                       # Vite 开发依赖与 npm scripts
├── vercel.json                        # Vercel 静态站配置
└── .gitignore                         # 禁止提交真实表格，仅白名单 Mock workbook
```

注意：仓库当前**没有** `SHA256SUMS.txt`，但 README / Security 文档仍提到它；见“当前问题列表”。

## 5. 数据模型

### 5.1 时间与粒度

- Review Period 数据契约：`S1` / `Full Year`。
- 当前 Mock 期间：`2025 S1`、`2026 S1`。
- 门店明细粒度：一行 = 一家门店在一个 Review Period 下的 P&L。
- Comparison 固定为 `Prior Year Same Period`；不再以 `Previous Review` 作为新版默认口径。

### 5.2 Mock 工作簿结构

| Sheet | 用途 |
|---|---|
| README | 粒度、单位、符号、用途和模型流说明 |
| Counter_PnL | Dashboard 唯一事实源；640 行 × 68 字段（不含表头） |
| Drivers | Customer Transactions、Average Ticket、费率、成本率等模拟驱动 |
| Checks | 模型总检查与 PASS/FAIL 状态 |
| Row_Checks | 640 行逐店逐期间 tie-out 检查 |
| Data_Dictionary | 68 个事实字段的数据字典 |

### 5.3 68 个 `Counter_PnL` 字段

```text
Year; Review Period; Period Key; Store ID; Store; City; Province; Region;
Channel; Store Type; Status; POS Count; City POS Count; Customer Transactions;
Average Ticket; RSP; Gross Sales; Discount; Discount % of GS; Rebates;
Rebates % of GS; Structural Conditions On; Structural Conditions Off;
Active Support; Shopper Investment; Promo Allow On Invoice;
Promo Allow Applied Separately; Promo Allow Loyalty; Promotional Allowance;
Promotional Allowance % of GS; Returns; Returns % of GS; OCA; Coupon;
Minorations; Minorations % of GS; Net Sales; Net Sales % of GS;
Net Sales / POS; Store Productivity Tier; Std COS; Royal / TA / MS;
Special Operations Cost; Obsolete / Slow Moving / Return;
Physical Distribution; Cost of Sales; Cost of Sales % of Net Sales;
Gross Margin; Gross Margin %; Customer Samples; Promotional Gifts; Animations;
POS Advertising Amortization; Other POS Advertising; POS Advertising;
Specific Development; DA Cost; DA HC; Non DA Cost; DA Cost / HC; DA HC / POS;
Specific A&P; Specific SG&A; Customer Contribution; Customer Contribution %;
Non-specific Costs; Operating Profit; Operating Margin %
```

当前分类值：

- Regions：北区、东区、南区、西区。
- Channels：Shopping Mall、Department Store。
- Store Types：Prestige Shopping Center、Luxury Department Store、Core Shopping Center、Regional Mall。
- Status：正常、新开店、装修、暂停营业。

### 5.4 核心计算关系

```text
Promotional Allowance
  = Structural On + Structural Off + Active Support + Shopper Investment
  + Promo Invoice + Promo Separate + Promo Loyalty

Minorations
  = Discount + Rebates + Promotional Allowance + Returns + OCA + Coupon

Net Sales = Gross Sales + Minorations
Cost of Sales = Std COS + Royal + Special Ops + Obsolete + Physical Distribution
Gross Margin = Net Sales + Cost of Sales
DA Cost = Samples + Gifts + Animations + POS Advertising + Specific Development
Customer Contribution = Gross Margin + DA Cost + Specific A&P + Specific SG&A
Operating Profit = Customer Contribution + Non-specific Costs
```

汇总百分比：

```text
Gross Margin % = Σ Gross Margin ÷ Σ Net Sales
Customer Contribution % = Σ Customer Contribution ÷ Σ Net Sales
Operating Margin % = Σ Operating Profit ÷ Σ Net Sales
Average Sales per Store = Σ Net Sales ÷ distinct Store ID
```

工作簿单位为 `RMB 000 / KRMB`；页面显示金额时乘以 1,000 并格式化为 `¥K / ¥M / ¥B`。

## 6. Dashboard Information Architecture

### Tab 1 — Executive Overview

**回答：What changed?**

- Current vs Comparison KPI Cards。
- 动态期间与 Comparison 选择器。
- 半年度 Review Timeline。
- 管理层规则式 Signals。
- KPI 点击后进入 Variance Analysis。

### Tab 2 — P&L Variance Analysis

**回答：Why did it change?**

- Operating Profit Variance Bridge。
- 按 Net Sales / Gross Margin / Customer Contribution / Operating Profit 切换 Driver。
- Driver 明细和正负贡献排名。
- Driver 点击后进入 Store Portfolio 的相关门店 Variance。

### Tab 3 — Store Portfolio

**回答：Where did it happen?**

- Contribution × Sales 与 GM% × Sales 四象限。
- Productivity Bubble。
- Store Ranking 与 Variance Pareto。
- 搜索、Current/Comparison 切换、筛选和门店点击。

### Tab 4 — Store Detail

**回答：What happened in this store?**

- 单店 Current vs Comparison KPI。
- 完整 Store P&L 和 tie-out。
- A&P Current vs Comparison。
- A&P Variance Waterfall。
- 单店规则式 Signals。

共享 Drill-down 状态：

```text
KPI click
  → selected variance KPI
  → selected P&L driver
  → store-level driver variance
  → selected Store ID
  → Current vs Comparison Store P&L / A&P
```

## 7. 已确认的重要业务与产品决策

1. Review Period 为 S1 / Full Year，不做月度主模型。
2. Dashboard 必须遵循 `Overview → Variance → Driver → Store → Detail`，不能退回为一页堆满门店散点图。
3. 一行 = Store × Review Period；不再使用“一行 = 一个门店”的旧数据模型。
4. Bubble size 使用 Net Sales，不使用 Net Sales / POS。
5. P&L 和同比关系必须可核对，不能为了视觉效果写死数字。
6. 年份动态读取；Review Period 按 S1 / Full Year 识别。
7. 真实数据不得离开公司电脑；AI 只负责使用模拟数据开发工具。
8. 真实 Excel 不能自动按路径加载，只能由用户主动 Upload / Drop。
9. 需要保留 Field Mapping，以适配真实 Excel 的列名、列顺序、Sheet 和 Header row 变化。
10. 当前不打包桌面应用；本地主路径仍是静态 HTML 文件夹。
11. 当前也有 Vercel Development Website，用于 Mock Data 演示与持续开发；它不是企业真实数据环境。
12. 暂缓 Enterprise Release、正式 ZIP、公司安全策略适配和版本发布流程，除非用户重新明确要求。

## 8. 代码维护规则

### 8.1 修改前必须做

1. 阅读本文件，以及与任务有关的 `README.md`、`ARCHITECTURE.md`、`DATA_REQUIREMENTS.md`。
2. 先确认任务属于业务逻辑、数据模型、UI、映射还是部署；不要把不同范围混在一次改动中。
3. 检查 `git status`，保护用户已有未提交修改。
4. 明确成功标准并先做最小改动。
5. 使用 Mock 数据复现和验证；不得索取真实业务数据。

### 8.2 不要做

- 未确认前改变 P&L 口径、符号、比较期、单位或 Drill-down 路径。
- 为了重构而删除已有功能或改变交互。
- 引入 CDN、Google Fonts、在线图标、Analytics、Telemetry、外部 API 或网络数据服务。
- 写死 `/Users/...`、`C:\Users\...`、`file:///...` 或真实 Excel 路径。
- 通过 `fetch('./config.json')` 或 `fetch('./data.xlsx')` 破坏 `file://` 兼容性。
- 将原始 Excel 行、P&L、门店值写入 localStorage、IndexedDB、Cookie 或 Cache。
- 在 Console 中输出完整 records、rows、workbook 或业务数据。
- 将真实 Excel 放进项目目录、Git、Vercel 或 AI 对话。
- 未经用户要求执行 commit / push；交接任务明确要求不 commit。
- 删除文件时直接 `rm`；本工作区规则要求使用 `/usr/bin/trash`，若失败则停止并询问。

### 8.3 需要保持

- 相对路径、经典脚本和 `file://` 兼容。
- 本地 ECharts / SheetJS 和 `connect-src 'none'`。
- 动态期间、字段映射、缺失字段提示和数据质量检查。
- 真实数据只在浏览器内存处理；刷新/关闭后不自动恢复。
- 四层信息架构和跨 Tab Drill-down。
- 金额、百分比、费用符号和 Current/Comparison 的一致口径。
- Mock-only Development Website 数据边界。

## 9. 当前问题、Bug 风险与技术债

以下项目按审计结论记录；不要把它们描述为已经修复。

### P0 — 在继续扩展前应优先处理

1. **固定开发网址可能不会自动跟随每次部署。**  
   `retail-performance-dashboard-dev.vercel.app` 是手工 alias 到一次具体 deployment 后建立的。Git Push 已能触发 Vercel Production Deployment，但需要确认该 alias 是否随未来 Production 自动移动；如果它仍固定在旧 deployment，应在 Vercel 中绑定真正的 Production Domain，或在 CI/部署后更新 alias。  
   另：`retail-performance-dashboard.vercel.app` 已被同一账户中的另一套韩文 Dashboard 占用，**不是本项目，禁止当作本项目网址**。

2. **缺少自动化端到端回归测试。**  
   当前 `npm run check` 只执行 `node --check js/app.js`。Upload、Mapping、640 行加载、KPI、Median、筛选、Drill-down、Waterfall tie-out 和 Clear Data 没有可重复的浏览器测试。继续改图表前应建立最小 Mock E2E smoke test。

3. **无法解析的数值目前会静默变成 0。**  
   `toNumber()` 对空值和不可解析文本返回 0。这对可选费用行有便利，但可能掩盖真实 Excel 中的异常文本、错误公式或缺失金额。应设计“missing / invalid / legitimate zero”三态校验，并在不泄露数据的情况下给出行号和字段级错误。

### P1 — 重要优化

4. **`js/app.js` 为 944 行单文件。**  
   Mapping、Parsing、Semantic Model、Charts、State 和 UI Event 全部耦合在一个 IIFE。当前可运行，但长期维护和测试成本较高。未来应在保持 classic scripts / file:// 的前提下拆为有明确加载顺序的本地模块，例如 `field-mapping.js`、`data-parser.js`、`analytics.js`、`charts.js`、`app.js`；不要直接改为浏览器 ES Modules。

5. **必要字段与派生逻辑存在语义不一致。**  
   `netSales`、`grossMargin`、`contribution`、`operatingProfit` 被列为 required，因此校验通过后，它们在 `deriveRecord()` 中的“缺失时派生”分支实际不可达。需要明确未来策略：核心报表值必须由 Excel 提供，还是允许用明细科目派生；确认后同步代码和文档。

6. **模糊字段自动映射存在误配风险。**  
   当前别名允许 `includes()` 模糊匹配。相近字段（例如 amount 与 percentage、subtotal 与 component）可能被错误命中。真实数据阶段应显示 mapping confidence、冲突提示，并要求用户确认低置信度字段。

7. **公式无缓存时只警告并以 0 继续。**  
   这可能导致 Dashboard 加载出严重失真的结果。关键 required 字段出现 uncached formula 时应考虑阻止加载；recommended 字段可警告降级。需由用户确认严格程度。

8. **比较期完整性检查有限。**  
   单店缺少 Comparison 时会显示提示，但组合层未明确报告新增店、退出店、只在一侧出现的 Store 数量及其对 Variance 的影响。可增加 Bridge scope reconciliation / cohort indicator。

9. **文档与实际文件存在偏差。**
   - README 的发布树和 SECURITY 文档提到 `SHA256SUMS.txt`，但当前文件不存在，且 `.gitignore` 忽略它。
   - `ARCHITECTURE.md` 的旧版差异段写“离线版不包含任何 Excel”，但当前仓库明确包含 Mock workbook。
   - `DATA_REQUIREMENTS.md` 支持文件列表未列 `.xlsm`，而 HTML 和 JavaScript 接受 `.xlsm`。
   - 文档写表头位于前 50 行，代码实际扫描前 60 行。
   这些属于文档修订任务，不应顺手改变业务逻辑。

10. **GitHub About 描述尚未在本次交接中核验。**  
    仓库 slug 已是 `retail-performance-dashboard`，但此前曾观察到旧的 Counter Performance Dashboard 描述。下一次涉及仓库元数据时应只读核验后再决定是否修改。

### P2 — 长期增强

11. 增加 Field Mapping 配置版本迁移、冲突报告和匿名化诊断导出（不能包含业务值）。
12. 增加全局 Data Quality Drawer：missing、invalid、duplicate、formula cache、tie-out、period coverage。
13. 增加可审计的 KPI/Driver 定义页和版本号，但避免在 UI 堆积技术内容。
14. 增加无障碍键盘操作、屏幕阅读器标签和高对比度检查。
15. 做 Windows 公司环境的 Edge `file://`、缩放、拖拽和 Excel 上传实机测试。
16. Enterprise Release 仅在用户明确启动后再做：固定哈希、ZIP、受控目录、公司 IT 审核、浏览器策略和 Release Notes。

### 当前未发现的阻断性问题

- 当前 JavaScript 语法检查通过。
- Mock 主表无空值、无重复 Store-Period、工作簿检查为 PASS。
- 未发现应用代码中的绝对个人路径、外部 CDN 或主动网络请求。
- 未发现完整业务行的 `console.log`。

## 10. Git 与部署状态（交接时快照）

- Branch：`main`
- Upstream：`origin/main`
- 交接文档创建前状态：`main...origin/main`，无未提交修改。
- 最近 commit：

  ```text
  52b8ad5 Use fixed development website URL
  full: 52b8ad5bec6d0d0a456ff42d093f762e2467fc4c
  date: 2026-08-14T01:31:40+08:00
  ```

- 本文创建后，预期唯一未提交项为：`?? docs/HANDOFF.md`。
- 按用户要求：**不要在本次交接中 commit 或 push。**
- 是否建议 commit：建议用户审阅 HANDOFF 后，在下一窗口明确授权时单独提交，commit message 可使用 `Add project handoff documentation`。
- Git Push 到 `main` 会触发 Vercel 部署；但固定 alias 自动跟随问题仍需按 P0 核验。
- Vercel 项目名：`retail-performance-dashboard`；SSO Protection 已关闭，开发站公开访问，因此必须继续保持 Mock-only。

## 11. 下一窗口的建议执行顺序

### P0 — 必须先完成

1. 读取本文件，不要依赖旧聊天记忆。
2. 运行 `git status --short --branch`，确认只有用户预期的修改。
3. 只读核验 Vercel Production Domain / alias 是否跟随最新 Git 部署；不要误用被其他项目占用的 `retail-performance-dashboard.vercel.app`。
4. 建立最小自动化 E2E smoke test，覆盖 Mock 上传、640/160/4、KPI、Comparison、Filter、Driver → Store → Detail、A&P reconcile 和 Clear Data。
5. 为 invalid numeric / uncached required formula 建立明确的数据验证策略，再修改解析逻辑。

### P1 — 重要优化

1. 修正文档偏差：SHA256SUMS、Mock workbook、`.xlsm`、表头扫描行数。
2. 在不引入 ES Modules 和网络依赖的前提下拆分 `app.js`，每次拆分后运行 E2E 回归。
3. 增加 mapping confidence / collision validation。
4. 增加 current/comparison store coverage 与 cohort 说明。
5. 完成 Windows Edge / `file://` 实机兼容测试。

### P2 — 长期增强

1. Data Quality Drawer 与匿名诊断包。
2. KPI / Driver definition 与版本追踪。
3. Accessibility 与响应式视觉回归。
4. 用户明确启动后，再规划 Enterprise Release 和安全加固；不要提前扩张范围。

## 12. 常用维护命令

从项目目录执行：

```bash
cd "/Users/ellaaa/Documents/AI黑客松--财务自动化/Retail_Performance_Dashboard"
git status --short --branch
npm install
npm run dev
npm run check
```

开发流程：

```text
本地使用 Mock Data 修改
  → npm run check + 浏览器 Smoke Test
  → 检查 git diff / git status
  → 用户明确授权后 commit / push
  → Vercel 自动部署
  → 验证正确的固定 Development URL
```

本地离线使用流程：

```text
复制完整 Retail_Performance_Dashboard 文件夹
  → 双击 index.html
  → 用户主动选择 Excel
  → 浏览器内存解析、计算和绘图
  → Clear Data 或关闭页面
```

## 13. 给下一个 Codex 的第一条工作指令

建议新窗口先执行：

```text
请先阅读 docs/HANDOFF.md，并只读检查 git status、当前文件结构和与本次任务相关的代码。
不要假设真实公司数据可以提供给你；所有开发和测试只能使用 sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx。
在我确认范围之前，不要改变 P&L 口径、信息架构、离线边界或执行 Git commit/push。
```
