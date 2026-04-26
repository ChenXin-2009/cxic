/**
 * @module mod-manager/error/ContributionError
 * @description 扩展点相关错误类型
 */

/**
 * 扩展点错误基类
 */
export class ContributionError extends Error {
  constructor(
    message: string,
    public readonly contributionId?: string,
    public readonly modId?: string
  ) {
    super(message);
    this.name = 'ContributionError';
    Object.setPrototypeOf(this, ContributionError.prototype);
  }
}

/**
 * 扩展点 ID 冲突错误
 */
export class ContributionIdConflictError extends ContributionError {
  constructor(contributionId: string, existingModId: string, newModId: string) {
    super(
      `扩展点 ID "${contributionId}" 已被 MOD "${existingModId}" 注册，MOD "${newModId}" 无法重复注册`,
      contributionId
    );
    this.name = 'ContributionIdConflictError';
    Object.setPrototypeOf(this, ContributionIdConflictError.prototype);
  }
}

/**
 * 扩展点未找到错误
 */
export class ContributionNotFoundError extends ContributionError {
  constructor(contributionId: string, type: string) {
    super(
      `未找到 ${type} 扩展点: "${contributionId}"`,
      contributionId
    );
    this.name = 'ContributionNotFoundError';
    Object.setPrototypeOf(this, ContributionNotFoundError.prototype);
  }
}

/**
 * 命令执行错误
 */
export class CommandExecutionError extends ContributionError {
  constructor(
    commandId: string,
    modId: string,
    public readonly originalError: Error
  ) {
    super(
      `执行命令 "${commandId}" 失败 (MOD: ${modId}): ${originalError.message}`,
      commandId,
      modId
    );
    this.name = 'CommandExecutionError';
    Object.setPrototypeOf(this, CommandExecutionError.prototype);
  }
}
