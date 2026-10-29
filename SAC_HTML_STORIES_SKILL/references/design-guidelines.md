# Guía de diseño visual (design-guidelines)

Referencia para SAC_HTML_STORIES_SKILL. Fija cómo se ve y se comporta un widget generado. Complementa a `widget-types.md` (qué componentes existen, estados §2.10, maquetación y accesibilidad §2.11, colores §2.8) y a `widget-spec-schema.md` (`theme`, §12).

**Precedencia cuando dos reglas chocan:** 1) contrato de SAC (`sac-widget-contract.md`) y decisiones D1–D11 · 2) el HTML de referencia del usuario (paleta, tipografía y tono; `intent-interpretation.md` §10) · 3) esta guía · 4) las skills de diseño complementarias, si están instaladas (README, "Skills complementarias"). Las reglas de esas skills pensadas para páginas o aplicaciones completas (barra lateral, encabezado, nombre del producto, fuentes web, navegación) **no aplican**: el widget es solo el área de contenido (D1).

Leyenda: ✅ observado en los HTML de referencia y la sonda · 📘 regla de diseño del skill · ⚠ por confirmar en el tenant · 🔧 la guía ya lo fija pero el runtime todavía no lo cumple (lista en §11).

---

## 1. Principios

1. **El dato manda.** Cada elemento visual existe porque muestra un valor del modelo; la decoración se minimiza. 📘
2. **Una sola identidad por widget.** Mismos tokens, mismas formas y mismo color por miembro en todos los componentes. 📘
3. **Legible sin color.** Etiquetas, símbolos y orden llevan el significado; el color lo refuerza (accesibilidad §2.11). 📘
4. **El color va en los datos, no en el marco.** Fondos, bordes, cabeceras y botones son neutros; el matiz del acento se reserva para la serie principal, la selección activa y, como mucho, un control. En una pantalla de trabajo el color ocupa pocos píxeles; si todo está coloreado, nada destaca. 📘
5. **Cada bloque responde una pregunta.** Un gráfico o una tabla se justifica por la pregunta que contesta ("¿cómo evolucionó?", "¿quién pesa más?", "¿dónde?"); si son pocas cifras, basta una tarjeta. 📘
6. **Autocontenido.** CSS incrustado en el shadow DOM; sin Tailwind por CDN, sin Google Fonts, sin iconos de fuente, sin imágenes remotas. Iconos en SVG en línea (§8) y pila de fuentes del sistema. ✅ Los gráficos complejos (dona, burbujas, líneas, pirámide) usan **Apache ECharts 5.5.1 recortado e incluido en el JS principal** (renderizador SVG, `templates/vendor/`); verificado en el tenant el 2026-10-28. Mapas (verificado 2026-10-28): el tenant carga teselas externas y Leaflet 1.9.4 por CDN; ECharts `geo` con el contorno del país incluido en el JS también funciona (`probe/maps/`). ⚠ Fuentes web externas siguen sin verificar.
7. **El widget es solo el contenido (D1).** Sin barra lateral, encabezado, perfil ni logo; la story los resuelve. ✅
8. **Se adapta a su contenedor, no a la ventana.** El tamaño lo da la story: los puntos de quiebre se miden sobre el ancho del propio widget (`ResizeObserver` o `@container`), no con `@media` de la ventana. 📘

---

## 2. Tokens

Todo valor visual sale de una variable CSS definida en `:host`. El generador escribe los valores desde `theme`; los componentes solo usan `var(--…)`. **Los nombres de los tokens no cambian nunca**; lo que cambia entre clientes son los valores.

### 2.1 Color

| Token | Uso | Valor por defecto | Contraste medido |
|---|---|---|---|
| `--c-fondo` | Fondo del widget | `#f8f9ff` ✅ | — |
| `--c-superficie` | Tarjetas y paneles | `#ffffff` ✅ | — |
| `--c-superficie-2` | Zonas sutiles, pista de barras, hover | `#eff4ff` ✅ | — |
| `--c-borde` | Contorno de tarjetas y paneles | `#e1e6ef` 🔧 (hoy `#c6c6cd`) | 1.25:1 sobre blanco |
| `--c-control` 🔧 | Borde de campos, botones y chips | `#c6c6cd` | 1.70:1 sobre blanco |
| `--c-regla` 🔧 | Líneas entre filas de tabla y lista | `#eef1f7` | — |
| `--c-grilla` 🔧 | Cuadrícula de gráficos | `#e5e7eb` | 1.24:1 |
| `--c-texto` | Texto principal | `#0b1c30` ✅ | 17.2:1 |
| `--c-texto-2` | Texto secundario, etiquetas y ejes | `#45464d` ✅ | 9.4:1 |
| `--c-texto-3` 🔧 | Placeholders, unidades, texto de apoyo | `#636b7a` | 5.4 / 5.1 / 4.9:1 (blanco / fondo / superficie-2) |
| `--c-acento` | Selección activa y serie principal | `#0051d5` ✅ | 6.7:1 |
| `--c-positivo` / `--c-negativo` | Variación favorable / desfavorable (texto) | `#004942` / `#ba1a1a` ✅ | 10.3 / 6.5:1 |
| `--c-activo` 🔧 | Fila seleccionada en listas que gobiernan otro bloque | `#e8eefb` | — |
| `--c-serie-1 … 8` | Paleta de series (§4) | ver §4 | ≥ 3:1 |

