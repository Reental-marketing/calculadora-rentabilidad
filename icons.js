/* Iconos de marca Reental.
   SVG en línea (sin dependencias externas) para que la calculadora
   funcione siempre offline/embebida y pese lo mínimo.
   Se carga como global ReentalIcons en navegador. */
(function (root) {
  var PATHS = {
    house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2V20h3.5a1 1 0 0 0 1-1v-9"/>',
    bank: '<path d="M3 9.5 12 4l9 5.5"/><path d="M4.5 9.5h15"/><path d="M5.5 9.5V19M9.5 9.5V19M14.5 9.5V19M18.5 9.5V19"/><path d="M3.5 19.5h17"/>',
    trending: '<path d="M3.5 17 9 11.5l4 4L20.5 7"/><path d="M15 7h5.5v5.5"/>',
    gem: '<path d="M5 4h14l3 5.5L12 21 2 9.5 5 4Z"/><path d="M2 9.5h20M9 4l-2 5.5L12 21M15 4l2 5.5L12 21"/>',
    layers: '<path d="M12 3 2.5 8.5 12 14l9.5-5.5L12 3Z"/><path d="M2.5 13.5 12 19l9.5-5.5"/>',
    users: '<circle cx="9" cy="8" r="3.25"/><path d="M2.75 19a6.25 6.25 0 0 1 12.5 0"/><path d="M15.5 5.5a3.25 3.25 0 0 1 0 6.4M21.25 19a5.75 5.75 0 0 0-4.5-6.4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M4 21h16M7 8h1M10.5 8h1M7 11.5h1M10.5 11.5h1M7 15h1M10.5 15h1M16 14h1M16 17h1"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    shield: '<path d="M12 3.5 19.5 6.5V11.5C19.5 16.2 16.3 19.6 12 21C7.7 19.6 4.5 16.2 4.5 11.5V6.5L12 3.5Z"/><path d="m9 12 2 2 4-4"/>',
  };

  function icon(name, strokeWidth) {
    var body = PATHS[name];
    if (!body) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (strokeWidth || 1.75) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body + '</svg>';
  }

  /* Logomark real de Reental ("R"), a color de marca (currentColor) para
     integrarse en el mismo tipo de tarjeta icónica (fondo tintado) que el
     resto de alternativas en tarjetas/tablas/barras. */
  function brandMark(size) {
    var s = size || 22;
    return '<svg width="' + s + '" height="' + (s * 973 / 846).toFixed(1) + '" viewBox="0 0 846 973" fill="currentColor" role="img" aria-label="Reental">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 15.1405C0 6.96154 6.63036 0.331177 14.8093 0.331177H412.263C435.128 0.331177 464.063 1.36697 493.875 8.95652C560.823 26.0002 651 69.7088 704.316 147.991C776.881 265.555 781.709 409.576 688.382 540.102C683.298 547.212 673.134 548.021 666.757 542.042L581.11 461.736C576.048 456.989 574.999 449.363 578.349 443.285C631.662 346.558 606.341 289.87 583.41 243.701C559.532 195.626 507.94 162.295 464.395 147.991C418.482 127.387 333.964 130.821 315.179 130.821H171.211C163.032 130.821 156.402 137.451 156.402 145.63V730.02C156.402 734.963 153.936 739.58 149.828 742.329L23.0445 827.154C13.2045 833.738 0 826.685 0 814.846V15.1405Z"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M429.32 573.622C432.828 571.174 437.576 571.536 440.673 574.488L843.043 957.955C848.921 963.556 844.956 973.463 836.837 973.463H651.999C642.622 973.463 633.615 969.802 626.896 963.261L421.123 762.903L355.679 697.458L320.592 662.371C316.632 658.412 317.213 651.836 321.805 648.632L429.32 573.622Z"/>' +
      '</svg>';
  }

  root.ReentalIcons = { icon: icon, brandMark: brandMark };
})(typeof window !== 'undefined' ? window : this);
