# Prueba de la sonda con Modelo_Costructora (C8v8dk17…)

Antes: sube `sac-probe.js` (build `…27b`), `sac-probe_styling.js`, y el `sac-probe.json` con `{{BASE_URL}}` sustituido. Ver `INSTRUCCIONES-SONDA.md` para la publicación.

Tabla de referencia: antes de empezar, crea en la misma story una **tabla normal de SAC** con el mismo modelo, filtrada igual que la sonda (ver cada prueba). Sirve para comparar totales.

---

## Prueba A: dimensiones sin jerarquía + propiedades + medidas de cuenta

**Objetivo:** puntos 1, 2, 3 (forma de celdas, `metadata`, medidas) y la duda de cómo llegan las cuentas.

**Feeds, en este orden (anótalo):**

| Feed | Qué agregar |
|---|---|
| `dims` | 1) `Version` 2) `Periodo` 3) `Entidad` (sin jerarquía activa: en el Builder, jerarquía "plana") |
| `props` | 1) propiedad `CATEGORY` de `Version` (tiene datos: Actuals/Budget) 2) propiedad `year` de `Periodo` (tiene datos) 3) propiedad `accType` de `Concepto` (**está vacía**: prueba cómo llega un valor vacío) |
| `measures` | las cuentas `421005` (Intereses), `510101` (Sueldos) y `533003` (Depreciacion) |

**Filtros del Builder:** `Version` = `public.Actual`; `Periodo` = 202401 a 202403; `Entidad` = `CC01`, `CC02`, `CC03`.

> Importante: en un modelo con cuentas, las cuentas entran por el feed de medidas. **No** agregues `Concepto` en `dims`. (Ver prueba D.)

**Qué copiarme:** el reporte completo.

**Qué miraré:**
- Si `props` llegan como `dimensions_N` extra y con qué campos (`id`, `label`…).
- Si `accType` vacío llega como `null`, `""` o ausente.
- Si `metadata` trae etiquetas de columnas y de cuentas.
- Forma de `measures_N` (`raw`, `formatted`) y si la moneda aparece en `formatted`.
- Cuántas filas llegan (esperado: 1 versión × 3 meses × 3 entidades = 9 filas por cuenta, o 9 filas con 3 columnas de medida, según cómo la entregue SAC).

---

## Prueba B: doble conteo con jerarquía

**Objetivo:** puntos 8 y 10. ¿Llegan nodos y hojas a la vez?

**Cambios sobre A:** en el Builder, activa la jerarquía de `Entidad` (`Jerraquia_Entidad`) y quita el filtro por `CC01–CC03`. Deja `Version` = `public.Actual`, `Periodo` = 202401, una sola cuenta (`510101`).

**Comparación obligatoria:** en la tabla normal de SAC, con los mismos filtros y la misma jerarquía, anota:
- El **total** (`Tot_Consolidado`) de `510101`.
- Qué nodos ves expandidos por defecto.

**Qué me das:** reporte de la sonda + los dos números de la tabla.

**Qué miraré:**
- `distinctIdsPerDimension`: si aparecen `Tot_Consolidado`, `CIA_A_TOT`, `VP1`, `GCIA1` (nodos) además de `CC01…` (hojas).
- `measureTotals.sumRaw` contra el total de la tabla: si es mayor, hay doble conteo y el adaptador del widget debe usar solo hojas.
- `hierarchyOrExtraCellFields`: si hay campos de padre, nivel o `isLeaf`.
- Si llegan nodos no expandidos (punto 10).

---

## Prueba C: origen de datos desde dentro del widget (sonda 27f)

**Objetivo:** puntos 9 y 10. El script de la story no ve el origen de datos, y la lista de métodos del widget puede quedar guardada con una versión anterior del manifiesto (`probeInvoke` no aparecía). Por eso la prueba se hace **con botones dentro del panel de la sonda**, sin script.

1. Reimporta el manifiesto 1.0.4. Si el panel no muestra botones, recarga la story (F5) o borra el widget y vuelve a insertarlo.
2. Pulsa **Las 4 lecturas** (`getHierarchies`, `getHierarchyLevel`, `getDimensions`, `getMembers`, todas sobre `Entidad`). Pulsa **Copiar reporte** y pégame el resultado: el `invokeLog` trae la respuesta de cada llamada.
3. Si las lecturas salieron con `"ok":true`, pulsa **Nivel 3**, espera un par de segundos, pulsa **Actualizar** y copia el reporte. Repite con **Expandir CIA_A_TOT** (después de volver a **Nivel 2**).
4. Para otros métodos o dimensiones, escribe el método (por ejemplo `ds.getHierarchies`) y los argumentos en JSON (por ejemplo `["Interco"]`) en las dos cajas y pulsa **Ejecutar**.

Si una llamada da `"ok":false`, copia el `error` tal cual.

## Prueba D: la dimensión de cuentas como dimensión

**Objetivo:** el pendiente "cuentas + medidas".

En un widget aparte (o quitando los feeds actuales): intenta agregar `Concepto` en `dims` y deja `measures` solo con la medida física del modelo, si SAC la ofrece.

**Anota:** si SAC te lo permite, qué mensaje da, y copia el reporte si llega.

---

## Prueba E: scripts de métodos y caché

Los bloques de la sección 3 y 4 de `INSTRUCCIONES-SONDA.md` (métodos sin `body`, propiedades, objeto devuelto, caché). Se pueden hacer con cualquiera de las pruebas anteriores montada.

---

## Hoja de resultados (rellénala o copia estas líneas al chat)

```
Tipo de story: Optimized / Classic
Orden de feeds usado (A): ...
Prueba A: reporte pegado: sí/no
Prueba B: total de la tabla de SAC = ...  | sumRaw de la sonda = ...  | nodos presentes: sí/no
Prueba C: consola pegada: sí/no
Prueba D: SAC permite Concepto en dims: sí/no
Prueba E: getProbeBuild() devuelve la letra nueva tras republicar: sí/no
```
