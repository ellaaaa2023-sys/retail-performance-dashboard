# Microsoft Edge `file://` Compatibility Notes

## Target environment

- Windows 10 or 11
- Company-managed Microsoft Edge
- Launch by double-clicking `index.html` (`file://`)
- Browser-only runtime; no Node, Python, administrator rights, backend, or internet required by the application

## Required browser and local-content capabilities

The Dashboard requires JavaScript, deferred classic local scripts, DOM/events, File and FileList APIs, ArrayBuffer/typed arrays, FileReader, Canvas 2D, Blob/object URLs for optional mapping export, and local CSS/SVG loading. `File.arrayBuffer()` is used when available; a FileReader ArrayBuffer fallback is included. `requestAnimationFrame` is used for chart resize timing. ResizeObserver is not a hard Dashboard dependency.

The compatibility layer supplies `Object.fromEntries` and `Array.prototype.at` when absent. The application still requires support for syntax already present in the earliest known working version, including `async`/`await`, optional chaining, and nullish coalescing. No unverified minimum Edge version is asserted; the target managed version must be tested directly.

## Runtime scripts and dependencies

All paths are relative to `index.html`. Runtime libraries are vendored locally:

- SheetJS Community Edition 0.18.5: `libs/xlsx.full.min.js`
- Apache ECharts 5.5.1: `libs/echarts.min.js`

There is no CDN, remote fallback, dynamic import, ES module, fetch/XHR/WebSocket, Service Worker, Web Worker, analytics, telemetry, backend API, or remote database dependency. Source maps are not required at runtime. Fonts use the local system stack.

The Internal Edge package does not load the public `js/data/demo-data.js` artifact. It uses the same Core, Cleaning, Data Preparation, filters, source lifecycle, and page logic as the public build, but starts in Upload-first mode.

## CSP considerations

The application keeps its restrictive CSP. Relevant directives include:

- `script-src 'self' file:` for local scripts
- `style-src 'self' file:` for local CSS
- `img-src 'self' file: data: blob:`
- `connect-src 'none'`
- `worker-src 'none'`
- `font-src 'none'`

This CSP was present in the earliest repository version and did not change during the identified regression window. It should not be treated as the confirmed cause without a company Edge policy/console result. The package does not require inline script or inline style permission.

## Workbook handling

The user selects a Workbook through `<input type="file">`. The browser reads an ArrayBuffer locally and SheetJS parses it in the page. Cleaning, validation, normalized model construction, and pages 01–04 execute in browser memory. The application does not require or initiate a server connection.

## IT confirmation required

Please confirm whether the managed endpoint:

1. prohibits or restricts `file://` local scripts or JavaScript from local files;
2. restricts local file selection, FileReader, ArrayBuffer, Canvas, Blob downloads, or localStorage;
3. applies Edge enterprise policies that block local active content;
4. applies DLP, Microsoft Defender, SmartScreen, AppLocker, WDAC, Mark-of-the-Web, ZIP/email attachment controls, or browser extensions to the transferred folder;
5. requires an approved internal static-hosting location instead of `file://`;
6. requires internal review of the vendored SheetJS and ECharts files.

The included `diagnostics/edge-offline-check.html` and `diagnostics/minimal-dashboard-check.html` separate an endpoint/local-content policy failure from a full-application initialization failure. Real Windows + company-managed Edge validation remains required.
