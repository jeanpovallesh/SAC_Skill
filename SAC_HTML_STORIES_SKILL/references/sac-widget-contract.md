# Contrato de un widget custom de SAC

Referencia para SAC_HTML_STORIES_SKILL. Describe las reglas que deben cumplir, a la vez, los tres archivos de un widget: el **manifiesto JSON**, el **JS principal** y el **JS de styling**. Si una sola regla de este documento se rompe, SAC no carga el widget o lo carga roto.

Leyenda de confianza usada en todo el documento:

- ✅ **Observado**: se ve en los archivos reales de Jean Poul (Generador de Combinaciones, v1.0.0, v2.2.0 y v3).
- 📘 **Framework**: conocimiento general del framework de widgets custom de SAC. Es estable, pero debe confirmarse en el tenant.
- ⚠ **Por verificar**: depende del comportamiento real de SAC. Se confirma con el widget sonda antes de darlo por regla.

---

## 1. Los tres archivos y cómo se relacionan

| Archivo | Rol | Se carga cuando |
|---|---|---|
| `<nombre>.json` | Manifiesto: declara identidad, componentes, propiedades, métodos, eventos y bindings de datos | Al subir el widget a SAC |
| `<nombre>.js` | Web Component principal: dibuja el widget, lee datos, expone métodos | Al añadir el widget a una story o aplicación |
| `<nombre>_styling.js` | Web Component del panel de propiedades (Builder/Styling) | Al seleccionar el widget en modo edición |

El manifiesto es el que manda. Los dos JS solo cumplen lo que el manifiesto declara.

Regla de oro: **todo nombre declarado en el manifiesto debe existir con exactamente ese nombre en el JS, y todo lo que el JS lee de SAC debe estar declarado en el manifiesto.**

---

## 2. Manifiesto JSON

### 2.1 Estructura mínima (✅ 📘)

```json
{
  "id": "com.empresa.nombrewidget",
  "version": "1.0.0",
  "name": "Nombre visible",
  "description": "Qué hace el widget",
  "newInstancePrefix": "NombreWidget",
  "icon": "",
  "vendor": "Empresa",
  "webcomponents": [ ... ],
  "properties": { ... },
  "methods": { ... },
  "events": { ... },
  "dataBindings": { ... }
}
```

| Campo | Regla |
|---|---|
| `id` | Identificador único global, estilo dominio inverso, en minúsculas. Es la identidad del widget en el tenant. No cambiarlo entre versiones: SAC lo trataría como otro widget y las stories existentes se romperían. |
| `version` | Semántica `mayor.menor.parche`. Aquí vive la versión, no en el tag. |
| `name` | Texto que ve el usuario en el Builder. |
| `newInstancePrefix` | Prefijo del nombre de cada instancia en scripts (`NombreWidget_1`). Sin espacios ni símbolos. |
| `vendor`, `eula`, `license` | Opcionales. Estaban en v1.0.0 y se omitieron en v2.2.0. |

### 2.2 `webcomponents` (✅ 📘)

```json
"webcomponents": [
  {
    "kind": "main",
    "tag": "com-empresa-nombrewidget",
    "url": "https://host.ejemplo.com/ruta/nombre-widget.js",
    "integrity": "",
    "ignoreIntegrity": true
  },
  {
    "kind": "styling",
    "tag": "com-empresa-nombrewidget-styling",
    "url": "https://host.ejemplo.com/ruta/nombre-widget_styling.js",
    "integrity": "",
    "ignoreIntegrity": true
  }
]
```

- `kind: "main"` es obligatorio. `kind: "styling"` es opcional pero necesario si hay propiedades editables en el Builder. Existe también `kind: "builder"` para el panel de configuración del Builder (📘, no usado en estos archivos).
- `tag`: minúsculas, con al menos un guion, único en el tenant. Convención: `com-<empresa>-<nombre>` para el principal y el mismo tag más `-styling` para el panel.
- **El tag debe ser estable.** No lleva sufijo de versión. (✅ El JS v3 registró `com-sac-datacombinationbuilder-v3` mientras el manifiesto 2.2.0 declaraba `com-sac-datacombinationbuilder`: con esa diferencia SAC no carga el widget.)
- `url`: HTTPS, accesible desde el navegador del usuario, con cabeceras CORS que permitan el origen de SAC. En los archivos observados se alojan en un servidor de widgets propio (`cfapps.eu12.hana.ondemand.com`, `resources.kiplan.io`). La URL base es un **parámetro de entrada** del skill, no un valor fijo.
- `ignoreIntegrity: true` con `integrity: ""` desactiva la verificación (✅ lo que usan los archivos). Si se quiere verificar, `ignoreIntegrity: false` y `integrity` con el hash SHA de cada archivo.
- Los archivos JS pueden cachearse: al republicar, cambiar la URL (por ejemplo con `?v=2.3.0`) o subir la `version` ayuda a que SAC tome la versión nueva. ⚠

