#!/usr/bin/env python3
"""Apply journals UX2 page (embedded zlib+b64 payload)."""
import base64, pathlib, zlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/modules/finance/pages/journals-page.tsx"
PARTS = [
    "PLACEHOLDER_PART0",
]
def main():
    raw = base64.b64decode("".join(PARTS))
    text = zlib.decompress(raw).decode("utf-8")
    TARGET.write_text(text, encoding="utf-8")
    print(f"Wrote {TARGET} ({len(text)} bytes)")
if __name__ == "__main__":
    main()
