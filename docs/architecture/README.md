# Registro de Decisiones de Arquitectura (ADRs)

Este directorio formaliza las decisiones arquitectónicas estructurales para evolucionar `tda-2C2026-material` hacia **Mega Cuaderno Universitario**, una plataforma académica multi-materia estática desplegable en GitHub Pages, conservando Teoría de Algoritmos (TDA — FIUBA, Cátedra Echevarría) como primer módulo académico.

## Índice de Decisiones

| ID | Título | Estado | Fecha | Documento |
| :--- | :--- | :---: | :---: | :--- |
| **ADR-001** | Núcleo arquitectónico basado en Astro Core, Zod, MDX e Islas React | `Accepted` | 2026-11-21 | [adr-001-astro-core.md](adr-001-astro-core.md) |
| **ADR-002** | Layouts Astro propios unificados con Design System WCAG 2.1 AA (Opción A) | `Accepted` | 2026-11-21 | [adr-002-unified-astro-layouts.md](adr-002-unified-astro-layouts.md) |
| **ADR-003** | Modelo de contenido académico multi-materia con procedencia y catálogo preservado | `Accepted` | 2026-11-21 | [adr-003-academic-content-model.md](adr-003-academic-content-model.md) |
| **ADR-004** | Búsqueda estática con Pagefind Node API e indexación de PDFs por página (Opción A) | `Accepted` | 2026-11-21 | [adr-004-pagefind-pdf-indexing.md](adr-004-pagefind-pdf-indexing.md) |

## Documentos Relacionados

- [PLAN_DE_TRABAJO.md](../PLAN_DE_TRABAJO.md) — Plan maestro y hoja de ruta (Etapas 0 a 7).
- [domain-schemas.md](../contracts/domain-schemas.md) — Contratos de esquemas de dominio y mapas de rutas.
- [local-storage-migration.md](../contracts/local-storage-migration.md) — Contrato de almacenamiento local y migración no destructiva desde `tda_*`.
- Manifiestos verificables de TDA: [course.json](../manifests/tda/course.json), [resources.json](../manifests/tda/resources.json), [assessments.json](../manifests/tda/assessments.json), [exercises-index.json](../manifests/tda/exercises-index.json), [interactive-and-notes.json](../manifests/tda/interactive-and-notes.json).
