'use client';

import { useEffect } from 'react';
import { useDockStore } from '@/lib/state/dockStore';
import { useWindowManagerStore } from '@/lib/state/windowManagerStore';
import { useSceneStore } from '@/lib/state/sceneStore';
import { defaultDockItems } from '@/lib/config/defaultDockItems';
import { SettingsWindow } from './windows/SettingsWindow';
import { SearchWindow } from './windows/SearchWindow';
import { ModManagerWindow } from './windows/ModManagerWindow';
import { AboutWindow } from './windows/AboutWindow';
import { EphemerisStatusWindow } from './windows/EphemerisStatusWindow';

/**
 * Dock 初始化组件
 * 
 * 负责初始化默认的 Dock 项目并设置点击事件
 */
export function DockInitializer() {
  const { addItem, hasItem } = useDockStore();
  const { openWindow } = useWindowManagerStore();
  const { sceneManager, cameraController } = useSceneStore();

  useEffect(() => {
    // 初始化默认 Dock 项目
    defaultDockItems.forEach((config) => {
      if (!hasItem(config.id)) {
        addItem({
          ...config,
          type: 'app',
          isRunning: false,
          onClick: () => {
            // 点击 Dock 图标时打开对应窗口
            if (config.windowId) {
              // 根据不同的窗口 ID 渲染不同的内容
              switch (config.id) {
                case 'settings':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <SettingsWindow cameraController={cameraController} />,
                    defaultPosition: { x: 100, y: 100 },
                    defaultSize: { width: 500, height: 500 },
                    icon: config.icon,
                  });
                  break;

                case 'search':
                  // 搜索窗口需要 sceneManager 和 cameraController
                  if (sceneManager && cameraController) {
                    openWindow({
                      id: config.windowId,
                      title: config.label,
                      content: (
                        <SearchWindow
                          sceneManager={sceneManager}
                          cameraController={cameraController}
                        />
                      ),
                      defaultPosition: { x: 150, y: 100 },
                      defaultSize: { width: 400, height: 600 },
                      icon: config.icon,
                    });
                  } else {
                    console.warn('SceneManager 或 CameraController 尚未初始化');
                  }
                  break;

                case 'ephemeris':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <EphemerisStatusWindow lang="zh" />,
                    defaultPosition: { x: 240, y: 100 },
                    defaultSize: { width: 450, height: 600 },
                    icon: config.icon,
                  });
                  break;

                case 'mods':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <ModManagerWindow lang="zh" />,
                    defaultPosition: { x: 250, y: 100 },
                    defaultSize: { width: 800, height: 600 },
                    icon: config.icon,
                  });
                  break;

                case 'about':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <AboutWindow lang="zh" />,
                    defaultPosition: { x: 300, y: 100 },
                    defaultSize: { width: 600, height: 700 },
                    icon: config.icon,
                  });
                  break;

                default:
                  // 其他窗口使用占位内容
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-6xl mb-4">{config.icon}</div>
                          <h2 className="text-2xl font-bold mb-2">{config.label}</h2>
                          <p className="text-white/60">窗口内容将在后续阶段实现</p>
                        </div>
                      </div>
                    ),
                    defaultPosition: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
                    defaultSize: { width: 600, height: 400 },
                    icon: config.icon,
                  });
              }
            }
          },
        });
      }
    });
  }, [addItem, hasItem, openWindow, sceneManager, cameraController]);

  return null;
}