### 2.3 `properties` (✅ 📘)

```json
"properties": {
  "title": {
    "type": "string",
    "description": "Título del widget",
    "default": "Generador de Combinaciones"
  }
}
```

- Tipos habituales: `string`, `integer`, `number`, `boolean`, y arreglos como `string[]`. 📘
- Cada propiedad debe tener `description` y, idealmente, `default`.
- Una propiedad solo sirve si **las tres piezas** la respetan: el manifiesto la declara, el JS principal la aplica en `onCustomWidgetBeforeUpdate`/`render`, y el styling ofrece un control para editarla. (✅ En el widget observado `title` está declarada y el styling la edita, pero el JS la guarda y nunca la usa: es el patrón que el skill debe evitar.)
- SAC puede generar accesos de lectura y escritura en SAC Script para cada propiedad declarada. ⚠ Confirmar nombres exactos (`getX` / `setX`) en el tenant antes de documentarlos como regla.

### 2.4 `methods` (✅ 📘)

```json
"methods": {
  "getJsonString": {
    "returnType": "string",
    "description": "Retorna el JSON como cadena de texto"
  },
  "setFiltro": {
    "description": "Aplica un filtro",
    "parameters": [
      { "name": "valor", "type": "string", "description": "Valor a filtrar" }
    ]
  }
}
```

- Cada método declarado es invocable desde SAC Script (`Widget_1.getJsonString()`).
- Debe existir un método con **el mismo nombre** en la clase del JS principal. (✅ Patrón observado: los métodos del manifiesto no llevan `body` y se resuelven contra la clase.) ⚠ Confirmar en el tenant; la alternativa del framework es declarar `body` con el código en el propio manifiesto.
- Tipos de retorno y de parámetro: tipos simples (`string`, `integer`, `number`, `boolean`) y sus arreglos. **No se debe devolver un objeto JS a SAC Script**: serializar con `JSON.stringify` y declarar `returnType: "string"`. (✅ `getJsonData` figura como `string` en el manifiesto pero el JS devuelve un objeto: es una inconsistencia a evitar.) ⚠ Verificar qué ocurre con objetos en el tenant.
- Un método que no devuelve nada omite `returnType`.

### 2.5 `events` (✅ 📘)

```json
"events": {
  "onSeleccion": { "description": "Se dispara cuando el usuario confirma una selección" }
}
```

- Cada evento declarado aparece en el Builder como un evento en el que el usuario puede escribir script.
- El widget lo dispara desde el JS principal (ver 3.5). Los widgets observados declaran `events: {}`, es decir, no disparan eventos: la story consulta los resultados llamando a los métodos. Un widget de captura que debe avisar a la story "ya hay datos" **debería declarar un evento**.

### 2.6 `dataBindings` (✅ 📘)

```json
"dataBindings": {
  "myDataBinding": {
    "feeds": [
      { "id": "dimensions", "description": "Agregar en orden: 1) Version 2) Periodo ...", "type": "dimension" },
      { "id": "measures",   "description": "Medidas (opcional)", "type": "mainStructureMember" }
    ]
  }
}
```

- La clave (`myDataBinding`) es el nombre del binding. SAC lo publica en el elemento como propiedad con ese mismo nombre (ver 3.4). Es **libre pero debe coincidir** con el nombre que el JS lee.
- Cada `feed` es una "ranura" que el usuario llena en el Builder:
  - `type: "dimension"`: admite una o varias dimensiones.
  - `type: "mainStructureMember"`: admite medidas (o miembros de la estructura principal, como cuentas).
- **El orden en que el usuario agrega las dimensiones define los índices** `dimensions_0`, `dimensions_1`, … en cada fila de datos. Por eso la `description` del feed debe indicar el orden esperado.
- Un feed de dimensiones nunca sabe qué dimensión recibió; el JS asume el orden. De ahí la necesidad del **mapa de roles** (sección 4).

---

## 3. JS principal (Web Component)

### 3.1 Esqueleto obligatorio (✅ 📘)

```js
(function () {
  const template = document.createElement('template');
  template.innerHTML = `<style>:host{display:block}</style><div id="root"></div>`;

  class MiWidget extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
    }

    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = Object.assign({}, this._props, changedProperties);
    }

    onCustomWidgetAfterUpdate(changedProperties) {
      this.render();
    }

    render() { /* leer this.myDataBinding y dibujar */ }
  }

  if (!customElements.get('com-empresa-miwidget')) {
    customElements.define('com-empresa-miwidget', MiWidget);
  }
})();
```

Reglas:

