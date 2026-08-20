'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');
let passed = 0;

function check(condition, label) {
  if (!condition) throw new Error(`FAIL - ${label}`);
  passed += 1;
  console.log(`${passed}. PASS - ${label}`);
}

function loadI18n({ language = 'en-US', saved, storageThrows = false, mode = 'public-demo', languageMode = 'bilingual' } = {}) {
  const writes = [];
  let reads = 0;
  const context = {
    RetailDashboardRuntime: { mode, languageMode },
    navigator: { language },
    localStorage: {
      getItem() { reads += 1; if (storageThrows) throw new Error('blocked'); return saved == null ? null : saved; },
      setItem(key, value) { if (storageThrows) throw new Error('blocked'); writes.push([key, value]); }
    },
    addEventListener() {},
    dispatchEvent() {},
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options.detail; }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'i18n.js' });
  return { api: context.RetailDashboardI18n, writes, reads };
}

check(loadI18n({ language: 'en-GB' }).api.getLanguage() === 'en', 'Public non-Chinese browser defaults to English');
check(loadI18n({ language: 'zh-CN' }).api.getLanguage() === 'zh', 'Public zh-CN browser defaults to Chinese');
check(loadI18n({ language: 'en-US', saved: 'zh' }).api.getLanguage() === 'zh', 'Saved Public preference overrides browser language');
check(loadI18n({ language: 'zh-CN', storageThrows: true }).api.getLanguage() === 'en', 'Storage failure safely falls back to English');

const publicRuntime = loadI18n({ language: 'en-US' });
publicRuntime.api.setLanguage('zh');
check(publicRuntime.api.getLanguage() === 'zh' && publicRuntime.api.t('nav.overview') === '经营概览', 'English to Chinese switch updates labels');
publicRuntime.api.setLanguage('en');
check(publicRuntime.api.getLanguage() === 'en' && publicRuntime.api.t('nav.overview') === 'Executive Overview', 'Chinese to English switch updates labels');
check(publicRuntime.writes.some(([, value]) => value === 'zh') && publicRuntime.writes.some(([, value]) => value === 'en'), 'Public language preference is persisted');

const internalRuntime = loadI18n({ language: 'zh-CN', saved: 'zh', mode: 'internal-edge', languageMode: 'en-only' });
check(internalRuntime.api.getLanguage() === 'en', 'Internal Edge stays English for zh-CN browser');
check(internalRuntime.reads === 0, 'Internal Edge ignores saved Chinese preference');
internalRuntime.api.setLanguage('zh');
check(internalRuntime.api.getLanguage() === 'en' && !internalRuntime.api.isBilingual(), 'Internal Edge rejects switching and exposes en-only mode');

const translations = publicRuntime.api.translations;
const enKeys = Object.keys(translations.en).sort();
const zhKeys = Object.keys(translations.zh).sort();
check(JSON.stringify(enKeys) === JSON.stringify(zhKeys), 'English and Chinese dictionaries have identical keys');
check(enKeys.every(key => publicRuntime.api.t(key) !== key), 'No registered translation key renders as a raw key');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtimeSource = [fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8'), fs.readFileSync(path.join(root, 'js', 'data', 'data-preparation-ui.js'), 'utf8')].join('\n');
const referencedKeys = Array.from(indexSource.matchAll(/data-i18n(?:-aria-label|-placeholder)?="([^"]+)"/g), match => match[1])
  .concat(Array.from(runtimeSource.matchAll(/\bt\(['"]([^'"]+)['"]/g), match => match[1]));
check(referencedKeys.every(key => Object.prototype.hasOwnProperty.call(translations.en, key)), 'Static HTML and literal runtime translation keys are complete');
check(translations.en['quadrant.Star'] === 'Star' && translations.zh['quadrant.Star'] === '高效门店'
  && translations.en['pnl.specificAP'] === 'Specific A&P' && translations.zh['pnl.specificAP'] === '专项广告及促销', 'Canonical finance and quadrant terminology is consistent');
check(translations.zh['shell.path'].includes('损益表')
  && translations.zh['prep.summaryPnl'] === '损益汇总表'
  && translations.zh['pnl.netSales'] === '合并净销售额'
  && translations.zh['pnl.specificSga'] === '专项销售及管理'
  && translations.zh['pnl.daCost'] === '销售人员费用'
  && translations.zh['metric.apExpense'] === '广告及促销投入'
  && translations.zh['pnl.coupon'] === '优惠券'
  && translations.zh['pnl.royalTaMs'] === '特许权使用 / 技术支持 / 管理服务'
  && translations.zh['metric.aup'] === '实际成交总额'
  && translations.zh['pnl.oca'] === '其他客户核销'
  && translations.zh['metric.storeProductivity'] === '门店总单产'
  && translations.zh['metric.productivityEvolPct'] === '门店单产变化率'
  && translations.zh['metric.daHeadcount'] === '销售人员人数', 'Approved Chinese finance terminology is exact');
check(Object.prototype.hasOwnProperty.call(translations.zh, 'pnl.otherAP')
  && Object.prototype.hasOwnProperty.call(translations.zh, 'component.otherAP')
  && translations.zh['pnl.otherAP'] === '其他'
  && translations.zh['component.otherAP'] === '其他', 'Store P&L Others and A&P component Others use separate exact keys');
check(!/\b(?:import|export)\b|fetch\s*\(|XMLHttpRequest|https?:\/\//.test(source), 'i18n runtime is classic, local, and has no network dependency');

console.log(`\n${passed}/17 i18n checks passed (${enKeys.length} translation keys).`);
