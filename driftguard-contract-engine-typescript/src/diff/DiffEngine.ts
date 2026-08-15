/**
 * Deep Recursive OpenAPI 3.1 & JSON Schema Diff Engine
 */

import {
  OpenApiDocument,
  PathItemObject,
  OperationObject,
  RequestBodyObject,
  ResponseObject,
  JsonSchema,
  ParameterObject,
} from '../types/schema';
import { DiffItem, DriftReport, DriftSummary, SeverityLevel } from '../types/diff';
import { JsonPointer } from './JsonPointer';
import { BREAKING_RULES, RuleDefinition } from './BreakingRules';

export interface DiffEngineOptions {
  ignorePaths?: (string | RegExp)[];
  treatMissingStatusAsWarning?: boolean;
}

export class DiffEngine {
  private options: DiffEngineOptions;
  private diffs: DiffItem[] = [];

  constructor(options: DiffEngineOptions = {}) {
    this.options = options;
  }

  /**
   * Compares a Baseline OpenAPI spec against an Observed OpenAPI spec
   */
  compare(baseline: OpenApiDocument, observed: OpenApiDocument): DriftReport {
    this.diffs = [];
    const baselinePaths = Object.keys(baseline.paths || {});
    const observedPaths = Object.keys(observed.paths || {});
    const allPaths = Array.from(new Set([...baselinePaths, ...observedPaths]));

    for (const pathKey of allPaths) {
      if (this.isPathIgnored(pathKey)) continue;

      const baselinePathItem: PathItemObject | undefined = baseline.paths?.[pathKey];
      const observedPathItem: PathItemObject | undefined = observed.paths?.[pathKey];

      if (baselinePathItem && !observedPathItem) {
        this.addDiff('BR-01', {
          pointer: JsonPointer.compile(['paths', pathKey]),
          path: pathKey,
          description: `Path '${pathKey}' was present in baseline but missing in observed spec.`,
          expected: 'Path present',
          actual: 'Path missing',
        });
        continue;
      }

      if (!baselinePathItem && observedPathItem) {
        this.addDiff('BR-02', {
          pointer: JsonPointer.compile(['paths', pathKey]),
          path: pathKey,
          description: `New path '${pathKey}' was introduced in observed spec.`,
          expected: 'None',
          actual: 'Path added',
        });
        continue;
      }

      if (baselinePathItem && observedPathItem) {
        this.comparePathItems(pathKey, baselinePathItem, observedPathItem);
      }
    }

    const summary = this.buildSummary(baseline, observed);

    return {
      id: `report-${Date.now()}`,
      title: 'DriftGuard API Contract Drift Report',
      generatedAt: new Date().toISOString(),
      baselineVersion: baseline.info?.version || '1.0.0',
      observedVersion: observed.info?.version || '1.0.0',
      summary,
      diffs: this.diffs,
      baselineSpec: baseline,
      observedSpec: observed,
    };
  }

  private comparePathItems(
    pathKey: string,
    baselineItem: PathItemObject,
    observedItem: PathItemObject
  ): void {
    const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

    for (const method of httpMethods) {
      const baselineOp: OperationObject | undefined = (baselineItem as any)[method];
      const observedOp: OperationObject | undefined = (observedItem as any)[method];

      if (baselineOp && !observedOp) {
        this.addDiff('BR-03', {
          pointer: JsonPointer.compile(['paths', pathKey, method]),
          path: pathKey,
          method: method.toUpperCase(),
          description: `HTTP method '${method.toUpperCase()}' removed from endpoint '${pathKey}'.`,
          expected: `${method.toUpperCase()} operation`,
          actual: 'Operation missing',
        });
        continue;
      }

      if (!baselineOp && observedOp) {
        this.addDiff('BR-04', {
          pointer: JsonPointer.compile(['paths', pathKey, method]),
          path: pathKey,
          method: method.toUpperCase(),
          description: `New HTTP method '${method.toUpperCase()}' added to endpoint '${pathKey}'.`,
          expected: 'None',
          actual: `${method.toUpperCase()} operation added`,
        });
        continue;
      }

      if (baselineOp && observedOp) {
        this.compareOperations(pathKey, method.toUpperCase(), baselineOp, observedOp);
      }
    }
  }

