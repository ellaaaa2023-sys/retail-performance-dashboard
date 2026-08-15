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
const MONEY_KEYS = new Set(['rsp','avgTicket','grossSales','discount','rebates','structuralOn','structuralOff','activeSupport','shopperInvestment','promoInvoice','promoSeparate','promoLoyalty','promotionalAllowance','returns','oca','coupon','minorations','netSales','netSalesPerPos','stdCos','royal','specialOps','obsolete','physicalDistribution','costOfSales','grossMargin','samples','gifts','animations','posAdvAmort','posAdvOther','posAdvertising','development','daCost','nonDaCost','daCostPerHc','specificAP','specificSga','contribution','nonSpecificCosts','operatingProfit']);

const METRICS = {
  netSales: { label: 'Net Sales', type: 'money', direction: 'up', field: 'netSales', drill: 'netSales' },
  grossMargin: { label: 'Gross Margin', type: 'money', direction: 'up', field: 'grossMargin', drill: 'grossMargin' },
  grossMarginPct: { label: 'Gross Margin %', type: 'percent', direction: 'up', ratio: ['grossMargin','netSales'], drill: 'grossMargin' },
  contribution: { label: 'Customer Contribution', type: 'money', direction: 'up', field: 'contribution', drill: 'contribution' },
  contributionPct: { label: 'Customer Contribution %', type: 'percent', direction: 'up', ratio: ['contribution','netSales'], drill: 'contribution' },
  operatingProfit: { label: 'Operating Profit', type: 'money', direction: 'up', field: 'operatingProfit', drill: 'operatingProfit' },
  operatingMargin: { label: 'Operating Margin %', type: 'percent', direction: 'up', ratio: ['operatingProfit','netSales'], drill: 'operatingProfit' },
  storeCount: { label: 'Store Count', type: 'count', direction: 'neutral', aggregate: 'stores' },
  posCount: { label: 'POS Count', type: 'count', direction: 'neutral', field: 'pos' },
  avgSales: { label: 'Average Sales per Store', type: 'money', direction: 'up', aggregate: 'avgSales' }
};

const STORE_AP_COMPONENTS = [
  { key: 'customerSamples', label: 'Customer Samples' },
  { key: 'promotionalGifts', label: 'Promotional Gifts' },
  { key: 'animations', label: 'Animations' },
  { key: 'posAdvertising', label: 'POS Advertising' },
  { key: 'specificDevelopment', label: 'Specific Development' },
  { key: 'specificAP', label: 'Specific A&P' }
];

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

const STORE_KPIS = [
  { key: 'grossSales', label: 'Gross Sales', type: 'money' },
  { key: 'netSales', label: 'CA Net', type: 'money' },
  { key: 'caNetPctOfGs', label: 'CA Net % of GS', type: 'percent' },
  { key: 'grossMarginPct', label: 'Gross Margin %', type: 'percent' },
  { key: 'customerContribution', label: 'Customer Contribution', type: 'money' },
  { key: 'customerContributionPct', label: 'Customer Contribution %', type: 'percent' }
];

