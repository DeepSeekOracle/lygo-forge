"""Hermes child for one Forge Build-desk turn.

Hermes' own interpreter runs this file. The prompt stays in a file so the
Windows command line never has to carry it. stdout is Hermes' final reply.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> int:
    agent = os.environ.get("FORGE_HERMES_AGENT", "").strip()
    prompt_file = os.environ.get("FORGE_HERMES_PROMPT_FILE", "").strip()
    usage = os.environ.get("FORGE_HERMES_USAGE", "").strip()
    cwd = os.environ.get("FORGE_HERMES_CWD", "").strip()
    home = os.environ.get("FORGE_HERMES_HOME", "").strip()
    if not agent or not prompt_file or not usage or not cwd:
        sys.stderr.write("hermes turn: Forge did not pass the turn paths.\n")
        return 2
    sys.path.insert(0, agent)
    if home:
        os.environ.setdefault("HERMES_HOME", home)
    try:
        import hermes_bootstrap  # noqa: F401
    except Exception:
        pass
    prompt = Path(prompt_file).read_text(encoding="utf-8")
    # chat -q keeps the final reply on stdout and accepts a local base URL.
    # The API key stays in this process. It is not written to the prompt file.
    argv = ["hermes", "chat", "-q", prompt, "--quiet", "--no-restore-cwd"]
    provider = os.environ.get("FORGE_LLM_PROVIDER", "").strip()
    model = os.environ.get("FORGE_LLM_MODEL", "").strip()
    base_url = os.environ.get("FORGE_LLM_BASE_URL", "").strip()
    api_key = os.environ.get("FORGE_LLM_API_KEY", "").strip()
    if provider:
        argv.extend(["--provider", provider])
    if model:
        argv.extend(["-m", model])
    if base_url:
        argv.extend(["--base-url", base_url])
    if api_key:
        argv.extend(["--api-key", api_key])
    resume = os.environ.get("FORGE_HERMES_RESUME", "").strip()
    if resume:
        argv.extend(["--resume", resume])
    sys.argv = argv
    from hermes_cli.main import main as hermes_main
    return int(hermes_main() or 0)


if __name__ == "__main__":
    raise SystemExit(main())
