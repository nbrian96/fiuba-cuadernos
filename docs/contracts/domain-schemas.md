# Contratos de Esquemas de Dominio y Mapa de Rutas

Este documento especifica los contratos declarativos del dominio académico multi-materia que servirán como fuente directa para los esquemas Zod en Astro Content Collections (Etapa 2) y para los manifiestos verificables de cada materia (Etapa 1B).

Relacionado con: [ADR-001](../architecture/adr-001-astro-core.md), [ADR-003](../architecture/adr-003-academic-content-model.md) y [ADR-004](../architecture/adr-004-pagefind-pdf-indexing.md).

---

## 1. Enumeraciones Canónicas

### 1.1. `Provenance` (9 valores obligatorios)

Todo recurso, evaluación, ejercicio, apunte, resumen o widget declara exactamente uno de los siguientes valores de procedencia:

| Valor | Significado | Ejemplos en TDA |
| :--- | :--- | :--- |
| `official_source` | Material emitido oficialmente por la cátedra. | Diapositivas `00..24`, Guías `v1.0` y `01..09`, paquetes `12 - *`, parciales `2024-2-1..2026-2-1`, `TP00-2026-2c.pdf`, `checklist.pdf`. |
| `reconstructed_exam_statement` | Enunciado de examen real reconstruido mediante script reproducible. | `Parciales/TP-2026-2-2.pdf` (generado vía [generate_pdf.py](../../generate_pdf.py)). |
| `elaborated_submission` | Entrega resuelta autorizada del curso, preservada íntegramente. | `TP0/TP0_Nelson_Avila_100244.pdf`, `TP0/cuartetos.py`, `TP0/cuartetos_malo.py`, `TP0/grafico_tiempos.png`. |
| `exam_prep_and_practice` | Plantillas y guías de práctica en código para ejercitación. | `Practicas/01_*..05_*/*.py` (1 resuelto + 19 `TODO`) y `Practicas/README.md`. |
| `elaborated_notes` | Apuntes teóricos maestros elaborados para el estudio. | `tda/DIapositivas/Explicaciones/problema_mochila_y_greedy.md` y 17 bloques de `teoria-avanzados.html` (migrados a `src/data/tdaAdvancedSections.json`). |
| `elaborated_summary` | Resúmenes estratégicos, matrices de frecuencia, checklists y recetas. | Matriz de parciales (`sec01`), Checklist pre-parcial (`sec11`), Drawer de Fórmulas. |
| `elaborated_solution` | Soluciones elaboradas del catálogo oficial de ejercicios. | Los `85` ejercicios del catálogo (`1..85`), incluidos los `35` marcados con `isParcial: true`. |
| `advanced_theory_example` | Ejercicios resueltos diferenciados de paradigmas avanzados. | `tda-adv-aprox-2partition` y `tda-adv-rand-nreinas` (sin numeración artificial en `1..85`). |
| `interactive_widget` | Entrenadores y simuladores ejecutables en navegador. | Entrenador 30s (`20` casos) + `5` simuladores interactivos de Teoría Avanzada. |

### 1.2. `EntityType` (13 entidades académicas)

| Entidad (`EntityType`) | `provenance` Permitida | Cardinalidad en TDA |
| :--- | :--- | :--- |
| `OfficialSlideDeck` | `official_source` | `29` |
| `OfficialCodePackage` | `official_source` | `3` paquetes (`22` archivos) |
| `OfficialGuide` | `official_source` | `10` |
| `OfficialExamPDF` | `official_source` | `6` |
| `ReconstructedExamPDF` | `reconstructed_exam_statement` | `1` |
| `OfficialTPAssessment` | `official_source` | `1` TP (`2` PDFs) |
| `ElaboratedTPSubmission` | `elaborated_submission` | `1` entrega (`4` archivos) |
| `CodePractice` | `exam_prep_and_practice` | `20` scripts `.py` (`+ 1` guía `README.md`) |
| `ElaboratedNote` | `elaborated_notes` | `2` |
| `ElaboratedSummary` | `elaborated_summary` | `3` |
| `CatalogExercise` | `elaborated_solution` | `85` (`1..85`) |
| `AdvancedTheoryExercise` | `advanced_theory_example` | `2` |
| `InteractiveSimulator` | `interactive_widget` | `6` |

