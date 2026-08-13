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

var euroFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
var intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
var pctFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

var state = { rates: ReentalCalc.DEFAULT_RATES, years: 3 };

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
  document.getElementById('cta-arrow-2').innerHTML = ReentalIcons.icon('arrow');
  document.getElementById('step1-arrow').innerHTML = ReentalIcons.icon('arrow');

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

/* ---- Comparativa por plazo (identidad + tabla de interés compuesto) ---- */
var PERIOD_LABELS = { 1: '1 año', 3: '3 años', 5: '5 años', 10: '10 años' };

function renderCompare(amount, years, results) {
  /* Orden de mayor a menor rentabilidad media. Como el interés compuesto es
     monótono en la tasa (a más % siempre más ganancia, en cualquier
     plazo > 0), este orden es el mismo para los 4 plazos a la vez, así
     que basta con ordenar una vez por tasa. */
  var sorted = results.slice().sort(function (a, b) { return b.rate - a.rate; });
  var maxRate = Math.max.apply(null, sorted.map(function (r) { return r.rate; }));

  var el = document.getElementById('compare-rows');
  el.innerHTML = sorted.map(function (r) {
    var isBrand = r.key === 'reental';
    var iconHtml = isBrand ? ReentalIcons.brandMark(22) : ReentalIcons.icon(r.icon);
    var fillBg = isBrand ? 'var(--grad)' : r.ink;
    var ratePct = Math.max((r.rate / maxRate) * 100, 4);

    var periods = TABLE_YEARS.map(function (y) {
      var value = gain(amount, r.rate, y);
      return (
        '<div class="compare-period' + (y === years ? ' is-selected' : '') + '">' +
          '<span class="compare-period-label">' + PERIOD_LABELS[y] + '</span>' +
          '<span class="compare-period-value">+' + euroFmt.format(value) + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="compare-row' + (r.highlight ? ' highlight' : '') + '">' +
        '<div class="compare-id">' +
          '<span class="compare-icon" style="--tint:' + r.tint + ';--ink:' + r.ink + '">' + iconHtml + '</span>' +
          '<div class="compare-info">' +
            '<p class="compare-name">' + r.label +
              (r.highlight ? '<span class="compare-badge">Mejor rentabilidad</span>' : '') + '</p>' +
            '<p class="compare-rate">' + pctFmt.format(r.rate) + ' % anual<sup>*</sup></p>' +
            '<div class="compare-rate-track"><span class="compare-rate-fill" data-target="' + ratePct.toFixed(1) + '" style="background:' + fillBg + '"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="compare-periods">' + periods + '</div>' +
      '</div>'
    );
  }).join('');

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      el.querySelectorAll('.compare-rate-fill').forEach(function (f) {
        f.style.width = f.getAttribute('data-target') + '%';
      });
    });
  });

  document.getElementById('compare-note').textContent =
    'Ganancia estimada sobre ' + euroFmt.format(amount) + ' · interés compuesto';
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
  renderCompare(amount, state.years, results);
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

/* ---- Wizard: 2 pasos (importe + plazo → resultado editable) ---- */
function goToStep(n) {
  document.getElementById('step-1').hidden = n !== 1;
  document.getElementById('step-2').hidden = n !== 2;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('step1-next').addEventListener('click', function () {
  var amount = parseAmount(document.getElementById('amount-input').value);
  var error = document.getElementById('amount-error');
  if (amount === null) {
    error.hidden = false;
    return;
  }
  error.hidden = true;

  /* Mueve (no duplica) los campos reales de importe y plazo a la barra de
     ajuste del paso 2, para que sigan siendo los mismos inputs editables. */
  var adjustBar = document.getElementById('adjust-bar');
  adjustBar.appendChild(document.querySelector('.amount-field'));
  adjustBar.appendChild(document.querySelector('.period-field'));

  goToStep(2);

  /* Vuelve a pintar el comparativo para que la animación de crecimiento se
     vea justo al revelar el resultado, en vez de haber ocurrido ya en
     segundo plano mientras el usuario completaba el paso anterior. */
  renderCompare(amount, state.years, computeResults(amount, state.years));
});

fetchRates().then(function (rates) {
  state.rates = rates;
  update();
});
