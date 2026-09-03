"""Compatibility shim. DELETE once every reference points at
services/voice-ingest/ and ./scripts/voice/verify.sh is green again."""
import importlib.util as _il
import pathlib as _pl

_src = _pl.Path(__file__).resolve().parent.parent / "services" / "voice-ingest" / "app" / "main.py"
_spec = _il.spec_from_file_location("trace_voice_ingest_main", _src)
_mod = _il.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

app = _mod.app
