'use strict';

const assert = require('node:assert/strict');
const Lifecycle = require('../js/data/source-lifecycle.js');

let passed = 0;
function check(number, name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${number}. ${name}`);
}

function model(sourceType, terminal = '') {
  return {
    metadata: { sourceType, defaultStoreTerminal: terminal },
    detail: { current: { stores: [{ terminal: terminal || 'FIRST' }] }, comparison: { stores: [] } }
  };
}

const demoModel = model('demo', 'DEMO-001');
const uploadModel = model('upload');
const demoService = { source: 'demo' };
const uploadService = { source: 'upload' };

check(1, 'Demo activation sets sourceType and a valid default store', () => {
  const state = {};
  Lifecycle.activate(state, { sourceType: 'demo', model: demoModel, service: demoService });
  assert.equal(state.sourceType, 'demo');
  assert.equal(state.selectedStore, 'DEMO-001');
  assert.equal(state.model, demoModel);
  assert.equal(state.service, demoService);
});

check(2, 'Upload activation replaces the source and clears stale interaction state', () => {
  const state = { selectedDriver: 'grossMargin', portfolioLens: 'efficiency', performanceSelection: 'priority-review', contributionMetric: 'grossMargin' };
  Lifecycle.activate(state, { sourceType: 'upload', model: uploadModel, service: uploadService, book: { id: 1 }, fileName: 'upload.xlsx' });
  assert.equal(state.sourceType, 'upload');
  assert.equal(state.fileName, 'upload.xlsx');
  assert.equal(state.selectedDriver, '');
  assert.equal(state.portfolioLens, 'performance');
  assert.equal(state.performanceSelection, null);
  assert.equal(state.contributionMetric, 'customerContribution');
});

check(3, 'Reset clears filters and selections while preserving the active source', () => {
  const state = {};
  Lifecycle.activate(state, { sourceType: 'upload', model: uploadModel, service: uploadService, book: { id: 1 }, fileName: 'upload.xlsx' });
  Object.assign(state, { filters: { region: 'East' }, selectedStore: 'OLD', selectedPnlLine: 'grossMargin', selectedDriver: 'x', portfolioLens: 'contribution', performanceSelection: 'healthy-growth' });
  const book = state.book;
  Lifecycle.resetInteractions(state);
  assert.equal(state.sourceType, 'upload');
  assert.equal(state.model, uploadModel);
  assert.equal(state.service, uploadService);
  assert.equal(state.book, book);
  assert.deepEqual(state.filters, {});
  assert.equal(state.selectedStore, 'FIRST');
  assert.equal(state.selectedPnlLine, '');
  assert.equal(state.portfolioLens, 'performance');
  assert.equal(state.performanceSelection, null);
});

check(4, 'Clear-to-Demo is a source activation, never an empty state', () => {
  const state = {};
  Lifecycle.activate(state, { sourceType: 'upload', model: uploadModel, service: uploadService, fileName: 'upload.xlsx' });
  Lifecycle.activate(state, { sourceType: 'demo', model: demoModel, service: demoService });
  assert.equal(state.sourceType, 'demo');
  assert.ok(state.model);
  assert.ok(state.service);
  assert.equal(state.fileName, '');
});

check(5, 'Invalid upload candidates fail before mutating the current source', () => {
  const state = {};
  Lifecycle.activate(state, { sourceType: 'demo', model: demoModel, service: demoService });
  const before = { ...state };
  assert.throws(() => Lifecycle.validateCandidate({ sourceType: 'upload', model: uploadModel }), /data service/);
  assert.equal(state.sourceType, before.sourceType);
  assert.equal(state.model, before.model);
  assert.equal(state.service, before.service);
});

check(6, 'Data statistics are rebuilt for each source without stale counts', () => {
  const state = {};
  Lifecycle.activate(state, { sourceType: 'demo', model: demoModel, service: demoService });
  assert.equal(state.dataStats.stores, 1);
  const larger = { metadata: {}, detail: { current: { stores: [{}, {}, {}] }, comparison: { stores: [{}, {}] } } };
  Lifecycle.activate(state, { sourceType: 'upload', model: larger, service: uploadService });
  assert.deepEqual(state.dataStats, { records: 5, stores: 3, periods: 1, tieErrorRows: 0, duplicateKeys: 0 });
});

console.log(`\nSource lifecycle tests: ${passed}/${passed} passed`);
