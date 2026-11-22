"""Extrae y normaliza las 16 secciones teóricas de teoria-avanzados.html
hacia src/data/tdaAdvancedSections.json usando clases semánticas del Design System
(sin Bootstrap legacy, sin inline styles, sin scripts ni simuladores HTML obsoletos).

Uso:
  python -B scripts/migrate-tda-advanced.py
"""

from __future__ import annotations

import html as html_lib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_HTML = ROOT / "teoria-avanzados.html"
OUT_JSON = ROOT / "src" / "data" / "tdaAdvancedSections.json"

SIMULATOR_SECTION_MAP = {
    "set-cover": "set-cover",
    "pricing-method": "pricing-method",
    "karger-mincut": "karger",
    "max-3sat": "max-3sat",
    "streaming-conteo": "hamlet",
}


def find_matching_closing_div(text: str, div_start: int) -> int:
    depth = 0
    pos = div_start
    token_re = re.compile(r"<div\b|</div>", re.I)
    for m in token_re.finditer(text, div_start):
        if m.group(0).lower().startswith("<div"):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return m.end()
        pos = m.end()
    return pos


def replace_mermaid(body: str) -> tuple[str, str | None]:
    wrapper_match = re.search(
        r'<div\s+class="[^"]*\bmermaid-wrapper\b[^"]*"[^>]*>[\s\S]*?<pre\s+class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)</pre>[\s\S]*?</div>',
        body,
        re.I,
    )
    if wrapper_match:
        code = html_lib.unescape(wrapper_match.group(1)).strip()
        cleaned = (
            body[: wrapper_match.start()]
            + "\n<!-- MERMAID_SLOT -->\n"
            + body[wrapper_match.end() :]
        )
        return cleaned, code

    m = re.search(
        r'<(div|pre)\s+class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)</\1>',
        body,
        re.I,
    )
    if not m:
        return body, None
    code = html_lib.unescape(m.group(2)).strip()
    cleaned = body[: m.start()] + "\n<!-- MERMAID_SLOT -->\n" + body[m.end() :]
    return cleaned, code


def strip_simulator_box(section_id: str, body: str) -> tuple[str, str | None]:
    sim_key = SIMULATOR_SECTION_MAP.get(section_id)
    if not sim_key:
        return body, None

    if sim_key in ("set-cover", "pricing-method"):
        pattern = r'<div\s+class="interactive-stepper"[^>]*>'
    else:
        pattern = r'<div\s+class="interactive-simulator"[^>]*>'

    m = re.search(pattern, body, re.I)
    if not m:
        raise RuntimeError(f"No se encontró caja de simulador en sección {section_id}")

    end_idx = find_matching_closing_div(body, m.start())
    cleaned = body[: m.start()] + "\n<!-- SIMULATOR_SLOT -->\n" + body[end_idx:]
    return cleaned, sim_key


def map_classes(class_attr: str) -> str:
    tokens = class_attr.split()
    mapped: list[str] = []
    tset = set(tokens)

    if "concept-box" in tset:
        mapped.extend(["academic-block", "academic-block--note"])
    if "theorem-box" in tset:
        mapped.extend(["academic-block", "academic-block--theorem"])
    if "interactive-simulator" in tset:
        mapped.extend(["academic-block", "academic-block--example"])
    if "alert" in tset:
        mapped.append("academic-block")
        if "alert-danger" in tset or "alert-warning" in tset:
            mapped.append("academic-block--trap")
        elif "alert-success" in tset:
            mapped.append("academic-block--proof")
        else:
            mapped.append("academic-block--note")
    if "row" in tset:
        mapped.append("card-grid")
    if "card" in tset or ("border" in tset and "rounded" in tset):
        if "academic-block" not in mapped:
            mapped.append("stat-card")
    if "table-responsive" in tset:
        mapped.append("table-scroll")
    if "badge" in tset:
        mapped.append("meta-pill")
    if "topic-header" in tset:
        mapped.append("section-subhead")
    if "card-header" in tset:
        mapped.append("academic-block-title")

    # Eliminar repetidos preservando orden
    out: list[str] = []
    for item in mapped:
        if item not in out:
            out.append(item)
    return " ".join(out)


