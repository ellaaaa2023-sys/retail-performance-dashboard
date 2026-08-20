'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');
const StoreDetail = require('../js/store-detail.js');

const workbookPath = path.resolve(__dirname, '../sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx');
const bytes = fs.readFileSync(workbookPath);

function parseModel() {
  const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true });
  return DataLayer.parseWorkbook(workbook, { XLSX, fileName: path.basename(workbookPath) });
}

const model = parseModel();
const service = DataLayer.createDataService(model);
let passed = 0;

function check(label, test) {
  test();
  passed += 1;
  console.log(`${passed}. PASS - ${label}`);
}

function close(actual, expected, label, tolerance = 1e-12) {
  assert.equal(Number.isFinite(actual), true, `${label}: ${actual} is not finite`);
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${label}: expected ${expected}, received ${actual}`);
}

const ACTIVE_STORE_PNL_FIELDS = [
  'grossSales', 'discount', 'rebates', 'promotionalAllowance', 'totalReturns',
  'vipRedemption', 'oca', 'coupon', 'totalMinorations', 'netSales', 'stdCos',
  'royalTaMs', 'physicalDistribution', 'specialOperationsCost',
  'obsoleteSlowMovingReturns', 'grossMargin', 'tradeRelation', 'customerSamples',
  'promotionalGifts', 'posAdvertisingAmortization', 'posAdvertisingExpense',
  'merchandising', 'animations', 'tester', 'daCost', 'specificDevelopment',
  'otherAP', 'specificAP', 'specificSga', 'customerContribution',
  'nonSpecificCosts', 'operatingProfit'
];

check('Workbook percentage-point values always convert to decimal ratios', () => {
  const cases = [
    [71.4, 0.714], [1.6, 0.016], [1.5, 0.015], [1.0, 0.010], [0.2, 0.002],
    [0, 0], [-0.2, -0.002], [-1.0, -0.010], [-1.5, -0.015], [-1.6, -0.016]
  ];
  cases.forEach(([source, expected]) => close(
    DataLayer.parseWorkbookPercentagePoint(source),
    expected,
    `percentage point ${source}`
  ));
});

check('Summary source percentages preserve small positive and negative percentage points', () => {
  close(model.summary.byKey.grossMargin.current.actualAdjusted.pct, 0.714, '71.4 percentage points');
  close(model.summary.byKey.totalReturns.current.actualAdjusted.pct, -0.015, '-1.5 percentage points');
  close(model.summary.byKey.obsoleteSlowMovingReturns.current.actualAdjusted.pct, -0.002, '-0.2 percentage points');
});

check('No magnitude-based percentage heuristic remains in active runtime code', () => {
  const coreSource = fs.readFileSync(path.resolve(__dirname, '../js/data/core-data.js'), 'utf8');
  const appSource = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  assert.equal(/Math\.abs\([^\n]*>\s*1\.5/.test(`${coreSource}\n${appSource}`), false);
});

check('Every active Store P&L line has one registered denominator', () => {
  ACTIVE_STORE_PNL_FIELDS.forEach(field => {
    assert.ok(['grossSales', 'netSales'].includes(DataLayer.getPnlDenominatorKey(field)), field);
  });
  assert.equal(Object.keys(DataLayer.constants.pnlDenominatorRegistry).length >= ACTIVE_STORE_PNL_FIELDS.length, true);
});

check('Gross Sales denominator group is explicit', () => {
  [
    'grossSales', 'discount', 'rebates', 'promotionalAllowance', 'totalReturns',
    'vipRedemption', 'oca', 'coupon', 'totalMinorations'
  ].forEach(field => assert.equal(DataLayer.getPnlDenominatorKey(field), 'grossSales', field));
});

check('CONSO Net Sales denominator group starts at Net Sales', () => {
  [
    'netSales', 'stdCos', 'royalTaMs', 'physicalDistribution',
    'specialOperationsCost', 'obsoleteSlowMovingReturns', 'grossMargin',
    'tradeRelation', 'customerSamples', 'promotionalGifts',
    'posAdvertisingAmortization', 'posAdvertisingExpense', 'merchandising',
    'animations', 'tester', 'daCost', 'specificDevelopment', 'otherAP',
    'specificAP', 'specificSga', 'customerContribution', 'nonSpecificCosts',
    'operatingProfit'
  ].forEach(field => assert.equal(DataLayer.getPnlDenominatorKey(field), 'netSales', field));
});

check('Page 01 canonical KPIs calculate ratios from amounts and the registry', () => {
  const totals = service.getPortfolioMetrics({});
  close(totals.current.totalMinorationsPct, totals.current.totalMinorations / totals.current.grossSales, 'Total Minorations %');
  close(totals.current.grossMarginPct, totals.current.grossMargin / totals.current.netSales, 'Gross Margin %');
  close(totals.current.customerContributionPct, totals.current.customerContribution / totals.current.netSales, 'CC %');
  close(totals.current.netSalesPct, totals.current.netSales / totals.current.grossSales, 'CA Net % of GS');
});

check('Page 02 and Page 04 consumers call the shared line-ratio contract', () => {
  const appSource = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  assert.match(appSource, /calculateLineRatio\(row\.key, current, metrics\.current\)/);
  assert.match(appSource, /buildPnlRatioModel\([\s\S]*line\.field[\s\S]*window\.RetailDashboardData/);
  const detailSource = fs.readFileSync(path.resolve(__dirname, '../js/store-detail.js'), 'utf8');
  assert.match(detailSource, /finance\.calculateLineRatio/);
});

check('Summary level reconciliation preserves reported subtotals and records source rounding', () => {
  const reconciliation = model.summary.reconciliation;
  ['netSales', 'grossMargin', 'specificAP', 'customerContribution', 'operatingProfit']
    .forEach(field => assert.equal(reconciliation[field].current.ok && reconciliation[field].comparison.ok, true, field));
  assert.equal(reconciliation.grossMargin.current.reported, 41804);
  assert.equal(reconciliation.grossMargin.current.derived, 41805);
  assert.equal(reconciliation.grossMargin.current.residual, 1);
  assert.equal(reconciliation.grossMargin.comparison.residual, 1);
  assert.equal(reconciliation.grossMargin.current.tolerance, 1);
});

check('Summary movement reconciliation is independent from equal level residuals', () => {
  Object.entries(model.summary.reconciliation).forEach(([field, reconciliation]) => {
    assert.equal(reconciliation.movement.ok, true, field);
  });
  assert.equal(model.summary.reconciliation.grossMargin.movement.residual, 0);
});

check('Customer Contribution amount Bridge reconciles at both levels and movement', () => {
  const bridge = service.getBridgeData('customerContribution', {});
  assert.equal(bridge.amount.comparison, 16702);
  assert.equal(bridge.amount.current, 17221);
  assert.equal(bridge.amount.reconciliation.current.residual, 0);
  assert.equal(bridge.amount.reconciliation.comparison.residual, 0);
  assert.equal(bridge.amount.reconciliation.movement.reported, 519);
  assert.equal(bridge.amount.reconciliation.movement.derived, 519);
  assert.equal(bridge.amount.reconciliation.ok, true);
  assert.equal(bridge.driverGranularity, 'summary-non-overlapping-detail');
});

check('Customer Contribution ratio Bridge uses canonical amounts and reconciles', () => {
  const bridge = service.getBridgeData('customerContribution', {});
  close(bridge.ratio.comparison, 16702 / 55894, 'Comparison CC%');
  close(bridge.ratio.current, 17221 / 58510, 'Current CC%');
  close(bridge.ratio.movement, bridge.ratio.current - bridge.ratio.comparison, 'CC% movement');
  close(
    bridge.ratio.drivers.reduce((sum, driver) => sum + driver.movement, 0),
    bridge.ratio.movement,
    'CC% driver movement sum'
  );
  assert.equal(bridge.ratio.reconciliation.ok, true);
  assert.equal(bridge.ratio.error, null);
});

check('CC ratio identity holds for Current, Comparison, and movement', () => {
  ['current', 'comparison'].forEach(role => {
    const amounts = model.summary.periods[role].canonicalAmounts;
    const denominator = amounts.netSales;
    close(
      amounts.customerContribution / denominator,
      (amounts.grossMargin + amounts.specificAP + amounts.specificSga) / denominator,
      `${role} CC identity`
    );
  });
  const current = model.summary.periods.current.canonicalAmounts;
  const comparison = model.summary.periods.comparison.canonicalAmounts;
  const movement = field => current[field] / current.netSales - comparison[field] / comparison.netSales;
  close(movement('customerContribution'), movement('grossMargin') + movement('specificAP') + movement('specificSga'), 'CC ratio movement identity');
});

check('Filtered amount and ratio gates apply centralized tolerances without residual drivers', () => {
  assert.equal(DataLayer.constants.amountReconciliationToleranceKrmb, 1);
  assert.equal(DataLayer.constants.ratioReconciliationTolerance, 0.0001);
  const reconciled = service.getBridgeData('customerContribution', { region: '东北' });
  assert.equal(reconciled.amount.reconciliation.ok, true);
  assert.equal(reconciled.ratio.reconciliation.ok, true);
  const blocked = service.getBridgeData('customerContribution', { region: '华北' });
  assert.equal(blocked.amount.reconciliation.ok, false);
  assert.equal(blocked.ratio.reconciliation.ok, false);
  assert.equal(blocked.error.code, 'BRIDGE_RECONCILIATION_ERROR');
  assert.equal(blocked.drivers.some(driver => /other|rounding|residual/i.test(driver.label)), false);
});

check('Amount and ratio gates remain independent for whole-KRMB rounding', () => {
  const bridge = service.getBridgeData('customerContribution', { region: '西南' });
  assert.equal(bridge.amount.reconciliation.ok, true);
  assert.equal(bridge.ratio.reconciliation.ok, false);
  assert.equal(bridge.amount.error, null);
  assert.equal(bridge.ratio.error.code, 'BRIDGE_RECONCILIATION_ERROR');
});

check('Missing required Summary driver never becomes zero', () => {
  const missingModel = structuredClone(model);
  missingModel.summary.byKey.specificSga.current.actualAdjusted.value = null;
  missingModel.summary.byKey.specificSga.current.actual.value = null;
  const bridge = DataLayer.createDataService(missingModel).getBridgeData('customerContribution', {});
  const driver = bridge.drivers.find(item => item.field === 'specificSga');
  assert.equal(driver.current, null);
  assert.equal(driver.currentRatio, null);
  assert.equal(bridge.error.code, 'BRIDGE_DATA_UNAVAILABLE');
  assert.equal(bridge.reconciliation.current.missing.includes('specificSga'), true);
});

check('Missing required Summary financial value blocks workbook parsing', () => {
  const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true });
  const sheet = workbook.Sheets[model.metadata.sheets.summary];
  const line = model.summary.byKey.specificSga;
  ['actual', 'actualAdjusted'].forEach(scope => {
    const column = model.summary.columns.current[scope].valueColumn;
    delete sheet[XLSX.utils.encode_cell({ r: line.sourceRow - 1, c: column })];
  });
  assert.throws(
    () => DataLayer.parseWorkbook(workbook, { XLSX }),
    /required financial values are missing or non-finite: current\.specificSga/
  );
});

check('Actual zero is a valid financial driver', () => {
  const bridge = service.getBridgeData('totalMinorations', {});
  const zeroDriver = bridge.drivers.find(driver => driver.field === 'totalActiveSupport');
  assert.equal(zeroDriver.current, 0);
  assert.equal(zeroDriver.comparison, 0);
  assert.equal(zeroDriver.currentRatio, 0);
  assert.equal(bridge.error, null);
});

check('Page 04 denominator examples match the business contract', () => {
  const current = model.detail.current.stores[0];
  const comparison = model.detail.comparison.stores[0];
  const ratio = field => StoreDetail.buildPnlRatioModel(
    field,
    current.pnl[field],
    current.pnl,
    comparison.pnl[field],
    comparison.pnl,
    DataLayer
  );
  close(ratio('grossSales').currentRatio, 1, 'Gross Sales = 100%');
  close(ratio('totalMinorations').currentRatio, current.pnl.totalMinorations / current.pnl.grossSales, 'Total Minorations / Gross Sales');
  close(ratio('netSales').currentRatio, 1, 'CONSO Net Sales = 100%');
  close(ratio('grossMargin').currentRatio, current.pnl.grossMargin / current.pnl.netSales, 'GM / Net Sales');
  close(ratio('customerContribution').currentRatio, current.pnl.customerContribution / current.pnl.netSales, 'CC / Net Sales');
});

check('Detail reconciliation metadata records residuals without changing reported subtotals', () => {
  const store = model.detail.current.stores.find(item => (
    item.reconciliation.specificAP.status === 'outOfTolerance'
  ));
  assert.ok(store);
  assert.equal(store.reconciliation.specificAP.reported, store.pnl.specificAP);
  assert.notEqual(store.reconciliation.specificAP.derived, store.pnl.specificAP);
  assert.equal(Math.abs(store.reconciliation.specificAP.residual) > 1, true);
});

check('Public labels use bilingual % OF SALES terminology', () => {
  const i18nSource = fs.readFileSync(path.resolve(__dirname, '../js/i18n.js'), 'utf8');
  const indexSource = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  assert.match(i18nSource, /'common\.salesPct': '% OF SALES'/);
  assert.match(i18nSource, /'common\.salesPct': '占销售额比例'/);
  assert.equal(indexSource.includes('common.netSalesPct'), false);
  assert.equal(indexSource.includes('% of Net Sales'), false);
});

console.log(`\n${passed}/${passed} Finance Contract validation checks passed.`);
