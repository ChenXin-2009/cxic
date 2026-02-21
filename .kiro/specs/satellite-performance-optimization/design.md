# 设计文档 - 卫星可视化性能优化

## 概述

本设计旨在优化卫星可视化系统的渲染性能，通过以下核心策略实现流畅的 60fps 渲染：

1. **智能缓冲区更新**: 实现差异检测和部分更新，避免不必要的 GPU 上传
2. **位置插值系统**: 在 SGP4 计算之间使用线性插值，实现平滑的 60fps 运动
3. **延迟包围球计算**: 使用增量更新和阈值触发机制，减少计算开销
4. **双缓冲架构**: 分离计算线程和渲染线程，避免阻塞
5. **性能监控**: 实时跟踪关键性能指标，支持自适应质量控制

### 设计目标

- 消除每次更新时的卡顿（目标：稳定 60fps）
- 保持轨道计算精度（SGP4 算法精度不变）
- 支持最多 100,000 颗卫星的流畅渲染
- 内存使用优化（避免动态分配和 GC 压力）
- 可配置的性能/质量权衡

## 架构

### 整体架构

系统采用三层架构：

```
┌─────────────────────────────────────────────────────────┐
│                    渲染层 (60fps)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Interpolator │  │ BufferManager│  │PerformanceMonitor│
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    协调层 (1fps)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │SatelliteLayer│  │ UpdateScheduler│ │QualityController│
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  计算层 (Web Worker)                     │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │SGP4Calculator│  │PositionCache │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### 数据流

1. **计算阶段** (每秒 1 次):
   - SGP4Calculator 在 Web Worker 中计算精确位置
   - 结果通过 Transferable Objects 传回主线程
   - UpdateScheduler 将新位置存入双缓冲区

2. **插值阶段** (每帧 60 次):
   - Interpolator 根据时间进度计算插值位置
   - BufferManager 检测变化并更新 GPU 缓冲区
   - PerformanceMonitor 跟踪帧时间和 GPU 上传耗时

3. **自适应阶段** (每 2-5 秒):
   - QualityController 分析性能指标
   - 根据帧率动态调整更新间隔和插值精度

## 组件和接口

### 1. PositionInterpolator

负责在两次 SGP4 计算之间插值卫星位置。

```typescript
interface InterpolationState {
  startPosition: Vector3;
  endPosition: Vector3;
  startTime: number;
  endTime: number;
  currentProgress: number; // 0.0 到 1.0
}

class PositionInterpolator {
  private states: Map<number, InterpolationState>;
  private interpolationMethod: 'linear' | 'cubic';
  
  /**
   * 设置新的目标位置
   * @param noradId 卫星 ID
   * @param newPosition 新的目标位置
   * @param timestamp 计算时间戳
   */
  setTarget(noradId: number, newPosition: Vector3, timestamp: number): void;
  
  /**
   * 获取当前插值位置
   * @param noradId 卫星 ID
   * @param currentTime 当前时间戳
   * @returns 插值后的位置
   */
  getInterpolatedPosition(noradId: number, currentTime: number): Vector3;
  
  /**
   * 批量获取所有卫星的插值位置
   * @param currentTime 当前时间戳
   * @returns 位置 Map
   */
  getInterpolatedPositions(currentTime: number): Map<number, Vector3>;
  
  /**
   * 清除指定卫星的插值状态
   */
  clear(noradId: number): void;
}
```

**实现细节**:
- 使用线性插值: `position = start + (end - start) * progress`
- progress 计算: `(currentTime - startTime) / (endTime - startTime)`
- 当 progress >= 1.0 时，保持在 endPosition 直到新目标到达
- 支持可选的三次样条插值以获得更平滑的运动

### 2. SmartBufferManager

智能管理 GPU 缓冲区更新，避免不必要的上传。

```typescript
interface BufferUpdateStats {
  totalUpdates: number;
  skippedUpdates: number;
  partialUpdates: number;
  fullUpdates: number;
  lastUpdateTime: number;
  averageUpdateDuration: number;
}

