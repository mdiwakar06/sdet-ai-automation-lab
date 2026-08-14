/**
 * Use Case 2: Breaking Changes - Field Removal & Type Mutation Test Suite
 */

import { DiffEngine } from '../../src/diff/DiffEngine';
import { OpenApiDocument } from '../../src/types/schema';
import { logger } from '../../src/utils/logger';

export async function runUseCase2(): Promise<{ name: string; passed: boolean; error?: string }> {
  const name = 'UC-2: Breaking Type Mutation & Required Field Removal';
  logger.section(`Running ${name}`);

  try {
    // 1. Define Baseline OpenAPI 3.1 Spec
    const baselineSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'User & Billing API', version: '1.0.0' },
      paths: {
        '/users/{userId}': {
          get: {
            summary: 'Get User Profile',
            responses: {
              '200': {
                description: 'User details',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['id', 'name', 'email', 'price'],
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        price: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Update User Billing',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['tier'],
                    properties: {
                      tier: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Updated' },
            },
          },
        },
      },
    };

    // 2. Define Observed Spec with intentional breaking mutations
    const observedSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'User & Billing API', version: '1.1.0-breaking' },
      paths: {
        '/users/{userId}': {
          get: {
            summary: 'Get User Profile',
            responses: {
              '200': {
                description: 'User details',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      // 'email' was removed from payload, 'price' changed to string
                      required: ['id', 'name', 'price'],
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        price: { type: 'string' }, // BREAKING: number -> string
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Update User Billing',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    // BREAKING: 'taxId' is a newly added REQUIRED request field
                    required: ['tier', 'taxId'],
                    properties: {
                      tier: { type: 'string' },
                      taxId: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Updated' },
            },
          },
        },
      },
    };

    const diffEngine = new DiffEngine();
    const report = diffEngine.compare(baselineSpec, observedSpec);

    // Verify Breaking Changes Detected
    const breakingDiffs = report.diffs.filter((d) => d.severity === 'CRITICAL_BREAKING');
    logger.info(`Total diffs detected: ${report.diffs.length}, Critical breaking: ${breakingDiffs.length}`);

    // Check Rule BR-07: Required response field 'email' removed
    const emailDiff = report.diffs.find((d) => d.ruleId === 'BR-07' && d.pointer.includes('email'));
    if (!emailDiff) {
      throw new Error("Expected BR-07 (Required response field 'email' removed) was not detected.");
    }
    logger.success(`Verified BR-07: ${emailDiff.description}`);

    // Check Rule BR-10: Type changed from number to string for 'price'
    const priceDiff = report.diffs.find((d) => d.ruleId === 'BR-10' && d.pointer.includes('price'));
    if (!priceDiff) {
      throw new Error("Expected BR-10 (Field type changed for 'price') was not detected.");
    }
    logger.success(`Verified BR-10: ${priceDiff.description}`);

    // Check Rule BR-15: New required field 'taxId' added to request body
    const taxDiff = report.diffs.find((d) => d.ruleId === 'BR-15' && d.pointer.includes('taxId'));
    if (!taxDiff) {
      throw new Error("Expected BR-15 (New required field in request body) was not detected.");
    }
    logger.success(`Verified BR-15: ${taxDiff.description}`);

    if (!report.summary.isContractBroken) {
      throw new Error('Expected report.summary.isContractBroken to be true.');
    }

    if (report.summary.score > 50) {
      throw new Error(`Expected degraded integrity score (< 50), got: ${report.summary.score}`);
    }

    return { name, passed: true };
  } catch (err: any) {
    logger.error(`Use Case 2 failed: ${err.message}`);
    return { name, passed: false, error: err.message };
  }
}
