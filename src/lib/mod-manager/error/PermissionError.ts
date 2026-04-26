/**
 * @module mod-manager/error/PermissionError
 * @description 权限相关错误类型
 */

/**
 * 权限错误基类
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly modId: string,
    public readonly permission?: string
  ) {
    super(message);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * 权限被拒绝错误
 */
export class PermissionDeniedError extends PermissionError {
  constructor(modId: string, permission: string, reason?: string) {
    const message = reason
      ? `MOD "${modId}" 缺少权限 "${permission}": ${reason}`
      : `MOD "${modId}" 缺少权限 "${permission}"`;
    super(message, modId, permission);
    this.name = 'PermissionDeniedError';
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/**
 * 权限格式无效错误
 */
export class InvalidPermissionError extends PermissionError {
  constructor(modId: string, permission: string, reason: string) {
    super(
      `MOD "${modId}" 的权限 "${permission}" 格式无效: ${reason}`,
      modId,
      permission
    );
    this.name = 'InvalidPermissionError';
    Object.setPrototypeOf(this, InvalidPermissionError.prototype);
  }
}
