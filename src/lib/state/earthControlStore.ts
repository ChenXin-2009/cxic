/**
 * Earth Control Store - 管理地球控制相关的全局状态
 * 
 * 存储 Cesium、地球锁定、地球光照等状态
 */

import { create } from 'zustand';

interface EarthControlState {
  cesiumEnabled: boolean;
  earthLockEnabled: boolean;
  earthLightEnabled: boolean;
  earthPlanet: any | null;
  setCesiumEnabled: (enabled: boolean) => void;
  setEarthLockEnabled: (enabled: boolean) => void;
  setEarthLightEnabled: (enabled: boolean) => void;
  setEarthPlanet: (planet: any) => void;
}

export const useEarthControlStore = create<EarthControlState>((set) => ({
  cesiumEnabled: true, // 默认开启 Cesium
  earthLockEnabled: true,
  earthLightEnabled: true,
  earthPlanet: null,
  setCesiumEnabled: (enabled) => set({ cesiumEnabled: enabled }),
  setEarthLockEnabled: (enabled) => set({ earthLockEnabled: enabled }),
  setEarthLightEnabled: (enabled) => set({ earthLightEnabled: enabled }),
  setEarthPlanet: (planet) => set({ earthPlanet: planet }),
}));