- **Lo que debe sostener el contraste:** todo texto, 4.5:1 sobre la superficie en la que se dibuja (los tres tokens de texto lo cumplen sobre `--c-fondo`, `--c-superficie` y `--c-superficie-2`); todo trazo de datos, 3:1. 📘
- **Tres líneas, no una.** Bordes de tarjeta (`--c-borde`), reglas de fila (`--c-regla`, un escalón más claro) y bordes de control (`--c-control`, un escalón más oscuro). Un solo gris para todo hace pesado el conjunto. 📘
- **Borde o sombra, nunca los dos.** Las tarjetas llevan borde de 1 px y **sin sombra**; la sombra es para lo que flota (desplegable de filtro, tooltip). 📘
- Los colores de miembros con significado fijo (`memberRoles`: mujeres, hombres, real, presupuesto…) salen de `theme.colors` y mandan sobre la paleta (widget-types §2.8). 📘
- ⚠ `themeInfo` solo trae `themeId` (`@DefaultTheme` en la sonda): no se pueden leer los colores de la story. El tema es el de la especificación.

### 2.2 Tipografía, forma y espacio

| Token | Uso | Valor por defecto |
|---|---|---|
| `--fuente-cuerpo` | Texto | `Inter, 'Segoe UI', system-ui, Arial, sans-serif` ✅ |
| `--fuente-titulo` | Títulos y cifras KPI | **igual que `--fuente-cuerpo`** 🔧 (hoy `'Plus Jakarta Sans', Inter, …`) |
| `--radio` | Esquinas de tarjetas | `12px` ✅ (controles: 8 px; chips: 999 px o 4 px) |
| `--e` | Unidad de separación | `8px` (múltiplos: 4, 8, 12, 16, 24) |
| `--fs-apoyo` 🔧 | Ejes, meta, pies | `12px` |
| `--fs-cuerpo` 🔧 | Texto, celdas | `14px` |
| `--fs-sub` 🔧 | Título de componente | `16px` |
| `--fs-kpi` 🔧 | Cifra de una tarjeta KPI | `28px` |
| `--fila` 🔧 | Alto de fila de tabla | `36px` (densa: `28px`) |

- **Una sola familia.** Plus Jakarta Sans no está cargada en el widget (no hay fuentes web, y `validate_bundle.py` rechaza `@import` y `fonts.googleapis`, regla R-EXT): solo se ve si el equipo del lector la tiene instalada, así que las cifras cambiarían de forma de un equipo a otro. Se usa una pila del sistema para todo; si el cliente exige su fuente, va en `theme.fontBody`/`theme.fontDisplay` y se avisa del riesgo de sustitución. ⚠
- **Una sola familia de radios por widget:** tarjeta `--radio`, control `--radio − 4`, y nunca más de tres valores distintos. El radio de 12 px viene de los HTML de referencia y se respeta (D5). 📘

---

## 3. Tipografía y cifras

