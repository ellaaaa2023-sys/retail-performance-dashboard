'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DetailSchema = require('../js/data/detail-schema.js');
const Cleaning = require('../js/data/data-cleaning.js');

const REQUIRED_HEADERS = [
  'Terminal', 'Store', 'City', 'Region',
  'Gross Sales', 'CA NET', 'Gross Margin', 'Client Contribution'
];
const REQUIRED_ROW = ['T-001', 'Store One', 'Shanghai', 'East', 1000, 800, 500, 200];

const results = [];
function check(number, label, test) {
  test();
  results.push(`${number}. PASS - ${label}`);
}

function makeWorksheet(headers = REQUIRED_HEADERS, row = REQUIRED_ROW, prefixRows = []) {
  return XLSX.utils.aoa_to_sheet([...prefixRows, headers, row]);
}

function scanWorksheet(worksheet, options = {}) {
  return Cleaning.scanWorksheet(worksheet, {
    XLSX,
    sheetName: options.sheetName || 'Counter Data',
    sheetIndex: options.sheetIndex || 0,
    classification: options.classification || null
  });
}

function scanWithOptional(optionalHeaders, optionalValues) {
  return scanWorksheet(makeWorksheet(
    REQUIRED_HEADERS.concat(optionalHeaders || []),
    REQUIRED_ROW.concat(optionalValues || [])
  ));
}

function canonicalCell(result, key, rowIndex = 0) {
  return result.cleanedRows[rowIndex].cells.find(cell => cell.canonicalKey === key);
}

check(1, 'Text cleaning trims and collapses repeated spaces', () => {
  assert.equal(Cleaning.normalizeText('  Store   One  '), 'Store One');
});

check(2, 'Text cleaning normalizes non-breaking spaces', () => {
  assert.equal(Cleaning.normalizeText('Store\u00a0One'), 'Store One');
});

check(3, 'Text cleaning normalizes full-width spaces', () => {
  assert.equal(Cleaning.normalizeText('Store\u3000One'), 'Store One');
});

check(4, 'Text cleaning normalizes tabs', () => {
  assert.equal(Cleaning.normalizeText('Store\tOne'), 'Store One');
});

check(5, 'Text cleaning normalizes CR and LF', () => {
  assert.equal(Cleaning.normalizeText('Store\r\nOne'), 'Store One');
});

check(6, 'Header matching is case-insensitive and exact after whitespace normalization', () => {
  const match = Cleaning.matchHeaders(['  gRoSs\u00a0  SaLeS  ']);
  assert.deepEqual(match.matchedCanonical, ['grossSales']);
});

check(7, 'POS no. never matches POS. expense', () => {
  const match = Cleaning.matchHeaders(['POS no.', 'POS.']);
  assert.equal(match.sourceMatches.has(0), false);
  assert.equal(match.sourceMatches.get(1), 'posAdvertisingExpense');
  assert.equal(match.collisions.length, 0);
});

check(8, 'Entirely blank rows are identified without worksheet mutation', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([REQUIRED_HEADERS, [], REQUIRED_ROW]);
  const masks = Cleaning.buildBlankMasks(worksheet, XLSX);
  assert.equal(masks.blankRows.has(1), true);
  assert.deepEqual(worksheet['!ref'], 'A1:H3');
});

check(9, 'Entirely blank columns are identified without worksheet mutation', () => {
  const worksheet = makeWorksheet();
  worksheet['!ref'] = 'A1:I2';
  const masks = Cleaning.buildBlankMasks(worksheet, XLSX);
  assert.equal(masks.blankColumns.has(8), true);
  assert.equal(worksheet['!ref'], 'A1:I2');
});

check(10, 'A formula-only row is not blank', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([['Header']]);
  worksheet.A2 = { t: 'n', f: '1+1' };
  worksheet['!ref'] = 'A1:A2';
  const masks = Cleaning.buildBlankMasks(worksheet, XLSX);
  assert.equal(masks.blankRows.has(1), false);
});

check(11, 'A formula-only column is not blank', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([['Header']]);
  worksheet.B2 = { t: 'n', f: '1+1' };
  worksheet['!ref'] = 'A1:B2';
  const masks = Cleaning.buildBlankMasks(worksheet, XLSX);
  assert.equal(masks.blankColumns.has(1), false);
});

