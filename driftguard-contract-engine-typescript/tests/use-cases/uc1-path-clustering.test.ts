/**
 * Use Case 1: Route Normalization & Shannon Entropy Path Clustering Test Suite
 */

import { PathNormalizer } from '../../src/clustering/PathNormalizer';
import { TokenEntropy } from '../../src/clustering/TokenEntropy';
import { logger } from '../../src/utils/logger';

export async function runUseCase1(): Promise<{ name: string; passed: boolean; error?: string }> {
  const name = 'UC-1: Path Normalization & Entropy Clustering';
  logger.section(`Running ${name}`);

  try {
    // 1. UUID Normalization
    const uuidPath = '/api/v1/users/550e8400-e29b-41d4-a716-446655440000/orders';
    const normUuid = PathNormalizer.normalize(uuidPath);
    if (normUuid !== '/api/v1/users/{userId}/orders') {
      throw new Error(`UUID Normalization failed: expected '/api/v1/users/{userId}/orders', got '${normUuid}'`);
    }
    logger.success(`UUID normalization: ${uuidPath} -> ${normUuid}`);

    // 2. MongoDB ObjectId Normalization
    const mongoPath = '/v1/products/507f1f77bcf86cd799439011';
    const normMongo = PathNormalizer.normalize(mongoPath);
    if (normMongo !== '/v1/products/{productId}') {
      throw new Error(`MongoDB ObjectId Normalization failed: got '${normMongo}'`);
    }
    logger.success(`MongoDB ObjectId: ${mongoPath} -> ${normMongo}`);

    // 3. Numeric ID Normalization
    const numPath = '/items/49281';
    const normNum = PathNormalizer.normalize(numPath);
    if (normNum !== '/items/{itemId}') {
      throw new Error(`Numeric ID Normalization failed: got '${normNum}'`);
    }
    logger.success(`Numeric ID: ${numPath} -> ${normNum}`);

    // 4. Prefixed ID Normalization (e.g. Stripe/Shopify style cust_12345)
    const prefPath = '/customers/cust_9876543210ab';
    const normPref = PathNormalizer.normalize(prefPath);
    if (normPref !== '/customers/{customerId}') {
      throw new Error(`Prefixed ID Normalization failed: got '${normPref}'`);
    }
    logger.success(`Prefixed ID: ${prefPath} -> ${normPref}`);

    // 5. Preserving Static Dictionary Routes
    const staticRoutes = ['/users/me', '/orders/summary', '/health', '/api/v1/auth/login', '/system/metrics'];
    for (const route of staticRoutes) {
      const norm = PathNormalizer.normalize(route);
      if (norm !== route) {
        throw new Error(`Static route '${route}' was improperly parameterized to '${norm}'`);
      }
      logger.success(`Static dictionary preserved: ${route}`);
    }

    // 6. High Entropy Dynamic Slug Normalization
    const entropyToken = 'x8f2a9c4b1d7e3f0';
    const dynamicSlugPath = `/articles/${entropyToken}`;
    const entropy = TokenEntropy.calculate(entropyToken);
    if (entropy < 2.5) {
      throw new Error(`Entropy calculation unexpected: ${entropy}`);
    }
    const normSlug = PathNormalizer.normalize(dynamicSlugPath);
    if (normSlug !== '/articles/{articleId}') {
      throw new Error(`High entropy slug normalization failed: got '${normSlug}'`);
    }
    logger.success(`High entropy slug: ${dynamicSlugPath} (entropy=${entropy.toFixed(2)}) -> ${normSlug}`);

    // 7. Multi-Tier Nested Resource Normalization
    const multiTier = '/users/101/orders/505/items/909';
    const normMulti = PathNormalizer.normalize(multiTier);
    if (normMulti !== '/users/{userId}/orders/{orderId}/items/{itemId}') {
      throw new Error(`Multi-tier normalization failed: got '${normMulti}'`);
    }
    logger.success(`Multi-tier nested: ${multiTier} -> ${normMulti}`);

    // 8. Stripping Query Params and URL Fragments
    const queryUrl = 'https://api.example.com/v1/users/42?filter=active&sort=desc#profile';
    const normQuery = PathNormalizer.normalize(queryUrl);
    if (normQuery !== '/v1/users/{userId}') {
      throw new Error(`Query param stripping failed: got '${normQuery}'`);
    }
    logger.success(`Query and fragment stripping: ${queryUrl} -> ${normQuery}`);

    return { name, passed: true };
  } catch (err: any) {
    logger.error(`Use Case 1 failed: ${err.message}`);
    return { name, passed: false, error: err.message };
  }
}
