'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');
const StorePortfolio = require('../js/store-portfolio.js');
const Generator = require('../scripts/generate-demo-data.js');
const SyntheticProfile = require('../scripts/synthetic-productivity-profile.js');

const workbookPath = path.resolve(__dirname, '../sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx');
const workbookBytes = fs.readFileSync(workbookPath);

function parseWorkbook() {
  const workbook = XLSX.read(workbookBytes, { type: 'buffer', cellDates: true, cellFormula: true });
  return DataLayer.parseWorkbook(workbook, { XLSX, fileName: path.basename(workbookPath) });
}

function comparisonMap(service) {
  return new Map(service.getStoreComparisons({}).map(record => [String(record.terminal), record]));
}

function storeBusinessPayload(record) {
  return {
    terminal: record.terminal,
    currentProductivity: record.currentProductivity,
    lyProductivity: record.lyProductivity,
    productivityEvolPct: record.productivityEvolPct,
    currentCustomerContributionAmount: record.currentCustomerContributionAmount,
    lyCustomerContributionAmount: record.lyCustomerContributionAmount,
    currentCustomerContributionPct: record.currentCustomerContributionPct,
    lyCustomerContributionPct: record.lyCustomerContributionPct,
    businessState: StorePortfolio.classifyPerformance(record),
    currentDAHeadcount: record.currentDAHeadcount,
    lyDAHeadcount: record.lyDAHeadcount
  };
}

function rawProductivityTotal(sheetName) {
  const workbook = XLSX.read(workbookBytes, { type: 'buffer', cellDates: true, cellFormula: true });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: null });
  const headers = rows[0];
  const terminalIndex = headers.indexOf('Terminal');
  const productivityIndex = headers.indexOf('门店总单产');
  const dataRows = rows.slice(1);
  const storeRows = dataRows.filter(row => row[terminalIndex] && String(row[terminalIndex]).toUpperCase() !== 'TOTAL');
  const totalRow = dataRows.find(row => String(row[terminalIndex]).toUpperCase() === 'TOTAL');
  return {
    storeSum: storeRows.reduce((sum, row) => sum + row[productivityIndex], 0),
    reportedTotal: totalRow[productivityIndex]
  };
}

const uploadModel = parseWorkbook();
const demoModel = Generator.buildDemoModel(workbookPath);
const uploadService = DataLayer.createDataService(uploadModel);
const demoService = DataLayer.createDataService(demoModel);
const uploadComparisons = comparisonMap(uploadService);
const demoComparisons = comparisonMap(demoService);
const matchedUpload = Array.from(uploadComparisons.values()).filter(record => record.comparisonStatus === 'matched');

let passed = 0;
function check(number, label, fn) {
  fn();
  passed += 1;
  console.log(`${number}. PASS - ${label}`);
}

check(1, 'Synthetic Workbook has 150 exact-Terminal matched stores', () => {
  assert.equal(matchedUpload.length, 150);
  assert.equal(new Set(matchedUpload.map(record => String(record.terminal))).size, 150);
});

check(2, 'Current and LY Productivity are no longer identical for the portfolio', () => {
  const equalCount = matchedUpload.filter(record => record.currentProductivity === record.lyProductivity).length;
  assert.equal(equalCount < matchedUpload.length, true);
});

check(3, 'Matched Productivity evolution contains positive, zero, and negative observations', () => {
  assert.equal(matchedUpload.some(record => record.productivityEvolPct > 0), true);
  assert.equal(matchedUpload.some(record => record.productivityEvolPct === 0), true);
  assert.equal(matchedUpload.some(record => record.productivityEvolPct < 0), true);
});

check(4, 'All matched LY Productivity values are finite and positive', () => {
  matchedUpload.forEach(record => assert.equal(Number.isFinite(record.lyProductivity) && record.lyProductivity > 0, true));
});

check(5, 'Workbook LY Productivity follows the Terminal-keyed deterministic profile', () => {
  matchedUpload.forEach(record => {
    const expected = SyntheticProfile.comparisonProductivityFor(record.terminal, record.currentProductivity);
    assert.equal(record.lyProductivity, expected.comparisonProductivity, record.terminal);
  });
});

check(6, 'Comparison Productivity tier matches the source tier contract', () => {
  matchedUpload.forEach(record => {
    assert.equal(record.comparisonStore.productivityTier, SyntheticProfile.productivityTierFor(record.lyProductivity), record.terminal);
  });
});

check(7, 'Current and Comparison Productivity TOTAL rows equal store-row sums', () => {
  ['LRP Counter Y26 S1', 'LRP Counter Y25 S1'].forEach(sheetName => {
    const result = rawProductivityTotal(sheetName);
    assert.equal(result.reportedTotal, result.storeSum, sheetName);
  });
});

check(8, 'Demo generator contains no post-parse Productivity mutation', () => {
  const generatorSource = fs.readFileSync(path.resolve(__dirname, '../scripts/generate-demo-data.js'), 'utf8');
  assert.doesNotMatch(generatorSource, /applyDemoProductivityEvolution|comparisonStore\.storeProductivity|metrics\.storeProductivity\s*=|pnl\.storeProductivity\s*=/);
});

check(9, 'Generated Demo and Manual Upload match for all store business payloads', () => {
  assert.equal(demoComparisons.size, uploadComparisons.size);
  uploadComparisons.forEach((uploadRecord, terminal) => {
    const demoRecord = demoComparisons.get(terminal);
    assert.ok(demoRecord, terminal);
    assert.deepEqual(storeBusinessPayload(demoRecord), storeBusinessPayload(uploadRecord), terminal);
  });
});

check(10, 'Generated Demo and Manual Upload have identical Performance states', () => {
  const uploadPerformance = uploadService.getPerformancePortfolio({});
  const demoPerformance = demoService.getPerformancePortfolio({});
  assert.deepEqual(demoPerformance.stateSummary, uploadPerformance.stateSummary);
  assert.equal(uploadPerformance.stateSummary.every(item => item.count > 0), true);
});

check(11, 'Generated Demo and Manual Upload have identical Efficiency candidates', () => {
  const simplify = model => ({
    records: model.records.map(record => [record.terminal, record.currentDAHeadcount, record.currentProductivity]),
    candidates: model.distribution.reviewOpportunities.map(record => [record.terminal, record.lowerHeadcount])
  });
  assert.deepEqual(simplify(demoService.getHeadcountEfficiency({})), simplify(uploadService.getHeadcountEfficiency({})));
});

check(12, 'Committed Demo artifact is the pure deterministic Workbook build', () => {
  assert.equal(
    fs.readFileSync(Generator.TARGET, 'utf8'),
    Generator.serializeDemoArtifact(Generator.buildDemoModel(workbookPath))
  );
});

console.log(`\nSynthetic Workbook consistency tests: ${passed}/${passed} passed`);
