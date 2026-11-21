# Plan de Trabajo y Hoja de Ruta — Mega Cuaderno Universitario

> **Proyecto:** Evolución de `tda-2C2026-material` hacia una plataforma académica multi-materia estática desplegable en GitHub Pages.  
> **Primer Módulo Académico:** Teoría de Algoritmos (TDA — FIUBA, Cátedra Echevarría).  
> **Commit Base de Referencia:** `6a7d49c`

---

## 1. Resumen de la Etapa 0 (Auditoría y Diagnóstico — Cerrada)

La auditoría inicial verificó sobre código, contenido académico, tests y navegador real los siguientes hechos:

1. **Discrepancia histórica de conteos (`83` vs `79` vs `85` + `2`):**
   - El `README.md` declaraba **83 ejercicios** provenientes de una generación previa (`79` oficiales + `4` sintéticos del módulo eliminado `builder/sec10_tipo_parcial.py`).
   - Tras eliminar `sec10_tipo_parcial.py`, se incorporaron los 6 ejercicios reales del parcial `Parciales/TP-2026-2-2.pdf` (`Ej 80..85`).
   - **Conteo real actual:** **85 ejercicios oficiales en catálogo (`1..85`)** —de los cuales **35** corresponden a parciales reales (`data-parcial="true"`)—, más **2 ejercicios resueltos diferenciados** en la Sección 16 de `teoria-avanzados.html` (*2-Partition Aproximado* y *N-Reinas Las Vegas*) y **5 simuladores interactivos**.
2. **Desconexión de páginas manuales y conflicto Git:**
   - `builder/build_manual.py` compila `todos.html`, las 8 vistas por paradigma (`dyc`, `greedy`, `backtracking`, `dp`, `pl`, `flujo`, `reducciones`, `integradores`), `parciales.html` y `assets/js/catalog-bundle.js`.
   - `index.html` y `teoria-avanzados.html` quedaron fuera del builder, produciendo desincronización en el navbar (`29`/`79` en `teoria-avanzados.html`), duplicación de funciones JS globales y un conflicto Git activo (`<<<<<<< HEAD`..`>>>>>>> origin/master`) en `index.html:L40-L62`.
3. **Bugs y deuda técnica detectada:**
   - `getPageForExercise(num)` en `assets/js/app.js` solo mapeaba `1..79` y redirigía por defecto a `index.html`, rompiendo el salto a los ejercicios `80..85`.
   - `html_interactive_builder.py:L212` generaba IDs de checklist (`chk_`) usando `hash(raw_text)` de Python (no determinista entre procesos), invalidando `localStorage` en cada build.
   - `assets/css/styles.css` (4,553 líneas) contenía un error de sintaxis en `L3572–L3573`, `0` reglas `:focus-visible`, fallos de contraste WCAG AA (incluyendo `#38bdf8` `2.23:1`, `#0284c7` `4.10:1`, `#3182ce` `4.03:1`/`3.80:1`, `#d69e2e` `2.38:1` y especificidad de `body.dark-mode a` sobre `.btn-warning` `1.22:1`), y recorte izquierdo de diagramas Mermaid anchos en móvil.
   - `tests/test_build_integration.py` ejecutaba `build_manual.py` sobre el working tree mutando archivos del repo antes de testear, y `builder/test_qa_audit.py` fallaba por esperar `29` parciales en lugar de `35`.
   - Los **96 archivos físicos** de material (`DIapositivas/`, `Guia-Ejercicios/`, `Parciales/`, `Practicas/`, `TP0/`) carecían de enlaces clickeables desde la aplicación web.

---

## 2. Decisiones Confirmadas y Pendientes