check(12, 'Unknown extra columns are preserved', () => {
  const result = scanWithOptional(['Unmapped Business Field'], ['Keep Me']);
  assert.equal(result.cleaningStatus, 'compatible');
  assert.deepEqual(result.fields.unknownColumns.map(column => column.rawHeader), ['Unmapped Business Field']);
  assert.equal(result.cleanedRows[0].cells.at(-1).cleanedValue, 'Keep Me');
});

check(13, 'Missing optional fields do not prevent cleaning compatibility', () => {
  const result = scanWorksheet(makeWorksheet());
  assert.equal(result.cleaningStatus, 'compatible');
  assert.equal(result.dashboardReadiness.status, 'ready');
  assert.equal(result.fields.missingOptional.includes('status'), true);
});

check(14, 'A missing Cleaning Required field produces nearCompatible', () => {
  const headers = REQUIRED_HEADERS.slice(0, -1);
  const row = REQUIRED_ROW.slice(0, -1);
  const result = scanWorksheet(makeWorksheet(headers, row));
  assert.equal(result.classification, 'detail');
  assert.equal(result.cleaningStatus, 'nearCompatible');
  assert.deepEqual(result.fields.missingRequired, ['customerContribution']);
});

check(15, 'An unrelated Notes sheet is incompatible, not a Detail sheet', () => {
  const result = scanWorksheet(XLSX.utils.aoa_to_sheet([['Notes'], ['Do not process']]));
  assert.equal(result.classification, 'other');
  assert.equal(result.cleaningStatus, 'incompatible');
  assert.equal(result.cleanedRows.length, 0);
});

check(16, 'Numeric amounts remain numeric', () => {
  assert.deepEqual(Cleaning.parseNumeric(1234.56, 'amount'), { value: 1234.56, diagnostics: [] });
});

check(17, 'Safe comma-separated numeric strings convert to numbers', () => {
  assert.deepEqual(Cleaning.parseNumeric('1,234.56', 'amount'), { value: 1234.56, diagnostics: [] });
  assert.deepEqual(Cleaning.parseNumeric(' 1234 ', 'amount'), { value: 1234, diagnostics: [] });
});

check(18, 'Negative numeric strings convert without changing magnitude', () => {
  assert.deepEqual(Cleaning.parseNumeric('-123', 'amount'), { value: -123, diagnostics: [] });
});

check(19, 'Parentheses negatives convert conservatively', () => {
  assert.deepEqual(Cleaning.parseNumeric('(123)', 'amount'), { value: -123, diagnostics: [] });
});

check(20, 'Supported currency-prefixed numeric strings convert', () => {
  assert.deepEqual(Cleaning.parseNumeric('¥1,234', 'amount'), { value: 1234, diagnostics: [] });
});

check(21, 'Malformed numeric text is null with a diagnostic', () => {
  assert.deepEqual(Cleaning.parseNumeric('123abc', 'amount'), { value: null, diagnostics: ['INVALID_NUMERIC'] });
});

check(22, 'A numeric decimal ratio remains unchanged', () => {
  assert.deepEqual(Cleaning.parseNumeric(0.67, 'ratio'), { value: 0.67, diagnostics: [] });
});

check(23, 'A percentage string converts exactly once to decimal ratio', () => {
  assert.deepEqual(Cleaning.parseNumeric('67%', 'ratio'), { value: 0.67, diagnostics: [] });
});

check(24, 'A decimal ratio string remains unchanged', () => {
  assert.deepEqual(Cleaning.parseNumeric('0.67', 'ratio'), { value: 0.67, diagnostics: [] });
});

check(25, 'An unmarked ratio above one is preserved and flagged as ambiguous', () => {
  assert.deepEqual(Cleaning.parseNumeric('67', 'ratio'), { value: 67, diagnostics: ['RATIO_SCALE_AMBIGUOUS'] });
});

check(26, 'Missing sentinels normalize to null rather than zero', () => {
  ['', '   ', '-', '—', 'N/A', 'NA', null].forEach(value => {
    assert.deepEqual(Cleaning.parseNumeric(value, 'amount'), { value: null, diagnostics: [] });
  });
});

