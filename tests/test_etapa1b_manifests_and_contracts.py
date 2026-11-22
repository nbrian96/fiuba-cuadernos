"""Pruebas QA y validación contractual de Etapa 1B: ADRs, contratos y manifiestos de TDA."""

import copy
import html
import json
import os
import pathlib
import re
import sys
import unittest
from pypdf import PdfReader
import markdown

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDER_DIR = os.path.join(BASE_DIR, "builder")
if BUILDER_DIR not in sys.path:
    sys.path.insert(0, BUILDER_DIR)

import build_manual
import html_interactive_builder
import sec11_errores_checklist

VALID_PROVENANCES = {
    "official_source",
    "reconstructed_exam_statement",
    "elaborated_submission",
    "exam_prep_and_practice",
    "elaborated_notes",
    "elaborated_summary",
    "elaborated_solution",
    "advanced_theory_example",
    "interactive_widget",
}

ENTITY_PROVENANCE_MAP = {
    "OfficialSlideDeck": {"official_source"},
    "OfficialCodePackage": {"official_source"},
    "OfficialGuide": {"official_source"},
    "OfficialExamPDF": {"official_source"},
    "ReconstructedExamPDF": {"reconstructed_exam_statement"},
    "OfficialTPAssessment": {"official_source"},
    "ElaboratedTPSubmission": {"elaborated_submission"},
    "CodePractice": {"exam_prep_and_practice"},
    "ElaboratedNote": {"elaborated_notes"},
    "ElaboratedSummary": {"elaborated_summary"},
    "CatalogExercise": {"elaborated_solution"},
    "AdvancedTheoryExercise": {"advanced_theory_example"},
    "InteractiveSimulator": {"interactive_widget"},
}

RESOURCE_ID_RE = re.compile(r"^[a-z0-9-]+$")
MATERIAL_FOLDERS = ("DIapositivas", "Guia-Ejercicios", "Parciales", "Practicas", "TP0")
PROTOTYPE_PDF_PATHS = {
    "materias/tda/DIapositivas/13 - Programación Lineal II.pdf",
    "materias/tda/Guia-Ejercicios/GuiaDeEjercicios-v1.0.pdf",
    "materias/tda/Parciales/TP-2026-2-2.pdf",
    "materias/tda/TP0/TP0_Nelson_Avila_100244.pdf",
}

REQUIRED_ADR_SECTIONS = (
    "## Status",
    "## Context",
    "## Options Considered",
    "## Decision",
    "## Rationale",
    "## Consequences",
    "## Revisit Trigger",
)

VALID_TEXT_LAYER_STATUSES = {"extractable", "sparse", "metadata_fallback"}
REQUIRED_EXAM_FIELDS = (
    "id",
    "courseId",
    "title",
    "date",
    "term",
    "entityType",
    "provenance",
    "pdfResourceId",
    "catalogExerciseIds",
    "notes",
)
REQUIRED_TP_FIELDS = (
    "id",
    "courseId",
    "title",
    "entityType",
    "provenance",
    "preservedIntact",
    "resourceIds",
    "notes",
)


def _exists_case_sensitive(base_dir: str, rel_path: str) -> bool:
    """Verifica existencia segmento por segmento respetando mayúsculas y minúsculas."""
    if not rel_path or rel_path.startswith("/") or "\\" in rel_path:
        return False
    cur = os.path.abspath(base_dir)
    for seg in rel_path.split("/"):
        if seg in ("", ".", ".."):
            return False
        if not os.path.isdir(cur) or seg not in os.listdir(cur):
            return False
        cur = os.path.join(cur, seg)
    return os.path.isfile(cur)


def _collect_physical_material_files(base_dir: str, course_id: str = "tda") -> list[str]:
    """Recopila todos los archivos reales de las 5 carpetas académicas bajo materias/<courseId>/ en orden estable."""
    found = []
    root = pathlib.Path(base_dir)
    for folder in MATERIAL_FOLDERS:
        folder_path = root / "materias" / course_id / folder
        if not folder_path.is_dir():
            continue
        for p in sorted(folder_path.rglob("*"), key=lambda x: x.relative_to(root).as_posix()):
            if p.is_file():
                found.append(p.relative_to(root).as_posix())
    return found


def validate_adr_document(adr_text: str, filename: str = "adr.md") -> None:
    """Valida orden estricto de secciones nivel 2 y estado Accepted en un ADR."""
    found_h2 = re.findall(r"^##\s+.*$", adr_text, flags=re.MULTILINE)
    if found_h2 != list(REQUIRED_ADR_SECTIONS):
        raise ValueError(
            f"[{filename}] Encabezados H2 inválidos o desordenados: {found_h2} != {list(REQUIRED_ADR_SECTIONS)}."
        )
    status_match = re.search(r"^## Status\s*\r?\n([^\r\n]+)", adr_text, flags=re.MULTILINE)
    if not status_match or not status_match.group(1).strip().startswith("Accepted"):
        raise ValueError(f"[{filename}] El estado del ADR debe comenzar con 'Accepted'.")