class SmartBufferManager {
  private positionBuffer: Float32Array;
  private colorBuffer: Float32Array;
  private previousPositions: Float32Array;
  private dirtyRanges: Array<{start: number, end: number}>;
  private updateThreshold: number; // 位置变化阈值
  
  /**
   * 更新缓冲区（智能差异检测）
   * @param positions 新的位置 Map
   * @param colors 新的颜色 Map（可选）
   * @returns 是否发生了更新
   */
  updateBuffers(
    positions: Map<number, Vector3>,
    colors?: Map<number, Color>
  ): boolean;
  
  /**
   * 检测位置变化
   * @param index 缓冲区索引
   * @param newPosition 新位置
   * @returns 是否超过阈值
   */
  private hasSignificantChange(index: number, newPosition: Vector3): boolean;
  
  /**
   * 标记 GPU 缓冲区需要更新
   */
  private markNeedsUpdate(): void;
  
  /**
   * 获取更新统计信息
   */
  getStats(): BufferUpdateStats;
}
```

**实现细节**:
- 比较新旧位置，只有变化超过阈值（例如 0.0001 AU）才更新
- 跟踪脏区域（dirty ranges），支持部分缓冲区更新
- 使用 `BufferAttribute.updateRange` 优化 GPU 上传
- 缓存上一帧的位置用于差异检测

### 3. AdaptiveBoundingSphere

延迟和增量更新包围球。

```typescript
interface BoundingSphereState {
  center: Vector3;
  radius: number;
  lastUpdateTime: number;
  satelliteCount: number;
  needsRecalculation: boolean;
}

class AdaptiveBoundingSphere {
  private state: BoundingSphereState;
  private updateThreshold: number; // 卫星数量变化阈值（例如 10%）
  private minUpdateInterval: number; // 最小更新间隔（例如 5000ms）
  
  /**
   * 检查是否需要更新包围球
   * @param currentSatelliteCount 当前卫星数量
   * @returns 是否需要更新
   */
  shouldUpdate(currentSatelliteCount: number): boolean;
  
  /**
   * 增量更新包围球
   * @param newPositions 新增或变化的位置
   */
  incrementalUpdate(newPositions: Vector3[]): void;
  
  /**
   * 完整重新计算包围球
   * @param allPositions 所有位置
   */
  fullRecalculation(allPositions: Vector3[]): void;
  
  /**
   * 获取当前包围球
   */
  getSphere(): Sphere;
}
```

**实现细节**:
- 只在卫星数量变化超过 10% 时触发完整重算
- 最小更新间隔 5 秒，避免频繁计算
- 增量更新：扩展现有包围球以包含新位置
- 使用 Ritter's algorithm 进行快速近似计算

### 4. PerformanceMonitor

实时监控渲染性能指标。

```typescript
interface PerformanceMetrics {
  fps: number;
  frameTime: number; // 毫秒
  gpuUploadTime: number; // 毫秒
  interpolationTime: number; // 毫秒
  sgp4CalculationTime: number; // 毫秒
  memoryUsage: number; // MB
  satelliteCount: number;
  visibleSatelliteCount: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameTimeSamples: number[];
  private sampleSize: number; // 例如 60 帧
  
  /**
   * 记录帧开始
   */
  beginFrame(): void;
  
  /**
   * 记录帧结束
   */
  endFrame(): void;
  
  /**
   * 记录 GPU 上传时间
   */
  recordGPUUpload(duration: number): void;
  
  /**
   * 记录插值时间
   */
  recordInterpolation(duration: number): void;
  
  /**
   * 记录 SGP4 计算时间
   */
  recordSGP4Calculation(duration: number): void;
  
  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics;
  