---

## 2. Esquemas de Manifiestos y Frontmatter (Base para Zod en Etapa 2)

### 2.1. `CourseManifest` (`src/content/courses/*.yaml` / `course.json`)

| Campo | Tipo | Obligatorio | Restricciones / Validación Zod |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `string` | Sí | Literal `"1.0.0"`. |
| `id` | `string` | Sí | Slug único `^[a-z0-9-]+$` (ej. `"tda"`). |
| `title` | `string` | Sí | Nombre legible de la materia. |
| `shortTitle` | `string` | Sí | Etiqueta breve para navbar/breadcrumbs (ej. `"TDA FIUBA"`). |
| `codes` | `string[]` | Sí | Códigos oficiales no vacíos (ej. `["TB024", "75.29", "95.06"]`). |
| `institution` | `string` | Sí | Institución académica (`"FIUBA"`). |
| `chair` | `string` | Sí | Cátedra y período de referencia. |
| `units` | `UnitDefinition[]` | Sí | Lista ordenada de unidades (`slug`, `name`, `order`, `exerciseCount`, `inCatalog`, `legacyRoute`). |
| `views` | `ViewDefinition[]` | Sí | Vistas transversales configuradas (ej. `todos`, `parciales`). |
| `stats` | `CourseStats` | Sí | Conteos verificables globales (`physicalFiles`, `pdfs`, `nonPdfs`, `catalogExercises`, `parcialExercises`, `advancedExercises`, `interactiveWidgets`, `elaboratedNotes`, `elaboratedSummaries`, `checklistItems`, `trainerQuestions`). |
| `legacyRoutes` | `Record<string, string>` | Sí | Mapeo exacto de cada HTML legacy hacia su ruta canónica en Astro. |
| `legacyStorageKeys` | `string[]` | Sí | Claves `localStorage` previas soportadas en migración. |

### 2.2. `ResourceManifest` (`src/content/resources/*-resources.yaml` / `resources.json`)

| Campo | Tipo | Obligatorio | Restricciones / Validación Zod |
| :--- | :--- | :---: | :--- |
| `resourceId` | `string` | Sí | Slug único `^[a-z0-9-]+$`. Se usa directamente en la ruta `{BASE_URL}/{course}/materiales/{resourceId}?page={N}`. |
| `courseId` | `string` | Sí | Debe existir en `CourseManifest.id`. |
| `title` | `string` | Sí | Título descriptivo no vacío. |
| `entityType` | `EntityType` | Sí | Uno de los 13 valores de `EntityType`. |
| `provenance` | `Provenance` | Sí | Uno de los 9 valores de `Provenance` coherente con `entityType`. |
| `sourceFolder` | `string` | Sí | Carpeta raíz del repositorio (`DIapositivas`, `Guia-Ejercicios`, `Parciales`, `Practicas`, `TP0`). |
| `unitSlugs` | `string[]` | Sí | Al menos 1 slug válido del curso o `"general"`. |
| `files` | `ResourceFile[]` | Sí | Arreglo no vacío; cada ítem contiene `path` (relativo exacto *case-sensitive* desde la raíz del repo), `extension` (ej. `".pdf"`, `".py"`, `".md"`, `".ltx"`, `".csv"`, `".xlsx"`, `".png"`, `".txt"`, `".lp"`) e `isPdf` (`boolean`). |
| `pdfMetadata` | `PdfMetadata` | Condicional | Obligatorio cuando algún archivo del recurso tiene `isPdf: true` (y ausente en recursos sin PDF). Campos: `pageCount` (`int >= 1`), `textChars` (`int >= 0`), `emptyPages` (`int >= 0`), `textLayerStatus` (`"extractable" \| "sparse" \| "metadata_fallback"`), `inPagefindPrototype` (`boolean`). |
| `practiceStatus` | `"solved" \| "todo" \| "guide"` | No | Usado en recursos `CodePractice` o guía de `Practicas/`. |
| `preservedIntact` | `boolean` | No | Obligatorio `true` para todos los recursos de `TP0/`. |
| `assessmentId` | `string` | No | Referencia cruzada al identificador de examen o TP en `AssessmentManifest`. |

### 2.3. `AssessmentManifest` (`src/content/assessments/*.yaml` / `assessments.json`)