- Escala fija: **12** (apoyo, ejes), **14** (cuerpo, celdas), **16** (subtítulos), **20** (título de componente), **28** (cifra KPI). Entre 4 y 6 tamaños por widget; menos tamaños se leen mejor. 📘
- Pesos: 400 cuerpo, 600 títulos y cabeceras. El 700 se reserva para un solo uso por widget (totales o la cifra líder). 📘
- **Cifra KPI:** 24–30 px (por defecto 28) en peso 600 y color de texto, no en el color del acento. Una cifra que es *la respuesta* del tablero (un EBITDA, un total) puede llegar a 36 px y ser al menos 1.3 veces mayor que sus hermanas; **ninguna cifra llega a 48 px** (en un widget de contenido leería como portada). 📘 🔧 (hoy 700 a 32 px)
- **Etiquetas pequeñas:** 12 px y color `--c-texto-2`. Si el HTML de referencia las compone en mayúsculas con espaciado (los dos ejemplos del skill lo hacen ✅), se conserva esa identidad, pero **siempre el mismo tratamiento**: no mezclar mayúsculas y minúsculas entre tarjetas y tablas, y espaciado de letras de 0.05 em como máximo. Sin referencia, minúsculas con mayúscula inicial. 📘
- Cifras en columnas, tablas y tarjetas con `font-variant-numeric: tabular-nums`, alineadas a la derecha. 📘
- **Formato de números:** se usa `formatted` de SAC cuando la unidad es variable (moneda); si no, se formatea en el widget con `Intl.NumberFormat` en la configuración regional de la story (`es` por defecto). Decimales fijos por medida (`decimals` del modelo): importes, 2 o los del modelo; porcentajes, 1; conteos, 0. Separador de miles siempre; sin espacio entre símbolo de moneda y cifra. Abreviar solo en tarjetas KPI, ejes y tablas con valores grandes (tablas: automático cuando algún valor llega a millones, con el valor completo en el `title` de la celda; `options.compact` lo fuerza o lo apaga). Convención en español: `K` = mil, `M` = millones, `mil M` = 10⁹, `B` = billón (10¹²); nunca `MM`, que se lee distinto según el país. ✅
- **Signo en el texto, no solo en el color:** `+4,2 pt`, `−3,1 %`. 📘
- **Un cero real se imprime** (`0`, `0 %`, `$0`). **Un valor ausente o no calculable es una raya gris** `—` en el tamaño del texto de apoyo, nunca `0`, `NaN`, `undefined` ni una raya del tamaño de la cifra (se confunde con "cargando"). 📘
- Textos de negocio (títulos, etiquetas, metas) son **propiedades editables**, no texto fijo (S12). ✅

---

## 4. Color en gráficos

**Paleta categórica por defecto** (se asigna por `id` de miembro ascendente y se repite igual en todos los componentes, widget-types §2.8):

| # | Hex | Sobre blanco | # | Hex | Sobre blanco |
|---|---|---|---|---|---|
| 1 | `#0051d5` | 6.7:1 | 5 | `#7c3aed` | 5.7:1 |
| 2 | `#009668` | 3.8:1 | 6 | `#0891b2` | 3.7:1 |
| 3 | `#ba0035` | 6.7:1 | 7 | `#4d7c0f` 🔧 | 5.0:1 |
| 4 | `#cc6600` 🔧 | 3.8:1 | 8 | `#64748b` | 4.8:1 |

- **Corrección respecto de la versión anterior:** el color 4 era `#e17b00` (2.99:1, no alcanzaba el 3:1 que esta propia guía exige a los trazos) y el 7 era un ocre `#a16207` de tono casi idéntico al naranja. Se sustituyen por `#cc6600` y `#4d7c0f` (verde oliva), que pasan el umbral y se distinguen entre sí. 🔧 (la paleta del runtime está en `templates/runtime/30-ui.js`, línea 5)
- **El color 8 (gris pizarra) no es para miembros: es para «Otros»** y para series de contexto. Los miembros usan los colores 1–7; con más de 7 visibles se agrupan los menores en **«Otros»** (§2.12 del catálogo), no se inventan más colores. 📘
- **Matiz con propósito.** Un gráfico de una sola medida lleva **un matiz** (`--c-acento`) y neutros para el resto. Varias series solo cuando la pregunta es una comparación o una composición; **no más de cuatro matices a la vez en un mismo widget**, salvo composición entre miembros. Un mismo miembro conserva siempre su color en todos los componentes. 📘
- **Estados de miembros con significado** (real vs presupuesto, mujeres vs hombres): dos tonos de **alto contraste entre sí** (no rojo/verde juntos), rotulados con texto. 📘
- **Escalas secuenciales** (calor, intensidad, mapas): un solo matiz con luminosidad creciente, desde `--c-superficie-2` hasta el color de la serie; en tablas jerárquicas se calcula **por nivel** (§5.3 del catálogo). 📘
- **Verde y rojo** solo para variaciones favorables/desfavorables, siempre con signo o símbolo (▲ ▼, `+`/`−`) y con el sentido de `goodDirection`: un coste que sube es desfavorable aunque suba. **Una variación cero o sin base es gris**, nunca verde ni roja; con base cero se escribe `+4 (nuevo)` y sin comparación una raya gris. Colorear solo el número, no toda la celda. 📘
- **Chips de estado:** tinte pálido con texto oscuro del mismo matiz (favorable `#dcfae5` con `#04250e`, 14.8:1; desfavorable `#ffedea` con `#831c1e`, 8.6:1; aviso `#fffbeb` con borde `#fde68a` y texto `#92400e`, 6.8:1). Nunca fondo saturado con texto blanco salvo la única acción principal. Una marca de estado por fila. 📘
- **Rojo es una señal, no una textura:** una marca roja por objeto como máximo; un tablero con trece cadenas en rojo se lee como ruido. 📘
- Contraste mínimo 3:1 para trazos y 4.5:1 para texto (§2.1 trae las cifras medidas). 📘
- **Modo oscuro** (solo si el cliente lo pide): grises neutros (no azul marino ni pizarra), texto principal ≥ 4.5:1, secundario y terciario separados lo bastante para leerse como dos grises, colores de serie y de variación **aclarados** para recuperar el contraste. Valores por definir (§12). ⚠

