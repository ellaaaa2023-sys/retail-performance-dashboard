(function () {
'use strict';

const $ = id => document.getElementById(id);
const UNIT_SCALE = 1000; // Workbook values are KRMB; reader-facing money is RMB.
const STORAGE_KEY = 'retail-dashboard-field-mappings-v2';
const THEME = {
  blue: '#2f6da9', navy: '#244f82', blueLight: '#dce9f5', gold: '#b7965b',
  goldDark: '#846a39', green: '#347c68', orange: '#c7773e', red: '#b64f4f',
  ink: '#30312f', muted: '#777a76', grid: '#efede8', axis: '#cbc6bc', neutral: '#979891'
};
const ProductivityQuadrant = window.RetailProductivityQuadrant;
const StoreDetailModel = window.RetailStoreDetail;
const DataPreparationUI = window.RetailDataPreparationUI;
const SourceLifecycle = window.RetailSourceLifecycle;
const I18n = window.RetailDashboardI18n;
const RuntimeConfig = window.RetailDashboardRuntime || Object.freeze({ mode: 'public-demo' });
const IS_INTERNAL_EDGE = RuntimeConfig.mode === 'internal-edge';
const t = (key, params) => I18n ? I18n.t(key, params) : key;
const localized = (key, fallback, params) => {
  const value = t(key, params);
  return value === key ? fallback : value;
};
const metricLabel = (key, fallback) => localized(`metric.${key}`, fallback || key);
const quadrantLabel = quadrant => localized(`quadrant.${quadrant}`, quadrant);
const pnlLabel = (field, fallback) => localized(`pnl.${field}`, fallback || field);
const componentLabel = (key, fallback) => localized(`component.${key}`, fallback || key);

const field = (label, level, purpose, aliases) => ({ label, level, purpose, aliases });
const FIELDS = {
  year: field('Year', 'required', 'Review year', ['year', 'fiscal year', 'review year', '年份']),
  reviewPeriod: field('Review Period', 'required', 'Half-year review label', ['review period', 'reviewperiod', 'semester', 'half year', '期间', '复盘期间']),
  periodKey: field('Period Key', 'optional', 'Combined period label; derived when absent', ['period key', 'period', 'review period key']),
  terminal: field('Store ID / Terminal', 'required', 'Stable store identifier across periods', ['store id', 'terminal', 'counter id', '门店编号']),
  store: field('Store', 'required', 'Store name', ['store', 'store name', 'counter', '门店', '门店名称']),
  city: field('City', 'recommended', 'Portfolio filter', ['city', '城市']),
  province: field('Province', 'optional', 'Store geography', ['province', '省份']),
  region: field('Region', 'recommended', 'Portfolio filter', ['region', '区域', '大区']),
  channel: field('Channel', 'recommended', 'Portfolio filter', ['channel', '渠道']),
  storeType: field('Store Type', 'recommended', 'Portfolio filter', ['store type', 'counter type', '门店类型']),
  status: field('Status', 'recommended', 'Operating status filter', ['status', '门店状态', '状态']),
  pos: field('POS Count', 'required', 'Store footprint and productivity denominator', ['pos count', 'pos no.', 'pos no', 'pos number', 'pos']),
  cityPos: field('City POS Count', 'optional', 'City retail footprint', ['city pos count', '城市pos数']),
  customers: field('Customer Transactions', 'recommended', 'Customer volume for productivity analysis', ['customer transactions', 'customers', 'customer count', 'transactions', '客流', '客户数']),
  avgTicket: field('Average Ticket', 'optional', 'Average transaction value', ['average ticket', 'avg ticket', 'aup', '客单价']),
  rsp: field('RSP', 'optional', 'Gross sales reference', ['rsp']),
  grossSales: field('Gross Sales', 'recommended', 'Net Sales driver', ['gross sales', 'gs']),
  discount: field('Discount', 'recommended', 'Net Sales driver', ['discount', 'discount value']),
  discountPct: field('Discount % of GS', 'optional', 'Discount rate', ['discount % of gs', 'discount pct']),
  rebates: field('Rebates', 'recommended', 'Net Sales driver', ['rebates', 'rebate value']),
  rebatesPct: field('Rebates % of GS', 'optional', 'Rebate rate', ['rebates % of gs', 'rebate % of gs']),
  structuralOn: field('Structural Conditions On', 'recommended', 'Promotional allowance component', ['structural conditions on']),
  structuralOff: field('Structural Conditions Off', 'recommended', 'Promotional allowance component', ['structural conditions off']),
  activeSupport: field('Active Support', 'recommended', 'Promotional allowance component', ['active support', 'total active support']),
  shopperInvestment: field('Shopper Investment', 'recommended', 'Promotional allowance component', ['shopper investment']),
  promoInvoice: field('Promo Allow On Invoice', 'recommended', 'Promotional allowance component', ['promo allow on invoice']),
  promoSeparate: field('Promo Allow Applied Separately', 'recommended', 'Promotional allowance component', ['promo allow applied separately']),
  promoLoyalty: field('Promo Allow Loyalty', 'recommended', 'Promotional allowance component', ['promo allow loyalty']),
  promotionalAllowance: field('Promotional Allowance', 'recommended', 'Net Sales driver subtotal', ['promotional allowance', 'total promotional allowance', 'ttl pa']),
  promotionalAllowancePct: field('Promotional Allowance % of GS', 'optional', 'Promotional allowance rate', ['promotional allowance % of gs', 'ttl pa % of gs']),
  returns: field('Returns', 'recommended', 'Net Sales driver', ['returns', 'actual returns', 'total returns/var provisions']),
  returnsPct: field('Returns % of GS', 'optional', 'Returns rate', ['returns % of gs', 'actual returns % of gs']),
  oca: field('OCA', 'recommended', 'Net Sales driver', ['oca']),
  coupon: field('Coupon', 'recommended', 'Net Sales driver', ['coupon']),
  minorations: field('Minorations', 'recommended', 'Total commercial deductions', ['minorations', 'total minorations']),
  minorationsPct: field('Minorations % of GS', 'optional', 'Deduction rate', ['minorations % of gs', 'total minorations % of gs']),
  netSales: field('Net Sales', 'required', 'Primary revenue KPI', ['net sales', 'ca net', 'conso net sales', 'net revenue']),
  netSalesPct: field('Net Sales % of GS', 'optional', 'Net sales conversion', ['net sales % of gs', 'ca net % of gs']),
  netSalesPerPos: field('Net Sales / POS', 'recommended', 'Store productivity reference', ['net sales / pos', 'net sales per pos', '门店总单产', 'sales per store']),
  tier: field('Store Productivity Tier', 'recommended', 'Store productivity classification', ['store productivity tier', 'productivity tier', '门店单产等级']),
  stdCos: field('Std COS', 'recommended', 'Cost of Sales driver', ['std cos', 'standard cos']),
  royal: field('Royal / TA / MS', 'recommended', 'Cost of Sales driver', ['royal / ta / ms', 'royal/ta/ms']),
  specialOps: field('Special Operations Cost', 'recommended', 'Cost of Sales driver', ['special operations cost', 'special operation cost']),
  obsolete: field('Obsolete / Slow Moving / Return', 'recommended', 'Cost of Sales driver', ['obsolete / slow moving / return', 'obsolete slow moving return']),
  physicalDistribution: field('Physical Distribution', 'recommended', 'Cost of Sales driver', ['physical distribution']),
  costOfSales: field('Cost of Sales', 'recommended', 'Gross Margin driver subtotal', ['cost of sales', 'total cost of sales', 'cogs']),
  costOfSalesPct: field('Cost of Sales % of Net Sales', 'optional', 'Cost ratio', ['cost of sales % of net sales', 'cogs %']),
  grossMargin: field('Gross Margin', 'required', 'Primary margin KPI', ['gross margin', 'gm']),
  grossMarginPct: field('Gross Margin %', 'recommended', 'Aggregated as Gross Margin / Net Sales', ['gross margin %', 'gm %', 'gm margin %', 'gross margin pct']),
  samples: field('Customer Samples', 'recommended', 'DA Cost component', ['customer samples', 'customer samples (val)']),
  gifts: field('Promotional Gifts', 'recommended', 'DA Cost component', ['promotional gifts', 'total promotional gifts cost']),
  animations: field('Animations', 'recommended', 'DA Cost component', ['animations', 'animation', 'animations toward the distributor']),
  posAdvAmort: field('POS Advertising Amortization', 'recommended', 'POS Advertising component', ['pos advertising amortization', 'amortization of immo pos adv', 'amortization of in-store pos advertising']),
  posAdvOther: field('Other POS Advertising', 'recommended', 'POS Advertising component', ['other pos advertising', 'other pos advertising costs']),
  posAdvertising: field('POS Advertising', 'recommended', 'DA Cost component subtotal', ['pos advertising', 'total pos advertising']),
  development: field('Specific Development', 'recommended', 'DA Cost component', ['specific development']),
  daCost: field('DA Cost', 'recommended', 'Customer Contribution driver subtotal', ['da cost', 'total da cost']),
  daHc: field('DA HC', 'optional', 'Beauty advisor headcount', ['da hc']),
  nonDaCost: field('Non DA Cost', 'optional', 'Supporting cost', ['non da cost']),
  daCostPerHc: field('DA Cost / HC', 'optional', 'DA productivity', ['da cost / hc', 'da cost per hc']),
  daHcPerPos: field('DA HC / POS', 'optional', 'DA coverage', ['da hc / pos', 'da hc per pos']),
  specificAP: field('Specific A&P', 'recommended', 'Customer Contribution driver', ['specific a&p', 'specific ap']),
  specificSga: field('Specific SG&A', 'recommended', 'Customer Contribution driver', ['specific sg&a', 'total specific sg&a', 'specific sga']),
  contribution: field('Customer Contribution', 'required', 'Primary contribution KPI', ['customer contribution', 'customer contribution amount', 'cc']),
  contributionPct: field('Customer Contribution %', 'recommended', 'Aggregated as contribution / Net Sales', ['customer contribution %', 'cc %', 'customer contribution pct']),
  nonSpecificCosts: field('Non-specific Costs', 'recommended', 'Operating Profit driver', ['non-specific costs', 'non specific costs', 'total non-specific costs']),
  operatingProfit: field('Operating Profit', 'required', 'Primary profit KPI', ['operating profit', 'op profit after fx excl ps', 'op profit', 'op']),
  operatingMargin: field('Operating Margin %', 'recommended', 'Aggregated as Operating Profit / Net Sales', ['operating margin %', 'op margin %', 'operating margin'])
};

const REQUIRED = Object.keys(FIELDS).filter(k => FIELDS[k].level === 'required');
const PERCENT_KEYS = new Set(['discountPct','rebatesPct','promotionalAllowancePct','returnsPct','minorationsPct','netSalesPct','costOfSalesPct','grossMarginPct','contributionPct','operatingMargin']);
const NUMERIC_KEYS = Object.keys(FIELDS).filter(k => !['year','reviewPeriod','periodKey','terminal','store','city','province','region','channel','storeType','status','tier'].includes(k));

const STORE_PNL_LINES = [
  { field: 'grossSales', label: 'GROSS SALES', className: 'major' },
  { field: 'discount', label: 'Discount', indent: 1 },
  { field: 'rebates', label: 'Rebates', indent: 1 },
  { field: 'promotionalAllowance', label: 'Promotional Allowance', indent: 1 },
  { field: 'totalReturns', label: 'Actual Returns', indent: 1 },
  { field: 'vipRedemption', label: 'VIP Redemption', indent: 1 },
  { field: 'oca', label: 'OCA', indent: 1 },
  { field: 'coupon', label: 'Coupon', indent: 1 },
  { field: 'totalMinorations', label: 'TOTAL MINORATIONS', className: 'total' },
  { field: 'netSales', label: 'CONSO NET SALES', className: 'major' },
  { field: 'stdCos', label: 'Std COS', indent: 1 },
  { field: 'royalTaMs', label: 'Royal / TA / MS', indent: 1 },
  { field: 'physicalDistribution', label: 'Physical Distribution', indent: 1 },
  { field: 'specialOperationsCost', label: 'Special Operations Cost', indent: 1 },
  { field: 'obsoleteSlowMovingReturns', label: 'Obsolete / Slow Moving / Return', indent: 1 },
  { field: 'grossMargin', label: 'GROSS MARGIN', className: 'major' },
  { field: 'tradeRelation', label: 'Trade Relation', indent: 1 },
  { field: 'customerSamples', label: 'Customer Samples', indent: 1 },
  { field: 'promotionalGifts', label: 'Promotional Gifts', indent: 1 },
  { field: 'posAdvertisingAmortization', label: 'POS Advertising Amortization', indent: 1 },
  { field: 'posAdvertisingExpense', label: 'POS Advertising', indent: 1 },
  { field: 'merchandising', label: 'Merchandising', indent: 1 },
  { field: 'animations', label: 'Animations', indent: 1 },
  { field: 'tester', label: 'Tester', indent: 1 },
  { field: 'daCost', label: 'DA Cost', className: 'total' },
  { field: 'specificDevelopment', label: 'Specific Development', indent: 1 },
  { field: 'otherAP', label: 'Others', indent: 1 },
  { field: 'specificAP', label: 'Specific A&P', className: 'group' },
  { field: 'specificSga', label: 'Specific SG&A', className: 'group' },
  { field: 'customerContribution', label: 'CUSTOMER CONTRIBUTION', className: 'major' },
  { field: 'nonSpecificCosts', label: 'Unspecific Costs', className: 'group' },
  { field: 'operatingProfit', label: 'OPERATING PROFIT', className: 'major' }
];

const STORE_KPIS = StoreDetailModel.KPI_DEFINITIONS;

const state = {
  book: null, fileName: '', sheetName: '', headerRow: 0, headers: [], matrix: [], mapping: {}, signature: '',
  records: [], periods: [], currentPeriodKey: '', comparisonMode: 'ly', filters: {}, activeTab: 'overview',
  portfolioView: 'productivity', snapshot: 'current',
  portfolioMetric: 'customerContribution', selectedStore: '', search: '', charts: {}, warnings: [], dataStats: null,
  model: null, service: null, sourceType: 'none', selectedPnlLine: '', selectedDriver: '', selectedQuadrant: 'all', preparationView: null,
  noticeSpec: null
};

const norm = v => String(v ?? '').trim().toLowerCase()
  .replace(/gross\s+margin/g,'grossmargin').replace(/customer\s+contribution/g,'customercontribution')
  .replace(/operating\s+profit/g,'operatingprofit').replace(/[^a-z0-9%&\u4e00-\u9fff]+/g,'');
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const finite = v => Number.isFinite(v) ? v : 0;
const sum = (rows, key) => rows.reduce((total, row) => total + finite(row[key]), 0);
const unique = values => [...new Set(values.filter(v => v !== null && v !== undefined && String(v).trim() !== ''))];

function toNumber(value, isPercent = false) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return isPercent && Math.abs(value) > 1.5 ? value / 100 : value;
  }
  let text = String(value).trim();
  const negative = /^\(.*\)$/.test(text);
  const hasPct = text.includes('%');
  text = text.replace(/[,%¥￥\s()]/g,'');
  let number = Number(text);
  if (!Number.isFinite(number)) return 0;
  if (negative) number = -number;
  if (hasPct || (isPercent && Math.abs(number) > 1.5)) number /= 100;
  return number;
}

