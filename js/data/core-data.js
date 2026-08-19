(function (root, factory) {
  'use strict';

  const detailSchema = typeof module === 'object' && module.exports
    ? require('./detail-schema.js')
    : root.RetailDetailSchema;
  const dataCleaning = typeof module === 'object' && module.exports
    ? require('./data-cleaning.js')
    : root.RetailDataCleaning;
  const api = factory(detailSchema, dataCleaning);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailDashboardData = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (DetailSchema, DataCleaning) {
  'use strict';

  if (!DetailSchema || !Array.isArray(DetailSchema.FIELDS)) {
    throw new Error('RetailDetailSchema must be loaded before RetailDashboardData.');
  }
  if (!DataCleaning || typeof DataCleaning.scanWorkbook !== 'function') {
    throw new Error('RetailDataCleaning must be loaded before RetailDashboardData.');
  }

  const VERSION = '1.0.0';
  const DEFAULT_SCOPE = 'actualAdjusted';
  const RECONCILIATION_TOLERANCE = 1e-6;
  const DETAIL_PERIOD_SUFFIX_PATTERN = /(?:^|\s)Y(\d{2,4})\s+(S1|Full Year)$/i;
  const SUMMARY_SHEET_PATTERN = /^P&L review Y(\d{2,4})$/i;

  const SUMMARY_LINE_ALIASES = {
    posNo: ['POS no.'],
    aup: ['AUP'],
    grossSales: ['GROSS SALES'],
    totalDefensiveInvestment: ['Total Defensive Investment'],
    structuralConditionsOn: ['Structural Conditions On'],
    structuralConditionsOff: ['Structural Conditions Off'],
    totalActiveSupport: ['Total Active Support'],
    shopperInvestment: ['Shopper Investment'],
    promoAllowOnInvoice: ['Promo allow on invoice'],
    promoAllowAppliedSeparately: ['Promo allow applied separately'],
    promoAllowLoyalty: ['Promo allow loyalty'],
    totalReturns: ['Total Returns/var provisions'],
    totalMinorations: ['Total Minorations'],
    netSales: ['CONSO NET SALES'],
    netSalesPerPos: ['net sales/POS'],
    stdCos: ['Std COS'],
    royalTaMs: ['Royal/TA/MS'],
    specialOperationsCost: ['Special Operations cost'],
    obsoleteSlowMovingReturns: ['Obsolete / Slow moving / Returns'],
    physicalDistribution: ['Physical Distribution'],
    costOfSales: ['Cost of sales'],
    grossMargin: ['GROSS MARGIN'],
    customerSamples: ['Customer Samples. (val)'],
    promotionalGifts: ['Total Promotional gifts cost'],
    animations: ['Animations toward the distributor'],
    posAdvertisingAmortization: ['Amortization of immo POS adv'],
    otherPosAdvertising: ['Other POS advertising costs'],
    specificDevelopment: ['Specific development'],
    daCost: ['DA cost'],
    daHeadcount: ['DA HC'],
    nonDaCost: ['NON DA cost'],
    daCostPerHeadcount: ['DA cost/HC'],
    daHeadcountPerPos: ['DA HC/POS'],
    specificAP: ['Specific A&P'],
    specificSga: ['Total Specific SG&A'],
    customerContribution: ['CUSTOMER CONTRIBUTION'],
    nonSpecificCosts: ['Total non-specific costs'],
    operatingProfit: ['OP. PROFIT after FX excl PS']
  };

  const PORTFOLIO_RATIO_METRICS = new Set([
    'totalMinorationsPct', 'grossMarginPct', 'customerContributionPct'
  ]);

  const SUMMARY_REQUIRED_LINES = [
    'posNo', 'aup', 'grossSales', 'totalMinorations', 'netSales',
    'grossMargin', 'customerContribution'
  ];

  const SUMMARY_BRIDGES = {
    totalMinorations: {
      label: 'Total Minorations',
      metric: 'totalMinorations',
      ratioDenominator: 'grossSales',
      drivers: [
        ['structuralConditionsOn', 'Structural Conditions On'],
        ['structuralConditionsOff', 'Structural Conditions Off'],
        ['totalActiveSupport', 'Total Active Support'],
        ['promoAllowOnInvoice', 'Promo Allow On Invoice'],
        ['promoAllowAppliedSeparately', 'Promo Allow Applied Separately'],
        ['promoAllowLoyalty', 'Promo Allow Loyalty'],
        ['totalReturns', 'Total Returns / Var. Provisions']
      ]
    },
    grossMargin: {
      label: 'Gross Margin',
      metric: 'grossMargin',
      ratioDenominator: 'netSales',
      drivers: [
        ['netSales', 'CONSO Net Sales'],
        ['stdCos', 'Standard COS'],
        ['royalTaMs', 'Royal / TA / MS'],
        ['specialOperationsCost', 'Special Operations Cost'],
        ['obsoleteSlowMovingReturns', 'Obsolete / Slow Moving / Returns'],
        ['physicalDistribution', 'Physical Distribution']
      ]
    },
    customerContribution: {
      label: 'Customer Contribution',
      metric: 'customerContribution',
      ratioDenominator: 'netSales',
      drivers: [
        ['grossMargin', 'Gross Margin'],
        ['customerSamples', 'Customer Samples'],
        ['promotionalGifts', 'Promotional Gifts'],
        ['animations', 'Animations'],
        ['posAdvertisingAmortization', 'POS Advertising Amortization'],
        ['otherPosAdvertising', 'Other POS Advertising'],
        ['specificDevelopment', 'Specific Development'],
        ['specificSga', 'Specific SG&A']
      ]
    }
  };

  const FILTERED_BRIDGES = {
    totalMinorations: {
      label: 'Total Minorations',
      metric: 'totalMinorations',
      ratioDenominator: 'grossSales',
      drivers: [
        ['discount', 'Structural Conditions On'],
        ['rebates', 'Structural Conditions Off'],
        ['oca', 'Total Active Support'],
        ['bomPa', 'Promo Allow On Invoice'],
        ['paRetroFunding', 'Promo Allow Applied Separately'],
        ['vipRedemption', 'Promo Allow Loyalty'],
        ['totalReturns', 'Total Returns / Var. Provisions']
      ]
    },
    grossMargin: {
      label: 'Gross Margin',
      metric: 'grossMargin',
      ratioDenominator: 'netSales',
      drivers: [
        ['netSales', 'CONSO Net Sales'],
        ['stdCos', 'Standard COS'],
        ['royalTaMs', 'Royal / TA / MS'],
        ['specialOperationsCost', 'Special Operations Cost'],
        ['obsoleteSlowMovingReturns', 'Obsolete / Slow Moving / Returns'],
        ['physicalDistribution', 'Physical Distribution']
      ]
    },
    customerContribution: {
      label: 'Customer Contribution',
      metric: 'customerContribution',
      ratioDenominator: 'netSales',
      drivers: [
        ['grossMargin', 'Gross Margin'],
        ['specificAP', 'Specific A&P'],
        ['specificSga', 'Specific SG&A']
      ]
    }
  };

  function normalizeSpace(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function normalizeHeader(value) {
    return normalizeSpace(value).toLowerCase();
  }

  function normalizeLabel(value) {
    return normalizeHeader(value)
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9\u4e00-\u9fff%]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeStoreName(value) {
    return normalizeHeader(value).replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
  }

  function parseYear(token) {
    const numeric = Number(token);
    if (!Number.isFinite(numeric)) return null;
    if (String(token).length === 2) return numeric >= 70 ? 1900 + numeric : 2000 + numeric;
    return numeric;
  }

  function normalizeReviewPeriod(value) {
    const text = normalizeHeader(value);
    if (text === 's1') return 'S1';
    if (text === 'full year' || text === 'fullyear' || text === 'fy') return 'Full Year';
    return null;
  }

  function toNumber(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    let text = normalizeSpace(value);
    if (!text || text === '-' || text === '—' || /^n\/?a$/i.test(text)) return null;
    let sign = 1;
    if (/^\(.*\)$/.test(text)) {
      sign = -1;
      text = text.slice(1, -1);
    }
    const percent = text.endsWith('%');
    text = text.replace(/[,%¥$]/g, '');
    const number = Number(text);
    if (!Number.isFinite(number)) return null;
    return sign * number / (percent ? 100 : 1);
  }

  function toRatio(value) {
    const number = toNumber(value);
    if (number == null) return null;
    return Math.abs(number) > 1.5 ? number / 100 : number;
  }

  function amountVariance(current, comparison) {
    return Number.isFinite(current) && Number.isFinite(comparison)
      ? current - comparison
      : null;
  }

  function amountRelativeVariance(current, comparison) {
    return Number.isFinite(current) && Number.isFinite(comparison) && Math.abs(comparison) > 1e-12
      ? (current - comparison) / Math.abs(comparison)
      : null;
  }

  function ratioVariance(currentRatio, comparisonRatio) {
    return Number.isFinite(currentRatio) && Number.isFinite(comparisonRatio)
      ? currentRatio - comparisonRatio
      : null;
  }

  function safeRatio(numerator, denominator) {
    return Number.isFinite(numerator) && Number.isFinite(denominator) && Math.abs(denominator) > 1e-12
      ? numerator / denominator
      : null;
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(value => normalizeSpace(value))))
      .sort((left, right) => String(left).localeCompare(String(right), 'zh-CN'));
  }

  function sheetToMatrix(workbook, sheetName, XLSX) {
    if (!XLSX || !XLSX.utils || typeof XLSX.utils.sheet_to_json !== 'function') {
      throw new Error('A compatible local SheetJS runtime is required.');
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Worksheet not found: ${sheetName}`);
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false
    });
  }

  function extractDetailPeriodMetadata(name) {
    const match = normalizeSpace(name).match(DETAIL_PERIOD_SUFFIX_PATTERN);
    if (!match) return null;
    return {
      year: parseYear(match[1]),
      reviewPeriod: normalizeReviewPeriod(match[2]),
      source: 'sheet-name-suffix'
    };
  }

  function summarySheetInfo(name) {
    const match = normalizeSpace(name).match(SUMMARY_SHEET_PATTERN);
    if (!match) return null;
    return { name, year: parseYear(match[1]) };
  }

  function validateSummaryCandidate(matrix) {
    const top = matrix.slice(0, 50).flat().map(normalizeLabel);
    return ['gross sales', 'gross margin', 'customer contribution'].every(label => top.includes(label))
      && top.includes('actual adj');
  }

  function classifyScanRole(scan, periodMetadata, assignments) {
    if (scan.classification === 'summary') return 'summary';
    if (assignments.current && scan.sheetName === assignments.current.sheetName) return 'current';
    if (assignments.comparison && scan.sheetName === assignments.comparison.sheetName) return 'comparison';
    if (scan.cleaningStatus === 'compatible' && scan.dashboardReadiness.status === 'ready') {
      return periodMetadata ? 'historical' : 'unassigned';
    }
    if (scan.cleaningStatus === 'nearCompatible') return 'nearCompatible';
    if (scan.diagnostics.some(item => item.severity === 'blocking')) return 'blocked';
    if (scan.cleaningStatus === 'compatible' && scan.dashboardReadiness.status === 'blocked') return 'blocked';
    return 'ignored';
  }

  function sanitizeScanSheet(scan, periodMetadata, role) {
    const fields = scan.fields ? {
      matchedRequired: scan.fields.matchedRequired.slice(),
      missingRequired: scan.fields.missingRequired.slice(),
      matchedOptional: scan.fields.matchedOptional.slice(),
      missingOptional: scan.fields.missingOptional.slice(),
      unknownColumns: scan.fields.unknownColumns.map(column => ({ ...column })),
      evidence: { ...scan.fields.evidence }
    } : null;
    return {
      sheetName: scan.sheetName,
      sheetIndex: scan.sheetIndex,
      classification: scan.classification,
      cleaningStatus: scan.cleaningStatus,
      dashboardReadiness: {
        status: scan.dashboardReadiness.status,
        missing: scan.dashboardReadiness.missing.slice()
      },
      periodMetadata: periodMetadata ? { ...periodMetadata } : null,
      role,
      header: scan.header ? {
        sourceRowNumber: scan.header.sourceRowNumber,
        sourceRowIndex: scan.header.sourceRowIndex
      } : null,
      fields,
      counts: { ...scan.counts },
      diagnostics: scan.diagnostics.map(item => ({ ...item })),
      capabilities: scan.capabilities
    };
  }

  function buildWorkbookScanMetadata(cleaningScan, detailScans, assignments) {
    const periodMetadataBySheet = new Map(
      detailScans.map(scan => [scan.sheetName, extractDetailPeriodMetadata(scan.sheetName)])
    );
    const scanSheets = cleaningScan.sheets.map(scan => {
      const periodMetadata = periodMetadataBySheet.get(scan.sheetName) || null;
      return sanitizeScanSheet(scan, periodMetadata, classifyScanRole(scan, periodMetadata, assignments || {}));
    });
    return {
      version: cleaningScan.version,
      sheets: scanSheets,
      compatibleSheets: scanSheets.filter(sheet => sheet.cleaningStatus === 'compatible').map(sheet => sheet.sheetName),
      unassignedCompatible: scanSheets.filter(sheet => sheet.role === 'unassigned').map(sheet => sheet.sheetName),
      historicalCompatible: scanSheets.filter(sheet => sheet.role === 'historical').map(sheet => sheet.sheetName),
      nearCompatible: scanSheets.filter(sheet => sheet.cleaningStatus === 'nearCompatible').map(sheet => sheet.sheetName),
      assigned: {
        current: assignments && assignments.current ? assignments.current.sheetName : null,
        comparison: assignments && assignments.comparison ? assignments.comparison.sheetName : null
      },
      diagnostics: cleaningScan.diagnostics.map(item => ({ ...item }))
    };
  }

  function workbookPreparationError(message, workbookScan) {
    const error = new Error(message);
    error.workbookScan = workbookScan;
    return error;
  }

  function discoverWorkbookSheets(workbook, XLSX) {
    const sheetNames = Array.isArray(workbook.SheetNames) ? workbook.SheetNames : [];
    const summaryCandidates = [];

    sheetNames.forEach(name => {
      const summaryInfo = summarySheetInfo(name);
      if (!summaryInfo) return;
      const matrix = sheetToMatrix(workbook, name, XLSX);
      if (validateSummaryCandidate(matrix)) summaryCandidates.push({ ...summaryInfo, matrix });
    });

    if (summaryCandidates.length !== 1) {
      throw new Error(`Expected exactly one Summary P&L sheet; found ${summaryCandidates.length}.`);
    }

    const summary = summaryCandidates[0];
    const cleaningScan = DataCleaning.scanWorkbook(workbook, {
      XLSX,
      summarySheetNames: [summary.name]
    });
    const detailScans = cleaningScan.sheets.filter(scan => scan.classification !== 'summary');
    const compatibleReady = detailScans
      .filter(scan => scan.cleaningStatus === 'compatible' && scan.dashboardReadiness.status === 'ready')
      .map(scan => ({
        sheetName: scan.sheetName,
        scan,
        periodMetadata: extractDetailPeriodMetadata(scan.sheetName)
      }));
    const roleCandidates = compatibleReady.filter(item => item.periodMetadata);
    const preliminaryScan = buildWorkbookScanMetadata(cleaningScan, detailScans, {});

    if (!roleCandidates.length) {
      throw workbookPreparationError('No cleaned Store Detail sheet has reliable year and review-period metadata.', preliminaryScan);
    }

    const periods = uniqueSorted(roleCandidates.map(item => item.periodMetadata.reviewPeriod));
    if (periods.length !== 1) {
      throw workbookPreparationError('One Workbook must contain exactly one Review Period.', preliminaryScan);
    }
    const reviewPeriod = periods[0];
    const currentYear = Math.max(...roleCandidates.map(item => item.periodMetadata.year));
    const comparisonYear = currentYear - 1;
    const currentCandidates = roleCandidates.filter(item => (
      item.periodMetadata.year === currentYear && item.periodMetadata.reviewPeriod === reviewPeriod
    ));
    const comparisonCandidates = roleCandidates.filter(item => (
      item.periodMetadata.year === comparisonYear && item.periodMetadata.reviewPeriod === reviewPeriod
    ));
    const diagnosticAssignments = {
      current: currentCandidates.length === 1 ? currentCandidates[0] : null,
      comparison: comparisonCandidates.length === 1 ? comparisonCandidates[0] : null
    };
    const diagnosticScan = buildWorkbookScanMetadata(cleaningScan, detailScans, diagnosticAssignments);
    if (currentCandidates.length !== 1) {
      throw workbookPreparationError(`Current Store Detail sheet is ambiguous for Y${String(currentYear).slice(-2)} ${reviewPeriod}.`, diagnosticScan);
    }
    if (comparisonCandidates.length !== 1) {
      throw workbookPreparationError('Prior-year same-period detail sheet not found.', diagnosticScan);
    }
    if (summary.year !== currentYear) {
      throw workbookPreparationError('Summary P&L year does not match the current Store Detail year.', diagnosticScan);
    }

    const assignments = { current: currentCandidates[0], comparison: comparisonCandidates[0] };

    return {
      summary,
      currentDetail: currentCandidates[0],
      comparisonDetail: comparisonCandidates[0],
      reviewPeriod,
      currentYear,
      comparisonYear,
      workbookScan: buildWorkbookScanMetadata(cleaningScan, detailScans, assignments)
    };
  }

  function findSummaryColumns(matrix, currentYear, comparisonYear, reviewPeriod) {
    const result = { current: {}, comparison: {} };
    const headerRows = matrix.slice(0, 6);

    headerRows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const scopeLabel = normalizeLabel(cell);
        if (scopeLabel !== 'actual' && scopeLabel !== 'actual adj') return;

        const periodText = headerRows.slice(0, rowIndex + 1)
          .map(header => normalizeSpace(header[columnIndex]))
          .reverse()
          .find(text => /\d{2,4}/.test(text) && (normalizeHeader(text).includes('s1') || normalizeHeader(text).includes('full year')));
        if (!periodText) return;
        const yearMatch = periodText.match(/(\d{2,4})/);
        const year = yearMatch ? parseYear(yearMatch[1]) : null;
        const period = normalizeReviewPeriod(periodText.replace(/.*?\d{2,4}\s*/i, ''));
        if (period !== reviewPeriod) return;

        const periodRole = year === currentYear ? 'current' : year === comparisonYear ? 'comparison' : null;
        if (!periodRole) return;
        const scope = scopeLabel === 'actual adj' ? 'actualAdjusted' : 'actual';
        const valueTypeRow = headerRows.find(header => normalizeHeader(header[columnIndex]) === 'value');
        const percentColumn = normalizeHeader((valueTypeRow || [])[columnIndex + 1]) === '%' ? columnIndex + 1 : null;
        result[periodRole][scope] = { valueColumn: columnIndex, percentColumn };
      });
    });

    ['current', 'comparison'].forEach(role => {
      if (!result[role].actualAdjusted && !result[role].actual) {
        throw new Error(`Summary ${role} Actual / Actual Adj. columns could not be detected.`);
      }
    });
    return result;
  }

  function buildSummaryAliasMap() {
    const result = new Map();
    Object.entries(SUMMARY_LINE_ALIASES).forEach(([key, aliases]) => {
      aliases.forEach(alias => result.set(normalizeLabel(alias), key));
    });
    return result;
  }

  function readSummaryScope(row, columns) {
    if (!columns) return null;
    return {
      value: toNumber(row[columns.valueColumn]),
      pct: columns.percentColumn == null ? null : toRatio(row[columns.percentColumn])
    };
  }

  function parseSummarySheet(discovered) {
    const { matrix, name } = discovered.summary;
    const columns = findSummaryColumns(
      matrix,
      discovered.currentYear,
      discovered.comparisonYear,
      discovered.reviewPeriod
    );
    const aliasMap = buildSummaryAliasMap();
    const lines = [];
    const byKey = {};

    matrix.forEach((row, rowIndex) => {
      let key = null;
      let label = null;
      let labelColumn = null;
      row.slice(0, 4).some((cell, columnIndex) => {
        const candidate = aliasMap.get(normalizeLabel(cell));
        if (!candidate) return false;
        key = candidate;
        label = normalizeSpace(cell);
        labelColumn = columnIndex;
        return true;
      });
      if (!key || byKey[key]) return;

      const line = {
        key,
        label,
        sourceRow: rowIndex + 1,
        labelColumn: labelColumn + 1,
        current: {
          actual: readSummaryScope(row, columns.current.actual),
          actualAdjusted: readSummaryScope(row, columns.current.actualAdjusted)
        },
        comparison: {
          actual: readSummaryScope(row, columns.comparison.actual),
          actualAdjusted: readSummaryScope(row, columns.comparison.actualAdjusted)
        }
      };
      lines.push(line);
      byKey[key] = line;
    });

    const missing = SUMMARY_REQUIRED_LINES.filter(key => !byKey[key]);
    if (missing.length) throw new Error(`Summary P&L is missing required lines: ${missing.join(', ')}.`);

    return {
      sheetName: name,
      defaultScope: DEFAULT_SCOPE,
      unit: 'KRMB',
      headerRows: [1, 2, 3, 4],
      columns,
      lines,
      byKey
    };
  }

  function mappingsFromCleanedSheet(cleanedSheet) {
    const mappings = Object.fromEntries(DetailSchema.FIELDS.map(field => [field.key, null]));
    cleanedSheet.header.columns.forEach(column => {
      if (!column.canonicalKey) return;
      mappings[column.canonicalKey] = {
        columnIndex: column.sourceColumnIndex,
        header: column.cleanedHeader,
        match: 'cleaned-exact-header'
      };
    });
    mappings.posNo = { columnIndex: null, header: null, match: 'derived-distinct-terminal' };
    return mappings;
  }

  function isTotalOrBlankDetailValues(values) {
    const terminal = normalizeHeader(values.terminal);
    const store = normalizeHeader(values.store);
    if (!terminal && !store) return true;
    return terminal === 'total' || store === 'total' || terminal.startsWith('total ') || store.startsWith('total ');
  }

  function parseDetailSheet(detailInfo) {
    const cleanedSheet = detailInfo.scan;
    const { year, reviewPeriod } = detailInfo.periodMetadata;
    if (cleanedSheet.cleaningStatus !== 'compatible' || cleanedSheet.dashboardReadiness.status !== 'ready') {
      throw new Error(`Store Detail sheet is not ready for Dashboard parsing: ${cleanedSheet.sheetName}.`);
    }
    const mappings = mappingsFromCleanedSheet(cleanedSheet);
    const ambiguousRatioCells = new Set(cleanedSheet.diagnostics
      .filter(item => item.code === 'RATIO_SCALE_AMBIGUOUS')
      .map(item => `${item.sourceRowNumber}:${item.sourceColumnIndex}`));
    const stores = [];

    cleanedSheet.cleanedRows.forEach(row => {
      const values = Object.fromEntries(DetailSchema.FIELDS.map(field => [field.key, null]));
      row.cells.forEach(cell => {
        if (!cell.canonicalKey) return;
        const location = `${row.sourceRowNumber}:${cell.sourceColumnIndex}`;
        values[cell.canonicalKey] = ambiguousRatioCells.has(location) ? null : cell.cleanedValue;
      });
      if (isTotalOrBlankDetailValues(values)) return;
      values.posNo = values.terminal ? 1 : 0;
      const apExpense = values.specificAP;
      const apExpenseMagnitude = Number.isFinite(apExpense) ? Math.abs(apExpense) : null;
      const apExpensePct = Number.isFinite(values.specificAPPct)
        ? values.specificAPPct
        : safeRatio(apExpense, values.netSales);
      stores.push({
        sourceRow: row.sourceRowNumber,
        year,
        reviewPeriod,
        terminal: values.terminal,
        store: values.store,
        city: values.city,
        region: values.region,
        status: values.status,
        productivityTier: values.productivityTier,
        storeProductivity: values.storeProductivity,
        cityPosNo: values.cityPosNo,
        posNo: values.posNo,
        apExpense,
        apExpenseMagnitude,
        metrics: {
          posNo: values.posNo,
          storeProductivity: values.storeProductivity,
          cityPosNo: values.cityPosNo,
          grossSales: values.grossSales,
          totalMinorations: values.totalMinorations,
          totalMinorationsPct: values.totalMinorationsPct,
          netSales: values.netSales,
          netSalesPct: values.netSalesPct,
          grossMargin: values.grossMargin,
          grossMarginPct: values.grossMarginPct,
          apExpense,
          apExpenseMagnitude,
          apExpensePct,
          customerContribution: values.customerContribution,
          customerContributionPct: values.customerContributionPct
        },
        pnl: values
      });
    });

    return {
      sheetName: cleanedSheet.sheetName,
      year,
      reviewPeriod,
      headerRow: cleanedSheet.header.sourceRowNumber,
      mappings,
      stores,
      capabilities: cleanedSheet.capabilities
    };
  }

  function matchStores(currentStores, comparisonStores) {
    const unmatchedComparison = new Set(comparisonStores);
    const byTerminal = new Map();
    const byName = new Map();
    comparisonStores.forEach(store => {
      const terminal = normalizeHeader(store.terminal);
      const name = normalizeStoreName(store.store);
      if (terminal) byTerminal.set(terminal, store);
      if (name && !byName.has(name)) byName.set(name, store);
    });

    const existing = [];
    const added = [];
    currentStores.forEach(current => {
      const terminalKey = normalizeHeader(current.terminal);
      const nameKey = normalizeStoreName(current.store);
      let comparison = terminalKey ? byTerminal.get(terminalKey) : null;
      let method = comparison ? 'terminal' : null;
      if ((!comparison || !unmatchedComparison.has(comparison)) && nameKey) {
        comparison = byName.get(nameKey);
        method = comparison ? 'store-name-fallback' : null;
      }
      if (comparison && unmatchedComparison.has(comparison)) {
        unmatchedComparison.delete(comparison);
        existing.push({ status: 'existing', method, current, comparison });
      } else {
        added.push({ status: 'new', method: null, current, comparison: null });
      }
    });

    const missing = Array.from(unmatchedComparison).map(comparison => ({
      status: 'missing', method: null, current: null, comparison
    }));
    return {
      existing,
      new: added,
      missing,
      all: [...existing, ...added, ...missing]
    };
  }

  function resolveSummaryValue(summary, key, role) {
    const line = summary.byKey[key];
    if (!line) return { value: null, pct: null, scope: null, usedFallback: false };
    const adjusted = line[role].actualAdjusted;
    const actual = line[role].actual;
    const adjustedHasValue = adjusted && adjusted.value != null;
    const chosen = adjustedHasValue ? adjusted : actual;
    return {
      value: chosen ? chosen.value : null,
      pct: chosen ? chosen.pct : null,
      scope: adjustedHasValue ? 'actualAdjusted' : actual ? 'actual' : null,
      usedFallback: !adjustedHasValue && Boolean(actual)
    };
  }

  function summaryMetrics(summary, role) {
    const posNo = resolveSummaryValue(summary, 'posNo', role);
    const aup = resolveSummaryValue(summary, 'aup', role);
    const grossSales = resolveSummaryValue(summary, 'grossSales', role);
    const totalMinorations = resolveSummaryValue(summary, 'totalMinorations', role);
    const netSales = resolveSummaryValue(summary, 'netSales', role);
    const grossMargin = resolveSummaryValue(summary, 'grossMargin', role);
    const contribution = resolveSummaryValue(summary, 'customerContribution', role);
    return {
      values: {
        posNo: posNo.value,
        aup: aup.value,
        grossSales: grossSales.value,
        totalMinorations: totalMinorations.value,
        totalMinorationsPct: totalMinorations.pct,
        netSales: netSales.value,
        grossMargin: grossMargin.value,
        grossMarginPct: grossMargin.pct,
        customerContribution: contribution.value,
        customerContributionPct: contribution.pct
      },
      sources: { posNo, aup, grossSales, totalMinorations, netSales, grossMargin, customerContribution: contribution }
    };
  }

  function resolveDashboardCapabilities(currentCapabilities, comparisonCapabilities) {
    const resolved = {};
    Object.keys(DetailSchema.CAPABILITY_RULES).forEach(key => {
      const current = currentCapabilities[key];
      const comparison = comparisonCapabilities[key];
      let status = 'partial';
      if (current.status === 'available' && comparison.status === 'available') status = 'available';
      else if (current.status === 'unavailable' && comparison.status === 'unavailable') status = 'unavailable';
      resolved[key] = {
        status,
        missing: {
          current: current.missing.slice(),
          comparison: comparison.missing.slice()
        }
      };
    });
    return resolved;
  }

  function parseWorkbook(workbook, options) {
    const settings = options || {};
    const XLSX = settings.XLSX || (typeof globalThis !== 'undefined' ? globalThis.XLSX : null);
    const discovered = discoverWorkbookSheets(workbook, XLSX);
    const summary = parseSummarySheet(discovered);
    const current = parseDetailSheet(discovered.currentDetail);
    const comparison = parseDetailSheet(discovered.comparisonDetail);
    const storeMatches = matchStores(current.stores, comparison.stores);
    const currentSummary = summaryMetrics(summary, 'current');
    const comparisonSummary = summaryMetrics(summary, 'comparison');
    const capabilities = {
      current: current.capabilities,
      comparison: comparison.capabilities,
      resolved: resolveDashboardCapabilities(current.capabilities, comparison.capabilities)
    };

    return {
      version: VERSION,
      metadata: {
        fileName: settings.fileName || null,
        workbookMode: 'one-workbook-one-review-period',
        reviewPeriod: discovered.reviewPeriod,
        currentYear: discovered.currentYear,
        comparisonYear: discovered.comparisonYear,
        currentPeriodKey: `${discovered.currentYear} ${discovered.reviewPeriod}`,
        comparisonPeriodKey: `${discovered.comparisonYear} ${discovered.reviewPeriod}`,
        comparisonRule: 'prior-year-same-period',
        unit: 'KRMB',
        workbookScan: discovered.workbookScan,
        capabilities,
        sheets: {
          summary: summary.sheetName,
          currentDetail: current.sheetName,
          comparisonDetail: comparison.sheetName
        }
      },
      summary: {
        ...summary,
        periods: {
          current: currentSummary,
          comparison: comparisonSummary
        }
      },
      detail: { current, comparison },
      storeMatches,
      fieldMappings: {
        summary: { columns: summary.columns, lines: Object.keys(summary.byKey) },
        detail: current.mappings
      },
      pnlHierarchy: {
        totalMinorations: SUMMARY_BRIDGES.totalMinorations.drivers.map(item => item[0]),
        grossMargin: SUMMARY_BRIDGES.grossMargin.drivers.map(item => item[0]),
        customerContribution: SUMMARY_BRIDGES.customerContribution.drivers.map(item => item[0])
      }
    };
  }

  function parseArrayBuffer(arrayBuffer, options) {
    const settings = options || {};
    const XLSX = settings.XLSX || (typeof globalThis !== 'undefined' ? globalThis.XLSX : null);
    if (!XLSX || typeof XLSX.read !== 'function') throw new Error('A compatible local SheetJS runtime is required.');
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellFormula: true });
    return parseWorkbook(workbook, settings);
  }

  function normalizeFilters(filters) {
    const input = filters || {};
    const clean = value => {
      const text = normalizeSpace(value);
      return !text || normalizeHeader(text) === 'all' ? null : text;
    };
    return {
      reviewPeriod: clean(input.reviewPeriod),
      region: clean(input.region),
      city: clean(input.city),
      status: clean(input.status),
      productivityTier: clean(input.productivityTier != null ? input.productivityTier : input.tier)
    };
  }

  function hasPortfolioFilter(filters) {
    const normalized = normalizeFilters(filters);
    return Boolean(normalized.region || normalized.city || normalized.status || normalized.productivityTier);
  }

  function storeMatchesFilters(store, filters, ignoredKey) {
    const normalized = normalizeFilters(filters);
    const tests = {
      reviewPeriod: store.reviewPeriod,
      region: store.region,
      city: store.city,
      status: store.status,
      productivityTier: store.productivityTier
    };
    return Object.entries(normalized).every(([key, expected]) => {
      if (key === ignoredKey || expected == null) return true;
      return normalizeHeader(tests[key]) === normalizeHeader(expected);
    });
  }

  function sumField(stores, field) {
    let total = 0;
    for (const store of stores) {
      const value = store.pnl[field];
      if (!Number.isFinite(value)) return null;
      total += value;
    }
    return total;
  }

  function sumStoreValue(stores, field) {
    let total = 0;
    for (const store of stores) {
      const value = store[field];
      if (!Number.isFinite(value)) return null;
      total += value;
    }
    return total;
  }

  function aggregateStores(stores, aup) {
    const grossSales = sumField(stores, 'grossSales');
    const totalMinorations = sumField(stores, 'totalMinorations');
    const netSales = sumField(stores, 'netSales');
    const grossMargin = sumField(stores, 'grossMargin');
    const customerContribution = sumField(stores, 'customerContribution');
    const posNo = sumStoreValue(stores, 'cityPosNo');
    return {
      posNo,
      aup,
      grossSales,
      totalMinorations,
      totalMinorationsPct: grossSales ? totalMinorations / grossSales : null,
      netSales,
      grossMargin,
      grossMarginPct: netSales ? grossMargin / netSales : null,
      customerContribution,
      customerContributionPct: netSales ? customerContribution / netSales : null,
      storeCount: stores.length
    };
  }

  function metricVariances(current, comparison) {
    const result = {};
    Object.keys(current).forEach(key => {
      result[key] = PORTFOLIO_RATIO_METRICS.has(key)
        ? ratioVariance(current[key], comparison[key])
        : amountVariance(current[key], comparison[key]);
    });
    return result;
  }

  function buildBridgeResult(config, currentValue, comparisonValue, drivers, mode, tolerance, ratios) {
    const driverTotal = drivers.reduce((sum, driver) => sum + driver.variance, 0);
    const expectedCurrent = comparisonValue + driverTotal;
    const residual = expectedCurrent - currentValue;
    const ok = Math.abs(residual) <= tolerance;
    const currentRatio = ratios ? ratios.current : null;
    const comparisonRatio = ratios ? ratios.comparison : null;
    return {
      metric: config.metric,
      label: config.label,
      mode,
      comparison: comparisonValue,
      current: currentValue,
      comparisonRatio,
      currentRatio,
      ratioVariance: ratioVariance(currentRatio, comparisonRatio),
      drivers,
      reconciliation: {
        ok,
        tolerance,
        expectedCurrent,
        actualCurrent: currentValue,
        residual
      },
      error: ok ? null : {
        code: 'BRIDGE_RECONCILIATION_ERROR',
        message: `${config.label} bridge does not reconcile; residual ${residual}.`,
        residual
      }
    };
  }

  function createDataService(model, options) {
    if (!model || !model.metadata || !model.summary || !model.detail) {
      throw new Error('A normalized Retail Performance Dashboard model is required.');
    }
    const tolerance = options && Number.isFinite(options.reconciliationTolerance)
      ? options.reconciliationTolerance
      : RECONCILIATION_TOLERANCE;

    function storesFor(role, filters) {
      const stores = model.detail[role].stores;
      return stores.filter(store => storeMatchesFilters(store, filters));
    }

    function getFilterOptions(filters) {
      const currentStores = model.detail.current.stores;
      const cityStores = currentStores.filter(store => storeMatchesFilters(store, filters, 'city'));
      return {
        reviewPeriod: [model.metadata.reviewPeriod],
        region: uniqueSorted(currentStores.map(store => store.region)),
        city: uniqueSorted(cityStores.map(store => store.city)),
        status: uniqueSorted(currentStores.map(store => store.status)),
        productivityTier: uniqueSorted(currentStores.map(store => store.productivityTier))
      };
    }

    function getPortfolioMetrics(filters) {
      const normalized = normalizeFilters(filters);
      if (!hasPortfolioFilter(normalized)) {
        const current = model.summary.periods.current.values;
        const comparison = model.summary.periods.comparison.values;
        return {
          mode: 'total',
          label: 'Total Portfolio',
          source: 'summary-pnl-actual-adjusted',
          filters: normalized,
          current: { ...current },
          comparison: { ...comparison },
          variance: metricVariances(current, comparison),
          sourceDetails: {
            current: model.summary.periods.current.sources,
            comparison: model.summary.periods.comparison.sources
          }
        };
      }

      const currentStores = storesFor('current', normalized);
      const comparisonStores = storesFor('comparison', normalized);
      const current = aggregateStores(currentStores, model.summary.periods.current.values.aup);
      const comparison = aggregateStores(comparisonStores, model.summary.periods.comparison.values.aup);
      return {
        mode: 'filtered',
        label: 'Filtered Portfolio',
        source: 'store-detail-aggregation',
        filters: normalized,
        current,
        comparison,
        variance: metricVariances(current, comparison),
        rowCounts: { current: currentStores.length, comparison: comparisonStores.length },
        aupSource: 'summary-pnl-actual-adjusted-unfiltered'
      };
    }

    function getSummaryBridge(metric) {
      const config = SUMMARY_BRIDGES[metric];
      if (!config) throw new Error(`Unsupported bridge metric: ${metric}`);
      const currentTarget = resolveSummaryValue(model.summary, config.metric, 'current');
      const comparisonTarget = resolveSummaryValue(model.summary, config.metric, 'comparison');
      const currentValue = currentTarget.value;
      const comparisonValue = comparisonTarget.value;
      const currentDenominator = resolveSummaryValue(model.summary, config.ratioDenominator, 'current').value;
      const comparisonDenominator = resolveSummaryValue(model.summary, config.ratioDenominator, 'comparison').value;
      const currentRatio = Number.isFinite(currentTarget.pct)
        ? currentTarget.pct
        : safeRatio(currentValue, currentDenominator);
      const comparisonRatio = Number.isFinite(comparisonTarget.pct)
        ? comparisonTarget.pct
        : safeRatio(comparisonValue, comparisonDenominator);
      const drivers = config.drivers.map(([field, label]) => {
        const currentSource = resolveSummaryValue(model.summary, field, 'current');
        const comparisonSource = resolveSummaryValue(model.summary, field, 'comparison');
        const current = currentSource.value || 0;
        const comparison = comparisonSource.value || 0;
        const driverCurrentRatio = Number.isFinite(currentSource.pct)
          ? currentSource.pct
          : safeRatio(current, currentDenominator);
        const driverComparisonRatio = Number.isFinite(comparisonSource.pct)
          ? comparisonSource.pct
          : safeRatio(comparison, comparisonDenominator);
        return {
          field,
          label,
          current,
          comparison,
          variance: amountVariance(current, comparison),
          currentRatio: driverCurrentRatio,
          comparisonRatio: driverComparisonRatio,
          ratioVariance: ratioVariance(driverCurrentRatio, driverComparisonRatio)
        };
      });
      return buildBridgeResult(
        config,
        currentValue,
        comparisonValue,
        drivers,
        'total',
        tolerance,
        { current: currentRatio, comparison: comparisonRatio }
      );
    }

    function getFilteredBridge(metric, filters) {
      const config = FILTERED_BRIDGES[metric];
      if (!config) throw new Error(`Unsupported bridge metric: ${metric}`);
      const currentStores = storesFor('current', filters);
      const comparisonStores = storesFor('comparison', filters);
      const currentValue = sumField(currentStores, config.metric);
      const comparisonValue = sumField(comparisonStores, config.metric);
      const currentDenominator = sumField(currentStores, config.ratioDenominator);
      const comparisonDenominator = sumField(comparisonStores, config.ratioDenominator);
      const currentRatio = safeRatio(currentValue, currentDenominator);
      const comparisonRatio = safeRatio(comparisonValue, comparisonDenominator);
      const drivers = config.drivers.map(([field, label]) => {
        const current = sumField(currentStores, field);
        const comparison = sumField(comparisonStores, field);
        const driverCurrentRatio = safeRatio(current, currentDenominator);
        const driverComparisonRatio = safeRatio(comparison, comparisonDenominator);
        return {
          field,
          label,
          current,
          comparison,
          variance: amountVariance(current, comparison),
          currentRatio: driverCurrentRatio,
          comparisonRatio: driverComparisonRatio,
          ratioVariance: ratioVariance(driverCurrentRatio, driverComparisonRatio)
        };
      });
      const result = buildBridgeResult(
        config,
        currentValue,
        comparisonValue,
        drivers,
        'filtered',
        tolerance,
        { current: currentRatio, comparison: comparisonRatio }
      );
      result.rowCounts = { current: currentStores.length, comparison: comparisonStores.length };
      result.source = 'store-detail-aggregation';
      return result;
    }

    return Object.freeze({
      model,
      getMetadata: () => ({ ...model.metadata }),
      getFilterOptions,
      getStores: (role, filters) => storesFor(role === 'comparison' ? 'comparison' : 'current', filters),
      getPortfolioMetrics,
      getBridgeData: (metric, filters) => hasPortfolioFilter(filters)
        ? getFilteredBridge(metric, normalizeFilters(filters))
        : getSummaryBridge(metric),
      getStoreMatches: () => model.storeMatches
    });
  }

  return Object.freeze({
    VERSION,
    parseWorkbook,
    parseArrayBuffer,
    discoverWorkbookSheets,
    extractDetailPeriodMetadata,
    resolveDashboardCapabilities,
    createDataService,
    matchStores,
    normalizeFilters,
    amountRelativeVariance,
    ratioVariance,
    constants: Object.freeze({
      defaultScope: DEFAULT_SCOPE,
      reconciliationTolerance: RECONCILIATION_TOLERANCE,
      supportedReviewPeriods: ['S1', 'Full Year'],
      portfolioFilters: ['Review Period', 'Region', 'City', 'Status', 'Store Productivity Tier']
    })
  });
}));