---

## 5. Componentes

### 5.1 Tarjeta KPI

- Etiqueta arriba (12 px, `--c-texto-2`), cifra (`--fs-kpi`, peso 600, `--c-texto`), unidad como sufijo gris más pequeño, y, si hay comparación (D7), una variación de 12–14 px **nunca mayor que la etiqueta**, con su ventana en palabras ("vs periodo anterior"). 📘
- **Sin icono dentro de un círculo o cuadro de color y sin minigráfico** en la tarjeta: la tendencia tiene su propio gráfico. Si el modelo pide `icon`, es un icono de contorno de 16 px junto a la etiqueta, gris (§8). 📘
- **Varios KPI forman una franja:** un solo contenedor dividido por líneas de 1 px, con el mismo número de columnas que de KPI, mejor que una tarjeta por cada cifra. 📘 🔧
- Sin sombra: borde de 1 px y radio `--radio`. Si el KPI es opcional (D3) y el modelo no lo aporta, la tarjeta no se dibuja y el resto se reacomoda. 📘
- Un KPI que muestra una cifra no la repite en la leyenda de un gráfico vecino ("una cifra, un lugar"). 📘

### 5.2 Gráficos (ECharts)

| Pregunta | Forma |
|---|---|
| ¿Cómo evoluciona? | Una línea; el área solo con relleno ≤ 15 % |
| ¿Cuánto por periodo? | Columnas |
| ¿Quién pesa más? | Barras horizontales ordenadas, o el relleno de la fila como barra |
| ¿Qué proporción? | Anillo fino o barra 100 % apilada, **cinco partes como máximo** |
| ¿Cuánto falta para la meta? | Barra de progreso con los dos extremos rotulados y relleno a la proporción real |
| ¿Dónde? | Mapa con una lista al lado que lleva las magnitudes |

- **Una pregunta, una serie.** Una serie por gráfico es la norma; tres, el máximo. Para ver otra medida se cambia con un control (selector, pestañas) en vez de superponer líneas. 📘
- **Líneas rectas**, 2 px, sin suavizado (una curva suavizada inventa valores entre dos puntos) y sin marcadores salvo el punto del cursor. Una proyección va **discontinua** desde "hoy" y con el valor final rotulado. 📘
- **Barras** parten de cero, con esquinas cuadradas (o 4 px solo arriba); los segmentos apilados se separan con una costura de 1–2 px. Nada de 3D ni sombras. 📘
- **Ejes:** 3–5 líneas de cuadrícula horizontales de 1 px (`--c-grilla`), **sin línea de eje Y**, marcas redondas y pares (0/5/10/15), la marca superior por encima del máximo, etiquetas de 12 px en `--c-texto-2` que nunca superan el tamaño de los datos. Etiquetas del eje X planas, de 4 a 8, sin rotar. El tiempo va en escala de tiempo, no categórica. 📘
- **Leyenda:** ninguna para una sola serie (la nombra el título); con varias, cinco como máximo, con punto de 6–8 px y etiqueta gris, en la cabecera de la tarjeta, interactiva (clic = selección enlazada §2.9). Cada muestra es la marca que explica, en pequeño. Nunca se lista una serie sin datos. 📘
- **Anillos:** finos, ≤ 5 partes que no estén ya listadas al lado, sin rótulos sobre los sectores; el total va en el centro o junto al anillo y la leyenda lleva el valor. Orden por valor descendente salvo que la dimensión tenga orden natural (edades, meses). 📘
- **Tooltip:** texto simple o caja sin flecha, etiqueta y valor en una línea; aparece con `hover` y con `focus`, y **en pantallas táctiles el toque abre el mismo detalle** (el hover solo no basta). 📘
- **Anotar lo que importa:** un salto o pico muy por encima de lo habitual lleva una marca de 1 px y una etiqueta de 12 px; las líneas de referencia (meta, presupuesto) son de 1 px discontinuas con su rótulo al final (`MarkLineComponent` está en el ECharts incluido). Las etiquetas no se superponen. 📘
- **Historia corta o vacía, dibujada con honestidad:** línea plana en cero, barras ausentes, sin rango artificial ni imagen de "sin datos". Una serie plana salvo un evento no ocupa todo el ancho. 📘
- **Opciones de ECharts que reflejan estas reglas** (los valores se resuelven desde los tokens antes de pasarlos; ECharts no lee variables CSS): `smooth: false`, `symbol: 'none'`, `yAxis.axisLine.show: false`, `yAxis.splitNumber: 4`, `splitLine.lineStyle.color` = `--c-grilla` y `legend.show` solo si hay más de una serie. `aria: { enabled: true }` y `animation: false` ya están en los tres componentes con ECharts (`donut-share`, `bubble-matrix`, `bubble-map`) ✅; los componentes de líneas y barras que se creen deben incluirlos y aplicar el resto. 📘