1. Todo dentro de una función autoejecutable (IIFE): no contaminar el ámbito global.
2. **Shadow DOM siempre** (`attachShadow`). El CSS del widget no debe filtrarse a la story ni al revés.
3. `customElements.define` con el **tag exacto** del manifiesto, protegido con `customElements.get` para evitar el error si el archivo se carga dos veces.
4. La clase extiende `HTMLElement`.

### 3.2 Ciclo de vida (✅ 📘)

| Gancho | Cuándo lo llama SAC | Uso |
|---|---|---|
| `constructor()` | Al crear el elemento | Crear shadow DOM, estado interno, eventos del DOM propio |
| `onCustomWidgetBeforeUpdate(changed)` | Antes de aplicar cambios de propiedades | Acumular `changed` en `this._props`; no dibujar aún |
| `onCustomWidgetAfterUpdate(changed)` | Después de aplicar propiedades y/o datos | Llamar a `render()` |
| `onCustomWidgetResize(w, h)` | Al cambiar el tamaño | Opcional: reajustar |
| `onCustomWidgetDestroy()` | Al eliminar el widget | Opcional: limpiar listeners y timers |

`render()` puede ejecutarse muchas veces: debe ser **idempotente** y conservar el estado del usuario (selecciones, lista de combinaciones) entre ejecuciones. (✅ `_setComboOptions` mantiene la selección previa si sigue siendo válida: es el patrón correcto.)

### 3.3 Aplicar propiedades (📘)

`changedProperties` trae solo las propiedades que cambiaron. Patrón:

```js
onCustomWidgetBeforeUpdate(changed) { this._props = { ...this._props, ...changed }; }
onCustomWidgetAfterUpdate()         { this._applyProps(); this.render(); }
_applyProps() {
  const t = this._shadowRoot.getElementById('title');
  if (t && this._props.title) t.textContent = this._props.title;
}
```

### 3.4 Leer el data binding (✅ 📘 ⚠)

SAC deja el binding en `this.<nombreBinding>` (en los archivos observados, `this.myDataBinding`).

```js
const b = this.myDataBinding;           // { data, metadata, state } ✅ sonda
if (b && b.state === 'success' && b.data && b.data.length > 0) {
  const md = b.metadata;                // mapa columna → dimensión (ver abajo)
  b.data.forEach(row => {
    const d0 = row.dims_0;              // { id, label }  (+ { isNode, isCollapsed } si la dimensión usa jerarquía)
    const m0 = row.measures_0;          // { raw, formatted, unit }
  });
}
```

Verificado con la sonda (2026-10-27, modelo con cuentas, story con jerarquías):

- ✅ `this.myDataBinding` existe y trae **tres claves**: `data`, `metadata`, `state` (`"success"` cuando hay datos). Los mismos datos llegan también dentro del argumento de `onCustomWidgetBeforeUpdate/AfterUpdate` (`changed.myDataBinding`), junto con `widgetName`, `designMode`, `mobileMode` y `themeInfo`. Los eventos del manifiesto aparecen en ese argumento como propiedades en `false`. El widget no debe copiar `changed` entero a su estado.
- ✅ Los nombres de columna son `<id del feed>_<índice>` (`dims_0`, `props_0`, `measures_0`): el prefijo es el **id del feed**, no una palabra fija. El JS debe construirlos a partir de los feeds del manifiesto.
- ✅ Celda de dimensión: `{ id, label }`. En una dimensión **plana** (`Version`) el `id` es el ID del miembro (`public.Actual`). En una dimensión **con jerarquía activa** el `id` es un nombre único `[Dimension].[Jerarquia].&[Miembro]` (el tiempo, `[Periodo].[YQM].[All].[(all)]`) y la celda añade `isNode` e `isCollapsed` y, **si el nodo tiene padre en el nivel mostrado, `parentId`** (el nombre único del padre). Ver 3.4.1.
- ✅ Celda de **propiedad** agregada como feed de dimensión: `{ id, label }`, igual que una dimensión plana; vacía = `{ id: "", label: "" }` (no `null`).
- ✅ Celda de **medida**: `{ raw, formatted, unit }`. `raw` es numérico, `formatted` trae separador de miles y decimales sin símbolo (`"13,018,774.00"`) y `unit` trae la unidad resuelta (`"USD"`), también cuando la medida es de unidad variable.
- ✅ `b.metadata` tiene tres claves: `feeds` (por id de feed: `values[]` con las columnas y `type`), `dimensions` (por columna: `{ id, description }`; una propiedad aparece como `"<Dimension>.<propiedad>"`) y `mainStructureMembers` (por columna de medida: `{ id, label, isNode, isCollapsed }`; en un modelo con cuentas, la cuenta, p. ej. `[Concepto].[parentId].&[EEFF]`). **El mapa columna → dimensión sale de `metadata`, no del orden en que el usuario agregó los feeds.**
#### 3.4.1 Nombres únicos de miembro y jerarquías (✅ sonda)

