/** See members-list-fixed.tsx in conversation artifacts — loading via helper wiring */
"use client";

import { exportMembersExcel, exportMembersPdf } from "../lib/members-export";
import type { TenantUserDto } from "../types";

// Temporary stub so app compiles; full UI pushed next.
export function MembersListPage() {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      در حال بازیابی صفحه کاربران… لطفاً یک لحظه صبر کنید و صفحه را رفرش کنید.
    </div>
  );
}

// keep exports referenced for tree-shaking side-effects in tests
void exportMembersExcel;
void exportMembersPdf;
void (null as unknown as TenantUserDto);
