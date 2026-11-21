"""Compilador y Generador Modular de la Guía Interactiva de TDA (GitHub Pages)."""

import argparse
import os
import re
import concurrent.futures
import html_interactive_builder

# Importar los módulos individuales de cada sección
import sec01_intro_and_matrix
import sec02_dyc
import sec03_greedy
import sec03b_greedy_guia
import sec04_backtracking
import sec05_dp
import sec06_pl
import sec07_flujo
import sec08_reducciones
import sec09_integradores
import sec11_errores_checklist

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_FILE = os.path.join(BASE_DIR, "todos.html")

LEGACY_FILENAMES = [
    "guia_tda_parciales.md",
    "guia_tda_parciales.html",
    "guia_tda_parciales.pdf",
]

LEGACY_FILES = [os.path.join(BASE_DIR, fname) for fname in LEGACY_FILENAMES]

PARADIGM_TARGETS = [
    {
        "filename": "dyc.html",
        "title": "División y Conquista (13 Ejercicios)",
        "paradigm_key": "dyc",
        "modules": [sec02_dyc]
    },
    {
        "filename": "greedy.html",
        "title": "Algoritmos Greedy / Voraces (27 Ejercicios)",
        "paradigm_key": "greedy",
        "modules": [sec03_greedy, sec03b_greedy_guia]
    },
    {
        "filename": "backtracking.html",
        "title": "Backtracking y Branch & Bound (15 Ejercicios)",
        "paradigm_key": "backtracking",
        "modules": [sec04_backtracking]
    },
    {
        "filename": "dp.html",
        "title": "Programación Dinámica (8 Ejercicios)",
        "paradigm_key": "dp",
        "modules": [sec05_dp]
    },
    {
        "filename": "pl.html",
        "title": "Programación Lineal y PLI (7 Ejercicios)",
        "paradigm_key": "pl",
        "modules": [sec06_pl]
    },
    {
        "filename": "flujo.html",
        "title": "Redes de Flujo (5 Ejercicios)",
        "paradigm_key": "flujo",
        "modules": [sec07_flujo]
    },
    {
        "filename": "reducciones.html",
        "title": "Reducciones y NP-Completitud (5 Ejercicios)",
        "paradigm_key": "reducciones",
        "modules": [sec08_reducciones]
    },
    {
        "filename": "integradores.html",
        "title": "Problemas Integradores y Multi-Paradigma (5 Ejercicios)",
        "paradigm_key": "integradores",
        "modules": [sec09_integradores]
    },
    {
        "filename": "parciales.html",
        "title": "Exámenes Parciales Oficiales (35 Ejercicios)",
        "paradigm_key": "parciales",
        "modules": [
            sec02_dyc, sec03_greedy, sec03b_greedy_guia,
            sec04_backtracking, sec05_dp, sec06_pl, sec07_flujo, sec08_reducciones,
            sec09_integradores, sec11_errores_checklist
        ]
    }
]

STANDALONE_NAVBAR_PAGES = [
    ("index.html", "home"),
    ("teoria-avanzados.html", "avanzados"),
]


def compute_catalog_counts():
    """Calcula los conteos reales por paradigma, total y parciales desde sec02..sec09.py."""
    counts = {}
    total = 0
    parciales = 0
    for target in PARADIGM_TARGETS:
        key = target["paradigm_key"]
        if key == "parciales":
            continue
        md_content = "\n\n".join(m.get_content() for m in target["modules"])
        blocks = [
            b for b in re.split(r"(?m)^(?=### Ejercicio \d+)", md_content)
            if b.startswith("### Ejercicio ")
        ]
        counts[key] = len(blocks)
        total += len(blocks)
        for block in blocks:
            m = re.search(r"\*\*Origen:\*\*\s*([^\n]+)", block)
            if m and "parcial" in m.group(1).lower():
                parciales += 1
    counts["todos"] = total
    counts["parciales"] = parciales
    return counts


