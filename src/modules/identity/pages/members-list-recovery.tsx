"use client";

// NOTE: Full list body is large; load from recovery artifact if build fails.
// Temporary: re-export path fixed below by user pull of artifacts recovery.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";
import { MemberCreateDrawer } from "../components/member-create-drawer";
import { MembersListPage as FullList } from "./members-list-body";

export function MembersListPage() {
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) setCreateOpen(true);
  }, [searchParams, canCreate]);

  return (
    <>
      <FullList
        headerActions={
          canCreate ? (
            <Button type="button" size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              افزودن کاربر
            </Button>
          ) : null
        }
      />
      <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
