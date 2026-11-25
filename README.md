# FIUBA Cuadernos — Plataforma Académica Multi-Materia

<p align="center">
  <img src="logo-facultad.png" alt="Facultad de Ingeniería - UBA" width="160" />
</p>

<p align="center">
  <strong>Facultad de Ingeniería — Universidad de Buenos Aires (FIUBA)</strong><br>
  Plataforma académica estática multi-materia construida con <strong>Astro 7 + React 19 + TypeScript + Zod + KaTeX + Mermaid + Pagefind</strong> y diseño accesible <strong>WCAG 2.1 AA</strong> (modo claro y oscuro). Centraliza apuntes teóricos, resúmenes activos, ejercicios resueltos con práctica activa (<em>Active Recall</em>), parciales y visor split-screen de materiales de cátedra.
</p>

<p align="center">
  🌐 <strong>Sitio Online en GitHub Pages:</strong>
  <a href="https://nbrian96.github.io/fiuba-cuadernos/" target="_blank" rel="noopener noreferrer"><strong>https://nbrian96.github.io/fiuba-cuadernos/</strong></a>
</p>

---

## 📚 Materias Incorporadas

| Materia | Código(s) FIUBA | Cátedra | Contenido Interactivo | Materiales Fuente |
| :--- | :--- | :--- | :--- | :--- |
| **Teoría de Algoritmos (`tda`)** | `TB024` / `75.29` / `95.06` | Cátedra Echevarría (2024–2026) | 85 ejercicios oficiales (35 de parciales) + 2 avanzados + 5 simuladores + entrenador de 20 casos + 3 apuntes | 96 archivos (`materias/tda/`) |
| **Redes (`redes`)** | `TA048` | Cátedra Volpi (Ing. Marcelo E. Volpi, Ing. Lucas Giorgi, Ing. Vanesa Llasat) | 38 ejercicios de parcial/integrador + entrenador rápido de 35 preguntas + Programa Analítico + Apunte Teórico Completo y Resumen Activo (Clases 01–12) | 18 presentaciones PDF (`materias/redes/`) |
| **Gestión del Desarrollo de Sistemas Informáticos (`gdsi`)** | `GDSI` | Cátedra Fontdevila (Diego Fontdevila y Juan Gabardini) | Cronograma semanal (17/8–30/11) + 8 apuntes temáticos + Resumen Activo Evaluación 2 (48 preguntas + 48 MC) + entrenador rápido de 24 casos + drawer de fórmulas | Sin archivos PDF fuente |

---

## 🧭 Guía por Materia

### 1. Teoría de Algoritmos (`tda/`)

* 🏠 **Portal de la materia:** `tda/` (Hub de unidades, Entrenador 30s de 20 casos y Árbol de Decisión — ruta legacy compatible `index.html`)
* 💻 **Catálogo Completo:** `tda/ejercicios/` (85 ejercicios oficiales interactivos con filtros por dificultad 1★–5★, unidad y modo de estudio — legacy `todos.html`)
* 📝 **Parciales Oficiales y Checklist:** `tda/parciales/` — **35 ejercicios reales (2024–2026)** + checklist pre-parcial (`tda/docs/checklist-pre-parcial/`, legacy `parciales.html`)
* 🎲 **Paradigmas Avanzados:** `tda/avanzados/` — **2 ejercicios resueltos** (*2-Partition Aproximado* y *N-Reinas Las Vegas*) + **5 simuladores interactivos** (`teoria-avanzados.html`)
* 🧩 **Vistas por Unidad / Paradigma:**
  * 🔷 División y Conquista (`tda/unidad/dyc/`, legacy `dyc.html`) — 13 ejercicios
  * 🔶 Algoritmos Greedy (`tda/unidad/greedy/`, legacy `greedy.html`) — 27 ejercicios
  * 🟣 Backtracking y Branch & Bound (`tda/unidad/backtracking/`, legacy `backtracking.html`) — 15 ejercicios
  * 🟢 Programación Dinámica (`tda/unidad/dp/`, legacy `dp.html`) — 8 ejercicios
  * 🔵 Programación Lineal y PLI (`tda/unidad/pl/`, legacy `pl.html`) — 7 ejercicios
  * 🔴 Redes de Flujo (`tda/unidad/flujo/`, legacy `flujo.html`) — 5 ejercicios
  * 🟡 Reducciones NP-Completas (`tda/unidad/reducciones/`, legacy `reducciones.html`) — 5 ejercicios
  * ⚡ Problemas Integradores y Multi-Paradigma (`tda/unidad/integradores/`, legacy `integradores.html`) — 5 ejercicios
