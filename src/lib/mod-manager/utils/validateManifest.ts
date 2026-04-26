/**
 * @module mod-manager/utils/validateManifest
 * @description MOD清单验证工具
 */

import type {
  ModManifest,
  ManifestValidationResult,
  ManifestValidationError,
} from '../types';

/**
 * 验证MOD清单
 */
export function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: ManifestValidationError[] = [];

  // 检查是否为对象
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      valid: false,
      errors: [{ field: 'root', message: '清单必须是一个对象' }],
    };
  }

  const m = manifest as Record<string, unknown>;

  // 验证必需字段
  validateRequiredField(m, 'id', 'string', errors);
  validateRequiredField(m, 'version', 'string', errors);
  validateRequiredField(m, 'name', 'string', errors);
  validateRequiredField(m, 'entryPoint', 'string', errors);

  // 如果有错误，提前返回
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 验证字段格式
  validateIdFormat(m.id as string, errors);
  validateVersionFormat(m.version as string, errors);

  // 验证可选字段
  if (m.description !== undefined) {
    validateFieldType(m, 'description', 'string', errors);
  }

  if (m.author !== undefined) {
    validateFieldType(m, 'author', 'string', errors);
  }

  if (m.apiVersion !== undefined) {
    validateFieldType(m, 'apiVersion', 'string', errors);
    if (typeof m.apiVersion === 'string') {
      validateVersionFormat(m.apiVersion, errors, 'apiVersion');
    }
  }

  if (m.dependencies !== undefined) {
    validateDependencies(m.dependencies, errors);
  }

  if (m.capabilities !== undefined) {
    validateCapabilities(m.capabilities, errors);
  }

  if (m.hasConfig !== undefined) {
    validateFieldType(m, 'hasConfig', 'boolean', errors);
  }

  if (m.defaultEnabled !== undefined) {
    validateFieldType(m, 'defaultEnabled', 'boolean', errors);
  }

  // ============ 新增：验证权限声明 ============
  if (m.permissions !== undefined) {
    validatePermissions(m.permissions, 'permissions', errors);
  }

  if (m.optionalPermissions !== undefined) {
    validatePermissions(m.optionalPermissions, 'optionalPermissions', errors);
  }

  // ============ 新增：验证扩展点配置 ============
  if (m.contributes !== undefined) {
    validateContributes(m.contributes, errors);
  }

  // ============ 新增：验证配置 Schema ============
  if (m.configSchema !== undefined) {
    validateConfigSchema(m.configSchema, errors);
  }

  // ============ 新增：验证服务声明 ============
  if (m.services !== undefined) {
    validateServices(m.services, errors);
  }

  // ============ 新增：验证资源配额 ============
  if (m.resourceQuota !== undefined) {
    validateResourceQuota(m.resourceQuota, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证必需字段存在且类型正确
 */
function validateRequiredField(
  manifest: Record<string, unknown>,
  field: string,
  expectedType: string,
  errors: ManifestValidationError[]
): void {
  if (manifest[field] === undefined) {
    errors.push({
      field,
      message: `缺少必需字段 "${field}"`,
    });
    return;
  }

  validateFieldType(manifest, field, expectedType, errors);
}

/**
 * 验证字段类型
 */
function validateFieldType(
  manifest: Record<string, unknown>,
  field: string,
  expectedType: string,
  errors: ManifestValidationError[]
): void {
  const value = manifest[field];
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (actualType !== expectedType) {
    errors.push({
      field,
      message: `字段 "${field}" 类型错误，期望 ${expectedType}，实际 ${actualType}`,
      value,
    });
  }
}

/**
 * 验证ID格式（kebab-case）
 */
function validateIdFormat(id: string, errors: ManifestValidationError[]): void {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    errors.push({
      field: 'id',
      message: 'ID必须使用kebab-case格式（小写字母、数字和连字符，以字母开头）',
      value: id,
    });
  }

  if (id.length > 100) {
    errors.push({
      field: 'id',
      message: 'ID长度不能超过100个字符',
      value: id,
    });
  }
}

/**
 * 验证版本格式（语义化版本）
 */
function validateVersionFormat(
  version: string,
  errors: ManifestValidationError[],
  field: string = 'version'
): void {
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
    errors.push({
      field,
      message: `${field}必须遵循语义化版本格式 (major.minor.patch)`,
      value: version,
    });
  }
}

/**
 * 验证依赖数组
 */
