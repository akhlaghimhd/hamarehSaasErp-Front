"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCompanies } from "@/modules/organization/hooks/use-companies";

type Props = {
  value: string;
  onChange: (companyId: string) => void;
};

/**
 * ADR-ID-ORG-003 H3 — optional company filter for group-wide / parent view.
 * Renders only when tenant has more than one active company.
 */
export function MembersCompanyFilter({ value, onChange }: Props) {
  const { data } = useCompanies("active");
  const companies = data ?? [];
  if (companies.length <= 1) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[11rem]">
        <SelectValue placeholder="شرکت" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">همه شرکت‌ها</SelectItem>
        {companies.map((c) => (
          <SelectItem key={c.company_id} value={c.company_id}>
            {c.name || c.code || c.company_id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function useMembersCompanyFilterState() {
  const { data } = useCompanies("active");
  const companies = data ?? [];
  return {
    companies,
    showCompanyFilter: companies.length > 1,
  };
}
