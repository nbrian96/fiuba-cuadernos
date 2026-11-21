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

Para preparar el examen parcial de forma intensiva, el repositorio incluye una **aplicación web modular con Bootstrap 5.3** orientada a la práctica activa (*Active Recall*), filtrado por paradigma y **graduación de dificultad de 1★ a 5★**:

* 🌐 **Guía Online en GitHub Pages:** <a href="https://nbrian96.github.io/tda-2C2026-material/" target="_blank" rel="noopener noreferrer"><strong>https://nbrian96.github.io/tda-2C2026-material/</strong></a>
* 🏠 **Portal Principal:** [index.html](index.html) (Hub de módulos, Entrenador 30s de 20 casos y Árbol de Decisión)
* 💻 **Catálogo Completo Local:** [todos.html](todos.html) (85 ejercicios oficiales interactivos)
* 📝 **Exámenes Parciales Oficiales y Checklist:** [parciales.html](parciales.html) — **35 ejercicios reales (2024–2026)** ordenados por dificultad + checklist pre-parcial
* 🎲 **Paradigmas Avanzados:** [teoria-avanzados.html](teoria-avanzados.html) — **2 ejercicios resueltos diferenciados** (*2-Partition Aproximado* y *N-Reinas Las Vegas*) + **5 simuladores interactivos**
* 🧩 **Vistas Modulares por Paradigma:**
  * 🔷 [División y Conquista (`dyc.html`)](dyc.html) — 13 ejercicios
  * 🔶 [Algoritmos Greedy (`greedy.html`)](greedy.html) — 27 ejercicios
  * 🟣 [Backtracking y Branch & Bound (`backtracking.html`)](backtracking.html) — 15 ejercicios
  * 🟢 [Programación Dinámica (`dp.html`)](dp.html) — 8 ejercicios
  * 🔵 [Programación Lineal y PLI (`pl.html`)](pl.html) — 7 ejercicios
  * 🔴 [Redes de Flujo (`flujo.html`)](flujo.html) — 5 ejercicios
  * 🟡 [Reducciones NP-Completas (`reducciones.html`)](reducciones.html) — 5 ejercicios
  * ⚡ [Problemas Integradores y Multi-Paradigma (`integradores.html`)](integradores.html) — 5 ejercicios

### 🎯 Cómo estudiar con la Guía según tus días disponibles

#### 1. Plan de Emergencia (48 a 72 horas antes del examen)
1. Abrí [index.html](index.html) (o la <a href="https://nbrian96.github.io/tda-2C2026-material/" target="_blank" rel="noopener noreferrer">versión online</a>), ingresá a [parciales.html](parciales.html) o [todos.html](todos.html) y activá el botón **⚡ Modo Emergencia**.
2. Esto filtrará automáticamente los **ejercicios clave 🔴 IMPRESCINDIBLE** que salieron literalmente en los parciales recientes (`2024-2`, `2025-1` y `2026-2`) junto con los problemas canónicos de la guía.
3. Usá el **filtro por Dificultad (1★ a 5★)** del HUD superior para avanzar gradualmente desde ejercicios de entrada en calor (`1★` y `2★`) hasta problemas de cierre de examen (`4★` y `5★`).
4. Practicá con el **Entrenador de Reconocimiento en 30 Segundos** (20 casos reales) para distinguir al instante entre Greedy, Programación Dinámica, Backtracking, Programación Lineal o Redes de Flujo.
5. Repasá el drawer de **📐 Fórmulas y Recetas Rápidas** (Teorema Maestro, los 4 pasos de NP-C y los 5 pasos de PD).
6. En cada tarjeta, leé el enunciado e intentá resolverlo en papel **antes de desplegar la solución** (*Active Recall*). Al dominarlo, marcalo como `Dominado` para registrar tu progreso.

