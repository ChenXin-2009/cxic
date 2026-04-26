/**
 * @module mod-manager/error/ErrorLogger
 * @description 错误日志记录器
 */

import { ErrorFormatter } from './ErrorFormatter';

/**
 * 错误日志条目
 */
export interface ErrorLogEntry {
  /** 时间戳 */
  timestamp: Date;
  /** MOD ID */
  modId: string;
  /** 错误对象 */
  error: Error;
  /** 错误上下文 */
  context?: Record<string, unknown>;
  /** 堆栈跟踪 */
  stack?: string;
}

/**
 * 错误统计
 */
export interface ErrorStats {
  /** 总错误数 */
  totalErrors: number;
  /** 按 MOD 分组的错误数 */
  errorsByMod: Record<string, number>;
  /** 按错误类型分组的错误数 */
  errorsByType: Record<string, number>;
  /** 最近的错误 */
  recentErrors: ErrorLogEntry[];
}

/**
 * 错误日志记录器
 * 
 * 记录所有 MOD 错误和上下文信息。
 */
export class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000;

  /**
   * 记录错误
   * 
   * @param modId - MOD ID
   * @param error - 错误对象
   * @param context - 可选的上下文信息
   */
  log(modId: string, error: Error, context?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date(),
      modId,
      error,
      context,
      stack: error.stack,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    this.logToConsole(entry);
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const formatted = ErrorFormatter.formatAsText(entry.error);
    console.error(`[MOD Error] ${entry.modId}:\n${formatted}`);
    
    if (entry.context) {
      console.error('Context:', entry.context);
    }
    
    if (entry.stack) {
      console.error('Stack:', entry.stack);
    }
  }

  /**
   * 获取所有日志
   * 
   * @returns 日志条目数组
   */
  getAllLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取指定 MOD 的日志
   * 
   * @param modId - MOD ID
   * @returns 日志条目数组
   */
  getLogsByMod(modId: string): ErrorLogEntry[] {
    return this.logs.filter(log => log.modId === modId);
  }

  /**
   * 获取指定时间范围的日志
   * 
   * @param startTime - 开始时间
   * @param endTime - 结束时间
   * @returns 日志条目数组
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): ErrorLogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * 获取最近的日志
   * 
   * @param count - 数量
   * @returns 日志条目数组
   */
  getRecentLogs(count: number): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 获取错误统计
   * 
   * @returns 错误统计信息
   */
  getStats(): ErrorStats {
    const errorsByMod: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    for (const log of this.logs) {
      // 按 MOD 统计
      errorsByMod[log.modId] = (errorsByMod[log.modId] || 0) + 1;

      // 按类型统计
      const errorType = log.error.name || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    }

    return {
      totalErrors: this.logs.length,
      errorsByMod,
      errorsByType,
      recentErrors: this.getRecentLogs(10),
    };
  }

  /**
   * 清除日志
   * 
   * @param modId - 可选的 MOD ID
   */
  clear(modId?: string): void {
    if (modId) {
      this.logs = this.logs.filter(log => log.modId !== modId);
    } else {
      this.logs = [];
    }
  }

  /**
   * 导出日志为 JSON
   * 
   * @returns JSON 字符串
   */
  exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导出日志为文本
   * 
   * @returns 文本字符串
   */
  exportAsText(): string {
    let text = '';
    for (const log of this.logs) {
      text += `[${log.timestamp.toISOString()}] ${log.modId}\n`;
      text += ErrorFormatter.formatAsText(log.error);
      text += '\n---\n\n';
    }
    return text;
  }
}

// 单例实例
let loggerInstance: ErrorLogger | null = null;

/**
 * 获取错误日志记录器单例
 */
export function getErrorLogger(): ErrorLogger {
  if (!loggerInstance) {
    loggerInstance = new ErrorLogger();
  }
  return loggerInstance;
}
