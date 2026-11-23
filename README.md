# Teoría de Algoritmos — Material de Cátedra (2C 2026)

<p align="center">
  <img src="logo-facultad.png" alt="Facultad de Ingeniería - UBA" width="160" />
</p>

<p align="center">
  <strong>Facultad de Ingeniería — Universidad de Buenos Aires (FIUBA)</strong><br>
  Repositorio centralizado de material de estudio, clases teóricas, guías prácticas, trabajos prácticos, exámenes parciales y <strong>Guía Interactiva Modular de Resolución de Parciales (85 Ejercicios oficiales + 2 avanzados y 5 simuladores)</strong> de la materia <em>Teoría de Algoritmos</em> (Segundo Cuatrimestre 2026).
</p>

---

## ⚡ Guía Interactiva de Parciales ("Salvando el Cuatrimestre" — 85 Ejercicios)

Para preparar el examen parcial de forma intensiva, la plataforma **FIUBA Cuadernos** (construida con **Astro + React + Pagefind** y diseño accesible WCAG 2.1 AA) incluye práctica activa (*Active Recall*), filtrado por paradigma y **graduación de dificultad de 1★ a 5★**:

* 🌐 **Guía Online en GitHub Pages:** <a href="https://nbrian96.github.io/fiuba-cuadernos/" target="_blank" rel="noopener noreferrer"><strong>https://nbrian96.github.io/fiuba-cuadernos/</strong></a>
* 🏠 **Portal Principal:** `tda/` (Hub de módulos, Entrenador 30s de 20 casos y Árbol de Decisión — ruta legacy compatible `index.html`)
* 💻 **Catálogo Completo:** `tda/ejercicios/` (85 ejercicios oficiales interactivos — ruta legacy compatible `todos.html`)
* 📝 **Exámenes Parciales Oficiales y Checklist:** `tda/parciales/` — **35 ejercicios reales (2024–2026)** ordenados por dificultad + checklist pre-parcial (`parciales.html`)
* 🎲 **Paradigmas Avanzados:** `tda/avanzados/` — **2 ejercicios resueltos diferenciados** (*2-Partition Aproximado* y *N-Reinas Las Vegas*) + **5 simuladores interactivos** (`teoria-avanzados.html`)
* 🧩 **Vistas Modulares por Paradigma:**
  * 🔷 División y Conquista (`tda/unidad/dyc/`, legacy `dyc.html`) — 13 ejercicios
  * 🔶 Algoritmos Greedy (`tda/unidad/greedy/`, legacy `greedy.html`) — 27 ejercicios
  * 🟣 Backtracking y Branch & Bound (`tda/unidad/backtracking/`, legacy `backtracking.html`) — 15 ejercicios
  * 🟢 Programación Dinámica (`tda/unidad/dp/`, legacy `dp.html`) — 8 ejercicios
  * 🔵 Programación Lineal y PLI (`tda/unidad/pl/`, legacy `pl.html`) — 7 ejercicios
  * 🔴 Redes de Flujo (`tda/unidad/flujo/`, legacy `flujo.html`) — 5 ejercicios
  * 🟡 Reducciones NP-Completas (`tda/unidad/reducciones/`, legacy `reducciones.html`) — 5 ejercicios
  * ⚡ Problemas Integradores y Multi-Paradigma (`tda/unidad/integradores/`, legacy `integradores.html`) — 5 ejercicios

### 🎯 Cómo estudiar con la Guía según tus días disponibles

