/**
 * MasterData SoT for polymorphic address / contact (Law 5.1).
 * entity_type=COMPANY, entity_id=company_id
 */

import { apiGet, apiPost, apiDelete } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";

const MD = "/master-data";

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

export type EntityAddressDto = {
  entity_address_id: string;
  entity_type: string;
  entity_id: string;
  address_text: string;
  postal_code?: string | null;
  is_primary?: boolean;
  status?: number;
};

export type EntityContactDto = {
  contact_point_id: string;
  entity_type: string;
  entity_id: string;
  contact_type: string;
  contact_value: string;
  extension?: string | null;
  is_primary?: boolean;
};

export const entityAddressService = {
  async listForCompany(companyId: string): Promise<EntityAddressDto[]> {
    const env = await apiGet(
      `${MD}/entity-addresses?entity_type=COMPANY&entity_id=${encodeURIComponent(companyId)}`
    );
    return asArray(unwrapData(env));
  },
  async createForCompany(
    companyId: string,
    payload: { address_text: string; postal_code?: string; is_primary?: boolean }
  ) {
    const env = await apiPost(`${MD}/entity-addresses`, {
      entity_type: "COMPANY",
      entity_id: companyId,
      address_text: payload.address_text,
      postal_code: payload.postal_code ?? null,
      is_primary: payload.is_primary ?? false,
    });
    return unwrapData<EntityAddressDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(`${MD}/entity-addresses/${id}`);
  },
};

export const entityContactService = {
  async listForCompany(companyId: string): Promise<EntityContactDto[]> {
    const env = await apiGet(
      `${MD}/entity-contact-points?entity_type=COMPANY&entity_id=${encodeURIComponent(companyId)}`
    );
    return asArray(unwrapData(env));
  },
  async createForCompany(
    companyId: string,
    payload: {
      contact_type: string;
      contact_value: string;
      is_primary?: boolean;
    }
  ) {
    const env = await apiPost(`${MD}/entity-contact-points`, {
      entity_type: "COMPANY",
      entity_id: companyId,
      contact_type: payload.contact_type,
      contact_value: payload.contact_value,
      is_primary: payload.is_primary ?? false,
    });
    return unwrapData<EntityContactDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(`${MD}/entity-contact-points/${id}`);
  },
};