* 📖 **Materiales fuente en [`materias/tda/`](materias/tda/):**
  * [`DIapositivas/`](materias/tda/DIapositivas/): 29 presentaciones PDF (clases `00` a `24`), paquetes de ejemplos (`12 - Lindo/`, `12 - Mochila/`, `12 - Viajante/`) y [`Explicaciones/problema_mochila_y_greedy.md`](materias/tda/DIapositivas/Explicaciones/problema_mochila_y_greedy.md).
  * [`Guia-Ejercicios/`](materias/tda/Guia-Ejercicios/): 10 PDFs (`GuiaDeEjercicios-v1.0.pdf` + guías `01` a `09`).
  * [`Practicas/`](materias/tda/Practicas/): 20 prácticas en Python (1 resuelta y 19 plantillas `TODO` con `assert`), documentadas en [`materias/tda/Practicas/README.md`](materias/tda/Practicas/README.md).
  * [`Parciales/`](materias/tda/Parciales/): 7 exámenes parciales oficiales (2024–2026).
  * [`TP0/`](materias/tda/TP0/): Trabajo Práctico 0 (consignas, entrega autorizada y análisis).

#### Estrategia sugerida para TDA
1. **Plan de Emergencia (48–72 h):** ingresá a `tda/parciales/` o `tda/ejercicios/`, activá **⚡ Modo Emergencia** (ejercicios `🔴 IMPRESCINDIBLE`), practicá con el **Entrenador de 30s** y repasá el drawer de **📐 Fórmulas y Recetas Rápidas**.
2. **Plan Táctico (1 semana):** cambiá a **🎯 Modo Táctico** (`🟡 IMPORTANTES`), resolvé en papel los problemas de PD multidimensional, Redes de Flujo y Branch & Bound, y revisá los integradores (`tda/unidad/integradores/`).
3. **Plan Integral (2+ semanas):** recorré los 85 ejercicios + `tda/avanzados/`, probá las prácticas en Python de [`materias/tda/Practicas/`](materias/tda/Practicas/) y repasá la checklist en `tda/docs/checklist-pre-parcial/`.

---

### 2. Redes (`redes/`)

* 🏠 **Portal de la materia:** `redes/` (Entrenador rápido de 35 preguntas, accesos a apuntes del Primer Parcial, resumen de unidades 1–16 y drawer de fórmulas rápidas)
* 📖 **Apuntes y Resúmenes del Primer Parcial (Clases 01 a 12):**
  * `redes/docs/programa-analitico/` — Programa analítico oficial, correlación de clases y régimen de cursada.
  * `redes/docs/apunte-teorico-primer-parcial/` — **Apunte Teórico Completo (Clases 01 a 12)**: Unidades 1 a 7 (Digitalización/Nyquist/Hamming, Cobre/Fibra/TIA-568/PoE, OSI vs TCP/IP/Ethernet/Switching/Legacy/MPLS, Arquitecturas Modernas/Datacenters/Tiers/Spine & Leaf/IA, Capa 3/IPv4/IPv6/BGP/Tránsito vs Peering, Capa 4/TCP/UDP/QUIC/Capas 5–7, Metodología y 4 Casos de Dimensionamiento), *El Viaje del Bit* y Glosario A–Z.
  * `redes/docs/resumen-activo-primer-parcial/` — **Resumen Activo de Estudio (Clases 01 a 12)**: síntesis rápida por unidad, tablas comparativas, trampas frecuentes de examen, preguntas de comprensión y 35 multiple choice de práctica activa.
* 💻 **Banco de Ejercicios y Parciales:** `redes/ejercicios/` y `redes/parciales/` — **38 ejercicios resueltos** vinculados a sus presentaciones oficiales, con `SolutionDrawer` y seguimiento de dominio en `localStorage` (`mc:v1:redes:*`).
* 📄 **Materiales fuente en [`materias/redes/Presentaciones/`](materias/redes/Presentaciones/):** 18 presentaciones oficiales PDF de la cátedra indexadas en Pagefind y navegables en el visor split-screen (`redes/materiales/`).

---

### 3. Gestión del Desarrollo de Sistemas Informáticos (`gdsi/`)

