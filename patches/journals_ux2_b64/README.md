# Journals UX2 payload

After `git pull origin develop`:

```powershell
python scripts/apply_journals_ux2.py
git add src/modules/finance/pages/journals-page.tsx
git commit -m "fix(fin): journals UX2 display compact export reverse-link"
git push origin develop
```

Requires part_00..part_10 under this folder.