check(27, 'Count values are never rounded', () => {
  assert.deepEqual(Cleaning.parseNumeric('12.5', 'count'), { value: 12.5, diagnostics: [] });
});

check(28, 'Productivity values are never rounded', () => {
  assert.deepEqual(Cleaning.parseNumeric(136.75, 'productivity'), { value: 136.75, diagnostics: [] });
});

check(29, 'Cached formulas use cached values and preserve formula metadata', () => {
  const worksheet = makeWorksheet();
  worksheet.E2 = { t: 'n', f: '500+500', v: 1000 };
  const result = scanWorksheet(worksheet);
  assert.deepEqual(canonicalCell(result, 'grossSales').formula, { expression: '500+500', hasCachedValue: true });
  assert.equal(canonicalCell(result, 'grossSales').cleanedValue, 1000);
});

check(30, 'Uncached required numeric formulas produce blocking diagnostics', () => {
  const worksheet = makeWorksheet();
  worksheet.E2 = { t: 'n', f: '500+500' };
  const result = scanWorksheet(worksheet);
  const issue = result.diagnostics.find(item => item.code === 'UNCACHED_FORMULA');
  assert.equal(issue.severity, 'blocking');
  assert.equal(issue.canonicalKey, 'grossSales');
  assert.equal(result.dashboardReadiness.status, 'blocked');
});

check(31, 'Uncached optional formulas produce warnings and null', () => {
  const worksheet = makeWorksheet(REQUIRED_HEADERS.concat('Specific SG&A'), REQUIRED_ROW.concat(0));
  worksheet.I2 = { t: 'n', f: '100-100' };
  const result = scanWorksheet(worksheet);
  const issue = result.diagnostics.find(item => item.code === 'UNCACHED_FORMULA');
  assert.equal(issue.severity, 'warning');
  assert.equal(issue.canonicalKey, 'specificSga');
  assert.equal(canonicalCell(result, 'specificSga').cleanedValue, null);
});

check(32, 'Cleaning compatibility does not depend on sheet name', () => {
  const result = scanWorksheet(makeWorksheet(), { sheetName: 'Arbitrary FY Export' });
  assert.equal(result.classification, 'detail');
  assert.equal(result.cleaningStatus, 'compatible');
});

check(33, 'Summary P&L is not subject to Detail cleaning', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([['  P&L Line  ', 'Actual'], ['GROSS SALES', 100]]);
  const result = scanWorksheet(worksheet, { sheetName: 'P&L review Y26', classification: 'summary' });
  assert.equal(result.classification, 'summary');
  assert.equal(result.cleaningStatus, 'notApplicable');
  assert.equal(result.header, null);
  assert.equal(result.cleanedRows.length, 0);
  assert.equal(result.counts.blankColumnsIgnored, 0);
});

check(34, 'Multiple compatible Detail sheets are scanned independently', () => {
  const workbook = {
    SheetNames: ['Current Export', 'Historical Export'],
    Sheets: {
      'Current Export': makeWorksheet(),
      'Historical Export': makeWorksheet()
    }
  };
  const result = Cleaning.scanWorkbook(workbook, { XLSX });
  assert.deepEqual(result.sheets.map(sheet => sheet.cleaningStatus), ['compatible', 'compatible']);
  assert.deepEqual(result.sheets.map(sheet => sheet.sheetIndex), [0, 1]);
});

check(35, 'Both mapping collision directions are blocking and never select the first match', () => {
  const duplicateSource = scanWorksheet(makeWorksheet(
    REQUIRED_HEADERS.concat('Gross Sales'),
    REQUIRED_ROW.concat(999)
  ));
  assert.equal(duplicateSource.cleaningStatus, 'incompatible');
  assert.equal(duplicateSource.diagnostics.some(item => item.code === 'MAPPING_COLLISION' && item.severity === 'blocking'), true);

  const duplicateAliasFields = [
    { key: 'first', aliases: ['Shared Header'] },
    { key: 'second', aliases: ['Shared Header'] }
  ];
  const duplicateCanonical = Cleaning.matchHeaders(['Shared Header'], duplicateAliasFields);
  assert.equal(duplicateCanonical.sourceMatches.size, 0);
  assert.deepEqual(duplicateCanonical.collisions[0].canonicalKeys, ['first', 'second']);
});

