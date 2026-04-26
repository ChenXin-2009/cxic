/**
 * @module mod-manager/error/SandboxError
 * @description 沙箱相关错误类型
 */

/**
 * 沙箱错误基类
 */
export class SandboxError extends Error {
  constructor(
    message: string,
    public readonly modId: string
  ) {
    super(message);
    this.name = 'SandboxError';
    Object.setPrototypeOf(this, SandboxError.prototype);
  }
}

/**
 * 配额超限错误
 */
export class QuotaExceededError extends SandboxError {
  constructor(
    modId: string,
    public readonly resourceType: string,
    public readonly limit: number,
    public readonly current: number
  ) {
    super(
      `MOD "${modId}" 超过资源配额: ${resourceType} (限制: ${limit}, 当前: ${current})`,
      modId
    );
    this.name = 'QuotaExceededError';
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

/**
 * 资源泄漏错误
 */
export class ResourceLeakError extends SandboxError {
  constructor(
    modId: string,
    public readonly resourceType: string,
    public readonly count: number
  ) {
    super(
      `MOD "${modId}" 可能存在资源泄漏: ${resourceType} (未清理数量: ${count})`,
      modId
    );
    this.name = 'ResourceLeakError';
    Object.setPrototypeOf(this, ResourceLeakError.prototype);
  }
}
