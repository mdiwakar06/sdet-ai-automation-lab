/**
 * Use Case 3: Enum Constraints, HTTP Status Code & Nullability Drift Test Suite
 */

import { DiffEngine } from '../../src/diff/DiffEngine';
import { OpenApiDocument } from '../../src/types/schema';
import { logger } from '../../src/utils/logger';

export async function runUseCase3(): Promise<{ name: string; passed: boolean; error?: string }> {
  const name = 'UC-3: Enum Constraints, Status Codes & Nullability Drift';
  logger.section(`Running ${name}`);

  try {
    // 1. Baseline Specification
    const baselineSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Order & Membership API', version: '1.0.0' },
      paths: {
        '/orders/{orderId}': {
          get: {
            summary: 'Get Order Status',
            responses: {
              '200': {
                description: 'Order found',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['id', 'status', 'notes'],
                      properties: {
                        id: { type: 'string' },
                        status: {
                          type: 'string',
                          enum: ['PENDING', 'ACTIVE', 'CANCELLED', 'SUSPENDED'],
                        },
                        notes: { type: 'string' }, // Non-nullable in baseline
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'Order Not Found',
              },
            },
          },
        },
      },
    };

    // 2. Observed Specification with Enum & Status Code Drift
    const observedSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Order & Membership API', version: '1.2.0' },
      paths: {
        '/orders/{orderId}': {
          get: {
            summary: 'Get Order Status',
            responses: {
              '200': {
                description: 'Order found',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['id', 'status', 'notes'],
                      properties: {
                        id: { type: 'string' },
                        status: {
                          type: 'string',
                          // 'SUSPENDED' was removed (BREAKING), 'ARCHIVED' was added (WARNING)
                          enum: ['PENDING', 'ACTIVE', 'CANCELLED', 'ARCHIVED'],
                        },
                        notes: { type: ['string', 'null'], nullable: true }, // Nullability widened (BREAKING)
                      },
                    },
                  },
                },
              },
              '500': {
                // 404 was removed (BREAKING), 500 was introduced (WARNING)
                description: 'Internal Server Error',
              },
            },
          },
        },
      },
    };

    const diffEngine = new DiffEngine();
    const report = diffEngine.compare(baselineSpec, observedSpec);

    logger.info(`Total diffs detected: ${report.diffs.length}`);

    // Verify Rule BR-13: Enum value 'SUSPENDED' removed (CRITICAL_BREAKING)
    const enumRemovedDiff = report.diffs.find((d) => d.ruleId === 'BR-13');
    if (!enumRemovedDiff) {
      throw new Error("Expected BR-13 (Enum value 'SUSPENDED' removed) was not detected.");
    }
    logger.success(`Verified BR-13: ${enumRemovedDiff.description}`);

    // Verify Rule BR-14: Enum value 'ARCHIVED' added (WARNING_RISK)
    const enumAddedDiff = report.diffs.find((d) => d.ruleId === 'BR-14');
    if (!enumAddedDiff) {
      throw new Error("Expected BR-14 (Enum value 'ARCHIVED' added) was not detected.");
    }
    logger.success(`Verified BR-14: ${enumAddedDiff.description}`);

    // Verify Rule BR-05: Expected status code '404' removed (CRITICAL_BREAKING)
    const status404Diff = report.diffs.find((d) => d.ruleId === 'BR-05' && d.statusCode === '404');
    if (!status404Diff) {
      throw new Error("Expected BR-05 (Status code '404' removed) was not detected.");
    }
    logger.success(`Verified BR-05: ${status404Diff.description}`);

    // Verify Rule BR-06: New status code '500' added (WARNING_RISK)
    const status500Diff = report.diffs.find((d) => d.ruleId === 'BR-06' && d.statusCode === '500');
    if (!status500Diff) {
      throw new Error("Expected BR-06 (Status code '500' added) was not detected.");
    }
    logger.success(`Verified BR-06: ${status500Diff.description}`);

    // Verify Rule BR-11: Nullability widened for 'notes' (CRITICAL_BREAKING)
    const nullabilityDiff = report.diffs.find((d) => d.ruleId === 'BR-11');
    if (!nullabilityDiff) {
      throw new Error("Expected BR-11 (Nullability widened for 'notes') was not detected.");
    }
    logger.success(`Verified BR-11: ${nullabilityDiff.description}`);

    return { name, passed: true };
  } catch (err: any) {
    logger.error(`Use Case 3 failed: ${err.message}`);
    return { name, passed: false, error: err.message };
  }
}
