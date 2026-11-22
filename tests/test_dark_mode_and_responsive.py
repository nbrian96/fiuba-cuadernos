"""Pruebas unitarias y de integración para Modo Oscuro (Dark Mode) y Responsividad Móvil (Vertical y Horizontal)."""

import os
import glob
import re
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class TestDarkModeAndResponsive(unittest.TestCase):

    def setUp(self):
        self.css_path = os.path.join(BASE_DIR, "assets", "css", "styles.css")
        self.js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
        with open(self.css_path, "r", encoding="utf-8") as f:
            self.css = f.read()
        with open(self.js_path, "r", encoding="utf-8") as f:
            self.js = f.read()

    def test_dark_mode_alerts_and_katex(self):
        """Verifica que las alertas Bootstrap y KaTeX tengan soporte completo y alto contraste en dark mode."""
        self.assertIn("body.dark-mode .alert-warning", self.css)
        self.assertIn("body.dark-mode .alert-danger", self.css)
        self.assertIn("body.dark-mode .alert-info", self.css)
        self.assertIn("body.dark-mode .alert-success", self.css)
        self.assertIn("body.dark-mode .alert-secondary", self.css)
        self.assertIn("body.dark-mode .alert-primary", self.css)

        # Fórmulas KaTeX dentro de alertas no deben ser blancas sobre fondo claro
        self.assertIn("body.dark-mode .alert-warning .katex", self.css)
        self.assertIn("body.dark-mode .alert-danger .katex", self.css)
        self.assertIn("body.dark-mode .alert-info .katex", self.css)
        self.assertIn("body.dark-mode .alert-success .katex", self.css)

    def test_dark_mode_badges_and_emphasis_text(self):
        """Verifica que badges y clases de énfasis tengan colores contrastados en dark mode."""
        self.assertIn("body.dark-mode .badge.bg-warning", self.css)
        self.assertIn("body.dark-mode .badge.bg-success", self.css)
        self.assertIn("body.dark-mode .text-warning-emphasis", self.css)
        self.assertIn("body.dark-mode .text-success-emphasis", self.css)
        self.assertIn("body.dark-mode .table", self.css)
        self.assertIn("body.dark-mode .progress", self.css)
        self.assertIn("body.dark-mode .text-muted", self.css)
        self.assertIn("[data-bs-theme=\"dark\"] .text-muted", self.css)

    def test_mobile_portrait_rules(self):
        """Verifica que existan reglas de navegación deslizable y elementos adaptables en mobile vertical."""
        self.assertIn(".site-nav-links", self.css)
        self.assertIn("overflow-x: auto;", self.css)
        self.assertIn("flex-wrap: nowrap;", self.css)
        self.assertIn(".nav-tabs-sticky", self.css)

    def test_mobile_landscape_rules(self):
        """Verifica que existan reglas para celulares en posición horizontal (altura <= 550px)."""
        self.assertIn("@media (max-height: 550px) and (orientation: landscape)", self.css)
        self.assertIn(".graph-svg", self.css)
        self.assertIn("max-height: 160px;", self.css)

    def test_mermaid_dark_mode_styling_and_app_js(self):
        """Verifica que Mermaid tenga reglas CSS específicas para etiquetas de aristas y configuración dark en JS."""
        self.assertIn(".mermaid .edgeLabel", self.css)
        self.assertIn("body.dark-mode .mermaid .edgeLabel", self.css)
        self.assertIn("background-color: #0b1120 !important;", self.css)
        self.assertIn("edgeLabelBackground", self.js)
        self.assertIn("darkMode: true", self.js)

    def test_all_12_html_files_have_early_dark_detection(self):
        """Verifica que el generador HTML incluya el script de detección temprana de tema en <head>."""
        import sys
        import tempfile
        builder_dir = os.path.join(BASE_DIR, "builder")
        if builder_dir not in sys.path:
            sys.path.insert(0, builder_dir)
        import html_interactive_builder

        with tempfile.TemporaryDirectory(prefix="tda_dark_head_") as tmp_dir:
            out_html = os.path.join(tmp_dir, "sample.html")
            html_interactive_builder.build_interactive_html(
                "# Test\n\n### Ejercicio 1: Demo\n\nTexto",
                out_html,
                active_paradigm="all",
                page_title="Test",
            )
            with open(out_html, "r", encoding="utf-8") as f:
                template_sample = f.read()

        self.assertIn("data-bs-theme", template_sample)
        self.assertIn("width=device-width", template_sample)
        self.assertIn("styles.css", template_sample)

    def test_index_html_rules_and_portal_badges(self):
        """Verifica que styles.css preserve las clases semánticas para listas de examen y badges de portal."""
        self.assertIn(".exam-rules-list", self.css)
        self.assertIn(".exam-errors-list", self.css)
        self.assertIn(".badge-portal-exam", self.css)
        self.assertIn(".badge-portal-teoria", self.css)
        self.assertIn(".site-nav-link-adv", self.css)

    def test_teoria_avanzados_mermaid_and_cheatsheet(self):
        """Verifica que el builder incluya drawer de fórmulas y sincronización de tema."""
        import sys
        builder_dir = os.path.join(BASE_DIR, "builder")
        if builder_dir not in sys.path:
            sys.path.insert(0, builder_dir)
        import html_interactive_builder

        drawer = html_interactive_builder.get_hud_and_drawer_html("all")
        self.assertIn('id="cheatsheetDrawer"', drawer)
        self.assertIn("openCheatsheet()", drawer)
        self.assertIn("closeCheatsheet()", drawer)

    def test_mobile_paradigm_dropdown_and_viewport_fix(self):
        """Verifica que el selector de paradigmas sea táctil/interactivo en mobile y que <nav> no desborde el viewport."""
        self.assertIn("function toggleParadigmDropdown", self.js)
        self.assertIn("function closeParadigmDropdown", self.js)
        self.assertIn(".site-dropdown.is-open .site-dropdown-menu", self.css)
        self.assertIn(".site-nav-links.dropdown-open", self.css)
        self.assertIn("overflow: visible !important;", self.css)
        self.assertIn("overflow-x: clip;", self.css)

        import sys
        builder_dir = os.path.join(BASE_DIR, "builder")
        if builder_dir not in sys.path:
            sys.path.insert(0, builder_dir)
        import html_interactive_builder

        navbar = html_interactive_builder.get_navbar_html(active_paradigm="all")
        self.assertIn("toggleParadigmDropdown(event)", navbar)
        self.assertIn('class="site-nav"', navbar)
        self.assertIn("todos.html", navbar)

    def test_css_braces_strictly_balanced(self):
        """Verifica que assets/css/styles.css tenga llaves {} estrictamente balanceadas sin cierres huérfanos."""
        stripped = re.sub(r"/\*[\s\S]*?\*/", "", self.css)
        stripped = re.sub(r'"(?:\\.|[^"\\])*"', '""', stripped)
        stripped = re.sub(r"'(?:\\.|[^'\\])*'", "''", stripped)

        opens = stripped.count("{")
        closes = stripped.count("}")
        self.assertEqual(opens, closes, f"Desbalance de llaves en styles.css: {{={opens}, }}={closes}.")

        depth = 0
        for lineno, line in enumerate(stripped.splitlines(), 1):
            for ch in line:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    self.assertGreaterEqual(
                        depth,
                        0,
                        f"Llave de cierre huérfana en styles.css cerca de la línea {lineno}: {line.strip()}",
                    )
        self.assertEqual(depth, 0, f"Quedaron {depth} llaves sin cerrar al final de styles.css.")

    def test_wcag_aa_contrast_ratios_on_declared_pairs(self):
        """Verifica matemáticamente que los tokens y pares declarados cumplan WCAG 2.1 AA."""
        def srgb_to_linear(channel):
            c = channel / 255.0
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

        def luminance(hex_color):
            h = hex_color.lstrip("#")
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
            return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)

        def contrast_ratio(fg, bg):
            l1, l2 = luminance(fg), luminance(bg)
            return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

        def parse_hex_vars(block_body):
            return dict(re.findall(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;", block_body))

        root_m = re.search(r":root\s*\{([^}]*)\}", self.css)
        self.assertIsNotNone(root_m, "No se encontró el bloque :root en styles.css.")
        light_vars = parse_hex_vars(root_m.group(1))

        dark_m = re.search(r'body\.dark-mode,\s*\[data-bs-theme="dark"\]\s*\{([^}]*)\}', self.css)
        self.assertIsNotNone(dark_m, "No se encontró el bloque dark-mode en styles.css.")
        dark_vars = parse_hex_vars(dark_m.group(1))

        # 1. Pares Light Mode >= 4.5:1
        light_pairs = [
            ("--text-main", light_vars["--text-main"], light_vars["--bg-card"]),
            ("--text-main on --bg-main", light_vars["--text-main"], light_vars["--bg-main"]),
            ("--text-muted on --bg-card", light_vars["--text-muted"], light_vars["--bg-card"]),
            ("--text-muted on --bg-main", light_vars["--text-muted"], light_vars["--bg-main"]),
            ("--primary-color on --bg-main", light_vars["--primary-color"], light_vars["--bg-main"]),
            ("--primary-light on --bg-main", light_vars["--primary-light"], light_vars["--bg-main"]),
            ("--accent-color on --bg-card", light_vars["--accent-color"], light_vars["--bg-card"]),
            ("--accent-color on --bg-main", light_vars["--accent-color"], light_vars["--bg-main"]),
            ("#fff on --accent-color", "#ffffff", light_vars["--accent-color"]),
            ("#fff on --primary-light", "#ffffff", light_vars["--primary-light"]),
            ("--imprescindible-color on bg", light_vars["--imprescindible-color"], light_vars["--imprescindible-bg"]),
            ("--imprescindible-color on card", light_vars["--imprescindible-color"], light_vars["--bg-card"]),
            ("--importante-color on bg", light_vars["--importante-color"], light_vars["--importante-bg"]),
            ("--importante-color on card", light_vars["--importante-color"], light_vars["--bg-card"]),
            ("--mastered-color on bg", light_vars["--mastered-color"], light_vars["--mastered-bg"]),
            ("--mastered-color on card", light_vars["--mastered-color"], light_vars["--bg-card"]),
        ]
        for label, fg, bg in light_pairs:
            r = contrast_ratio(fg, bg)
            self.assertGreaterEqual(r, 4.5, f"[Light] Contraste insuficiente en {label} ({fg}/{bg}): {r:.2f}:1")

        # 2. Pares Dark Mode >= 4.5:1
        for token in (
            "--text-main", "--text-muted", "--primary-color", "--primary-light",
            "--accent-color", "--imprescindible-color", "--importante-color", "--mastered-color",
        ):
            for bg_token in ("--bg-main", "--bg-card"):
                r = contrast_ratio(dark_vars[token], dark_vars[bg_token])
                self.assertGreaterEqual(
                    r, 4.5, f"[Dark] Contraste insuficiente en {token} ({dark_vars[token]}) sobre {bg_token} ({dark_vars[bg_token]}): {r:.2f}:1"
                )

        # 3. Dark .diff-btn.active y ausencia de var(--accent-color) en su fondo
        diff_active_blocks = re.findall(r"body\.dark-mode\s+\.diff-btn\.active\s*\{([^}]*)\}", self.css)
        self.assertGreaterEqual(len(diff_active_blocks), 1)
        for blk in diff_active_blocks:
            self.assertNotIn("var(--accent-color)", blk, "body.dark-mode .diff-btn.active no debe usar --accent-color claro como fondo.")
            bg_m = re.search(r"background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6})", blk)
            fg_m = re.search(r"(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{6})", blk)
            self.assertIsNotNone(bg_m)
            self.assertIsNotNone(fg_m)
            r = contrast_ratio(fg_m.group(1), bg_m.group(1))
            self.assertGreaterEqual(r, 4.5, f"[Dark .diff-btn.active] Contraste insuficiente: {r:.2f}:1")

        # 4. Especificidad body.dark-mode a acotada y CTAs del hero >= 4.5:1
        self.assertIsNone(
            re.search(r"body\.dark-mode\s+a\s*\{", self.css),
            "body.dark-mode a sin :not(.btn) rompe el contraste de botones enlace como .btn-warning.",
        )
        self.assertIn("body.dark-mode a:not(.btn)", self.css)

        hero_warn_m = re.search(
            r"body\.dark-mode\s+\.portal-hero-actions\s+a\.btn-warning[^{]*\{([^}]*)\}",
            self.css,
        )
        self.assertIsNotNone(hero_warn_m)
        hw_bg = re.search(r"background-color\s*:\s*(#[0-9a-fA-F]{6})", hero_warn_m.group(1)).group(1)
        hw_fg = re.search(r"(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{6})", hero_warn_m.group(1)).group(1)
        self.assertGreaterEqual(contrast_ratio(hw_fg, hw_bg), 4.5)

        hero_pri_m = re.search(
            r"body\.dark-mode\s+\.portal-hero-actions\s+a\.btn-primary[^{]*\{([^}]*)\}",
            self.css,
        )
        self.assertIsNotNone(hero_pri_m)
        hp_fg = re.search(r"(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{6})", hero_pri_m.group(1)).group(1)
        self.assertGreaterEqual(contrast_ratio(hp_fg, "#4f46e5"), 4.5)

        hero_out_m = re.search(
            r"body\.dark-mode\s+\.portal-hero-actions\s+a\.btn-outline-light[^{]*\{([^}]*)\}",
            self.css,
        )
        self.assertIsNotNone(hero_out_m)
        ho_fg = re.search(r"(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{6})", hero_out_m.group(1)).group(1)
        self.assertGreaterEqual(contrast_ratio(ho_fg, "#111827"), 4.5)

        # 5. :focus-visible >= 3.0:1 en Light y Dark
        fv_light_m = re.search(r"(?m)^a:focus-visible,[^{]*\{([^}]*)\}", self.css)
        fv_dark_m = re.search(r"body\.dark-mode\s+a:focus-visible,[^{]*\{([^}]*)\}", self.css)
        self.assertIsNotNone(fv_light_m)
        self.assertIsNotNone(fv_dark_m)
        fv_light_color = re.search(r"outline\s*:\s*[^;]*?(#[0-9a-fA-F]{6})", fv_light_m.group(1)).group(1)
        fv_dark_color = re.search(r"outline\s*:\s*[^;]*?(#[0-9a-fA-F]{6})", fv_dark_m.group(1)).group(1)
        self.assertGreaterEqual(contrast_ratio(fv_light_color, light_vars["--bg-main"]), 3.0)
        self.assertGreaterEqual(contrast_ratio(fv_light_color, light_vars["--bg-card"]), 3.0)
        self.assertGreaterEqual(contrast_ratio(fv_dark_color, dark_vars["--bg-main"]), 3.0)
        self.assertGreaterEqual(contrast_ratio(fv_dark_color, dark_vars["--bg-card"]), 3.0)

        # 6. :disabled / [aria-disabled="true"] >= 4.5:1 en Light y Dark
        dis_light_m = re.search(r"(?m)^button:disabled,[^{]*\{([^}]*)\}", self.css)
        dis_dark_m = re.search(r"body\.dark-mode\s+button:disabled,[^{]*\{([^}]*)\}", self.css)
        self.assertIsNotNone(dis_light_m)
        self.assertIsNotNone(dis_dark_m)
        dl_bg = re.search(r"background-color\s*:\s*(#[0-9a-fA-F]{6})", dis_light_m.group(1)).group(1)
        dl_fg = re.search(r"(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{6})", dis_light_m.group(1)).group(1)
        dd_bg = re.search(r"background-color\s*:\s*(#[0-9a-fA-F]{6})", dis_dark_m.group(1)).group(1)
        dd_fg = re.search(r"(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{6})", dis_dark_m.group(1)).group(1)
        self.assertGreaterEqual(contrast_ratio(dl_fg, dl_bg), 4.5)
        self.assertGreaterEqual(contrast_ratio(dd_fg, dd_bg), 4.5)

    def test_focus_visible_disabled_and_mobile_mermaid_rules(self):
        """Verifica reglas de foco accesible, estados deshabilitados y Mermaid móvil sin recorte izquierdo."""
        self.assertIn(":focus-visible", self.css)
        self.assertIn('[aria-disabled="true"]', self.css)
        self.assertIn("cursor: not-allowed;", self.css)
        self.assertIn("transform: none;", self.css)
        self.assertIn("box-shadow: none;", self.css)
        self.assertIn("justify-content: flex-start;", self.css)
        self.assertIn("margin: 0 auto;", self.css)
        self.assertIn("max-width: none;", self.css)

if __name__ == "__main__":
    unittest.main()