| Campo | Tipo | Obligatorio | Restricciones / Validación Zod |
| :--- | :--- | :---: | :--- |
| `exams` | `ExamEntry[]` | Sí | Lista de exámenes parciales/finales: `id`, `courseId`, `title`, `date` (`string`), `term` (`string`), `entityType` (`"OfficialExamPDF" \| "ReconstructedExamPDF"`), `provenance` (`"official_source" \| "reconstructed_exam_statement"`), `pdfResourceId` (FK a `ResourceManifest`), `catalogExerciseIds` (`string[]`), `notes` (`string`). |
| `unassignedGenericParcialExerciseIds` | `string[]` | Sí | Ejercicios con `isParcial: true` cuyo origen en el catálogo no especifica fecha única de examen (en TDA: `["tda-ej-02"]`). La unión con `exams[].catalogExerciseIds` debe reconciliar exactamente los `35` ejercicios de parciales. |
| `practicalWorks` | `PracticalWorkEntry[]` | Sí | Evaluaciones prácticas y entregas vinculadas (`id`, `courseId`, `title`, `entityType`, `provenance`, `preservedIntact`, `resourceIds[]`, `notes`). |

### 2.4. `QuizManifest` (`src/content/quizzes/*.yaml`, objetivo de Etapa 2/3)

Contrato destino para el motor de simulacros cronometrados y entrenadores de reconocimiento en Astro/React (en Etapa 1B el **Entrenador 30s** de `20` preguntas se inventaría en [interactive-and-notes.json](../manifests/tda/interactive-and-notes.json) apuntando a [app.js](../../assets/js/app.js), y en Etapa 2/4 se externalizará a `quizzes/*.yaml` bajo este esquema):

| Campo | Tipo | Obligatorio | Restricciones / Validación Zod |
| :--- | :--- | :---: | :--- |
| `quizId` | `string` | Sí | Slug `^[a-z0-9-]+$`. |
| `courseId` | `string` | Sí | FK al curso. |
| `title` | `string` | Sí | Título del entrenador o cuestionario. |
| `provenance` | `"interactive_widget"` | Sí | Literal `"interactive_widget"`. |
| `timeGoalSeconds` | `number` | Sí | Meta por pregunta en segundos (`> 0`, ej. `30`). |
| `passThresholdPercent` | `number` | Sí | Porcentaje de aprobación (`0..100`, ej. `75`). |
| `options` | `QuizOption[]` | Sí | Catálogo de opciones válidas (`key`, `label`, `icon`). |
| `questions` | `QuizQuestion[]` | Sí | Arreglo no vacío; cada pregunta contiene `id`, `prompt`, `answer` (debe pertenecer a `options[].key`), `paradigmName`, `trigger` y `sourceOrigin` opcional. |

### 2.5. `ExerciseFrontmatter` (`src/content/exercises/{course}/{unit}/*.mdx`)

| Campo | Tipo | Obligatorio | Restricciones / Validación Zod |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Sí | Único globalmente (ej. `"tda-ej-01"`..`"tda-ej-85"` o `"tda-adv-aprox-2partition"`). |
| `courseId` | `string` | Sí | Slug del curso (`"tda"`). |
| `number` | `number \| null` | Sí | Entero `1..85` para `CatalogExercise`; obligatorio `null` para `AdvancedTheoryExercise`. |
| `title` | `string` | Sí | Título del ejercicio sin prefijo `Ejercicio N:`. |
| `unit` | `string` | Sí | Slug de paradigma/unidad (`dyc`, `greedy`, `backtracking`, `dp`, `pl`, `flujo`, `reducciones`, `integradores`, `avanzados`). |
| `entityType` | `"CatalogExercise" \| "AdvancedTheoryExercise"` | Sí | Discriminador de entidad. |
| `provenance` | `"elaborated_solution" \| "advanced_theory_example"` | Sí | Coherente con `entityType`. |
| `priority` | `"imprescindible" \| "importante"` | Sí | Nivel de prioridad de estudio. |
| `difficulty` | `1 \| 2 \| 3 \| 4 \| 5` | Sí | Escala entera `1..5` (`★`..`★★★★★`). |
| `origin` | `string` | Sí | Origen textual completo (guía o parcial). |
| `isParcial` | `boolean` | Sí | `true` exactamente para los `35` ejercicios de parciales reales. |
| `examIds` | `string[]` | No | Referencias cruzadas a `AssessmentManifest.exams[].id`. |
| `relatedResourceIds` | `string[]` | No | Referencias cruzadas a guías, parciales o prácticas en código. |
| `legacyPage` | `string` | Sí | Archivo HTML actual donde reside (ej. `"dyc.html"`, `"teoria-avanzados.html"`). |
| `legacyAnchor` | `string` | Sí | Ancla legacy preservada (ej. `"#ej-18"`, `"#ejercicios-clase"`). |