def validate_resources_manifest(
    data: dict,
    base_dir: str,
    valid_unit_slugs: set[str] | None = None,
) -> dict:
    """Valida integridad estructural, provenance, casing, pdfMetadata y correspondencia 1-a-1 con disco."""
    if not isinstance(data, dict) or not isinstance(data.get("resources"), list):
        raise ValueError("El manifiesto resources.json debe contener un arreglo 'resources'.")
    if data.get("schemaVersion") != "1.0.0" or not data.get("courseId"):
        raise ValueError("resources.json debe declarar schemaVersion='1.0.0' y courseId no vacío.")

    seen_ids = set()
    seen_paths = {}
    pdf_count = 0
    non_pdf_count = 0
    prototype_paths = set()
    preserved_tp0_count = 0

    for res in data["resources"]:
        res_id = res.get("resourceId", "")
        if not RESOURCE_ID_RE.match(res_id):
            raise ValueError(f"resourceId inválido '{res_id}': debe cumplir ^[a-z0-9-]+$.")
        if res_id in seen_ids:
            raise ValueError(f"resourceId duplicado detectado: '{res_id}'.")
        seen_ids.add(res_id)

        if res.get("courseId") != data.get("courseId") or not res.get("title"):
            raise ValueError(f"[{res_id}] 'courseId' o 'title' inválido.")

        source_folder = res.get("sourceFolder")
        if source_folder not in MATERIAL_FOLDERS:
            raise ValueError(f"[{res_id}] 'sourceFolder' inválido: {source_folder!r}.")

        etype = res.get("entityType")
        prov = res.get("provenance")
        if prov not in VALID_PROVENANCES:
            raise ValueError(f"[{res_id}] Provenance desconocida: '{prov}'.")
        if etype not in ENTITY_PROVENANCE_MAP:
            raise ValueError(f"[{res_id}] EntityType desconocido: '{etype}'.")
        if prov not in ENTITY_PROVENANCE_MAP[etype]:
            raise ValueError(f"[{res_id}] Incompatibilidad entityType='{etype}' con provenance='{prov}'.")

        unit_slugs = res.get("unitSlugs")
        if not isinstance(unit_slugs, list) or not unit_slugs:
            raise ValueError(f"[{res_id}] 'unitSlugs' debe ser una lista no vacía.")
        if valid_unit_slugs is not None and any(u not in valid_unit_slugs for u in unit_slugs):
            raise ValueError(f"[{res_id}] 'unitSlugs' contiene unidad desconocida: {unit_slugs}.")

        files = res.get("files")
        if not isinstance(files, list) or not files:
            raise ValueError(f"[{res_id}] 'files' debe contener al menos un archivo.")

        has_pdf = False
        course_id = data.get("courseId", "tda")
        expected_prefix_materias = f"materias/{course_id}/{source_folder}/"
        expected_prefix = f"{course_id}/{source_folder}/"
        for fentry in files:
            fpath = fentry.get("path", "")
            if not (fpath.startswith(expected_prefix_materias) or fpath.startswith(expected_prefix) or fpath.startswith(source_folder + "/")):
                raise ValueError(f"[{res_id}] Ruta '{fpath}' no coincide con '{expected_prefix_materias}'.")
            if not _exists_case_sensitive(base_dir, fpath):
                raise ValueError(f"[{res_id}] Ruta inexistente o con casing incorrecto en disco: '{fpath}'.")
            if fpath in seen_paths:
                raise ValueError(f"[{res_id}] Archivo duplicado en manifiesto: '{fpath}' (ya en '{seen_paths[fpath]}').")
            seen_paths[fpath] = res_id

            actual_ext = pathlib.Path(fpath).suffix.lower()
            if fentry.get("extension") != actual_ext:
                raise ValueError(f"[{res_id}] Extensión declarada '{fentry.get('extension')}' != '{actual_ext}'.")
            is_pdf = fentry.get("isPdf")
            if not isinstance(is_pdf, bool) or is_pdf != (actual_ext == ".pdf"):
                raise ValueError(f"[{res_id}] Campo 'isPdf' incoherente para '{fpath}'.")

            if is_pdf:
                has_pdf = True
                pdf_count += 1
            else:
                non_pdf_count += 1
            if source_folder == "TP0" and res.get("preservedIntact") is True:
                preserved_tp0_count += 1

        if has_pdf:
            pmeta = res.get("pdfMetadata")
            if not isinstance(pmeta, dict):
                raise ValueError(f"[{res_id}] Recurso PDF sin bloque 'pdfMetadata'.")
            if not isinstance(pmeta.get("pageCount"), int) or pmeta["pageCount"] < 1:
                raise ValueError(f"[{res_id}] 'pageCount' inválido en pdfMetadata.")
            if not isinstance(pmeta.get("textChars"), int) or pmeta["textChars"] < 0:
                raise ValueError(f"[{res_id}] 'textChars' inválido en pdfMetadata.")
            if not isinstance(pmeta.get("emptyPages"), int) or pmeta["emptyPages"] < 0:
                raise ValueError(f"[{res_id}] 'emptyPages' inválido en pdfMetadata.")
            if pmeta.get("textLayerStatus") not in VALID_TEXT_LAYER_STATUSES:
                raise ValueError(f"[{res_id}] 'textLayerStatus' inválido: {pmeta.get('textLayerStatus')!r}.")
            if not isinstance(pmeta.get("inPagefindPrototype"), bool):
                raise ValueError(f"[{res_id}] 'inPagefindPrototype' debe ser booleano.")
            if pmeta["inPagefindPrototype"]:
                for fentry in files:
                    if fentry["isPdf"]:
                        prototype_paths.add(fentry["path"])
        elif "pdfMetadata" in res:
            raise ValueError(f"[{res_id}] Recurso no-PDF no debe declarar 'pdfMetadata'.")

    summary = data.get("summary")
    if isinstance(summary, dict):
        expected_summary = {
            "totalResources": len(seen_ids),
            "totalPhysicalFiles": len(seen_paths),
            "totalPdfs": pdf_count,
            "totalNonPdfs": non_pdf_count,
            "pagefindPrototypePdfCount": len(prototype_paths),
            "preservedTp0FilesCount": preserved_tp0_count,
        }
        if summary != expected_summary:
            raise ValueError(f"Resumen inconsistente en resources.json: {summary} != {expected_summary}.")

    physical_files = _collect_physical_material_files(base_dir)
    manifest_set = set(seen_paths.keys())
    physical_set = set(physical_files)
    missing = sorted(physical_set - manifest_set)
    orphan = sorted(manifest_set - physical_set)
    if missing:
        raise ValueError(f"Archivos físicos en disco omitidos en resources.json: {missing}")
    if orphan:
        raise ValueError(f"Archivos en resources.json que no pertenecen al inventario físico: {orphan}")

    return {
        "totalResources": len(seen_ids),
        "totalFiles": len(seen_paths),
        "pdfCount": pdf_count,
        "nonPdfCount": non_pdf_count,
        "prototypePaths": prototype_paths,
    }


