(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailSourceLifecycle = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const INTERACTION_DEFAULTS = Object.freeze({
    filters: {},
    snapshot: 'current',
    portfolioView: 'productivity',
    portfolioMetric: 'customerContribution',
    selectedPnlLine: '',
    selectedDriver: '',
    selectedQuadrant: 'all',
    search: ''
  });

  function validateCandidate(candidate) {
    if (!candidate || !['demo', 'upload'].includes(candidate.sourceType)) {
      throw new Error('A demo or upload data source is required.');
    }
    if (!candidate.model || !candidate.service) {
      throw new Error('A normalized model and data service are required.');
    }
    return candidate;
  }

  function resetInteractions(state) {
    Object.assign(state, INTERACTION_DEFAULTS, {
      filters: {},
      selectedStore: state.model && state.model.metadata
        ? state.model.metadata.defaultStoreTerminal || ''
        : ''
    });
    return state;
  }

  function activate(state, input) {
    const candidate = validateCandidate(input);
    Object.assign(state, {
      book: candidate.book || null,
      model: candidate.model,
      service: candidate.service,
      sourceType: candidate.sourceType,
      fileName: candidate.fileName || '',
      sheetName: '',
      headerRow: 0,
      headers: [],
      matrix: [],
      mapping: {},
      signature: '',
      records: [],
      periods: [],
      currentPeriodKey: '',
      warnings: [],
      preparationView: null,
      dataStats: {
        records: candidate.model.detail.current.stores.length + candidate.model.detail.comparison.stores.length,
        stores: candidate.model.detail.current.stores.length,
        periods: 1,
        tieErrorRows: 0,
        duplicateKeys: 0
      }
    });
    return resetInteractions(state);
  }

  return Object.freeze({ INTERACTION_DEFAULTS, validateCandidate, resetInteractions, activate });
}));
