# Guía de diseño visual (design-guidelines)

Referencia para SAC_HTML_STORIES_SKILL. Fija cómo se ve y se comporta un widget generado. Complementa a `widget-types.md` (qué componentes existen, estados §2.10, maquetación y accesibilidad §2.11, colores §2.8) y a `widget-spec-schema.md` (`theme`, §12). Si hay un HTML de referencia, la **paleta y la tipografía** salen de él (`intent-interpretation.md` §10) y la **composición** es guía, no molde (D5).

Leyenda: ✅ observado en los HTML de referencia y la sonda · 📘 regla de diseño del skill · ⚠ por confirmar en el tenant.

---

## 1. Principios

1. **El dato manda.** Cada elemento visual existe porque muestra un valor del modelo; la decoración se mínima. 📘
2. **Una sola identidad por widget.** Mismos tokens, mismas formas y mismo color por serie en todos los componentes. 📘
3. **Legible sin color.** Etiquetas, símbolos y orden llevan el significado; el color lo refuerza (accesibilidad §2.11). 📘
4. **Autocontenido.** CSS incrustado en el shadow DOM; sin Tailwind por CDN, sin Google Fonts, sin iconos de fuente, sin imágenes remotas. Iconos en SVG en línea y pila de fuentes con alternativas del sistema. ✅ Los gráficos complejos (dona, burbujas, líneas, pirámide) usan **Apache ECharts 5.5.1 recortado e incluido en el JS principal** (renderizador SVG, `templates/vendor/`); verificado en el tenant el 2026-10-28, donde también carga por CDN (jsDelivr). Se incluye en el archivo para no depender de la red. ⚠ Fuentes web externas siguen sin verificar
5. **El widget es solo el contenido (D1).** Sin barra lateral, encabezado, perfil ni logo; la story los resuelve. ✅
6. **Se adapta a su contenedor, no a la ventana.** El tamaño lo da la story: los puntos de quiebre se miden sobre el ancho del propio widget (`ResizeObserver` o `@container`), no con `@media` de la ventana. 📘

---

## 2. Tokens

Todo valor visual sale de una variable CSS definida en `:host`. El generador escribe los valores desde `theme`; los componentes solo usan `var(--…)`.

| Token | Uso | Valor por defecto (referencias ✅) |
|---|---|---|
| `--c-fondo` | Fondo del widget | `#f8f9ff` |
| `--c-superficie` | Tarjetas y paneles | `#ffffff` |
| `--c-superficie-2` | Cabeceras de tabla, zonas sutiles | `#eff4ff` |
| `--c-borde` | Líneas y contornos | `#c6c6cd` |
| `--c-texto` | Texto principal | `#0b1c30` |
| `--c-texto-2` | Texto secundario y ejes | `#45464d` |
| `--c-acento` | Acción principal, selección | `#0051d5` |
| `--c-positivo` / `--c-negativo` | Estado favorable / desfavorable | `#004942` / `#ba1a1a` |
| `--c-serie-1 … 8` | Paleta de series (ver §4) | ver §4 |
| `--fuente-cuerpo` | Texto | `Inter, 'Segoe UI', Arial, sans-serif` |
| `--fuente-titulo` | Títulos y cifras KPI | `'Plus Jakarta Sans', Inter, 'Segoe UI', Arial, sans-serif` |
| `--radio` | Esquinas de tarjetas | `12px` (botones y chips: `8px`, píldoras: `999px`) |
| `--espacio` | Unidad de separación | `8px` (se usan múltiplos: 4, 8, 12, 16, 24) |

- Los nombres de los tokens se conservan siempre; lo que cambia entre clientes son los **valores** de `theme`. 📘
- Los colores de miembros con significado fijo (`memberRoles`: mujeres, hombres, real, presupuesto…) salen de `theme.colors` y mandan sobre la paleta (widget-types §2.8). 📘
- ⚠ `themeInfo` solo trae `themeId` (`@DefaultTheme` en la sonda): no se pueden leer los colores de la story. El tema es el de la especificación; modo oscuro solo si el pedido lo pide (propiedad `modoOscuro`, tokens alternos).

---

## 3. Tipografía y cifras

- Tamaños (escala fija): 12 (apoyo, ejes), 14 (cuerpo, tablas), 16 (subtítulos), 20 (títulos de componente), 28–36 (cifra KPI). 📘
- Peso 400 cuerpo, 600 títulos y cabeceras, 700 cifra KPI. Interlineado 1.4 en texto, 1.1 en cifras. 📘
- Cifras en columnas y tablas con `font-variant-numeric: tabular-nums` y alineadas a la derecha. 📘
- **Formato de números:** se usa `formatted` de SAC cuando la unidad es variable (moneda); si no, se formatea en el widget con `Intl.NumberFormat` en la configuración regional de la story (`es` por defecto). Abreviar miles y millones (`1,2 M`) solo en tarjetas KPI y ejes, con el valor completo en el detalle. ✅
- Porcentajes con 1 decimal salvo que el modelo defina otra precisión (`decimals`). 📘
- Valor ausente o no calculable: `—`. Nunca `0`, `NaN` ni `undefined`. 📘
- Textos de negocio (títulos, etiquetas, metas) son **propiedades editables**, no texto fijo (S12). ✅

---

## 4. Color en gráficos

**Paleta categórica por defecto** (8 tonos, se asignan por `id` de miembro ascendente y se repiten igual en todos los componentes, §2.8):

