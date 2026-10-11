# Journals UX2 payload (verified)

## Restore page

```powershell
git fetch origin
git pull origin develop
python scripts/apply_journals_ux2.py
git add src/modules/finance/pages/journals-page.tsx
git commit -m "fix(finance): journals UX2 — Persian numbers, compact rows, export/columns, reverse links"
git push origin develop
```

Expect: `OK wrote ... bytes 91140` + `sanity OK`.

Source: zlib+base64 of complete journals-page.tsx (displayJournalNumber, PageHeader icon, pageSize String, table toolbar columns+export, compact rows, reverse links).
