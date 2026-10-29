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

## Qué puedes pedir y qué comandos tienes

### El skill principal
**SAC_HTML_STORIES_SKILL** tiene un único punto de entrada: se invoca por su nombre (`/SAC_HTML_STORIES_SKILL` en Claude Code; según cómo esté instalado puede aparecer en minúsculas con guiones, `sac-html-stories-skill`) o simplemente describiendo lo que quieres. Además trae cinco **atajos** (comandos de barra, carpeta `SAC_HTML_STORIES_SKILL/commands/`) para los pasos del flujo; todo lo demás se le pide en lenguaje natural. Estas son las cosas que sabe hacer.

| Quieres… | Pídelo así (ejemplos) | Qué hace |
|---|---|---|
| Obtener la metadata del modelo | «Dame el prompt para sacar la metadata del modelo `<ID>`» | Prepara el prompt para Claude Code con el MCP de SAC (`make_metadata_prompt.py`) |
| Validar la metadata | «Valida este JSON del modelo» | Reglas M1–M18 y esquema (`validate_model_json.py`) |
| Crear un tablero | «Hazme un tablero con KPIs de volumen y margen, dona por canal y tabla de detalle» | Interpreta el pedido, hace las preguntas necesarias, escribe y valida la especificación (S1–S14, C) y **espera tu confirmación** antes de generar |
| Generar el widget | «Confirmado, genéralo» | Produce `<tag>.json`, `<tag>.js` y `<tag>_styling.js` y los valida (R1–R14, C17) |
| Auditar el diseño | «Audita el diseño del widget» | Renderiza a 320, 600 y 900 px y mide contraste, desbordes, foco, accesibilidad y movimiento reducido (`audit_design.py`); deja capturas |
| Seguir tu referencia visual | «Que se vea como este HTML» (adjunto) | Extrae colores, tipografía y estructura del HTML y los traduce al `theme` y los tokens |
| Comparar versiones | «Compara Real contra Presupuesto» | Tabla de varianza con Base/Comparar, Δ y Δ% (`variance-table`, regla D11) |
| Cambiar lo ya generado | «Cambia la paleta», «quita la tabla», «añade un filtro de zona» | Se modifica la especificación y se regenera; los archivos no se parchean a mano |
| Resolver un problema en SAC | «El widget no muestra datos» | Activa la propiedad `diagnostico` y explica qué feeds faltan o no coinciden |

Componentes disponibles hoy: tarjetas KPI (y variantes con comparación), dona de reparto, barras 100 % apiladas, tabla de detalle, matriz cruzada, matriz y mapa de burbujas, tabla de varianza y tabla dinámica. Los filtros de versión y de tiempo se incluyen siempre (D11).

### Atajos de barra del skill
| Comando | Qué hace | Argumento |
|---|---|---|
| `/sac-metadata` | Prepara el prompt para obtener la metadata del modelo | ID del modelo |
| `/sac-validar` | Valida el JSON de metadata (M1–M18) | ruta al JSON |
| `/sac-tablero` | Interpreta tu pedido y propone la especificación; **no genera** hasta que confirmes | descripción del tablero |
| `/sac-generar` | Genera los tres archivos, los valida y audita el diseño | spec, metadata, `--base-url` |
| `/sac-auditar` | Audita el diseño de un widget ya generado | ruta al `.js` y a la spec |

Instalación (una vez), copiando los atajos junto al skill:

```bash
mkdir -p ~/.claude/commands && cp SAC_HTML_STORIES_SKILL/commands/*.md ~/.claude/commands/
```

Sin instalarlos el skill funciona igual: son solo accesos directos al mismo flujo.

### Comandos de terminal (opcionales)
Todo lo anterior se puede ejecutar sin Claude, con `python3 -I`:

| Comando | Para qué |
|---|---|
| `SAC_HTML_STORIES_SKILL/scripts/make_metadata_prompt.py <ID>` | Prompt para obtener la metadata |
| `SAC_HTML_STORIES_SKILL/scripts/validate_model_json.py <metadata.json>` | Validar la metadata |
| `SAC_HTML_STORIES_SKILL/scripts/validate_spec.py <spec.json> <metadata.json>` | Validar la especificación |
| `SAC_HTML_STORIES_SKILL/scripts/generate_widget.py <spec.json> <metadata.json> --out <carpeta>` | Generar los tres archivos |
| `SAC_HTML_STORIES_SKILL/scripts/validate_bundle.py <tag>.json <tag>.js <tag>_styling.js --spec <spec.json>` | Validar el paquete |
| `SAC_HTML_STORIES_SKILL/scripts/audit_design.py <tag>.js <spec.json> --out <carpeta>` | Auditar el diseño |
| `SAC_HTML_STORIES_SKILL/tests/test_validators.py`, `test_variance.py`, `test_audit.py` | Pruebas del repositorio |

### Comandos de las skills de diseño complementarias
Si las instalas (sección siguiente), cada una añade su propio comando. Se pueden invocar a mano en cualquier momento, y el skill principal las consulta por su cuenta cuando están disponibles:

| Comando | Qué hace |
|---|---|
| `/frontend-design` | Dirección estética: tipografía, color y composición con carácter propio |
| `/ui-ux-pro-max` | Estilos, paletas, pares tipográficos, tipo de gráfico adecuado y reglas de UX y accesibilidad |
| `/design-taste-frontend` | Evita el aspecto genérico; incluye criterio para tableros y pantallas de trabajo |
| `/web-design-guidelines` | Revisa código de interfaz contra las Web Interface Guidelines (accesibilidad y UX) |
| `/emil-design-eng` | Criterio de Emil Kowalski sobre pulido de interfaz y decisiones de animación |
| `/animate` | Construye una animación desde cero decidiendo propósito, curva, duración e interrupción |
| `/review-animations` | Critica el movimiento ya existente |
| `/improve-animations` | Audita el movimiento de todo un código y entrega un plan priorizado (no modifica nada) |
| `/find-animation-opportunities` | Busca dónde falta animación y propone valores exactos (solo lectura) |

> Ojo: en un widget de datos casi todo el movimiento se descarta a propósito (ver `design-guidelines.md` §6.1). Estas skills proponen; el skill principal decide qué se aplica.

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