### 2.1. Decisiones Confirmadas
- **Preservación íntegra de `TP0/`:** Todos los archivos en `TP0/` (incluyendo `TP0_Nelson_Avila_100244.pdf`, `TP00-2026-2c.pdf`, `checklist.pdf`, `cuartetos.py`, `cuartetos_malo.py` y `grafico_tiempos.png`) están autorizados y se mantienen intactos sin anonimizar, excluir ni modificar.
- **Catálogo oficial de 85 ejercicios + 2 ejercicios avanzados diferenciados:** El catálogo principal conserva numeración oficial `1..85` (`35` de parciales reales). Los 2 ejercicios resueltos de Teoría Avanzada mantienen su identidad diferenciada (`tda-adv-aprox-2partition`, `tda-adv-rand-nreinas`) sin numeración oficial artificial.
- **Núcleo arquitectónico basado en Astro:** Astro Core + TypeScript + Content Collections (Zod) + MDX (`remark-math`/`rehype-katex` en build-time) + Islas React + Pagefind.
- **Aislamiento total de tests:** Ningún test puede modificar ni crear archivos (versionados o ignorados en `__pycache__/`) dentro del repositorio de trabajo; las compilaciones de prueba se ejecutan en `tempfile.TemporaryDirectory()`.
- **Gobernanza Git y Rollback Seguro:** Prohibido usar `git checkout --` o `git push`. Se opera mediante checkpoints, commits atómicos aprobados previa revisión del `git diff`, registro de SHAs y reversión selectiva con `git revert --no-edit <sha>`.
- **Conservación de los 12 HTML existentes durante la transición:** Los archivos HTML actuales de la raíz no se eliminan hasta completar la migración, verificar la paridad funcional/visual, validar las rutas de compatibilidad y confirmar el rollback.
- **`ADR-002` — Layouts Astro propios unificados (Opción A aprobada):** Toda la plataforma (Hub, Dashboard, Ejercicios, Simuladores, Materiales y Apuntes `/docs/`) se construye con Layouts Astro propios y un único Design System WCAG 2.1 AA, descartando acoplar Starlight.
- **`ADR-004` — Indexación Pagefind de PDFs con Node API (Opción A aprobada):** Se usa `index.addCustomRecord()` en `astro:build:done` (descartando `data-pagefind-body` en HTML) con URL canónica `{BASE_URL}/{course}/materiales/{resourceId}?page={N}`, validación previa con un prototipo de 4 PDFs representativos antes de escalar a los 49 PDFs, y fallback a metadatos YAML para PDFs sin capa de texto usable.

### 2.2. Estado de Decisiones para la Etapa 1B
- Todas las decisiones arquitectónicas (`ADR-001` a `ADR-004`) fueron confirmadas y formalizadas en [docs/architecture/](architecture/README.md), junto con los contratos en [domain-schemas.md](contracts/domain-schemas.md) y [local-storage-migration.md](contracts/local-storage-migration.md).

---

## 3. Manifiesto Académico Verificable de TDA

### 3.1. Inventario de Archivos Físicos (`96 archivos` en 5 carpetas = `49 PDFs` + `47 no-PDF`)
- **`DIapositivas/` (52 archivos físicos):** `29` PDFs de clases (`00` a `24`), `4` archivos `.ltx` en `12 - Lindo/`, `6` archivos en `12 - Mochila/`, `12` archivos en `12 - Viajante/`, `1` apunte `.md` en `Explicaciones/problema_mochila_y_greedy.md`.
- **`Guia-Ejercicios/` (10 archivos físicos):** `10` PDFs (`GuiaDeEjercicios-v1.0.pdf` + `01` a `09`).
- **`Parciales/` (7 archivos físicos):** `7` PDFs (`TP-2024-2-1.pdf` a `TP-2026-2-2.pdf`).
- **`Practicas/` (21 archivos físicos):** `20` scripts `.py` (`1` resuelto: `01_division_y_conquista/ej02_primer_cero_tests.py`; `19` plantillas `TODO` con `assert`s) + `Practicas/README.md`.
- **`TP0/` (6 archivos físicos):** `2` PDFs oficiales (`TP00-2026-2c.pdf`, `checklist.pdf`) + `4` archivos de entrega autorizada (`TP0_Nelson_Avila_100244.pdf`, `cuartetos.py`, `cuartetos_malo.py`, `grafico_tiempos.png`).

