/**
 * @module mod-manager/config/types
 * @description 配置系统类型定义
 */

// ============ JSON Schema 类型 ============

/**
 * JSON Schema (简化版 Draft 7)
 */
export interface JSONSchema {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  title?: string;
  description?: string;
  default?: unknown;
  
  // 字符串验证
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // 数字验证
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  
  // 枚举
  enum?: unknown[];
  
  // 对象验证
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  
  // 数组验证
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // 组合
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  
  // 引用
  $ref?: string;
  
  // 国际化
  titleZh?: string;
  descriptionZh?: string;
}

// ============ 验证结果类型 ============

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ConfigValidationError[];
}

/**
 * 配置验证错误
 */
export interface ConfigValidationError {
  /** 字段路径 (如 "user.name") */
  path: string;
  /** 错误消息 */
  message: string;
  /** 实际值 */
  value?: unknown;
  /** 期望类型或值 */
  expected?: string;
}

// ============ 错误类型 ============

/**
 * Schema 解析错误
 */
export class SchemaParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaParseError';
  }
}

/**
 * 配置验证错误
 */
export class ConfigValidationFailedError extends Error {
  constructor(
    public readonly errors: ConfigValidationError[]
  ) {
    super(`Config validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'ConfigValidationFailedError';
  }
}
