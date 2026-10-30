"""Workspace pytest config.

Windows gives os.symlink only to an elevated process or to a user with Developer Mode on
(SeCreateSymbolicLinkPrivilege). Tests that create symlinks then fail with WinError 1314 - an
environment limitation, not a code defect - so they are skipped with that reason instead of
pretending to be a real regression.
"""
import os
import pathlib
import shutil
import tempfile

import pytest


def _symlink_works() -> bool:
    root = tempfile.mkdtemp(prefix="lygo_sym_")
    try:
        target = pathlib.Path(root, "t.txt")
        target.write_text("x", encoding="utf-8")
        link = pathlib.Path(root, "l.txt")
        os.symlink(target, link)
        return link.is_symlink()
    except OSError:
        return False
    finally:
        shutil.rmtree(root, ignore_errors=True)


SYMLINKS_OK = _symlink_works()


def pytest_collection_modifyitems(config, items):
    if SYMLINKS_OK:
        return
    skip = pytest.mark.skip(
        reason="os.symlink needs Developer Mode or elevation on this Windows host "
               "(WinError 1314) - environment, not the code")
    for item in items:
        if "symlink" in item.name.lower():
            item.add_marker(skip)
