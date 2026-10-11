#!/usr/bin/env python3
"""Apply journals UX2 page from patches/journals_ux2_b64/part_*.txt (zlib+base64)."""
from __future__ import annotations
import base64
import pathlib
import zlib
import sys

root = pathlib.Path(__file__).resolve().parents[1]
parts_dir = root / "patches" / "journals_ux2_b64"
out = root / "src" / "modules" / "finance" / "pages" / "journals-page.tsx"

# Prefer single payload if present
single = parts_dir / "payload.b64"
if single.exists():
    data = "".join(single.read_text(encoding="utf-8").split())
else:
    parts = sorted(parts_dir.glob("part_*.txt"))
    if not parts:
        raise SystemExit(f"no parts in {parts_dir}")
    data = "".join(p.read_text(encoding="utf-8").strip() for p in parts)
    data = "".join(data.split())

pad = (-len(data)) % 4
if pad:
    data += "=" * pad

try:
    decoded = zlib.decompress(base64.b64decode(data, validate=False))
except Exception as e:
    raise SystemExit(f"decompress failed: {e}") from e

out.write_bytes(decoded)
print("OK wrote", out, "bytes", out.stat().st_size)
