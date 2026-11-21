"""Script unificado de ejecución para todas las suites de prueba: unitarias, integración y auditoría QA."""

import hashlib
import os
import subprocess
import sys
import tempfile

# Garantizar que ni el intérprete actual ni los subprocesos generen .pyc en el repositorio
sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
os.environ["PYTHONPYCACHEPREFIX"] = os.path.join(tempfile.gettempdir(), "tda_test_pycache")

import unittest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def snapshot_workspace_state(base_dir):
    """Captura un snapshot criptográfico de todos los archivos (versionados e ignorados) fuera de .git/."""
    files_state = {}
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in sorted(dirs) if d != ".git"]
        for fname in sorted(files):
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, base_dir).replace("\\", "/")
            stat = os.stat(full_path)
            files_state[rel_path] = (stat.st_size, stat.st_mtime_ns, _sha256_file(full_path))

    git_res = subprocess.run(
        ["git", "status", "--porcelain", "--ignored"],
        cwd=base_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if git_res.returncode != 0:
        raise RuntimeError(f"Error al consultar git status: {git_res.stderr}")
    return files_state, git_res.stdout


def compare_workspace_states(before_state, after_state):
    """Retorna una lista de discrepancias si la ejecución de pruebas alteró cualquier archivo o estado Git."""
    before_files, before_git = before_state
    after_files, after_git = after_state
    diffs = []

    added = sorted(set(after_files) - set(before_files))
    removed = sorted(set(before_files) - set(after_files))
    modified = sorted(
        path for path in (set(before_files) & set(after_files))
        if before_files[path] != after_files[path]
    )

    if added:
        diffs.append(f"Archivos creados durante tests: {added}")
    if removed:
        diffs.append(f"Archivos eliminados durante tests: {removed}")
    if modified:
        diffs.append(f"Archivos modificados (hash/mtime/size) durante tests: {modified}")
    if before_git != after_git:
        diffs.append(f"Cambio en git status --porcelain --ignored:\nANTES:\n{before_git}\nDESPUES:\n{after_git}")
    return diffs


def main():
    print("=" * 70)
    print("EJECUTANDO SUITE COMPLETA DE PRUEBAS DE TDA (UNIT + INTEGRATION + QA)")
    print("=" * 70)

    before_state = snapshot_workspace_state(BASE_DIR)

    loader = unittest.TestLoader()
    suite = loader.discover(os.path.join(BASE_DIR, "tests"), pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    after_state = snapshot_workspace_state(BASE_DIR)
    workspace_diffs = compare_workspace_states(before_state, after_state)

    print("\n" + "=" * 70)
    if workspace_diffs:
        print("ERROR CRITICO DE AISLAMIENTO: LA SUITE MUTÓ ARCHIVOS DEL REPOSITORIO")
        for d in workspace_diffs:
            print(f"  - {d}")
        print("=" * 70)
        return 1

    print("[Aislamiento verificado] 0 archivos creados, eliminados o modificados (versionados e ignorados).")
    if result.wasSuccessful():
        print(f"TODAS LAS PRUEBAS PASARON ({result.testsRun} tests ejecutados exitosamente)")
        print("=" * 70)
        return 0
    else:
        print(f"FALLARON PRUEBAS: {len(result.failures)} fallos, {len(result.errors)} errores")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