### 3.2. Clasificación por Entidad Académica y Procedencia (`provenance`)

| Entidad Académica | Procedencia | Conteo Exacto | Fuentes / Archivos Exactos |
| :--- | :--- | :---: | :--- |
| **Diapositivas de Clase (`OfficialSlideDeck`)** | `official_source` | **29** | `DIapositivas/00*.pdf` a `24*.pdf` |
| **Paquetes de Ejemplo de Cátedra (`OfficialCodePackage`)** | `official_source` | **3 paquetes** | `12 - Lindo/` (4), `12 - Mochila/` (6), `12 - Viajante/` (12) |
| **Guías de Ejercicios (`OfficialGuide`)** | `official_source` | **10** | `Guia-Ejercicios/GuiaDeEjercicios-v1.0.pdf` + `01`..`09` |
| **Exámenes Parciales Oficiales (`OfficialExamPDF`)** | `official_source` | **6 parciales** | `Parciales/TP-2024-2-1.pdf` a `TP-2026-2-1.pdf` |
| **Parcial Real Reconstruido (`ReconstructedExamPDF`)** | `reconstructed_exam_statement` | **1 parcial** | `Parciales/TP-2026-2-2.pdf` (generado vía `generate_pdf.py`) |
| **Evaluación TP0 y Checklist Oficial (`OfficialTPAssessment`)** | `official_source` | **1 TP (`TP0`)** | `TP0/TP00-2026-2c.pdf` + `TP0/checklist.pdf` |
| **Entrega Resuelta Autorizada (`ElaboratedTPSubmission`)** | `elaborated_submission` | **1 entrega (`TP0`)** | `TP0/TP0_Nelson_Avila_100244.pdf`, `cuartetos.py`, `cuartetos_malo.py`, `grafico_tiempos.png` |
| **Prácticas de Código (`CodePractice`)** | `exam_prep_and_practice` | **20** (`1` resuelta + `19` `TODO`) | `Practicas/01_*`..`05_*` + `Practicas/README.md` |
| **Apuntes Maestros (`ElaboratedNote`)** | `elaborated_notes` | **2 apuntes** | `problema_mochila_y_greedy.md` + `17` bloques (`intro` + `16` secciones temáticas) de `teoria-avanzados.html` |
| **Resúmenes y Checklist Pre-Parcial (`ElaboratedSummary`)** | `elaborated_summary` | **3 resúmenes** | `sec01` (matriz), `sec11` (**Checklist Interactiva de 11 ítems**), Drawer de Fórmulas |
| **Ejercicios del Catálogo (`CatalogExercise`)** | `elaborated_solution` | **85 ejercicios** | `sec02_dyc.py` (`13`), `sec03`/`sec03b` (`27`), `sec04` (`15`), `sec05` (`8`), `sec06` (`7`), `sec07` (`5`), `sec08` (`5`), `sec09` (`5`) |
| **Ejercicios Teoría Avanzada (`AdvancedTheoryExercise`)** | `advanced_theory_example` | **2 diferenciados** | `tda-adv-aprox-2partition` y `tda-adv-rand-nreinas` en `teoria-avanzados.html` |
| **Simuladores y Entrenadores (`InteractiveSimulator`)** | `interactive_widget` | **6 widgets** | Entrenador 30s (`20` casos en `app.js`) + `5` Simuladores en `teoria-avanzados.html` |

---

## 4. Arquitectura Objetivo y Estrategia Multi-Materia (Etapas 1B–7)