### 2.6. `DocFrontmatter` (`src/content/docs/{course}/**/*.mdx`)

| Campo | Tipo | Obligatorio | Restricciones / Validación Zod |
| :--- | :--- | :---: | :--- |
| `docId` | `string` | Sí | Slug `^[a-z0-9-]+$`. |
| `courseId` | `string` | Sí | Slug del curso. |
| `title` | `string` | Sí | Título del apunte o resumen. |
| `order` | `number` | Sí | Orden de lectura dentro del curso (`>= 0`). |
| `entityType` | `"ElaboratedNote" \| "ElaboratedSummary"` | Sí | Tipo de entidad documental. |
| `provenance` | `"elaborated_notes" \| "elaborated_summary"` | Sí | Procedencia declarativa obligatoria. |
| `sectionIds` | `string[]` | No | Anclas de secciones internas (ej. los 17 bloques de teoría avanzada). |
| `relatedResourceIds` | `string[]` | No | Referencias a PDFs o fuentes relacionadas. |
| `legacyPage` | `string` | No | Página HTML de origen durante la transición. |

### 2.7. `ExercisesIndexManifest` (`docs/manifests/{course}/exercises-index.json`)

Índice verificable previo a la generación de archivos `.mdx` (`ExerciseFrontmatter`) en Etapa 4:

| Campo | Tipo | Obligatorio | Restricciones / Equivalencia en `ExerciseFrontmatter` |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `string` | Sí | Literal `"1.0.0"`. |
| `courseId` | `string` | Sí | Slug del curso (`"tda"`). |
| `summary` | `object` | Sí | Conteos exactos: `catalogCount`, `parcialCount`, `imprescindibleCount`, `importanteCount`, `advancedCount`. |
| `catalogExercises` | `ExerciseIndexEntry[]` | Sí | Cada entrada usa `id`, `courseId`, `number` (`1..85`), `title`, `paradigm` (equivale al campo `unit` en `ExerciseFrontmatter`), `sourceModule` (ruta al módulo fuente Python/HTML de extracción), `priority`, `difficulty`, `origin`, `isParcial`, `provenance: "elaborated_solution"`, `entityType: "CatalogExercise"`, `legacyPage`, `legacyAnchor`. |
| `advancedExercises` | `ExerciseIndexEntry[]` | Sí | Mismos campos con `number: null`, `paradigm: "avanzados"`, `provenance: "advanced_theory_example"`, `entityType: "AdvancedTheoryExercise"`. |

### 2.8. `InteractiveAndNotesManifest` (`docs/manifests/{course}/interactive-and-notes.json`)

Inventario verificable de widgets interactivos, apuntes maestros y resúmenes de Etapa 1B:

| Campo | Tipo | Obligatorio | Restricciones / Descripción |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `string` | Sí | Literal `"1.0.0"`. |
| `courseId` | `string` | Sí | Slug del curso (`"tda"`). |
| `summary` | `object` | Sí | `widgetCount`, `noteCount`, `summaryCount`, `checklistItemCount`, `trainerQuestionCount`. |
| `widgets` | `WidgetEntry[]` | Sí | `id`, `courseId`, `title`, `entityType: "InteractiveSimulator"`, `provenance: "interactive_widget"`, `sourceFiles[]`, `legacyAnchor`, `handlers[]`, y metadatos opcionales (`questionCount`, `timeGoalSeconds`, `passThresholdPercent`). |
| `notes` | `NoteEntry[]` | Sí | `id`, `courseId`, `title`, `entityType: "ElaboratedNote"`, `provenance: "elaborated_notes"`, `sourceFile`, más `resourceId` o `sections[]` (`{ id, title }`). |
| `summaries` | `SummaryEntry[]` | Sí | `id`, `courseId`, `title`, `entityType: "ElaboratedSummary"`, `provenance: "elaborated_summary"`, `sourceFile`, más `checklistItems[]` (`{ id, sectionId, itemIndex, label }`) o `sections[]`. |

