#!/usr/bin/env python3
"""Apply journals UX2 payload into src/modules/finance/pages/journals-page.tsx"""
import base64, zlib, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/modules/finance/pages/journals-page.tsx"
PARTS = [
    # See /tmp - will fill in next call if this fails size
    "eJz7" 
]
def main():
    raw = base64.b64decode("".join(PARTS))
    text = zlib.decompress(raw).decode("utf-8")
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(text, encoding="utf-8")
    print(f"Wrote {TARGET} ({len(text)} bytes)")
if __name__ == "__main__":
    main()
