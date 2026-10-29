# SAC_Skill

Skill **SAC_HTML_STORIES_SKILL**: a partir del JSON de metadata de un modelo de SAP Analytics Cloud y una petición en lenguaje natural, genera los tres archivos de un widget personalizado de SAC (manifiesto `.json`, componente principal `.js` y `_styling.js`).

## Flujo de trabajo (qué debe hacer el usuario)

### Paso 1. Obtener la metadata del modelo
Con el **ID del modelo de SAC** se genera el prompt para Claude Code (con el MCP de SAC activo):

```bash
python3 -I SAC_HTML_STORIES_SKILL/scripts/make_metadata_prompt.py <ID_DEL_MODELO> --out prompt.md
```

(o pídeselo a Claude dándole solo el ID). Pega el bloque del `prompt.md` en Claude Code; produce `model-metadata-<ID>.json` con el formato canónico. Plantilla: `SAC_HTML_STORIES_SKILL/prompts/prompt-metadata-modelo.template.md`.

### Paso 2. Validar la metadata
```bash
python3 -I SAC_HTML_STORIES_SKILL/scripts/validate_model_json.py model-metadata-<ID>.json
```
Reglas M1–M18. Corrige o pide regenerar si hay errores.

### Paso 3. Pedir el tablero
Entrega a Claude el JSON validado y describe en lenguaje natural lo que quieres (KPIs, gráficos, tablas, filtros, mapa, pivot). Claude hace las preguntas necesarias, por ejemplo:
- **Mapas:** de qué dimensión y propiedades salen latitud/longitud, y el país (contorno).
- **Pivot tables:** filas, columnas y medidas de cada tabla (se configuran estrictamente como tú indiques).

**Siempre, aunque no lo pidas:** todo tablero lleva un filtro de la dimensión de tipo *versión* (selección múltiple, sin «Todos») y otro de la de tipo *tiempo* (regla D11, ambos de selección múltiple). Si a una especificación le faltan, se agregan con `python3 -I SAC_HTML_STORIES_SKILL/scripts/add_mandatory_filters.py spec.json model-metadata-<ID>.json`.

Claude produce una *especificación* (widget-spec) y la valida (`validate_spec.py`, S0–S14 y C1–C20).
```bash
python3 -I SAC_HTML_STORIES_SKILL/scripts/validate_spec.py spec.json model-metadata-<ID>.json
```

### Paso 4. Generar el widget
```bash
python3 -I SAC_HTML_STORIES_SKILL/scripts/generate_widget.py spec.json model-metadata-<ID>.json --out salida/ [--base-url URL_JSDELIVR]
cd salida
python3 -I ../SAC_HTML_STORIES_SKILL/scripts/validate_bundle.py <tag>.json <tag>.js <tag>_styling.js --spec ../spec.json    # R1–R14, C17
```
Resultado: `<tag>.json`, `<tag>.js`, `<tag>_styling.js`.

### Paso 5. Publicar y cargar en SAC
1. Sube los archivos al repositorio (commit) y fija el manifiesto a ese commit vía jsDelivr (`--base-url`).
2. En SAC: *Aplicaciones → Widgets personalizados → Crear*, pega la URL del manifiesto `.json`.
3. Inserta el widget en la historia/aplicación, enlaza los datos (feeds de dimensiones, propiedades y medidas) y, si algo no se ve, activa la propiedad `diagnostico`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `SAC_HTML_STORIES_SKILL/SKILL.md` | Instrucciones del skill y estado |
| `SAC_HTML_STORIES_SKILL/references/` | Contrato del widget, esquema de especificación, interpretación de la petición, catálogo de tipos (kpi, barras, dona, burbujas, matriz, tabla, pivot, mapa), guías de diseño y esquema de metadata |
| `SAC_HTML_STORIES_SKILL/templates/` | Runtime y componentes que usa el generador; ECharts 5.5.1 embebido y contornos de países |
| `SAC_HTML_STORIES_SKILL/scripts/` | `make_metadata_prompt.py`, `generate_widget.py` y validadores (`validate_model_json.py`, `validate_spec.py`, `validate_bundle.py`) |
| `SAC_HTML_STORIES_SKILL/examples/` | Casos petición → especificación y modelos de ejemplo |
| `SAC_HTML_STORIES_SKILL/generated/` | Widgets generados de ejemplo |
| `SAC_HTML_STORIES_SKILL/probe/` | Widgets sonda usados para verificar el comportamiento de SAC |
| `SAC_HTML_STORIES_SKILL/prompts/` | Plantilla y versión genérica del prompt de metadata |
| `SAC_HTML_STORIES_SKILL/tests/` | Pruebas (`python3 -I tests/test_validators.py`) y renderizado con Chromium |

## Pendientes
- `convert_sac_metadata.py` (export físico de SAC → JSON canónico).
- Tablas en árbol con jerarquías del modelo, línea de tendencia, pirámide, comparación, componentes de captura y mapa con Leaflet.
- Textos fijos de la interfaz (Total, Buscar…, Todos, Otros) como propiedades editables.
