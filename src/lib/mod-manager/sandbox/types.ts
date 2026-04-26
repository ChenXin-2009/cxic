/**
 * @module mod-manager/sandbox/types
 * @description 沙箱系统类型定义
 */

// ============ 资源配额类型 ============

/**
 * 资源配额
 */
export interface ResourceQuota {
  /** 最大内存使用 (MB) */
  maxMemoryMB: number;
  /** 最大渲染对象数量 */
  maxRenderObjects: number;
  /** 最大事件监听器数量 */
  maxEventListeners: number;
  /** 最大定时器数量 */
  maxTimers: number;
  /** 最大 API 调用速率 (次/秒) */
  maxAPICallsPerSecond: number;
}

/**
 * 默认资源配额
 */
export const DEFAULT_QUOTA: ResourceQuota = {
  maxMemoryMB: 50,
  maxRenderObjects: 1000,
  maxEventListeners: 100,
  maxTimers: 50,
  maxAPICallsPerSecond: 100,
};

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  /** 当前内存使用 (MB) */
  memoryMB: number;
  /** 当前渲染对象数量 */
  renderObjects: number;
  /** 当前事件监听器数量 */
  eventListeners: number;
  /** 当前定时器数量 */
  timers: number;
  /** 最近一秒的 API 调用次数 */
  apiCallsLastSecond: number;
}

/**
 * 配额超限错误
 */
export class QuotaExceededError extends Error {
  constructor(
    public readonly modId: string,
    public readonly resourceType: string,
    public readonly limit: number,
    public readonly current: number
  ) {
    super(
      `MOD "${modId}" exceeded ${resourceType} quota: ${current}/${limit}`
    );
    this.name = 'QuotaExceededError';
  }
}