---

## 3. Mapa Canónico de Rutas Multi-Materia y Compatibilidad Legacy

Todas las rutas públicas en Astro se resolverán anteponiendo `{BASE_URL}` mediante el helper centralizado `withBase()` para soportar despliegues en raíz (`/`) o sub-ruta de GitHub Pages (`/fiuba-cuadernos/`).

### 3.1. Rutas Canónicas Objetivo (Etapas 3–6)

| Patrón de Ruta Canónica | Propósito |
| :--- | :--- |
| `{BASE_URL}/` | Hub multi-materia de la plataforma (selector de cursos y búsqueda global Pagefind). |
| `{BASE_URL}/{course}/` | Dashboard de la materia (radiografía de parciales, mapa de unidades, accesos rápidos y entrenador). |
| `{BASE_URL}/{course}/ejercicios/` | Catálogo completo filtrable de ejercicios oficiales (`1..85` en TDA). |
| `{BASE_URL}/{course}/parciales/` | Vista transversal de ejercicios de exámenes parciales reales (`35` en TDA). |
| `{BASE_URL}/{course}/unidad/{unit}/` | Vista dedicada por paradigma o unidad temática (ej. `dyc`, `greedy`, `dp`). |
| `{BASE_URL}/{course}/avanzados/` | Apuntes de paradigmas avanzados, los `5` simuladores y los `2` ejercicios diferenciados. |
| `{BASE_URL}/{course}/materiales/` | Explorador completo de archivos fuente (`96` en TDA) agrupados por carpeta y `provenance`. |
| `{BASE_URL}/{course}/materiales/{resourceId}?page={N}` | Visor dual de recurso/PDF con apertura directa en la página `N` (destino canónico de Pagefind). |
| `{BASE_URL}/{course}/docs/{slug}/` | Apuntes maestros, catálogo de errores, checklist pre-parcial y guías (`DocLayout` unificado, sin Starlight). |

### 3.2. Matriz de Compatibilidad para los 12 HTML Legacy de TDA

Los 12 archivos HTML en la raíz permanecen intactos hasta la Etapa 6. Al migrar el despliegue en Etapa 6, se garantizarán rutas de compatibilidad que redirijan hacia las rutas canónicas conservando los fragmentos `#ej-{N}` y `#entrenador-30s`:

| Archivo Legacy en Raíz | Ruta Canónica Destino en TDA | Anchors Preservados |
| :--- | :--- | :--- |
| `index.html` | `{BASE_URL}/tda/` | `#entrenador-30s` |
| `todos.html` | `{BASE_URL}/tda/ejercicios/` | `#ej-1`..`#ej-85`, `#entrenador-30s` |
| `parciales.html` | `{BASE_URL}/tda/parciales/` | `#ej-{N}` (los `35` parciales) |
| `dyc.html` | `{BASE_URL}/tda/unidad/dyc/` | `#ej-1`..`#ej-12`, `#ej-80` |
| `greedy.html` | `{BASE_URL}/tda/unidad/greedy/` | `#ej-13`..`#ej-38`, `#ej-83` |
| `backtracking.html` | `{BASE_URL}/tda/unidad/backtracking/` | `#ej-39`..`#ej-52`, `#ej-81` |
| `dp.html` | `{BASE_URL}/tda/unidad/dp/` | `#ej-53`..`#ej-59`, `#ej-82` |
| `pl.html` | `{BASE_URL}/tda/unidad/pl/` | `#ej-60`..`#ej-65`, `#ej-84` |
| `flujo.html` | `{BASE_URL}/tda/unidad/flujo/` | `#ej-66`..`#ej-70` |
| `reducciones.html` | `{BASE_URL}/tda/unidad/reducciones/` | `#ej-71`..`#ej-74`, `#ej-85` |
| `integradores.html` | `{BASE_URL}/tda/unidad/integradores/` | `#ej-75`..`#ej-79` |
| `teoria-avanzados.html` | `{BASE_URL}/tda/avanzados/` | `#intro`, `#set-cover`..`#ejercicios-clase` |
