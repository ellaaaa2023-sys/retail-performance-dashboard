'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const DataLayer = require('../js/data/core-data.js');
const PreparationUI = require('../js/data/data-preparation-ui.js');
const StoreDetail = require('../js/store-detail.js');
const Generator = require('../scripts/generate-demo-data.js');

require('../js/data/demo-data.js');
const model = globalThis.RetailDemoData;
const service = DataLayer.createDataService(model);

let passed = 0;
function check(number, name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${number}. ${name}`);
}

check(1, 'Committed Demo artifact is the deterministic build output', () => {
  const expected = Generator.serializeDemoArtifact(Generator.buildDemoModel());
  assert.equal(fs.readFileSync(Generator.TARGET, 'utf8'), expected);
});

check(2, 'Demo artifact identifies its source without runtime workbook scan state', () => {
  assert.equal(model.metadata.sourceType, 'demo');
  assert.equal(model.metadata.workbookMode, 'synthetic-normalized-demo');
  assert.equal(Object.hasOwn(model.metadata, 'workbookScan'), false);
});

check(3, 'All four dashboard pages have normalized Current and Comparison data', () => {
  assert.equal(model.detail.current.stores.length, 160);
  assert.equal(model.detail.comparison.stores.length, 150);
  assert.ok(model.summary.periods.current.values);
  assert.ok(model.summary.periods.comparison.values);
  assert.equal(model.storeMatches.existing.length, 150);
  assert.equal(model.storeMatches.new.length, 10);
});

check(4, 'Demo Data Preparation copy reports sources without fake cleaning claims', () => {
  const view = PreparationUI.buildDemoPreparation(model);
  assert.equal(view.title, 'Data Ready');
  assert.equal(view.summary, 'Synthetic Demo Dataset · 2 store-level data sheets ready · 2 used in current analysis');
  assert.equal(view.period, '2026 S1 vs 2025 S1');
  assert.match(view.primarySheets[0].detail, /^Synthetic Summary/);
  assert.match(view.primarySheets[1].detail, /^160 stores · Ready$/);
  assert.match(view.primarySheets[2].detail, /^150 stores · Ready$/);
  assert.doesNotMatch(JSON.stringify(view), /workbook scanned|cleaned excel rows|cleaning completed/i);
});

check(5, 'All normalized dashboard capabilities are available', () => {
  Object.entries(model.metadata.capabilities.resolved).forEach(([key, capability]) => {
    assert.equal(capability.status, 'available', key);
  });
});

check(6, 'Customer Contribution Bridge reconciles with positive and negative drivers', () => {
  const bridge = service.getBridgeData('customerContribution', {});
  assert.equal(bridge.reconciliation.ok, true);
  assert.equal(bridge.reconciliation.residual, 0);
  assert.equal(bridge.drivers.some(driver => driver.variance > 0), true);
  assert.equal(bridge.drivers.some(driver => driver.variance < 0), true);
});

check(7, 'Performance view has 150 eligible matched stores and 10 explained New Store exclusions', () => {
  const performance = service.getPerformancePortfolio({});
  assert.equal(performance.counts.eligible, 150);
  assert.equal(performance.counts.excluded, 10);
  assert.equal(performance.counts.excludedByReason['new-store'], 10);
});

check(8, 'Performance and Efficiency views contain differentiated screening data', () => {
  const performance = service.getPerformancePortfolio({});
  assert.equal(performance.stateSummary.every(item => item.count > 0), true);
  assert.equal(performance.eligible.some(item => item.productivityEvolPct > 0), true);
  assert.equal(performance.eligible.some(item => item.productivityEvolPct < 0), true);
  const efficiency = service.getHeadcountEfficiency({}).distribution;
  assert.equal(efficiency.groups.length > 1, true);
  assert.equal(efficiency.adjacentOverlaps.some(item => item.overlaps), true);
  assert.equal(efficiency.reviewOpportunities.length > 0, true);
});

check(9, 'Store variance ranking has favorable and adverse stores', () => {
  const comparison = new Map(service.getStores('comparison', {}).map(store => [store.terminal, store]));
  const variances = service.getStores('current', {})
    .filter(store => comparison.has(store.terminal))
    .map(store => store.metrics.customerContribution - comparison.get(store.terminal).metrics.customerContribution);
  assert.equal(variances.some(value => value > 0), true);
  assert.equal(variances.some(value => value < 0), true);
});

check(10, 'Default Store Detail selection is valid and has complete P&L and A&P views', () => {
  const current = service.getStores('current', {}).find(store => store.terminal === model.metadata.defaultStoreTerminal);
  const comparison = service.getStores('comparison', {}).find(store => store.terminal === model.metadata.defaultStoreTerminal);
  assert.ok(current);
  assert.ok(comparison);
  assert.ok(Number.isFinite(current.pnl.operatingProfit));
  assert.equal(StoreDetail.buildKpiModels(current, comparison, DataLayer.ratioVariance).length, 4);
  assert.ok(StoreDetail.buildApComponentModel(current, comparison).components.length > 0);
});

check(11, 'Portfolio filters expose Region, City, Status, and Tier values', () => {
  const options = service.getFilterOptions({});
  ['region', 'city', 'status', 'productivityTier'].forEach(key => assert.ok(options[key].length > 0, key));
});

check(12, 'Summary POS and AUP retain their normalized calculation rules', () => {
  const metrics = service.getPortfolioMetrics({});
  assert.equal(metrics.current.posNo, 196);
  assert.ok(Number.isFinite(metrics.current.aup));
  assert.equal(metrics.sourceDetails.current.posNo.scope, 'actualAdjusted');
});

check(13, 'Demo exposes the shared DA HC Current and Comparison contract', () => {
  const headcount = service.getDAHeadcountSummary({});
  assert.equal(headcount.status, 'available');
  assert.equal(headcount.current.total, model.summary.periods.current.values.daHeadcount);
  assert.equal(headcount.comparison.total, model.summary.periods.comparison.values.daHeadcount);
});

check(14, 'Demo exposes shared store comparison and eligibility payloads', () => {
  const comparisons = service.getStoreComparisons({});
  const performance = service.getPerformancePortfolio({});
  assert.equal(comparisons.length, model.detail.current.stores.length);
  assert.equal(performance.counts.total, comparisons.length);
  assert.equal(Number.isFinite(performance.medianCustomerContributionPct), true);
});

check(15, 'Synthetic Performance counts are source-derived and quadrant signs remain valid', () => {
  const performance = service.getPerformancePortfolio({});
  const counts = Object.fromEntries(performance.stateSummary.map(item => [item.state, item.count]));
  assert.deepEqual(counts, {
    'healthy-growth': 79,
    'high-return-decline': 65,
    'growth-low-return': 3,
    'priority-review': 3
  });
  performance.eligible.forEach(record => {
    const x = record.currentCustomerContributionPct;
    const y = record.productivityEvolPct;
    if (record.businessState === 'healthy-growth') assert.equal(x >= 0 && y >= 0, true);
    else if (record.businessState === 'high-return-decline') assert.equal(x >= 0 && y < 0, true);
    else if (record.businessState === 'growth-low-return') assert.equal(x < 0 && y >= 0, true);
    else if (record.businessState === 'priority-review') assert.equal(x < 0 && y < 0, true);
    else assert.fail(`Unexpected business state: ${record.businessState}`);
  });
});

console.log(`\nDemo data tests: ${passed}/${passed} passed`);
