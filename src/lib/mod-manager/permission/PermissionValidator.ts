/**
 * @module mod-manager/permission/PermissionValidator
 * @description 权限验证器实现
 */

import type { ModRegistry } from '../core/ModRegistry';
import type { ModManifest } from '../types';
import {
  PermissionString,
  PermissionValidationResult,
  PermissionDeniedError,
  PermissionParseError,
} from './types';
import { PermissionParser } from './PermissionParser';

/**
 * 权限验证器
 * 
 * 负责验证 MOD 是否有权限执行特定操作。
 * 使用缓存机制优化性能。
 */
export class PermissionValidator {
  /** 权限验证缓存 (key: "modId:permission", value: hasPermission) */
  private cache: Map<string, boolean> = new Map();

  constructor(private registry: ModRegistry) {}

  /**
   * 验证 MOD 是否有指定权限
   * 
   * @param modId - MOD ID
   * @param requiredPermission - 所需权限字符串
   * @returns 是否有权限
   * 
   * @example
   * ```ts
   * const hasPermission = validator.validate('my-mod', 'time:read');
   * ```
   */
  validate(modId: string, requiredPermission: PermissionString): boolean {
    const cacheKey = `${modId}:${requiredPermission}`;

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 获取 MOD 清单
    const manifest = this.registry.getManifest(modId);
    if (!manifest) {
      this.cache.set(cacheKey, false);
      return false;
    }

    // 向后兼容：未声明权限的 MOD 自动授予所有权限
    if (!manifest.permissions && !manifest.optionalPermissions) {
      console.warn(
        `[Backward Compatibility] MOD "${modId}" has no permission declarations. ` +
        `Granting all permissions. Please migrate to new permission system.`
      );
      this.cache.set(cacheKey, true);
      return true;
    }

    // 解析所需权限
    let required;
    try {
      required = PermissionParser.parse(requiredPermission);
    } catch (error) {
      // 如果权限字符串无效，拒绝访问
      console.error(
        `[Permission] Invalid permission string "${requiredPermission}":`,
        error
      );
      this.cache.set(cacheKey, false);
      return false;
    }

    // 检查已授予的权限
    const grantedPermissions = [
      ...(manifest.permissions || []),
      ...(manifest.optionalPermissions || []),
    ];

    const hasPermission = grantedPermissions.some(grantedStr => {
      try {
        const granted = PermissionParser.parse(grantedStr);
        return PermissionParser.matches(required, granted);
      } catch {
        // 忽略无效的权限声明
        return false;
      }
    });

    this.cache.set(cacheKey, hasPermission);
    return hasPermission;
  }

  /**
   * 验证权限，失败时抛出异常
   * 
   * @param modId - MOD ID
   * @param requiredPermission - 所需权限字符串
   * @throws {PermissionDeniedError} 当权限验证失败时抛出
   * 
   * @example
   * ```ts
   * try {
   *   validator.validateOrThrow('my-mod', 'time:write');
   * } catch (error) {
   *   if (error instanceof PermissionDeniedError) {
   *     console.error('Permission denied:', error.message);
   *   }
   * }
   * ```
   */
  validateOrThrow(modId: string, requiredPermission: PermissionString): void {
    if (!this.validate(modId, requiredPermission)) {
      const manifest = this.registry.getManifest(modId);
      const modName = manifest?.name || modId;
      
      throw new PermissionDeniedError(
        modId,
        requiredPermission,
        `MOD "${modName}" does not have permission: ${requiredPermission}. ` +
        `Please add this permission to the MOD manifest.`
      );
    }
  }

  /**
   * 预先验证 MOD 清单中声明的所有权限
   * 
   * 在 MOD 加载时调用，确保所有声明的权限格式正确。
   * 
   * @param manifest - MOD 清单
   * @returns 验证结果
   * 
   * @example
   * ```ts
   * const result = validator.validateManifest(manifest);
   * if (!result.valid) {
   *   console.error('Invalid permissions:', result.errors);
   * }
   * ```
   */
  validateManifest(manifest: ModManifest): PermissionValidationResult {
    const errors: string[] = [];

    const allPermissions = [
      ...(manifest.permissions || []),
      ...(manifest.optionalPermissions || []),
    ];

    // 验证每个权限字符串
    for (const permStr of allPermissions) {
      try {
        PermissionParser.parse(permStr);
      } catch (error) {
        if (error instanceof PermissionParseError) {
          errors.push(`Invalid permission "${permStr}": ${error.message}`);
        } else {
          errors.push(`Failed to parse permission "${permStr}"`);
        }
      }
    }

    // 检查重复权限
    const uniquePermissions = new Set(allPermissions);
    if (uniquePermissions.size < allPermissions.length) {
      const duplicates = allPermissions.filter(
        (perm, index) => allPermissions.indexOf(perm) !== index
      );
      errors.push(
        `Duplicate permissions found: ${[...new Set(duplicates)].join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清除权限缓存
   * 
   * @param modId - 可选的 MOD ID，如果提供则只清除该 MOD 的缓存
   * 
   * @example
   * ```ts
   * // 清除特定 MOD 的缓存
   * validator.clearCache('my-mod');
   * 
   * // 清除所有缓存
   * validator.clearCache();
   * ```
   */
  clearCache(modId?: string): void {
    if (modId) {
      // 清除特定 MOD 的缓存
      const prefix = `${modId}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * 获取 MOD 的所有已授予权限
   * 
   * @param modId - MOD ID
   * @returns 权限字符串数组
   * 
   * @example
   * ```ts
   * const permissions = validator.getGrantedPermissions('my-mod');
   * console.log('Granted permissions:', permissions);
   * ```
   */
  getGrantedPermissions(modId: string): PermissionString[] {
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
   * 检查 MOD 是否有任何权限声明
   * 
   * @param modId - MOD ID
   * @returns 是否有权限声明
   */
  hasPermissionDeclarations(modId: string): boolean {
    const manifest = this.registry.getManifest(modId);
    if (!manifest) {
      return false;
    }

    return !!(
      (manifest.permissions && manifest.permissions.length > 0) ||
      (manifest.optionalPermissions && manifest.optionalPermissions.length > 0)
    );
  }
}