  /**
   * 获取平均 FPS（基于最近 N 帧）
   */
  getAverageFPS(): number;
}
```

**实现细节**:
- 使用 `performance.now()` 进行高精度计时
- 维护滑动窗口（例如 60 帧）计算平均值
- 在开发模式下输出到控制台或可视化界面
- 在生产模式下只记录关键指标

### 5. QualityController

根据性能指标自适应调整渲染质量。

```typescript
interface QualitySettings {
  updateInterval: number; // SGP4 计算间隔（毫秒）
  interpolationMethod: 'linear' | 'cubic';
  maxSatellites: number;
  enableBoundingSphere: boolean;
}

class QualityController {
  private currentSettings: QualitySettings;
  private performanceMonitor: PerformanceMonitor;
  private fpsThresholds: {low: number, high: number}; // 例如 {low: 30, high: 55}
  private adjustmentCooldown: number; // 调整冷却时间（毫秒）
  private lastAdjustmentTime: number;
  
  /**
   * 根据性能指标调整质量
   */
  adjustQuality(): void;
  
  /**
   * 降低渲染质量
   */
  private decreaseQuality(): void;
  
  /**
   * 提升渲染质量
   */
  private increaseQuality(): void;
  
  /**
   * 获取当前质量设置
   */
  getSettings(): QualitySettings;
  
  /**
   * 手动设置质量
   */
  setSettings(settings: Partial<QualitySettings>): void;
}
```

**实现细节**:
- 监控平均 FPS，低于 30fps 持续 2 秒时降低质量
- 高于 55fps 持续 5 秒时尝试提升质量
- 调整策略：
  - 降低质量：增加 updateInterval (1000ms → 2000ms)，切换到线性插值
  - 提升质量：减少 updateInterval (2000ms → 1000ms)，切换到三次插值
- 冷却时间 5 秒，避免频繁调整

### 6. 优化的 SatelliteLayer

集成所有优化组件的主协调器。

```typescript
class OptimizedSatelliteLayer {
  private sceneManager: SceneManager;
  private renderer: SatelliteRenderer;
  private calculator: SGP4Calculator;
  private interpolator: PositionInterpolator;
  private bufferManager: SmartBufferManager;
  private boundingSphere: AdaptiveBoundingSphere;
  private performanceMonitor: PerformanceMonitor;
  private qualityController: QualityController;
  
  // 双缓冲
  private currentPositions: Map<number, Vector3>;
  private targetPositions: Map<number, Vector3>;
  private lastCalculationTime: number;
  private nextCalculationTime: number;
  
  /**
   * 每帧更新（60fps）
   */
  update(): void;
  
  /**
   * 触发 SGP4 计算（1fps 或可配置）
   */
  private scheduleCalculation(): void;
  
  /**
   * 处理 SGP4 计算结果
   */
  private onCalculationComplete(positions: Map<number, SatelliteState>): void;
  