function trimZeros(value, digits = 2) {
  return value.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*)0+$/,'').replace(/\.$/,'');
}
function formatMoney(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const amount = Math.abs(value) * UNIT_SCALE;
  if (amount >= 1e9) return `${sign}¥${trimZeros(amount / 1e9, 2)}B`;
  if (amount >= 1e6) return `${sign}¥${trimZeros(amount / 1e6, amount >= 1e8 ? 1 : 2)}M`;
  if (amount >= 1e3) return `${sign}¥${trimZeros(amount / 1e3, amount >= 1e5 ? 0 : 1)}K`;
  return `${sign}¥${Math.round(amount)}`;
}
function formatKrmb(value) { return Number.isFinite(value) ? value.toLocaleString('en-US',{maximumFractionDigits:1,minimumFractionDigits:0}) : '—'; }
function formatPct(value) { return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'; }
function formatRatioVariance(value) { return Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${formatPct(value)}` : '—'; }
function formatInt(value) { return Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '—'; }
function formatSignedMoney(value) { const text = formatMoney(value); return value > 0 ? `+${text}` : text; }
function formatSignedNumber(value) { return `${value > 0 ? '+' : ''}${formatInt(value)}`; }
function inlineAmountRatioHtml(amount, ratio) {
  const display = StoreDetailModel.amountRatioDisplay(amount, ratio);
  return `<span>${formatMoney(display.amount)}</span><i class="metric-separator">·</i><span>${formatPct(display.ratio)}</span>`;
}

function setNotice(type, title, message) {
  state.noticeSpec = null;
  $('notice').className = `notice ${type}`;
  $('notice').innerHTML = `<div><strong>${esc(title)}</strong><span>${esc(message)}</span></div>`;
}

function setI18nNotice(type, titleKey, messageKey, params) {
  setNotice(type, t(titleKey, params), t(messageKey, params));
  state.noticeSpec = { type, titleKey, messageKey, params: params || {} };
}

function rerenderNotice() {
  const spec = state.noticeSpec;
  if (spec) setI18nNotice(spec.type, spec.titleKey, spec.messageKey, spec.params);
}

function preparationSheetHtml(sheet) {
  const mark = sheet.tone === 'warning' ? '△' : sheet.tone === 'error' ? '!' : sheet.tone === 'neutral' ? '○' : '✓';
  const missing = sheet.missing && sheet.missing.length
    ? `<span>${esc(t(sheet.missing.length === 1 ? 'prep.missingRequiredField' : 'prep.missingRequiredFields'))}: ${esc(sheet.missing.join(', '))}</span>`
    : '';
  const note = sheet.note ? `<span>${esc(sheet.note)}</span>` : '';
  const stats = sheet.stats && sheet.stats.length
    ? `<div class="preparation-stats">${sheet.stats.map(item => `<i>${esc(item)}</i>`).join('')}</div>`
    : '';
  return `<div class="preparation-sheet ${esc(sheet.tone)}"><div class="preparation-mark">${mark}</div><div><strong>${esc(sheet.name)}</strong><span>${esc(sheet.detail)}</span>${note}${missing}${stats}</div></div>`;
}

function preparationGroupHtml(title, items, renderer) {
  if (!items || !items.length) return '';
  return `<section class="preparation-group"><h3>${esc(title)}</h3>${items.map(renderer).join('')}</section>`;
}

function renderDataPreparation(view) {
  const panel = $('dataPreparation');
  state.preparationView = view || null;
  if (!panel || !view) {
    if (panel) { panel.hidden = true; panel.innerHTML = ''; panel.className = 'preparation-panel'; }
    return;
  }
  const icon = view.mode === 'blocked' ? '!' : view.mode === 'warning' ? '△' : view.mode === 'loading' ? '…' : '✓';
  panel.hidden = false;
  panel.className = `preparation-panel ${esc(view.mode)}`;
  const hasDetails = view.steps.length || view.primarySheets.length || view.additionalSheets.length || view.sheetWarnings.length || view.otherSheets.length || view.capabilityWarnings.length || view.privacy;
  const steps = view.steps.length ? `<div class="preparation-steps">${view.steps.map(step => `<span class="preparation-step">✓ ${esc(step)}</span>`).join('')}</div>` : '';
  const capabilityWarnings = preparationGroupHtml(t('prep.availability'), view.capabilityWarnings, warning => `<div class="preparation-warning"><div class="preparation-mark">⚠</div><div><strong>${esc(warning.title)}</strong><span>${esc(warning.detail)}</span></div></div>`);
  const details = hasDetails ? `<details${view.expanded ? ' open' : ''}><summary>${esc(view.detailsLabel || t('prep.workbookDetails'))}</summary><div class="preparation-details">${steps}${preparationGroupHtml(view.primaryGroupLabel || t('prep.dashboardSources'), view.primarySheets, preparationSheetHtml)}${preparationGroupHtml(t('prep.additionalSheets'), view.additionalSheets, preparationSheetHtml)}${preparationGroupHtml(t('prep.attentionSheets'), view.sheetWarnings, preparationSheetHtml)}${capabilityWarnings}${preparationGroupHtml(t('prep.otherSheets'), view.otherSheets, preparationSheetHtml)}${view.privacy ? `<div class="preparation-privacy">${esc(view.privacy)}</div>` : ''}</div></details>` : '';
  panel.innerHTML = `<div class="preparation-summary"><div class="preparation-icon">${icon}</div><div class="preparation-copy"><strong>${esc(view.title)}</strong><span>${esc(view.summary)}</span></div>${view.period ? `<div class="preparation-period">${esc(view.period)}</div>` : ''}</div>${details}`;
}

function capabilityStatus(key, role = 'resolved') {
  const capabilities = state.model && state.model.metadata && state.model.metadata.capabilities;
  return capabilities && capabilities[role] && capabilities[role][key]
    ? capabilities[role][key].status
    : 'available';
}

function snapshotCapabilityStatus(key) {
  if (state.snapshot === 'movement') return capabilityStatus(key, 'resolved');
  return capabilityStatus(key, state.snapshot === 'comparison' ? 'comparison' : 'current');
}

function capabilityWarning(key) {
  if (!DataPreparationUI || !state.model) return null;
  return DataPreparationUI.buildCapabilityWarnings(state.model.metadata.capabilities).find(item => item.key === key) || null;
}

function featureUnavailable(id, title, detail) {
  disposeChart(id);
  $(id).innerHTML = `<div class="feature-unavailable"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
}

function applyCapabilityControls() {
  if (!state.model) return;
  const controls = [
    ['statusFilter', 'statusFilter', 'Status field is not available in both analysis periods.'],
    ['tierFilter', 'tierFilter', 'Store Productivity Tier field is not available in both analysis periods.']
  ];
  controls.forEach(([id, capability, title]) => {
    const element = $(id);
    const available = capabilityStatus(capability) === 'available';
    element.disabled = !available;
    element.title = available ? '' : title;
    if (!available) element.value = '';
  });
}

function readMappingStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; }
}
function schemaSignature(headers) { return headers.map(norm).filter(Boolean).sort().join('|'); }
function sheetMatrix(name) { return XLSX.utils.sheet_to_json(state.book.Sheets[name], {header:1,defval:null,raw:true,blankrows:true}); }
function headersAt(matrix, row) { return (matrix[row] || []).map((v,i) => String(v ?? '').trim() || `Unnamed Column ${i+1}`); }
function aliasScore(header) {
  const normalized = norm(header);
  let score = 0;
  for (const item of Object.values(FIELDS)) {
    const aliases = item.aliases.map(norm);
    if (aliases.includes(normalized)) score += item.level === 'required' ? 6 : item.level === 'recommended' ? 3 : 1;
    else if (normalized.length > 3 && aliases.some(a => a.length > 3 && (normalized.includes(a) || a.includes(normalized)))) score += item.level === 'required' ? 3 : 1;
  }
  return score;
}
function detectHeader(matrix) {
  let best = {row:0,score:-1,count:0};
  for (let row = 0; row < Math.min(matrix.length, 60); row++) {
    const values = (matrix[row] || []).filter(v => String(v ?? '').trim());
    if (values.length < 5) continue;
    const score = values.reduce((total,value) => total + aliasScore(value), 0);
    if (score > best.score) best = {row,score,count:values.length};
  }
  return best;
}
function bestSource() {
  let best = null;
  for (const name of state.book.SheetNames) {
    const matrix = sheetMatrix(name);
    const header = detectHeader(matrix);
    if (!best || header.score > best.score) best = {name,matrix,row:header.row,score:header.score,count:header.count};
  }
  return best;
}
function autoMap(headers) {
  const normalizedHeaders = headers.map(norm);
  const mapping = {};
  for (const [key,item] of Object.entries(FIELDS)) {
    const aliases = item.aliases.map(norm);
    let index = normalizedHeaders.findIndex(header => aliases.includes(header));
    if (index < 0 && key !== 'periodKey') index = normalizedHeaders.findIndex(header => header.length > 3 && aliases.some(alias => alias.length > 3 && (header.includes(alias) || alias.includes(header))));
    mapping[key] = index;
  }
  return mapping;
}
function savedToIndexes(saved, headers) {
  const normalizedHeaders = headers.map(norm);
  const mapping = {};
  for (const key of Object.keys(FIELDS)) mapping[key] = saved?.[key] ? normalizedHeaders.indexOf(norm(saved[key])) : -1;
  return mapping;
}
function currentMappingNames() {
  const output = {};
  for (const key of Object.keys(FIELDS)) output[key] = state.mapping[key] >= 0 ? state.headers[state.mapping[key]] : '';
  return output;
}
function validateMapping(mapping = state.mapping) { return REQUIRED.filter(key => !(mapping[key] >= 0 && mapping[key] < state.headers.length)); }
function mapped(key) { return state.mapping[key] >= 0; }
function value(row,key) { return mapped(key) ? row[state.mapping[key]] : null; }
function cellHasUncachedFormula(sheet,row,col) {
  const cell = sheet[XLSX.utils.encode_cell({r:row,c:col})];
  return Boolean(cell && cell.f && (cell.v === undefined || cell.v === null || cell.v === ''));
}

function renderSourceControls() {
  $('sheetSelect').innerHTML = state.book.SheetNames.map(name => `<option value="${esc(name)}"${name === state.sheetName ? ' selected' : ''}>${esc(name)}</option>`).join('');
  $('headerRow').value = state.headerRow + 1;
  $('schemaMeta').textContent = t('mapping.columnsDetected', { count: state.headers.length, file: state.fileName });
}
function renderMapping() {
  $('mappingBody').innerHTML = Object.entries(FIELDS).map(([key,item]) => {
    const options = [`<option value="-1">${esc(t('mapping.notMapped'))}</option>`, ...state.headers.map((header,index) => `<option value="${index}"${state.mapping[key] === index ? ' selected' : ''}>${esc(header)}</option>`)].join('');
    return `<tr><td><strong>${esc(item.label)}</strong></td><td><span class="${item.level}">${item.level}</span></td><td><select data-field="${key}">${options}</select></td><td>${esc(item.purpose)}</td></tr>`;
  }).join('');
}
function mappingFromUI() {
  const mapping = {};
  document.querySelectorAll('#mappingBody select[data-field]').forEach(element => { mapping[element.dataset.field] = Number(element.value); });
  return mapping;
}
function showMappingAlert(type,text) { $('mappingAlert').className = `mapping-alert ${type}`; $('mappingAlert').textContent = text; }
function openSettings() {
  if (state.model) { setNotice('info',t('mapping.automatic'),t('mapping.automaticDetail')); return; }
  if (!$('mappingDialog').open) $('mappingDialog').showModal();
  if (!state.book) showMappingAlert('error',t('mapping.uploadBeforeConfig'));
}

function deriveRecord(record) {
  if (!mapped('periodKey')) record.periodKey = `${record.year} ${record.reviewPeriod}`.trim();
  if (!mapped('promotionalAllowance')) record.promotionalAllowance = sumOne(record,['structuralOn','structuralOff','activeSupport','shopperInvestment','promoInvoice','promoSeparate','promoLoyalty']);
  if (!mapped('minorations')) record.minorations = sumOne(record,['discount','rebates','promotionalAllowance','returns','oca','coupon']);
  if (!mapped('netSales')) record.netSales = record.grossSales + record.minorations;
  if (!mapped('posAdvertising')) record.posAdvertising = record.posAdvAmort + record.posAdvOther;
  if (!mapped('daCost')) record.daCost = sumOne(record,['samples','gifts','animations','posAdvertising','development']);
  if (!mapped('costOfSales')) record.costOfSales = sumOne(record,['stdCos','royal','specialOps','obsolete','physicalDistribution']);
  if (!mapped('grossMargin')) record.grossMargin = record.netSales + record.costOfSales;
  if (!mapped('contribution')) record.contribution = record.grossMargin + record.daCost + record.specificAP + record.specificSga;
  if (!mapped('operatingProfit')) record.operatingProfit = record.contribution + record.nonSpecificCosts;
  if (!mapped('netSalesPerPos')) record.netSalesPerPos = record.pos ? record.netSales / record.pos : record.netSales;
  record.grossMarginPct = record.netSales ? record.grossMargin / record.netSales : 0;
  record.contributionPct = record.netSales ? record.contribution / record.netSales : 0;
  record.operatingMargin = record.netSales ? record.operatingProfit / record.netSales : 0;
  record.discountPct = record.grossSales ? Math.abs(record.discount) / record.grossSales : 0;
  record.promotionalAllowancePct = record.grossSales ? Math.abs(record.promotionalAllowance) / record.grossSales : 0;
  record.returnsPct = record.grossSales ? Math.abs(record.returns) / record.grossSales : 0;
  record.minorationsPct = record.grossSales ? Math.abs(record.minorations) / record.grossSales : 0;
  return record;
}
function sumOne(record,keys) { return keys.reduce((total,key) => total + finite(record[key]), 0); }
function reviewRank(review) {
  const text = String(review || '').trim().toUpperCase();
  const s = text.match(/(?:S|H|SEMESTER)\s*(\d+)/); if (s) return Number(s[1]) * 10;
  const q = text.match(/Q\s*(\d+)/); if (q) return Number(q[1]) * 5;
  const number = text.match(/(\d+)/); return number ? Number(number[1]) * 10 : 999;
}
function periodSort(a,b) {
  const ay = Number(a.year), by = Number(b.year);
  if (Number.isFinite(ay) && Number.isFinite(by) && ay !== by) return ay - by;
  if (String(a.year) !== String(b.year)) return String(a.year).localeCompare(String(b.year),undefined,{numeric:true});
  return reviewRank(a.reviewPeriod) - reviewRank(b.reviewPeriod) || String(a.reviewPeriod).localeCompare(String(b.reviewPeriod),undefined,{numeric:true});
}
function pnlTieErrors(record) {
  const tolerance = 0.25;
  let errors = 0;
  if (Math.abs(record.grossSales + record.minorations - record.netSales) > tolerance) errors++;
  if (Math.abs(record.netSales + record.costOfSales - record.grossMargin) > tolerance) errors++;
  if (Math.abs(record.grossMargin + record.daCost + record.specificAP + record.specificSga - record.contribution) > tolerance) errors++;
  if (Math.abs(record.contribution + record.nonSpecificCosts - record.operatingProfit) > tolerance) errors++;
  return errors;
}

