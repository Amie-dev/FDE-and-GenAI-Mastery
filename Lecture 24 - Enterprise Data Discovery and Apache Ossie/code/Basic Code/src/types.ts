export type EstateTier = "OLTP" | "WAREHOUSE" | "SAAS_API" | "DOCUMENT" | "SHADOW";
export type PiiLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type SourceSystem = "crm" | "billing" | "support";

export interface DataColumn {
  name: string;
  type: string;
  pii: PiiLevel;
  description: string;
}

export interface DataAsset {
  assetId: string;
  system: SourceSystem | "warehouse";
  tier: EstateTier;
  certifiedGold: boolean;
  ownerTeam: string;
  freshnessSla: string;
  upstreamAssets: string[];
  columns: DataColumn[];
}

export interface SemanticMetric {
  id: string;
  synonyms: string[];
  formulaSql: string;
  requiredFilters: string[];
  authoritativeAsset: string;
  ownerTeam: string;
}

export interface SystemRecord {
  system: SourceSystem;
  localId: string;
  email: string;
  domain: string;
  companyName: string;
  updatedAt: string;
  fields: Record<string, string | number>;
}

export interface CanonicalEntity {
  canonicalId: string;
  displayName: string;
  normalizedDomain: string;
  crosswalk: Partial<Record<SourceSystem, string>>;
  matchConfidence: number;
}

export interface PrecedenceRule {
  field: string;
  priorityOrder: SourceSystem[];
  rationale: string;
}

export interface ResolvedField {
  field: string;
  value: string | number;
  authoritativeSystem: SourceSystem;
  authoritativeRecordId: string;
  precedenceRule: string;
  conflictsOverridden: Array<{
    system: SourceSystem;
    localId: string;
    value: string | number;
  }>;
}

export interface OssieQueryResponse {
  canonicalId: string;
  displayName: string;
  resolvedFields: Record<string, ResolvedField>;
  metricUsed?: SemanticMetric;
  accessibleColumns: string[];
  maskedColumns: string[];
}

