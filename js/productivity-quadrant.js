(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RetailProductivityQuadrant = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUADRANTS = Object.freeze({
    STAR: 'Star',
    RISK: 'Risk',
    BALANCED_HIGH: 'Balanced High',
    BALANCED_LOW: 'Balanced Low'
  });

  const QUADRANT_ORDER = Object.freeze([
    QUADRANTS.STAR,
    QUADRANTS.RISK,
    QUADRANTS.BALANCED_HIGH,
    QUADRANTS.BALANCED_LOW
  ]);

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function apSpendMagnitude(store) {
    const signedSpecificAP = store && store.pnl ? store.pnl.specificAP : null;
    return Number.isFinite(signedSpecificAP) ? Math.abs(signedSpecificAP) : null;
  }

  function classifyQuadrant(customerContribution, expenseMagnitude, medianCC, medianExpense) {
    const highCC = customerContribution >= medianCC;
    const highExpense = expenseMagnitude >= medianExpense;
    if (highCC && !highExpense) return QUADRANTS.STAR;
    if (!highCC && highExpense) return QUADRANTS.RISK;
    if (highCC && highExpense) return QUADRANTS.BALANCED_HIGH;
    return QUADRANTS.BALANCED_LOW;
  }

  function summarizeQuadrants(points) {
    const counts = Object.fromEntries(QUADRANT_ORDER.map(quadrant => [quadrant, 0]));
    points.forEach(point => {
      if (Object.prototype.hasOwnProperty.call(counts, point.quadrant)) counts[point.quadrant] += 1;
    });
    return counts;
  }

  function filterQuadrantPoints(points, selectedQuadrant) {
    return QUADRANT_ORDER.includes(selectedQuadrant)
      ? points.filter(point => point.quadrant === selectedQuadrant)
      : points.slice();
  }

  function buildQuadrantModel(stores) {
    const basePoints = stores.map(store => ({
      store,
      customerContribution: store && store.metrics ? store.metrics.customerContribution : null,
      expenseMagnitude: apSpendMagnitude(store)
    })).filter(point => Number.isFinite(point.customerContribution) && Number.isFinite(point.expenseMagnitude));
    const medianCC = median(basePoints.map(point => point.customerContribution));
    const medianExpense = median(basePoints.map(point => point.expenseMagnitude));
    const points = basePoints.map(point => ({
      ...point,
      quadrant: classifyQuadrant(point.customerContribution, point.expenseMagnitude, medianCC, medianExpense)
    }));
    return { points, medianCC, medianExpense, counts: summarizeQuadrants(points) };
  }

  function percentileRanks(values) {
    const ranked = values.map((value, index) => ({ value, index }))
      .filter(item => Number.isFinite(item.value))
      .sort((left, right) => left.value - right.value || left.index - right.index);
    const result = values.map(() => null);
    if (!ranked.length) return result;
    if (ranked.length === 1) {
      result[ranked[0].index] = 0.5;
      return result;
    }
    let start = 0;
    while (start < ranked.length) {
      let end = start;
      while (end + 1 < ranked.length && ranked[end + 1].value === ranked[start].value) end += 1;
      const percentile = ((start + end) / 2) / (ranked.length - 1);
      for (let index = start; index <= end; index += 1) result[ranked[index].index] = percentile;
      start = end + 1;
    }
    return result;
  }

  function buildRiskRanking(stores) {
    const model = buildQuadrantModel(stores);
    const expensePercentiles = percentileRanks(model.points.map(point => point.expenseMagnitude));
    const ccPercentiles = percentileRanks(model.points.map(point => point.customerContribution));
    return model.points.map((point, index) => ({
      ...point,
      expensePercentile: expensePercentiles[index],
      ccPercentile: ccPercentiles[index],
      riskScore: 0.5 * expensePercentiles[index] + 0.5 * (1 - ccPercentiles[index])
    })).filter(point => point.quadrant === QUADRANTS.RISK)
      .sort((left, right) => right.riskScore - left.riskScore
        || right.expenseMagnitude - left.expenseMagnitude
        || left.customerContribution - right.customerContribution
        || String(left.store.terminal || '').localeCompare(String(right.store.terminal || '')));
  }

  function currentScopeStores(stores, filters) {
    const active = filters || {};
    const keys = ['region', 'city', 'status', 'productivityTier'];
    return stores.filter(store => keys.every(key => {
      const expected = String(active[key] == null ? '' : active[key]).trim();
      return !expected || expected.toLowerCase() === 'all' || String(store[key] == null ? '' : store[key]) === expected;
    }));
  }

  function matchMovementStores(currentStores, comparisonStores, filters) {
    const comparisonByTerminal = new Map(comparisonStores
      .filter(store => store && store.terminal)
      .map(store => [String(store.terminal), store]));
    return currentScopeStores(currentStores, filters).map(current => ({
      current,
      comparison: comparisonByTerminal.get(String(current.terminal)) || null
    })).filter(pair => pair.comparison);
  }

  function buildMovementModel(currentStores, comparisonStores, filters) {
    const matched = matchMovementStores(currentStores, comparisonStores, filters)
      .map(pair => ({
        ...pair,
        currentCC: pair.current && pair.current.metrics ? pair.current.metrics.customerContribution : null,
        comparisonCC: pair.comparison && pair.comparison.metrics ? pair.comparison.metrics.customerContribution : null,
        currentExpense: apSpendMagnitude(pair.current),
        comparisonExpense: apSpendMagnitude(pair.comparison)
      })).filter(pair => [pair.currentCC, pair.comparisonCC, pair.currentExpense, pair.comparisonExpense].every(Number.isFinite));
    const pooledMedianCC = median(matched.flatMap(pair => [pair.comparisonCC, pair.currentCC]));
    const pooledMedianExpense = median(matched.flatMap(pair => [pair.comparisonExpense, pair.currentExpense]));
    const pairs = matched.map(pair => {
      const comparisonQuadrant = classifyQuadrant(pair.comparisonCC, pair.comparisonExpense, pooledMedianCC, pooledMedianExpense);
      const currentQuadrant = classifyQuadrant(pair.currentCC, pair.currentExpense, pooledMedianCC, pooledMedianExpense);
      return {
        ...pair,
        comparisonQuadrant,
        currentQuadrant,
        transition: `${comparisonQuadrant} → ${currentQuadrant}`,
        changed: comparisonQuadrant !== currentQuadrant
      };
    });
    const summary = {
      matched: pairs.length,
      changed: pairs.filter(pair => pair.changed).length,
      stayed: pairs.filter(pair => !pair.changed).length,
      riskToStar: pairs.filter(pair => pair.comparisonQuadrant === QUADRANTS.RISK && pair.currentQuadrant === QUADRANTS.STAR).length,
      riskToNonRisk: pairs.filter(pair => pair.comparisonQuadrant === QUADRANTS.RISK && pair.currentQuadrant !== QUADRANTS.RISK).length,
      nonRiskToRisk: pairs.filter(pair => pair.comparisonQuadrant !== QUADRANTS.RISK && pair.currentQuadrant === QUADRANTS.RISK).length,
      starToNonStar: pairs.filter(pair => pair.comparisonQuadrant === QUADRANTS.STAR && pair.currentQuadrant !== QUADRANTS.STAR).length
    };
    return { pairs, pooledMedianCC, pooledMedianExpense, summary };
  }

  return Object.freeze({
    QUADRANTS,
    QUADRANT_ORDER,
    median,
    apSpendMagnitude,
    classifyQuadrant,
    summarizeQuadrants,
    filterQuadrantPoints,
    buildQuadrantModel,
    percentileRanks,
    buildRiskRanking,
    currentScopeStores,
    matchMovementStores,
    buildMovementModel
  });
}));