function buildRecords() {
  if (state.model) { showMappingAlert('success',t('mapping.autoSemantic')); return; }
  const missing = validateMapping();
  if (missing.length) {
    showMappingAlert('error',t('mapping.missingRequired', { fields: missing.map(key => FIELDS[key].label).join(', ') }));
    return;
  }
  const sheet = state.book.Sheets[state.sheetName];
  const records = [];
  let blankRows = 0, totalRows = 0, uncached = 0;
  for (let rowIndex = state.headerRow + 1; rowIndex < state.matrix.length; rowIndex++) {
    const row = state.matrix[rowIndex] || [];
    const store = String(value(row,'store') ?? '').trim();
    if (!store) { blankRows++; continue; }
    if (/^(total|grandtotal|subtotal|合计|总计|小计)/i.test(norm(store))) { totalRows++; continue; }
    const record = {
      year: String(value(row,'year') ?? '').trim(), reviewPeriod: String(value(row,'reviewPeriod') ?? '').trim(),
      periodKey: String(value(row,'periodKey') ?? '').trim(), terminal: String(value(row,'terminal') ?? '').trim(), store,
      city: String(value(row,'city') ?? 'Unknown').trim() || 'Unknown', province: String(value(row,'province') ?? '').trim(),
      region: String(value(row,'region') ?? 'Unclassified').trim() || 'Unclassified', channel: String(value(row,'channel') ?? 'Unclassified').trim() || 'Unclassified',
      storeType: String(value(row,'storeType') ?? 'Unclassified').trim() || 'Unclassified', status: String(value(row,'status') ?? 'Unknown').trim() || 'Unknown',
      tier: String(value(row,'tier') ?? 'Unclassified').trim() || 'Unclassified', sourceRow: rowIndex + 1
    };
    for (const key of NUMERIC_KEYS) record[key] = toNumber(value(row,key),PERCENT_KEYS.has(key));
    for (const key of NUMERIC_KEYS) if (mapped(key) && cellHasUncachedFormula(sheet,rowIndex,state.mapping[key])) uncached++;
    deriveRecord(record);
    records.push(record);
  }
  if (!records.length) { setNotice('error',t('mapping.noUsableRecords'),t('mapping.noUsableRecordsDetail')); return; }
  const duplicates = new Map();
  records.forEach(record => {
    const key = `${norm(record.terminal)}|${norm(record.periodKey)}`;
    duplicates.set(key,(duplicates.get(key)||0)+1);
  });
  const duplicateKeys = [...duplicates.entries()].filter(([,count]) => count > 1);
  if (duplicateKeys.length) {
    setNotice('error',t('mapping.duplicateRecords'),t('mapping.duplicateRecordsDetail', { count: duplicateKeys.length }));
    showMappingAlert('error',t('mapping.duplicateRecordsAlert'));
    return;
  }
  const periodMap = new Map();
  records.forEach(record => {
    if (!periodMap.has(record.periodKey)) periodMap.set(record.periodKey,{key:record.periodKey,year:record.year,reviewPeriod:record.reviewPeriod});
  });
  const periods = [...periodMap.values()].sort(periodSort);
  const tieErrorRows = records.filter(record => pnlTieErrors(record) > 0).length;
  state.records = records;
  state.periods = periods;
  if (!periods.some(period => period.key === state.currentPeriodKey)) state.currentPeriodKey = periods.at(-1).key;
  state.selectedStore = records.find(record => record.periodKey === state.currentPeriodKey)?.terminal || records[0].terminal;
  state.warnings = [];
  if (blankRows) state.warnings.push(`${blankRows} blank row(s) ignored`);
  if (totalRows) state.warnings.push(`${totalRows} total/subtotal row(s) excluded`);
  if (uncached) state.warnings.push(`${uncached} formula cell(s) lack cached values`);
  if (tieErrorRows) state.warnings.push(`${tieErrorRows} row(s) fail P&L tie-out`);
  const missingRecommended = Object.keys(FIELDS).filter(key => FIELDS[key].level === 'recommended' && !mapped(key));
  if (missingRecommended.length) state.warnings.push(`${missingRecommended.length} recommended field(s) unmapped`);
  state.dataStats = {records:records.length,stores:unique(records.map(r=>r.terminal)).length,periods:periods.length,tieErrorRows,duplicateKeys:duplicateKeys.length};
  populateGlobalFilters();
  enableDashboard(true);
  ensureSelectedStore();
  renderAll();
  const suffix = state.warnings.length ? ` · ${state.warnings.join(' · ')}` : '';
  setNotice(state.warnings.length ? 'warning' : 'success',t('mapping.loadedRecords', { count: records.length }),t('mapping.loadedRecordsDetail', { stores: state.dataStats.stores, periods: periods.length, sheet: state.sheetName, suffix }));
  $('mappingDialog').close();
}

function loadSource(fileName) {
  const best = bestSource();
  if (!best || best.score < 8) throw new Error(t('mapping.noSuitableHeader'));
  state.fileName = fileName; state.sheetName = best.name; state.matrix = best.matrix; state.headerRow = best.row;
  state.headers = headersAt(best.matrix,best.row); state.signature = schemaSignature(state.headers);
  const saved = readMappingStore()[state.signature];
  state.mapping = saved ? savedToIndexes(saved,state.headers) : autoMap(state.headers);
  renderSourceControls(); renderMapping();
  const missing = validateMapping();
  if (missing.length) {
    openSettings();
    const fields = missing.map(key => FIELDS[key].label).join(', ');
    showMappingAlert('error',t('mapping.missingRequiredSettings', { fields }));
    setNotice('error',t('mapping.workbookNeedsMapping'),t('mapping.missingFields', { fields }));
    return;
  }
  buildRecords();
}

function currentPeriod() { return state.periods.find(period => period.key === state.currentPeriodKey) || null; }
function comparisonPeriod() {
  const current = currentPeriod();
  if (!current) return null;
  if (state.comparisonMode === 'previous') {
    const index = state.periods.findIndex(period => period.key === current.key);
    return index > 0 ? state.periods[index - 1] : null;
  }
  const currentYear = Number(current.year);
  if (Number.isFinite(currentYear)) return state.periods.find(period => Number(period.year) === currentYear - 1 && norm(period.reviewPeriod) === norm(current.reviewPeriod)) || null;
  const candidates = state.periods.filter(period => norm(period.reviewPeriod) === norm(current.reviewPeriod) && periodSort(period,current) < 0);
  return candidates.at(-1) || null;
}
function activeFilters() {
  return {
    region: $('regionFilter').value,
    city: $('cityFilter').value,
    status: $('statusFilter').value,
    productivityTier: $('tierFilter').value
  };
}
function rowsForPeriod(periodKey) {
  if (!periodKey) return [];
  const filters = activeFilters();
  return state.records.filter(record => record.periodKey === periodKey &&
    (!filters.region || record.region === filters.region) && (!filters.city || record.city === filters.city) &&
    (!filters.channel || record.channel === filters.channel) && (!filters.storeType || record.storeType === filters.storeType) &&
    (!filters.status || record.status === filters.status));
}
function scope() {
  const current = currentPeriod(), comparison = comparisonPeriod();
  return {currentPeriod:current,comparisonPeriod:comparison,currentRows:rowsForPeriod(current?.key),comparisonRows:rowsForPeriod(comparison?.key)};
}

function setOptions(id, values, label) {
  const element = $(id), old = element.value;
  element.innerHTML = `<option value="">${esc(label)}</option>` + values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
  if (values.includes(old)) element.value = old;
}
function updatePeriodSummary() {
  if (state.model) {
    const md = state.model.metadata;
    $('reviewPeriodValue').textContent = md.reviewPeriod;
    $('periodSummary').innerHTML = `<span>${esc(t('common.current'))}</span><strong>${esc(md.currentPeriodKey)}</strong><i>${esc(t('common.vs'))}</i><span>${esc(t('common.comparison'))}</span><strong>${esc(md.comparisonPeriodKey)}</strong>`;
  } else {
    $('reviewPeriodValue').textContent = '—';
    $('periodSummary').innerHTML = `<span>${esc(t('common.current'))}</span><strong>—</strong><i>${esc(t('common.vs'))}</i><span>${esc(t('common.comparison'))}</span><strong>—</strong>`;
  }
  applyPeriodLabels();
}
function populateGlobalFilters() {
  if (!state.service) return;
  const options = state.service.getFilterOptions({});
  setOptions('regionFilter', options.region, t('filter.allRegions'));
  setOptions('cityFilter', options.city, t('filter.allCities'));
  setOptions('statusFilter', options.status, t('filter.allStatus'));
  setOptions('tierFilter', options.productivityTier, t('filter.allTiers'));
}
function refreshCityOptions() {
  if (!state.service) return;
  const options = state.service.getFilterOptions(activeFilters());
  setOptions('cityFilter', options.city, t('filter.allCities'));
}
function enableDashboard(on) {
  $('contextBar').classList.toggle('is-disabled',!on);
  ['regionFilter','cityFilter','statusFilter','tierFilter','resetFiltersBtn','storeSearch','rankingMetric','detailStoreSelect'].forEach(id => { if ($(id)) $(id).disabled = !on; });
  updateSourceUi();
}

function updateSourceUi() {
  const uploaded = state.sourceType === 'upload';
  $('clearBtn').disabled = !uploaded;
  $('clearBtn').textContent = t(IS_INTERNAL_EDGE ? 'action.clearData' : 'action.clearUpload');
  $('sourceLabel').textContent = uploaded ? t('source.uploaded') : (IS_INTERNAL_EDGE ? t('source.internal') : t('source.demo'));
  $('sourceDetail').textContent = uploaded ? state.fileName : (IS_INTERNAL_EDGE ? t('source.uploadWorkbook') : t('source.synthetic'));
}

const OVERVIEW_KPIS_PRIMARY = [
  { key: 'storeCount', label: 'Store Count', type: 'count', drill: null },
  { key: 'posNo', label: 'POS no.', type: 'count', drill: 'posNo' },
  { key: 'aup', label: 'AUP', type: 'money', drill: 'aup' },
  { key: 'grossSales', label: 'Gross Sales', type: 'money', drill: 'grossSales' }
];
const OVERVIEW_KPIS_SECONDARY = [
  { key: 'totalMinorationsPct', label: 'Total Minorations %', type: 'percent', drill: 'totalMinorations' },
  { key: 'netSales', label: 'CONSO Net Sales', type: 'money', drill: 'netSales' },
  { key: 'grossMargin', label: 'Gross Margin', type: 'money', ratioKey: 'grossMarginPct', drill: 'grossMargin' },
  { key: 'customerContribution', label: 'Customer Contribution', type: 'money', ratioKey: 'customerContributionPct', drill: 'customerContribution' }
];
function overviewMetricFormat(value, type) {
  if (type === 'percent') return formatPct(value);
  if (type === 'count') return formatInt(value);
  return formatMoney(value);
}
function overviewMetricDelta(current, comparison, type, coreVariance) {
  if (!Number.isFinite(current) || !Number.isFinite(comparison)) return null;
  const variance = current - comparison;
  if (type === 'percent') return Number.isFinite(coreVariance) ? formatRatioVariance(coreVariance) : null;
  if (type === 'count') return formatSignedNumber(variance);
  const rel = Math.abs(comparison) > 1e-9 ? variance / Math.abs(comparison) : null;
  return Number.isFinite(rel) ? `${rel >= 0 ? '+' : ''}${(rel * 100).toFixed(1)}%` : null;
}
function overviewKpiCard(def, metrics) {
  const current = metrics.current[def.key];
  const comparison = metrics.comparison[def.key];
  const ratioCurrent = def.ratioKey ? metrics.current[def.ratioKey] : null;
  const ratioComparison = def.ratioKey ? metrics.comparison[def.ratioKey] : null;
  const ratioVariance = metrics.variance?.[def.ratioKey || (def.type === 'percent' ? def.key : '')];
  const amountVariance = (Number.isFinite(current) && Number.isFinite(comparison)) ? current - comparison : null;
  const displayVariance = def.ratioKey || def.type === 'percent' ? ratioVariance : amountVariance;
  const deltaText = def.ratioKey
    ? formatRatioVariance(ratioVariance)
    : overviewMetricDelta(current, comparison, def.type, ratioVariance);
  const tone = (!Number.isFinite(displayVariance) || Math.abs(displayVariance) < 1e-9) ? 'neutral' : displayVariance > 0 ? 'favorable' : 'adverse';
  const tag = def.drill ? 'button' : 'article';
  const attrs = tag === 'button' ? ` type="button" data-pnl-line="${def.drill}"` : '';
  const comparisonText = Number.isFinite(comparison) ? overviewMetricFormat(comparison, def.type) : '—';
  const currentText = Number.isFinite(current) ? overviewMetricFormat(current, def.type) : '—';
  const comparisonValue = def.ratioKey
    ? `<span class="kpi-compare-inline">${inlineAmountRatioHtml(comparison, ratioComparison)}</span>`
    : comparisonText;
  const currentValue = def.ratioKey ? inlineAmountRatioHtml(current, ratioCurrent) : currentText;
  return `<${tag} class="kpi-card ${tone}${def.ratioKey ? ' kpi-card-combined' : ''}"${attrs}><div class="kpi-label-row"><span class="kpi-label">${esc(metricLabel(def.key, def.label))}</span>${tag === 'button' ? '<span class="kpi-arrow">›</span>' : ''}</div><div class="kpi-current${def.ratioKey ? ' kpi-current-inline' : ''}">${currentValue}</div><div class="kpi-compare"><span>${periodLabel('comparison')}</span><strong>${comparisonValue}</strong><span>${esc(t('common.variance'))}</span><strong class="${deltaText == null ? 'flat' : Number.isFinite(displayVariance) && displayVariance >= 0 ? 'good' : 'bad'}">${deltaText == null ? 'N/A' : deltaText}</strong></div></${tag}>`;
}
function updateScopeStatus(metrics) {
  const el = $('scopeStatus');
  if (!el) return;
  const filtered = metrics && metrics.mode === 'filtered';
  el.className = 'scope-status' + (filtered ? ' filtered' : '');
  const label = metrics && metrics.mode === 'filtered' ? t('common.filteredPortfolio') : t('common.totalPortfolio');
  el.innerHTML = `<span class="scope-dot"></span><span>${esc(label)}</span>`;
}
function renderOverviewEmpty() {
  updateScopeStatus({ mode: 'total', label: t('common.totalPortfolio') });
  $('primaryKpis').innerHTML = '';
  $('secondaryKpis').innerHTML = '';
  $('overviewInsights').innerHTML = `<div class="empty-state">${esc(t('overview.noAnalysis'))}</div>`;
}
function renderOverview() {
  if (!state.service) { renderOverviewEmpty(); return; }
  const filters = activeFilters();
  const metrics = state.service.getPortfolioMetrics(filters);
  const view = { ...metrics, current: { ...metrics.current }, comparison: { ...metrics.comparison } };
  view.current.storeCount = state.service.getStores('current', filters).length;
  view.comparison.storeCount = state.service.getStores('comparison', filters).length;
  updateScopeStatus(view);
  $('primaryKpis').innerHTML = OVERVIEW_KPIS_PRIMARY.map(def => overviewKpiCard(def, view)).join('');
  $('secondaryKpis').innerHTML = OVERVIEW_KPIS_SECONDARY.map(def => overviewKpiCard(def, view)).join('');
  renderOverviewInsights(view);
}

function chart(id) {
  if (!state.charts[id]) {
    $(id).innerHTML = '';
    state.charts[id] = echarts.init($(id),null,{renderer:'canvas'});
    const instance=state.charts[id], zr=instance.getZr();
    instance.__dashboardZoomReset=()=>{
      const zooms=instance.getOption().dataZoom||[];
      zooms.forEach((_,dataZoomIndex)=>instance.dispatchAction({type:'dataZoom',dataZoomIndex,start:0,end:100}));
    };
    zr.on('dblclick',instance.__dashboardZoomReset);
  }
  return state.charts[id];
}
function baseText() { return {fontFamily:'Segoe UI, PingFang SC, Microsoft YaHei, Arial, sans-serif'}; }
function tooltipStyle() { return {backgroundColor:'rgba(30,31,29,.96)',borderColor:'rgba(183,150,91,.45)',borderWidth:1,padding:[10,12],textStyle:{color:'#fff',fontSize:11,lineHeight:18}}; }
function chartNavigation({x=true,y=true,xAxisIndex=0,yAxisIndex=0}={}) {
  const inside={type:'inside',filterMode:'none',zoomOnMouseWheel:true,moveOnMouseMove:true,moveOnMouseWheel:false,preventDefaultMouseMove:true,throttle:40};
  const dataZoom=[];
  if(x)dataZoom.push({...inside,xAxisIndex});
  if(y)dataZoom.push({...inside,yAxisIndex});
  return {
    toolbox:{show:true,right:8,top:0,itemSize:14,itemGap:9,feature:{dataZoom:{title:{zoom:t('chart.zoom'),back:t('chart.undoZoom')},xAxisIndex:x?'all':false,yAxisIndex:y?'all':false},restore:{title:t('chart.resetView')}},iconStyle:{borderColor:THEME.muted},emphasis:{iconStyle:{borderColor:THEME.blue}}},
    dataZoom
  };
}
const SNAPSHOT_ROWS = [
  { key: 'posNo', label: 'POS no.', type: 'count', ratio: null, variance: 'amount-relative', major: false },
  { key: 'aup', label: 'AUP', type: 'money', ratio: null, variance: 'amount-relative', major: false },
  { key: 'grossSales', label: 'Gross Sales', type: 'money', ratio: null, major: true },
  { key: 'totalMinorations', label: 'Total Minorations', type: 'money', ratio: 'totalMinorationsPct', major: true },
  { key: 'netSales', label: 'CONSO Net Sales', type: 'money', ratio: null, major: true },
  { key: 'grossMargin', label: 'Gross Margin', type: 'money', ratio: 'grossMarginPct', major: true },
  { key: 'customerContribution', label: 'Customer Contribution', type: 'money', ratio: 'customerContributionPct', major: true }
];
const PNL_LINE_ALIASES = Object.freeze({
  minorations: 'totalMinorations',
  totalMinorations: 'totalMinorations',
  grossMargin: 'grossMargin',
  contribution: 'customerContribution',
  customerContribution: 'customerContribution',
  grossSales: 'grossSales',
  netSales: 'netSales',
  posNo: 'posNo',
  aup: 'aup'
});
function snapshotCell(value, type) {
  if (!Number.isFinite(value)) return '—';
  if (type === 'count') return formatInt(value);
  if (type === 'money') return formatKrmb(value);
  return formatPct(value);
}
function renderPnlSnapshot(metrics, { bodyId, subId, interactive = false } = {}) {
  const md = state.model.metadata;
  const scope = metrics.mode === 'filtered' ? t('variance.filteredSnapshot') : t('variance.summarySnapshot');
  $(subId).textContent = `${scope} · ${md.currentPeriodKey} ${t('common.vs')} ${md.comparisonPeriodKey}`;
  $(bodyId).innerHTML = SNAPSHOT_ROWS.map(row => {
    const current = metrics.current[row.key];
    const comparison = metrics.comparison[row.key];
    const currentRatio = row.ratio ? metrics.current[row.ratio] : null;
    const comparisonRatio = row.ratio ? metrics.comparison[row.ratio] : null;
    const variance = row.ratio
      ? metrics.variance?.[row.ratio]
      : row.variance === 'amount-relative'
        ? window.RetailDashboardData.amountRelativeVariance(current, comparison)
        : null;
    const varianceCls = !Number.isFinite(variance) || Math.abs(variance) < 1e-9 ? '' : variance > 0 ? 'cell-positive' : 'cell-negative';
    const selected = !interactive && state.selectedPnlLine === row.key;
    const classes = [row.major ? 'major' : '', interactive ? 'is-drillable' : '', selected ? 'is-selected' : ''].filter(Boolean).join(' ');
    const attrs = interactive
      ? ` data-pnl-line="${row.key}" tabindex="0" role="button" aria-label="${esc(metricLabel(row.key, row.label))}"`
      : ` data-snapshot-line="${row.key}"`;
    return `<tr class="${classes}"${attrs}><td>${esc(metricLabel(row.key, row.label))}</td><td>${snapshotCell(current, row.type)}</td><td>${snapshotCell(currentRatio, 'percent')}</td><td>${snapshotCell(comparison, row.type)}</td><td>${snapshotCell(comparisonRatio, 'percent')}</td><td class="${varianceCls}">${Number.isFinite(variance) ? formatRatioVariance(variance) : '—'}</td></tr>`;
  }).join('');
}

