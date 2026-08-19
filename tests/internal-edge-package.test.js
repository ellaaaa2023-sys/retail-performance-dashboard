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
if (!html.includes('Ready for local workbook')) throw new Error('Internal index is not Upload-first');
if (files.some(file => forbidden.some(pattern => pattern.test(file)))) throw new Error('Internal package contains a prohibited file');
if (!files.includes('diagnostics/edge-offline-check.html') || !files.includes('diagnostics/minimal-dashboard-check.html')) throw new Error('Diagnostic pages are missing');

console.log(`PASS - Internal Edge package is Upload-first and excludes demo/public-only data (${files.length} files).`);
