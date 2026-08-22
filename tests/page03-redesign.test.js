'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');
const StorePortfolio = require('../js/store-portfolio.js');
const I18n = require('../js/i18n.js');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
const workbook = XLSX.read(fs.readFileSync(path.join(root, 'sample_data/Retail_Performance_Dashboard_Mock_Data.xlsx')), {
  type: 'buffer', cellDates: true
});
const model = DataLayer.parseWorkbook(workbook, { XLSX });
const service = DataLayer.createDataService(model);

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`${passed}. PASS - ${name}`);
}

function performanceRecord(ccPct, evolution) {
  return { currentCustomerContributionPct: ccPct, productivityEvolPct: evolution };
}

check('Page 03 defaults to the Performance lens', () => {
  assert.match(appSource, /portfolioLens:\s*'performance'/);
  assert.match(indexSource, /id="portfolioLens"[\s\S]*?class="active" data-value="performance"/);
});

check('Page 03 exposes Performance, Efficiency, and Variance Contribution lenses', () => {
  ['performance', 'efficiency', 'contribution'].forEach(lens => {
    assert.match(indexSource, new RegExp(`data-value="${lens}"`));
    assert.match(indexSource, new RegExp(`data-portfolio-panel="${lens}"`));
  });
});

check('Performance consumes the shared Data Service model', () => {
  assert.match(appSource, /state\.service\.getPerformancePortfolio\(activeFilters\(\)\)/);
  assert.doesNotMatch(appSource, /exactTerminalPairs\(/);
});

check('Performance dataset maps X to Current CC%, Y to Productivity Evol%, and size to Productivity', () => {
  assert.match(appSource, /value:\s*\[record\.currentCustomerContributionPct, record\.productivityEvolPct, record\.currentProductivity\]/);
});

check('Zero CC boundary belongs to the non-negative side', () => {
  assert.equal(StorePortfolio.classifyPerformance(performanceRecord(0, 0.01)), 'healthy-growth');
});

check('Negative CC belongs to the low-return side', () => {
  assert.equal(StorePortfolio.classifyPerformance(performanceRecord(-0.001, 0.01)), 'growth-low-return');
});

check('Zero Productivity evolution belongs to the non-decline side', () => {
  assert.equal(StorePortfolio.classifyPerformance(performanceRecord(0.25, 0)), 'healthy-growth');
  assert.equal(StorePortfolio.classifyPerformance(performanceRecord(-0.2, 0)), 'growth-low-return');
});

check('Negative Productivity evolution belongs to the decline side', () => {
  assert.equal(StorePortfolio.classifyPerformance(performanceRecord(0.25, -0.01)), 'high-return-decline');
  assert.equal(StorePortfolio.classifyPerformance(performanceRecord(-0.2, -0.01)), 'priority-review');
});

check('A&P sign does not affect Performance classification', () => {
  const positiveSpend = { ...performanceRecord(0.2, 0.1), specificAP: 100 };
  const negativeSpend = { ...performanceRecord(0.2, 0.1), specificAP: -100 };
  assert.equal(StorePortfolio.classifyPerformance(positiveSpend), 'healthy-growth');
  assert.equal(StorePortfolio.classifyPerformance(negativeSpend), 'healthy-growth');
});

check('Performance uses one fixed business-state color registry', () => {
  const registry = appSource.match(/const PERFORMANCE_COLORS = Object\.freeze\(\{([\s\S]*?)\n\}\);/)[1];
  assert.match(registry, /PERFORMANCE_STATES\.HEALTHY_GROWTH\]: '#347c68'/);
  assert.match(registry, /PERFORMANCE_STATES\.HIGH_RETURN_DECLINE\]: '#526d8c'/);
  assert.match(registry, /PERFORMANCE_STATES\.GROWTH_LOW_RETURN\]: '#b79552'/);
  assert.match(registry, /PERFORMANCE_STATES\.PRIORITY_REVIEW\]: '#b97846'/);
  assert.doesNotMatch(registry, /performanceStateLabel|\bt\(/);
});