function insightHtml(items) {
  if (!items.length) return `<div class="empty-state">${esc(t('overview.noSignals'))}</div>`;
  return items.map(item => {
    const tag = item.action ? 'button' : 'div';
    const attrs = item.action ? ` type="button" data-action="${item.action}"${item.metric?` data-metric="${item.metric}"`:''}${item.driver?` data-driver="${item.driver}"`:''}` : '';
    return `<${tag} class="insight-item ${item.tone || ''}"${attrs}><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></${tag}>`;
  }).join('');
}
const SIGNAL_METRICS = [
  { key: 'grossSales', label: 'Gross Sales', kind: 'money', drill: null },
  { key: 'netSales', label: 'CONSO Net Sales', kind: 'money', drill: null },
  { key: 'grossMargin', label: 'Gross Margin', kind: 'money', drill: 'grossMargin' },
  { key: 'customerContribution', label: 'Customer Contribution', kind: 'money', drill: 'contribution' },
  { key: 'totalMinorationsPct', label: 'Total Minorations %', kind: 'pp', drill: 'minorations' },
  { key: 'grossMarginPct', label: 'Gross Margin %', kind: 'pp', drill: 'grossMargin' },
  { key: 'customerContributionPct', label: 'Customer Contribution %', kind: 'pp', drill: 'contribution' }
];
const MATERIAL_TITLES = {
  grossSales: 'Gross Sales declined significantly',
  totalMinorationsPct: 'Total Minorations deteriorated materially',
  customerContribution: 'Customer Contribution decreased significantly',
  customerContributionPct: 'Customer Contribution % decreased significantly',
  grossMarginPct: 'Gross Margin rate compressed'
};
function signalMovement(def, c, p, coreVariance) {
  const cur = c[def.key], cmp = p[def.key];
  if (!Number.isFinite(cur) || !Number.isFinite(cmp)) return null;
  const variance = def.kind === 'money' ? cur - cmp : coreVariance;
  const magnitude = def.kind === 'money'
    ? (Math.abs(cmp) > 1e-9 ? variance / Math.abs(cmp) : null)
    : variance;
  if (!Number.isFinite(magnitude)) return null;
  return { ...def, label: metricLabel(def.key, def.label), variance, magnitude, favorable: magnitude >= 0 };
}
function describeMovement(m) {
  if (m.kind === 'money') {
    const pct = `${m.magnitude >= 0 ? '+' : ''}${(m.magnitude * 100).toFixed(1)}%`;
    return m.favorable
      ? { title: t('signal.increased', { metric: m.label }), detail: t('signal.roseDetail', { metric: m.label, value: pct }) }
      : { title: t('signal.declined', { metric: m.label }), detail: t('signal.fellDetail', { metric: m.label, value: pct }) };
  }
  const ratioDelta = formatRatioVariance(m.magnitude);
  if (m.key === 'totalMinorationsPct') {
    return m.favorable
      ? { title: t('signal.minorationsNarrowed'), detail: t('signal.minorationsBetterDetail', { value: ratioDelta }) }
      : { title: t('signal.minorationsDeteriorated'), detail: t('signal.minorationsWorseDetail', { value: ratioDelta }) };
  }
  return m.favorable
    ? { title: t('signal.improved', { metric: m.label }), detail: t('signal.changedDetail', { metric: m.label, value: ratioDelta }) }
    : { title: t('signal.declined', { metric: m.label }), detail: t('signal.changedDetail', { metric: m.label, value: ratioDelta }) };
}
function materialSignals(movements) {
  const byKey = {};
  movements.forEach(m => { byKey[m.key] = m; });
  const out = [];
  const pushIf = (key, cond, tone) => {
    const m = byKey[key];
    if (m && cond(m)) out.push({ ...m, material: true, tone });
  };
  pushIf('grossSales', m => m.magnitude <= -0.05, 'critical');
  pushIf('totalMinorationsPct', m => m.magnitude <= -0.02, 'warning');
  pushIf('customerContribution', m => m.magnitude <= -0.05, 'critical');
  pushIf('customerContributionPct', m => m.magnitude <= -0.02, 'warning');
  pushIf('grossMarginPct', m => m.magnitude <= -0.02, 'warning');
  const ns = byKey.netSales, gm = byKey.grossMarginPct;
  if (ns && gm && ns.magnitude > 0 && gm.magnitude < 0) {
    out.push({ key: 'netSales', label: 'Net Sales', kind: 'money', material: true, tone: 'warning', composite: 'salesWithoutMargin', variance: ns.variance, magnitude: ns.magnitude, favorable: true, drill: 'grossMargin' });
  }
  return out;
}
function movementToSignal(m) {
  let title, detail;
  if (m.composite === 'salesWithoutMargin') {
    title = t('signal.salesWithoutMargin');
    detail = t('signal.salesWithoutMarginDetail', { value: `${(m.magnitude * 100).toFixed(1)}%` });
  } else if (m.material) {
    detail = describeMovement(m).detail;
    title = describeMovement(m).title;
  } else {
    const d = describeMovement(m);
    title = d.title; detail = d.detail;
  }
  const tone = m.tone || (m.favorable ? 'positive' : 'warning');
  const signal = { tone, title, detail };
  if (m.drill) { signal.action = 'variance'; signal.metric = m.drill; }
  return signal;
}
function selectKeyMovements(movements) {
  const positives = movements.filter(m => m.favorable).sort((a, b) => b.magnitude - a.magnitude);
  const negatives = movements.filter(m => !m.favorable).sort((a, b) => a.magnitude - b.magnitude);
  const picks = [];
  if (positives.length && negatives.length) {
    picks.push(positives[0]);
    picks.push(negatives[0]);
    if (positives.length > 1) picks.push(positives[1]);
    else if (negatives.length > 1) picks.push(negatives[1]);
  } else if (positives.length) {
    picks.push(...positives.slice(0, 3));
  } else if (negatives.length) {
    picks.push(...negatives.slice(0, 3));
  }
  return picks.slice(0, 3);
}
function stabilitySignals(movements) {
  const largest = movements.slice().sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude))[0];
  const items = [{ tone: 'positive', title: t('signal.stable'), detail: t('signal.stableDetail') }];
  if (largest) {
    const d = describeMovement(largest);
    const item = { tone: largest.favorable ? 'positive' : 'warning', title: t('signal.largestMovement', { metric: largest.label }), detail: d.detail };
    if (largest.drill) { item.action = 'variance'; item.metric = largest.drill; }
    items.push(item);
  }
  return items;
}
function renderOverviewInsights(metrics) {
  if (!metrics) return;
  const c = metrics.current, p = metrics.comparison;
  if (!Number.isFinite(p.netSales)) {
    $('overviewInsights').innerHTML = insightHtml([{ title: t('signal.comparisonUnavailable'), detail: t('signal.comparisonRequired') }]);
    return;
  }
  const movements = SIGNAL_METRICS.map(def => signalMovement(def, c, p, metrics.variance?.[def.key])).filter(Boolean);
  if (!movements.length) {
    $('overviewInsights').innerHTML = insightHtml([{ title: t('signal.noComparable'), detail: t('signal.noComparableDetail') }]);
    return;
  }
  const material = materialSignals(movements);
  let items;
  if (material.length) {
    items = material.map(movementToSignal);
  } else if (movements.some(m => Math.abs(m.magnitude) >= 0.005)) {
    items = selectKeyMovements(movements).map(movementToSignal);
  } else {
    items = stabilitySignals(movements);
  }
  $('overviewInsights').innerHTML = insightHtml(items.slice(0, 4));
}

function varianceScopeLabel(bridge) {
  return bridge.mode === 'filtered' ? t('common.filteredPortfolio') : t('common.totalPortfolio');
}

function formatBridgeMoney(value, signed = false) {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-9) return '—';
  const amount = Math.abs(value);
  const sign = value < 0 ? '-' : signed ? '+' : '';
  if (amount >= 1000) return `${sign}¥${trimZeros(amount / 1000, 2)}M`;
  return `${sign}¥${trimZeros(amount, amount < 10 && !Number.isInteger(amount) ? 1 : 0)}K`;
}

function formatBridgeAxis(value) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1e-9) return '¥0';
  const sign = value < 0 ? '-' : '';
  const amount = Math.abs(value);
  return amount >= 1000
    ? `${sign}¥${trimZeros(amount / 1000, 1)}M`
    : `${sign}¥${trimZeros(amount, 0)}K`;
}

function wrapBridgeLabel(value) {
  const words = String(value || '').split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > 16) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.join('\n');
}

function buildBridgeWaterfall(bridge) {
  const items = [{
    label: `${periodLabel('comparison')} ${metricLabel(bridge.metric, bridge.label)}`,
    start: 0,
    end: bridge.comparison,
    connector: null,
    type: 'anchor',
    raw: bridge.comparison
  }];
  const path = [bridge.comparison];
  let running = bridge.comparison;
  bridge.drivers.forEach(driver => {
    const next = running + driver.variance;
    items.push({
      label: pnlLabel(driver.field, driver.label),
      field: driver.field,
      start: running,
      end: next,
      connector: running,
      type: driver.variance > 0 ? 'positive' : driver.variance < 0 ? 'negative' : 'zero',
      raw: driver.variance
    });
    running = next;
    path.push(running);
  });
  items.push({
    label: `${periodLabel('current')} ${metricLabel(bridge.metric, bridge.label)}`,
    start: 0,
    end: bridge.current,
    connector: bridge.current,
    type: 'anchor',
    raw: bridge.current
  });
  path.push(bridge.current);
  return { items, path };
}

function disposeChart(id) {
  const instance = state.charts[id];
  if (!instance) return;
  instance.dispose();
  delete state.charts[id];
}

function renderVariance() {
  if (!state.service) {
    $('varianceSnapshotBody').innerHTML = `<tr><td colspan="6">${esc(t('error.uploadForPnlSnapshot'))}</td></tr>`;
    $('bridgeTitle').textContent = t('variance.bridge');
    $('bridgeSub').textContent = t('variance.bridgeSub');
    $('bridgeReconcile').textContent = '—';
    $('bridgeReconcile').className = 'reconcile';
    $('varianceScopeStatus').className = 'scope-status';
    $('varianceScopeStatus').innerHTML = `<span class="scope-dot"></span><span>${esc(t('common.totalPortfolio'))}</span>`;
    $('driverTableBody').innerHTML = '';
    $('positiveDrivers').innerHTML = '';
    $('negativeDrivers').innerHTML = '';
    $('varianceInsights').innerHTML = `<div class="empty-state">${esc(t('overview.noAnalysis'))}</div>`;
    return;
  }
  const filters = activeFilters();
  const metrics = state.service.getPortfolioMetrics(filters);
  renderPnlSnapshot(metrics, { bodyId: 'varianceSnapshotBody', subId: 'varianceSnapshotSub' });
  const filtered = Object.values(filters).some(value => value !== null && value !== undefined && value !== '');
  if (filtered && capabilityStatus('filteredCustomerContributionBridge') !== 'available') {
    const warning = capabilityWarning('filteredCustomerContributionBridge');
    $('bridgeTitle').textContent = t('variance.bridge');
    $('bridgeSub').textContent = t('error.filteredUnavailable');
    $('varianceScopeStatus').className = 'scope-status filtered';
    $('varianceScopeStatus').innerHTML = `<span class="scope-dot"></span><span>${esc(t('common.filteredPortfolio'))}</span>`;
    $('bridgeReconcile').textContent = t('common.unavailable');
    $('bridgeReconcile').className = 'reconcile neutral';
    featureUnavailable('bridgeChart', warning ? warning.title : `${t('variance.bridge')} ${t('common.unavailable')}`, warning ? warning.detail : t('error.requiredFieldsMissing'));
    $('driverTableBody').innerHTML = `<tr><td colspan="6">${esc(t('error.driverUnavailable'))}</td></tr>`;
    $('positiveDrivers').innerHTML = '';
    $('negativeDrivers').innerHTML = '';
    $('positiveStores').innerHTML = '';
    $('negativeStores').innerHTML = '';
    $('varianceInsights').innerHTML = `<div class="empty-state">${esc(warning ? warning.title : t('error.filteredBridgeUnavailable'))}</div>`;
    return;
  }
  const bridge = state.service.getBridgeData('customerContribution', filters);
  renderBridge(bridge);
  renderDriverAnalysis(bridge);
  renderVarianceInsights(bridge);
}

