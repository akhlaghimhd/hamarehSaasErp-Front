# Journals UX2 restore

The multi-part zlib payload previously uploaded was **corrupt** (invalid distance). Do **not** run `python scripts/apply_journals_ux2.py` until a verified `payload.b64` is published.

## Immediate restore (working F1 page)

```powershell
git fetch origin
git checkout 052df6197ca66f3a7b9542d299e67493b219bc3b -- src/modules/finance/pages/journals-page.tsx
```

This restores the last known-good journals list (create button, status counts, bulk restore, etc.).

## UX2 (pending verified push)

Target improvements on top of that SHA:
- Persian document numbers (`پ.ن-۱۴۰۴-…` / `ث.ث-…`)
- PageHeader icon
- `pageSize` select with `String(value)`
- Columns + Export dropdown next to the table (with filtered count)
- Compact table rows (`py-1`)
- Reverse-link indicators under the number cell

After F1 is restored locally, report so UX2 can be applied as a small verified patch or a single known-good file push.
