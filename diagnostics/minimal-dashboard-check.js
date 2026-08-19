(function (root) {
  'use strict';

  var status = document.getElementById('minimalStatus');
  if (!root.RetailLocalProbe || !root.XLSX || !root.echarts) {
    status.className = 'fail';
    status.textContent = 'FAIL: One or more local classic scripts did not load.';
    return;
  }

  try {
    var chart = root.echarts.init(document.getElementById('minimalChart'), null, { renderer: 'canvas' });
    chart.setOption({
      xAxis: { type: 'category', data: ['Local', 'Offline', 'Edge'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [3, 5, 4], itemStyle: { color: '#2f6da9' } }]
    });
    root.addEventListener('resize', function () { chart.resize(); });
    status.className = 'pass';
    status.textContent = 'PASS: Local classic JavaScript, SheetJS, ECharts, and Canvas initialized.';
  } catch (_) {
    status.className = 'fail';
    status.textContent = 'FAIL: Local chart initialization failed.';
  }

  document.getElementById('minimalFile').addEventListener('change', function (event) {
    var file = event.target.files && event.target.files[0];
    var output = document.getElementById('minimalFileResult');
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var workbook = root.XLSX.read(reader.result, { type: 'array', bookSheets: true });
        output.className = 'pass';
        output.textContent = 'PASS: Local file selection and metadata parse succeeded (' + workbook.SheetNames.length + ' sheets).';
      } catch (_) {
        output.className = 'fail';
        output.textContent = 'FAIL: Workbook metadata parse failed.';
      }
    };
    reader.onerror = function () {
      output.className = 'fail';
      output.textContent = 'FAIL: Local file read failed.';
    };
    reader.readAsArrayBuffer(file);
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
