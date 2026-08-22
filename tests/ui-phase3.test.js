'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');
const StoreDetail = require('../js/store-detail.js');
const I18n = require('../js/i18n.js');
const SourceLifecycle = require('../js/data/source-lifecycle.js');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18nSource = fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
const workbook = XLSX.read(fs.readFileSync(path.join(root, 'sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx')), {
  type: 'buffer', cellDates: true
});
const model = DataLayer.parseWorkbook(workbook, { XLSX });
const service = DataLayer.createDataService(model);

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`${passed}. PASS - ${name}`);
}

check('Page 01 primary KPI contract replaces POS no. with DA HC', () => {
  const block = appSource.match(/const OVERVIEW_KPIS_PRIMARY = \[([\s\S]*?)\];/)[1];
  assert.match(block, /key: 'daHeadcount'/);
  assert.doesNotMatch(block, /key: 'posNo'/);
});

check('Page 01 consumes getDAHeadcountSummary rather than summing stores', () => {
  assert.match(appSource, /state\.service\.getDAHeadcountSummary\(filters\)/);
});

check('Page 01 total DA HC exposes authoritative Current and Comparison values', () => {
  const result = service.getDAHeadcountSummary({});
  assert.equal(result.current.total, 468);
  assert.equal(result.comparison.total, 447);
  assert.equal(result.current.total - result.comparison.total, 21);
});

check('Page 01 DA HC responds to a filtered Detail scope', () => {
  const region = model.detail.current.stores[0].region;
  const result = service.getDAHeadcountSummary({ region });
  assert.equal(result.mode, 'filtered');
  assert.equal(result.current.total, service.getStores('current', { region }).reduce((sum, store) => sum + store.daHeadcount, 0));
});

check('Page 01 renders missing DA HC as unavailable rather than zero', () => {
  assert.match(appSource, /def\.key === 'daHeadcount' \? t\('common\.unavailable'\)/);
});

check('DA HC Public labels are bilingual and Internal label remains English', () => {
  assert.equal(I18n.translations.en['metric.daHeadcount'], 'DA HC');
  assert.equal(I18n.translations.zh['metric.daHeadcount'], '销售人员人数');
  assert.equal(I18n.translations.en['metric.daHeadcountDescription'], 'Sales staff headcount');
});

