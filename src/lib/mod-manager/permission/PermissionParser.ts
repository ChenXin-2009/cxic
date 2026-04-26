/**
 * @module mod-manager/permission/PermissionParser
 * @description 权限字符串解析器和格式化器
 */

import {
  Permission,
  PermissionString,
  PermissionCategory,
  PermissionAction,
  PermissionParseError,
  VALID_PERMISSION_CATEGORIES,
  VALID_PERMISSION_ACTIONS,
  PERMISSION_DESCRIPTIONS,
} from './types';

/**
 * 权限解析器
 * 
 * 提供权限字符串的解析、格式化、匹配和描述生成功能。
 */
export class PermissionParser {
  /**
   * 解析权限字符串为权限对象
   * 
   * @param permissionStr - 权限字符串（格式: "category:action"）
   * @returns 解析后的权限对象
   * @throws {PermissionParseError} 当格式无效时抛出
   * 
   * @example
   * ```ts
   * const perm = PermissionParser.parse('time:read');
   * // { category: 'time', action: 'read' }
   * ```
   */
  static parse(permissionStr: PermissionString): Permission {
    // 验证输入
    if (!permissionStr || typeof permissionStr !== 'string') {
      throw new PermissionParseError(
        `Invalid permission: expected string, got ${typeof permissionStr}`
      );
    }

    // 分割字符串
    const parts = permissionStr.trim().split(':');
    if (parts.length !== 2) {
      throw new PermissionParseError(
        `Invalid permission format: "${permissionStr}". Expected "category:action"`
      );
    }

    const [category, action] = parts;

    // 验证类别
    if (!this.isValidCategory(category)) {
      throw new PermissionParseError(
        `Invalid permission category: "${category}". ` +
        `Valid categories: ${VALID_PERMISSION_CATEGORIES.join(', ')}`
      );
    }

    // 验证操作
    if (!this.isValidAction(action)) {
      throw new PermissionParseError(
        `Invalid permission action: "${action}". ` +
        `Valid actions: ${VALID_PERMISSION_ACTIONS.join(', ')}`
      );
    }

    return {
      category: category as PermissionCategory,
      action: action as PermissionAction,
    };
  }

  /**
   * 批量解析权限数组
   * 
   * @param permissions - 权限字符串数组
   * @returns 解析后的权限对象数组
   * @throws {PermissionParseError} 当任何权限格式无效时抛出
   * 
   * @example
   * ```ts
   * const perms = PermissionParser.parseMany(['time:read', 'camera:write']);
   * ```
   */
  static parseMany(permissions: PermissionString[]): Permission[] {
    return permissions.map(p => this.parse(p));
  }

  /**
   * 格式化权限对象为字符串
   * 
   * @param permission - 权限对象
   * @returns 格式化后的权限字符串
   * 
   * @example
   * ```ts
   * const str = PermissionParser.format({ category: 'time', action: 'read' });
   * // "time:read"
   * ```
   */
  static format(permission: Permission): PermissionString {
    return `${permission.category}:${permission.action}`;
  }

  /**
   * 检查权限是否匹配（支持通配符）
   * 
   * @param required - 所需权限
   * @param granted - 已授予权限
   * @returns 是否匹配
   * 
   * @example
   * ```ts
   * // 精确匹配
   * PermissionParser.matches(
   *   { category: 'time', action: 'read' },
   *   { category: 'time', action: 'read' }
   * ); // true
   * 
   * // 通配符匹配
   * PermissionParser.matches(
   *   { category: 'time', action: 'read' },
   *   { category: 'time', action: '*' }
   * ); // true
   * 
   * // 不匹配
   * PermissionParser.matches(
   *   { category: 'time', action: 'write' },
   *   { category: 'camera', action: '*' }
   * ); // false
   * ```
   */
  static matches(required: Permission, granted: Permission): boolean {
    // 类别必须匹配
    if (required.category !== granted.category) {
      return false;
    }

    // 通配符匹配所有操作
    if (granted.action === '*') {
      return true;
    }

    // 精确匹配
    return required.action === granted.action;
  }

  /**
   * 生成人类可读的权限描述
   * 
   * @param permission - 权限对象
   * @returns 人类可读的描述
   * 
   * @example
   * ```ts
   * const desc = PermissionParser.describe({ category: 'time', action: 'read' });
   * // "读取当前时间和时间流速"
   * ```
   */
  static describe(permission: Permission): string {
    const categoryDescriptions = PERMISSION_DESCRIPTIONS[permission.category];
    if (!categoryDescriptions) {
      return `${permission.category}:${permission.action}`;
    }

    const description = categoryDescriptions[permission.action];
    return description || `${permission.category}:${permission.action}`;
  }

  /**
   * 生成权限字符串的人类可读描述
   * 
   * @param permissionStr - 权限字符串
   * @returns 人类可读的描述，如果解析失败则返回原字符串
   * 
   * @example
   * ```ts
   * const desc = PermissionParser.describeString('time:read');
   * // "读取当前时间和时间流速"
   * ```
   */
  static describeString(permissionStr: PermissionString): string {
    try {
      const permission = this.parse(permissionStr);
      return this.describe(permission);
    } catch {
      return permissionStr;
    }
  }

  /**
   * 验证类别是否有效
   * 
   * @param category - 类别字符串
   * @returns 是否有效
   */
  private static isValidCategory(category: string): boolean {
    return VALID_PERMISSION_CATEGORIES.includes(category as PermissionCategory);
  }

  /**
   * 验证操作是否有效
   * 
   * @param action - 操作字符串
   * @returns 是否有效
   */
  private static isValidAction(action: string): boolean {
    return VALID_PERMISSION_ACTIONS.includes(action as PermissionAction);
  }

  /**
   * 验证权限字符串格式是否有效（不抛出异常）
   * 
   * @param permissionStr - 权限字符串
   * @returns 是否有效
   * 
   * @example
   * ```ts
   * PermissionParser.isValid('time:read'); // true
   * PermissionParser.isValid('invalid'); // false
   * ```
   */
  static isValid(permissionStr: PermissionString): boolean {
    try {
      this.parse(permissionStr);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有有效的权限类别
   * 
   * @returns 权限类别数组
   */
  static getValidCategories(): PermissionCategory[] {
    return [...VALID_PERMISSION_CATEGORIES];
  }

  /**
   * 获取所有有效的权限操作
   * 
   * @returns 权限操作数组
   */
  static getValidActions(): PermissionAction[] {
    return [...VALID_PERMISSION_ACTIONS];
  }

  /**
   * 获取指定类别的所有可能权限字符串
   * 
   * @param category - 权限类别
   * @returns 权限字符串数组
   * 
   * @example
   * ```ts
   * PermissionParser.getAllPermissionsForCategory('time');
   * // ['time:read', 'time:write', 'time:execute', 'time:*']
   * ```
   */
  static getAllPermissionsForCategory(category: PermissionCategory): PermissionString[] {
    return VALID_PERMISSION_ACTIONS.map(action => `${category}:${action}`);
  }
}
