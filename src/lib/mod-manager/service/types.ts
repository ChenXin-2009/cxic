/**
 * @module mod-manager/service/types
 * @description 服务注册表类型定义
 */

// ============ 服务类型 ============

/**
 * 服务可见性
 */
export type ServiceVisibility = 'public' | 'internal' | 'private';

/**
 * 服务描述符
 */
export interface ServiceDescriptor {
  /** 服务 ID */
  id: string;
  /** 提供服务的 MOD ID */
  providerId: string;
  /** 服务接口名称 */
  interface: string;
  /** 服务实现 */
  implementation: unknown;
  /** 可见性 */
  visibility: ServiceVisibility;
  /** 所需权限 */
  requiredPermission?: string;
  /** 服务版本 */
  version?: string;
  /** 是否延迟加载 */
  lazy?: boolean;
}

/**
 * 服务注册选项
 */
export interface ServiceRegistrationOptions {
  /** 服务接口名称 */
  interface: string;
  /** 服务实现 */
  implementation: unknown;
  /** 可见性（默认 public） */
  visibility?: ServiceVisibility;
  /** 所需权限 */
  requiredPermission?: string;
  /** 服务版本 */
  version?: string;
  /** 是否延迟加载 */
  lazy?: boolean;
}

/**
 * 服务调用日志
 */
export interface ServiceCallLog {
  /** 服务 ID */
  serviceId: string;
  /** 调用者 MOD ID */
  callerId: string;
  /** 调用时间 */
  timestamp: Date;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 服务统计信息
 */
export interface ServiceStats {
  /** 总调用次数 */
  totalCalls: number;
  /** 成功调用次数 */
  successfulCalls: number;
  /** 失败调用次数 */
  failedCalls: number;
  /** 唯一调用者数量 */
  uniqueCallers: number;
}

// ============ 错误类型 ============

/**
 * 服务错误基类
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * 服务未找到错误
 */
export class ServiceNotFoundError extends ServiceError {
  constructor(serviceId: string) {
    super(`Service "${serviceId}" not found`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * 服务访问拒绝错误
 */
export class ServiceAccessDeniedError extends ServiceError {
  constructor(
    public readonly serviceId: string,
    public readonly callerId: string,
    message: string
  ) {
    super(message);
    this.name = 'ServiceAccessDeniedError';
  }
}

/**
 * 服务 ID 冲突错误
 */
export class ServiceIdConflictError extends ServiceError {
  constructor(serviceId: string) {
    super(`Service "${serviceId}" already registered`);
    this.name = 'ServiceIdConflictError';
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends ServiceError {
  constructor(
    public readonly cycle: string[]
  ) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}
