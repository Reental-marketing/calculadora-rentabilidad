# Calculadora de inversión Reental

Calculadora estática que compara el crecimiento estimado de una inversión en
Reental frente a renta fija, renta variable, oro y fondo indexado, a 1, 3, 5 y
10 años (interés compuesto). Pensada para embeberse como iframe en reental.co.

## Cómo cambiar los porcentajes (admin)

1. Abre el Google Sheet de configuración: **(enlace pendiente — ver
   "Configuración inicial del Sheet")**.
2. Edita la columna `porcentaje` de la fila del activo que quieras cambiar.
   - Claves válidas: `reental`, `rentaFija`, `rentaVariable`, `oro`, `indexado`.
   - Valores entre 0 y 100. Vale punto o coma decimal (`16.25` o `16,25`).
3. Los cambios tardan **hasta ~5 minutos** en verse (caché de publicación de
   Google). No hace falta redeploy ni tocar código.

Si el Sheet no responde o un valor no es válido, la calculadora usa los valores
por defecto definidos en `calc.js` (`DEFAULT_RATES`).

## Configuración inicial del Sheet (una sola vez)

1. Crea un Google Sheet nuevo e importa `plantilla-sheet.csv`
   (Archivo → Importar → Subir).
2. Archivo → Compartir → **Publicar en la web** → selecciona la hoja →
   formato **Valores separados por comas (.csv)** → Publicar.
3. Copia la URL generada y pégala en `CONFIG.SHEET_CSV_URL` al principio de
   `app.js`. Haz commit y push — Vercel redespliega solo.

## Cambiar los valores por defecto

Edita `DEFAULT_RATES` en `calc.js`:

```js
var DEFAULT_RATES = {
  reental: 16.25,
  rentaFija: 3,
  rentaVariable: 7.5,
  oro: 7,
  indexado: 10,
};
```

## Desarrollo local

```bash
python3 -m http.server        # abrir http://localhost:8000
node --test test/calc.test.mjs   # ejecutar los tests
```

## Despliegue

Push a `main` → Vercel redespliega automáticamente. Proyecto sin build:
framework "Other", sin build command, output en la raíz.

## Embed en reental.co

```html
<iframe
  src="https://URL-DE-VERCEL.vercel.app/"
  width="100%"
  height="1100"
  style="border:0;"
  loading="lazy"
  title="Calculadora de inversión Reental">
</iframe>
```

## Aviso legal

Los resultados son estimaciones basadas en rentabilidades históricas/medias.
No constituyen rentabilidad garantizada ni asesoramiento financiero.