def validate_exercises_manifest(data: dict) -> dict:
    """Valida unicidad, rango 1..85, diferenciación avanzada, summary y conteo de parciales."""
    catalog = data.get("catalogExercises", [])
    advanced = data.get("advancedExercises", [])

    seen_nums = set()
    seen_ids = set()
    parcial_ids = set()
    imprescindible_count = 0
    importante_count = 0

    for ex in catalog:
        ex_id = ex.get("id", "")
        num = ex.get("number")
        if not isinstance(num, int) or isinstance(num, bool) or not (1 <= num <= 85):
            raise ValueError(f"[{ex_id}] Número de ejercicio fuera de rango 1..85: {num!r}.")
        if num in seen_nums:
            raise ValueError(f"Número de ejercicio duplicado en catálogo: {num}.")
        if ex_id in seen_ids:
            raise ValueError(f"ID de ejercicio duplicado: '{ex_id}'.")
        if ex.get("provenance") != "elaborated_solution" or ex.get("entityType") != "CatalogExercise":
            raise ValueError(f"[{ex_id}] Procedencia o entidad inválida para ejercicio de catálogo.")
        seen_nums.add(num)
        seen_ids.add(ex_id)
        if ex.get("isParcial"):
            parcial_ids.add(ex_id)
        if ex.get("priority") == "imprescindible":
            imprescindible_count += 1
        elif ex.get("priority") == "importante":
            importante_count += 1
        else:
            raise ValueError(f"[{ex_id}] Prioridad inválida: {ex.get('priority')!r}.")

    if seen_nums != set(range(1, 86)):
        missing = sorted(set(range(1, 86)) - seen_nums)
        raise ValueError(f"El catálogo oficial debe cubrir exactamente 1..85; faltan: {missing}.")

    for adv in advanced:
        adv_id = adv.get("id", "")
        if adv.get("number") is not None:
            raise ValueError(f"[{adv_id}] Los ejercicios avanzados deben tener number=None.")
        if adv_id in seen_ids:
            raise ValueError(f"ID duplicado en ejercicios avanzados: '{adv_id}'.")
        if adv.get("provenance") != "advanced_theory_example" or adv.get("entityType") != "AdvancedTheoryExercise":
            raise ValueError(f"[{adv_id}] Procedencia o entidad inválida para ejercicio avanzado.")
        seen_ids.add(adv_id)

    expected_summary = {
        "catalogCount": len(catalog),
        "parcialCount": len(parcial_ids),
        "imprescindibleCount": imprescindible_count,
        "importanteCount": importante_count,
        "advancedCount": len(advanced),
    }
    if data.get("summary") != expected_summary:
        raise ValueError(f"Resumen inconsistente en exercises-index.json: {data.get('summary')} != {expected_summary}.")

    return {"catalogCount": len(catalog), "parcialIds": parcial_ids, "advancedCount": len(advanced)}


