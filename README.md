# SAC_Skill

Skill **SAC_HTML_STORIES_SKILL**: a partir del JSON de metadata de un modelo de SAP Analytics Cloud y una petición en lenguaje natural, genera los tres archivos de un widget personalizado de SAC (manifiesto `.json`, componente principal `.js` y `_styling.js`).

**Estado:** en construcción. Se está armando primero el conocimiento (`references/`), después el `SKILL.md`, los generadores y los validadores.

## Estructura

| Carpeta | Contenido |
|---|---|
| `SAC_HTML_STORIES_SKILL/references/` | Contrato del widget (R1–R14), esquema de la especificación (S1–S14), interpretación de la petición, catálogo de tipos de widget (C1–C18) y esquema de metadata del modelo (M1–M18) |
| `SAC_HTML_STORIES_SKILL/examples/` | Casos completos petición → especificación, modelos de ejemplo y HTML de referencia (referencias de estilo, no plantillas) |
| `SAC_HTML_STORIES_SKILL/scripts/` | `validate_model_json.py`: valida el JSON de metadata del modelo |
| `SAC_HTML_STORIES_SKILL/probe/` | Widget sonda para verificar cómo entrega SAC los datos (pendientes ⚠ del contrato, sección 8) |
| `SAC_HTML_STORIES_SKILL/prompts/` | Prompt para generar el JSON de metadata con el MCP de SAC |

## Uso rápido

```bash
python3 -I SAC_HTML_STORIES_SKILL/scripts/validate_model_json.py SAC_HTML_STORIES_SKILL/examples/models/model-metadata-rrhh.json
```

## Pendientes

- `design-guidelines.md`.
- Cerrar con la sonda los puntos ⚠ del contrato (forma de celdas, `metadata`, jerarquías, caché).
- JSON Schema formal de la metadata y validadores de especificación y de paquete.
- Plantillas del generador.