const state = {
  book: null, fileName: '', sheetName: '', headerRow: 0, headers: [], matrix: [], mapping: {}, signature: '',
  records: [], periods: [], currentPeriodKey: '', comparisonMode: 'ly', filters: {}, activeTab: 'overview',
  portfolioView: 'productivity', snapshot: 'current',
  portfolioMetric: 'customerContribution', selectedStore: '', search: '', charts: {}, warnings: [], dataStats: null,
  model: null, service: null, selectedVarianceKpi: 'grossMargin', selectedDriver: ''
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
function formatPp(value) { return Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp` : '—'; }
function formatInt(value) { return Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '—'; }
function formatSignedMoney(value) { const text = formatMoney(value); return value > 0 ? `+${text}` : text; }
function formatSignedNumber(value) { return `${value > 0 ? '+' : ''}${formatInt(value)}`; }

function setNotice(type, title, message) {
  $('notice').className = `notice ${type}`;
  $('notice').innerHTML = `<div><strong>${esc(title)}</strong><span>${esc(message)}</span></div>`;
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
  $('schemaMeta').textContent = `${state.headers.length} columns detected · ${state.fileName}`;
}
function renderMapping() {
  $('mappingBody').innerHTML = Object.entries(FIELDS).map(([key,item]) => {
    const options = ['<option value="-1">— Not mapped —</option>', ...state.headers.map((header,index) => `<option value="${index}"${state.mapping[key] === index ? ' selected' : ''}>${esc(header)}</option>`)].join('');
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
  if (state.model) { setNotice('info','Automatic field mapping','This workbook is mapped automatically by the data layer. Manual field mapping is no longer required.'); return; }
  if (!$('mappingDialog').open) $('mappingDialog').showModal();
  if (!state.book) showMappingAlert('error','Upload a workbook before configuring fields.');
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
  if (state.model) { showMappingAlert('success','This workbook uses automatic semantic field mapping. Manual field mapping is not required.'); return; }
  const missing = validateMapping();
  if (missing.length) {
    showMappingAlert('error',`Missing required field: ${missing.map(key => FIELDS[key].label).join(', ')}.`);
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
  if (!records.length) { setNotice('error','No usable P&L records found','Check worksheet, header row and field mapping.'); return; }
  const duplicates = new Map();
  records.forEach(record => {
    const key = `${norm(record.terminal)}|${norm(record.periodKey)}`;
    duplicates.set(key,(duplicates.get(key)||0)+1);
  });
  const duplicateKeys = [...duplicates.entries()].filter(([,count]) => count > 1);
  if (duplicateKeys.length) {
    setNotice('error','Duplicate Store × Period records detected',`${duplicateKeys.length} composite key(s) are duplicated. Resolve them before analysis.`);
    showMappingAlert('error','Duplicate Store ID × Period records prevent reliable comparisons.');
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
  setNotice(state.warnings.length ? 'warning' : 'success',`Loaded ${records.length} P&L records locally`,`${state.dataStats.stores} stores · ${periods.length} review periods · Sheet: ${state.sheetName}${suffix}`);
  $('mappingDialog').close();
}

function loadSource(fileName) {
  const best = bestSource();
  if (!best || best.score < 8) throw new Error('No suitable P&L header row found. Open Data Settings and select the worksheet and header row.');
  state.fileName = fileName; state.sheetName = best.name; state.matrix = best.matrix; state.headerRow = best.row;
  state.headers = headersAt(best.matrix,best.row); state.signature = schemaSignature(state.headers);
  const saved = readMappingStore()[state.signature];
  state.mapping = saved ? savedToIndexes(saved,state.headers) : autoMap(state.headers);
  renderSourceControls(); renderMapping();
  const missing = validateMapping();
  if (missing.length) {
    openSettings();
    showMappingAlert('error',`Missing required field: ${missing.map(key => FIELDS[key].label).join(', ')}. Please map in Settings.`);
    setNotice('error','Workbook needs field mapping',`Missing: ${missing.map(key => FIELDS[key].label).join(', ')}`);
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
    $('periodSummary').innerHTML = `<span>Current</span><strong>${esc(md.currentPeriodKey)}</strong><i>vs</i><span>Comparison</span><strong>${esc(md.comparisonPeriodKey)}</strong>`;
  } else {
    $('reviewPeriodValue').textContent = '—';
    $('periodSummary').innerHTML = `<span>Current</span><strong>—</strong><i>vs</i><span>Comparison</span><strong>—</strong>`;
  }
  applyPeriodLabels();
}
function populateGlobalFilters() {
  if (!state.service) return;
  const options = state.service.getFilterOptions({});
  setOptions('regionFilter', options.region, 'All Regions');
  setOptions('cityFilter', options.city, 'All Cities');
  setOptions('statusFilter', options.status, 'All Status');
  setOptions('tierFilter', options.productivityTier, 'All Tiers');
}
function refreshCityOptions() {
  if (!state.service) return;
  const options = state.service.getFilterOptions(activeFilters());
  setOptions('cityFilter', options.city, 'All Cities');
}
function enableDashboard(on) {
  $('contextBar').classList.toggle('is-disabled',!on);
  ['regionFilter','cityFilter','statusFilter','tierFilter','resetFiltersBtn','storeSearch','rankingMetric','detailStoreSelect','clearBtn'].forEach(id => { if ($(id)) $(id).disabled = !on; });
}

function metricValue(rows,key) {
  const metric = METRICS[key];
  if (!metric) return 0;
  if (metric.aggregate === 'stores') return unique(rows.map(row => row.terminal)).length;
  if (metric.aggregate === 'avgSales') { const stores = unique(rows.map(row=>row.terminal)).length; return stores ? sum(rows,'netSales') / stores : 0; }
  if (metric.ratio) { const denominator = sum(rows,metric.ratio[1]); return denominator ? sum(rows,metric.ratio[0]) / denominator : 0; }
  return sum(rows,metric.field);
}
function metricStats(key,currentRows,comparisonRows) {
  const current = metricValue(currentRows,key), ly = comparisonRows.length ? metricValue(comparisonRows,key) : NaN;
  const delta = Number.isFinite(ly) ? current - ly : NaN;
  const pct = Number.isFinite(delta) && Math.abs(ly) > 1e-9 ? delta / Math.abs(ly) : NaN;
  return {current,ly,delta,pct};
}
function formatMetric(value,key) {
  const type = METRICS[key]?.type;
  if (type === 'percent') return formatPct(value);
  if (type === 'count') return formatInt(value);
  return formatMoney(value);
}
function formatMetricDelta(value,key) {
  const type = METRICS[key]?.type;
  if (type === 'percent') return formatPp(value);
  if (type === 'count') return formatSignedNumber(value);
  return formatSignedMoney(value);
}
function directionClass(key,delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9 || METRICS[key]?.direction === 'neutral') return 'neutral';
  return delta > 0 ? 'favorable' : 'adverse';
}
function goodBadClass(key,delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9 || METRICS[key]?.direction === 'neutral') return 'flat';
  return delta > 0 ? 'good' : 'bad';
}
function kpiCardHtml(key,stats,clickable = true) {
  const metric = METRICS[key], tag = clickable && metric.drill ? 'button' : 'article';
  const attrs = tag === 'button' ? ` type="button" data-kpi="${metric.drill}"` : '';
  const yoy = Number.isFinite(stats.delta) ? `${formatMetricDelta(stats.delta,key)}${Number.isFinite(stats.pct) ? ` · ${stats.pct >= 0 ? '+' : ''}${formatPct(stats.pct)}` : ''}` : 'N/A';
  return `<${tag} class="kpi-card ${directionClass(key,stats.delta)}"${attrs}><div class="kpi-label-row"><span class="kpi-label">${esc(metric.label)}</span>${tag === 'button' ? '<span class="kpi-arrow">›</span>' : ''}</div><div class="kpi-current">${formatMetric(stats.current,key)}</div><div class="kpi-compare"><span>Comparison</span><strong>${formatMetric(stats.ly,key)}</strong><span>${state.comparisonMode === 'ly' ? 'YoY Change' : 'Change'}</span><strong class="${goodBadClass(key,stats.delta)}">${yoy}</strong></div></${tag}>`;
}

const OVERVIEW_KPIS_PRIMARY = [
  { key: 'storeCount', label: 'Store Count', type: 'count', drill: null },
  { key: 'posNo', label: 'POS no.', type: 'count', drill: null },
  { key: 'aup', label: 'AUP', type: 'money', drill: null },
  { key: 'grossSales', label: 'Gross Sales', type: 'money', drill: null }
];
const OVERVIEW_KPIS_SECONDARY = [
  { key: 'totalMinorationsPct', label: 'Total Minorations %', type: 'percent', drill: 'minorations' },
  { key: 'netSales', label: 'CONSO Net Sales', type: 'money', drill: null },
  { key: 'grossMargin', label: 'Gross Margin', type: 'money', drill: 'grossMargin' },
  { key: 'grossMarginPct', label: 'Gross Margin %', type: 'percent', drill: 'grossMargin' },
  { key: 'customerContribution', label: 'Customer Contribution', type: 'money', drill: 'contribution' },
  { key: 'customerContributionPct', label: 'Customer Contribution %', type: 'percent', drill: 'contribution' }
];
function overviewMetricFormat(value, type) {
  if (type === 'percent') return formatPct(value);
  if (type === 'count') return formatInt(value);
  return formatMoney(value);
}
function overviewMetricDelta(current, comparison, type) {
  if (!Number.isFinite(current) || !Number.isFinite(comparison)) return null;
  const variance = current - comparison;
  if (type === 'percent') return formatPp(variance);
  if (type === 'count') return formatSignedNumber(variance);
  const rel = Math.abs(comparison) > 1e-9 ? variance / Math.abs(comparison) : null;
  return Number.isFinite(rel) ? `${rel >= 0 ? '+' : ''}${(rel * 100).toFixed(1)}%` : null;
}
function overviewKpiCard(def, metrics) {
  const current = metrics.current[def.key];
  const comparison = metrics.comparison[def.key];
  const deltaText = overviewMetricDelta(current, comparison, def.type);
  const variance = (Number.isFinite(current) && Number.isFinite(comparison)) ? current - comparison : null;
  const tone = (variance == null || Math.abs(variance) < 1e-9) ? 'neutral' : variance > 0 ? 'favorable' : 'adverse';
  const tag = def.drill ? 'button' : 'article';
  const attrs = tag === 'button' ? ` type="button" data-kpi="${def.drill}"` : '';
  const comparisonText = Number.isFinite(comparison) ? overviewMetricFormat(comparison, def.type) : '—';
  const currentText = Number.isFinite(current) ? overviewMetricFormat(current, def.type) : '—';
  return `<${tag} class="kpi-card ${tone}"${attrs}><div class="kpi-label-row"><span class="kpi-label">${esc(def.label)}</span>${tag === 'button' ? '<span class="kpi-arrow">›</span>' : ''}</div><div class="kpi-current">${currentText}</div><div class="kpi-compare"><span>${periodLabel('comparison')}</span><strong>${comparisonText}</strong><span>Variance</span><strong class="${deltaText == null ? 'flat' : variance >= 0 ? 'good' : 'bad'}">${deltaText == null ? 'N/A' : deltaText}</strong></div></${tag}>`;
}
function updateScopeStatus(metrics) {
  const el = $('scopeStatus');
  if (!el) return;
  const filtered = metrics && metrics.mode === 'filtered';
  el.className = 'scope-status' + (filtered ? ' filtered' : '');
  el.innerHTML = `<span class="scope-dot"></span><span>${esc(metrics ? metrics.label : 'Total Portfolio')}</span>`;
}
function renderOverviewEmpty() {
  updateScopeStatus({ mode: 'total', label: 'Total Portfolio' });
  $('primaryKpis').innerHTML = '';
  $('secondaryKpis').innerHTML = '';
  $('snapshotBody').innerHTML = '<tr><td colspan="6">Upload a workbook to view the P&L snapshot</td></tr>';
  $('overviewInsights').innerHTML = '<div class="empty-state">No analysis available</div>';
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
  renderPnlSnapshot(view);
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
    toolbox:{show:true,right:8,top:0,itemSize:14,itemGap:9,feature:{dataZoom:{title:{zoom:'Zoom',back:'Undo zoom'},xAxisIndex:x?'all':false,yAxisIndex:y?'all':false},restore:{title:'Reset view'}},iconStyle:{borderColor:THEME.muted},emphasis:{iconStyle:{borderColor:THEME.blue}}},
    dataZoom
  };
}
const SNAPSHOT_ROWS = [
  { key: 'posNo', label: 'POS no.', type: 'count', ratio: null, major: false },
  { key: 'aup', label: 'AUP', type: 'money', ratio: null, major: false },
  { key: 'grossSales', label: 'Gross Sales', type: 'money', ratio: null, major: true },
  { key: 'totalMinorations', label: 'Total Minorations', type: 'money', ratio: 'totalMinorationsPct', major: true },
  { key: 'netSales', label: 'CONSO Net Sales', type: 'money', ratio: null, major: true },
  { key: 'grossMargin', label: 'Gross Margin', type: 'money', ratio: 'grossMarginPct', major: true },
  { key: 'customerContribution', label: 'Customer Contribution', type: 'money', ratio: 'customerContributionPct', major: true }
];
function snapshotCell(value, type) {
  if (!Number.isFinite(value)) return '—';
  if (type === 'count') return formatInt(value);
  if (type === 'money') return formatKrmb(value);
  return formatPct(value);
}
function snapshotVariancePct(current, comparison) {
  if (!Number.isFinite(current) || !Number.isFinite(comparison) || Math.abs(comparison) < 1e-9) return '—';
  const rel = (current - comparison) / comparison;
  return `${rel >= 0 ? '+' : ''}${(rel * 100).toFixed(1)}%`;
}
function renderPnlSnapshot(metrics) {
  const md = state.model.metadata;
  $('snapshotSub').textContent = `Summary P&L · Actual Adj. · ${md.currentPeriodKey} vs ${md.comparisonPeriodKey}`;
  $('snapshotBody').innerHTML = SNAPSHOT_ROWS.map(row => {
    const current = metrics.current[row.key];
    const comparison = metrics.comparison[row.key];
    const variance = (Number.isFinite(current) && Number.isFinite(comparison)) ? current - comparison : null;
    const currentRatio = row.ratio ? metrics.current[row.ratio] : null;
    const comparisonRatio = row.ratio ? metrics.comparison[row.ratio] : null;
    const varianceCls = variance == null || Math.abs(variance) < 1e-9 ? '' : variance > 0 ? 'cell-positive' : 'cell-negative';
    return `<tr class="${row.major ? 'major' : ''}"><td>${esc(row.label)}</td><td>${snapshotCell(current, row.type)}</td><td>${snapshotCell(currentRatio, 'percent')}</td><td>${snapshotCell(comparison, row.type)}</td><td>${snapshotCell(comparisonRatio, 'percent')}</td><td class="${varianceCls}">${snapshotVariancePct(current, comparison)}</td></tr>`;
  }).join('');
}

function apInvestment(rows) { return Math.abs(sum(rows,'daCost')) + Math.abs(sum(rows,'specificAP')); }
function insightHtml(items) {
  if (!items.length) return '<div class="empty-state">No material signals for the selected scope</div>';
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
function signalMovement(def, c, p) {
  const cur = c[def.key], cmp = p[def.key];
  if (!Number.isFinite(cur) || !Number.isFinite(cmp)) return null;
  const variance = cur - cmp;
  const magnitude = def.kind === 'money'
    ? (Math.abs(cmp) > 1e-9 ? variance / Math.abs(cmp) : null)
    : variance;
  if (!Number.isFinite(magnitude)) return null;
  return { ...def, variance, magnitude, favorable: magnitude >= 0 };
}
function describeMovement(m) {
  if (m.kind === 'money') {
    const pct = `${m.magnitude >= 0 ? '+' : ''}${(m.magnitude * 100).toFixed(1)}%`;
    return m.favorable
      ? { title: `${m.label} increased`, detail: `${m.label} rose ${pct} versus the comparison period.` }
      : { title: `${m.label} declined`, detail: `${m.label} fell ${pct} versus the comparison period.` };
  }
  const pp = `${m.magnitude >= 0 ? '+' : ''}${(m.magnitude * 100).toFixed(1)}pp`;
  if (m.key === 'totalMinorationsPct') {
    return m.favorable
      ? { title: 'Total Minorations narrowed', detail: `Total Minorations % narrowed ${pp}, easing commercial deductions against Gross Sales.` }
      : { title: 'Total Minorations deteriorated', detail: `Total Minorations % widened ${pp}, deepening commercial deductions against Gross Sales.` };
  }
  return m.favorable
    ? { title: `${m.label} improved`, detail: `${m.label} improved ${pp} versus the comparison period.` }
    : { title: `${m.label} declined`, detail: `${m.label} declined ${pp} versus the comparison period.` };
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
    title = 'Sales growth did not improve margin';
    detail = `Net Sales rose ${(m.magnitude * 100).toFixed(1)}% while the Gross Margin rate did not keep pace.`;
  } else if (m.material) {
    detail = describeMovement(m).detail;
    title = MATERIAL_TITLES[m.key] || describeMovement(m).title;
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
  const items = [{ tone: 'positive', title: 'Portfolio performance remained broadly stable', detail: 'No major movement across core P&L indicators versus the comparison period.' }];
  if (largest) {
    const d = describeMovement(largest);
    const item = { tone: largest.favorable ? 'positive' : 'warning', title: `${largest.label} showed the largest movement`, detail: d.detail };
    if (largest.drill) { item.action = 'variance'; item.metric = largest.drill; }
    items.push(item);
  }
  return items;
}
function renderOverviewInsights(metrics) {
  if (!metrics) return;
  const c = metrics.current, p = metrics.comparison;
  if (!Number.isFinite(p.netSales)) {
    $('overviewInsights').innerHTML = insightHtml([{ title: 'Comparison period unavailable', detail: 'Prior-year same-period data is required for variance signals.' }]);
    return;
  }
  const movements = SIGNAL_METRICS.map(def => signalMovement(def, c, p)).filter(Boolean);
  if (!movements.length) {
    $('overviewInsights').innerHTML = insightHtml([{ title: 'No comparable stores in scope', detail: 'The current filters return no comparison-period stores, so no movement signals can be derived.' }]);
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

const VARIANCE_KPIS = Object.freeze({
  minorations: { apiMetric: 'totalMinorations' },
  grossMargin: { apiMetric: 'grossMargin' },
  contribution: { apiMetric: 'customerContribution' }
});
const VARIANCE_KPI_ALIASES = Object.freeze({
  minorations: 'minorations',
  totalMinorations: 'minorations',
  grossMargin: 'grossMargin',
  contribution: 'contribution',
  customerContribution: 'contribution'
});

function selectVarianceKpi(value) {
  const selected = VARIANCE_KPI_ALIASES[value] || 'grossMargin';
  state.selectedVarianceKpi = selected;
  setSegment('varianceMetric', selected);
}

function variancePercent(current, comparison) {
  return Math.abs(comparison) > 1e-9 ? (current - comparison) / Math.abs(comparison) : NaN;
}

function varianceScopeLabel(bridge) {
  return bridge.mode === 'filtered' ? 'Filtered Portfolio' : 'Total Portfolio';
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
    label: `${periodLabel('comparison')} ${bridge.label}`,
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
      label: driver.label,
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
    label: `${periodLabel('current')} ${bridge.label}`,
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
  selectVarianceKpi(state.selectedVarianceKpi);
  if (!state.service) {
    $('bridgeTitle').textContent = 'P&L Variance Bridge';
    $('bridgeSub').textContent = 'Comparison to Current · Prior Year Same Period';
    $('bridgeReconcile').textContent = '—';
    $('bridgeReconcile').className = 'reconcile';
    $('varianceScopeStatus').className = 'scope-status';
    $('varianceScopeStatus').innerHTML = '<span class="scope-dot"></span><span>Total Portfolio</span>';
    $('driverTableBody').innerHTML = '';
    $('positiveDrivers').innerHTML = '';
    $('negativeDrivers').innerHTML = '';
    $('varianceInsights').innerHTML = '<div class="empty-state">No analysis available</div>';
    return;
  }
  const apiMetric = VARIANCE_KPIS[state.selectedVarianceKpi].apiMetric;
  const bridge = state.service.getBridgeData(apiMetric, activeFilters());
  renderBridge(bridge);
  renderDriverAnalysis(bridge);
  renderVarianceInsights(bridge);
}

function renderBridge(bridge) {
  const md = state.service.getMetadata();
  const scopeLabel = varianceScopeLabel(bridge);
  $('bridgeTitle').textContent = `${bridge.label} Variance Bridge`;
  $('bridgeSub').textContent = `${md.comparisonPeriodKey} to ${md.currentPeriodKey} · Prior Year Same Period`;
  $('varianceScopeStatus').className = `scope-status${bridge.mode === 'filtered' ? ' filtered' : ''}`;
  $('varianceScopeStatus').innerHTML = `<span class="scope-dot"></span><span>${scopeLabel}</span>`;

  if (bridge.error && bridge.error.code === 'BRIDGE_RECONCILIATION_ERROR') {
    $('bridgeReconcile').textContent = 'Reconciliation error';
    $('bridgeReconcile').className = 'reconcile bad';
    disposeChart('bridgeChart');
    $('bridgeChart').innerHTML = '<div class="bridge-error"><strong>Selected filtered portfolio does not fully reconcile at detail level.</strong><span>Adjust the filters or check the underlying detail data before using this Bridge.</span></div>';
    return;
  }

  $('bridgeReconcile').textContent = 'Reconciled';
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
    ...chartNavigation(),
    grid: { left: 72, right: 22, top: 38, bottom: 112 },
    tooltip: { ...tooltipStyle(), trigger: 'item', formatter: params => { const item = items[params.dataIndex]; const base = `<b>${esc(item.label)}</b><br>${item.type === 'anchor' ? 'Balance' : 'P&L impact'}: ${formatBridgeMoney(item.raw, item.type !== 'anchor')}`; return item.type !== 'anchor' && item.field ? `${base}<br>Click to view store impact` : base; } },
    xAxis: { type: 'category', data: items.map(item => item.label), axisTick: { show: false }, axisLine: { lineStyle: { color: THEME.axis } }, axisLabel: { interval: 0, rotate: 24, margin: 15, color: THEME.muted, fontSize: 8, lineHeight: 11, formatter: wrapBridgeLabel } },
    yAxis: { type: 'value', min: yMin, max: yMax, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: THEME.muted, fontSize: 9, formatter: formatBridgeAxis }, splitLine: { lineStyle: { color: THEME.grid } } },
    series: [{
      name: 'Variance Bridge',
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
  const totalVariance = bridge.current - bridge.comparison;
  $('driverTitle').textContent = `${bridge.label} Driver Analysis`;
  $('driverTableBody').innerHTML = bridge.drivers.map(driver => {
    const pct = variancePercent(driver.current, driver.comparison);
    const contribution = Math.abs(totalVariance) > 1e-9 ? driver.variance / totalVariance : NaN;
    const tone = driver.variance > 0 ? 'cell-positive' : driver.variance < 0 ? 'cell-negative' : '';
    return `<tr data-driver="${esc(driver.field)}"><td><span class="driver-name"><i></i>${esc(driver.label)}</span></td><td>${formatKrmb(driver.current)}</td><td>${formatKrmb(driver.comparison)}</td><td class="${tone}">${Number.isFinite(pct) ? `${pct >= 0 ? '+' : ''}${formatPct(pct)}` : '—'}</td><td>${Number.isFinite(contribution) ? formatPct(contribution) : '—'}</td><td class="row-action">›</td></tr>`;
  }).join('') || '<tr><td colspan="6">No mapped drivers</td></tr>';
  const positive = bridge.drivers.filter(driver => driver.variance > 0).sort((a,b)=>b.variance-a.variance).slice(0,4);
  const negative = bridge.drivers.filter(driver => driver.variance < 0).sort((a,b)=>a.variance-b.variance).slice(0,4);
  $('positiveDrivers').innerHTML = rankDriverHtml(positive, 'positive');
  $('negativeDrivers').innerHTML = rankDriverHtml(negative, 'negative');
}

function rankDriverHtml(rows,tone) {
  if (!rows.length) return '<div class="empty-state">No material drivers</div>';
  return rows.map((row,index)=>`<button class="rank-row" type="button" data-driver="${esc(row.field)}"><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(row.label)}</strong><em class="${tone==='positive'?'cell-positive':'cell-negative'}">${formatSignedMoney(row.variance)}</em></button>`).join('');
}

function renderVarianceInsights(bridge) {
  const md = state.service.getMetadata();
  const variance = bridge.current - bridge.comparison;
  const pct = variancePercent(bridge.current, bridge.comparison);
  const positive = bridge.drivers.filter(driver => driver.variance > 0).sort((a,b)=>b.variance-a.variance)[0];
  const negative = bridge.drivers.filter(driver => driver.variance < 0).sort((a,b)=>a.variance-b.variance)[0];
  $('varianceInsightSub').textContent = `${bridge.label} · ${md.currentPeriodKey} vs ${md.comparisonPeriodKey}`;
  const summary = `<div class="variance-summary"><div class="summary-kpi"><span>Selected KPI</span><strong>${esc(bridge.label)}</strong></div><div><span>${periodLabel('current')}</span><strong>${formatMoney(bridge.current)}</strong></div><div><span>${periodLabel('comparison')}</span><strong>${formatMoney(bridge.comparison)}</strong></div><div><span>Variance</span><strong class="${variance>0?'cell-positive':variance<0?'cell-negative':''}">${formatSignedMoney(variance)}</strong></div><div><span>Variance %</span><strong>${Number.isFinite(pct)?`${pct>=0?'+':''}${formatPct(pct)}`:'—'}</strong></div></div>`;
  const items = [];
  if (bridge.error) items.push({tone:'warning',title:'Detail-level reconciliation requires attention',detail:'The selected filtered slice is not safe to present as a reconciled Bridge.'});
  if (positive) items.push({tone:'positive',title:`Largest positive driver: ${positive.label}`,detail:`${formatSignedMoney(positive.variance)} P&L line contribution.`,action:'portfolio',driver:positive.field});
  if (negative) items.push({tone:'warning',title:`Largest negative driver: ${negative.label}`,detail:`${formatSignedMoney(negative.variance)} P&L line contribution.`,action:'portfolio',driver:negative.field});
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
  $('rankingNote').textContent = `Ranked by ${RANKING_METRICS[state.portfolioMetric].label} · Current vs Comparison`;
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
    ? 'Store Variance Ranking · Current vs Comparison'
    : 'Store Productivity · Customer Contribution × Gross Margin';
  if (inRanking) renderStoreRanking();
  else renderBubble();
}
function renderPortfolioEmpty() {
  $('tierSummary').innerHTML = '';
  $('positiveStores').innerHTML = '';
  $('negativeStores').innerHTML = '';
  $('portfolioContext').textContent = 'Current portfolio view';
  const c = chart('bubbleChart');
  c.clear();
}
function searchHit(store) { const text = state.search.trim().toLowerCase(); return text && (store.store.toLowerCase().includes(text) || store.terminal.toLowerCase().includes(text)); }
function pointOpacity(store) { return state.search ? (searchHit(store) ? 1 : .08) : .68; }
function pointColor(store) { return store.terminal === state.selectedStore || searchHit(store) ? THEME.gold : THEME.blue; }
function bubbleTooltip(store) {
  return `<b>${esc(store.store)}</b><br>${esc(store.city)} · ${esc(store.region)}<br>Status: ${esc(store.status)} · Tier: ${esc(store.productivityTier)}<br>Store Productivity: ${formatMoney(store.storeProductivity)}<br>POS no.: ${formatInt(store.cityPosNo)}<br>Gross Margin: ${formatMoney(store.metrics.grossMargin)} (${formatPct(store.metrics.grossMarginPct)})<br>Customer Contribution: ${formatMoney(store.metrics.customerContribution)} (${formatPct(store.metrics.customerContributionPct)})`;
}
function renderTierSummary(stores, role) {
  const el = $('tierSummary');
  if (!el) return;
  const n = stores.length;
  if (!n) { el.innerHTML = `<span class="tier-summary-label">${periodLabel(role)}</span><span>No stores in scope</span>`; return; }
  const netSales = stores.reduce((a, s) => a + s.metrics.netSales, 0);
  const grossMargin = stores.reduce((a, s) => a + s.metrics.grossMargin, 0);
  const contribution = stores.reduce((a, s) => a + s.metrics.customerContribution, 0);
  const avgProd = stores.reduce((a, s) => a + (s.storeProductivity || 0), 0) / n;
  const posCount = stores.reduce((a, s) => a + (Number(s.cityPosNo) || 0), 0);
  const gmPct = netSales ? grossMargin / netSales : null;
  const ccPct = netSales ? contribution / netSales : null;
  el.innerHTML = `<span class="tier-summary-label">${periodLabel(role)}</span><span><b>${n}</b> Stores</span><span><b>${posCount}</b> POS</span><span>Avg Gross Margin <b>${gmPct != null ? formatPct(gmPct) : '—'}</b></span><span>Avg Customer Contribution <b>${ccPct != null ? formatPct(ccPct) : '—'}</b></span><span>Avg Store Productivity <b>${formatMoney(avgProd)}</b></span>`;
}
function bindStoreClick(c) { c.off('click'); c.on('click', params => { if (params.data?.store) openStoreDetail(params.data.store.terminal); }); }
function renderBubble() {
  // Productivity Bubble 使用独立的 store dataset（Current/Comparison role + 正常页面 filters），
  // 不消费 selectedDriver / portfolioMetric —— 02 带来的 Driver context 只属于 Store Variance Ranking。
  const role = state.snapshot === 'comparison' ? 'comparison' : 'current';
  const stores = portfolioStores(role);
  const c = chart('bubbleChart');
  renderTierSummary(stores, role);
  if (!stores.length) { c.clear(); return; }
  const prodValues = stores.map(s => s.storeProductivity).filter(Number.isFinite);
  const pMin = prodValues.length ? Math.min(...prodValues) : 0;
  const pMax = prodValues.length ? Math.max(...prodValues) : 1;
  const size = value => 10 + 31 * Math.sqrt(Math.max(0, (value - pMin) / (pMax - pMin || 1)));
  const data = stores.map(store => ({
    value: [store.metrics.customerContribution, store.metrics.grossMargin],
    store,
    symbolSize: size(store.storeProductivity),
    itemStyle: { color: pointColor(store), opacity: Math.min(.7, pointOpacity(store)), borderColor: store.terminal === state.selectedStore ? THEME.goldDark : '#fff', borderWidth: store.terminal === state.selectedStore ? 2 : 1 }
  }));
  c.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:78,right:30,top:35,bottom:60},tooltip:{...tooltipStyle(),trigger:'item',formatter:p=>bubbleTooltip(p.data.store)},xAxis:{type:'value',scale:true,name:'Customer Contribution',nameLocation:'middle',nameGap:40,nameTextStyle:{color:THEME.muted,fontSize:9},axisLine:{lineStyle:{color:THEME.axis}},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},yAxis:{type:'value',scale:true,name:'Gross Margin',nameLocation:'middle',nameGap:58,nameTextStyle:{color:THEME.muted,fontSize:9},axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},series:[{type:'scatter',data,emphasis:{scale:1.16,itemStyle:{opacity:1}}}]},{notMerge:true});
  bindStoreClick(c);
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
  if (!rows.length) return '<div class="empty-state">No stores in this direction</div>';
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
  if (!stores.length) { $('detailStoreSelect').innerHTML = '<option>No data</option>'; return; }
  if (!stores.some(s => s.terminal === state.selectedStore)) state.selectedStore = stores[0].terminal;
  $('detailStoreSelect').innerHTML = stores.slice().sort((a, b) => a.store.localeCompare(b.store, 'zh-CN'))
    .map(s => `<option value="${esc(s.terminal)}"${s.terminal === state.selectedStore ? ' selected' : ''}>${esc(s.store)} · ${esc(s.terminal)}</option>`).join('');
}
function openStoreDetail(terminal) { state.selectedStore = terminal; switchTab('detail'); }
function apComponentValue(store, key) {
  if (!store) return 0;
  if (key === 'posAdvertising') return Math.abs(store.pnl.posAdvertisingExpense || 0) + Math.abs(store.pnl.posAdvertisingAmortization || 0);
  return Math.abs(store.pnl[key] || 0);
}
function apExpense(store) {
  if (!store) return NaN;
  return STORE_AP_COMPONENTS.reduce((sum, comp) => sum + apComponentValue(store, comp.key), 0);
}
function storeKpiValue(store, key) {
  if (!store) return NaN;
  if (key === 'caNetPctOfGs') {
    const gs = store.metrics.grossSales;
    return gs ? store.metrics.netSales / gs : NaN;
  }
  const value = store.metrics[key];
  return Number.isFinite(value) ? value : NaN;
}
function storeKpiCard(def, current, ly) {
  const cv = storeKpiValue(current, def.key);
  const lv = storeKpiValue(ly, def.key);
  const hasLy = Number.isFinite(lv);
  let cls = 'neutral', changeCls = 'flat', compareHtml;
  if (def.type === 'percent') {
    const pp = hasLy && Number.isFinite(cv) ? cv - lv : NaN;
    cls = Number.isFinite(pp) && Math.abs(pp) > 1e-9 ? (pp > 0 ? 'favorable' : 'adverse') : 'neutral';
    changeCls = cls === 'favorable' ? 'good' : cls === 'adverse' ? 'bad' : 'flat';
    compareHtml = `<span>${periodLabel('comparison')}</span><strong>${formatPct(lv)}</strong><span>pp change</span><strong class="${changeCls}">${formatPp(pp)}</strong>`;
  } else {
    const variance = hasLy && Math.abs(lv) > 1e-9 && Number.isFinite(cv) ? (cv - lv) / Math.abs(lv) : NaN;
    cls = Number.isFinite(variance) && Math.abs(variance) > 1e-9 ? (variance > 0 ? 'favorable' : 'adverse') : 'neutral';
    changeCls = cls === 'favorable' ? 'good' : cls === 'adverse' ? 'bad' : 'flat';
    compareHtml = `<span>${periodLabel('comparison')}</span><strong>${formatMoney(lv)}</strong><span>Variance</span><strong class="${changeCls}">${Number.isFinite(variance) ? `${variance >= 0 ? '+' : ''}${formatPct(variance)}` : '—'}</strong>`;
  }
  return `<article class="kpi-card ${cls}"><div class="kpi-label-row"><span class="kpi-label">${esc(def.label)}</span></div><div class="kpi-current">${def.type === 'percent' ? formatPct(cv) : formatMoney(cv)}</div><div class="kpi-compare">${compareHtml}</div></article>`;
}
function renderStoreHeader(store, hasComparison) {
  const el = $('storeHeader');
  if (!el) return;
  const items = [
    ['City', store.city],
    ['Region', store.region],
    ['Status', store.status],
    ['Tier', store.productivityTier],
    ['Store Productivity', formatMoney(store.storeProductivity)],
    ['POS no.', formatInt(store.cityPosNo)]
  ];
  if (!hasComparison) items.push(['Comparison', 'No prior-year record']);
  el.innerHTML = items.map(([label, value]) => `<div class="sh-item"><span class="sh-label">${esc(label)}</span><span class="sh-value">${esc(value)}</span></div>`).join('');
  el.hidden = false;
}
function renderDetail() {
  ensureSelectedStore();
  const { current, comparison } = findDetailStore();
  if (!current) {
    $('detailTitle').textContent = 'No store selected';
    $('detailMeta').textContent = 'Select a store from the Store Portfolio to review';
    $('storeHeader').hidden = true;
    $('storeKpis').innerHTML = '';
    $('storePnlBody').innerHTML = '';
    $('storeInsights').innerHTML = '<div class="empty-state">No store selected</div>';
    $('storeReconcile').textContent = '—';
    ['apComparisonChart', 'apWaterfallChart'].forEach(id => { const c = chart(id); if (c) c.clear(); });
    $('apReconcile').textContent = '—';
    return;
  }
  $('detailStoreSelect').value = state.selectedStore;
  $('detailTitle').textContent = current.store;
  $('detailMeta').textContent = `${current.city} · ${current.region} · ${current.terminal}`;
  renderStoreHeader(current, Boolean(comparison));
  $('storeKpis').innerHTML = STORE_KPIS.map(def => storeKpiCard(def, current, comparison)).join('');
  renderStorePnl(current, comparison);
  renderStoreInsights(current, comparison);
  renderApCharts(current, comparison);
}
function renderStorePnl(current, ly) {
  const netSales = current.metrics.netSales;
  const lyNetSales = ly ? ly.metrics.netSales : NaN;
  $('storePnlBody').innerHTML = STORE_PNL_LINES.map(line => {
    const cv = Number(current.pnl[line.field]) || 0;
    const lv = ly ? (Number(ly.pnl[line.field]) || 0) : NaN;
    const hasLy = Number.isFinite(lv);
    const curShare = netSales ? cv / netSales : NaN;
    const lyShare = Number.isFinite(lyNetSales) && lyNetSales ? lv / lyNetSales : NaN;
    const variance = hasLy && Math.abs(lv) > 1e-9 ? (cv - lv) / Math.abs(lv) : NaN;
    const vCls = Number.isFinite(variance) && Math.abs(variance) > 1e-9 ? (variance > 0 ? 'cell-positive' : 'cell-negative') : '';
    return `<tr class="${line.className || ''}"><td class="${line.indent ? `indent-${line.indent}` : ''}">${esc(line.label)}</td><td>${formatKrmb(cv)}</td><td>${Number.isFinite(curShare) ? formatPct(curShare) : '—'}</td><td>${hasLy ? formatKrmb(lv) : '—'}</td><td>${Number.isFinite(lyShare) ? formatPct(lyShare) : '—'}</td><td class="${vCls}">${Number.isFinite(variance) ? `${variance >= 0 ? '+' : ''}${formatPct(variance)}` : '—'}</td></tr>`;
  }).join('');
  $('storeReconcile').textContent = state.model ? state.model.metadata.reviewPeriod : '—';
  $('storeReconcile').className = 'reconcile';
}
function renderStoreInsights(current, ly) {
  const c = current.metrics;
  if (!ly) {
    $('storeInsights').innerHTML = insightHtml([{ title: 'New Store · No Prior-Year Comparison', detail: 'This store has no prior-year same-period record. Current-only values are shown; comparison columns display —.' }]);
    return;
  }
  const l = ly.metrics;
  const nsVariance = Math.abs(l.netSales) > 1e-9 ? (c.netSales - l.netSales) / Math.abs(l.netSales) : NaN;
  const gmPp = c.grossMarginPct - l.grossMarginPct;
  const ccPp = c.customerContributionPct - l.customerContributionPct;
  const apCur = apExpense(current), apLy = apExpense(ly);
  const apVariance = Math.abs(apLy) > 1e-9 ? (apCur - apLy) / Math.abs(apLy) : NaN;
  const items = [];
  items.push({ tone: nsVariance >= 0 ? 'positive' : 'warning', title: `Net Sales ${nsVariance >= 0 ? 'increased' : 'decreased'} ${Number.isFinite(nsVariance) ? `${nsVariance >= 0 ? '+' : ''}${formatPct(nsVariance)}` : ''}`, detail: `${formatMoney(c.netSales)} current versus ${formatMoney(l.netSales)} comparison.` });
  if (Math.abs(gmPp) >= 0.01) items.push({ tone: gmPp > 0 ? 'positive' : 'warning', title: `Gross Margin rate changed ${formatPp(gmPp)}`, detail: `Current ${formatPct(c.grossMarginPct)} versus ${formatPct(l.grossMarginPct)}.` });
  if (Math.abs(ccPp) >= 0.01) items.push({ tone: ccPp > 0 ? 'positive' : 'warning', title: `Customer Contribution rate changed ${formatPp(ccPp)}`, detail: `Current ${formatPct(c.customerContributionPct)} versus ${formatPct(l.customerContributionPct)}.` });
  if (Number.isFinite(apVariance) && Math.abs(apVariance) >= 0.1) items.push({ tone: apVariance > 0 ? 'warning' : 'positive', title: `A&P expense ${apVariance > 0 ? 'increased' : 'decreased'} ${formatPct(apVariance)}`, detail: `Current ${formatMoney(apCur)} versus ${formatMoney(apLy)}.` });
  if (!items.length) items.push({ tone: 'positive', title: 'No material store-level movement', detail: 'Key figures remained broadly stable versus the comparison period.' });
  $('storeInsights').innerHTML = insightHtml(items);
}
function periodLabel(role) {
  if (state.model) return role === 'comparison' ? state.model.metadata.comparisonPeriodKey : state.model.metadata.currentPeriodKey;
  return role === 'comparison' ? 'Comparison' : 'Current';
}
function applyPeriodLabels() {
  document.querySelectorAll('[data-period-role]').forEach(el => {
    el.textContent = periodLabel(el.dataset.periodRole);
  });
}
function renderApCharts(current, ly) {
  const labels = STORE_AP_COMPONENTS.map(comp => comp.label);
  const currentValues = STORE_AP_COMPONENTS.map(comp => apComponentValue(current, comp.key));
  const lyValues = STORE_AP_COMPONENTS.map(comp => apComponentValue(ly, comp.key));
  const comparisonChart = chart('apComparisonChart');
  comparisonChart.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:150,right:25,top:30,bottom:42},legend:{top:0,right:82,textStyle:{color:THEME.muted,fontSize:9}},tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>`<b>${esc(params[0].name)}</b><br>${params.map(p=>`${esc(p.seriesName)}: ${formatMoney(p.value)}`).join('<br>')}`},xAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},yAxis:{type:'category',inverse:true,data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8.5}},series:[{name:periodLabel('current'),type:'bar',data:currentValues,barMaxWidth:12,itemStyle:{color:THEME.blue,borderRadius:[0,3,3,0]}},{name:periodLabel('comparison'),type:'bar',data:lyValues,barMaxWidth:12,itemStyle:{color:THEME.gold,borderRadius:[0,3,3,0]}}]},{notMerge:true});
  const waterfall = chart('apWaterfallChart');
  if (!ly) { waterfall.clear(); $('apReconcile').textContent = 'No comparison'; $('apReconcile').className = 'reconcile bad'; return; }
  const lyTotal = lyValues.reduce((s, v) => s + v, 0), currentTotal = currentValues.reduce((s, v) => s + v, 0), deltas = currentValues.map((v, i) => v - lyValues[i]);
  const names = [`${periodLabel('comparison')} Total`, ...labels, `${periodLabel('current')} Total`];
  const base = [], values = [], raw = [], types = []; let run = lyTotal; base.push(0); values.push(lyTotal); raw.push(lyTotal); types.push('anchor');
  deltas.forEach(delta => { if (delta >= 0) { base.push(run); values.push(delta); } else { base.push(run + delta); values.push(Math.abs(delta)); } raw.push(delta); types.push(delta >= 0 ? 'increase' : 'decrease'); run += delta; });
  base.push(0); values.push(currentTotal); raw.push(currentTotal); types.push('anchor');
  const diff = lyTotal + deltas.reduce((s, v) => s + v, 0) - currentTotal;
  $('apReconcile').textContent = Math.abs(diff) < .05 ? 'Reconciled' : `Variance ${formatKrmb(diff)} KRMB`; $('apReconcile').className = `reconcile ${Math.abs(diff) < .05 ? '' : 'bad'}`;
  waterfall.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:64,right:20,top:28,bottom:100},tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>{const i=params[0].dataIndex;return `<b>${esc(names[i])}</b><br>${types[i]==='anchor'?'Total expense':'Expense change'}: ${types[i]==='anchor'?formatMoney(raw[i]):formatSignedMoney(raw[i])}`;}},xAxis:{type:'category',data:names,axisTick:{show:false},axisLine:{lineStyle:{color:THEME.axis}},axisLabel:{interval:0,rotate:38,color:THEME.muted,fontSize:8}},yAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},series:[{type:'bar',stack:'ap',data:base,itemStyle:{color:'transparent'},silent:true},{type:'bar',stack:'ap',barMaxWidth:35,data:values.map((value,i)=>({value,itemStyle:{color:types[i]==='anchor'?THEME.navy:types[i]==='increase'?THEME.orange:THEME.green,borderRadius:[3,3,0,0]}})),label:{show:true,position:'top',color:THEME.muted,fontSize:8,formatter:p=>types[p.dataIndex]==='anchor'?formatMoney(raw[p.dataIndex]):formatSignedMoney(raw[p.dataIndex])}}]},{notMerge:true});
}

function renderFooter() {
  if (!state.model) return;
  const md = state.model.metadata;
  const currentStores = state.model.detail.current.stores.length;
  const comparisonStores = state.model.detail.comparison.stores.length;
  $('footerMeta').textContent = `${currentStores} current stores · ${comparisonStores} comparison stores · ${md.reviewPeriod} · Source unit KRMB · Data held in browser memory only`;
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
function switchTab(tab) {
  state.activeTab=tab;
  document.querySelectorAll('.rail-link').forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===tab));
  renderActiveTab(); window.scrollTo({top:0,behavior:'smooth'});
}
function setSegment(containerId,value) { document.querySelectorAll(`#${containerId} button[data-value]`).forEach(button=>button.classList.toggle('active',button.dataset.value===value)); }

function clearData() {
  state.book=null; state.model=null; state.service=null;
  state.fileName=''; state.sheetName=''; state.headerRow=0; state.headers=[]; state.matrix=[]; state.mapping={}; state.signature='';
  state.records=[]; state.periods=[]; state.currentPeriodKey=''; state.filters={}; state.selectedStore=''; state.selectedDriver=''; state.search=''; state.warnings=[]; state.dataStats=null;
  Object.values(state.charts).forEach(c=>c.dispose()); state.charts={};
  ['bridgeChart','bubbleChart','apComparisonChart','apWaterfallChart'].forEach(id=>{$(id).innerHTML='<div class="chart-empty">Upload a workbook to view analysis</div>';});
  ['primaryKpis','secondaryKpis','storeKpis','driverTableBody','storePnlBody','positiveDrivers','negativeDrivers','positiveStores','negativeStores'].forEach(id=>{$(id).innerHTML='';});
  $('snapshotBody').innerHTML='<tr><td colspan="6">Upload a workbook to view the P&L snapshot</td></tr>';
  $('overviewInsights').innerHTML='<div class="empty-state">No analysis available</div>';
  $('varianceInsights').innerHTML='<div class="empty-state">No analysis available</div>';
  $('storeInsights').innerHTML='<div class="empty-state">No store selected</div>';
  $('detailTitle').textContent='Select a store to review';$('detailMeta').textContent='Current versus comparison period';
  $('storeHeader').hidden = true;
  $('reviewPeriodValue').textContent='—';
  $('periodSummary').innerHTML='<span>Current</span><strong>—</strong><i>vs</i><span>Comparison</span><strong>—</strong>';
  applyPeriodLabels();
  $('footerMeta').textContent='Files are processed locally and are not transmitted to an external server';
  $('tierSummary').innerHTML='';$('bridgeReconcile').textContent='—';$('apReconcile').textContent='—';$('storeReconcile').textContent='—';
  $('storeSearch').value='';$('fileInput').value='';
  $('detailStoreSelect').innerHTML='<option>No data</option>';
  [['regionFilter','All Regions'],['cityFilter','All Cities'],['statusFilter','All Status'],['tierFilter','All Tiers']].forEach(([id,label])=>{$(id).innerHTML=`<option value="">${label}</option>`;});
  updateScopeStatus({ mode: 'total', label: 'Total Portfolio' });
  enableDashboard(false); setNotice('info','Data cleared from browser memory','No workbook values are retained by the dashboard. Field Mapping settings remain available locally.');
}
function saveMapping() {
  if(!state.book)return;
  state.mapping=mappingFromUI(); const missing=validateMapping();
  if(missing.length){showMappingAlert('error',`Missing required field: ${missing.map(key=>FIELDS[key].label).join(', ')}`);return;}
  const store=readMappingStore();store[state.signature]=currentMappingNames();
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));showMappingAlert('success','Mapping saved locally. Workbook values were not stored.');}
  catch(_){showMappingAlert('error','This browser blocks localStorage for local files. Use Export Mapping instead.');}
}
function exportMapping() {
  if(!state.book)return;state.mapping=mappingFromUI();
  const payload={version:2,created:new Date().toISOString().slice(0,10),mapping:currentMappingNames()};
  const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));anchor.download='retail-dashboard-field-mapping.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
}
function importMappingFile(file) {
  const reader=new FileReader();reader.onload=()=>{try{const object=JSON.parse(reader.result),mapping=object.mapping||object;state.mapping=savedToIndexes(mapping,state.headers);renderMapping();showMappingAlert('success','Mapping imported. Click Apply & Load Data.');}catch(_){showMappingAlert('error','Invalid mapping JSON file.');}};reader.readAsText(file);
}

