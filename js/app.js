(function () {
'use strict';

const $ = id => document.getElementById(id);
const UNIT_SCALE = 1000; // Workbook values are KRMB; reader-facing money is RMB.
const STORAGE_KEY = 'counter-dashboard-field-mappings-v2';
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

const DRIVER_SETS = {
  netSales: [
    ['grossSales','Gross Sales','income'], ['discount','Discount','expense'], ['rebates','Rebates','expense'],
    ['promotionalAllowance','Promotional Allowance','expense'], ['returns','Returns','expense'], ['oca','OCA','expense'], ['coupon','Coupon','expense']
  ],
  grossMargin: [
    ['netSales','Net Sales','income'], ['stdCos','Std COS','expense'], ['royal','Royal / TA / MS','expense'],
    ['specialOps','Special Operations Cost','expense'], ['obsolete','Obsolete / Slow Moving / Return','expense'], ['physicalDistribution','Physical Distribution','expense']
  ],
  contribution: [
    ['grossMargin','Gross Margin','income'], ['samples','Customer Samples','expense'], ['gifts','Promotional Gifts','expense'],
    ['animations','Animations','expense'], ['posAdvertising','POS Advertising','expense'], ['development','Specific Development','expense'],
    ['specificAP','Specific A&P','expense'], ['specificSga','Specific SG&A','expense']
  ],
  operatingProfit: [
    ['contribution','Customer Contribution','income'], ['nonSpecificCosts','Non-specific Costs','expense']
  ]
};
const DRIVER_META = {};
Object.values(DRIVER_SETS).flat().forEach(([fieldKey,label,kind]) => { DRIVER_META[fieldKey] = { field: fieldKey, label, kind }; });
Object.assign(DRIVER_META, {
  netSales: {field:'netSales',label:'Net Sales',kind:'income'}, grossMargin:{field:'grossMargin',label:'Gross Margin',kind:'income'},
  contribution:{field:'contribution',label:'Customer Contribution',kind:'income'}, operatingProfit:{field:'operatingProfit',label:'Operating Profit',kind:'income'}
});

const AP_COMPONENTS = [
  ['samples','Customer Samples'], ['gifts','Promotional Gifts'], ['animations','Animations'],
  ['posAdvertising','POS Advertising'], ['development','Specific Development'], ['specificAP','Specific A&P']
];

const PNL_LINES = [
  {field:'grossSales',label:'GROSS SALES',className:'major'},
  {field:'discount',label:'Discount',indent:1}, {field:'rebates',label:'Rebates',indent:1},
  {field:'promotionalAllowance',label:'Promotional Allowance',className:'total'},
  {field:'structuralOn',label:'Structural Conditions On',indent:2}, {field:'structuralOff',label:'Structural Conditions Off',indent:2},
  {field:'activeSupport',label:'Active Support',indent:2}, {field:'shopperInvestment',label:'Shopper Investment',indent:2},
  {field:'promoInvoice',label:'Promo Allow On Invoice',indent:2}, {field:'promoSeparate',label:'Promo Allow Applied Separately',indent:2},
  {field:'promoLoyalty',label:'Promo Allow Loyalty',indent:2}, {field:'returns',label:'Returns',indent:1},
  {field:'oca',label:'OCA',indent:1}, {field:'coupon',label:'Coupon',indent:1},
  {field:'minorations',label:'TOTAL MINORATIONS',className:'total'},
  {field:'netSales',label:'CONSO NET SALES',className:'major'},
  {field:'stdCos',label:'Std COS',indent:1}, {field:'royal',label:'Royal / TA / MS',indent:1},
  {field:'specialOps',label:'Special Operations Cost',indent:1}, {field:'obsolete',label:'Obsolete / Slow Moving / Return',indent:1},
  {field:'physicalDistribution',label:'Physical Distribution',indent:1}, {field:'costOfSales',label:'Cost of Sales',className:'total'},
  {field:'grossMargin',label:'GROSS MARGIN',className:'major'}, {metric:'grossMarginPct',label:'Gross Margin %',className:'group'},
  {field:'samples',label:'Customer Samples',indent:1}, {field:'gifts',label:'Promotional Gifts',indent:1},
  {field:'animations',label:'Animations',indent:1}, {field:'posAdvertising',label:'POS Advertising',className:'total'},
  {field:'posAdvAmort',label:'POS Advertising Amortization',indent:2}, {field:'posAdvOther',label:'Other POS Advertising',indent:2},
  {field:'development',label:'Specific Development',indent:1}, {field:'daCost',label:'DA Cost',className:'total'},
  {field:'specificAP',label:'Specific A&P',className:'group'}, {field:'specificSga',label:'Specific SG&A',className:'group'},
  {field:'contribution',label:'CUSTOMER CONTRIBUTION',className:'major'}, {metric:'contributionPct',label:'Customer Contribution %',className:'group'},
  {field:'nonSpecificCosts',label:'Non-specific Costs',className:'group'},
  {field:'operatingProfit',label:'OPERATING PROFIT',className:'major'}, {metric:'operatingMargin',label:'Operating Margin %',className:'group'}
];

const state = {
  book: null, fileName: '', sheetName: '', headerRow: 0, headers: [], matrix: [], mapping: {}, signature: '',
  records: [], periods: [], currentPeriodKey: '', comparisonMode: 'ly', filters: {}, activeTab: 'overview',
  timelineMetric: 'netSales', varianceMetric: 'operatingProfit', portfolioView: 'quadrants', snapshot: 'current',
  portfolioMetric: 'operatingProfit', selectedStore: '', search: '', charts: {}, warnings: [], dataStats: null
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
  refreshPeriodControls();
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
  return {region:$('regionFilter').value,city:$('cityFilter').value,channel:$('channelFilter').value,storeType:$('typeFilter').value,status:$('statusFilter').value};
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
function refreshPeriodControls() {
  const current = currentPeriod();
  const years = unique(state.periods.map(period => period.year)).sort((a,b)=>Number(a)-Number(b) || String(a).localeCompare(String(b)));
  $('yearSelect').innerHTML = years.map(year => `<option value="${esc(year)}"${year === current?.year ? ' selected' : ''}>${esc(year)}</option>`).join('');
  refreshReviewOptions(current?.reviewPeriod);
  $('comparisonSelect').value = state.comparisonMode;
  updatePeriodSummary();
}
function refreshReviewOptions(preferred) {
  const year = $('yearSelect').value || currentPeriod()?.year;
  const options = state.periods.filter(period => period.year === year).sort(periodSort);
  const target = options.find(period => period.reviewPeriod === preferred) || options.at(-1);
  $('reviewSelect').innerHTML = options.map(period => `<option value="${esc(period.key)}"${period.key === target?.key ? ' selected' : ''}>${esc(period.reviewPeriod)}</option>`).join('');
  if (target) state.currentPeriodKey = target.key;
}
function updatePeriodSummary() {
  const current = currentPeriod(), comparison = comparisonPeriod();
  $('periodSummary').innerHTML = `<span>Current</span><strong>${esc(current?.key || '—')}</strong><i>vs</i><span>${state.comparisonMode === 'ly' ? 'Last Year' : 'Previous'}</span><strong>${esc(comparison?.key || 'N/A')}</strong>`;
  const snapshotComparison = document.querySelector('#snapshotToggle [data-value="comparison"]');
  if (snapshotComparison) snapshotComparison.textContent = state.comparisonMode === 'ly' ? 'LY' : 'Previous';
}
function populateGlobalFilters() {
  setOptions('regionFilter',unique(state.records.map(r=>r.region)).sort(),'All Regions');
  setOptions('cityFilter',unique(state.records.map(r=>r.city)).sort((a,b)=>a.localeCompare(b,'zh-CN')),'All Cities');
  setOptions('channelFilter',unique(state.records.map(r=>r.channel)).sort(),'All Channels');
  setOptions('typeFilter',unique(state.records.map(r=>r.storeType)).sort(),'All Types');
  setOptions('statusFilter',unique(state.records.map(r=>r.status)).sort(),'All Status');
}
function enableDashboard(on) {
  $('contextBar').classList.toggle('is-disabled',!on);
  ['yearSelect','reviewSelect','comparisonSelect','regionFilter','cityFilter','channelFilter','typeFilter','statusFilter','resetFiltersBtn','storeSearch','rankingMetric','detailStoreSelect','clearBtn'].forEach(id => { $(id).disabled = !on; });
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

function renderOverview() {
  const {currentRows,comparisonRows} = scope();
  $('primaryKpis').innerHTML = ['netSales','grossMargin','contribution','operatingProfit'].map(key => kpiCardHtml(key,metricStats(key,currentRows,comparisonRows),true)).join('');
  $('secondaryKpis').innerHTML = ['grossMarginPct','contributionPct','operatingMargin','storeCount','posCount','avgSales'].map(key => kpiCardHtml(key,metricStats(key,currentRows,comparisonRows),Boolean(METRICS[key].drill))).join('');
  renderTimeline();
  renderOverviewInsights();
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
function renderTimeline() {
  const key = state.timelineMetric;
  const values = state.periods.map(period => metricValue(rowsForPeriod(period.key),key));
  const comparison = comparisonPeriod();
  $('timelineSub').textContent = `${METRICS[key].label} across ${state.periods.length} discrete review periods · ${currentPeriod()?.key || '—'} vs ${comparison?.key || 'N/A'}`;
  const c = chart('timelineChart');
  c.setOption({
    textStyle:baseText(), ...chartNavigation(), grid:{left:66,right:22,top:30,bottom:50},
    tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>{const p=params[0];return `<b>${esc(p.name)}</b><br>${esc(METRICS[key].label)}: ${formatMetric(p.value,key)}`;}},
    xAxis:{type:'category',data:state.periods.map(p=>p.key),axisTick:{show:false},axisLine:{lineStyle:{color:THEME.axis}},axisLabel:{color:THEME.muted,fontSize:10}},
    yAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:value=>formatMetric(value,key)},splitLine:{lineStyle:{color:THEME.grid}}},
    series:[{type:'bar',barMaxWidth:54,data:values.map((value,index)=>({value,itemStyle:{color:state.periods[index].key===state.currentPeriodKey?THEME.blue:state.periods[index].key===comparison?.key?THEME.gold:THEME.blueLight,borderColor:state.periods[index].key===comparison?.key?THEME.gold:'transparent',borderWidth:1,borderRadius:[4,4,0,0]}})),label:{show:true,position:'top',color:THEME.muted,fontSize:9,formatter:p=>formatMetric(p.value,key)}}]
  },{notMerge:true});
}

function apInvestment(rows) { return Math.abs(sum(rows,'daCost')) + Math.abs(sum(rows,'specificAP')); }
function storePairs(metricRef = state.portfolioMetric) {
  const {currentRows,comparisonRows} = scope();
  const currentMap = new Map(currentRows.map(record=>[record.terminal,record]));
  const comparisonMap = new Map(comparisonRows.map(record=>[record.terminal,record]));
  const ids = unique([...currentMap.keys(),...comparisonMap.keys()]);
  const meta = measureMeta(metricRef);
  return ids.map(id => {
    const current = currentMap.get(id), ly = comparisonMap.get(id);
    const rawCurrent = current ? finite(current[meta.field]) : 0, rawLy = ly ? finite(ly[meta.field]) : 0;
    const displayCurrent = meta.kind === 'expense' ? Math.abs(rawCurrent) : rawCurrent;
    const displayLy = meta.kind === 'expense' ? Math.abs(rawLy) : rawLy;
    return {id,current,ly,record:current||ly,displayCurrent,displayLy,displayDelta:displayCurrent-displayLy,impact:rawCurrent-rawLy,status:current&&ly?'Comparable':current?'New Store':'Missing Current'};
  });
}
function adverseConcentration(metricRef) {
  const adverse = storePairs(metricRef).filter(pair=>pair.impact<0).sort((a,b)=>a.impact-b.impact);
  const total = adverse.reduce((s,p)=>s+Math.abs(p.impact),0);
  return total ? adverse.slice(0,10).reduce((s,p)=>s+Math.abs(p.impact),0)/total : 0;
}
function insightHtml(items) {
  if (!items.length) return '<div class="empty-state">No material signals for the selected scope</div>';
  return items.map(item => {
    const tag = item.action ? 'button' : 'div';
    const attrs = item.action ? ` type="button" data-action="${item.action}"${item.metric?` data-metric="${item.metric}"`:''}${item.driver?` data-driver="${item.driver}"`:''}` : '';
    return `<${tag} class="insight-item ${item.tone || ''}"${attrs}><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></${tag}>`;
  }).join('');
}
function renderOverviewInsights() {
  const {currentRows,comparisonRows} = scope();
  if (!comparisonRows.length) { $('overviewInsights').innerHTML = insightHtml([{title:'Comparison period unavailable',detail:'Choose a review period with a matching LY or previous review.'}]); return; }
  const ns=metricStats('netSales',currentRows,comparisonRows), cc=metricStats('contribution',currentRows,comparisonRows), op=metricStats('operatingProfit',currentRows,comparisonRows), gm=metricStats('grossMarginPct',currentRows,comparisonRows);
  const apCur=apInvestment(currentRows), apLy=apInvestment(comparisonRows), apPct=apLy?(apCur-apLy)/apLy:0;
  const concentration=adverseConcentration('operatingProfit');
  const items=[];
  if (cc.pct < -.05) items.push({tone:'critical',title:'Customer Contribution decreased significantly',detail:`${formatMoney(cc.current)} versus ${formatMoney(cc.ly)} (${formatPct(cc.pct)} versus comparison).`,action:'variance',metric:'contribution'});
  if (ns.delta > 0 && op.delta < 0) items.push({tone:'warning',title:'Sales growth did not translate into profit growth',detail:`Net Sales ${formatPct(ns.pct)} while Operating Profit ${formatPct(op.pct)}.`,action:'variance',metric:'operatingProfit'});
  if (apPct > .15) items.push({tone:'warning',title:'Promotional investment increased significantly',detail:`DA Cost + Specific A&P increased ${formatPct(apPct)} to ${formatMoney(apCur)}.`,action:'variance',metric:'contribution'});
  if (gm.delta < -.02) items.push({tone:'warning',title:'Gross Margin rate compressed',detail:`Gross Margin % changed ${formatPp(gm.delta)} versus the comparison period.`,action:'variance',metric:'grossMargin'});
  if (concentration > .7) items.push({tone:'warning',title:'Adverse OP variance is highly concentrated',detail:`Top 10 stores account for ${formatPct(concentration)} of total adverse OP movement.`,action:'portfolio',metric:'operatingProfit'});
  if (!items.length) items.push({tone:'positive',title:'No material rule threshold was triggered',detail:'Review the KPI cards and driver analysis for smaller movements.'});
  $('overviewInsights').innerHTML = insightHtml(items.slice(0,5));
}

function driverDescriptor(fieldKey,label,kind) { return {field:fieldKey,label,kind}; }
function driverRows(metricKey) { return (DRIVER_SETS[metricKey] || []).map(item=>driverDescriptor(...item)); }
function driverStats(descriptor,currentRows,comparisonRows,totalDelta) {
  const rawCurrent=sum(currentRows,descriptor.field), rawLy=sum(comparisonRows,descriptor.field), impact=rawCurrent-rawLy;
  const current=descriptor.kind==='expense'?Math.abs(rawCurrent):rawCurrent, ly=descriptor.kind==='expense'?Math.abs(rawLy):rawLy;
  const delta=current-ly, pct=Math.abs(ly)>1e-9?delta/Math.abs(ly):NaN, share=Math.abs(totalDelta)>1e-9?impact/totalDelta:NaN;
  return {...descriptor,rawCurrent,rawLy,current,ly,delta,pct,impact,share};
}
function renderVariance() {
  renderBridge();
  renderDriverAnalysis();
  renderVarianceInsights();
}
function renderBridge() {
  const {currentRows,comparisonRows,currentPeriod:cp,comparisonPeriod:lp} = scope();
  const c = chart('bridgeChart');
  if (!comparisonRows.length) { c.clear(); $('bridgeReconcile').textContent='No comparison'; $('bridgeReconcile').className='reconcile bad'; return; }
  const start=sum(comparisonRows,'operatingProfit');
  const descriptors=[['netSales','Δ Net Sales'],['costOfSales','Δ Cost of Sales'],['daCost','Δ DA Cost'],['specificAP','Δ Specific A&P'],['specificSga','Δ Specific SG&A'],['nonSpecificCosts','Δ Non-specific Costs']];
  const changes=descriptors.map(([key,label])=>({key,label,delta:sum(currentRows,key)-sum(comparisonRows,key)}));
  const end=sum(currentRows,'operatingProfit'), reconciled=start+changes.reduce((s,d)=>s+d.delta,0), difference=reconciled-end;
  const labels=[`${lp?.key || 'LY'} OP`,...changes.map(d=>d.label),`${cp?.key || 'Current'} OP`];
  const base=[],values=[],raw=[],types=[]; let run=start; base.push(0);values.push(start);raw.push(start);types.push('anchor');
  for(const change of changes){if(change.delta>=0){base.push(run);values.push(change.delta);}else{base.push(run+change.delta);values.push(Math.abs(change.delta));}raw.push(change.delta);types.push(change.delta>=0?'positive':'negative');run+=change.delta;}
  base.push(0);values.push(end);raw.push(end);types.push('anchor');
  const path=[start]; let temp=start; changes.forEach(d=>{temp+=d.delta;path.push(temp)});path.push(end);
  const low=Math.min(...path), high=Math.max(...path), pad=Math.max((high-low)*.14,Math.abs(high)*.025,1);
  $('bridgeSub').textContent=`${lp?.key || 'N/A'} to ${cp?.key || 'N/A'} · additive P&L bridge · focused scale`;
  $('bridgeReconcile').textContent=Math.abs(difference)<.05?'Reconciled':`Variance ${formatKrmb(difference)} KRMB`;
  $('bridgeReconcile').className=`reconcile ${Math.abs(difference)<.05?'':'bad'}`;
  c.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:72,right:22,top:32,bottom:92},tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>{const i=params[0].dataIndex;return `<b>${esc(labels[i])}</b><br>${types[i]==='anchor'?'Balance':'P&L impact'}: ${types[i]==='anchor'?formatMoney(raw[i]):formatSignedMoney(raw[i])}`;}},xAxis:{type:'category',data:labels,axisTick:{show:false},axisLine:{lineStyle:{color:THEME.axis}},axisLabel:{interval:0,rotate:28,color:THEME.muted,fontSize:8.5}},yAxis:{type:'value',min:low-pad,max:high+pad,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},series:[{type:'bar',stack:'bridge',data:base,itemStyle:{color:'transparent'},silent:true},{type:'bar',stack:'bridge',barMaxWidth:44,data:values.map((value,i)=>({value,itemStyle:{color:types[i]==='anchor'?THEME.navy:types[i]==='positive'?THEME.blue:THEME.orange,borderRadius:[3,3,0,0]}})),label:{show:true,position:'top',color:THEME.muted,fontSize:8.5,formatter:p=>types[p.dataIndex]==='anchor'?formatMoney(raw[p.dataIndex]):formatSignedMoney(raw[p.dataIndex])}}]},{notMerge:true});
}
function renderDriverAnalysis() {
  const {currentRows,comparisonRows} = scope();
  const key=state.varianceMetric, totalDelta=metricValue(currentRows,key)-metricValue(comparisonRows,key);
  const rows=driverRows(key).map(d=>driverStats(d,currentRows,comparisonRows,totalDelta));
  $('driverTitle').textContent=`${METRICS[key].label} Driver Analysis`;
  $('driverTableBody').innerHTML=rows.map(row=>`<tr data-driver="${row.field}"><td><span class="driver-name"><i></i>${esc(row.label)}${row.kind==='expense'?' <small>(expense)</small>':''}</span></td><td>${formatKrmb(row.current)}</td><td>${comparisonRows.length?formatKrmb(row.ly):'—'}</td><td class="${row.impact>0?'cell-positive':row.impact<0?'cell-negative':''}">${comparisonRows.length?formatKrmb(row.impact):'—'}</td><td>${comparisonRows.length&&Number.isFinite(row.pct)?`${row.pct>=0?'+':''}${formatPct(row.pct)}`:'—'}</td><td>${comparisonRows.length&&Number.isFinite(row.share)?formatPct(row.share):'—'}</td><td class="row-action">›</td></tr>`).join('') || '<tr><td colspan="7">No mapped drivers</td></tr>';
  const positive=rows.filter(r=>r.impact>0).sort((a,b)=>b.impact-a.impact).slice(0,4), negative=rows.filter(r=>r.impact<0).sort((a,b)=>a.impact-b.impact).slice(0,4);
  $('positiveDrivers').innerHTML=rankDriverHtml(positive,'positive');
  $('negativeDrivers').innerHTML=rankDriverHtml(negative,'negative');
}
function rankDriverHtml(rows,tone) {
  if (!rows.length) return '<div class="empty-state">No material drivers</div>';
  return rows.map((row,index)=>`<button class="rank-row" type="button" data-driver="${row.field}"><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(row.label)}</strong><em class="${tone==='positive'?'cell-positive':'cell-negative'}">${formatSignedMoney(row.impact)}</em></button>`).join('');
}
function renderVarianceInsights() {
  const {currentRows,comparisonRows,currentPeriod:cp,comparisonPeriod:lp}=scope();
  const key=state.varianceMetric, stats=metricStats(key,currentRows,comparisonRows), rows=driverRows(key).map(d=>driverStats(d,currentRows,comparisonRows,stats.delta));
  const positive=rows.filter(r=>r.impact>0).sort((a,b)=>b.impact-a.impact)[0], negative=rows.filter(r=>r.impact<0).sort((a,b)=>a.impact-b.impact)[0];
  $('varianceInsightSub').textContent=`${METRICS[key].label} · ${cp?.key||'—'} vs ${lp?.key||'N/A'}`;
  const items=[];
  if (!comparisonRows.length) items.push({title:'Comparison period unavailable',detail:'Driver variance requires a matching comparison period.'});
  else {
    items.push({tone:stats.delta>=0?'positive':'critical',title:`${METRICS[key].label} changed ${formatSignedMoney(stats.delta)}`,detail:`${formatMetric(stats.current,key)} current versus ${formatMetric(stats.ly,key)} comparison.`});
    if (positive) items.push({tone:'positive',title:`Largest positive impact: ${positive.label}`,detail:`${formatSignedMoney(positive.impact)} P&L impact.`,action:'portfolio',driver:positive.field});
    if (negative) items.push({tone:'warning',title:`Largest negative impact: ${negative.label}`,detail:`${formatSignedMoney(negative.impact)} P&L impact.`,action:'portfolio',driver:negative.field});
  }
  $('varianceInsights').innerHTML=insightHtml(items);
}

