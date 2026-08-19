'use strict';

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../libs/xlsx.full.min.js');
const DataLayer = require('../js/data/core-data.js');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'sample_data', 'Retail_Performance_Dashboard_Mock_Data.xlsx');
const TARGET = path.join(ROOT, 'js', 'data', 'demo-data.js');

function buildDemoModel(sourcePath = SOURCE) {
  const bytes = fs.readFileSync(sourcePath);
  const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true });
  const model = DataLayer.parseWorkbook(workbook, {
    XLSX,
    fileName: path.basename(sourcePath)
  });
  const currentCount = model.detail.current.stores.length;
  const comparisonCount = model.detail.comparison.stores.length;
  const defaultStore = model.storeMatches.existing[0] && model.storeMatches.existing[0].current;

  model.metadata = {
    ...model.metadata,
    fileName: 'Synthetic Demo Dataset',
    workbookMode: 'synthetic-normalized-demo',
    sourceType: 'demo',
    defaultStoreTerminal: defaultStore ? defaultStore.terminal : model.detail.current.stores[0].terminal,
    demo: {
      datasetLabel: 'Synthetic Demo Dataset',
      summaryLabel: 'Synthetic Summary',
      currentLabel: 'Current Detail',
      comparisonLabel: 'Comparison Detail',
      currentStores: currentCount,
      comparisonStores: comparisonCount
    }
  };

  // Workbook scan/cleaning diagnostics describe build-time conversion, not the
  // public runtime. The Demo UI must only report normalized source readiness.
  delete model.metadata.workbookScan;
  return model;
}

function serializeDemoArtifact(model) {
  return `(function (root) {\n'use strict';\nroot.RetailDemoData = ${JSON.stringify(model)};\n}(typeof globalThis !== 'undefined' ? globalThis : this));\n`;
}

function writeDemoArtifact(targetPath = TARGET) {
  const model = buildDemoModel();
  fs.writeFileSync(targetPath, serializeDemoArtifact(model));
  return { targetPath, model };
}

if (require.main === module) {
  const result = writeDemoArtifact();
  process.stdout.write(`Generated ${path.relative(ROOT, result.targetPath)} with ${result.model.detail.current.stores.length} current and ${result.model.detail.comparison.stores.length} comparison stores.\n`);
}

module.exports = Object.freeze({
  SOURCE,
  TARGET,
  buildDemoModel,
  serializeDemoArtifact,
  writeDemoArtifact
});
