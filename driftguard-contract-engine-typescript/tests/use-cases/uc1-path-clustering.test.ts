/**
 * Use Case 1: Route Normalization, Shannon Entropy & HAR Archive Clustering Test Suite
 */

import { PathNormalizer } from '../../src/clustering/PathNormalizer';
import { TokenEntropy } from '../../src/clustering/TokenEntropy';
import { HarParser } from '../../src/collector/HarParser';
import { logger } from '../../src/utils/logger';

export async function runUseCase1(): Promise<{ name: string; passed: boolean; assertionsCount: number; error?: string }> {
  const name = 'UC-1: Path Normalization, Entropy & HAR Clustering';
  logger.section(`Running ${name}`);
  let assertionsCount = 0;

  try {
    // 1. UUID Normalization
    const uuidPath = '/api/v1/users/550e8400-e29b-41d4-a716-446655440000/orders';
    const normUuid = PathNormalizer.normalize(uuidPath);
    if (normUuid !== '/api/v1/users/{userId}/orders') {
      throw new Error(`UUID Normalization failed: expected '/api/v1/users/{userId}/orders', got '${normUuid}'`);
    }
    assertionsCount++;
    logger.success(`UUID normalization: ${uuidPath} -> ${normUuid}`);

    // 2. MongoDB ObjectId Normalization
    const mongoPath = '/v1/products/507f1f77bcf86cd799439011';
    const normMongo = PathNormalizer.normalize(mongoPath);
    if (normMongo !== '/v1/products/{productId}') {
      throw new Error(`MongoDB ObjectId Normalization failed: got '${normMongo}'`);
    }
    assertionsCount++;
    logger.success(`MongoDB ObjectId: ${mongoPath} -> ${normMongo}`);

    // 3. Numeric ID Normalization
    const numPath = '/items/49281';
    const normNum = PathNormalizer.normalize(numPath);
    if (normNum !== '/items/{itemId}') {
      throw new Error(`Numeric ID Normalization failed: got '${normNum}'`);
    }
    assertionsCount++;
    logger.success(`Numeric ID: ${numPath} -> ${normNum}`);

    // 4. Prefixed ID Normalization (e.g. Stripe/Shopify style cust_12345)
    const prefPath = '/customers/cust_9876543210ab';
    const normPref = PathNormalizer.normalize(prefPath);
    if (normPref !== '/customers/{customerId}') {
      throw new Error(`Prefixed ID Normalization failed: got '${normPref}'`);
    }
    assertionsCount++;
    logger.success(`Prefixed ID: ${prefPath} -> ${normPref}`);

    // 5. Preserving Static Dictionary Routes
    const staticRoutes = ['/users/me', '/orders/summary', '/health', '/api/v1/auth/login', '/system/metrics'];
    for (const route of staticRoutes) {
      const norm = PathNormalizer.normalize(route);
      if (norm !== route) {
        throw new Error(`Static route '${route}' was improperly parameterized to '${norm}'`);
      }
      assertionsCount++;
      logger.success(`Static dictionary preserved: ${route}`);
    }

    // 6. High Entropy Dynamic Slug Normalization
    const entropyToken = 'x8f2a9c4b1d7e3f0';
    const dynamicSlugPath = `/articles/${entropyToken}`;
    const entropy = TokenEntropy.calculate(entropyToken);
    if (entropy < 2.5) {
      throw new Error(`Entropy calculation unexpected: ${entropy}`);
    }
    assertionsCount++;
    const normSlug = PathNormalizer.normalize(dynamicSlugPath);
    if (normSlug !== '/articles/{articleId}') {
      throw new Error(`High entropy slug normalization failed: got '${normSlug}'`);
    }
    assertionsCount++;
    logger.success(`High entropy slug: ${dynamicSlugPath} (entropy=${entropy.toFixed(2)}) -> ${normSlug}`);

    // 7. Multi-Tier Nested Resource Normalization
    const multiTier = '/users/101/orders/505/items/909';
    const normMulti = PathNormalizer.normalize(multiTier);
    if (normMulti !== '/users/{userId}/orders/{orderId}/items/{itemId}') {
      throw new Error(`Multi-tier normalization failed: got '${normMulti}'`);
    }
    assertionsCount++;
    logger.success(`Multi-tier nested: ${multiTier} -> ${normMulti}`);

    // 8. Stripping Query Params and URL Fragments
    const queryUrl = 'https://api.example.com/v1/users/42?filter=active&sort=desc#profile';
    const normQuery = PathNormalizer.normalize(queryUrl);
    if (normQuery !== '/v1/users/{userId}') {
      throw new Error(`Query param stripping failed: got '${normQuery}'`);
    }
    assertionsCount++;
    logger.success(`Query and fragment stripping: ${queryUrl} -> ${normQuery}`);

    // 9. ULID Normalization
    const ulidPath = '/transactions/01ARZ3NDEKTSV4RRFFQ69G5FAV';
    const normUlid = PathNormalizer.normalize(ulidPath);
    if (normUlid !== '/transactions/{transactionId}') {
      throw new Error(`ULID normalization failed: got '${normUlid}'`);
    }
    assertionsCount++;
    logger.success(`ULID normalization: ${ulidPath} -> ${normUlid}`);

    // 10. HAR Archive Parsing & Batch Route Extraction
    const sampleHar = {
      log: {
        version: '1.2',
        creator: { name: 'DriftGuard Test', version: '1.0' },
        entries: [
          {
            startedDateTime: '2026-08-15T10:00:00.000Z',
            time: 25,
            request: {
              method: 'GET',
              url: 'https://api.example.com/v1/orgs/org_558899/members/101',
              headers: [{ name: 'Authorization', value: 'Bearer test-token' }],
              queryString: [],
            },
            response: {
              status: 200,
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              content: { text: JSON.stringify({ memberId: '101', role: 'ADMIN' }) },
            },
          },
          {
            startedDateTime: '2026-08-15T10:00:01.000Z',
            time: 30,
            request: {
              method: 'POST',
              url: 'https://api.example.com/v1/orgs/org_558899/invites',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              postData: { text: JSON.stringify({ email: 'newmember@example.com' }) },
            },
            response: {
              status: 201,
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              content: { text: JSON.stringify({ inviteId: 'inv_998877', status: 'PENDING' }) },
            },
          },
        ],
      },
    };

    const harRecords = HarParser.parse(sampleHar);
    if (harRecords.length !== 2) {
      throw new Error(`Expected 2 records parsed from HAR, got ${harRecords.length}`);
    }
    assertionsCount++;

    const normHarPath1 = PathNormalizer.normalize(harRecords[0].url);
    if (normHarPath1 !== '/v1/orgs/{orgId}/members/{memberId}') {
      throw new Error(`HAR record 1 normalization failed: got '${normHarPath1}'`);
    }
    assertionsCount++;

    const normHarPath2 = PathNormalizer.normalize(harRecords[1].url);
    if (normHarPath2 !== '/v1/orgs/{orgId}/invites') {
      throw new Error(`HAR record 2 normalization failed: got '${normHarPath2}'`);
    }
    assertionsCount++;
    logger.success(`HAR Archive ingestion: 2 entries parsed and normalized to ${normHarPath1} and ${normHarPath2}`);

    return { name, passed: true, assertionsCount };
  } catch (err: any) {
    logger.error(`Use Case 1 failed: ${err.message}`);
    return { name, passed: false, assertionsCount, error: err.message };
  }
}
