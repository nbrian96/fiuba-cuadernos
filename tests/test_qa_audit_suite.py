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
        _qa_audit.run_qa_audit(base_dir=BASE_DIR, verbose=False)

    def test_no_git_conflict_markers_in_html_files(self):
        """Verifica ausencia total de marcadores de conflicto Git en los archivos HTML del repo."""
        html_files = sorted(glob.glob(os.path.join(BASE_DIR, "*.html")))
        self.assertGreaterEqual(len(html_files), 12)
        for fpath in html_files:
            fname = os.path.basename(fpath)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertNotIn("<<<<<<<", content, f"[{fname}] Contiene marcador de conflicto '<<<<<<<'.")
            self.assertIsNone(
                re.search(r"(?m)^=======\r?$", content),
                f"[{fname}] Contiene marcador de conflicto '======='.",
            )
            self.assertNotIn(">>>>>>>", content, f"[{fname}] Contiene marcador de conflicto '>>>>>>>'.")

    def test_standalone_pages_navbar_synced_and_no_duplicate_js(self):
        """Verifica sincronización exacta de navbar en vistas standalone y eliminación de JS duplicado."""
        counts = build_manual.compute_catalog_counts()
        for fname, active_key in build_manual.STANDALONE_NAVBAR_PAGES:
            fpath = os.path.join(BASE_DIR, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read().replace("\r\n", "\n")

            matches = list(re.finditer(r'<header\b[^>]*\bid="siteNavbar"[^>]*>[\s\S]*?</header>', content))
            self.assertEqual(len(matches), 1, f"[{fname}] Debe tener exactamente 1 <header id='siteNavbar'>.")
            expected_navbar = html_interactive_builder.get_navbar_html(
                active_paradigm=active_key,
                counts=counts,
            ).replace("\r\n", "\n")
            self.assertEqual(
                matches[0].group(0),
                expected_navbar,
                f"[{fname}] El navbar no coincide exactamente con get_navbar_html('{active_key}', counts).",
            )

        avanzados_path = os.path.join(BASE_DIR, "teoria-avanzados.html")
        with open(avanzados_path, "r", encoding="utf-8") as f:
            avanzados_html = f.read()
        for fn_name in ("openCheatsheet", "closeCheatsheet", "scrollToTop", "toggleDarkMode"):
            self.assertNotIn(
                f"function {fn_name}",
                avanzados_html,
                f"teoria-avanzados.html aún define la función global duplicada '{fn_name}'.",
            )

    def test_all_12_repo_html_have_consistent_counts_and_active_route(self):
        """Verifica conteos consistentes del catálogo y ruta activa correcta en los 12 HTML del repo."""
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

        expected_files = [
            "index.html",
            "teoria-avanzados.html",
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
        for fname in expected_files:
            fpath = os.path.join(BASE_DIR, fname)
            self.assertTrue(os.path.exists(fpath), f"Falta {fname} en el repositorio.")
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()

            m = re.search(r'<header\b[^>]*\bid="siteNavbar"[^>]*>[\s\S]*?</header>', content)
            self.assertIsNotNone(m, f"[{fname}] Falta <header id='siteNavbar'>.")
            navbar_html = m.group(0)

            found_nums = re.findall(r"\((\d+)\)", html.unescape(navbar_html))
            self.assertEqual(
                found_nums,
                expected_nums,
                f"[{fname}] Conteos en navbar {found_nums} no coinciden con {expected_nums}.",
            )

            active_hrefs = []
            for am in re.finditer(r"<a\b([^>]*)>", navbar_html):
                attrs = am.group(1)
                cls_m = re.search(r'class="([^"]*)"', attrs)
                href_m = re.search(r'href="([^"]*)"', attrs)
                if cls_m and "active" in cls_m.group(1).split():
                    active_hrefs.append(href_m.group(1) if href_m else None)

            if fname in ("index.html", "parciales.html", "teoria-avanzados.html"):
                expected_actives = [fname]
            else:
                expected_actives = ["#", fname]
            self.assertEqual(
                active_hrefs,
                expected_actives,
                f"[{fname}] Rutas activas inesperadas en repo: {active_hrefs} (esperadas {expected_actives}).",
            )


if __name__ == "__main__":
    unittest.main()
