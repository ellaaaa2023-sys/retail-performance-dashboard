(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailDataPreparationUI = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FIELD_LABELS = Object.freeze({
    terminal: 'Terminal',
    store: 'Store',
    city: 'City',
    region: 'Region',
    status: 'Status',
    productivityTier: '门店单产等级',
    cityPosNo: '城市POS数',
    storeProductivity: '门店总单产',
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
    return FIELD_LABELS[key] || String(key || 'Required field');
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function missingDetail(capability) {
    const missing = capability && capability.missing ? capability.missing : {};
    const current = unique(missing.current || []).map(fieldLabel);
    const comparison = unique(missing.comparison || []).map(fieldLabel);
    const all = unique(current.concat(comparison));
    if (!all.length) return 'Required source fields are not available.';
    if (current.join('|') === comparison.join('|')) {
      return `${all.length === 1 ? 'Missing field' : 'Missing fields'}: ${all.join(', ')}`;
    }
    const parts = [];
    if (current.length) parts.push(`Current: ${current.join(', ')}`);
    if (comparison.length) parts.push(`Comparison: ${comparison.join(', ')}`);
    return `Missing ${parts.join(' · ')}`;
  }

  function buildCapabilityWarnings(capabilities) {
    const resolved = capabilities && capabilities.resolved ? capabilities.resolved : {};
    return CAPABILITY_ORDER.flatMap(key => {
      const capability = resolved[key];
      const copy = CAPABILITY_COPY[key];
      if (!capability || !copy || capability.status === 'available') return [];
      const partial = capability.status === 'partial';
      return [{
        key,
        status: capability.status,
        title: partial ? `${copy.label} is partial` : copy.unavailable,
        detail: partial && key === 'apComponentAnalysis'
          ? 'Some component fields are missing. Missing components are not treated as zero.'
          : missingDetail(capability)
      }];
    });
  }

  function sheetStats(sheet) {
    const counts = sheet.counts || {};
    const fields = sheet.fields || {};
    const stats = [];
    if (Number.isFinite(counts.cleanedRows)) stats.push(`${counts.cleanedRows} rows processed`);
    if (counts.blankRowsIgnored) stats.push(`${counts.blankRowsIgnored} blank ${counts.blankRowsIgnored === 1 ? 'row' : 'rows'} ignored`);
    if (counts.blankColumnsIgnored) stats.push(`${counts.blankColumnsIgnored} blank ${counts.blankColumnsIgnored === 1 ? 'column' : 'columns'} ignored`);
    const additional = Array.isArray(fields.unknownColumns) ? fields.unknownColumns.length : 0;
    if (additional) stats.push(`${additional} additional ${additional === 1 ? 'field' : 'fields'} preserved`);
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
      result.detail = 'Summary P&L · Dashboard Source · Cleaning not required';
      result.stats = [];
      return result;
    }
    if (role === 'current' || role === 'comparison') {
      const stores = sheetStoreCount(model, role);
      result.tone = 'success';
      result.detail = `${role === 'current' ? 'Current' : 'Comparison'} Detail${Number.isFinite(stores) ? ` · ${stores} stores` : ''} · Cleaned`;
      return result;
    }
    if (role === 'historical') {
      result.tone = 'success';
      result.detail = 'Compatible Detail · Cleaned · Not used in current analysis';
      return result;
    }
    if (role === 'unassigned') {
      result.tone = 'warning';
      result.detail = 'Compatible Detail · Cleaned';
      result.note = 'Not used in analysis · Year / Review Period could not be identified';
      return result;
    }
    if (sheet.cleaningStatus === 'nearCompatible' || role === 'nearCompatible') {
      result.tone = 'warning';
      result.detail = 'Detail sheet detected, but cannot be processed.';
      result.missing = ((sheet.fields && sheet.fields.missingRequired) || []).map(fieldLabel);
      result.stats = [];
      return result;
    }
    if (role === 'blocked') {
      result.tone = 'error';
      result.detail = 'Detail sheet detected, but its data could not be prepared.';
      result.missing = ((sheet.dashboardReadiness && sheet.dashboardReadiness.missing) || []).map(fieldLabel);
      return result;
    }
    result.detail = 'Not a store-level Detail sheet';
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
      title: hasLimitations ? 'Data Ready with Limitations' : hasWarnings ? 'Data Ready with Warnings' : 'Data Ready',
      summary: `${compatibleCount} store-level data ${compatibleCount === 1 ? 'sheet' : 'sheets'} prepared · ${usedCount} used in current analysis`,
      period: metadata.currentPeriodKey && metadata.comparisonPeriodKey
        ? `${metadata.currentPeriodKey} vs ${metadata.comparisonPeriodKey}`
        : '',
      steps: [
        'Workbook scanned',
        summary ? 'Summary P&L detected' : null,
        `${compatibleCount} store-level data ${compatibleCount === 1 ? 'sheet' : 'sheets'} prepared`,
        current && comparison ? 'Current and Comparison assigned' : null,
        'Data ready for analysis'
      ].filter(Boolean),
      primarySheets: [summary, current, comparison].filter(Boolean),
      additionalSheets: additional,
      sheetWarnings: nearCompatible,
      otherSheets: other,
      capabilityWarnings,
      privacy: 'Data is processed locally in your browser. No workbook upload to a server is required for this processing flow.',
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
        reason: `Current Detail is missing ${missing.length === 1 ? 'a required field' : 'required fields'}: ${missing.join(', ')}.`,
        detail: `${blockedCurrentCandidate.sheetName} cannot be used as Current Detail until the required ${missing.length === 1 ? 'field is' : 'fields are'} available.`,
        invalidateAssignments: true
      };
    }
    if (/Prior-year same-period detail sheet not found/i.test(message)) {
      return { reason: 'Comparison Detail could not be assigned.', detail: 'Expected a prior-year Detail sheet for the same Review Period.' };
    }
    if (/Current Store Detail sheet is ambiguous/i.test(message)) {
      return { reason: 'Current Detail could not be assigned.', detail: 'More than one Detail sheet matches the latest year and Review Period.' };
    }
    if (/No cleaned Store Detail sheet has reliable year/i.test(message)) {
      return { reason: 'Current Detail could not be assigned.', detail: 'Year / Review Period could not be identified for the cleaned Detail sheets.' };
    }
    if (/exactly one Review Period/i.test(message)) {
      return { reason: 'The workbook contains more than one Review Period.', detail: 'Use one review period and its prior-year comparison in a single analysis workbook.' };
    }
    if (/Expected exactly one Summary P&L sheet/i.test(message)) {
      return { reason: 'Summary P&L could not be identified.', detail: 'Expected one P&L review sheet for the current review year.' };
    }
    if (/Summary P&L year does not match/i.test(message)) {
      return { reason: 'Summary P&L and Current Detail years do not match.', detail: 'Check the year labels on the Summary and Current Detail sheets.' };
    }
    if (/Local libraries are missing|data layer.*missing/i.test(message)) {
      return { reason: 'The local dashboard libraries could not be loaded.', detail: 'Keep index.html, libs, js and assets together, then reopen the dashboard.' };
    }
    if (/Unsupported file type/i.test(message)) {
      return { reason: 'This file type is not supported.', detail: 'Use an .xlsx, .xls, .xlsm or .csv workbook.' };
    }
    return { reason: 'Workbook structure could not be prepared for analysis.', detail: 'Review the workbook sheets and required Detail fields, then try again.' };
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
      title: 'Data cannot be loaded for analysis',
      summary: mapped.reason,
      period: '',
      steps: sheets.length ? ['Workbook scanned'] : [],
      primarySheets: sheets.filter(sheet => ['summary', 'current', 'comparison'].includes(sheet.role)),
      additionalSheets: sheets.filter(sheet => ['historical', 'unassigned'].includes(sheet.role)),
      sheetWarnings: sheets.filter(sheet => sheet.role === 'nearCompatible' || sheet.tone === 'error'),
      otherSheets: sheets.filter(sheet => sheet.role === 'ignored'),
      capabilityWarnings: [{ key: 'workbook', status: 'unavailable', title: mapped.reason, detail: mapped.detail }],
      privacy: 'Data is processed locally in your browser. No workbook upload to a server is required for this processing flow.',
      expanded: true
    };
  }

  function buildLoadingPreparation(fileName) {
    return {
      mode: 'loading',
      title: 'Preparing workbook…',
      summary: fileName || 'Reading workbook and scanning sheets',
      period: '',
      steps: [], primarySheets: [], additionalSheets: [], sheetWarnings: [], otherSheets: [], capabilityWarnings: [],
      privacy: '', expanded: false
    };
  }

  function buildDemoPreparation() {
    return {
      mode: 'demo',
      title: 'Demo Dataset',
      summary: 'Synthetic data · Ready for analysis',
      period: '',
      steps: [], primarySheets: [], additionalSheets: [], sheetWarnings: [], otherSheets: [], capabilityWarnings: [],
      privacy: '', expanded: false
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