function measureMeta(reference) {
  if (reference.startsWith('field:')) {
    const key=reference.slice(6), meta=DRIVER_META[key] || {field:key,label:FIELDS[key]?.label||key,kind:'income'};
    return {...meta,reference};
  }
  const core=DRIVER_META[reference] || {field:METRICS[reference]?.field||reference,label:METRICS[reference]?.label||reference,kind:'income'};
  return {...core,reference};
}
function setPortfolioMetric(reference) {
  state.portfolioMetric=reference;
  const select=$('rankingMetric'), meta=measureMeta(reference);
  if (![...select.options].some(option=>option.value===reference)) select.add(new Option(meta.label,reference));
  select.value=reference;
  $('portfolioContext').textContent=`Store-level ${meta.label} analysis · Current vs comparison`;
  $('rankingNote').textContent=`Ranked by ${meta.label} P&L impact`;
}
function renderPortfolio() {
  setPortfolioMetric(state.portfolioMetric);
  setSegment('portfolioView',state.portfolioView);
  document.querySelectorAll('.portfolio-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.portfolioPanel===state.portfolioView));
  const meta=measureMeta(state.portfolioMetric);
  $('portfolioContext').textContent=state.portfolioView==='concentration' ? `Store-level ${meta.label} variance · Current vs comparison` : state.portfolioView==='quadrants' ? `Portfolio position · selected driver context: ${meta.label}` : `Store productivity · selected driver context: ${meta.label}`;
  if (state.portfolioView==='quadrants') { renderScatter('ccChart','cc'); renderScatter('gmChart','gm'); }
  else if (state.portfolioView==='productivity') renderBubble();
  else renderConcentration();
}
function snapshotRows() {
  const s=scope(); return state.snapshot==='comparison'?s.comparisonRows:s.currentRows;
}
function median(values) { const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b),n=sorted.length; return n?n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2:0; }
function searchHit(record) { const text=state.search.trim().toLowerCase(); return text&&(record.store.toLowerCase().includes(text)||record.terminal.toLowerCase().includes(text)); }
function pointOpacity(record) { return state.search ? (searchHit(record)?1:.08) : .68; }
function pointColor(record) { return record.terminal===state.selectedStore||searchHit(record)?THEME.gold:THEME.blue; }
function portfolioTooltip(record,kind) {
  return `<b>${esc(record.store)}</b><br>${esc(record.city)} · ${esc(record.terminal)}<br>Period: ${esc(record.periodKey)}<br>POS: ${formatInt(record.pos)}<br>Net Sales: ${formatMoney(record.netSales)}<br>${kind==='cc'?`Customer Contribution: ${formatMoney(record.contribution)} (${formatPct(record.contributionPct)})`:`Gross Margin: ${formatMoney(record.grossMargin)} (${formatPct(record.grossMarginPct)})`}<br>Operating Profit: ${formatMoney(record.operatingProfit)}`;
}
function bindStoreClick(c) { c.off('click'); c.on('click',params=>{ if(params.data?.record) openStoreDetail(params.data.record.terminal); }); }
function renderScatter(id,kind) {
  const rows=snapshotRows(); const c=chart(id);
  if (!rows.length) { c.clear(); return; }
  const xKey=kind==='cc'?'contribution':'grossMarginPct', xm=median(rows.map(r=>r[xKey])), ym=median(rows.map(r=>r.netSales));
  $(kind==='cc'?'ccBench':'gmBench').innerHTML=`Median X <b>${kind==='cc'?formatMoney(xm):formatPct(xm)}</b><br>Median Sales <b>${formatMoney(ym)}</b>`;
  const data=rows.map(record=>({value:[record[xKey],record.netSales],record,itemStyle:{color:pointColor(record),opacity:pointOpacity(record),borderColor:record.terminal===state.selectedStore?THEME.goldDark:'#fff',borderWidth:record.terminal===state.selectedStore?2:1}}));
  const quadrantNames=kind==='cc'?['Low Contribution / Low Sales','High Contribution / Low Sales','Low Contribution / High Sales','High Contribution / High Sales']:['Low Margin / Low Sales','High Margin / Low Sales','Low Margin / High Sales','High Margin / High Sales'];
  c.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:72,right:28,top:35,bottom:58},tooltip:{...tooltipStyle(),trigger:'item',formatter:p=>portfolioTooltip(p.data.record,kind)},xAxis:{type:'value',scale:true,name:kind==='cc'?'Customer Contribution':'Gross Margin %',nameLocation:'middle',nameGap:38,nameTextStyle:{color:THEME.muted,fontSize:9},axisLine:{lineStyle:{color:THEME.axis}},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:kind==='cc'?formatMoney:formatPct},splitLine:{lineStyle:{color:THEME.grid}}},yAxis:{type:'value',scale:true,name:'Net Sales',nameLocation:'middle',nameGap:56,nameTextStyle:{color:THEME.muted,fontSize:9},axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},series:[{type:'scatter',data,symbolSize:(v,p)=>p.data.record.terminal===state.selectedStore?15:10,emphasis:{scale:1.3,itemStyle:{opacity:1}},markLine:{silent:true,symbol:'none',lineStyle:{color:'#a9a69f',type:'dashed',width:1},label:{show:false},data:[{xAxis:xm},{yAxis:ym}]},markArea:{silent:true,itemStyle:{color:'rgba(47,109,169,.025)'},label:{show:true,color:'#9a9b96',fontSize:8,position:'insideTop'},data:[[{name:quadrantNames[0],xAxis:'min',yAxis:'min'},{xAxis:xm,yAxis:ym}],[{name:quadrantNames[1],xAxis:xm,yAxis:'min'},{xAxis:'max',yAxis:ym}],[{name:quadrantNames[2],xAxis:'min',yAxis:ym},{xAxis:xm,yAxis:'max'}],[{name:quadrantNames[3],xAxis:xm,yAxis:ym},{xAxis:'max',yAxis:'max'}]]}}]},{notMerge:true});
  bindStoreClick(c);
}
function renderBubble() {
  const rows=snapshotRows(), c=chart('bubbleChart'); if(!rows.length){c.clear();return;}
  const values=rows.map(r=>r.netSales), min=Math.min(...values), max=Math.max(...values), size=value=>10+31*Math.sqrt(Math.max(0,(value-min)/(max-min||1)));
  const hasCustomers=rows.some(r=>r.customers>0);
  const data=rows.map(record=>({value:[record.netSales,hasCustomers?record.customers:record.pos,record.netSales],record,symbolSize:size(record.netSales),itemStyle:{color:pointColor(record),opacity:Math.min(.7,pointOpacity(record)),borderColor:record.terminal===state.selectedStore?THEME.goldDark:'#fff',borderWidth:record.terminal===state.selectedStore?2:1}}));
  c.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:78,right:30,top:35,bottom:60},tooltip:{...tooltipStyle(),trigger:'item',formatter:p=>{const r=p.data.record;return `<b>${esc(r.store)}</b><br>${esc(r.city)} · ${esc(r.terminal)}<br>Period: ${esc(r.periodKey)}<br>Net Sales: ${formatMoney(r.netSales)}<br>${hasCustomers?'Customer Transactions':'POS fallback'}: ${formatInt(hasCustomers?r.customers:r.pos)}<br>Net Sales / POS: ${formatMoney(r.netSalesPerPos)}<br>Gross Margin: ${formatPct(r.grossMarginPct)}<br>Customer Contribution: ${formatPct(r.contributionPct)}<br>Operating Profit: ${formatMoney(r.operatingProfit)}`;}},xAxis:{type:'value',scale:true,name:'Net Sales',nameLocation:'middle',nameGap:40,nameTextStyle:{color:THEME.muted,fontSize:9},axisLine:{lineStyle:{color:THEME.axis}},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},yAxis:{type:'value',scale:true,name:hasCustomers?'Customer Transactions':'POS (fallback)',nameLocation:'middle',nameGap:58,nameTextStyle:{color:THEME.muted,fontSize:9},axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:9,formatter:formatInt},splitLine:{lineStyle:{color:THEME.grid}}},series:[{type:'scatter',data,emphasis:{scale:1.16,itemStyle:{opacity:1}}}]},{notMerge:true});
  bindStoreClick(c);
}
function renderConcentration() {
  const meta=measureMeta(state.portfolioMetric), pairs=storePairs(state.portfolioMetric);
  const positive=pairs.filter(p=>p.impact>0).sort((a,b)=>b.impact-a.impact).slice(0,6), negative=pairs.filter(p=>p.impact<0).sort((a,b)=>a.impact-b.impact).slice(0,6);
  $('positiveStores').innerHTML=rankStoreHtml(positive,'positive'); $('negativeStores').innerHTML=rankStoreHtml(negative,'negative');
  const adverse=pairs.filter(p=>p.impact<0).sort((a,b)=>a.impact-b.impact), total=adverse.reduce((s,p)=>s+Math.abs(p.impact),0);
  const top10=total?adverse.slice(0,10).reduce((s,p)=>s+Math.abs(p.impact),0)/total:0;
  $('paretoBadge').textContent=total?`Top 10 · ${formatPct(top10)}`:'No adverse variance';
  $('paretoSub').textContent=`${meta.label} · cumulative share of adverse P&L impact`;
  const c=chart('paretoChart'); if(!adverse.length){c.clear();return;}
  const shown=adverse.slice(0,20), bars=shown.map(p=>Math.abs(p.impact)); let running=0; const cumulative=shown.map(value=>{running+=Math.abs(value.impact);return total?running/total:0;});
  c.setOption({textStyle:baseText(),...chartNavigation({y:false}),grid:{left:62,right:58,top:30,bottom:105},tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>{const i=params[0].dataIndex,p=shown[i];return `<b>${esc(p.record.store)}</b><br>Adverse impact: ${formatMoney(Math.abs(p.impact))}<br>Cumulative: ${formatPct(cumulative[i])}`;}},xAxis:{type:'category',data:shown.map(p=>p.record.store),axisLine:{lineStyle:{color:THEME.axis}},axisTick:{show:false},axisLabel:{interval:0,rotate:43,color:THEME.muted,fontSize:8,formatter:value=>value.length>10?`${value.slice(0,10)}…`:value}},yAxis:[{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},{type:'value',min:0,max:1,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.goldDark,fontSize:8,formatter:formatPct},splitLine:{show:false}}],series:[{type:'bar',data:bars,barMaxWidth:25,itemStyle:{color:THEME.orange,borderRadius:[3,3,0,0]}},{type:'line',yAxisIndex:1,data:cumulative,symbolSize:5,lineStyle:{color:THEME.gold,width:2},itemStyle:{color:THEME.gold},markLine:{silent:true,symbol:'none',lineStyle:{color:'#aaa69e',type:'dashed'},label:{formatter:'80%',color:THEME.muted,fontSize:8},data:[{yAxis:.8}]}}]},{notMerge:true});
  c.off('click'); c.on('click',params=>{const p=shown[params.dataIndex];if(p)openStoreDetail(p.record.terminal);});
}
function rankStoreHtml(rows,tone) {
  if(!rows.length)return '<div class="empty-state">No stores in this direction</div>';
  return rows.map((pair,index)=>`<button class="rank-row" type="button" data-store="${esc(pair.id)}"><span>${String(index+1).padStart(2,'0')}</span><strong title="${esc(pair.record.store)}">${esc(pair.record.store)}</strong><em class="${tone==='positive'?'cell-positive':'cell-negative'}">${formatSignedMoney(pair.impact)}</em></button>`).join('');
}