def sync_standalone_page_navbar(source_path, active_paradigm, counts, output_path=None):
    """Sincroniza únicamente <header id='siteNavbar'> en una página HTML standalone."""
    with open(source_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_navbar = html_interactive_builder.get_navbar_html(
        active_paradigm=active_paradigm,
        counts=counts,
    )
    pattern = re.compile(r'<header\b[^>]*\bid="siteNavbar"[^>]*>[\s\S]*?</header>')
    matches = list(pattern.finditer(content))
    if len(matches) != 1:
        raise ValueError(
            f"Se esperaba exactamente 1 <header id='siteNavbar'> en {source_path}, encontrados {len(matches)}"
        )

    updated = pattern.sub(lambda _: new_navbar, content, count=1)
    dest_path = output_path or source_path
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(updated)
    return dest_path


def remove_legacy_files(output_dir=BASE_DIR):
    for fname in LEGACY_FILENAMES:
        path = os.path.join(output_dir, fname)
        if os.path.exists(path):
            os.remove(path)
            print(f"      [Limpieza] Archivo obsoleto eliminado: {os.path.basename(path)}")

def assemble_markdown():
    print("[1/4] Ensamblando secciones en memoria...")
    sections = [
        sec01_intro_and_matrix.get_content(),
        sec02_dyc.get_content(),
        sec03_greedy.get_content(),
        sec03b_greedy_guia.get_content(),
        sec04_backtracking.get_content(),
        sec05_dp.get_content(),
        sec06_pl.get_content(),
        sec07_flujo.get_content(),
        sec08_reducciones.get_content(),
        sec09_integradores.get_content(),
        sec11_errores_checklist.get_content()
    ]
    full_md = "\n\n---\n\n".join(sections)
    full_md = html_interactive_builder.normalize_markdown_lists(full_md)
    print(f"      Total de caracteres ensamblados: {len(full_md):,}")
    print(f"      Total de palabras: {len(full_md.split()):,}")
    return full_md

def verify_markdown(md_text):
    print("[2/4] Verificando integridad del Markdown y catálogo de ejercicios...")
    triple_backticks = md_text.count("```")
    if triple_backticks % 2 != 0:
        raise ValueError(f"Error de formato: Número impar de delimitadores de código (```): {triple_backticks}")
    print(f"      Bloques de código cerrados correctamente: {triple_backticks // 2} bloques.")

    ejercicios = [line for line in md_text.split("\n") if line.startswith("### Ejercicio ")]
    print(f"      Total de ejercicios resueltos encontrados: {len(ejercicios)}")
    return len(ejercicios)

def compile_single_page(target, output_dir=BASE_DIR, nav_counts=None):
    out_path = os.path.join(output_dir, target["filename"])
    sections_md = "\n\n---\n\n".join([m.get_content() for m in target["modules"]])
    html_interactive_builder.build_interactive_html(
        sections_md,
        out_path,
        active_paradigm=target["paradigm_key"],
        page_title=target["title"],
        nav_counts=nav_counts,
    )
    return target["filename"]

def convert_to_html(md_text, output_dir=BASE_DIR, nav_counts=None):
    print("[3/4] Generando aplicación modular HTML con Bootstrap 5.3 y assets externos...")
    nav_counts = nav_counts if nav_counts is not None else compute_catalog_counts()
    index_file = os.path.join(output_dir, "todos.html")
    html_interactive_builder.build_interactive_html(
        md_text,
        index_file,
        active_paradigm="all",
        page_title="Guía Interactiva Completa (85 Ejercicios)",
        nav_counts=nav_counts,
    )
    print(f"      Página maestra generada: {os.path.basename(index_file)}")

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(compile_single_page, target, output_dir, nav_counts): target["filename"] for target in PARADIGM_TARGETS}
        for future in concurrent.futures.as_completed(futures):
            fname = futures[future]
            future.result()
            print(f"      Módulo por paradigma generado: {fname}")

    for fname, active_key in STANDALONE_NAVBAR_PAGES:
        src = os.path.join(BASE_DIR, fname)
        dst = os.path.join(output_dir, fname)
        if os.path.exists(src):
            sync_standalone_page_navbar(src, active_key, nav_counts, output_path=dst)
            print(f"      Navbar sincronizado en vista standalone: {fname}")

def verify_html_line_counts(output_dir=BASE_DIR):
    print("[4/4] Reporte de tamaño y líneas de archivos HTML generados:")
    all_files = ["todos.html"] + [t["filename"] for t in PARADIGM_TARGETS]
    for extra in ("index.html", "teoria-avanzados.html"):
        if os.path.exists(os.path.join(output_dir, extra)):
            all_files.append(extra)
    for fname in all_files:
        fpath = os.path.join(output_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            lines = sum(1 for _ in f)
        size_kb = os.path.getsize(fpath) / 1024
        print(f"      - {fname:<22} : {lines:>5} líneas ({size_kb:>6.1f} KB)")

def main(output_dir=BASE_DIR):
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    print("=" * 70)
    print("INICIANDO CONSTRUCCIÓN DE LA GUÍA INTERACTIVA DE TDA (85 EJERCICIOS)")
    print("=" * 70)
    remove_legacy_files(output_dir=output_dir)
    md_text = assemble_markdown()
    verify_markdown(md_text)
    convert_to_html(md_text, output_dir=output_dir)
    verify_html_line_counts(output_dir=output_dir)
    print("=" * 70)
    print("CONSTRUCCIÓN MODULAR COMPLETADA CON ÉXITO")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compilador modular de la guía interactiva de TDA.")
    parser.add_argument(
        "--output-dir",
        default=BASE_DIR,
        help="Directorio de salida donde se escribirán los HTML y assets/js/catalog-bundle.js."
    )
    args = parser.parse_args()
    main(output_dir=args.output_dir)