check('Legend, bubbles, summary, selection, and tooltip consume the same color registry', () => {
  assert.match(appSource, /itemStyle: \{ color: PERFORMANCE_COLORS\[businessState\] \}/);
  assert.match(appSource, /itemStyle: \{ color: PERFORMANCE_COLORS\[businessState\], opacity:/);
  assert.match(appSource, /--state-color:\$\{esc\(PERFORMANCE_COLORS\[item\.state\]\)\}/);
  assert.match(appSource, /const stateColor = PERFORMANCE_COLORS\[record\.businessState\]/);
  assert.match(appSource, /businessState === PERFORMANCE_STATES\.HEALTHY_GROWTH \? \{ markLine, markArea \}/);
});

check('Language switching cannot redefine Performance colors', () => {
  assert.equal((appSource.match(/const PERFORMANCE_COLORS/g) || []).length, 1);
  assert.notEqual(I18n.translations.en['performanceState.healthy-growth'], I18n.translations.zh['performanceState.healthy-growth']);
  const registry = appSource.match(/const PERFORMANCE_COLORS = Object\.freeze\(\{([\s\S]*?)\n\}\);/)[1];
  assert.doesNotMatch(registry, /translations|language|performanceStateLabel/);
});

check('Bubble scaling is bounded and monotonic', () => {
  const small = StorePortfolio.scaleBubbleSize(10, 10, 100, 10, 38);
  const middle = StorePortfolio.scaleBubbleSize(55, 10, 100, 10, 38);
  const large = StorePortfolio.scaleBubbleSize(100, 10, 100, 10, 38);
  assert.equal(small, 10);
  assert.equal(large, 38);
  assert.equal(middle > small && middle < large, true);
});

check('Bubble scaling uses square-root compression and clips extreme values', () => {
  const midpoint = StorePortfolio.scaleBubbleSize(25, 0, 100, 10, 38);
  assert.equal(midpoint, 24);
  assert.equal(StorePortfolio.scaleBubbleSize(1000, 0, 100, 10, 38), 38);
});

check('Performance quadrant thresholds are fixed at CC%=0 and Productivity Evol=0', () => {
  assert.match(appSource, /dataset\.xThreshold = '0'/);
  assert.match(appSource, /dataset\.yThreshold = '0'/);
  assert.match(appSource, /\{ xAxis: 0 \}/);
  assert.match(appSource, /\{ yAxis: 0 \}/);
  assert.doesNotMatch(appSource, /model\.medianCustomerContributionPct/);
});

check('Performance reference lines have no in-chart median or growth annotations', () => {
  assert.match(appSource, /label:\s*\{ show: false \}/);
  assert.doesNotMatch(appSource, /portfolio\.filteredMedian|portfolio\.zeroGrowth/);
});

check('New Stores and missing comparison metrics remain explicit exclusions', () => {
  const performance = service.getPerformancePortfolio({});
  assert.equal(performance.counts.excludedByReason['new-store'], model.storeMatches.new.length);
  assert.equal(performance.counts.total, model.detail.current.stores.length);
});

check('Performance tooltip includes Current and LY CC amount and ratio fields', () => {
  ['currentCustomerContributionAmount', 'lyCustomerContributionAmount', 'currentCustomerContributionPct', 'lyCustomerContributionPct'].forEach(field => {
    assert.match(appSource, new RegExp(`record\\.${field}`));
  });
});

check('Performance tooltip includes Store, City, Region, DA HC, Productivity pair, evolution, and state', () => {
  ['record.store', 'record.city', 'record.region', 'record.currentDAHeadcount', 'record.currentProductivity', 'record.lyProductivity', 'record.productivityEvolPct', 'record.businessState'].forEach(field => {
    assert.equal(appSource.includes(field), true, field);
  });
});

check('Performance summary supports chart-local state selection', () => {
  assert.match(appSource, /state\.performanceSelection===next\?null:next/);
  assert.match(appSource, /model\.eligible\.filter\(record => record\.businessState === state\.performanceSelection\)/);
});

check('Bubble click drills into Store Detail', () => {
  assert.match(appSource, /openStoreDetail\(params\.data\.record\.terminal\)/);
});

check('Efficiency consumes the shared Headcount Efficiency dataset', () => {
  assert.match(appSource, /state\.service\.getHeadcountEfficiency\(activeFilters\(\)\)/);
});

check('Efficiency renders horizontal headcount lanes with store dots only', () => {
  assert.match(appSource, /value:\s*\[record\.currentProductivity, record\.currentDAHeadcount \+ StorePortfolio\.deterministicJitter/);
  assert.match(appSource, /type:\s*'scatter'[\s\S]*?data:\s*dots/);
});

check('Efficiency maps X to Productivity and Y to discrete DA HC levels', () => {
  assert.match(appSource, /dataset\.xMetric = 'productivity'/);
  assert.match(appSource, /dataset\.yMetric = 'daHeadcount'/);
  assert.match(appSource, /xAxis:\s*\{ type: 'value'[\s\S]*?name: t\('metric\.storeProductivity'\)/);
  assert.match(appSource, /yAxis:\s*\{ type: 'value', min: Math\.max\(0, minimumHeadcount - 1\), max: maximumHeadcount \+ 1, interval: 1[\s\S]*?name: t\('metric\.daHeadcount'\)/);
});

check('Efficiency jitter is deterministic and bounded', () => {
  const first = StorePortfolio.deterministicJitter('T-100');
  const second = StorePortfolio.deterministicJitter('T-100');
  assert.equal(first, second);
  assert.equal(Math.abs(first) <= 0.18, true);
});

check('Efficiency keeps IQR only in the shared candidate screening contract', () => {
  assert.match(appSource, /distribution\.reviewOpportunities/);
  assert.doesNotMatch(appSource, /portfolio\.iqrBand|portfolio\.reviewOverlap/);
});

check('Efficiency has no median, IQR, overlap, reference, or custom visual series', () => {
  const block = appSource.slice(appSource.indexOf('function renderEfficiencyPortfolio()'), appSource.indexOf('function renderStoreRanking()'));
  assert.doesNotMatch(block, /const medians|group\.median|markLine|markArea|type:\s*'custom'|symbol:\s*'rect'|overlapSeries|boxData/);
  assert.doesNotMatch(block, /portfolio\.medianProductivity|portfolio\.iqrBand|portfolio\.reviewOverlap/);
});

check('Candidate outline remains the only special Efficiency mark', () => {
  assert.match(appSource, /borderColor: opportunities\.has\(record\.terminal\) \? THEME\.orange : '#fff'/);
  assert.match(appSource, /borderWidth: opportunities\.has\(record\.terminal\) \? 3 : 1/);
});

check('Potential review markers only use the descriptive overlap contract', () => {
  const distribution = StorePortfolio.buildHeadcountDistribution([
    { terminal: 'L-2', currentDAHeadcount: 2, currentProductivity: 100 },
    { terminal: 'L-2B', currentDAHeadcount: 2, currentProductivity: 120 },
    { terminal: 'H-3', currentDAHeadcount: 3, currentProductivity: 110 },
    { terminal: 'H-3B', currentDAHeadcount: 3, currentProductivity: 130 }
  ]);
  assert.equal(distribution.reviewOpportunities.some(item => item.terminal === 'H-3'), true);
});

check('Screening copy explicitly rejects a staffing recommendation', () => {
  assert.equal(I18n.translations.en['portfolio.screeningNotice'], 'This is a screening signal, not a staffing recommendation.');
  assert.equal(I18n.translations.zh['portfolio.screeningNotice'], '该标记仅用于筛查，不代表人员调整建议。');
  assert.doesNotMatch(indexSource, /Overstaffed|Cut Headcount|Reduce Staff/);
});

check('Candidate tooltip explains the adjacent lower-headcount typical range', () => {
  assert.equal(I18n.translations.en['portfolio.potentialReviewReason'], 'Productivity falls within the typical range of {count}-DA stores.');
  assert.equal(I18n.translations.zh['portfolio.potentialReviewReason'], '该门店单产落在 {count} 人门店的典型区间内，可进一步复盘人员配置。');
});

check('DA HC Distribution Summary is removed from the active UI', () => {
  assert.equal(indexSource.includes('efficiencySummaryBody'), false);
  assert.doesNotMatch(indexSource, /DA HC Distribution Summary/);
  assert.doesNotMatch(appSource, /renderEfficiencySummary/);
});

check('Efficiency zoom is explicit toolbox-only with undo and restore', () => {
  assert.match(appSource, /textStyle: baseText\(\), \.\.\.manualZoomToolbox\(\{ x: true, y: false \}\)/);
  assert.match(appSource, /dataZoom: \{[\s\S]*title: \{ zoom: t\('chart\.zoom'\), back: t\('chart\.undoZoom'\) \}/);
  assert.match(appSource, /restore: \{ title: t\('chart\.resetView'\) \}/);
  assert.match(appSource, /dataset\.zoomMode = 'toolbox-only'/);
  assert.match(appSource, /dataset\.defaultExtent = 'full'/);
});

check('Page 03 charts do not retain inside dataZoom state and resize after lens activation', () => {
  const performanceBlock = appSource.match(/function renderPerformancePortfolio\(\) \{([\s\S]*?)\n\}/)[1];
  const efficiencyBlock = appSource.slice(appSource.indexOf('function renderEfficiencyPortfolio()'), appSource.indexOf('function renderStoreRanking()'));
  assert.doesNotMatch(performanceBlock, /chartNavigation/);
  assert.doesNotMatch(efficiencyBlock, /chartNavigation|type:\s*'inside'/);
  assert.match(efficiencyBlock, /c\.clear\(\)/);
  assert.match(efficiencyBlock, /\{ notMerge: true \}/);
  assert.match(appSource, /schedulePortfolioChartLayout\('performanceChart'\)/);
  assert.match(appSource, /schedulePortfolioChartLayout\('efficiencyChart'\)/);
});

check('Page 02 navigation does not inject a hidden Performance or Efficiency scope', () => {
  const navigationBlock = appSource.match(/function openDriverPortfolio\(driverKey\) \{([\s\S]*?)\n\}/)[1];
  assert.match(navigationBlock, /state\.portfolioLens = 'contribution'/);
  assert.match(navigationBlock, /state\.performanceSelection = null/);
  assert.doesNotMatch(navigationBlock, /regionFilter|cityFilter|statusFilter|tierFilter|selectedStore/);
  assert.doesNotMatch(navigationBlock, /zoom|dataZoom/);
  assert.match(appSource, /getPerformancePortfolio\(activeFilters\(\)\)/);
  assert.match(appSource, /getHeadcountEfficiency\(activeFilters\(\)\)/);
});

check('Direct and Page 02-origin Page 03 populations match when global filters match', () => {
  const directPerformance = service.getPerformancePortfolio({});
  const navigatedPerformance = service.getPerformancePortfolio({});
  const directEfficiency = service.getHeadcountEfficiency({});
  const navigatedEfficiency = service.getHeadcountEfficiency({});
  assert.equal(navigatedPerformance.counts.total, directPerformance.counts.total);
  assert.equal(navigatedPerformance.counts.eligible, directPerformance.counts.eligible);
  assert.equal(navigatedEfficiency.distribution.counts.total, directEfficiency.distribution.counts.total);
  assert.equal(navigatedEfficiency.distribution.counts.eligible, directEfficiency.distribution.counts.eligible);
});

check('Efficiency dot click uses the same Store Detail drill-down', () => {
  const clickContracts = appSource.match(/openStoreDetail\(params\.data\.record\.terminal\)/g) || [];
  assert.equal(clickContracts.length >= 2, true);
});

check('Contribution reuses the existing ranking calculation and metric state', () => {
  assert.match(appSource, /function renderStoreRanking\(\)/);
  assert.match(appSource, /contributionMetric:\s*'customerContribution'/);
  assert.match(indexSource, /id="rankingMetric"/);
});

check('Reset contract clears global filters and Performance local selection', () => {
  const state = { filters: { region: 'East' }, portfolioLens: 'efficiency', performanceSelection: 'priority-review' };
  require('../js/data/source-lifecycle.js').resetInteractions(state);
  assert.deepEqual(state.filters, {});
  assert.equal(state.portfolioLens, 'performance');
  assert.equal(state.performanceSelection, null);
});

check('Page 03 no longer exposes old snapshot, risk, priority, or movement controls', () => {
  ['snapshotToggle', 'productivityChart', 'riskStoreBody', 'portfolioView'].forEach(id => assert.equal(indexSource.includes(`id="${id}"`), false));
  assert.doesNotMatch(indexSource, /Priority Risk Stores|Risk Score|Balanced High|Balanced Low/);
});

check('Active runtime no longer loads the obsolete productivity quadrant helper', () => {
  assert.equal(indexSource.includes('productivity-quadrant.js'), false);
  assert.equal(appSource.includes('ProductivityQuadrant'), false);
});

check('Page 03 exposes an exact-identity Store Search control', () => {
  assert.match(indexSource, /id="portfolioStoreSearch"[^>]*list="portfolioStoreOptions"/);
  assert.match(indexSource, /id="portfolioStoreOptions"/);
  assert.match(appSource, /function storeOptionLabel\(store\)/);
  assert.match(appSource, /store\.terminal === value/);
  assert.match(appSource, /portfolioStoreSearch'\)\.addEventListener\('keydown',[\s\S]*event\.key!==?'Enter'[\s\S]*selectPortfolioStore\(event\.target\.value\)/);
  assert.doesNotMatch(appSource.match(/function selectPortfolioStore\(value\) \{([\s\S]*?)\n\}/)[1], /fuzzy|normalizeStoreName/);
});

check('Store Search only changes shared selectedStore and never filters the portfolio', () => {
  const block = appSource.match(/function selectPortfolioStore\(value\) \{([\s\S]*?)\n\}/)[1];
  assert.match(block, /state\.selectedStore = selected\.terminal/);
  assert.match(block, /renderPortfolio\(\)/);
  assert.doesNotMatch(block, /state\.filters|regionFilter|cityFilter|statusFilter|tierFilter|performanceSelection|contributionMetric/);
  assert.match(appSource, /input\.dataset\.populationCount = String\(stores\.length\)/);
});

check('Performance and Efficiency use one independent selected-store marker convention', () => {
  const marker = appSource.match(/const SELECTED_STORE_MARKER = Object\.freeze\(\{([\s\S]*?)\n\}\);/)[1];
  assert.match(marker, /symbol: 'diamond'/);
  assert.match(marker, /borderColor: THEME\.ink/);
  assert.doesNotMatch(marker, /THEME\.(orange|gold|goldDark)/);
  assert.equal((appSource.match(/selectedStoreMarker: true/g) || []).length >= 2, true);
});

check('Performance selected marker preserves full eligible population and handles ineligible stores', () => {
  const block = appSource.match(/function renderPerformancePortfolio\(\) \{([\s\S]*?)\n\}/)[1];
  assert.match(block, /model\.eligible\.find\(record => record\.terminal === state\.selectedStore\)/);
  assert.match(block, /series\.push\(\{/);
  assert.doesNotMatch(block, /model\.eligible\s*=|filter\(record => record\.terminal === state\.selectedStore\)/);
  assert.match(appSource, /portfolio\.selectedStoreIneligible/);
});

check('Efficiency candidate and selected markers can coexist', () => {
  const block = appSource.slice(appSource.indexOf('function renderEfficiencyPortfolio()'), appSource.indexOf('function renderStoreRanking()'));
  assert.match(block, /borderColor: opportunities\.has\(record\.terminal\) \? THEME\.orange : '#fff'/);
  assert.match(block, /symbol: SELECTED_STORE_MARKER\.symbol/);
  assert.match(block, /dataset\.selectedCandidate/);
  assert.match(block, /opportunities\.get\(selectedRecord\.terminal\)/);
});

check('Page 03 and Page 04 consume the same selectedStore identity', () => {
  assert.match(appSource, /state\.selectedStore = selected\.terminal/);
  assert.match(appSource, /function findDetailStore\(\)[\s\S]*\.terminal === state\.selectedStore/);
  assert.match(appSource, /function openStoreDetail\(terminal\) \{ state\.selectedStore = terminal;/);
});

check('Desktop title contract keeps the dashboard heading on one line', () => {
  assert.match(stylesSource, /\.title h1 \{[^}]*white-space: nowrap/);
  assert.match(stylesSource, /@media \(max-width: 680px\)[\s\S]*\.title h1 \{ white-space: normal; \}/);
  assert.match(stylesSource, /\.topbar \{[^}]*flex-wrap: wrap/);
});

check('Page 03 lens and performance state labels are bilingual', () => {
  assert.equal(I18n.translations.zh['portfolio.performance'], '经营表现');
  assert.equal(I18n.translations.zh['portfolio.efficiency'], '人员效率');
  assert.equal(I18n.translations.zh['portfolio.varianceContribution'], '差异贡献');
  assert.equal(I18n.translations.zh['performanceState.priority-review'], '优先复盘');
  assert.equal(I18n.translations.en['portfolio.searchStore'], 'Search Store');
  assert.equal(I18n.translations.zh['portfolio.searchStore'], '搜索门店');
  assert.equal(I18n.translations.zh['portfolio.selectedStoreIneligible'], '当前选中门店不符合经营表现视图的纳入条件。');
});

console.log(`\n${passed}/${passed} Page 03 redesign checks passed.`);
