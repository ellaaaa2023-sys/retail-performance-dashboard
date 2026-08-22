'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'internal-edge');
const files = [];

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else files.push(path.relative(output, target).split(path.sep).join('/'));
  });
}

walk(output);
const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const forbidden = [/demo-data\.js$/, /sample_data/, /node_modules/, /(?:^|\/)docs(?:\/|$)/, /(?:^|\/)tests(?:\/|$)/, /vercel/i, /\.xlsx$/i, /\.git/];

if (html.includes('demo-data.js')) throw new Error('Internal package must not load demo-data.js');
if (!html.includes('./js/data/internal-mode.js')) throw new Error('Internal mode config is missing');
if (!html.includes('./js/i18n.js')) throw new Error('Shared i18n runtime is missing');
if (!html.includes('./js/store-portfolio.js') || !files.includes('js/store-portfolio.js')) throw new Error('Shared store portfolio runtime is missing');
if (html.indexOf('./js/store-portfolio.js') > html.indexOf('./js/data/core-data.js')) throw new Error('Store portfolio helper must load before Core');
if (html.indexOf('./js/data/internal-mode.js') > html.indexOf('./js/i18n.js')) throw new Error('Internal language mode must load before i18n');
if (!html.includes('Ready for local workbook')) throw new Error('Internal index is not Upload-first');
if (/id="languageSwitch"|class="language-switch"/.test(html)) throw new Error('Internal index must not contain a language switch');
if (!html.includes('id="bridgeModeToggle"')) throw new Error('Internal package is missing the Customer Contribution Bridge toggle');
if (!html.includes('id="portfolioLens"') || !html.includes('data-value="performance"') || !html.includes('data-value="efficiency"') || !html.includes('data-value="contribution"')) throw new Error('Internal package is missing the three Page 03 lenses');
if (html.includes('productivity-quadrant.js') || files.includes('js/productivity-quadrant.js')) throw new Error('Internal package must not include the obsolete quadrant helper');
if (/id="(?:snapshotToggle|productivityChart|riskStoreBody|portfolioView)"/.test(html)) throw new Error('Internal package still contains obsolete Page 03 controls');
if (!html.includes('id="apTotalSummary"')) throw new Error('Internal package is missing the formal Total A&P summary');
if (html.includes('id="apMovementChart"')) throw new Error('Internal package must not render the removed A&P Movement Bridge');
if (files.some(file => forbidden.some(pattern => pattern.test(file)))) throw new Error('Internal package contains a prohibited file');
if (!files.includes('diagnostics/edge-offline-check.html') || !files.includes('diagnostics/minimal-dashboard-check.html')) throw new Error('Diagnostic pages are missing');
if (files.includes('README.md') || files.includes('README.zh-CN.md') || files.some(file => /^docs\//.test(file))) throw new Error('Internal package contains Public portfolio content');
const internalMode = fs.readFileSync(path.join(output, 'js/data/internal-mode.js'), 'utf8');
if (!/mode:'internal-edge',languageMode:'en-only'/.test(internalMode)) throw new Error('Internal package must fix language mode to English');
const i18n = fs.readFileSync(path.join(output, 'js/i18n.js'), 'utf8');
if (/fetch\s*\(|type\s*=\s*["']module|https?:\/\//.test(i18n)) throw new Error('Internal i18n runtime must be local classic JavaScript');

console.log(`PASS - Internal Edge package is English-only, Upload-first, and excludes demo/public-only data (${files.length} files).`);
