import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type AccessCertCampaignDto = {
  campaign_id: string;
  code?: string;
  name?: string;
  description?: string | null;
  status?: string;
  due_at?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  deleted_at?: string | null;
  is_archived?: boolean;
  items_total?: number;
  items_pending?: number;
  totals?: {
    items?: number;
    pending?: number;
    approved?: number;
    revoke_requested?: number;
    deferred?: number;
    sod_block?: number;
    sod_warn?: number;
  };
  [key: string]: unknown;
};

export type AccessCertItemDto = {
  item_id: string;
  campaign_id?: string;
  user_id?: string;
  tenant_role_id?: string;
  role_ids_snapshot?: string[] | null;
  sod_has_block?: boolean;
  sod_has_warn?: boolean;
  sod_conflicts?: Array<{
    sod_rule_id?: string;
    code?: string;
    name?: string;
    enforcement?: string;
    severity?: number;
  }> | null;
  decision?: string | null;
  note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  [key: string]: unknown;
};

export type CreateAccessCertCampaignPayload = {
  code?: string | null;
  name: string;
  description?: string | null;
  due_at?: string | null;
};

export type CertifyItemPayload = {
  decision: "APPROVED" | "REVOKE_REQUESTED" | "DEFERRED";
  note?: string | null;
};

export type AccessCertListScope = "active" | "archived" | "all";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function asList<T>(data: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeCampaign(raw: unknown): AccessCertCampaignDto {
  if (!raw || typeof raw !== "object") return {} as AccessCertCampaignDto;
  const o = raw as Record<string, unknown>;
  if (o.campaign && typeof o.campaign === "object") {
    const c = o.campaign as AccessCertCampaignDto;
    const totals = (o.totals as AccessCertCampaignDto["totals"]) || undefined;
    return {
      ...c,
      totals,
      items_total: totals?.items,
      items_pending: totals?.pending,
    };
  }
  return o as AccessCertCampaignDto;
}

function ensureCampaignCode(raw?: string | null): string {
  const cleaned = (raw ?? "").trim();
  if (cleaned.length >= 2) return cleaned.slice(0, 80);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ac-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

export const accessCertificationService = {
  async list(scope: AccessCertListScope = "active"): Promise<AccessCertCampaignDto[]> {
    const q = scope && scope !== "active" ? `?scope=${encodeURIComponent(scope)}` : "";
    const envelope = await apiGet(`${identityPaths.accessCertifications}${q}`);
    return asList(unwrapData(envelope));
  },

  async create(payload: CreateAccessCertCampaignPayload): Promise<AccessCertCampaignDto> {
    const body = {
      name: payload.name,
      code: ensureCampaignCode(payload.code),
      ...(payload.description != null ? { description: payload.description } : {}),
      ...(payload.due_at != null ? { due_at: payload.due_at } : {}),
    };
    const envelope = await apiPost(identityPaths.accessCertifications, body);
    return normalizeCampaign(unwrapData(envelope));
  },

  async show(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiGet(identityPaths.accessCertification(id));
    return normalizeCampaign(unwrapData(envelope));
  },

  async open(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationOpen(id), {});
    return normalizeCampaign(unwrapData(envelope));
  },

  async complete(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationComplete(id), {});
    return normalizeCampaign(unwrapData(envelope));
  },

  async archive(id: string): Promise<void> {
    await apiPost(identityPaths.accessCertificationArchive(id), {});
  },

  async unarchive(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationUnarchive(id), {});
    return normalizeCampaign(unwrapData(envelope));
  },

  async reEvaluate(id: string): Promise<{
    campaign: AccessCertCampaignDto;
    totals?: AccessCertCampaignDto["totals"];
    re_eval?: { resolved?: number; updated?: number; added?: number };
  }> {
    const envelope = await apiPost(identityPaths.accessCertificationReEvaluate(id), {});
    const raw = unwrapData(envelope) as Record<string, unknown>;
    const campaign = normalizeCampaign(
      raw.campaign ? { campaign: raw.campaign, totals: raw.totals } : raw
    );
    return {
      campaign,
      totals: (raw.totals as AccessCertCampaignDto["totals"]) || campaign.totals,
      re_eval: raw.re_eval as { resolved?: number; updated?: number; added?: number },
    };
  },

  async listItems(campaignId: string, decision?: string): Promise<AccessCertItemDto[]> {
    const q = decision ? `?decision=${encodeURIComponent(decision)}` : "";
    const envelope = await apiGet(
      `${identityPaths.accessCertificationItems(campaignId)}${q}`
    );
    return asList(unwrapData(envelope));
  },

  async certifyItem(itemId: string, payload: CertifyItemPayload): Promise<AccessCertItemDto> {
    const envelope = await apiPost(identityPaths.accessCertifyItem(itemId), payload);
    return unwrapData<AccessCertItemDto>(envelope);
  },
};
