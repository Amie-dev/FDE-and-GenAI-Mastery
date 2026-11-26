import type { MetadataCatalogue } from "./catalogue.js";
import { resolveCanonicalEntities, resolveFieldWithPrecedence } from "./resolver.js";
import type {
  OssieQueryResponse,
  PiiLevel,
  PrecedenceRule,
  ResolvedField,
  SystemRecord,
} from "./types.js";

/**
 * Metadata-aware AI query engine (Apache Ossie pattern):
 * 1. Looks up glossary metrics & ACL-filtered columns from the catalogue.
 * 2. Resolves canonical entities across CRM & Billing.
 * 3. Applies deterministic field-level SoR precedence rules and attaches provenance.
 */
export function queryMetadataAwareAgent(params: {
  domain: string;
  fields: string[];
  metricTerm?: string;
  callerClearance: PiiLevel;
  catalogue: MetadataCatalogue;
  records: SystemRecord[];
  precedenceRules: PrecedenceRule[];
}): OssieQueryResponse {
  const entities = resolveCanonicalEntities(params.records);
  const match = entities.find((e) => e.entity.normalizedDomain === params.domain.toLowerCase());
  if (!match) {
    throw new Error(`Canonical entity not found for domain '${params.domain}'`);
  }

  const resolvedFields: Record<string, ResolvedField> = {};
  for (const f of params.fields) {
    const res = resolveFieldWithPrecedence(f, match.records, params.precedenceRules);
    if (res) resolvedFields[f] = res;
  }

  const metricUsed = params.metricTerm ? params.catalogue.findMetric(params.metricTerm) : undefined;
  const targetAsset = metricUsed?.authoritativeAsset ?? "mart.customer_360";
  const acl = params.catalogue.filterColumnsByClearance(targetAsset, params.callerClearance);

  return {
    canonicalId: match.entity.canonicalId,
    displayName: match.entity.displayName,
    resolvedFields,
    metricUsed,
    accessibleColumns: acl.accessible,
    maskedColumns: acl.masked,
  };
}