function validateDependencies(
  dependencies: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(dependencies)) {
    errors.push({
      field: 'dependencies',
      message: 'dependencies必须是一个数组',
      value: dependencies,
    });
    return;
  }

  dependencies.forEach((dep, index) => {
    if (!dep || typeof dep !== 'object') {
      errors.push({
        field: `dependencies[${index}]`,
        message: '依赖必须是一个对象',
        value: dep,
      });
      return;
    }

    const d = dep as Record<string, unknown>;

    if (typeof d.id !== 'string') {
      errors.push({
        field: `dependencies[${index}].id`,
        message: '依赖ID必须是字符串',
        value: d.id,
      });
    }

    if (d.optional !== undefined && typeof d.optional !== 'boolean') {
      errors.push({
        field: `dependencies[${index}].optional`,
        message: 'optional必须是布尔值',
        value: d.optional,
      });
    }
  });
}

/**
 * 验证能力数组
 */
function validateCapabilities(
  capabilities: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(capabilities)) {
    errors.push({
      field: 'capabilities',
      message: 'capabilities必须是一个数组',
      value: capabilities,
    });
    return;
  }

  capabilities.forEach((cap, index) => {
    if (!cap || typeof cap !== 'object') {
      errors.push({
        field: `capabilities[${index}]`,
        message: '能力必须是一个对象',
        value: cap,
      });
      return;
    }

    const c = cap as Record<string, unknown>;

    if (typeof c.name !== 'string') {
      errors.push({
        field: `capabilities[${index}].name`,
        message: '能力名称必须是字符串',
        value: c.name,
      });
    }

    if (c.required !== undefined && typeof c.required !== 'boolean') {
      errors.push({
        field: `capabilities[${index}].required`,
        message: 'required必须是布尔值',
        value: c.required,
      });
    }
  });
}

/**
 * 快速检查清单是否有效（不返回详细错误）
 */
export function isValidManifest(manifest: unknown): manifest is ModManifest {
  return validateManifest(manifest).valid;
}

// ============ 新增验证函数 ============

/**
 * 验证权限数组
 */
function validatePermissions(
  permissions: unknown,
  field: string,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(permissions)) {
    errors.push({
      field,
      message: `${field}必须是一个数组`,
      value: permissions,
    });
    return;
  }

  permissions.forEach((perm, index) => {
    if (typeof perm !== 'string') {
      errors.push({
        field: `${field}[${index}]`,
        message: '权限必须是字符串',
        value: perm,
      });
      return;
    }

    // 验证权限格式 (category:action)
    if (!/^[a-z]+:[a-z*]+$/.test(perm)) {
      errors.push({
        field: `${field}[${index}]`,
        message: '权限格式无效，应为 "category:action" (如 "time:read")',
        value: perm,
      });
    }
  });
}

/**
 * 验证扩展点配置
 */
function validateContributes(
  contributes: unknown,
  errors: ManifestValidationError[]
): void {
  if (!contributes || typeof contributes !== 'object' || Array.isArray(contributes)) {
    errors.push({
      field: 'contributes',
      message: 'contributes必须是一个对象',
      value: contributes,
    });
    return;
  }

  const c = contributes as Record<string, unknown>;

  // 验证 Dock 图标
  if (c.dockIcons !== undefined) {
    validateDockIcons(c.dockIcons, errors);
  }

  // 验证窗口
  if (c.windows !== undefined) {
    validateWindows(c.windows, errors);
  }

  // 验证命令
  if (c.commands !== undefined) {
    validateCommands(c.commands, errors);
  }
}

/**
 * 验证 Dock 图标数组
 */
function validateDockIcons(
  dockIcons: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(dockIcons)) {
    errors.push({
      field: 'contributes.dockIcons',
      message: 'dockIcons必须是一个数组',
      value: dockIcons,
    });
    return;
  }

  dockIcons.forEach((icon, index) => {
    if (!icon || typeof icon !== 'object') {
      errors.push({
        field: `contributes.dockIcons[${index}]`,
        message: 'Dock图标必须是一个对象',
        value: icon,
      });
      return;
    }

    const i = icon as Record<string, unknown>;
    const prefix = `contributes.dockIcons[${index}]`;

    // 必需字段
    if (typeof i.id !== 'string') {
      errors.push({
        field: `${prefix}.id`,
        message: 'id必须是字符串',
        value: i.id,
      });
    }

    if (typeof i.icon !== 'string') {
      errors.push({
        field: `${prefix}.icon`,
        message: 'icon必须是字符串',
        value: i.icon,
      });
    }

    if (typeof i.label !== 'string') {
      errors.push({
        field: `${prefix}.label`,
        message: 'label必须是字符串',
        value: i.label,
      });
    }

    if (typeof i.command !== 'string') {
      errors.push({
        field: `${prefix}.command`,
        message: 'command必须是字符串',
        value: i.command,
      });
    }

    // 可选字段
    if (i.order !== undefined && typeof i.order !== 'number') {
      errors.push({
        field: `${prefix}.order`,
        message: 'order必须是数字',
        value: i.order,
      });
    }
  });
}

/**
 * 验证窗口数组
 */
