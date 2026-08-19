'use strict';

const assert = require('node:assert/strict');
const PreparationUI = require('../js/data/data-preparation-ui.js');

let passed = 0;
function check(number, name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${number}. ${name}`);
}

function capability(status = 'available', current = [], comparison = []) {
  return { status, missing: { current, comparison } };
}

function allCapabilities() {
  return {
    resolved: {
      statusFilter: capability(), posAnalytics: capability(), tierFilter: capability(),
      minorationsAnalytics: capability(), investmentQuadrant: capability(),
      productivitySummary: capability(), fullProductivityRisk: capability(),
      filteredCustomerContributionBridge: capability(), canonicalAP: capability(),
      apComponentAnalysis: capability(), fullStorePnl: capability()
    }
  };
}

function scanSheet(name, role, overrides = {}) {
  return {
    sheetName: name,
    classification: 'detail',
    cleaningStatus: 'compatible',
    dashboardReadiness: { status: 'ready', missing: [] },
    role,
    counts: { cleanedRows: 10, blankRowsIgnored: 0, blankColumnsIgnored: 0 },
    fields: { missingRequired: [], unknownColumns: [] },
    ...overrides
  };
}

function standardModel(extraSheets = [], capabilities = allCapabilities()) {
  const sheets = [
    scanSheet('P&L review Y26', 'summary', { classification: 'summary', cleaningStatus: 'notApplicable', counts: {} }),
    scanSheet('LRP Counter Y26 S1', 'current'),
    scanSheet('LRP Counter Y25 S1', 'comparison'),
    ...extraSheets
  ];
  return {
    metadata: {
      currentPeriodKey: '2026 S1', comparisonPeriodKey: '2025 S1', capabilities,
      workbookScan: { sheets, compatibleSheets: sheets.filter(sheet => sheet.cleaningStatus === 'compatible').map(sheet => sheet.sheetName) }
    },
    detail: { current: { stores: Array(160).fill({}) }, comparison: { stores: Array(150).fill({}) } }
  };
}

check(1, 'Standard scan produces a concise ready summary', () => {
  const view = PreparationUI.buildWorkbookPreparation(standardModel());
  assert.equal(view.mode, 'ready');
  assert.equal(view.title, 'Data Ready');
  assert.equal(view.summary, '2 store-level data sheets prepared · 2 used in current analysis');
});

check(2, 'Summary wording says cleaning is not required', () => {
  const summary = PreparationUI.buildWorkbookPreparation(standardModel()).primarySheets[0];
  assert.equal(summary.detail, 'Summary P&L · Dashboard Source · Cleaning not required');
});

check(3, 'Current and Comparison labels include normalized store counts', () => {
  const sheets = PreparationUI.buildWorkbookPreparation(standardModel()).primarySheets;
  assert.match(sheets[1].detail, /Current Detail · 160 stores · Cleaned/);
  assert.match(sheets[2].detail, /Comparison Detail · 150 stores · Cleaned/);
});

check(4, 'Historical compatible sheet is cleaned but not used', () => {
  const historical = scanSheet('LRP Counter Y24 S1', 'historical');
  const view = PreparationUI.buildWorkbookPreparation(standardModel([historical]));
  assert.match(view.additionalSheets[0].detail, /Not used in current analysis/);
});

check(5, 'Unassigned compatible sheet explains missing period metadata', () => {
  const unassigned = scanSheet('Counter Data', 'unassigned');
  const view = PreparationUI.buildWorkbookPreparation(standardModel([unassigned]));
  assert.match(view.additionalSheets[0].note, /Year \/ Review Period could not be identified/);
});

check(6, 'Near-compatible sheet is a non-blocking sheet warning', () => {
  const near = scanSheet('Store P&L Draft', 'nearCompatible', {
    cleaningStatus: 'nearCompatible',
    fields: { missingRequired: ['customerContribution'], unknownColumns: [] }
  });
  const view = PreparationUI.buildWorkbookPreparation(standardModel([near]));
  assert.equal(view.mode, 'warning');
  assert.deepEqual(view.sheetWarnings[0].missing, ['Client Contribution']);
});

check(7, 'Incompatible Notes sheet is not treated as an error', () => {
  const notes = scanSheet('Notes', 'ignored', { classification: 'incompatible', cleaningStatus: 'incompatible' });
  const view = PreparationUI.buildWorkbookPreparation(standardModel([notes]));
  assert.equal(view.otherSheets[0].tone, 'neutral');
  assert.equal(view.otherSheets[0].detail, 'Not a store-level Detail sheet');
});

check(8, 'Unknown columns are described as preserved', () => {
  const current = scanSheet('LRP Counter Y26 S1', 'historical', {
    fields: { missingRequired: [], unknownColumns: [{}, {}, {}] }
  });
  const view = PreparationUI.buildWorkbookPreparation(standardModel([current]));
  assert.ok(view.additionalSheets[0].stats.includes('3 additional fields preserved'));
});

check(9, 'Blank rows and columns are described as ignored, never deleted', () => {
  const extra = scanSheet('LRP Counter Y24 S1', 'historical', {
    counts: { cleanedRows: 8, blankRowsIgnored: 2, blankColumnsIgnored: 1 }
  });
  const stats = PreparationUI.buildWorkbookPreparation(standardModel([extra])).additionalSheets[0].stats.join(' ');
  assert.match(stats, /2 blank rows ignored/);
  assert.match(stats, /1 blank column ignored/);
  assert.doesNotMatch(stats, /deleted/i);
});

check(10, 'Missing specificSga yields a Bridge capability warning', () => {
  const capabilities = allCapabilities();
  capabilities.resolved.filteredCustomerContributionBridge = capability('unavailable', ['specificSga'], ['specificSga']);
  const warning = PreparationUI.buildWorkbookPreparation(standardModel([], capabilities)).capabilityWarnings[0];
  assert.equal(warning.title, 'Customer Contribution Bridge unavailable');
  assert.equal(warning.detail, 'Missing field: Specific SG&A');
});

check(11, 'Missing cityPosNo yields a filtered POS warning', () => {
  const capabilities = allCapabilities();
  capabilities.resolved.posAnalytics = capability('unavailable', ['cityPosNo'], ['cityPosNo']);
  assert.match(PreparationUI.buildWorkbookPreparation(standardModel([], capabilities)).capabilityWarnings[0].title, /Filtered POS analytics unavailable/);
});

check(12, 'Missing Tier yields a Tier filter warning', () => {
  const capabilities = allCapabilities();
  capabilities.resolved.tierFilter = capability('unavailable', ['productivityTier'], ['productivityTier']);
  const warning = PreparationUI.buildWorkbookPreparation(standardModel([], capabilities)).capabilityWarnings[0];
  assert.equal(warning.detail, 'Missing field: 门店单产等级');
});

check(13, 'Partial A&P explains missing components are not zero', () => {
  const capabilities = allCapabilities();
  capabilities.resolved.apComponentAnalysis = capability('partial', ['tester'], []);
  const warning = PreparationUI.buildWorkbookPreparation(standardModel([], capabilities)).capabilityWarnings[0];
  assert.equal(warning.title, 'A&P Component Analysis is partial');
  assert.match(warning.detail, /not treated as zero/);
});

check(14, 'Blocking parser error becomes a user-facing reason', () => {
  const error = new Error('Prior-year same-period detail sheet not found.');
  error.workbookScan = {
    sheets: [
      scanSheet('P&L review Y26', 'summary', { classification: 'summary', cleaningStatus: 'notApplicable', counts: {} }),
      scanSheet('LRP Counter Y26 S1', 'current')
    ]
  };
  const view = PreparationUI.buildBlockingPreparation(error);
  assert.equal(view.title, 'Data cannot be loaded for analysis');
  assert.equal(view.summary, 'Comparison Detail could not be assigned.');
  assert.doesNotMatch(JSON.stringify(view), /Prior-year same-period detail sheet not found/);
  assert.deepEqual(view.primarySheets.map(sheet => sheet.name), ['P&L review Y26', 'LRP Counter Y26 S1']);

  const requiredError = new Error('Prior-year same-period detail sheet not found.');
  requiredError.workbookScan = {
    assigned: { current: 'LRP Counter Y25 S1', comparison: null },
    sheets: [
      scanSheet('LRP Counter Y26 S1', 'nearCompatible', {
        cleaningStatus: 'nearCompatible',
        periodMetadata: { year: 2026, reviewPeriod: 'S1' },
        fields: { missingRequired: ['customerContribution'], unknownColumns: [] }
      }),
      scanSheet('LRP Counter Y25 S1', 'current', {
        periodMetadata: { year: 2025, reviewPeriod: 'S1' }
      })
    ]
  };
  const requiredView = PreparationUI.buildBlockingPreparation(requiredError);
  assert.equal(requiredView.summary, 'Current Detail is missing a required field: Client Contribution.');
  assert.match(requiredView.capabilityWarnings[0].detail, /LRP Counter Y26 S1 cannot be used as Current Detail/);
  assert.equal(requiredView.additionalSheets[0].name, 'LRP Counter Y25 S1');
  assert.match(requiredView.additionalSheets[0].detail, /Not used in current analysis/);
});

check(15, 'Demo mode never claims Excel cleaning', () => {
  const view = PreparationUI.buildDemoPreparation();
  assert.equal(view.title, 'Demo Dataset');
  assert.doesNotMatch(JSON.stringify(view), /cleaned|workbook/i);
});

check(16, 'A newly built view does not retain prior scan state', () => {
  const oldView = PreparationUI.buildWorkbookPreparation(standardModel([scanSheet('Counter Data', 'unassigned')]));
  const newView = PreparationUI.buildWorkbookPreparation(standardModel());
  assert.equal(oldView.additionalSheets.length, 1);
  assert.equal(newView.additionalSheets.length, 0);
});

console.log(`\nData preparation UI tests: ${passed}/${passed} passed`);
