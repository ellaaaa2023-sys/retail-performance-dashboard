(function (root, factory) {
  'use strict';

  const schema = typeof module === 'object' && module.exports
    ? require('./detail-schema.js')
    : root.RetailDetailSchema;
  const api = factory(schema);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailDataCleaning = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (DetailSchema) {
  'use strict';

  if (!DetailSchema || !Array.isArray(DetailSchema.FIELDS)) {
    throw new Error('RetailDetailSchema must be loaded before RetailDataCleaning.');
  }

  const VERSION = '1.0.0';
  const NUMERIC_TYPES = new Set(['amount', 'ratio', 'count', 'productivity']);
  const MISSING_SENTINELS = new Set(['', '-', '—', 'n/a', 'na']);

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\u3000/g, ' ')
      .replace(/[\t\r\n]/g, ' ')
      .trim()
      .replace(/ +/g, ' ');
  }

  function normalizeHeader(value) {
    return normalizeText(value).toLowerCase();
  }

  function isMissingValue(value) {
    if (value == null) return true;
    if (typeof value !== 'string') return false;
    return MISSING_SENTINELS.has(normalizeText(value).toLowerCase());
  }

  function diagnostic(code, severity, context) {
    return {
      code,
      severity,
      sheetName: context.sheetName,
      sourceRowNumber: context.sourceRowNumber == null ? null : context.sourceRowNumber,
      sourceColumnIndex: context.sourceColumnIndex == null ? null : context.sourceColumnIndex,
      canonicalKey: context.canonicalKey || null
    };
  }

  function parseNumeric(value, type) {
    if (isMissingValue(value)) return { value: null, diagnostics: [] };

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return { value: null, diagnostics: ['INVALID_NUMERIC'] };
      const diagnostics = type === 'ratio' && Math.abs(value) > 1
        ? ['RATIO_SCALE_AMBIGUOUS']
        : [];
      return { value, diagnostics };
    }

    let text = normalizeText(value);
    let negativeParentheses = false;
    const parentheses = text.match(/^\((.*)\)$/);
    if (parentheses) {
      negativeParentheses = true;
      text = normalizeText(parentheses[1]);
    }

    let currency = false;
    if (/^[¥￥$]/.test(text)) {
      currency = true;
      text = normalizeText(text.slice(1));
    }

    const percent = text.endsWith('%');
    if (percent) text = normalizeText(text.slice(0, -1));
    if (percent && type !== 'ratio') return { value: null, diagnostics: ['INVALID_NUMERIC'] };
    if (currency && type === 'ratio') return { value: null, diagnostics: ['INVALID_NUMERIC'] };

    const numericPattern = /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d+)?$/;
    if (!numericPattern.test(text)) return { value: null, diagnostics: ['INVALID_NUMERIC'] };

    let number = Number(text.replace(/,/g, ''));
    if (!Number.isFinite(number)) return { value: null, diagnostics: ['INVALID_NUMERIC'] };
    if (negativeParentheses) {
      if (number < 0) return { value: null, diagnostics: ['INVALID_NUMERIC'] };
      number = -number;
    }
    if (percent) number /= 100;

    const diagnostics = type === 'ratio' && !percent && Math.abs(number) > 1
      ? ['RATIO_SCALE_AMBIGUOUS']
      : [];
    return { value: number, diagnostics };
  }

  function aliasIndex(fields) {
    const index = new Map();
    fields.forEach(field => {
      field.aliases.forEach(alias => {
        const normalized = normalizeHeader(alias);
        if (!index.has(normalized)) index.set(normalized, []);
        index.get(normalized).push(field.key);
      });
    });
    return index;
  }

  const ALIAS_INDEX = aliasIndex(DetailSchema.FIELDS);

  function matchHeaders(headers, fields) {
    const activeAliasIndex = fields ? aliasIndex(fields) : ALIAS_INDEX;
    const canonicalToColumns = new Map();
    const sourceMatches = new Map();
    const collisions = [];

    headers.forEach((header, sourceColumnIndex) => {
      const normalized = normalizeHeader(header);
      const keys = normalized ? (activeAliasIndex.get(normalized) || []) : [];
      if (keys.length > 1) {
        collisions.push({ type: 'source-to-multiple-canonical', sourceColumnIndex, canonicalKeys: keys.slice() });
        return;
      }
      if (keys.length !== 1) return;
      const key = keys[0];
      sourceMatches.set(sourceColumnIndex, key);
      if (!canonicalToColumns.has(key)) canonicalToColumns.set(key, []);
      canonicalToColumns.get(key).push(sourceColumnIndex);
    });

    canonicalToColumns.forEach((columns, canonicalKey) => {
      if (columns.length > 1) {
        collisions.push({ type: 'canonical-to-multiple-source', canonicalKey, sourceColumnIndices: columns.slice() });
        columns.forEach(column => sourceMatches.delete(column));
      }
    });

    const matchedCanonical = Array.from(new Set(sourceMatches.values()));
    return { sourceMatches, matchedCanonical, collisions };
  }

  function cellHasContent(cell) {
    if (!cell) return false;
    if (cell.f != null && String(cell.f) !== '') return true;
    if (cell.v == null) return false;
    return typeof cell.v === 'string' ? normalizeText(cell.v) !== '' : true;
  }

  function worksheetRange(worksheet, XLSX) {
    if (!worksheet || !worksheet['!ref']) return null;
    return XLSX.utils.decode_range(worksheet['!ref']);
  }

  function cellAt(worksheet, rowIndex, columnIndex, XLSX) {
    return worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] || null;
  }

  function buildBlankMasks(worksheet, XLSX) {
    const range = worksheetRange(worksheet, XLSX);
    if (!range) return { range: null, blankRows: new Set(), blankColumns: new Set() };

    const blankRows = new Set();
    const blankColumns = new Set();
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      let hasContent = false;
      for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
        if (cellHasContent(cellAt(worksheet, rowIndex, columnIndex, XLSX))) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) blankRows.add(rowIndex);
    }
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      let hasContent = false;
      for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        if (cellHasContent(cellAt(worksheet, rowIndex, columnIndex, XLSX))) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) blankColumns.add(columnIndex);
    }
    return { range, blankRows, blankColumns };
  }

  function rowHeaders(worksheet, rowIndex, range, XLSX) {
    const headers = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const cell = cellAt(worksheet, rowIndex, columnIndex, XLSX);
      headers[columnIndex] = cell && cell.v != null ? cell.v : null;
    }
    return headers;
  }

  function discoverDetailHeader(worksheet, XLSX, maxRows) {
    const range = worksheetRange(worksheet, XLSX);
    if (!range) return null;
    const limit = Math.min(range.e.r, range.s.r + (maxRows == null ? 30 : maxRows) - 1);
    let best = null;
    for (let rowIndex = range.s.r; rowIndex <= limit; rowIndex += 1) {
      const headers = rowHeaders(worksheet, rowIndex, range, XLSX);
      const match = matchHeaders(headers);
      const cleaningMatches = match.matchedCanonical.filter(key => DetailSchema.CLEANING_REQUIRED_KEYS.includes(key)).length;
      const score = cleaningMatches * 100 + match.matchedCanonical.length;
      if (!best || score > best.score) best = { rowIndex, headers, match, score };
    }
    return best;
  }

  function evidenceFor(matchedFields) {
    const matched = new Set(matchedFields);
    const identity = matched.has('terminal') && matched.has('store');
    const geography = matched.has('city') && matched.has('region');
    const financialFields = ['grossSales', 'netSales', 'grossMargin', 'customerContribution'];
    const financialMatches = financialFields.filter(key => matched.has(key)).length;
    const financial = financialMatches >= 3;
    return {
      identity,
      geography,
      financial,
      financialMatches,
      strongGroupCount: [identity, geography, financial].filter(Boolean).length
    };
  }

  function evaluateCapabilities(matchedCanonicalFields) {
    const matched = new Set(matchedCanonicalFields || []);
    const capabilities = {};
    Object.entries(DetailSchema.CAPABILITY_RULES).forEach(([key, rule]) => {
      const missing = rule.required.filter(field => !matched.has(field));
      let status = missing.length ? 'unavailable' : 'available';
      if (missing.length && rule.partial) {
        const present = rule.partial.fields.filter(field => matched.has(field)).length;
        const partialSatisfied = rule.partial.mode === 'all'
          ? present === rule.partial.fields.length
          : present > 0;
        if (partialSatisfied) status = 'partial';
      }
      capabilities[key] = { status, missing };
    });
    return capabilities;
  }

  function normalizeCell(cell, field, context) {
    const formula = cell && cell.f != null && String(cell.f) !== '' ? String(cell.f) : null;
    const hasCachedValue = Boolean(formula)
      && Object.prototype.hasOwnProperty.call(cell, 'v')
      && cell.v !== undefined;
    const rawValue = cell && cell.v !== undefined ? cell.v : null;
    const diagnostics = [];

    if (formula && !hasCachedValue) {
      const severity = field && field.cleaningRequired && NUMERIC_TYPES.has(field.type)
        ? 'blocking'
        : 'warning';
      diagnostics.push(diagnostic('UNCACHED_FORMULA', severity, context));
      return {
        rawValue,
        cleanedValue: null,
        formula: { expression: formula, hasCachedValue: false },
        diagnostics
      };
    }

    const value = formula ? cell.v : rawValue;
    let cleanedValue;
    if (!field) {
      if (isMissingValue(value)) cleanedValue = null;
      else cleanedValue = typeof value === 'string' ? normalizeText(value) : value;
    } else if (field.type === 'text') {
      cleanedValue = isMissingValue(value) ? null : normalizeText(value);
    } else {
      const parsed = parseNumeric(value, field.type);
      cleanedValue = parsed.value;
      parsed.diagnostics.forEach(code => diagnostics.push(diagnostic(code, 'warning', context)));
    }

    return {
      rawValue,
      cleanedValue,
      formula: formula ? { expression: formula, hasCachedValue: true } : null,
      diagnostics
    };
  }

  function summaryResult(sheetName, sheetIndex, worksheet, XLSX) {
    const range = worksheetRange(worksheet, XLSX);
    return {
      sheetName,
      sheetIndex,
      classification: 'summary',
      cleaningStatus: 'notApplicable',
      header: null,
      fields: null,
      counts: {
        physicalRows: range ? range.e.r - range.s.r + 1 : 0,
        physicalColumns: range ? range.e.c - range.s.c + 1 : 0,
        cleanedRows: 0,
        blankRowsIgnored: 0,
        blankColumnsIgnored: 0
      },
      cleanedRows: [],
      diagnostics: [],
      dashboardReadiness: { status: 'notEvaluated', missing: [] },
      capabilities: {}
    };
  }

  function scanWorksheet(worksheet, options) {
    const settings = options || {};
    const XLSX = settings.XLSX;
    if (!XLSX || !XLSX.utils) throw new Error('A compatible SheetJS runtime is required.');
    const sheetName = settings.sheetName || 'Sheet';
    const sheetIndex = Number.isInteger(settings.sheetIndex) ? settings.sheetIndex : 0;
    if (settings.classification === 'summary') return summaryResult(sheetName, sheetIndex, worksheet, XLSX);

    const masks = buildBlankMasks(worksheet, XLSX);
    const headerCandidate = discoverDetailHeader(worksheet, XLSX, settings.maxHeaderRows);
    const range = masks.range;
    if (!range || !headerCandidate) {
      return {
        sheetName,
        sheetIndex,
        classification: 'other',
        cleaningStatus: 'incompatible',
        header: null,
        fields: null,
        counts: { physicalRows: 0, physicalColumns: 0, cleanedRows: 0, blankRowsIgnored: 0, blankColumnsIgnored: 0 },
        cleanedRows: [],
        diagnostics: [],
        dashboardReadiness: { status: 'blocked', missing: DetailSchema.DASHBOARD_CORE_REQUIRED_KEYS.slice() },
        capabilities: evaluateCapabilities([])
      };
    }

    const match = headerCandidate.match;
    const matched = match.matchedCanonical;
    const matchedSet = new Set(matched);
    const missingCleaningRequired = DetailSchema.CLEANING_REQUIRED_KEYS.filter(key => !matchedSet.has(key));
    const missingDashboardCore = DetailSchema.DASHBOARD_CORE_REQUIRED_KEYS.filter(key => !matchedSet.has(key));
    const evidence = evidenceFor(matched);
    const hasCollision = match.collisions.length > 0;
    const compatible = missingCleaningRequired.length === 0 && !hasCollision;
    const nearCompatible = !compatible && !hasCollision && evidence.strongGroupCount >= 2;
    const classification = compatible || nearCompatible || evidence.strongGroupCount >= 2 ? 'detail' : 'other';
    const cleaningStatus = compatible ? 'compatible' : nearCompatible ? 'nearCompatible' : 'incompatible';
    const diagnostics = [];

    match.collisions.forEach(collision => {
      const context = {
        sheetName,
        sourceRowNumber: headerCandidate.rowIndex + 1,
        sourceColumnIndex: collision.sourceColumnIndex == null ? null : collision.sourceColumnIndex,
        canonicalKey: collision.canonicalKey || null
      };
      diagnostics.push(diagnostic('MAPPING_COLLISION', 'blocking', context));
    });

    const activeColumns = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      if (!masks.blankColumns.has(columnIndex)) activeColumns.push(columnIndex);
    }

    const columns = activeColumns.map(sourceColumnIndex => {
      const headerCell = cellAt(worksheet, headerCandidate.rowIndex, sourceColumnIndex, XLSX);
      const rawHeader = headerCell && headerCell.v != null ? headerCell.v : null;
      const canonicalKey = match.sourceMatches.get(sourceColumnIndex) || null;
      const field = canonicalKey ? DetailSchema.FIELD_BY_KEY[canonicalKey] : null;
      return {
        sourceColumnIndex,
        rawHeader,
        cleanedHeader: normalizeText(rawHeader),
        normalizedHeader: normalizeHeader(rawHeader),
        canonicalKey,
        type: field ? field.type : null
      };
    });

    const unknownColumns = columns.filter(column => !column.canonicalKey).map(column => ({
      sourceColumnIndex: column.sourceColumnIndex,
      rawHeader: column.rawHeader,
      normalizedHeader: column.normalizedHeader
    }));
    const matchedRequired = DetailSchema.CLEANING_REQUIRED_KEYS.filter(key => matchedSet.has(key));
    const matchedOptional = matched.filter(key => !DetailSchema.CLEANING_REQUIRED_KEYS.includes(key));
    const missingOptional = DetailSchema.FIELDS
      .filter(field => !field.cleaningRequired && !matchedSet.has(field.key))
      .map(field => field.key);

    const cleanedRows = [];
    if (compatible) {
      for (let rowIndex = headerCandidate.rowIndex + 1; rowIndex <= range.e.r; rowIndex += 1) {
        if (masks.blankRows.has(rowIndex)) continue;
        const cells = columns.map(column => {
          const field = column.canonicalKey ? DetailSchema.FIELD_BY_KEY[column.canonicalKey] : null;
          const context = {
            sheetName,
            sourceRowNumber: rowIndex + 1,
            sourceColumnIndex: column.sourceColumnIndex,
            canonicalKey: column.canonicalKey
          };
          const normalized = normalizeCell(cellAt(worksheet, rowIndex, column.sourceColumnIndex, XLSX), field, context);
          diagnostics.push(...normalized.diagnostics);
          return {
            sourceColumnIndex: column.sourceColumnIndex,
            canonicalKey: column.canonicalKey,
            rawValue: normalized.rawValue,
            cleanedValue: normalized.cleanedValue,
            formula: normalized.formula
          };
        });
        cleanedRows.push({ sourceRowNumber: rowIndex + 1, cells });
      }
    }

    const blockingDiagnostics = diagnostics.filter(item => item.severity === 'blocking');
    return {
      sheetName,
      sheetIndex,
      classification,
      cleaningStatus,
      header: {
        sourceRowNumber: headerCandidate.rowIndex + 1,
        sourceRowIndex: headerCandidate.rowIndex,
        columns
      },
      fields: {
        matchedRequired,
        missingRequired: missingCleaningRequired,
        matchedOptional,
        missingOptional,
        unknownColumns,
        evidence
      },
      counts: {
        physicalRows: range.e.r - range.s.r + 1,
        physicalColumns: range.e.c - range.s.c + 1,
        cleanedRows: cleanedRows.length,
        blankRowsIgnored: masks.blankRows.size,
        blankColumnsIgnored: masks.blankColumns.size
      },
      cleanedRows,
      diagnostics,
      dashboardReadiness: {
        status: missingDashboardCore.length || blockingDiagnostics.length ? 'blocked' : 'ready',
        missing: missingDashboardCore
      },
      capabilities: evaluateCapabilities(matched)
    };
  }

  function scanWorkbook(workbook, options) {
    const settings = options || {};
    const summarySheetNames = new Set(settings.summarySheetNames || []);
    const sheets = (workbook.SheetNames || []).map((sheetName, sheetIndex) => scanWorksheet(
      workbook.Sheets[sheetName],
      {
        XLSX: settings.XLSX,
        sheetName,
        sheetIndex,
        maxHeaderRows: settings.maxHeaderRows,
        classification: summarySheetNames.has(sheetName) ? 'summary' : null
      }
    ));
    return {
      version: VERSION,
      sheets,
      diagnostics: sheets.flatMap(sheet => sheet.diagnostics)
    };
  }

  return Object.freeze({
    VERSION,
    normalizeText,
    normalizeHeader,
    isMissingValue,
    parseNumeric,
    matchHeaders,
    buildBlankMasks,
    discoverDetailHeader,
    evaluateCapabilities,
    scanWorksheet,
    scanWorkbook
  });
}));