#### 1. Plan de Emergencia (48 a 72 horas antes del examen)
1. Abrí la <a href="https://nbrian96.github.io/fiuba-cuadernos/" target="_blank" rel="noopener noreferrer">versión online</a> (o `npm run preview` local), ingresá a `tda/parciales/` o `tda/ejercicios/` y activá el botón **⚡ Modo Emergencia**.
2. Esto filtrará automáticamente los **ejercicios clave 🔴 IMPRESCINDIBLE** que salieron literalmente en los parciales recientes (`2024-2`, `2025-1` y `2026-2`) junto con los problemas canónicos de la guía.
3. Usá el **filtro por Dificultad (1★ a 5★)** del HUD superior para avanzar gradualmente desde ejercicios de entrada en calor (`1★` y `2★`) hasta problemas de cierre de examen (`4★` y `5★`).
4. Practicá con el **Entrenador de Reconocimiento en 30 Segundos** (20 casos reales) para distinguir al instante entre Greedy, Programación Dinámica, Backtracking, Programación Lineal o Redes de Flujo.
5. Repasá el drawer de **📐 Fórmulas y Recetas Rápidas** (Teorema Maestro, los 4 pasos de NP-C y los 5 pasos de PD).
6. En cada tarjeta, leé el enunciado e intentá resolverlo en papel **antes de desplegar la solución** (*Active Recall*). Al dominarlo, marcalo como `Dominado` para registrar tu progreso.

#### 2. Plan Táctico (1 semana antes)
1. Completá el Plan de Emergencia y cambiá a **🎯 Modo Táctico** para enfocarte en los ejercicios **🟡 IMPORTANTES** de la Guía Práctica v1.0 y en los que aún tengas pendientes de dominar.
2. Escribí en papel el pseudocódigo y análisis de complejidad de los ejercicios de Programación Dinámica multidimensional, Redes de Flujo y Branch & Bound.
3. Repasá los **Ejercicios Integradores Multi-Paradigma** (`tda/unidad/integradores/`, Ejercicios 78 y 79) para comparar cómo resolver La Mochila y El Viajante (TSP) bajo cada paradigma.

#### 3. Plan Integral (2 semanas o más)
1. Recorré los **85 ejercicios oficiales** en **📚 Modo Todos** (`tda/ejercicios/`) o navegando pestaña por pestaña en las páginas modulares de cada paradigma, además de los **2 ejercicios avanzados** y **5 simuladores** en `tda/avanzados/`.
2. Probá las implementaciones en Python de la carpeta [`materias/tda/Practicas/`](materias/tda/Practicas/).
3. Verificá la **Checklist de Entrada al Aula** en `tda/docs/checklist-pre-parcial/` antes de rendir.

---

## 🌐 Cómo desplegar la Guía en GitHub Pages

1. Ingresá a tu repositorio en GitHub: <a href="https://github.com/nbrian96/fiuba-cuadernos" target="_blank" rel="noopener noreferrer">https://github.com/nbrian96/fiuba-cuadernos</a>.
2. Hacé clic en **Settings** (⚙️ Configuración) $\to$ sección **Pages**.
3. En **Build and deployment**:
   * **Source:** `GitHub Actions` (el workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) compila Astro, copia los materiales, genera el índice Pagefind y publica `dist/` con rutas de compatibilidad `*.html`).
4. En 1 a 2 minutos tu guía estará publicada en:
   👉 **<a href="https://nbrian96.github.io/fiuba-cuadernos/" target="_blank" rel="noopener noreferrer">https://nbrian96.github.io/fiuba-cuadernos/</a>**

---

## 🗂️ Estructura del Repositorio

