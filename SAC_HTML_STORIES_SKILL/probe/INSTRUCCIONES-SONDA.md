# Sonda SAC (sac-probe) — instrucciones

## 1. Publicar
1. Sube `sac-probe.js` y `sac-probe_styling.js` a tu host (el mismo tipo de ruta que usas en resources.kiplan.io).
2. En `sac-probe.json` reemplaza `{{BASE_URL}}` por esa ruta (sin barra final). Ejemplo: `https://resources.kiplan.io/SAC/Sonda`.
3. Sube `sac-probe.json` en SAC: Custom Widgets > Crear.

## 2. Armar la story (modelo con jerarquías si tienes)
1. Inserta el widget "SAC Probe (sonda)" y asígnale el modelo.
2. Feeds (anota el ORDEN exacto en que agregas cada uno):
   - `dims`: 3-4 dimensiones, incluyendo Periodo y, si existe, una con 2+ jerarquías (con jerarquía activa en el Builder).
   - `props`: 1-2 propiedades de dimensión (por ejemplo Cargo o Tipo_Canal), agregadas como dimensión adicional.
   - `measures`: 2-3 medidas, incluida una de unidad variable (moneda) si existe.
3. El panel mostrará un reporte JSON. Pulsa **Copiar reporte** y pégalo en el chat.

## 3. Pruebas de script (prueba E: contrato ítems 4, 5, 6)
Qué se prueba: cómo expone SAC a la story los métodos y propiedades declarados en el manifiesto.

**Cómo ejecutarlas.** Sustituye `Widget_1` por el nombre real del widget. Crea un botón en la story, pega **un bloque** en su `onClick`, pulsa el botón en modo vista y abre la consola del navegador (F12) para copiar lo que salga. Un bloque por vez: si una línea da error, SAC suele marcarla en el editor antes de ejecutar; copia ese mensaje exacto, porque también es un resultado (quiere decir que el método o accesor no existe con ese nombre).

Para ver qué ofrece el editor: escribe `Widget_1.` y copia la lista del autocompletado.

**Bloque 1: métodos (ítem 4)**
```javascript
console.log("E1 build: " + Widget_1.getProbeBuild());
console.log("E1 largo del reporte: " + Widget_1.getProbeReport().length);
Widget_1.setProbeNote("hola desde script");
console.log("E1 nota enviada: mira el panel, debe mostrar 'hola desde script'");
```

**Bloque 2: método que devuelve un objeto (ítem 6)**
```javascript
var o = Widget_1.getProbeObject();
console.log("E2 objeto: " + o);
console.log("E2 build: " + o.build);
console.log("E2 renders: " + o.renders);
```
(Si `o.build` da error, el objeto no llega usable: anota si llegó como texto, como objeto o no llegó.)

**Bloque 3: propiedades, lectura y escritura (ítem 5)**
Prueba una variante por vez; la que el editor acepte es el nombre del acceso.
```javascript
console.log("E3a " + Widget_1.probeLabel);
Widget_1.probeLabel = "cambiado A";
console.log("E3a despues " + Widget_1.probeLabel);
```
```javascript
console.log("E3b " + Widget_1.getProbeLabel());
Widget_1.setProbeLabel("cambiado B");
console.log("E3b despues " + Widget_1.getProbeLabel());
```
Tras cada variante, mira el título del panel de la sonda: debe cambiar a "cambiado A" o "cambiado B". Repite con `maxRows` (número): `Widget_1.maxRows = 3;` o `Widget_1.setMaxRows(3);`, y verifica que la tabla de filas muestra 3.

**Bloque 4: método genérico (`probeInvoke`, declarado en el manifiesto)**
```javascript
console.log("E4 " + Widget_1.probeInvoke("ds.getHierarchyLevel", '["Entidad"]'));
```
Anota si `probeInvoke` aparece en el autocompletado de `Widget_1.` (y si es un widget recién insertado o uno antiguo). Si no aparece o falla, dilo: ayuda a confirmar si la lista de métodos queda en caché en la instancia.

**Bloque 5: evento (opcional)**
En el evento `onProbeRendered` del widget escribe `console.log("E5 evento disparado");`, fuerza un render (botón Actualizar del panel) y mira la consola.

## 4. Prueba de caché (ya verificada)
Cerrada el 2026-10-27: la URL fijada a un hash de commit carga el build correcto, sin problemas de caché. Solo hay que subir la versión del manifiesto al cambiar el hash. No hay que repetirla.

## 5. Qué devolverme
- El reporte copiado (con la jerarquía por defecto).
- La lista del autocompletado al escribir `Widget_1.`
- Las líneas `E1`…`E5` de la consola y cualquier mensaje de error del editor (con la línea que falló).
- El orden de feeds usado y, por favor, la versión/tipo de story (Optimized o Classic).