def clean_html_fragment(fragment: str) -> str:
    # Quitar atributo style="..." inline en todos los elementos
    out = re.sub(r'\s+style="[^"]*"', "", fragment)

    # Remapear atributos class="..." fuera de <code>/<pre>
    def _rewrite_class(m: re.Match[str]) -> str:
        new_cls = map_classes(m.group(1))
        return f' class="{new_cls}"' if new_cls else ""

    out = re.sub(r'\s+class="([^"]*)"', _rewrite_class, out)

    # Envolver <table> dentro de .table-scroll sin duplicar wrappers
    out = re.sub(
        r'(<div\s+class="table-scroll"[^>]*>\s*)?(<table\b[\s\S]*?</table>)',
        lambda m: m.group(0)
        if m.group(1)
        else f'\n<div class="table-scroll">{m.group(2)}</div>',
        out,
        flags=re.I,
    )

    # Añadir marcador de flecha en SVGs que referencian url(#arrow) sin definirlo
    def _ensure_svg_arrow_marker(m: re.Match[str]) -> str:
        svg_tag = m.group(0)
        if 'url(#arrow)' in svg_tag and 'id="arrow"' not in svg_tag:
            defs_block = (
                '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" '
                'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
                '<path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" /></marker></defs>'
            )
            return re.sub(r"(<svg\b[^>]*>)", rf"\1{defs_block}", svg_tag, count=1)
        return svg_tag

    out = re.sub(r"<svg\b[\s\S]*?</svg>", _ensure_svg_arrow_marker, out, flags=re.I)

    # Normalizar delimitadores \(...\) y \[...\] hacia $...$ y $$...$$
    out = re.sub(r"\\\(([^\n]*?)\\\)", r"$\1$", out)
    out = re.sub(r"\\\[([\s\S]*?)\\\]", r"$$\1$$", out)

    # Normalizar < y > matemáticos dentro de $...$ o $$...$$ (evitando etiquetas HTML)
    def _escape_angles_in_math(m: re.Match[str]) -> str:
        tok = m.group(0)
        if re.search(r"</?[a-zA-Z!]", tok):
            return tok
        return tok.replace("<", r"\lt ").replace(">", r"\gt ")

    out = re.sub(
        r"\$\$[\s\S]+?\$\$|\$(?:\\.|[^$\n])+?\$",
        _escape_angles_in_math,
        out,
    )

    # Normalizar \$ -> \dollar dentro del texto matemático
    out = re.sub(r"\\\$(?!\s)", r"\\dollar ", out)
    out = out.replace(r"\$", r"\dollar ")

    # Asegurar ausencia de scripts o handlers JS
    if re.search(r"<script\b|\bon[a-z]+\s*=", out, re.I):
        raise RuntimeError("Se detectó HTML potencialmente inseguro en sección avanzada")

    return out.strip()


def extract_sections() -> list[dict]:
    raw_html = SRC_HTML.read_text(encoding="utf-8")
    sections = re.findall(
        r'<section class="topic-section" id="([^"]+)">([\s\S]*?)</section>',
        raw_html,
    )
    if len(sections) != 17:
        raise RuntimeError(f"Se esperaban 17 secciones, se encontraron {len(sections)}")

    output: list[dict] = []
    for idx, (sec_id, raw_body) in enumerate(sections[:-1], start=1):
        # Extraer el título principal (h1/h2/h3) de la sección
        h_match = re.search(
            r'<h([1-3])[^>]*>([\s\S]*?)</h\1>', raw_body, re.I
        )
        if h_match:
            raw_title = re.sub(r"<[^>]+>", "", h_match.group(2))
            title = " ".join(html_lib.unescape(raw_title).split())
            body_wo_title = (
                raw_body[: h_match.start()] + raw_body[h_match.end() :]
            )
            # Limpiar header wrapper vacío <div class="topic-header"></div>
            body_wo_title = re.sub(
                r'<div\s+class="topic-header"[^>]*>\s*</div>',
                "",
                body_wo_title,
                flags=re.I,
            )
        else:
            title = sec_id
            body_wo_title = raw_body

        # Re-mapear encabezados internos (h5->h3, h4->h3, h6->h4) para respetar h1 -> h2 -> h3 -> h4 sin saltos
        def _remap_heading(m: re.Match[str]) -> str:
            lvl = int(m.group(2))
            mapped = 3 if lvl <= 5 else 4
            return f"<{m.group(1)}h{mapped}"

        body_wo_title = re.sub(
            r"<(/?)h([3-6])\b",
            _remap_heading,
            body_wo_title,
            flags=re.I,
        )

        body_wo_title, mermaid_code = replace_mermaid(body_wo_title)
        body_wo_title, simulator_key = strip_simulator_box(sec_id, body_wo_title)

        cleaned = clean_html_fragment(body_wo_title)
        before_slot, sep, after_slot = cleaned.partition("<!-- SIMULATOR_SLOT -->")
        before_mermaid, msep, after_mermaid = (
            before_slot.partition("<!-- MERMAID_SLOT -->")
            if "<!-- MERMAID_SLOT -->" in before_slot
            else (before_slot, "", "")
        )

        if msep:
            html_parts = [before_mermaid.strip(), after_mermaid.strip()]
        else:
            html_parts = [before_slot.strip()]

        output.append(
            {
                "order": idx,
                "id": sec_id,
                "title": title,
                "htmlBefore": html_parts[0],
                "htmlAfterMermaid": html_parts[1] if len(html_parts) > 1 else "",
                "mermaidCode": mermaid_code,
                "simulator": simulator_key,
                "htmlAfterSimulator": after_slot.strip() if sep else "",
            }
        )

    return output


def main() -> int:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    sections = extract_sections()
    OUT_JSON.write_text(
        json.dumps(sections, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    sims = [s["simulator"] for s in sections if s["simulator"]]
    merms = [s["id"] for s in sections if s["mermaidCode"]]
    print(
        f"Secciones avanzadas exportadas: {len(sections)}, simuladores={sims}, mermaid={merms}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