### 4.1. Separación de Capas
- **A. Plataforma (`src/components/platform/`, `src/layouts/`, `src/styles/`, `src/stores/`):** Navegación global multi-materia, Hub de Carrera, Dashboard de Materia, Buscador estático Pagefind, Design System académico WCAG AA Light/Dark, bloques MDX (`<AcademicBlock>`, `<ExerciseCard>`, `<SolutionDrawer>`, `<PdfSplitViewer>`), motor de cuestionarios/simulacros y store local namespaced (`mc:v1:{course}:*`) con migración automática desde `tda_*`.
- **B. Dominio Académico (`src/content/`, `public/materials/`):** Manifiestos declarativos por materia (`courses/*.yaml`, `resources/*-resources.yaml`, `assessments/*.yaml`, `quizzes/*.yaml`, `exercises/{course}/{unit}/*.mdx`, `docs/{course}/**/*.mdx`) con separación estricta de `provenance`. Incorporar una nueva materia requiere únicamente agregar configuración y contenido sin modificar componentes de plataforma.
- **C. Infraestructura (`astro.config.mjs`, `tests/`, `.github/workflows/`):** Build estático con `base` configurable para GitHub Pages y helper `withBase()`, compilación KaTeX en build-time (`remark-math` + `rehype-katex`), validación de esquemas Zod, Vitest, Pytest, Playwright E2E + `@axe-core/playwright`, y despliegue automático de `dist/` vía GitHub Actions.

### 4.2. ADRs Propuestos (A Formalizar en Etapa 1B)
- **`ADR-001`:** Adopción de Astro Core + TypeScript + Content Collections (Zod) como núcleo de plataforma multi-materia.
- **`ADR-002`:** Layouts Académicos propios unificados en Astro (Opción A aprobada; se descarta Starlight).
- **`ADR-003`:** Modelo de contenido con separación de procedencia (`provenance`), preservación del catálogo `1..85` y diferenciación de los 2 ejercicios avanzados.
- **`ADR-004`:** Búsqueda global estática con Pagefind e indexación de PDFs mediante `addCustomRecord()` + prototipo previo con 4 PDFs y fallback a metadatos YAML (Opción A aprobada).

---

## 5. Plan de Ejecución de la Etapa 1A (Saneamiento Técnico del Proyecto Existente)

> **Regla de Alcance:** La Etapa 1A opera exclusivamente sobre el proyecto Python/HTML/CSS/JS actual, sin instalar ni crear archivos de Astro.

### Unidades de Trabajo `1A.1` a `1A.7`

