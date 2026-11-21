"""Integración de la auditoría QA de builder/test_qa_audit.py en la suite unittest."""

import importlib.util
import os
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_AUDIT_PATH = os.path.join(BASE_DIR, "builder", "test_qa_audit.py")

_spec = importlib.util.spec_from_file_location("builder_qa_audit", QA_AUDIT_PATH)
_qa_audit = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_qa_audit)


class TestQAAudit(unittest.TestCase):
    """Ejecuta la auditoría integral de QA en modo solo-lectura."""

    def test_qa_audit_passes(self):
        """Verifica integridad de los 85 ejercicios, 35 parciales, estrellas, HTML y delimitadores LaTeX."""
        _qa_audit.run_qa_audit(base_dir=BASE_DIR, verbose=False)


if __name__ == "__main__":
    unittest.main()