function renderBridge(bridge) {
  const md = state.service.getMetadata();
  const scopeLabel = varianceScopeLabel(bridge);
  $('bridgeTitle').textContent = t('variance.bridge');
  $('bridgeSub').textContent = `${md.comparisonPeriodKey} ${t('common.vs')} ${md.currentPeriodKey}`;
  $('varianceScopeStatus').className = `scope-status${bridge.mode === 'filtered' ? ' filtered' : ''}`;
  $('varianceScopeStatus').innerHTML = `<span class="scope-dot"></span><span>${scopeLabel}</span>`;

  if (bridge.error && bridge.error.code === 'BRIDGE_RECONCILIATION_ERROR') {
    $('bridgeReconcile').textContent = t('variance.reconciliationError');
    $('bridgeReconcile').className = 'reconcile bad';
    disposeChart('bridgeChart');
    $('bridgeChart').innerHTML = `<div class="bridge-error"><strong>${esc(t('error.bridgeUnsafe'))}</strong><span>${esc(t('error.bridgeUnsafeDetail'))}</span></div>`;
    return;
  }

  $('bridgeReconcile').textContent = t('variance.reconciled');
  $('bridgeReconcile').className = 'reconcile';
  const { items, path } = buildBridgeWaterfall(bridge);
  const low = Math.min(...path), high = Math.max(...path);
  const pathSpan = high - low;
  const pad = pathSpan > 1e-9 ? Math.max(pathSpan * .16, 20) : Math.max(Math.abs(high) * .01, 1);
  const yMin = low - pad, yMax = high + pad;
  const typeCode = { anchor: 0, positive: 1, negative: -1, zero: 2 };
  const c = chart('bridgeChart');
  c.setOption({
    textStyle: baseText(),
    grid: { left: 72, right: 22, top: 38, bottom: 112 },
    tooltip: { ...tooltipStyle(), trigger: 'item', formatter: params => { const item = items[params.dataIndex]; const base = `<b>${esc(item.label)}</b><br>${item.type === 'anchor' ? t('variance.balance') : t('variance.pnlImpact')}: ${formatBridgeMoney(item.raw, item.type !== 'anchor')}`; return item.type !== 'anchor' && item.field ? `${base}<br>${t('variance.clickStoreImpact')}` : base; } },
    xAxis: { type: 'category', data: items.map(item => item.label), axisTick: { show: false }, axisLine: { lineStyle: { color: THEME.axis } }, axisLabel: { interval: 0, rotate: 24, margin: 15, color: THEME.muted, fontSize: 8, lineHeight: 11, formatter: wrapBridgeLabel } },
    yAxis: { type: 'value', min: yMin, max: yMax, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: THEME.muted, fontSize: 9, formatter: formatBridgeAxis }, splitLine: { lineStyle: { color: THEME.grid } } },
    series: [{
      name: t('chart.varianceBridge'),
      type: 'custom',
      encode: { x: 0, y: [1, 2] },
      data: items.map((item, index) => [index, item.start, item.end, item.raw, typeCode[item.type], item.connector]),
      renderItem: (params, api) => {
        const item = items[params.dataIndex];
        const categoryIndex = api.value(0);
        const startPoint = api.coord([categoryIndex, api.value(1)]);
        const endPoint = api.coord([categoryIndex, api.value(2)]);
        const categoryWidth = api.size([1, 0])[0];
        const barWidth = Math.max(14, Math.min(42, categoryWidth * .52));
        const rawHeight = Math.abs(endPoint[1] - startPoint[1]);
        const minHeight = item.type === 'zero' ? 2 : item.type === 'anchor' ? 0 : 3;
        const height = Math.max(rawHeight, minHeight);
        let y = Math.min(startPoint[1], endPoint[1]);
        if (rawHeight < minHeight) y = (startPoint[1] + endPoint[1] - height) / 2;
        const rawRect = { x: endPoint[0] - barWidth / 2, y, width: barWidth, height };
        const clippedRect = echarts.graphic.clipRectByRect(rawRect, params.coordSys);
        const children = [];
        if (item.connector != null) {
          const connectorY = api.coord([categoryIndex, item.connector])[1];
          children.push({
            type: 'line',
            silent: true,
            shape: { x1: endPoint[0] - categoryWidth + barWidth / 2, y1: connectorY, x2: endPoint[0] - barWidth / 2, y2: connectorY },
            style: { stroke: THEME.axis, lineWidth: 1, lineDash: [3, 3] }
          });
        }
        if (clippedRect) {
          children.push({
            type: 'rect',
            shape: clippedRect,
            style: {
              fill: item.type === 'anchor' ? THEME.navy : item.type === 'positive' ? THEME.green : item.type === 'negative' ? THEME.orange : THEME.neutral,
              cursor: item.type === 'anchor' ? 'default' : 'pointer'
            }
          });
        }
        const valuePoint = api.coord([categoryIndex, item.type === 'anchor' ? item.end : item.raw >= 0 ? Math.max(item.start, item.end) : Math.min(item.start, item.end)]);
        const labelAbove = item.type === 'anchor' ? item.raw >= 0 : item.raw >= 0;
        children.push({
          type: 'text',
          silent: true,
          style: {
            text: formatBridgeMoney(item.raw, item.type !== 'anchor'),
            x: valuePoint[0],
            y: valuePoint[1] + (labelAbove ? -7 : 7),
            fill: THEME.ink,
            font: '600 9px Segoe UI, PingFang SC, Microsoft YaHei, Arial, sans-serif',
            textAlign: 'center',
            textVerticalAlign: labelAbove ? 'bottom' : 'top'
          }
        });
        return { type: 'group', children };
      }
    }]
  }, { notMerge: true });
  c.off('click');
  c.on('click', params => {
    const item = items[params.dataIndex];
    if (!item || item.type === 'anchor' || !item.field) return;
    openDriverPortfolio(item.field);
  });
}

function renderDriverAnalysis(bridge) {
  $('driverTitle').textContent = t('variance.driverAnalysis');
  $('driverTableBody').innerHTML = bridge.drivers.map(driver => {
    const tone = driver.ratioVariance > 0 ? 'cell-positive' : driver.ratioVariance < 0 ? 'cell-negative' : '';
    return `<tr data-driver="${esc(driver.field)}"><td><span class="driver-name"><i></i>${esc(pnlLabel(driver.field, driver.label))}</span></td><td>${formatKrmb(driver.current)}</td><td>${formatPct(driver.currentRatio)}</td><td>${formatKrmb(driver.comparison)}</td><td>${formatPct(driver.comparisonRatio)}</td><td class="${tone}">${formatRatioVariance(driver.ratioVariance)}</td><td class="row-action">›</td></tr>`;
  }).join('') || `<tr><td colspan="7">${esc(t('error.noMappedDrivers'))}</td></tr>`;
  const positive = bridge.drivers.filter(driver => driver.variance > 0).sort((a,b)=>b.variance-a.variance).slice(0,4);
  const negative = bridge.drivers.filter(driver => driver.variance < 0).sort((a,b)=>a.variance-b.variance).slice(0,4);
  $('positiveDrivers').innerHTML = rankDriverHtml(positive, 'positive');
  $('negativeDrivers').innerHTML = rankDriverHtml(negative, 'negative');
}

function rankDriverHtml(rows,tone) {
  if (!rows.length) return `<div class="empty-state">${esc(t('error.noMaterialDrivers'))}</div>`;
  return rows.map((row,index)=>`<button class="rank-row" type="button" data-driver="${esc(row.field)}"><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(pnlLabel(row.field, row.label))}</strong><em class="${tone==='positive'?'cell-positive':'cell-negative'}">${formatSignedMoney(row.variance)}</em></button>`).join('');
}

function renderVarianceInsights(bridge) {
  const md = state.service.getMetadata();
  const amountVariance = bridge.current - bridge.comparison;
  const positive = bridge.drivers.filter(driver => driver.variance > 0).sort((a,b)=>b.variance-a.variance)[0];
  const negative = bridge.drivers.filter(driver => driver.variance < 0).sort((a,b)=>a.variance-b.variance)[0];
  $('varianceInsightSub').textContent = `${metricLabel(bridge.metric, bridge.label)} · ${md.currentPeriodKey} ${t('common.vs')} ${md.comparisonPeriodKey}`;
  const ratioTone = bridge.ratioVariance > 0 ? 'cell-positive' : bridge.ratioVariance < 0 ? 'cell-negative' : '';
  const amountTone = amountVariance > 0 ? 'cell-positive' : amountVariance < 0 ? 'cell-negative' : '';
  const summary = `<div class="variance-summary"><div class="summary-kpi"><span>${esc(t('variance.selectedKpi'))}</span><strong>${esc(metricLabel(bridge.metric, bridge.label))}</strong></div><div><span>${periodLabel('current')}</span><strong class="kpi-compare-inline">${inlineAmountRatioHtml(bridge.current, bridge.currentRatio)}</strong></div><div><span>${periodLabel('comparison')}</span><strong class="kpi-compare-inline">${inlineAmountRatioHtml(bridge.comparison, bridge.comparisonRatio)}</strong></div><div class="summary-variance"><span>${esc(t('common.variance'))}</span><strong class="${ratioTone}">${formatRatioVariance(bridge.ratioVariance)}</strong></div><div><span>${esc(t('variance.amountMovement'))}</span><strong class="${amountTone}">${formatSignedMoney(amountVariance)}</strong></div></div>`;
  const items = [];
  if (bridge.error) items.push({tone:'warning',title:t('variance.detailAttention'),detail:t('variance.detailAttentionDetail')});
  if (positive) items.push({tone:'positive',title:t('variance.largestPositive',{driver:pnlLabel(positive.field,positive.label)}),detail:t('variance.lineContribution',{value:formatSignedMoney(positive.variance)}),action:'portfolio',driver:positive.field});
  if (negative) items.push({tone:'warning',title:t('variance.largestNegative',{driver:pnlLabel(negative.field,negative.label)}),detail:t('variance.lineContribution',{value:formatSignedMoney(negative.variance)}),action:'portfolio',driver:negative.field});
  $('varianceInsights').innerHTML = summary + insightHtml(items);
}

const RANKING_METRICS = Object.freeze({
  grossSales: { label: 'Gross Sales', key: 'grossSales' },
  netSales: { label: 'CONSO Net Sales', key: 'netSales' },
  grossMargin: { label: 'Gross Margin', key: 'grossMargin' },
  customerContribution: { label: 'Customer Contribution', key: 'customerContribution' }
});