  private compareOperations(
    pathKey: string,
    method: string,
    baselineOp: OperationObject,
    observedOp: OperationObject
  ): void {
    const methodLower = method.toLowerCase();
    const opPointer = ['paths', pathKey, methodLower];

    // 1. Compare Parameters
    this.compareParameters(
      pathKey,
      method,
      [...opPointer, 'parameters'],
      baselineOp.parameters || [],
      observedOp.parameters || []
    );

    // 2. Compare Request Bodies
    this.compareRequestBodies(
      pathKey,
      method,
      [...opPointer, 'requestBody'],
      baselineOp.requestBody,
      observedOp.requestBody
    );

    // 3. Compare Responses
    this.compareResponses(
      pathKey,
      method,
      [...opPointer, 'responses'],
      baselineOp.responses || {},
      observedOp.responses || {}
    );
  }

  private compareParameters(
    pathKey: string,
    method: string,
    pointerBase: string[],
    baselineParams: ParameterObject[],
    observedParams: ParameterObject[]
  ): void {
    const baselineMap = new Map<string, ParameterObject>();
    for (const p of baselineParams) {
      baselineMap.set(`${p.in}:${p.name}`, p);
    }

    const observedMap = new Map<string, ParameterObject>();
    for (const p of observedParams) {
      observedMap.set(`${p.in}:${p.name}`, p);
    }

    // Check for newly added required parameters
    for (const [key, obsParam] of observedMap.entries()) {
      const baseParam = baselineMap.get(key);
      if (!baseParam && obsParam.required) {
        this.addDiff('BR-16', {
          pointer: JsonPointer.compile([...pointerBase, obsParam.name]),
          path: pathKey,
          method,
          description: `New required ${obsParam.in} parameter '${obsParam.name}' added to '${method} ${pathKey}'.`,
          expected: 'Optional or parameter absent',
          actual: `Required ${obsParam.in} parameter '${obsParam.name}'`,
        });
      }
    }

    // Check for removed parameters
    for (const [key, baseParam] of baselineMap.entries()) {
      if (!observedMap.has(key)) {
        this.addDiff('BR-08', {
          pointer: JsonPointer.compile([...pointerBase, baseParam.name]),
          path: pathKey,
          method,
          description: `${baseParam.in} parameter '${baseParam.name}' was removed from '${method} ${pathKey}'.`,
          expected: `${baseParam.in} parameter '${baseParam.name}'`,
          actual: 'Parameter missing',
        });
      }
    }
  }

  private compareRequestBodies(
    pathKey: string,
    method: string,
    pointerBase: string[],
    baselineBody?: RequestBodyObject,
    observedBody?: RequestBodyObject
  ): void {
    if (!baselineBody && !observedBody) return;

    if (!baselineBody && observedBody?.required) {
      this.addDiff('BR-15', {
        pointer: JsonPointer.compile([...pointerBase]),
        path: pathKey,
        method,
        description: `Endpoint '${method} ${pathKey}' now requires a Request Body that was not previously required.`,
        expected: 'No required request body',
        actual: 'Required request body',
      });
      return;
    }

    const baselineJson = baselineBody?.content?.['application/json']?.schema;
    const observedJson = observedBody?.content?.['application/json']?.schema;

    if (baselineJson && observedJson) {
      this.compareSchemas(
        pathKey,
        method,
        undefined,
        [...pointerBase, 'content', 'application/json', 'schema'],
        baselineJson,
        observedJson,
        'request'
      );
    }
  }