| Unidad | Alcance Técnico Detallado | Archivos Afectados | Pruebas y Criterios de Aceptación |
| :-: | :--- | :--- | :--- |
| **1A.1** | **Aislamiento criptográfico de tests e integración de `test_qa_audit.py`:** Parametrización `--output-dir` en `build_manual.py`; `TestBuildIntegration` compilando en `tempfile.TemporaryDirectory()`; actualización de `builder/test_qa_audit.py` a 85 ejercicios y 35 parciales; integración vía `tests/test_qa_audit_suite.py`; redirección de bytecode a temporal del SO y `WorkspaceIntegrityGuard` en `run_tests.py` auditando archivos versionados e ignorados. | `run_tests.py`, `builder/build_manual.py`, `builder/test_qa_audit.py`, `tests/test_build_integration.py`, `tests/test_qa_audit_suite.py` | `python run_tests.py` (sin `-B`) pasa el 100% con `0` archivos creados, eliminados o modificados (versionados e ignorados). |
| **1A.2** | **Navbar único `get_navbar_html()`, IDs `chk_` compuestos y limpieza de conflictos:** Extraer `get_navbar_html(active_paradigm, counts)` retornando solo `<header id="siteNavbar">`; calcular conteos desde `sec02..sec09.py`; usar `get_navbar_html()` en `get_hud_and_drawer_html()` y en `sync_standalone_page_navbar()` (reemplazando solo `<header>` en `index.html` y `teoria-avanzados.html`); generar IDs de checklist mediante identidad compuesta `f"{section_id}:{item_id}:{raw_text}"` con `hashlib.sha256(...).hexdigest()[:16]` (64 bits, sin módulo `% 100000`) y validación `ValueError` anti-colisiones; fijar `trainerTotalQuestions = 20` y `sec01` en `85`; resolver conflicto Git en `index.html` y eliminar duplicados JS en `teoria-avanzados.html`. | `builder/html_interactive_builder.py`, `builder/build_manual.py`, `builder/sec01_intro_and_matrix.py`, `index.html`, `teoria-avanzados.html`, `tests/test_build_integration.py`, `tests/test_qa_audit_suite.py` | Los 12 HTML coinciden en estructura y conteos normalizando `active`, cada página activa su propia ruta, `0` marcadores `<<<<<<<`, determinismo con distinto `PYTHONHASHSEED` y rechazo explícito de colisiones (`ValueError`). |
| **1A.3** | **Paridad Python/JS en ejecución real de `assets/js/app.js`:** Corregir `getPageForExercise(num)` para mapear `80..85` y fallback `"todos.html"`; validar en `tests/test_paradigm_filter.py` ejecutando el archivo real `assets/js/app.js` en Node/V8 (`vm.runInNewContext`) con el entorno mínimo verificado (ampliando solo el stub si el entorno mínimo no alcanza). | `assets/js/app.js`, `tests/test_paradigm_filter.py` | Paridad 85/85 entre `getPageForExercise(num)`, `get_paradigm_for_exercise(num)` y la existencia de `id="ej-{num}"` en el HTML destino; Node obligatorio (falla si falta). |
| **1A.4** | **Sintaxis CSS, WCAG 2.1 AA y Mermaid móvil:** Eliminar llave `}` huérfana `L3572–L3573`; corregir tokens `--accent-color: #1d4ed8` (`6.70:1`), `--primary-light: #1e40af` (`8.19:1`), `--text-muted: #475569` (`6.46:1`), `--imprescindible-color: #b91c1c` (`6.36:1`), `--importante-color: #92400e` (`7.33:1`), `--mastered-color: #166534` (`6.90:1`), Dark `.diff-btn.active` `#0369a1` (`5.93:1`), especificidad de `body.dark-mode a` sobre CTAs del hero, `:focus-visible`, `:disabled` (`5.82:1`/`5.58:1` + `cursor: not-allowed`, sin hover/elevación, `disabled`/`aria-disabled`) y `.mermaid` móvil; agregar test matemático sobre pares declarados en `tests/test_dark_mode_and_responsive.py`. | `assets/css/styles.css`, `tests/test_dark_mode_and_responsive.py` | Balanceo exacto de llaves `{}` y ratio $\ge 4.5:1$ en todos los pares declarados ($\ge 3.0:1$ en `:focus-visible`). |
| **1A.5** | **Actualización de `README.md` y verificación estricta de enlaces:** Actualizar conteos (`85` + `2` avanzados, `35` parciales, `1` práctica resuelta + `19` `TODO`), corregir `tipo_parcial.html` $\to$ `parciales.html` y conservar `TP0/` intacto; añadir test case-sensitive segmento por segmento (`urlsplit`, `unquote`, relativas/absolutas, ignorando externos). | `README.md`, `tests/test_build_integration.py` | `0` enlaces locales rotos en HTML y `.md` bajo verificación *case-sensitive* compatible con Linux. |
| **1A.6** | **Regeneración única e idempotencia:** Ejecutar `python builder/build_manual.py` para propagar `get_navbar_html()` y los IDs `chk_<16_hex>` a los artefactos compilados, y correr una segunda verificación en directorio temporal comprobando idempotencia SHA-256. | Artefactos compilados (`todos.html`, 8 paradigmas, `parciales.html`, `catalog-bundle.js`, `index.html`, `teoria-avanzados.html`) | `0` diferencias entre dos corridas consecutivas del builder con distinto `PYTHONHASHSEED`. |
| **1A.7** | **Cierre QA y auditoría computada en navegador real:** Ejecutar `python run_tests.py` y validar en vivo con el subagente `browser` midiendo `window.getComputedStyle(el)` tras la cascada completa en Light/Dark Mode (normal, `:hover`, `.active`, `:focus-visible`, `:disabled`), ausencia de conflictos, ruteo `ej-80` y simuladores. | Ninguno (`0` escrituras) | `run_tests.py` en verde (`0` mutaciones), `0` errores de consola JS, `0` HTTP 404 y estilos computados conformes a WCAG AA. |

