# Contrato de Almacenamiento Local (`localStorage`) y Migración desde `tda_*`

Este documento define el contrato del store namespaced `mc:v1:{course}:*` que implementará `src/stores/progressStore.ts` en la Etapa 3, garantizando la preservación transparente del progreso previo de estudiantes en `app.js` y en las 12 páginas HTML actuales.

---

## 1. Inventario Verificado de Claves Legacy (Etapa 1A)

La inspección directa de `app.js` y de los 12 archivos HTML en la raíz confirma exactamente **4 claves legacy**:

| Clave Legacy | Archivos donde se lee/escribe | Tipo y Formato Legacy | Observaciones Verificadas |
| :--- | :--- | :--- | :--- |
| `tda_theme` | Los `12` HTML (`<head>`) y `app.js` | `"dark" \| "light"` (string plano, sin JSON) | Si está ausente, se evalúa `prefers-color-scheme: dark`. |
| `tda_mastered_exercises` | `app.js` (`loadSavedState`, `saveState`) | JSON `number[]` (ej. `[1, 18, 80]`) | Se parsea como enteros válidos `1..85`. |
| `tda_exam_checklist` | `app.js` (`loadSavedState`, `saveState`) | JSON `Record<string, boolean>` | Desde `1A.2`/`1A.6` usa exactamente `11` claves deterministas `chk_<16_hex>`. |
| `tda_study_mode` | `app.js` (`loadSavedState`, `saveState`) | `"emergency" \| "tactical" \| "all"` (string plano) | Valor por defecto si falta o es inválido: `"all"`. |

---

## 2. Esquema Objetivo Namespaced (`mc:v1:*`)

Para soportar múltiples materias sin colisiones ni ambigüedades, todas las claves de plataforma usan el prefijo versionado `mc:v1:`:

| Clave Objetivo | Alcance | Esquema JSON / Valor Exacto |
| :--- | :--- | :--- |
| `mc:v1:global:theme` | Plataforma global | `"dark" \| "light"` (string plano para lectura síncrona sin parpadeo en `<head>`). |
| `mc:v1:{course}:mastered` | Por materia (`tda`) | `{ "version": 1, "updatedAt": "<ISO-8601>", "items": ["tda-ej-01", "tda-ej-18", ...] }` |
| `mc:v1:{course}:checklist` | Por materia (`tda`) | `{ "version": 1, "updatedAt": "<ISO-8601>", "items": { "chk_20c98e6a10164095": true, ... } }` |
| `mc:v1:{course}:study_mode` | Por materia (`tda`) | `{ "version": 1, "updatedAt": "<ISO-8601>", "mode": "emergency" \| "tactical" \| "all" }` |
| `mc:v1:{course}:migrated_from_legacy` | Centinela por materia | `{ "version": 1, "migratedAt": "<ISO-8601>", "sourceKeys": ["tda_theme", "tda_mastered_exercises", "tda_exam_checklist", "tda_study_mode"] }` |

> **Normalización canónica de IDs de ejercicio:** Los ejercicios del catálogo `1..85` utilizan padding de 2 dígitos en los manifiestos (`tda-ej-01`..`tda-ej-85`, ver [exercises-index.json](../manifests/tda/exercises-index.json)). La conversión desde un entero legacy `n` es `toCatalogExerciseId("tda", n) = "tda-ej-" + String(n).padStart(2, "0")`. Si durante la lectura de `items` se detectara un ID histórico sin padding (`tda-ej-1`), el store lo normaliza automáticamente a `tda-ej-01`.

---

## 3. Reglas y Algoritmo de Migración Automática

La migración se ejecuta al inicializar `progressStore` cuando `course === "tda"`:

1. **No destructiva durante la transición:** Las claves legacy `tda_*` **NO se eliminan** ni se sobreescriben al migrar, permitiendo que el estudiante o los tests puedan alternar entre los HTML legacy y la nueva aplicación Astro mientras coexistan (Etapas 3–6).
2. **Idempotente y no invasiva:**
   - Si existe `mc:v1:tda:migrated_from_legacy` válido, la migración automática se omite.
   - Si una clave destino específica (`mc:v1:global:theme`, `mc:v1:tda:mastered`, `mc:v1:tda:checklist` o `mc:v1:tda:study_mode`) **ya existe y es válida**, **nunca se sobrescribe** con datos legacy.