  private compareResponses(
    pathKey: string,
    method: string,
    pointerBase: string[],
    baselineResponses: Record<string, ResponseObject>,
    observedResponses: Record<string, ResponseObject>
  ): void {
    const allStatusCodes = Array.from(
      new Set([...Object.keys(baselineResponses), ...Object.keys(observedResponses)])
    );

    for (const status of allStatusCodes) {
      const baseResp = baselineResponses[status];
      const obsResp = observedResponses[status];

      if (baseResp && !obsResp) {
        this.addDiff('BR-05', {
          pointer: JsonPointer.compile([...pointerBase, status]),
          path: pathKey,
          method,
          statusCode: status,
          description: `Expected response status code '${status}' was not observed for '${method} ${pathKey}'.`,
          expected: `Status ${status}`,
          actual: 'Status missing',
        });
        continue;
      }

      if (!baseResp && obsResp) {
        this.addDiff('BR-06', {
          pointer: JsonPointer.compile([...pointerBase, status]),
          path: pathKey,
          method,
          statusCode: status,
          description: `New response status code '${status}' observed for '${method} ${pathKey}'.`,
          expected: 'Status absent',
          actual: `Status ${status}`,
        });
        continue;
      }

      if (baseResp && obsResp) {
        const baseSchema = baseResp.content?.['application/json']?.schema;
        const obsSchema = obsResp.content?.['application/json']?.schema;

        if (baseSchema && obsSchema) {
          this.compareSchemas(
            pathKey,
            method,
            status,
            [...pointerBase, status, 'content', 'application/json', 'schema'],
            baseSchema,
            obsSchema,
            'response'
          );
        }
      }
    }
  }

  private compareSchemas(
    pathKey: string,
    method: string,
    statusCode: string | undefined,
    pointerBase: string[],
    baseSchema: JsonSchema,
    obsSchema: JsonSchema,
    context: 'request' | 'response'
  ): void {
    // 1. Type comparison & Nullability
    const baseTypes = this.normalizeTypes(baseSchema);
    const obsTypes = this.normalizeTypes(obsSchema);

    const baseHasNull = baseTypes.includes('null') || baseSchema.nullable === true;
    const obsHasNull = obsTypes.includes('null') || obsSchema.nullable === true;

    const basePrimary = baseTypes.filter((t) => t !== 'null');
    const obsPrimary = obsTypes.filter((t) => t !== 'null');

    // Compare Primary Types
    if (basePrimary.length > 0 && obsPrimary.length > 0) {
      const typeMismatch = !basePrimary.some((t) => obsPrimary.includes(t));
      if (typeMismatch) {
        this.addDiff('BR-10', {
          pointer: JsonPointer.compile([...pointerBase, 'type']),
          path: pathKey,
          method,
          statusCode,
          description: `Type changed at ${JsonPointer.compile(pointerBase)}: expected '${basePrimary.join('/')}', observed '${obsPrimary.join('/')}'.`,
          expected: basePrimary.join(' | '),
          actual: obsPrimary.join(' | '),
        });
      }
    }

    // Compare Nullability
    if (!baseHasNull && obsHasNull && context === 'response') {
      this.addDiff('BR-11', {
        pointer: JsonPointer.compile([...pointerBase, 'nullable']),
        path: pathKey,
        method,
        statusCode,
        description: `Field nullability widened: field at ${JsonPointer.compile(pointerBase)} is now nullable in response.`,
        expected: 'non-null',
        actual: 'nullable',
      });
    } else if (baseHasNull && !obsHasNull && context === 'response') {
      this.addDiff('BR-12', {
        pointer: JsonPointer.compile([...pointerBase, 'nullable']),
        path: pathKey,
        method,
        statusCode,
        description: `Field nullability narrowed: field at ${JsonPointer.compile(pointerBase)} is non-null.`,
        expected: 'nullable',
        actual: 'non-null',
      });
    }

    // 2. Enum comparison
    if (baseSchema.enum || obsSchema.enum) {
      this.compareEnums(pathKey, method, statusCode, pointerBase, baseSchema.enum, obsSchema.enum, context);
    }

    // 3. Object properties comparison
    if (baseSchema.type === 'object' || obsSchema.type === 'object' || baseSchema.properties || obsSchema.properties) {
      this.compareObjectProperties(pathKey, method, statusCode, pointerBase, baseSchema, obsSchema, context);
    }

    // 4. Array items comparison
    if (baseSchema.items || obsSchema.items) {
      const baseItem = Array.isArray(baseSchema.items) ? baseSchema.items[0] : baseSchema.items;
      const obsItem = Array.isArray(obsSchema.items) ? obsSchema.items[0] : obsSchema.items;

      if (baseItem && obsItem) {
        this.compareSchemas(
          pathKey,
          method,
          statusCode,
          [...pointerBase, 'items'],
          baseItem,
          obsItem,
          context
        );
      }
    }
  }

