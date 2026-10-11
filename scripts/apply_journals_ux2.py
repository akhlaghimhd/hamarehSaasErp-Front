#!/usr/bin/env python3
"""Apply journals UX2 page. Reads payload from patches/journals_ux2_b64/."""
from __future__ import annotations
import base64, pathlib, zlib
root = pathlib.Path(__file__).resolve().parents[1]
parts_dir = root / "patches" / "journals_ux2_b64"
out = root / "src" / "modules" / "finance" / "pages" / "journals-page.tsx"
parts = sorted(parts_dir.glob("part_*.txt"))
if len(parts) < 11:
    raise SystemExit(f"expected >=11 parts in {parts_dir}, found {len(parts)}")
data = "".join(p.read_text(encoding="utf-8").strip() for p in parts)
data = "".join(data.split())
pad = (-len(data)) % 4
if pad:
    data += "=" * pad
out.write_bytes(zlib.decompress(base64.b64decode(data)))
print("OK wrote", out, "bytes", out.stat().st_size)
