"""Migración determinista de los 85 ejercicios del catálogo TDA (builder/sec02..sec09.py)
a src/content/exercises/tda/{paradigm}/ej-{NN}-{slug}.mdx.

Uso:
  python -B scripts/migrate-tda-exercises.py
"""

from __future__ import annotations

import importlib
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILDER_DIR = ROOT / "builder"
EXERCISES_INDEX_PATH = ROOT / "docs" / "manifests" / "tda" / "exercises-index.json"
ASSESSMENTS_PATH = ROOT / "docs" / "manifests" / "tda" / "assessments.json"
RESOURCES_PATH = ROOT / "src" / "content" / "resources" / "tda-resources.json"
OUTPUT_BASE = ROOT / "src" / "content" / "exercises" / "tda"

SECTION_MODULES = [
    "sec02_dyc",
    "sec03_greedy",
    "sec03b_greedy_guia",
    "sec04_backtracking",
    "sec05_dp",
    "sec06_pl",
    "sec07_flujo",
    "sec08_reducciones",
    "sec09_integradores",
]

SOLUTION_MARKER_PATTERNS = [
    r"^####\s+1\.\s+Idea\b",
    r"^####\s+1\.\s+Deducci[oó]n Metodol[oó]gica\b",
    r"^####\s+1\.\s+(?:Resoluci[oó]n|Paradigma|Formulaci[oó]n|Modelo)\b",
    r"^####\s+2\.\s+",
    r"^\*\*Resoluci[oó]n y Comparativa\b",
    r"^\*\*Pseudoc[oó]digo\b",
    r"^\*\*Idea de resoluci[oó]n\b",
    r"^\*\*Modelo Matem[aá]tico\b",
    r"^\*\*Resoluci[oó]n\b",
    r"^\*\*Respuesta y Demostraci[oó]n\b",
    r"^\*\*Demostraci[oó]n\b",
    r"^\*\*Explicaci[oó]n del modelo\b",
    r"^####\s+Resoluci[oó]n\b",
    r"^####\s+Pseudoc[oó]digo\b",
    r"^####\s+Soluci[oó]n\b",
]
SOLUTION_RE = re.compile("|".join(SOLUTION_MARKER_PATTERNS), re.MULTILINE)
TRAILING_SECTION_RE = re.compile(
    r"(?m)^###\s+(?:Patr[oó]n de Ejercicio|Errores Frecuentes|Errores Fatales)\b"
)
TRAP_DIV_RE = re.compile(
    r'<div\s+class="trap-callout">\s*(?:<div\s+class="trap-header">(.*?)</div>)?([\s\S]*?)</div>',
    re.MULTILINE,
)


def slugify(text: str, max_len: int = 44) -> str:
    norm = unicodedata.normalize("NFKD", text)
    ascii_str = norm.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_str).strip("-")
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("-")
    return slug or "ejercicio"


def strip_trailing_hrs(text: str) -> str:
    lines = text.splitlines()
    while lines and (lines[-1].strip() == "---" or not lines[-1].strip()):
        lines.pop()
    while lines and (lines[0].strip() == "---" or not lines[0].strip()):
        lines.pop(0)
    return "\n".join(lines).strip()


def html_fragment_to_markdown(fragment: str) -> str:
    txt = fragment.strip()
    txt = re.sub(r"</?(?:ul|ol)\s*>", "\n", txt)
    txt = re.sub(r"<li\s*>", "\n- ", txt)
    txt = re.sub(r"</li\s*>", "", txt)
    txt = re.sub(r"<p\s*>", "\n\n", txt)
    txt = re.sub(r"</p\s*>", "\n\n", txt)
    txt = re.sub(r"</?strong\s*>", "**", txt)
    txt = re.sub(r"</?em\s*>", "*", txt)
    txt = re.sub(r"</?code\s*>", "`", txt)
    txt = re.sub(r"<br\s*/?>", "\n", txt)
    # Normalizar sangría artificial proveniente de HTML indented
    cleaned_lines = [line.lstrip() for line in txt.splitlines()]
    joined = "\n".join(cleaned_lines)
    joined = re.sub(r"\n{3,}", "\n\n", joined)
    return joined.strip()


