"""Migración determinista de apuntes/resúmenes TDA a src/content/docs/tda/:
- matriz-parciales.mdx (desde builder/sec01_intro_and_matrix.py)
- problema-mochila-y-greedy.mdx (desde DIapositivas/Explicaciones/problema_mochila_y_greedy.md)

Uso:
  python -B scripts/migrate-tda-docs.py
"""

from __future__ import annotations

import importlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILDER_DIR = ROOT / "builder"
DOCS_OUT_DIR = ROOT / "src" / "content" / "docs" / "tda"
MOCHILA_SRC = ROOT / "DIapositivas" / "Explicaciones" / "problema_mochila_y_greedy.md"
ASSESSMENTS_PATH = ROOT / "docs" / "manifests" / "tda" / "assessments.json"


def normalize_multiline_display_math(text: str) -> str:
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m_open = re.match(r"^([ \t]*)\$\$(.*)$", line)
        if m_open and "$$" not in m_open.group(2):
            indent = m_open.group(1)
            first_rest = m_open.group(2).strip()
            block: list[str] = []
            if first_rest:
                block.append(f"{indent}{first_rest}")
            j = i + 1
            closed = False
            while j < len(lines):
                cand = lines[j]
                if "$$" in cand:
                    before_close, _, after_close = cand.partition("$$")
                    if before_close.strip():
                        block.append(f"{indent}{before_close.strip()}")
                    if out and out[-1].strip():
                        out.append("")
                    out.append(f"{indent}$$")
                    out.extend(block)
                    out.append(f"{indent}$$")
                    if after_close.strip():
                        out.append(f"{indent}{after_close.strip()}")
                    out.append("")
                    closed = True
                    i = j + 1
                    break
                if cand.strip():
                    block.append(f"{indent}{cand.lstrip()}")
                j += 1
            if closed:
                continue
        out.append(line)
        i += 1
    return "\n".join(out)


def transform_math_dollars(text: str) -> str:
    parts = re.split(r"(```[\s\S]*?```|`[^`\n]+`)", text)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r"\\\$(?!\s)", r"\\dollar ", parts[i])
        parts[i] = parts[i].replace(r"\$", r"\dollar ")
        parts[i] = normalize_multiline_display_math(parts[i])
    return "".join(parts)


def convert_mermaid_blocks(md_text: str) -> tuple[str, bool]:
    used = False

    def _replace(match: re.Match[str]) -> str:
        nonlocal used
        used = True
        code = match.group(1).strip()
        return f"\n<MermaidDiagram client:visible code={{{json.dumps(code, ensure_ascii=False)}}} />\n"

    out = re.sub(r"```mermaid\s*\n([\s\S]*?)```", _replace, md_text)
    return out, used


def strip_first_h1(md_text: str) -> str:
    lines = md_text.splitlines()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and not line.startswith("## "):
            del lines[idx]
            while idx < len(lines) and not lines[idx].strip():
                del lines[idx]
            break
    return "\n".join(lines).strip()


def migrate_matriz_parciales() -> Path:
    sys.path.insert(0, str(BUILDER_DIR))
    sec01 = importlib.import_module("sec01_intro_and_matrix")
    assessments = json.loads(ASSESSMENTS_PATH.read_text(encoding="utf-8"))
    exam_pdfs = [
        e["pdfResourceId"] for e in assessments["exams"] if e.get("pdfResourceId")
    ]
    related_ids = ["tda-guia-completa-v1", *exam_pdfs]

    body = strip_first_h1(sec01.get_content())
    body = transform_math_dollars(body)
    body, used_mermaid = convert_mermaid_blocks(body)

    # Evitar encabezados sin jerarquía o separación excesiva al final
    body = re.sub(r"\n?---\s*$", "", body.strip())

    frontmatter_lines = [
        "---",
        "docId: matriz-parciales",
        "courseId: tda",
        'title: "Manual Práctico y Matriz de Parciales TDA"',
        "order: 0",
        "entityType: ElaboratedSummary",
        "provenance: elaborated_summary",
        "sectionIds:",
        "  - manual-practico-de-resolucion-de-parciales",
        "  - 1-como-usar-esta-guia",
        "  - 2-radiografia-de-los-parciales-de-tda",
        "  - 3-guia-mental-como-reconocer-el-ejercicio-en-30-segundos",
        "relatedResourceIds:",
        *[f"  - {rid}" for rid in related_ids],
        "legacyPage: index.html",
        "---",
    ]
    if used_mermaid:
        frontmatter_lines.extend(
            [
                'import MermaidDiagram from "@/components/platform/MermaidDiagram";',
                "",
            ]
        )

    out_path = DOCS_OUT_DIR / "matriz-parciales.mdx"
    out_path.write_text(
        "\n".join(frontmatter_lines) + "\n" + body + "\n", encoding="utf-8"
    )
    return out_path


def migrate_problema_mochila() -> Path:
    raw = MOCHILA_SRC.read_text(encoding="utf-8")
    body = strip_first_h1(raw)
    body = transform_math_dollars(body)

    # Redirigir enlaces relativos a PDFs legacy hacia las rutas canónicas del visor
    replacements = {
        "../03a%20-%20Greedy%20I.pdf": "../../materiales/tda-slide-03a-greedy-i/?page=1",
        "../04%20-%20Greedy%20II.pdf": "../../materiales/tda-slide-04-greedy-ii/?page=1",
        "../../Guia-Ejercicios/02_greedy.pdf": "../../materiales/tda-guia-02-greedy/?page=1",
    }
    for old_href, new_href in replacements.items():
        if old_href not in body:
            raise RuntimeError(
                f"No se encontró el enlace esperado {old_href!r} en {MOCHILA_SRC}"
            )
        body = body.replace(old_href, new_href)

    body, used_mermaid = convert_mermaid_blocks(body)

    frontmatter_lines = [
        "---",
        "docId: problema-mochila-y-greedy",
        "courseId: tda",
        'title: "Problema de la Mochila y Algoritmos Voraces (Greedy)"',
        "order: 2",
        "entityType: ElaboratedNote",
        "provenance: elaborated_notes",
        "sectionIds:",
        "  - el-problema-de-la-mochila-y-algoritmos-greedy",
        "  - 1-planteo-general-del-problema-de-la-mochila",
        "  - 2-variante-1-mochila-fraccionaria",
        "  - 3-variante-2-mochila-0-1-entera",
        "relatedResourceIds:",
        "  - tda-slide-03a-greedy-i",
        "  - tda-slide-04-greedy-ii",
        "  - tda-guia-02-greedy",
        "---",
    ]
    if used_mermaid:
        frontmatter_lines.extend(
            [
                'import MermaidDiagram from "@/components/platform/MermaidDiagram";',
                "",
            ]
        )

    out_path = DOCS_OUT_DIR / "problema-mochila-y-greedy.mdx"
    out_path.write_text(
        "\n".join(frontmatter_lines) + "\n" + body + "\n", encoding="utf-8"
    )
    return out_path


def main() -> int:
    DOCS_OUT_DIR.mkdir(parents=True, exist_ok=True)
    p1 = migrate_matriz_parciales()
    p2 = migrate_problema_mochila()
    print(f"Docs migrados correctamente: {p1.name}, {p2.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
