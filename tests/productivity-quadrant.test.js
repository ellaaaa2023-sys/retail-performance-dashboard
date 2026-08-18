'use strict';

const assert = require('node:assert/strict');
const Quadrant = require('../js/productivity-quadrant.js');

const results = [];
function check(number, label, test) {
  test();
  results.push(`${number}. PASS - ${label}`);
}
function store(terminal, customerContribution, signedSpecificAP, productivityTier = 'All') {
  return {
    terminal,
    store: `Store ${terminal}`,
    region: 'East',
    city: 'Shanghai',
    status: 'Active',
    productivityTier,
    storeProductivity: 100,
    pnl: { specificAP: signedSpecificAP },
    metrics: { customerContribution, customerContributionPct: 0.2 }
  };
}
function movementStore(terminal, customerContribution, signedSpecificAP, options = {}) {
  return {
    ...store(terminal, customerContribution, signedSpecificAP, options.productivityTier || 'Core'),
    ...options,
    metrics: {
      customerContribution,
      customerContributionPct: options.customerContributionPct == null ? 0.2 : options.customerContributionPct
    },
    pnl: { specificAP: signedSpecificAP }
  };
}

check(1, 'Median handles an odd number of values', () => {
  assert.equal(Quadrant.median([9, 1, 5]), 5);
});
check(2, 'Median handles an even number of values', () => {
  assert.equal(Quadrant.median([4, 1, 3, 2]), 2.5);
});
check(3, 'Star is High CC and Low Expense', () => {
  assert.equal(Quadrant.classifyQuadrant(10, 2, 5, 5), Quadrant.QUADRANTS.STAR);
});
check(4, 'Risk is Low CC and High Expense', () => {
  assert.equal(Quadrant.classifyQuadrant(2, 10, 5, 5), Quadrant.QUADRANTS.RISK);
});
check(5, 'Balanced High is High CC and High Expense', () => {
  assert.equal(Quadrant.classifyQuadrant(10, 10, 5, 5), Quadrant.QUADRANTS.BALANCED_HIGH);
});
check(6, 'Balanced Low is Low CC and Low Expense', () => {
  assert.equal(Quadrant.classifyQuadrant(2, 2, 5, 5), Quadrant.QUADRANTS.BALANCED_LOW);
});
check(7, 'Values equal to a median use the High boundary', () => {
  assert.equal(Quadrant.classifyQuadrant(5, 5, 5, 5), Quadrant.QUADRANTS.BALANCED_HIGH);
});
check(8, 'Signed negative Specific A&P becomes positive spend magnitude', () => {
  assert.equal(Quadrant.apSpendMagnitude(store('A', 10, -500)), 500);
});
check(9, 'A Tier subset recalculates its own medians', () => {
  const stores = [
    store('A', 1, -1, 'Low'), store('B', 2, -2, 'Low'),
    store('C', 100, -100, 'High'), store('D', 102, -104, 'High')
  ];
  const all = Quadrant.buildQuadrantModel(stores);
  const tier = Quadrant.buildQuadrantModel(stores.filter(item => item.productivityTier === 'High'));
  assert.equal(all.medianCC, 51);
  assert.equal(all.medianExpense, 51);
  assert.equal(tier.medianCC, 101);
  assert.equal(tier.medianExpense, 102);
});
check(10, 'selectedDriver context does not affect the Quadrant dataset', () => {
  const stores = [store('A', 1, -4), store('B', 3, -2)];
  const withoutDriver = Quadrant.buildQuadrantModel(stores);
  const withIgnoredDriverContext = Quadrant.buildQuadrantModel(stores, { selectedDriver: 'grossMargin' });
  assert.deepEqual(withIgnoredDriverContext, withoutDriver);
});

check(11, 'Quadrant summary counts sum to the active scope count', () => {
  const model = Quadrant.buildQuadrantModel([
    store('A', 1, -8), store('B', 2, -7), store('C', 8, -2), store('D', 9, -1)
  ]);
  assert.equal(Object.values(model.counts).reduce((sum, count) => sum + count, 0), model.points.length);
});

check(12, 'Quadrant summary is recalculated after current-scope filtering', () => {
  const stores = [
    movementStore('A', 1, -8, { region: 'East' }),
    movementStore('B', 2, -7, { region: 'East' }),
    movementStore('C', 8, -2, { region: 'West' })
  ];
  const filtered = Quadrant.currentScopeStores(stores, { region: 'East' });
  const model = Quadrant.buildQuadrantModel(filtered);
  assert.equal(model.points.length, 2);
  assert.equal(Object.values(model.counts).reduce((sum, count) => sum + count, 0), 2);
});

check(13, 'selectedQuadrant changes only the displayed point subset', () => {
  const model = Quadrant.buildQuadrantModel([
    store('A', 1, -8), store('B', 2, -7), store('C', 8, -2), store('D', 9, -1)
  ]);
  const risk = Quadrant.filterQuadrantPoints(model.points, Quadrant.QUADRANTS.RISK);
  assert.equal(risk.every(point => point.quadrant === Quadrant.QUADRANTS.RISK), true);
  assert.equal(Quadrant.filterQuadrantPoints(model.points, 'all').length, model.points.length);
});

