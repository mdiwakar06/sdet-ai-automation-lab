/**
 * JSON Schema Draft 2020-12 Schema Inferrer
 * Merges heterogeneous payloads into unified JSON Schemas with required/optional detection
 */

import { JsonSchema, JsonSchemaPrimitiveType } from '../types/schema';
import { FormatDetector } from './FormatDetector';

export interface InferrerOptions {
  requiredThreshold?: number; // 0.0 to 1.0 (default 1.0: 100% presence required)
  detectEnums?: boolean;
  maxEnumValues?: number;
  minEnumSamples?: number;
  includeExamples?: boolean;
}

export class SchemaInferrer {
  private options: Required<InferrerOptions>;

  constructor(options: InferrerOptions = {}) {
    this.options = {
      requiredThreshold: options.requiredThreshold ?? 1.0,
      detectEnums: options.detectEnums ?? true,
      maxEnumValues: options.maxEnumValues ?? 10,
      minEnumSamples: options.minEnumSamples ?? 3,
      includeExamples: options.includeExamples ?? true,
    };
  }

  /**
   * Infers a single consolidated JSON Schema from an array of sample payloads
   */
  inferFromSamples(samples: any[]): JsonSchema {
    if (!samples || samples.length === 0) {
      return { type: 'object' };
    }

    const filteredSamples = samples.filter((s) => s !== undefined);
    if (filteredSamples.length === 0) {
      return { type: 'null' };
    }

    return this.inferNode(filteredSamples);
  }

  /**
   * Recursive node inference over an array of sample values at a given AST node
   */
  private inferNode(values: any[]): JsonSchema {
    const totalSamples = values.length;
    if (totalSamples === 0) {
      return {};
    }

    const typesSet = new Set<JsonSchemaPrimitiveType>();
    const nonNullValues: any[] = [];
    let hasNull = false;

    for (const val of values) {
      if (val === null) {
        hasNull = true;
        typesSet.add('null');
      } else if (Array.isArray(val)) {
        typesSet.add('array');
        nonNullValues.push(val);
      } else if (typeof val === 'number') {
        if (Number.isInteger(val)) {
          typesSet.add('integer');
        } else {
          typesSet.add('number');
        }
        nonNullValues.push(val);
      } else if (typeof val === 'string') {
        typesSet.add('string');
        nonNullValues.push(val);
      } else if (typeof val === 'boolean') {
        typesSet.add('boolean');
        nonNullValues.push(val);
      } else if (typeof val === 'object') {
        typesSet.add('object');
        nonNullValues.push(val);
      }
    }

    // If integer and number both present, consolidate to number
    if (typesSet.has('integer') && typesSet.has('number')) {
      typesSet.delete('integer');
    }

    const types = Array.from(typesSet);
    const schema: JsonSchema = {
      'x-inferred-samples': totalSamples,
    };

    // 1. Handle Multiple Types / Union Types
    if (types.length === 0) {
      return { type: 'null' };
    }

    if (types.length === 1) {
      schema.type = types[0];
    } else if (types.length === 2 && types.includes('null')) {
      const nonNullType = types.find((t) => t !== 'null')!;
      schema.type = [nonNullType, 'null'];
      schema.nullable = true;
    } else {
      schema.type = types;
    }

    // 2. Object handling
    if (types.includes('object')) {
      const propertyMap: Record<string, any[]> = {};
      const propertyCounts: Record<string, number> = {};

      const objectSamples = nonNullValues.filter(
        (v) => typeof v === 'object' && !Array.isArray(v) && v !== null
      );

      for (const obj of objectSamples) {
        for (const [key, val] of Object.entries(obj)) {
          if (!propertyMap[key]) {
            propertyMap[key] = [];
            propertyCounts[key] = 0;
          }
          propertyMap[key].push(val);
          propertyCounts[key] += 1;
        }
      }

      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, propValues] of Object.entries(propertyMap)) {
        const count = propertyCounts[key];
        const frequency = count / objectSamples.length;
        const childSchema = this.inferNode(propValues);
        childSchema['x-inferred-frequency'] = Number(frequency.toFixed(2));

        properties[key] = childSchema;

        if (frequency >= this.options.requiredThreshold) {
          required.push(key);
        }
      }

      schema.properties = properties;
      if (required.length > 0) {
        schema.required = required.sort();
      }
    }

    // 3. Array handling
    if (types.includes('array')) {
      const arraySamples = nonNullValues.filter((v) => Array.isArray(v));
      const allItems: any[] = [];
      for (const arr of arraySamples) {
        allItems.push(...arr);
      }

      if (allItems.length > 0) {
        schema.items = this.inferNode(allItems);
      } else {
        schema.items = {};
      }
    }

    // 4. String format and enum detection
    if (types.includes('string')) {
      const stringSamples = nonNullValues.filter((v) => typeof v === 'string') as string[];
      if (stringSamples.length > 0) {
        // Format detection: if all strings match a single format
        const detectedFormats = stringSamples.map((s) => FormatDetector.detect(s)).filter(Boolean);
        if (
          detectedFormats.length === stringSamples.length &&
          detectedFormats.every((f) => f === detectedFormats[0])
        ) {
          schema.format = detectedFormats[0] as string;
        }

        // Enum detection: check unique values
        if (this.options.detectEnums && stringSamples.length >= this.options.minEnumSamples) {
          const uniqueValues = Array.from(new Set(stringSamples));
          if (
            uniqueValues.length <= this.options.maxEnumValues &&
            uniqueValues.length < stringSamples.length &&
            !schema.format
          ) {
            schema.enum = uniqueValues.sort();
          }
        }

        if (this.options.includeExamples && stringSamples.length > 0) {
          schema.example = stringSamples[0];
        }
      }
    }

    // 5. Number / Integer examples
    if (types.includes('number') || types.includes('integer')) {
      const numSamples = nonNullValues.filter((v) => typeof v === 'number') as number[];
      if (this.options.includeExamples && numSamples.length > 0) {
        schema.example = numSamples[0];
      }
    }

    // 6. Boolean examples
    if (types.includes('boolean')) {
      const boolSamples = nonNullValues.filter((v) => typeof v === 'boolean') as boolean[];
      if (this.options.includeExamples && boolSamples.length > 0) {
        schema.example = boolSamples[0];
      }
    }

    return schema;
  }
}
