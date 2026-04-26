/**
 * @module mod-manager/error/ErrorFormatter
 * @description 错误格式化器
 */

import { PermissionDeniedError, InvalidPermissionError } from './PermissionError';
import { QuotaExceededError, ResourceLeakError } from './SandboxError';
import { ServiceNotFoundError, ServiceAccessDeniedError, CircularDependencyError } from './ServiceError';
import { ContributionIdConflictError, CommandExecutionError } from './ContributionError';

/**
 * 格式化后的错误信息
 */
export interface FormattedError {
  /** 错误标题 */
  title: string;
  /** 错误描述 */
  description: string;
  /** 解决建议 */
  suggestions: string[];
  /** 严重程度 */
  severity: 'error' | 'warning' | 'info';
}

/**
 * 错误格式化器
 * 
 * 将各种错误类型转换为用户友好的消息。
 */
export class ErrorFormatter {
  /**
   * 格式化错误
   * 
   * @param error - 错误对象
   * @returns 格式化后的错误信息
   */
  static format(error: Error): FormattedError {
    // 权限错误
    if (error instanceof PermissionDeniedError) {
      return this.formatPermissionDenied(error);
    }
    if (error instanceof InvalidPermissionError) {
      return this.formatInvalidPermission(error);
    }

    // 沙箱错误
    if (error instanceof QuotaExceededError) {
      return this.formatQuotaExceeded(error);
    }
    if (error instanceof ResourceLeakError) {
      return this.formatResourceLeak(error);
    }

    // 服务错误
    if (error instanceof ServiceNotFoundError) {
      return this.formatServiceNotFound(error);
    }
    if (error instanceof ServiceAccessDeniedError) {
      return this.formatServiceAccessDenied(error);
    }
    if (error instanceof CircularDependencyError) {
      return this.formatCircularDependency(error);
    }

    // 扩展点错误
    if (error instanceof ContributionIdConflictError) {
      return this.formatContributionIdConflict(error);
    }
    if (error instanceof CommandExecutionError) {
      return this.formatCommandExecution(error);
    }

    // 通用错误
    return this.formatGeneric(error);
  }

  private static formatPermissionDenied(error: PermissionDeniedError): FormattedError {
    return {
      title: '权限被拒绝',
      description: error.message,
      suggestions: [
        `在 MOD 清单中添加权限声明: "permissions": ["${error.permission}"]`,
        '检查权限字符串格式是否正确',
        '如果是可选权限，使用 "optionalPermissions" 字段',
      ],
      severity: 'error',
    };
  }

  private static formatInvalidPermission(error: InvalidPermissionError): FormattedError {
    return {
      title: '权限格式无效',
      description: error.message,
      suggestions: [
        '权限格式应为 "category:action"，如 "time:read"',
        '支持的类别: time, camera, celestial, satellite, render',
        '支持的操作: read, write, execute, *',
        '可以使用通配符: "time:*" 或 "*:*"',
      ],
      severity: 'error',
    };
  }

  private static formatQuotaExceeded(error: QuotaExceededError): FormattedError {
    return {
      title: '资源配额超限',
      description: error.message,
      suggestions: [
        '减少资源使用量（如渲染对象、事件监听器、定时器）',
        '在 MOD 清单中请求更高的配额: "resourceQuota": { "max..." }',
        '检查是否存在资源泄漏（未清理的资源）',
        '优化代码以提高资源使用效率',
      ],
      severity: 'error',
    };
  }

  private static formatResourceLeak(error: ResourceLeakError): FormattedError {
    return {
      title: '可能存在资源泄漏',
      description: error.message,
      suggestions: [
        '确保在 MOD 禁用时清理所有资源',
        '检查事件监听器是否正确取消订阅',
        '检查定时器是否正确清除',
        '检查渲染对象是否正确注销',
      ],
      severity: 'warning',
    };
  }

  private static formatServiceNotFound(error: ServiceNotFoundError): FormattedError {
    return {
      title: '服务未找到',
      description: error.message,
      suggestions: [
        '检查服务 ID 是否正确',
        '确保提供服务的 MOD 已启用',
        '检查服务是否已注册',
      ],
      severity: 'error',
    };
  }

  private static formatServiceAccessDenied(error: ServiceAccessDeniedError): FormattedError {
    return {
      title: '服务访问被拒绝',
      description: error.message,
      suggestions: [
        '检查服务的可见性设置（public/internal/private）',
        '如果服务需要权限，在 MOD 清单中添加相应权限',
        '联系服务提供者了解访问要求',
      ],
      severity: 'error',
    };
  }

  private static formatCircularDependency(error: CircularDependencyError): FormattedError {
    return {
      title: '检测到循环依赖',
      description: error.message,
      suggestions: [
        '重新设计服务依赖关系以消除循环',
        '考虑使用事件总线代替直接服务调用',
        '将共享逻辑提取到独立服务',
      ],
      severity: 'error',
    };
  }

  private static formatContributionIdConflict(error: ContributionIdConflictError): FormattedError {
    return {
      title: '扩展点 ID 冲突',
      description: error.message,
      suggestions: [
        '使用唯一的扩展点 ID',
        '在 ID 前添加 MOD 特定的前缀',
        '检查是否与其他 MOD 的扩展点冲突',
      ],
      severity: 'error',
    };
  }

  private static formatCommandExecution(error: CommandExecutionError): FormattedError {
    return {
      title: '命令执行失败',
      description: error.message,
      suggestions: [
        '检查命令处理器是否正确实现',
        '检查命令参数是否正确',
        '查看控制台获取详细错误信息',
      ],
      severity: 'error',
    };
  }

  private static formatGeneric(error: Error): FormattedError {
    return {
      title: '发生错误',
      description: error.message,
      suggestions: [
        '查看控制台获取详细错误信息',
        '检查 MOD 代码是否有语法错误',
        '尝试重新加载 MOD',
      ],
      severity: 'error',
    };
  }

  /**
   * 格式化为纯文本
   * 
   * @param error - 错误对象
   * @returns 纯文本格式的错误信息
   */
  static formatAsText(error: Error): string {
    const formatted = this.format(error);
    let text = `[${formatted.severity.toUpperCase()}] ${formatted.title}\n`;
    text += `${formatted.description}\n`;
    if (formatted.suggestions.length > 0) {
      text += '\n建议:\n';
      formatted.suggestions.forEach((suggestion, index) => {
        text += `  ${index + 1}. ${suggestion}\n`;
      });
    }
    return text;
  }

  /**
   * 格式化为 HTML
   * 
   * @param error - 错误对象
   * @returns HTML 格式的错误信息
   */
  static formatAsHTML(error: Error): string {
    const formatted = this.format(error);
    const severityClass = `error-${formatted.severity}`;
    
    let html = `<div class="${severityClass}">`;
    html += `<h3>${formatted.title}</h3>`;
    html += `<p>${formatted.description}</p>`;
    
    if (formatted.suggestions.length > 0) {
      html += '<h4>建议:</h4>';
      html += '<ul>';
      formatted.suggestions.forEach(suggestion => {
        html += `<li>${suggestion}</li>`;
      });
      html += '</ul>';
    }
    
    html += '</div>';
    return html;
  }
}