---

## 6. Hoja de Ruta General (Etapas 1A a 7) y Rollback Seguro

1. **Etapa 1A — Saneamiento Técnico del Proyecto Existente:** Descrita en la Sección 5. *Rollback:* `git revert --no-edit <sha>`.
2. **Etapa 1B — Modelo Académico, Contratos y ADRs:** Formalización de `docs/architecture/adr-001..004.md` y manifiestos verificables de TDA. *Rollback:* `git revert --no-edit <commits-1B>`.
3. **Etapa 2 — Infraestructura Base (Astro Core + Content Collections + Vitest):** Configuración inicial de Astro, Zod, `remark-math`/`rehype-katex` y `withBase()`. *Rollback:* `git revert --no-edit <commits-2>`.
4. **Etapa 3 — Núcleo de Plataforma y Design System:** Layouts, tokens CSS sin `!important`, componentes `AcademicBlock`, `ExerciseCard`, `ExerciseFilterHUD`, `QuickRecognitionTrainer`, `CheatsheetDrawer`, `PdfSplitViewer`, `progressStore.ts`. *Rollback:* `git revert --no-edit <commits-3>`.
5. **Etapa 4 — Migración Integral de TDA (Conservando HTML existentes):** Conversión verificada de los `85` ejercicios + `2` avanzados + `5` simuladores + enlace a los 96 archivos de material + prototipo de 4 PDFs en Pagefind previo a escalar a 49 PDFs. *Rollback:* `git revert --no-edit <commits-4>`.
6. **Etapa 5 — QA E2E, Visual y WCAG en Navegador Real:** Playwright + `@axe-core/playwright` en Desktop, Mobile Portrait y Mobile Landscape + Link Checker bajo `base`. *Rollback:* `git revert --no-edit <commits-5>`.
7. **Etapa 6 — Deploy Automatizado en GitHub Pages:** GitHub Actions publicando `dist/` con rutas de compatibilidad `*.html` verificadas antes de retirar los HTML legacy de la raíz. *Rollback:* `git revert --no-edit <commits-6>`.
8. **Etapa 7 — Validación de Extensibilidad con Segunda Materia:** Incorporación declarativa en `src/content/` y `public/materials/` con `0` cambios en plataforma. *Rollback:* `git revert --no-edit <commits-7>`.

---

## 7. Registro de Commits Locales (Etapa 1A)

*(Sin `git push`; cada commit se registra previa revisión y aprobación del `git diff`).*

| Unidad | SHA | Mensaje | Archivos Principales |
| :--- | :--- | :--- | :--- |
| Plan | `34d2bbb` | `docs: agregar plan de trabajo arquitectonico y hoja de ruta etapa 1A` | `docs/PLAN_DE_TRABAJO.md` |
| 1A.1 | `dcc38a8` | `test(1A.1): aislar suite de tests en tempfile e integrar auditoria QA` | `builder/build_manual.py`, `builder/test_qa_audit.py`, `run_tests.py`, `tests/test_build_integration.py`, `tests/test_qa_audit_suite.py` |
| Plan (ADRs) | `6975be4` | `docs: confirmar ADR-002 y ADR-004 opcion A y registrar SHAs previos` | `docs/PLAN_DE_TRABAJO.md` |
| 1A.2 | `0863386` | `fix(1A.2): unificar navbar, generar IDs chk_ deterministicos y limpiar conflictos` | `builder/build_manual.py`, `builder/html_interactive_builder.py`, `builder/sec01_intro_and_matrix.py`, `index.html`, `teoria-avanzados.html`, `tests/test_build_integration.py`, `tests/test_qa_audit_suite.py` |
| 1A.3 | `025ec7b` | `fix(1A.3): mapear ejercicios 80..85 en getPageForExercise y validar paridad Python/JS en Node` | `assets/js/app.js`, `tests/test_paradigm_filter.py` |
| 1A.4 | `a22d98c` | `fix(1A.4): corregir sintaxis CSS, contraste WCAG AA, focus-visible, disabled y Mermaid movil` | `assets/css/styles.css`, `tests/test_dark_mode_and_responsive.py` |
| 1A.5 | `05750fd` | `docs(1A.5): actualizar README con conteos reales y validar enlaces locales case-sensitive` | `README.md`, `tests/test_build_integration.py` |
| 1A.6 | `77f5d02` | `build(1A.6): regenerar artefactos HTML y bundle con navbar unificado e IDs chk_ deterministicos` | `todos.html`, `dyc.html`..`parciales.html`, `assets/js/catalog-bundle.js` |
| 1A.7 | `b673036` | `fix(1A.7): corregir diff-btn dark, KaTeX dinamico en simuladores, Mermaid movil y favicon` | `assets/css/styles.css`, `builder/html_interactive_builder.py`, `index.html`, `teoria-avanzados.html`, `todos.html`..`parciales.html` |

