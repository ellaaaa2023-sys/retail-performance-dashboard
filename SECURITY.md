# Security and Privacy Notes

## 目标

真实门店 P&L 只存在于公司电脑的本地 Excel 和当前浏览器页面内存中。

## 已实施控制

- 无 CDN、外部 API、Analytics、Telemetry、网络字体或远程图片。
- 第三方 JavaScript 固定保存在 `libs/`。
- Content Security Policy 设置 `connect-src 'none'`，阻止网页发起网络连接。
- 使用 `referrer=no-referrer`。
- 不使用 `fetch`、XHR、WebSocket 或 Service Worker。
- 不记录业务数据到 Console。
- 不把 Excel 行数据写入 localStorage、sessionStorage、IndexedDB 或 Cookie。
- 关闭页面或点击 Clear Data 后，Workbook Object、原始工作表矩阵、转换记录、图表与明细 DOM 均会被清空，不再由 Dashboard 保留。
- 不使用 ES Modules、本地 `fetch()`、Service Worker、IndexedDB 或 Cache Storage，支持直接 `file://` 打开。

## 仍需由公司控制的风险

- 浏览器扩展可能读取页面或本地文件内容，应使用公司批准的受管浏览器配置。
- 浏览器、操作系统、EDR 或崩溃报告工具的行为由公司策略决定，不受此项目代码控制。
- 部分公司浏览器策略可能禁止本地 JavaScript、`file://` 文件访问或未签名静态应用；需要 IT 审核或白名单，不应通过降低安全策略绕过。
- 用户可能通过截图、复制粘贴、下载、邮件或云同步人为泄露数据。
- 本地 HTML 和 JavaScript 若被篡改，可能加入网络发送逻辑。应部署到受控只读目录并校验哈希。
- 打开开发者工具可能在排错时看到数据对象；不要复制包含真实值的日志或截图到外部。
- localStorage 中的列名和映射属于结构元数据；如果公司把列名也视为敏感信息，请只使用 Export Mapping 保存在受控目录，或每次手工映射。

## 审核建议

1. IT/信息安全审核源码和 `libs/`。
2. 记录发布版本与 SHA-256。
3. 通过公司软件分发或受控共享盘发布只读副本。
4. 禁止将真实 Excel 放入 Dashboard 文件夹或源码仓库。
5. 每次更新重新运行网络依赖扫描和离线测试。
