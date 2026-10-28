---
name: SAC_HTML_STORIES_SKILL
description: Genera y valida los tres archivos de un widget custom de SAP Analytics Cloud (manifiesto .json, JS principal y _styling.js) a partir del JSON de metadatos de un modelo de SAC y un pedido en lenguaje natural. Úsalo cuando el usuario pida un tablero, gráfico, tabla, KPI o componente de captura para una story de SAC y aporte (o pueda aportar) la metadata del modelo.
---

# SAC_HTML_STORIES_SKILL

Convierte **metadata de un modelo de SAC + un pedido en texto libre** en un widget custom listo para subir a SAC: manifiesto, JS principal y JS de styling, coherentes entre sí y validados.

**Estado:** el conocimiento (`references/`) y la sonda están completos y verificados contra un tenant real. Los validadores de especificación y de paquete, y las plantillas del generador, están **pendientes** (ver sección 8): hasta que existan, la generación se hace a mano siguiendo las referencias y la validación se hace con la tabla R1–R14 del contrato.

---

## 1. Principio de trabajo

```
pedido ─┐
        ├─► interpretar ─► ESPECIFICACIÓN ─► confirmar con el usuario ─► 3 archivos ─► validar ─► entregar
metadata┘
```

- La **especificación** (`widget-spec`) es la única fuente de verdad. Los tres archivos salen de ella, nunca se editan por separado.
- Los ejemplos de `examples/` son **referencias de composición, no plantillas**. El resultado sale del pedido y del modelo.
- Nada se inventa: cada dimensión, propiedad y medida citada existe en la metadata.
- Asumir y declarar; preguntar poco (máximo 3 preguntas, cada una con valor por defecto).

---

## 2. Entradas

1. **JSON canónico de metadata del modelo** (entrada oficial). Formato en `references/model-metadata-schema.md`. Si el usuario no lo tiene, `prompts/prompt-generar-metadata-modelo.md` indica cómo pedirlo al MCP de SAC desde VS Code. El export físico de SAC solo vale como respaldo (esquema §5.4).
   - Validar siempre antes de usarlo: `python3 -I scripts/validate_model_json.py <archivo.json>` (reglas M1–M18).
2. **Pedido** del usuario en texto libre. Puede incluir un HTML de referencia (procedimiento en `references/intent-interpretation.md` §10).
3. **URL base del host** donde se publicarán los JS (ver sección 7). Si no la da, se deja como parámetro y se avisa.

---

## 3. Flujo

1. **Validar la metadata** (M1–M18). Si falla, detenerse y explicar qué corregir.
2. **Interpretar el pedido** (`references/intent-interpretation.md`): familia de widget, términos enlazados a ids del modelo, roles, composición, comparación solo si la piden (D7).
3. **Escribir la especificación** (`references/widget-spec-schema.md`) y pasar S1–S14.
4. **Mostrar el resumen al usuario** (formato en `intent-interpretation.md` §11): orden de feeds, medidas, componentes, filtros, propiedades, supuestos y preguntas abiertas. **No generar hasta que confirme.**
5. **Generar los tres archivos** desde la especificación, con el catálogo `references/widget-types.md` y las reglas de `references/sac-widget-contract.md`.
6. **Validar el paquete** (R1–R14 del contrato, y C1–C18 del catálogo). Corregir en la especificación y regenerar; no parchear los archivos.
7. **Entregar** (sección 6): los tres archivos, la nota de instalación con el orden de feeds, y los supuestos.

---

## 4. Decisiones permanentes (D1–D10)

Aplican a todo pedido salvo que el usuario diga lo contrario (detalle en `intent-interpretation.md` §2):

D1 el widget es solo el área de contenido · D2 los filtros del tablero son filtros internos sobre feeds · D3 los KPIs de datos inciertos son opcionales · D4 sin insights ni textos analíticos salvo petición · D5 los ejemplos son referencias · D6 todo modelo tiene tiempo y los saldos son semiaditivos · D7 comparar periodos solo si lo piden · D8 filtros de selección múltiple (`Periodo` simple por defecto) · D9 sin combinaciones duplicadas en captura · D10 las tablas pueden elegir jerarquía y mostrarla en árbol.

---

## 5. Reglas verificadas en SAC que el generador debe respetar

Todas comprobadas con la sonda en un story Optimized. Detalle y evidencia en `references/sac-widget-contract.md` (§3.4 y §8).

### Datos
- Las columnas se llaman `<feedId>_<índice>` (`dims_0`, `props_0`, `measures_0`). El mapa columna→dimensión se lee de `metadata.dimensions` en ejecución; **el orden puede cambiar entre ejecuciones**, no se asume por posición.
- Celda de dimensión `{id,label}`; de medida `{raw, formatted, unit}` (la moneda llega resuelta en `unit`); una propiedad con valor vacío es `{id:"",label:""}` y **actúa como agrupación**.
- Una dimensión que no está en ningún feed la **agrega SAC** (suma).
- El binding tiene `state`: `success`, `loading` (sin `data` ni `metadata`) o `error` (`messages`). **Mantener el último render mientras está en `loading`.** No copiar `changed` entero al estado del widget.
- Los ids del JSON canónico y los de SAC difieren (propiedades `year` vs `Periodo.YEAR`, cuentas `Concepto` vs `@MeasureDimension`, miembros de jerarquía `CIA_A` vs `[Entidad].[Jerraquia_Entidad].&[CIA_A]`): el adaptador compara sin distinguir mayúsculas y normaliza los nombres únicos.
- Un modelo con cuentas **no permite** la dimensión de cuentas como dimensión del feed; las cuentas entran como columnas del feed de medidas (`mainStructureMember`).

