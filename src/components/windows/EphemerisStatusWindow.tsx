/**
 * EphemerisStatusWindow.tsx - macOS 风格星历状态窗口
 * 
 * 显示星历数据加载状态，允许用户控制每个天体的高精度模式
 */

'use client';

import { useSolarSystemStore } from '@/lib/state';
import { type BodyKey, LoadingStatus, useEphemerisStore } from '@/lib/store/useEphemerisStore';
import { dateToJulianDay } from '@/lib/astronomy/time';

interface EphemerisStatusWindowProps {
  lang?: 'zh' | 'en';
}

// 天体分组
const BODY_GROUPS = {
  planets: ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as BodyKey[],
  earthSatellites: ['moon'] as BodyKey[],
  jupiterSatellites: ['io', 'europa', 'ganymede', 'callisto'] as BodyKey[],
  saturnSatellites: ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'hyperion', 'iapetus'] as BodyKey[],
  uranusSatellites: ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'] as BodyKey[],
  neptuneSatellites: ['triton'] as BodyKey[],
};

// 天体名称映射
const BODY_NAMES: Record<BodyKey, { zh: string; en: string }> = {
  mercury: { zh: '水星', en: 'Mercury' },
  venus: { zh: '金星', en: 'Venus' },
  earth: { zh: '地球', en: 'Earth' },
  mars: { zh: '火星', en: 'Mars' },
  jupiter: { zh: '木星', en: 'Jupiter' },
  saturn: { zh: '土星', en: 'Saturn' },
  uranus: { zh: '天王星', en: 'Uranus' },
  neptune: { zh: '海王星', en: 'Neptune' },
  moon: { zh: '月球', en: 'Moon' },
  io: { zh: '木卫一', en: 'Io' },
  europa: { zh: '木卫二', en: 'Europa' },
  ganymede: { zh: '木卫三', en: 'Ganymede' },
  callisto: { zh: '木卫四', en: 'Callisto' },
  mimas: { zh: '土卫一', en: 'Mimas' },
  enceladus: { zh: '土卫二', en: 'Enceladus' },
  tethys: { zh: '土卫三', en: 'Tethys' },
  dione: { zh: '土卫四', en: 'Dione' },
  rhea: { zh: '土卫五', en: 'Rhea' },
  titan: { zh: '土卫六', en: 'Titan' },
  hyperion: { zh: '土卫七', en: 'Hyperion' },
  iapetus: { zh: '土卫八', en: 'Iapetus' },
  miranda: { zh: '天卫五', en: 'Miranda' },
  ariel: { zh: '天卫一', en: 'Ariel' },
  umbriel: { zh: '天卫二', en: 'Umbriel' },
  titania: { zh: '天卫三', en: 'Titania' },
  oberon: { zh: '天卫四', en: 'Oberon' },
  triton: { zh: '海卫一', en: 'Triton' },
};

