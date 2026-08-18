'use strict';

const assert = require('node:assert/strict');
const DataLayer = require('../js/data/core-data.js');
const StoreDetail = require('../js/store-detail.js');

const results = [];
function check(number, label, test) {
  test();
  results.push(`${number}. PASS - ${label}`);
}
function store({ grossSales = 1000, netSales = 400, netSalesPct = .4, grossMargin = 280, grossMarginPct = .7, customerContribution = 100, customerContributionPct = .25, specificAP = -320 } = {}) {
  return {
    metrics: { grossSales, netSales, netSalesPct, grossMargin, grossMarginPct, customerContribution, customerContributionPct },
    pnl: { specificAP }
  };
}
function componentStore(values = {}, specificAP = -320) {
  return { metrics: {}, pnl: { specificAP, ...values } };
}
function close(actual, expected, message) {
  assert.equal(Math.abs(actual - expected) < 1e-12, true, `${message}: expected ${expected}, received ${actual}`);
}

check(1, 'Canonical signed A&P amount is Specific A&P', () => {
  assert.equal(StoreDetail.signedApExpense(store({ specificAP: -320 })), -320);
});
check(2, 'A&P spend magnitude is positive', () => {
  assert.equal(StoreDetail.apSpendMagnitude(store({ specificAP: -320 })), 320);
});
check(3, 'A&P total movement compares canonical spend magnitudes', () => {
  assert.equal(StoreDetail.buildApExpenseModel(store({ specificAP: -320 }), store({ specificAP: -280 })).movement, 40);
});
check(4, 'Legacy component composite is not used as the formal A&P total', () => {
  const current = store({ specificAP: -320 });
  current.pnl.customerSamples = -20;
  current.pnl.promotionalGifts = -30;
  current.pnl.animations = -40;
  const legacyComposite = 320 + 20 + 30 + 40;
  assert.equal(StoreDetail.buildApExpenseModel(current, null).currentSpend, 320);
  assert.notEqual(StoreDetail.buildApExpenseModel(current, null).currentSpend, legacyComposite);
});
check(5, 'CA Net variance uses ratio difference', () => {
  const models = StoreDetail.buildKpiModels(store({ netSalesPct: .395 }), store({ netSalesPct: .431 }), DataLayer.ratioVariance);
  close(models.find(item => item.key === 'netSales').variance, -.036, 'CA Net ratio variance');
});
check(6, 'Customer Contribution variance uses ratio difference', () => {
  const models = StoreDetail.buildKpiModels(store({ customerContributionPct: .22 }), store({ customerContributionPct: .18 }), DataLayer.ratioVariance);
  close(models.find(item => item.key === 'customerContribution').variance, .04, 'CC ratio variance');
});
check(7, 'Gross Margin variance uses ratio difference', () => {
  const models = StoreDetail.buildKpiModels(store({ grossMarginPct: .70 }), store({ grossMarginPct: .715 }), DataLayer.ratioVariance);
  close(models.find(item => item.key === 'grossMargin').variance, -.015, 'GM ratio variance');
});
check(8, 'Store P&L negative percentage variance is a ratio difference', () => {
  const model = StoreDetail.buildPnlRatioModel(-279, 1000, -276, 1000, DataLayer.ratioVariance);
  close(model.ratioVariance, -.003, 'negative P&L ratio variance');
});
check(9, 'New Store comparison and variances remain unavailable', () => {
  const models = StoreDetail.buildKpiModels(store(), null, DataLayer.ratioVariance);
  models.forEach(model => {
    assert.equal(model.hasComparison, false);
    assert.equal(model.comparisonAmount, null);
    assert.equal(model.comparisonRatio, null);
    assert.equal(model.variance, null);
  });
  assert.equal(StoreDetail.buildApExpenseModel(store(), null).movement, null);
});
check(10, 'Store Detail exposes exactly four KPI definitions', () => {
  assert.deepEqual(StoreDetail.KPI_DEFINITIONS.map(item => item.label), ['Gross Sales', 'CA Net', 'Gross Margin', 'Customer Contribution']);
});

check(11, 'Amount and ratio share one inline display model', () => {
  assert.deepEqual(StoreDetail.amountRatioDisplay(220, .395), {
    type: 'amount-ratio-inline', amount: 220, ratio: .395
  });
  const caNet = StoreDetail.buildKpiModels(store(), store(), DataLayer.ratioVariance)
    .find(model => model.key === 'netSales');
  assert.equal(caNet.display.type, 'amount-ratio-inline');
  const grossMargin = StoreDetail.buildKpiModels(store({ grossMargin: 148, grossMarginPct: .67 }), store({ grossMargin: 179, grossMarginPct: .703 }), DataLayer.ratioVariance)
    .find(model => model.key === 'grossMargin');
  assert.deepEqual(grossMargin.display, {
    type: 'amount-ratio-inline', amount: 148, ratio: .67
  });
  assert.deepEqual(grossMargin.comparisonDisplay, {
    type: 'amount-ratio-inline', amount: 179, ratio: .703
  });
  close(grossMargin.variance, -.033, 'GM combined card ratio variance');
});

check(12, 'A&P component set excludes the Specific A&P subtotal', () => {
  const keys = StoreDetail.AP_COMPONENT_DEFINITIONS.map(item => item.key);
  assert.equal(keys.includes('specificAP'), false);
  assert.equal(keys.includes('daCostAndSpecificDevelopment'), true);
  assert.equal(new Set(keys).size, keys.length);
});

check(13, 'A&P component model exposes amounts, shares, and movement', () => {
  const current = componentStore({ customerSamples: -20, promotionalGifts: -30 }, -320);
  const comparison = componentStore({ customerSamples: -10, promotionalGifts: -40 }, -280);
  const model = StoreDetail.buildApComponentModel(current, comparison);
  close(model.components.reduce((sum, item) => sum + (item.currentShare || 0), 0), 1, 'current component shares');
  assert.equal(model.components.find(item => item.key === 'customerSamples').movement, 10);
  assert.equal(model.components.find(item => item.key === 'promotionalGifts').movement, -10);
});

check(14, 'Component pool never overwrites canonical Specific A&P total', () => {
  const current = componentStore({ customerSamples: -20, promotionalGifts: -30 }, -320);
  const model = StoreDetail.buildApComponentModel(current, null);
  assert.equal(model.currentPool, 50);
  assert.equal(model.canonicalCurrentSpend, 320);
  assert.equal(model.formalTotalKey, 'specificAP');
});

check(15, 'A&P component bridge moves between component pools without redefining the formal total', () => {
  const current = componentStore({ customerSamples: -20, promotionalGifts: -30 }, -320);
  const comparison = componentStore({ customerSamples: -10, promotionalGifts: -40 }, -280);
  const componentModel = StoreDetail.buildApComponentModel(current, comparison);
  const bridge = StoreDetail.buildApComponentBridge(componentModel);
  close(bridge.steps.reduce((sum, step) => sum + step.movement, bridge.comparisonPool), bridge.currentPool, 'component bridge endpoint');
  close(bridge.calculatedCurrentPool, bridge.currentPool, 'calculated component pool');
  assert.equal(bridge.steps.some(step => step.key === 'specificAP'), false);
  assert.equal(bridge.canonicalCurrentSpend, 320);
  assert.equal(bridge.formalTotalKey, 'specificAP');
});

results.forEach(result => console.log(result));
console.log(`\n${results.length}/${results.length} Store Detail validation checks passed.`);
