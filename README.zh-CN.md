# 零售经营分析看板

[English](README.md) | [**简体中文**](README.zh-CN.md)

一个面向线下门店经营复盘的交互式分析看板，将门店级损益数据组织为从整体表现、差异解释、门店组合到单店诊断的分析流程。

## 在线演示

[**打开在线演示 →**](https://counter-performance-dashboard.vercel.app/)

在线演示使用 100% 虚构的模拟数据，仅用于展示产品功能。默认为英文界面，可通过侧边栏切换简体中文。

## 产品预览

### 01 · 经营概览

集中查看门店数、销售人员人数、实际成交总额、销售总额、销售扣减率、合并净销售额、毛利额和客户贡献额。区域、城市、状态和门店单产等级筛选会同步更新分析结果。

![经营概览：核心指标、销售人员人数、筛选和管理提示](docs/images/dashboard-overview.jpg)

### 02 · 差异分析

从损益表快照进入同一套可勾稽的客户贡献桥接。`Amount | %` 切换分别展示绝对金额变动和百分点变动，驱动因素分析与门店差异排名支持继续下钻。

![损益表快照与客户贡献百分比桥接](docs/images/variance-analysis.jpg)

### 03 · 门店组合分析

通过三个互补视角筛查门店，不将看板包装为预测模型：

- **经营表现**：X 轴为客户贡献率，Y 轴为门店单产变化率，气泡大小代表当期门店总单产。四类经营状态为健康增长、高回报但单产下滑、增长但回报偏低、优先复盘。
- **人员效率**：X 轴为门店总单产，Y 轴为销售人员人数。用于筛查单产与相邻较低人数门店组重叠的较高人数门店。这只是复盘信号，不代表人员调整建议。
- **差异贡献**：查看哪些门店对所选整体差异的贡献最大。

![新版门店组合经营表现气泡图](docs/images/store-portfolio.jpg)

### 04 · 单店分析

查看既有门店的当期/上年同期信息、销售人员人数、门店损益表、动态“占销售额比例”，以及从专项广告及促销、专项销售及管理、专项费用合计到客户贡献额和营业利润的损益层级，并配合广告及促销构成与正式广告及促销总额。

![既有门店的当期与上年同期损益层级及广告及促销分析](docs/images/store-detail.jpg)

## 解决的问题

门店经营复盘往往将整体指标、损益差异解释、人员配置背景和单店明细分散在不同文件中。该看板将这些内容组织为可重复的分析路径，同时保持财务定义和勾稽规则明确。

## 分析路径

```text
01 经营概览
   → 02 差异分析
      → 03 门店组合分析
         → 04 单店分析
```

门店选择在门店组合和单店分析之间共享：可以在 03 搜索或点击门店，再进入 04 查看同一 Terminal 的明细。激活工作簿后也可以直接打开 04，不需要按顺序访问前三页。

## 当前功能

- 指标卡、损益表、桥接、比率和门店视图共用同一标准化模型与 Finance Contract。
- 每条损益行使用正式的“占销售额比例”分母规则，金额与比率勾稽状态分开管理。
- 基于 exact Terminal 构建当期/上年同期配对，统一提供门店单产变化率、销售人员人数以及客户贡献金额/比率。
- Public 版支持英文和简体中文，切换语言不会重置当前页面、筛选或所选门店。
- Public 为 Demo-first；Internal 为 Upload-first、English-only，两者共用同一 Core。
- 采用本地 classic scripts，无框架、无 module loader、无 CDN、无后端依赖。

公开模拟数据包含 160 家当期门店、150 家 exact-Terminal 对比门店和 10 家新开门店。Public Demo 与 sample workbook 使用同一套业务数据语义。

## 数据与隐私架构

```text
模拟演示数据 / 已上传工作簿
  → 数据准备
  → 标准化数据模型
  → Data Service + Finance Contract
  → 看板视图
```

- 数据仅在本地浏览器中处理。
- Excel 解析、清洗、校验、配对和计算在客户端完成。
- 应用无后端、无数据库、无分析埋点或遥测。
- 运行时资源均为本地文件，Content Security Policy 禁止看板建立网络连接。
- 对外展示只使用虚构的模拟数据。

## 技术实现

- Vanilla HTML、CSS 和 JavaScript
- Apache ECharts 5.5.1 与 SheetJS Community Edition 0.18.5
- 从 sample workbook 生成可重复验证的模拟 Demo artifact
- Public / Internal 共用 Core，支持 classic scripts 和 `file://`
- Node.js 契约与回归测试，覆盖财务计算、解析、Data Service、UI 行为和离线包完整性

AI agents 参与了编码、调试、测试和迭代。财务定义、业务逻辑、分析框架和验收标准由人工设计与确认。

## 本地运行

可直接打开 `index.html`，或启动静态服务：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后访问 `http://127.0.0.1:4173/`。

也可使用项目开发命令：

```bash
pnpm install
pnpm dev
```

## 测试

```bash
pnpm run check
pnpm test
pnpm run generate:demo
pnpm run build:internal-edge
pnpm run test:internal-edge
```

测试覆盖 Finance Contract、分母规则、勾稽、工作簿清洗、Demo/Upload 一致性、门店组合行为、单店损益层级、双语界面、classic script 兼容性与 Internal package integrity。