### 5.3 Tablas

- **Cabecera:** 12 px, peso 600, `--c-texto-2`, sentido de oración o el mismo tratamiento que las etiquetas (§3), **sin banda de relleno**; una línea inferior de 1 px la separa. Fija si el contenedor desplaza (con fondo de `--c-superficie` para tapar las filas). Una marca de orden solo en la columna activa. 📘 🔧 (hoy lleva relleno `--c-superficie-2`)
- **Filas:** `--fila` (36 px; densa 28), líneas horizontales de 1 px (`--c-regla`), **sin cebreado**, sin celdas combinadas. Pasar el cursor resalta con `--c-superficie-2`; la fila seleccionada que gobierna otro bloque usa `--c-activo`. 📘
- **Números:** a la derecha, en cifras tabulares, **decimales fijos por columna**, el encabezado numérico a la derecha y a ras de sus valores. Dos medidas de una misma celda se apilan (cifra y, debajo, su porcentaje de 12 px en gris). 📘
- **Tinta:** solo la identidad y la cifra clave llevan el color principal; el resto, gris. El signo vive en el texto y el color se reserva a lo desfavorable. 📘
- **La columna de identidad** recibe el mayor ancho (un tercio o la mitad), no se trunca antes que las demás y se acorta editorialmente primero. Texto largo: una línea con puntos suspensivos y valor completo en `title`; nunca se parte una palabra. 📘
- Primera columna fija en desplazamiento horizontal. Totales en negrita, en la última fila. 📘
- **Árbol (jerarquía):** sangría de 16 px por nivel, indicador ▸ / ▾ y nodos con valores agregados destacados (catálogo §5.3). 📘
- **Resumen de lista corta:** una vista general muestra 2–5 filas y enlaza al detalle con el total ("12 en total"); no se pagina una lista corta. En una tabla completa se indica el total arriba y el rango al paginar ("1–50 de 1.284"). 📘

### 5.4 Mapas

- **Mapa de contorno** (decisión ya tomada: no de calles) con el color de relleno o el tamaño de burbuja como magnitud, escala secuencial de un solo matiz y **la lista de las zonas al lado con sus cifras** para leer valores exactos. 📘
- La ubicación nunca depende solo del color: cada zona tiene nombre accesible y la lista ordenable es la alternativa de texto. 📘

### 5.5 Filtros internos

- Barra arriba, siempre visible; el **filtro de versión y el de tiempo** van siempre (D11), ambos de selección múltiple. 📘
- Cada filtro muestra su selección como "3 de 12" o como chips que **se envuelven en varias líneas o se resumen con un «+n» operable**; nunca se recortan en una sola fila ni se esconden valores. Botón «Limpiar» y búsqueda en las listas largas. 📘
- Control de 32–36 px de alto; el desplegable flota con sombra suave y se cierra con `Esc`. 📘

### 5.6 Estados