  /**
   * 渲染帧更新
   */
  private renderFrame(): void;
}
```

**update() 方法流程**:

```typescript
update(): void {
  this.performanceMonitor.beginFrame();
  
  const currentTime = Date.now();
  
  // 1. 检查是否需要触发新的 SGP4 计算
  if (currentTime >= this.nextCalculationTime && !this.isCalculating) {
    this.scheduleCalculation();
  }
  
  // 2. 获取插值位置
  const interpolationStart = performance.now();
  const interpolatedPositions = this.interpolator.getInterpolatedPositions(currentTime);
  this.performanceMonitor.recordInterpolation(performance.now() - interpolationStart);
  
  // 3. 智能更新缓冲区
  const uploadStart = performance.now();
  const didUpdate = this.bufferManager.updateBuffers(interpolatedPositions);
  if (didUpdate) {
    this.performanceMonitor.recordGPUUpload(performance.now() - uploadStart);
  }
  
  // 4. 检查是否需要更新包围球
  if (this.boundingSphere.shouldUpdate(interpolatedPositions.size)) {
    const positions = Array.from(interpolatedPositions.values());
    this.boundingSphere.incrementalUpdate(positions);
  }
  
  // 5. 自适应质量控制
  this.qualityController.adjustQuality();
  
  this.performanceMonitor.endFrame();
}
```

## 数据模型

### InterpolationState

```typescript
interface InterpolationState {
  noradId: number;
  startPosition: Vector3;      // 起始位置（上次计算结果）
  endPosition: Vector3;        // 目标位置（最新计算结果）
  startTime: number;           // 起始时间戳（毫秒）
  endTime: number;             // 目标时间戳（毫秒）
  currentProgress: number;     // 当前进度 [0.0, 1.0]
  velocity: Vector3;           // 速度向量（用于预测）
}
```

### BufferDirtyRange

```typescript
interface BufferDirtyRange {
  start: number;    // 起始索引
  end: number;      // 结束索引
  priority: number; // 优先级（0-1，用于部分更新）
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  timestamp: number;
  fps: number;
  frameTime: number;
  gpuUploadTime: number;
  interpolationTime: number;
  sgp4CalculationTime: number;
  memoryUsage: number;
  satelliteCount: number;
  visibleSatelliteCount: number;
  bufferUpdateStats: BufferUpdateStats;
}
```

### QualitySettings

```typescript
interface QualitySettings {
  updateInterval: number;           // SGP4 计算间隔（毫秒）
  interpolationMethod: 'linear' | 'cubic';
  maxSatellites: number;            // 最大卫星数量
  enableBoundingSphere: boolean;    // 是否启用包围球优化
  positionThreshold: number;        // 位置变化阈值（AU）
  boundingSphereUpdateThreshold: number; // 包围球更新阈值（百分比）
}
```

### 配置常量

```typescript
const PERFORMANCE_CONFIG = {
  // 默认质量设置
  DEFAULT_UPDATE_INTERVAL: 1000,        // 1 秒
  DEFAULT_INTERPOLATION: 'linear',
  DEFAULT_POSITION_THRESHOLD: 0.0001,   // 0.0001 AU ≈ 15 km
  
  // 性能阈值
  FPS_LOW_THRESHOLD: 30,
  FPS_HIGH_THRESHOLD: 55,
  FPS_SAMPLE_SIZE: 60,                  // 60 帧平均
  
  // 自适应调整
  QUALITY_ADJUSTMENT_COOLDOWN: 5000,    // 5 秒
  LOW_FPS_DURATION: 2000,               // 2 秒
  HIGH_FPS_DURATION: 5000,              // 5 秒
  
  // 包围球
  BOUNDING_SPHERE_UPDATE_THRESHOLD: 0.1, // 10%
  BOUNDING_SPHERE_MIN_INTERVAL: 5000,    // 5 秒
  
  // 日志
  ENABLE_PERFORMANCE_LOGGING: process.env.NODE_ENV === 'development',
  LOG_INTERVAL: 1000,                    // 每秒输出一次
};
```



## 正确性属性

属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1: 智能缓冲区更新

*对于任意*缓冲区状态和位置更新序列，当内容未发生显著变化时（变化小于阈值），系统不应标记 needsUpdate 或触发 GPU 上传；当只有部分位置变化时，系统应只更新变化的缓冲区区域。

**验证需求**: 1.1, 1.2, 1.3

### 属性 2: GPU 上传性能

*对于任意*需要更新的缓冲区，GPU 上传操作应在单个渲染帧时间内完成（< 16.67ms）。

**验证需求**: 1.4

### 属性 3: 延迟包围球计算

*对于任意*卫星位置更新序列，当卫星数量或分布范围变化小于阈值（10%）时，系统应复用现有包围球而不重新计算。

**验证需求**: 2.1, 2.2

### 属性 4: 增量包围球更新

*对于任意*需要重新计算包围球的场景，增量更新算法的执行时间应显著小于完整重算（至少快 50%）。

**验证需求**: 2.3

### 属性 5: 包围球重算触发

*对于任意*卫星数量变化，当变化超过阈值（10%）时，系统应触发包围球重新计算。

**验证需求**: 2.4

### 属性 6: 位置插值连续性

*对于任意*可见卫星和任意两次 SGP4 计算之间的帧，系统应在每帧返回插值位置，且相邻帧之间的位置变化应保持连续（变化量在合理范围内）。

**验证需求**: 3.1, 3.4

### 属性 7: 线性插值正确性

*对于任意*插值状态，插值位置应符合线性插值公式：`position = start + (end - start) * progress`，其中 `progress = (currentTime - startTime) / (endTime - startTime)`。

**验证需求**: 3.2

### 属性 8: 插值目标平滑过渡

*对于任意*新的计算位置到达事件，系统应重置插值进度为 0，并开始新的插值周期，确保从当前位置平滑过渡到新目标。

**验证需求**: 3.3

### 属性 9: 插值不触发计算

*对于任意*以 60fps 运行的渲染帧序列，每帧应使用插值位置，而不应触发新的 SGP4 计算（计算频率应等于配置的 Update_Interval）。

**验证需求**: 4.3

### 属性 10: 异步计算不阻塞

*对于任意*SGP4 计算完成事件，目标位置更新应是异步的，不应阻塞渲染线程（主线程不应等待计算完成）。

**验证需求**: 4.4

### 属性 11: 环境相关日志控制

*对于任意*系统操作，在生产环境下不应输出调试日志，在开发环境下应输出调试日志，但错误日志应在所有环境下输出。

**验证需求**: 5.1, 5.2, 5.3

### 属性 12: 性能指标跟踪

*对于任意*系统运行时段，性能监控器应持续跟踪帧渲染时间、GPU 上传频率和耗时、SGP4 计算耗时，并在开发模式下提供访问接口。

**验证需求**: 6.1, 6.2, 6.3, 6.4

### 属性 13: Transferable Objects 使用

*对于任意*SGP4 计算完成的 Worker 通信，系统应使用 Transferable Objects 传输大型数组数据（位置和速度缓冲区）。

**验证需求**: 7.1

### 属性 14: 最小化通信数据

*对于任意*Worker 通信，传输的数据应只包含必要字段（位置、速度、NORAD ID），避免传输冗余信息。

**验证需求**: 7.2

### 属性 15: 请求合并

*对于任意*在短时间内（例如 100ms）排队的多个计算请求，系统应合并为单个 Worker 通信以减少开销。

**验证需求**: 7.3

### 属性 16: Worker 持久化

*对于任意*Worker 空闲期间，Worker 实例应保持活跃而不被销毁，避免重新初始化开销。

**验证需求**: 7.4

### 属性 17: 质量参数调整

*对于任意*质量调整事件（降低或提升），系统应相应调整 Update_Interval 和插值精度参数。

**验证需求**: 8.3, 8.4

### 属性 18: 缓冲区预分配

*对于任意*系统初始化，缓冲区应预分配为固定大小（MAX_SATELLITES * 3），后续卫星数量变化不应触发缓冲区重新分配。

**验证需求**: 9.1, 9.2

### 属性 19: 插值缓存限制

*对于任意*时刻，插值系统缓存的历史位置数据应不超过最近两次计算结果（当前位置和目标位置）。

**验证需求**: 9.3

### 属性 20: 内存清理触发

*对于任意*内存使用超过阈值的情况，系统应触发缓存清理机制，释放不必要的数据。

**验证需求**: 9.4

### 属性 21: 相机移动性能稳定性

*对于任意*相机快速移动场景，系统应保持稳定的帧率（不低于目标帧率的 80%）。

**验证需求**: 10.1

### 属性 22: 视锥优先级

*对于任意*相机移动时刻，视锥内卫星的更新优先级应高于视锥外卫星，且视锥外卫星可跳过插值计算。

**验证需求**: 10.2, 10.3

### 属性 23: 相机静止恢复

*对于任意*相机从移动到静止的转换，系统应恢复所有卫星的正常更新（包括之前被跳过的视锥外卫星）。

**验证需求**: 10.4

## 错误处理

### 1. SGP4 计算失败

**场景**: Web Worker 计算失败或返回错误

**处理策略**:
- 捕获 Worker 错误事件和计算异常
- 记录错误日志（包括 NORAD ID 和错误原因）
- 保持使用上一次成功的位置，继续插值
- 在下一个计算周期重试
- 如果连续失败 3 次，从渲染列表中移除该卫星并通知用户

**实现**:
```typescript
private async onCalculationError(error: Error, noradId: number): Promise<void> {
  console.error(`[SGP4] 计算失败 ${noradId}:`, error);
  
  const failCount = this.failureCount.get(noradId) || 0;
  this.failureCount.set(noradId, failCount + 1);
  
  if (failCount >= 3) {
    // 连续失败 3 次，移除卫星
    this.removeSatellite(noradId);
    this.notifyUser(`卫星 ${noradId} 计算失败，已从显示列表移除`);
  } else {
    // 保持使用上一次位置，继续插值
    // 下一个周期会自动重试
  }
}
```

### 2. GPU 缓冲区上传失败

**场景**: WebGL 上下文丢失或缓冲区更新失败

**处理策略**:
- 监听 WebGL 上下文丢失事件
- 尝试恢复上下文
- 如果恢复失败，降级到 2D Canvas 渲染或显示错误消息
- 记录详细错误信息用于调试

**实现**:
```typescript
private handleContextLoss(): void {
  console.error('[WebGL] 上下文丢失');
  
  // 尝试恢复
  this.renderer.forceContextRestore();
  
  // 如果恢复失败，降级渲染
  if (!this.renderer.getContext()) {
    this.fallbackTo2DRendering();
    this.notifyUser('3D 渲染失败，已切换到 2D 模式');
  }
}
```

### 3. 内存不足

**场景**: 缓冲区分配失败或内存使用过高

**处理策略**:
- 监控内存使用（通过 `performance.memory`）
- 达到阈值（例如 80%）时触发清理
- 清理策略：
  1. 清除不可见卫星的插值缓存
  2. 减少最大卫星数量
  3. 降低更新频率
- 如果仍然不足，显示警告并建议用户减少卫星数量

**实现**:
```typescript
private checkMemoryUsage(): void {
  if (!performance.memory) return;
  
  const usageRatio = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
  
  if (usageRatio > 0.8) {
    console.warn('[Memory] 内存使用过高:', usageRatio);
    this.performMemoryCleanup();
  }
  
  if (usageRatio > 0.9) {
    this.notifyUser('内存不足，建议减少显示的卫星数量');
  }
}
```

### 4. 插值状态不一致

**场景**: 目标位置未设置或时间戳异常

**处理策略**:
- 验证插值状态的完整性
- 如果缺少目标位置，使用当前位置作为目标（静止）
- 如果时间戳异常（endTime < startTime），重置插值状态
- 记录警告日志

**实现**:
```typescript
private validateInterpolationState(state: InterpolationState): boolean {
  if (!state.endPosition) {
    console.warn('[Interpolation] 缺少目标位置，使用当前位置');
    state.endPosition = state.startPosition.clone();
    return false;
  }
  
  if (state.endTime <= state.startTime) {
    console.warn('[Interpolation] 时间戳异常，重置状态');
    this.resetInterpolationState(state.noradId);
    return false;
  }
  
  return true;
}
```

### 5. 性能降级失败

**场景**: 自适应质量控制无法提升帧率

**处理策略**:
- 如果已降到最低质量仍然低于 30fps，显示性能警告
- 建议用户：
  1. 减少显示的卫星数量
  2. 关闭其他性能密集型功能（如轨道显示）
  3. 升级硬件或使用性能更好的浏览器
- 记录设备信息用于分析

**实现**:
```typescript
private handlePersistentLowPerformance(): void {
  if (this.qualityController.isAtLowestQuality() && this.performanceMonitor.getAverageFPS() < 30) {
    console.error('[Performance] 性能持续低下');
    
    this.notifyUser(
      '系统性能不足，建议：\n' +
      '1. 减少显示的卫星数量\n' +
      '2. 关闭轨道显示\n' +
      '3. 使用性能更好的设备或浏览器'
    );
    
    // 记录设备信息
    this.logDeviceInfo();
  }
}
```

## 测试策略

### 双重测试方法

系统采用单元测试和基于属性的测试相结合的方法：

- **单元测试**: 验证特定示例、边界情况和错误条件
- **属性测试**: 通过随机输入验证通用属性，确保全面覆盖

两者互补，单元测试捕获具体错误，属性测试验证通用正确性。

### 单元测试重点

单元测试应专注于：

1. **特定示例**:
   - 典型的插值场景（progress = 0, 0.5, 1.0）
   - 标准的缓冲区更新流程
   - 正常的质量调整场景

2. **边界情况**:
   - 空卫星列表
   - 单个卫星
   - 最大卫星数量（100,000）
   - 插值进度超出范围（< 0 或 > 1）
   - 时间戳相等（startTime == endTime）

3. **错误条件**:
   - SGP4 计算失败
   - WebGL 上下文丢失
   - 内存不足
   - Worker 通信失败
   - 无效的配置参数

4. **组件集成**:
   - SatelliteLayer 与 Interpolator 的集成
   - BufferManager 与 Renderer 的集成
   - PerformanceMonitor 与 QualityController 的集成

### 属性测试配置

使用 **fast-check** 库进行属性测试（TypeScript/JavaScript 的 PBT 库）。

**配置**:
- 每个属性测试最少 100 次迭代
- 使用种子确保可重现性
- 标签格式: `Feature: satellite-performance-optimization, Property {N}: {描述}`

**示例属性测试**:

```typescript
import fc from 'fast-check';