  private compareEnums(
    pathKey: string,
    method: string,
    statusCode: string | undefined,
    pointerBase: string[],
    baseEnum?: any[],
    obsEnum?: any[],
    context: 'request' | 'response' = 'response'
  ): void {
    if (baseEnum && obsEnum) {
      const baseSet = new Set(baseEnum);
      const obsSet = new Set(obsEnum);

      // Check for removed enum values
      for (const val of baseEnum) {
        if (!obsSet.has(val)) {
          this.addDiff('BR-13', {
            pointer: JsonPointer.compile([...pointerBase, 'enum']),
            path: pathKey,
            method,
            statusCode,
            description: `Enum value '${val}' removed from ${JsonPointer.compile(pointerBase)}.`,
            expected: `Enum includes '${val}'`,
            actual: `Available: [${obsEnum.join(', ')}]`,
          });
        }
      }

      // Check for added enum values
      for (const val of obsEnum) {
        if (!baseSet.has(val)) {
          this.addDiff('BR-14', {
            pointer: JsonPointer.compile([...pointerBase, 'enum']),
            path: pathKey,
            method,
            statusCode,
            description: `New enum value '${val}' added at ${JsonPointer.compile(pointerBase)}.`,
            expected: `[${baseEnum.join(', ')}]`,
            actual: `Enum includes '${val}'`,
          });
        }
      }
    }
  }

  private compareObjectProperties(
    pathKey: string,
    method: string,
    statusCode: string | undefined,
    pointerBase: string[],
    baseSchema: JsonSchema,
    obsSchema: JsonSchema,
    context: 'request' | 'response'
  ): void {
    const baseProps = baseSchema.properties || {};
    const obsProps = obsSchema.properties || {};
    const baseRequired = new Set(baseSchema.required || []);
    const obsRequired = new Set(obsSchema.required || []);

    const allPropKeys = Array.from(new Set([...Object.keys(baseProps), ...Object.keys(obsProps)]));

    for (const propKey of allPropKeys) {
      const baseProp = baseProps[propKey];
      const obsProp = obsProps[propKey];
      const propPointer = [...pointerBase, 'properties', propKey];

      // Missing in observed
      if (baseProp && !obsProp) {
        if (context === 'response') {
          if (baseRequired.has(propKey)) {
            this.addDiff('BR-07', {
              pointer: JsonPointer.compile(propPointer),
              path: pathKey,
              method,
              statusCode,
              description: `Required response property '${propKey}' missing from observed payload.`,
              expected: `Required property '${propKey}'`,
              actual: 'Property missing',
            });
          } else {
            this.addDiff('BR-08', {
              pointer: JsonPointer.compile(propPointer),
              path: pathKey,
              method,
              statusCode,
              description: `Optional response property '${propKey}' missing from observed payload.`,
              expected: `Optional property '${propKey}'`,
              actual: 'Property missing',
            });
          }
        }
        continue;
      }

      // Added in observed
      if (!baseProp && obsProp) {
        if (context === 'request') {
          if (obsRequired.has(propKey)) {
            this.addDiff('BR-15', {
              pointer: JsonPointer.compile(propPointer),
              path: pathKey,
              method,
              statusCode,
              description: `New required property '${propKey}' added to request body.`,
              expected: 'Property optional or not required',
              actual: `Required property '${propKey}'`,
            });
          } else {
            this.addDiff('BR-09', {
              pointer: JsonPointer.compile(propPointer),
              path: pathKey,
              method,
              statusCode,
              description: `New optional property '${propKey}' added to request body.`,
              expected: 'None',
              actual: `Optional property '${propKey}'`,
            });
          }
        } else {
          this.addDiff('BR-09', {
            pointer: JsonPointer.compile(propPointer),
            path: pathKey,
            method,
            statusCode,
            description: `New property '${propKey}' added to response body.`,
            expected: 'None',
            actual: `Property '${propKey}' added`,
          });
        }
        continue;
      }

      // Both present -> Deep compare recursive property schema
      if (baseProp && obsProp) {
        this.compareSchemas(
          pathKey,
          method,
          statusCode,
          propPointer,
          baseProp,
          obsProp,
          context
        );
      }
    }
  }