- Formato: `[Dimension].[Jerarquia].&[IdMiembro]`. Para extraer el ID real: `/^\[([^\]]+)\]\.\[([^\]]+)\]\.&\[(.*)\]$/` → grupos *dimensión*, *jerarquía*, *miembro*. El nodo raíz del tiempo (`...[All].[(all)]`) no sigue ese patrón y se reconoce por `[All]`.
- Una dimensión es jerárquica si su celda trae `isNode`. La jerarquía activa se lee del `id` de la propia celda; **los nombres de jerarquía del JSON del modelo coinciden con los de SAC, incluso con erratas** (`Jerraquia_Entidad`).
- ✅ **Se entrega un nivel de la jerarquía a la vez**, el que se configura en el Builder. Con el nivel raíz llega solo `Tot_Consolidado`. Con el segundo nivel llegan solo `CIA_A_TOT` y `CIA_B_TOT`, **sin el raíz**, cada uno con su `parentId` (`[Entidad].[Jerraquia_Entidad].&[Tot_Consolidado]`) y el valor agregado de todo su subárbol: 6.509.387 + 6.509.387 = 13.018.774, el total del raíz. **No hay mezcla de nodos y hojas** (sin doble conteo) mientras el Builder muestre un único nivel. Los nodos siguen marcados `isNode: true, isCollapsed: true`.
- ✅ **El formato del `id` depende de la jerarquía activa**: con jerarquía, nombre único `[Dim].[Jer].&[Miembro]`; con `@FlatHierarchy`, el ID simple del miembro. El adaptador debe aceptar ambos.
- ✅ **Los miembros hoja no traen `isNode` ni `isCollapsed`** (`CO_A` solo trae `id`, `label` y `parentId`). Un nodo se reconoce por `isNode: true`; una hoja, por su ausencia.
- ✅ La suma de las filas de un nivel completo iguala el total del raíz: con `Version` sin filtrar, nivel 3 dio 13.018.774 + 13.018.774 = 26.037.548, el mismo total que el raíz sin filtrar.
- ⚠ Una configuración de nivel del Builder dejó el binding en `state: "error"` (sin `data` ni `metadata`, solo `messages`). Falta el mensaje (sonda 27d) y saber qué nivel lo provocó. El widget debe tratar `state !== 'success'` como un estado propio y mostrar el texto de `messages`.
- ⚠ Falta saber si el Builder permite mostrar **varios niveles a la vez** (para tablas en árbol) o si hay que recomponer el árbol con varias lecturas o con los miembros del JSON del modelo.
- ✅ Una dimensión que **no está en ningún feed** no se filtra: SAC la agrega sobre todos sus miembros. En la prueba, sin `Version` en los feeds la medida fue 26.037.548 = Actual (13.018.774) + Ppto (13.018.774), y sin `Periodo` sumó todos los periodos. El widget debe pedir `Version` (y el resto de dimensiones que cambian el significado del número) en los feeds o declarar que el usuario las filtre en la story.
- ✅ En una **cuenta con hijos** puesta en el feed de medidas (`EEFF`, `isCollapsed: false`) llega **una sola columna** para el nodo; sus hijos no se convierten en columnas. Para ver cada cuenta hay que agregarla como medida.
- Una versión plana junto a dimensiones en jerarquía no repite nodos; una dimensión sin filtrar (aquí `Version`, 2 miembros) **multiplica la suma** si el widget suma todas las filas: el motor debe filtrar o agrupar por ella.

- **Las opciones disponibles salen de las filas devueltas, no del maestro del modelo.** Un selector solo ve miembros que aparecen en el resultado (los que pasan los filtros de la story y tienen datos). Es una limitación de diseño que hay que respetar y, cuando importe, comunicar al usuario.
- Antes de usar el binding: validar `b`, `b.data` y cada celda (`d && d.id`). Puede llegar vacío o en carga. (✅ el `render` observado lo hace.)
- Recorrer las filas una vez y construir los mapas por dimensión (`{ id: label }`), no recorrer por cada selector.

### 3.4.2 API del origen de datos dentro del widget (✅ existe, ⚠ comportamiento por probar)

Obtención (verificado con la sonda 27e): `this.dataBindings.getDataBinding("<nombreBinding>")` → objeto binding → `.getDataSource()` → origen de datos.

