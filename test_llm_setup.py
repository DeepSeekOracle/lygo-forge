"""Brain choice checks. Does not call a model or read a real key.

Contract as of 2026-10-26: the shipped local brain is the LYGO Engine serving
Qwen3-4B-Instruct-2507 (engine 11441 via bridge 8081). QwenPaw is the legacy name and is still
recognised so an old daemon cannot wedge the console - but it is no longer the default.
"""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import llm_setup as L


class BrainChoiceTests(unittest.TestCase):
    def test_anchor_model_is_the_shipped_brain(self):
        found = [{"label": "LYGO Engine", "endpoint": "http://127.0.0.1:8081/v1",
                  "models": ["Qwen3-4B-Instruct-2507"]}]
        brain = L.choose_brain(found, {}, False)
        self.assertTrue(brain["ready"])
        self.assertEqual(brain["model"], "Qwen3-4B-Instruct-2507")
        self.assertEqual(brain["tier"], "basic")
        self.assertTrue(brain["shipped"])

    def test_legacy_qwenpaw_is_still_recognised(self):
        found = [{"label": "QwenPaw", "endpoint": "http://127.0.0.1:8080/v1", "models": ["qwenpaw-9b"]}]
        brain = L.choose_brain(found, {}, False)
        self.assertTrue(brain["ready"])
        self.assertEqual(brain["model"], "qwenpaw-9b")
        self.assertTrue(brain["shipped"])

    def test_a_local_coder_runs_when_the_anchor_is_down(self):
        found = [{"label": "Ollama", "endpoint": "http://127.0.0.1:11434/v1", "models": ["gemma4:12b", "qwen2.5-coder:14b"]}]
        brain = L.choose_brain(found, {}, False)
        self.assertEqual(brain["model"], "qwen2.5-coder:14b")
        self.assertEqual(brain["tier"], "coder")
        self.assertFalse(brain["shipped"])

    def test_a_chat_model_is_not_taken_automatically(self):
        found = [{"label": "LYGO Engine", "endpoint": "http://127.0.0.1:8081/v1", "models": ["gemma"]}]
        brain = L.choose_brain(found, {}, False)
        self.assertFalse(brain["ready"])
        self.assertEqual(brain["label"], L.BASIC_NAME)

    def test_nvidia_bridge_is_not_the_shipped_brain(self):
        found = [{"label": "NVIDIA bridge", "endpoint": "http://127.0.0.1:8082/v1", "models": ["z-ai/glm-5.3-flash"]}]
        brain = L.choose_brain(found, {}, False)
        self.assertFalse(brain["ready"])
        self.assertEqual(brain["label"], L.BASIC_NAME)
        self.assertIn("not the anchor model", brain["hint"])

    def test_offline_names_the_basic_model(self):
        brain = L.choose_brain([], {}, False)
        self.assertFalse(brain["ready"])
        self.assertEqual(brain["label"], L.BASIC_NAME)
        self.assertEqual(brain["model"], L.BASIC_MODEL)
        self.assertIn("MODELS.md", brain["hint"])

    def test_saved_api_key_is_not_copied_into_the_choice(self):
        saved = {"mode": "api", "provider": "openai", "model": "gpt-4.1"}
        brain = L.choose_brain([], saved, True)
        self.assertTrue(brain["ready"])
        self.assertNotIn("api_key", brain)
        self.assertEqual(brain["tier"], "upgraded")

    def test_key_file_roundtrip_stays_out_of_settings(self):
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            L.write_key(home, "secret-key-value")
            self.assertTrue(L.key_is_set(home))
            L.save_settings(home, {"mode": "api", "model": "gpt", "api_key": "secret-key-value"})
            text = L.settings_file(home).read_text(encoding="utf-8")
            self.assertNotIn("secret-key-value", text)
            self.assertEqual(L.read_key(home), "secret-key-value")
            L.write_key(home, "")
            self.assertFalse(L.key_is_set(home))

    def test_public_view_has_no_key(self):
        view = L.public_view({"ready": True, "tier": "basic", "label": L.BASIC_NAME, "api_key": "nope"})
        self.assertNotIn("api_key", view)
        self.assertIn(L.BASIC_MODEL, view["hint"])


if __name__ == "__main__":
    unittest.main()
