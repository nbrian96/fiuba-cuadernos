"""Pruebas unitarias y de integración para la persistencia y filtrado por paradigma.

Verifica que:
1. No existan reordenamientos destructivos del DOM que desprendan las tarjetas de sus patrones.
2. Las tarjetas de ejercicio se encuentren adyacentes a sus patrones correspondientes.
3. El filtrado por paradigma y el restablecimiento a 'all' conserve la visibilidad e integridad de los 85 ejercicios.
"""

import os
import re
import json
import shutil
import subprocess
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDER_DIR = os.path.join(BASE_DIR, "builder")
if BUILDER_DIR not in sys.path:
    sys.path.insert(0, BUILDER_DIR)

import html_interactive_builder

class TestParadigmFilterIntegrity(unittest.TestCase):

    def test_no_destructive_dom_sorting_in_app_js(self):
        """Verifica que app.js no contenga sortCardsByDifficulty() que desmonte las tarjetas del DOM."""
        app_js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
        with open(app_js_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("function sortCardsByDifficulty", content,
                         "sortCardsByDifficulty no debe estar definido en app.js porque rompe la jerarquía de patrones.")
        self.assertNotIn("sortCardsByDifficulty()", content,
                         "sortCardsByDifficulty() no debe ejecutarse en DOMContentLoaded.")

    def test_catalog_bundle_cards_under_patterns(self):
        """Verifica que en el bundle de index.html cada patrón contenga su tarjeta inmediatamente adyacente."""
        bundle_path = os.path.join(BASE_DIR, "assets", "js", "catalog-bundle.js")
        with open(bundle_path, "r", encoding="utf-8") as f:
            raw = f.read()

        prefix = "mount.innerHTML = "
        start = raw.find(prefix)
        end = raw.rfind("; }")
        self.assertNotEqual(start, -1, "No se encontró mount.innerHTML en catalog-bundle.js")
        content = json.loads(raw[start + len(prefix):end].strip())

        # En DP, verificar que Ejercicio 53 esté entre Patrón 4.1 y Patrón 4.2
        pos_p41 = content.find("Patrón de Ejercicio 4.1")
        pos_ej53 = content.find('id="ej-53"')
        pos_p42 = content.find("Patrón de Ejercicio 4.2")
        pos_ej54 = content.find('id="ej-54"')

        self.assertNotEqual(pos_p41, -1, "Debe existir Patrón 4.1")
        self.assertNotEqual(pos_ej53, -1, "Debe existir ej-53")
        self.assertNotEqual(pos_p42, -1, "Debe existir Patrón 4.2")
        self.assertNotEqual(pos_ej54, -1, "Debe existir ej-54")

        self.assertTrue(pos_p41 < pos_ej53 < pos_p42,
                        "El Ejercicio 53 debe ubicarse inmediatamente debajo del Patrón 4.1 y antes del Patrón 4.2.")
        self.assertTrue(pos_p42 < pos_ej54,
                        "El Ejercicio 54 debe ubicarse inmediatamente debajo del Patrón 4.2.")

    def test_all_85_cards_have_valid_paradigm_attribute(self):
        """Verifica que las 85 tarjetas posean un data-paradigm válido correspondiente a uno de los 8 temas."""
        bundle_path = os.path.join(BASE_DIR, "assets", "js", "catalog-bundle.js")
        with open(bundle_path, "r", encoding="utf-8") as f:
            raw = f.read()

        prefix = "mount.innerHTML = "
        start = raw.find(prefix)
        end = raw.rfind("; }")
        content = json.loads(raw[start + len(prefix):end].strip())

        cards = re.findall(r'<article class="exercise-card"[^>]*id="(ej-\d+)"[^>]*data-paradigm="([^"]+)"', content)
        self.assertEqual(len(cards), 85, "Deben existir exactamente 85 tarjetas en el catálogo.")

        valid_paradigms = {"dyc", "greedy", "backtracking", "dp", "pl", "flujo", "reducciones", "integradores"}
        counts = {}
        for ej, p in cards:
            self.assertIn(p, valid_paradigms, f"{ej} tiene un data-paradigm inválido: {p}")
            counts[p] = counts.get(p, 0) + 1

        self.assertEqual(counts["dyc"], 13)
        self.assertEqual(counts["greedy"], 27)
        self.assertEqual(counts["backtracking"], 15)
        self.assertEqual(counts["dp"], 8)
        self.assertEqual(counts["pl"], 7)
        self.assertEqual(counts["flujo"], 5)
        self.assertEqual(counts["reducciones"], 5)
        self.assertEqual(counts["integradores"], 5)

    def test_filter_simulation_all_and_paradigm_cycles(self):
        """Simula los ciclos de filtrado: all -> dp -> all -> parciales -> all, validando los conteos esperados."""
        bundle_path = os.path.join(BASE_DIR, "assets", "js", "catalog-bundle.js")
        with open(bundle_path, "r", encoding="utf-8") as f:
            raw = f.read()

        prefix = "mount.innerHTML = "
        start = raw.find(prefix)
        end = raw.rfind("; }")
        content = json.loads(raw[start + len(prefix):end].strip())

        card_matches = list(re.finditer(r'<article class="exercise-card"[^>]*id="(ej-\d+)"[^>]*data-paradigm="([^"]+)"[^>]*data-parcial="([^"]+)"', content))
        self.assertEqual(len(card_matches), 85)

        def simulate_filter(paradigm):
            visible = []
            for m in card_matches:
                ej = m.group(1)
                p = m.group(2)
                is_parcial = m.group(3) == "true"
                if paradigm == "all":
                    matches = True
                elif paradigm == "parciales":
                    matches = is_parcial
                else:
                    matches = (p == paradigm)
                if matches:
                    visible.append(ej)
            return visible

        # 1. Todos activo
        self.assertEqual(len(simulate_filter("all")), 85)

        # 2. Filtrar por DP
        dp_cards = simulate_filter("dp")
        self.assertEqual(len(dp_cards), 8)
        self.assertIn("ej-53", dp_cards)
        self.assertIn("ej-59", dp_cards)
        self.assertIn("ej-82", dp_cards)

        # 3. Volver a elegir Todos
        all_cards = simulate_filter("all")
        self.assertEqual(len(all_cards), 85)
        self.assertIn("ej-1", all_cards)
        self.assertIn("ej-53", all_cards)
        self.assertIn("ej-79", all_cards)
        self.assertIn("ej-85", all_cards)

        # 4. Filtrar por Parciales
        parcial_cards = simulate_filter("parciales")
        self.assertEqual(len(parcial_cards), 35)

        # 5. Volver a elegir Todos nuevamente
        self.assertEqual(len(simulate_filter("all")), 85)

    def test_update_progress_hud_does_not_gate_on_prog_percent(self):
        """Verifica que updateProgressHUD en app.js no dependa obligatoriamente de progPercent para actualizar contadores."""
        app_js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
        with open(app_js_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Asegurar que no exista una condición que requiera progPercent para actualizar progMastered / progTotal
        self.assertNotIn("if (progMastered && progTotal && progPercent", content,
                         "updateProgressHUD no debe condicionar la actualización de progMastered y progTotal a progPercent.")

        # Verificar que actualice progMastered y progTotal
        self.assertIn("if (progMastered)", content)
        self.assertIn("if (progTotal)", content)

    def test_all_html_files_with_cards_have_hud_elements(self):
        """Verifica que los HTML compilados en temp_dir con tarjetas de ejercicios contengan progMastered, progTotal y progressFill."""
        import tempfile
        html_files_with_cards = [
            "parciales.html", "dyc.html", "greedy.html", "backtracking.html",
            "dp.html", "pl.html", "flujo.html", "reducciones.html", "integradores.html"
        ]
        with tempfile.TemporaryDirectory(prefix="tda_hud_check_") as tmp_dir:
            env = os.environ.copy()
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            res = subprocess.run(
                [sys.executable, os.path.join(BUILDER_DIR, "build_manual.py"), "--output-dir", tmp_dir],
                env=env,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            self.assertEqual(res.returncode, 0, res.stderr)
            for fname in html_files_with_cards:
                fpath = os.path.join(tmp_dir, fname)
                self.assertTrue(os.path.exists(fpath), f"El archivo {fname} debe generarse.")
                with open(fpath, "r", encoding="utf-8") as f:
                    html = f.read()
                self.assertIn('id="progMastered"', html, f"{fname} debe contener el id 'progMastered'")
                self.assertIn('id="progTotal"', html, f"{fname} debe contener el id 'progTotal'")
                self.assertIn('id="progressFill"', html, f"{fname} debe contener el id 'progressFill'")

    def test_js_python_exercise_page_parity_via_real_node_vm(self):
        """Verifica paridad 85/85 entre Python y getPageForExercise() real de assets/js/app.js en Node/V8."""
        import tempfile
        node_bin = shutil.which("node")
        if not node_bin:
            self.fail("Node.js es obligatorio para validar la paridad Python/JS de assets/js/app.js.")

        app_js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
        node_script = (
            'const fs = require("fs"); '
            'const vm = require("vm"); '
            'const appJsPath = process.argv[1]; '
            'const code = fs.readFileSync(appJsPath, "utf8"); '
            'const sandbox = { '
            '  window: { addEventListener() {}, pageYOffset: 0 }, '
            '  document: { addEventListener() {}, documentElement: { scrollTop: 0 } }, '
            '  console '
            '}; '
            'vm.runInNewContext(code, sandbox, { filename: appJsPath }); '
            'const pages = {}; '
            'for (let n = 1; n <= 85; n++) { pages[String(n)] = sandbox.getPageForExercise(n); } '
            'const fallbacks = {}; '
            'for (const v of [0, -1, 86, 999]) { fallbacks[String(v)] = sandbox.getPageForExercise(v); } '
            'console.log(JSON.stringify({ pages, fallbacks }));'
        )
        res = subprocess.run(
            [node_bin, "-e", node_script, app_js_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        self.assertEqual(res.returncode, 0, f"Fallo al ejecutar assets/js/app.js en Node/V8:\n{res.stderr}")

        payload = json.loads(res.stdout.strip())
        pages = payload["pages"]
        fallbacks = payload["fallbacks"]

        with tempfile.TemporaryDirectory(prefix="tda_parity_check_") as tmp_dir:
            env = os.environ.copy()
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            build_res = subprocess.run(
                [sys.executable, os.path.join(BUILDER_DIR, "build_manual.py"), "--output-dir", tmp_dir],
                env=env,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            self.assertEqual(build_res.returncode, 0, build_res.stderr)

            html_cache = {}
            for num in range(1, 86):
                paradigm_key, _, _ = html_interactive_builder.get_paradigm_for_exercise(num)
                expected_page = f"{paradigm_key}.html"
                js_page = pages.get(str(num))
                self.assertEqual(
                    js_page,
                    expected_page,
                    f"Desajuste de paridad para ej-{num}: JS={js_page!r} vs Python={expected_page!r}.",
                )
                if js_page not in html_cache:
                    target_path = os.path.join(tmp_dir, js_page)
                    self.assertTrue(os.path.exists(target_path), f"El HTML destino '{js_page}' no existe.")
                    with open(target_path, "r", encoding="utf-8") as f:
                        html_cache[js_page] = f.read()
                self.assertIn(
                    f'id="ej-{num}"',
                    html_cache[js_page],
                    f"El ejercicio id='ej-{num}' no existe en '{js_page}'.",
                )

        for invalid_num in (0, -1, 86, 999):
            self.assertEqual(
                fallbacks.get(str(invalid_num)),
                "todos.html",
                f"Fallback esperado 'todos.html' para num={invalid_num}, obtenido {fallbacks.get(str(invalid_num))!r}.",
            )

if __name__ == "__main__":
    unittest.main()
