# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['<FORGE_DIR>/server.py'],
    pathex=[],
    binaries=[],
    datas=[('<FORGE_DIR>/web', 'web'), ('<FORGE_DIR>/template', 'template'), ('<FORGE_DIR>/licenses', 'licenses'), ('<FORGE_DIR>/docs', 'docs'), ('<FORGE_DIR>/harness', 'harness'), ('<FORGE_DIR>/skills', 'skills'), ('<FORGE_DIR>/workflow', 'workflow')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='LYGOForge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
