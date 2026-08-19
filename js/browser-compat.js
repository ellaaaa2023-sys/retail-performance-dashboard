(function (root) {
  'use strict';

  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      return Array.from(entries).reduce(function (result, entry) {
        result[entry[0]] = entry[1];
        return result;
      }, {});
    };
  }

  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      configurable: true,
      writable: true,
      value: function (index) {
        var normalized = Math.trunc(index) || 0;
        if (normalized < 0) normalized += this.length;
        return this[normalized];
      }
    });
  }

  root.RetailBrowserCompat = Object.freeze({ loaded: true });
}(typeof globalThis !== 'undefined' ? globalThis : this));
