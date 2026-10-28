# vendor

`echarts-5.5.1.min.js`: Apache ECharts 5.5.1 (Apache-2.0), compilación recortada (barras, pastel, dispersión, líneas, tooltip, leyenda, cuadrícula, marklines, aria) con el renderizador SVG.
Define `var __ECH` (el objeto `echarts`). El generador lo incluye en el JS principal **solo** si algún componente lo necesita (marca `needs:echarts` en su archivo).
Se verificó en el tenant (2026-10-28): funciona incluido en el JS y también por CDN.

Reconstruir: `npm i echarts@5.5.1 esbuild && npx esbuild echarts-entry.js --bundle --minify --format=iife --global-name=__ECH --outfile=e.js`, y añadir al final `__ECH = __ECH.default;`.