3. **Validación y sanitización estricta de entrada:**
   - `tda_theme`: aceptar únicamente `"dark"` o `"light"`. Cualquier otro valor se ignora.
   - `tda_mastered_exercises`: parsear JSON; exigir `Array.isArray(parsed)`; aceptar enteros finitos `1 <= n <= 85`; descartar `NaN`, strings no numéricos, duplicados y números fuera de rango (`0`, `-1`, `86`, `999`); ordenar y deduplicar como `tda-ej-01`..`tda-ej-85`.
   - `tda_exam_checklist`: parsear JSON; exigir objeto plano no nulo ni arreglo; conservar únicamente claves con formato `^chk_[0-9a-f]{16}$` (descartando claves huérfanas de builds antiguos previas a `1A.2` o valores no booleanos `typeof v === "boolean"`).
   - `tda_study_mode`: aceptar únicamente `"emergency"`, `"tactical"` o `"all"`.
4. **Resiliencia ante errores del navegador:**
   - Todo acceso a `window.localStorage` debe ir envuelto en `try / catch`.
   - Ante `JSON.parse` inválido en una clave legacy, descartar solo esa clave sin abortar la migración de las restantes.
   - Ante `SecurityError` (cookies/almacenamiento bloqueado) o `QuotaExceededError`, degradar limpiamente a un store en memoria (`Map`) durante la sesión activa sin arrojar excepciones no capturadas.
   - Si al menos una clave legacy válida estuvo presente o tras completar la inspección sin error fatal de almacenamiento, persistir `mc:v1:tda:migrated_from_legacy`.

---

## 4. Referencia de Mapeo de los 11 IDs de Checklist Deterministas

Generados por `generate_checklist_id()` en `html_interactive_builder.py` sobre `sec11_errores_checklist.py` y registrados en [interactive-and-notes.json](../manifests/tda/interactive-and-notes.json):

| # | Sección | ID Determinista (`chk_<16_hex>`) |
| :---: | :--- | :--- |
| 1 | `a-dominio-de-paradigmas` | `chk_20c98e6a10164095` |
| 2 | `a-dominio-de-paradigmas` | `chk_f7089519b0cf032b` |
| 3 | `a-dominio-de-paradigmas` | `chk_b743378bc55f2a4b` |
| 4 | `a-dominio-de-paradigmas` | `chk_7e96a32326ff7174` |
| 5 | `a-dominio-de-paradigmas` | `chk_cf0c59e664a587a4` |
| 6 | `a-dominio-de-paradigmas` | `chk_54b1d771e6be75c7` |
| 7 | `a-dominio-de-paradigmas` | `chk_17b2a08ad97bf6d8` |
| 8 | `b-ejecucion-en-la-hoja-de-examen` | `chk_68326103099698d2` |
| 9 | `b-ejecucion-en-la-hoja-de-examen` | `chk_3e78b73d8c6186db` |
| 10 | `b-ejecucion-en-la-hoja-de-examen` | `chk_e84d5070e0ec98bd` |
| 11 | `b-ejecucion-en-la-hoja-de-examen` | `chk_f01031adb7187ba6` |

---

## 5. Matriz de Casos de Borde Contractuales (para Vitest en Etapa 3)

| Caso | Entrada en `localStorage` | Comportamiento Esperado |
| :--- | :--- | :--- |
| Migración limpia desde `tda_*` | `tda_theme="dark"`, `tda_mastered_exercises="[1, 18, 80]"`, `tda_study_mode="emergency"` | Crea `mc:v1:global:theme="dark"`, `mc:v1:tda:mastered` con `["tda-ej-01","tda-ej-18","tda-ej-80"]`, `mc:v1:tda:study_mode` `"emergency"`, y centinela `migrated_from_legacy`; conserva intactas las claves `tda_*`. |
| Idempotencia con datos `mc:v1` previos | Existe `mc:v1:tda:mastered` con `["tda-ej-05"]` y además `tda_mastered_exercises="[1]"` | NO sobrescribe `mc:v1:tda:mastered`; conserva `["tda-ej-05"]`. |
| JSON corrupto en una clave | `tda_mastered_exercises="{roto"`, `tda_study_mode="tactical"` | Descarta `tda_mastered_exercises` (`items: []`), migra `study_mode: "tactical"`, sin excepciones. |
| Números fuera de rango / duplicados | `tda_mastered_exercises="[0, -5, 1, 1, 85, 86, \"x\"]"` | Filtra dejando exactamente `["tda-ej-01", "tda-ej-85"]`. |
| IDs de checklist antiguos pre-1A.2 | `tda_exam_checklist='{"chk_12345":true,"chk_20c98e6a10164095":true,"bad":"yes"}'` | Conserva únicamente `{"chk_20c98e6a10164095": true}` (`^chk_[0-9a-f]{16}$` + booleano). |
| `localStorage` inaccesible (`SecurityError`) | `getItem`/`setItem` arrojan `DOMException` | Opera con estado en memoria sin romper renderizado ni interactividad. |
| Aislamiento multi-materia | Carga de una segunda materia (`course="algo2"`) | Nunca lee ni migra claves `tda_*` hacia `mc:v1:algo2:*`. |
