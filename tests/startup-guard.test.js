'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.resolve(__dirname, '../js/startup-guard.js'), 'utf8');
let passed = 0;

function check(condition, label) {
  if (!condition) throw new Error(`FAIL - ${label}`);
  passed += 1;
  console.log(`${passed}. PASS - ${label}`);
}

function harness() {
  const listeners = {};
  const notice = { className: 'notice info', innerHTML: 'initial' };
  const root = {
    addEventListener(type, callback) { listeners[`root:${type}`] = callback; }
  };
  const document = {
    addEventListener(type, callback) { listeners[`document:${type}`] = callback; },
    getElementById(id) { return id === 'notice' ? notice : null; }
  };
  const context = { globalThis: root, document };
  vm.runInNewContext(source, context);
  return { root, listeners, notice };
}

const missingScript = harness();
missingScript.listeners['root:error']({ target: { tagName: 'SCRIPT', src: 'file:///sensitive/path.js' } });
check(missingScript.notice.innerHTML.includes('Local script failed to load') && !missingScript.notice.innerHTML.includes('sensitive'), 'Missing local script shows a safe category without a path');

const missingFeature = harness();
missingFeature.listeners['document:DOMContentLoaded']();
check(missingFeature.notice.innerHTML.includes('Browser feature or local script unavailable'), 'Incomplete startup produces a visible fallback instead of a blank page');

const successful = harness();
successful.root.RetailStartupGuard.ready();
successful.listeners['document:DOMContentLoaded']();
check(successful.notice.innerHTML === 'initial', 'Successful startup suppresses the fallback message');

console.log(`\n${passed}/3 startup guard checks passed.`);
