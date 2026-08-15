/**
 * Route & Path Normalizer with Multi-Stage Regex & Shannon Entropy
 */

import { TokenEntropy } from './TokenEntropy';

// Static reserved dictionary tokens that should never be converted to path parameters
const STATIC_RESERVED_SEGMENTS = new Set([
  'me',
  'self',
  'summary',
  'status',
  'health',
  'healthz',
  'metrics',
  'search',
  'filter',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'auth',
  'oauth',
  'callback',
  'token',
  'refresh',
  'verify',
  'reset',
  'all',
  'latest',
  'current',
  'active',
  'archived',
  'draft',
  'published',
  'count',
  'stats',
  'schema',
  'docs',
  'openapi',
  'swagger',
  'v1',
  'v2',
  'v3',
  'v4',
  'api',
  'webhook',
  'webhooks',
  'events',
  'export',
  'import',
  'download',
  'upload',
  'batch',
  'bulk',
  'sync',
  'ping',
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const NUMERIC_ID_REGEX = /^\d+$/;
const PREFIXED_ID_REGEX = /^[a-zA-Z]{2,6}_[0-9a-zA-Z]{6,}$/;
const BASE64_OR_HASH_REGEX = /^[a-zA-Z0-9_-]{16,}$/;

export interface NormalizationOptions {
  preserveStaticDictionary?: boolean;
  paramNamingStyle?: 'contextual' | 'generic'; // e.g. {userId} vs {id}
}

export class PathNormalizer {
  /**
   * Normalizes an arbitrary request URL or path into an OpenAPI-compliant templated path
   * e.g., "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/orders/12345"
   *    -> "/api/v1/users/{userId}/orders/{orderId}"
   */
  static normalize(rawPathOrUrl: string, options: NormalizationOptions = {}): string {
    const { preserveStaticDictionary = true, paramNamingStyle = 'contextual' } = options;

    if (!rawPathOrUrl) return '/';

    // 1. Strip protocol, host, port, query string, hash
    let path = rawPathOrUrl;
    try {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        const parsed = new URL(path);
        path = parsed.pathname;
      } else {
        path = path.split('?')[0].split('#')[0];
      }
    } catch {
      path = path.split('?')[0].split('#')[0];
    }

    // 2. Ensure leading slash and remove duplicate slashes
    path = '/' + path.replace(/^\/+/, '').replace(/\/+/g, '/');

    // 3. Remove trailing slash (except for root '/')
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const segments = path.split('/').filter(Boolean);
    const normalizedSegments: string[] = [];
    const usedParamNames = new Set<string>();

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prevSegment = i > 0 ? segments[i - 1] : '';

      // Check if already a template parameter like {id} or :id
      if (segment.startsWith('{') && segment.endsWith('}')) {
        normalizedSegments.push(segment);
        continue;
      }
      if (segment.startsWith(':')) {
        const name = segment.slice(1);
        normalizedSegments.push(`{${name}}`);
        continue;
      }

      // Check if static reserved keyword
      if (preserveStaticDictionary && STATIC_RESERVED_SEGMENTS.has(segment.toLowerCase())) {
        normalizedSegments.push(segment);
        continue;
      }

      // Determine if dynamic segment
      const isDynamic = this.isDynamicSegment(segment);

      if (isDynamic) {
        const paramName = this.generateParamName(prevSegment, usedParamNames, paramNamingStyle);
        usedParamNames.add(paramName);
        normalizedSegments.push(`{${paramName}}`);
      } else {
        normalizedSegments.push(segment);
      }
    }

    return '/' + normalizedSegments.join('/');
  }

  /**
   * Determines if a path segment is a dynamic variable (UUID, ObjectId, Numeric, Prefixed ID, or High Entropy Slug)
   */
  static isDynamicSegment(segment: string): boolean {
    if (!segment) return false;

    // Direct patterns
    if (UUID_REGEX.test(segment)) return true;
    if (ULID_REGEX.test(segment)) return true;
    if (MONGO_ID_REGEX.test(segment)) return true;
    if (NUMERIC_ID_REGEX.test(segment)) return true;
    if (PREFIXED_ID_REGEX.test(segment)) return true;

    // High entropy slugs / hashes
    if (BASE64_OR_HASH_REGEX.test(segment)) {
      const entropy = TokenEntropy.calculate(segment);
      if (entropy >= 2.7) {
        return true;
      }
    }

    // Dynamic slug test with fallback
    if (TokenEntropy.isDynamicSlug(segment)) {
      return true;
    }

    return false;
  }

  private static generateParamName(
    prevSegment: string,
    usedNames: Set<string>,
    style: 'contextual' | 'generic'
  ): string {
    if (style === 'generic' || !prevSegment) {
      let base = 'id';
      let candidate = base;
      let counter = 2;
      while (usedNames.has(candidate)) {
        candidate = `${base}${counter++}`;
      }
      return candidate;
    }

    // Contextual naming: e.g. "users" -> "userId", "orders" -> "orderId", "articles" -> "articleId"
    let singular = prevSegment.toLowerCase();
    if (singular.endsWith('ies')) {
      singular = singular.slice(0, -3) + 'y';
    } else if (/(ches|shes|xes|zes|sses)$/i.test(singular)) {
      singular = singular.slice(0, -2);
    } else if (singular.endsWith('s') && !singular.endsWith('ss')) {
      singular = singular.slice(0, -1);
    }

    // Clean non-alphanumeric
    singular = singular.replace(/[^a-zA-Z0-9]/g, '');

    const baseName = singular ? `${singular}Id` : 'id';
    let candidate = baseName;
    let counter = 2;

    while (usedNames.has(candidate)) {
      candidate = `${baseName}${counter++}`;
    }

    return candidate;
  }
}
