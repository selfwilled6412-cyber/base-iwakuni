#!/usr/bin/env python3
"""Offline regression tests for fail-closed cinematic publishing approval."""
import ast
import os
from pathlib import Path
import unittest
from unittest.mock import patch

# Load only the approval function, without importing the media dependencies.
source = Path(__file__).with_name('stock_ad_pilot.py').read_text()
node = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef)
            and n.name == 'require_approved_film')
namespace = {'os': os}
exec(compile(ast.Module(body=[node], type_ignores=[]), '<approval>', 'exec'), namespace)
require_approved_film = namespace['require_approved_film']


class ApprovalGateTests(unittest.TestCase):
    def test_missing_approval_fails(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'blocked'):
                require_approved_film('a' * 64)

    def test_mismatched_approval_fails(self):
        with patch.dict(os.environ, {'BASE_CINEMATIC_APPROVED_SHA256': 'b' * 64}):
            with self.assertRaisesRegex(RuntimeError, 'differs'):
                require_approved_film('a' * 64)

    def test_malformed_approval_fails(self):
        with patch.dict(os.environ, {'BASE_CINEMATIC_APPROVED_SHA256': 'approved'}):
            with self.assertRaisesRegex(RuntimeError, 'blocked'):
                require_approved_film('a' * 64)

    def test_exact_hash_passes(self):
        with patch.dict(os.environ, {'BASE_CINEMATIC_APPROVED_SHA256': 'A' * 64}):
            require_approved_film('a' * 64)


if __name__ == '__main__':
    unittest.main()