```text
fiuba-cuadernos/
├── .github/workflows/
│   └── deploy-pages.yml     # CI/CD: check, typecheck, Vitest, build Astro y deploy Pages
├── src/                     # Plataforma FIUBA Cuadernos (Astro + React + Zod)
│   ├── components/          # Componentes académicos, simuladores y buscador Pagefind
│   ├── content/             # Manifiestos JSON/YAML y 87 ejercicios + 3 apuntes en MDX
│   ├── integrations/        # Publicación de materiales en dist/materials/ + Pagefind PDF + redirects legacy
│   ├── layouts/             # Layouts unificados Base, Course y Doc (WCAG 2.1 AA)
│   ├── pages/               # Hub multi-materia y rutas dinámicas [course]/**
│   ├── schemas/             # Esquemas Zod contractuales
│   ├── stores/              # Store local namespaced mc:v1:* con migración tda_*
│   ├── styles/              # Design System CSS sin !important (@layer)
│   └── utils/               # Helpers de rutas withBase(), KaTeX estático, filtros y simuladores
├── materias/                # Materiales físicos fuente agrupados por materia (<courseId>/)
│   └── tda/                 # Teoría de Algoritmos (96 archivos)
│       ├── DIapositivas/    # 29 presentaciones (00 a 24), ejemplos LINDO/Mochila/Viajante y apuntes
│       ├── Guia-Ejercicios/ # Guías oficiales 01 a 09 y Guía consolidada v1.0
│       ├── Practicas/       # 20 prácticas en Python (1 resuelta + 19 plantillas TODO con asserts)
│       ├── Parciales/       # 7 exámenes parciales oficiales (2024, 2025 y 2026)
│       └── TP0/             # Trabajo Práctico 0: consignas, entrega autorizada y análisis
├── scripts/                 # Scripts de migración MDX, build wrapper y verificador dual-base
├── tests/                   # Suites Vitest, Playwright E2E + axe-core y Python QA
├── docs/                    # ADRs, contratos, manifiestos y PLAN_DE_TRABAJO.md
├── builder/ & assets/       # Generador histórico en Python (validado en aislamiento por run_tests.py)
├── run_tests.py             # Ejecutor unificado Python con verificación de aislamiento
├── .nojekyll                # Configuración de GitHub Pages para servir assets estáticos
└── logo-facultad.png        # Identidad visual FIUBA
```

---

## 📖 Contenido Detallado de Carpetas

### 1. 📂 [materias/tda/DIapositivas/](materias/tda/DIapositivas/)
Presentaciones oficiales de las clases teóricas y prácticas (**29 PDFs, clases `00` a `24`**), complementadas con paquetes de ejemplos y apuntes:
* **00 - 01:** Presentación del curso, introducción y repasos fundamentales.
* **02 - 03c:** División y Conquista, Teorema Maestro y ejemplos de seguimiento.
* **03a, 04:** Algoritmos Greedy (Voraces), demostraciones ("Stays Ahead", intercambio).
* **05 - 07:** Backtracking, árboles de búsqueda, podas por factibilidad/optimalidad y práctica DC-Greedy-BT.
* **08 - 11b:** Programación Dinámica (1D, 2D, reconstrucción de soluciones y práctica).
* **12 - 13:** Programación Lineal y Entera (modelado, variables, restricciones).
* **14 - 16:** Redes de Flujo (Ford-Fulkerson, Edmonds-Karp, corte mínimo, anexo y práctica PL/RF).
* **17 - 19:** Complejidad, Reducciones Polinomiales NP-Completitud y práctica.
* **20:** Clase de Repaso general.
* **21 - 24:** Algoritmos de Aproximación (I y II) y Algoritmos Randomizados (I y II).
* **Subcarpetas temáticas y apuntes:** `12 - Lindo/` (4 archivos), `12 - Mochila/` (6 archivos), `12 - Viajante/` (12 archivos) y [`Explicaciones/problema_mochila_y_greedy.md`](materias/tda/DIapositivas/Explicaciones/problema_mochila_y_greedy.md).

---

### 2. 📂 [materias/tda/Guia-Ejercicios/](materias/tda/Guia-Ejercicios/)
Guías oficiales publicadas por la cátedra para el cuatrimestre (10 PDFs):
* `GuiaDeEjercicios-v1.0.pdf` *(Guía consolidada Curso Echevarría — D&C, Greedy y Backtracking, íntegramente resuelta en la plataforma interactiva)*
* `01_division_y_conquista.pdf`
* `02_greedy.pdf`
* `03_backtracking.pdf`
* `04_programacion_dinamica.pdf`
* `05_programacion_lineal.pdf`
* `06_redes_de_flujo.pdf`
* `07_reducciones_np.pdf`
* `08_algoritmos_aproximados.pdf`
* `09_algoritmos_randomizados.pdf`

---

