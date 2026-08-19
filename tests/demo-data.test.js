'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const DataLayer = require('../js/data/core-data.js');
const PreparationUI = require('../js/data/data-preparation-ui.js');
const Quadrant = require('../js/productivity-quadrant.js');
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

check(7, 'Quadrant and Risk views contain differentiated stores', () => {
  const current = service.getStores('current', {});
  const quadrant = Quadrant.buildQuadrantModel(current);
  Object.values(quadrant.counts).forEach(count => assert.ok(count > 0));
  assert.ok(Quadrant.buildRiskRanking(current).length > 0);
});

check(8, 'Movement contains improving and deteriorating transitions', () => {
  const movement = Quadrant.buildMovementModel(service.getStores('current', {}), service.getStores('comparison', {}), {});
  assert.equal(movement.summary.matched, 150);
  assert.ok(movement.summary.riskToNonRisk > 0);
  assert.ok(movement.summary.nonRiskToRisk > 0);
  assert.ok(movement.summary.changed > 0);
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

console.log(`\nDemo data tests: ${passed}/${passed} passed`);
