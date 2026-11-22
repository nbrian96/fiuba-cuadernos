"""Pruebas de integración end-to-end para el compilador de la guía de TDA y los artefactos HTML generados."""

import os
import re
import glob
import json
import subprocess
import tempfile
import unittest
import sys
from urllib.parse import unquote, urlsplit

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDER_DIR = os.path.join(BASE_DIR, "builder")
if BUILDER_DIR not in sys.path:
    sys.path.insert(0, BUILDER_DIR)

import build_manual
import html_interactive_builder
import sec11_errores_checklist


def _resolve_local_link_case_sensitive(base_dir, source_file, raw_target):
    """Valida segmento por segmento (case-sensitive) enlaces locales en HTML/Markdown."""
    target = raw_target.strip()
    if not target or target.startswith("#") or target.startswith("//"):
        return True

    parsed = urlsplit(target)
    if parsed.scheme:
        return True

    path_str = unquote(parsed.path)
    if not path_str:
        return True

    base_dir_abs = os.path.abspath(base_dir)
    if path_str.startswith("/"):
        stack = []
        raw_segs = path_str.lstrip("/").split("/")
    else:
        rel_dir = os.path.relpath(os.path.dirname(os.path.abspath(source_file)), base_dir_abs)
        stack = [] if rel_dir == "." else rel_dir.replace("\\", "/").split("/")
        raw_segs = path_str.split("/")

    for seg in raw_segs:
        if seg in ("", "."):
            continue
        if seg == "..":
            if not stack:
                return False
            stack.pop()
        else:
            stack.append(seg)

    cur = base_dir_abs
    for seg in stack:
        if not os.path.isdir(cur) or seg not in os.listdir(cur):
            return False
        cur = os.path.join(cur, seg)

    if path_str.endswith("/"):
        return os.path.isdir(cur)
    return os.path.exists(cur)


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

        # Tras Etapa 6, los 12 HTML legacy se retiran de la raíz y viven como rutas de compatibilidad en dist/
        for filename in self.ALL_REPO_HTML_FILES:
            self.assertFalse(
                os.path.exists(os.path.join(BASE_DIR, filename)),
                f"El HTML legacy '{filename}' debía haberse retirado de la raíz en Etapa 6.",
            )

        self.assertTrue(os.path.exists(self.REPO_BUNDLE_FILE), "El bundle 'catalog-bundle.js' no existe en el repositorio.")
        self.assertGreater(os.path.getsize(self.REPO_BUNDLE_FILE), 100000, "El bundle JS del repo es sospechosamente pequeño.")

    def test_katex_assets_included_in_all_pages(self):
        """Verifica que todas las páginas HTML compiladas en temp_dir carguen KaTeX."""
        page_paths = [os.path.join(self.temp_dir, f) for f in self.GENERATED_HTML_FILES]
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

    def test_all_12_compiled_html_share_identical_navbar_structure_and_active_route(self):
        """Verifica estructura idéntica de navbar, conteos reales y ruta activa en los 12 HTML compilados."""
        counts = build_manual.compute_catalog_counts()
        self.assertEqual(
            counts,
            {
                "dyc": 13,
                "greedy": 27,
                "backtracking": 15,
                "dp": 8,
                "pl": 7,
                "flujo": 5,
                "reducciones": 5,
                "integradores": 5,
                "todos": 85,
                "parciales": 35,
            },
        )

        expected_count_labels = [
            f"Parciales ({counts['parciales']})",
            f"Todos los Ejercicios ({counts['todos']})",
            f"División y Conquista ({counts['dyc']})",
            f"Greedy / Voraces ({counts['greedy']})",
            f"Backtracking &amp; B&amp;B ({counts['backtracking']})",
            f"Prog. Dinámica ({counts['dp']})",
            f"Prog. Lineal ({counts['pl']})",
            f"Redes de Flujo ({counts['flujo']})",
            f"Reducciones NP ({counts['reducciones']})",
            f"Integradores ({counts['integradores']})",
        ]

        normalized_navbars = {}
        for filename in self.GENERATED_HTML_FILES:
            filepath = os.path.join(self.temp_dir, filename)
            self.assertTrue(os.path.exists(filepath), f"Falta {filename} en temp_dir.")
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            matches = list(re.finditer(r'<header\b[^>]*\bid="siteNavbar"[^>]*>[\s\S]*?</header>', content))
            self.assertEqual(len(matches), 1, f"[{filename}] Debe tener exactamente 1 <header id='siteNavbar'>.")
            navbar_html = matches[0].group(0)

            for label in expected_count_labels:
                self.assertIn(label, navbar_html, f"[{filename}] Falta etiqueta actualizada '{label}' en el navbar.")

            active_hrefs = []
            for am in re.finditer(r"<a\b([^>]*)>", navbar_html):
                attrs = am.group(1)
                cls_m = re.search(r'class="([^"]*)"', attrs)
                href_m = re.search(r'href="([^"]*)"', attrs)
                if cls_m and "active" in cls_m.group(1).split():
                    active_hrefs.append(href_m.group(1) if href_m else None)

            if filename in ("index.html", "parciales.html", "teoria-avanzados.html"):
                expected_actives = [filename]
            else:
                expected_actives = ["#", filename]
            self.assertEqual(
                active_hrefs,
                expected_actives,
                f"[{filename}] Rutas activas inesperadas: {active_hrefs} (esperadas {expected_actives}).",
            )

            stripped = re.sub(
                r'class="([^"]*)"',
                lambda m: f'class="{" ".join(t for t in m.group(1).split() if t != "active")}"',
                navbar_html,
            )
            normalized = re.sub(r">\s+<", "><", re.sub(r"\s+", " ", stripped)).strip()
            normalized_navbars[filename] = normalized

        self.assertEqual(
            len(set(normalized_navbars.values())),
            1,
            "Los 12 HTML compilados deben compartir una estructura de navbar normalizada idéntica.",
        )

    def test_checklist_ids_deterministic_across_pythonhashseed_and_collision_rejection(self):
        """Verifica IDs chk_<16_hex> deterministas entre PYTHONHASHSEED distintos y rechazo de colisiones."""
        parciales_path = os.path.join(self.temp_dir, "parciales.html")
        with open(parciales_path, "r", encoding="utf-8") as f:
            parciales_html = f.read()

        with open(self.temp_bundle, "r", encoding="utf-8") as f:
            bundle_raw = f.read()
        prefix = "mount.innerHTML = "
        start = bundle_raw.find(prefix)
        end = bundle_raw.rfind("; }")
        self.assertNotEqual(start, -1, "No se encontró mount.innerHTML en catalog-bundle.js.")
        bundle_html = json.loads(bundle_raw[start + len(prefix):end].strip())

        for label, html_src in (("parciales.html", parciales_html), ("catalog-bundle.js", bundle_html)):
            all_ids = re.findall(r'data-chk-id="([^"]+)"', html_src)
            hex_ids = re.findall(r'data-chk-id="(chk_[0-9a-f]{16})"', html_src)
            self.assertEqual(len(all_ids), 11, f"[{label}] Se esperaban 11 IDs de checklist, encontrados {len(all_ids)}.")
            self.assertEqual(all_ids, hex_ids, f"[{label}] Todos los data-chk-id deben cumplir chk_<16_hex>.")
            self.assertEqual(len(set(all_ids)), 11, f"[{label}] Existen IDs de checklist duplicados.")

        parciales_ids = re.findall(r'data-chk-id="(chk_[0-9a-f]{16})"', parciales_html)
        bundle_ids = re.findall(r'data-chk-id="(chk_[0-9a-f]{16})"', bundle_html)
        self.assertEqual(parciales_ids, bundle_ids)

        inline_code = (
            "import json, re, sys; "
            f"sys.path.insert(0, {BUILDER_DIR!r}); "
            "import html_interactive_builder as hb, sec11_errores_checklist as sec11; "
            "md = hb.normalize_markdown_lists(sec11.get_content()); "
            "raw_html = hb.convert_markdown_to_html(md); "
            "out = hb.replace_checklist_items(raw_html); "
            "print(json.dumps(re.findall(r'data-chk-id=\"([^\"]+)\"', out)))"
        )

        seed_outputs = []
        for seed in ("1", "987654"):
            env = os.environ.copy()
            env["PYTHONHASHSEED"] = seed
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            env["PYTHONPYCACHEPREFIX"] = os.path.join(tempfile.gettempdir(), "tda_test_pycache")
            res = subprocess.run(
                [sys.executable, "-c", inline_code],
                env=env,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            self.assertEqual(res.returncode, 0, f"Fallo en subproceso con PYTHONHASHSEED={seed}: {res.stderr}")
            seed_outputs.append(json.loads(res.stdout.strip()))

        self.assertEqual(seed_outputs[0], seed_outputs[1], "Los IDs chk_ no son deterministas entre PYTHONHASHSEED.")
        self.assertEqual(seed_outputs[0], parciales_ids)

        seen = {}
        html_interactive_builder.generate_checklist_id("sec", "1", "item", seen_ids=seen)
        with self.assertRaises(ValueError):
            html_interactive_builder.generate_checklist_id("sec", "1", "item", seen_ids=seen)

        with self.assertRaises(ValueError):
            html_interactive_builder.replace_checklist_items(
                "<ul><li>[ ] Uno</li><li>[ ] Dos</li></ul>",
                hash_fn=lambda _: "0123456789abcdef",
            )

        with self.assertRaises(ValueError):
            html_interactive_builder.replace_checklist_items(
                "<h3>A</h3><ul><li>[ ] X</li></ul><h3>A</h3><ul><li>[ ] X</li></ul>"
            )

    def test_trainer_total_questions_20_and_sec01_85(self):
        """Verifica que el entrenador de todos.html muestre 20 casos y sec01 indique 85 ejercicios."""
        todos_file = os.path.join(self.temp_dir, "todos.html")
        with open(todos_file, "r", encoding="utf-8") as f:
            todos_content = f.read()

        self.assertIn('id="trainerTotalQuestions">20<', todos_content)
        self.assertIn("85 ejercicios reales oficiales", todos_content)
        self.assertNotIn("79 ejercicios reales oficiales", todos_content)

    def test_all_local_links_valid_case_sensitive_in_html_and_markdown(self):
        """Valida segmento por segmento (case-sensitive) todos los enlaces locales en HTML y Markdown."""
        readme_path = os.path.join(BASE_DIR, "README.md")

        # Auto-verificación del validador case-sensitive
        self.assertTrue(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "tda/DIapositivas/"))
        self.assertFalse(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "tda/diapositivas/"))
        self.assertTrue(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "/tda/DIapositivas/"))
        self.assertFalse(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "/tda/diapositivas/"))
        self.assertTrue(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "https://example.com/no-existe"))
        self.assertTrue(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "#seccion"))
        self.assertFalse(_resolve_local_link_case_sensitive(BASE_DIR, readme_path, "tipo_parcial.html"))

        broken_links = []

        # 1. Todos los HTML compilados en temp_dir
        for fname in self.GENERATED_HTML_FILES:
            fpath = os.path.join(self.temp_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                raw_html = f.read()
            clean_html = re.sub(r"<script\b[\s\S]*?</script>", "", raw_html, flags=re.IGNORECASE)
            clean_html = re.sub(r"<style\b[\s\S]*?</style>", "", clean_html, flags=re.IGNORECASE)
            for m in re.finditer(r'(?:href|src)\s*=\s*"([^"]*)"', clean_html):
                target = m.group(1)
                parsed_path = unquote(urlsplit(target.strip()).path)
                if parsed_path in ("index.html", "teoria-avanzados.html"):
                    continue
                is_generated = parsed_path.endswith(".html") or parsed_path == "assets/js/catalog-bundle.js"
                ok_in_temp = _resolve_local_link_case_sensitive(self.temp_dir, fpath, target)
                if is_generated:
                    ok = ok_in_temp
                else:
                    fake_repo_src = os.path.join(BASE_DIR, fname)
                    ok = ok_in_temp or _resolve_local_link_case_sensitive(BASE_DIR, fake_repo_src, target)
                if not ok:
                    broken_links.append((f"temp_dir/{fname}", target))

        # 3. Todos los archivos Markdown (.md) del repositorio
        excluded_md_scan_dirs = {
            ".git",
            "node_modules",
            ".astro",
            "dist",
            ".venv",
            "venv",
            "coverage",
            "playwright-report",
            "test-results",
        }
        md_files = []
        for root, dirs, files in os.walk(BASE_DIR):
            dirs[:] = [d for d in sorted(dirs) if d not in excluded_md_scan_dirs]
            for fn in sorted(files):
                if fn.endswith(".md"):
                    md_files.append(os.path.join(root, fn))

        for md_path in md_files:
            rel_md = os.path.relpath(md_path, BASE_DIR).replace("\\", "/")
            with open(md_path, "r", encoding="utf-8") as f:
                raw_md = f.read()
            clean_md = re.sub(r"```[\s\S]*?```", "", raw_md)
            clean_md = re.sub(r"`[^`\n]+`", "", clean_md)
            for m in re.finditer(r'!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)', clean_md):
                target = m.group(1)
                if not _resolve_local_link_case_sensitive(BASE_DIR, md_path, target):
                    broken_links.append((rel_md, target))
            for m in re.finditer(r'(?:href|src)\s*=\s*"([^"]*)"', clean_md):
                target = m.group(1)
                if not _resolve_local_link_case_sensitive(BASE_DIR, md_path, target):
                    broken_links.append((rel_md, target))

        self.assertEqual(broken_links, [], f"Se detectaron enlaces locales rotos (case-sensitive): {broken_links}")

        # Verificaciones explícitas de README.md
        with open(readme_path, "r", encoding="utf-8") as f:
            readme_text = f.read()
        self.assertNotIn("tipo_parcial.html", readme_text)
        self.assertIn("parciales.html", readme_text)
        self.assertIn("todos.html", readme_text)
        self.assertIn("teoria-avanzados.html", readme_text)
        self.assertIn("85", readme_text)
        self.assertIn("35", readme_text)
        self.assertIn("TP0_Nelson_Avila_100244.pdf", readme_text)


if __name__ == "__main__":
    unittest.main()
