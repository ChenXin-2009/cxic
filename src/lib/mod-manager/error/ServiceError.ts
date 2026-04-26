/**
 * @module mod-manager/error/ServiceError
 * @description 服务相关错误类型
 */

/**
 * 服务错误基类
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly serviceId?: string,
    public readonly modId?: string
  ) {
    super(message);
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * 服务未找到错误
 */
export class ServiceNotFoundError extends ServiceError {
  constructor(serviceId: string) {
    super(
      `未找到服务: "${serviceId}"`,
      serviceId
    );
    this.name = 'ServiceNotFoundError';
    Object.setPrototypeOf(this, ServiceNotFoundError.prototype);
  }
}

/**
 * 服务访问被拒绝错误
 */
export class ServiceAccessDeniedError extends ServiceError {
  constructor(
    serviceId: string,
    callerId: string,
    public readonly reason: string
  ) {
    super(
      `MOD "${callerId}" 无权访问服务 "${serviceId}": ${reason}`,
      serviceId,
      callerId
    );
    this.name = 'ServiceAccessDeniedError';
    Object.setPrototypeOf(this, ServiceAccessDeniedError.prototype);
  }
}

/**
 * 服务 ID 冲突错误
 */
export class ServiceIdConflictError extends ServiceError {
  constructor(serviceId: string) {
    super(
      `服务 ID "${serviceId}" 已被注册`,
      serviceId
    );
    this.name = 'ServiceIdConflictError';
    Object.setPrototypeOf(this, ServiceIdConflictError.prototype);
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends ServiceError {
  constructor(public readonly cycle: string[]) {
    super(
      `检测到循环依赖: ${cycle.join(' -> ')}`
    );
    this.name = 'CircularDependencyError';
    Object.setPrototypeOf(this, CircularDependencyError.prototype);
  }
}

/**
 * 服务初始化错误
 */
export class ServiceInitializationError extends ServiceError {
  constructor(
    serviceId: string,
    modId: string,
    public readonly originalError: Error
  ) {
    super(
      `服务 "${serviceId}" 初始化失败 (MOD: ${modId}): ${originalError.message}`,
      serviceId,
      modId
    );
    this.name = 'ServiceInitializationError';
    Object.setPrototypeOf(this, ServiceInitializationError.prototype);
  }
}