document.querySelectorAll('.rail-link').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
document.addEventListener('click',event=>{
  const kpi=event.target.closest('[data-kpi]'); if(kpi){selectVarianceKpi(kpi.dataset.kpi);switchTab('variance');return;}
  const driver=event.target.closest('[data-driver]'); if(driver){openDriverPortfolio(driver.dataset.driver);return;}
  const store=event.target.closest('[data-store]'); if(store){openStoreDetail(store.dataset.store);return;}
  const action=event.target.closest('[data-action]'); if(action){if(action.dataset.action==='variance'){selectVarianceKpi(action.dataset.metric);switchTab('variance');}else if(action.dataset.action==='portfolio'){openDriverPortfolio(action.dataset.driver||'');}}
});

document.querySelectorAll('#varianceMetric button[data-value]').forEach(button=>button.addEventListener('click',event=>{
  event.stopPropagation();
  selectVarianceKpi(button.dataset.value);
  renderVariance();
}));
$('portfolioView').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.portfolioView=button.dataset.value;setSegment('portfolioView',state.portfolioView);document.querySelectorAll('.portfolio-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.portfolioPanel===state.portfolioView));renderPortfolio();});
$('snapshotToggle').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.snapshot=button.dataset.value;setSegment('snapshotToggle',state.snapshot);renderPortfolio();});
$('storeSearch').addEventListener('input',event=>{state.search=event.target.value.trim().toLowerCase();if(state.portfolioView==='productivity')renderBubble();});
$('rankingMetric').addEventListener('change',event=>{setPortfolioMetric(event.target.value);renderStoreRanking();});
$('detailStoreSelect').addEventListener('change',event=>{state.selectedStore=event.target.value;renderDetail();});

