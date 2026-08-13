# Data Requirements

## 支持的文件

- `.xlsx`
- `.xls`
- `.csv`

建议使用 `.xlsx`，并在上传前用公司 Excel 打开、重算和保存。

## 必要字段

Dashboard 至少需要以下业务含义。列名可以不同，并可在 Data Settings 中映射。

| Dashboard field | 用途 | 示例列名 |
|---|---|---|
| Year | 动态生成年份选择器 | `Year`, `Fiscal Year` |
| Review Period | 识别 S1 / S2 等复盘期间 | `Review Period`, `Semester` |
| Store ID / Terminal | 跨期间匹配同一家门店 | `Store ID`, `Terminal` |
| Store | 门店名称、点位标签、行识别 | `Store`, `门店名称` |
| POS Count | POS 合计、单产分母 | `POS no.`, `POS Count` |
| Net Sales | KPI、四象限、Bubble 和同比 | `CA NET`, `CONSO NET SALES`, `Net Sales` |
| Gross Margin | 毛利金额及毛利率推导 | `Gross Margin`, `GROSS MARGIN`, `GM` |
| Customer Contribution | 贡献金额及贡献率推导 | `Customer Contribution`, `CUSTOMER CONTRIBUTION`, `CC` |
| Operating Profit | OP KPI、Bridge 和单店分析 | `Operating Profit`, `OP PROFIT after FX excl PS` |

`Period Key` 是可选字段；缺失时使用：

```text
Year + Review Period
```

## 推荐字段

| Dashboard field | 说明 |
|---|---|
| City / Region | 地理筛选 |
| Channel / Store Type | 门店组合筛选 |
| Status | 营业状态筛选 |
| Productivity Tier | 门店单产等级筛选 |
| Customer Transactions | Bubble Y 轴；仅在缺失时回退到 POS |
| Net Sales / POS | 单产参考（Tooltip / 详情）；缺失时使用 `Net Sales ÷ POS Count` |
| Gross Margin % | 缺失时使用 `Gross Margin ÷ Net Sales` |
| Customer Contribution % | 缺失时使用 `Customer Contribution ÷ Net Sales` |
| Operating Margin % | 缺失时使用 `Operating Profit ÷ Net Sales` |

## A&P 字段

推荐映射：

- Customer Samples
- Promotional Gifts
- Animations
- POS Advertising Amortization
- Other POS Advertising
- POS Advertising
- Specific Development
- DA Cost
- Specific A&P
- Specific SG&A
- Non-specific Costs

A&P 图将费用绝对值用于展示，不修改源 Excel 符号。费用桥使用：

```text
LY Total A&P + 各费用科目变化 = Current Total A&P
```

## Excel 结构规则

- 列顺序可以变化；Dashboard 不依赖固定列号。
- Sheet 名称可以变化；Dashboard 会扫描工作簿并选择最匹配的表。
- 表头可位于前 50 行内；也可以在 Data Settings 手工指定 Header row。
- 空行会忽略。
- Store 为空的行会忽略。
- Store 以 `Total`、`Grand Total`、`Subtotal`、`合计`、`总计` 或 `小计` 开头的行会排除。
- 新增无关列不会影响读取。
- 删除必要字段会触发清晰的 Missing required field 提示。
- 重复的 `Store ID × Period Key` 会停止加载。
- 建议每个 Review Period 覆盖相同的 Store ID；新增店或缺失比较期的门店会标记为 New Store / Missing Current。

## 数字与百分比

- 金额应为真正数值，不要使用带货币符号的不可解析文本；常见 `¥`、逗号和括号负数可以识别。
- 百分比可为 Excel 数值 `0.426`，也可为 `42.6%` 文本。
- 如果百分比列中输入 `42.6`，Dashboard 会按 `42.6%` 归一化。
- 费用可以是负数；仅在瀑布图中显示为正的 expense amount。
- KPI 百分比不平均门店百分比，而是使用汇总金额重新计算：`Σ numerator ÷ Σ Net Sales`。

## P&L 关系

Dashboard 会检查以下关系，允许极小的四舍五入误差：

```text
Gross Sales + Minorations = Net Sales
Net Sales + Cost of Sales = Gross Margin
Gross Margin + DA Cost + Specific A&P + Specific SG&A = Customer Contribution
Customer Contribution + Non-specific Costs = Operating Profit
```

## 公式单元格

SheetJS 会读取 Excel 文件中保存的公式缓存值，但不会在浏览器里执行完整的 Excel 计算引擎。上传前应：

1. 在 Excel 中打开文件；
2. 执行重算；
3. 保存并关闭；
4. 再上传到 Dashboard。

如果公式没有缓存结果，Dashboard 会显示警告。