- **Objeto binding:** `getDataSource`, `getDimensions`, `getMembers`, `addDimensionToFeed`, `addMemberToFeed`, `removeDimension`, `removeMember`, `getLinkedAnalysis`, `setModel`, `openSelectModelDialog`.
- **Origen de datos, subconjunto que el skill puede usar** (es el de la API pública de scripting de SAC): `getDimensions`, `getMeasures`, `getMembers`, `getDimensionProperties`, `getHierarchies`, `setHierarchy`, `getHierarchyLevel`, `setHierarchyLevel`, `expandNode`, `collapseNode`, `getDimensionFilters`, `setDimensionFilter`, `removeDimensionFilter`, `getMemberDisplayMode`, `setMemberDisplayMode`, `getVariables`, `setVariableValue`, `refreshData`, `setRefreshPaused`, `getResultSet`.
- El objeto devuelto es la implementación interna de SAC y trae decenas de miembros privados (`_scriptContext`, `dispatchFetchData`, `resolveMemberId`…). **El skill solo usa el subconjunto anterior**: lo demás puede cambiar entre versiones sin aviso.
- Consecuencias previstas, por confirmar: el widget puede cambiar jerarquía y nivel por su cuenta (mecanismo B de las jerarquías), expandir nodos y construir árboles; `getMembers` podría listar los miembros del modelo y no solo los que aparecen en las filas (⚠ cambiaría la limitación de 3.4); `addDimensionToFeed` / `removeDimension` permitirían cambiar los feeds en ejecución.
- ✅ **Los métodos del origen de datos devuelven promesas** (también `setHierarchyLevel`, `expandNode`, `getDimensions`…). El widget debe esperarlas (`await` / `.then`) y manejar el rechazo.
- ✅ **Valores devueltos** (modelo `Modelo_Costructora`, 2026-10-27):
  - `getHierarchies("Entidad")` → `[{ id: "Jerraquia_Entidad", description: "Jerraquia_Entidad" }, { id: "@FlatHierarchy", description: "Presentación plana" }]`. **Toda dimensión con jerarquía ofrece además la jerarquía plana `@FlatHierarchy`**, así que hay al menos dos entre las que elegir.
  - `getHierarchyLevel("Entidad")` → un número (`3`).
  - `getDimensions()` → lista de `{ id, description, modelId }` con **22 entradas: las dimensiones y también sus propiedades** (`Periodo.YEAR`, `Periodo.CALQUARTER`, `Periodo.DATE`, `Entidad.currency`, `Concepto.accType`…). **La dimensión de cuentas aparece como `@MeasureDimension`** (descripción `Concepto`), no con su nombre.
  - `getMembers("Entidad")` → **todos los miembros de la jerarquía (29), no solo los que tienen datos**: `{ id: "[Entidad].[Jerraquia_Entidad].&[CIA_A]", dimensionId, description, displayId: "CIA_A", modelId }`. Vienen en orden de recorrido del árbol; **no traen el padre**. `description` coincide con la del modelo y `displayId` es el ID del miembro.
- ✅ Tras `setHierarchyLevel`, `expandNode` y `collapseNode` (las tres resuelven `undefined`), el binding pasa por **`state: "loading"`** (objeto con solo `state`, sin `data` ni `metadata`) y luego vuelve a `"success"` con los datos nuevos. El widget debe conservar el último render válido mientras está en `loading`.
- ✅ Tras `setHierarchyLevel`, el binding se actualiza solo y el widget recibe otra vez `onCustomWidgetAfterUpdate` con los datos nuevos; no hace falta pedirlos.
- ✅ El orden de los feeds puede cambiar sin avisar (en una prueba `Interco` pasó de `dims_1` a `dims_0`): el widget lee siempre `metadata.dimensions`.
- Siempre con comprobación defensiva (`typeof ds.setHierarchy === 'function'`) y con un estado de reserva si el método no existe.

### 3.5 Disparar eventos y actualizar propiedades (📘)

Evento declarado en el manifiesto:

```js
this.dispatchEvent(new Event('onSeleccion'));
```

Cambiar una propiedad desde el widget y que SAC lo sepa:

```js
this.dispatchEvent(new CustomEvent('propertiesChanged', {
  detail: { properties: { title: 'Nuevo título' } }
}));
```

### 3.6 Métodos públicos (✅ 📘)

Cada método del manifiesto es un método de la clase:

```js
getJsonString()     { return this._jsonOutput; }          // string
getIsJsonSynced()   { return this._jsonCount === this._items.length; }  // boolean
clearCombinations() { this._clearAll(); }
```

Los resultados estructurados se entregan como **cadena JSON**. Si el widget guarda un objeto, expone una versión `...String()` para SAC Script.

### 3.7 Higiene del JS (✅)

- Escapar todo texto que viene de datos antes de insertarlo como HTML (`_escape`, `_escapeAttr`). Nada de `innerHTML` con datos sin escapar.
- No depender de librerías externas salvo que el host las sirva; el widget debe funcionar con un solo archivo.
- No usar `localStorage`/cookies para estado del modelo: el estado vive en memoria del widget o en SAC.
- Parseo de CSV: `split(',')` falla con valores entre comillas o con comas. Usar un parser que respete comillas. (✅ defecto del widget observado.)

---

## 4. Mapa de roles de feeds (decisión de diseño del skill)