function portfolioStores(role) {
  if (!state.service) return [];
  return state.service.getStores(role === 'comparison' ? 'comparison' : 'current', activeFilters());
}
function storeVariancePairs() {
  const currentStores = portfolioStores('current');
  const comparisonStores = portfolioStores('comparison');
  const comparisonMap = new Map(comparisonStores.map(store => [store.terminal, store]));
  return currentStores.map(current => ({ terminal: current.terminal, store: current.store, current, comparison: comparisonMap.get(current.terminal) || null }));
}
function rankingMetricKey() {
  return RANKING_METRICS[state.portfolioMetric] ? state.portfolioMetric : 'customerContribution';
}
function setPortfolioMetric(reference) {
  state.portfolioMetric = RANKING_METRICS[reference] ? reference : 'customerContribution';
  const select = $('rankingMetric');
  if (select) select.value = state.portfolioMetric;
  $('rankingNote').textContent = `${t('portfolio.ranking')} · ${metricLabel(state.portfolioMetric, RANKING_METRICS[state.portfolioMetric].label)} · ${t('common.current')} ${t('common.vs')} ${t('common.comparison')}`;
}
function openDriverPortfolio(driverKey) {
  state.selectedDriver = driverKey || '';
  state.portfolioMetric = state.selectedDriver && RANKING_METRICS[state.selectedDriver] ? state.selectedDriver : 'customerContribution';
  state.portfolioView = 'ranking';
  setSegment('portfolioView', 'ranking');
  switchTab('portfolio');
}
function renderPortfolio() {
  if (!state.service) { renderPortfolioEmpty(); return; }
  setPortfolioMetric(state.portfolioMetric);
  setSegment('portfolioView', state.portfolioView);
  document.querySelectorAll('.portfolio-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.portfolioPanel === state.portfolioView));
  const inRanking = state.portfolioView === 'ranking';
  const toggle = $('snapshotToggle');
  if (toggle) toggle.style.display = inRanking ? 'none' : '';
  $('portfolioContext').textContent = inRanking
    ? `${t('portfolio.ranking')} · ${t('common.current')} ${t('common.vs')} ${t('common.comparison')}`
    : state.snapshot === 'movement'
      ? `${t('portfolio.quadrantTitle')} · ${t('common.comparison')} → ${t('common.current')}`
      : `${t('portfolio.quadrantTitle')} · ${state.snapshot === 'comparison' ? t('common.comparison') : t('common.current')}`;
  if (inRanking) renderStoreRanking();
  else renderProductivityQuadrant();
}
function renderPortfolioEmpty() {
  $('tierSummary').innerHTML = '';
  $('quadrantSummary').innerHTML = '';
  $('riskStoreBody').innerHTML = '';
  $('positiveStores').innerHTML = '';
  $('negativeStores').innerHTML = '';
  $('portfolioContext').textContent = t('portfolio.currentView');
  const c = chart('productivityChart');
  c.clear();
}
function searchHit(store) { const text = state.search.trim().toLowerCase(); return text && (store.store.toLowerCase().includes(text) || store.terminal.toLowerCase().includes(text)); }
const QUADRANT_ORDER = ProductivityQuadrant.QUADRANT_ORDER;
const QUADRANT_COLORS = Object.freeze({
  [ProductivityQuadrant.QUADRANTS.STAR]: '#347c68',
  [ProductivityQuadrant.QUADRANTS.RISK]: '#b64f4f',
  [ProductivityQuadrant.QUADRANTS.BALANCED_HIGH]: '#526d8c',
  [ProductivityQuadrant.QUADRANTS.BALANCED_LOW]: '#92958f'
});
const MOVEMENT_COLORS = Object.freeze({
  comparison: THEME.gold,
  current: THEME.blue,
  changed: THEME.orange,
  same: THEME.neutral
});
function quadrantPointStyle(point) {
  const store = point.store;
  const highlighted = store.terminal === state.selectedStore || searchHit(store);
  const isPriority = point.quadrant === ProductivityQuadrant.QUADRANTS.STAR || point.quadrant === ProductivityQuadrant.QUADRANTS.RISK;
  return {
    color: QUADRANT_COLORS[point.quadrant],
    opacity: state.search ? (searchHit(store) ? 1 : .07) : isPriority ? .84 : .62,
    borderColor: highlighted ? THEME.goldDark : '#fff',
    borderWidth: highlighted ? 2 : 1
  };
}
function quadrantTooltip(data) {
  const store = data.store;
  return `<b>${esc(store.store)}</b><br>${esc(store.city)} · ${esc(store.region)}<br>${t('common.status')}: ${esc(store.status)}<br>${t('common.tier')}: ${esc(store.productivityTier)}<br>${t('metric.customerContribution')}: ${formatMoney(data.value[0])}<br>${t('metric.customerContributionPct')}: ${formatPct(store.metrics.customerContributionPct)}<br>${t('metric.apExpense')}: ${formatMoney(data.value[1])}<br>${t('metric.storeProductivity')}: ${formatMoney(store.storeProductivity)}<br>${t('portfolio.quadrantSummary')}: ${esc(quadrantLabel(data.quadrant))}<br>${t('metric.posNo')}: ${formatInt(store.cityPosNo)}`;
}
function renderQuadrantSummary(model) {
  $('quadrantSummaryLabel').textContent = t('portfolio.quadrantSummary');
  const allActive = state.selectedQuadrant === 'all' || !QUADRANT_ORDER.includes(state.selectedQuadrant);
  const buttons = [
    `<button class="quadrant-chip${allActive ? ' active' : ''}" type="button" data-quadrant="all">${esc(t('common.all'))} <b>${model.points.length}</b></button>`,
    ...QUADRANT_ORDER.map(quadrant => `<button class="quadrant-chip${state.selectedQuadrant === quadrant ? ' active' : ''}" type="button" data-quadrant="${esc(quadrant)}">${esc(quadrantLabel(quadrant))} <b>${model.counts[quadrant]}</b></button>`)
  ];
  $('quadrantSummary').innerHTML = buttons.join('');
}
function renderMovementSummary(summary) {
  $('quadrantSummaryLabel').textContent = t('portfolio.movementSummary');
  const items = [
    [t('portfolio.matchedStores'), summary.matched],
    [t('portfolio.changedQuadrant'), summary.changed],
    [t('portfolio.stayedSame'), summary.stayed],
    [`${quadrantLabel('Risk')} → ${quadrantLabel('Star')}`, summary.riskToStar],
    [`${quadrantLabel('Risk')} → ${t('portfolio.nonRisk')}`, summary.riskToNonRisk],
    [`${t('portfolio.nonRisk')} → ${quadrantLabel('Risk')}`, summary.nonRiskToRisk],
    [`${quadrantLabel('Star')} → ${t('portfolio.nonStar')}`, summary.starToNonStar]
  ];
  $('quadrantSummary').innerHTML = items.map(([label, count]) => `<span class="quadrant-chip">${esc(label)} <b>${count}</b></span>`).join('');
}
function renderTierSummary(stores, role) {
  const el = $('tierSummary');
  if (!el) return;
  const n = stores.length;
  if (!n) { el.innerHTML = `<span class="tier-summary-label">${periodLabel(role)}</span><span>${esc(t('portfolio.noStoresScope'))}</span>`; return; }
  const netSales = stores.reduce((a, s) => a + s.metrics.netSales, 0);
  const grossMargin = stores.reduce((a, s) => a + s.metrics.grossMargin, 0);
  const contribution = stores.reduce((a, s) => a + s.metrics.customerContribution, 0);
  const productivityValues = stores.map(store => store.storeProductivity).filter(Number.isFinite);
  const avgProd = productivityValues.length ? productivityValues.reduce((a, value) => a + value, 0) / productivityValues.length : null;
  const posValues = stores.map(store => store.cityPosNo).filter(Number.isFinite);
  const posCount = posValues.length ? posValues.reduce((a, value) => a + value, 0) : null;
  const gmPct = netSales ? grossMargin / netSales : null;
  const ccPct = netSales ? contribution / netSales : null;
  el.innerHTML = `<span class="tier-summary-label">${periodLabel(role)}</span><span><b>${n}</b> ${esc(t('common.stores'))}</span><span><b>${formatInt(posCount)}</b> POS</span><span>${esc(t('portfolio.avgGrossMargin'))} <b>${gmPct != null ? formatPct(gmPct) : '—'}</b></span><span>${esc(t('portfolio.avgCustomerContribution'))} <b>${ccPct != null ? formatPct(ccPct) : '—'}</b></span><span>${esc(t('portfolio.avgProductivity'))} <b>${formatMoney(avgProd)}</b></span>`;
}
function renderMovementTierSummary(model) {
  const el = $('tierSummary');
  const stores = model.pairs.map(pair => pair.current);
  if (!stores.length) { el.innerHTML = `<span class="tier-summary-label">${esc(t('portfolio.movement'))}</span><span>${esc(t('portfolio.noMatchedScope'))}</span>`; return; }
  const netSales = stores.reduce((sum, store) => sum + store.metrics.netSales, 0);
  const grossMargin = stores.reduce((sum, store) => sum + store.metrics.grossMargin, 0);
  const contribution = stores.reduce((sum, store) => sum + store.metrics.customerContribution, 0);
  const productivityValues = stores.map(store => store.storeProductivity).filter(Number.isFinite);
  const avgProd = productivityValues.length ? productivityValues.reduce((sum, value) => sum + value, 0) / productivityValues.length : null;
  const posValues = stores.map(store => store.cityPosNo).filter(Number.isFinite);
  const posCount = posValues.length ? posValues.reduce((sum, value) => sum + value, 0) : null;
  el.innerHTML = `<span class="tier-summary-label">${esc(t('portfolio.movement'))}</span><span><b>${model.summary.matched}</b> ${esc(t('portfolio.matchedStores'))}</span><span><b>${formatInt(posCount)}</b> POS</span><span>${esc(t('portfolio.avgGrossMargin'))} <b>${netSales ? formatPct(grossMargin / netSales) : '—'}</b></span><span>${esc(t('portfolio.avgCustomerContribution'))} <b>${netSales ? formatPct(contribution / netSales) : '—'}</b></span><span>${esc(t('portfolio.avgProductivity'))} <b>${formatMoney(avgProd)}</b></span>`;
}
function renderRiskStores(stores, role) {
  const capabilityRole = state.snapshot === 'movement' ? 'resolved' : role;
  if (capabilityStatus('fullProductivityRisk', capabilityRole) !== 'available') {
    const warning = capabilityWarning('fullProductivityRisk');
    $('riskStoreSub').textContent = t('error.productivityFieldsIncomplete');
    $('riskStoreBody').innerHTML = `<tr><td colspan="9">${esc(warning ? warning.title : t('error.productivityRiskUnavailable'))}</td></tr>`;
    return;
  }
  const ranked = ProductivityQuadrant.buildRiskRanking(stores).slice(0, 8);
  $('riskStoreSub').textContent = `${periodLabel(role)} · ${t('portfolio.priorityRiskSub')}`;
  $('riskStoreBody').innerHTML = ranked.map((point, index) => {
    const store = point.store;
    return `<tr data-store="${esc(store.terminal)}"><td>${String(index + 1).padStart(2, '0')}</td><td title="${esc(store.store)}">${esc(store.store)}</td><td>${esc(store.region)} / ${esc(store.city)}</td><td>${formatKrmb(point.customerContribution)}</td><td>${formatPct(store.metrics.customerContributionPct)}</td><td>${formatKrmb(point.expenseMagnitude)}</td><td>${formatKrmb(store.storeProductivity)}</td><td><span class="risk-score">${Math.round(point.riskScore * 100)}</span></td><td class="row-action">›</td></tr>`;
  }).join('') || `<tr><td colspan="9">${esc(t('portfolio.noRiskStores'))}</td></tr>`;
}
function bindStoreClick(c) { c.off('click'); c.on('click', params => { if (params.data?.store) openStoreDetail(params.data.store.terminal); }); }
function renderProductivityQuadrant() {
  // Productivity Quadrant 使用独立的 store dataset（Current/Comparison role + 正常页面 filters），
  // 不消费 selectedDriver / portfolioMetric —— 02 带来的 Driver context 只属于 Store Variance Ranking。
  if (state.snapshot === 'movement') {
    renderProductivityMovement();
    return;
  }
  const role = state.snapshot === 'comparison' ? 'comparison' : 'current';
  if (snapshotCapabilityStatus('investmentQuadrant') !== 'available') {
    const warning = capabilityWarning('investmentQuadrant');
    featureUnavailable('productivityChart', warning ? warning.title : t('error.investmentQuadrantUnavailable'), warning ? warning.detail : t('error.investmentQuadrantMissing'));
    $('tierSummary').innerHTML = '';
    $('quadrantSummary').innerHTML = '';
    $('riskStoreBody').innerHTML = `<tr><td colspan="9">${esc(t('error.investmentQuadrantUnavailable'))}</td></tr>`;
    return;
  }
  const stores = portfolioStores(role);
  const c = chart('productivityChart');
  const chartElement = $('productivityChart');
  renderTierSummary(stores, role);
  const model = ProductivityQuadrant.buildQuadrantModel(stores);
  const visiblePoints = ProductivityQuadrant.filterQuadrantPoints(model.points, state.selectedQuadrant);
  renderQuadrantSummary(model);
  renderRiskStores(stores, role);
  chartElement.dataset.pointCount = String(visiblePoints.length);
  chartElement.dataset.scopePointCount = String(model.points.length);
  chartElement.dataset.medianCc = Number.isFinite(model.medianCC) ? String(model.medianCC) : '';
  chartElement.dataset.medianExpense = Number.isFinite(model.medianExpense) ? String(model.medianExpense) : '';
  chartElement.dataset.quadrantCounts = JSON.stringify(model.counts);
  chartElement.dataset.snapshotRole = role;
  chartElement.dataset.searchMatchCount = String(model.points.filter(point => searchHit(point.store)).length);
  if (!model.points.length) { c.clear(); return; }
  const medianLines = {
    silent: true,
    symbol: 'none',
    lineStyle: { color: THEME.goldDark, width: 1, type: 'dashed', opacity: .78 },
    label: { show: true, color: THEME.goldDark, fontSize: 8, backgroundColor: 'rgba(255,255,255,.88)', padding: [3,5], borderRadius: 3 },
    data: [
      { xAxis: model.medianCC, label: { formatter: `${t('portfolio.medianCC')}  ${formatMoney(model.medianCC)}`, position: 'insideEndTop' } },
      { yAxis: model.medianExpense, label: { formatter: `${t('portfolio.medianAP')}  ${formatMoney(model.medianExpense)}`, position: 'insideEndTop' } }
    ]
  };
  const series = QUADRANT_ORDER.map((quadrant, index) => ({
    name: quadrantLabel(quadrant),
    type: 'scatter',
    symbolSize: 9,
    itemStyle: { color: QUADRANT_COLORS[quadrant] },
    data: visiblePoints.filter(point => point.quadrant === quadrant).map(point => ({
      value: [point.customerContribution, point.expenseMagnitude],
      store: point.store,
      quadrant: point.quadrant,
      itemStyle: quadrantPointStyle(point)
    })),
    emphasis: { scale: 1, itemStyle: { opacity: 1, borderWidth: 2 } },
    ...(index === 0 ? { markLine: medianLines } : {})
  }));
  c.clear();
  c.setOption({
    textStyle: baseText(),
    ...chartNavigation(),
    legend: { top: 8, left: 78, itemWidth: 8, itemHeight: 8, itemGap: 18, textStyle: { color: THEME.muted, fontSize: 8 }, data: QUADRANT_ORDER.map(quadrantLabel) },
    grid: { left: 88, right: 42, top: 64, bottom: 66 },
    tooltip: { ...tooltipStyle(), trigger: 'item', formatter: params => quadrantTooltip(params.data) },
    xAxis: { type:'value', scale:true, name:t('metric.customerContribution'), nameLocation:'middle', nameGap:42, nameTextStyle:{color:THEME.muted,fontSize:9}, axisLine:{lineStyle:{color:THEME.axis}}, axisTick:{show:false}, axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney}, splitLine:{lineStyle:{color:THEME.grid}} },
    yAxis: { type:'value', min:0, name:t('metric.apExpenseSpend'), nameLocation:'middle', nameGap:62, nameTextStyle:{color:THEME.muted,fontSize:9}, axisLine:{show:false}, axisTick:{show:false}, axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney}, splitLine:{lineStyle:{color:THEME.grid}} },
    graphic: [
      { type:'text', silent:true, left:94, top:72, style:{text:quadrantLabel('Risk'),fill:QUADRANT_COLORS.Risk,font:'600 9px Segoe UI, sans-serif',backgroundColor:'rgba(255,255,255,.76)',padding:[3,5]} },
      { type:'text', silent:true, right:48, top:72, style:{text:quadrantLabel('Balanced High'),fill:QUADRANT_COLORS['Balanced High'],font:'600 9px Segoe UI, sans-serif',backgroundColor:'rgba(255,255,255,.76)',padding:[3,5]} },
      { type:'text', silent:true, left:94, bottom:72, style:{text:quadrantLabel('Balanced Low'),fill:QUADRANT_COLORS['Balanced Low'],font:'600 9px Segoe UI, sans-serif',backgroundColor:'rgba(255,255,255,.76)',padding:[3,5]} },
      { type:'text', silent:true, right:48, bottom:72, style:{text:quadrantLabel('Star'),fill:QUADRANT_COLORS.Star,font:'600 9px Segoe UI, sans-serif',backgroundColor:'rgba(255,255,255,.76)',padding:[3,5]} }
    ],
    series
  }, { notMerge: true });
  bindStoreClick(c);
  requestAnimationFrame(() => c.resize());
}
function movementTooltip(data) {
  const pair = data.movement;
  if (!pair) return '';
  return `<b>${esc(pair.current.store)}</b><br>${periodLabel('comparison')}: ${formatMoney(pair.comparisonCC)} CC · ${formatMoney(pair.comparisonExpense)} ${esc(t('metric.apExpense'))}<br>${t('portfolio.quadrantSummary')}: ${esc(quadrantLabel(pair.comparisonQuadrant))}<br>${periodLabel('current')}: ${formatMoney(pair.currentCC)} CC · ${formatMoney(pair.currentExpense)} ${esc(t('metric.apExpense'))}<br>${t('portfolio.quadrantSummary')}: ${esc(quadrantLabel(pair.currentQuadrant))}<br>${t('portfolio.movement')}: <b>${esc(quadrantLabel(pair.comparisonQuadrant))} → ${esc(quadrantLabel(pair.currentQuadrant))}</b>`;
}
function movementLineData(pairs, changed) {
  return pairs.filter(pair => pair.changed === changed).map(pair => ({
    coords: [[pair.comparisonCC, pair.comparisonExpense], [pair.currentCC, pair.currentExpense]],
    movement: pair
  }));
}
function renderProductivityMovement() {
  // Movement filters are evaluated on Current store attributes, including Current Tier,
  // then matched to Comparison strictly by terminal so both observations share one scope.
  if (snapshotCapabilityStatus('investmentQuadrant') !== 'available') {
    const warning = capabilityWarning('investmentQuadrant');
    featureUnavailable('productivityChart', warning ? warning.title : t('error.investmentQuadrantUnavailable'), warning ? warning.detail : t('error.investmentQuadrantBothPeriods'));
    $('tierSummary').innerHTML = '';
    $('quadrantSummary').innerHTML = '';
    $('riskStoreBody').innerHTML = `<tr><td colspan="9">${esc(t('error.movementUnavailable'))}</td></tr>`;
    return;
  }
  const currentAll = state.service.getStores('current', {});
  const comparisonAll = state.service.getStores('comparison', {});
  const model = ProductivityQuadrant.buildMovementModel(currentAll, comparisonAll, activeFilters());
  const c = chart('productivityChart');
  const chartElement = $('productivityChart');
  renderMovementTierSummary(model);
  renderMovementSummary(model.summary);
  const currentRiskScope = ProductivityQuadrant.currentScopeStores(currentAll, activeFilters());
  renderRiskStores(currentRiskScope, 'current');
  chartElement.dataset.snapshotRole = 'movement';
  chartElement.dataset.matchedCount = String(model.summary.matched);
  chartElement.dataset.changedCount = String(model.summary.changed);
  chartElement.dataset.pooledMedianCc = Number.isFinite(model.pooledMedianCC) ? String(model.pooledMedianCC) : '';
  chartElement.dataset.pooledMedianExpense = Number.isFinite(model.pooledMedianExpense) ? String(model.pooledMedianExpense) : '';
  chartElement.dataset.pointCount = String(model.pairs.length * 2);
  chartElement.dataset.scopePointCount = String(model.pairs.length);
  if (!model.pairs.length) { c.clear(); return; }
  const pooledLines = {
    silent: true,
    symbol: 'none',
    lineStyle: { color: THEME.goldDark, width: 1, type: 'dashed', opacity: .78 },
    label: { show: true, color: THEME.goldDark, fontSize: 8, backgroundColor: 'rgba(255,255,255,.88)', padding: [3,5], borderRadius: 3 },
    data: [
      { xAxis: model.pooledMedianCC, label: { formatter: `${t('portfolio.pooledMedianCC')}  ${formatMoney(model.pooledMedianCC)}`, position: 'insideEndTop' } },
      { yAxis: model.pooledMedianExpense, label: { formatter: `${t('portfolio.pooledMedianAP')}  ${formatMoney(model.pooledMedianExpense)}`, position: 'insideEndTop' } }
    ]
  };
  const comparisonPoints = model.pairs.map(pair => ({
    value: [pair.comparisonCC, pair.comparisonExpense], movement: pair, store: pair.current,
    itemStyle: { color: '#fff', borderColor: MOVEMENT_COLORS.comparison, borderWidth: 1.5, opacity: pair.changed ? .9 : .35 }
  }));
  const currentPoints = model.pairs.map(pair => ({
    value: [pair.currentCC, pair.currentExpense], movement: pair, store: pair.current,
    itemStyle: { color: MOVEMENT_COLORS.current, borderColor: '#fff', borderWidth: 1, opacity: pair.changed ? .94 : .4 }
  }));
  c.clear();
  c.setOption({
    textStyle: baseText(),
    ...chartNavigation(),
    legend: { top: 8, left: 78, itemWidth: 9, itemHeight: 9, itemGap: 18, textStyle: { color: THEME.muted, fontSize: 8 }, data: [periodLabel('comparison'), periodLabel('current'), t('portfolio.changedTrajectory'), t('portfolio.sameQuadrant')] },
    grid: { left: 88, right: 42, top: 64, bottom: 66 },
    tooltip: { ...tooltipStyle(), trigger: 'item', formatter: params => movementTooltip(params.data) },
    xAxis: { type:'value', scale:true, name:t('metric.customerContribution'), nameLocation:'middle', nameGap:42, nameTextStyle:{color:THEME.muted,fontSize:9}, axisLine:{lineStyle:{color:THEME.axis}}, axisTick:{show:false}, axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney}, splitLine:{lineStyle:{color:THEME.grid}} },
    yAxis: { type:'value', min:0, name:t('metric.apExpenseSpend'), nameLocation:'middle', nameGap:62, nameTextStyle:{color:THEME.muted,fontSize:9}, axisLine:{show:false}, axisTick:{show:false}, axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney}, splitLine:{lineStyle:{color:THEME.grid}} },
    series: [
      { name:t('portfolio.sameQuadrant'), type:'lines', coordinateSystem:'cartesian2d', polyline:false, symbol:['none','arrow'], symbolSize:5, silent:false, lineStyle:{color:MOVEMENT_COLORS.same,width:.7,opacity:.1}, data:movementLineData(model.pairs,false) },
      { name:t('portfolio.changedTrajectory'), type:'lines', coordinateSystem:'cartesian2d', polyline:false, symbol:['none','arrow'], symbolSize:7, silent:false, lineStyle:{color:MOVEMENT_COLORS.changed,width:1.4,opacity:.58}, data:movementLineData(model.pairs,true) },
      { name:periodLabel('comparison'), type:'scatter', symbolSize:8, itemStyle:{color:'#fff',borderColor:MOVEMENT_COLORS.comparison,borderWidth:1.5}, data:comparisonPoints, emphasis:{scale:1.25}, markLine:pooledLines },
      { name:periodLabel('current'), type:'scatter', symbolSize:9, itemStyle:{color:MOVEMENT_COLORS.current,borderColor:'#fff',borderWidth:1}, data:currentPoints, emphasis:{scale:1.25} }
    ]
  }, { notMerge: true });
  c.off('click');
  c.on('click', params => {
    const pair = params.data?.movement;
    if (pair && pair.current) openStoreDetail(pair.current.terminal);
  });
  requestAnimationFrame(() => c.resize());
}
function renderStoreRanking() {
  const key = rankingMetricKey();
  const pairs = storeVariancePairs().map(pair => ({
    ...pair,
    variance: pair.comparison ? pair.current.metrics[key] - pair.comparison.metrics[key] : null
  }));
  const comparable = pairs.filter(p => p.variance != null);
  const positive = comparable.filter(p => p.variance > 0).sort((a, b) => b.variance - a.variance).slice(0, 8);
  const negative = comparable.filter(p => p.variance < 0).sort((a, b) => a.variance - b.variance).slice(0, 8);
  $('positiveStores').innerHTML = rankStoreHtml(positive, 'positive');
  $('negativeStores').innerHTML = rankStoreHtml(negative, 'negative');
}
function rankStoreHtml(rows, tone) {
  if (!rows.length) return `<div class="empty-state">${esc(t('portfolio.noDirection'))}</div>`;
  return rows.map((pair, index) => `<button class="rank-row" type="button" data-store="${esc(pair.terminal)}"><span>${String(index + 1).padStart(2, '0')}</span><strong title="${esc(pair.store)}">${esc(pair.store)}</strong><em class="${tone === 'positive' ? 'cell-positive' : 'cell-negative'}">${formatSignedMoney(pair.variance)}</em></button>`).join('');
}