> **Cierre QA Etapa 1A (`1A.7` — Cerrada):** `python run_tests.py` (`46/46 OK`, `0` mutaciones), idempotencia SHA-256 verificada (`13/13` artefactos entre `PYTHONHASHSEED=1` y `999999`), y auditoría computada en Chrome Headless vía CDP + navegador real (`0` errores JS, `0` HTTP 404, estilos `getComputedStyle` conformes a WCAG 2.1 AA en Light/Dark, ruteo `ej-80`, 5 simuladores con KaTeX dinámico y Mermaid móvil sin recorte izquierdo). Publicado en `origin/master` (`a22d98c..7bda802`).

---

## 8. Plan de Ejecución de la Etapa 1B (Modelo Académico, Contratos y ADRs)

> **Regla de Alcance:** La Etapa 1B define la arquitectura formal, contratos declarativos y manifiestos verificables sin instalar ni crear aún código Astro/npm ni modificar los 12 HTML legacy, `assets/`, `builder/` ni `TP0/`.

### Unidades de Trabajo `1B.1` a `1B.5`

| Unidad | Alcance Técnico Detallado | Entregables | Pruebas y Criterios de Aceptación |
| :-: | :--- | :--- | :--- |
| **1B.1** | **Formalización de ADRs (`ADR-001` a `ADR-004`):** Documentar contexto, opciones comparadas, decisión, trade-offs y gatillos de revisión para Astro Core, Layouts propios unificados WCAG 2.1 AA (Opción A), modelo de procedencia + preservación `TP0/` + `1..85` + `2` avanzados, y Pagefind Node API (`addCustomRecord()`) con prototipo de 4 PDFs y fallback a metadatos. | [architecture/README.md](architecture/README.md), [adr-001](architecture/adr-001-astro-core.md), [adr-002](architecture/adr-002-unified-astro-layouts.md), [adr-003](architecture/adr-003-academic-content-model.md), [adr-004](architecture/adr-004-pagefind-pdf-indexing.md) | 4 ADRs en estado `Accepted` con las 7 secciones obligatorias y mención exacta de los 4 PDFs prototipo y `{BASE_URL}/{course}/materiales/{resourceId}?page={N}`. |
| **1B.2** | **Contratos de dominio y migración `localStorage`:** Especificar los 9 valores de `provenance`, 13 `EntityType`, esquemas de `CourseManifest`, `ResourceManifest`, `AssessmentManifest`, `QuizManifest`, `ExerciseFrontmatter`, `DocFrontmatter`, mapa canónico de rutas + compatibilidad de los 12 HTML legacy, y migración no destructiva e idempotente de las 4 claves `tda_*` a `mc:v1:{course}:*`. | [domain-schemas.md](contracts/domain-schemas.md), [local-storage-migration.md](contracts/local-storage-migration.md) | Cobertura completa de campos Zod, los 12 HTML legacy, las 4 claves `tda_*` y matriz de casos de borde contractuales. |
| **1B.3** | **Manifiestos verificables de TDA (`JSON`):** Generar manifiestos trazables y auditables desde el disco y módulos `builder/` cubriendo los `96` archivos (`49` PDFs con `pageCount`/`textChars`/`emptyPages` medidos con `pypdf`, `4` PDFs prototipo, `6` archivos de `TP0/` con `preservedIntact: true`, `1` práctica resuelta + `19` `TODO` + `README.md`), `85` ejercicios + `2` avanzados, `7` parciales + `2` bloques `TP0`, `6` widgets, `2` apuntes (`17` secciones avanzadas), `3` resúmenes y `11` IDs `chk_<16_hex>`. | [course.json](manifests/tda/course.json), [resources.json](manifests/tda/resources.json), [assessments.json](manifests/tda/assessments.json), [exercises-index.json](manifests/tda/exercises-index.json), [interactive-and-notes.json](manifests/tda/interactive-and-notes.json) | Reconciliación exacta 96/96 archivos (*case-sensitive*), 49/49 PDFs, 85/85 ejercicios + 2 avanzados, 35/35 parciales, 11/11 `chk_` IDs y 20 preguntas de entrenador. |
| **1B.4** | **Suite de pruebas QA y casos negativos de Etapa 1B:** Validadores puros + pruebas de paridad 1-a-1 en modo 100% read-only (compatible con `WorkspaceIntegrityGuard`) y cobertura de casos de borde negativos (casing inválido, `provenance` desconocido, ID duplicado/inválido, archivo faltante, rango `1..85`, desajuste de parciales). | [test_etapa1b_manifests_and_contracts.py](../tests/test_etapa1b_manifests_and_contracts.py) | `python run_tests.py` pasa al 100% incluyendo Etapa 1A (`46` tests) + Etapa 1B, con `0` mutaciones en el repositorio y `0` enlaces locales rotos. |
| **1B.5** | **Actualización del plan, verificación y auditoría independiente:** Actualizar este documento, correr `python run_tests.py` y ejecutar revisión independiente de todos los entregables antes de solicitar aprobación de commit. | [PLAN_DE_TRABAJO.md](PLAN_DE_TRABAJO.md) | Auditoría independiente sin hallazgos críticos ni bloqueantes pendientes y `python run_tests.py` 100% en verde. |