$('regionFilter').addEventListener('change',()=>{refreshCityOptions();renderAll();});
$('statusFilter').addEventListener('change',()=>{refreshCityOptions();renderAll();});
$('tierFilter').addEventListener('change',()=>{refreshCityOptions();renderAll();});
$('cityFilter').addEventListener('change',()=>{renderAll();});
$('resetFiltersBtn').addEventListener('click',()=>{['regionFilter','cityFilter','statusFilter','tierFilter'].forEach(id=>$(id).value='');renderAll();});

const WORKBOOK_FILE_PATTERN=/\.(xlsx|xls|xlsm|csv)$/i;
function isWorkbookFile(file){return Boolean(file&&WORKBOOK_FILE_PATTERN.test(file.name||''));}
async function loadWorkbookFile(file){
  if(!isWorkbookFile(file)){setNotice('error','Unsupported file type','Use an .xlsx, .xls, .xlsm or .csv workbook.');return;}
  const dropZone=$('uploadDropZone');dropZone.classList.add('is-loading');dropZone.setAttribute('aria-busy','true');
  try{
    if(!window.XLSX||!window.echarts)throw new Error('Local libraries are missing. Keep the libs folder beside index.html.');
    if(!window.RetailDashboardData)throw new Error('Workbook data layer (RetailDashboardData) is missing.');
    setNotice('info','Reading workbook locally',file.name);
    state.book=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:true});
    state.model=window.RetailDashboardData.parseWorkbook(state.book,{XLSX:window.XLSX,fileName:file.name});
    state.service=window.RetailDashboardData.createDataService(state.model);
    initializeDataService(file.name);
  }
  catch(error){setNotice('error','Unable to load workbook',error.message);}
  finally{dropZone.classList.remove('is-loading','is-dragging');dropZone.removeAttribute('aria-busy');}
}

