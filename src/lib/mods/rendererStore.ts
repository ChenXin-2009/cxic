/**
 * MOD渲染器全局存储
 * 用于在Overlay和Window之间共享渲染器实例
 */

import type { LaunchRenderer } from './space-launches/LaunchRenderer';
import type { TrafficRenderer } from './global-traffic/TrafficRenderer';
import type { DisasterRenderer } from './weather-disaster/DisasterRenderer';

interface RendererStore {
  spaceLaunches: LaunchRenderer | null;
  globalTraffic: TrafficRenderer | null;
  weatherDisaster: DisasterRenderer | null;
}

const renderers: RendererStore = {
  spaceLaunches: null,
  globalTraffic: null,
  weatherDisaster: null,
};

export const rendererStore = {
  // Space Launches
  setSpaceLaunchesRenderer: (renderer: LaunchRenderer | null) => {
    renderers.spaceLaunches = renderer;
  },
  getSpaceLaunchesRenderer: () => renderers.spaceLaunches,

  // Global Traffic
  setGlobalTrafficRenderer: (renderer: TrafficRenderer | null) => {
    renderers.globalTraffic = renderer;
  },
  getGlobalTrafficRenderer: () => renderers.globalTraffic,

  // Weather Disaster
  setWeatherDisasterRenderer: (renderer: DisasterRenderer | null) => {
    renderers.weatherDisaster = renderer;
  },
  getWeatherDisasterRenderer: () => renderers.weatherDisaster,
};
