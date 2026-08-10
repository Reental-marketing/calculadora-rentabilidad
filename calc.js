/* Lógica de cálculo pura de la calculadora Reental.
   Se carga como global ReentalCalc en navegador y como módulo CommonJS en Node (tests). */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ReentalCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var DEFAULT_RATES = {
    reental: 16.25,
    alquiler: 6.25,
    rentaFija: 3,
    rentaVariable: 7.5,
    oro: 7,
    indexado: 10,
  };

  function calculate(amount, ratePct, years) {
    return amount * Math.pow(1 + ratePct / 100, years);
  }

  function isValidRate(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 100;
  }

  function mergeRates(fetched) {
    var rates = Object.assign({}, DEFAULT_RATES);
    if (fetched && typeof fetched === 'object') {
      Object.keys(DEFAULT_RATES).forEach(function (key) {
        if (isValidRate(fetched[key])) rates[key] = fetched[key];
      });
    }
    return rates;
  }

  function parseCsvRates(csvText) {
    var fetched = {};
    String(csvText).split(/\r?\n/).forEach(function (rawLine) {
      var line = rawLine.trim();
      var sep = line.indexOf(',');
      if (sep <= 0) return;
      var key = line.slice(0, sep).trim().replace(/^"|"$/g, '');
      var value = line.slice(sep + 1).trim().replace(/^"|"$/g, '');
      if (!key || value === '') return;
      // "16,25" (decimal español) → "16.25"
      if (value.indexOf(',') !== -1 && value.indexOf('.') === -1) {
        value = value.replace(',', '.');
      }
      fetched[key] = Number(value);
    });
    return fetched;
  }

  return {
    DEFAULT_RATES: DEFAULT_RATES,
    calculate: calculate,
    isValidRate: isValidRate,
    mergeRates: mergeRates,
    parseCsvRates: parseCsvRates,
  };
});
