#!/usr/bin/env python3
"""Decode FIN-CSN-F1 journals-page from split zlib+base64 parts in patches/journals_f1_b64.

Alternative if parts missing:
  git checkout 052df6197ca66f3a7b9542d299e67493b219bc3b -- src/modules/finance/pages/journals-page.tsx
  # then copy journals-page-impl.F1.tsx from project artifacts over the same path
"""
from __future__ import annotations

import base64
import pathlib
import zlib

root = pathlib.Path(__file__).resolve().parents[1]
parts_dir = root / "patches" / "journals_f1_b64"
out = root / "src" / "modules" / "finance" / "pages" / "journals-page.tsx"

if not parts_dir.is_dir():
    raise SystemExit(f"missing {parts_dir} — use git checkout 052df619 path or artifacts F1 file")

parts = sorted(parts_dir.glob("part_*.txt"))
if not parts:
    raise SystemExit(f"no part_*.txt in {parts_dir}")

data = "".join(p.read_text().strip() for p in parts)
out.write_bytes(zlib.decompress(base64.b64decode(data)))
print("wrote", out, "bytes", out.stat().st_size)