#### 2. Plan Táctico (1 semana antes)
1. Completá el Plan de Emergencia y cambiá a **🎯 Modo Táctico** para enfocarte en los ejercicios **🟡 IMPORTANTES** de la Guía Práctica v1.0 y en los que aún tengas pendientes de dominar.
2. Escribí en papel el pseudocódigo y análisis de complejidad de los ejercicios de Programación Dinámica multidimensional, Redes de Flujo y Branch & Bound.
3. Repasá los **Ejercicios Integradores Multi-Paradigma** ([`integradores.html`](integradores.html), Ejercicios 78 y 79) para comparar cómo resolver La Mochila y El Viajante (TSP) bajo cada paradigma.

#### 3. Plan Integral (2 semanas o más)
1. Recorré los **85 ejercicios oficiales** en **📚 Modo Todos** ([`todos.html`](todos.html)) o navegando pestaña por pestaña en las páginas modulares de cada paradigma, además de los **2 ejercicios avanzados** y **5 simuladores** en [`teoria-avanzados.html`](teoria-avanzados.html).
2. Probá las implementaciones en Python de la carpeta [`Practicas/`](Practicas/).
3. Verificá la **Checklist de Entrada al Aula** en [`parciales.html`](parciales.html) antes de rendir.

---

## 🌐 Cómo desplegar la Guía en GitHub Pages

1. Ingresá a tu repositorio en GitHub: <a href="https://github.com/nbrian96/tda-2C2026-material" target="_blank" rel="noopener noreferrer">https://github.com/nbrian96/tda-2C2026-material</a>.
2. Hacé clic en **Settings** (⚙️ Configuración) $\to$ sección **Pages**.
3. En **Build and deployment**:
   * **Source:** `Deploy from a branch`.
   * **Branch:** `master` (o `main`) y carpeta `/ (root)`.
   * Hacé clic en **Save**.
4. En 1 a 2 minutos tu guía estará publicada en:
   👉 **<a href="https://nbrian96.github.io/tda-2C2026-material/" target="_blank" rel="noopener noreferrer">https://nbrian96.github.io/tda-2C2026-material/</a>**

---

## 🗂️ Estructura del Repositorio

```text
tda-2C2026-material/
├── index.html               # Portal Hub, Entrenador 30s (20 casos) y Árbol de Decisión
├── todos.html               # Catálogo interactivo completo (85 ejercicios oficiales)
├── dyc.html                 # Vista modular: División y Conquista (13 ejercicios)
├── greedy.html              # Vista modular: Algoritmos Greedy (27 ejercicios)
├── backtracking.html        # Vista modular: Backtracking y B&B (15 ejercicios)
├── dp.html                  # Vista modular: Programación Dinámica (8 ejercicios)
├── pl.html                  # Vista modular: Programación Lineal y PLI (7 ejercicios)
├── flujo.html               # Vista modular: Redes de Flujo (5 ejercicios)
├── reducciones.html         # Vista modular: Reducciones NP-C (5 ejercicios)
├── integradores.html        # Vista modular: Integradores y Multi-Paradigma (5 ejercicios)
├── parciales.html           # Vista modular: Exámenes Parciales Oficiales (35 ejercicios) y Checklist
├── teoria-avanzados.html    # Aproximación y Randomizados (2 ejercicios avanzados + 5 simuladores)
├── assets/                  # Recursos estáticos modulares (Bootstrap 5.3 + Dark Mode)
│   ├── css/styles.css       # Estilos WCAG 2.1 AA, badges de dificultad 1★-5★ y HUD
│   └── js/
│       ├── app.js           # Lógica de filtrado, búsqueda, ruteo 1..85 y entrenador 30s
│       └── catalog-bundle.js # Bundle precompilado del catálogo completo para todos.html
├── builder/                 # Motor de compilación modular en Python
│   ├── build_manual.py      # Script compilador de vistas HTML y sincronizador de navbar
│   ├── html_interactive_builder.py # Generador HTML5, cards, navbar y checklist determinista
│   ├── sec01_... a sec11_   # Módulos temáticos de teoría, 85 ejercicios y checklist
│   └── test_qa_audit.py     # Auditoría integral QA en modo solo-lectura
├── tests/                   # Suite de pruebas unitarias, integración, WCAG y enlaces
├── run_tests.py             # Ejecutor unificado con verificación de aislamiento del workspace
├── docs/
│   └── PLAN_DE_TRABAJO.md   # Plan de trabajo arquitectónico y hoja de ruta
├── DIapositivas/            # 29 presentaciones (00 a 24), ejemplos LINDO/Mochila/Viajante y apuntes
├── Guia-Ejercicios/         # Guías oficiales 01 a 09 y Guía consolidada v1.0
├── Practicas/               # 20 prácticas en Python (1 resuelta + 19 plantillas TODO con asserts)
├── Parciales/               # 7 exámenes parciales oficiales (2024, 2025 y 2026)
├── TP0/                     # Trabajo Práctico 0: consignas, entrega autorizada y análisis
├── .nojekyll                # Configuración de GitHub Pages para servir assets estáticos
└── logo-facultad.png        # Identidad visual FIUBA
```

