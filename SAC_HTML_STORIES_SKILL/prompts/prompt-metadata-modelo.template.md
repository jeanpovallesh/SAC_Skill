# Prompt para obtener la metadata del modelo {{MODEL_ID}} (Claude Code con el MCP de SAC)

Copia el bloque en Claude Code (VS Code) con el MCP de SAC activo, en la carpeta donde quieras el archivo.

````
Necesito que leas la estructura del modelo de SAC con ID {{MODEL_ID}} usando el MCP de SAC y generes UN archivo JSON llamado model-metadata-{{MODEL_ID}}.json con EXACTAMENTE la estructura de abajo (no uses la estructura física de la API de importación, ni agregues campos).

Cómo obtener los datos:
- Empieza con la herramienta de metadata del modelo (sac_import_get_model_metadata con modelId = {{MODEL_ID}}) para conocer dimensiones, propiedades y medidas.
- Para los miembros y las jerarquías usa las herramientas de maestro de dimensiones del MCP (por ejemplo sac_export_get_dimension_master o sac_export_get_dimension_master_hierarchy, si están disponibles) y, para las cuentas, las de datos del modelo.
- Si una herramienta falla o un dato no está disponible, NO lo inventes (ver regla 6).

Estructura exacta del JSON:

{
  "schema_version": "1.0",
  "model": { "id": "{{MODEL_ID}}", "name": "", "type": "planning | analytic", "description": "" },
  "dimensions": [
    {
      "id": "nombre técnico de la dimensión",
      "description": "nombre visible",
      "type": "version | time | account | organization | category | generic",
      "ordered": true/false,            // true en tiempo y en dimensiones con orden natural
      "granularity": "month",           // solo en la dimensión de tiempo (day/month/quarter/year)
      "synonyms": ["otros nombres en español"],
      "properties": [ { "id": "", "description": "", "type": "string | number | date | boolean" } ],
      "hierarchies": [
        { "id": "", "description": "", "kind": "level | parent-child", "default": true/false,
          "levels": [ { "id": "", "description": "" } ] }       // levels solo si kind = level
      ],
      "members": [ { "id": "", "description": "", "parent_id": "", "properties": { "<propiedad>": "valor" } } ],
      "members_complete": true
    }
  ],
  "measures": [
    {
      "id": "", "description": "",
      "unit": "currency | unit | number | percent",
      "type": "fixed | variable",       // variable = la unidad depende de otra dimensión (p. ej. moneda de la entidad)
      "unit_value": "USD | personas | ... | null si es variable",
      "decimals": 0,
      "aggregation": "additive | semi-additive | non-additive",
      "time_aggregation": "last | avg", // solo si es semi-additive
      "components": { "numerator": "<id medida>", "denominator": "<id medida>" }, // solo ratios
      "good_direction": "up | down",
      "synonyms": []
    }
  ]
}

Reglas:
1. Incluye TODAS las dimensiones del modelo, con sus propiedades y TODAS sus jerarquías (marca cuál es la predeterminada; si el MCP no lo indica, la primera, y dilo en "_inferred").
2. Incluye "members" (con members_complete: true) en las dimensiones con 200 miembros o menos. En las más grandes omite "members" y "members_complete", EXCEPTO si la dimensión tiene propiedades de coordenadas (latitud/longitud) o de agrupación que el tablero necesite: en ese caso incluye los miembros con esas propiedades.
3. En "members" usa "parent_id" solo con la jerarquía predeterminada; los miembros sin padre no llevan "parent_id".
4. Si hay dimensión de cuentas (type account), incluye SIEMPRE todos sus miembros, con su tipo en la propiedad "accType" (INC, EXP, AST, LEQ...) y descripción. Cada cuenta de negocio (ingresos, gastos, headcount, etc.) va además como entrada en "measures": INC/EXP = additive; AST/LEQ = semi-additive con time_aggregation "last". Indica en "_inferred" cuáles cuentas tienen datos y cuáles no. Si accType viene vacío, NO lo adivines.
5. Si la dimensión de entidad tiene propiedad de moneda, las medidas en moneda son type "variable" con unit_value null.
6. Descripciones: usa la descripción legible del modelo, no el nombre técnico repetido. Si no existe, deja "" (no copies el id). Si algo no se puede obtener con el MCP, NO lo inventes: deja el campo vacío y añade al final del JSON un objeto "_inferred" que liste qué falta y por qué.
7. No incluyas datos de hechos (cifras), solo estructura y maestros.
8. Entrega solo JSON válido (sin comentarios, sin comas finales), guardado en el archivo indicado. Al terminar, di en una línea cuántas dimensiones, medidas y miembros incluiste, y qué quedó en "_inferred".
````

## Después de generarlo
1. Entrégale el archivo al skill. Primero se valida: `python3 -I scripts/validate_model_json.py model-metadata-{{MODEL_ID}}.json` (reglas M1–M18).
2. Comprobación rápida: cada dimensión trae `id`, `description` y `type`; hay exactamente una dimensión `time`; las cuentas (si existen) están en `members` y en `measures`; las jerarquías están o `_inferred` explica por qué no.