### 3. 📂 [materias/tda/Practicas/](materias/tda/Practicas/)
Suite de **20 prácticas de programación en Python** (**1 resuelta:** `01_division_y_conquista/ej02_primer_cero_tests.py`, y **19 plantillas `TODO` con pruebas `assert`**), documentadas en [`materias/tda/Practicas/README.md`](materias/tda/Practicas/README.md):
* **01_division_y_conquista:** `primer_cero`, `arreglo_pico`, `elemento_mayoritario`, `bolzano_biseccion`.
* **02_greedy:** `seleccion_charlas`, `mochila_fraccionaria`, `minimizar_latencia`, `antenas_ruta`.
* **03_backtracking:** `coloreo_grafos`, `n_reinas`, `independent_set_maximo`, `subset_sum`.
* **04_programacion_dinamica:** `interval_scheduling_ponderado`, `juan_el_vago`, `mochila_01`, `cambio_monedas`.
* **05_programacion_lineal:** `mochila_pl`, `juan_el_vago_pl`, `vertex_cover_pl`, `dos_particiones_min_max_pl`.

---

### 4. 📂 [materias/tda/Parciales/](materias/tda/Parciales/)
**7 exámenes parciales** tomados en fechas recientes (los 35 ejercicios están resueltos paso a paso en `tda/parciales/` y `parciales.html`):
* `TP-2024-2-1.pdf`, `TP-2024-2-2.pdf`, `TP-2024-2-3.pdf`
* `TP-2025-1-1.pdf`, `TP-2025-1-2.pdf`
* `TP-2026-2-1.pdf` *(6 ejercicios resueltos)*
* `TP-2026-2-2.pdf` *(6 ejercicios resueltos)*

---

### 5. 📂 [materias/tda/TP0/](materias/tda/TP0/)
Primer trabajo práctico de la materia (6 archivos):
* `TP00-2026-2c.pdf`, `checklist.pdf`, `cuartetos.py`, `cuartetos_malo.py`, `grafico_tiempos.png` y `TP0_Nelson_Avila_100244.pdf`.

---

## 🛠️ Cómo compilar y validar la plataforma interactiva

La plataforma principal se compila con **Astro + Vite + Pagefind**:

```bash
npm run dev      # Servidor de desarrollo local (http://localhost:4321/)
npm run build    # Compilación estática en dist/ + copia de materiales + índice Pagefind PDF
npm test         # Suite unitaria y de integración (Vitest)
npm run test:e2e # Suite extremo a extremo + WCAG 2.1 AA (Playwright)
```

---

## 🏛️ Metodología de Trabajo y Cómo Incorporar Nuevas Materias (Plataforma Astro Multi-Materia)

El repositorio evoluciona hacia **FIUBA Cuadernos**, una plataforma académica estática multi-materia construida con **Astro 7 + React 19 + TypeScript + Zod + KaTeX + Mermaid + Pagefind** (documentada en [`docs/PLAN_DE_TRABAJO.md`](docs/PLAN_DE_TRABAJO.md) y [`docs/architecture/README.md`](docs/architecture/README.md)).

### 1. Comandos de Desarrollo y Verificación

```bash
npm run dev                                              # Servidor local de desarrollo (http://localhost:4321/)
npm run check                                            # Diagnóstico Astro + TypeScript + Content Collections (Zod)
npm run typecheck                                        # Verificación estricta tsc --noEmit
npm test                                                 # Suite unitaria y de integración con Vitest
npm run build                                            # Compilación estática en dist/ + copia de materiales + índice Pagefind PDF
npm run preview                                          # Previsualización local del build compilado (http://localhost:4321/)
node scripts/verify-astro-build.mjs --base=/             # Verificador de rutas, enlaces internos, materiales, Pagefind y KaTeX
python run_tests.py                                      # Suite Python de paridad legacy, enlaces case-sensitive e integridad
```

### 2. Reglas Obligatorias de Metodología de Trabajo