function ensureSelectedStore() {
  const currentRows=scope().currentRows;
  if(!currentRows.some(r=>r.terminal===state.selectedStore)) state.selectedStore=currentRows[0]?.terminal||'';
  const stores=currentRows.slice().sort((a,b)=>a.store.localeCompare(b.store,'zh-CN'));
  $('detailStoreSelect').innerHTML=stores.map(record=>`<option value="${esc(record.terminal)}"${record.terminal===state.selectedStore?' selected':''}>${esc(record.store)} · ${esc(record.terminal)}</option>`).join('')||'<option>No data</option>';
}
function openStoreDetail(terminal) { state.selectedStore=terminal; switchTab('detail'); }
function currentStoreRecords() {
  const {currentRows,comparisonRows}=scope();
  return {current:currentRows.find(r=>r.terminal===state.selectedStore)||null,ly:comparisonRows.find(r=>r.terminal===state.selectedStore)||null};
}
function recordStats(fieldKey,current,ly,metricKey=fieldKey) {
  const currentValue=current?finite(current[fieldKey]):0, lyValue=ly?finite(ly[fieldKey]):NaN, delta=Number.isFinite(lyValue)?currentValue-lyValue:NaN, pct=Number.isFinite(delta)&&Math.abs(lyValue)>1e-9?delta/Math.abs(lyValue):NaN;
  return {current:currentValue,ly:lyValue,delta,pct,metricKey};
}
function renderDetail() {
  ensureSelectedStore();
  const {current,ly}=currentStoreRecords();
  if(!current){$('detailTitle').textContent='No store in the selected scope';$('storeKpis').innerHTML='';return;}
  $('detailStoreSelect').value=state.selectedStore;
  $('detailTitle').textContent=current.store;
  $('detailMeta').textContent=`${current.city} · ${current.region} · ${current.channel} · ${current.storeType} · ${current.status} · ${current.terminal}`;
  const currentRows=[current], lyRows=ly?[ly]:[];
  $('storeKpis').innerHTML=['netSales','grossMargin','contribution','operatingProfit'].map(key=>kpiCardHtml(key,metricStats(key,currentRows,lyRows),false)).join('');
  renderStorePnl(current,ly);
  renderStoreInsights(current,ly);
  renderApCharts(current,ly);
}
function renderStorePnl(current,ly) {
  const netSales=current.netSales;
  $('storePnlBody').innerHTML=PNL_LINES.map(line=>{
    if(line.metric){const currentValue=metricValue([current],line.metric),lyValue=ly?metricValue([ly],line.metric):NaN,delta=Number.isFinite(lyValue)?currentValue-lyValue:NaN,pct=Number.isFinite(delta)&&Math.abs(lyValue)>1e-9?delta/Math.abs(lyValue):NaN;return `<tr class="${line.className||''}"><td>${esc(line.label)}</td><td>${formatPct(currentValue)}</td><td>${formatPct(lyValue)}</td><td class="${delta>0?'cell-positive':delta<0?'cell-negative':''}">${formatPp(delta)}</td><td>${Number.isFinite(pct)?formatPct(pct):'—'}</td><td>—</td></tr>`;}
    const currentValue=finite(current[line.field]),lyValue=ly?finite(ly[line.field]):NaN,delta=Number.isFinite(lyValue)?currentValue-lyValue:NaN,pct=Number.isFinite(delta)&&Math.abs(lyValue)>1e-9?delta/Math.abs(lyValue):NaN,share=netSales?currentValue/netSales:NaN;
    return `<tr class="${line.className||''}"><td class="${line.indent?`indent-${line.indent}`:''}">${esc(line.label)}</td><td>${formatKrmb(currentValue)}</td><td>${formatKrmb(lyValue)}</td><td class="${delta>0?'cell-positive':delta<0?'cell-negative':''}">${formatKrmb(delta)}</td><td>${Number.isFinite(pct)?`${pct>=0?'+':''}${formatPct(pct)}`:'—'}</td><td>${Number.isFinite(share)?formatPct(share):'—'}</td></tr>`;
  }).join('');
  const errors=pnlTieErrors(current)+(ly?pnlTieErrors(ly):0);
  $('storeReconcile').textContent=errors?'P&L tie-out issue':'P&L reconciled'; $('storeReconcile').className=`reconcile ${errors?'bad':''}`;
}
function renderStoreInsights(current,ly) {
  if(!ly){$('storeInsights').innerHTML=insightHtml([{title:'Comparison record unavailable',detail:'This store may be new or outside the comparison-period filter.'}]);return;}
  const ns=recordStats('netSales',current,ly),op=recordStats('operatingProfit',current,ly),gmDelta=current.grossMarginPct-ly.grossMarginPct;
  const currentAp=AP_COMPONENTS.reduce((s,[key])=>s+Math.abs(current[key]),0),lyAp=AP_COMPONENTS.reduce((s,[key])=>s+Math.abs(ly[key]),0),apPct=lyAp?(currentAp-lyAp)/lyAp:NaN;
  const items=[];
  items.push({tone:ns.delta>=0?'positive':'warning',title:`Net Sales ${ns.delta>=0?'increased':'decreased'} ${formatPct(ns.pct)}`,detail:`${formatMoney(current.netSales)} current versus ${formatMoney(ly.netSales)} comparison.`});
  if(Math.abs(gmDelta)>=.01)items.push({tone:gmDelta>0?'positive':'warning',title:`Gross Margin rate changed ${formatPp(gmDelta)}`,detail:`Current ${formatPct(current.grossMarginPct)} versus ${formatPct(ly.grossMarginPct)}.`});
  if(Number.isFinite(apPct)&&Math.abs(apPct)>=.1)items.push({tone:apPct>0?'warning':'positive',title:`A&P expense ${apPct>0?'increased':'decreased'} ${formatPct(apPct)}`,detail:`Current ${formatMoney(currentAp)} versus ${formatMoney(lyAp)}.`});
  if(ns.delta>0&&op.delta<0)items.push({tone:'critical',title:'Sales growth did not convert to OP growth',detail:`Operating Profit changed ${formatSignedMoney(op.delta)} despite positive sales movement.`});
  $('storeInsights').innerHTML=insightHtml(items);
}
function renderApCharts(current,ly) {
  const labels=AP_COMPONENTS.map(([,label])=>label), currentValues=AP_COMPONENTS.map(([key])=>Math.abs(current[key])),lyValues=AP_COMPONENTS.map(([key])=>ly?Math.abs(ly[key]):0);
  const comparisonChart=chart('apComparisonChart');
  comparisonChart.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:150,right:25,top:30,bottom:42},legend:{top:0,right:82,textStyle:{color:THEME.muted,fontSize:9}},tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>`<b>${esc(params[0].name)}</b><br>${params.map(p=>`${esc(p.seriesName)}: ${formatMoney(p.value)}`).join('<br>')}`},xAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},yAxis:{type:'category',inverse:true,data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8.5}},series:[{name:currentPeriod()?.key||'Current',type:'bar',data:currentValues,barMaxWidth:12,itemStyle:{color:THEME.blue,borderRadius:[0,3,3,0]}},{name:comparisonPeriod()?.key||'Comparison',type:'bar',data:lyValues,barMaxWidth:12,itemStyle:{color:THEME.gold,borderRadius:[0,3,3,0]}}]},{notMerge:true});
  const waterfall=chart('apWaterfallChart');
  if(!ly){waterfall.clear();$('apReconcile').textContent='No comparison';$('apReconcile').className='reconcile bad';return;}
  const lyTotal=lyValues.reduce((s,v)=>s+v,0),currentTotal=currentValues.reduce((s,v)=>s+v,0),deltas=currentValues.map((v,i)=>v-lyValues[i]);
  const names=[`${comparisonPeriod()?.key||'LY'} Total`,...labels,`${currentPeriod()?.key||'Current'} Total`];
  const base=[],values=[],raw=[],types=[];let run=lyTotal;base.push(0);values.push(lyTotal);raw.push(lyTotal);types.push('anchor');
  deltas.forEach(delta=>{if(delta>=0){base.push(run);values.push(delta);}else{base.push(run+delta);values.push(Math.abs(delta));}raw.push(delta);types.push(delta>=0?'increase':'decrease');run+=delta;});
  base.push(0);values.push(currentTotal);raw.push(currentTotal);types.push('anchor');
  const diff=lyTotal+deltas.reduce((s,v)=>s+v,0)-currentTotal;
  $('apReconcile').textContent=Math.abs(diff)<.05?'Reconciled':`Variance ${formatKrmb(diff)} KRMB`; $('apReconcile').className=`reconcile ${Math.abs(diff)<.05?'':'bad'}`;
  waterfall.setOption({textStyle:baseText(),...chartNavigation(),grid:{left:64,right:20,top:28,bottom:100},tooltip:{...tooltipStyle(),trigger:'axis',axisPointer:{type:'shadow'},formatter:params=>{const i=params[0].dataIndex;return `<b>${esc(names[i])}</b><br>${types[i]==='anchor'?'Total expense':'Expense change'}: ${types[i]==='anchor'?formatMoney(raw[i]):formatSignedMoney(raw[i])}`;}},xAxis:{type:'category',data:names,axisTick:{show:false},axisLine:{lineStyle:{color:THEME.axis}},axisLabel:{interval:0,rotate:38,color:THEME.muted,fontSize:8}},yAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{color:THEME.muted,fontSize:8,formatter:formatMoney},splitLine:{lineStyle:{color:THEME.grid}}},series:[{type:'bar',stack:'ap',data:base,itemStyle:{color:'transparent'},silent:true},{type:'bar',stack:'ap',barMaxWidth:35,data:values.map((value,i)=>({value,itemStyle:{color:types[i]==='anchor'?THEME.navy:types[i]==='increase'?THEME.orange:THEME.green,borderRadius:[3,3,0,0]}})),label:{show:true,position:'top',color:THEME.muted,fontSize:8,formatter:p=>types[p.dataIndex]==='anchor'?formatMoney(raw[p.dataIndex]):formatSignedMoney(raw[p.dataIndex])}}]},{notMerge:true});
}