function detailCurrentStores() {
  return state.service ? state.service.getStores('current', {}) : [];
}
function findDetailStore() {
  const current = detailCurrentStores().find(s => s.terminal === state.selectedStore) || null;
  const comparison = (state.service ? state.service.getStores('comparison', {}).find(s => s.terminal === state.selectedStore) : null) || null;
  return { current, comparison };
}
function ensureSelectedStore() {
  const stores = detailCurrentStores();
  if (!stores.length) { $('detailStoreSelect').innerHTML = `<option>${esc(t('common.noData'))}</option>`; return; }
  if (!stores.some(s => s.terminal === state.selectedStore)) state.selectedStore = stores[0].terminal;
  $('detailStoreSelect').innerHTML = stores.slice().sort((a, b) => a.store.localeCompare(b.store, 'zh-CN'))
    .map(s => `<option value="${esc(s.terminal)}"${s.terminal === state.selectedStore ? ' selected' : ''}>${esc(s.store)} · ${esc(s.terminal)}</option>`).join('');
}
function openStoreDetail(terminal) { state.selectedStore = terminal; switchTab('detail'); }
function storeKpiCard(model) {
  const variance = model.variance;
  const cls = Number.isFinite(variance) && Math.abs(variance) > 1e-9 ? (variance > 0 ? 'favorable' : 'adverse') : 'neutral';
  const changeCls = cls === 'favorable' ? 'good' : cls === 'adverse' ? 'bad' : 'flat';
  const currentPrimary = model.type === 'ratio'
    ? formatPct(model.currentRatio)
    : model.type === 'combined'
      ? inlineAmountRatioHtml(model.currentAmount, model.currentRatio)
      : formatMoney(model.currentAmount);
  let comparisonValue = '—';
  if (model.hasComparison) {
    if (model.type === 'ratio') comparisonValue = formatPct(model.comparisonRatio);
    else if (model.type === 'combined') comparisonValue = `<span class="kpi-compare-inline">${inlineAmountRatioHtml(model.comparisonAmount, model.comparisonRatio)}</span>`;
    else comparisonValue = formatMoney(model.comparisonAmount);
  }
  const varianceValue = Number.isFinite(variance)
    ? model.type === 'amount' ? `${variance >= 0 ? '+' : ''}${formatPct(variance)}` : formatRatioVariance(variance)
    : '—';
  return `<article class="kpi-card ${cls}${model.type === 'combined' ? ' kpi-card-combined' : ''}"><div class="kpi-label-row"><span class="kpi-label">${esc(metricLabel(model.key, model.label))}</span></div><div class="kpi-current${model.type === 'combined' ? ' kpi-current-inline' : ''}">${currentPrimary}</div><div class="kpi-compare"><span>${periodLabel('comparison')}</span><strong>${comparisonValue}</strong><span>${esc(t('common.variance'))}</span><strong class="${changeCls}">${varianceValue}</strong></div></article>`;
}
function renderStoreHeader(store, hasComparison) {
  const el = $('storeHeader');
  if (!el) return;
  const items = [
    [t('common.city'), store.city],
    [t('common.region'), store.region],
    [t('common.status'), store.status],
    [t('common.tier'), store.productivityTier],
    [t('metric.storeProductivity'), formatMoney(store.storeProductivity)],
    [t('metric.posNo'), formatInt(store.cityPosNo)]
  ];
  if (!hasComparison) items.push([t('common.comparison'), t('detail.noPriorRecord')]);
  el.innerHTML = items.map(([label, value]) => `<div class="sh-item"><span class="sh-label">${esc(label)}</span><span class="sh-value">${esc(value)}</span></div>`).join('');
  el.hidden = false;
}
function renderDetail() {
  ensureSelectedStore();
  const { current, comparison } = findDetailStore();
  if (!current) {
    $('detailTitle').textContent = t('detail.noStoreSelected');
    $('detailMeta').textContent = t('detail.selectFromPortfolio');
    $('storeHeader').hidden = true;
    $('storeKpis').innerHTML = '';
    $('storePnlBody').innerHTML = '';
    $('storeInsights').innerHTML = `<div class="empty-state">${esc(t('detail.noStoreSelected'))}</div>`;
    $('storeReconcile').textContent = '—';
    ['apComparisonChart', 'apMovementChart'].forEach(id => { const c = chart(id); if (c) c.clear(); });
    return;
  }
  $('detailStoreSelect').value = state.selectedStore;
  $('detailTitle').textContent = current.store;
  $('detailMeta').textContent = `${current.city} · ${current.region} · ${current.terminal}`;
  renderStoreHeader(current, Boolean(comparison));
  const kpiModels = StoreDetailModel.buildKpiModels(current, comparison, window.RetailDashboardData.ratioVariance);
  $('storeKpis').innerHTML = kpiModels.map(storeKpiCard).join('');
  renderStorePnl(current, comparison);
  renderStoreInsights(current, comparison);
  renderApCharts(current, comparison);
}
function renderStorePnl(current, ly) {
  const netSales = current.metrics.netSales;
  const lyNetSales = ly ? ly.metrics.netSales : NaN;
  $('storePnlBody').innerHTML = STORE_PNL_LINES.map(line => {
    const cv = Number.isFinite(current.pnl[line.field]) ? current.pnl[line.field] : null;
    const lv = ly && Number.isFinite(ly.pnl[line.field]) ? ly.pnl[line.field] : null;
    const hasLy = Number.isFinite(lv);
    const ratioModel = StoreDetailModel.buildPnlRatioModel(cv, netSales, hasLy ? lv : null, hasLy ? lyNetSales : null, window.RetailDashboardData.ratioVariance);
    const curShare = ratioModel.currentRatio;
    const lyShare = ratioModel.comparisonRatio;
    const variance = ratioModel.ratioVariance;
    const vCls = Number.isFinite(variance) && Math.abs(variance) > 1e-9 ? (variance > 0 ? 'cell-positive' : 'cell-negative') : '';
    return `<tr class="${line.className || ''}"><td class="${line.indent ? `indent-${line.indent}` : ''}">${esc(pnlLabel(line.field, line.label))}</td><td>${formatKrmb(cv)}</td><td>${Number.isFinite(curShare) ? formatPct(curShare) : '—'}</td><td>${hasLy ? formatKrmb(lv) : '—'}</td><td>${Number.isFinite(lyShare) ? formatPct(lyShare) : '—'}</td><td class="${vCls}">${Number.isFinite(variance) ? `${variance >= 0 ? '+' : ''}${formatPct(variance)}` : '—'}</td></tr>`;
  }).join('');
  $('storeReconcile').textContent = state.model ? state.model.metadata.reviewPeriod : '—';
  $('storeReconcile').className = 'reconcile';
}
function renderStoreInsights(current, ly) {
  const c = current.metrics;
  if (!ly) {
    $('storeInsights').innerHTML = insightHtml([{ title: t('detail.newStore'), detail: t('detail.newStoreDetail') }]);
    return;
  }
  const l = ly.metrics;
  const nsVariance = Math.abs(l.netSales) > 1e-9 ? (c.netSales - l.netSales) / Math.abs(l.netSales) : NaN;
  const gmVariance = window.RetailDashboardData.ratioVariance(c.grossMarginPct, l.grossMarginPct);
  const ccVariance = window.RetailDashboardData.ratioVariance(c.customerContributionPct, l.customerContributionPct);
  const apModel = StoreDetailModel.buildApExpenseModel(current, ly);
  const apRelativeMovement = Number.isFinite(apModel.movement) && Math.abs(apModel.comparisonSpend) > 1e-9
    ? apModel.movement / Math.abs(apModel.comparisonSpend)
    : NaN;
  const items = [];
  items.push({ tone: nsVariance >= 0 ? 'positive' : 'warning', title: t('detail.netSalesMovement', { direction: t(nsVariance >= 0 ? 'detail.increased' : 'detail.decreased'), value: Number.isFinite(nsVariance) ? `${nsVariance >= 0 ? '+' : ''}${formatPct(nsVariance)}` : '' }), detail: t('detail.currentVsComparison', { current: formatMoney(c.netSales), comparison: formatMoney(l.netSales) }) });
  if (Math.abs(gmVariance) >= 0.01) items.push({ tone: gmVariance > 0 ? 'positive' : 'warning', title: t('detail.rateChanged', { metric: metricLabel('grossMargin'), value: formatRatioVariance(gmVariance) }), detail: t('detail.rateCurrentComparison', { current: formatPct(c.grossMarginPct), comparison: formatPct(l.grossMarginPct) }) });
  if (Math.abs(ccVariance) >= 0.01) items.push({ tone: ccVariance > 0 ? 'positive' : 'warning', title: t('detail.rateChanged', { metric: metricLabel('customerContribution'), value: formatRatioVariance(ccVariance) }), detail: t('detail.rateCurrentComparison', { current: formatPct(c.customerContributionPct), comparison: formatPct(l.customerContributionPct) }) });
  if (Number.isFinite(apRelativeMovement) && Math.abs(apRelativeMovement) >= 0.1) items.push({ tone: apModel.movement > 0 ? 'warning' : 'positive', title: t('detail.apMovementSignal', { direction: t(apModel.movement > 0 ? 'detail.increased' : 'detail.decreased'), value: formatSignedMoney(apModel.movement) }), detail: t('detail.apMovementDetail', { current: formatMoney(apModel.currentSpend), comparison: formatMoney(apModel.comparisonSpend) }) });
  if (!items.length) items.push({ tone: 'positive', title: t('detail.stableSignal'), detail: t('detail.stableSignalDetail') });
  $('storeInsights').innerHTML = insightHtml(items);
}
function periodLabel(role) {
  if (state.model) return role === 'comparison' ? state.model.metadata.comparisonPeriodKey : state.model.metadata.currentPeriodKey;
  return t(role === 'comparison' ? 'common.comparison' : 'common.current');
}
function applyPeriodLabels() {
  document.querySelectorAll('[data-period-role]').forEach(el => {
    el.textContent = periodLabel(el.dataset.periodRole);
  });
}
function renderApCharts(current, ly) {
  if (capabilityStatus('apComponentAnalysis') !== 'available') {
    const warning = capabilityWarning('apComponentAnalysis');
    const title = warning ? warning.title : t('error.apComponentUnavailable');
    const detail = warning ? warning.detail : t('error.apComponentMissing');
    featureUnavailable('apComparisonChart', title, detail);
    featureUnavailable('apMovementChart', title, detail);
    return;
  }
  const componentModel = StoreDetailModel.buildApComponentModel(current, ly);
  const labels = componentModel.components.map(component => componentLabel(component.key, component.label));
  const currentValues = componentModel.components.map(component => component.current);
  const comparisonValues = componentModel.components.map(component => component.comparison);
  const currentLabel = periodLabel('current');
  const comparisonLabel = periodLabel('comparison');
  const comparisonChart = chart('apComparisonChart');
  const comparisonElement = $('apComparisonChart');
  comparisonElement.dataset.componentKeys = JSON.stringify(componentModel.components.map(component => component.key));
  comparisonElement.dataset.formalTotal = componentModel.formalTotalKey;
  comparisonElement.dataset.currentPool = String(componentModel.currentPool);
  comparisonElement.dataset.canonicalCurrentSpend = String(componentModel.canonicalCurrentSpend);
  comparisonChart.clear();
  comparisonChart.setOption({
    textStyle:baseText(),
    grid:{left:172,right:28,top:38,bottom:48},
    legend:{top:4,right:82,textStyle:{color:THEME.muted,fontSize:9}},
    tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>{const index=params[0].dataIndex,component=componentModel.components[index];return `<b>${esc(componentLabel(component.key, component.label))}</b><br>${currentLabel}: ${formatMoney(component.current)} · ${formatPct(component.currentShare)} ${esc(t('detail.ofPool'))}<br>${comparisonLabel}: ${componentModel.hasComparison ? `${formatMoney(component.comparison)} · ${formatPct(component.comparisonShare)} ${esc(t('detail.ofPool'))}` : '—'}`;}},
    xAxis:{type:'value',min:0,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},
    yAxis:{type:'category',inverse:true,data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8.5}},
    series:[
      {name:currentLabel,type:'bar',data:currentValues,barMaxWidth:11,itemStyle:{color:THEME.blue,borderRadius:[0,3,3,0]}},
      {name:comparisonLabel,type:'bar',data:componentModel.hasComparison?comparisonValues:labels.map(()=>'-'),barMaxWidth:11,itemStyle:{color:THEME.gold,borderRadius:[0,3,3,0]}}
    ]
  },{notMerge:true});
  const movementChart = chart('apMovementChart');
  const movementElement = $('apMovementChart');
  movementElement.dataset.componentKeys = comparisonElement.dataset.componentKeys;
  movementElement.dataset.formalTotal = componentModel.formalTotalKey;
  if (!componentModel.hasComparison) {
    movementChart.clear();
    movementChart.setOption({textStyle:baseText(),graphic:[{type:'text',left:'center',top:'middle',style:{text:t('error.noPriorComparison'),fill:THEME.muted,font:'500 10px Segoe UI, sans-serif'}}],series:[]},{notMerge:true});
    return;
  }
  const bridgeModel = StoreDetailModel.buildApComponentBridge(componentModel);
  const movementSteps = bridgeModel.steps.filter(step => Math.abs(step.movement) > 1e-9);
  const bridgeItems = [
    { label: `${comparisonLabel} ${t('detail.componentPool')}`, type: 'anchor', raw: bridgeModel.comparisonPool, start: 0, end: bridgeModel.comparisonPool },
    ...movementSteps.map(step => ({ ...step, label: componentLabel(step.key, step.label), type: step.movement > 0 ? 'increase' : 'decrease', raw: step.movement })),
    { label: `${currentLabel} ${t('detail.componentPool')}`, type: 'anchor', raw: bridgeModel.currentPool, start: 0, end: bridgeModel.currentPool }
  ];
  const bridgePath = [0, bridgeModel.comparisonPool, ...movementSteps.map(step => step.end), bridgeModel.currentPool];
  const bridgeHigh = Math.max(...bridgePath);
  const bridgeLow = Math.min(...bridgePath);
  const bridgePad = Math.max((bridgeHigh - bridgeLow) * .14, 4);
  movementElement.dataset.movementCount = String(movementSteps.length);
  movementElement.dataset.bridgeType = 'component-pool';
  movementElement.dataset.bridgeStart = String(bridgeModel.comparisonPool);
  movementElement.dataset.bridgeEnd = String(bridgeModel.currentPool);
  movementElement.dataset.bridgeCalculatedEnd = String(bridgeModel.calculatedCurrentPool);
  movementElement.dataset.canonicalCurrentSpend = String(bridgeModel.canonicalCurrentSpend);
  movementChart.clear();
  movementChart.setOption({
    textStyle:baseText(),
    grid:{left:58,right:22,top:28,bottom:116},
    tooltip:{...tooltipStyle(),trigger:'item',formatter:params=>{const item=bridgeItems[params.dataIndex];if(item.type==='anchor')return `<b>${esc(item.label)}</b><br>${esc(t('detail.componentPool'))}: ${formatMoney(item.raw)}`;const component=componentModel.components.find(entry=>entry.key===item.key);return `<b>${esc(item.label)}</b><br>${comparisonLabel}: ${formatMoney(component.comparison)} · ${formatPct(component.comparisonShare)} ${esc(t('detail.ofPool'))}<br>${currentLabel}: ${formatMoney(component.current)} · ${formatPct(component.currentShare)} ${esc(t('detail.ofPool'))}<br>${esc(t('detail.spendMovement'))}: ${formatSignedMoney(item.raw)}`;}},
    xAxis:{type:'category',data:bridgeItems.map(item=>item.label),axisLine:{lineStyle:{color:THEME.axis}},axisTick:{show:false},axisLabel:{interval:0,rotate:28,margin:15,color:THEME.muted,fontSize:7.5,lineHeight:10,formatter:wrapBridgeLabel}},
    yAxis:{type:'value',min:Math.min(0,bridgeLow-bridgePad),max:bridgeHigh+bridgePad,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatBridgeAxis},splitLine:{lineStyle:{color:THEME.grid}}},
    series:[
      {name:t('chart.bridgeBase'),type:'bar',stack:'componentBridge',silent:true,barMaxWidth:32,itemStyle:{color:'rgba(0,0,0,0)'},emphasis:{disabled:true},data:bridgeItems.map(item=>item.type==='anchor'?0:Math.min(item.start,item.end))},
      {name:t('chart.componentMovement'),type:'bar',stack:'componentBridge',barMaxWidth:32,barMinHeight:3,data:bridgeItems.map(item=>({value:item.type==='anchor'?item.raw:Math.abs(item.raw),raw:item.raw,itemStyle:{color:item.type==='anchor'?THEME.navy:item.type==='increase'?THEME.orange:THEME.green,borderRadius:[2,2,0,0]}})),label:{show:true,position:'top',distance:5,color:THEME.ink,fontSize:7.5,fontWeight:600,formatter:params=>formatBridgeMoney(params.data.raw,params.dataIndex>0&&params.dataIndex<bridgeItems.length-1)}}
    ]
  },{notMerge:true});
}

