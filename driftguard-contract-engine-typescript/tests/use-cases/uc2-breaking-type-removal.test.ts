/**
 * Use Case 2: Living Schema Inference, Type Mutation & Required Field Removal Test Suite
 */

import { SchemaInferrer } from '../../src/inferrer/SchemaInferrer';
import { FormatDetector } from '../../src/inferrer/FormatDetector';
import { DiffEngine } from '../../src/diff/DiffEngine';
import { OpenApiDocument } from '../../src/types/schema';
import { logger } from '../../src/utils/logger';

export async function runUseCase2(): Promise<{ name: string; passed: boolean; assertionsCount: number; error?: string }> {
  const name = 'UC-2: Living Schema Inference & Breaking Type Mutation';
  logger.section(`Running ${name}`);
  let assertionsCount = 0;

  try {
    // 1. Direct SchemaInferrer & Format Detection Unit Verification
    const inferrer = new SchemaInferrer({ requiredThreshold: 1.0, detectEnums: true });
    const samplePayloads = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user1@example.com',
        createdDate: '2026-08-15',
        ipAddress: '192.168.1.1',
        website: 'https://example.com/profile',
        status: 'ACTIVE',
        balance: 1500,
        extraTag: 'vip',
      },
      {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user2@example.com',
        createdDate: '2026-08-14',
        ipAddress: '10.0.0.1',
        website: 'https://example.com/u2',
        status: 'ACTIVE',
        balance: 2300,
        // extraTag omitted -> should not be required
      },
      {
        id: 'fa6b2169-7c82-4f32-a5dc-8c437fba26e8',
        email: 'user3@example.com',
        createdDate: '2026-08-13',
        ipAddress: '172.16.0.5',
        website: 'https://example.com/u3',
        status: 'INACTIVE',
        balance: 0,
        // extraTag omitted
      },
    ];

    const inferredSchema = inferrer.inferFromSamples(samplePayloads);
    if (!inferredSchema.properties) {
      throw new Error('Inferred schema missing properties object');
    }
    assertionsCount++;

    // Check required fields (100% frequency)
    const reqFields = inferredSchema.required || [];
    if (!reqFields.includes('id') || !reqFields.includes('email') || !reqFields.includes('balance')) {
      throw new Error(`Expected 'id', 'email', 'balance' in required array, got: ${reqFields.join(', ')}`);
    }
    assertionsCount++;

    // Check optional field extraTag (33% frequency -> not required)
    if (reqFields.includes('extraTag')) {
      throw new Error(`'extraTag' should be optional but was marked required.`);
    }
    assertionsCount++;

    // Check format detection
    if (inferredSchema.properties.id.format !== 'uuid') {
      throw new Error(`Expected uuid format for id, got ${inferredSchema.properties.id.format}`);
    }
    assertionsCount++;

    if (inferredSchema.properties.email.format !== 'email') {
      throw new Error(`Expected email format for email, got ${inferredSchema.properties.email.format}`);
    }
    assertionsCount++;

    if (inferredSchema.properties.ipAddress.format !== 'ipv4') {
      throw new Error(`Expected ipv4 format for ipAddress, got ${inferredSchema.properties.ipAddress.format}`);
    }
    assertionsCount++;

    if (inferredSchema.properties.website.format !== 'uri') {
      throw new Error(`Expected uri format for website, got ${inferredSchema.properties.website.format}`);
    }
    assertionsCount++;
    logger.success('Verified autonomous schema inference, optional/required filtering, and format detection.');

    // 2. Define Baseline OpenAPI 3.1 Spec
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

    // 3. Define Observed Spec with intentional breaking mutations
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
    assertionsCount++;
    logger.success(`Verified BR-07: ${emailDiff.description}`);

    // Check Rule BR-10: Type changed from number to string for 'price'
    const priceDiff = report.diffs.find((d) => d.ruleId === 'BR-10' && d.pointer.includes('price'));
    if (!priceDiff) {
      throw new Error("Expected BR-10 (Field type changed for 'price') was not detected.");
    }
    assertionsCount++;
    logger.success(`Verified BR-10: ${priceDiff.description}`);

    // Check Rule BR-15: New required field 'taxId' added to request body
    const taxDiff = report.diffs.find((d) => d.ruleId === 'BR-15' && d.pointer.includes('taxId'));
    if (!taxDiff) {
      throw new Error("Expected BR-15 (New required field in request body) was not detected.");
    }
    assertionsCount++;
    logger.success(`Verified BR-15: ${taxDiff.description}`);

    if (!report.summary.isContractBroken) {
      throw new Error('Expected report.summary.isContractBroken to be true.');
    }
    assertionsCount++;

    if (report.summary.score > 50) {
      throw new Error(`Expected degraded integrity score (< 50), got: ${report.summary.score}`);
    }
    assertionsCount++;

    return { name, passed: true, assertionsCount };
  } catch (err: any) {
    logger.error(`Use Case 2 failed: ${err.message}`);
    return { name, passed: false, assertionsCount, error: err.message };
  }
}
