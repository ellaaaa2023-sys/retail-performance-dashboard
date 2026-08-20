(function (root, factory) {
  'use strict';

  const api = factory(root.RetailDashboardI18n || (typeof require === 'function' ? require('../i18n.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailDataPreparationUI = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (i18n) {
  'use strict';

  const t = (key, params) => i18n && i18n.t ? i18n.t(key, params) : key;

  const FIELD_LABELS = Object.freeze({
    terminal: 'Terminal',
    store: 'Store',
    city: 'City',
    region: 'Region',
    status: 'Status',
    productivityTier: 'Store Productivity Tier',
    cityPosNo: 'City POS Count',
    storeProductivity: 'Store Productivity',
    grossSales: 'Gross Sales',
    totalMinorations: 'Total Minorations',
    netSales: 'CA NET',
    grossMargin: 'Gross Margin',
    specificAP: 'Specific A&P',
    specificSga: 'Specific SG&A',
    customerContribution: 'Client Contribution',
    tradeRelation: 'Trade Relation',
    customerSamples: 'Sample',
    promotionalGifts: 'PLV2',
    posAdvertisingAmortization: 'Amort. + Writeoff',
    posAdvertisingExpense: 'POS.',
    merchandising: 'Mer.',
    animations: 'ANM.',
    tester: 'Tester',
    daCostAndSpecificDevelopment: 'DA Cost + specific dev.',
    otherAP: 'Others'
  });

  const CAPABILITY_COPY = Object.freeze({
    statusFilter: Object.freeze({ label: 'Status filter', unavailable: 'Status filter unavailable' }),
    posAnalytics: Object.freeze({ label: 'Filtered POS analytics', unavailable: 'Filtered POS analytics unavailable' }),
    tierFilter: Object.freeze({ label: 'Store Productivity Tier filter', unavailable: 'Store Productivity Tier filter unavailable' }),
    minorationsAnalytics: Object.freeze({ label: 'Minorations analytics', unavailable: 'Minorations analytics unavailable' }),
    investmentQuadrant: Object.freeze({ label: 'Investment Quadrant', unavailable: 'Investment Quadrant unavailable' }),
    productivitySummary: Object.freeze({ label: 'Productivity Summary', unavailable: 'Productivity Summary unavailable' }),
    fullProductivityRisk: Object.freeze({ label: 'Productivity Risk analysis', unavailable: 'Productivity Risk analysis unavailable' }),
    filteredCustomerContributionBridge: Object.freeze({ label: 'Customer Contribution Bridge', unavailable: 'Customer Contribution Bridge unavailable' }),
    canonicalAP: Object.freeze({ label: 'Canonical A&P analysis', unavailable: 'Canonical A&P analysis unavailable' }),
    apComponentAnalysis: Object.freeze({ label: 'A&P Component Analysis', unavailable: 'A&P Component Analysis unavailable' }),
    fullStorePnl: Object.freeze({ label: 'Full Store P&L', unavailable: 'Full Store P&L unavailable' })
  });

  const CAPABILITY_ORDER = Object.freeze([
    'statusFilter', 'posAnalytics', 'tierFilter', 'minorationsAnalytics',
    'filteredCustomerContributionBridge', 'investmentQuadrant',
    'productivitySummary', 'fullProductivityRisk', 'apComponentAnalysis', 'fullStorePnl'
  ]);

  function fieldLabel(key) {
    const translated = t(`field.${key}`);
    return translated.indexOf('.') === -1 ? translated : (FIELD_LABELS[key] || String(key || 'Required field'));
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function missingDetail(capability) {
    const missing = capability && capability.missing ? capability.missing : {};
    const current = unique(missing.current || []).map(fieldLabel);
    const comparison = unique(missing.comparison || []).map(fieldLabel);
    const all = unique(current.concat(comparison));
    if (!all.length) return t('prep.requiredUnavailable');
    if (current.join('|') === comparison.join('|')) {
      return `${t(all.length === 1 ? 'prep.missingField' : 'prep.missingFields')}: ${all.join(', ')}`;
    }
    const parts = [];
    if (current.length) parts.push(t('prep.missingByPeriod', { period: t('common.current'), fields: current.join(', ') }));
    if (comparison.length) parts.push(t('prep.missingByPeriod', { period: t('common.comparison'), fields: comparison.join(', ') }));
    return parts.join(' · ');
  }

  function buildCapabilityWarnings(capabilities) {
    const resolved = capabilities && capabilities.resolved ? capabilities.resolved : {};
    return CAPABILITY_ORDER.flatMap(key => {
      const capability = resolved[key];
      const copy = CAPABILITY_COPY[key];
      if (!capability || !copy || capability.status === 'available') return [];
      const partial = capability.status === 'partial';
      const label = t(`cap.${key}`);
      return [{
        key,
        status: capability.status,
        title: partial ? t('cap.partial', { name: label }) : t('cap.unavailable', { name: label }),
        detail: partial && key === 'apComponentAnalysis'
          ? t('error.apComponentMissing')
          : missingDetail(capability)
      }];
    });
  }

  function sheetStats(sheet) {
    const counts = sheet.counts || {};
    const fields = sheet.fields || {};
    const stats = [];
    if (Number.isFinite(counts.cleanedRows)) stats.push(t('prep.rowsProcessed', { count: counts.cleanedRows }));
    if (counts.blankRowsIgnored) stats.push(t(counts.blankRowsIgnored === 1 ? 'prep.blankRow' : 'prep.blankRows', { count: counts.blankRowsIgnored }));
    if (counts.blankColumnsIgnored) stats.push(t(counts.blankColumnsIgnored === 1 ? 'prep.blankColumn' : 'prep.blankColumns', { count: counts.blankColumnsIgnored }));
    const additional = Array.isArray(fields.unknownColumns) ? fields.unknownColumns.length : 0;
    if (additional) stats.push(t(additional === 1 ? 'prep.fieldPreserved' : 'prep.fieldsPreserved', { count: additional }));
    return stats;
  }

  function sheetStoreCount(model, role) {
    const detail = model && model.detail && model.detail[role];
    return detail && Array.isArray(detail.stores) ? detail.stores.length : null;
  }

  function buildSheetView(sheet, model) {
    const role = sheet.role;
    const result = {
      name: sheet.sheetName,
      role,
      tone: 'neutral',
      detail: '',
      note: '',
      stats: sheetStats(sheet),
      missing: []
    };
    if (sheet.classification === 'summary') {
      result.tone = 'success';
      result.detail = t('prep.summarySheet');
      result.stats = [];
      return result;
    }
    if (role === 'current' || role === 'comparison') {
      const stores = sheetStoreCount(model, role);
      result.tone = 'success';
      result.detail = t('prep.detailCleaned', { period: t(role === 'current' ? 'common.current' : 'common.comparison'), stores: Number.isFinite(stores) ? stores : '—' });
      return result;
    }
    if (role === 'historical') {
      result.tone = 'success';
      result.detail = t('prep.historicalCleaned');
      return result;
    }
    if (role === 'unassigned') {
      result.tone = 'warning';
      result.detail = t('prep.unassignedCleaned');
      result.note = t('prep.unassignedNote');
      return result;
    }
    if (sheet.cleaningStatus === 'nearCompatible' || role === 'nearCompatible') {
      result.tone = 'warning';
      result.detail = t('prep.nearCompatible');
      result.missing = ((sheet.fields && sheet.fields.missingRequired) || []).map(fieldLabel);
      result.stats = [];
      return result;
    }
    if (role === 'blocked') {
      result.tone = 'error';
      result.detail = t('prep.blockedSheet');
      result.missing = ((sheet.dashboardReadiness && sheet.dashboardReadiness.missing) || []).map(fieldLabel);
      return result;
    }
    result.detail = t('prep.notDetail');
    result.stats = [];
    return result;
  }

  function buildWorkbookPreparation(model) {
    const metadata = model && model.metadata ? model.metadata : {};
    const scan = metadata.workbookScan || { sheets: [] };
    const sheets = (scan.sheets || []).map(sheet => buildSheetView(sheet, model));
    const summary = sheets.find(sheet => sheet.role === 'summary') || null;
    const current = sheets.find(sheet => sheet.role === 'current') || null;
    const comparison = sheets.find(sheet => sheet.role === 'comparison') || null;
    const additional = sheets.filter(sheet => sheet.role === 'historical' || sheet.role === 'unassigned');
    const nearCompatible = sheets.filter(sheet => sheet.role === 'nearCompatible' || sheet.tone === 'error');
    const other = sheets.filter(sheet => sheet.role === 'ignored');
    const capabilityWarnings = buildCapabilityWarnings(metadata.capabilities);
    const compatibleCount = Array.isArray(scan.compatibleSheets)
      ? scan.compatibleSheets.length
      : sheets.filter(sheet => ['current', 'comparison', 'historical', 'unassigned'].includes(sheet.role)).length;
    const usedCount = [current, comparison].filter(Boolean).length;
    const hasLimitations = capabilityWarnings.length > 0;
    const hasWarnings = nearCompatible.length > 0 || additional.some(sheet => sheet.role === 'unassigned');
    return {
      mode: hasLimitations || hasWarnings ? 'warning' : 'ready',
      title: t(hasLimitations ? 'prep.readyLimitations' : hasWarnings ? 'prep.readyWarnings' : 'prep.dataReady'),
      summary: t('prep.sheetSummary', { compatible: compatibleCount, used: usedCount }),
      period: metadata.currentPeriodKey && metadata.comparisonPeriodKey
        ? `${metadata.currentPeriodKey} ${t('common.vs')} ${metadata.comparisonPeriodKey}`
        : '',
      steps: [
        t('prep.workbookScanned'),
        summary ? t('prep.summaryDetected') : null,
        t('prep.compatiblePrepared', { count: compatibleCount }),
        current && comparison ? t('prep.periodsAssigned') : null,
        t('prep.readyAnalysis')
      ].filter(Boolean),
      primarySheets: [summary, current, comparison].filter(Boolean),
      additionalSheets: additional,
      sheetWarnings: nearCompatible,
      otherSheets: other,
      capabilityWarnings,
      privacy: t('prep.localProcessing'),
      expanded: false
    };
  }

  function mapBlockingError(error) {
    const message = String(error && error.message || '');
    const scan = error && error.workbookScan;
    const sheets = scan && Array.isArray(scan.sheets) ? scan.sheets : [];
    const assignedCurrent = sheets.find(sheet => scan.assigned && sheet.sheetName === scan.assigned.current);
    const assignedYear = assignedCurrent && assignedCurrent.periodMetadata ? assignedCurrent.periodMetadata.year : null;
    const blockedCurrentCandidate = sheets
      .filter(sheet => (
        sheet.periodMetadata
        && (sheet.cleaningStatus === 'nearCompatible' || (sheet.dashboardReadiness && sheet.dashboardReadiness.status === 'blocked'))
        && sheet.fields
        && Array.isArray(sheet.fields.missingRequired)
        && sheet.fields.missingRequired.length
        && (!Number.isFinite(assignedYear) || sheet.periodMetadata.year > assignedYear)
      ))
      .sort((left, right) => right.periodMetadata.year - left.periodMetadata.year)[0];
    if (blockedCurrentCandidate) {
      const missing = blockedCurrentCandidate.fields.missingRequired.map(fieldLabel);
      return {
        reason: t(missing.length === 1 ? 'prep.errorCurrentMissingOne' : 'prep.errorCurrentMissing', { fields: missing.join(', ') }),
        detail: t(missing.length === 1 ? 'prep.errorCurrentMissingDetailOne' : 'prep.errorCurrentMissingDetail', { sheet: blockedCurrentCandidate.sheetName }),
        invalidateAssignments: true
      };
    }
    if (/Prior-year same-period detail sheet not found/i.test(message)) {
      return { reason: t('prep.errorComparisonAssign'), detail: t('prep.errorComparisonAssignDetail') };
    }
    if (/Current Store Detail sheet is ambiguous/i.test(message)) {
      return { reason: t('prep.errorCurrentAssign'), detail: t('prep.errorCurrentAmbiguousDetail') };
    }
    if (/No cleaned Store Detail sheet has reliable year/i.test(message)) {
      return { reason: t('prep.errorCurrentAssign'), detail: t('prep.errorCurrentPeriodDetail') };
    }
    if (/exactly one Review Period/i.test(message)) {
      return { reason: t('prep.errorMultiplePeriods'), detail: t('prep.errorMultiplePeriodsDetail') };
    }
    if (/Expected exactly one Summary P&L sheet/i.test(message)) {
      return { reason: t('prep.errorSummaryAssign'), detail: t('prep.errorSummaryAssignDetail') };
    }
    if (/Summary P&L year does not match/i.test(message)) {
      return { reason: t('prep.errorYearMismatch'), detail: t('prep.errorYearMismatchDetail') };
    }
    if (/Local libraries are missing|data layer.*missing/i.test(message)) {
      return { reason: t('prep.errorLibraries'), detail: t('prep.errorLibrariesDetail') };
    }
    if (/Unsupported file type/i.test(message)) {
      return { reason: t('prep.errorFileType'), detail: t('error.invalidFile') };
    }
    return { reason: t('prep.errorGenericReason'), detail: t('prep.errorGenericDetail') };
  }

  function buildBlockingPreparation(error) {
    const mapped = mapBlockingError(error);
    const scan = error && error.workbookScan ? error.workbookScan : { sheets: [] };
    const sheets = (scan.sheets || []).map(sheet => buildSheetView(
      mapped.invalidateAssignments && (sheet.role === 'current' || sheet.role === 'comparison')
        ? { ...sheet, role: 'historical' }
        : sheet,
      null
    ));
    return {
      mode: 'blocked',
      title: t('prep.dataBlocked'),
      summary: mapped.reason,
      period: '',
      steps: sheets.length ? [t('prep.workbookScanned')] : [],
      primarySheets: sheets.filter(sheet => ['summary', 'current', 'comparison'].includes(sheet.role)),
      additionalSheets: sheets.filter(sheet => ['historical', 'unassigned'].includes(sheet.role)),
      sheetWarnings: sheets.filter(sheet => sheet.role === 'nearCompatible' || sheet.tone === 'error'),
      otherSheets: sheets.filter(sheet => sheet.role === 'ignored'),
      capabilityWarnings: [{ key: 'workbook', status: 'unavailable', title: mapped.reason, detail: mapped.detail }],
      privacy: t('prep.localProcessing'),
      expanded: true
    };
  }

  function buildLoadingPreparation(fileName) {
    return {
      mode: 'loading',
      title: t('prep.preparing'),
      summary: fileName || t('prep.reading'),
      period: '',
      steps: [], primarySheets: [], additionalSheets: [], sheetWarnings: [], otherSheets: [], capabilityWarnings: [],
      privacy: '', expanded: false
    };
  }

  function buildDemoPreparation(model) {
    const metadata = model && model.metadata ? model.metadata : {};
    const demo = metadata.demo || {};
    const currentStores = Number.isFinite(demo.currentStores) ? demo.currentStores : sheetStoreCount(model, 'current');
    const comparisonStores = Number.isFinite(demo.comparisonStores) ? demo.comparisonStores : sheetStoreCount(model, 'comparison');
    return {
      mode: 'demo',
      title: t('prep.dataReady'),
      summary: t('prep.demoSummary', { dataset: t('prep.syntheticDataset') }),
      period: metadata.currentPeriodKey && metadata.comparisonPeriodKey
        ? `${metadata.currentPeriodKey} ${t('common.vs')} ${metadata.comparisonPeriodKey}`
        : '',
      steps: [],
      primarySheets: [
        { name: t('prep.summaryPnl'), role: 'summary', tone: 'success', detail: `${t('prep.syntheticSummary')} · ${t('prep.dashboardSource')}`, note: '', stats: [], missing: [] },
        { name: t('prep.currentDetail'), role: 'current', tone: 'success', detail: t('prep.storesReady', { count: currentStores }), note: '', stats: [], missing: [] },
        { name: t('prep.comparisonDetail'), role: 'comparison', tone: 'success', detail: t('prep.storesReady', { count: comparisonStores }), note: '', stats: [], missing: [] }
      ],
      additionalSheets: [], sheetWarnings: [], otherSheets: [], capabilityWarnings: [],
      privacy: t('prep.demoPrivacy'),
      detailsLabel: t('action.viewDetails'),
      primaryGroupLabel: t('prep.dashboardSources'),
      expanded: false
    };
  }

  return Object.freeze({
    FIELD_LABELS,
    fieldLabel,
    buildCapabilityWarnings,
    buildWorkbookPreparation,
    buildBlockingPreparation,
    buildLoadingPreparation,
    buildDemoPreparation
  });
}));
