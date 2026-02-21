# 需求文档：时间滑块精细化单位控制

## 简介

本功能旨在改进现有的时间控制滑块，使其支持更精细的时间单位控制。当前滑块仅支持天/秒、月/秒、年/秒三个粗粒度单位，用户需要更细致的时间控制能力，包括秒级、分钟级和小时级的时间流速控制。

## 术语表

- **Time_Slider**: 位于屏幕底部的弧形时间控制滑块组件
- **Slider_Position**: 滑块在轨道上的位置，范围为 0 到 1，0.5 为中心点
- **Time_Speed**: 时间流速，表示模拟时间相对于真实时间的流逝速度
- **Speed_Zone**: 滑块轨道上的速度区域，每个区域对应不同的时间单位
- **Dead_Zone**: 滑块中心附近的暂停区域，在此区域内时间流速为零
- **Speed_Label**: 显示当前时间流速的文本标签
- **Normalized_Offset**: 归一化的滑块偏移量，范围为 -1 到 1，0 为中心点

## 需求

### 需求 1：多级时间单位支持

**用户故事：** 作为用户，我希望滑块支持从秒到年的多级时间单位，以便我可以精确控制时间流速。

#### 验收标准

1. WHEN Slider_Position 等于 0.5 THEN THE Time_Slider SHALL 设置 Time_Speed 为零（暂停状态）
2. WHEN Slider_Position 在 0.5 附近的 Dead_Zone 内 THEN THE Time_Slider SHALL 保持 Time_Speed 为零
3. WHEN Slider_Position 在 Dead_Zone 外且靠近中心 THEN THE Time_Slider SHALL 使用秒级单位（秒/秒）
4. WHEN Slider_Position 进一步远离中心 THEN THE Time_Slider SHALL 依次使用分钟级单位（分/秒）和小时级单位（时/秒）
5. WHEN Slider_Position 在轨道远端 THEN THE Time_Slider SHALL 使用天级、月级和年级单位（天/秒、月/秒、年/秒）

### 需求 2：平滑速度过渡

**用户故事：** 作为用户，我希望在不同时间单位之间切换时速度变化是平滑的，以便获得流畅的控制体验。

#### 验收标准

1. WHEN Slider_Position 从一个 Speed_Zone 移动到另一个 Speed_Zone THEN THE Time_Slider SHALL 确保 Time_Speed 连续变化，无突变
2. WHEN 计算 Time_Speed THEN THE Time_Slider SHALL 使用分段函数，每段使用指数曲线或线性插值
3. WHEN 在相邻 Speed_Zone 的边界处 THEN THE Time_Slider SHALL 确保速度值相等（连续性）
4. FOR ALL Slider_Position 值 THEN THE Time_Slider SHALL 确保 Time_Speed 是单调递增的（向前方向）或单调递减的（向后方向）

### 需求 3：速度标签显示

**用户故事：** 作为用户，我希望看到清晰的速度标签，显示当前的时间流速和单位，以便我了解当前的时间控制状态。

#### 验收标准

1. WHEN Time_Speed 为零 THEN THE Speed_Label SHALL 显示"暂停"（中文）或"Paused"（英文）
2. WHEN Time_Speed 使用秒级单位 THEN THE Speed_Label SHALL 显示格式为"X秒/秒"或"Xs/s"
3. WHEN Time_Speed 使用分钟级单位 THEN THE Speed_Label SHALL 显示格式为"X分/秒"或"Xmin/s"
4. WHEN Time_Speed 使用小时级单位 THEN THE Speed_Label SHALL 显示格式为"X时/秒"或"Xh/s"
5. WHEN Time_Speed 使用天级单位 THEN THE Speed_Label SHALL 显示格式为"X天/秒"或"Xd/s"
6. WHEN Time_Speed 使用月级单位 THEN THE Speed_Label SHALL 显示格式为"X月/秒"或"Xm/s"
7. WHEN Time_Speed 使用年级单位 THEN THE Speed_Label SHALL 显示格式为"X年/秒"或"Xy/s"
8. FOR ALL Speed_Label 显示 THEN THE Time_Slider SHALL 根据当前语言设置（中文或英文）选择相应的格式

### 需求 4：速度区域配置

**用户故事：** 作为开发者，我希望速度区域的边界和参数是可配置的，以便我可以调整和优化用户体验。

#### 验收标准

1. THE Time_Slider SHALL 在配置文件中定义所有 Speed_Zone 的边界位置
2. THE Time_Slider SHALL 在配置文件中定义每个 Speed_Zone 的最大速度值
3. THE Time_Slider SHALL 在配置文件中定义每个 Speed_Zone 的速度曲线指数
4. THE Time_Slider SHALL 在配置文件中定义 Dead_Zone 的大小
5. WHEN 配置参数被修改 THEN THE Time_Slider SHALL 使用新的配置值重新计算速度

### 需求 5：向后兼容性

**用户故事：** 作为开发者，我希望新的实现保持与现有代码的兼容性，以便不破坏其他依赖时间滑块的功能。

#### 验收标准

1. THE Time_Slider SHALL 保持现有的组件接口不变（props、事件等）
2. THE Time_Slider SHALL 继续使用现有的 useSolarSystemStore 状态管理
3. THE Time_Slider SHALL 保持现有的拖拽和点击交互行为
4. THE Time_Slider SHALL 保持现有的视觉样式（弧形轨道、滑块圆圈等）
5. WHEN 其他组件调用 Time_Slider 的速度计算函数 THEN THE Time_Slider SHALL 返回兼容的数据结构

### 需求 6：双向时间控制

**用户故事：** 作为用户，我希望可以向前或向后控制时间流速，以便我可以回溯或快进时间。

#### 验收标准

1. WHEN Slider_Position 大于 0.5 THEN THE Time_Slider SHALL 设置时间方向为前进（forward）
2. WHEN Slider_Position 小于 0.5 THEN THE Time_Slider SHALL 设置时间方向为后退（backward）
3. FOR ALL Speed_Zone THEN THE Time_Slider SHALL 在前进和后退方向上应用相同的速度计算逻辑
4. WHEN 时间方向改变 THEN THE Time_Slider SHALL 更新滑块和标签的视觉样式以反映方向变化

### 需求 7：性能优化

**用户故事：** 作为用户，我希望滑块操作响应迅速，不会造成卡顿，以便获得流畅的交互体验。

#### 验收标准

1. WHEN 用户拖动滑块 THEN THE Time_Slider SHALL 在每帧内完成速度计算（< 16ms）
2. THE Time_Slider SHALL 避免在速度计算中使用复杂的数学运算
3. THE Time_Slider SHALL 缓存不变的配置参数，避免重复计算
4. WHEN Speed_Label 需要更新 THEN THE Time_Slider SHALL 仅在速度值变化时重新格式化文本