* 🏠 **Portal de la materia:** `gdsi/` (Unidades temáticas de la cursada, entrenador rápido de 24 casos y drawer de fórmulas rápidas)
* 📅 **Cronograma y Evaluaciones:** `gdsi/docs/cronograma-y-evaluaciones/` — Temas vistos semana a semana (2º cuatrimestre 2026) y alcance detallado de **Evaluación 1 — Producto** y **Evaluación 2 — Proyectos y Procesos**.
* 📖 **Apuntes y Preparación para Evaluación 2 (`gdsi/docs/`):** 8 apuntes temáticos curados con diagramas Mermaid y Active Recall (`proyecto-y-proceso`, `gestion-de-proyectos`, `integracion-y-contrataciones`, `gestion-de-riesgos`, `construccion-de-software-agil`, `team-topologies`, `mejora-y-metricas`, `toyota-kata`) + `preparacion-evaluacion-2` (8 unidades con matrices comparativas, 48 preguntas de desarrollo y 48 Multiple Choice con solucionario).

---

## 🗂️ Estructura del Repositorio

```text
fiuba-cuadernos/
├── .github/workflows/
│   └── deploy-pages.yml      # CI/CD: check, typecheck, Vitest, build Astro y deploy Pages
├── src/                      # Plataforma FIUBA Cuadernos (Astro + React + Zod)
│   ├── components/           # Componentes académicos, simuladores y buscador Pagefind
│   ├── content/              # Manifiestos JSON/YAML, 125 ejercicios y 16 documentos MDX (tda + redes + gdsi)
│   ├── data/                 # Compiladores de cheatsheets y datos de plataforma
│   ├── integrations/         # Publicación en dist/materials/ + Pagefind PDF + redirects legacy
│   ├── layouts/              # Layouts unificados Base, Course y Doc (WCAG 2.1 AA)
│   ├── pages/                # Hub multi-materia y rutas dinámicas [course]/**
│   ├── schemas/              # Esquemas Zod contractuales
│   ├── stores/               # Store local namespaced mc:v1:* con migración tda_*
│   ├── styles/               # Design System CSS sin !important (@layer)
│   └── utils/                # Helpers withBase(), KaTeX estático, filtros, quiz y simuladores
├── materias/                 # Materiales físicos fuente agrupados por materia (<courseId>/)
│   ├── tda/                  # Teoría de Algoritmos (96 archivos: Diapositivas, Guías, Prácticas, Parciales, TP0)
│   └── redes/                # Redes — Cátedra Volpi (18 presentaciones PDF en Presentaciones/)
├── scripts/                  # Build wrapper y verificador dual-base (verify-astro-build.mjs)
├── tests/                    # Suites Vitest (unitarias/integración/enlaces MD) y Playwright E2E + axe-core
├── docs/                     # ADRs, contratos, manifiestos y PLAN_DE_TRABAJO.md
├── .nojekyll                 # Configuración de GitHub Pages para servir assets estáticos
└── logo-facultad.png         # Identidad visual FIUBA
```

---

## 🛠️ Comandos de Desarrollo, Compilación y Verificación

```bash
npm run dev                                              # Servidor local de desarrollo (http://localhost:4321/)
npm run check                                            # Diagnóstico Astro + TypeScript + Content Collections (Zod)
npm run typecheck                                        # Verificación estricta tsc --noEmit
npm test                                                 # Suite unitaria, de esquemas, WCAG CSS y enlaces MD (Vitest)
npm run build                                            # Compilación estática en dist/ + materiales + índice Pagefind PDF
npm run preview                                          # Previsualización local del build compilado (http://localhost:4321/)
npm run verify:build                                     # Verificador de rutas, enlaces internos, materiales, Pagefind y KaTeX
npm run test:e2e                                         # Suite extremo a extremo + WCAG 2.1 AA (Playwright + axe-core)
npm run test:all                                         # Ejecuta la cadena completa (check → typecheck → test → build → verify:build → test:e2e)
```

---

## 🌐 Despliegue en GitHub Pages

1. Ingresá a tu repositorio en GitHub: <a href="https://github.com/nbrian96/fiuba-cuadernos" target="_blank" rel="noopener noreferrer">https://github.com/nbrian96/fiuba-cuadernos</a>.
2. Abrí **Settings** → **Pages**.
3. En **Build and deployment**, seleccioná **Source: `GitHub Actions`**: el workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) ejecuta `check`, `typecheck`, Vitest, compila Astro, publica los materiales, indexa HTML y PDFs con Pagefind y despliega `dist/`.
4. El sitio queda disponible en: <a href="https://nbrian96.github.io/fiuba-cuadernos/" target="_blank" rel="noopener noreferrer"><strong>https://nbrian96.github.io/fiuba-cuadernos/</strong></a>.