1. **Desarrollo por etapas y commits atómicos:** Todo cambio sigue la hoja de ruta de [`docs/PLAN_DE_TRABAJO.md`](docs/PLAN_DE_TRABAJO.md). Ninguna etapa se cierra sin pasar todas las verificaciones automatizadas, QA en navegador real y una auditoría independiente.
2. **Design System WCAG 2.1 AA sin `!important` ([`ADR-002`](docs/architecture/adr-002-unified-astro-layouts.md)):**
   * Los estilos viven en [`src/styles/tokens.css`](src/styles/tokens.css), [`src/styles/base.css`](src/styles/base.css) y [`src/styles/components.css`](src/styles/components.css) bajo cascada declarativa `@layer reset, tokens, base, layouts, components, utilities`.
   * Está **prohibido el uso de `!important`** bajo `src/` (validado automáticamente por [`tests/vitest/design-system-wcag.test.ts`](tests/vitest/design-system-wcag.test.ts)).
   * Todo componente debe respetar un contraste mínimo `>= 4.5:1` en texto normal (`>= 3.0:1` en bordes/controles activos) tanto en tema claro como oscuro (`data-theme="light" | "dark"`).
3. **Trazabilidad y procedencia académica (`provenance`, [`ADR-003`](docs/architecture/adr-003-academic-content-model.md)):**
   * Todo recurso, evaluación, ejercicio o apunte debe declarar explícitamente su procedencia validada por [`src/schemas/academic.ts`](src/schemas/academic.ts): `official_source`, `reconstructed_exam_statement`, `elaborated_submission`, `exam_prep_and_practice`, `elaborated_notes`, `elaborated_summary`, `elaborated_solution`, `advanced_theory_example` o `interactive_widget`.
   * Las entregas preservadas (como `TP0/`) no deben alterarse en su contenido original.
4. **Compatibilidad dual de `base` (`/` y `/<repo>/`):**
   * Todo enlace interno o carga de assets dentro de `src/` debe construirse mediante `withBase()` o `buildMaterialViewerUrl()` de [`src/utils/paths.ts`](src/utils/paths.ts), y verificarse compilando con `ASTRO_BASE="/"` y `ASTRO_BASE="/fiuba-cuadernos/"`.
5. **Matriz Responsive Obligatoria para QA de UI en Navegador (6 Viewports):**
   * Todo cambio visual o de layout debe validarse en navegador real sobre estos **6 viewports**:
     * **Desktop Full HD:** `1920×1080`
     * **Desktop Wide:** `1440×900`
     * **Desktop Laptop:** `1280×800`
     * **Tablet:** `768×1024`
     * **Mobile Vertical (Portrait):** `390×844`
     * **Mobile Horizontal (Landscape):** `844×390`
   * Criterios de aceptación en los 6 viewports: `0` overflow horizontal global (`document.documentElement.scrollWidth <= window.innerWidth`), aprovechamiento completo del ancho útil del panel en ejercicios/apuntes (`.prose-academic` al 100% del panel), tablas anchas con scroll horizontal interno, `0` errores JS en consola y `0` respuestas HTTP `>= 400`.

### 3. Cómo Incorporar una Nueva Materia (`<courseId>`) Paso a Paso

La arquitectura separa la **Plataforma** (`src/layouts/`, `src/components/platform/`, `src/styles/`, `src/stores/`) del **Dominio Académico** (`src/content/` y carpetas de materiales). Agregar una nueva materia (por ejemplo `algo2`, `orga`, `analisis2`) **no requiere modificar componentes de plataforma**:

1. **Paso 1 — Ubicar los materiales físicos en `materias/<courseId>/`:**
   * Colocá los PDFs, diapositivas, guías, parciales y prácticas de la materia dentro de su propia subcarpeta bajo `materias/`: `materias/<courseId>/DIapositivas/`, `materias/<courseId>/Guia-Ejercicios/`, `materias/<courseId>/Parciales/`, `materias/<courseId>/Practicas/`, etc.
   * *(En TDA)*: las carpetas fuente viven bajo `materias/tda/` (`materias/tda/DIapositivas/`, `materias/tda/Guia-Ejercicios/`, `materias/tda/Parciales/`, `materias/tda/Practicas/` y `materias/tda/TP0/`), manteniendo limpia la raíz del repositorio.
