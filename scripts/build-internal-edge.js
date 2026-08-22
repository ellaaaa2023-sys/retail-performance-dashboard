'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'internal-edge');
const runtimeFiles = [
  'assets/favicon.svg',
  'assets/styles.css',
  'js/startup-guard.js',
  'js/browser-compat.js',
  'js/i18n.js',
  'js/app.js',
  'js/store-portfolio.js',
  'js/store-detail.js',
  'js/data/detail-schema.js',
  'js/data/data-cleaning.js',
  'js/data/core-data.js',
  'js/data/data-preparation-ui.js',
  'js/data/source-lifecycle.js',
  'libs/xlsx.full.min.js',
  'libs/echarts.min.js',
  'diagnostics/diagnostics.css',
  'diagnostics/local-probe.js',
  'diagnostics/edge-offline-check.html',
  'diagnostics/edge-offline-check.js',
  'diagnostics/minimal-dashboard-check.html',
  'diagnostics/minimal-dashboard-check.js'
];

function resetOutput() {
  if (!fs.existsSync(output)) return;
  const result = childProcess.spawnSync('/usr/bin/trash', [output], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('Existing internal-edge package could not be moved to Trash. Stop and review it manually.');
  }
}

function copy(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function internalIndex() {
  return fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace('  <script defer src="./js/data/demo-data.js"></script>\n', '')
    .replace('  <script defer src="./js/i18n.js"></script>\n', '  <script defer src="./js/data/internal-mode.js"></script>\n  <script defer src="./js/i18n.js"></script>\n')
    .replace('<strong id="sourceLabel">Demo Data</strong><small id="sourceDetail">Synthetic dataset</small>', '<strong id="sourceLabel">Internal Offline</strong><small id="sourceDetail">Upload Workbook</small>')
    .replace('Clear Uploaded Data', 'Clear Data')
    .replace('<strong data-i18n="notice.loadingDemo">Loading demo data…</strong><span data-i18n="notice.loadingDemoDetail">The bundled synthetic dataset will be ready automatically.</span>', '<strong>Ready for local workbook</strong><span>Select an approved Excel workbook. Data is processed in this browser session.</span>');
}

const readme = `Retail Performance Dashboard — Internal Microsoft Edge Test

Target environment
Windows 10 / 11; current company-managed Microsoft Edge; double-click index.html; file://; no Node, Python, administrator rights, backend, or internet required by the application.

Step 1 — Environment check
Double-click diagnostics/edge-offline-check.html.
Record every PASS / FAIL / INFO result. Select only the approved safe Mock Workbook when testing file selection.

Step 2 — Minimal reproduction
If any local library or chart check fails, double-click diagnostics/minimal-dashboard-check.html.
If Minimal also fails, ask IT to review Edge local-content, file://, DLP, Defender, AppLocker, or WDAC policy.
If Minimal passes but the full Dashboard fails, report the Dashboard message and diagnostic results.

Step 3 — Full Dashboard
Double-click index.html. Confirm the Upload UI appears. Select the approved safe Mock Workbook and verify Data Preparation plus pages 01, 02, 03, and 04. Test Reset and Clear Data.

Step 4 — Offline repeat
Disconnect network access and repeat Steps 1–3. The application does not require a server connection.

Data handling
Workbook data is processed in the local browser session. Do not redistribute this package unless approved. Do not use external websites to troubleshoot company data.

Troubleshooting
- Keep the entire folder structure together; do not move index.html by itself.
- A Local JS, SheetJS, or ECharts FAIL usually means a missing file or a local-content policy restriction.
- A File API/FileReader FAIL requires IT review of browser or endpoint policy.
- Save Mapping is optional and may be blocked if localStorage is restricted for file:// pages.
- Final compatibility must be confirmed on the company-managed Windows/Edge endpoint.
`;

resetOutput();
runtimeFiles.forEach(copy);
fs.mkdirSync(path.join(output, 'js', 'data'), { recursive: true });
fs.writeFileSync(path.join(output, 'index.html'), internalIndex());
fs.writeFileSync(path.join(output, 'js', 'data', 'internal-mode.js'), "(function(root){'use strict';root.RetailDashboardRuntime=Object.freeze({mode:'internal-edge',languageMode:'en-only'});}(typeof globalThis!=='undefined'?globalThis:this));\n");
fs.writeFileSync(path.join(output, 'README_INTERNAL_EDGE.txt'), readme);

console.log(`Internal Edge package created: ${output}`);
