'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let passed = 0;

function check(condition, label) {
  if (!condition) throw new Error(`FAIL - ${label}`);
  passed += 1;
  console.log(`${passed}. PASS - ${label}`);
}

const scripts = Array.from(html.matchAll(/<script\s+([^>]*?)src="([^"]+)"([^>]*)><\/script>/g)).map(match => ({ attrs: `${match[1]} ${match[3]}`, src: match[2] }));
const expected = [
  './js/startup-guard.js',
  './js/browser-compat.js',
  './libs/xlsx.full.min.js',
  './libs/echarts.min.js',
  './js/data/detail-schema.js',
  './js/data/data-cleaning.js',
  './js/data/core-data.js',
  './js/data/data-preparation-ui.js',
  './js/data/source-lifecycle.js',
  './js/data/demo-data.js',
  './js/productivity-quadrant.js',
  './js/store-detail.js',
  './js/app.js'
];

check(JSON.stringify(scripts.map(item => item.src)) === JSON.stringify(expected), 'Public script order is explicit and dependency-safe');
check(scripts.every(item => /\bdefer\b/.test(item.attrs) && !/\basync\b|type\s*=\s*["']module/.test(item.attrs)), 'All runtime scripts are deferred classic scripts');
check(expected.every(relative => relative.startsWith('./') && fs.existsSync(path.join(root, relative.slice(2)))), 'Every script path is relative and matches an exact file');
const linkedAssets = Array.from(html.matchAll(/<(?:link|img)\b[^>]*(?:href|src)="([^"]+)"/g)).map(match => match[1]);
check(linkedAssets.every(relative => relative.startsWith('./') && fs.existsSync(path.join(root, relative.slice(2)))), 'Every CSS and image path matches an exact local filename');
check(/connect-src 'none'/.test(html) && /script-src 'self' file:/.test(html), 'CSP permits local scripts and denies connections');
check(!/(?:src|href)=["']\/(?!\/)|(?:src|href)=["']https?:|localhost|\/Users\//.test(html), 'HTML has no root, remote, localhost, or Unix runtime path');

const firstParty = ['index.html', 'assets/styles.css'].concat(expected.filter(item => item.startsWith('./js/')).map(item => item.slice(2)))
  .map(relative => fs.readFileSync(path.join(root, relative), 'utf8')).join('\n');
check(!/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|navigator\.serviceWorker|new\s+(?:Shared)?Worker\s*\(/.test(firstParty), 'First-party runtime has no network or worker dependency');
check(/RetailDashboardRuntime/.test(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8')), 'Runtime supports packaged Internal Edge mode without a second core');
check(fs.statSync(path.join(root, 'js/data/demo-data.js')).size > 1000000, 'Public demo artifact exists and is treated as a separate large asset');
check(/FileReader/.test(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8')) && /file\.arrayBuffer/.test(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8')), 'Workbook reader has File.arrayBuffer and FileReader paths');

console.log(`\n${passed}/10 file compatibility checks passed.`);