function validateWindows(
  windows: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(windows)) {
    errors.push({
      field: 'contributes.windows',
      message: 'windows必须是一个数组',
      value: windows,
    });
    return;
  }

  windows.forEach((window, index) => {
    if (!window || typeof window !== 'object') {
      errors.push({
        field: `contributes.windows[${index}]`,
        message: '窗口必须是一个对象',
        value: window,
      });
      return;
    }

    const w = window as Record<string, unknown>;
    const prefix = `contributes.windows[${index}]`;

    // 必需字段
    if (typeof w.id !== 'string') {
      errors.push({
        field: `${prefix}.id`,
        message: 'id必须是字符串',
        value: w.id,
      });
    }

    if (typeof w.title !== 'string') {
      errors.push({
        field: `${prefix}.title`,
        message: 'title必须是字符串',
        value: w.title,
      });
    }

    if (typeof w.component !== 'string') {
      errors.push({
        field: `${prefix}.component`,
        message: 'component必须是字符串',
        value: w.component,
      });
    }
  });
}

/**
 * 验证命令数组
 */
function validateCommands(
  commands: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(commands)) {
    errors.push({
      field: 'contributes.commands',
      message: 'commands必须是一个数组',
      value: commands,
    });
    return;
  }

  commands.forEach((command, index) => {
    if (!command || typeof command !== 'object') {
      errors.push({
        field: `contributes.commands[${index}]`,
        message: '命令必须是一个对象',
        value: command,
      });
      return;
    }

    const cmd = command as Record<string, unknown>;
    const prefix = `contributes.commands[${index}]`;

    // 必需字段
    if (typeof cmd.id !== 'string') {
      errors.push({
        field: `${prefix}.id`,
        message: 'id必须是字符串',
        value: cmd.id,
      });
    }

    if (typeof cmd.title !== 'string') {
      errors.push({
        field: `${prefix}.title`,
        message: 'title必须是字符串',
        value: cmd.title,
      });
    }

    if (typeof cmd.handler !== 'string') {
      errors.push({
        field: `${prefix}.handler`,
        message: 'handler必须是字符串',
        value: cmd.handler,
      });
    }
  });
}

/**
 * 验证配置 Schema
 */
function validateConfigSchema(
  configSchema: unknown,
  errors: ManifestValidationError[]
): void {
  if (!configSchema || typeof configSchema !== 'object' || Array.isArray(configSchema)) {
    errors.push({
      field: 'configSchema',
      message: 'configSchema必须是一个对象',
      value: configSchema,
    });
  }
  // 详细的 JSON Schema 验证将在 ConfigSchemaParser 中进行
}

/**
 * 验证服务声明数组
 */
function validateServices(
  services: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(services)) {
    errors.push({
      field: 'services',
      message: 'services必须是一个数组',
      value: services,
    });
    return;
  }

  services.forEach((service, index) => {
    if (!service || typeof service !== 'object') {
      errors.push({
        field: `services[${index}]`,
        message: '服务必须是一个对象',
        value: service,
      });
      return;
    }

    const s = service as Record<string, unknown>;
    const prefix = `services[${index}]`;

    if (typeof s.id !== 'string') {
      errors.push({
        field: `${prefix}.id`,
        message: 'id必须是字符串',
        value: s.id,
      });
    }

    if (typeof s.interface !== 'string') {
      errors.push({
        field: `${prefix}.interface`,
        message: 'interface必须是字符串',
        value: s.interface,
      });
    }

    if (s.visibility !== undefined) {
      const validVisibilities = ['public', 'internal', 'private'];
      if (!validVisibilities.includes(s.visibility as string)) {
        errors.push({
          field: `${prefix}.visibility`,
          message: `visibility必须是 ${validVisibilities.join(', ')} 之一`,
          value: s.visibility,
        });
      }
    }
  });
}

/**
 * 验证资源配额
 */
function validateResourceQuota(
  resourceQuota: unknown,
  errors: ManifestValidationError[]
): void {
  if (!resourceQuota || typeof resourceQuota !== 'object' || Array.isArray(resourceQuota)) {
    errors.push({
      field: 'resourceQuota',
      message: 'resourceQuota必须是一个对象',
      value: resourceQuota,
    });
    return;
  }

  const q = resourceQuota as Record<string, unknown>;

  const numberFields = [
    'maxMemoryMB',
    'maxRenderObjects',
    'maxEventListeners',
    'maxTimers',
    'maxAPICallsPerSecond',
  ];

  numberFields.forEach(field => {
    if (q[field] !== undefined && typeof q[field] !== 'number') {
      errors.push({
        field: `resourceQuota.${field}`,
        message: `${field}必须是数字`,
        value: q[field],
      });
    }

    if (typeof q[field] === 'number' && q[field] as number <= 0) {
      errors.push({
        field: `resourceQuota.${field}`,
        message: `${field}必须大于0`,
        value: q[field],
      });
    }
  });
}