function initializeDataService(fileName) {
  state.fileName = fileName;
  state.filters = {};
  state.selectedStore = '';
  state.warnings = [];
  state.dataStats = {
    records: state.model.detail.current.stores.length + state.model.detail.comparison.stores.length,
    stores: state.model.detail.current.stores.length,
    periods: 1,
    tieErrorRows: 0,
    duplicateKeys: 0
  };
  populateGlobalFilters();
  enableDashboard(true);
  updatePeriodSummary();
  renderAll();
  const md = state.model.metadata;
  setNotice('success', `Loaded ${md.reviewPeriod} workbook locally`, `${md.currentPeriodKey} vs ${md.comparisonPeriodKey} · ${state.dataStats.stores} current stores · KRMB`);
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
  if(files.length!==1){setNotice('error','Drop one workbook at a time','Please drag a single Excel or CSV file into the upload area.');return;}
  await loadWorkbookFile(files[0]);
});
document.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files'))event.preventDefault();});
document.addEventListener('drop',event=>{if(Array.from(event.dataTransfer?.files||[]).length)event.preventDefault();});
$('settingsBtn').addEventListener('click',openSettings);$('clearBtn').addEventListener('click',clearData);
$('saveMappingBtn').addEventListener('click',saveMapping);$('exportMappingBtn').addEventListener('click',exportMapping);
$('importMappingBtn').addEventListener('click',()=>$('mappingFileInput').click());
$('mappingFileInput').addEventListener('change',event=>{if(event.target.files[0])importMappingFile(event.target.files[0]);event.target.value='';});
$('applyMappingBtn').addEventListener('click',()=>{if(!state.book){showMappingAlert('error','Upload a workbook first.');return;}state.mapping=mappingFromUI();buildRecords();});
$('sheetSelect').addEventListener('change',event=>{if(!state.book)return;state.sheetName=event.target.value;state.matrix=sheetMatrix(state.sheetName);const detected=detectHeader(state.matrix);state.headerRow=detected.row;state.headers=headersAt(state.matrix,state.headerRow);state.signature=schemaSignature(state.headers);state.mapping=autoMap(state.headers);renderSourceControls();renderMapping();showMappingAlert('success',`Detected header row ${state.headerRow+1}. Review mappings before applying.`);});
$('headerRow').addEventListener('change',event=>{if(!state.book)return;state.headerRow=Math.max(0,Number(event.target.value||1)-1);state.headers=headersAt(state.matrix,state.headerRow);state.signature=schemaSignature(state.headers);state.mapping=autoMap(state.headers);renderMapping();$('schemaMeta').textContent=`${state.headers.length} columns detected · ${state.fileName}`;});

window.addEventListener('resize',()=>Object.values(state.charts).forEach(c=>c.resize()));
window.addEventListener('pagehide',()=>{state.book=null;state.model=null;state.service=null;state.matrix=[];state.records=[];state.periods=[];state.headers=[];state.warnings=[];});
if(!window.XLSX||!window.echarts)setNotice('error','Local libraries could not load','Keep index.html, libs, js and assets in the same local folder.');
})();
