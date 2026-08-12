/* ============================================================
   CONFIGURACIÓN DEL ADMIN
   - SHEET_CSV_URL: URL del Google Sheet publicado como CSV
     (Archivo → Compartir → Publicar en la web → formato CSV).
     Si está vacía o falla, se usan los valores por defecto
     definidos en calc.js (DEFAULT_RATES).
   - TRUST_STATS: cifras de la franja de confianza. Edítalas
     cuando tengáis datos actualizados.
   ============================================================ */
var CONFIG = {
  SHEET_CSV_URL: '',
  FETCH_TIMEOUT_MS: 2000,
  DEBOUNCE_MS: 200,
  MAX_AMOUNT: 99999999,
  SLIDER_MIN: 100,
  SLIDER_MAX: 100000,
};

/* Alternativas mostradas, con su icono y color de marca.
   "icon: 'brand'" usa el logo de Reental en vez de un icono genérico. */
var ASSETS = [
  { key: 'reental',       label: 'Reental',              icon: 'brand',    ink: '#F49300', tint: 'rgba(252,163,17,.14)', highlight: true },
  { key: 'alquiler',      label: 'Alquiler tradicional', icon: 'house',    ink: '#15803D', tint: 'rgba(21,128,61,.12)' },
  { key: 'rentaFija',     label: 'Renta fija',           icon: 'bank',     ink: '#475569', tint: 'rgba(71,85,105,.10)' },
  { key: 'rentaVariable', label: 'Renta variable',       icon: 'trending', ink: '#7C3AED', tint: 'rgba(124,58,237,.12)' },
  { key: 'oro',           label: 'Oro',                  icon: 'gem',      ink: '#96600F', tint: 'rgba(150,96,15,.13)' },
  { key: 'indexado',      label: 'Fondo indexado',       icon: 'layers',   ink: '#2563EB', tint: 'rgba(37,99,235,.12)' },
];

var TRUST_STATS = [
  { icon: 'building', value: '+110M',   label: 'tokenizados en activos inmobiliarios' },
  { icon: 'users',    value: '43K',     label: 'usuarios registrados' },
  { icon: 'globe',    value: '6 países', label: 'con proyectos activos' },
];

var TABLE_YEARS = [1, 3, 5, 10];
var CHART_YEARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var euroFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
var intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
var pctFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

var state = { rates: ReentalCalc.DEFAULT_RATES, years: 3, chart: null, chartOpen: false };

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

function computeResults(amount, years) {
  return ASSETS.map(function (asset) {
    var rate = state.rates[asset.key];
    return {
      key: asset.key,
      label: asset.label,
      icon: asset.icon,
      ink: asset.ink,
      tint: asset.tint,
      highlight: !!asset.highlight,
      rate: rate,
      gain: gain(amount, rate, years),
    };
  });
}

/* ---- Iconos estáticos (cabecera, CTA, franja de confianza) ---- */
function renderStaticIcons() {
  document.getElementById('cta-arrow').innerHTML = ReentalIcons.icon('arrow');
  document.getElementById('toggle-chevron').innerHTML = ReentalIcons.icon('chevron');

  TRUST_STATS.forEach(function (stat, i) {
    var el = document.getElementById('trust-icon-' + (i + 1));
    if (el) el.innerHTML = ReentalIcons.icon(stat.icon);
  });
}

/* ---- Resultado principal ---- */
function renderHero(amount, years, results) {
  var reental = results.filter(function (r) { return r.key === 'reental'; })[0];
  var others = results
    .filter(function (r) { return r.key !== 'reental'; })
    .slice()
    .sort(function (a, b) { return b.gain - a.gain; });
  var best = others[0];
  var worst = others[others.length - 1];

  document.getElementById('result-amount').textContent = '+' + euroFmt.format(Math.max(reental.gain, 0));
  document.getElementById('result-context').textContent =
    'en ' + years + (years === 1 ? ' año' : ' años') + ', invirtiendo ' + euroFmt.format(amount);

  var compareEl = document.getElementById('result-compare');
  if (reental.gain >= best.gain) {
    compareEl.innerHTML =
      '<div class="compare-item"><span class="compare-value">+' + euroFmt.format(reental.gain - best.gain) +
      '</span><span class="compare-label">más que ' + best.label + '</span></div>' +
      '<div class="compare-item"><span class="compare-value">+' + euroFmt.format(reental.gain - worst.gain) +
      '</span><span class="compare-label">más que ' + worst.label + '</span></div>';
  } else {
    compareEl.innerHTML = '<p class="compare-fallback">Compara cómo evoluciona tu inversión frente a otras alternativas del mercado.</p>';
  }
}