Una propiedad de una dimensión **entra como un feed más de tipo `dimension`** (decisión confirmada por Jean Poul; ⚠ forma exacta de la celda por verificar con la sonda).

Para que manifiesto, `render()` y filtros no se desincronicen, el skill genera una sola tabla y todo se deriva de ella:

```json
"feedRoles": [
  { "index": 0, "role": "dimension", "id": "Version",  "description": "Versión" },
  { "index": 1, "role": "dimension", "id": "Empleado", "description": "Empleado" },
  { "index": 2, "role": "property",  "id": "Cargo",    "of": "Empleado" }
]
```

De esa tabla salen:

1. La `description` del feed `dimensions` del manifiesto (orden esperado, para que el usuario agregue en el orden correcto).
2. El mapeo `dimensions_N → rol` dentro de `render()`.
3. Los filtros por `id`, por `descripción` o por valor de propiedad (filtrar `Empleado` por `Cargo` = quedarse con las filas cuyo `dimensions_2` cumple y tomar su `dimensions_1`).

Límites a respetar:

- Cada propiedad usada consume un feed. El skill agrega solo los necesarios y avisa si el pedido implica muchos.
- El orden de los feeds es una **instrucción para el usuario**: SAC no la fuerza. El skill debe escribirla clara en la `description` y, de ser posible, el widget debe validar que los datos recibidos tienen sentido (por ejemplo, avisar si faltan columnas).

---

## 5. JS de styling (panel de propiedades)

### 5.1 Esqueleto (✅ 📘)

```js
(function () {
  const template = document.createElement('template');
  template.innerHTML = `
    <form id="form">
      <fieldset>
        <legend>Configuración del Widget</legend>
        <label for="title">Título</label>
        <input id="title" type="text" />
        <button type="submit">Aplicar</button>
      </fieldset>
    </form>`;

  class MiWidgetStyling extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._shadowRoot.getElementById('form').addEventListener('submit', this._submit.bind(this));
    }

    _submit(e) {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: { properties: { title: this._shadowRoot.getElementById('title').value } }
      }));
    }

    set title(value) { this._shadowRoot.getElementById('title').value = value; }
  }

  if (!customElements.get('com-empresa-miwidget-styling')) {
    customElements.define('com-empresa-miwidget-styling', MiWidgetStyling);
  }
})();
```

### 5.2 Reglas

- Mismo patrón: IIFE, shadow DOM, `customElements.define` con el tag `-styling` del manifiesto.
- **Por cada propiedad del manifiesto**: un control en el formulario y un `set <propiedad>(value)` en la clase. SAC llama a esos setters para mostrar el valor actual; sin ellos el panel aparece vacío.
- El panel avisa del cambio con el evento `propertiesChanged` y `detail.properties` con las propiedades modificadas (solo las que cambian, con el tipo correcto: números como número, booleanos como booleano, no como texto).
- Tipos de control sugeridos: `string` → input de texto; `boolean` → checkbox; `integer`/`number` → input numérico; lista cerrada → select.
- (✅ El styling observado solo cubre `title`; la propiedad `displayMode` del manifiesto v1.0.0 no tenía ni control ni uso. Es el tipo de propiedad huérfana que el validador debe detectar.)

---

## 6. Reglas de coherencia entre los tres archivos (base del validador)

Cada regla se convierte en una verificación de `validate_bundle.py`.

| # | Regla | Origen |
|---|---|---|
| R1 | `webcomponents[kind=main].tag` == tag en `customElements.define` del JS principal | ✅ falló en v3 |
| R2 | `webcomponents[kind=styling].tag` == tag en `customElements.define` del styling | ✅ |
| R3 | Los tags cumplen: minúsculas, al menos un guion, el de styling termina en `-styling` | 📘 |
| R4 | Todo método de `methods` existe como método de la clase principal | ✅ |
| R5 | Todo `returnType` es simple (`string`, `integer`, `number`, `boolean` o arreglo de ellos) y el método devuelve un valor de ese tipo | ✅ falló en `getJsonData` |
| R6 | Todo evento de `events` se dispara al menos una vez con `dispatchEvent` en el JS principal | 📘 |
| R7 | Toda propiedad de `properties` se **usa** en el JS principal (no solo se guarda) | ✅ falló en `title` y `displayMode` |
| R8 | Toda propiedad de `properties` tiene control y setter en el styling | ✅ |
| R9 | Todo setter y `propertiesChanged` del styling corresponde a una propiedad declarada | 📘 |
| R10 | El nombre del binding en `dataBindings` es el mismo que el JS lee (`this.<nombre>`) | ✅ |
| R11 | Los `dimensions_N` / `measures_N` que lee el JS caben en los feeds declarados y en el `feedRoles` | ✅ |
| R12 | El `id`, el `version` y las URLs del manifiesto están presentes, y las URLs son HTTPS | 📘 |
| R13 | Los nombres de los archivos referenciados en las `url` coinciden con los archivos entregados | ✅ |
| R14 | Todo texto de datos va escapado antes de insertarse como HTML | ✅ |

