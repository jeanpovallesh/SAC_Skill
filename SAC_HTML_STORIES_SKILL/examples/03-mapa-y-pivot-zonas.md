# Ejemplo 03: Mapa por zona (coordenadas de la dimensión) y tabla dinámica

Tercer caso: introduce los componentes `bubble-map` y `pivot-table`. Las coordenadas del mapa salen de **propiedades de la dimensión del eje** que el usuario indica al crear el tablero; la tabla dinámica se configura con las filas, columnas y medidas que el usuario especifica.

Modelo: `examples/models/model-metadata-distribucion-geo.json` (el de distribución con las propiedades `Latitud` y `Longitud` en `Zona_Regional`).

```json
{
  "specVersion": "1.0",
  "request": "Mapa de volumen por zona (con coordenadas de la dimensión) y tabla dinámica Zona > Canal por Periodo con Volumen y Facturación",
  "widget": {
    "name": "Mapa y Pivot de Distribución",
    "id": "com.isitec.mapapivotdistribucion",
    "tag": "com-isitec-mapapivotdistribucion",
    "version": "1.0.0",
    "prefix": "MapaPivotDistribucion",
    "description": "Mapa por zona y tabla dinámica de distribución",
    "mode": "solo-lectura",
    "scope": "contenido"
  },
  "model": {
    "id": "MODELO_DISTRIBUCION_GEO",
    "metadataRef": "models/model-metadata-distribucion-geo.json"
  },
  "hosting": {
    "baseUrl": "{{BASE_URL}}",
    "cacheBust": "?v=1.0.0"
  },
  "feeds": [
    {
      "index": 0,
      "role": "dimension",
      "ref": "Zona_Regional",
      "label": "Zona regional"
    },
    {
      "index": 1,
      "role": "dimension",
      "ref": "Canal",
      "label": "Canal"
    },
    {
      "index": 2,
      "role": "dimension",
      "ref": "Periodo",
      "label": "Periodo",
      "ordered": true,
      "usedFor": [
        "filter",
        "time"
      ]
    },
    {
      "index": 3,
      "role": "property",
      "ref": "Latitud",
      "of": "Zona_Regional",
      "label": "Latitud de la zona"
    },
    {
      "index": 4,
      "role": "property",
      "ref": "Longitud",
      "of": "Zona_Regional",
      "label": "Longitud de la zona"
    }
  ],
  "measures": [
    {
      "id": "Volumen",
      "ref": "Volumen_Cajas",
      "role": "value",
      "aggregation": "additive",
      "required": true,
      "format": "integer",
      "unit": "cajas",
      "label": "Volumen"
    },
    {
      "id": "Facturacion",
      "ref": "Facturacion_Bruta",
      "role": "value",
      "aggregation": "additive",
      "optional": true,
      "format": "currency",
      "label": "Facturación"
    }
  ],
  "memberRoles": {},
  "components": [
    {
      "id": "kpiVolumen",
      "type": "kpi-card",
      "title": "Volumen total",
      "uses": {
        "measures": [
          "Volumen"
        ]
      },
      "options": {
        "compact": true
      }
    },
    {
      "id": "mapaZonas",
      "type": "bubble-map",
      "title": "Volumen por zona",
      "uses": {
        "axis": "Zona_Regional",
        "lat": "Latitud",
        "lng": "Longitud",
        "measures": [
          "Volumen"
        ]
      },
      "requires": [
        "Latitud",
        "Longitud"
      ],
      "options": {
        "country": "Colombia",
        "selectionGroup": "zona",
        "labels": true
      },
      "layout": {
        "row": 2,
        "span": 6
      }
    },
    {
      "id": "pivotZonaCanal",
      "type": "pivot-table",
      "title": "Volumen y facturación por zona, canal y periodo",
      "uses": {
        "rows": [
          "Zona_Regional",
          "Canal"
        ],
        "columns": [
          "Periodo"
        ],
        "measures": [
          "Volumen",
          "Facturacion"
        ]
      },
      "options": {
        "rowTotal": true,
        "columnTotal": true,
        "heat": true,
        "search": "rows",
        "expandLevels": 1,
        "dropColumnsWithoutData": true
      }
    }
  ],
  "filters": [
    {
      "id": "fPeriodo",
      "target": "Periodo",
      "ui": "combobox",
      "by": [
        "id",
        "description"
      ],
      "includeAll": true,
      "default": "all"
    }
  ],
  "properties": [
    {
      "id": "title",
      "type": "string",
      "default": "Mapa y Pivot de Distribución",
      "label": "Título",
      "appliesTo": "tituloWidget"
    }
  ],
  "methods": [],
  "events": [],
  "theme": {
    "fontBody": "Inter, 'Segoe UI', Arial, sans-serif",
    "fontDisplay": "'Plus Jakarta Sans', Inter, 'Segoe UI', Arial, sans-serif",
    "colors": {
      "superficie": "#ffffff",
      "fondo": "#f8f9ff",
      "texto": "#0b1c30",
      "acento": "#0051d5",
      "positivo": "#006c4b",
      "alerta": "#ba1a1a"
    },
    "seriesPalette": [
      "#131b2e",
      "#0051d5",
      "#316bf3",
      "#6ffbbe",
      "#a3defe",
      "#b4c5ff",
      "#76777d",
      "#ffb3b6"
    ],
    "seriesColorRule": "estable por id de miembro, asignado por orden de id"
  },
  "assumptions": [
    "Las coordenadas salen de las propiedades Latitud y Longitud de la dimensión Zona_Regional (indicadas por el usuario); si faltan, el mapa avisa cuántos miembros no tienen coordenadas.",
    "El contorno del mapa es el de Colombia (options.country).",
    "La tabla dinámica la configura el usuario: filas Zona_Regional > Canal, columnas Periodo, medidas Volumen y Facturación.",
    "Los subtotales de cada nodo se recalculan con el motor (no se suman celdas ya sumadas)."
  ]
}
```
