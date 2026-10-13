#!/usr/bin/env python3
"""Fix TDZ: postableAccounts/accountLabel must come after useAccountFlat."""
from pathlib import Path
import sys
path = Path(__file__).resolve().parents[1] / "src/modules/finance/pages/journals-page.tsx"
t = path.read_text(encoding="utf-8")
block = '''  const postableAccounts = useMemo(\n    () => (accountsFlat ?? []).filter((a) => a.is_postable !== false),\n    [accountsFlat]\n  );\n\n  const accountLabel = useCallback(\n    (id: string) => {\n      const a = postableAccounts.find((x) => x.account_id === id);\n      if (!a) return id ? id.slice(0, 8) : "\u2014";\n      return `${toFaDigits(a.account_code)} \u2014 ${a.name}`;\n    },\n    [postableAccounts]\n  );\n\n'''
# normalize em-dash variants already in file
if "const { data: accountsFlat }" in t and t.find("const { data: accountsFlat }") < t.find("const postableAccounts = useMemo"):
    print("already ordered OK")
    sys.exit(0)
if "const postableAccounts = useMemo" not in t:
    print("ERROR: postableAccounts not found", file=sys.stderr)
    sys.exit(1)
# extract existing block (flexible dash)
import re
m = re.search(
    r"  const postableAccounts = useMemo\(\n    \(\) => \(accountsFlat \?\? \[\]\)\.filter\(\(a\) => a\.is_postable !== false\),\n    \[accountsFlat\]\n  \);\n\n  const accountLabel = useCallback\(\n    \(id: string\) => \{[\s\S]*?\[postableAccounts\]\n  \);\n\n",
    t,
)
if not m:
    print("ERROR: could not match postableAccounts block", file=sys.stderr)
    sys.exit(1)
block = m.group(0)
t2 = t[: m.start()] + t[m.end() :]
needle = "  const { data: accountsFlat } = useAccountFlat({ enabled: formMode !== null });\n"
if needle not in t2:
    print("ERROR: accountsFlat line missing", file=sys.stderr)
    sys.exit(1)
t2 = t2.replace(needle, needle + "\n" + block, 1)
if t2.find("const { data: accountsFlat }") > t2.find("const postableAccounts = useMemo"):
    print("ERROR: order still wrong", file=sys.stderr)
    sys.exit(1)
path.write_text(t2, encoding="utf-8")
print(f"OK fixed TDZ order in {path}")