- **Un único aviso de `missingFeeds` por widget.** 📘
- **Carga (`loading`):** se mantiene el contenido anterior con un indicador discreto (banda superior de 2 px o texto "Actualizando…"); nunca se vacía el widget (contrato §3.4). Si no hay contenido previo, se dibuja la estructura final con barras grises planas del tamaño real de cada valor, sin brillo animado y **sin que el diseño se desplace** cuando llegan los datos. 📘
- **Vacío:** el bloque conserva su marco y su cabecera y añade **una frase** que ocupa todo el ancho ("Sin datos para la selección") con la acción de limpiar filtros; marco discontinuo de 1 px, unos 38 px de alto. Un gráfico vacío se dibuja (línea en cero), sin ilustraciones. 📘
- **Error:** dentro del bloque que falló, nunca como banner de pantalla completa; una frase que diga qué falló y cuándo estuvo bien por última vez, y un botón «Reintentar». El color negativo, solo en un icono pequeño o en el chip. 📘
- **Los conteos siguen a la vista:** cifras de pestañas, tarjetas y "12 abiertos" se recalculan con cada cambio de filtro. 📘

---

## 6. Interacción y movimiento

- Todo elemento interactivo tiene estado `:hover`, `:focus-visible` (contorno de 2 px en `--c-acento`) y `:active`, y cursor de mano. Se opera con teclado (`Enter`, `Espacio`, flechas, `Esc`) como en §2.11. 📘
- Transiciones de **120–200 ms** en color, opacidad y tamaño; nada se anima por decorar. Con `prefers-reduced-motion: reduce` se desactivan, y el estado final se dibuja de inmediato. 📘
- **Qué no se anima:** lo que el usuario hace con teclado, lo que se repite muchas veces por minuto (filtrar, ordenar, pasar el cursor por una tabla) y las cifras que se actualizan. Una animación no puede vaciar ni hacer parpadear el widget durante `loading`. 📘
- Tooltips: aparecen en `hover` y en `focus`, se posicionan dentro del widget (el shadow DOM no puede salirse de su caja) y repiten el valor y la etiqueta. 📘
- El widget no abre ventanas ni redirige; todo ocurre en su caja. Los eventos hacia la story (`events`) son explícitos. 📘
- Las reglas finas de movimiento (curvas, duraciones, qué se anima y qué no) están en §6.1. ✅

### 6.1 Movimiento (criterio de Emil Kowalski, adaptado a un widget de datos)

Un widget de SAC se usa muchas veces al día y se redibuja entero con cada filtro. Por eso el criterio es **animar poco, y solo lo que responde al gesto del usuario**. Antes de añadir un movimiento: ¿cuántas veces lo verá?, ¿qué propósito tiene?, ¿qué curva?, ¿cuánto dura?

| Qué | Decisión | Valor |
|---|---|---|
| Botones, segmentos, paginador, selector de filtro | Respuesta al pulsar y al pasar el cursor | `:hover` cambia fondo/borde/color en 140 ms; `:active` escala a 0,97 (nunca desde 0) |
| Primera carga del widget | Entrada suave una sola vez | opacidad 0→1 y 4 px de desplazamiento, 220 ms, la clase se retira a los 300 ms |
| Filas de tabla, cabeceras ordenables | **Sin transición** (se recorren decenas de veces) | el cambio de color es instantáneo |
| Redibujo por filtro, orden, búsqueda o paginación | **No se anima** | ni fundidos ni parpadeo; se conserva el último render durante `loading` |
| Gráficos (ECharts) | `animation:false` | los datos cambian con cada filtro; el resalte al pasar el cursor lo hace ECharts |
| Cualquier gesto por teclado | **No se anima** | |
| Panel desplegable de filtro | No se anima | se vuelve a crear con cada opción marcada; animarlo lo haría parpadear |

- **Curva:** `--ease: cubic-bezier(.23, 1, .32, 1)` (ease-out fuerte). Nunca `ease-in`: arranca lento y la interfaz se siente torpe. Duración `--t: 140ms`; ninguna transición pasa de 300 ms.
- **Propiedades:** se listan una a una (`background-color`, `border-color`, `color`, `transform`); nunca `transition: all`. Solo `transform` y `opacity` para movimiento.
- **`prefers-reduced-motion: reduce`:** sin transiciones, sin animaciones y sin escala en `:active`; el estado final aparece de inmediato. ✅
- **Prohibido:** rebotes, resortes, contadores que suben, barras que crecen, y cualquier animación que retrase leer un dato.
- Un componente nuevo con movimiento propio debe justificar en una línea por qué lo necesita y cuántas veces lo verá el usuario.

---

## 7. Maquetación

