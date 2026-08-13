# Counter Performance Dashboard — Offline P&L Review Edition

> Development website source. Mock data only. See `DEVELOPMENT.md` for Hot Reload and continuous deployment.

这是一个完全在公司电脑浏览器本地运行的半年度 Counter P&L Review 工具。分析路径为：

```text
Executive Overview → P&L Variance → Store Portfolio → Store Detail
```

交付包只包含明确标记的 Mock Dataset，不包含任何真实业务数据，也不需要服务器。

## 四个分析页面

1. **Executive Overview**：Current、Comparison、Variance、Variance %，以及 Review Timeline 和规则式管理提示。
2. **P&L Variance**：可核对的 Operating Profit Bridge、KPI Driver Analysis、Top Positive / Negative Drivers。
3. **Store Portfolio**：Current / Comparison 四象限、Customer Transactions 气泡图、Store Ranking 和 Variance Pareto。
4. **Store Detail**：单店 Current vs Comparison KPI、完整签名 P&L、A&P 对比与费用差异瀑布图。

## 视觉设计

- 页面信息架构以 AdminLTE v3 的轻量企业 Dashboard 为主要参考，并吸收 v2 的财务报告层级。
- 采用暖白底色、黑色品牌导航、香槟金细节与深蓝图表，面向 L'Oréal Finance / Retail 管理场景。
- 项目没有引入 AdminLTE 或 Bootstrap 运行依赖；视觉样式由本地 `assets/styles.css` 实现，因此不会增加 CDN 或网络请求。
- 侧栏、KPI、图表卡片、表格和单店下钻均支持窄屏响应式布局。

## 推荐使用方式

1. 将整个 `Counter_Performance_Dashboard` 文件夹复制到公司电脑的受控目录。
2. 保持 `index.html`、`assets`、`js`、`libs` 和 `config` 的相对位置不变。
3. 使用公司批准的最新版 Microsoft Edge 或 Google Chrome 双击打开 `index.html`。
4. 将 Excel 直接拖入 **Drop Excel here** 区域，或点击该区域选择保存在公司电脑上的文件。
5. 文件第一次加载时，Dashboard 会自动寻找工作表、表头、Review Period 和字段。
6. 如果必要字段未识别，打开 **Data Settings** 完成字段映射，然后点击 **Apply & Load Data**。
7. 默认显示数据中最新的 Review Period，并使用上一年度相同 Review Period 作为比较期。

目标电脑不需要安装 Python、Node.js、npm、VS Code、Terminal 或本地服务器。只需公司批准的现代 Edge / Chrome 浏览器。

## 迁移到另一台电脑

1. 复制完整文件夹，或复制 `Counter_PnL_Dashboard.zip`。
2. 在目标电脑上解压，不要单独取出 `index.html`。
3. 双击解压后的 `index.html`。
4. 从 `sample_data/Mock_Counter_PnL.xlsx` 开始验证；真实 Excel 可位于公司电脑上的任意受控目录，不需要放入 Dashboard 文件夹。

如公司浏览器策略禁止本地 HTML/JavaScript 或 `file://` 访问，需要 IT 审核并将该受控目录加入允许列表；这属于公司终端策略，不能由 Dashboard 代码绕过。

## 图表缩放与移动

- 在图表上滚动鼠标滚轮或使用触控板，可以围绕光标位置缩放。
- 按住图表绘图区拖动，可以平移当前视图。
- 图表右上角提供框选放大、返回上一步和重置视图工具。
- 双击图表绘图区可恢复完整数据范围。

## 预期数据粒度

```text
一行 = 一个 Store ID × 一个 Review Period
```

例如 160 家门店、4 个期间应读取为：

```text
640 P&L records · 160 stores · 4 review periods
```

Dashboard 会拒绝重复的 `Store ID × Period` 组合，避免重复汇总。

## 数据如何处理

- Excel 通过浏览器 `File` / `ArrayBuffer` API 读入当前页面内存。
- 拖拽上传仅通过浏览器 `Drag and Drop` / `File` API 获取用户拖入的本地文件，不会发送网络请求。
- SheetJS 在浏览器内解析工作簿，ECharts 在浏览器内绘图。
- 文件内容不会被代码上传、发送或同步到任何服务器。
- 页面配置了 `connect-src 'none'`，禁止 `fetch`、XHR、WebSocket 等网络连接。
- 点击 **Clear Data** 或关闭页面后，当前页面内存中的业务数据被释放。
- **Clear Data** 同时清空 Workbook Object、原始工作表矩阵、转换后记录、筛选项、排名、图表和单店明细，但不删除 Field Mapping 配置。
- `localStorage` 只用于保存字段名与映射关系，不保存 Excel 行、金额或门店经营数据。

## 完全离线

运行所需库已经固定在 `libs/`：

- Apache ECharts 5.5.1
- SheetJS Community Edition 0.18.5

页面没有 CDN、Google Fonts、外部 CSS、在线图标、API、Analytics 或 Telemetry。断网可正常使用。

`index.html` 使用经典 `defer` 脚本和相对路径，不使用 ES Modules，不通过 `fetch()` 读取本地 JSON 或 Excel，因此适用于直接双击的 `file://` 模式。

## 发布文件结构

```text
Counter_PnL_Dashboard/
├── index.html
├── assets/
│   ├── styles.css
│   └── favicon.svg
├── js/
│   └── app.js
├── libs/
│   ├── echarts.min.js
│   └── xlsx.full.min.js
├── config/
│   └── default-mapping.json
├── sample_data/
│   ├── Mock_Counter_PnL.xlsx
│   └── README.md
├── README.md
├── DATA_REQUIREMENTS.md
├── FIELD_MAPPING_GUIDE.md
├── SECURITY.md
├── MIGRATION_SECURITY_REPORT.md
└── SHA256SUMS.txt
```

`config/default-mapping.json` 是供人工参考的映射示例，页面不会通过网络或本地 `fetch()` 自动读取它。

## 更新 Dashboard

建议将整个文件夹作为一个版本发布，例如：

```text
Counter_Performance_Dashboard_v1.0/
Counter_Performance_Dashboard_v1.1/
```

更新时不要把真实 Excel 放入发布包。字段映射可在 **Data Settings** 中导出为 JSON，再导入新版本。

## 常见问题

### Missing required field

打开 **Data Settings**，将提示的业务字段映射到 Excel 的真实列名。参见 `FIELD_MAPPING_GUIDE.md`。

### 图表显示 0 或空白

检查对应 Excel 单元格是否为数值。公式单元格必须在 Excel 中完成重算并保存，使文件包含缓存结果。

### 提示 Duplicate Store × Period

同一家 Store ID 在同一个 Review Period 中存在多行。请先在公司 Excel 内确认是否需要汇总、去重或更正粒度，再重新上传。

### Comparison 显示 N/A

当前期间没有上一年度相同 Review Period。可以选择其他期间，或将 Comparison 改为 **vs Previous Review**。

### 字段映射无法自动保存

部分浏览器对 `file://` 页面的 `localStorage` 策略不同。使用 **Export Mapping** 保存映射 JSON；下次用 **Import Mapping** 恢复。

### 页面提示本地库缺失

不要单独移动 `index.html`。必须保留整个文件夹结构。

## 公司部署建议

- 由 IT/信息安全团队审核本文件夹及第三方库哈希。
- 放置在只读受控目录或内部软件分发位置。
- 使用公司批准、无未知扩展的浏览器配置。
- 禁止把真实工作簿加入源码仓库、邮件附件、云盘同步或外部工单。
- 如公司策略要求，可通过浏览器企业策略进一步禁用扩展、网络访问和开发者工具。