check(36, 'Missing specificSga only disables the filtered CC bridge', () => {
  const result = scanWithOptional(['Specific A&P'], [-50]);
  assert.equal(result.cleaningStatus, 'compatible');
  assert.equal(result.dashboardReadiness.status, 'ready');
  assert.equal(result.capabilities.filteredCustomerContributionBridge.status, 'unavailable');
  assert.deepEqual(result.capabilities.filteredCustomerContributionBridge.missing, ['specificSga']);
});

check(37, 'Missing cityPosNo makes POS analytics unavailable without blocking cleaning', () => {
  const result = scanWithOptional(['Status'], ['Active']);
  assert.equal(result.cleaningStatus, 'compatible');
  assert.equal(result.dashboardReadiness.status, 'ready');
  assert.equal(result.capabilities.posAnalytics.status, 'unavailable');
  assert.deepEqual(result.capabilities.posAnalytics.missing, ['cityPosNo']);
});

check(38, 'Missing productivityTier makes only the tier capability unavailable', () => {
  const result = scanWorksheet(makeWorksheet());
  assert.equal(result.capabilities.tierFilter.status, 'unavailable');
  assert.deepEqual(result.capabilities.tierFilter.missing, ['productivityTier']);
});

check(39, 'Missing storeProductivity disables Performance and Headcount Efficiency without blocking cleaning', () => {
  const result = scanWithOptional(['Specific A&P'], [-50]);
  assert.equal(result.capabilities.performancePortfolio.status, 'unavailable');
  assert.equal(result.capabilities.productivitySummary.status, 'unavailable');
  assert.equal(result.capabilities.headcountEfficiency.status, 'unavailable');
  assert.equal(result.capabilities.headcountEfficiency.missing.includes('storeProductivity'), true);
});

check(40, 'A partial A&P component set produces a partial capability', () => {
  const result = scanWithOptional(['Trade Relation'], [-10]);
  assert.equal(result.capabilities.apComponentAnalysis.status, 'partial');
  assert.equal(result.capabilities.apComponentAnalysis.missing.includes('tradeRelation'), false);
  assert.equal(result.capabilities.apComponentAnalysis.missing.length, DetailSchema.AP_COMPONENT_FIELDS.length - 1);
});

check(41, 'Unknown percentage-looking fields are preserved without ratio inference', () => {
  const result = scanWithOptional(['Mystery %'], ['67%']);
  const unknownCell = result.cleanedRows[0].cells.at(-1);
  assert.equal(unknownCell.canonicalKey, null);
  assert.equal(unknownCell.cleanedValue, '67%');
});

check(42, 'Intermediate rows and cells retain source indices', () => {
  const result = scanWorksheet(makeWorksheet());
  assert.equal(result.header.sourceRowIndex, 0);
  assert.equal(result.header.sourceRowNumber, 1);
  assert.equal(result.header.columns[0].sourceColumnIndex, 0);
  assert.equal(result.cleanedRows[0].sourceRowNumber, 2);
  assert.equal(result.cleanedRows[0].cells[0].sourceColumnIndex, 0);
});

check(43, 'Diagnostics never contain full business row payloads', () => {
  const row = REQUIRED_ROW.slice();
  row[1] = 'SECRET_STORE_PAYLOAD';
  row[4] = '123abc';
  const result = scanWorksheet(makeWorksheet(REQUIRED_HEADERS, row));
  const serialized = JSON.stringify(result.diagnostics);
  assert.equal(serialized.includes('SECRET_STORE_PAYLOAD'), false);
  assert.equal(serialized.includes('rawValue'), false);
  assert.equal(serialized.includes('cleanedRows'), false);
});

check(44, 'Legitimate zero remains distinct from missing values', () => {
  assert.deepEqual(Cleaning.parseNumeric(0, 'amount'), { value: 0, diagnostics: [] });
  assert.equal(Cleaning.isMissingValue(0), false);
});

check(45, 'Detail header discovery is not fixed to row one', () => {
  const worksheet = makeWorksheet(REQUIRED_HEADERS, REQUIRED_ROW, [['Export generated locally'], []]);
  const result = scanWorksheet(worksheet);
  assert.equal(result.header.sourceRowNumber, 3);
  assert.equal(result.cleaningStatus, 'compatible');
});