- Cuadrícula de 12 columnas con separación de 16 px; anchos por tipo según `widget-types.md` §2.11. Tarjetas KPI de 3 columnas. 📘
- **Columnas según el número de piezas**, no una malla fija de cuatro: tres KPI ocupan tres columnas; los gráficos alternan anchos (por ejemplo 7+5) que caigan en las mismas líneas, sin celdas huérfanas ni tarjetas estiradas a la altura de su vecina. 📘
- Puntos de quiebre sobre el ancho del widget: ≥ 900 px completo, 600–899 px dos columnas, < 600 px una columna con tablas desplazables. 📘
- Márgenes del widget de 16 px (12 en < 600 px). La altura crece con el contenido; nada de alturas fijas salvo contenedores de tabla con desplazamiento interno. 📘
- **Densidad como un conjunto:** alto de fila, relleno y tamaño de letra se mueven juntos; no se reduce la letra y se deja el relleno. Los gráficos miden entre ~110 y 260 px de alto. 📘
- **Espacio colocado, no sobrante:** el aire sale de una cuadrícula y de separaciones repetidas; una columna vacía en todas las filas o un bloque estirado se leen como inacabados. 📘
- Primero los filtros, luego las tarjetas KPI, luego los gráficos y por último las tablas (D1: sin navegación). 📘

---

## 8. Iconos

SVG en línea, de contorno, en cuadrícula 24 × 24, trazo de 1.5 px con extremos y uniones redondeados, **sin relleno**, color `currentColor` (gris por defecto). Tamaño 16 px junto a una etiqueta y 14 px dentro de una fila; nunca en un círculo o cuadro de color, y no se repiten encima de cada tarjeta. Los iconos decorativos llevan `aria-hidden="true"`; uno que sea el único portador de significado lleva `aria-label`.

Envoltorio:

```html
<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">…</svg>
```

Catálogo (contenido interno del `<svg>`; comprobado visualmente):

```text
info:          <circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>
trend-up:      <path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>
trend-down:    <path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>
users:         <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.3c2 .7 3.5 2.6 3.5 5.7"/>
calendar:      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>
map-pin:       <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>
package:       <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/>
truck:         <path d="M2 6h11v9H2z"/><path d="M13 9h4l4 3.5V15h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>
building:      <rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2"/><path d="M10 21v-4h4v4"/>
percent:       <path d="M19 5L5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>
coin:          <circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2 0 1.2 1.1 1.7 2.6 2.1 1.5.4 2.6.9 2.6 2.1 0 1.2-1.1 2-2.6 2-1.2 0-2.2-.6-2.7-1.5"/><path d="M12 6.5v1.4M12 16.1v1.4"/>
clock:         <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>
alert:         <path d="M12 3.5L22 20H2z"/><path d="M12 10v4"/><path d="M12 17h.01"/>
check:         <path d="M5 12.5l5 5L19 7"/>
chevron-right: <path d="M9 6l6 6-6 6"/>
chevron-down:  <path d="M6 9l6 6 6-6"/>
search:        <circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>
x:             <path d="M6 6l12 12M18 6L6 18"/>
filter:        <path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>
refresh:       <path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/>
```

Un icono que falte en el catálogo no se inventa sobre la marcha: se usa una etiqueta de texto o se añade aquí primero. Para la opción `icon` de `kpi-card` y `kpi-card-split` se acepta uno de estos nombres. ⚠ El runtime todavía no dibuja iconos (§11).

---

## 9. Lista de revisión antes de entregar

Se repasa con el widget renderizado. `scripts/audit_design.py` mide lo medible (consola, desbordes, contraste de texto, texto de 12 px, foco con teclado, descripción de gráficos, `prefers-reduced-motion`, sombras, degradados, cifras a la derecha) y deja una captura por ancho; el resto se revisa mirando las capturas. Complementa a la checklist de `sac-widget-contract.md` §7.

**Datos y texto**
- [ ] Cada cifra tiene formato, unidad y decimales de su medida; ningún `NaN`, `undefined` ni `0` donde falta el dato.
- [ ] Ningún texto de negocio está fijo en el código (S12).

**Color y contraste**
- [ ] Texto ≥ 4.5:1 sobre su superficie; trazos de datos ≥ 3:1; el significado nunca depende solo del color.
- [ ] Un mismo miembro tiene un único color en todo el widget; no más de cuatro matices simultáneos fuera de composiciones.
- [ ] Variaciones: color según `goodDirection`, cero o sin base en gris, signo siempre presente.

**Estructura**
- [ ] Sin sombra en las tarjetas, sin degradados en fondos, botones o KPI, sin iconos en círculos de color, sin minigráficos en las KPI, sin cebreado ni cabeceras con banda.
- [ ] Números a la derecha en cifras tabulares; identidad de la tabla con el mayor ancho.
- [ ] Ninguna cifra a 48 px o más; título de componente de 16–20 px.

