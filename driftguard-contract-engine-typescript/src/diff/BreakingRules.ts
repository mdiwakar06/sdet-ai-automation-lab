/**
 * Formal 16-Point Breaking Change Classification Matrix
 */

import { SeverityLevel, DiffChangeType, DiffCategory } from '../types/diff';

export interface RuleDefinition {
  ruleId: string;
  category: DiffCategory;
  changeType: DiffChangeType;
  defaultSeverity: SeverityLevel;
  title: string;
  impactDescription: string;
  defaultRemediation: string;
}

export const BREAKING_RULES: Record<string, RuleDefinition> = {
  'BR-01': {
    ruleId: 'BR-01',
    category: 'ENDPOINT',
    changeType: 'ENDPOINT_REMOVED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'Baseline Endpoint Removed',
    impactDescription: 'Clients calling this route will receive 404 Not Found errors, leading to service disruption.',
    defaultRemediation: 'Restore the removed endpoint or implement a backward-compatible 301/308 redirect or deprecated proxy.',
  },
  'BR-02': {
    ruleId: 'BR-02',
    category: 'ENDPOINT',
    changeType: 'ENDPOINT_ADDED',
    defaultSeverity: 'NON_BREAKING_ADDITION',
    title: 'New Endpoint Added',
    impactDescription: 'New API capability exposed. Existing consumers are unaffected.',
    defaultRemediation: 'Update API documentation and SDKs to expose the new endpoint.',
  },
  'BR-03': {
    ruleId: 'BR-03',
    category: 'METHOD',
    changeType: 'METHOD_REMOVED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'HTTP Method Removed from Endpoint',
    impactDescription: 'Clients sending this HTTP verb will receive 405 Method Not Allowed.',
    defaultRemediation: 'Reinstate the HTTP method or deprecate with a migration window.',
  },
  'BR-04': {
    ruleId: 'BR-04',
    category: 'METHOD',
    changeType: 'METHOD_ADDED',
    defaultSeverity: 'NON_BREAKING_ADDITION',
    title: 'New HTTP Method Added to Endpoint',
    impactDescription: 'Additional method available on existing route. No impact on existing clients.',
    defaultRemediation: 'Document the new verb in API contract.',
  },
  'BR-05': {
    ruleId: 'BR-05',
    category: 'STATUS_CODE',
    changeType: 'STATUS_CODE_REMOVED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'Expected HTTP Status Code Removed',
    impactDescription: 'Clients relying on specific status codes (e.g. 200 or 201) will fail or trigger error fallback branches.',
    defaultRemediation: 'Preserve standard status codes or ensure client adapters handle alternative codes.',
  },
  'BR-06': {
    ruleId: 'BR-06',
    category: 'STATUS_CODE',
    changeType: 'STATUS_CODE_ADDED',
    defaultSeverity: 'WARNING_RISK',
    title: 'New HTTP Status Code Observed',
    impactDescription: 'Unexpected status code may bypass standard response parsers on strict clients.',
    defaultRemediation: 'Verify whether the new status code is an intended response or an unhandled exception.',
  },
  'BR-07': {
    ruleId: 'BR-07',
    category: 'SCHEMA_FIELD',
    changeType: 'REQUIRED_RESPONSE_FIELD_REMOVED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'Required Field Removed from Response Body',
    impactDescription: 'Client applications will encounter NullPointerExceptions or undefined property access errors.',
    defaultRemediation: 'Restore the required field in the response payload or provide a default fallback value.',
  },
  'BR-08': {
    ruleId: 'BR-08',
    category: 'SCHEMA_FIELD',
    changeType: 'OPTIONAL_RESPONSE_FIELD_REMOVED',
    defaultSeverity: 'WARNING_RISK',
    title: 'Optional Field Removed from Response Body',
    impactDescription: 'Clients that read this optional property may experience degraded UI or functionality.',
    defaultRemediation: 'Confirm client usage telemetry before dropping optional fields permanently.',
  },
  'BR-09': {
    ruleId: 'BR-09',
    category: 'SCHEMA_FIELD',
    changeType: 'RESPONSE_FIELD_ADDED',
    defaultSeverity: 'NON_BREAKING_ADDITION',
    title: 'New Field Added to Response Body',
    impactDescription: 'Non-breaking additive change for tolerant readers (Postel’s Law).',
    defaultRemediation: 'Add the new field to client data models and SDK types.',
  },
  'BR-10': {
    ruleId: 'BR-10',
    category: 'SCHEMA_TYPE',
    changeType: 'FIELD_TYPE_CHANGED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'Field Data Type Incompatible Drift',
    impactDescription: 'Deserialization failure: strict JSON parsers (e.g. Jackson, Swift Codable, Zod) will throw parsing exceptions.',
    defaultRemediation: 'Maintain original data type or support dual-type coercion with union types.',
  },
  'BR-11': {
    ruleId: 'BR-11',
    category: 'NULLABILITY',
    changeType: 'NULLABILITY_WIDENED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'Field Nullability Widened (Non-null -> Nullable in Response)',
    impactDescription: 'Clients expecting guaranteed non-null values will crash when receiving null.',
    defaultRemediation: 'Ensure server returns a non-null fallback value or update clients to guard for null.',
  },
  'BR-12': {
    ruleId: 'BR-12',
    category: 'NULLABILITY',
    changeType: 'NULLABILITY_NARROWED',
    defaultSeverity: 'NON_BREAKING_ADDITION',
    title: 'Field Nullability Narrowed (Nullable -> Non-null in Response)',
    impactDescription: 'Stricter guarantee provided by the server. Clients handling nullable types remain safe.',
    defaultRemediation: 'Update schema contract to reflect non-null guarantee.',
  },
  'BR-13': {
    ruleId: 'BR-13',
    category: 'ENUM_VALUE',
    changeType: 'ENUM_VALUE_REMOVED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'Enum Value Removed',
    impactDescription: 'Clients submitting or expecting the removed enum value will fail validation or business logic.',
    defaultRemediation: 'Retain legacy enum constants and mark as deprecated in documentation.',
  },
  'BR-14': {
    ruleId: 'BR-14',
    category: 'ENUM_VALUE',
    changeType: 'ENUM_VALUE_ADDED',
    defaultSeverity: 'WARNING_RISK',
    title: 'New Enum Value Added in Response',
    impactDescription: 'Clients with exhaustive switch statements or strict enum parsers may throw runtime errors.',
    defaultRemediation: 'Ensure client applications have a default/fallback branch before introducing new enum variants.',
  },
  'BR-15': {
    ruleId: 'BR-15',
    category: 'REQUEST_BODY',
    changeType: 'REQUIRED_REQUEST_FIELD_ADDED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'New Required Field Added to Request Body',
    impactDescription: 'Existing client requests lacking this field will fail with 400 Bad Request or 422 Unprocessable Entity.',
    defaultRemediation: 'Make the new request parameter optional with a sensible default value.',
  },
  'BR-16': {
    ruleId: 'BR-16',
    category: 'PARAMETER',
    changeType: 'REQUIRED_PARAM_ADDED',
    defaultSeverity: 'CRITICAL_BREAKING',
    title: 'New Required Query or Header Parameter Added',
    impactDescription: 'Existing client requests missing this parameter will be rejected.',
    defaultRemediation: 'Change parameter requirement to optional or supply a default value on the server.',
  },
};