check('Public language switch is created only inside the sidebar utility area', () => {
  const block = i18nSource.match(/function renderLanguageSwitch\(\) \{([\s\S]*?)\n  \}/)[1];
  assert.match(block, /querySelector\('\.brand-rail'\)/);
  assert.match(block, /utilityArea\.className = 'rail-utility-area'/);
  assert.match(block, /utilityArea\.appendChild\(control\)/);
  assert.doesNotMatch(block, /topbar-tools/);
  assert.match(stylesSource, /\.rail-utility-area \{ margin-top: auto;/);
  assert.match(stylesSource, /\.title \{ min-width: 0; flex: 0 1 auto;/);
  assert.match(stylesSource, /\.topbar-tools \{ width: 100%; flex: 0 1 auto;/);
});

check('Page 02 Bridge toggle defaults to Amount', () => {
  assert.match(indexSource, /id="bridgeModeToggle"[\s\S]*?class="active" data-value="amount"/);
  assert.match(appSource, /bridgeMode: 'amount'/);
});

check('Page 02 ratio view consumes the Data Service ratio result', () => {
  assert.match(appSource, /const source = bridge\[mode\]/);
  assert.match(appSource, /mode === 'ratio' \? driver\.movement : driver\.variance/);
});

check('Page 02 formats ratio drivers as percentage points', () => {
  assert.match(appSource, /formatPercentagePoints/);
  assert.match(appSource, /compact \? 'pp' : t\('common\.percentagePoints'\)/);
});

check('Amount and ratio Bridge gates remain independent', () => {
  const bridge = service.getBridgeData('customerContribution', { region: '西南' });
  assert.equal(bridge.amount.error, null);
  assert.equal(bridge.ratio.error.code, 'BRIDGE_RECONCILIATION_ERROR');
  assert.match(appSource, /error: source\.error/);
});

check('Filtered rounding message is concise and bilingual', () => {
  assert.equal(I18n.translations.en['error.filteredBridgeRoundingDetail'], 'Bridge unavailable for this selection due to source rounding reconciliation.');
  assert.equal(I18n.translations.zh['error.filteredBridgeRoundingDetail'], '当前筛选范围因源数据舍入无法完成勾稽，暂不展示桥接分析。');
});

check('Bridge toggle changes only the mode and rerenders Page 02', () => {
  const handler = appSource.match(/\$\('bridgeModeToggle'\)\.addEventListener\('click',([\s\S]*?)\);\n/)[0];
  assert.match(handler, /state\.bridgeMode=/);
  assert.match(handler, /renderVariance\(\)/);
  assert.doesNotMatch(handler, /filters|sourceType|activateDataSource/);
});

check('Page 02 and Page 04 retain % OF SALES without legacy headings', () => {
  assert.match(indexSource, /data-i18n="common\.salesPct">% OF SALES</);
  assert.equal(/% of Net Sales|% OF NET SALES/i.test(indexSource), false);
});

check('Page 04 metadata renders Current and LY DA HC', () => {
  assert.match(appSource, /label: t\('metric\.daHeadcount'\)/);
  assert.match(appSource, /comparison\.daHeadcount/);
});

check('Page 04 Store P&L starts with an operational DA HC row', () => {
  assert.equal(StoreDetail.STORE_PNL_LINE_DEFINITIONS[0].key, 'daHeadcount');
  assert.equal(StoreDetail.STORE_PNL_LINE_DEFINITIONS[0].type, 'headcount');
  assert.match(appSource, /buildStorePnlRows\(current, ly, window\.RetailDashboardData\)/);
  assert.match(appSource, /line\.type === 'headcount'/);
});

check('Store P&L semantic classes preserve the confirmed subtotal hierarchy', () => {
  const definitions = StoreDetail.STORE_PNL_LINE_DEFINITIONS;
  assert.equal(definitions.find(line => line.key === 'specificAP').className, 'subtotal');
  assert.equal(definitions.find(line => line.key === 'specificSga').className, 'subtotal');
  assert.equal(definitions.find(line => line.key === 'totalSpecificCosts').className, 'group');
  assert.equal(definitions.find(line => line.key === 'daCost').className, 'subdetail');
  assert.equal(definitions.find(line => line.key === 'nonDaCost').className, 'subdetail');
});

check('Store P&L DA HC shows Current and LY counts, blank ratios, and absolute movement', () => {
  const current = model.detail.current.stores.find(store => Number.isFinite(store.daHeadcount));
  const comparison = model.detail.comparison.stores.find(store => store.terminal === current.terminal);
  assert.equal(Number.isFinite(comparison.daHeadcount), true);
  assert.equal(current.daHeadcount - comparison.daHeadcount, current.pnl.daHeadcount - comparison.pnl.daHeadcount);
  assert.match(appSource, /<td>—<\/td><td>\$\{hasLy \? formatInt\(lv\) : '—'\}<\/td><td>—<\/td>/);
  assert.match(appSource, /formatSignedNumber\(movement\)/);
});

check('New Store DA HC keeps Comparison and movement unavailable', () => {
  const newStore = model.storeMatches.new[0].current;
  assert.equal(Number.isFinite(newStore.pnl.daHeadcount), true);
  const row = StoreDetail.buildStorePnlRows(newStore, null, DataLayer).find(item => item.key === 'daHeadcount');
  assert.equal(row.comparisonAmount, null);
  assert.equal(row.amountVariance, null);
});

check('Data source activation initializes Store Detail without visiting another page', () => {
  const state = {};
  SourceLifecycle.activate(state, { sourceType: 'demo', model, service });
  assert.equal(state.selectedStore, model.metadata.defaultStoreTerminal || model.detail.current.stores[0].terminal);
  assert.equal(service.getStores('current', {}).some(store => store.terminal === state.selectedStore), true);
  assert.match(appSource, /function renderDetail\(\) \{\s*ensureSelectedStore\(\)/);
});

check('Page 04 A&P Movement Bridge is absent from active UI and renderer', () => {
  assert.equal(indexSource.includes('apMovementChart'), false);
  assert.equal(appSource.includes("chart('apMovementChart')"), false);
  assert.equal(appSource.includes("featureUnavailable('apMovementChart'"), false);
});

check('Page 04 Total A&P uses formal Specific A&P spend magnitude', () => {
  const current = model.detail.current.stores[0];
  const comparison = model.detail.comparison.stores.find(store => store.terminal === current.terminal);
  const total = StoreDetail.buildApExpenseModel(current, comparison);
  assert.equal(total.currentSpend, Math.abs(current.pnl.specificAP));
  assert.equal(total.comparisonSpend, Math.abs(comparison.pnl.specificAP));
  assert.match(indexSource, /id="apTotalSummary"/);
  assert.match(appSource, /dataset\.formalTotal = 'specificAP'/);
});

check('Page 04 A&P spend variance direction uses Current minus Comparison magnitude', () => {
  const increase = StoreDetail.buildApExpenseModel({ pnl: { specificAP: -320 } }, { pnl: { specificAP: -280 } });
  const decrease = StoreDetail.buildApExpenseModel({ pnl: { specificAP: -240 } }, { pnl: { specificAP: -280 } });
  assert.equal(increase.movement, 40);
  assert.equal(decrease.movement, -40);
});

check('Page 04 component comparison chart remains active and separate from formal total', () => {
  assert.match(indexSource, /id="apComparisonChart"/);
  assert.match(appSource, /buildApComponentModel\(current, ly\)/);
  assert.match(appSource, /dataset\.canonicalCurrentSpend/);
  assert.match(appSource, /dataset\.componentMapping = 'store-pnl-specificAP'/);
  assert.match(appSource, /dataset\.reconciliation = JSON\.stringify\(componentModel\.reconciliation\)/);
  assert.match(appSource, /pnlLabel\(component\.key,component\.label\)/);
  assert.match(appSource, /detail\.structuralPlaceholder/);
  assert.deepEqual(
    StoreDetail.AP_COMPONENT_DEFINITIONS.map(definition => definition.key),
    StoreDetail.STORE_PNL_HIERARCHIES.specificAP
  );
});

check('Page 04 Total A&P labels are bilingual', () => {
  assert.equal(I18n.translations.en['detail.totalAP'], 'Total A&P');
  assert.equal(I18n.translations.zh['detail.totalAP'], '广告及促销总额');
  assert.equal(I18n.translations.zh['detail.currentTotalAP'], '本期广告及促销总额');
});

check('New Store keeps A&P comparison and movement unavailable', () => {
  const newStore = model.storeMatches.new[0].current;
  const total = StoreDetail.buildApExpenseModel(newStore, null);
  assert.equal(total.hasComparison, false);
  assert.equal(total.comparisonSpend, null);
  assert.equal(total.movement, null);
});

console.log(`\n${passed}/${passed} Phase 3 UI contract checks passed.`);
