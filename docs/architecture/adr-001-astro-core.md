# ADR-001: Adopción de Astro Core + TypeScript + Content Collections (Zod) + MDX + Islas React

## Status
Accepted (confirmada en [PLAN_DE_TRABAJO.md](../PLAN_DE_TRABAJO.md), Etapa 1B — 2026-11-21)

## Context
- **Problem:** El sistema actual generado por [build_manual.py](../../builder/build_manual.py) compila HTML monolíticos para un único curso (`TDA`) mediante sustituciones con expresiones regulares en [html_interactive_builder.py](../../builder/html_interactive_builder.py), mantiene dos páginas clave desconectadas del compilador (`index.html` y `teoria-avanzados.html`), renderiza KaTeX únicamente en el navegador en tiempo de ejecución y carece de validación tipada de esquemas y de separación entre plataforma y contenido académico multi-materia.
- **Constraints:**
  - Despliegue 100% estático en GitHub Pages (sin backend, sin base de datos y bajo sub-ruta configurable `base` mediante el helper `withBase()`).
  - Conservación íntegra de los 12 archivos HTML actuales en la raíz durante la transición hasta verificar paridad funcional, visual y rutas de compatibilidad en Etapa 6.
  - Renderizado matemático de alta densidad (LaTeX/KaTeX), diagramas algorítmicos (Mermaid) y widgets interactivos (Entrenador 30s + 5 simuladores de Teoría Avanzada) con cero degradación de rendimiento ni accesibilidad (WCAG 2.1 AA).
  - Toolchain disponible y verificado en el entorno: `Node v22.23.5`, `npm 11.10.0`, `Python 3.13.17`.

## Options Considered
| Option | Pros | Cons | Complexity |
| :--- | :--- | :--- | :--- |
| **Opción A: Astro Core + TypeScript + Content Collections (Zod) + MDX (`remark-math`/`rehype-katex`) + Islas React** | HTML estático de cero JS por defecto (Islands Architecture); validación estricta en build-time vía Zod; KaTeX pre-renderizado en build-time; soporte nativo para rutas con `base` configurable; separación limpia entre componentes de plataforma y colecciones multi-materia; compatibilidad directa con Vitest y Playwright + `@axe-core/playwright`. | Requiere migrar el contenido de `builder/sec*.py` a MDX/YAML y estructurar la configuración inicial en Etapa 2. | Media |
| **Opción B: Extender el builder Python (`build_manual.py`) + HTML/JS vanilla** | Sin cambio de stack inmediato; reutiliza scripts Python actuales. | Fragilidad estructural por parseo regex; sin validación de esquemas ni tipado estático; KaTeX sigue dependiendo de ejecución cliente; acoplamiento creciente de plantillas HTML/JS al agregar nuevas materias. | Baja inicial / Muy alta a mediano plazo |
| **Opción C: SPA React (Vite) o Next.js con export estático** | Ecosistema React uniforme para todo el sitio. | Hidrata páginas estáticas de texto y fórmulas en cliente aumentando el peso del bundle JS; peor SEO/FCP inicial y mayor complejidad para pre-renderizar colecciones académicas puras frente a Astro Content Collections. | Media-Alta |

## Decision
Se adopta **Astro Core** con **TypeScript**, **Content Collections validadas con Zod**, **MDX** con compilación matemática en tiempo de compilación (`remark-math` + `rehype-katex`), **Islas React** únicamente para los módulos interactivos (filtros/progreso, entrenador 30s, simuladores avanzados, visor PDF dual y drawer de fórmulas), y **Vitest + Playwright + `@axe-core/playwright`** como suite de calidad en las etapas posteriores. Toda referencia interna a rutas o assets se resolverá mediante un helper centralizado `withBase()` compatible con la opción `base` de Astro en GitHub Pages.

## Rationale
La plataforma es primordialmente un sitio académico intensivo en lectura técnica (enunciados, demostraciones matemáticas, pseudocódigo, apuntes y materiales PDF) combinado con focos acotados de interactividad. La arquitectura de islas de Astro permite enviar HTML estático pre-renderizado con KaTeX compilado en build-time —eliminando el parpadeo y el costo de `auto-render` en cliente— y aislar el JavaScript de cliente estrictamente en las islas interactivas. Al mismo tiempo, las Content Collections con Zod garantizan en compilación que cada nueva materia incorporada en `src/content/` cumpla los contratos definidos en [domain-schemas.md](../contracts/domain-schemas.md) sin tocar código de plataforma.

## Consequences
- **Positive:**
  - Cero errores silenciosos de formato en ejercicios, recursos o evaluaciones gracias a la validación Zod en build-time.
  - Compilación estática veloz apta para GitHub Pages con soporte robusto de sub-rutas (`base` + `withBase()`).
  - Separación nítida de capas: Plataforma (`src/components/platform/`, `src/layouts/`, `src/styles/`, `src/stores/`) vs. Dominio Académico (`src/content/`, `public/materials/`).
- **Negative:**
  - Introduce un toolchain Node/TypeScript adicional al toolchain Python existente durante la etapa de transición.
  - Los 12 HTML legacy deben coexistir sin regresiones hasta finalizar la migración y validar las redirecciones/rutas de compatibilidad.
- **Mitigation:**
  - Mantener intactos los archivos HTML actuales y [run_tests.py](../../run_tests.py) durante las Etapas 1B–5.
  - Ejecutar la migración de TDA mediante contratos y manifiestos verificables (`docs/manifests/tda/*.json`) validados automáticamente antes de crear los archivos Astro.

## Revisit Trigger
- Si en la Etapa 2 o Etapa 4 alguna limitación de `remark-math`/`rehype-katex` impidiera renderizar expresiones KaTeX válidas presentes en los 85 + 2 ejercicios de TDA o si la generación de cientos de páginas estáticas superara los límites razonables de tiempo/memoria en GitHub Actions.
