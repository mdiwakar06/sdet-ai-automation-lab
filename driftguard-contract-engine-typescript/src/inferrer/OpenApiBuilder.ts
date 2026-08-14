/**
 * OpenAPI 3.1 Spec Builder from Captured HTTP Traffic
 */

import {
  OpenApiDocument,
  PathItemObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  JsonSchema,
} from '../types/schema';
import { HttpRequestRecord } from '../types/traffic';
import { PathNormalizer } from '../clustering/PathNormalizer';
import { SchemaInferrer, InferrerOptions } from './SchemaInferrer';

export interface OpenApiBuilderOptions {
  title?: string;
  version?: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
  inferrerOptions?: InferrerOptions;
}

export class OpenApiBuilder {
  private options: OpenApiBuilderOptions;
  private inferrer: SchemaInferrer;

  constructor(options: OpenApiBuilderOptions = {}) {
    this.options = options;
    this.inferrer = new SchemaInferrer(options.inferrerOptions);
  }

  /**
   * Constructs an OpenAPI 3.1.0 document from an array of HTTP traffic records
   */
  buildFromTraffic(records: HttpRequestRecord[]): OpenApiDocument {
    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: {
        title: this.options.title || 'Inferred API Specification',
        version: this.options.version || '1.0.0',
        description:
          this.options.description ||
          'OpenAPI 3.1.0 specification generated autonomously by DriftGuard from captured runtime traffic.',
      },
      servers: this.options.servers || [{ url: 'http://localhost:3000', description: 'Observed Server' }],
      paths: {},
    };

    // 1. Group records by normalizedPath -> method
    const grouped: Record<
      string,
      Record<
        string,
        {
          records: HttpRequestRecord[];
          pathParams: Set<string>;
          queryParams: Set<string>;
          requestBodies: any[];
          responsesByStatus: Record<string, any[]>;
        }
      >
    > = {};

    for (const rec of records) {
      const normalizedPath = rec.normalizedPath || PathNormalizer.normalize(rec.path || rec.url);
      const method = rec.method.toLowerCase();

      if (!grouped[normalizedPath]) {
        grouped[normalizedPath] = {};
      }
      if (!grouped[normalizedPath][method]) {
        grouped[normalizedPath][method] = {
          records: [],
          pathParams: new Set(),
          queryParams: new Set(),
          requestBodies: [],
          responsesByStatus: {},
        };
      }

      const opGroup = grouped[normalizedPath][method];
      opGroup.records.push(rec);

      // Extract path parameter names from template (e.g. {userId})
      const pathParamMatches = normalizedPath.match(/\{([^}]+)\}/g);
      if (pathParamMatches) {
        for (const m of pathParamMatches) {
          opGroup.pathParams.add(m.slice(1, -1));
        }
      }

      // Extract query parameters
      if (rec.queryParams) {
        for (const qKey of Object.keys(rec.queryParams)) {
          opGroup.queryParams.add(qKey);
        }
      }

      // Collect request body
      if (rec.requestBody !== undefined && rec.requestBody !== null) {
        opGroup.requestBodies.push(rec.requestBody);
      }

      // Collect response body by status code
      const statusKey = String(rec.statusCode || 200);
      if (!opGroup.responsesByStatus[statusKey]) {
        opGroup.responsesByStatus[statusKey] = [];
      }
      if (rec.responseBody !== undefined && rec.responseBody !== null) {
        opGroup.responsesByStatus[statusKey].push(rec.responseBody);
      }
    }

    // 2. Build paths and operations
    for (const [pathKey, methodsMap] of Object.entries(grouped)) {
      const pathItem: PathItemObject = {};

      for (const [methodKey, data] of Object.entries(methodsMap)) {
        const parameters: ParameterObject[] = [];

        // Add path parameters
        for (const pName of Array.from(data.pathParams)) {
          parameters.push({
            name: pName,
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: `Path parameter ${pName}`,
          });
        }

        // Add query parameters
        for (const qName of Array.from(data.queryParams)) {
          parameters.push({
            name: qName,
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: `Query parameter ${qName}`,
          });
        }

        // Add Request Body if present
        let requestBody: RequestBodyObject | undefined = undefined;
        if (data.requestBodies.length > 0) {
          const bodySchema = this.inferrer.inferFromSamples(data.requestBodies);
          requestBody = {
            description: `Inferred request payload (${data.requestBodies.length} samples)`,
            required: true,
            content: {
              'application/json': {
                schema: bodySchema,
              },
            },
          };
        }

        // Build responses
        const responses: Record<string, ResponseObject> = {};
        for (const [statusCode, respBodies] of Object.entries(data.responsesByStatus)) {
          const respSchema: JsonSchema =
            respBodies.length > 0 ? this.inferrer.inferFromSamples(respBodies) : { type: 'null' };
          responses[statusCode] = {
            description: `Inferred response for status ${statusCode} (${respBodies.length} samples)`,
            content: {
              'application/json': {
                schema: respSchema,
              },
            },
          };
        }

        // Ensure at least one response object exists
        if (Object.keys(responses).length === 0) {
          responses['200'] = {
            description: 'Successful response',
          };
        }

        const operation: OperationObject = {
          summary: `${methodKey.toUpperCase()} ${pathKey}`,
          description: `Observed ${data.records.length} invocation(s) via DriftGuard.`,
          parameters: parameters.length > 0 ? parameters : undefined,
          requestBody,
          responses,
        };

        (pathItem as any)[methodKey] = operation;
      }

      doc.paths[pathKey] = pathItem;
    }

    return doc;
  }
}