**Comportamiento**
- [ ] Foco visible y operable con teclado en filtros, tabla y leyendas; el detalle de un gráfico también se obtiene con un toque.
- [ ] Con `prefers-reduced-motion` no hay transiciones; durante `loading` el contenido anterior no desaparece.
- [ ] Cada gráfico tiene descripción de texto (`aria`) y su valor exacto es alcanzable (tooltip o tabla).
- [ ] Con 320, 600 y 900 px de ancho del propio widget no hay desbordes y las tablas desplazan.

---

## 10. Errores de diseño a evitar

| Error | Consecuencia |
|---|---|
| Un color distinto para el mismo miembro en cada gráfico | Tablero ilegible |
| Color como único portador de significado | Inaccesible |
| Ejes recortados en barras | Engaña visualmente |
| Texto o iconos de recursos externos | No cargan si el tenant los bloquea |
| `@media` de ventana en lugar del ancho del widget | El widget se rompe dentro de una story con paneles |
| Vaciar el widget mientras llega la lectura (`loading`) | Parpadeo en cada interacción |
| Textos de negocio fijos | Widget que solo sirve para un cliente |
| Cifras sin formato o con `NaN` | Pérdida de confianza |
| Animaciones sin desactivar con `prefers-reduced-motion` | Incomodidad y problemas de accesibilidad |
| Paleta arcoíris: un matiz por barra, o más de cuatro a la vez | El color deja de significar |
| Curvas suavizadas, marcadores en cada punto, degradados bajo la línea | Inventan valores y recargan |
| KPI con icono en círculo de color, minigráfico y "+12,5 %" verde en todas | Plantilla genérica; el verde pierde sentido |
| Variación cero o indefinida pintada de verde o rojo | Falsa señal (un "+100 %" que nace de cero) |
| Tablas con cebreado, cabecera con banda y mayúsculas distintas por bloque | Más ruido que datos |
| Números alineados a la izquierda o en cifras proporcionales | Columnas que no se pueden comparar |
| Dona con rótulos sobre los sectores y total enorme en el centro | Ilegible con más de cinco partes |
| Fuente propia que solo existe en algunos equipos | Cifras con formas distintas según el lector |
| Cifras a 48 px o títulos de portada | Un widget de contenido que parece una página |

---

## 11. Alineación del runtime

El runtime (`templates/runtime/`) ya cumple esta guía en: paleta por defecto (§4), tokens `--c-control`, `--c-regla`, `--c-grilla`, `--c-texto-3`, `--c-activo`, `--fs-*`, `--fila`, `--ease`, `--t`; franja de KPI (§5.1); tablas (§5.3); leyendas de 8 px (§5.2); movimiento (§6.1). Quedan por alinear:

| Dónde | Hoy | Objetivo |
|---|---|---|
| `35-charts.js` `aria-label` | id técnico del componente (ECharts añade su propia descripción) | título del gráfico (§9) |
| Componentes nuevos de líneas y barras | aún no existen | nacer con `smooth:false`, `symbol:'none'`, `splitNumber:4`, sin eje Y y `aria` (§5.2) |
| `components/*` | sin iconos | opción `icon` con el catálogo de §8 |
| Estados | indicador de 2 px y último render ✅ | además, estructura gris al cargar sin contenido previo (§5.6) |
| Franja de KPI | las celdas igualan la altura de la más alta | alinear arriba si se prefiere (§5.1) |

Dos puntos del catálogo también deben alinearse: `widget-types.md` §2.8 repite colores con variante de brillo cuando hay más miembros que colores y §2.12 admite 8 segmentos de dona; con el color 8 reservado a «Otros» quedan 7 miembros con color propio, y la recomendación de legibilidad para donas es ≤ 5 partes (`topN` 6 por defecto hoy). `widget-types.md` §3 dice "título en mayúsculas pequeñas": coincide con los HTML de referencia, pero conviene fijar que es un único tratamiento para todo el widget (§3).

---

## 12. Pendientes

1. ⚠ Confirmar si el tenant permite fuentes web externas. (Scripts externos: sí, probado con ECharts por jsDelivr el 2026-10-28.)
2. Definir el modo oscuro con valores concretos (tokens alternos) si algún cliente lo pide.
3. Ajustar la paleta con la identidad visual de cada cliente (se pasa por `theme`).
4. ✅ Movimiento (§6.1), aplicado al runtime.
5. ✅ Auditoría de diseño en el flujo (`SKILL.md` paso 7, `scripts/audit_design.py`).