| # | Hex | # | Hex |
|---|---|---|---|
| 1 | `#0051d5` | 5 | `#7c3aed` |
| 2 | `#009668` | 6 | `#0891b2` |
| 3 | `#ba0035` | 7 | `#a16207` |
| 4 | `#e17b00` | 8 | `#64748b` |

- Con más de 8 miembros visibles se agrupan los menores en **"Otros"** (§2.12), no se inventan más colores. 📘
- Comparaciones de dos grupos usan dos tonos de **alto contraste entre sí** (no rojo/verde juntos) y se rotulan con texto. 📘
- Escalas secuenciales (mapas de calor, intensidad): un solo tono con luminosidad creciente, del `--c-superficie-2` al color de la serie; se calcula **por nivel** en tablas jerárquicas (§5.3 del catálogo). 📘
- Verde/rojo solo para variaciones favorables/desfavorables, siempre con signo (▲ ▼ o +/−) y texto. 📘
- Mínimo 3:1 de contraste para trazos y 4.5:1 para texto. 📘

---

## 5. Componentes

**Tarjeta KPI.** Etiqueta (12, `--c-texto-2`), cifra (28–36), unidad o contexto en pequeño, y, si hay comparación (D7), variación con símbolo. Sin sombra pesada: borde de 1 px y radio 12. Si el KPI es opcional (D3) y el modelo no lo aporta, la tarjeta no se dibuja y el resto se reacomoda. 📘

**Gráficos de barras, pirámide, dona, burbujas.** 📘
- Barras siempre desde cero; nada de 3D ni sombras.
- Ejes mínimos: líneas de cuadrícula tenues, etiquetas de 12 px, sin marcas redundantes.
- Rótulos directos sobre las marcas cuando caben; si no, leyenda interactiva (clic = selección enlazada §2.9) y valor al pasar el cursor o al enfocar.
- Donas con ≤ 6 sectores; más se agrupan en "Otros". Orden por valor descendente, salvo que la dimensión tenga orden natural (edades, meses).
- Texto del gráfico en SVG con `font-family` de la pila del widget; nunca imágenes.

**Tablas.** 📘
- Cabecera fija si el contenedor desplaza, filas de 36 px (densa: 28), líneas horizontales tenues, sin celdas combinadas.
- Primera columna fija en desplazamiento horizontal. Totales en negrita, en la última fila.
- Árbol: sangría de 16 px por nivel, indicador ▸ / ▾ y nodos con valores agregados destacados (catálogo §5.3).

**Filtros internos.** Barra arriba, siempre visible; chips con el conteo seleccionado ("3 de 12"), botón "Limpiar" y búsqueda en listas largas. Selección múltiple por defecto (D8). 📘

**Estados.** Un único aviso de `missingFeeds` por widget; `loading` mantiene el contenido anterior con un indicador discreto (banda superior de 2 px o texto "Actualizando…"), nunca vacía el widget (contrato §3.4). `empty`: "Sin datos para la selección" con la acción de limpiar filtros. 📘

---

## 6. Interacción y movimiento

- Todo elemento interactivo tiene estado `:hover`, `:focus-visible` (contorno de 2 px en `--c-acento`) y `:active`. Se opera con teclado (`Enter`, `Espacio`, flechas) como en §2.11. 📘
- Transiciones de 120–200 ms en color, opacidad y tamaño; nada se anima por decorar. Con `prefers-reduced-motion: reduce` se desactivan. 📘
- Tooltips: aparecen en `hover` y en `focus`, se posicionan dentro del widget (el shadow DOM no puede salirse de su caja) y repiten el valor y la etiqueta. 📘
- El widget no abre ventanas ni redirige; todo ocurre en su caja. Los eventos hacia la story (`events`) son explícitos. 📘

---

## 7. Maquetación

- Cuadrícula de 12 columnas con separación de 16 px; anchos por tipo según `widget-types.md` §2.11. Tarjetas KPI de 3 columnas. 📘
- Puntos de quiebre sobre el ancho del widget: ≥ 900 px completo, 600–899 px dos columnas, < 600 px una columna con tablas desplazables. 📘
- Márgenes del widget de 16 px (12 en < 600 px). La altura crece con el contenido; nada de alturas fijas salvo contenedores de tabla con desplazamiento interno. 📘
- Primero los filtros, luego las tarjetas KPI, luego los gráficos y por último las tablas (D1: sin navegación). 📘

---

## 8. Errores de diseño a evitar

| Error | Consecuencia |
|---|---|
| Un color distinto para la misma serie en cada gráfico | Tablero ilegible |
| Color como único portador de significado | Inaccesible |
| Ejes recortados en barras | Engaña visualmente |
| Texto o iconos de recursos externos | No cargan si el tenant los bloquea |
| `@media` de ventana en lugar del ancho del widget | El widget se rompe dentro de una story con paneles |
| Vaciar el widget mientras llega la lectura (`loading`) | Parpadeo en cada interacción |
| Textos de negocio fijos | Widget que solo sirve para un cliente |
| Cifras sin formato o con `NaN` | Pérdida de confianza |
| Animaciones sin desactivar con `prefers-reduced-motion` | Incomodidad y problemas de accesibilidad |

---

## 9. Pendientes

1. ⚠ Confirmar si el tenant permite fuentes web externas. (Scripts externos: sí, probado con ECharts por jsDelivr el 2026-10-28.)
2. Definir el modo oscuro (tokens alternos) si algún cliente lo pide.
3. Ajustar la paleta con la identidad visual de cada cliente (se pasa por `theme`).