---

## 7. Checklist de entrega

1. Los tres archivos generados desde **una sola especificación** (nunca editados a mano por separado).
2. El validador (R1–R14) sin errores.
3. El manifiesto con la URL base correcta del host del usuario.
4. Una nota de instalación para el usuario con el **orden de los feeds** que debe agregar en el Builder (sale de `feedRoles`).
5. Si el widget usa propiedades como filtro: aviso de cuántos feeds consume.

---

## 8. Pendientes de verificación (se cierran con el widget sonda)

**Entorno de las pruebas ✅:** story **Optimized Experience** (la confirmó el usuario el 2026-10-27), modelo con cuentas `Modelo_Costructora`. Todo lo marcado ✅ en este contrato vale para ese entorno; en una story Classic o en Analytics Designer puede diferir.

1. ✅ (2026-10-27) Celda de **propiedad**: `{ id, label }` (con valor: `{ id: "2024", label: "2024" }`; vacía: `{ id: "", label: "" }`). En `metadata.dimensions` su id es `<Dimension>.<propiedad>` con **el nombre que usa SAC** (`Periodo.YEAR`, descripción `Year`), que puede diferir en mayúsculas del JSON del modelo (`year`): el widget compara sin distinguir mayúsculas. La propiedad **agrupa**: aunque su dimensión no esté en los feeds, SAC devuelve una fila por valor de propiedad.
2. ✅ (2026-10-27) `metadata`: `feeds`, `dimensions`, `mainStructureMembers` (ver 3.4).
3. ✅ (2026-10-27) Celda de **medida**: `{ raw, formatted, unit }`; la unidad variable llega resuelta en `unit` (`"USD"`).
4. ✅ (2026-10-28) **Métodos sin `body` en el manifiesto:** se resuelven contra la clase del widget. Verificado desde un botón de la story: `getProbeBuild()` devolvió el texto del build, `getProbeReport()` devolvió un string de 8362 caracteres completo, y `setProbeNote("hola desde script")` (con parámetro `string`) llegó al widget.
5. ✅ (2026-10-28) **SAC no genera accesos de lectura ni escritura para las propiedades** del manifiesto. Verificado con `probeLabel` y `maxRows`: ni `Widget_1.probeLabel` (asignación y lectura) ni `Widget_1.getProbeLabel()`/`setProbeLabel(...)` existen; el editor de scripts los marca como error mientras se escriben. Esto coincide con el autocompletado de la story, que solo ofrece `getCssClass`, `getLayout` y los métodos declarados. **Regla del skill: si la story debe leer o cambiar una propiedad, el manifiesto declara explícitamente un método `getX` (con `returnType`) y un método `setX` (con parámetro tipado), y el JS los implementa y llama a `render()`/`fireEvent`.** Las propiedades solo se editan desde el panel de estilos (`_styling.js`).
6. ✅ (2026-10-28) **Método que devuelve un objeto:** el manifiesto declaraba `returnType: "string"` y el JS devolvía un objeto. En runtime llegó **el objeto real** (`""+o` dio `[object Object]`, no un JSON), pero el editor de scripts lo tipa como `string` según el manifiesto, así que **`o.build` y `o.renders` dan error** y no se puede leer sus campos. **Regla del skill: un método nunca devuelve un objeto; devuelve `string` (con `JSON.stringify`) o un primitivo (`number`, `boolean`, `integer`) coherente con su `returnType`.** No se probó otro `returnType` (p. ej. `object`).
7. ✅ (2026-10-27) Caché: al reimportar el manifiesto 1.0.1 con la URL fijada a otro commit, SAC cargó el build `27c`. Con la URL fijada a un hash no hay problema de caché.
8. **Jerarquías:** ✅ (2026-10-27) la celda trae `isNode`, `isCollapsed` y `parentId` (cuando hay padre en el nivel mostrado); no trae número de nivel. Con un nivel configurado en el Builder llegan solo los nodos de ese nivel, sin mezclar niveles ni doble conteo. ⚠ Falta: varios niveles a la vez y el nivel que causó el error. Los estados posibles del binding son `success`, `loading` y `error` (ver 3.4.2).
9. **Cómo se aplica una jerarquía elegida:** si la define solo el Builder, o si desde la story se puede cambiar con el origen de datos del widget (por ejemplo `getDataSource()` y el cambio de jerarquía) en el tipo de story del tenant.
   ✅ (2026-10-27) Desde el **script de la story no se llega** al origen de datos (el autocompletado solo ofrece `getCssClass`, `getLayout` y los métodos propios del widget). Desde **dentro del JS del widget sí**: `this.dataBindings.getDataBinding("myDataBinding").getDataSource()` devuelve un origen de datos con `getHierarchies`, `setHierarchy`, `getHierarchyLevel`, `setHierarchyLevel`, `expandNode`, `collapseNode`, etc. (ver 3.4.2). ✅ `setHierarchyLevel("Entidad", 3)` llamado desde el widget **cambió el nivel y SAC volvió a entregar los datos** (de `CIA_A_TOT`/`CIA_B_TOT` a `CO_A`/`CO_B`) sin intervención del usuario. ⚠ Faltan los valores que devuelven las lecturas (`getHierarchies`, `getMembers`…): la sonda 27g los guarda en el reporte.
   ✅ Hay **dos jerarquías** por dimensión (la del modelo y `@FlatHierarchy`). ✅ `setHierarchy("Entidad", "@FlatHierarchy")` llamado desde el widget **cambió a la presentación plana** (resuelve `undefined`, el binding pasa por `loading` y vuelve a `success`). En modo plano las celdas de esa dimensión traen el **ID simple** (`CO_A`, no `[Entidad].[Jerraquia_Entidad].&[CO_A]`) y **no traen `isNode`, `isCollapsed` ni `parentId`**; el total no cambió (26.037.548 con `Version` sin filtrar: sin doble conteo). ✅ Volver con `setHierarchy("Entidad", "Jerraquia_Entidad")` también funciona (resuelve `undefined`), pero **reinicia la vista al nodo raíz colapsado**: llega 1 fila `[Entidad].[Jerraquia_Entidad].&[Tot_Consolidado]` con `isNode:true, isCollapsed:true`, y se pierde el nivel que hubiera fijado `setHierarchyLevel` (antes 3). El widget debe volver a llamar `setHierarchyLevel` tras cambiar de jerarquía. Total intacto (26.037.548). ⚠ Sigue sin saberse si la presentación plana incluye nodos con valores propios o solo hojas (este modelo no lo permite ver).
