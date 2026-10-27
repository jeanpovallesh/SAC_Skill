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

## 3. Pruebas de script (en el onInitialization o en un botón de la story)
Sustituye `Widget_1` por el nombre real.

```javascript
// Prueba 4, 5, 6: métodos y propiedades
console.log(Widget_1.getProbeBuild());          // build cargado (prueba 7: cache)
console.log(Widget_1.getProbeReport().length);  // método sin body
console.log(Widget_1.getProbeObject());         // prueba 6: ¿llega objeto o falla?
Widget_1.setProbeNote("hola desde script");     // método con parámetro
Widget_1.probeLabel = "cambiado";               // prueba 5: acceso de escritura
console.log(Widget_1.probeLabel);               // acceso de lectura
```

```javascript
// Pruebas 9 y 10: jerarquías desde el origen de datos (solo si el widget expone data binding)
var ds = Widget_1.getDataBindings().getDataBinding("myDataBinding").getDataSource();
console.log(ds.getDimensions());
console.log(ds.getHierarchies("NOMBRE_DIMENSION"));          // jerarquías disponibles
ds.setHierarchy("NOMBRE_DIMENSION", "ID_JERARQUIA_2");        // cambiar jerarquía
// Después de cambiarla, copia otra vez el reporte: ¿cambió la forma de las filas?
console.log(ds.getHierarchyLevel ? "tiene getHierarchyLevel" : "sin getHierarchyLevel");
ds.expandNode && ds.expandNode("NOMBRE_DIMENSION", { /* selección de miembro */ });
```

Si alguna línea da error, copia el mensaje exacto: también es información útil.

## 4. Prueba de caché (7)
1. Cambia la última letra de `BUILD` en `sac-probe.js`, súbelo de nuevo, recarga la story.
2. Ejecuta `Widget_1.getProbeBuild()` y comprueba si devuelve la letra nueva.

## 5. Qué devolverme
- El reporte copiado (con la jerarquía por defecto).
- El reporte copiado tras cambiar de jerarquía (si lo lograste).
- Los resultados de consola de los bloques de script.
- El orden de feeds usado y, por favor, la versión/tipo de story (Optimized o Classic).
