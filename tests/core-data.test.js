'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');

const workbookPath = path.resolve(__dirname, '../sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx');
const bytes = fs.readFileSync(workbookPath);
const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true });
const model = DataLayer.parseWorkbook(workbook, {
  XLSX,
  fileName: path.basename(workbookPath)
});
const service = DataLayer.createDataService(model);

const CORE_DETAIL_HEADERS = [
  'Terminal', 'Store', 'City', 'Region',
  'Gross Sales', 'CA NET', 'Gross Margin', 'Client Contribution'
];
const CORE_DETAIL_ROW = ['T-001', 'Store One', 'Shanghai', 'East', 1000, 800, 500, 200];

function freshWorkbook() {
  return XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true });
}

function detailWorksheet(optionalHeaders = [], optionalValues = []) {
  return XLSX.utils.aoa_to_sheet([
    CORE_DETAIL_HEADERS.concat(optionalHeaders),
    CORE_DETAIL_ROW.concat(optionalValues)
  ]);
}

function minimalWorkbook(options = {}) {
  const target = freshWorkbook();
  target.Sheets['LRP Counter Y26 S1'] = detailWorksheet(
    options.currentHeaders || [],
    options.currentValues || []
  );
  target.Sheets['LRP Counter Y25 S1'] = detailWorksheet(
    options.comparisonHeaders || options.currentHeaders || [],
    options.comparisonValues || options.currentValues || []
  );
  return target;
}

function appendSheet(target, name, sheet) {
  target.SheetNames.push(name);
  target.Sheets[name] = sheet;
}

function scanSheet(parsedModel, sheetName) {
  return parsedModel.metadata.workbookScan.sheets.find(sheet => sheet.sheetName === sheetName);
}

function headerColumn(worksheet, header) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
  return matrix[0].indexOf(header);
}

const results = [];
function check(number, label, test) {
  test();
  results.push(`${number}. PASS - ${label}`);
}

