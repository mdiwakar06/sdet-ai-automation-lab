/**
 * JSON Schema Draft 2020-12 & OpenAPI 3.1 Spec Type Definitions
 */

export type JsonSchemaPrimitiveType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type JsonSchemaType = JsonSchemaPrimitiveType | JsonSchemaPrimitiveType[];

export interface JsonSchema {
  $schema?: string;
  $id?: string;
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  format?: string;
  enum?: any[];
  const?: any;
  default?: any;
  example?: any;
  nullable?: boolean; // OpenAPI 3.0 backward compatibility

  // Numeric constraints
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  // String constraints
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Array constraints
  items?: JsonSchema | JsonSchema[];
  prefixItems?: JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object constraints
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  minProperties?: number;
  maxProperties?: number;

  // Composition
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;

  // Metadata / Custom annotations
  'x-inferred-samples'?: number;
  'x-inferred-frequency'?: number;
  [key: string]: any;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  schema?: JsonSchema;
  example?: any;
}

export interface MediaTypeObject {
  schema?: JsonSchema;
  example?: any;
  examples?: Record<string, any>;
}

export interface RequestBodyObject {
  description?: string;
  content: Record<string, MediaTypeObject>; // e.g. 'application/json'
  required?: boolean;
}

export interface ResponseObject {
  description: string;
  headers?: Record<string, any>;
  content?: Record<string, MediaTypeObject>;
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>; // e.g. '200', '400', 'default'
  deprecated?: boolean;
}

export interface PathItemObject {
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  parameters?: ParameterObject[];
}

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name: string; url?: string };
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiDocument {
  openapi: string; // "3.1.0"
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  paths: Record<string, PathItemObject>;
  components?: {
    schemas?: Record<string, JsonSchema>;
    responses?: Record<string, ResponseObject>;
    parameters?: Record<string, ParameterObject>;
    requestBodies?: Record<string, RequestBodyObject>;
    securitySchemes?: Record<string, any>;
  };
  tags?: Array<{ name: string; description?: string }>;
}
