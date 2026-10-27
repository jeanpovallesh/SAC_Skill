# Prompt para generar el JSON de metadata del modelo (usar con el MCP de SAC)

Copia el bloque siguiente en Claude Code (VS Code) con el MCP de SAC activo. Sustituye `<MODELO>` por el nombre o ID del modelo.

````
Necesito que leas la estructura del modelo <MODELO> de mi tenant de SAC con el MCP de SAC y generes UN archivo JSON llamado model-metadata-<MODELO>.json con EXACTAMENTE esta estructura (no uses la estructura física de la API de importación):

{
  "schema_version": "1.0",
  "model": { "id": "", "name": "", "type": "planning | analytic", "description": "" },
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
1. Incluye TODAS las dimensiones del modelo, con sus propiedades y TODAS sus jerarquías (indica cuál es la predeterminada).
2. Incluye "members" solo en dimensiones con 200 miembros o menos (con members_complete: true). En las más grandes, omite members.
3. Si el modelo tiene dimensión de cuentas (tipo account), incluye SIEMPRE todos sus miembros, con su tipo de cuenta en una propiedad "accType" (INC, EXP, AST, LEQ...) y descripción. Cada cuenta de negocio (ingresos, gastos, headcount, etc.) debe describirse además como una entrada en "measures", con aggregation: INC/EXP = additive; AST/LEQ = semi-additive con time_aggregation "last".
4. Si la dimensión de entidad tiene propiedad de moneda, las medidas en moneda son type "variable" con unit_value null.
5. Descripciones: usa la descripción legible del modelo, no el nombre técnico repetido.
6. Si algún dato no se puede obtener con el MCP (por ejemplo, las jerarquías), NO lo inventes: deja el campo vacío y añade al final del JSON un objeto "_inferred" que liste qué falta y por qué.
7. Entrega solo el JSON válido (sin comentarios, sin comas finales).
````

## Comprobación rápida del resultado
- Cada dimensión trae `id`, `description` y `type`.
- Hay exactamente una dimensión `time`.
- Las cuentas (si existen) están en `members` y en `measures`.
- Las jerarquías están, o `_inferred` explica por qué no.