  private normalizeTypes(schema: JsonSchema): string[] {
    if (!schema.type) return [];
    if (Array.isArray(schema.type)) return schema.type;
    return [schema.type];
  }

  private addDiff(
    ruleId: string,
    data: {
      pointer: string;
      path: string;
      method?: string;
      statusCode?: string;
      description: string;
      expected?: any;
      actual?: any;
    }
  ): void {
    const rule: RuleDefinition = BREAKING_RULES[ruleId] || {
      ruleId,
      category: 'SCHEMA_FIELD',
      changeType: 'RESPONSE_FIELD_ADDED',
      defaultSeverity: 'WARNING_RISK',
      title: 'Contract Drift Detected',
      impactDescription: 'Potential divergence from baseline specification.',
      defaultRemediation: 'Inspect schema drift.',
    };

    this.diffs.push({
      id: `diff-${this.diffs.length + 1}`,
      ruleId: rule.ruleId,
      category: rule.category,
      changeType: rule.changeType,
      severity: rule.defaultSeverity,
      pointer: data.pointer,
      path: data.path,
      method: data.method,
      statusCode: data.statusCode,
      description: data.description,
      expected: data.expected,
      actual: data.actual,
      impact: rule.impactDescription,
      remediationAdvice: rule.defaultRemediation,
    });
  }

  private buildSummary(baseline: OpenApiDocument, observed: OpenApiDocument): DriftSummary {
    const totalDiffs = this.diffs.length;
    const criticalBreakingCount = this.diffs.filter((d) => d.severity === 'CRITICAL_BREAKING').length;
    const warningRiskCount = this.diffs.filter((d) => d.severity === 'WARNING_RISK').length;
    const nonBreakingAdditionCount = this.diffs.filter((d) => d.severity === 'NON_BREAKING_ADDITION').length;

    const totalEndpointsBaseline = Object.keys(baseline.paths || {}).length;
    const totalEndpointsObserved = Object.keys(observed.paths || {}).length;
    const totalEndpointsEvaluated = Array.from(
      new Set([...Object.keys(baseline.paths || {}), ...Object.keys(observed.paths || {})])
    ).length;

    // Calculate Contract Integrity Score (0 - 100)
    let score = 100;
    score -= criticalBreakingCount * 25;
    score -= warningRiskCount * 5;
    if (score < 0) score = 0;

    return {
      totalDiffs,
      criticalBreakingCount,
      warningRiskCount,
      nonBreakingAdditionCount,
      totalEndpointsBaseline,
      totalEndpointsObserved,
      totalEndpointsEvaluated,
      isContractBroken: criticalBreakingCount > 0,
      score,
    };
  }

  private isPathIgnored(path: string): boolean {
    if (!this.options.ignorePaths) return false;
    for (const pattern of this.options.ignorePaths) {
      if (typeof pattern === 'string' && path === pattern) return true;
      if (pattern instanceof RegExp && pattern.test(path)) return true;
    }
    return false;
  }
}
