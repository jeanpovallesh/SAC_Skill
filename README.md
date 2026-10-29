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

## Skills de diseño complementarias (recomendado, opcional)

El skill funciona **completo por sí solo**: las decisiones visuales (tokens, paleta, tipografía, componentes, iconos, estados y lista de revisión) están en `SAC_HTML_STORIES_SKILL/references/design-guidelines.md`. Es el **modo básico** y no necesitas instalar nada.

Para una **mayor experiencia** en el diseño de los tableros se recomienda instalar además estas skills y **tenerlas todas disponibles a la vez**: cuando conviven en la misma sesión, el skill las consulta juntas al diseñar y los tableros salen más cuidados (menos aspecto genérico, mejor criterio de color, tipografía y gráficos, accesibilidad y movimiento). Si falta alguna, se usan las que haya; si no hay ninguna, se trabaja en modo básico, sin avisos ni errores.

| Skill | Qué aporta a los tableros | Instalación |
|---|---|---|
| `frontend-design` | Dirección estética antes de escribir código: tipografía, color, composición | `npx skills add https://github.com/anthropics/skills --skill frontend-design` |
| `ui-ux-pro-max` | Estilos visuales, paletas, pares tipográficos, tipo de gráfico adecuado y reglas de UX y accesibilidad (requiere Python 3) | `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max` |
| `design-taste-frontend` | Criterio anti-genérico y reglas de pantallas de trabajo (dashboards, tablas, KPI, gráficos) | `npx skills add https://github.com/leonxlnx/taste-skill --skill design-taste-frontend` |
| `emil-design-eng`, `animate`, `review-animations` | Transiciones y microinteracciones fluidas | `npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng --skill animate --skill review-animations` |
| `web-design-guidelines` | Revisión de accesibilidad y UX del código del runtime (la auditoría de cada widget la hace el propio skill) | `npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines` |

Notas:

- Los comandos instalan para **Claude Code**; añade `-g -a claude-code -y` para instalarlas globalmente (`~/.claude/skills`) sin preguntas. Se comprueba con `ls ~/.claude/skills`. Requiere Node.js.
- **Revisa cada skill antes de usarla:** son de terceros y corren con los permisos del agente.
- **Nada de esto cambia las reglas del skill.** Prevalecen siempre el contrato de SAC, las decisiones D1–D11 y el HTML de referencia que aportes; de las skills externas se descarta lo que no cabe en un widget embebido (navegación, fuentes web, recursos externos) y sus propuestas se traducen a los tokens de `design-guidelines.md`.
- Estado de la integración: hoy el skill las consulta en el paso de diseño; el criterio de movimiento (Emil Kowalski) ya está incorporado en la guía y en el runtime; la auditoría de cada widget (`scripts/audit_design.py`) ya forma parte del flujo y funciona sin skills externas; `web-design-guidelines` se usa a petición para revisar el código del runtime.

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