---

## 📖 Contenido Detallado de Carpetas

### 1. 📂 [DIapositivas/](DIapositivas/)
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
* **Subcarpetas temáticas y apuntes:** `12 - Lindo/` (4 archivos), `12 - Mochila/` (6 archivos), `12 - Viajante/` (12 archivos) y [`Explicaciones/problema_mochila_y_greedy.md`](DIapositivas/Explicaciones/problema_mochila_y_greedy.md).

---

### 2. 📂 [Guia-Ejercicios/](Guia-Ejercicios/)
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

### 3. 📂 [Practicas/](Practicas/)
Suite de **20 prácticas de programación en Python** (**1 resuelta:** `01_division_y_conquista/ej02_primer_cero_tests.py`, y **19 plantillas `TODO` con pruebas `assert`**), documentadas en [`Practicas/README.md`](Practicas/README.md):
* **01_division_y_conquista:** `primer_cero`, `arreglo_pico`, `elemento_mayoritario`, `bolzano_biseccion`.
* **02_greedy:** `seleccion_charlas`, `mochila_fraccionaria`, `minimizar_latencia`, `antenas_ruta`.
* **03_backtracking:** `coloreo_grafos`, `n_reinas`, `independent_set_maximo`, `subset_sum`.
* **04_programacion_dinamica:** `interval_scheduling_ponderado`, `juan_el_vago`, `mochila_01`, `cambio_monedas`.
* **05_programacion_lineal:** `mochila_pl`, `juan_el_vago_pl`, `vertex_cover_pl`, `dos_particiones_min_max_pl`.

---

### 4. 📂 [Parciales/](Parciales/)
**7 exámenes parciales** tomados en fechas recientes (los 35 ejercicios están resueltos paso a paso en [`parciales.html`](parciales.html)):
* `TP-2024-2-1.pdf`, `TP-2024-2-2.pdf`, `TP-2024-2-3.pdf`
* `TP-2025-1-1.pdf`, `TP-2025-1-2.pdf`
* `TP-2026-2-1.pdf` *(6 ejercicios resueltos)*
* `TP-2026-2-2.pdf` *(6 ejercicios resueltos)*

---

### 5. 📂 [TP0/](TP0/)
Primer trabajo práctico de la materia (6 archivos):
* `TP00-2026-2c.pdf`, `checklist.pdf`, `cuartetos.py`, `cuartetos_malo.py`, `grafico_tiempos.png` y `TP0_Nelson_Avila_100244.pdf`.

---

## 🛠️ Cómo recompilar y validar la plataforma interactiva

Si editás los módulos de contenido en `builder/sec01_...` a `sec11_...` o los recursos en `assets/`, podés regenerar todas las páginas HTML corriendo:

```bash
python builder/build_manual.py
```

El compilador verificará automáticamente la integridad de los bloques de código, generará `todos.html`, las 9 páginas modulares (`dyc.html`..`parciales.html`) y `assets/js/catalog-bundle.js`, y sincronizará el navbar de `index.html` y `teoria-avanzados.html`. Para ejecutar toda la suite de validación sin modificar el repositorio:

```bash
python run_tests.py
```

---

## 📜 Licencia y Atribución
Material docente y práctico correspondiente a la cátedra de **Teoría de Algoritmos** de la **Facultad de Ingeniería de la Universidad de Buenos Aires (FIUBA)**.
