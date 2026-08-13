# Recommended Technical Architecture

## 数据流

```text
Company Excel on local disk
        ↓ user selects file
Browser File / ArrayBuffer API
        ↓
Local SheetJS parser
        ↓
Field mapping + validation in memory
        ↓
Store × Period semantic model
        ↓
Current / Comparison scope engine
        ↓
Local JavaScript calculations and drill state
        ↓
Local ECharts rendering
```

没有服务器、数据库、上传端点或外部 AI 环节。

## 当前旧版与离线版差异

旧版 `dashboard/index.html`：

- ECharts 和 SheetJS 从 jsDelivr CDN 加载；
- 打开时需要互联网；
- 内嵌模拟 Excel；
- 没有用户可操作的字段映射页。

本文件夹的离线版：

- 所有依赖位于 `libs/`；
- 不包含任何 Excel；
- Content Security Policy 禁止网络连接；
- 包含字段自动识别、验证、Mapping Settings 和配置导入/导出；
- 仅在浏览器内存处理经营数据。

## 方案 A 与方案 B

| 维度 | A: Single HTML | B: Local Folder |
|---|---|---|
| 数据安全 | 可做到完全本地 | 可做到完全本地 |
| 断网能力 | 好 | 好 |
| 文件大小 | 单文件约 2 MB 以上 | 总量约 2 MB，分文件 |
| 审计 | 第三方库被压入大文件，较难审阅 | 库、业务代码、CSS 分离，容易审核和计算哈希 |
| 更新 | 每次更新替换整个文件 | 可只替换 `js/`、`assets/` 或固定库 |
| 维护 | 大型单文件难读、难比较 | 结构清晰，适合版本管理 |
| 误操作 | 用户不易漏文件 | 必须保留整个目录结构 |
| 公司兼容性 | 某些安全工具更易接受单文件，也可能因内嵌脚本过大而拦截 | 更符合常规静态应用审计与软件分发 |

## 推荐

长期企业使用推荐 **方案 B：Local Folder**。

原因：可审计、易维护、第三方依赖版本清晰、便于 IT 做哈希白名单和增量升级。方案 A 更适合一次性分发或公司只能传递单文件的场景，但不应作为主要维护源。

## 分析语义层

### 粒度与主键

```text
Grain: Store ID × Review Period
Composite key: normalized(Store ID) + normalized(Period Key)
```

重复主键属于 Critical Data Quality Issue，Dashboard 会停止加载。

### 动态期间

- Year 和 Review Period 从上传数据推导，不写死具体年份。
- 默认 Current 为排序后的最新期间。
- `vs Last Year` 查找上一年度相同 Review Period。
- `vs Previous Review` 查找时间顺序中的上一期间。

### 汇总指标

```text
Gross Margin % = Σ Gross Margin ÷ Σ Net Sales
Customer Contribution % = Σ Customer Contribution ÷ Σ Net Sales
Operating Margin % = Σ Operating Profit ÷ Σ Net Sales
Average Sales per Store = Σ Net Sales ÷ distinct Store ID
```

### Operating Profit Bridge

```text
LY OP
+ Δ Net Sales
+ Δ Cost of Sales
+ Δ DA Cost
+ Δ Specific A&P
+ Δ Specific SG&A
+ Δ Non-specific Costs
= Current OP
```

该结构避免同时加入完整 `Sales Impact` 和 `Gross Margin Impact` 造成重复计算。

## Drill-down 状态

```text
KPI click
  → selected variance KPI
  → selected P&L driver
  → store-level driver variance
  → selected Store ID
  → Current vs Comparison Store P&L
```

所有 Tab 共享当前期间、比较方式和全局筛选条件。

## AI 边界

### 外部开发阶段

- 仅用模拟数据开发和测试；
- AI 可以修改代码、设计交互、编写测试；
- 不把真实 Excel、截图、内部链接或真实结果发送给 AI。

### 公司内部使用阶段

- 真实数据只进入批准的本地离线 Dashboard；
- AI 不参与读取、分析或排错真实数据；
- 映射由用户在本地 Data Settings 完成。

### 安全 Debug

如需外部帮助，使用虚构的最小复现文件，或只提供经审批的错误文本、匿名字段类型和复现步骤。详细清单见 `FIELD_MAPPING_GUIDE.md`。