### Registro de Commits (Etapa 1B)

| Unidad | SHA | Mensaje | Archivos Principales |
| :--- | :--- | :--- | :--- |
| `1B.1` | `c736534` | `docs(1B.1): formalizar ADR-001 a ADR-004 en docs/architecture` | `docs/architecture/README.md`, `adr-001`..`adr-004` |
| `1B.2` | `67717b2` | `docs(1B.2): definir contratos de dominio, rutas legacy y migracion localStorage` | `docs/contracts/domain-schemas.md`, `local-storage-migration.md` |
| `1B.3` | `f11563a` | `feat(1B.3): generar manifiestos verificables de TDA (96 archivos, 85+2 ejercicios y parciales)` | `docs/manifests/tda/*.json` (`5` archivos) |
| `1B.4` | `f9a2378` | `test(1B.4): agregar suite QA contractual y casos negativos de Etapa 1B` | `tests/test_etapa1b_manifests_and_contracts.py` |

> **Cierre QA Etapa 1B (`1B.5` — Cerrada):** `python run_tests.py` (`53/53 OK` — `46` de Etapa 1A + `7` de `test_etapa1b_manifests_and_contracts.py`, `0` mutaciones y `0` enlaces locales rotos *case-sensitive*), y auditoría independiente read-only resuelta sin hallazgos críticos ni bloqueantes pendientes. Listo para iniciar la **Etapa 2 (Infraestructura Base Astro + Zod + Vitest)**.