export function EphemerisStatusWindow({ lang = 'zh' }: EphemerisStatusWindowProps) {
  const currentTime = useSolarSystemStore((state) => state.currentTime);
  const { bodies, enableBody, disableBody, enableAll, disableAll } = useEphemerisStore();

  // 当前儒略日
  const currentJD = dateToJulianDay(currentTime);

  // 检查时间是否在范围内
  const isTimeInRange = (bodyKey: BodyKey): boolean => {
    const config = bodies[bodyKey];
    if (!config.timeRange) return true;
    return currentJD >= config.timeRange.start && currentJD <= config.timeRange.end;
  };

  // 将儒略日转换为日期字符串
  const julianToDateString = (jd: number): string => {
    const date = new Date((jd - 2440587.5) * 86400000);
    return date.toISOString().split('T')[0];
  };

  // 获取状态颜色
  const getStatusColor = (status: LoadingStatus) => {
    switch (status) {
      case LoadingStatus.LOADED:
        return 'text-green-400';
      case LoadingStatus.LOADING:
        return 'text-yellow-400';
      case LoadingStatus.ERROR:
        return 'text-red-400';
      default:
        return 'text-white/40';
    }
  };

  // 获取状态文本
  const getStatusText = (status: LoadingStatus) => {
    const texts = {
      [LoadingStatus.NOT_LOADED]: { zh: '未加载', en: 'Not Loaded' },
      [LoadingStatus.LOADING]: { zh: '加载中', en: 'Loading' },
      [LoadingStatus.LOADED]: { zh: '已加载', en: 'Loaded' },
      [LoadingStatus.ERROR]: { zh: '错误', en: 'Error' },
    };
    return texts[status][lang];
  };

  // 获取使用状态说明
  const getUsageText = (bodyKey: BodyKey) => {
    const config = bodies[bodyKey];
    const inRange = isTimeInRange(bodyKey);
    
    if (!config.enabled) {
      return lang === 'zh' ? '使用解析模型（快速）' : 'Using Analytical Model (Fast)';
    }
    
    if (!inRange) {
      return lang === 'zh' ? '超出时间范围，使用解析模型' : 'Out of Range, Using Analytical';
    }
    
    switch (config.status) {
      case LoadingStatus.NOT_LOADED:
        return lang === 'zh' ? '等待加载星历数据' : 'Waiting to Load Ephemeris';
      case LoadingStatus.LOADING:
        return lang === 'zh' ? '正在下载星历数据...' : 'Downloading Ephemeris...';
      case LoadingStatus.LOADED:
        return lang === 'zh' ? '使用星历数据（高精度）' : 'Using Ephemeris (High Precision)';
      case LoadingStatus.ERROR:
        return lang === 'zh' ? '加载失败，使用解析模型' : 'Load Failed, Using Analytical';
      default:
        return '';
    }
  };

  // 渲染天体项
  const renderBodyItem = (bodyKey: BodyKey) => {
    const config = bodies[bodyKey];
    const name = BODY_NAMES[bodyKey][lang];
    const statusColor = getStatusColor(config.status);
    const statusText = getStatusText(config.status);
    const inRange = isTimeInRange(bodyKey);

    return (
      <div
        key={bodyKey}
        className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/10"
      >
        {/* 第一行：开关、名称、状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* 开关 */}
            <button
              onClick={() => {
                if (!inRange && !config.enabled) {
                  return;
                }
                config.enabled ? disableBody(bodyKey) : enableBody(bodyKey);
              }}
              className={`relative w-14 h-8 rounded-full transition-all ${
                config.enabled && inRange ? 'bg-blue-500' : 'bg-white/20'
              } ${!inRange && !config.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                  config.enabled && inRange ? 'left-7' : 'left-1'
                }`}
              />
            </button>

            {/* 名称 */}
            <span className="text-sm font-medium text-white">{name}</span>
          </div>

          {/* 状态 */}
          <span className={`text-xs ${statusColor}`}>{statusText}</span>
        </div>

        {/* 第二行：使用状态说明 */}
        <div className="text-xs text-white/60 pl-[52px]">
          {getUsageText(bodyKey)}
        </div>

        {/* 第三行：时间范围（如果有） */}
        {config.timeRange && (
          <div className="text-xs text-white/60 pl-[52px]">
            {lang === 'zh' ? '时间范围: ' : 'Time Range: '}
            {julianToDateString(config.timeRange.start)} ~ {julianToDateString(config.timeRange.end)}
            {!inRange && (
              <span className="text-red-400 ml-2">
                ({lang === 'zh' ? '当前时间超出范围' : 'Current time out of range'})
              </span>
            )}
          </div>
        )}

        {/* 第四行：精度信息（如果有） */}
        {config.accuracy && (
          <div className="text-xs text-white/60 pl-[52px]">
            {lang === 'zh' ? '精度: ' : 'Accuracy: '}
            {lang === 'zh' ? '星历' : 'Ephemeris'} {config.accuracy.ephemeris} / 
            {lang === 'zh' ? ' 解析' : ' Analytical'} {config.accuracy.analytical}
          </div>
        )}
      </div>
    );
  };

  // 渲染分组
  const renderGroup = (title: string, bodyKeys: BodyKey[]) => (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-blue-500" />
        <span className="text-xs font-bold uppercase tracking-wide text-white">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {bodyKeys.map(renderBodyItem)}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white/5">
      {/* 内容区域 - 带滚动条 */}
      <div className="flex-1 overflow-auto p-4">
        {renderGroup(lang === 'zh' ? '行星 (8)' : 'PLANETS (8)', BODY_GROUPS.planets)}
        {renderGroup(lang === 'zh' ? '地球卫星 (1)' : 'EARTH SATELLITES (1)', BODY_GROUPS.earthSatellites)}
        {renderGroup(lang === 'zh' ? '木星卫星 (4)' : 'JUPITER SATELLITES (4)', BODY_GROUPS.jupiterSatellites)}
        {renderGroup(lang === 'zh' ? '土星卫星 (8)' : 'SATURN SATELLITES (8)', BODY_GROUPS.saturnSatellites)}
        {renderGroup(lang === 'zh' ? '天王星卫星 (5)' : 'URANUS SATELLITES (5)', BODY_GROUPS.uranusSatellites)}
        {renderGroup(lang === 'zh' ? '海王星卫星 (1)' : 'NEPTUNE SATELLITES (1)', BODY_GROUPS.neptuneSatellites)}
      </div>

      {/* 底部按钮 */}
      <div className="flex gap-3 p-4 border-t border-white/10 bg-black/50">
        <button
          onClick={enableAll}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all"
        >
          {lang === 'zh' ? '全部启用' : 'ENABLE ALL'}
        </button>
        <button
          onClick={disableAll}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          {lang === 'zh' ? '全部禁用' : 'DISABLE ALL'}
        </button>
      </div>
    </div>
  );
}
