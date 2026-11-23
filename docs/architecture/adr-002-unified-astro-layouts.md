# ADR-002: Layouts Astro Propios Unificados con Design System WCAG 2.1 AA (Opción A)

## Status
Accepted (Opción A aprobada explícitamente en [PLAN_DE_TRABAJO.md](../PLAN_DE_TRABAJO.md), Sección 2.1 — 2026-11-21)

## Context
- **Problem:** La interfaz actual arrastra deuda visual y estructural documentada en la Etapa 0: `styles.css` creció a más de 4,500 líneas con overrides por especificidad y uso de `!important`, mientras que `teoria-avanzados.html` define un bloque `<style>` embebido propio y `index.html` mantiene maquetación manual independiente. Al evolucionar hacia una plataforma multi-materia que incluye Hub de Carrera, Dashboard de Materia, Listados de Ejercicios, Simuladores, Visor de Materiales PDF y Apuntes (`/docs/`), debe definirse si la sección de apuntes usará Starlight o un sistema unificado de layouts propios.
- **Constraints:**
  - Cumplimiento estricto de contraste **WCAG 2.1 AA** ($\ge 4.5:1$ en texto normal y botones/badges, $\ge 3.0:1$ en anillos `:focus-visible` y componentes UI grandes) tanto en modo claro como oscuro.
  - Navegación global coherente entre materias, barra de contexto de ejercicios, drawer de fórmulas rápidas y persistencia de tema unificada (`mc:v1:global:theme`).
  - Eliminación de `!important` para evitar regresiones de cascada como la detectada en la Etapa 1A entre `body.dark-mode a` y `.btn-warning`.

## Options Considered
| Option | Pros | Cons | Complexity |
| :--- | :--- | :--- | :--- |
| **Opción A (Aprobada): Layouts Astro propios unificados y único Design System WCAG 2.1 AA sin `!important`** | Identidad visual, navbar, drawer de fórmulas, buscador Pagefind y toggle Light/Dark 100% unificados en toda la plataforma (Hub, Dashboard, Ejercicios, Simuladores, Materiales y `/docs/`); arquitectura multi-materia nativa sin forzar la estructura de rutas de documentación de Starlight; cero conflictos de CSS de terceros (sin Bootstrap ni estilos Starlight). | Requiere construir desde cero los layouts base (`BaseLayout`, `CourseLayout`, `DocLayout`) y los tokens CSS propios en Etapa 3. | Media |
| **Opción B: Acoplar `@astrojs/starlight` para `/docs/` + Layouts Astro propios para el resto** | Provee sidebar y navegación de documentación out-of-the-box para apuntes. | Genera dos sistemas de diseño distintos (tokens CSS de Starlight vs. tokens propios), doble navbar o adaptación frágil del header global, doble manejo de tema en `localStorage` y fricción para encapsular múltiples materias bajo un mismo Hub. | Media-Alta (en integración y mantenimiento visual) |

## Decision
Se adopta la **Opción A**: construir **Layouts Astro propios unificados** para todas las vistas de la plataforma (Hub de Carrera, Dashboard de Materia, Vistas de Ejercicios y Parciales, Simuladores Avanzados, Visor Dual de Materiales PDF y Apuntes `/{course}/docs/...`), respaldados por un único Design System con tokens semánticos CSS (Light/Dark) conformes a WCAG 2.1 AA y **sin uso de `!important`**, descartando expresamente acoplar Starlight.

## Rationale
En una plataforma académica unificada, el estudiante salta continuamente entre un apunte teórico (por ejemplo, algoritmos de aproximación o mochilas), un ejercicio de parcial, el drawer de fórmulas y un PDF de clase o guía. Mantener un único conjunto de layouts, tokens cromáticos, atajos de teclado (`/`, `Ctrl+K`, `Escape`) y componentes MDX (`AcademicBlock`, `ExerciseCard`, `SolutionDrawer`, `PdfSplitViewer`) elimina cualquier quiebre de experiencia y asegura que la verificación automatizada de accesibilidad (`@axe-core/playwright`) audite un solo sistema de estilos predecible.

## Consequences
- **Positive:**
  - Consistencia total de UI/UX, navegación y contraste WCAG 2.1 AA en el 100% de las rutas de la plataforma.
  - Reducción sustancial de CSS heredado respecto a los estilos Bootstrap + overrides acumulados en `styles.css`.
  - Extensibilidad multi-materia transparente: cualquier nueva materia hereda el mismo `CourseLayout` y `DocLayout` sin duplicar hojas de estilo.
- **Negative:**
  - Componentes habituales de documentación (índice lateral de encabezados en apuntes, navegación anterior/siguiente entre secciones de apunte) deben implementarse explícitamente como componentes Astro ligeros.
- **Mitigation:**
  - Definir contratos explícitos de `DocFrontmatter` y bloques MDX desde esta Etapa 1B en [domain-schemas.md](../contracts/domain-schemas.md).
  - Validar contraste, foco por teclado y responsive (Desktop, Mobile Portrait y Mobile Landscape) con Playwright y `@axe-core/playwright` en la Etapa 5.

## Revisit Trigger
- Si en la incorporación de futuras materias surgieran necesidades masivas de documentación versionada multi-idioma o API docs complejas que justificaran evaluar un motor separado bajo subdominio.
