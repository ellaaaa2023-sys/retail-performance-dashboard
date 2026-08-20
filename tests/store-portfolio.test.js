'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DetailSchema = require('../js/data/detail-schema.js');
const DataLayer = require('../js/data/core-data.js');
const StorePortfolio = require('../js/store-portfolio.js');

const workbookPath = path.resolve(__dirname, '../sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx');
const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: 'buffer', cellDates: true });
const model = DataLayer.parseWorkbook(workbook, { XLSX, fileName: path.basename(workbookPath) });
const service = DataLayer.createDataService(model);

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`${passed}. PASS - ${name}`);
}

function close(actual, expected, label, tolerance = 1e-12) {
  assert.equal(Number.isFinite(actual), true, `${label}: expected finite, received ${actual}`);
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${label}: expected ${expected}, received ${actual}`);
}

function cloneModel() {
  return JSON.parse(JSON.stringify(model));
}

function eligibleRecord(overrides = {}) {
  return {
    terminal: 'T-1',
    comparisonStatus: 'matched',
    currentProductivity: 100,
    productivityEvolution: { value: 0.1, status: 'available', reason: null },
    currentCustomerContributionPct: 0.2,
    ...overrides
  };
}

check('Detail schema maps DA HC to daHeadcount', () => {
  const field = DetailSchema.FIELDS.find(item => item.key === 'daHeadcount');
  assert.deepEqual(field.aliases, ['DA HC']);
});

check('Current normalized stores retain DA HC', () => {
  assert.equal(Number.isFinite(model.detail.current.stores[0].daHeadcount), true);
  assert.equal(model.detail.current.stores[0].metrics.daHeadcount, model.detail.current.stores[0].daHeadcount);
});

check('Comparison normalized stores retain DA HC', () => {
  assert.equal(Number.isFinite(model.detail.comparison.stores[0].daHeadcount), true);
  assert.equal(model.detail.comparison.stores[0].metrics.daHeadcount, model.detail.comparison.stores[0].daHeadcount);
});

check('Total portfolio DA HC uses authoritative Summary values', () => {
  const totals = service.getPortfolioMetrics({});
  assert.equal(totals.current.daHeadcount, model.summary.periods.current.values.daHeadcount);
  assert.equal(totals.comparison.daHeadcount, model.summary.periods.comparison.values.daHeadcount);
});

check('Total portfolio DA HC falls back only to a complete Detail sum', () => {
  const target = cloneModel();
  target.summary.periods.current.values.daHeadcount = null;
  const result = DataLayer.createDataService(target).getDAHeadcountSummary({});
  const expected = target.detail.current.stores.reduce((sum, store) => sum + store.daHeadcount, 0);
  assert.equal(result.current.source, 'store-detail-aggregation');
  assert.equal(result.current.total, expected);
});

check('Filtered DA HC totals equal complete filtered Detail sums', () => {
  const region = model.detail.current.stores[0].region;
  const result = service.getDAHeadcountSummary({ region });
  const expected = service.getStores('current', { region })
    .reduce((sum, store) => sum + store.daHeadcount, 0);
  assert.equal(result.mode, 'filtered');
  assert.equal(result.current.status, 'available');
  assert.equal(result.current.total, expected);
  const comparisonExpected = service.getStores('comparison', { region })
    .reduce((sum, store) => sum + store.daHeadcount, 0);
  assert.equal(result.comparison.status, 'available');
  assert.equal(result.comparison.total, comparisonExpected);
});

check('Region, City, Status, and Tier filters all reaggregate DA HC', () => {
  const seed = model.detail.current.stores[0];
  [
    { region: seed.region },
    { city: seed.city },
    { status: seed.status },
    { productivityTier: seed.productivityTier }
  ].forEach(filters => {
    const result = service.getDAHeadcountSummary(filters);
    const stores = service.getStores('current', filters);
    const expected = stores.reduce((sum, store) => sum + store.daHeadcount, 0);
    assert.equal(result.current.status, 'available');
    assert.equal(result.current.total, expected);
  });
});

check('Actual DA HC zero remains a valid value', () => {
  const target = cloneModel();
  const region = target.detail.current.stores[0].region;
  target.detail.current.stores[0].daHeadcount = 0;
  const result = DataLayer.createDataService(target).getDAHeadcountSummary({ region });
  assert.equal(result.current.status, 'available');
  assert.equal(result.current.missingCount, 0);
  assert.equal(result.current.validStoreCount, result.current.storeCount);
});

check('One missing DA HC yields partial capability and no formal total', () => {
  const target = cloneModel();
  const region = target.detail.current.stores[0].region;
  target.detail.current.stores[0].daHeadcount = null;
  const result = DataLayer.createDataService(target).getDAHeadcountSummary({ region });
  assert.equal(result.current.status, 'partial');
  assert.equal(result.current.total, null);
  assert.equal(result.current.missingCount, 1);
  assert.equal(Number.isFinite(result.current.validTotal), true);
});

check('All missing DA HC yields unavailable capability', () => {
  const target = cloneModel();
  target.detail.current.stores.forEach(store => { store.daHeadcount = null; });
  const result = DataLayer.createDataService(target).getDAHeadcountSummary({ region: target.detail.current.stores[0].region });
  assert.equal(result.current.status, 'unavailable');
  assert.equal(result.current.total, null);
  assert.equal(result.current.validTotal, null);
  assert.equal(result.current.validStoreCount, 0);
});

check('Workbook capability declares DA HC available in both periods', () => {
  assert.equal(model.metadata.capabilities.current.daHeadcountAnalysis.status, 'available');
  assert.equal(model.metadata.capabilities.comparison.daHeadcountAnalysis.status, 'available');
  assert.equal(model.metadata.capabilities.resolved.daHeadcountAnalysis.status, 'available');
});

check('Exact Terminal matching finds the Comparison store', () => {
  const pairs = StorePortfolio.exactTerminalPairs([{ terminal: 'T-1' }], [{ terminal: 'T-1' }]);
  assert.equal(pairs[0].comparisonStatus, 'matched');
  assert.equal(pairs[0].comparisonStore.terminal, 'T-1');
});

check('Same Store name with a different Terminal never matches', () => {
  const pairs = StorePortfolio.exactTerminalPairs(
    [{ terminal: 'T-1', store: 'Same Name' }],
    [{ terminal: 'T-2', store: 'Same Name' }]
  );
  assert.equal(pairs[0].comparisonStatus, 'new-store');
  assert.equal(pairs[0].comparisonStore, null);
});

check('Comparison-only stores do not enter the Current comparison collection', () => {
  const pairs = StorePortfolio.exactTerminalPairs(
    [{ terminal: 'T-1' }],
    [{ terminal: 'T-1' }, { terminal: 'T-2' }]
  );
  assert.equal(pairs.length, 1);
});

check('Positive Productivity evolution is a decimal ratio', () => {
  close(StorePortfolio.productivityEvolution(120, 100, 'matched').value, 0.2, 'positive evolution');
});

check('Negative Productivity evolution is a decimal ratio', () => {
  close(StorePortfolio.productivityEvolution(80, 100, 'matched').value, -0.2, 'negative evolution');
});

check('Zero Productivity movement is zero', () => {
  assert.equal(StorePortfolio.productivityEvolution(100, 100, 'matched').value, 0);
});

check('Missing LY Productivity returns missing-comparison', () => {
  assert.deepEqual(
    StorePortfolio.productivityEvolution(100, null, 'matched'),
    { value: null, status: 'unavailable', reason: 'missing-comparison' }
  );
});

check('Zero LY Productivity returns zero-comparison-base', () => {
  assert.equal(StorePortfolio.productivityEvolution(100, 0, 'matched').reason, 'zero-comparison-base');
});

check('Negative LY Productivity returns invalid-comparison-base', () => {
  assert.equal(StorePortfolio.productivityEvolution(100, -1, 'matched').reason, 'invalid-comparison-base');
});

check('Missing Current Productivity returns missing-current', () => {
  assert.equal(StorePortfolio.productivityEvolution(null, 100, 'matched').reason, 'missing-current');
});

check('New store returns new-store instead of a fabricated percentage', () => {
  assert.deepEqual(
    StorePortfolio.productivityEvolution(100, null, 'new-store'),
    { value: null, status: 'unavailable', reason: 'new-store' }
  );
});

check('Current store comparison payload excludes Comparison-only stores', () => {
  assert.equal(service.getStoreComparisons({}).length, model.detail.current.stores.length);
});

check('Store comparison payload exposes Current and LY Productivity', () => {
  const record = service.getStoreComparisons({}).find(item => item.comparisonStatus === 'matched');
  assert.equal(record.currentProductivity, record.currentStore.storeProductivity);
  assert.equal(record.lyProductivity, record.comparisonStore.storeProductivity);
  close(
    record.productivityEvolPct,
    (record.currentProductivity - record.lyProductivity) / record.lyProductivity,
    'payload productivity evolution'
  );
});

check('Store comparison payload exposes Current and LY DA HC without coercion', () => {
  const record = service.getStoreComparisons({}).find(item => item.comparisonStatus === 'matched');
  assert.equal(record.currentDAHeadcount, record.currentStore.pnl.daHeadcount);
  assert.equal(record.lyDAHeadcount, record.comparisonStore.pnl.daHeadcount);
});

check('Store comparison payload exposes canonical Current and LY CC amounts', () => {
  const record = service.getStoreComparisons({}).find(item => item.comparisonStatus === 'matched');
  assert.equal(record.currentCustomerContributionAmount, record.currentStore.pnl.customerContribution);
  assert.equal(record.lyCustomerContributionAmount, record.comparisonStore.pnl.customerContribution);
});

check('Current and LY CC percentages use CC divided by CONSO Net Sales', () => {
  const record = service.getStoreComparisons({}).find(item => item.comparisonStatus === 'matched');
  close(
    record.currentCustomerContributionPct,
    record.currentStore.pnl.customerContribution / record.currentStore.pnl.netSales,
    'Current CC percentage'
  );
  close(
    record.lyCustomerContributionPct,
    record.comparisonStore.pnl.customerContribution / record.comparisonStore.pnl.netSales,
    'LY CC percentage'
  );
});

check('Eligible performance record passes all three metric requirements', () => {
  assert.deepEqual(StorePortfolio.performanceEligibility(eligibleRecord()), { eligible: true, reason: null });
});

check('New store is excluded from the performance dataset', () => {
  assert.equal(StorePortfolio.performanceEligibility(eligibleRecord({ comparisonStatus: 'new-store' })).reason, 'new-store');
});

check('Missing Comparison Productivity is excluded with its calculation reason', () => {
  const result = StorePortfolio.performanceEligibility(eligibleRecord({
    productivityEvolution: { value: null, status: 'unavailable', reason: 'missing-comparison' }
  }));
  assert.equal(result.reason, 'missing-comparison');
});

check('Zero LY Productivity is excluded with zero-comparison-base', () => {
  const result = StorePortfolio.performanceEligibility(eligibleRecord({
    productivityEvolution: { value: null, status: 'unavailable', reason: 'zero-comparison-base' }
  }));
  assert.equal(result.reason, 'zero-comparison-base');
});

check('Missing Current CC excludes a store', () => {
  assert.equal(StorePortfolio.performanceEligibility(eligibleRecord({ currentCustomerContributionPct: null })).reason, 'missing-current-cc');
});

check('Missing Current Productivity excludes a store', () => {
  assert.equal(StorePortfolio.performanceEligibility(eligibleRecord({ currentProductivity: null })).reason, 'missing-current-productivity');
});

check('Performance exclusions are counted by canonical reason', () => {
  const result = StorePortfolio.buildPerformanceDataset([
    eligibleRecord(),
    eligibleRecord({ terminal: 'T-2', comparisonStatus: 'new-store' }),
    eligibleRecord({ terminal: 'T-3', currentCustomerContributionPct: null })
  ]);
  assert.deepEqual(result.counts, {
    total: 3,
    eligible: 1,
    excluded: 2,
    excludedByReason: { 'new-store': 1, 'missing-current-cc': 1 }
  });
});

check('Integrated Performance dataset uses the Current filter scope', () => {
  const region = model.detail.current.stores[0].region;
  const result = service.getPerformancePortfolio({ region });
  assert.equal(result.counts.total, service.getStores('current', { region }).length);
  assert.equal(result.counts.eligible + result.counts.excluded, result.counts.total);
  assert.equal(Number.isFinite(result.medianCustomerContributionPct), true);
});

check('Integrated DA HC efficiency dataset contains only Current-scope records', () => {
  const city = model.detail.current.stores[0].city;
  const result = service.getHeadcountEfficiency({ city });
  assert.equal(result.records.length, service.getStores('current', { city }).length);
  assert.equal(result.distribution.counts.total, result.records.length);
  assert.equal(result.records.every(record => record.city === city), true);
});

check('Filtered eligible median CC percentage handles odd samples', () => {
  assert.equal(StorePortfolio.median([0.1, 0.3, 0.2]), 0.2);
});

check('Filtered eligible median CC percentage handles even samples', () => {
  assert.equal(StorePortfolio.median([0.1, 0.4, 0.2, 0.3]), 0.25);
});

check('Filtered eligible median CC percentage is null for an empty set', () => {
  assert.equal(StorePortfolio.median([null, NaN]), null);
});

check('Distribution statistics use Tukey halves for odd samples', () => {
  assert.deepEqual(StorePortfolio.distributionStatistics([1, 2, 3, 4, 5]), {
    count: 5, median: 3, q1: 1.5, q3: 4.5, iqr: 3
  });
});

check('Distribution statistics use Tukey halves for even samples', () => {
  assert.deepEqual(StorePortfolio.distributionStatistics([1, 2, 3, 4]), {
    count: 4, median: 2.5, q1: 1.5, q3: 3.5, iqr: 2
  });
});

check('Two-point sample has defined quartiles', () => {
  assert.deepEqual(StorePortfolio.distributionStatistics([10, 20]), {
    count: 2, median: 15, q1: 10, q3: 20, iqr: 10
  });
});

check('Duplicate Productivity values remain valid observations', () => {
  assert.deepEqual(StorePortfolio.distributionStatistics([5, 5, 5, 5]), {
    count: 4, median: 5, q1: 5, q3: 5, iqr: 0
  });
});

check('Single-point sample has zero IQR', () => {
  assert.deepEqual(StorePortfolio.distributionStatistics([7]), {
    count: 1, median: 7, q1: 7, q3: 7, iqr: 0
  });
});

check('Empty sample has null descriptive statistics', () => {
  assert.deepEqual(StorePortfolio.distributionStatistics([]), {
    count: 0, median: null, q1: null, q3: null, iqr: null
  });
});

check('Empty DA HC dataset has no groups and zero counts', () => {
  const result = StorePortfolio.buildHeadcountDistribution([]);
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.adjacentOverlaps, []);
  assert.deepEqual(result.counts, {
    total: 0, eligible: 0, excluded: 0, excludedByReason: {}
  });
});

check('DA HC distribution groups stores and preserves counts', () => {
  const result = StorePortfolio.buildHeadcountDistribution([
    { currentDAHeadcount: 2, currentProductivity: 10 },
    { currentDAHeadcount: 2, currentProductivity: 20 },
    { currentDAHeadcount: 3, currentProductivity: 15 }
  ]);
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].count, 2);
  assert.equal(result.counts.eligible, 3);
});

check('Adjacent DA HC groups expose descriptive IQR overlap metadata', () => {
  const result = StorePortfolio.adjacentIqrOverlaps([
    { daHeadcount: 2, q1: 10, q3: 20 },
    { daHeadcount: 3, q1: 15, q3: 25 }
  ])[0];
  assert.deepEqual(result, {
    lowerHeadcount: 2,
    higherHeadcount: 3,
    overlaps: true,
    overlapStart: 15,
    overlapEnd: 20,
    overlapWidth: 5
  });
});

check('Non-overlapping DA HC groups never receive a fabricated overlap range', () => {
  const result = StorePortfolio.adjacentIqrOverlaps([
    { daHeadcount: 2, q1: 10, q3: 20 },
    { daHeadcount: 3, q1: 30, q3: 40 }
  ])[0];
  assert.equal(result.overlaps, false);
  assert.equal(result.overlapStart, null);
  assert.equal(result.overlapEnd, null);
  assert.equal(result.overlapWidth, 0);
});

console.log(`\n${passed}/${passed} store portfolio checks passed.`);
