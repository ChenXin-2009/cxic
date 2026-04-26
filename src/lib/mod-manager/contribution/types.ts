/**
 * @module mod-manager/contribution/types
 * @description 扩展点系统类型定义
 */

// ============ 扩展点配置类型 ============

/**
 * 扩展点配置（在 ModManifest 中）
 */
export interface ContributionPoints {
  /** Dock 图标扩展点 */
  dockIcons?: DockIconContribution[];
  /** 窗口扩展点 */
  windows?: WindowContribution[];
  /** 命令扩展点 */
  commands?: CommandContribution[];
}

/**
 * Dock 图标扩展点
 */
export interface DockIconContribution {
  /** 图标 ID */
  id: string;
  /** 图标 URL 或标识符 */
  icon: string;
  /** 英文标签 */
  label: string;
  /** 中文标签 */
  labelZh?: string;
  /** 排序顺序 */
  order?: number;
  /** 点击时执行的命令 ID */
  command: string;
  /** 徽章（数字或字符串） */
  badge?: number | string;
}

/**
 * 窗口扩展点
 */
export interface WindowContribution {
  /** 窗口 ID */
  id: string;
  /** 英文标题 */
  title: string;
  /** 中文标题 */
  titleZh?: string;
  /** 组件名称 */
  component: string;
  /** 默认大小 */
  defaultSize?: { width: number; height: number };
  /** 默认位置 */
  defaultPosition?: { x: number; y: number };
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可最小化 */
  minimizable?: boolean;
}

/**
 * 命令扩展点
 */
export interface CommandContribution {
  /** 命令 ID */
  id: string;
  /** 英文标题 */
  title: string;
  /** 中文标题 */
  titleZh?: string;
  /** 命令分类 */
  category?: string;
  /** 键盘快捷键 */
  keybinding?: string;
  /** 处理器函数名 */
  handler: string;
}

// ============ 已注册扩展点类型 ============

/**
 * 已注册的 Dock 图标
 */
export interface RegisteredDockIcon extends DockIconContribution {
  /** MOD ID */
  modId: string;
  /** 完整 ID (modId.id) */
  fullId: string;
}

/**
 * 已注册的窗口
 */
export interface RegisteredWindow extends WindowContribution {
  /** MOD ID */
  modId: string;
  /** 完整 ID (modId.id) */
  fullId: string;
}

/**
 * 已注册的命令
 */
export interface RegisteredCommand extends CommandContribution {
  /** MOD ID */
  modId: string;
  /** 完整 ID (modId.id) */
  fullId: string;
}

// ============ 错误类型 ============

/**
 * 扩展点错误
 */
export class ContributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContributionError';
  }
}
