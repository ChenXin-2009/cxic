/**
 * @module mod-manager/config/ConfigValidator
 * @description 配置验证器
 */

import type {
  JSONSchema,
  ConfigValidationResult,
  ConfigValidationError,
} from './types';

/**
 * 配置验证器
 * 
 * 根据 JSON Schema 验证配置对象。
 */
export class ConfigValidator {
  /**
   * 验证配置
   * 
   * @param config - 配置对象
   * @param schema - JSON Schema
   * @returns 验证结果
   */
  static validate(config: unknown, schema: JSONSchema): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    this.validateValue(config, schema, '', errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证值
   */
  private static validateValue(
    value: unknown,
    schema: JSONSchema,
    path: string,
    errors: ConfigValidationError[]
  ): void {
    // 验证类型
    if (schema.type) {
      if (!this.validateType(value, schema.type)) {
        errors.push({
          path,
          message: `Expected type ${schema.type}`,
          value,
          expected: schema.type,
        });
        return; // 类型错误，跳过后续验证
      }
    }

    // 根据类型进行具体验证
    switch (schema.type) {
      case 'string':
        this.validateString(value as string, schema, path, errors);
        break;
      case 'number':
        this.validateNumber(value as number, schema, path, errors);
        break;
      case 'array':
        this.validateArray(value as unknown[], schema, path, errors);
        break;
      case 'object':
        this.validateObject(value as Record<string, unknown>, schema, path, errors);
        break;
    }

    // 验证枚举
    if (schema.enum) {
      if (!schema.enum.includes(value)) {
        errors.push({
          path,
          message: `Value must be one of: ${schema.enum.join(', ')}`,
          value,
          expected: schema.enum.join(', '),
        });
      }
    }
  }

  /**
   * 验证类型
   */
  private static validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return true;
    }
  }

  /**
   * 验证字符串
   */
  private static validateString(
    value: string,
    schema: JSONSchema,
    path: string,
    errors: ConfigValidationError[]
  ): void {
    // 最小长度
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `String length must be at least ${schema.minLength}`,
        value,
        expected: `length >= ${schema.minLength}`,
      });
    }

    // 最大长度
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `String length must be at most ${schema.maxLength}`,
        value,
        expected: `length <= ${schema.maxLength}`,
      });
    }

    // 正则表达式
    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `String must match pattern: ${schema.pattern}`,
            value,
            expected: schema.pattern,
          });
        }
      } catch (error) {
        errors.push({
          path,
          message: `Invalid regex pattern: ${schema.pattern}`,
          value,
        });
      }
    }
  }

  /**
   * 验证数字
   */
  private static validateNumber(
    value: number,
    schema: JSONSchema,
    path: string,
    errors: ConfigValidationError[]
  ): void {
    // 最小值
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: `Number must be at least ${schema.minimum}`,
        value,
        expected: `>= ${schema.minimum}`,
      });
    }

    // 最大值
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: `Number must be at most ${schema.maximum}`,
        value,
        expected: `<= ${schema.maximum}`,
      });
    }

    // 倍数
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      errors.push({
        path,
        message: `Number must be a multiple of ${schema.multipleOf}`,
        value,
        expected: `multiple of ${schema.multipleOf}`,
      });
    }
  }

  /**
   * 验证数组
   */
  private static validateArray(
    value: unknown[],
    schema: JSONSchema,
    path: string,
    errors: ConfigValidationError[]
  ): void {
    // 最小项数
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        path,
        message: `Array must have at least ${schema.minItems} items`,
        value,
        expected: `length >= ${schema.minItems}`,
      });
    }

    // 最大项数
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        path,
        message: `Array must have at most ${schema.maxItems} items`,
        value,
        expected: `length <= ${schema.maxItems}`,
      });
    }

    // 唯一性
    if (schema.uniqueItems) {
      const seen = new Set();
      for (let i = 0; i < value.length; i++) {
        const item = JSON.stringify(value[i]);
        if (seen.has(item)) {
          errors.push({
            path: `${path}[${i}]`,
            message: 'Array items must be unique',
            value: value[i],
          });
        }
        seen.add(item);
      }
    }

    // 验证每个项
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        this.validateValue(value[i], schema.items, `${path}[${i}]`, errors);
      }
    }
  }

  /**
   * 验证对象
   */
  private static validateObject(
    value: Record<string, unknown>,
    schema: JSONSchema,
    path: string,
    errors: ConfigValidationError[]
  ): void {
    // 验证必需字段
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in value)) {
          errors.push({
            path: path ? `${path}.${field}` : field,
            message: `Required field "${field}" is missing`,
            value: undefined,
          });
        }
      }
    }

    // 验证属性
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          const fieldPath = path ? `${path}.${key}` : key;
          this.validateValue(value[key], propSchema, fieldPath, errors);
        }
      }
    }

    // 验证额外属性
    if (schema.additionalProperties === false && schema.properties) {
      const allowedKeys = Object.keys(schema.properties);
      for (const key of Object.keys(value)) {
        if (!allowedKeys.includes(key)) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: `Additional property "${key}" is not allowed`,
            value: value[key],
          });
        }
      }
    }
  }

  /**
   * 验证配置并抛出异常
   * 
   * @param config - 配置对象
   * @param schema - JSON Schema
   * @throws {ConfigValidationFailedError} 当验证失败时抛出
   */
  static validateOrThrow(config: unknown, schema: JSONSchema): void {
    const result = this.validate(config, schema);
    if (!result.valid) {
      const { ConfigValidationFailedError } = require('./types');
      throw new ConfigValidationFailedError(result.errors);
    }
  }

  /**
   * 快速检查配置是否有效
   * 
   * @param config - 配置对象
   * @param schema - JSON Schema
   * @returns 是否有效
   */
  static isValid(config: unknown, schema: JSONSchema): boolean {
    return this.validate(config, schema).valid;
  }
}
