(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailDetailSchema = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const CLEANING_REQUIRED_KEYS = Object.freeze([
    'terminal', 'store', 'city', 'region',
    'grossSales', 'netSales', 'grossMargin', 'customerContribution'
  ]);
  const DASHBOARD_CORE_REQUIRED_KEYS = CLEANING_REQUIRED_KEYS;

  const AP_COMPONENT_FIELDS = Object.freeze([
    'tradeRelation',
    'customerSamples',
    'promotionalGifts',
    'posAdvertisingAmortization',
    'posAdvertisingExpense',
    'merchandising',
    'animations',
    'tester',
    'daCostAndSpecificDevelopment',
    'otherAP'
  ]);

  const FULL_STORE_PNL_FIELDS = Object.freeze([
    'grossSales', 'discount', 'rebates', 'promotionalAllowance', 'totalReturns',
    'vipRedemption', 'oca', 'coupon', 'totalMinorations', 'netSales', 'stdCos',
    'royalTaMs', 'physicalDistribution', 'specialOperationsCost',
    'obsoleteSlowMovingReturns', 'grossMargin', 'tradeRelation', 'customerSamples',
    'promotionalGifts', 'posAdvertisingAmortization', 'posAdvertisingExpense',
    'merchandising', 'animations', 'tester', 'daCost', 'specificDevelopment',
    'otherAP', 'specificAP', 'specificSga', 'customerContribution',
    'nonSpecificCosts', 'operatingProfit'
  ]);

  const CAPABILITY_RULES = Object.freeze({
    statusFilter: Object.freeze({ required: Object.freeze(['status']) }),
    posAnalytics: Object.freeze({ required: Object.freeze(['cityPosNo']) }),
    tierFilter: Object.freeze({ required: Object.freeze(['productivityTier']) }),
    minorationsAnalytics: Object.freeze({ required: Object.freeze(['grossSales', 'totalMinorations']) }),
    investmentQuadrant: Object.freeze({ required: Object.freeze(['customerContribution', 'specificAP']) }),
    productivitySummary: Object.freeze({ required: Object.freeze(['storeProductivity']) }),
    daHeadcountAnalysis: Object.freeze({ required: Object.freeze(['daHeadcount']) }),
    fullProductivityRisk: Object.freeze({
      required: Object.freeze(['customerContribution', 'specificAP', 'storeProductivity']),
      partial: Object.freeze({ mode: 'all', fields: Object.freeze(['customerContribution', 'specificAP']) })
    }),
    filteredCustomerContributionBridge: Object.freeze({
      required: Object.freeze(['grossMargin', 'specificAP', 'specificSga', 'customerContribution', 'netSales'])
    }),
    canonicalAP: Object.freeze({ required: Object.freeze(['specificAP']) }),
    apComponentAnalysis: Object.freeze({
      required: AP_COMPONENT_FIELDS,
      partial: Object.freeze({ mode: 'any', fields: AP_COMPONENT_FIELDS })
    }),
    fullStorePnl: Object.freeze({
      required: FULL_STORE_PNL_FIELDS,
      partial: Object.freeze({ mode: 'all', fields: DASHBOARD_CORE_REQUIRED_KEYS })
    })
  });

  const RAW_FIELDS = [
    ['terminal', ['Terminal'], 'text'],
    ['store', ['Store'], 'text'],
    ['city', ['City'], 'text'],
    ['region', ['Region'], 'text'],
    ['status', ['Status'], 'text'],
    ['productivityTier', ['门店单产等级'], 'text'],
    ['cityPosNo', ['城市POS数'], 'count'],
    ['storeProductivity', ['门店总单产'], 'productivity'],
    ['rsp', ['RSP'], 'amount'],
    ['grossSales', ['Gross Sales'], 'amount'],
    ['discount', ['Discount'], 'amount'],
    ['rebates', ['Rebates'], 'amount'],
    ['bomPa', ['Bom PA'], 'amount'],
    ['paRetroFunding', ['PA Retro Funding'], 'amount'],
    ['promotionalAllowance', ['TTL PA'], 'amount'],
    ['totalReturns', ['Actual Returns'], 'amount'],
    ['vipRedemption', ['VIP Redemp.'], 'amount'],
    ['oca', ['OCA'], 'amount'],
    ['coupon', ['Coupon'], 'amount'],
    ['totalMinorations', ['Total Minorations'], 'amount'],
    ['totalMinorationsPct', ['Total Minorations% of GS'], 'ratio'],
    ['netSales', ['CA NET'], 'amount'],
    ['netSalesPct', ['CA NET % of GS'], 'ratio'],
    ['stdCos', ['COGS'], 'amount'],
    ['royalTaMs', ['Royalty'], 'amount'],
    ['physicalDistribution', ['PD'], 'amount'],
    ['specialOperationsCost', ['PLV1'], 'amount'],
    ['obsoleteSlowMovingReturns', ['OBSL'], 'amount'],
    ['grossMargin', ['Gross Margin'], 'amount'],
    ['grossMarginPct', ['Gross Margin% of CA'], 'ratio'],
    ['tradeRelation', ['Trade Relation'], 'amount'],
    ['customerSamples', ['Sample'], 'amount'],
    ['promotionalGifts', ['PLV2'], 'amount'],
    ['posAdvertisingAmortization', ['Amort. + Writeoff'], 'amount'],
    ['posAdvertisingExpense', ['POS.'], 'amount'],
    ['merchandising', ['Mer.'], 'amount'],
    ['animations', ['ANM.'], 'amount'],
    ['tester', ['Tester'], 'amount'],
    ['daHeadcount', ['DA HC'], 'count'],
    ['daCost', ['DA Cost'], 'amount'],
    ['specificDevelopment', ['specific dev.'], 'amount'],
    ['daCostAndSpecificDevelopment', ['DA Cost+specific dev.'], 'amount'],
    ['otherAP', ['Others'], 'amount'],
    ['specificAP', ['Specific A&P'], 'amount'],
    ['specificAPPct', ['Specific A&P% of CA'], 'ratio'],
    ['specificSga', ['Specific SG&A'], 'amount'],
    ['customerContribution', ['Client Contribution'], 'amount'],
    ['customerContributionPct', ['Client Contribution%'], 'ratio'],
    ['nonSpecificCosts', ['Unspecific Costs'], 'amount'],
    ['operatingProfit', ['Operating Profit'], 'amount'],
    ['operatingProfitPct', ['Operating Profit%'], 'ratio']
  ];

  function capabilityKeysFor(fieldKey) {
    return Object.entries(CAPABILITY_RULES)
      .filter(([, rule]) => rule.required.includes(fieldKey))
      .map(([capability]) => capability);
  }

  const FIELDS = Object.freeze(RAW_FIELDS.map(([key, aliases, type]) => Object.freeze({
    key,
    aliases: Object.freeze(aliases.slice()),
    type,
    cleaningRequired: CLEANING_REQUIRED_KEYS.includes(key),
    dashboardCoreRequired: DASHBOARD_CORE_REQUIRED_KEYS.includes(key),
    capabilities: Object.freeze(capabilityKeysFor(key))
  })));

  const FIELD_BY_KEY = Object.freeze(Object.fromEntries(FIELDS.map(field => [field.key, field])));
  const FIELD_ALIASES = Object.freeze(Object.fromEntries(FIELDS.map(field => [field.key, field.aliases])));

  return Object.freeze({
    VERSION,
    FIELDS,
    FIELD_BY_KEY,
    FIELD_ALIASES,
    CLEANING_REQUIRED_KEYS,
    DASHBOARD_CORE_REQUIRED_KEYS,
    CAPABILITY_RULES,
    AP_COMPONENT_FIELDS,
    FULL_STORE_PNL_FIELDS
  });
}));