---

## 🏛️ Metodología de Trabajo y Cómo Incorporar Nuevas Materias

La plataforma separa el **Núcleo de Plataforma** (`src/layouts/`, `src/components/platform/`, `src/styles/`, `src/stores/`) del **Dominio Académico** (`src/content/` y `materias/<courseId>/`), documentado en [`docs/PLAN_DE_TRABAJO.md`](docs/PLAN_DE_TRABAJO.md) y [`docs/architecture/README.md`](docs/architecture/README.md).

### 1. Reglas Obligatorias
1. **Design System WCAG 2.1 AA sin `!important` ([`ADR-002`](docs/architecture/adr-002-unified-astro-layouts.md)):**
   * Los estilos viven en [`src/styles/tokens.css`](src/styles/tokens.css), [`src/styles/base.css`](src/styles/base.css) y [`src/styles/components.css`](src/styles/components.css) bajo `@layer reset, tokens, base, layouts, components, utilities`.
   * Está **prohibido el uso de `!important`** bajo `src/` (validado por [`tests/vitest/design-system-wcag.test.ts`](tests/vitest/design-system-wcag.test.ts)).
   * Todo componente debe respetar contraste `>= 4.5:1` en texto normal (`>= 3.0:1` en bordes/controles) en tema claro y oscuro.
2. **Trazabilidad académica (`provenance`, [`ADR-003`](docs/architecture/adr-003-academic-content-model.md)):**
   * Todo recurso, evaluación, ejercicio o apunte declara explícitamente su procedencia validada por [`src/schemas/academic.ts`](src/schemas/academic.ts).
   * Las entregas preservadas (como `materias/tda/TP0/`) no deben alterarse en su contenido original.
3. **Compatibilidad dual de `base` (`/` y `/fiuba-cuadernos/`):**
   * Todo enlace interno o asset en `src/` se construye con `withBase()` o `buildMaterialViewerUrl()` de [`src/utils/paths.ts`](src/utils/paths.ts), verificado con `ASTRO_BASE="/"` y `ASTRO_BASE="/fiuba-cuadernos/"`.
4. **Matriz Responsive Obligatoria para QA en Navegador (6 Viewports):**
   * `1920×1080`, `1440×900`, `1280×800`, `768×1024`, `390×844` y `844×390`, con `0` overflow horizontal global, `0` errores JS en consola y `0` respuestas HTTP `>= 400`.

### 2. Incorporar una Nueva Materia (`<courseId>`) Paso a Paso
Agregar una nueva materia (por ejemplo `orga`, `analisis2`, `sisop`) **no requiere modificar componentes de plataforma**:

1. **Ubicar materiales físicos en `materias/<courseId>/`:** organizá PDFs, presentaciones, guías o parciales dentro de `materias/<courseId>/`.
2. **Registrar el manifiesto (`src/content/courses/<courseId>.json`):** respetando `CourseManifestSchema` ([`src/schemas/academic.ts`](src/schemas/academic.ts); plantillas: [`tda.json`](src/content/courses/tda.json) o [`redes.json`](src/content/courses/redes.json)). Opcionalmente, declarando fórmulas rápidas en `src/content/cheatsheets/<courseId>.json`.
3. **Registrar inventario de materiales (`src/content/resources/<courseId>-resources.json`):** `src/integrations/academicBuildIntegration.mjs` copiará los archivos a `dist/materials/<courseId>/...` e indexará el texto de cada página PDF en Pagefind automáticamente.
4. **Registrar evaluaciones y cuestionarios (`src/content/assessments/` y `src/content/quizzes/`):** vinculá parciales/TPs con sus PDFs y ejercicios, y opcionalmente agregá un entrenador rápido en YAML.
5. **Agregar ejercicios y apuntes en MDX (`src/content/exercises/<courseId>/` y `src/content/docs/<courseId>/`):** usá `<AcademicBlock>`, `<SolutionDrawer>` y `<MermaidDiagram>`. Astro generará automáticamente todas las rutas bajo `/<courseId>/**` con progreso aislado en `mc:v1:<courseId>:*`.

---

## 📜 Licencia y Atribución
Material docente, apuntes y ejercicios correspondientes a asignaturas de la **Facultad de Ingeniería de la Universidad de Buenos Aires (FIUBA)** (*Teoría de Algoritmos* — Cátedra Echevarría; *Redes* — Cátedra Volpi).