def convert_trap_callouts(md_text: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        raw_title = (match.group(1) or "Trampa típica de corrección").strip()
        raw_title = raw_title.lstrip("⚠️ ").strip() or "Trampa típica de corrección"
        body_md = html_fragment_to_markdown(match.group(2))
        safe_title = raw_title.replace('"', "'")
        return (
            f'\n<AcademicBlock kind="trap" title="{safe_title}">\n\n'
            f"{body_md}\n\n"
            "</AcademicBlock>\n"
        )

    return TRAP_DIV_RE.sub(_replace, md_text)


def convert_mermaid_blocks(md_text: str) -> tuple[str, bool]:
    used_mermaid = False

    def _replace(match: re.Match[str]) -> str:
        nonlocal used_mermaid
        used_mermaid = True
        code = match.group(1).strip()
        return f"\n<MermaidDiagram client:visible code={{{json.dumps(code, ensure_ascii=False)}}} />\n"

    out = re.sub(r"```mermaid\s*\n([\s\S]*?)```", _replace, md_text)
    return out, used_mermaid


def escape_pipes_in_table_math(text: str) -> str:
    out_lines: list[str] = []
    for line in text.split("\n"):
        if line.lstrip().startswith("|"):
            line = re.sub(
                r"\$(?:\\.|[^$\n])+?\$",
                lambda m: re.sub(
                    r"\|([^|\n$]+?)\|", r"\\lvert \1 \\rvert", m.group(0)
                ),
                line,
            )
        out_lines.append(line)
    return "\n".join(out_lines)


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
    # Evitar alterar code blocks o inline code al sustituir \$ -> \dollar
    parts = re.split(r"(```[\s\S]*?```|`[^`\n]+`)", text)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r"\\\$(?!\s)", r"\\dollar ", parts[i])
        parts[i] = parts[i].replace(r"\$", r"\dollar ")
        parts[i] = escape_pipes_in_table_math(parts[i])
        parts[i] = normalize_multiline_display_math(parts[i])
    return "".join(parts)


def clean_statement_markdown(raw_statement: str) -> tuple[str, str | None]:
    eval_note: str | None = None
    kept: list[str] = []
    for line in raw_statement.splitlines():
        stripped = line.strip()
        if (
            stripped.startswith("**Clasificación:**")
            or stripped.startswith("**Dificultad:**")
            or stripped.startswith("**Origen:**")
        ):
            continue
        if stripped in ("**Enunciado**", "**Enunciado:**"):
            continue
        if stripped.startswith("**Enunciado:**"):
            line = re.sub(r"^\s*\*\*Enunciado:\*\*\s*", "", line)
        if stripped.startswith("**Qué evalúa la cátedra:**"):
            eval_note = re.sub(
                r"^\*\*Qué evalúa la cátedra:\*\*\s*", "", stripped
            ).strip()
            continue
        kept.append(line)

    stmt = strip_trailing_hrs("\n".join(kept))
    return stmt, eval_note


def sanitize_mdx_text(text: str) -> str:
    text = transform_math_dollars(text)
    text = convert_trap_callouts(text)
    return text