/* ---- Barras comparativas (visual principal) ---- */
function renderBars(amount, years, results) {
  var sorted = results.slice().sort(function (a, b) { return b.gain - a.gain; });
  var max = Math.max(sorted[0] ? sorted[0].gain : 1, 1);
  var el = document.getElementById('bars');

  el.innerHTML = sorted.map(function (r) {
    var isBrand = r.key === 'reental';
    var iconHtml = isBrand ? ReentalIcons.brandMark(22) : ReentalIcons.icon(r.icon);
    var iconClass = 'bar-icon';
    var fillBg = isBrand ? 'var(--grad)' : r.ink;
    var pct = Math.max((r.gain / max) * 100, 2);
    return (
      '<div class="bar-row' + (r.highlight ? ' highlight' : '') + '">' +
        '<div class="bar-head">' +
          '<span class="' + iconClass + '" style="--tint:' + r.tint + ';--ink:' + r.ink + '">' + iconHtml + '</span>' +
          '<div class="bar-info">' +
            '<p class="bar-name">' + r.label +
              (r.highlight ? '<span class="bar-badge">Mejor rentabilidad</span>' : '') + '</p>' +
            '<p class="bar-rate">' + pctFmt.format(r.rate) + ' % anual</p>' +
          '</div>' +
          '<p class="bar-gain">+' + euroFmt.format(r.gain) + '</p>' +
        '</div>' +
        '<div class="bar-track"><span class="bar-fill" data-target="' + pct.toFixed(1) + '" style="background:' + fillBg + '"></span></div>' +
      '</div>'
    );
  }).join('');

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      el.querySelectorAll('.bar-fill').forEach(function (f) {
        f.style.width = f.getAttribute('data-target') + '%';
      });
    });
  });

  document.getElementById('bars-note').textContent =
    'Ganancia estimada sobre ' + euroFmt.format(amount) + ' en ' + years + (years === 1 ? ' año' : ' años');
}

/* ---- Tabla de detalle ---- */
function renderTable(amount) {
  document.getElementById('table-body').innerHTML = ASSETS.map(function (asset) {
    var rate = state.rates[asset.key];
    var isBrand = asset.icon === 'brand';
    var iconHtml = isBrand ? ReentalIcons.brandMark(14) : ReentalIcons.icon(asset.icon);
    var iconClass = 'td-icon';
    var cells = TABLE_YEARS.map(function (years) {
      return '<td>+' + euroFmt.format(gain(amount, rate, years)) + '</td>';
    }).join('');
    return (
      '<tr' + (asset.highlight ? ' class="highlight"' : '') + '>' +
        '<td><span class="td-row"><span class="td-asset"><span class="' + iconClass + '" style="--tint:' + asset.tint + ';--ink:' + asset.ink + '">' +
        iconHtml + '</span>' + asset.label + '</span><span class="pct">' + pctFmt.format(rate) + ' %</span></span></td>' +
        cells +
      '</tr>'
    );
  }).join('');
}

/* ---- Panel avanzado: evolución año a año (Chart.js) ---- */
function renderChartLegend() {
  var el = document.getElementById('chart-legend');
  if (!el) return;
  el.innerHTML = ASSETS.map(function (asset) {
    var isBrand = asset.icon === 'brand';
    var iconHtml = isBrand ? ReentalIcons.brandMark(13) : ReentalIcons.icon(asset.icon);
    var iconClass = 'chart-legend-icon';
    return '<span class="chart-legend-item"><span class="' + iconClass + '" style="--tint:' + asset.tint + ';--ink:' + asset.ink + '">' +
      iconHtml + '</span>' + asset.label + '</span>';
  }).join('');
}

