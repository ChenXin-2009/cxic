/**
 * @module mod-manager/proxy/types
 * @description API 代理层类型定义
 */

// ============ API 调用日志类型 ============

/**
 * API 调用日志条目
 */
export interface APICallLog {
  /** MOD ID */
  modId: string;
  /** API 名称 (如 'time', 'camera') */
  api: string;
  /** 方法名称 */
  method: string;
  /** 调用时间戳 */
  timestamp: Date;
  /** 执行时长 (毫秒) */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 (如果失败) */
  error?: string;
}

/**
 * API 调用统计
 */
export interface APICallStats {
  /** 总调用次数 */
  totalCalls: number;
  /** 成功调用次数 */
  successfulCalls: number;
  /** 失败调用次数 */
  failedCalls: number;
  /** 平均执行时长 (毫秒) */
  averageDuration: number;
  /** 按 API 方法分组的调用次数 */
  callsByAPI: Record<string, number>;
}

// ============ 核心 API 接口集合 ============

/**
 * 核心 API 集合
 */
export interface CoreAPIs {
  time: any;      // TimeAPI
  camera: any;    // CameraAPI
  celestial: any; // CelestialAPI
  satellite: any; // SatelliteAPI
  render: any;    // RenderAPI
}