def validate_assessments_manifest(assessments_data: dict, resources_data: dict, exercises_data: dict) -> None:
    """Valida campos obligatorios, integridad bidireccional con resources.json y reconciliación de 35 parciales."""
    course_id = assessments_data.get("courseId")
    if assessments_data.get("schemaVersion") != "1.0.0" or not course_id:
        raise ValueError("assessments.json debe declarar schemaVersion='1.0.0' y courseId no vacío.")

    resources_by_id = {r["resourceId"]: r for r in resources_data["resources"]}
    catalog_by_id = {e["id"]: e for e in exercises_data["catalogExercises"]}
    expected_parcial_ids = {e["id"] for e in exercises_data["catalogExercises"] if e["isParcial"]}

    assigned_in_exams = set()
    assessment_ids = set()
    linked_resource_ids = {}

    for exam in assessments_data.get("exams", []):
        for field in REQUIRED_EXAM_FIELDS:
            if field not in exam or exam[field] in (None, ""):
                raise ValueError(f"[{exam.get('id')}] Falta el campo obligatorio '{field}' en ExamEntry.")
        if exam["courseId"] != course_id:
            raise ValueError(f"[{exam['id']}] 'courseId' inválido: {exam['courseId']!r}.")
        etype = exam["entityType"]
        prov = exam["provenance"]
        if etype not in {"OfficialExamPDF", "ReconstructedExamPDF"}:
            raise ValueError(f"[{exam['id']}] entityType inválido para examen: {etype!r}.")
        if prov not in ENTITY_PROVENANCE_MAP[etype]:
            raise ValueError(f"[{exam['id']}] Incompatibilidad entityType='{etype}' con provenance='{prov}'.")
        pdf_rid = exam["pdfResourceId"]
        if pdf_rid not in resources_by_id:
            raise ValueError(f"[{exam['id']}] pdfResourceId inexistente: '{pdf_rid}'.")
        assessment_ids.add(exam["id"])
        linked_resource_ids[pdf_rid] = exam["id"]

        for ex_id in exam["catalogExerciseIds"]:
            if ex_id not in catalog_by_id:
                raise ValueError(f"[{exam['id']}] Ejercicio inexistente: '{ex_id}'.")
            if not catalog_by_id[ex_id]["isParcial"]:
                raise ValueError(f"[{exam['id']}] Ejercicio '{ex_id}' no está marcado como isParcial=true.")
            assigned_in_exams.add(ex_id)

    unassigned = set()
    for ex_id in assessments_data.get("unassignedGenericParcialExerciseIds", []):
        if ex_id not in catalog_by_id or not catalog_by_id[ex_id]["isParcial"]:
            raise ValueError(f"unassignedGenericParcialExerciseIds contiene ID inválido: '{ex_id}'.")
        if ex_id in assigned_in_exams:
            raise ValueError(f"'{ex_id}' aparece simultáneamente en exams[] y en unassignedGenericParcialExerciseIds.")
        unassigned.add(ex_id)

    reconciled_ids = assigned_in_exams | unassigned
    if reconciled_ids != expected_parcial_ids:
        missing = sorted(expected_parcial_ids - reconciled_ids)
        extra = sorted(reconciled_ids - expected_parcial_ids)
        raise ValueError(f"Desajuste de parciales: faltan={missing}, sobran={extra}.")

    for tp in assessments_data.get("practicalWorks", []):
        for field in REQUIRED_TP_FIELDS:
            if field not in tp or tp[field] is None or tp[field] == "":
                raise ValueError(f"[{tp.get('id')}] Falta el campo obligatorio '{field}' en PracticalWorkEntry.")
        if tp["courseId"] != course_id:
            raise ValueError(f"[{tp['id']}] 'courseId' inválido: {tp['courseId']!r}.")
        etype = tp["entityType"]
        prov = tp["provenance"]
        if etype not in {"OfficialTPAssessment", "ElaboratedTPSubmission"}:
            raise ValueError(f"[{tp['id']}] entityType inválido en practicalWorks: {etype!r}.")
        if prov not in ENTITY_PROVENANCE_MAP[etype]:
            raise ValueError(f"[{tp['id']}] Incompatibilidad entityType='{etype}' con provenance='{prov}'.")
        if not isinstance(tp["resourceIds"], list) or not tp["resourceIds"]:
            raise ValueError(f"[{tp['id']}] 'resourceIds' debe ser una lista no vacía.")
        assessment_ids.add(tp["id"])
        for rid in tp["resourceIds"]:
            if rid not in resources_by_id:
                raise ValueError(f"[{tp['id']}] resourceId inexistente en practicalWorks: '{rid}'.")
            linked_resource_ids[rid] = tp["id"]

    # Consistencia bidireccional de assessmentId entre resources.json y assessments.json
    for rid, res in resources_by_id.items():
        res_aid = res.get("assessmentId")
        if res_aid is not None and res_aid not in assessment_ids:
            raise ValueError(f"[{rid}] assessmentId '{res_aid}' no existe en assessments.json.")
    for rid, expected_aid in linked_resource_ids.items():
        if resources_by_id[rid].get("assessmentId") != expected_aid:
            raise ValueError(
                f"[{rid}] Desajuste bidireccional: resources.json tiene assessmentId="
                f"{resources_by_id[rid].get('assessmentId')!r}, esperado {expected_aid!r}."
            )


