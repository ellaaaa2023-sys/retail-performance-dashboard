(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RetailStoreDetail = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KPI_DEFINITIONS = Object.freeze([
    Object.freeze({ key: 'grossSales', label: 'Gross Sales', type: 'amount' }),
    Object.freeze({ key: 'netSales', ratioKey: 'netSalesPct', label: 'CA Net', type: 'combined' }),
    Object.freeze({ key: 'grossMargin', ratioKey: 'grossMarginPct', label: 'Gross Margin', type: 'combined' }),
    Object.freeze({ key: 'customerContribution', ratioKey: 'customerContributionPct', label: 'Customer Contribution', type: 'combined' })
  ]);

  const AP_COMPONENT_DEFINITIONS = Object.freeze([
    Object.freeze({ key: 'tradeRelation', label: 'Trade Relation' }),
    Object.freeze({ key: 'customerSamples', label: 'Customer Samples' }),
    Object.freeze({ key: 'promotionalGifts', label: 'Promotional Gifts' }),
    Object.freeze({ key: 'posAdvertisingAmortization', label: 'POS Advertising Amortization' }),
    Object.freeze({ key: 'posAdvertisingExpense', label: 'POS Advertising' }),
    Object.freeze({ key: 'merchandising', label: 'Merchandising' }),
    Object.freeze({ key: 'animations', label: 'Animations' }),
    Object.freeze({ key: 'tester', label: 'Tester' }),
    Object.freeze({ key: 'daCostAndSpecificDevelopment', label: 'DA Cost + Specific Development' }),
    Object.freeze({ key: 'otherAP', label: 'Others' })
  ]);

  function metric(store, key) {
    const value = store && store.metrics ? store.metrics[key] : null;
    return Number.isFinite(value) ? value : null;
  }

  function amountRatioDisplay(amount, ratio) {
    return {
      type: 'amount-ratio-inline',
      amount: Number.isFinite(amount) ? amount : null,
      ratio: Number.isFinite(ratio) ? ratio : null
    };
  }

  function buildKpiModels(current, comparison, ratioVariance) {
    return KPI_DEFINITIONS.map(definition => {
      const ratioKey = definition.type === 'ratio' ? definition.key : definition.ratioKey;
      const currentAmount = definition.type === 'ratio' ? null : metric(current, definition.key);
      const comparisonAmount = definition.type === 'ratio' ? null : metric(comparison, definition.key);
      const currentRatio = ratioKey ? metric(current, ratioKey) : null;
      const comparisonRatio = ratioKey ? metric(comparison, ratioKey) : null;
      const ratioDelta = ratioKey && typeof ratioVariance === 'function'
        ? ratioVariance(currentRatio, comparisonRatio)
        : null;
      const amountGrowth = definition.type === 'amount' && Number.isFinite(currentAmount) && Number.isFinite(comparisonAmount) && Math.abs(comparisonAmount) > 1e-12
        ? (currentAmount - comparisonAmount) / Math.abs(comparisonAmount)
        : null;
      return {
        ...definition,
        currentAmount,
        comparisonAmount,
        currentRatio,
        comparisonRatio,
        display: definition.type === 'combined' ? amountRatioDisplay(currentAmount, currentRatio) : null,
        comparisonDisplay: definition.type === 'combined' ? amountRatioDisplay(comparisonAmount, comparisonRatio) : null,
        variance: ratioKey ? ratioDelta : amountGrowth,
        hasComparison: Boolean(comparison)
      };
    });
  }

  function signedApExpense(store) {
    const value = store && store.pnl ? store.pnl.specificAP : null;
    return Number.isFinite(value) ? value : null;
  }

  function apSpendMagnitude(store) {
    const signed = signedApExpense(store);
    return Number.isFinite(signed) ? Math.abs(signed) : null;
  }

  function buildApExpenseModel(current, comparison) {
    const currentSigned = signedApExpense(current);
    const comparisonSigned = signedApExpense(comparison);
    const currentSpend = apSpendMagnitude(current);
    const comparisonSpend = apSpendMagnitude(comparison);
    return {
      currentSigned,
      comparisonSigned,
      currentSpend,
      comparisonSpend,
      movement: Number.isFinite(currentSpend) && Number.isFinite(comparisonSpend)
        ? currentSpend - comparisonSpend
        : null,
      hasComparison: Boolean(comparison)
    };
  }

  function apComponentSpend(store, key) {
    const value = store && store.pnl ? store.pnl[key] : null;
    return Number.isFinite(value) ? Math.abs(value) : 0;
  }

  function buildApComponentModel(current, comparison) {
    const components = AP_COMPONENT_DEFINITIONS.map(definition => ({
      ...definition,
      current: apComponentSpend(current, definition.key),
      comparison: comparison ? apComponentSpend(comparison, definition.key) : null
    }));
    const currentPool = components.reduce((sum, component) => sum + component.current, 0);
    const comparisonPool = comparison
      ? components.reduce((sum, component) => sum + component.comparison, 0)
      : null;
    return {
      components: components.map(component => ({
        ...component,
        currentShare: currentPool > 0 ? component.current / currentPool : null,
        comparisonShare: comparisonPool > 0 ? component.comparison / comparisonPool : null,
        movement: comparison ? component.current - component.comparison : null
      })),
      currentPool,
      comparisonPool,
      canonicalCurrentSpend: apSpendMagnitude(current),
      canonicalComparisonSpend: comparison ? apSpendMagnitude(comparison) : null,
      hasComparison: Boolean(comparison),
      formalTotalKey: 'specificAP'
    };
  }

  function buildApComponentBridge(componentModel) {
    if (!componentModel || !componentModel.hasComparison) return null;
    let running = componentModel.comparisonPool;
    const steps = componentModel.components.map(component => {
      const start = running;
      running += component.movement;
      return {
        key: component.key,
        label: component.label,
        start,
        end: running,
        movement: component.movement
      };
    });
    return {
      comparisonPool: componentModel.comparisonPool,
      currentPool: componentModel.currentPool,
      calculatedCurrentPool: running,
      steps,
      canonicalCurrentSpend: componentModel.canonicalCurrentSpend,
      canonicalComparisonSpend: componentModel.canonicalComparisonSpend,
      formalTotalKey: componentModel.formalTotalKey
    };
  }

  function buildPnlRatioModel(field, currentAmount, currentPnl, comparisonAmount, comparisonPnl, finance) {
    const calculateLineRatio = finance && finance.calculateLineRatio;
    const ratioVariance = finance && finance.ratioVariance;
    const currentRatio = typeof calculateLineRatio === 'function'
      ? calculateLineRatio(field, currentAmount, currentPnl)
      : null;
    const comparisonRatio = typeof calculateLineRatio === 'function'
      ? calculateLineRatio(field, comparisonAmount, comparisonPnl)
      : null;
    return {
      currentRatio,
      comparisonRatio,
      ratioVariance: typeof ratioVariance === 'function'
        ? ratioVariance(currentRatio, comparisonRatio)
        : null
    };
  }

  return Object.freeze({
    KPI_DEFINITIONS,
    AP_COMPONENT_DEFINITIONS,
    amountRatioDisplay,
    buildKpiModels,
    signedApExpense,
    apSpendMagnitude,
    buildApExpenseModel,
    apComponentSpend,
    buildApComponentModel,
    buildApComponentBridge,
    buildPnlRatioModel
  });
}));