function renderFooter() {
  if(!state.dataStats)return;
  $('footerMeta').textContent=`${state.dataStats.records} records · ${state.dataStats.stores} stores · ${state.dataStats.periods} review periods · Source unit KRMB · Data held in browser memory only`;
}
function renderAll() {
  updatePeriodSummary(); ensureSelectedStore(); renderFooter(); renderActiveTab();
}
function renderActiveTab() {
  if(!state.records.length)return;
  if(state.activeTab==='overview')renderOverview();
  else if(state.activeTab==='variance')renderVariance();
  else if(state.activeTab==='portfolio')renderPortfolio();
  else renderDetail();
  requestAnimationFrame(()=>Object.values(state.charts).forEach(c=>c.resize()));
}
function switchTab(tab) {
  state.activeTab=tab;
  document.querySelectorAll('.rail-link').forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===tab));
  renderActiveTab(); window.scrollTo({top:0,behavior:'smooth'});
}
function setSegment(containerId,value) { document.querySelectorAll(`#${containerId} button[data-value]`).forEach(button=>button.classList.toggle('active',button.dataset.value===value)); }

function clearData() {
  state.book=null; state.fileName=''; state.sheetName=''; state.headerRow=0; state.headers=[]; state.matrix=[]; state.mapping={}; state.signature='';
  state.records=[]; state.periods=[]; state.currentPeriodKey=''; state.filters={}; state.selectedStore=''; state.search=''; state.warnings=[]; state.dataStats=null;
  Object.values(state.charts).forEach(c=>c.dispose()); state.charts={};
  ['timelineChart','bridgeChart','ccChart','gmChart','bubbleChart','paretoChart','apComparisonChart','apWaterfallChart'].forEach(id=>{$(id).innerHTML='<div class="chart-empty">Upload a workbook to view analysis</div>';});
  ['primaryKpis','secondaryKpis','storeKpis','driverTableBody','storePnlBody','positiveDrivers','negativeDrivers','positiveStores','negativeStores'].forEach(id=>{$(id).innerHTML='';});
  $('overviewInsights').innerHTML='<div class="empty-state">No analysis available</div>';
  $('varianceInsights').innerHTML='<div class="empty-state">No analysis available</div>';
  $('storeInsights').innerHTML='<div class="empty-state">No store selected</div>';
  $('detailTitle').textContent='Select a store to review';$('detailMeta').textContent='Current versus comparison period';
  $('periodSummary').innerHTML='<span>Current</span><strong>—</strong><i>vs</i><span>Comparison</span><strong>—</strong>';
  $('footerMeta').textContent='Files are processed locally and are not transmitted to an external server';
  $('ccBench').textContent='—';$('gmBench').textContent='—';$('paretoBadge').textContent='—';$('bridgeReconcile').textContent='—';$('apReconcile').textContent='—';$('storeReconcile').textContent='—';
  $('storeSearch').value='';$('fileInput').value='';
  $('yearSelect').innerHTML='<option>—</option>';$('reviewSelect').innerHTML='<option>—</option>';$('detailStoreSelect').innerHTML='<option>No data</option>';
  [['regionFilter','All Regions'],['cityFilter','All Cities'],['channelFilter','All Channels'],['typeFilter','All Types'],['statusFilter','All Status']].forEach(([id,label])=>{$(id).innerHTML=`<option value="">${label}</option>`;});
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
  const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));anchor.download='counter-dashboard-field-mapping.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
}
function importMappingFile(file) {
  const reader=new FileReader();reader.onload=()=>{try{const object=JSON.parse(reader.result),mapping=object.mapping||object;state.mapping=savedToIndexes(mapping,state.headers);renderMapping();showMappingAlert('success','Mapping imported. Click Apply & Load Data.');}catch(_){showMappingAlert('error','Invalid mapping JSON file.');}};reader.readAsText(file);
}

