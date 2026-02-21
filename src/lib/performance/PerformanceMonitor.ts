/**
 * PerformanceMonitor.ts - 性能监控器
 * 
 * 功能：
 * - 实时监控渲染性能指标
 * - 跟踪帧时间、FPS、GPU 上传耗时等
 * - 使用滑动窗口计算平均值
 * - 提供性能统计信息
 * 
 * 使用：
 * - 在每帧开始时调用 beginFrame()
 * - 在每帧结束时调用 endFrame()
 * - 记录各种操作的耗时
 * - 通过 getMetrics() 获取性能指标
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  /** 当前 FPS */
  fps: number;
  /** 帧时间（毫秒） */
  frameTime: number;
  /** GPU 上传时间（毫秒） */
  gpuUploadTime: number;
  /** 插值时间（毫秒） */
  interpolationTime: number;
  /** SGP4 计算时间（毫秒） */
  sgp4CalculationTime: number;
  /** 内存使用（MB） */
  memoryUsage: number;
  /** 卫星数量 */
  satelliteCount: number;
  /** 可见卫星数量 */
  visibleSatelliteCount: number;
}

/**
 * PerformanceMonitor - 性能监控器
 * 
 * 负责实时监控渲染性能指标，提供性能分析数据。
 * 使用滑动窗口计算平均值，避免瞬时波动。
 * 
 * 核心功能：
 * - 帧时间跟踪（使用 performance.now()）
 * - FPS 计算（基于滑动窗口）
 * - 操作耗时记录（GPU 上传、插值、SGP4 计算）
 * - 内存使用监控（使用 performance.memory）
 * 
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor();
 * 
 * // 在渲染循环中
 * monitor.beginFrame();
 * // ... 渲染操作 ...
 * monitor.endFrame();
 * 
 * // 获取性能指标
 * const metrics = monitor.getMetrics();
 * console.log(`FPS: ${metrics.fps}`);
 * ```
 */
export class PerformanceMonitor {
  /** 性能指标 */
  private metrics: PerformanceMetrics;
  
  /** 帧时间样本（用于计算平均值） */
  private frameTimeSamples: number[];
  
  /** 样本大小（帧数） */
  private sampleSize: number;
  
  /** 当前帧开始时间 */
  private frameStartTime: number;
  
  /** 上一帧结束时间 */
  private lastFrameTime: number;
  
  /** GPU 上传时间累计 */
  private gpuUploadTimeAccumulator: number;
  
  /** 插值时间累计 */
  private interpolationTimeAccumulator: number;
  
  /** SGP4 计算时间累计 */
  private sgp4CalculationTimeAccumulator: number;
  
  /**
   * 创建性能监控器实例
   * 
   * @param sampleSize - 样本大小（帧数），默认 60
   */
  constructor(sampleSize: number = 60) {
    this.sampleSize = sampleSize;
    this.frameTimeSamples = [];
    this.frameStartTime = 0;
    this.lastFrameTime = performance.now();
    
    // 初始化累计器
    this.gpuUploadTimeAccumulator = 0;
    this.interpolationTimeAccumulator = 0;
    this.sgp4CalculationTimeAccumulator = 0;
    
    // 初始化指标
    this.metrics = {
      fps: 0,
      frameTime: 0,
      gpuUploadTime: 0,
      interpolationTime: 0,
      sgp4CalculationTime: 0,
      memoryUsage: 0,
      satelliteCount: 0,
      visibleSatelliteCount: 0
    };
  }
  
  /**
   * 记录帧开始
   * 
   * 在每帧渲染开始时调用，记录开始时间。
   * 
   * @example
   * ```typescript
   * function animate() {
   *   monitor.beginFrame();
   *   // ... 渲染操作 ...
   *   monitor.endFrame();
   * }
   * ```
   */
  beginFrame(): void {
    this.frameStartTime = performance.now();
  }
  
  /**
   * 记录帧结束
   * 
   * 在每帧渲染结束时调用，计算帧时间和 FPS。
   * 
   * @example
   * ```typescript
   * function animate() {
   *   monitor.beginFrame();
   *   // ... 渲染操作 ...
   *   monitor.endFrame();
   * }
   * ```
   */
  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.frameStartTime;
    
    // 添加到样本
    this.frameTimeSamples.push(frameTime);
    if (this.frameTimeSamples.length > this.sampleSize) {
      this.frameTimeSamples.shift();
    }
    
    // 计算平均帧时间
    const sum = this.frameTimeSamples.reduce((a, b) => a + b, 0);
    this.metrics.frameTime = sum / this.frameTimeSamples.length;
    
