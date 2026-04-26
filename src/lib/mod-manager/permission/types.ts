/**
 * @module mod-manager/permission/types
 * @description 权限系统核心类型定义
 * 
 * 本模块定义权限系统的所有核心接口和类型。
 */

// ============ 权限类型 ============

/**
 * 权限类别
 */
export type PermissionCategory =
  | 'time'       // 时间系统
  | 'camera'     // 相机系统
  | 'celestial'  // 天体系统
  | 'satellite'  // 卫星系统
  | 'render'     // 渲染系统
  | 'network'    // 网络访问
  | 'storage'    // 本地存储
  | 'events';    // 事件系统

/**
 * 权限操作
 */
export type PermissionAction = 
  | 'read'      // 读取权限
  | 'write'     // 写入权限
  | 'execute'   // 执行权限
  | '*';        // 通配符（所有操作）

/**
 * 权限对象
 */
export interface Permission {
  category: PermissionCategory;
  action: PermissionAction;
}

/**
 * 权限字符串（格式: "category:action"）
 * @example "time:read", "camera:write", "render:*"
 */
export type PermissionString = string;

/**
 * 权限声明（在 ModManifest 中）
 */
export interface PermissionManifest {
  /** 必需权限列表 */
  permissions?: PermissionString[];
  /** 可选权限列表 */
  optionalPermissions?: PermissionString[];
}

// ============ 验证结果类型 ============

/**
 * 权限验证结果
 */
export interface PermissionValidationResult {
  valid: boolean;
  errors: string[];
}

// ============ 错误类型 ============

/**
 * 权限解析错误
 */
export class PermissionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionParseError';
  }
}

/**
 * 权限拒绝错误
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly modId: string,
    public readonly permission: PermissionString,
    message: string
  ) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// ============ 权限描述映射 ============

/**
 * 权限的人类可读描述
 */
export const PERMISSION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  time: {
    read: '读取当前时间和时间流速',
    write: '修改时间和时间流速',
    execute: '执行时间相关操作',
    '*': '完全控制时间系统',
  },
  camera: {
    read: '读取相机位置和视角',
    write: '控制相机移动和缩放',
    execute: '执行相机相关操作',
    '*': '完全控制相机系统',
  },
  celestial: {
    read: '读取天体位置和轨道数据',
    write: '修改天体数据',
    execute: '执行天体计算',
    '*': '完全控制天体系统',
  },
  satellite: {
    read: '读取卫星数据',
    write: '修改卫星数据',
    execute: '执行卫星轨道计算',
    '*': '完全控制卫星系统',
  },
  render: {
    read: '访问渲染场景和对象',
    write: '添加和修改渲染对象',
    execute: '执行渲染回调',
    '*': '完全控制渲染系统',
  },
  network: {
    read: '读取网络数据',
    write: '发送网络请求',
    execute: '发起网络请求',
    '*': '完全网络访问权限',
  },
  storage: {
    read: '读取本地存储',
    write: '写入本地存储',
    execute: '执行存储操作',
    '*': '完全存储访问权限',
  },
  events: {
    read: '监听系统事件',
    write: '触发系统事件',
    execute: '执行事件处理',
    '*': '完全事件系统权限',
  },
};

// ============ 常量 ============

/**
 * 有效的权限类别列表
 */
export const VALID_PERMISSION_CATEGORIES: PermissionCategory[] = [
  'time',
  'camera',
  'celestial',
  'satellite',
  'render',
  'network',
  'storage',
  'events',
];

/**
 * 有效的权限操作列表
 */
export const VALID_PERMISSION_ACTIONS: PermissionAction[] = [
  'read',
  'write',
  'execute',
  '*',
];
