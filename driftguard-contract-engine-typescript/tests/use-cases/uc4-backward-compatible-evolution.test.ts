/**
 * Use Case 4: Backward-Compatible Evolution & Additive Changes Test Suite
 */

import { DiffEngine } from '../../src/diff/DiffEngine';
import { OpenApiDocument } from '../../src/types/schema';
import { logger } from '../../src/utils/logger';

export async function runUseCase4(): Promise<{ name: string; passed: boolean; assertionsCount: number; error?: string }> {
  const name = 'UC-4: Backward-Compatible Evolution & Additive Contracts';
  logger.section(`Running ${name}`);
  let assertionsCount = 0;

  try {
    // 1. Baseline Specification
    const baselineSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Catalog API', version: '1.0.0' },
      paths: {
        '/catalog/items': {
          get: {
            summary: 'List Catalog Items',
            responses: {
              '200': {
                description: 'Items list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['items', 'total'],
                      properties: {
                        total: { type: 'integer' },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['id', 'title'],
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // 2. Observed Spec with Safe Additive Features (New endpoint, new method, new optional field)
    const observedSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Catalog API', version: '1.1.0' },
      paths: {
        '/catalog/items': {
          get: {
            summary: 'List Catalog Items',
            responses: {
              '200': {
                description: 'Items list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['items', 'total'],
                      properties: {
                        total: { type: 'integer' },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['id', 'title'],
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                              rating: { type: 'number' }, // Non-breaking additive field
                              tags: { type: 'array', items: { type: 'string' } }, // Non-breaking additive field
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            // Non-breaking additive HTTP verb
            summary: 'Create Catalog Item',
            responses: {
              '201': { description: 'Item Created' },
            },
          },
        },
        '/catalog/categories': {
          // Non-breaking new endpoint
          get: {
            summary: 'Get Categories',
            responses: {
              '200': { description: 'Categories list' },
            },
          },
        },
      },
    };

    const diffEngine = new DiffEngine();
    const report = diffEngine.compare(baselineSpec, observedSpec);

    logger.info(`Total diffs detected: ${report.diffs.length}`);

    // Verify Rule BR-02: New endpoint added (NON_BREAKING_ADDITION)
    const newEndpointDiff = report.diffs.find(
      (d) => d.ruleId === 'BR-02' && d.path === '/catalog/categories'
    );
    if (!newEndpointDiff || newEndpointDiff.severity !== 'NON_BREAKING_ADDITION') {
      throw new Error("Expected BR-02 (New endpoint added as NON_BREAKING_ADDITION) was not detected.");
    }
    assertionsCount++;
    logger.success(`Verified BR-02: ${newEndpointDiff.description}`);

    // Verify Rule BR-04: New HTTP method POST added (NON_BREAKING_ADDITION)
    const newMethodDiff = report.diffs.find((d) => d.ruleId === 'BR-04' && d.method === 'POST');
    if (!newMethodDiff || newMethodDiff.severity !== 'NON_BREAKING_ADDITION') {
      throw new Error("Expected BR-04 (New method added as NON_BREAKING_ADDITION) was not detected.");
    }
    assertionsCount++;
    logger.success(`Verified BR-04: ${newMethodDiff.description}`);

    // Verify Rule BR-09: Additive response properties (NON_BREAKING_ADDITION)
    const ratingFieldDiff = report.diffs.find(
      (d) => d.ruleId === 'BR-09' && d.pointer.includes('rating')
    );
    if (!ratingFieldDiff || ratingFieldDiff.severity !== 'NON_BREAKING_ADDITION') {
      throw new Error("Expected BR-09 (Additive response property as NON_BREAKING_ADDITION) was not detected.");
    }
    assertionsCount++;
    logger.success(`Verified BR-09: ${ratingFieldDiff.description}`);

    const tagsFieldDiff = report.diffs.find(
      (d) => d.ruleId === 'BR-09' && d.pointer.includes('tags')
    );
    if (!tagsFieldDiff || tagsFieldDiff.severity !== 'NON_BREAKING_ADDITION') {
      throw new Error("Expected BR-09 (Additive response property 'tags') was not detected.");
    }
    assertionsCount++;
    logger.success(`Verified BR-09: ${tagsFieldDiff.description}`);

    // Verify Overall Contract Status is COMPATIBLE
    if (report.summary.isContractBroken) {
      throw new Error('Expected report.summary.isContractBroken to be false for backward-compatible evolution.');
    }
    assertionsCount++;

    if (report.summary.criticalBreakingCount !== 0) {
      throw new Error(`Expected 0 critical breaking changes, found ${report.summary.criticalBreakingCount}`);
    }
    assertionsCount++;

    if (report.summary.score !== 100) {
      throw new Error(`Expected perfect score (100), got: ${report.summary.score}`);
    }
    assertionsCount++;

    logger.success(`Verified 100% contract compatibility score: ${report.summary.score}%`);

    return { name, passed: true, assertionsCount };
  } catch (err: any) {
    logger.error(`Use Case 4 failed: ${err.message}`);
    return { name, passed: false, assertionsCount, error: err.message };
  }
}
