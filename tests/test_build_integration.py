"""Pruebas de integración end-to-end para el compilador de la guía de TDA y los artefactos HTML generados."""

import os
import re
import glob
import subprocess
import tempfile
import unittest
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDER_DIR = os.path.join(BASE_DIR, "builder")
if BUILDER_DIR not in sys.path:
    sys.path.insert(0, BUILDER_DIR)


class TestBuildIntegration(unittest.TestCase):
    """Pruebas de integración del proceso de build y los artefactos HTML resultantes."""

    GENERATED_HTML_FILES = [
        "todos.html",
        "dyc.html",
        "greedy.html",
        "backtracking.html",
        "dp.html",
        "pl.html",
        "flujo.html",
        "reducciones.html",
        "integradores.html",
        "parciales.html",
    ]

    ALL_REPO_HTML_FILES = [
        "index.html",
        "teoria-avanzados.html",
    ] + GENERATED_HTML_FILES

    REPO_BUNDLE_FILE = os.path.join(BASE_DIR, "assets", "js", "catalog-bundle.js")

    @classmethod
    def setUpClass(cls):
        """Ejecuta el compilador build_manual.py en un directorio temporal aislado."""
        cls._temp_dir_obj = tempfile.TemporaryDirectory(prefix="tda_build_test_")
        cls.temp_dir = cls._temp_dir_obj.name
        cls.temp_bundle = os.path.join(cls.temp_dir, "assets", "js", "catalog-bundle.js")

        build_script = os.path.join(BUILDER_DIR, "build_manual.py")
        env = os.environ.copy()
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        env["PYTHONPYCACHEPREFIX"] = os.path.join(tempfile.gettempdir(), "tda_test_pycache")

        res = subprocess.run(
            [sys.executable, build_script, "--output-dir", cls.temp_dir],
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if res.returncode != 0:
            cls._temp_dir_obj.cleanup()
            raise RuntimeError(f"Error al compilar el manual en directorio temporal:\n{res.stderr}")

    @classmethod
    def tearDownClass(cls):
        """Limpia el directorio temporal tras finalizar los tests."""
        if hasattr(cls, "_temp_dir_obj"):
            cls._temp_dir_obj.cleanup()

    def test_all_expected_html_files_exist_and_non_empty(self):
        """Verifica los HTML/bundle compilados en el directorio temporal y los archivos existentes en el repo."""
        for filename in self.GENERATED_HTML_FILES:
            filepath = os.path.join(self.temp_dir, filename)
            self.assertTrue(os.path.exists(filepath), f"El archivo HTML '{filename}' no fue generado en temp_dir.")
            size = os.path.getsize(filepath)
            self.assertGreater(size, 5000, f"El archivo '{filename}' es sospechosamente pequeño ({size} bytes).")

        self.assertTrue(os.path.exists(self.temp_bundle), "El bundle 'catalog-bundle.js' no fue generado en temp_dir.")
        self.assertGreater(os.path.getsize(self.temp_bundle), 100000, "El bundle JS en temp_dir es sospechosamente pequeño.")

        for filename in self.ALL_REPO_HTML_FILES:
            filepath = os.path.join(BASE_DIR, filename)
            self.assertTrue(os.path.exists(filepath), f"El archivo HTML '{filename}' no existe en el repositorio.")
            size = os.path.getsize(filepath)
            self.assertGreater(size, 5000, f"El archivo '{filename}' en el repo es sospechosamente pequeño ({size} bytes).")

        self.assertTrue(os.path.exists(self.REPO_BUNDLE_FILE), "El bundle 'catalog-bundle.js' no existe en el repositorio.")
        self.assertGreater(os.path.getsize(self.REPO_BUNDLE_FILE), 100000, "El bundle JS del repo es sospechosamente pequeño.")

    def test_katex_assets_included_in_all_pages(self):
        """Verifica que todas las páginas HTML (compiladas en temp_dir y manuales del repo) carguen KaTeX."""
        page_paths = [os.path.join(self.temp_dir, f) for f in self.GENERATED_HTML_FILES] + [
            os.path.join(BASE_DIR, "index.html"),
            os.path.join(BASE_DIR, "teoria-avanzados.html"),
        ]
        for filepath in page_paths:
            filename = os.path.basename(filepath)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("katex.min.css", content, f"[{filename}] Falta el CSS de KaTeX.")
            self.assertIn("katex.min.js", content, f"[{filename}] Falta la librería JS de KaTeX.")
            self.assertIn("auto-render.min.js", content, f"[{filename}] Falta el script auto-render de KaTeX.")

    def test_no_unresolved_placeholders_in_html_or_bundle(self):
        """Verifica que ningún placeholder temporal del compilador se filtre al HTML o al bundle generado."""
        files_to_check = [os.path.join(self.temp_dir, f) for f in self.GENERATED_HTML_FILES] + [self.temp_bundle]

        for filepath in files_to_check:
            fname = os.path.basename(filepath)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertNotIn("%%MATH_BLK_", content, f"[{fname}] Contiene placeholders de fórmulas no reemplazados.")
            self.assertNotIn("%%CODE_BLK_", content, f"[{fname}] Contiene placeholders de código no reemplazados.")
            self.assertNotIn("%%PRE_BLOCK_", content, f"[{fname}] Contiene placeholders de bloques pre no reemplazados.")

    def test_no_visible_bare_backslash_dollars_in_html(self):
        """Verifica que en el HTML generado no queden signos '\\$' en texto fuera de fórmulas."""
        for filename in self.GENERATED_HTML_FILES:
            filepath = os.path.join(self.temp_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Quitar bloques <pre><code>...</code></pre> donde sí puede haber sintaxis bash/código
            clean_content = re.sub(r"<pre[\s\S]*?</pre>", "", content)
            clean_content = re.sub(r"<code[\s\S]*?</code>", "", clean_content)

            # Quitar fórmulas delimitadas por KaTeX $...$ o $$...$$
            clean_no_math = re.sub(r"\$\$[\s\S]*?\$\$", "", clean_content)
            clean_no_math = re.sub(r"(?<!\\)\$(?!\$)[^\n]+?(?<!\\)\$", "", clean_no_math)

            # Verificar que no haya '\$' sueltos en el texto visible
            bare_dollars = list(re.finditer(r"\\\$", clean_no_math))
            self.assertEqual(
                len(bare_dollars), 0,
                f"[{filename}] Se encontraron {len(bare_dollars)} signos '\\$' en texto visible fuera de fórmulas."
            )

    def test_exercise_18_integration_in_greedy_parciales_and_bundle(self):
        """Verifica la correcta integración del Ejercicio 18 en greedy.html, parciales.html y catalog-bundle.js compilados."""
        targets = [
            ("greedy.html", os.path.join(self.temp_dir, "greedy.html")),
            ("parciales.html", os.path.join(self.temp_dir, "parciales.html")),
            ("catalog-bundle.js", self.temp_bundle)
        ]

        for label, filepath in targets:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Comprobar existencia del ejercicio 18
            self.assertTrue(
                ('id="ej-18"' in content) or ('id=\\"ej-18\\"' in content),
                f"[{label}] No se encontró la tarjeta del ejercicio 18."
            )
            self.assertIn("solution-drawer-18", content, f"[{label}] No se encontró el drawer del ejercicio 18.")

            # Fórmulas clave de la Regla Voraz
            self.assertTrue(
                ("$i + 3 \\ge N + 1$" in content) or ("$i + 3 \\\\ge N + 1$" in content),
                f"[{label}] Fórmula voraz de alcance ausente o mal delimitada."
            )
            self.assertTrue(
                ("$\\{i+1, \\; i+2, \\; i+3\\}$" in content) or ("$\\\\{i+1, \\\\; i+2, \\\\; i+3\\\\}$" in content),
                f"[{label}] Conjunto de alcanzables ausente."
            )

            # Fórmulas de la instancia óptima (con delimitadores KaTeX y moneda)
            self.assertTrue(
                ("($\\$10$)" in content) or ("($\\\\$10$)" in content),
                f"[{label}] Tarifa $10 con backslash suelto o sin KaTeX."
            )
            self.assertTrue(
                ("($\\$20$)" in content) or ("($\\\\$20$)" in content),
                f"[{label}] Tarifa $20 con backslash suelto o sin KaTeX."
            )
            self.assertTrue(
                ("($\\$5$)" in content) or ("($\\\\$5$)" in content),
                f"[{label}] Tarifa $5 con backslash suelto o sin KaTeX."
            )
            self.assertTrue(
                ("Costo Greedy = $\\$5$" in content) or ("Costo Greedy = $\\\\$5$" in content),
                f"[{label}] Costo Greedy óptimo sin KaTeX."
            )

            # Fórmulas del contraejemplo
            self.assertTrue(
                ("($\\$100$)" in content) or ("($\\\\$100$)" in content),
                f"[{label}] Tarifa $100 con backslash suelto o sin KaTeX."
            )
            self.assertTrue(
                ("$\\$5 + \\$6 = \\$11$" in content) or ("$\\\\$5 + \\\\$6 = \\\\$11$" in content),
                f"[{label}] Suma Greedy del contraejemplo ausente o rota."
            )
            self.assertTrue(
                ("$\\$6 < \\$11$" in content) or ("$\\$6 &lt; \\$11$" in content) or
                ("$\\\\$6 < \\\\$11$" in content) or ("$\\\\$6 &lt; \\\\$11$" in content),
                f"[{label}] Comparación de costo óptimo contraejemplo ausente o mal delimitada."
            )

    def test_all_85_exercises_present_across_system(self):
        """Verifica que los 85 ejercicios oficiales estén presentes en todos.html + catalog-bundle.js generados."""
        todos_file = os.path.join(self.temp_dir, "todos.html")
        with open(todos_file, "r", encoding="utf-8") as f:
            todos_content = f.read()

        with open(self.temp_bundle, "r", encoding="utf-8") as f:
            bundle_content = f.read()

        self.assertIn("tdaCatalogMount", todos_content, "todos.html debe contener el contenedor #tdaCatalogMount.")
        self.assertIn("assets/js/catalog-bundle.js", todos_content, "todos.html debe cargar catalog-bundle.js.")

        for ej_num in range(1, 86):
            card_pattern = r'id=\\?["\']ej-' + str(ej_num) + r'\\?["\']'
            self.assertRegex(
                bundle_content, card_pattern,
                f"El Ejercicio {ej_num} no se encontró en catalog-bundle.js."
            )

    def test_future_exercise_scalability_auto_discovery(self):
        """Verifica que el sistema de auditoría descubra automáticamente todos los ejercicios de cualquier nuevo módulo sec*.py."""
        modules = sorted(glob.glob(os.path.join(BUILDER_DIR, "sec*.py")))
        all_discovered = []
        for m in modules:
            with open(m, "r", encoding="utf-8") as f:
                txt = f.read()
            nums = [int(match.group(1)) for match in re.finditer(r"### Ejercicio (\d+)", txt)]
            all_discovered.extend(nums)

        self.assertEqual(len(all_discovered), len(set(all_discovered)), "Existen números de ejercicio duplicados en los módulos.")
        self.assertEqual(len(all_discovered), 85, f"Se esperaban 85 ejercicios en los módulos, encontrados {len(all_discovered)}.")


if __name__ == "__main__":
    unittest.main()
