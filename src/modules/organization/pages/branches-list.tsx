/**
 * FE-ORG — فهرست شعب (temporary while full restore in progress)
 */
"use client";

import { EmptyState } from "@/shared/components/feedback/empty-state";

export function BranchesListPage() {
  return (
    <div className="p-6">
      <EmptyState title="در حال بازگردانی نسخه کامل فهرست شعب…" description="نسخه کامل از artifacts در حال اعمال است." />
    </div>
  );
}
