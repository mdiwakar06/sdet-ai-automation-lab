/**
 * Drift & Diff Types for DriftGuard
 */

import { OpenApiDocument } from './schema';

export type SeverityLevel = 'CRITICAL_BREAKING' | 'WARNING_RISK' | 'NON_BREAKING_ADDITION';

export type DiffCategory =
  | 'ENDPOINT'
  | 'METHOD'
  | 'STATUS_CODE'
  | 'REQUEST_BODY'
  | 'RESPONSE_BODY'
  | 'PARAMETER'
  | 'HEADER'
  | 'SCHEMA_TYPE'
  | 'SCHEMA_FIELD'
  | 'ENUM_VALUE'
  | 'NULLABILITY'
  | 'FORMAT';

export type DiffChangeType =
  | 'ENDPOINT_REMOVED'
  | 'ENDPOINT_ADDED'
  | 'METHOD_REMOVED'
  | 'METHOD_ADDED'
  | 'STATUS_CODE_REMOVED'
  | 'STATUS_CODE_ADDED'
  | 'REQUIRED_REQUEST_FIELD_ADDED'
  | 'OPTIONAL_REQUEST_FIELD_ADDED'
  | 'REQUEST_FIELD_REMOVED'
  | 'REQUIRED_RESPONSE_FIELD_REMOVED'
  | 'OPTIONAL_RESPONSE_FIELD_REMOVED'
  | 'RESPONSE_FIELD_ADDED'
  | 'FIELD_TYPE_CHANGED'
  | 'ENUM_VALUE_REMOVED'
  | 'ENUM_VALUE_ADDED'
  | 'NULLABILITY_WIDENED'
  | 'NULLABILITY_NARROWED'
  | 'FORMAT_CHANGED'
  | 'REQUIRED_PARAM_ADDED'
  | 'PARAM_REMOVED'
  | 'HEADER_REMOVED'
  | 'HEADER_ADDED';

export interface DiffItem {
  id: string;
  ruleId: string;
  category: DiffCategory;
  changeType: DiffChangeType;
  severity: SeverityLevel;
  pointer: string; // RFC 6901 JSON pointer (e.g. "/paths/~1users~1{id}/get/responses/200/content/application~1json/schema/properties/email")
  path: string; // Normalized API path (e.g. "/users/{id}")
  method?: string; // HTTP method (e.g. "GET")
  statusCode?: string; // e.g. "200"
  description: string;
  expected?: any;
  actual?: any;
  impact: string;
  remediationAdvice?: string;
}

export interface DriftSummary {
  totalDiffs: number;
  criticalBreakingCount: number;
  warningRiskCount: number;
  nonBreakingAdditionCount: number;
  totalEndpointsBaseline: number;
  totalEndpointsObserved: number;
  totalEndpointsEvaluated: number;
  isContractBroken: boolean;
  score: number; // 0 - 100 contract integrity score
}

export interface RemediationPatch {
  diffId: string;
  ruleId: string;
  title: string;
  rootCause: string;
  recommendedAction: string;
  clientCompatibilityRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  openApiPatch?: any;
  codeSnippetFix?: string;
}

export interface DriftReport {
  id: string;
  title: string;
  generatedAt: string; // ISO 8601
  baselineVersion?: string;
  observedVersion?: string;
  summary: DriftSummary;
  diffs: DiffItem[];
  remediationPatches?: RemediationPatch[];
  baselineSpec?: OpenApiDocument;
  observedSpec?: OpenApiDocument;
  metadata?: {
    environment?: string;
    trafficSamplesCount?: number;
    durationMs?: number;
    gitCommit?: string;
    [key: string]: any;
  };
}
