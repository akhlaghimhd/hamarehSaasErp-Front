# journals UX2 payload

Run from repo root:

```bash
python scripts/apply_journals_ux2.py
```

Expects 11 files `part_00.txt` … `part_10.txt` (zlib+base64 of journals-page.tsx UX2).
After apply: commit the restored `src/modules/finance/pages/journals-page.tsx`.
