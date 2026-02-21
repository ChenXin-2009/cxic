/**
 * AdaptiveBoundingSphere.ts - 自适应包围球计算器
 * 
 * 功能：
 * - 延迟和增量更新包围球
 * - 使用阈值触发机制，减少计算开销
 * - 支持完整重算和增量更新
 * - 使用 Ritter's algorithm 进行快速计算
 * 
 * 使用：
 * - 每帧调用 shouldUpdate() 检查是否需要更新
 * - 根据需要调用 incrementalUpdate() 或 fullRecalculation()
 * - 通过 getSphere() 获取当前包围球
 */

import { Vector3, Sphere } from 'three';

/**
 * 包围球状态
 */
export interface BoundingSphereState {
  /** 中心点 */
  center: Vector3;
  /** 半径 */
  radius: number;
  /** 最后更新时间 */
  lastUpdateTime: number;
  /** 卫星数量 */
  satelliteCount: number;
  /** 是否需要重新计算 */
  needsRecalculation: boolean;
}

/**
 * AdaptiveBoundingSphere - 自适应包围球计算器
 * 
 * 负责智能管理 Three.js BufferGeometry 的包围球计算。
 * 通过延迟和增量更新减少计算开销，提升渲染性能。
 * 
 * 核心功能：
 * - 阈值触发（只在卫星数量变化超过 10% 时重算）
 * - 最小更新间隔（5 秒）
 * - 增量更新（扩展现有包围球）
 * - 完整重算（使用 Ritter's algorithm）
 * 
 * @example
 * ```typescript
 * const boundingSphere = new AdaptiveBoundingSphere();
 * 
 * // 检查是否需要更新
 * if (boundingSphere.shouldUpdate(satelliteCount)) {
 *   boundingSphere.incrementalUpdate(newPositions);
 * }
 * 
 * // 获取包围球
 * const sphere = boundingSphere.getSphere();
 * ```
 */
export class AdaptiveBoundingSphere {
  /** 包围球状态 */
  private state: BoundingSphereState;
  
  /** 卫星数量变化阈值（百分比） */
  private updateThreshold: number;
  
  /** 最小更新间隔（毫秒） */
  private minUpdateInterval: number;
  
  /**
   * 创建自适应包围球计算器实例
   * 
   * @param updateThreshold - 卫星数量变化阈值（百分比），默认 0.1 (10%)
   * @param minUpdateInterval - 最小更新间隔（毫秒），默认 5000 (5秒)
   */
  constructor(updateThreshold: number = 0.1, minUpdateInterval: number = 5000) {
    this.updateThreshold = updateThreshold;
    this.minUpdateInterval = minUpdateInterval;
    
    // 初始化包围球状态
    this.state = {
      center: new Vector3(0, 0, 0),
      radius: 0,
      lastUpdateTime: 0,
      satelliteCount: 0,
      needsRecalculation: true
    };
  }
  
  /**
   * 检查是否需要更新包围球
   * 
   * 判断条件：
   * 1. 卫星数量变化超过阈值（10%）
   * 2. 距离上次更新超过最小间隔（5秒）
   * 3. 标记为需要重新计算
   * 
   * @param currentSatelliteCount - 当前卫星数量
   * @returns 是否需要更新
   * 
   * @example
   * ```typescript
   * if (boundingSphere.shouldUpdate(1000)) {
   *   // 执行更新
   * }
   * ```
   */
  shouldUpdate(currentSatelliteCount: number): boolean {
    const now = Date.now();
    
    // 如果标记为需要重新计算，直接返回 true
    if (this.state.needsRecalculation) {
      return true;
    }
    
    // 检查最小更新间隔
    if (now - this.state.lastUpdateTime < this.minUpdateInterval) {
      return false;
    }
    
    // 检查卫星数量变化是否超过阈值
    if (this.state.satelliteCount === 0) {
      // 首次更新
      return currentSatelliteCount > 0;
    }
    
    const countChange = Math.abs(currentSatelliteCount - this.state.satelliteCount);
    const changeRatio = countChange / this.state.satelliteCount;
    
    return changeRatio > this.updateThreshold;
  }
  
  /**
   * 增量更新包围球
   * 
   * 扩展现有包围球以包含新位置，避免完整重算。
   * 算法：对于每个新位置，如果超出当前包围球，则扩展半径。
   * 
   * @param newPositions - 新增或变化的位置数组
   * 
   * @example
   * ```typescript
   * const newPositions = [new Vector3(1, 2, 3), new Vector3(4, 5, 6)];
   * boundingSphere.incrementalUpdate(newPositions);
   * ```
   */
  incrementalUpdate(newPositions: Vector3[]): void {
    if (newPositions.length === 0) {
      return;
    }
    
    // 如果是首次更新或需要重新计算，执行完整重算
    if (this.state.satelliteCount === 0 || this.state.needsRecalculation) {
      this.fullRecalculation(newPositions);
      return;
    }
    
    // 增量更新：扩展包围球以包含新位置
    newPositions.forEach(position => {
      const distance = position.distanceTo(this.state.center);
      if (distance > this.state.radius) {
        // 扩展半径
        this.state.radius = distance;
      }
    });
    
    // 更新状态
    this.state.lastUpdateTime = Date.now();
    this.state.satelliteCount = newPositions.length;
    this.state.needsRecalculation = false;
  }
  
