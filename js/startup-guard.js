(function (root) {
  'use strict';

  var completed = false;
  var failureCategory = '';

  function notice() {
    return document.getElementById('notice');
  }

  function showFailure(category) {
    failureCategory = category || 'Local script failed to load';
    var panel = notice();
    if (!panel) return;
    panel.className = 'notice error';
    panel.innerHTML = '<div><strong>Dashboard initialization failed</strong><span>' + failureCategory + '. Keep the complete folder together and run diagnostics/edge-offline-check.html.</span></div>';
  }

  root.addEventListener('error', function (event) {
    if (completed) return;
    var target = event.target;
    if (target && target.tagName === 'SCRIPT') showFailure('Local script failed to load');
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    if (!completed && !failureCategory) showFailure('Browser feature or local script unavailable');
  });

  root.RetailStartupGuard = Object.freeze({
    ready: function () { completed = true; },
    fail: showFailure
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
