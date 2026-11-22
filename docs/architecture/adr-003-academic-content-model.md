# ADR-003: Modelo de Contenido Académico Multi-Materia con Procedencia (`provenance`) y Preservación del Catálogo TDA

## Status
Accepted (confirmada en [PLAN_DE_TRABAJO.md](../PLAN_DE_TRABAJO.md), Secciones 2.1, 3.2 y 4.2 — 2026-11-21)

## Context
- **Problem:** El repositorio reúne materiales heterogéneos con distinta naturaleza y autoría: diapositivas y guías oficiales de la cátedra, enunciados de parciales oficiales, un parcial real reconstruido en PDF ([generate_pdf.py](../../generate_pdf.py)), una entrega real autorizada de TP0, plantillas Python de práctica, apuntes elaborados, 85 soluciones del catálogo compilado, 2 ejercicios resueltos independientes en `teoria-avanzados.html` y 6 widgets interactivos. Mezclar estos orígenes sin trazabilidad ni separación de capas impide auditar la fuente oficial de cada ítem y dificulta agregar nuevas materias sin tocar código de plataforma.
- **Constraints:**
  - **Preservación íntegra de `TP0/`:** Todos los archivos existentes en `TP0/` (`TP00-2026-2c.pdf`, `checklist.pdf`, `TP0_Nelson_Avila_100244.pdf`, `cuartetos.py`, `cuartetos_malo.py`, `grafico_tiempos.png`) están autorizados y deben conservarse intactos sin anonimizar, excluir ni modificar.
  - **Catálogo oficial `1..85` + `2` avanzados diferenciados:** El catálogo principal conserva exactamente los 85 ejercicios (`1..85`, `35` de parciales reales). Los 2 ejercicios resueltos de la Sección 16 de `teoria-avanzados.html` (*2-Partition Aproximado* y *N-Reinas Las Vegas*) conservan su identidad diferenciada (`tda-adv-aprox-2partition` y `tda-adv-rand-nreinas`) sin numeración artificial `86`/`87`.
  - **Extensibilidad multi-materia real:** Agregar una nueva materia en Etapa 7 solo puede requerir agregar manifiestos declarativos y contenidos en `src/content/` y `public/materials/`, sin modificar componentes, layouts ni lógica de plataforma.

## Options Considered
| Option | Pros | Cons | Complexity |
| :--- | :--- | :--- | :--- |
| **Opción A: Modelo declarativo multi-materia con campo obligatorio `provenance`, `entityType` y separación Plataforma/Dominio** | Trazabilidad explícita entre fuente oficial, material reconstruido, entrega autorizada y solución elaborada; preserva la numeración canónica `1..85` y los 2 avanzados; habilita validación automática contra disco y extensión declarativa por materia. | Exige mantener manifiestos estructurados por materia y respetar sus contratos en cada nuevo contenido. | Media |
| **Opción B: Catálogo plano unificado (renumerar avanzados a `86..87` y omitir `provenance`)** | Esquema único más corto para ejercicios. | Rompe la identidad oficial de la guía (`85` ejercicios), mezcla problemas de clase avanzada con el catálogo de parciales y oculta la distinción entre fuente oficial de cátedra, entrega de TP0 y material elaborado. | Baja / Alto riesgo académico |

## Decision
Se adopta la **Opción A**: todo recurso, evaluación, ejercicio, apunte, resumen y widget pertenece a un `courseId` y declara obligatoriamente su `entityType` (13 entidades) y su `provenance` (9 valores), manteniendo separación absoluta entre la capa de **Plataforma** y la capa de **Dominio Académico**.

Los **9 valores canónicos de `provenance`** son:
1. `official_source`: Material emitido por la cátedra (`OfficialSlideDeck` [29], `OfficialCodePackage` [3 paquetes], `OfficialGuide` [10], `OfficialExamPDF` [6], `OfficialTPAssessment` [1 TP = 2 PDFs]).
2. `reconstructed_exam_statement`: Enunciado de examen real reconstruido mediante script propio (`ReconstructedExamPDF` [1]: `Parciales/TP-2026-2-2.pdf` generado por [generate_pdf.py](../../generate_pdf.py)).
3. `elaborated_submission`: Entrega resuelta autorizada y preservada íntegramente (`ElaboratedTPSubmission` [1 entrega = 4 archivos en `TP0/`]).
4. `exam_prep_and_practice`: Plantillas y guías de práctica en código (`CodePractice` [20 scripts `.py`: 1 resuelto + 19 `TODO`, más `Practicas/README.md`]).
5. `elaborated_notes`: Apuntes maestros desarrollados (`ElaboratedNote` [2]: `DIapositivas/Explicaciones/problema_mochila_y_greedy.md` y las secciones de `teoria-avanzados.html`).
6. `elaborated_summary`: Matrices, checklist pre-parcial y recetas rápidas (`ElaboratedSummary` [3]: `sec01`, `sec11` [11 ítems `chk_<16_hex>`] y Drawer de Fórmulas).
7. `elaborated_solution`: Soluciones desarrolladas del catálogo oficial (`CatalogExercise` [85 ejercicios `1..85`], de los cuales `35` poseen `isParcial: true`).
8. `advanced_theory_example`: Ejercicios resueltos diferenciados de paradigmas avanzados (`AdvancedTheoryExercise` [2]: `tda-adv-aprox-2partition` y `tda-adv-rand-nreinas`, con `number: null`).
9. `interactive_widget`: Simuladores y entrenadores interactivos (`InteractiveSimulator` [6]: Entrenador 30s de 20 casos + 5 simuladores de `teoria-avanzados.html`).

## Rationale
Separar `provenance` del tipo de entidad y anclar la identidad del catálogo oficial `1..85` evita ambigüedades pedagógicas (el estudiante distingue en todo momento qué proviene de la cátedra y qué es una solución o apunte elaborado) y protege contra regresiones históricas como la mezcla de ejercicios sintéticos (`sec10_tipo_parcial.py`) documentada en la Etapa 0. Asimismo, parametrizar la plataforma sobre colecciones declarativas por `courseId` hace verificable la meta de Etapa 7 (0 cambios de plataforma al sumar una segunda materia).

## Consequences
- **Positive:**
  - Auditoría automatizable 1-a-1 entre manifiestos y archivos físicos (`96` archivos = `49` PDFs + `47` no-PDFs).
  - Conservación garantizada e inviolable de los `6` archivos de `TP0/`.
  - Rutas legacy y anclas `#ej-1`..`#ej-85` mapeables sin colisión hacia la nueva arquitectura.
- **Negative:**
  - Los componentes de UI (`ExerciseCard`, `PdfSplitViewer`, listados de recursos) deben contemplar la representación de badges de procedencia y casos donde `number` sea `null`.
- **Mitigation:**
  - Documentar formalmente todos los campos y enumeraciones en [domain-schemas.md](../contracts/domain-schemas.md) y cubrir con tests automatizados en [test_etapa1b_manifests_and_contracts.py](../../tests/test_etapa1b_manifests_and_contracts.py).

## Revisit Trigger
- Si la incorporación de una nueva materia requiere un décimo valor de `provenance` o un nuevo `entityType` no contemplado en las 13 entidades actuales (deberá extenderse primero el esquema Zod y el presente ADR antes de incorporarlo).