def build_frontmatter(
    meta: dict,
    exam_ids: list[str],
    related_resource_ids: list[str],
) -> str:
    lines = [
        "---",
        f"id: {json.dumps(meta['id'], ensure_ascii=False)}",
        f"courseId: {json.dumps(meta['courseId'], ensure_ascii=False)}",
        f"number: {meta['number']}",
        f"title: {json.dumps(meta['title'], ensure_ascii=False)}",
        f"unit: {json.dumps(meta['paradigm'], ensure_ascii=False)}",
        f"entityType: {json.dumps(meta['entityType'], ensure_ascii=False)}",
        f"provenance: {json.dumps(meta['provenance'], ensure_ascii=False)}",
        f"priority: {json.dumps(meta['priority'], ensure_ascii=False)}",
        f"difficulty: {meta['difficulty']}",
        f"origin: {json.dumps(meta['origin'], ensure_ascii=False)}",
        f"isParcial: {'true' if meta['isParcial'] else 'false'}",
    ]
    if meta["isParcial"] and exam_ids:
        lines.append("examIds:")
        for eid in exam_ids:
            lines.append(f"  - {json.dumps(eid, ensure_ascii=False)}")
    if related_resource_ids:
        lines.append("relatedResourceIds:")
        for rid in related_resource_ids:
            lines.append(f"  - {json.dumps(rid, ensure_ascii=False)}")
    lines.extend(
        [
            f"legacyPage: {json.dumps(meta['legacyPage'], ensure_ascii=False)}",
            f"legacyAnchor: {json.dumps(meta['legacyAnchor'], ensure_ascii=False)}",
            "---",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    exercises_index = json.loads(EXERCISES_INDEX_PATH.read_text(encoding="utf-8"))
    assessments = json.loads(ASSESSMENTS_PATH.read_text(encoding="utf-8"))
    resources_manifest = json.loads(RESOURCES_PATH.read_text(encoding="utf-8"))

    catalog_by_num = {
        item["number"]: item for item in exercises_index["catalogExercises"]
    }
    if set(catalog_by_num.keys()) != set(range(1, 86)):
        raise RuntimeError("El índice no contiene exactamente los ejercicios 1..85")

    exam_ids_by_exercise: dict[str, list[str]] = {}
    exam_pdf_by_exercise: dict[str, list[str]] = {}
    for exam in assessments["exams"]:
        for ex_id in exam.get("catalogExerciseIds", []):
            exam_ids_by_exercise.setdefault(ex_id, []).append(exam["id"])
            if exam.get("pdfResourceId"):
                exam_pdf_by_exercise.setdefault(ex_id, []).append(
                    exam["pdfResourceId"]
                )

    unit_pdf_resources: dict[str, list[str]] = {}
    for res in resources_manifest["resources"]:
        if not res.get("pdfMetadata"):
            continue
        rid = res["resourceId"]
        if res.get("provenance") != "official_source":
            continue
        for slug in res.get("unitSlugs", []):
            if slug != "general":
                unit_pdf_resources.setdefault(slug, []).append(rid)

    sys.path.insert(0, str(BUILDER_DIR))
    parsed_blocks: dict[int, tuple[str, str]] = {}
    for mod_name in SECTION_MODULES:
        mod = importlib.import_module(mod_name)
        raw_md = mod.get_content()
        chunks = re.split(r"(?m)^(?=### Ejercicio \d+\b)", raw_md)
        for chunk in chunks:
            m_hdr = re.match(r"^### Ejercicio (\d+)\b[^\n]*", chunk)
            if not m_hdr:
                continue
            num = int(m_hdr.group(1))
            if num in parsed_blocks:
                raise RuntimeError(f"Ejercicio duplicado #{num} en {mod_name}")
            body = "\n".join(chunk.splitlines()[1:])
            m_tail = TRAILING_SECTION_RE.search(body)
            if m_tail:
                body = body[: m_tail.start()]
            parsed_blocks[num] = (mod_name, strip_trailing_hrs(body))

    if set(parsed_blocks.keys()) != set(range(1, 86)):
        missing = sorted(set(range(1, 86)) - set(parsed_blocks.keys()))
        raise RuntimeError(f"Faltan ejercicios al parsear: {missing}")

    preserved = 0
    written = 0
    mermaid_exercises: list[int] = []
    residual_html_issues: list[str] = []

    for num in range(1, 86):
        meta = catalog_by_num[num]
        ex_id = meta["id"]
        paradigm = meta["paradigm"]
        _mod_name, body = parsed_blocks[num]

        # Conservar el archivo curado manualmente para Ej 18 sin duplicarlo
        if num == 18:
            manual_path = OUTPUT_BASE / "greedy" / "ej-18-ruta-transporte.mdx"
            if manual_path.exists():
                preserved += 1
                continue

        m_sol = SOLUTION_RE.search(body)
        if not m_sol:
            raise RuntimeError(f"No se encontró marcador de solución en EJ {num}")

        raw_stmt = body[: m_sol.start()]
        raw_sol = body[m_sol.start() :]

        stmt_md, eval_note = clean_statement_markdown(raw_stmt)
        stmt_md = sanitize_mdx_text(stmt_md)
        sol_md = sanitize_mdx_text(strip_trailing_hrs(raw_sol))

        stmt_md, used_m_stmt = convert_mermaid_blocks(stmt_md)
        sol_md, used_m_sol = convert_mermaid_blocks(sol_md)
        used_mermaid = used_m_stmt or used_m_sol
        if used_mermaid:
            mermaid_exercises.append(num)

        if not stmt_md.strip():
            raise RuntimeError(f"Enunciado vacío en EJ {num}")
        if not sol_md.strip():
            raise RuntimeError(f"Solución vacía en EJ {num}")

        # Detectar residuos HTML fuera de bloques de código y matemática
        for label, part in (("statement", stmt_md), ("solution", sol_md)):
            probe = re.sub(r"```[\s\S]*?```", "", part)
            probe = re.sub(r"\$\$[\s\S]*?\$\$", "", probe)
            probe = re.sub(r"\$[^$\n]+?\$", "", probe)
            probe = re.sub(r"`[^`\n]+?`", "", probe)
            probe = re.sub(
                r"</?(?:AcademicBlock|SolutionDrawer|MermaidDiagram)\b[^>]*>",
                "",
                probe,
            )
            if re.search(r"<div\b|</div\b|<p\b|</p\b|<ul\b|<li\b", probe, re.I):
                residual_html_issues.append(f"EJ {num} ({label})")

        exam_ids = exam_ids_by_exercise.get(ex_id, [])
        rel_resources: list[str] = []
        for rid in exam_pdf_by_exercise.get(ex_id, []) + unit_pdf_resources.get(
            paradigm, []
        ):
            if rid not in rel_resources:
                rel_resources.append(rid)

        frontmatter = build_frontmatter(meta, exam_ids, rel_resources)
        imports = [
            'import AcademicBlock from "@/components/platform/AcademicBlock";',
            'import SolutionDrawer from "@/components/platform/SolutionDrawer";',
        ]
        if used_mermaid:
            imports.append(
                'import MermaidDiagram from "@/components/platform/MermaidDiagram";'
            )

        blocks = [
            frontmatter,
            "",
            "\n".join(imports),
            "",
            '<AcademicBlock kind="statement" title="Enunciado">',
            "",
            stmt_md.strip(),
            "",
            "</AcademicBlock>",
        ]

        if eval_note:
            clean_eval = transform_math_dollars(eval_note)
            blocks.extend(
                [
                    "",
                    '<AcademicBlock kind="note" title="Qué evalúa la cátedra">',
                    "",
                    clean_eval,
                    "",
                    "</AcademicBlock>",
                ]
            )

        blocks.extend(
            [
                "",
                f'<SolutionDrawer client:load exerciseId="{ex_id}">',
                "",
                sol_md.strip(),
                "",
                "</SolutionDrawer>",
                "",
            ]
        )

        # Remover posibles archivos anteriores para ese número con slug distinto
        target_dir = OUTPUT_BASE / paradigm
        target_dir.mkdir(parents=True, exist_ok=True)
        for old in target_dir.glob(f"ej-{num:02d}-*.mdx"):
            old.unlink()

        out_path = target_dir / f"ej-{num:02d}-{slugify(meta['title'])}.mdx"
        out_path.write_text("\n".join(blocks), encoding="utf-8")
        written += 1

    print(
        f"Migración completada: escritos={written}, preservados={preserved}, "
        f"total_catalogo={written + preserved}, mermaid_ejercicios={len(mermaid_exercises)} ({mermaid_exercises})"
    )
    if residual_html_issues:
        print("ADVERTENCIA residuos HTML:", residual_html_issues)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