10. **Expansión de nodos:** si SAC entrega todos los nodos o solo los expandidos, y cómo se pide la expansión de un nodo.
   ✅ (2026-10-27) **`expandNode` funciona** con la forma `ds.expandNode("Entidad", { "Entidad": "<id único>" })`, es decir un objeto de selección `{dimensión: id}` con el **nombre único** (`[Entidad].[Jerraquia_Entidad].&[CIA_A_TOT]`). Con el id simple (`CIA_A_TOT`) resuelve sin error pero **no hace nada**. Efecto observado desde el nivel 2: el nodo **conserva su propia fila** (`isCollapsed:false`) y **se añaden sus hijos** (`CO_A`, con `parentId` = el nodo y **sin** `isNode`/`isCollapsed`). ⚠ **Doble conteo:** al expandir, la fila del padre y la de sus hijos coexisten, y la suma de `raw` pasó de 26.037.548 a 39.056.322 (3 × 13.018.774). La suma plana solo es segura con un nivel (`setHierarchyLevel`); con nodos expandidos el widget debe tratar las filas con `isNode && !isCollapsed` como subtotales y excluirlas de las sumas. ✅ **`collapseNode` funciona** y revierte: `ds.collapseNode("Entidad", {"Entidad":"CIA_A_TOT"})` (aquí con id **simple**, y sí surtió efecto) devolvió 2 filas, `CO_A` desapareció, `CIA_A_TOT` volvió a `isCollapsed:true` y el total a 26.037.548. Asimetría observada: `collapseNode` aceptó el id simple y `expandNode` no. **Regla del skill: usar siempre el nombre único (`id` de la celda) en ambos.**
   ⚠ (2026-10-27) `ds.fetchHierarchyLevels("Entidad")` **se rechaza** (`Unable to parse identifier as ID: Entidad`): es una función interna que espera otro identificador y **no está en la API pública**, así que el skill **no la usa**. Los niveles se nombran "Nivel N" y la profundidad máxima se calcula con `getMembers` (miembros ordenados en árbol) o con los `parentId` de las celdas. `getHierarchyLevel` (número) y `setHierarchyLevel` bastan.
12. **Dimensión de cuentas como dimensión:** ✅ (2026-10-28) en un modelo basado en cuentas (Modelo_Costructora) el Builder **no permite agregar `Concepto` al feed de dimensiones**: las cuentas solo entran por el feed de tipo `mainStructureMember` (medidas), una columna por cuenta. Consecuencia para el skill: **no se puede pivotar cuentas en filas desde el feed**; si se quieren cuentas en filas, el widget las construye en el cliente a partir de las columnas de medida y de `metadata.mainStructureMembers` (con `isNode`/`isCollapsed` para su jerarquía). El mensaje exacto de SAC no se capturó.
11. **Selección múltiple:** nada que verificar en SAC (se resuelve dentro del widget), pero comprobar el rendimiento con listas largas.
