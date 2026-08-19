(function (root) {
  'use strict';

  function result(id, passed, detail) {
    var element = document.getElementById(id);
    element.className = passed ? 'pass' : 'fail';
    element.textContent = (passed ? 'PASS' : 'FAIL') + (detail ? ': ' + detail : '');
  }

  function readArrayBuffer(file) {
    if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('FileReader failed')); };
      reader.readAsArrayBuffer(file);
    });
  }

  result('checkJavaScript', true);
  result('checkLocalJs', Boolean(root.RetailLocalProbe && root.RetailLocalProbe.loaded), root.location.protocol);
  result('checkSheetJs', Boolean(root.XLSX && typeof root.XLSX.read === 'function'));
  result('checkEcharts', Boolean(root.echarts && typeof root.echarts.init === 'function'));
  result('checkFileApi', Boolean(root.File && root.FileList && root.Blob));
  result('checkArrayBuffer', typeof root.ArrayBuffer === 'function');
  result('checkFileReader', typeof root.FileReader === 'function');

  var canvas = document.createElement('canvas');
  result('checkCanvas', Boolean(canvas.getContext && canvas.getContext('2d')));

  var resize = document.getElementById('checkResizeObserver');
  resize.className = typeof root.ResizeObserver === 'function' ? 'pass' : 'info';
  resize.textContent = typeof root.ResizeObserver === 'function' ? 'PASS' : 'INFO: not available; Dashboard uses window resize fallback';

  var csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  var cspText = csp ? csp.getAttribute('content') || '' : '';
  var cspPass = cspText.indexOf("script-src 'self' file:") >= 0 && cspText.indexOf("connect-src 'none'") >= 0;
  var cspResult = document.getElementById('checkCsp');
  cspResult.className = cspPass ? 'pass' : 'info';
  cspResult.textContent = cspPass ? 'PASS: local scripts loaded; network connections denied' : 'INFO: expected CSP directives not detected';

  document.getElementById('testFile').addEventListener('change', function (event) {
    var file = event.target.files && event.target.files[0];
    var output = document.getElementById('fileResult');
    if (!file) return;
    output.className = 'info';
    output.textContent = 'INFO: File selected; checking local read and workbook metadata…';
    readArrayBuffer(file).then(function (buffer) {
      if (!root.XLSX) throw new Error('SheetJS unavailable');
      var workbook = root.XLSX.read(buffer, { type: 'array', bookSheets: true });
      var count = Array.isArray(workbook.SheetNames) ? workbook.SheetNames.length : 0;
      output.className = 'pass';
      output.textContent = 'PASS: File selection and local workbook metadata parse succeeded (' + count + ' sheets).';
    }).catch(function () {
      output.className = 'fail';
      output.textContent = 'FAIL: Browser could not read or parse this test workbook.';
    });
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