document.querySelectorAll('.rail-link').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
document.addEventListener('click',event=>{
  const kpi=event.target.closest('[data-kpi]'); if(kpi){state.varianceMetric=kpi.dataset.kpi;setSegment('varianceMetric',state.varianceMetric);switchTab('variance');return;}
  const driver=event.target.closest('[data-driver]'); if(driver){setPortfolioMetric(`field:${driver.dataset.driver}`);state.portfolioView='concentration';setSegment('portfolioView','concentration');switchTab('portfolio');return;}
  const store=event.target.closest('[data-store]'); if(store){openStoreDetail(store.dataset.store);return;}
  const action=event.target.closest('[data-action]'); if(action){if(action.dataset.action==='variance'){state.varianceMetric=action.dataset.metric||'operatingProfit';setSegment('varianceMetric',state.varianceMetric);switchTab('variance');}else if(action.dataset.action==='portfolio'){if(action.dataset.driver)setPortfolioMetric(`field:${action.dataset.driver}`);else setPortfolioMetric(action.dataset.metric||'operatingProfit');state.portfolioView='concentration';setSegment('portfolioView','concentration');switchTab('portfolio');}}
});

$('timelineMetric').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.timelineMetric=button.dataset.value;setSegment('timelineMetric',state.timelineMetric);renderTimeline();});
$('varianceMetric').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.varianceMetric=button.dataset.value;setSegment('varianceMetric',state.varianceMetric);renderDriverAnalysis();renderVarianceInsights();});
$('portfolioView').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.portfolioView=button.dataset.value;setSegment('portfolioView',state.portfolioView);document.querySelectorAll('.portfolio-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.portfolioPanel===state.portfolioView));renderPortfolio();});
$('snapshotToggle').addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;state.snapshot=button.dataset.value;setSegment('snapshotToggle',state.snapshot);renderPortfolio();});
$('storeSearch').addEventListener('input',event=>{state.search=event.target.value.trim().toLowerCase();if(state.portfolioView==='quadrants'||state.portfolioView==='productivity')renderPortfolio();});
$('rankingMetric').addEventListener('change',event=>{setPortfolioMetric(event.target.value);renderConcentration();});
$('detailStoreSelect').addEventListener('change',event=>{state.selectedStore=event.target.value;renderDetail();});

