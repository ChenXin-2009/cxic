/**
 * @module mod-manager/proxy/APICallLogger
 * @description API 调用日志记录器
 */

import type { APICallLog, APICallStats } from './types';

/**
 * API 调用日志记录器
 * 
 * 记录所有 MOD 的 API 调用，提供统计和查询功能。
 */
export class APICallLogger {
  /** 日志存储 */
  private logs: APICallLog[] = [];
  
  /** 最大日志数量 */
  private maxLogs: number;

  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs;
  }

  /**
   * 记录 API 调用
   * 
   * @param entry - 日志条目
   * 
   * @example
   * ```ts
   * logger.log({
   *   modId: 'my-mod',
   *   api: 'time',
   *   method: 'setCurrentTime',
   *   timestamp: new Date(),
   *   duration: 2.5,
   *   success: true,
   * });
   * ```
   */
  log(entry: APICallLog): void {
    this.logs.push(entry);

    // 限制日志数量，移除最旧的日志
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * 获取 MOD 的 API 调用日志
   * 
   * @param modId - MOD ID
   * @returns 日志条目数组
   * 
   * @example
   * ```ts
   * const logs = logger.getLogsForMod('my-mod');
   * console.log(`Total calls: ${logs.length}`);
   * ```
   */
  getLogsForMod(modId: string): APICallLog[] {
    return this.logs.filter(log => log.modId === modId);
  }

  /**
   * 获取指定 API 的调用日志
   * 
   * @param api - API 名称
   * @returns 日志条目数组
   */
  getLogsForAPI(api: string): APICallLog[] {
    return this.logs.filter(log => log.api === api);
  }

  /**
   * 获取指定方法的调用日志
   * 
   * @param api - API 名称
   * @param method - 方法名称
   * @returns 日志条目数组
   */
  getLogsForMethod(api: string, method: string): APICallLog[] {
    return this.logs.filter(log => log.api === api && log.method === method);
  }

  /**
   * 获取 MOD 的 API 调用统计
   * 
   * @param modId - MOD ID
   * @returns 统计信息
   * 
   * @example
   * ```ts
   * const stats = logger.getStats('my-mod');
   * console.log(`Success rate: ${stats.successfulCalls / stats.totalCalls * 100}%`);
   * console.log(`Average duration: ${stats.averageDuration}ms`);
   * ```
   */
  getStats(modId: string): APICallStats {
    const modLogs = this.getLogsForMod(modId);

    const stats: APICallStats = {
      totalCalls: modLogs.length,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      callsByAPI: {},
    };

    if (modLogs.length === 0) {
      return stats;
    }

    let totalDuration = 0;

    for (const log of modLogs) {
      // 统计成功/失败
      if (log.success) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }

      // 累计时长
      totalDuration += log.duration;

      // 按 API 方法统计
      const apiKey = `${log.api}.${log.method}`;
      stats.callsByAPI[apiKey] = (stats.callsByAPI[apiKey] || 0) + 1;
    }

    // 计算平均时长
    stats.averageDuration = totalDuration / modLogs.length;

    return stats;
  }

  /**
   * 获取全局统计信息
   * 
   * @returns 全局统计
   */
  getGlobalStats(): APICallStats {
    const stats: APICallStats = {
      totalCalls: this.logs.length,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      callsByAPI: {},
    };

    if (this.logs.length === 0) {
      return stats;
    }

    let totalDuration = 0;

    for (const log of this.logs) {
      if (log.success) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }

      totalDuration += log.duration;

      const apiKey = `${log.api}.${log.method}`;
      stats.callsByAPI[apiKey] = (stats.callsByAPI[apiKey] || 0) + 1;
    }

    stats.averageDuration = totalDuration / this.logs.length;

    return stats;
  }

  /**
   * 获取最近的 N 条日志
   * 
   * @param count - 日志数量
   * @returns 日志条目数组
   */
  getRecentLogs(count: number): APICallLog[] {
    return this.logs.slice(-count);
  }

  /**
   * 获取失败的调用日志
   * 
   * @param modId - 可选的 MOD ID
   * @returns 失败的日志条目数组
   */
  getFailedCalls(modId?: string): APICallLog[] {
    let logs = this.logs.filter(log => !log.success);
    
    if (modId) {
      logs = logs.filter(log => log.modId === modId);
    }

    return logs;
  }

  /**
   * 获取慢调用日志（超过指定时长）
   * 
   * @param thresholdMs - 时长阈值（毫秒）
   * @param modId - 可选的 MOD ID
   * @returns 慢调用日志数组
   */
  getSlowCalls(thresholdMs: number, modId?: string): APICallLog[] {
    let logs = this.logs.filter(log => log.duration > thresholdMs);
    
    if (modId) {
      logs = logs.filter(log => log.modId === modId);
    }

    return logs;
  }

  /**
   * 清除日志
   * 
   * @param modId - 可选的 MOD ID，如果提供则只清除该 MOD 的日志
   * 
   * @example
   * ```ts
   * // 清除特定 MOD 的日志
   * logger.clear('my-mod');
   * 
   * // 清除所有日志
   * logger.clear();
   * ```
   */
  clear(modId?: string): void {
    if (modId) {
      this.logs = this.logs.filter(log => log.modId !== modId);
    } else {
      this.logs = [];
    }
  }

  /**
   * 获取日志总数
   * 
   * @returns 日志数量
   */
  get size(): number {
    return this.logs.length;
  }

  /**
   * 设置最大日志数量
   * 
   * @param maxLogs - 最大日志数量
   */
  setMaxLogs(maxLogs: number): void {
    this.maxLogs = maxLogs;

    // 如果当前日志超过新的限制，移除最旧的日志
    while (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * 导出日志为 JSON
   * 
   * @param modId - 可选的 MOD ID
   * @returns JSON 字符串
   */
  exportToJSON(modId?: string): string {
    const logs = modId ? this.getLogsForMod(modId) : this.logs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 获取时间范围内的日志
   * 
   * @param startTime - 开始时间
   * @param endTime - 结束时间
   * @param modId - 可选的 MOD ID
   * @returns 日志条目数组
   */
  getLogsByTimeRange(
    startTime: Date,
    endTime: Date,
    modId?: string
  ): APICallLog[] {
    let logs = this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    );

    if (modId) {
      logs = logs.filter(log => log.modId === modId);
    }

    return logs;
  }
}
