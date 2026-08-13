# Field Mapping Guide

## 自动映射

Dashboard 会规范化列名的大小写、空格和常见标点，并识别常见别名。例如：

```text
Gross Margin
GROSS MARGIN
Gross margin
GM
```

列顺序改变不会影响映射。

## 第一次适配真实 Excel

1. 点击 **Upload Data** 并选择公司内部 Excel。
2. 如果出现 Missing required field，点击 **Data Settings**。
3. 确认 Worksheet 和 Header row。
4. 使用下拉菜单映射必要字段。
5. 点击 **Apply & Load Data**。
6. 确认页面提示的 Records、Stores、Review Periods 数量正确。
7. 确认 KPI、OP Bridge、四象限中位数、Store P&L 和 A&P Reconciled 状态合理。
8. 点击 **Save Mapping**，仅把字段名和对应关系保存到当前浏览器。

## localStorage 保存什么

保存内容类似：

```json
{
  "year": "Fiscal Year",
  "reviewPeriod": "Semester",
  "terminal": "Counter ID",
  "store": "Counter Name",
  "pos": "POS Qty",
  "netSales": "CA NET ACT",
  "grossMargin": "GM Value",
  "contribution": "CC Amount",
  "operatingProfit": "OP after FX"
}
```

不会保存：

- Excel 文件路径
- 门店名称行数据
- 销售额、利润或费用
- Tooltip 内容
- 图表数据

配置按“列名集合”形成的结构签名保存。因此列顺序变化仍可复用；列名变化后会要求重新确认。

## 映射导入与导出

由于不同浏览器对本地 `file://` 页面的 localStorage 支持可能不同，推荐同时使用：

- **Export Mapping**：下载一个只包含字段配置的 JSON。
- **Import Mapping**：在另一台受控电脑或新版 Dashboard 中恢复配置。

示例位于 `config/default-mapping.json`。不要在映射 JSON 中加入真实行数据。

## 字段变化时怎么处理

### 列名变化

重新打开 Data Settings，把业务字段指向新列名并保存。

### 列顺序变化

无需处理。Dashboard 按表头名称识别。

### 新增列

无需处理，除非希望把它用于现有业务字段。

### 删除可选列

对应功能会使用派生逻辑或显示 `—`。

### 删除必要列

Dashboard 会停止加载并显示缺失字段，不会产生半成品图表。

### 增加 2027 S1 / 2027 S2

无需修改 JavaScript。只要 `Year`、`Review Period`、`Store ID` 和 P&L 字段继续遵守相同含义，新期间会自动出现在选择器和 Review Timeline 中。

### Review Period 命名变化

建议同一套数据使用一致标签，例如始终使用 `S1` / `S2`。如果改为 `H1` / `H2`，同比匹配会按照新标签进行，旧标签和新标签不会被视为同一个期间。

### 重复 Store ID × Period

Dashboard 会停止加载。请不要简单删除提示；应先在公司内部确认重复行是数据错误，还是需要在 Excel 中按门店期间汇总。

### Sheet 名称或表头行变化

在 Data Settings 选择 Worksheet 并输入正确 Header row。

## 不暴露真实数据的 Debug 方法

可以向外部开发人员或 AI 提供：

- Dashboard 版本号；
- 浏览器名称和版本；
- 完整错误文字；
- 工作表数量；
- 表头所在行号；
- 经审批后提供的“匿名化字段名清单”；
- 字段的数据类型，例如 `number / percentage / text`；
- 复现步骤；
- 使用模拟值重新制作的最小 Excel。

不要提供：

- 真实 Excel；
- 截图中的真实门店、金额或利润；
- 浏览器控制台里可能包含业务值的对象；
- 真实文件路径、账号、链接或内部系统名称。

最佳做法是在公司内用完全虚构的 3–5 行数据复现问题，再把该最小样本用于外部 Debug。