2. **Paso 2 — Registrar el manifiesto de la materia (`src/content/courses/<courseId>.json`):**
   * Creá `src/content/courses/<courseId>.json` respetando `CourseManifestSchema` ([`src/schemas/academic.ts`](src/schemas/academic.ts), tomando como plantilla [`src/content/courses/tda.json`](src/content/courses/tda.json)): definí `schemaVersion`, `id`, `title`, `shortTitle`, `institution`, `codes`, `chair`, la lista `units` (`slug`, `name`, `order`, `exerciseCount`, `inCatalog`) y `stats` (`views`, `legacyRoutes` y `legacyStorageKeys` son opcionales para materias nuevas).
   * Opcionalmente, podés declarar un resumen de fórmulas rápidas en `src/content/cheatsheets/<courseId>.json` (`CheatsheetManifestSchema`) sin tocar código de plataforma.
3. **Paso 3 — Registrar el inventario de materiales (`src/content/resources/<courseId>-resources.json`):**
   * Creá `src/content/resources/<courseId>-resources.json` según `ResourceManifestSchema` (plantilla: [`src/content/resources/tda-resources.json`](src/content/resources/tda-resources.json)).
   * Durante `npm run build`, [`src/integrations/academicBuildIntegration.mjs`](src/integrations/academicBuildIntegration.mjs) copiará automáticamente todos los archivos declarados hacia `dist/materials/<courseId>/...` y [`src/utils/pagefindPdfIndexer.mjs`](src/utils/pagefindPdfIndexer.mjs) extraerá e indexará el texto de cada página PDF en **Pagefind** con enlaces directos al visor split-screen (`/<courseId>/materiales/<resourceId>/?page=N`).
4. **Paso 4 — Registrar evaluaciones y cuestionarios (`src/content/assessments/` y `src/content/quizzes/`):**
   * Creá `src/content/assessments/<courseId>.json` (`AssessmentManifestSchema`, plantilla: [`src/content/assessments/tda.json`](src/content/assessments/tda.json)) para vincular parciales reales y trabajos prácticos con sus PDFs y ejercicios resueltos.
   * Opcionalmente, agregá un entrenador de reconocimiento rápido en `src/content/quizzes/<courseId>-entrenador.yaml` (`QuizManifestSchema`, plantilla: [`src/content/quizzes/tda-entrenador-30s.yaml`](src/content/quizzes/tda-entrenador-30s.yaml)).
5. **Paso 5 — Agregar ejercicios y apuntes en MDX (`src/content/exercises/<courseId>/` y `src/content/docs/<courseId>/`):**
   * Creá los ejercicios en `src/content/exercises/<courseId>/<unitSlug>/*.mdx` (`ExerciseFrontmatterSchema`) usando `<AcademicBlock kind="statement">`, `<SolutionDrawer client:load exerciseId="...">` y `<MermaidDiagram client:visible code={...} />` (ejemplo: [`src/content/exercises/tda/greedy/ej-18-ruta-transporte.mdx`](src/content/exercises/tda/greedy/ej-18-ruta-transporte.mdx)).
   * Creá los apuntes o resúmenes en `src/content/docs/<courseId>/*.mdx` (`DocFrontmatterSchema`, ejemplo: [`src/content/docs/tda/matriz-parciales.mdx`](src/content/docs/tda/matriz-parciales.mdx)).
   * Astro generará automáticamente las páginas de la nueva materia en `/`, `/<courseId>/`, `/<courseId>/ejercicios/`, `/<courseId>/ejercicios/<id>/`, `/<courseId>/unidad/<unit>/`, `/<courseId>/parciales/`, `/<courseId>/materiales/`, `/<courseId>/materiales/<resourceId>/` y `/<courseId>/docs/<docId>/`, aislando su progreso en `localStorage` bajo `mc:v1:<courseId>:*`.

---

## 📜 Licencia y Atribución
Material docente y práctico correspondiente a la cátedra de **Teoría de Algoritmos** de la **Facultad de Ingeniería de la Universidad de Buenos Aires (FIUBA)**.