function assertClose(actual, expected, message, tolerance = 1e-12) {
  assert.equal(Number.isFinite(actual), true, `${message}: expected a finite value, received ${actual}`);
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${message}: expected ${expected}, received ${actual}`);
}

check(1, 'Summary Sheet correctly identified', () => {
  assert.equal(model.metadata.sheets.summary, 'P&L review Y26');
});

check(2, 'Current Detail correctly identified', () => {
  assert.equal(model.metadata.sheets.currentDetail, 'LRP Counter Y26 S1');
});

check(3, 'Comparison Detail correctly identified', () => {
  assert.equal(model.metadata.sheets.comparisonDetail, 'LRP Counter Y25 S1');
});

check(4, 'Current period is Y26 S1', () => {
  assert.equal(model.metadata.currentYear, 2026);
  assert.equal(model.metadata.reviewPeriod, 'S1');
  assert.equal(model.metadata.currentPeriodKey, '2026 S1');
});

check(5, 'Comparison period is Y25 S1', () => {
  assert.equal(model.metadata.comparisonYear, 2025);
  assert.equal(model.metadata.comparisonPeriodKey, '2025 S1');
  assert.equal(model.metadata.comparisonRule, 'prior-year-same-period');
});

check(6, 'Actual Adj. is preferred', () => {
  const total = service.getPortfolioMetrics();
  assert.equal(total.current.posNo, 196);
  assert.equal(total.sourceDetails.current.posNo.scope, 'actualAdjusted');
  assert.equal(model.summary.byKey.posNo.current.actual.value, 196);
  assert.equal(model.summary.byKey.posNo.current.actualAdjusted.value, 196);
});

check(7, '160 current stores parsed', () => {
  assert.equal(model.detail.current.stores.length, 160);
});

check(8, '150 comparison stores parsed', () => {
  assert.equal(model.detail.comparison.stores.length, 150);
});

check(9, 'TOTAL and blank rows excluded', () => {
  const allStores = [...model.detail.current.stores, ...model.detail.comparison.stores];
  assert.equal(allStores.some(store => /total/i.test(store.terminal) || /total/i.test(store.store)), false);
  assert.equal(allStores.every(store => store.terminal && store.store), true);
});

check(10, 'POS no. does not map to POS. expense', () => {
  assert.equal(model.fieldMappings.detail.posNo.columnIndex, null);
  assert.equal(model.fieldMappings.detail.posNo.match, 'derived-distinct-terminal');
  assert.equal(model.fieldMappings.detail.posAdvertisingExpense.header, 'POS.');
  assert.notEqual(model.fieldMappings.detail.posAdvertisingExpense.columnIndex, model.fieldMappings.detail.posNo.columnIndex);
});

check(11, 'Productivity tiers are read dynamically', () => {
  const expected = Array.from(new Set(model.detail.current.stores.map(store => store.productivityTier)))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));
  assert.deepEqual(service.getFilterOptions().productivityTier, expected);
  assert.equal(expected.includes('93~136K'), true);
});

const selectedRegion = service.getFilterOptions().region[0];
check(12, 'Region facets City options', () => {
  const options = service.getFilterOptions({ region: selectedRegion });
  const expectedCities = Array.from(new Set(
    model.detail.current.stores
      .filter(store => store.region === selectedRegion)
      .map(store => store.city)
  )).sort((left, right) => left.localeCompare(right, 'zh-CN'));
  assert.deepEqual(options.city, expectedCities);
  assert.equal(options.city.every(city => model.detail.current.stores.some(store => store.region === selectedRegion && store.city === city)), true);
});

const regionTierPair = (() => {
  for (const region of service.getFilterOptions().region) {
    for (const productivityTier of service.getFilterOptions().productivityTier) {
      if (model.detail.current.stores.some(store => store.region === region && store.productivityTier === productivityTier)) {
        return { region, productivityTier };
      }
    }
  }
  throw new Error('No Region + Tier test pair found.');
})();

check(13, 'Region + Tier facets City options', () => {
  const options = service.getFilterOptions(regionTierPair);
  const expectedCities = Array.from(new Set(
    model.detail.current.stores
      .filter(store => store.region === regionTierPair.region && store.productivityTier === regionTierPair.productivityTier)
      .map(store => store.city)
  )).sort((left, right) => left.localeCompare(right, 'zh-CN'));
  assert.deepEqual(options.city, expectedCities);
});

check(14, 'Total Portfolio uses Summary P&L', () => {
  const total = service.getPortfolioMetrics();
  assert.equal(total.mode, 'total');
  assert.equal(total.source, 'summary-pnl-actual-adjusted');
  assert.equal(total.current.grossSales, model.summary.byKey.grossSales.current.actualAdjusted.value);
});

check(15, 'Filtered Portfolio uses Detail aggregation', () => {
  const filtered = service.getPortfolioMetrics({ region: selectedRegion });
  const currentRows = model.detail.current.stores.filter(store => store.region === selectedRegion);
  const expectedGrossSales = currentRows.reduce((sum, store) => sum + (store.pnl.grossSales || 0), 0);
  assert.equal(filtered.mode, 'filtered');
  assert.equal(filtered.source, 'store-detail-aggregation');
  assert.equal(filtered.current.grossSales, expectedGrossSales);
  assert.equal(filtered.rowCounts.current, currentRows.length);
});

check(16, 'AUP remains the Summary value after filtering', () => {
  const total = service.getPortfolioMetrics();
  const filtered = service.getPortfolioMetrics(regionTierPair);
  assert.equal(filtered.current.aup, total.current.aup);
  assert.equal(filtered.comparison.aup, total.comparison.aup);
  assert.equal(filtered.aupSource, 'summary-pnl-actual-adjusted-unfiltered');
});

check(17, 'All three Summary Bridges reconcile', () => {
  ['totalMinorations', 'grossMargin', 'customerContribution'].forEach(metric => {
    const bridge = service.getBridgeData(metric);
    assert.equal(bridge.mode, 'total');
    assert.equal(bridge.reconciliation.ok, true, `${metric} residual ${bridge.reconciliation.residual}`);
    assert.equal(bridge.error, null);
  });
});

check(18, 'Store matching handles new and missing stores', () => {
  const actualMatches = service.getStoreMatches();
  assert.equal(actualMatches.existing.length + actualMatches.new.length, 160);
  assert.equal(actualMatches.existing.length + actualMatches.missing.length, 150);
  assert.equal(actualMatches.new.length > 0 || actualMatches.missing.length > 0, true);

  const syntheticCurrent = [
    { terminal: 'A', store: 'Alpha' },
    { terminal: 'B', store: 'Beta Renamed' },
    { terminal: 'D', store: 'Delta' }
  ];
  const syntheticComparison = [
    { terminal: 'A', store: 'Alpha Old Name' },
    { terminal: 'X', store: 'Beta Renamed' },
    { terminal: 'C', store: 'Closed' }
  ];
  const synthetic = DataLayer.matchStores(syntheticCurrent, syntheticComparison);
  assert.equal(synthetic.existing.length, 2);
  assert.equal(synthetic.new.length, 1);
  assert.equal(synthetic.missing.length, 1);
  assert.deepEqual(synthetic.existing.map(item => item.method).sort(), ['store-name-fallback', 'terminal']);
});

check(19, 'Summary POS no. reconciles with active Detail cityPosNo', () => {
  const isClosed = store => /关店|暂停|停业|关闭|闭店|closed|pause|closure/i.test(String(store.status || ''));
  const sumActiveCityPosNo = stores => stores
    .filter(store => !isClosed(store))
    .reduce((sum, store) => sum + (Number(store.cityPosNo) || 0), 0);
  const currentSum = sumActiveCityPosNo(model.detail.current.stores);
  const comparisonSum = sumActiveCityPosNo(model.detail.comparison.stores);
  const currentActual = model.summary.byKey.posNo.current.actual.value;
  const currentAdj = model.summary.byKey.posNo.current.actualAdjusted.value;
  const comparisonActual = model.summary.byKey.posNo.comparison.actual.value;
  const comparisonAdj = model.summary.byKey.posNo.comparison.actualAdjusted.value;
  if (currentActual !== currentSum || currentAdj !== currentSum) {
    throw new Error(`SUMMARY_POS_RECONCILIATION_ERROR: current Summary POS no. (Actual=${currentActual}, Adj=${currentAdj}) != active Detail cityPosNo sum ${currentSum}`);
  }
  if (comparisonActual !== comparisonSum || comparisonAdj !== comparisonSum) {
    throw new Error(`SUMMARY_POS_RECONCILIATION_ERROR: comparison Summary POS no. (Actual=${comparisonActual}, Adj=${comparisonAdj}) != active Detail cityPosNo sum ${comparisonSum}`);
  }
});

check(20, 'Filtered Portfolio POS no. sums active cityPosNo', () => {
  const status = service.getFilterOptions().status[0];
  const byStatus = service.getPortfolioMetrics({ status });
  const total = service.getPortfolioMetrics();
  assert.equal(byStatus.current.posNo, total.current.posNo);
  assert.equal(byStatus.comparison.posNo, total.comparison.posNo);
  assert.equal(byStatus.rowCounts.current, 160);

  const tierStores = model.detail.current.stores.filter(store => store.productivityTier === '>136K');
  const expectedTierPos = tierStores.reduce((sum, store) => sum + (Number(store.cityPosNo) || 0), 0);
  const byTier = service.getPortfolioMetrics({ productivityTier: '>136K' });
  assert.equal(byTier.current.posNo, expectedTierPos);
  assert.equal(byTier.rowCounts.current, tierStores.length);
});

check(21, 'Ratio variance is Current ratio minus Comparison ratio', () => {
  const cases = [
    ['Total Minorations %', -0.279, -0.276, -0.003],
    ['Gross Margin %', 0.714, 0.713, 0.001],
    ['Customer Contribution %', 0.294, 0.299, -0.005],
    ['CA Net % of GS', 0.459, 0.455, 0.004],
    ['P&L line % of Net Sales', -0.279, -0.276, -0.003],
    ['Expense % of Net Sales', -0.355, -0.348, -0.007]
  ];
  cases.forEach(([label, current, comparison, expected]) => {
    assertClose(DataLayer.ratioVariance(current, comparison), expected, label);
  });
  assert.equal(DataLayer.ratioVariance(null, 0.2), null);
  assert.equal(DataLayer.ratioVariance(0.2, null), null);
});

check(22, 'Portfolio ratio variances use percentage-point difference semantics', () => {
  const total = service.getPortfolioMetrics();
  ['totalMinorationsPct', 'grossMarginPct', 'customerContributionPct'].forEach(key => {
    assertClose(
      total.variance[key],
      total.current[key] - total.comparison[key],
      `${key} total portfolio variance`
    );
  });
  assert.equal(total.variance.grossMargin, total.current.grossMargin - total.comparison.grossMargin);
});

check(23, 'Canonical A&P Expense uses the signed Specific A&P subtotal', () => {
  const currentStores = service.getStores('current', {});
  const comparisonStores = service.getStores('comparison', {});
  [...currentStores, ...comparisonStores].forEach(store => {
    assert.equal(store.metrics.apExpense, store.pnl.specificAP);
    assert.equal(store.metrics.apExpenseMagnitude, Math.abs(store.pnl.specificAP));
    assertClose(
      store.metrics.apExpensePct,
      store.pnl.specificAP / store.pnl.netSales,
      `${store.terminal} A&P Expense %`
    );
  });
  assert.equal(currentStores.reduce((sum, store) => sum + store.metrics.apExpenseMagnitude, 0), 20760);
  assert.equal(comparisonStores.reduce((sum, store) => sum + store.metrics.apExpenseMagnitude, 0), 19473);
});

check(24, 'Customer Contribution Bridge keeps absolute amount reconciliation', () => {
  const bridge = service.getBridgeData('customerContribution');
  assert.equal(bridge.comparison, 16702);
  assert.equal(bridge.current, 17221);
  assert.equal(bridge.drivers.reduce((sum, driver) => sum + driver.variance, 0), 519);
  assert.equal(bridge.reconciliation.expectedCurrent, bridge.current);
  assert.equal(bridge.reconciliation.residual, 0);
  assert.equal(bridge.reconciliation.ok, true);
});

check(25, 'Customer Contribution Bridge exposes ratio variance without changing amount drivers', () => {
  const bridge = service.getBridgeData('customerContribution');
  const expectedFields = [
    'grossMargin',
    'customerSamples',
    'promotionalGifts',
    'animations',
    'posAdvertisingAmortization',
    'otherPosAdvertising',
    'specificDevelopment',
    'specificSga'
  ];
  assert.deepEqual(bridge.drivers.map(driver => driver.field), expectedFields);
  assertClose(bridge.ratioVariance, bridge.currentRatio - bridge.comparisonRatio, 'Customer Contribution ratio variance');
  bridge.drivers.forEach(driver => {
    assertClose(driver.ratioVariance, driver.currentRatio - driver.comparisonRatio, `${driver.field} ratio variance`);
    assert.equal(driver.variance, driver.current - driver.comparison);
  });
});

check(26, 'Filtered Bridge ratios use the same filtered Detail scope', () => {
  const filters = { region: selectedRegion };
  const bridge = service.getBridgeData('customerContribution', filters);
  const metrics = service.getPortfolioMetrics(filters);
  assertClose(bridge.currentRatio, metrics.current.customerContributionPct, 'Filtered current CC ratio');
  assertClose(bridge.comparisonRatio, metrics.comparison.customerContributionPct, 'Filtered comparison CC ratio');
  assertClose(bridge.ratioVariance, bridge.currentRatio - bridge.comparisonRatio, 'Filtered CC ratio variance');

  const currentStores = service.getStores('current', filters);
  const comparisonStores = service.getStores('comparison', filters);
  const currentNetSales = currentStores.reduce((sum, store) => sum + store.pnl.netSales, 0);
  const comparisonNetSales = comparisonStores.reduce((sum, store) => sum + store.pnl.netSales, 0);
  bridge.drivers.forEach(driver => {
    const currentAmount = currentStores.reduce((sum, store) => sum + (store.pnl[driver.field] || 0), 0);
    const comparisonAmount = comparisonStores.reduce((sum, store) => sum + (store.pnl[driver.field] || 0), 0);
    assertClose(driver.currentRatio, currentAmount / currentNetSales, `${driver.field} filtered current ratio`);
    assertClose(driver.comparisonRatio, comparisonAmount / comparisonNetSales, `${driver.field} filtered comparison ratio`);
  });
});

check(27, 'Store variance remains an absolute amount difference', () => {
  const pair = service.getStoreMatches().existing[0];
  const current = pair.current.metrics.customerContribution;
  const comparison = pair.comparison.metrics.customerContribution;
  const amountVariance = current - comparison;
  assert.equal(amountVariance, pair.current.pnl.customerContribution - pair.comparison.pnl.customerContribution);
  assert.equal(Number.isFinite(amountVariance), true);
});

check(28, 'Non-ratio amount variance uses safe relative change', () => {
  assertClose(DataLayer.amountRelativeVariance(196, 186), 10 / 186, 'POS relative variance');
  const total = service.getPortfolioMetrics();
  assertClose(
    DataLayer.amountRelativeVariance(total.current.aup, total.comparison.aup),
    (total.current.aup - total.comparison.aup) / Math.abs(total.comparison.aup),
    'Mock AUP relative variance'
  );
  assertClose(DataLayer.amountRelativeVariance(-80, -100), .2, 'negative comparison uses absolute denominator');
  assert.equal(DataLayer.amountRelativeVariance(10, 0), null);
  assert.equal(DataLayer.amountRelativeVariance(10, null), null);
  assert.equal(DataLayer.amountRelativeVariance(null, 10), null);
});

const filteredBridgeError = service.getBridgeData('grossMargin', { region: selectedRegion });
assert.equal(filteredBridgeError.reconciliation.ok, false);
assert.equal(filteredBridgeError.error.code, 'BRIDGE_RECONCILIATION_ERROR');
assert.equal(filteredBridgeError.drivers.some(driver => /residual|rounding/i.test(driver.label)), false);

const fullYearWorkbook = XLSX.read(bytes, { type: 'buffer', cellDates: true });
function renameSheet(targetWorkbook, from, to) {
  const index = targetWorkbook.SheetNames.indexOf(from);
  targetWorkbook.SheetNames[index] = to;
  targetWorkbook.Sheets[to] = targetWorkbook.Sheets[from];
  delete targetWorkbook.Sheets[from];
}
renameSheet(fullYearWorkbook, 'LRP Counter Y26 S1', 'LRP Counter Y26 Full Year');
renameSheet(fullYearWorkbook, 'LRP Counter Y25 S1', 'LRP Counter Y25 Full Year');
fullYearWorkbook.Sheets['P&L review Y26'].B1.v = 'LRP Counter P&L - 2026 Full Year';
['C2', 'E2'].forEach(cell => { fullYearWorkbook.Sheets['P&L review Y26'][cell].v = '2025 Full Year'; });
['G2', 'I2'].forEach(cell => { fullYearWorkbook.Sheets['P&L review Y26'][cell].v = '2026 Full Year'; });
const fullYearModel = DataLayer.parseWorkbook(fullYearWorkbook, { XLSX, fileName: 'synthetic-full-year.xlsx' });
assert.equal(fullYearModel.metadata.reviewPeriod, 'Full Year');
assert.equal(fullYearModel.metadata.comparisonPeriodKey, '2025 Full Year');

const missingComparisonWorkbook = XLSX.read(bytes, { type: 'buffer', cellDates: true });
missingComparisonWorkbook.SheetNames = missingComparisonWorkbook.SheetNames.filter(name => name !== 'LRP Counter Y25 S1');
delete missingComparisonWorkbook.Sheets['LRP Counter Y25 S1'];
let missingComparisonError;
try {
  DataLayer.parseWorkbook(missingComparisonWorkbook, { XLSX });
} catch (error) {
  missingComparisonError = error;
}
assert.match(missingComparisonError.message, /Prior-year same-period detail sheet not found\./);
assert.ok(missingComparisonError.workbookScan);
assert.equal(missingComparisonError.workbookScan.assigned.current, 'LRP Counter Y26 S1');
assert.equal(missingComparisonError.workbookScan.assigned.comparison, null);

check(29, 'Standard Mock enters the integrated Cleaning path', () => {
  assert.equal(model.metadata.workbookScan.sheets.length, workbook.SheetNames.length);
  assert.deepEqual(model.metadata.workbookScan.assigned, {
    current: 'LRP Counter Y26 S1',
    comparison: 'LRP Counter Y25 S1'
  });
});

check(30, 'Summary P&L bypasses every Detail Cleaning operation', () => {
  const summaryScan = scanSheet(model, 'P&L review Y26');
  assert.equal(summaryScan.classification, 'summary');
  assert.equal(summaryScan.cleaningStatus, 'notApplicable');
  assert.equal(summaryScan.header, null);
  assert.equal(summaryScan.fields, null);
  assert.equal(summaryScan.counts.cleanedRows, 0);
  assert.equal(summaryScan.counts.blankRowsIgnored, 0);
  assert.deepEqual(summaryScan.capabilities, {});
});

check(31, 'Current Detail is cleaned before Core normalization', () => {
  const currentScan = scanSheet(model, 'LRP Counter Y26 S1');
  assert.equal(currentScan.classification, 'detail');
  assert.equal(currentScan.cleaningStatus, 'compatible');
  assert.equal(currentScan.dashboardReadiness.status, 'ready');
  assert.equal(currentScan.role, 'current');
  assert.equal(currentScan.counts.cleanedRows, 161);
});

check(32, 'Comparison Detail is cleaned before Core normalization', () => {
  const comparisonScan = scanSheet(model, 'LRP Counter Y25 S1');
  assert.equal(comparisonScan.cleaningStatus, 'compatible');
  assert.equal(comparisonScan.dashboardReadiness.status, 'ready');
  assert.equal(comparisonScan.role, 'comparison');
  assert.equal(comparisonScan.counts.cleanedRows, 151);
});

check(33, 'Integrated Cleaning preserves Standard Mock store counts', () => {
  assert.equal(model.detail.current.stores.length, 160);
  assert.equal(model.detail.comparison.stores.length, 150);
});

check(34, 'Integrated Cleaning preserves Standard Mock POS values', () => {
  const totals = service.getPortfolioMetrics();
  assert.equal(totals.current.posNo, 196);
  assert.equal(totals.comparison.posNo, 186);
});

check(35, 'Integrated Cleaning preserves the Customer Contribution Bridge', () => {
  const bridge = service.getBridgeData('customerContribution');
  assert.equal(bridge.comparison, 16702);
  assert.equal(bridge.drivers.reduce((sum, driver) => sum + driver.variance, 0), 519);
  assert.equal(bridge.current, 17221);
  assert.equal(bridge.reconciliation.residual, 0);
});

check(36, 'Cleaned decimal ratios are not scaled a second time in Core', () => {
  const discovered = DataLayer.discoverWorkbookSheets(freshWorkbook(), XLSX);
  const irRow = discovered.currentDetail.scan.cleanedRows[0];
  const irRatio = irRow.cells.find(cell => cell.canonicalKey === 'grossMarginPct').cleanedValue;
  assert.equal(model.detail.current.stores[0].pnl.grossMarginPct, irRatio);
  assert.equal(Math.abs(irRatio) <= 1, true);
});

check(37, 'TOTAL remains in Cleaning IR and is excluded only by Core', () => {
  const discovered = DataLayer.discoverWorkbookSheets(freshWorkbook(), XLSX);
  const terminalValue = row => row.cells.find(cell => cell.canonicalKey === 'terminal').cleanedValue;
  assert.equal(discovered.currentDetail.scan.cleanedRows.some(row => /^total$/i.test(terminalValue(row))), true);
  assert.equal(discovered.comparisonDetail.scan.cleanedRows.some(row => /^total$/i.test(terminalValue(row))), true);
  assert.equal(model.detail.current.stores.some(store => /^total$/i.test(store.terminal)), false);
  assert.equal(model.detail.comparison.stores.some(store => /^total$/i.test(store.terminal)), false);
});

check(38, 'Unknown columns remain available in scan metadata', () => {
  const unknown = scanSheet(model, 'LRP Counter Y26 S1').fields.unknownColumns;
  assert.equal(unknown.length > 0, true);
  assert.equal(unknown.some(column => column.rawHeader === 'Nature'), true);
  assert.equal(unknown.every(column => Number.isInteger(column.sourceColumnIndex)), true);
});

const optionalMissingModel = DataLayer.parseWorkbook(minimalWorkbook({
  currentHeaders: ['Specific A&P'],
  currentValues: [-50]
}), { XLSX, fileName: 'synthetic-optional-missing.xlsx' });

check(39, 'Known optional fields may be absent without blocking Cleaning or Core', () => {
  assert.equal(scanSheet(optionalMissingModel, 'LRP Counter Y26 S1').cleaningStatus, 'compatible');
  assert.equal(scanSheet(optionalMissingModel, 'LRP Counter Y26 S1').dashboardReadiness.status, 'ready');
  assert.equal(optionalMissingModel.detail.current.stores[0].pnl.specificSga, null);
  assert.equal(optionalMissingModel.detail.current.stores[0].cityPosNo, null);
});

check(40, 'Missing specificSga disables the filtered Customer Contribution Bridge capability', () => {
  const capability = optionalMissingModel.metadata.capabilities.resolved.filteredCustomerContributionBridge;
  assert.equal(capability.status, 'unavailable');
  assert.deepEqual(capability.missing.current, ['specificSga']);
  assert.deepEqual(capability.missing.comparison, ['specificSga']);
});

check(41, 'Missing cityPosNo disables POS analytics without creating zero values', () => {
  assert.equal(optionalMissingModel.metadata.capabilities.resolved.posAnalytics.status, 'unavailable');
  assert.equal(optionalMissingModel.detail.current.stores[0].cityPosNo, null);
  assert.equal(optionalMissingModel.detail.comparison.stores[0].cityPosNo, null);
  const optionalService = DataLayer.createDataService(optionalMissingModel);
  assert.equal(optionalService.getPortfolioMetrics({ region: 'East' }).current.posNo, null);
});

check(42, 'Missing productivityTier disables only the Tier capability', () => {
  assert.equal(optionalMissingModel.metadata.capabilities.resolved.tierFilter.status, 'unavailable');
  assert.equal(optionalMissingModel.detail.current.stores[0].productivityTier, null);
});

check(43, 'Missing storeProductivity keeps Productivity Risk partial', () => {
  assert.equal(optionalMissingModel.metadata.capabilities.current.investmentQuadrant.status, 'available');
  assert.equal(optionalMissingModel.metadata.capabilities.current.productivitySummary.status, 'unavailable');
  assert.equal(optionalMissingModel.metadata.capabilities.resolved.fullProductivityRisk.status, 'partial');
  assert.equal(optionalMissingModel.detail.current.stores[0].storeProductivity, null);
});

const multiCompatibleWorkbook = freshWorkbook();
appendSheet(multiCompatibleWorkbook, 'LRP Counter Y24 S1', multiCompatibleWorkbook.Sheets['LRP Counter Y25 S1']);
appendSheet(multiCompatibleWorkbook, 'Counter Data', multiCompatibleWorkbook.Sheets['LRP Counter Y26 S1']);
const multiCompatibleModel = DataLayer.parseWorkbook(multiCompatibleWorkbook, { XLSX });

check(44, 'Multiple compatible sheets are cleaned but never concatenated', () => {
  assert.equal(multiCompatibleModel.metadata.workbookScan.compatibleSheets.length, 4);
  assert.equal(multiCompatibleModel.detail.current.stores.length, 160);
  assert.equal(multiCompatibleModel.detail.comparison.stores.length, 150);
});

check(45, 'Older compatible period metadata is classified as historical', () => {
  const scan = scanSheet(multiCompatibleModel, 'LRP Counter Y24 S1');
  assert.equal(scan.cleaningStatus, 'compatible');
  assert.equal(scan.role, 'historical');
  assert.deepEqual(multiCompatibleModel.metadata.workbookScan.historicalCompatible, ['LRP Counter Y24 S1']);
});

check(46, 'A compatible sheet without period metadata remains unassigned', () => {
  const scan = scanSheet(multiCompatibleModel, 'Counter Data');
  assert.equal(scan.cleaningStatus, 'compatible');
  assert.equal(scan.periodMetadata, null);
  assert.equal(scan.role, 'unassigned');
  assert.deepEqual(multiCompatibleModel.metadata.workbookScan.unassignedCompatible, ['Counter Data']);
});

check(47, 'Near-compatible sheets are retained in scan metadata but excluded from the model', () => {
  const target = freshWorkbook();
  appendSheet(target, 'Near Detail', XLSX.utils.aoa_to_sheet([
    CORE_DETAIL_HEADERS.slice(0, -1),
    CORE_DETAIL_ROW.slice(0, -1)
  ]));
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  const scan = scanSheet(parsed, 'Near Detail');
  assert.equal(scan.cleaningStatus, 'nearCompatible');
  assert.equal(scan.role, 'nearCompatible');
  assert.deepEqual(scan.fields.missingRequired, ['customerContribution']);
  assert.equal(parsed.detail.current.stores.length, 160);
});

check(48, 'Unrelated sheets are ignored without becoming parser errors', () => {
  const target = freshWorkbook();
  appendSheet(target, 'Notes', XLSX.utils.aoa_to_sheet([['Notes'], ['Local comments']]));
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  const scan = scanSheet(parsed, 'Notes');
  assert.equal(scan.classification, 'other');
  assert.equal(scan.cleaningStatus, 'incompatible');
  assert.equal(scan.role, 'ignored');
});

check(49, 'Mapping collisions block strong Detail candidates without choosing a source column', () => {
  const target = freshWorkbook();
  appendSheet(target, 'Collision Y24 S1', XLSX.utils.aoa_to_sheet([
    CORE_DETAIL_HEADERS.concat('Gross Sales'),
    CORE_DETAIL_ROW.concat(999)
  ]));
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  const scan = scanSheet(parsed, 'Collision Y24 S1');
  assert.equal(scan.classification, 'detail');
  assert.equal(scan.cleaningStatus, 'incompatible');
  assert.equal(scan.role, 'blocked');
  assert.equal(scan.diagnostics.some(item => item.code === 'MAPPING_COLLISION' && item.severity === 'blocking'), true);
});

check(50, 'Cached formula values flow from Cleaning IR into Core', () => {
  const target = minimalWorkbook();
  const currentSheet = target.Sheets['LRP Counter Y26 S1'];
  currentSheet.E2 = { t: 'n', f: '500+500', v: 1000 };
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  assert.equal(parsed.detail.current.stores[0].pnl.grossSales, 1000);
  assert.equal(scanSheet(parsed, 'LRP Counter Y26 S1').diagnostics.some(item => item.code === 'UNCACHED_FORMULA'), false);
});

check(51, 'Uncached required formulas block a candidate from role assignment', () => {
  const target = freshWorkbook();
  const blocked = detailWorksheet();
  blocked.E2 = { t: 'n', f: '500+500' };
  appendSheet(target, 'Formula Y24 S1', blocked);
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  const scan = scanSheet(parsed, 'Formula Y24 S1');
  assert.equal(scan.cleaningStatus, 'compatible');
  assert.equal(scan.dashboardReadiness.status, 'blocked');
  assert.equal(scan.role, 'blocked');
  assert.equal(scan.diagnostics.some(item => item.code === 'UNCACHED_FORMULA' && item.severity === 'blocking'), true);
});

check(52, 'Uncached optional formulas remain null with a warning', () => {
  const target = minimalWorkbook({ currentHeaders: ['Specific SG&A'], currentValues: [0] });
  target.Sheets['LRP Counter Y26 S1'].I2 = { t: 'n', f: '100-100' };
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  assert.equal(parsed.detail.current.stores[0].pnl.specificSga, null);
  assert.equal(scanSheet(parsed, 'LRP Counter Y26 S1').diagnostics.some(item => (
    item.code === 'UNCACHED_FORMULA' && item.severity === 'warning' && item.canonicalKey === 'specificSga'
  )), true);
});

check(53, 'Full Year metadata remains independent from Cleaning eligibility', () => {
  assert.equal(fullYearModel.metadata.reviewPeriod, 'Full Year');
  assert.equal(fullYearModel.metadata.sheets.currentDetail, 'LRP Counter Y26 Full Year');
  assert.equal(scanSheet(fullYearModel, 'LRP Counter Y26 Full Year').cleaningStatus, 'compatible');
  assert.equal(scanSheet(fullYearModel, 'LRP Counter Y26 Full Year').role, 'current');
});

check(54, 'Summary Actual Adj. selection is unchanged after integration', () => {
  const totals = service.getPortfolioMetrics();
  assert.equal(totals.sourceDetails.current.grossSales.scope, 'actualAdjusted');
  assert.equal(totals.sourceDetails.comparison.grossSales.scope, 'actualAdjusted');
  assert.equal(totals.current.aup, model.summary.byKey.aup.current.actualAdjusted.value);
});

check(55, 'Current and Comparison exact terminal matching remains unchanged', () => {
  assert.equal(model.storeMatches.existing.length, 150);
  assert.equal(model.storeMatches.new.length, 10);
  assert.equal(model.storeMatches.missing.length, 0);
  assert.equal(model.storeMatches.existing.every(pair => pair.method === 'terminal'), true);
});

check(56, 'Classic-script load order works without modules or network access', () => {
  const context = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/store-portfolio.js'), 'utf8'), context);
  ['detail-schema.js', 'data-cleaning.js', 'core-data.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, `../js/data/${file}`), 'utf8'), context);
  });
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  assert.equal(html.indexOf('detail-schema.js') < html.indexOf('data-cleaning.js'), true);
  assert.equal(html.indexOf('data-cleaning.js') < html.indexOf('store-portfolio.js'), true);
  assert.equal(html.indexOf('store-portfolio.js') < html.indexOf('core-data.js'), true);
  assert.equal(html.indexOf('data-cleaning.js') < html.indexOf('core-data.js'), true);
  assert.equal(typeof context.RetailDetailSchema, 'object');
  assert.equal(typeof context.RetailDataCleaning.scanWorkbook, 'function');
  assert.equal(typeof context.RetailDashboardData.parseWorkbook, 'function');
});

check(57, 'An exact year-period suffix can assign a non-LRP sheet name', () => {
  const target = freshWorkbook();
  renameSheet(target, 'LRP Counter Y26 S1', 'Counter Data Y26 S1');
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  assert.equal(parsed.metadata.sheets.currentDetail, 'Counter Data Y26 S1');
  assert.equal(scanSheet(parsed, 'Counter Data Y26 S1').cleaningStatus, 'compatible');
  assert.equal(scanSheet(parsed, 'Counter Data Y26 S1').role, 'current');
});

check(58, 'Ambiguous unmarked ratios stay diagnostic and do not enter Core', () => {
  const target = minimalWorkbook({
    currentHeaders: ['Gross Margin% of CA'],
    currentValues: ['67']
  });
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  assert.equal(parsed.detail.current.stores[0].pnl.grossMarginPct, null);
  assert.equal(scanSheet(parsed, 'LRP Counter Y26 S1').diagnostics.some(item => (
    item.code === 'RATIO_SCALE_AMBIGUOUS' && item.canonicalKey === 'grossMarginPct'
  )), true);
});

check(59, 'Signed Specific A&P semantics are preserved through integration', () => {
  assert.equal(optionalMissingModel.detail.current.stores[0].pnl.specificAP, -50);
  assert.equal(optionalMissingModel.detail.current.stores[0].metrics.apExpense, -50);
  assert.equal(optionalMissingModel.detail.current.stores[0].metrics.apExpenseMagnitude, 50);
});

check(60, 'Resolved capabilities become partial when only one period is available', () => {
  const target = minimalWorkbook({
    currentHeaders: ['城市POS数'],
    currentValues: [12],
    comparisonHeaders: [],
    comparisonValues: []
  });
  const parsed = DataLayer.parseWorkbook(target, { XLSX });
  assert.equal(parsed.metadata.capabilities.current.posAnalytics.status, 'available');
  assert.equal(parsed.metadata.capabilities.comparison.posAnalytics.status, 'unavailable');
  assert.equal(parsed.metadata.capabilities.resolved.posAnalytics.status, 'partial');
  assert.deepEqual(parsed.metadata.capabilities.resolved.posAnalytics.missing.comparison, ['cityPosNo']);
});

console.log(results.join('\n'));
assert.equal(results.length, 60);
console.log(`\n${results.length}/60 validation checks passed.`);
console.log('Filtered Bridge error handling PASS - non-zero residual is reported without a residual driver.');
console.log('Period detection edge cases PASS - Full Year and missing prior-year handling verified.');
