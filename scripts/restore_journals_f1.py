#!/usr/bin/env python3
"""Restore FIN-CSN-F1 journals-page.tsx from patches/journals_f1_b64/part_*.txt

Run from Front repo root after: git pull origin develop

  python scripts/restore_journals_f1.py
  git add src/modules/finance/pages/journals-page.tsx
  git commit -m "feat(fin): FIN-CSN-F1 journals multi-company + DR/JE display"
  git push origin develop
"""
from __future__ import annotations

import base64
import pathlib
import zlib

root = pathlib.Path(__file__).resolve().parents[1]
parts_dir = root / "patches" / "journals_f1_b64"
out = root / "src" / "modules" / "finance" / "pages" / "journals-page.tsx"

parts = sorted(parts_dir.glob("part_*.txt"))
if len(parts) < 10:
    raise SystemExit(f"expected 10 parts in {parts_dir}, found {len(parts)}")

# strip whitespace/newlines per part; remove any residual whitespace in join
data = "".join(p.read_text(encoding="utf-8").strip() for p in parts)
data = "".join(data.split())
pad = (-len(data)) % 4
if pad:
    data += "=" * pad

out.write_bytes(zlib.decompress(base64.b64decode(data)))
print("OK wrote", out, "bytes", out.stat().st_size)