    // 计算 FPS
    this.metrics.fps = 1000 / this.metrics.frameTime;
    
    // 更新其他指标
    this.metrics.gpuUploadTime = this.gpuUploadTimeAccumulator;
    this.metrics.interpolationTime = this.interpolationTimeAccumulator;
    this.metrics.sgp4CalculationTime = this.sgp4CalculationTimeAccumulator;
    
    // 重置累计器
    this.gpuUploadTimeAccumulator = 0;
    this.interpolationTimeAccumulator = 0;
    this.sgp4CalculationTimeAccumulator = 0;
    
    // 更新内存使用
    this.updateMemoryUsage();
    
    // 更新上一帧时间
    this.lastFrameTime = now;
  }
  
  /**
   * 记录 GPU 上传时间
   * 
   * 在 GPU 缓冲区上传完成后调用。
   * 
   * @param duration - 上传耗时（毫秒）
   * 
   * @example
   * ```typescript
   * const start = performance.now();
   * // ... GPU 上传操作 ...
   * monitor.recordGPUUpload(performance.now() - start);
   * ```
   */
  recordGPUUpload(duration: number): void {
    this.gpuUploadTimeAccumulator += duration;
  }
  
  /**
   * 记录插值时间
   * 
   * 在插值计算完成后调用。
   * 
   * @param duration - 插值耗时（毫秒）
   * 
   * @example
   * ```typescript
   * const start = performance.now();
   * // ... 插值计算 ...
   * monitor.recordInterpolation(performance.now() - start);
   * ```
   */
  recordInterpolation(duration: number): void {
    this.interpolationTimeAccumulator += duration;
  }
  
  /**
   * 记录 SGP4 计算时间
   * 
   * 在 SGP4 计算完成后调用。
   * 
   * @param duration - 计算耗时（毫秒）
   * 
   * @example
   * ```typescript
   * const start = performance.now();
   * // ... SGP4 计算 ...
   * monitor.recordSGP4Calculation(performance.now() - start);
   * ```
   */
  recordSGP4Calculation(duration: number): void {
    this.sgp4CalculationTimeAccumulator += duration;
  }
  
  /**
   * 更新内存使用
   * 
   * 使用 performance.memory API 获取内存使用情况。
   * 注意：此 API 仅在 Chrome 中可用。
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      // 转换为 MB
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024);
    }
  }
  
  /**
   * 设置卫星数量
   * 
   * @param count - 卫星数量
   */
  setSatelliteCount(count: number): void {
    this.metrics.satelliteCount = count;
  }
  
  /**
   * 设置可见卫星数量
   * 
   * @param count - 可见卫星数量
   */
  setVisibleSatelliteCount(count: number): void {
    this.metrics.visibleSatelliteCount = count;
  }
  
  /**
   * 获取当前性能指标
   * 
   * @returns 性能指标
   * 
   * @example
   * ```typescript
   * const metrics = monitor.getMetrics();
   * console.log(`FPS: ${metrics.fps.toFixed(1)}`);
   * console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
   * ```
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 获取平均 FPS（基于最近 N 帧）
   * 
   * @returns 平均 FPS
   * 
   * @example
   * ```typescript
   * const avgFps = monitor.getAverageFPS();
   * ```
   */
  getAverageFPS(): number {
    return this.metrics.fps;
  }
  
  /**
   * 获取帧时间样本
   * 
   * 用于调试和分析。
   * 
   * @returns 帧时间样本数组
   */
  getFrameTimeSamples(): number[] {
    return [...this.frameTimeSamples];
  }
  
  /**
   * 重置性能监控器
   * 
   * 清空所有样本和指标。
   */
  reset(): void {
    this.frameTimeSamples = [];
    this.gpuUploadTimeAccumulator = 0;
    this.interpolationTimeAccumulator = 0;
    this.sgp4CalculationTimeAccumulator = 0;
    
    this.metrics = {
      fps: 0,
      frameTime: 0,
      gpuUploadTime: 0,
      interpolationTime: 0,
      sgp4CalculationTime: 0,
      memoryUsage: 0,
      satelliteCount: 0,
      visibleSatelliteCount: 0
    };
  }
  
  /**
   * 设置样本大小
   * 
   * @param size - 新的样本大小（帧数）
   */
  setSampleSize(size: number): void {
    this.sampleSize = size;
    
    // 调整样本数组大小
    while (this.frameTimeSamples.length > size) {
      this.frameTimeSamples.shift();
    }
  }
  
  /**
   * 获取样本大小
   * 
   * @returns 样本大小（帧数）
   */
  getSampleSize(): number {
    return this.sampleSize;
  }
}