function renderFooter() {
  if (!state.model) return;
  const md = state.model.metadata;
  const currentStores = state.model.detail.current.stores.length;
  const comparisonStores = state.model.detail.comparison.stores.length;
  $('footerMeta').textContent = t('footer.meta', { current: currentStores, comparison: comparisonStores, period: md.reviewPeriod });
}
function renderAll() {
  updatePeriodSummary(); ensureSelectedStore(); renderFooter(); renderActiveTab();
}
function renderActiveTab() {
  if (state.activeTab === 'overview') renderOverview();
  else if (state.activeTab === 'variance') renderVariance();
  else if (state.activeTab === 'portfolio') renderPortfolio();
  else renderDetail();
  requestAnimationFrame(() => Object.values(state.charts).forEach(c => c.resize()));
}
function openPnlSnapshot(value) {
  const line = PNL_LINE_ALIASES[value] || value;
  if (!SNAPSHOT_ROWS.some(row => row.key === line)) return;
  state.selectedPnlLine = line;
  switchTab('variance', { scrollTop: false });
  requestAnimationFrame(() => {
    const row = document.querySelector(`#varianceSnapshotBody [data-snapshot-line="${line}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
function switchTab(tab, { scrollTop = true } = {}) {
  state.activeTab=tab;
  document.querySelectorAll('.rail-link').forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===tab));
  renderActiveTab();
  if (scrollTop) window.scrollTo({top:0,behavior:'smooth'});
}
function setSegment(containerId,value) { document.querySelectorAll(`#${containerId} button[data-value]`).forEach(button=>button.classList.toggle('active',button.dataset.value===value)); }

function disposeAllCharts() {
  Object.values(state.charts).forEach(chart => chart.dispose());
  state.charts = {};
}

function resetInteractionUi() {
  ['regionFilter','cityFilter','statusFilter','tierFilter'].forEach(id => { $(id).value = ''; });
  $('storeSearch').value = '';
  $('rankingMetric').value = state.portfolioMetric;
  setSegment('snapshotToggle', state.snapshot);
  setSegment('portfolioView', state.portfolioView);
  document.querySelectorAll('.portfolio-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.portfolioPanel === state.portfolioView));
}

function activateDataSource(candidate) {
  disposeAllCharts();
  SourceLifecycle.activate(state, candidate);
  resetInteractionUi();
  populateGlobalFilters();
  enableDashboard(true);
  applyCapabilityControls();
  updatePeriodSummary();
  renderAll();

  const md = state.model.metadata;
  if (state.sourceType === 'demo') {
    renderDataPreparation(DataPreparationUI.buildDemoPreparation(state.model));
    setI18nNotice('success', 'notice.demoReady', 'notice.demoReadyDetail', { current: md.currentPeriodKey, comparison: md.comparisonPeriodKey, stores: state.dataStats.stores });
  } else {
    renderDataPreparation(DataPreparationUI.buildWorkbookPreparation(state.model));
    const limitations = state.preparationView && state.preparationView.mode === 'warning';
    setI18nNotice(limitations ? 'warning' : 'success', limitations ? 'notice.uploadReadyLimitations' : 'notice.uploadReady', 'notice.uploadReadyDetail', { current: md.currentPeriodKey, comparison: md.comparisonPeriodKey, stores: state.dataStats.stores });
  }
  updateSourceUi();
}

function loadDemoDataset() {
  if (!window.RetailDemoData) throw new Error(t('error.demoMissing'));
  const service = window.RetailDashboardData.createDataService(window.RetailDemoData);
  activateDataSource({ sourceType: 'demo', model: window.RetailDemoData, service, fileName: '' });
}

function resetDashboard() {
  SourceLifecycle.resetInteractions(state);
  resetInteractionUi();
  populateGlobalFilters();
  applyCapabilityControls();
  renderAll();
  setI18nNotice('info', 'notice.reset', state.sourceType === 'upload' ? 'notice.uploadRemains' : 'notice.demoRemains');
}

function clearUploadedData() {
  if (state.sourceType !== 'upload') return;
  if (IS_INTERNAL_EDGE) {
    window.location.reload();
    return;
  }
  loadDemoDataset();
  setI18nNotice('success', 'notice.returnedDemo', 'notice.returnedDemoDetail');
}
function saveMapping() {
  if(!state.book)return;
  state.mapping=mappingFromUI(); const missing=validateMapping();
  if(missing.length){showMappingAlert('error',`${t(missing.length === 1 ? 'prep.missingRequiredField' : 'prep.missingRequiredFields')}: ${missing.map(key=>FIELDS[key].label).join(', ')}`);return;}
  const store=readMappingStore();store[state.signature]=currentMappingNames();
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));showMappingAlert('success',t('mapping.saved'));}
  catch(_){showMappingAlert('error',t('mapping.storageBlocked'));}
}
function exportMapping() {
  if(!state.book)return;state.mapping=mappingFromUI();
  const payload={version:2,created:new Date().toISOString().slice(0,10),mapping:currentMappingNames()};
  const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));anchor.download='retail-dashboard-field-mapping.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
}
function importMappingFile(file) {
  const reader=new FileReader();reader.onload=()=>{try{const object=JSON.parse(reader.result),mapping=object.mapping||object;state.mapping=savedToIndexes(mapping,state.headers);renderMapping();showMappingAlert('success',t('mapping.imported'));}catch(_){showMappingAlert('error',t('mapping.invalidJson'));}};reader.readAsText(file);
}

document.querySelectorAll('.rail-link').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
document.addEventListener('click',event=>{
  const pnlLine=event.target.closest('[data-pnl-line]'); if(pnlLine){openPnlSnapshot(pnlLine.dataset.pnlLine);return;}
  const driver=event.target.closest('[data-driver]'); if(driver){openDriverPortfolio(driver.dataset.driver);return;}
  const store=event.target.closest('[data-store]'); if(store){openStoreDetail(store.dataset.store);return;}
  const action=event.target.closest('[data-action]'); if(action){if(action.dataset.action==='variance'){openPnlSnapshot(action.dataset.metric);}else if(action.dataset.action==='portfolio'){openDriverPortfolio(action.dataset.driver||'');}}
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const pnlLine = event.target.closest('tr[data-pnl-line]');
  if (!pnlLine) return;
  event.preventDefault();
  openPnlSnapshot(pnlLine.dataset.pnlLine);
});
$('portfolioView').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.portfolioView=button.dataset.value;setSegment('portfolioView',state.portfolioView);document.querySelectorAll('.portfolio-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.portfolioPanel===state.portfolioView));renderPortfolio();});
$('snapshotToggle').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.snapshot=button.dataset.value;setSegment('snapshotToggle',state.snapshot);renderPortfolio();});
$('quadrantSummary').addEventListener('click',event=>{const button=event.target.closest('button[data-quadrant]');if(!button||state.snapshot==='movement')return;const next=button.dataset.quadrant;state.selectedQuadrant=state.selectedQuadrant===next&&next!=='all'?'all':next;renderProductivityQuadrant();});
$('storeSearch').addEventListener('input',event=>{state.search=event.target.value.trim().toLowerCase();if(state.portfolioView==='productivity')renderProductivityQuadrant();});
$('rankingMetric').addEventListener('change',event=>{setPortfolioMetric(event.target.value);renderStoreRanking();});
$('detailStoreSelect').addEventListener('change',event=>{state.selectedStore=event.target.value;renderDetail();});

$('regionFilter').addEventListener('change',()=>{refreshCityOptions();renderAll();});
$('statusFilter').addEventListener('change',()=>{refreshCityOptions();renderAll();});
$('tierFilter').addEventListener('change',()=>{refreshCityOptions();renderAll();});
$('cityFilter').addEventListener('change',()=>{renderAll();});
$('resetFiltersBtn').addEventListener('click',resetDashboard);

const WORKBOOK_FILE_PATTERN=/\.(xlsx|xls|xlsm|csv)$/i;
function isWorkbookFile(file){return Boolean(file&&WORKBOOK_FILE_PATTERN.test(file.name||''));}
function readFileAsArrayBuffer(file) {
  if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(t('error.fileRead')));
    reader.readAsArrayBuffer(file);
  });
}
async function loadWorkbookFile(file){
  if(!isWorkbookFile(file)){
    setI18nNotice('error','notice.uploadFailed','error.invalidFile');
    return;
  }
  const dropZone=$('uploadDropZone');dropZone.classList.add('is-loading');dropZone.setAttribute('aria-busy','true');
  const retainedPreparation = state.preparationView;
  try{
    if(!window.XLSX||!window.echarts)throw new Error(t('error.localLibraries'));
    if(!window.RetailDashboardData)throw new Error(t('error.dataLayerMissing'));
    if(!DataPreparationUI)throw new Error(t('error.preparationUiMissing'));
    renderDataPreparation(DataPreparationUI.buildLoadingPreparation(file.name));
    setI18nNotice('info','notice.prepareWorkbook','notice.prepareWorkbookDetail');
    const book=XLSX.read(await readFileAsArrayBuffer(file),{type:'array',cellDates:true,cellFormula:true});
    const model=window.RetailDashboardData.parseWorkbook(book,{XLSX:window.XLSX,fileName:file.name});
    model.metadata.sourceType = 'upload';
    const service=window.RetailDashboardData.createDataService(model);
    activateDataSource({ sourceType: 'upload', book, model, service, fileName: file.name });
  }
  catch(error){
    const view = DataPreparationUI ? DataPreparationUI.buildBlockingPreparation(error) : null;
    setNotice('error',t('notice.uploadFailed'),view ? view.summary : t('error.reviewWorkbook'));
    renderDataPreparation(retainedPreparation);
  }
  finally{dropZone.classList.remove('is-loading','is-dragging');dropZone.removeAttribute('aria-busy');}
}

$('fileInput').addEventListener('change',async event=>{const file=event.target.files[0];if(file)await loadWorkbookFile(file);event.target.value='';});
const uploadDropZone=$('uploadDropZone');
uploadDropZone.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('fileInput').click();}});
uploadDropZone.addEventListener('dragenter',event=>{event.preventDefault();uploadDropZone.classList.add('is-dragging');});
uploadDropZone.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';uploadDropZone.classList.add('is-dragging');});
uploadDropZone.addEventListener('dragleave',event=>{if(!event.relatedTarget||!uploadDropZone.contains(event.relatedTarget))uploadDropZone.classList.remove('is-dragging');});
uploadDropZone.addEventListener('drop',async event=>{
  event.preventDefault();uploadDropZone.classList.remove('is-dragging');
  const files=Array.from(event.dataTransfer?.files||[]);
  if(files.length!==1){setI18nNotice('error','error.singleWorkbook','error.singleWorkbookDetail');return;}
  await loadWorkbookFile(files[0]);
});
document.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files'))event.preventDefault();});
document.addEventListener('drop',event=>{if(Array.from(event.dataTransfer?.files||[]).length)event.preventDefault();});
$('settingsBtn').addEventListener('click',openSettings);$('clearBtn').addEventListener('click',clearUploadedData);
$('saveMappingBtn').addEventListener('click',saveMapping);$('exportMappingBtn').addEventListener('click',exportMapping);
$('importMappingBtn').addEventListener('click',()=>$('mappingFileInput').click());
$('mappingFileInput').addEventListener('change',event=>{if(event.target.files[0])importMappingFile(event.target.files[0]);event.target.value='';});
$('applyMappingBtn').addEventListener('click',()=>{if(!state.book){showMappingAlert('error',t('mapping.uploadFirst'));return;}state.mapping=mappingFromUI();buildRecords();});
$('sheetSelect').addEventListener('change',event=>{if(!state.book)return;state.sheetName=event.target.value;state.matrix=sheetMatrix(state.sheetName);const detected=detectHeader(state.matrix);state.headerRow=detected.row;state.headers=headersAt(state.matrix,state.headerRow);state.signature=schemaSignature(state.headers);state.mapping=autoMap(state.headers);renderSourceControls();renderMapping();showMappingAlert('success',t('mapping.headerDetected',{row:state.headerRow+1}));});
$('headerRow').addEventListener('change',event=>{if(!state.book)return;state.headerRow=Math.max(0,Number(event.target.value||1)-1);state.headers=headersAt(state.matrix,state.headerRow);state.signature=schemaSignature(state.headers);state.mapping=autoMap(state.headers);renderMapping();$('schemaMeta').textContent=t('mapping.columnsDetected',{count:state.headers.length,file:state.fileName});});

function rerenderLanguage() {
  const filterValues = ['regionFilter','cityFilter','statusFilter','tierFilter'].reduce((values, id) => {
    values[id] = $(id).value;
    return values;
  }, {});
  populateGlobalFilters();
  Object.keys(filterValues).forEach(id => {
    if (Array.from($(id).options).some(option => option.value === filterValues[id])) $(id).value = filterValues[id];
  });
  refreshCityOptions();
  if (Array.from($('cityFilter').options).some(option => option.value === filterValues.cityFilter)) $('cityFilter').value = filterValues.cityFilter;
  updateSourceUi();
  rerenderNotice();
  if (state.model && DataPreparationUI) {
    renderDataPreparation(state.sourceType === 'demo' ? DataPreparationUI.buildDemoPreparation(state.model) : DataPreparationUI.buildWorkbookPreparation(state.model));
  }
  if (state.book) { renderSourceControls(); renderMapping(); }
  renderAll();
}

window.addEventListener('retail:languagechange', rerenderLanguage);
window.addEventListener('resize',()=>Object.values(state.charts).forEach(c=>c.resize()));
window.addEventListener('pagehide',()=>{state.book=null;state.model=null;state.service=null;state.matrix=[];state.records=[];state.periods=[];state.headers=[];state.warnings=[];});
if(!window.XLSX||!window.echarts||!window.RetailDashboardData||!DataPreparationUI||!SourceLifecycle||!ProductivityQuadrant||!StoreDetailModel||!I18n){
  if (window.RetailStartupGuard) window.RetailStartupGuard.fail('Spreadsheet, chart, or local application library unavailable');
  else setNotice('error',t('error.initialization'),t('error.libraryUnavailable'));
} else if (IS_INTERNAL_EDGE) {
  enableDashboard(false);
  renderDataPreparation(null);
  setI18nNotice('info','notice.readyLocal','notice.readyLocalDetail');
  if (window.RetailStartupGuard) window.RetailStartupGuard.ready();
} else {
  try {
    loadDemoDataset();
    if (window.RetailStartupGuard) window.RetailStartupGuard.ready();
  }
  catch (error) {
    if (window.RetailStartupGuard) window.RetailStartupGuard.fail('Bundled demo data unavailable');
    else setNotice('error',t('error.initialization'),t('error.demoUnavailable'));
  }
}
})();
