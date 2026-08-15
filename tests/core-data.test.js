'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

const results = [];
function check(number, label, test) {
  test();
  results.push(`${number}. PASS - ${label}`);
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
  assert.equal(total.current.posNo, 150);
  assert.equal(total.sourceDetails.current.posNo.scope, 'actualAdjusted');
  assert.equal(model.summary.byKey.posNo.current.actual.value, 160);
  assert.equal(model.summary.byKey.posNo.current.actualAdjusted.value, 150);
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
assert.throws(
  () => DataLayer.parseWorkbook(missingComparisonWorkbook, { XLSX }),
  /Prior-year same-period detail sheet not found\./
);

console.log(results.join('\n'));
console.log(`\n${results.length}/18 validation checks passed.`);
console.log('Filtered Bridge error handling PASS - non-zero residual is reported without a residual driver.');
console.log('Period detection edge cases PASS - Full Year and missing prior-year handling verified.');
