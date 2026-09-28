import { apiGet, apiPost, apiDelete } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { organizationPaths } from "./paths";
import type { SalesOrgDto } from "./org-extended-service";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function asArray<T>(data: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data?: T[] }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export type DistributionChannelDto = {
  distribution_channel_id: string;
  code: string;
  name: string;
  is_active?: boolean;
};

export type ProductDivisionDto = {
  division_id: string;
  code: string;
  name: string;
  is_active?: boolean;
};

export type SalesAreaDto = {
  sales_area_id: string;
  sales_org_id: string;
  distribution_channel_id: string;
  division_id: string;
  code?: string | null;
  name?: string | null;
  is_active?: boolean;
  sales_organization?: SalesOrgDto | null;
  distribution_channel?: DistributionChannelDto | null;
  product_division?: ProductDivisionDto | null;
};

export const salesStructureService = {
  async listChannels(): Promise<DistributionChannelDto[]> {
    const env = await apiGet(organizationPaths.distributionChannels);
    return asArray(unwrapData(env));
  },
  async createChannel(payload: { code: string; name: string; is_active?: boolean }) {
    const env = await apiPost(organizationPaths.distributionChannels, payload);
    return unwrapData<DistributionChannelDto>(env);
  },
  async softDeleteChannel(id: string) {
    await apiDelete(organizationPaths.distributionChannel(id));
  },
  async listDivisions(): Promise<ProductDivisionDto[]> {
    const env = await apiGet(organizationPaths.productDivisions);
    return asArray(unwrapData(env));
  },
  async createDivision(payload: { code: string; name: string; is_active?: boolean }) {
    const env = await apiPost(organizationPaths.productDivisions, payload);
    return unwrapData<ProductDivisionDto>(env);
  },
  async softDeleteDivision(id: string) {
    await apiDelete(organizationPaths.productDivision(id));
  },
  async listSalesAreas(): Promise<SalesAreaDto[]> {
    const env = await apiGet(organizationPaths.salesAreas);
    return asArray(unwrapData(env));
  },
  async createSalesArea(payload: {
    sales_org_id: string;
    distribution_channel_id: string;
    division_id: string;
    code?: string;
    name?: string;
    is_active?: boolean;
  }) {
    const env = await apiPost(organizationPaths.salesAreas, payload);
    return unwrapData<SalesAreaDto>(env);
  },
  async softDeleteSalesArea(id: string) {
    await apiDelete(organizationPaths.salesArea(id));
  },
};
