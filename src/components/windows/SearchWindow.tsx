/**
 * SearchWindow.tsx - macOS 风格搜索窗口
 * 
 * 将 CelestialSearch 组件封装到窗口中
 */

'use client';

import CelestialSearch from '../search/CelestialSearch';
import type { SceneManager } from '@/lib/3d/SceneManager';
import type { CameraController } from '@/lib/3d/CameraController';

interface SearchWindowProps {
  sceneManager: SceneManager;
  cameraController: CameraController;
}

export function SearchWindow({ sceneManager, cameraController }: SearchWindowProps) {
  return (
    <div className="h-full overflow-auto">
      <CelestialSearch
        sceneManager={sceneManager}
        cameraController={cameraController}
        style={{
          position: 'relative',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '100%',
          padding: '1rem',
        }}
      />
    </div>
  );
}
