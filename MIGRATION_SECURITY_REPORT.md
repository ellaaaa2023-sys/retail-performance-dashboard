# Migration and Data Security Check

## Release architecture

```text
User-selected local Excel
  → File / ArrayBuffer API
  → local SheetJS parser
  → in-memory mapping, validation and calculations
  → local ECharts rendering
```

There is no application server, cloud database, analytics endpoint, AI API or automatic workbook path.

## Audit results

| Check | Result |
|---|---|
| External CDN / remote runtime asset | None |
| Application network request | None; CSP uses `connect-src 'none'` |
| Hard-coded personal or Windows path | None |
| Automatic Excel loading | None |
| `fetch()` / XHR / WebSocket / Beacon | None |
| ES Module dependency | None |
| Local server requirement | None |
| Workbook data in browser persistence | None |
| Console logging of business rows | None |
| Clear Data | Clears workbook, raw matrix, records, filters, DOM values and charts |
| Sample data | Mock-only file in `sample_data/` |

The `http://` strings inside third-party minified libraries are license notices, XML namespaces or file-format schema identifiers. They are not runtime requests. Neither bundled library contains `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or `EventSource`.

SheetJS parses cached workbook cell values in memory. It does not follow external workbook links and does not execute VBA macros contained in `.xlsm` files.

## Browser storage

Only field names and semantic-to-column mapping assignments may be written to `localStorage` after the user clicks **Save Mapping**. Raw rows, store values, P&L values, workbook bytes and calculated results are not written to `localStorage`, `sessionStorage`, IndexedDB, cookies or Cache Storage.

## `file://` compatibility

The page uses classic deferred scripts and relative file references. It does not fetch local JSON or Excel and does not require module imports. It is designed to run by double-clicking `index.html`.

Compatibility remains subject to company endpoint policy. If managed Edge or Chrome blocks local JavaScript or local file access, IT must review and allow the controlled folder. The Dashboard must not bypass company policy.

## Residual risks

- Browser extensions with broad page/file permissions.
- Browser, OS, EDR or crash-reporting behavior outside the application code.
- A modified or malicious copy of the HTML/JavaScript files.
- Human disclosure through screenshots, copy/paste, email or cloud-sync folders.
- Developer Tools expose values currently rendered or held in memory, even though the application does not log them.
- Column names stored in mapping configuration may themselves be classified as sensitive by company policy.

Use a company-approved managed browser, deploy the release to a read-only controlled directory, verify `SHA256SUMS.txt`, and keep real workbooks outside the Dashboard package.
