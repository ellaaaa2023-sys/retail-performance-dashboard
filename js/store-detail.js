(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RetailStoreDetail = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORE_PNL_AMOUNT_TOLERANCE_KRMB = 3;

  const KPI_DEFINITIONS = Object.freeze([
    Object.freeze({ key: 'grossSales', label: 'Gross Sales', type: 'amount' }),
    Object.freeze({ key: 'netSales', ratioKey: 'netSalesPct', label: 'CA Net', type: 'combined' }),
    Object.freeze({ key: 'grossMargin', ratioKey: 'grossMarginPct', label: 'Gross Margin', type: 'combined' }),
    Object.freeze({ key: 'customerContribution', ratioKey: 'customerContributionPct', label: 'Customer Contribution', type: 'combined' })
  ]);

  const AP_COMPONENT_DEFINITIONS = Object.freeze([
    Object.freeze({ key: 'transactionalMediaSpecificLine', label: 'Transactional media specific' }),
    Object.freeze({ key: 'customerSamples', label: 'Customer Samples' }),
    Object.freeze({ key: 'livestreamersLine', label: 'Livestreamers' }),
    Object.freeze({ key: 'eShopInShopWebsitesLine', label: 'E-shop in shop websites' }),
    Object.freeze({ key: 'promotionalGifts', label: 'Total Promotional gift cost' }),
    Object.freeze({ key: 'otherPromotionsLine', label: 'Other promotions' }),
    Object.freeze({ key: 'animationsTowardDistributor', label: 'Animations toward the distributor' }),
    Object.freeze({ key: 'animationsImmoPosAdv', label: 'Animations of immo POS adv' }),
    Object.freeze({ key: 'otherPosAdvertising', label: 'Other POS advertising costs' }),
    Object.freeze({ key: 'specificDevelopmentSubtotal', label: 'Specific development', breakdownKeys: Object.freeze(['daCost', 'nonDaCost']) })
  ]);

  const STORE_PNL_LINE_DEFINITIONS = Object.freeze([
    Object.freeze({ key: 'daHeadcount', label: 'DA HC', className: 'operational', type: 'headcount' }),
    Object.freeze({ key: 'grossSales', label: 'GROSS SALES', className: 'major' }),
    Object.freeze({ key: 'discount', label: 'Discount', indent: 1 }),
    Object.freeze({ key: 'rebates', label: 'Rebates', indent: 1 }),
    Object.freeze({ key: 'promotionalAllowance', label: 'Promotional Allowance', indent: 1 }),
    Object.freeze({ key: 'totalReturns', label: 'Actual Returns', indent: 1 }),
    Object.freeze({ key: 'vipRedemption', label: 'VIP Redemption', indent: 1 }),
    Object.freeze({ key: 'oca', label: 'OCA', indent: 1 }),
    Object.freeze({ key: 'coupon', label: 'Coupon', indent: 1 }),
    Object.freeze({ key: 'totalMinorations', label: 'TOTAL MINORATIONS', className: 'total' }),
    Object.freeze({ key: 'netSales', label: 'CONSO NET SALES', className: 'major' }),
    Object.freeze({ key: 'stdCos', label: 'Std COS', indent: 1 }),
    Object.freeze({ key: 'royalTaMs', label: 'Royal / TA / MS', indent: 1 }),
    Object.freeze({ key: 'physicalDistribution', label: 'Physical Distribution', indent: 1 }),
    Object.freeze({ key: 'specialOperationsCost', label: 'Special Operations Cost', indent: 1 }),
    Object.freeze({ key: 'obsoleteSlowMovingReturns', label: 'Obsolete / Slow Moving / Return', indent: 1 }),
    Object.freeze({ key: 'grossMargin', label: 'GROSS MARGIN', className: 'major' }),
    Object.freeze({ key: 'transactionalMediaSpecificLine', label: 'Transactional media specific', indent: 1 }),
    Object.freeze({ key: 'customerSamples', label: 'Customer Samples', indent: 1 }),
    Object.freeze({ key: 'livestreamersLine', label: 'Livestreamers', indent: 1 }),
    Object.freeze({ key: 'eShopInShopWebsitesLine', label: 'E-shop in shop websites', indent: 1 }),
    Object.freeze({ key: 'promotionalGifts', label: 'Total Promotional gift cost', indent: 1 }),
    Object.freeze({ key: 'otherPromotionsLine', label: 'Other promotions', indent: 1 }),
    Object.freeze({ key: 'animationsTowardDistributor', label: 'Animations toward the distributor', indent: 1 }),
    Object.freeze({ key: 'animationsImmoPosAdv', label: 'Animations of immo POS adv', indent: 1 }),
    Object.freeze({ key: 'otherPosAdvertising', label: 'Other POS advertising costs', indent: 1 }),
    Object.freeze({ key: 'specificDevelopmentSubtotal', label: 'Specific development', className: 'subtotal' }),
    Object.freeze({ key: 'daCost', label: 'DA Cost', className: 'subdetail', indent: 2 }),
    Object.freeze({ key: 'nonDaCost', label: 'Non DA Cost', className: 'subdetail', indent: 2 }),
    Object.freeze({ key: 'specificAP', label: 'Specific A&P', className: 'subtotal' }),
    Object.freeze({ key: 'specificSga', label: 'Total Specific SG&A', className: 'subtotal' }),
    Object.freeze({ key: 'totalSpecificCosts', label: 'Total Specific Costs', className: 'group' }),
    Object.freeze({ key: 'customerContribution', label: 'CUSTOMER CONTRIBUTION', className: 'major' }),
    Object.freeze({ key: 'nonSpecificCosts', labelKey: 'totalNonSpecificCosts', label: 'Total non-specific costs', className: 'group' }),
    Object.freeze({ key: 'operatingProfit', label: 'OPERATING PROFIT', className: 'major' })
  ]);

  const STORE_PNL_HIERARCHIES = Object.freeze({
    specificDevelopmentSubtotal: Object.freeze(['daCost', 'nonDaCost']),
    specificAP: Object.freeze(AP_COMPONENT_DEFINITIONS.map(definition => definition.key)),
    totalSpecificCosts: Object.freeze(['specificAP', 'specificSga']),
    customerContribution: Object.freeze(['grossMargin', 'totalSpecificCosts']),
    operatingProfit: Object.freeze(['customerContribution', 'nonSpecificCosts'])
  });

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

  function apComponentPeriod(store, definition) {
    if (!store) return null;
    const signed = store.pnl && Number.isFinite(store.pnl[definition.key]) ? store.pnl[definition.key] : null;
    const structuralFields = store.pnlMetadata && Array.isArray(store.pnlMetadata.structuralZeroFields)
      ? store.pnlMetadata.structuralZeroFields
      : [];
    const sourceStatus = structuralFields.includes(definition.key)
      ? 'structural-placeholder'
      : (Number.isFinite(signed) ? 'available' : 'unavailable');
    const breakdown = definition.breakdownKeys
      ? definition.breakdownKeys.map(key => ({
        key,
        signed: store.pnl && Number.isFinite(store.pnl[key]) ? store.pnl[key] : null,
        spend: store.pnl && Number.isFinite(store.pnl[key]) ? Math.abs(store.pnl[key]) : null
      }))
      : [];
    return {
      signed,
      spend: Number.isFinite(signed) ? Math.abs(signed) : null,
      sourceStatus,
      breakdown
    };
  }

  function reconcileApComponents(store, periods) {
    const formalSigned = signedApExpense(store);
    const allFinite = periods.every(period => period && Number.isFinite(period.signed));
    const componentSignedTotal = allFinite
      ? periods.reduce((sum, period) => sum + period.signed, 0)
      : null;
    const residual = Number.isFinite(formalSigned) && Number.isFinite(componentSignedTotal)
      ? formalSigned - componentSignedTotal
      : null;
    const structuralPlaceholderKeys = AP_COMPONENT_DEFINITIONS
      .filter((definition, index) => periods[index] && periods[index].sourceStatus === 'structural-placeholder')
      .map(definition => definition.key);
    const withinTolerance = Number.isFinite(residual)
      ? Math.abs(residual) <= STORE_PNL_AMOUNT_TOLERANCE_KRMB
      : false;
    let status = 'unavailable';
    if (Number.isFinite(residual)) {
      if (!withinTolerance) status = 'error';
      else if (structuralPlaceholderKeys.length) status = 'partial-source';
      else if (Math.abs(residual) > 1e-12) status = 'rounding';
      else status = 'reconciled';
    }
    return {
      status,
      ok: withinTolerance,
      complete: allFinite && !structuralPlaceholderKeys.length,
      formalSigned,
      componentSignedTotal,
      residual,
      tolerance: STORE_PNL_AMOUNT_TOLERANCE_KRMB,
      structuralPlaceholderKeys
    };
  }

  function buildApComponentModel(current, comparison) {
    const currentPeriods = AP_COMPONENT_DEFINITIONS.map(definition => apComponentPeriod(current, definition));
    const comparisonPeriods = comparison
      ? AP_COMPONENT_DEFINITIONS.map(definition => apComponentPeriod(comparison, definition))
      : null;
    const currentPool = currentPeriods.every(period => period && Number.isFinite(period.spend))
      ? currentPeriods.reduce((sum, period) => sum + period.spend, 0)
      : null;
    const comparisonPool = comparisonPeriods && comparisonPeriods.every(period => period && Number.isFinite(period.spend))
      ? comparisonPeriods.reduce((sum, period) => sum + period.spend, 0)
      : null;
    const components = AP_COMPONENT_DEFINITIONS.map((definition, index) => {
      const currentPeriod = currentPeriods[index];
      const comparisonPeriod = comparisonPeriods ? comparisonPeriods[index] : null;
      return {
        ...definition,
        current: currentPeriod.spend,
        comparison: comparisonPeriod ? comparisonPeriod.spend : null,
        currentSigned: currentPeriod.signed,
        comparisonSigned: comparisonPeriod ? comparisonPeriod.signed : null,
        currentSourceStatus: currentPeriod.sourceStatus,
        comparisonSourceStatus: comparisonPeriod ? comparisonPeriod.sourceStatus : 'no-comparison',
        currentBreakdown: currentPeriod.breakdown,
        comparisonBreakdown: comparisonPeriod ? comparisonPeriod.breakdown : [],
        currentShare: Number.isFinite(currentPool) && currentPool > 0 && Number.isFinite(currentPeriod.spend)
          ? currentPeriod.spend / currentPool
          : null,
        comparisonShare: Number.isFinite(comparisonPool) && comparisonPool > 0 && comparisonPeriod && Number.isFinite(comparisonPeriod.spend)
          ? comparisonPeriod.spend / comparisonPool
          : null,
        movement: comparisonPeriod && Number.isFinite(currentPeriod.spend) && Number.isFinite(comparisonPeriod.spend)
          ? currentPeriod.spend - comparisonPeriod.spend
          : null
      };
    });
    return {
      components,
      currentPool,
      comparisonPool,
      canonicalCurrentSpend: apSpendMagnitude(current),
      canonicalComparisonSpend: comparison ? apSpendMagnitude(comparison) : null,
      hasComparison: Boolean(comparison),
      formalTotalKey: 'specificAP',
      reconciliation: {
        current: reconcileApComponents(current, currentPeriods),
        comparison: comparisonPeriods ? reconcileApComponents(comparison, comparisonPeriods) : null
      }
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

  function buildStorePnlRows(current, comparison, finance) {
    return STORE_PNL_LINE_DEFINITIONS.map(definition => {
      const currentAmount = current && current.pnl && Number.isFinite(current.pnl[definition.key])
        ? current.pnl[definition.key]
        : null;
      const comparisonAmount = comparison && comparison.pnl && Number.isFinite(comparison.pnl[definition.key])
        ? comparison.pnl[definition.key]
        : null;
      if (definition.type === 'headcount') {
        return {
          ...definition,
          currentAmount,
          comparisonAmount,
          amountVariance: Number.isFinite(currentAmount) && Number.isFinite(comparisonAmount)
            ? currentAmount - comparisonAmount
            : null,
          currentRatio: null,
          comparisonRatio: null,
          ratioVariance: null
        };
      }
      const ratios = buildPnlRatioModel(
        definition.key,
        currentAmount,
        current && current.pnl,
        comparisonAmount,
        comparison && comparison.pnl,
        finance
      );
      return {
        ...definition,
        currentAmount,
        comparisonAmount,
        amountVariance: Number.isFinite(currentAmount) && Number.isFinite(comparisonAmount)
          ? currentAmount - comparisonAmount
          : null,
        ...ratios
      };
    });
  }

  function reconciliationResult(parent, children, valueKey, tolerance) {
    const values = [parent, ...children].map(row => row && row[valueKey]);
    if (!values.every(Number.isFinite)) {
      return { ok: false, status: 'unavailable', residual: null, tolerance };
    }
    const residual = children.reduce((total, row) => total + row[valueKey], 0) - parent[valueKey];
    return {
      ok: Math.abs(residual) <= tolerance,
      status: Math.abs(residual) <= tolerance ? 'reconciled' : 'outOfTolerance',
      residual,
      tolerance
    };
  }

  function buildStorePnlReconciliation(rows, amountTolerance, ratioTolerance) {
    const byKey = new Map(rows.map(row => [row.key, row]));
    const netSales = byKey.get('netSales');
    const ratioToleranceFor = (amountKey) => {
      const denominator = netSales && netSales[amountKey];
      return Number.isFinite(denominator) && Math.abs(denominator) > 1e-12
        ? Math.max(ratioTolerance, amountTolerance / Math.abs(denominator))
        : ratioTolerance;
    };
    const currentRatioTolerance = ratioToleranceFor('currentAmount');
    const comparisonRatioTolerance = ratioToleranceFor('comparisonAmount');
    const movementRatioTolerance = currentRatioTolerance + comparisonRatioTolerance;
    return Object.freeze(Object.fromEntries(Object.entries(STORE_PNL_HIERARCHIES).map(([parentKey, childKeys]) => {
      const parent = byKey.get(parentKey);
      const children = childKeys.map(key => byKey.get(key));
      return [parentKey, Object.freeze({
        parent: parentKey,
        children: childKeys.slice(),
        currentAmount: reconciliationResult(parent, children, 'currentAmount', amountTolerance),
        comparisonAmount: reconciliationResult(parent, children, 'comparisonAmount', amountTolerance),
        amountVariance: reconciliationResult(parent, children, 'amountVariance', amountTolerance),
        currentRatio: reconciliationResult(parent, children, 'currentRatio', currentRatioTolerance),
        comparisonRatio: reconciliationResult(parent, children, 'comparisonRatio', comparisonRatioTolerance),
        ratioVariance: reconciliationResult(parent, children, 'ratioVariance', movementRatioTolerance)
      })];
    })));
  }

  return Object.freeze({
    KPI_DEFINITIONS,
    AP_COMPONENT_DEFINITIONS,
    STORE_PNL_AMOUNT_TOLERANCE_KRMB,
    STORE_PNL_LINE_DEFINITIONS,
    STORE_PNL_HIERARCHIES,
    amountRatioDisplay,
    buildKpiModels,
    signedApExpense,
    apSpendMagnitude,
    buildApExpenseModel,
    buildApComponentModel,
    buildApComponentBridge,
    buildPnlRatioModel,
    buildStorePnlRows,
    buildStorePnlReconciliation
  });
}));