### Jerarquías
- SAC entrega **un nivel a la vez**, el configurado; sin mezcla de nodos y hojas ni doble conteo.
- Con jerarquía activa el `id` es el nombre único `[Dim].[Jer].&[Miembro]` y trae `isNode`, `isCollapsed` y `parentId`; las hojas no traen `isNode`/`isCollapsed`. Con `@FlatHierarchy` el `id` es simple.
- Desde el JS del widget (nunca desde el script de la story) se puede usar `this.dataBindings.getDataBinding("myDataBinding").getDataSource()` con el subconjunto público: `getHierarchies`, `setHierarchy`, `getHierarchyLevel`, `setHierarchyLevel`, `expandNode`, `collapseNode`, `getMembers`, `getDimensions`, `getDimensionProperties`, `getDimensionFilters`, `setDimensionFilter`, `removeDimensionFilter`, `getVariables`, `setVariableValue`, `refreshData`, `setRefreshPaused`. Todas devuelven **promesas**; proteger con `typeof … === 'function'`.
- `setHierarchy` reinicia la vista al nodo raíz: **volver a llamar `setHierarchyLevel`** después.
- `expandNode(dim, { dim: "<id único>" })` añade los hijos **conservando la fila del padre**: la suma cruda se duplica. Con nodos expandidos, las filas `isNode && !isCollapsed` son subtotales y se excluyen de las sumas. Usar siempre el nombre único, también en `collapseNode`.
- `getMembers` devuelve todo el maestro (también miembros sin datos): úsalo para los selectores. `fetchHierarchyLevels` no se usa; los niveles se llaman "Nivel N".

### Manifiesto, métodos y propiedades
- Las **propiedades no generan accesores** en la story. Para leer o cambiar una desde la story hay que declarar métodos `getX` y `setX` en el manifiesto e implementarlos.
- Un método **nunca devuelve un objeto ni una promesa**: devuelve `string` (con `JSON.stringify`) o un primitivo coherente con su `returnType`. Un resultado asíncrono se guarda en el widget y se expone con un `getX` síncrono o se notifica por evento.
- La lista de métodos queda en caché en la instancia del widget: tras cambiar el manifiesto, insertar un widget nuevo en la story.
- El script de la story no llega al origen de datos: si la story necesita un filtro, el widget expone un método explícito.

---

## 6. Entrega

1. `<nombre>.json`, `<nombre>.js`, `<nombre>_styling.js`, con nombres y tags coherentes (R1–R3, R13).
2. **Nota de instalación** con el **orden exacto de feeds** que debe agregar en el Builder (sale de `feeds` y de `feedRoles`) y cuántos feeds consume (límite 8).
3. **Supuestos** hechos y preguntas abiertas.
4. Resultado de la validación (reglas ejecutadas y resultado).

Antes de entregar, repasar la checklist de `sac-widget-contract.md` §7.

---

## 7. Hosting (jsDelivr fijado a commit)

- Los JS se publican en un **repositorio público de GitHub** y el manifiesto apunta a ellos por `https://cdn.jsdelivr.net/gh/<usuario>/<repo>@<commit>/<ruta>/<archivo>.js`. Fijar el hash del commit evita problemas de caché de rama.
- **Cada cambio de JS exige un commit nuevo, actualizar el hash en el manifiesto y subir su `version`**, y reimportar el manifiesto en SAC.
- Si el usuario tiene su propio host (por ejemplo `resources.kiplan.io`), se usa su URL base (`hosting.baseUrl`).
- Los datos del cliente (modelos, widgets originales) **no se suben a un repositorio público** sin que el usuario lo autorice.
- A futuro, cada cliente puede tener su **propio repositorio** de widgets, separado del repositorio del skill; el skill solo necesita `hosting.baseUrl` o el par usuario/repo, así que el cambio no afecta al flujo.

---

## 8. Estado de los componentes del skill

| Componente | Estado |
|---|---|
| `references/` (contrato, esquema de spec, interpretación, catálogo, esquema de metadata) | Completo; `widget-types.md` (§2.1, §2.13, §5.3) y el esquema de la especificación ya incorporan lo verificado en la sonda |
| `scripts/validate_model_json.py` (M1–M18) | Hecho |
| `probe/` (widget sonda y pruebas) | Hecho; ítems 1–12 del contrato cerrados |
| `design-guidelines.md` | Pendiente |
| JSON Schema formal de la metadata | Pendiente |
| Validador de especificación (S1–S14) y de paquete (R1–R14, C1–C18) | Pendiente |
| Plantillas del generador (manifiesto, JS principal, styling) | Pendiente |
| `convert_sac_metadata.py` (export de SAC → JSON canónico) | Pendiente |

Mientras los validadores no existan, el paquete se revisa a mano con las tablas R1–R14 (contrato §6) y se declara en la entrega qué reglas se comprobaron y cómo.

---

## 9. Mapa de archivos

| Necesito… | Leer |
|---|---|
| Qué debe cumplir cada archivo y su coherencia | `references/sac-widget-contract.md` |
| Cómo se interpreta el pedido, preguntas, patrones | `references/intent-interpretation.md` |
| Estructura de la especificación y S1–S14 | `references/widget-spec-schema.md` |
| Componentes disponibles, opciones y C1–C18 | `references/widget-types.md` |
| Formato del JSON del modelo y M1–M18 | `references/model-metadata-schema.md` |
| Ver un caso completo pedido → especificación | `examples/01-rrhh-demografia-genero.md`, `examples/02-scm-distribucion-zonas-canales.md` |
| Estilo visual de referencia | `examples/reference-html/` |
| Cómo se obtiene la metadata | `prompts/prompt-generar-metadata-modelo.md` |
| Comprobar un comportamiento de SAC | `probe/` |
