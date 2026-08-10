/* ============================================================
   CONFIGURACIÓN DEL ADMIN
   - SHEET_CSV_URL: URL del Google Sheet publicado como CSV
     (Archivo → Compartir → Publicar en la web → formato CSV).
     Si está vacía o falla, se usan los valores por defecto
     definidos en calc.js (DEFAULT_RATES).
   ============================================================ */
var CONFIG = {
  SHEET_CSV_URL: '',
  FETCH_TIMEOUT_MS: 2000,
  DEBOUNCE_MS: 250,
  MAX_AMOUNT: 99999999,
};

/* Colores de la paleta de marca Reental (ver :root en styles.css) */
var ASSETS = [
  { key: 'reental',       label: 'Reental',        color: '#FCA311', highlight: true },
  { key: 'alquiler',      label: 'Alquiler tradicional', color: '#4ADE80' },
  { key: 'rentaFija',     label: 'Renta fija',     color: '#9CA3AF' },
  { key: 'rentaVariable', label: 'Renta variable', color: '#A78BFA' },
  { key: 'oro',           label: 'Oro',            color: '#FFEABB' },
  { key: 'indexado',      label: 'Fondo indexado', color: '#60A5FA' },
];
var TABLE_YEARS = [1, 3, 5, 10];
var CHART_YEARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var euroFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
var pctFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

var state = { rates: ReentalCalc.DEFAULT_RATES, years: 3, chart: null };

function parseAmount(str) {
  var cleaned = String(str).replace(/[€\s.]/g, '').replace(',', '.');
  if (cleaned === '') return null;
  var num = Number(cleaned);
  if (!isFinite(num) || num <= 0 || num > CONFIG.MAX_AMOUNT) return null;
  return num;
}

function fetchRates() {
  if (!CONFIG.SHEET_CSV_URL || typeof fetch !== 'function') {
    return Promise.resolve(ReentalCalc.DEFAULT_RATES);
  }
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, CONFIG.FETCH_TIMEOUT_MS);
  return fetch(CONFIG.SHEET_CSV_URL, { signal: controller.signal })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      return ReentalCalc.mergeRates(ReentalCalc.parseCsvRates(text));
    })
    .catch(function () {
      return ReentalCalc.DEFAULT_RATES;
    })
    .finally(function () { clearTimeout(timer); });
}

function gain(amount, rate, years) {
  return ReentalCalc.calculate(amount, rate, years) - amount;
}

function renderHeadline(amount) {
  document.getElementById('headline-amount').textContent = euroFmt.format(amount);
  document.getElementById('headline-years').textContent =
    state.years + (state.years === 1 ? ' año' : ' años');
}

function renderCards(amount) {
  document.getElementById('cards').innerHTML = ASSETS.map(function (asset) {
    var rate = state.rates[asset.key];
    var profit = gain(amount, rate, state.years);
    return '<article class="card' + (asset.highlight ? ' highlight' : '') + '"' +
           ' style="--dot:' + asset.color + ';--ring:' + asset.color + '22">' +
           '<p class="asset"><span class="dot"></span>' + asset.label +
           ' <span class="pct">· ' + pctFmt.format(rate) + ' %</span></p>' +
           '<p class="gain">+' + euroFmt.format(profit) + '</p>' +
           '<p class="caption">rendimiento generado en ' + state.years +
           (state.years === 1 ? ' año' : ' años') + '</p>' +
           '</article>';
  }).join('');
}

function renderTable(amount) {
  document.getElementById('table-body').innerHTML = ASSETS.map(function (asset) {
    var rate = state.rates[asset.key];
    var cells = TABLE_YEARS.map(function (years) {
      return '<td>+' + euroFmt.format(gain(amount, rate, years)) + '</td>';
    }).join('');
    return '<tr' + (asset.highlight ? ' class="highlight"' : '') + '>' +
           '<td><span class="dot" style="background:' + asset.color + '"></span>' +
           asset.label + '<span class="pct">' + pctFmt.format(rate) + ' %</span></td>' +
           cells + '</tr>';
  }).join('');
}

function renderChart(amount) {
  var datasets = ASSETS.map(function (asset) {
    var rate = state.rates[asset.key];
    return {
      label: asset.label,
      data: CHART_YEARS.map(function (y) { return ReentalCalc.calculate(amount, rate, y); }),
      borderColor: asset.color,
      backgroundColor: asset.color,
      borderWidth: asset.highlight ? 3 : 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.25,
    };
  });

  if (state.chart) {
    state.chart.data.datasets = datasets;
    state.chart.update();
    return;
  }

  state.chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: CHART_YEARS.map(function (y) { return 'Año ' + y; }),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 18,
            color: '#9CA3AF',
            font: { family: 'Fustat', size: 12, weight: '600' },
          },
        },
        tooltip: {
          backgroundColor: '#1F2937',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          titleColor: '#9CA3AF',
          bodyColor: '#ffffff',
          titleFont: { family: 'Fustat', size: 11, weight: '700' },
          bodyFont: { family: 'Fustat', size: 12.5, weight: '600' },
          callbacks: {
            label: function (ctx) { return ctx.dataset.label + ': ' + euroFmt.format(ctx.parsed.y); },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#6B7280', font: { family: 'Fustat', size: 11, weight: '600' } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          border: { display: false },
          ticks: {
            color: '#6B7280',
            font: { family: 'Fustat', size: 11, weight: '600' },
            callback: function (v) { return euroFmt.format(v); },
          },
        },
      },
    },
  });
}

function update() {
  var input = document.getElementById('amount-input');
  var error = document.getElementById('amount-error');
  var amount = parseAmount(input.value);
  if (amount === null) {
    error.hidden = false;
    return;
  }
  error.hidden = true;
  renderHeadline(amount);
  renderCards(amount);
  renderTable(amount);
  renderChart(amount);
}

function debounce(fn, ms) {
  var timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

document.getElementById('amount-input')
  .addEventListener('input', debounce(update, CONFIG.DEBOUNCE_MS));

document.getElementById('period-tabs').addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-years]');
  if (!btn) return;
  state.years = Number(btn.dataset.years);
  this.querySelectorAll('button').forEach(function (b) {
    b.classList.toggle('active', b === btn);
    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
  });
  update();
});

fetchRates().then(function (rates) {
  state.rates = rates;
  update();
});
