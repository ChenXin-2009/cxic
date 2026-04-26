/**
 * @module mod-manager/permission/PermissionSystem
 * @description 权限系统主类
 */

import type { ModRegistry } from '../core/ModRegistry';
import type { ModManifest } from '../types';
import {
  PermissionString,
  PermissionValidationResult,
} from './types';
import { PermissionValidator } from './PermissionValidator';
import { PermissionParser } from './PermissionParser';

/**
 * 权限系统
 * 
 * 提供权限管理的统一接口，整合权限验证、查询和描述功能。
 */
export class PermissionSystem {
  private validator: PermissionValidator;

  constructor(private registry: ModRegistry) {
    this.validator = new PermissionValidator(registry);
  }

  /**
   * 检查 MOD 是否有权限
   * 
   * @param modId - MOD ID
   * @param permission - 权限字符串
   * @returns 是否有权限
   * 
   * @example
   * ```ts
   * if (permissionSystem.hasPermission('my-mod', 'time:read')) {
   *   // 允许访问
   * }
   * ```
   */
  hasPermission(modId: string, permission: PermissionString): boolean {
    return this.validator.validate(modId, permission);
  }

  /**
   * 要求 MOD 必须有权限，否则抛出异常
   * 
   * @param modId - MOD ID
   * @param permission - 权限字符串
   * @throws {PermissionDeniedError} 当权限验证失败时抛出
   * 
   * @example
   * ```ts
   * permissionSystem.requirePermission('my-mod', 'time:write');
   * // 如果没有权限，会抛出 PermissionDeniedError
   * ```
   */
  requirePermission(modId: string, permission: PermissionString): void {
    this.validator.validateOrThrow(modId, permission);
  }

  /**
   * 获取 MOD 的所有权限
   * 
   * @param modId - MOD ID
   * @returns 权限字符串数组
   * 
   * @example
   * ```ts
   * const permissions = permissionSystem.getPermissions('my-mod');
   * console.log('MOD permissions:', permissions);
   * ```
   */
  getPermissions(modId: string): PermissionString[] {
    const manifest = this.registry.getManifest(modId);
    if (!manifest) {
      return [];
    }

    return [
      ...(manifest.permissions || []),
      ...(manifest.optionalPermissions || []),
    ];
  }

  /**
   * 获取 MOD 的必需权限
   * 
   * @param modId - MOD ID
   * @returns 必需权限字符串数组
   */
  getRequiredPermissions(modId: string): PermissionString[] {
    const manifest = this.registry.getManifest(modId);
    return manifest?.permissions || [];
  }

  /**
   * 获取 MOD 的可选权限
   * 
   * @param modId - MOD ID
   * @returns 可选权限字符串数组
   */
  getOptionalPermissions(modId: string): PermissionString[] {
    const manifest = this.registry.getManifest(modId);
    return manifest?.optionalPermissions || [];
  }

  /**
   * 获取权限的人类可读描述
   * 
   * @param permission - 权限字符串
   * @returns 人类可读的描述
   * 
   * @example
   * ```ts
   * const desc = permissionSystem.describePermission('time:read');
   * // "读取当前时间和时间流速"
   * ```
   */
  describePermission(permission: PermissionString): string {
    return PermissionParser.describeString(permission);
  }

  /**
   * 获取 MOD 的所有权限及其描述
   * 
   * @param modId - MOD ID
   * @returns 权限及描述的映射
   * 
   * @example
   * ```ts
   * const descriptions = permissionSystem.getPermissionDescriptions('my-mod');
   * // { 'time:read': '读取当前时间和时间流速', ... }
   * ```
   */
  getPermissionDescriptions(modId: string): Record<string, string> {
    const permissions = this.getPermissions(modId);
    const descriptions: Record<string, string> = {};

    for (const permission of permissions) {
      descriptions[permission] = this.describePermission(permission);
    }

    return descriptions;
  }

  /**
   * 验证清单中的权限声明
   * 
   * @param manifest - MOD 清单
   * @returns 验证结果
   * 
   * @example
   * ```ts
   * const result = permissionSystem.validateManifest(manifest);
   * if (!result.valid) {
   *   console.error('Invalid permissions:', result.errors);
   * }
   * ```
   */
  validateManifest(manifest: ModManifest): PermissionValidationResult {
    return this.validator.validateManifest(manifest);
  }

  /**
   * 清除权限缓存
   * 
   * @param modId - 可选的 MOD ID
   * 
   * @example
   * ```ts
   * // 清除特定 MOD 的缓存
   * permissionSystem.clearCache('my-mod');
   * 
   * // 清除所有缓存
   * permissionSystem.clearCache();
   * ```
   */
  clearCache(modId?: string): void {
    this.validator.clearCache(modId);
  }

  /**
   * 检查 MOD 是否有权限声明
   * 
   * @param modId - MOD ID
   * @returns 是否有权限声明
   */
  hasPermissionDeclarations(modId: string): boolean {
    return this.validator.hasPermissionDeclarations(modId);
  }

  /**
   * 获取所有有效的权限类别
   * 
   * @returns 权限类别数组
   */
  getValidCategories() {
    return PermissionParser.getValidCategories();
  }

  /**
   * 获取所有有效的权限操作
   * 
   * @returns 权限操作数组
   */
  getValidActions() {
    return PermissionParser.getValidActions();
  }

  /**
   * 获取指定类别的所有可能权限
   * 
   * @param category - 权限类别
   * @returns 权限字符串数组
   */
  getAllPermissionsForCategory(category: string) {
    return PermissionParser.getAllPermissionsForCategory(category as any);
  }

  /**
   * 验证权限字符串格式
   * 
   * @param permission - 权限字符串
   * @returns 是否有效
   */
  isValidPermission(permission: PermissionString): boolean {
    return PermissionParser.isValid(permission);
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存大小
   */
  getCacheSize(): number {
    return this.validator.getCacheSize();
  }

  /**
   * 获取权限验证器实例（用于高级用法）
   * 
   * @returns 权限验证器
   */
  getValidator(): PermissionValidator {
    return this.validator;
  }
}
