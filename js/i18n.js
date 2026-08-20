(function (root, factory) {
  'use strict';

  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailDashboardI18n = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var STORAGE_KEY = 'dashboardLanguage';
  var SUPPORTED = ['en', 'zh'];
  var EN = {
    'language.en': 'EN', 'language.zh': '中文',
    'nav.label': 'Dashboard navigation', 'nav.flowLabel': 'Analysis flow', 'nav.pathLabel': 'Analysis path',
    'nav.overview': 'Executive Overview', 'nav.overviewQuestion': 'What changed?',
    'nav.variance': 'P&L Variance', 'nav.varianceQuestion': 'Why did it change?',
    'nav.portfolio': 'Store Portfolio', 'nav.portfolioQuestion': 'Where did it happen?',
    'nav.detail': 'Store Detail', 'nav.detailQuestion': 'What happened?',
    'nav.path.overview': 'OVERVIEW', 'nav.path.driver': 'DRIVER', 'nav.path.store': 'STORE', 'nav.path.detail': 'DETAIL',
    'shell.brandUnit': 'Finance Analytics', 'shell.path': 'FINANCE / COUNTER P&L REVIEW',
    'shell.title': 'Retail Performance Dashboard', 'shell.subtitle': 'Half-year performance review · Overview to store-level P&L',
    'shell.localMode': 'Local processing', 'shell.noServerUpload': 'No server upload',
    'source.demo': 'Demo Data', 'source.synthetic': 'Synthetic dataset', 'source.uploaded': 'Uploaded Workbook',
    'source.internal': 'Internal Offline', 'source.uploadWorkbook': 'Upload Workbook',
    'action.dataSettings': 'Data Settings', 'action.clearUpload': 'Clear Uploaded Data', 'action.clearData': 'Clear Data',
    'action.upload': 'Upload Your Data', 'action.uploadHint': 'Excel is processed locally in this browser',
    'action.uploadAria': 'Upload an Excel workbook or drop it here', 'action.reset': 'Reset',
    'action.viewDetails': 'View details', 'action.closeSettings': 'Close settings',
    'action.importMapping': 'Import Mapping', 'action.exportMapping': 'Export Mapping', 'action.saveMapping': 'Save Mapping',
    'action.applyMapping': 'Apply & Load Data',
    'common.current': 'Current', 'common.comparison': 'Comparison', 'common.vs': 'vs', 'common.variance': 'Variance',
    'common.variancePct': 'Variance %', 'common.salesPct': '% OF SALES', 'common.percentagePoints': 'percentage points', 'common.all': 'All',
    'common.ready': 'Ready', 'common.unavailable': 'Unavailable', 'common.partial': 'Partial',
    'common.noData': 'No data', 'common.store': 'Store', 'common.stores': 'stores', 'common.rank': 'Rank',
    'common.region': 'Region', 'common.city': 'City', 'common.status': 'Status', 'common.tier': 'Tier',
    'common.totalPortfolio': 'Total Portfolio', 'common.filteredPortfolio': 'Filtered Portfolio',
    'filter.reviewPeriod': 'Review Period', 'filter.allRegions': 'All Regions', 'filter.allCities': 'All Cities',
    'filter.allStatus': 'All Status', 'filter.productivityTier': 'Store Productivity Tier', 'filter.allTiers': 'All Tiers',
    'overview.kicker': '01 · EXECUTIVE OVERVIEW', 'overview.heading': 'Portfolio performance at a glance',
    'overview.primaryAria': 'Primary financial KPIs', 'overview.supportingAria': 'Supporting KPIs',
    'overview.signals': 'Management Signals', 'overview.signalsSub': 'Rule-based observations from the selected review',
    'overview.ruleBased': 'RULE-BASED', 'overview.noAnalysis': 'No analysis available',
    'overview.noSignals': 'No material signals for the selected scope',
    'signal.increased': '{metric} increased', 'signal.declined': '{metric} declined',
    'signal.roseDetail': '{metric} rose {value} versus the comparison period.',
    'signal.fellDetail': '{metric} fell {value} versus the comparison period.',
    'signal.improved': '{metric} improved', 'signal.changedDetail': '{metric} changed {value} versus the comparison period.',
    'signal.minorationsNarrowed': 'Total Minorations narrowed', 'signal.minorationsDeteriorated': 'Total Minorations deteriorated',
    'signal.minorationsBetterDetail': 'Total Minorations % changed {value}, easing commercial deductions against Gross Sales.',
    'signal.minorationsWorseDetail': 'Total Minorations % changed {value}, deepening commercial deductions against Gross Sales.',
    'signal.salesWithoutMargin': 'Sales growth did not improve margin',
    'signal.salesWithoutMarginDetail': 'Net Sales rose {value} while the Gross Margin rate did not keep pace.',
    'signal.stable': 'Portfolio performance remained broadly stable',
    'signal.stableDetail': 'No major movement across core P&L indicators versus the comparison period.',
    'signal.largestMovement': '{metric} showed the largest movement',
    'signal.comparisonUnavailable': 'Comparison period unavailable',
    'signal.comparisonRequired': 'Prior-year same-period data is required for variance signals.',
    'signal.noComparable': 'No comparable stores in scope',
    'signal.noComparableDetail': 'The current filters return no comparison-period stores, so no movement signals can be derived.',
    'variance.kicker': '02 · P&L VARIANCE ANALYSIS', 'variance.heading': 'Identify the accounts driving performance',
    'variance.headingHint': 'Click a driver to locate the responsible stores', 'variance.snapshot': 'P&L Snapshot',
    'variance.snapshotSub': 'Summary P&L · Actual Adj. · Current vs Prior Year Same Period',
    'variance.pnlLine': 'P&L Line', 'variance.section': 'CUSTOMER CONTRIBUTION',
    'variance.bridgeAnalysis': 'Customer Contribution Bridge Analysis',
    'variance.bridgeDescription': 'Switch between amount and percentage-point movements',
    'variance.bridge': 'Customer Contribution Bridge', 'variance.bridgeSub': 'Comparison to Current · Prior Year Same Period',
    'variance.amountBridge': 'Customer Contribution Amount Bridge', 'variance.ratioBridge': 'Customer Contribution % Bridge',
    'variance.amountMode': 'Amount', 'variance.ratioMode': '%', 'variance.bridgeModeAria': 'Bridge view',
    'variance.percentagePointMovement': 'Percentage-point movement',
    'variance.readout': 'Variance Readout', 'variance.readoutSub': 'Customer Contribution context',
    'variance.driverAnalysis': 'Customer Contribution Driver Analysis',
    'variance.driverDescription': 'Amounts and % OF SALES · click a row to preserve Store Ranking context',
    'variance.driver': 'Driver', 'variance.drilldown': 'Drill-down',
    'variance.topPositiveDrivers': 'Top Positive Drivers', 'variance.topPositiveSub': 'Largest positive amount movements',
    'variance.topNegativeDrivers': 'Top Negative Drivers', 'variance.topNegativeSub': 'Largest negative amount movements',
    'variance.reconciled': 'Reconciled', 'variance.reconciliationError': 'Reconciliation error',
    'variance.selectedKpi': 'Selected KPI', 'variance.amountMovement': 'Amount movement',
    'variance.balance': 'Balance', 'variance.pnlImpact': 'P&L impact', 'variance.clickStoreImpact': 'Click to view store impact',
    'variance.filteredSnapshot': 'Filtered Detail P&L', 'variance.summarySnapshot': 'Summary P&L · Actual Adj.',
    'variance.detailAttention': 'Detail-level reconciliation requires attention',
    'variance.detailAttentionDetail': 'The selected filtered slice is not safe to present as a reconciled Bridge.',
    'variance.largestPositive': 'Largest positive driver: {driver}', 'variance.largestNegative': 'Largest negative driver: {driver}',
    'variance.lineContribution': '{value} P&L line contribution.',
    'portfolio.kicker': '03 · STORE PORTFOLIO', 'portfolio.heading': 'Locate where the variance happened',
    'portfolio.currentView': 'Current portfolio view', 'portfolio.productivity': 'Productivity',
    'portfolio.ranking': 'Store Variance Ranking', 'portfolio.movement': 'Movement',
    'portfolio.search': 'Search Store', 'portfolio.searchPlaceholder': 'Store name or Store ID',
    'portfolio.quadrantTitle': 'Store Investment Productivity Quadrant',
    'portfolio.quadrantSub': 'Customer Contribution × A&P Expense spend magnitude · medians follow the selected scope',
    'portfolio.quadrantSummary': 'Quadrant Summary', 'portfolio.movementSummary': 'Movement Summary',
    'portfolio.priorityRisk': 'Priority Risk Stores',
    'portfolio.priorityRiskSub': 'Low Customer Contribution · High A&P Expense · ranked within the selected scope',
    'portfolio.regionCity': 'Region / City', 'portfolio.ccAmount': 'CC Amount', 'portfolio.ccPct': 'CC %',
    'portfolio.apSpend': 'A&P Spend', 'portfolio.riskScore': 'Risk Score',
    'portfolio.rankBy': 'Rank Stores By', 'portfolio.rankingNote': 'Ranked by Current vs Comparison variance',
    'portfolio.topPositiveStores': 'Top Positive Stores', 'portfolio.topPositiveStoresSub': 'Largest favorable Current vs Comparison',
    'portfolio.topNegativeStores': 'Top Negative Stores', 'portfolio.topNegativeStoresSub': 'Largest adverse Current vs Comparison',
    'portfolio.matchedStores': 'Matched Stores', 'portfolio.changedQuadrant': 'Changed Quadrant',
    'portfolio.stayedSame': 'Stayed Same', 'portfolio.nonRisk': 'Non-Risk', 'portfolio.nonStar': 'Non-Star',
    'portfolio.changedTrajectory': 'Changed trajectory', 'portfolio.sameQuadrant': 'Same quadrant',
    'portfolio.noStoresScope': 'No stores in scope', 'portfolio.noMatchedScope': 'No matched stores in scope',
    'portfolio.noRiskStores': 'No Risk stores in the selected scope', 'portfolio.noDirection': 'No stores in this direction',
    'portfolio.avgGrossMargin': 'Avg Gross Margin', 'portfolio.avgCustomerContribution': 'Avg Customer Contribution',
    'portfolio.avgProductivity': 'Avg Store Productivity', 'portfolio.medianCC': 'Median CC',
    'portfolio.medianAP': 'Median A&P', 'portfolio.pooledMedianCC': 'Pooled Median CC', 'portfolio.pooledMedianAP': 'Pooled Median A&P',
    'quadrant.Star': 'Star', 'quadrant.Risk': 'Risk', 'quadrant.Balanced High': 'Balanced High', 'quadrant.Balanced Low': 'Balanced Low',
    'detail.kicker': '04 · STORE DETAIL', 'detail.selectPrompt': 'Select a store to review',
    'detail.periodSub': 'Current versus comparison period', 'detail.selectStore': 'Select Store',
    'detail.storePnl': 'Store P&L', 'detail.storePnlSub': "Signed P&L values in KRMB; ratios follow each line's % OF SALES denominator",
    'detail.signals': 'Store Signals', 'detail.signalsSub': 'Rule-based review prompts',
    'detail.apComposition': 'A&P Component Composition',
    'detail.apCompositionSub': 'Current vs Comparison · components are shown separately from the formal Specific A&P total',
    'detail.totalAP': 'Total A&P', 'detail.currentTotalAP': 'Current Total A&P', 'detail.comparisonTotalAP': 'Comparison Total A&P',
    'detail.apSpendIncrease': 'Spend +{value} vs LY', 'detail.apSpendDecrease': 'Spend -{value} vs LY', 'detail.apSpendUnchanged': 'No spend change vs LY',
    'detail.componentView': 'COMPONENT VIEW', 'detail.apMovement': 'A&P Component Movement Bridge',
    'detail.apMovementSub': 'Comparison component pool → component movements → Current component pool · not a formal Specific A&P reconciliation',
    'detail.noResidual': 'NO RESIDUAL', 'detail.noStoreSelected': 'No store selected',
    'detail.selectFromPortfolio': 'Select a store from the Store Portfolio to review',
    'detail.noPriorRecord': 'No prior-year record', 'detail.newStore': 'New Store · No Prior-Year Comparison',
    'detail.componentPool': 'Component Pool', 'detail.spendMovement': 'Spend movement', 'detail.ofPool': 'of pool',
    'detail.newStoreDetail': 'This store has no prior-year same-period record. Current-only values are shown; comparison columns display —.',
    'detail.netSalesMovement': 'Net Sales {direction} {value}', 'detail.currentVsComparison': '{current} current versus {comparison} comparison.',
    'detail.rateChanged': '{metric} rate changed {value}', 'detail.rateCurrentComparison': 'Current {current} versus {comparison}.',
    'detail.apMovementSignal': 'A&P spend {direction} {value}',
    'detail.apMovementDetail': 'Current {current} versus {comparison} canonical Specific A&P spend.',
    'detail.stableSignal': 'No material store-level movement',
    'detail.stableSignalDetail': 'Key figures remained broadly stable versus the comparison period.',
    'detail.increased': 'increased', 'detail.decreased': 'decreased',
    'pnl.grossSales': 'GROSS SALES', 'pnl.discount': 'Discount', 'pnl.rebates': 'Rebates',
    'pnl.promotionalAllowance': 'Promotional Allowance', 'pnl.totalReturns': 'Actual Returns', 'pnl.vipRedemption': 'VIP Redemption',
    'pnl.oca': 'OCA', 'pnl.coupon': 'Coupon', 'pnl.totalMinorations': 'TOTAL MINORATIONS', 'pnl.netSales': 'CONSO NET SALES',
    'pnl.stdCos': 'Std COS', 'pnl.royalTaMs': 'Royal / TA / MS', 'pnl.physicalDistribution': 'Physical Distribution',
    'pnl.specialOperationsCost': 'Special Operations Cost', 'pnl.obsoleteSlowMovingReturns': 'Obsolete / Slow Moving / Return',
    'pnl.grossMargin': 'GROSS MARGIN', 'pnl.tradeRelation': 'Trade Relation', 'pnl.customerSamples': 'Customer Samples',
    'pnl.promotionalGifts': 'Promotional Gifts', 'pnl.posAdvertisingAmortization': 'POS Advertising Amortization',
    'pnl.posAdvertisingExpense': 'POS Advertising', 'pnl.merchandising': 'Merchandising', 'pnl.animations': 'Animations',
    'pnl.otherPosAdvertising': 'Other POS Advertising',
    'pnl.tester': 'Tester', 'pnl.daCost': 'DA Cost', 'pnl.specificDevelopment': 'Specific Development',
    'pnl.otherAP': 'Others', 'pnl.specificAP': 'Specific A&P', 'pnl.specificSga': 'Specific SG&A',
    'pnl.daHeadcount': 'DA HC', 'pnl.daHeadcountPerPos': 'DA HC / POS',
    'pnl.daCostAndSpecificDevelopment': 'DA Cost & Specific Development',
    'pnl.customerContribution': 'CUSTOMER CONTRIBUTION', 'pnl.nonSpecificCosts': 'Non-specific Costs', 'pnl.operatingProfit': 'OPERATING PROFIT',
    'component.tradeRelation': 'Trade Relation', 'component.customerSamples': 'Customer Samples',
    'component.promotionalGifts': 'Promotional Gifts', 'component.posAdvertisingAmortization': 'POS Advertising Amortization',
    'component.posAdvertisingExpense': 'POS Advertising', 'component.merchandising': 'Merchandising',
    'component.animations': 'Animations', 'component.tester': 'Tester',
    'component.daCostAndSpecificDevelopment': 'DA Cost & Specific Development', 'component.otherAP': 'Others',
    'metric.storeCount': 'Store Count', 'metric.posNo': 'POS no.', 'metric.aup': 'AUP',
    'metric.grossSales': 'Gross Sales', 'metric.totalMinorations': 'Total Minorations',
    'metric.totalMinorationsPct': 'Total Minorations %', 'metric.netSales': 'CONSO Net Sales',
    'metric.grossMargin': 'Gross Margin', 'metric.grossMarginPct': 'Gross Margin %',
    'metric.customerContribution': 'Customer Contribution', 'metric.customerContributionPct': 'Customer Contribution %',
    'metric.storeProductivity': 'Store Productivity', 'metric.apExpense': 'A&P Expense', 'metric.apExpenseSpend': 'A&P Expense Spend',
    'metric.productivityEvolPct': 'Productivity Evol %', 'metric.daHeadcount': 'DA HC', 'metric.daHeadcountDescription': 'Sales staff headcount',
    'field.terminal': 'Terminal', 'field.store': 'Store', 'field.city': 'City', 'field.region': 'Region', 'field.status': 'Status',
    'field.productivityTier': 'Store Productivity Tier', 'field.cityPosNo': 'City POS Count', 'field.storeProductivity': 'Store Productivity',
    'field.grossSales': 'Gross Sales', 'field.totalMinorations': 'Total Minorations', 'field.netSales': 'CONSO Net Sales',
    'field.grossMargin': 'Gross Margin', 'field.specificAP': 'Specific A&P', 'field.specificSga': 'Specific SG&A',
    'field.customerContribution': 'Client Contribution', 'field.tradeRelation': 'Trade Relation', 'field.customerSamples': 'Customer Samples',
    'field.promotionalGifts': 'Promotional Gifts', 'field.posAdvertisingAmortization': 'POS Advertising Amortization',
    'field.posAdvertisingExpense': 'POS Advertising', 'field.merchandising': 'Merchandising', 'field.animations': 'Animations',
    'field.tester': 'Tester', 'field.daHeadcount': 'DA HC', 'field.daCostAndSpecificDevelopment': 'DA Cost & Specific Development', 'field.otherAP': 'Others',
    'prep.dataPreparation': 'Data Preparation', 'prep.dataReady': 'Data Ready', 'prep.syntheticDataset': 'Synthetic Demo Dataset',
    'prep.syntheticSummary': 'Synthetic Summary', 'prep.summaryPnl': 'Summary P&L', 'prep.dashboardSource': 'Dashboard Source',
    'prep.currentDetail': 'Current Detail', 'prep.comparisonDetail': 'Comparison Detail', 'prep.dashboardSources': 'Dashboard sources',
    'prep.workbookDetails': 'Workbook Scan Details', 'prep.availability': 'Availability',
    'prep.additionalSheets': 'Additional compatible sheets', 'prep.attentionSheets': 'Sheets requiring attention', 'prep.otherSheets': 'Other sheets',
    'prep.workbookScanned': 'Workbook scanned', 'prep.summaryDetected': 'Summary P&L detected',
    'prep.periodsAssigned': 'Current and Comparison assigned', 'prep.readyAnalysis': 'Data ready for analysis',
    'prep.preparing': 'Preparing workbook…', 'prep.reading': 'Reading workbook and scanning sheets',
    'prep.dataBlocked': 'Data cannot be loaded for analysis', 'prep.missingField': 'Missing field', 'prep.missingFields': 'Missing fields',
    'prep.missingRequiredField': 'Missing required field', 'prep.missingRequiredFields': 'Missing required fields',
    'prep.localProcessing': 'Data is processed locally in your browser. No workbook upload to a server is required for this processing flow.',
    'prep.demoPrivacy': 'Synthetic demo data is bundled with this dashboard. Uploaded workbooks are processed locally in your browser.',
    'prep.readyLimitations': 'Data Ready with Limitations', 'prep.readyWarnings': 'Data Ready with Warnings',
    'prep.sheetSummary': '{compatible} store-level data sheets prepared · {used} used in current analysis',
    'prep.demoSummary': '{dataset} · 2 store-level data sheets ready · 2 used in current analysis',
    'prep.storesReady': '{count} stores · Ready', 'prep.rowsProcessed': '{count} rows processed',
    'prep.blankRow': '{count} blank row ignored', 'prep.blankRows': '{count} blank rows ignored',
    'prep.blankColumn': '{count} blank column ignored', 'prep.blankColumns': '{count} blank columns ignored',
    'prep.fieldPreserved': '{count} additional field preserved', 'prep.fieldsPreserved': '{count} additional fields preserved', 'prep.requiredUnavailable': 'Required source fields are not available.',
    'prep.missingByPeriod': 'Missing {period}: {fields}', 'prep.summarySheet': 'Summary P&L · Dashboard Source · Cleaning not required',
    'prep.detailCleaned': '{period} Detail · {stores} stores · Cleaned',
    'prep.historicalCleaned': 'Compatible Detail · Cleaned · Not used in current analysis',
    'prep.unassignedCleaned': 'Compatible Detail · Cleaned',
    'prep.unassignedNote': 'Not used in analysis · Year / Review Period could not be identified',
    'prep.nearCompatible': 'Detail sheet detected, but cannot be processed.',
    'prep.blockedSheet': 'Detail sheet detected, but its data could not be prepared.',
    'prep.notDetail': 'Not a store-level Detail sheet', 'prep.compatiblePrepared': '{count} store-level data sheets prepared',
    'cap.partial': '{name} is partial', 'cap.statusFilter': 'Status filter', 'cap.posAnalytics': 'Filtered POS analytics',
    'cap.tierFilter': 'Store Productivity Tier filter', 'cap.minorationsAnalytics': 'Minorations analytics',
    'cap.investmentQuadrant': 'Investment Quadrant', 'cap.productivitySummary': 'Productivity Summary',
    'cap.fullProductivityRisk': 'Productivity Risk analysis', 'cap.filteredCustomerContributionBridge': 'Customer Contribution Bridge',
    'cap.canonicalAP': 'Canonical A&P analysis', 'cap.apComponentAnalysis': 'A&P Component Analysis', 'cap.fullStorePnl': 'Full Store P&L',
    'cap.unavailable': '{name} unavailable', 'prep.errorGenericReason': 'Workbook structure could not be prepared for analysis.',
    'prep.errorGenericDetail': 'Review the workbook sheets and required Detail fields, then try again.',
    'prep.errorCurrentMissingOne': 'Current Detail is missing a required field: {fields}.', 'prep.errorCurrentMissing': 'Current Detail is missing required fields: {fields}.',
    'prep.errorCurrentMissingDetailOne': '{sheet} cannot be used as Current Detail until the required field is available.', 'prep.errorCurrentMissingDetail': '{sheet} cannot be used as Current Detail until the required fields are available.',
    'prep.errorComparisonAssign': 'Comparison Detail could not be assigned.', 'prep.errorComparisonAssignDetail': 'Expected a prior-year Detail sheet for the same Review Period.',
    'prep.errorCurrentAssign': 'Current Detail could not be assigned.', 'prep.errorCurrentAmbiguousDetail': 'More than one Detail sheet matches the latest year and Review Period.',
    'prep.errorCurrentPeriodDetail': 'Year / Review Period could not be identified for the cleaned Detail sheets.',
    'prep.errorMultiplePeriods': 'The workbook contains more than one Review Period.', 'prep.errorMultiplePeriodsDetail': 'Use one review period and its prior-year comparison in a single analysis workbook.',
    'prep.errorSummaryAssign': 'Summary P&L could not be identified.', 'prep.errorSummaryAssignDetail': 'Expected one P&L review sheet for the current review year.',
    'prep.errorYearMismatch': 'Summary P&L and Current Detail years do not match.', 'prep.errorYearMismatchDetail': 'Check the year labels on the Summary and Current Detail sheets.',
    'prep.errorLibraries': 'The local dashboard libraries could not be loaded.', 'prep.errorLibrariesDetail': 'Keep index.html, libs, js and assets together, then reopen the dashboard.',
    'prep.errorFileType': 'This file type is not supported.',
    'notice.loadingDemo': 'Loading demo data…', 'notice.loadingDemoDetail': 'The bundled synthetic dataset will be ready automatically.',
    'notice.demoReady': 'Demo data ready', 'notice.uploadReady': 'Uploaded data ready',
    'notice.demoReadyDetail': '{current} vs {comparison} · {stores} current stores · Synthetic Demo Dataset',
    'notice.uploadReadyDetail': '{current} vs {comparison} · {stores} current stores · KRMB',
    'notice.uploadReadyLimitations': 'Uploaded data ready with limitations',
    'notice.uploadFailed': 'Upload failed · current data retained', 'notice.prepareWorkbook': 'Preparing workbook…',
    'notice.prepareWorkbookDetail': 'Reading workbook and scanning sheets locally.',
    'notice.reset': 'Dashboard selections reset', 'notice.uploadRemains': 'Uploaded Workbook remains active.',
    'notice.demoRemains': 'Synthetic Demo Dataset remains active.', 'notice.returnedDemo': 'Returned to Demo Data',
    'notice.returnedDemoDetail': 'The uploaded workbook was cleared from dashboard memory. Synthetic Demo Dataset is active.',
    'notice.readyLocal': 'Ready for local workbook', 'notice.readyLocalDetail': 'Select an approved Excel workbook. Data is processed in this browser session.',
    'error.initialization': 'Dashboard initialization failed', 'error.libraryUnavailable': 'Spreadsheet, chart, or local application library unavailable.',
    'error.demoUnavailable': 'Bundled demo data unavailable.', 'error.invalidFile': 'Use an .xlsx, .xls, .xlsm or .csv workbook.',
    'error.reviewWorkbook': 'Review the workbook structure and try again.', 'error.singleWorkbook': 'Drop one workbook at a time',
    'error.singleWorkbookDetail': 'Please drag a single Excel or CSV file into the upload area.',
    'error.noAnalysis': 'No analysis available', 'error.noMappedDrivers': 'No mapped drivers', 'error.noMaterialDrivers': 'No material drivers',
    'error.noPriorComparison': 'No prior-year comparison', 'error.bridgeUnsafe': 'Selected filtered portfolio does not fully reconcile at detail level.',
    'error.bridgeUnsafeDetail': 'Adjust the filters or check the underlying detail data before using this Bridge.',
    'error.filteredUnavailable': 'Filtered detail-level comparison is unavailable',
    'error.driverUnavailable': 'Filtered driver analysis is unavailable for this workbook',
    'error.requiredFieldsMissing': 'Required detail fields are missing.',
    'error.apComponentUnavailable': 'A&P Component Analysis unavailable',
    'error.apComponentMissing': 'Some component fields are missing. Missing components are not treated as zero.',
    'error.uploadForPnlSnapshot': 'Upload a workbook to view the P&L snapshot',
    'error.filteredBridgeUnavailable': 'Filtered Bridge unavailable',
    'error.bridgeUnavailable': 'Bridge unavailable for this view',
    'error.filteredBridgeRounding': 'Bridge unavailable for this selection',
    'error.filteredBridgeRoundingDetail': 'Bridge unavailable for this selection due to source rounding reconciliation.',
    'error.productivityFieldsIncomplete': 'Required productivity fields are incomplete',
    'error.productivityRiskUnavailable': 'Productivity Risk analysis unavailable',
    'error.investmentQuadrantUnavailable': 'Investment Quadrant unavailable',
    'error.investmentQuadrantMissing': 'Customer Contribution or Specific A&P is missing.',
    'error.investmentQuadrantBothPeriods': 'Both analysis periods require Customer Contribution and Specific A&P.',
    'error.movementUnavailable': 'Movement analysis unavailable',
    'chart.zoom': 'Zoom', 'chart.undoZoom': 'Undo zoom', 'chart.resetView': 'Reset view',
    'chart.varianceBridge': 'Variance Bridge', 'chart.bridgeBase': 'Bridge base', 'chart.componentMovement': 'Component spend movement',
    'mapping.title': 'Data Settings / Field Mapping',
    'mapping.description': 'Map semantic fields to detected Excel headers. Dashboard calculations never depend on fixed column positions.',
    'mapping.worksheet': 'Worksheet', 'mapping.headerRow': 'Header row', 'mapping.uploadFirst': 'Upload a workbook first',
    'mapping.dashboardField': 'Dashboard field', 'mapping.requirement': 'Requirement', 'mapping.excelColumn': 'Excel column',
    'mapping.purpose': 'Purpose', 'mapping.notMapped': '— Not mapped —',
    'mapping.privacy': 'Privacy: Save Mapping stores only schema assignments in this browser. Workbook values are never written to localStorage.',
    'mapping.automatic': 'Automatic field mapping',
    'mapping.automaticDetail': 'This workbook is mapped automatically by the data layer. Manual field mapping is no longer required.',
    'mapping.autoSemantic': 'This workbook uses automatic semantic field mapping. Manual field mapping is not required.',
    'mapping.missingRequired': 'Missing required field: {fields}.',
    'mapping.missingRequiredSettings': 'Missing required field: {fields}. Please map in Settings.',
    'mapping.noUsableRecords': 'No usable P&L records found',
    'mapping.noUsableRecordsDetail': 'Check worksheet, header row and field mapping.',
    'mapping.duplicateRecords': 'Duplicate Store × Period records detected',
    'mapping.duplicateRecordsDetail': '{count} composite key(s) are duplicated. Resolve them before analysis.',
    'mapping.duplicateRecordsAlert': 'Duplicate Store ID × Period records prevent reliable comparisons.',
    'mapping.loadedRecords': 'Loaded {count} P&L records locally',
    'mapping.loadedRecordsDetail': '{stores} stores · {periods} review periods · Sheet: {sheet}{suffix}',
    'mapping.noSuitableHeader': 'No suitable P&L header row found. Open Data Settings and select the worksheet and header row.',
    'mapping.workbookNeedsMapping': 'Workbook needs field mapping',
    'mapping.missingFields': 'Missing: {fields}',
    'mapping.uploadBeforeConfig': 'Upload a workbook before configuring fields.',
    'footer.brand': "L'ORÉAL Finance Analytics · Local Counter P&L Review",
    'footer.local': 'Files are processed locally and are not transmitted to an external server',
    'footer.meta': '{current} current stores · {comparison} comparison stores · {period} · Source unit KRMB · Data held in browser memory only',
    'mapping.saved': 'Mapping saved locally. Workbook values were not stored.',
    'mapping.storageBlocked': 'This browser blocks localStorage for local files. Use Export Mapping instead.',
    'mapping.imported': 'Mapping imported. Click Apply & Load Data.', 'mapping.invalidJson': 'Invalid mapping JSON file.',
    'mapping.headerDetected': 'Detected header row {row}. Review mappings before applying.',
    'mapping.columnsDetected': '{count} columns detected · {file}',
    'error.fileRead': 'Browser could not read the selected file.',
    'error.localLibraries': 'Local libraries are missing. Keep the libs folder beside index.html.',
    'error.dataLayerMissing': 'Workbook data layer is missing.', 'error.preparationUiMissing': 'Workbook preparation UI is missing.',
    'error.demoMissing': 'Bundled demo data is missing.'
  };

  var ZH = Object.assign({}, EN, {
    'nav.label': '看板导航', 'nav.flowLabel': '分析路径', 'nav.pathLabel': '分析路径',
    'nav.overview': '经营概览', 'nav.overviewQuestion': '发生了什么变化？',
    'nav.variance': '差异分析', 'nav.varianceQuestion': '为什么发生变化？',
    'nav.portfolio': '门店组合分析', 'nav.portfolioQuestion': '变化发生在哪里？',
    'nav.detail': '单店分析', 'nav.detailQuestion': '单店表现如何？',
    'nav.path.overview': '概览', 'nav.path.driver': '驱动', 'nav.path.store': '门店', 'nav.path.detail': '明细',
    'shell.brandUnit': '财务分析', 'shell.path': '财务 / 门店损益表复盘',
    'shell.title': '零售经营分析看板', 'shell.subtitle': '半年度经营复盘 · 从整体表现到单店损益表',
    'shell.localMode': '本地处理', 'shell.noServerUpload': '数据不上传服务器',
    'source.demo': '演示数据', 'source.synthetic': '模拟数据集', 'source.uploaded': '已上传工作簿',
    'source.internal': '内部离线版', 'source.uploadWorkbook': '上传工作簿',
    'action.dataSettings': '数据设置', 'action.clearUpload': '清除上传数据', 'action.clearData': '清除数据',
    'action.upload': '上传数据', 'action.uploadHint': 'Excel 数据仅在本地浏览器中处理',
    'action.uploadAria': '上传 Excel 工作簿或拖放到此处', 'action.reset': '重置',
    'action.viewDetails': '查看详情', 'action.closeSettings': '关闭设置',
    'action.importMapping': '导入映射', 'action.exportMapping': '导出映射', 'action.saveMapping': '保存映射',
    'action.applyMapping': '应用并加载数据',
    'common.current': '当前期', 'common.comparison': '对比期', 'common.vs': '对比', 'common.variance': '差异',
    'common.variancePct': '差异率', 'common.salesPct': '占销售额比例', 'common.percentagePoints': '个百分点', 'common.all': '全部',
    'common.ready': '已就绪', 'common.unavailable': '不可用', 'common.partial': '部分可用',
    'common.noData': '暂无数据', 'common.store': '门店', 'common.stores': '家门店', 'common.rank': '排名',
    'common.region': '区域', 'common.city': '城市', 'common.status': '状态', 'common.tier': '等级',
    'common.totalPortfolio': '全部门店', 'common.filteredPortfolio': '筛选后门店',
    'filter.reviewPeriod': '复盘期间', 'filter.allRegions': '全部区域', 'filter.allCities': '全部城市',
    'filter.allStatus': '全部状态', 'filter.productivityTier': '门店总单产等级', 'filter.allTiers': '全部等级',
    'overview.kicker': '01 · 经营概览', 'overview.heading': '整体经营表现概览',
    'overview.primaryAria': '核心财务指标', 'overview.supportingAria': '辅助财务指标',
    'overview.signals': '管理提示', 'overview.signalsSub': '基于当前复盘范围的规则提示',
    'overview.ruleBased': '规则生成', 'overview.noAnalysis': '暂无可用分析',
    'overview.noSignals': '当前范围内没有显著提示',
    'signal.increased': '{metric}上升', 'signal.declined': '{metric}下降',
    'signal.roseDetail': '{metric}较对比期上升 {value}。',
    'signal.fellDetail': '{metric}较对比期下降 {value}。',
    'signal.improved': '{metric}改善', 'signal.changedDetail': '{metric}较对比期变化 {value}。',
    'signal.minorationsNarrowed': '销售扣减有所收窄', 'signal.minorationsDeteriorated': '销售扣减进一步扩大',
    'signal.minorationsBetterDetail': '销售扣减率变化 {value}，相对销售总额的扣减压力有所缓解。',
    'signal.minorationsWorseDetail': '销售扣减率变化 {value}，相对销售总额的扣减压力进一步加深。',
    'signal.salesWithoutMargin': '销售增长未带来毛利率改善',
    'signal.salesWithoutMarginDetail': '净销售额上升 {value}，但毛利率未同步改善。',
    'signal.stable': '整体经营表现基本稳定',
    'signal.stableDetail': '核心损益表指标较对比期没有显著变化。',
    'signal.largestMovement': '{metric}变动幅度最大',
    'signal.comparisonUnavailable': '对比期数据不可用',
    'signal.comparisonRequired': '差异提示需要上年同期数据。',
    'signal.noComparable': '当前范围内没有可比门店',
    'signal.noComparableDetail': '当前筛选条件下没有对比期门店，无法生成变动提示。',
    'variance.kicker': '02 · 损益表差异分析', 'variance.heading': '定位经营差异的主要科目',
    'variance.headingHint': '点击驱动因素，查看对应门店', 'variance.snapshot': '损益表概览',
    'variance.snapshotSub': '损益汇总表 · Actual Adj. · 当前期对比上年同期',
    'variance.pnlLine': '损益表科目', 'variance.section': '客户贡献额',
    'variance.bridgeAnalysis': '客户贡献额桥接分析',
    'variance.bridgeDescription': '切换查看金额或百分点变动',
    'variance.bridge': '客户贡献额桥接分析', 'variance.bridgeSub': '对比期至当前期 · 上年同期对比',
    'variance.amountBridge': '客户贡献额金额桥接', 'variance.ratioBridge': '客户贡献率桥接',
    'variance.amountMode': '金额', 'variance.ratioMode': '%', 'variance.bridgeModeAria': '桥接口径',
    'variance.percentagePointMovement': '百分点变动',
    'variance.readout': '差异解读', 'variance.readoutSub': '客户贡献额表现',
    'variance.driverAnalysis': '客户贡献额驱动因素分析',
    'variance.driverDescription': '金额及占销售额比例 · 点击科目保留门店排名上下文',
    'variance.driver': '驱动因素', 'variance.drilldown': '下钻',
    'variance.topPositiveDrivers': '主要正向驱动因素', 'variance.topPositiveSub': '金额改善最大的科目',
    'variance.topNegativeDrivers': '主要负向驱动因素', 'variance.topNegativeSub': '金额下降最大的科目',
    'variance.reconciled': '已勾稽', 'variance.reconciliationError': '勾稽异常',
    'variance.selectedKpi': '当前指标', 'variance.amountMovement': '金额变动',
    'variance.balance': '余额', 'variance.pnlImpact': '损益表影响', 'variance.clickStoreImpact': '点击查看门店影响',
    'variance.filteredSnapshot': '筛选后明细损益表', 'variance.summarySnapshot': '损益汇总表 · Actual Adj.',
    'variance.detailAttention': '明细层勾稽需要关注',
    'variance.detailAttentionDetail': '当前筛选范围不适合展示为已勾稽的桥接分析。',
    'variance.largestPositive': '最大正向驱动：{driver}', 'variance.largestNegative': '最大负向驱动：{driver}',
    'variance.lineContribution': '{value} 损益表科目贡献。',
    'portfolio.kicker': '03 · 门店组合分析', 'portfolio.heading': '定位差异发生的门店',
    'portfolio.currentView': '当前期门店组合', 'portfolio.productivity': '门店总单产',
    'portfolio.ranking': '门店差异排名', 'portfolio.movement': '变化轨迹',
    'portfolio.search': '搜索门店', 'portfolio.searchPlaceholder': '门店名称或门店编号',
    'portfolio.quadrantTitle': '门店投入产出四象限',
    'portfolio.quadrantSub': '客户贡献额 × 广告及促销投入金额 · 中位数随筛选范围变化',
    'portfolio.quadrantSummary': '象限概览', 'portfolio.movementSummary': '变化概览',
    'portfolio.priorityRisk': '重点关注门店',
    'portfolio.priorityRiskSub': '低客户贡献额 · 高广告及促销投入 · 在当前范围内排序',
    'portfolio.regionCity': '区域 / 城市', 'portfolio.ccAmount': '客户贡献额', 'portfolio.ccPct': '客户贡献率',
    'portfolio.apSpend': '广告及促销投入', 'portfolio.riskScore': '风险评分',
    'portfolio.rankBy': '门店排名指标', 'portfolio.rankingNote': '按当前期与对比期差异排名',
    'portfolio.topPositiveStores': '正向差异门店', 'portfolio.topPositiveStoresSub': '当前期较对比期改善最大的门店',
    'portfolio.topNegativeStores': '负向差异门店', 'portfolio.topNegativeStoresSub': '当前期较对比期下降最大的门店',
    'portfolio.matchedStores': '匹配门店', 'portfolio.changedQuadrant': '象限发生变化',
    'portfolio.stayedSame': '象限保持不变', 'portfolio.nonRisk': '非重点关注', 'portfolio.nonStar': '非高效门店',
    'portfolio.changedTrajectory': '象限变化', 'portfolio.sameQuadrant': '象限不变',
    'portfolio.noStoresScope': '当前范围内没有门店', 'portfolio.noMatchedScope': '当前范围内没有匹配门店',
    'portfolio.noRiskStores': '当前范围内没有重点关注门店', 'portfolio.noDirection': '该方向暂无门店',
    'portfolio.avgGrossMargin': '平均毛利率', 'portfolio.avgCustomerContribution': '平均客户贡献率',
    'portfolio.avgProductivity': '平均门店总单产', 'portfolio.medianCC': '客户贡献额中位数',
    'portfolio.medianAP': '广告及促销中位数', 'portfolio.pooledMedianCC': '合并客户贡献额中位数', 'portfolio.pooledMedianAP': '合并广告及促销中位数',
    'quadrant.Star': '高效门店', 'quadrant.Risk': '重点关注', 'quadrant.Balanced High': '高投入高贡献', 'quadrant.Balanced Low': '低投入低贡献',
    'detail.kicker': '04 · 单店分析', 'detail.selectPrompt': '选择门店查看分析',
    'detail.periodSub': '当前期与对比期', 'detail.selectStore': '选择门店',
    'detail.storePnl': '单店损益表', 'detail.storePnlSub': '损益表金额单位为 KRMB；比例按各科目的销售额分母计算',
    'detail.signals': '门店提示', 'detail.signalsSub': '基于规则的复盘提示',
    'detail.apComposition': '广告及促销构成',
    'detail.apCompositionSub': '当前期对比对比期 · 组成项目与正式专项广告及促销总额分开展示',
    'detail.totalAP': '广告及促销总额', 'detail.currentTotalAP': '本期广告及促销总额', 'detail.comparisonTotalAP': '上年同期广告及促销总额',
    'detail.apSpendIncrease': '较上年增加 {value}', 'detail.apSpendDecrease': '较上年减少 {value}', 'detail.apSpendUnchanged': '较上年无变化',
    'detail.componentView': '组成分析', 'detail.apMovement': '广告及促销组成变动桥接',
    'detail.apMovementSub': '对比期组成池 → 各组成变动 → 当前期组成池 · 不作为专项广告及促销的正式勾稽',
    'detail.noResidual': '无残差项', 'detail.noStoreSelected': '未选择门店',
    'detail.selectFromPortfolio': '请从门店组合分析中选择门店',
    'detail.noPriorRecord': '无上年同期记录', 'detail.newStore': '新开门店 · 无上年同期对比',
    'detail.componentPool': '组成池', 'detail.spendMovement': '投入变动', 'detail.ofPool': '占组成池',
    'detail.newStoreDetail': '该门店没有上年同期记录，仅展示当前期数据；对比期列显示 —。',
    'detail.netSalesMovement': '净销售额{direction} {value}', 'detail.currentVsComparison': '当前期 {current}，对比期 {comparison}。',
    'detail.rateChanged': '{metric}变化 {value}', 'detail.rateCurrentComparison': '当前期 {current}，对比期 {comparison}。',
    'detail.apMovementSignal': '广告及促销投入{direction} {value}',
    'detail.apMovementDetail': '当前期 {current}，对比期 {comparison}；口径为专项广告及促销投入。',
    'detail.stableSignal': '单店指标没有显著变化',
    'detail.stableSignalDetail': '核心指标较对比期基本稳定。',
    'detail.increased': '上升', 'detail.decreased': '下降',
    'pnl.grossSales': '销售总额', 'pnl.discount': '折扣', 'pnl.rebates': '返利',
    'pnl.promotionalAllowance': '促销折让', 'pnl.totalReturns': '实际退货', 'pnl.vipRedemption': 'VIP 兑换',
    'pnl.oca': '其他客户核销', 'pnl.coupon': '优惠券',
    'pnl.totalMinorations': '销售扣减合计', 'pnl.netSales': '合并净销售额', 'pnl.stdCos': '标准销售成本',
    'pnl.royalTaMs': '特许权使用 / 技术支持 / 管理服务',
    'pnl.physicalDistribution': '物流配送', 'pnl.specialOperationsCost': '特殊运营成本',
    'pnl.obsoleteSlowMovingReturns': '过时 / 滞销 / 退货', 'pnl.grossMargin': '毛利额',
    'pnl.tradeRelation': '渠道关系投入', 'pnl.customerSamples': '客户样品', 'pnl.promotionalGifts': '促销赠品',
    'pnl.posAdvertisingAmortization': 'POS 广告摊销', 'pnl.posAdvertisingExpense': 'POS 广告',
    'pnl.otherPosAdvertising': '其他 POS 广告',
    'pnl.merchandising': '陈列', 'pnl.animations': '活动', 'pnl.tester': '试用装',
    'pnl.daCost': '销售人员费用', 'pnl.specificDevelopment': '专项开发',
    'pnl.otherAP': '其他', 'pnl.specificAP': '专项广告及促销', 'pnl.specificSga': '专项销售及管理',
    'pnl.daHeadcount': '销售人员人数', 'pnl.daHeadcountPerPos': '销售人员人数 / POS',
    'pnl.daCostAndSpecificDevelopment': '销售人员费用与专项开发',
    'pnl.nonSpecificCosts': '非专项费用',
    'pnl.customerContribution': '客户贡献额', 'pnl.operatingProfit': '营业利润',
    'component.tradeRelation': '渠道关系投入', 'component.customerSamples': '客户样品',
    'component.promotionalGifts': '促销赠品', 'component.posAdvertisingAmortization': 'POS 广告摊销',
    'component.posAdvertisingExpense': 'POS 广告', 'component.merchandising': '陈列',
    'component.animations': '活动', 'component.tester': '试用装',
    'component.daCostAndSpecificDevelopment': '销售人员费用与专项开发', 'component.otherAP': '其他',
    'metric.storeCount': '门店数', 'metric.posNo': 'POS 数量', 'metric.aup': '实际成交总额',
    'metric.grossSales': '销售总额', 'metric.totalMinorations': '销售扣减合计',
    'metric.totalMinorationsPct': '销售扣减率', 'metric.netSales': '合并净销售额',
    'metric.grossMargin': '毛利额', 'metric.grossMarginPct': '毛利率',
    'metric.customerContribution': '客户贡献额', 'metric.customerContributionPct': '客户贡献率',
    'metric.storeProductivity': '门店总单产', 'metric.productivityEvolPct': '门店单产变化率',
    'metric.daHeadcount': '销售人员人数', 'metric.daHeadcountDescription': '当前筛选范围内的销售人员人数',
    'metric.apExpense': '广告及促销投入', 'metric.apExpenseSpend': '广告及促销投入金额',
    'field.terminal': '门店编号', 'field.store': '门店', 'field.city': '城市', 'field.region': '区域', 'field.status': '状态',
    'field.productivityTier': '门店总单产等级', 'field.cityPosNo': '城市 POS 数量', 'field.storeProductivity': '门店总单产',
    'field.grossSales': '销售总额', 'field.totalMinorations': '销售扣减合计', 'field.netSales': '合并净销售额',
    'field.grossMargin': '毛利额', 'field.specificAP': '专项广告及促销', 'field.specificSga': '专项销售及管理',
    'field.customerContribution': '客户贡献额', 'field.tradeRelation': '渠道关系投入', 'field.customerSamples': '客户样品',
    'field.promotionalGifts': '促销赠品', 'field.posAdvertisingAmortization': 'POS 广告摊销',
    'field.posAdvertisingExpense': 'POS 广告', 'field.merchandising': '陈列', 'field.animations': '活动',
    'field.tester': '试用装', 'field.daHeadcount': '销售人员人数', 'field.daCostAndSpecificDevelopment': '销售人员费用与专项开发', 'field.otherAP': '其他',
    'prep.dataPreparation': '数据准备', 'prep.dataReady': '数据已就绪', 'prep.syntheticDataset': '模拟演示数据集',
    'prep.syntheticSummary': '模拟汇总数据', 'prep.summaryPnl': '损益汇总表', 'prep.dashboardSource': '看板数据源',
    'prep.currentDetail': '当前期明细', 'prep.comparisonDetail': '对比期明细', 'prep.dashboardSources': '看板数据源',
    'prep.workbookDetails': '工作簿识别详情', 'prep.availability': '功能可用性',
    'prep.additionalSheets': '其他兼容工作表', 'prep.attentionSheets': '需要关注的工作表', 'prep.otherSheets': '其他工作表',
    'prep.workbookScanned': '工作簿已识别', 'prep.summaryDetected': '已识别损益汇总表',
    'prep.periodsAssigned': '已分配当前期和对比期', 'prep.readyAnalysis': '数据可用于分析',
    'prep.preparing': '正在准备工作簿…', 'prep.reading': '正在读取工作簿并识别工作表',
    'prep.dataBlocked': '数据无法用于分析', 'prep.missingField': '缺少字段', 'prep.missingFields': '缺少字段',
    'prep.missingRequiredField': '缺少必需字段', 'prep.missingRequiredFields': '缺少必需字段',
    'prep.localProcessing': '数据仅在本地浏览器中处理；此流程不需要将工作簿上传至服务器。',
    'prep.demoPrivacy': '本看板内置模拟演示数据；上传的工作簿仅在本地浏览器中处理。',
    'prep.readyLimitations': '数据已就绪，部分功能受限', 'prep.readyWarnings': '数据已就绪，存在提示',
    'prep.sheetSummary': '已准备 {compatible} 张门店明细表 · 当前分析使用 {used} 张',
    'prep.demoSummary': '{dataset} · 2 张门店明细表已就绪 · 当前分析使用 2 张',
    'prep.storesReady': '{count} 家门店 · 已就绪', 'prep.rowsProcessed': '已处理 {count} 行',
    'prep.blankRow': '已忽略 {count} 个空行', 'prep.blankRows': '已忽略 {count} 个空行',
    'prep.blankColumn': '已忽略 {count} 个空列', 'prep.blankColumns': '已忽略 {count} 个空列',
    'prep.fieldPreserved': '已保留 {count} 个附加字段', 'prep.fieldsPreserved': '已保留 {count} 个附加字段', 'prep.requiredUnavailable': '所需源字段不可用。',
    'prep.missingByPeriod': '缺少{period}字段：{fields}', 'prep.summarySheet': '损益汇总表 · 看板数据源 · 无需清洗',
    'prep.detailCleaned': '{period}明细 · {stores} 家门店 · 已清洗',
    'prep.historicalCleaned': '可兼容明细 · 已清洗 · 未用于当前分析',
    'prep.unassignedCleaned': '可兼容明细 · 已清洗',
    'prep.unassignedNote': '未用于分析 · 无法识别年份 / 复盘期间',
    'prep.nearCompatible': '已识别门店明细表，但无法处理。',
    'prep.blockedSheet': '已识别门店明细表，但无法完成数据准备。',
    'prep.notDetail': '非门店级明细表', 'prep.compatiblePrepared': '已准备 {count} 张门店明细表',
    'cap.partial': '{name}部分可用', 'cap.statusFilter': '状态筛选', 'cap.posAnalytics': '筛选后 POS 分析',
    'cap.tierFilter': '门店总单产等级筛选', 'cap.minorationsAnalytics': '销售扣减分析',
    'cap.investmentQuadrant': '投入效率四象限', 'cap.productivitySummary': '门店总单产概览',
    'cap.fullProductivityRisk': '门店总单产风险分析', 'cap.filteredCustomerContributionBridge': '客户贡献桥接分析',
    'cap.canonicalAP': '标准广告及促销分析', 'cap.apComponentAnalysis': '广告及促销组成分析', 'cap.fullStorePnl': '完整单店损益表',
    'cap.unavailable': '{name}不可用', 'prep.errorGenericReason': '工作簿结构无法用于分析。',
    'prep.errorGenericDetail': '请检查工作表及必需的明细字段后重试。',
    'prep.errorCurrentMissingOne': '当前期明细缺少必需字段：{fields}。', 'prep.errorCurrentMissing': '当前期明细缺少必需字段：{fields}。',
    'prep.errorCurrentMissingDetailOne': '{sheet} 在补齐必需字段前无法作为当前期明细。', 'prep.errorCurrentMissingDetail': '{sheet} 在补齐必需字段前无法作为当前期明细。',
    'prep.errorComparisonAssign': '无法分配对比期明细。', 'prep.errorComparisonAssignDetail': '需要同一复盘期间的上年门店明细表。',
    'prep.errorCurrentAssign': '无法分配当前期明细。', 'prep.errorCurrentAmbiguousDetail': '有多张明细表同时匹配最新年份和复盘期间。',
    'prep.errorCurrentPeriodDetail': '无法识别已清洗明细表的年份 / 复盘期间。',
    'prep.errorMultiplePeriods': '工作簿包含多个复盘期间。', 'prep.errorMultiplePeriodsDetail': '单个分析工作簿请仅保留一个复盘期间及其上年同期。',
    'prep.errorSummaryAssign': '无法识别损益汇总表。', 'prep.errorSummaryAssignDetail': '当前复盘年应包含一张损益表复盘表。',
    'prep.errorYearMismatch': '损益汇总表与当前期明细的年份不一致。', 'prep.errorYearMismatchDetail': '请检查损益汇总表和当前期明细表中的年份标记。',
    'prep.errorLibraries': '本地看板依赖加载失败。', 'prep.errorLibrariesDetail': '请保持 index.html、libs、js 和 assets 目录在同一包内，然后重新打开。',
    'prep.errorFileType': '不支持该文件类型。',
    'notice.loadingDemo': '正在加载演示数据…', 'notice.loadingDemoDetail': '内置模拟数据集将自动就绪。',
    'notice.demoReady': '演示数据已就绪', 'notice.uploadReady': '上传数据已就绪',
    'notice.demoReadyDetail': '{current} 对比 {comparison} · {stores} 家当前期门店 · 模拟演示数据集',
    'notice.uploadReadyDetail': '{current} 对比 {comparison} · {stores} 家当前期门店 · KRMB',
    'notice.uploadReadyLimitations': '上传数据已就绪，但部分功能受限',
    'notice.uploadFailed': '上传失败 · 当前数据保持不变', 'notice.prepareWorkbook': '正在准备工作簿…',
    'notice.prepareWorkbookDetail': '正在本地读取工作簿并识别工作表。',
    'notice.reset': '看板选择已重置', 'notice.uploadRemains': '已上传工作簿保持有效。',
    'notice.demoRemains': '模拟演示数据集保持有效。', 'notice.returnedDemo': '已返回演示数据',
    'notice.returnedDemoDetail': '已从看板内存中清除上传工作簿，当前使用模拟演示数据集。',
    'notice.readyLocal': '可上传本地工作簿', 'notice.readyLocalDetail': '请选择获准使用的 Excel 工作簿，数据仅在当前浏览器会话中处理。',
    'error.initialization': '看板初始化失败', 'error.libraryUnavailable': '电子表格、图表或本地应用依赖不可用。',
    'error.demoUnavailable': '内置演示数据不可用。', 'error.invalidFile': '请使用 .xlsx、.xls、.xlsm 或 .csv 工作簿。',
    'error.reviewWorkbook': '请检查工作簿结构和必需的明细字段后重试。', 'error.singleWorkbook': '每次只能拖入一个工作簿',
    'error.singleWorkbookDetail': '请将单个 Excel 或 CSV 文件拖入上传区域。',
    'error.noAnalysis': '暂无可用分析', 'error.noMappedDrivers': '没有已映射的驱动因素', 'error.noMaterialDrivers': '暂无显著驱动因素',
    'error.noPriorComparison': '无上年同期对比', 'error.bridgeUnsafe': '所选筛选范围无法在明细层完整勾稽。',
    'error.bridgeUnsafeDetail': '请调整筛选条件或检查底层明细数据后再使用该桥接分析。',
    'error.filteredUnavailable': '筛选后的明细对比不可用',
    'error.driverUnavailable': '此工作簿不支持筛选后的驱动因素分析',
    'error.requiredFieldsMissing': '缺少所需明细字段。',
    'error.apComponentUnavailable': '广告及促销组成分析不可用',
    'error.apComponentMissing': '部分组成字段缺失，缺失值不会按零处理。',
    'error.uploadForPnlSnapshot': '请上传工作簿以查看损益表快照',
    'error.filteredBridgeUnavailable': '筛选后的桥接分析不可用',
    'error.bridgeUnavailable': '当前桥接口径不可用',
    'error.filteredBridgeRounding': '当前筛选范围暂不展示桥接分析',
    'error.filteredBridgeRoundingDetail': '当前筛选范围因源数据舍入无法完成勾稽，暂不展示桥接分析。',
    'error.productivityFieldsIncomplete': '门店总单产所需字段不完整',
    'error.productivityRiskUnavailable': '门店总单产风险分析不可用',
    'error.investmentQuadrantUnavailable': '门店投入产出四象限不可用',
    'error.investmentQuadrantMissing': '缺少客户贡献额或专项广告及促销字段。',
    'error.investmentQuadrantBothPeriods': '当前期与对比期均需包含客户贡献额和专项广告及促销字段。',
    'error.movementUnavailable': '变化轨迹分析不可用',
    'chart.zoom': '缩放', 'chart.undoZoom': '撤销缩放', 'chart.resetView': '重置视图',
    'chart.varianceBridge': '差异桥接', 'chart.bridgeBase': '桥接基准', 'chart.componentMovement': '组成投入变动',
    'mapping.title': '数据设置 / 字段映射',
    'mapping.description': '将业务字段映射至已识别的 Excel 表头。看板计算不依赖固定列位置。',
    'mapping.worksheet': '工作表', 'mapping.headerRow': '表头行', 'mapping.uploadFirst': '请先上传工作簿',
    'mapping.dashboardField': '看板字段', 'mapping.requirement': '要求', 'mapping.excelColumn': 'Excel 列',
    'mapping.purpose': '用途', 'mapping.notMapped': '— 未映射 —',
    'mapping.privacy': '隐私：保存映射只会在浏览器中保存字段对应关系，不会将工作簿数据写入 localStorage。',
    'mapping.automatic': '字段已自动映射',
    'mapping.automaticDetail': '当前工作簿已由数据层自动映射，无需手动设置。',
    'mapping.autoSemantic': '当前工作簿已自动完成业务字段映射，无需手动设置。',
    'mapping.missingRequired': '缺少必需字段：{fields}。',
    'mapping.missingRequiredSettings': '缺少必需字段：{fields}。请在数据设置中完成映射。',
    'mapping.noUsableRecords': '未找到可用的损益表记录',
    'mapping.noUsableRecordsDetail': '请检查工作表、表头行和字段映射。',
    'mapping.duplicateRecords': '发现重复的门店 × 期间记录',
    'mapping.duplicateRecordsDetail': '发现 {count} 个重复组合键，请处理后再分析。',
    'mapping.duplicateRecordsAlert': '重复的门店编号 × 期间记录会导致对比结果不可靠。',
    'mapping.loadedRecords': '已在本地加载 {count} 条损益表记录',
    'mapping.loadedRecordsDetail': '{stores} 家门店 · {periods} 个复盘期间 · 工作表：{sheet}{suffix}',
    'mapping.noSuitableHeader': '未找到合适的损益表表头行，请打开数据设置并选择工作表和表头行。',
    'mapping.workbookNeedsMapping': '工作簿需要设置字段映射',
    'mapping.missingFields': '缺少：{fields}',
    'mapping.uploadBeforeConfig': '请先上传工作簿，再设置字段映射。',
    'footer.brand': "L'ORÉAL 财务分析 · 本地门店损益表复盘",
    'footer.local': '文件仅在本地处理，不会传输至外部服务器',
    'footer.meta': '{current} 家当前期门店 · {comparison} 家对比期门店 · {period} · 数据单位 KRMB · 数据仅保存在浏览器内存中',
    'mapping.saved': '映射已保存在本地，未保存工作簿数据。',
    'mapping.storageBlocked': '当前浏览器禁止本地文件使用 localStorage，请使用“导出映射”。',
    'mapping.imported': '映射已导入，请点击“应用并加载数据”。', 'mapping.invalidJson': '映射 JSON 文件无效。',
    'mapping.headerDetected': '已识别第 {row} 行为表头，应用前请检查映射。',
    'mapping.columnsDetected': '已识别 {count} 列 · {file}',
    'error.fileRead': '浏览器无法读取所选文件。',
    'error.localLibraries': '本地依赖缺失，请保持 libs 目录与 index.html 同级。',
    'error.dataLayerMissing': '工作簿数据层缺失。', 'error.preparationUiMissing': '数据准备界面缺失。',
    'error.demoMissing': '内置演示数据缺失。'
  });

  var translations = Object.freeze({ en: Object.freeze(EN), zh: Object.freeze(ZH) });
  var runtime = root && root.RetailDashboardRuntime ? root.RetailDashboardRuntime : { mode: 'public-demo', languageMode: 'bilingual' };
  var languageMode = runtime.languageMode || (runtime.mode === 'internal-edge' ? 'en-only' : 'bilingual');
  var storageFailed = false;

  function normalizeLanguage(value) {
    var text = String(value || '').toLowerCase();
    if (text === 'zh' || text.indexOf('zh-') === 0) return 'zh';
    if (text === 'en' || text.indexOf('en-') === 0) return 'en';
    return '';
  }

  function readStoredLanguage() {
    if (languageMode === 'en-only') return '';
    try {
      return normalizeLanguage(root.localStorage && root.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      storageFailed = true;
      return '';
    }
  }

  function detectInitialLanguage() {
    if (languageMode === 'en-only') return 'en';
    var saved = readStoredLanguage();
    if (saved) return saved;
    if (storageFailed) return 'en';
    return normalizeLanguage(root.navigator && root.navigator.language) === 'zh' ? 'zh' : 'en';
  }

  var currentLanguage = detectInitialLanguage();

  function interpolate(template, params) {
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, key) {
      return params && params[key] !== undefined ? String(params[key]) : '';
    });
  }

  function t(key, params) {
    var table = translations[currentLanguage] || translations.en;
    var value = table[key];
    if (value === undefined) value = translations.en[key];
    return value === undefined ? String(key) : interpolate(value, params);
  }

  function applyStaticCopy(scope) {
    if (!root.document) return;
    var parent = scope || root.document;
    Array.prototype.forEach.call(parent.querySelectorAll('[data-i18n]'), function (element) {
      element.textContent = t(element.getAttribute('data-i18n'));
    });
    Array.prototype.forEach.call(parent.querySelectorAll('[data-i18n-aria-label]'), function (element) {
      element.setAttribute('aria-label', t(element.getAttribute('data-i18n-aria-label')));
    });
    Array.prototype.forEach.call(parent.querySelectorAll('[data-i18n-placeholder]'), function (element) {
      element.setAttribute('placeholder', t(element.getAttribute('data-i18n-placeholder')));
    });
    root.document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  }

  function renderLanguageSwitch() {
    if (!root.document || languageMode !== 'bilingual') return;
    var host = root.document.querySelector('.topbar-tools');
    if (!host || root.document.getElementById('languageSwitch')) return;
    var control = root.document.createElement('div');
    control.id = 'languageSwitch';
    control.className = 'language-switch';
    control.setAttribute('aria-label', 'Language');
    control.innerHTML = '<button type="button" data-language="zh">中文</button><span aria-hidden="true">|</span><button type="button" data-language="en">EN</button>';
    host.insertBefore(control, host.firstChild);
    control.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-language]');
      if (button) setLanguage(button.getAttribute('data-language'));
    });
    updateLanguageSwitch();
  }

  function updateLanguageSwitch() {
    if (!root.document) return;
    var control = root.document.getElementById('languageSwitch');
    if (!control) return;
    Array.prototype.forEach.call(control.querySelectorAll('button[data-language]'), function (button) {
      var active = button.getAttribute('data-language') === currentLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setLanguage(next, options) {
    if (languageMode === 'en-only') next = 'en';
    var normalized = normalizeLanguage(next) || 'en';
    currentLanguage = SUPPORTED.indexOf(normalized) >= 0 ? normalized : 'en';
    if (languageMode === 'bilingual' && !(options && options.persist === false)) {
      try {
        if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, currentLanguage);
      } catch (_) {}
    }
    applyStaticCopy();
    updateLanguageSwitch();
    if (root.dispatchEvent && typeof root.CustomEvent === 'function') {
      root.dispatchEvent(new root.CustomEvent('retail:languagechange', { detail: { language: currentLanguage } }));
    }
    return currentLanguage;
  }

  function getLanguage() { return currentLanguage; }
  function getLanguageMode() { return languageMode; }
  function isBilingual() { return languageMode === 'bilingual'; }

  if (root.document && root.addEventListener) {
    root.addEventListener('DOMContentLoaded', function () {
      applyStaticCopy();
      renderLanguageSwitch();
    });
  }

  return Object.freeze({
    STORAGE_KEY: STORAGE_KEY,
    translations: translations,
    t: t,
    getLanguage: getLanguage,
    getLanguageMode: getLanguageMode,
    isBilingual: isBilingual,
    setLanguage: setLanguage,
    detectInitialLanguage: detectInitialLanguage,
    applyStaticCopy: applyStaticCopy,
    renderLanguageSwitch: renderLanguageSwitch,
    normalizeLanguage: normalizeLanguage
  });
}));
