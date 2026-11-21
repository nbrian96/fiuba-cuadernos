# ADR-004: Búsqueda Global Estática con Pagefind Node API e Indexación de PDFs por Página (Opción A)

## Status
Accepted (Opción A aprobada explícitamente en [PLAN_DE_TRABAJO.md](../PLAN_DE_TRABAJO.md), Sección 2.1 — 2026-11-21)

## Context
- **Problem:** La plataforma acumula contenido HTML/MDX (85 ejercicios, 2 avanzados, apuntes, resúmenes) y **49 archivos PDF** de clases, guías, parciales y TP0 que suman exactamente **1,264 páginas** (`DIapositivas`: 1,199; `Guia-Ejercicios`: 47; `Parciales`: 8; `TP0`: 10). La búsqueda actual en [app.js](../../assets/js/app.js) solo filtra tarjetas ya montadas en la página activa y no indexa apuntes ni el interior de los 49 PDFs. Se necesita un buscador estático global compatible con GitHub Pages que lleve al usuario al recurso y página exacta del PDF relevante.
- **Constraints:**
  - Entorno 100% estático en GitHub Pages: no existe backend ni motor Elasticsearch/Algolia de servidor.
  - Auditoría real ejecutada con `pypdf` sobre los 49 PDFs de TDA (`DIapositivas/`: 29, `Guia-Ejercicios/`: 10, `Parciales/`: 7, `TP0/`: 3):
    - Los 49 PDFs poseen texto extraíble (entre `156.7` y `4,678.0` caracteres promedio por página), aunque varias diapositivas contienen entre `1` y `5` páginas con menos de `20` caracteres útiles (portadas gráficas o separadores).
  - Debe evitarse generar páginas HTML fantasma con texto volcado de PDFs solo para usar `data-pagefind-body`.
  - Toda URL indexada debe respetar el prefijo `base` de GitHub Pages (`{BASE_URL}/{course}/materiales/{resourceId}?page={N}`).

## Options Considered
| Option | Pros | Cons | Complexity |
| :--- | :--- | :--- | :--- |
| **Opción A (Aprobada): Pagefind Node API (`index.addCustomRecord()`) en el hook `astro:build:done` + prototipo de 4 PDFs + fallback YAML/JSON** | Indexación programática exacta por página (`?page={N}`); sin generación de HTML oculto ni contaminación de rutas; integra metadatos ricos (`provenance`, `course`, `unit`, `entityType`) como filtros/facets nativos de Pagefind; degradación controlada a metadatos cuando un PDF no tiene capa de texto usable. | Requiere implementar la extracción de texto por página en Node durante el build de Astro y validar rendimiento/calidad de tokens con un prototipo acotado antes de escalar. | Media |
| **Opción B: Generar páginas HTML ocultas o visibles con texto extraído de PDF y atributos `data-pagefind-body`** | Usa el crawler HTML por defecto de Pagefind CLI sin llamar a `addCustomRecord()`. | Contamina el árbol de rutas estáticas `dist/`, duplica megabytes de HTML en GitHub Pages, complica el ruteo a `?page={N}` y acopla el contenido extraído al DOM de presentación. | Media (con alta deuda de build) |

## Decision
Se adopta la **Opción A**: utilizar la **Node API de Pagefind** durante el hook `astro:build:done` de Astro, combinando la indexación estándar de las páginas HTML/MDX compiladas con llamadas explícitas a `index.addCustomRecord()` para cada página útil de los PDFs registrados en los manifiestos de recursos.

1. **URL Canónica de Registro PDF:** `{BASE_URL}/{course}/materiales/{resourceId}?page={N}`, con filtros/facets `course`, `provenance`, `entityType` y `unit`.
2. **Prototipo Obligatorio de 4 PDFs Representativos (previo a escalar a los 49 PDFs en Etapa 4):**
   Antes de indexar los 49 PDFs completos, el pipeline se validará con un subconjunto de **4 PDFs representativos** que cubren los cuatro perfiles medidos en TDA:
   - `DIapositivas/13 - Programación Lineal II.pdf` (`49` páginas, `9,354` caracteres, `5` páginas con `< 20` caracteres — perfil de diapositivas extensas con páginas sparse/diagramas).
   - `Guia-Ejercicios/GuiaDeEjercicios-v1.0.pdf` (`19` páginas, `43,138` caracteres — perfil de guía multi-tema densa con notación matemática).
   - `Parciales/TP-2026-2-2.pdf` (`1` página, `2,868` caracteres — perfil de parcial real reconstruido vía [generate_pdf.py](../../generate_pdf.py), `provenance: reconstructed_exam_statement`).
   - `TP0/TP0_Nelson_Avila_100244.pdf` (`7` páginas, `11,326` caracteres — perfil de entrega autorizada con tablas y gráficos, `provenance: elaborated_submission`).
3. **Política de Umbral y Fallback a Metadatos Declarativos:**
   - Si una página individual $N$ de un PDF extrae menos de `20` caracteres tras normalización, no se emite un registro aislado para esa página (evita resultados vacíos o ruido por separadores).
   - Si un documento PDF completo (en TDA o en futuras materias) falla la extracción o acumula menos de `80` caracteres útiles en total (`textLayerStatus: "metadata_fallback"`), se registra un único `addCustomRecord()` apuntando a `?page=1` compuesto con `title`, `description`, `unitSlugs`, `entityType` y `provenance` del manifiesto declarativo.

## Rationale
`addCustomRecord()` desacopla por completo la extracción de PDFs del renderizado de páginas HTML, permite asociar la URL exacta `{BASE_URL}/{course}/materiales/{resourceId}?page={N}` para abrir directamente el visor dual en la página hallada, y habilita filtros por materia y procedencia en una sola interfaz de búsqueda estática. Validar primero con 4 PDFs heterogéneos permite calibrar la limpieza de texto, el tamaño del índice generado en `dist/pagefind/` y el tiempo de build antes de procesar los 49 PDFs (1,264 páginas medidas en TDA).

## Consequences
- **Positive:**
  - Búsqueda unificada en texto completo sobre HTML/MDX y PDFs sin servidor ni servicios externos.
  - Navegación directa desde un resultado hacia la página `{N}` exacta dentro de `PdfSplitViewer`.
  - Resiliencia garantizada para PDFs escaneados o puramente gráficos en futuras materias mediante el fallback declarativo a metadatos.
- **Negative:**
  - Incrementa el tiempo de `astro build` al extraer texto de 49 PDFs (y de los materiales de futuras materias).
  - Exige mantener coherencia exacta entre los `resourceId` del manifiesto de recursos y las rutas servidas por Astro.
- **Mitigation:**
  - Validar el prototipo de 4 PDFs primero y medir tamaño de índice y duración en Etapa 4.
  - Utilizar caché determinista por hash SHA-256 del PDF cuando corresponda y respaldar las rutas con verificación de enlaces en build/QA.

## Revisit Trigger
- Si el prototipo de 4 PDFs o la indexación de los 49 PDFs en GitHub Actions excediera un umbral razonable de tiempo de build o inflara el bundle de `dist/pagefind/` afectando la carga en redes móviles, o si futuros PDFs escaneados requirieran un paso previo de OCR offline en build/pre-commit.
