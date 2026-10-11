#!/usr/bin/env python3
"""Restore journals-page.tsx from patches/journals_ux2_b64/payload_chunk_*.b64 (zlib+base64)."""
from __future__ import annotations
import base64
import pathlib
import zlib

root = pathlib.Path(__file__).resolve().parents[1]
parts_dir = root / "patches" / "journals_ux2_b64"
out = root / "src" / "modules" / "finance" / "pages" / "journals-page.tsx"

chunks = sorted(parts_dir.glob("payload_chunk_*.b64"))
single = parts_dir / "payload.b64"

if chunks:
    data = "".join(p.read_text(encoding="utf-8").strip() for p in chunks)
elif single.exists():
    data = single.read_text(encoding="utf-8")
else:
    raise SystemExit(f"no payload_chunk_*.b64 or payload.b64 in {parts_dir}")

data = "".join(data.split())
pad = (-len(data)) % 4
if pad:
    data += "=" * pad

decoded = zlib.decompress(base64.b64decode(data, validate=False))
out.write_bytes(decoded)
print("OK wrote", out, "bytes", out.stat().st_size)
assert b"displayJournalNumber" in decoded, "missing displayJournalNumber"
assert "پ.ن".encode("utf-8") in decoded, "missing Persian abbrev"
print("sanity OK")