check(14, 'Percentile ranks are deterministic and average ties', () => {
  assert.deepEqual(Quadrant.percentileRanks([10, 20, 20, 40]), [0, 0.5, 0.5, 1]);
  assert.deepEqual(Quadrant.percentileRanks([10]), [0.5]);
});

check(15, 'Higher expense and lower CC produce a higher risk score', () => {
  const ranked = Quadrant.buildRiskRanking([
    store('A', 1, -100), store('B', 2, -90), store('C', 3, -80),
    store('D', 10, -30), store('E', 11, -20), store('F', 12, -10)
  ]);
  assert.equal(ranked[0].store.terminal, 'A');
  assert.equal(ranked[0].riskScore > ranked[1].riskScore, true);
});

check(16, 'Risk ranking contains only Low CC and High A&P stores', () => {
  const ranked = Quadrant.buildRiskRanking([
    store('A', 1, -100), store('B', 2, -90), store('C', 10, -20), store('D', 11, -10)
  ]);
  assert.equal(ranked.length > 0, true);
  assert.equal(ranked.every(point => point.quadrant === Quadrant.QUADRANTS.RISK), true);
});

check(17, 'Risk ranking uses terminal as a stable final tie-breaker', () => {
  const ranked = Quadrant.buildRiskRanking([
    store('B', 1, -100), store('A', 1, -100), store('C', 10, -10), store('D', 10, -10)
  ]);
  assert.deepEqual(ranked.map(point => point.store.terminal), ['A', 'B']);
});

check(18, 'Movement matches exact terminals and excludes new stores', () => {
  const current = [movementStore('A', 10, -10), movementStore('NEW', 20, -20)];
  const comparison = [movementStore('A', 5, -20), movementStore('OLD', 8, -12)];
  const pairs = Quadrant.matchMovementStores(current, comparison, {});
  assert.deepEqual(pairs.map(pair => pair.current.terminal), ['A']);
});

check(19, 'Movement pooled medians use both observations for every matched store', () => {
  const model = Quadrant.buildMovementModel(
    [movementStore('A', 10, -10), movementStore('B', 20, -20)],
    [movementStore('A', 2, -2), movementStore('B', 4, -4)],
    {}
  );
  assert.equal(model.pooledMedianCC, 7);
  assert.equal(model.pooledMedianExpense, 7);
});

check(20, 'Both movement periods classify against one pooled frame', () => {
  const model = Quadrant.buildMovementModel(
    [movementStore('A', 10, -2)],
    [movementStore('A', 2, -10)],
    {}
  );
  const pair = model.pairs[0];
  assert.equal(pair.comparisonQuadrant, Quadrant.QUADRANTS.RISK);
  assert.equal(pair.currentQuadrant, Quadrant.QUADRANTS.STAR);
  assert.equal(model.pooledMedianCC, 6);
  assert.equal(model.pooledMedianExpense, 6);
});

check(21, 'Movement transition labels identify quadrant changes', () => {
  const pair = Quadrant.buildMovementModel(
    [movementStore('A', 10, -2)],
    [movementStore('A', 2, -10)],
    {}
  ).pairs[0];
  assert.equal(pair.transition, 'Risk → Star');
  assert.equal(pair.changed, true);
});

check(22, 'Movement scope filters matched stores by current attributes', () => {
  const current = [
    movementStore('A', 10, -2, { region: 'East' }),
    movementStore('B', 8, -3, { region: 'West' })
  ];
  const comparison = [movementStore('A', 2, -10), movementStore('B', 3, -9)];
  const model = Quadrant.buildMovementModel(current, comparison, { region: 'East' });
  assert.deepEqual(model.pairs.map(pair => pair.current.terminal), ['A']);
});

check(23, 'Movement Tier filtering uses the Current store Tier', () => {
  const current = [movementStore('A', 10, -2, { productivityTier: 'Current Tier' })];
  const comparison = [movementStore('A', 2, -10, { productivityTier: 'Old Tier' })];
  assert.equal(Quadrant.buildMovementModel(current, comparison, { productivityTier: 'Current Tier' }).pairs.length, 1);
  assert.equal(Quadrant.buildMovementModel(current, comparison, { productivityTier: 'Old Tier' }).pairs.length, 0);
});

check(24, 'Risk to Star transitions are counted explicitly', () => {
  const summary = Quadrant.buildMovementModel(
    [movementStore('A', 10, -2)],
    [movementStore('A', 2, -10)],
    {}
  ).summary;
  assert.equal(summary.riskToStar, 1);
  assert.equal(summary.riskToNonRisk, 1);
  assert.equal(summary.nonRiskToRisk, 0);
});

check(25, 'Comparison-only stores are excluded from Movement', () => {
  const model = Quadrant.buildMovementModel(
    [movementStore('A', 10, -2)],
    [movementStore('A', 2, -10), movementStore('OLD', 3, -9)],
    {}
  );
  assert.equal(model.summary.matched, 1);
  assert.equal(model.pairs.some(pair => pair.comparison.terminal === 'OLD'), false);
});

results.forEach(result => console.log(result));
console.log(`\n${results.length}/${results.length} Quadrant validation checks passed.`);