$('yearSelect').addEventListener('change',()=>{refreshReviewOptions();ensureSelectedStore();renderAll();});
$('reviewSelect').addEventListener('change',event=>{state.currentPeriodKey=event.target.value;ensureSelectedStore();renderAll();});
$('comparisonSelect').addEventListener('change',event=>{state.comparisonMode=event.target.value;updatePeriodSummary();ensureSelectedStore();renderAll();});
['regionFilter','cityFilter','channelFilter','typeFilter','statusFilter'].forEach(id=>$(id).addEventListener('change',()=>{ensureSelectedStore();renderAll();}));
$('resetFiltersBtn').addEventListener('click',()=>{['regionFilter','cityFilter','channelFilter','typeFilter','statusFilter'].forEach(id=>$(id).value='');renderAll();});

const WORKBOOK_FILE_PATTERN=/\.(xlsx|xls|xlsm|csv)$/i;
function isWorkbookFile(file){return Boolean(file&&WORKBOOK_FILE_PATTERN.test(file.name||''));}
async function loadWorkbookFile(file){
  if(!isWorkbookFile(file)){setNotice('error','Unsupported file type','Use an .xlsx, .xls, .xlsm or .csv workbook.');return;}
  const dropZone=$('uploadDropZone');dropZone.classList.add('is-loading');dropZone.setAttribute('aria-busy','true');
  try{if(!window.XLSX||!window.echarts)throw new Error('Local libraries are missing. Keep the libs folder beside index.html.');setNotice('info','Reading workbook locally',file.name);state.book=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:true});loadSource(file.name);}
  catch(error){setNotice('error','Unable to load workbook',error.message);}
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
window.addEventListener('pagehide',()=>{state.book=null;state.matrix=[];state.records=[];state.periods=[];state.headers=[];state.warnings=[];});
if(!window.XLSX||!window.echarts)setNotice('error','Local libraries could not load','Keep index.html, libs, js and assets in the same local folder.');
})();