class TestEtapa1BManifestsAndContracts(unittest.TestCase):
    """Suite de verificación read-only para entregables de Etapa 1B."""

    @classmethod
    def setUpClass(cls):
        manifests_dir = pathlib.Path(BASE_DIR) / "docs" / "manifests" / "tda"
        cls.course = json.loads((manifests_dir / "course.json").read_text(encoding="utf-8"))
        cls.resources = json.loads((manifests_dir / "resources.json").read_text(encoding="utf-8"))
        cls.assessments = json.loads((manifests_dir / "assessments.json").read_text(encoding="utf-8"))
        cls.exercises = json.loads((manifests_dir / "exercises-index.json").read_text(encoding="utf-8"))
        cls.interactive = json.loads((manifests_dir / "interactive-and-notes.json").read_text(encoding="utf-8"))

    def test_adrs_and_contracts_exist_with_required_sections(self):
        """Verifica ADRs 001..004, README de arquitectura y contratos de dominio/almacenamiento."""
        arch_dir = pathlib.Path(BASE_DIR) / "docs" / "architecture"
        contracts_dir = pathlib.Path(BASE_DIR) / "docs" / "contracts"

        self.assertTrue((arch_dir / "README.md").is_file(), "Falta docs/architecture/README.md.")
        adr_files = [
            "adr-001-astro-core.md",
            "adr-002-unified-astro-layouts.md",
            "adr-003-academic-content-model.md",
            "adr-004-pagefind-pdf-indexing.md",
        ]
        for fname in adr_files:
            fpath = arch_dir / fname
            self.assertTrue(fpath.is_file(), f"Falta el ADR {fname}.")
            validate_adr_document(fpath.read_text(encoding="utf-8"), fname)

        adr2_text = (arch_dir / "adr-002-unified-astro-layouts.md").read_text(encoding="utf-8")
        self.assertIn("Opción A", adr2_text)
        self.assertIn("Starlight", adr2_text)
        self.assertIn("!important", adr2_text)

        adr3_text = (arch_dir / "adr-003-academic-content-model.md").read_text(encoding="utf-8")
        self.assertIn("TP0/", adr3_text)
        self.assertIn("tda-adv-aprox-2partition", adr3_text)
        self.assertIn("tda-adv-rand-nreinas", adr3_text)

        adr4_text = (arch_dir / "adr-004-pagefind-pdf-indexing.md").read_text(encoding="utf-8")
        self.assertIn("addCustomRecord()", adr4_text)
        self.assertIn("{BASE_URL}/{course}/materiales/{resourceId}?page={N}", adr4_text)
        self.assertIn("1,264", adr4_text)
        for proto_path in PROTOTYPE_PDF_PATHS:
            short_proto = proto_path.removeprefix("materias/tda/")
            self.assertTrue(
                proto_path in adr4_text or short_proto in adr4_text,
                f"ADR-004 debe mencionar el PDF prototipo '{short_proto}'.",
            )

        domain_path = contracts_dir / "domain-schemas.md"
        storage_path = contracts_dir / "local-storage-migration.md"
        self.assertTrue(domain_path.is_file(), "Falta docs/contracts/domain-schemas.md.")
        self.assertTrue(storage_path.is_file(), "Falta docs/contracts/local-storage-migration.md.")

        domain_text = domain_path.read_text(encoding="utf-8")
        for prov in VALID_PROVENANCES:
            self.assertIn(prov, domain_text, f"domain-schemas.md debe documentar provenance '{prov}'.")
        for etype in ENTITY_PROVENANCE_MAP:
            self.assertIn(etype, domain_text, f"domain-schemas.md debe documentar EntityType '{etype}'.")
        for legacy_html in self.course["legacyRoutes"]:
            self.assertIn(legacy_html, domain_text, f"domain-schemas.md debe mapear '{legacy_html}'.")
        self.assertIn("ExercisesIndexManifest", domain_text)
        self.assertIn("InteractiveAndNotesManifest", domain_text)

    def test_resources_manifest_matches_96_physical_files_case_sensitive(self):
        """Verifica correspondencia 1-a-1 case-sensitive con 96 archivos, 49 PDFs, TP0 y Prácticas."""
        valid_units = {u["slug"] for u in self.course["units"]} | {"general"}
        stats = validate_resources_manifest(self.resources, BASE_DIR, valid_unit_slugs=valid_units)
        self.assertEqual(stats["totalFiles"], 96, f"Se esperaban 96 archivos físicos, obtenidos {stats['totalFiles']}.")
        self.assertEqual(stats["pdfCount"], 49, f"Se esperaban 49 PDFs, obtenidos {stats['pdfCount']}.")
        self.assertEqual(stats["nonPdfCount"], 47, f"Se esperaban 47 archivos no-PDF, obtenidos {stats['nonPdfCount']}.")
        self.assertEqual(
            stats["prototypePaths"],
            PROTOTYPE_PDF_PATHS,
            "Los 4 PDFs marcados inPagefindPrototype deben coincidir exactamente con ADR-004.",
        )

        folder_counts = {}
        tp0_resources = []
        practice_statuses = {"solved": 0, "todo": 0, "guide": 0}
        total_pdf_pages = 0

        for res in self.resources["resources"]:
            folder = res["sourceFolder"]
            folder_counts[folder] = folder_counts.get(folder, 0) + len(res["files"])
            if folder == "TP0":
                tp0_resources.append(res)
                self.assertTrue(res.get("preservedIntact") is True, f"[{res['resourceId']}] TP0 debe tener preservedIntact=true.")
            if res["entityType"] == "CodePractice":
                st = res.get("practiceStatus")
                self.assertIn(st, practice_statuses, f"[{res['resourceId']}] practiceStatus inválido: {st!r}.")
                practice_statuses[st] += 1

            for fentry in res["files"]:
                if fentry["isPdf"]:
                    reader = PdfReader(os.path.join(BASE_DIR, fentry["path"]))
                    actual_pages = len(reader.pages)
                    actual_chars = 0
                    actual_empty = 0
                    for pg in reader.pages:
                        txt = (pg.extract_text() or "").strip()
                        actual_chars += len(txt)
                        if len(txt) < 20:
                            actual_empty += 1
                    pmeta = res["pdfMetadata"]
                    self.assertEqual(actual_pages, pmeta["pageCount"], f"[{res['resourceId']}] pageCount desfasado.")
                    self.assertEqual(actual_chars, pmeta["textChars"], f"[{res['resourceId']}] textChars desfasado.")
                    self.assertEqual(actual_empty, pmeta["emptyPages"], f"[{res['resourceId']}] emptyPages desfasado.")
                    total_pdf_pages += actual_pages

        self.assertEqual(total_pdf_pages, 1264)
        self.assertEqual(
            folder_counts,
            {"DIapositivas": 52, "Guia-Ejercicios": 10, "Parciales": 7, "Practicas": 21, "TP0": 6},
        )
        self.assertEqual(len(tp0_resources), 4)
        self.assertEqual(practice_statuses, {"solved": 1, "todo": 19, "guide": 1})

    def test_exercises_index_parity_with_builder_and_teoria_avanzados(self):
        """Verifica paridad 85/85 con sec02..sec09.py y los 2 ejercicios avanzados de teoria-avanzados.html."""
        summary = validate_exercises_manifest(self.exercises)
        self.assertEqual(summary["catalogCount"], 85)
        self.assertEqual(len(summary["parcialIds"]), 35)
        self.assertEqual(summary["advancedCount"], 2)

        parsed_by_num = {}
        for target in build_manual.PARADIGM_TARGETS:
            if target["paradigm_key"] == "parciales":
                continue
            for mod in target["modules"]:
                blocks = [b for b in re.split(r"(?m)^(?=### Ejercicio \d+)", mod.get_content()) if b.startswith("### Ejercicio ")]
                for b in blocks:
                    m = re.match(r"### Ejercicio (\d+)\s*[:—\-–]\s*(.*)", b.splitlines()[0])
                    num = int(m.group(1))
                    om = re.search(r"\*\*Origen:\*\*\s*([^\n]+)", b)
                    origin = om.group(1).strip() if om else ""
                    dm = re.search(r"\*\*Dificultad:\*\*\s*([^\n]+)", b)
                    diff_raw = dm.group(1) if dm else ""
                    nm = re.search(r"\(([1-5])/5\)", diff_raw)
                    diff = int(nm.group(1)) if nm else max(1, min(5, diff_raw.count("★") or 3))
                    parsed_by_num[num] = {
                        "title": m.group(2).strip(),
                        "paradigm": html_interactive_builder.get_paradigm_for_exercise(num)[0],
                        "priority": "imprescindible" if "🔴 IMPRESCINDIBLE" in b else "importante",
                        "difficulty": diff,
                        "origin": origin,
                        "isParcial": "parcial" in origin.lower(),
                        "sourceModule": f"builder/{mod.__name__}.py",
                    }

        for ex in self.exercises["catalogExercises"]:
            num = ex["number"]
            expected = parsed_by_num[num]
            for field in ("title", "paradigm", "priority", "difficulty", "origin", "isParcial", "sourceModule"):
                self.assertEqual(ex[field], expected[field], f"[Ej {num}] Campo '{field}' difiere del builder.")
            self.assertEqual(ex["legacyPage"], f"{expected['paradigm']}.html")
            self.assertEqual(ex["legacyAnchor"], f"#ej-{num}")

        adv_dir = pathlib.Path(BASE_DIR) / "src" / "content" / "exercises" / "tda" / "avanzados"
        adv_mdx_texts = "\n".join(p.read_text(encoding="utf-8") for p in sorted(adv_dir.glob("*.mdx")))

        adv_ids = [a["id"] for a in self.exercises["advancedExercises"]]
        self.assertEqual(adv_ids, ["tda-adv-aprox-2partition", "tda-adv-rand-nreinas"])
        self.assertIn("2-Partition Problem", adv_mdx_texts)
        self.assertIn("Las Vegas", adv_mdx_texts)

    def test_course_units_views_and_legacy_routes_parity(self):
        """Verifica coherencia de units[], views[] y legacyRoutes de course.json contra disco y ejercicios."""
        counts_by_unit = {}
        for ex in self.exercises["catalogExercises"]:
            counts_by_unit[ex["paradigm"]] = counts_by_unit.get(ex["paradigm"], 0) + 1
        for adv in self.exercises["advancedExercises"]:
            counts_by_unit[adv["paradigm"]] = counts_by_unit.get(adv["paradigm"], 0) + 1

        self.assertEqual(len(self.course["units"]), 9)
        for unit in self.course["units"]:
            self.assertEqual(unit["exerciseCount"], counts_by_unit[unit["slug"]], f"[{unit['slug']}] Conteo desfasado.")
            self.assertIn(unit["legacyRoute"], self.course["legacyRoutes"])

        self.assertEqual(len(self.course["legacyRoutes"]), 12)
        for legacy_html, target_route in self.course["legacyRoutes"].items():
            self.assertTrue(legacy_html.endswith(".html"), f"Ruta legacy inválida: '{legacy_html}'.")
            self.assertTrue(target_route.startswith("/tda/"), f"Ruta destino inválida: '{target_route}'.")

        views_by_slug = {v["slug"]: v for v in self.course["views"]}
        self.assertEqual(views_by_slug["todos"]["exerciseCount"], 85)
        self.assertEqual(views_by_slug["parciales"]["exerciseCount"], 35)

    def test_assessments_manifest_reconciles_exams_tp0_and_35_parcial_exercises(self):
        """Verifica los 6 parciales oficiales, 1 reconstruido, 2 TP0 y los 35 ejercicios de parcial."""
        validate_assessments_manifest(self.assessments, self.resources, self.exercises)

        exams = self.assessments["exams"]
        self.assertEqual(len(exams), 7)
        official_exams = [e for e in exams if e["provenance"] == "official_source"]
        reconstructed_exams = [e for e in exams if e["provenance"] == "reconstructed_exam_statement"]
        self.assertEqual(len(official_exams), 6)
        self.assertEqual(len(reconstructed_exams), 1)
        self.assertEqual(reconstructed_exams[0]["pdfResourceId"], "tda-parcial-2026-2-2-pdf")
        self.assertEqual(reconstructed_exams[0]["entityType"], "ReconstructedExamPDF")

        tp_works = self.assessments["practicalWorks"]
        self.assertEqual([tp["id"] for tp in tp_works], ["tda-tp0-official", "tda-tp0-submission"])
        self.assertTrue(all(tp.get("preservedIntact") is True for tp in tp_works))

    def test_interactive_notes_checklist_and_localstorage_parity(self):
        """Verifica 6 widgets, 17 secciones avanzadas (id+título), 11 chk_ (id+label), drawer y 4 claves localStorage."""
        app_js = (pathlib.Path(BASE_DIR) / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        adv_sections = json.loads(
            (pathlib.Path(BASE_DIR) / "src" / "data" / "tdaAdvancedSections.json").read_text(encoding="utf-8")
        )
        adv_page = (
            pathlib.Path(BASE_DIR) / "src" / "pages" / "[course]" / "avanzados" / "index.astro"
        ).read_text(encoding="utf-8")

        widgets = self.interactive["widgets"]
        self.assertEqual(len(widgets), 6)
        trainer = next(w for w in widgets if w["id"] == "tda-widget-entrenador-30s")
        actual_prompts = re.findall(r'^\s*prompt:\s*"', app_js, flags=re.MULTILINE)
        self.assertEqual(len(actual_prompts), 20)
        self.assertEqual(trainer["questionCount"], 20)
        for handler in trainer["handlers"]:
            self.assertIn(f"function {handler}(", app_js)

        sim_by_anchor = {
            "set-cover": "SetCoverSimulator",
            "pricing-method": "PricingMethodSimulator",
            "karger-mincut": "KargerMinCutSimulator",
            "max-3sat": "Max3SatSimulator",
            "streaming-conteo": "HamletStreamingSimulator",
        }
        sec_ids_json = {s["id"] for s in adv_sections}
        for sim in [w for w in widgets if w["id"] != "tda-widget-entrenador-30s"]:
            sec_id = sim["legacyAnchor"].lstrip("#")
            self.assertIn(sec_id, sec_ids_json, f"Falta sección '{sec_id}' en tdaAdvancedSections.json.")
            self.assertIn(sim_by_anchor[sec_id], adv_page, f"Falta componente simulador para '{sec_id}' en avanzados/index.astro.")

        notes = self.interactive["notes"]
        self.assertEqual(len(notes), 2)
        md_note = next(n for n in notes if n["id"] == "tda-note-mochila-greedy")
        self.assertTrue(_exists_case_sensitive(BASE_DIR, md_note["sourceFile"]))

        adv_note = next(n for n in notes if n["id"] == "tda-note-teoria-avanzados")
        actual_sections = [{"id": s["id"], "title": s["title"]} for s in adv_sections] + [
            {"id": "ejercicios-clase", "title": "16. Ejercicios Propuestos de Clase Resueltos Paso a Paso"}
        ]
        self.assertEqual(len(actual_sections), 17)
        self.assertEqual(adv_note["sections"], actual_sections)

        summaries = self.interactive["summaries"]
        self.assertEqual(len(summaries), 3)
        sec11_html = markdown.markdown(sec11_errores_checklist.get_content())
        expected_seen = {}
        html_interactive_builder.replace_checklist_items(sec11_html, seen_ids=expected_seen)
        expected_items = []
        for chk_id, composite in expected_seen.items():
            sec_id, idx_str, raw_lbl = composite.split(":", 2)
            expected_items.append({
                "id": chk_id,
                "sectionId": sec_id,
                "itemIndex": int(idx_str),
                "label": html.unescape(re.sub(r"<[^>]+>", "", raw_lbl).strip()),
            })
        checklist_summary = next(s for s in summaries if s["id"] == "tda-summary-checklist-parcial")
        self.assertEqual(len(checklist_summary["checklistItems"]), 11)
        self.assertEqual(checklist_summary["checklistItems"], expected_items)

        drawer_html = html_interactive_builder.get_hud_and_drawer_html("all")
        actual_drawer_sections = [
            html.unescape(re.sub(r"<[^>]+>", "", m)).strip()
            for m in re.findall(r'<section class="drawer-section[^"]*"><h3>(.*?)</h3>', drawer_html)
        ]
        drawer_summary = next(s for s in summaries if s["id"] == "tda-summary-drawer-formulas")
        self.assertEqual(drawer_summary["sections"], actual_drawer_sections)

        self.assertEqual(
            self.interactive["summary"],
            {
                "widgetCount": 6,
                "noteCount": 2,
                "summaryCount": 3,
                "checklistItemCount": 11,
                "trainerQuestionCount": 20,
            },
        )

        actual_ls_keys = sorted(set(re.findall(r'localStorage\.(?:get|set)Item\("([^"]+)"', app_js)))
        self.assertEqual(sorted(self.course["legacyStorageKeys"]), actual_ls_keys)
        self.assertEqual(len(actual_ls_keys), 4)

        storage_contract = (pathlib.Path(BASE_DIR) / "docs" / "contracts" / "local-storage-migration.md").read_text(encoding="utf-8")
        for key in actual_ls_keys:
            self.assertIn(key, storage_contract)
        for item in expected_items:
            self.assertIn(item["id"], storage_contract)
        for target_key in (
            "mc:v1:global:theme",
            "mc:v1:tda:mastered",
            "mc:v1:tda:checklist",
            "mc:v1:tda:study_mode",
            "mc:v1:tda:migrated_from_legacy",
        ):
            self.assertIn(target_key, storage_contract)

        self.assertEqual(
            self.course["stats"],
            {
                "physicalFiles": 96,
                "pdfs": 49,
                "nonPdfs": 47,
                "catalogExercises": 85,
                "parcialExercises": 35,
                "advancedExercises": 2,
                "interactiveWidgets": 6,
                "elaboratedNotes": 2,
                "elaboratedSummaries": 3,
                "checklistItems": 11,
                "trainerQuestions": 20,
            },
        )

    def test_validator_rejects_edge_cases_and_invalid_manifests(self):
        """Pruebas negativas: valida rechazo estricto de corrupciones y casos límite contractuales."""
        # 1. Provenance desconocido o incompatible con entityType
        bad_prov = copy.deepcopy(self.resources)
        bad_prov["resources"][0]["provenance"] = "untrusted_source"
        with self.assertRaises(ValueError):
            validate_resources_manifest(bad_prov, BASE_DIR)

        mismatch_prov = copy.deepcopy(self.resources)
        mismatch_prov["resources"][0]["provenance"] = "elaborated_notes"
        with self.assertRaises(ValueError):
            validate_resources_manifest(mismatch_prov, BASE_DIR)

        # 2. resourceId con formato inválido o duplicado
        bad_id = copy.deepcopy(self.resources)
        bad_id["resources"][0]["resourceId"] = "TDA_Invalid!"
        with self.assertRaises(ValueError):
            validate_resources_manifest(bad_id, BASE_DIR)

        dup_id = copy.deepcopy(self.resources)
        dup_id["resources"][1]["resourceId"] = dup_id["resources"][0]["resourceId"]
        with self.assertRaises(ValueError):
            validate_resources_manifest(dup_id, BASE_DIR)

        # 3. Casing incorrecto en ruta y archivo omitido del manifiesto
        bad_case = copy.deepcopy(self.resources)
        bad_case["resources"][0]["files"][0]["path"] = "materias/tda/diapositivas/00 - Presentación del Curso e Introducción.pdf"
        with self.assertRaises(ValueError):
            validate_resources_manifest(bad_case, BASE_DIR)

        missing_file = copy.deepcopy(self.resources)
        missing_file["resources"].pop()
        with self.assertRaises(ValueError):
            validate_resources_manifest(missing_file, BASE_DIR)

        # 4. pdfMetadata faltante en PDF / presente en no-PDF / unitSlugs o files vacíos
        no_pdf_meta = copy.deepcopy(self.resources)
        del no_pdf_meta["resources"][0]["pdfMetadata"]
        with self.assertRaises(ValueError):
            validate_resources_manifest(no_pdf_meta, BASE_DIR)

        non_pdf_idx = next(i for i, r in enumerate(self.resources["resources"]) if r["entityType"] == "OfficialCodePackage")
        extra_pdf_meta = copy.deepcopy(self.resources)
        extra_pdf_meta["resources"][non_pdf_idx]["pdfMetadata"] = {
            "pageCount": 1, "textChars": 0, "emptyPages": 0, "textLayerStatus": "extractable", "inPagefindPrototype": False
        }
        with self.assertRaises(ValueError):
            validate_resources_manifest(extra_pdf_meta, BASE_DIR)

        empty_units = copy.deepcopy(self.resources)
        empty_units["resources"][0]["unitSlugs"] = []
        with self.assertRaises(ValueError):
            validate_resources_manifest(empty_units, BASE_DIR)

        empty_files = copy.deepcopy(self.resources)
        empty_files["resources"][0]["files"] = []
        with self.assertRaises(ValueError):
            validate_resources_manifest(empty_files, BASE_DIR)

        # 5. Número de ejercicio fuera de 1..85, duplicado o avanzado con number != None
        bad_num = copy.deepcopy(self.exercises)
        bad_num["catalogExercises"][0]["number"] = 86
        with self.assertRaises(ValueError):
            validate_exercises_manifest(bad_num)

        dup_num = copy.deepcopy(self.exercises)
        dup_num["catalogExercises"][1]["number"] = 1
        with self.assertRaises(ValueError):
            validate_exercises_manifest(dup_num)

        bad_adv = copy.deepcopy(self.exercises)
        bad_adv["advancedExercises"][0]["number"] = 86
        with self.assertRaises(ValueError):
            validate_exercises_manifest(bad_adv)

        # 6. ADR sin sección obligatoria o con estado distinto de Accepted
        with self.assertRaises(ValueError):
            validate_adr_document("## Status\nAccepted\n## Context\nx", "adr-missing.md")

        bad_adr_status = "\n".join(
            f"{sec}\nProposed" if sec == "## Status" else f"{sec}\nok"
            for sec in REQUIRED_ADR_SECTIONS
        )
        with self.assertRaises(ValueError):
            validate_adr_document(bad_adr_status, "adr-proposed.md")

        # 7. Assessments: falta courseId, pdfResourceId inválido, ejercicio no-parcial o desajuste de 35 parciales
        bad_assess = copy.deepcopy(self.assessments)
        bad_assess["unassignedGenericParcialExerciseIds"] = []
        with self.assertRaises(ValueError):
            validate_assessments_manifest(bad_assess, self.resources, self.exercises)

        missing_cid = copy.deepcopy(self.assessments)
        del missing_cid["exams"][0]["courseId"]
        with self.assertRaises(ValueError):
            validate_assessments_manifest(missing_cid, self.resources, self.exercises)

        bad_pdf_fk = copy.deepcopy(self.assessments)
        bad_pdf_fk["exams"][0]["pdfResourceId"] = "tda-inexistente"
        with self.assertRaises(ValueError):
            validate_assessments_manifest(bad_pdf_fk, self.resources, self.exercises)

        non_parcial_ex = copy.deepcopy(self.assessments)
        non_parcial_ex["exams"][0]["catalogExerciseIds"].append("tda-ej-03")
        with self.assertRaises(ValueError):
            validate_assessments_manifest(non_parcial_ex, self.resources, self.exercises)


if __name__ == "__main__":
    unittest.main()
