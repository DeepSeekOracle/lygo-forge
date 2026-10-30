"""Hermes route checks. Does not start Hermes or spend a model call."""
from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

import hermes_brain as B


class HermesBrainTests(unittest.TestCase):
    def test_engine_routes_only_hermes_ids(self):
        self.assertEqual(B.engine_for_model("hermes"), "hermes")
        self.assertEqual(B.engine_for_model("Hermes/forge"), "hermes")
        self.assertEqual(B.engine_for_model("opencode/deepseek-v4.1-flash-free"), "opencode")
        self.assertEqual(B.engine_for_model("local/lygo-engine"), "opencode")

    def test_prompt_keeps_the_gate_and_the_message(self):
        text = B.master_prompt("Add a start screen.")
        self.assertIn("Do not publish, push, deploy, buy, or delete.", text)
        self.assertIn("Add a start screen.", text)
        self.assertTrue(text.strip().endswith("Add a start screen."))

    def test_find_hermes_from_a_launcher(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            (root / "bin").mkdir()
            (root / "hermes-agent").mkdir()
            tools = root / "tools"
            tools.mkdir()
            python = tools / "python.exe"
            python.write_text("", encoding="utf-8")
            cmd = root / "bin" / "hermes.cmd"
            cmd.write_text(f'"{python}" -I -c "print(1)" %*\n', encoding="utf-8")
            env = {
                "HERMES_BIN": str(cmd),
                "HERMES_PYTHON": "",
                "HERMES_AGENT": "",
                "HERMES_HOME": "",
            }
            old = {key: os.environ.get(key) for key in env}
            os.environ.update(env)
            try:
                found = B.find_hermes()
            finally:
                for key, value in old.items():
                    if value is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = value
            self.assertIsNotNone(found)
            assert found is not None
            self.assertEqual(found["python"], str(python))
            self.assertEqual(Path(found["agent"]), root / "hermes-agent")
            self.assertEqual(Path(found["home"]), root)

    def test_session_roundtrip_rejects_junk(self):
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self.assertEqual(B.load_session(home, "game"), "")
            B.save_session(home, "game", "not a session")
            self.assertFalse(B.sessions_file(home).exists())
            B.save_session(home, "game", "abc_DEF-123456")
            self.assertEqual(B.load_session(home, "game"), "abc_DEF-123456")
            usage = home / "turn.usage.json"
            usage.write_text(json.dumps({"session_id": "sess_998877"}) + "\n", encoding="utf-8")
            self.assertEqual(B.session_id_from_usage(usage), "sess_998877")
            usage.write_text("{", encoding="utf-8")
            self.assertEqual(B.session_id_from_usage(usage), "")


if __name__ == "__main__":
    unittest.main()