describe('Property Tests - Satellite Performance Optimization', () => {
  
  // Feature: satellite-performance-optimization, Property 1: 智能缓冲区更新
  it('should not trigger GPU upload when positions unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          noradId: fc.integer(1, 100000),
          position: fc.record({
            x: fc.float(),
            y: fc.float(),
            z: fc.float()
          })
        }), {minLength: 1, maxLength: 1000}),
        (satellites) => {
          const bufferManager = new SmartBufferManager();
          const positions = new Map(satellites.map(s => [s.noradId, s.position]));
          
          // 第一次更新
          bufferManager.updateBuffers(positions);
          const stats1 = bufferManager.getStats();
          
          // 第二次更新（相同位置）
          bufferManager.updateBuffers(positions);
          const stats2 = bufferManager.getStats();
          
          // 验证：第二次更新应该被跳过
          return stats2.skippedUpdates === stats1.skippedUpdates + 1;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: satellite-performance-optimization, Property 7: 线性插值正确性
  it('should compute correct linear interpolation', () => {
    fc.assert(
      fc.property(
        fc.record({
          start: fc.record({ x: fc.float(), y: fc.float(), z: fc.float() }),
          end: fc.record({ x: fc.float(), y: fc.float(), z: fc.float() }),
          progress: fc.float({ min: 0, max: 1 })
        }),
        ({ start, end, progress }) => {
          const interpolator = new PositionInterpolator();
          const noradId = 12345;
          
          interpolator.setTarget(noradId, new Vector3(start.x, start.y, start.z), 0);
          interpolator.setTarget(noradId, new Vector3(end.x, end.y, end.z), 1000);
          
          const currentTime = progress * 1000;
          const result = interpolator.getInterpolatedPosition(noradId, currentTime);
          
          // 验证线性插值公式
          const expected = {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
            z: start.z + (end.z - start.z) * progress
          };
          
          const epsilon = 0.0001;
          return (
            Math.abs(result.x - expected.x) < epsilon &&
            Math.abs(result.y - expected.y) < epsilon &&
            Math.abs(result.z - expected.z) < epsilon
          );
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: satellite-performance-optimization, Property 18: 缓冲区预分配
  it('should not reallocate buffers when satellite count changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(1, 50000), {minLength: 2, maxLength: 10}),
        (satelliteCounts) => {
          const bufferManager = new SmartBufferManager();
          const initialBuffer = bufferManager.getPositionBuffer();
          
          // 多次改变卫星数量
          for (const count of satelliteCounts) {
            const positions = new Map();
            for (let i = 0; i < count; i++) {
              positions.set(i, new Vector3(Math.random(), Math.random(), Math.random()));
            }
            bufferManager.updateBuffers(positions);
          }
          
          const finalBuffer = bufferManager.getPositionBuffer();
          
          // 验证：缓冲区对象引用应该保持不变
          return initialBuffer === finalBuffer;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: satellite-performance-optimization, Property 6: 位置插值连续性
  it('should maintain position continuity between frames', () => {
    fc.assert(
      fc.property(
        fc.record({
          start: fc.record({ x: fc.float(), y: fc.float(), z: fc.float() }),
          end: fc.record({ x: fc.float(), y: fc.float(), z: fc.float() }),
          frameCount: fc.integer(2, 60)
        }),
        ({ start, end, frameCount }) => {
          const interpolator = new PositionInterpolator();
          const noradId = 12345;
          const duration = 1000; // 1 秒
          
          interpolator.setTarget(noradId, new Vector3(start.x, start.y, start.z), 0);
          interpolator.setTarget(noradId, new Vector3(end.x, end.y, end.z), duration);
          
          let previousPosition = null;
          let maxDelta = 0;
          
          // 模拟多帧
          for (let i = 0; i < frameCount; i++) {
            const currentTime = (i / frameCount) * duration;
            const position = interpolator.getInterpolatedPosition(noradId, currentTime);
            
            if (previousPosition) {
              const delta = position.distanceTo(previousPosition);
              maxDelta = Math.max(maxDelta, delta);
            }
            
            previousPosition = position;
          }
          
          // 验证：相邻帧之间的最大位置变化应该合理
          // （不应该有突变）
          const totalDistance = new Vector3(start.x, start.y, start.z)
            .distanceTo(new Vector3(end.x, end.y, end.z));
          const expectedMaxDelta = totalDistance / frameCount * 2; // 允许 2 倍余量
          
          return maxDelta <= expectedMaxDelta;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 测试文件组织

所有测试文件放在 `test/` 目录：

```
test/
├── unit/
│   ├── position-interpolator.test.ts
│   ├── smart-buffer-manager.test.ts
│   ├── adaptive-bounding-sphere.test.ts
│   ├── performance-monitor.test.ts
│   ├── quality-controller.test.ts
│   └── optimized-satellite-layer.test.ts
├── property/
│   ├── interpolation-properties.test.ts
│   ├── buffer-management-properties.test.ts
│   ├── performance-properties.test.ts
│   └── memory-properties.test.ts
├── integration/
│   ├── end-to-end-rendering.test.ts
│   └── worker-communication.test.ts
└── performance/
    ├── benchmark-interpolation.test.ts
    ├── benchmark-buffer-update.test.ts
    └── benchmark-full-system.test.ts
```

### 性能基准测试

除了功能测试，还需要性能基准测试：

1. **插值性能**: 测量 10,000 颗卫星的插值耗时（目标 < 5ms）
2. **缓冲区更新**: 测量完整缓冲区更新耗时（目标 < 10ms）
3. **包围球计算**: 测量增量更新 vs 完整重算的性能差异
4. **端到端帧时间**: 测量完整渲染循环耗时（目标 < 16.67ms）

**示例基准测试**:

```typescript
describe('Performance Benchmarks', () => {
  it('should interpolate 10000 satellites in < 5ms', () => {
    const interpolator = new PositionInterpolator();
    const satelliteCount = 10000;
    
    // 设置插值状态
    for (let i = 0; i < satelliteCount; i++) {
      interpolator.setTarget(i, randomVector3(), 0);
      interpolator.setTarget(i, randomVector3(), 1000);
    }
    
    // 测量插值性能
    const start = performance.now();
    interpolator.getInterpolatedPositions(500);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5);
  });
});
```

### 持续集成

- 所有测试在 CI 中自动运行
- 单元测试和属性测试必须通过才能合并
- 性能基准测试结果记录并跟踪趋势
- 代码覆盖率目标：> 80%