function renderChart(amount) {
  var datasets = ASSETS.map(function (asset) {
    var rate = state.rates[asset.key];
    var lineColor = asset.icon === 'brand' ? '#F49300' : asset.ink;
    return {
      label: asset.label,
      data: CHART_YEARS.map(function (y) { return gain(amount, rate, y); }),
      borderColor: lineColor,
      backgroundColor: lineColor,
      borderWidth: asset.highlight ? 3.5 : 1.75,
      pointRadius: CHART_YEARS.map(function (y) { return y === state.years ? 5 : 0; }),
      pointBackgroundColor: lineColor,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointHoverRadius: 5,
      tension: 0.3,
    };
  });

  if (state.chart) {
    state.chart.data.labels = CHART_YEARS.map(function (y) { return 'Año ' + y; });
    state.chart.data.datasets = datasets;
    state.chart.update();
  } else {
    state.chart = new Chart(document.getElementById('chart'), {
      type: 'line',
      data: { labels: CHART_YEARS.map(function (y) { return 'Año ' + y; }), datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            borderColor: 'rgba(20,24,31,.12)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            titleColor: '#666F7E',
            bodyColor: '#14181F',
            titleFont: { family: 'Fustat', size: 11.5, weight: '700' },
            bodyFont: { family: 'Fustat', size: 12.5, weight: '600' },
            callbacks: {
              label: function (ctx) { return ctx.dataset.label + ': +' + euroFmt.format(ctx.parsed.y); },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: 'rgba(20,24,31,.12)' },
            ticks: { color: '#666F7E', font: { family: 'Fustat', size: 11.5, weight: '600' } },
          },
          y: {
            grid: { color: 'rgba(20,24,31,.07)' },
            border: { display: false },
            ticks: {
              color: '#666F7E',
              font: { family: 'Fustat', size: 11.5, weight: '600' },
              callback: function (v) { return euroFmt.format(v); },
            },
          },
        },
      },
    });
  }

  renderChartLegend();
}

/* ---- Sincronización de controles de importe ---- */
function syncAmountControls(amount) {
  var slider = document.getElementById('amount-slider');
  var min = Number(slider.min), max = Number(slider.max);
  slider.value = Math.min(Math.max(amount, min), max);

  document.querySelectorAll('#amount-chips .chip').forEach(function (chip) {
    chip.classList.toggle('active', Number(chip.dataset.amount) === amount);
  });
}

function applyAmount(value) {
  document.getElementById('amount-input').value = intFmt.format(Math.round(value));
  update();
}

/* ---- Orquestación ---- */
function update() {
  var input = document.getElementById('amount-input');
  var error = document.getElementById('amount-error');
  var amount = parseAmount(input.value);
  if (amount === null) {
    error.hidden = false;
    return;
  }
  error.hidden = true;
  syncAmountControls(amount);

  var results = computeResults(amount, state.years);
  renderHero(amount, state.years, results);
  renderBars(amount, state.years, results);
  renderTable(amount);
  if (state.chartOpen) renderChart(amount);
}

function debounce(fn, ms) {
  var timer;
  return function () {
    var args = arguments, ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
  };
}

/* ---- Eventos ---- */
renderStaticIcons();

document.getElementById('amount-input')
  .addEventListener('input', debounce(update, CONFIG.DEBOUNCE_MS));

document.getElementById('amount-slider').addEventListener('input', function () {
  applyAmount(Number(this.value));
});

document.getElementById('amount-chips').addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-amount]');
  if (!btn) return;
  applyAmount(Number(btn.dataset.amount));
});

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

document.getElementById('advanced-toggle').addEventListener('click', function () {
  var box = document.getElementById('chart-box');
  var label = document.getElementById('toggle-label');
  state.chartOpen = !state.chartOpen;
  this.setAttribute('aria-expanded', state.chartOpen ? 'true' : 'false');
  box.hidden = !state.chartOpen;
  if (label) label.textContent = state.chartOpen ? 'Ocultar evolución año a año' : 'Ver evolución año a año';
  if (state.chartOpen) {
    var amount = parseAmount(document.getElementById('amount-input').value);
    if (amount !== null) renderChart(amount);
  }
});

fetchRates().then(function (rates) {
  state.rates = rates;
  update();
});
