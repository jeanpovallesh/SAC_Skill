# vendor

`echarts-5.5.1.min.js`: Apache ECharts 5.5.1 (Apache-2.0), compilación recortada (barras, pastel, dispersión, líneas, mapas/geo, visualMap, tooltip, leyenda, cuadrícula, marklines, gráficos libres, aria) con el renderizador SVG.
Define `var __ECH` (el objeto `echarts`). El generador lo incluye en el JS principal **solo** si algún componente lo necesita (marca `needs:echarts` en su archivo).
Se verificó en el tenant (2026-10-28): funciona incluido en el JS y también por CDN.

Reconstruir: `npm i echarts@5.5.1 esbuild && npx esbuild echarts-entry.js --bundle --minify --format=iife --global-name=__ECH --outfile=e.js`, y añadir al final `__ECH = __ECH.default;`.

`geo/countries.json`: contornos de países (nombre en inglés → geometría GeoJSON, 2 decimales) generados desde `world-atlas@2` (countries-50m, ISC; datos de Natural Earth, dominio público). El generador incluye en el widget solo los países usados en `options.country` de los componentes `bubble-map`.
