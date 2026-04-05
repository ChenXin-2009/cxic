'use client';

/**
 * @module components/flight-tracking/FlightConfigPanel
 * @description 航班追踪 MOD 配置面板
 */

import React, { useState, useCallback } from 'react';
import { useFlightStore } from '@/lib/mods/flight-tracking/store/flightStore';
import { t, type Lang } from './i18n';

interface FlightConfigPanelProps {
  lang?: Lang;
  onClose?: () => void;
}

export function FlightConfigPanel({ lang = 'zh', onClose }: FlightConfigPanelProps) {
  const { config, setConfig } = useFlightStore();

  const [interval, setInterval] = useState(String(config.updateInterval / 1000));

  const handleSave = useCallback(() => {
    const secs = parseInt(interval);
    setConfig({
      updateInterval: isNaN(secs) || secs < 5 ? 10000 : secs * 1000,
    });

    // 持久化到 localStorage
    try {
      localStorage.setItem(
        'cxic:flight-tracking:config',
        JSON.stringify({ ...config, updateInterval: (isNaN(secs) ? 10 : secs) * 1000 })
      );
    } catch {
      // ignore
    }

    onClose?.();
  }, [interval, config, setConfig, onClose]);

  return (
    <div className="w-72 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl text-white">
      {/* 标题 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="font-semibold text-sm">✈ {t(lang, 'settings')}</span>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none">
            ×
          </button>
        )}
      </div>

      <div className="px-4 py-3 space-y-4 text-sm">
        {/* 更新间隔 */}
        <div>
          <label className="text-xs text-white/50 block mb-1">{t(lang, 'updateInterval')}</label>
          <input
            type="number"
            min={5}
            max={60}
            value={interval}
            onChange={e => setInterval(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
          />
        </div>

        {/* 显示选项 */}
        <div className="space-y-2">
          <Toggle
            label={t(lang, 'showPath')}
            value={config.showFlightPath}
            onChange={v => setConfig({ showFlightPath: v })}
          />
          <Toggle
            label={t(lang, 'showLabels')}
            value={config.showLabels}
            onChange={v => setConfig({ showLabels: v })}
          />
          <Toggle
            label="聚合显示"
            value={config.enableClustering}
            onChange={v => setConfig({ enableClustering: v })}
          />
        </div>

        {/* OpenSky 认证状态提示 */}
        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-xs text-white/40">
            {lang === 'zh'
              ? 'OpenSky 认证凭证由服务端环境变量配置，可提升数据更新频率'
              : 'OpenSky credentials are configured via server env vars for higher rate limits'}
          </p>
        </div>

        {/* 保存 */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg py-2 text-sm font-medium"
        >
          {t(lang, 'save')}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-white/20'}`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}