  /**
   * 完整重新计算包围球
   * 
   * 使用 Ritter's algorithm 进行快速近似计算。
   * 算法步骤：
   * 1. 找到距离原点最远的点作为初始点
   * 2. 找到距离初始点最远的点
   * 3. 计算这两点的中点作为球心
   * 4. 计算半径
   * 5. 遍历所有点，扩展包围球以包含所有点
   * 
   * @param allPositions - 所有位置数组
   * 
   * @example
   * ```typescript
   * const allPositions = [new Vector3(1, 2, 3), new Vector3(4, 5, 6)];
   * boundingSphere.fullRecalculation(allPositions);
   * ```
   */
  fullRecalculation(allPositions: Vector3[]): void {
    if (allPositions.length === 0) {
      // 如果没有位置，重置包围球
      this.state.center.set(0, 0, 0);
      this.state.radius = 0;
      this.state.satelliteCount = 0;
      this.state.lastUpdateTime = Date.now();
      this.state.needsRecalculation = false;
      return;
    }
    
    if (allPositions.length === 1) {
      // 如果只有一个位置，球心为该位置，半径为 0
      this.state.center.copy(allPositions[0]);
      this.state.radius = 0;
      this.state.satelliteCount = 1;
      this.state.lastUpdateTime = Date.now();
      this.state.needsRecalculation = false;
      return;
    }
    
    // Ritter's algorithm
    
    // 步骤 1: 找到距离原点最远的点
    let maxDistance = 0;
    let farthestPoint = allPositions[0];
    
    allPositions.forEach(position => {
      const distance = position.length();
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestPoint = position;
      }
    });
    
    // 步骤 2: 找到距离 farthestPoint 最远的点
    maxDistance = 0;
    let secondFarthestPoint = allPositions[0];
    
    allPositions.forEach(position => {
      const distance = position.distanceTo(farthestPoint);
      if (distance > maxDistance) {
        maxDistance = distance;
        secondFarthestPoint = position;
      }
    });
    
    // 步骤 3: 计算中点作为球心
    this.state.center.copy(farthestPoint).add(secondFarthestPoint).multiplyScalar(0.5);
    
    // 步骤 4: 计算半径
    this.state.radius = farthestPoint.distanceTo(secondFarthestPoint) * 0.5;
    
    // 步骤 5: 遍历所有点，扩展包围球
    allPositions.forEach(position => {
      const distance = position.distanceTo(this.state.center);
      if (distance > this.state.radius) {
        // 扩展包围球
        const newRadius = (this.state.radius + distance) * 0.5;
        const offset = newRadius - this.state.radius;
        
        // 调整球心
        const direction = new Vector3().subVectors(position, this.state.center).normalize();
        this.state.center.add(direction.multiplyScalar(offset));
        
        // 更新半径
        this.state.radius = newRadius;
      }
    });
    
    // 更新状态
    this.state.lastUpdateTime = Date.now();
    this.state.satelliteCount = allPositions.length;
    this.state.needsRecalculation = false;
  }
  
  /**
   * 获取当前包围球
   * 
   * @returns Three.js Sphere 对象
   * 
   * @example
   * ```typescript
   * const sphere = boundingSphere.getSphere();
   * geometry.boundingSphere = sphere;
   * ```
   */
  getSphere(): Sphere {
    return new Sphere(this.state.center.clone(), this.state.radius);
  }
  
  /**
   * 获取包围球状态
   * 
   * 用于调试和监控。
   * 
   * @returns 包围球状态
   */
  getState(): BoundingSphereState {
    return {
      center: this.state.center.clone(),
      radius: this.state.radius,
      lastUpdateTime: this.state.lastUpdateTime,
      satelliteCount: this.state.satelliteCount,
      needsRecalculation: this.state.needsRecalculation
    };
  }
  
  /**
   * 标记需要重新计算
   * 
   * 强制在下次 shouldUpdate() 时返回 true。
   * 
   * @example
   * ```typescript
   * boundingSphere.markNeedsRecalculation();
   * ```
   */
  markNeedsRecalculation(): void {
    this.state.needsRecalculation = true;
  }
  
  /**
   * 设置卫星数量变化阈值
   * 
   * @param threshold - 新的阈值（百分比）
   */
  setUpdateThreshold(threshold: number): void {
    this.updateThreshold = threshold;
  }
  
  /**
   * 获取卫星数量变化阈值
   * 
   * @returns 阈值（百分比）
   */
  getUpdateThreshold(): number {
    return this.updateThreshold;
  }
  
  /**
   * 设置最小更新间隔
   * 
   * @param interval - 新的间隔（毫秒）
   */
  setMinUpdateInterval(interval: number): void {
    this.minUpdateInterval = interval;
  }
  
  /**
   * 获取最小更新间隔
   * 
   * @returns 间隔（毫秒）
   */
  getMinUpdateInterval(): number {
    return this.minUpdateInterval;
  }
  
  /**
   * 重置包围球
   * 
   * 清空所有状态，重新开始。
   */
  reset(): void {
    this.state = {
      center: new Vector3(0, 0, 0),
      radius: 0,
      lastUpdateTime: 0,
      satelliteCount: 0,
      needsRecalculation: true
    };
  }
}
