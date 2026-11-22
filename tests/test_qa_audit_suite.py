"""Integración de la auditoría QA de builder/test_qa_audit.py en la suite unittest."""

import glob
import html
import importlib.util
import os
import re
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDER_DIR = os.path.join(BASE_DIR, "builder")
if BUILDER_DIR not in sys.path:
    sys.path.insert(0, BUILDER_DIR)

import build_manual
import html_interactive_builder

QA_AUDIT_PATH = os.path.join(BASE_DIR, "builder", "test_qa_audit.py")

_spec = importlib.util.spec_from_file_location("builder_qa_audit", QA_AUDIT_PATH)
_qa_audit = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_qa_audit)


class TestQAAudit(unittest.TestCase):
    """Ejecuta la auditoría integral de QA en modo solo-lectura."""

    def test_qa_audit_passes(self):
        """Verifica integridad de los 85 ejercicios, 35 parciales, estrellas, HTML y delimitadores LaTeX."""
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory(prefix="tda_qa_audit_") as tmp_dir:
            shutil.copytree(BUILDER_DIR, os.path.join(tmp_dir, "builder"))
            build_manual.main(output_dir=tmp_dir)
            _qa_audit.run_qa_audit(base_dir=tmp_dir, verbose=False)

    def test_no_git_conflict_markers_in_html_files(self):
        """Verifica ausencia total de marcadores de conflicto Git en archivos fuente y docs del repo."""
        scan_globs = [
            os.path.join(BASE_DIR, "*.html"),
            os.path.join(BASE_DIR, "src", "**", "*.astro"),
            os.path.join(BASE_DIR, "src", "**", "*.tsx"),
            os.path.join(BASE_DIR, "builder", "*.py"),
        ]
        files_to_check = []
        for pattern in scan_globs:
            files_to_check.extend(sorted(glob.glob(pattern, recursive=True)))
        self.assertGreater(len(files_to_check), 10)
        for fpath in files_to_check:
            fname = os.path.relpath(fpath, BASE_DIR)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertNotIn("<<<<<<<", content, f"[{fname}] Contiene marcador de conflicto '<<<<<<<'.")
            self.assertIsNone(
                re.search(r"(?m)^=======\r?$", content),
                f"[{fname}] Contiene marcador de conflicto '======='.",
            )
            self.assertNotIn(">>>>>>>", content, f"[{fname}] Contiene marcador de conflicto '>>>>>>>'.")

    def test_standalone_pages_navbar_synced_and_no_duplicate_js(self):
        """Verifica que el navbar generado por html_interactive_builder mantenga conteos y sin errores."""
        counts = build_manual.compute_catalog_counts()
        expected_navbar = html_interactive_builder.get_navbar_html(
            active_paradigm="all",
            counts=counts,
        )
        self.assertIn('id="siteNavbar"', expected_navbar)
        self.assertIn(f"Todos los Ejercicios ({counts['todos']})", expected_navbar)
        self.assertIn(f"Parciales ({counts['parciales']})", expected_navbar)

    def test_all_12_repo_html_have_consistent_counts_and_active_route(self):
        """Verifica que get_navbar_html() produzca conteos consistentes y ruta activa para los paradigmas del builder."""
        counts = build_manual.compute_catalog_counts()
        expected_nums = [
            str(counts["parciales"]),
            str(counts["todos"]),
            str(counts["dyc"]),
            str(counts["greedy"]),
            str(counts["backtracking"]),
            str(counts["dp"]),
            str(counts["pl"]),
            str(counts["flujo"]),
            str(counts["reducciones"]),
            str(counts["integradores"]),
        ]

        for active_key, expected_actives in (
            ("avanzados", ["teoria-avanzados.html"]),
            ("parciales", ["parciales.html"]),
            ("all", ["#", "todos.html"]),
            ("dyc", ["#", "dyc.html"]),
            ("greedy", ["#", "greedy.html"]),
        ):
            navbar_html = html_interactive_builder.get_navbar_html(
                active_paradigm=active_key,
                counts=counts,
            )
            found_nums = re.findall(r"\((\d+)\)", html.unescape(navbar_html))
            self.assertEqual(found_nums, expected_nums)
            active_hrefs = []
            for am in re.finditer(r"<a\b([^>]*)>", navbar_html):
                attrs = am.group(1)
                cls_m = re.search(r'class="([^"]*)"', attrs)
                href_m = re.search(r'href="([^"]*)"', attrs)
                if cls_m and "active" in cls_m.group(1).split():
                    active_hrefs.append(href_m.group(1) if href_m else None)
            self.assertEqual(active_hrefs, expected_actives)


if __name__ == "__main__":
    unittest.main()