check(46, 'A near-compatible sheet is identified by semantic evidence, not a percentage threshold', () => {
  const headers = REQUIRED_HEADERS.slice(1);
  const row = REQUIRED_ROW.slice(1);
  const result = scanWorksheet(makeWorksheet(headers, row));
  assert.equal(result.fields.evidence.identity, false);
  assert.equal(result.fields.evidence.geography, true);
  assert.equal(result.fields.evidence.financial, true);
  assert.equal(result.cleaningStatus, 'nearCompatible');
});

check(47, 'Full Store P&L is partial when only Dashboard Core fields exist', () => {
  const result = scanWorksheet(makeWorksheet());
  assert.equal(result.capabilities.fullStorePnl.status, 'partial');
});

check(48, 'Summary classification is carried by the workbook scanner without cleaning', () => {
  const workbook = {
    SheetNames: ['P&L review Y26', 'Counter Data'],
    Sheets: {
      'P&L review Y26': XLSX.utils.aoa_to_sheet([['P&L Line', 'Actual'], ['GROSS SALES', 100]]),
      'Counter Data': makeWorksheet()
    }
  };
  const result = Cleaning.scanWorkbook(workbook, { XLSX, summarySheetNames: ['P&L review Y26'] });
  assert.equal(result.sheets[0].classification, 'summary');
  assert.equal(result.sheets[0].cleaningStatus, 'notApplicable');
  assert.equal(result.sheets[1].cleaningStatus, 'compatible');
});

check(49, 'Shared schema exposes exactly the eight approved cleaning requirements', () => {
  assert.deepEqual(DetailSchema.CLEANING_REQUIRED_KEYS, [
    'terminal', 'store', 'city', 'region',
    'grossSales', 'netSales', 'grossMargin', 'customerContribution'
  ]);
});

check(50, 'Shared schema exposes the same eight Dashboard Core column requirements', () => {
  assert.deepEqual(DetailSchema.DASHBOARD_CORE_REQUIRED_KEYS, DetailSchema.CLEANING_REQUIRED_KEYS);
});

check(51, 'Standard Mock Detail sheets remain discoverable and compatible', () => {
  const workbookPath = path.resolve(__dirname, '../sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx');
  const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: 'buffer', cellDates: true, cellFormula: true });
  const result = Cleaning.scanWorkbook(workbook, {
    XLSX,
    summarySheetNames: ['P&L review Y26']
  });
  const details = result.sheets.filter(sheet => sheet.classification === 'detail');
  assert.deepEqual(details.map(sheet => sheet.sheetName), ['LRP Counter Y26 S1', 'LRP Counter Y25 S1']);
  assert.equal(details.every(sheet => sheet.cleaningStatus === 'compatible'), true);
  assert.equal(details.every(sheet => sheet.header.sourceRowNumber === 1), true);
});

check(52, 'Capability evaluation is pure and returns only status and missing', () => {
  const capabilities = Cleaning.evaluateCapabilities(DetailSchema.CLEANING_REQUIRED_KEYS);
  Object.values(capabilities).forEach(capability => {
    assert.deepEqual(Object.keys(capability), ['status', 'missing']);
  });
});

check(53, 'POS analytics and Status filtering degrade independently', () => {
  const result = scanWithOptional(['城市POS数'], [12]);
  assert.equal(result.capabilities.posAnalytics.status, 'available');
  assert.equal(result.capabilities.statusFilter.status, 'unavailable');
});

check(54, 'An explicitly cached empty formula result is missing, not uncached', () => {
  const worksheet = makeWorksheet(REQUIRED_HEADERS.concat('Specific SG&A'), REQUIRED_ROW.concat(0));
  worksheet.I2 = { t: 'str', f: 'IF(1=1,"",0)', v: '' };
  const result = scanWorksheet(worksheet);
  const cell = canonicalCell(result, 'specificSga');
  assert.deepEqual(cell.formula, { expression: 'IF(1=1,"",0)', hasCachedValue: true });
  assert.equal(cell.cleanedValue, null);
  assert.equal(result.diagnostics.some(item => item.code === 'UNCACHED_FORMULA'), false);
});

console.log(results.join('\n'));
console.log(`\n${results.length} data-cleaning checks passed.`);
