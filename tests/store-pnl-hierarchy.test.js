'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');
const StoreDetail = require('../js/store-detail.js');

const workbookPath = path.resolve(__dirname, '../sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx');
const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: 'buffer', cellDates: true, cellFormula: true });
const model = DataLayer.parseWorkbook(workbook, { XLSX, fileName: path.basename(workbookPath) });
let passed = 0;

function check(label, test) {
  test();
  passed += 1;
  console.log(`${passed}. PASS - ${label}`);
}

function rawRows(sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
}

function rawByTerminal(sheetName) {
  return new Map(rawRows(sheetName)
    .filter(row => row.Terminal && String(row.Terminal).toLowerCase() !== 'total')
    .map(row => [String(row.Terminal), row]));
}

function close(actual, expected, label, tolerance = 1e-12) {
  assert.equal(Number.isFinite(actual), true, `${label}: ${actual} is not finite`);
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${label}: expected ${expected}, received ${actual}`);
}

check('Exact workbook source headers remain fixed in both Detail sheets', () => {
  for (const sheetName of ['LRP Counter Y26 S1', 'LRP Counter Y25 S1']) {
    const sheet = workbook.Sheets[sheetName];
    assert.equal(sheet.AR1.v, 'Sample');
    assert.equal(sheet.AS1.v, 'PLV2');
    assert.equal(sheet.AV1.v, 'Amort. + Writeoff');
    assert.equal(sheet.AX1.v, 'POS.');
    assert.equal(sheet.AY1.v, 'Mer.');
    assert.equal(sheet.AZ1.v, 'ANM.');
    assert.equal(sheet.BA1.v, 'Tester');
    assert.equal(sheet.BC1.v, 'DA Cost');
    assert.equal(sheet.BE1.v, 'DA Cost+specific dev.');
    assert.equal(sheet.BG1.v, 'Others');
    assert.equal(sheet.BK1.v, 'Specific SG&A');
    assert.equal(sheet.BN1.v, 'Unspecific Costs');
  }
});

check('Current and Comparison canonical source mappings use the confirmed exact headers', () => {
  for (const detail of [model.detail.current, model.detail.comparison]) {
    assert.equal(detail.mappings.customerSamples.header, 'Sample');
    assert.equal(detail.mappings.promotionalGifts.header, 'PLV2');
    assert.equal(detail.mappings.posAdvertisingAmortization.header, 'Amort. + Writeoff');
    assert.equal(detail.mappings.posAdvertisingExpense.header, 'POS.');
    assert.equal(detail.mappings.merchandising.header, 'Mer.');
    assert.equal(detail.mappings.animations.header, 'ANM.');
    assert.equal(detail.mappings.tester.header, 'Tester');
    assert.equal(detail.mappings.daCost.header, 'DA Cost');
    assert.equal(detail.mappings.daCostAndSpecificDevelopment.header, 'DA Cost+specific dev.');
    assert.equal(detail.mappings.otherAP.header, 'Others');
    assert.equal(detail.mappings.specificSga.header, 'Specific SG&A');
    assert.equal(detail.mappings.nonSpecificCosts.header, 'Unspecific Costs');
  }
});

check('Store P&L source amounts match Current and Comparison workbook rows', () => {
  const periods = [
    ['current', 'LRP Counter Y26 S1'],
    ['comparison', 'LRP Counter Y25 S1']
  ];
  for (const [role, sheetName] of periods) {
    const source = rawByTerminal(sheetName);
    for (const store of model.detail[role].stores.slice(0, 12)) {
      const raw = source.get(store.terminal);
      assert.equal(store.pnl.customerSamples, raw.Sample);
      assert.equal(store.pnl.promotionalGifts, raw.PLV2);
      assert.equal(store.pnl.animationsTowardDistributor, raw['ANM.']);
      assert.equal(store.pnl.animationsImmoPosAdv, raw['Amort. + Writeoff']);
      assert.equal(store.pnl.daCost, raw['DA Cost']);
      assert.equal(store.pnl.specificDevelopmentSubtotal, raw['DA Cost+specific dev.']);
      assert.equal(store.pnl.specificSga, raw['Specific SG&A']);
      assert.equal(store.pnl.nonSpecificCosts, raw['Unspecific Costs']);
    }
  }
});

check('Other POS advertising costs use AX + AY + BA + BG only', () => {
  for (const [role, sheetName] of [['current', 'LRP Counter Y26 S1'], ['comparison', 'LRP Counter Y25 S1']]) {
    const source = rawByTerminal(sheetName);
    for (const store of model.detail[role].stores) {
      const raw = source.get(store.terminal);
      const expected = raw['POS.'] + raw['Mer.'] + raw.Tester + raw.Others;
      assert.equal(store.pnl.otherPosAdvertising, expected, store.terminal);
    }
  }
});

check('Non DA Cost is the signed BE minus BC calculation', () => {
  for (const role of ['current', 'comparison']) {
    for (const store of model.detail[role].stores) {
      assert.equal(
        store.pnl.nonDaCost,
        store.pnl.specificDevelopmentSubtotal - store.pnl.daCost,
        store.terminal
      );
    }
  }
});

check('Structural placeholder rows remain explicit and future exact headers are registered', () => {
  const first = model.detail.current.stores[0];
  assert.deepEqual(first.pnlMetadata.structuralZeroFields.slice().sort(), [
    'eShopInShopWebsitesLine', 'livestreamersLine', 'otherPromotionsLine', 'transactionalMediaSpecificLine'
  ]);
  assert.equal(first.pnl.transactionalMediaSpecific, null);
  assert.equal(first.pnl.livestreamers, null);
  assert.equal(first.pnl.eShopInShopWebsites, null);
  assert.equal(first.pnl.otherPromotions, null);
  assert.equal(first.pnl.transactionalMediaSpecificLine, 0);
  assert.equal(first.pnl.livestreamersLine, 0);
  assert.equal(first.pnl.eShopInShopWebsitesLine, 0);
  assert.equal(first.pnl.otherPromotionsLine, 0);
});

check('Specific development sub-detail hierarchy never double counts', () => {
  for (const role of ['current', 'comparison']) {
    for (const store of model.detail[role].stores) {
      assert.equal(store.pnl.daCost + store.pnl.nonDaCost, store.pnl.specificDevelopmentSubtotal);
    }
  }
  assert.deepEqual(StoreDetail.STORE_PNL_HIERARCHIES.specificAP.slice(-1), ['specificDevelopmentSubtotal']);
  assert.equal(StoreDetail.STORE_PNL_HIERARCHIES.specificAP.includes('daCost'), false);
  assert.equal(StoreDetail.STORE_PNL_HIERARCHIES.specificAP.includes('nonDaCost'), false);
});

check('Specific A&P component hierarchy includes both animation source lines', () => {
  assert.equal(StoreDetail.STORE_PNL_HIERARCHIES.specificAP.includes('animationsTowardDistributor'), true);
  assert.equal(StoreDetail.STORE_PNL_HIERARCHIES.specificAP.includes('animationsImmoPosAdv'), true);
  assert.equal(StoreDetail.STORE_PNL_HIERARCHIES.specificAP.includes('otherPosAdvertising'), true);
});

check('A&P chart uses the exact ten Store P&L top-level components', () => {
  const expected = [
    'transactionalMediaSpecificLine',
    'customerSamples',
    'livestreamersLine',
    'eShopInShopWebsitesLine',
    'promotionalGifts',
    'otherPromotionsLine',
    'animationsTowardDistributor',
    'animationsImmoPosAdv',
    'otherPosAdvertising',
    'specificDevelopmentSubtotal'
  ];
  assert.deepEqual(StoreDetail.AP_COMPONENT_DEFINITIONS.map(definition => definition.key), expected);
  assert.deepEqual(StoreDetail.STORE_PNL_HIERARCHIES.specificAP, expected);
  assert.equal(expected.includes('daCost'), false);
  assert.equal(expected.includes('nonDaCost'), false);
});

check('A&P chart component models reconcile to formal Specific A&P for both periods', () => {
  for (const pair of model.storeMatches.existing) {
    const componentModel = StoreDetail.buildApComponentModel(pair.current, pair.comparison);
    for (const [role, store] of [['current', pair.current], ['comparison', pair.comparison]]) {
      const result = componentModel.reconciliation[role];
      assert.equal(result.ok, true, `${store.terminal} ${role}: ${result.residual}`);
      assert.equal(result.formalSigned, store.pnl.specificAP, `${store.terminal} ${role} formal total`);
      const expectedSigned = StoreDetail.STORE_PNL_HIERARCHIES.specificAP
        .reduce((sum, key) => sum + store.pnl[key], 0);
      assert.equal(result.componentSignedTotal, expectedSigned, `${store.terminal} ${role} component sum`);
      assert.deepEqual(result.structuralPlaceholderKeys.slice().sort(), store.pnlMetadata.structuralZeroFields.slice().sort());
    }
    const development = componentModel.components.find(component => component.key === 'specificDevelopmentSubtotal');
    assert.deepEqual(development.currentBreakdown.map(item => item.key), ['daCost', 'nonDaCost']);
    assert.equal(development.currentBreakdown.reduce((sum, item) => sum + item.signed, 0), pair.current.pnl.specificDevelopmentSubtotal);
    assert.equal(development.comparisonBreakdown.reduce((sum, item) => sum + item.signed, 0), pair.comparison.pnl.specificDevelopmentSubtotal);
  }
});

check('Total Specific Costs is derived without writing a workbook source field', () => {
  for (const role of ['current', 'comparison']) {
    for (const store of model.detail[role].stores) {
      assert.equal(store.pnl.totalSpecificCosts, store.pnl.specificAP + store.pnl.specificSga);
    }
    assert.equal(model.detail[role].mappings.totalSpecificCosts, undefined);
  }
});

check('Current, Comparison, amount movement, and ratio movement reconcile across the hierarchy', () => {
  for (const pair of model.storeMatches.existing) {
    const rows = StoreDetail.buildStorePnlRows(pair.current, pair.comparison, DataLayer);
    const reconciliation = StoreDetail.buildStorePnlReconciliation(
      rows,
      StoreDetail.STORE_PNL_AMOUNT_TOLERANCE_KRMB,
      DataLayer.constants.ratioReconciliationTolerance
    );
    for (const [parent, result] of Object.entries(reconciliation)) {
      for (const key of ['currentAmount', 'comparisonAmount', 'amountVariance', 'currentRatio', 'comparisonRatio', 'ratioVariance']) {
        assert.equal(result[key].ok, true, `${pair.current.terminal} ${parent} ${key}: ${result[key].residual}`);
      }
    }
  }
});

check('Every post-Gross-Margin Store P&L line uses CONSO Net Sales', () => {
  const lines = StoreDetail.STORE_PNL_LINE_DEFINITIONS;
  const start = lines.findIndex(line => line.key === 'grossMargin');
  assert.equal(lines.find(line => line.key === 'nonSpecificCosts').labelKey, 'totalNonSpecificCosts');
  lines.slice(start).filter(line => line.type !== 'headcount').forEach(line => {
    assert.equal(DataLayer.getPnlDenominatorKey(line.key), 'netSales', line.key);
  });
});

check('New Store keeps Comparison amounts and variances unavailable', () => {
  const store = model.storeMatches.new[0].current;
  const rows = StoreDetail.buildStorePnlRows(store, null, DataLayer);
  rows.forEach(row => {
    assert.equal(row.comparisonAmount, null, row.key);
    assert.equal(row.amountVariance, null, row.key);
    assert.equal(row.comparisonRatio, null, row.key);
    assert.equal(row.ratioVariance, null, row.key);
  });
});

check('New Store A&P chart keeps Comparison bars and reconciliation unavailable', () => {
  const store = model.storeMatches.new[0].current;
  const componentModel = StoreDetail.buildApComponentModel(store, null);
  assert.equal(componentModel.hasComparison, false);
  assert.equal(componentModel.reconciliation.current.ok, true);
  assert.equal(componentModel.reconciliation.comparison, null);
  assert.equal(componentModel.canonicalCurrentSpend, Math.abs(store.pnl.specificAP));
  componentModel.components.forEach(component => {
    assert.equal(component.comparison, null, component.key);
    assert.equal(component.comparisonSourceStatus, 'no-comparison', component.key);
  });
});

console.log(`\n${passed}/${passed} Store P&L hierarchy checks passed.`);
