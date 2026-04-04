/**
 * LanguageButton - 右上角语言切换按钮
 * 明日方舟风格设计
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSolarSystemStore } from '@/lib/state';

const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',
    dark: '#0a0a0a',
    darkLight: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textDim: '#999999',
  },
};

const LANGUAGES = [
  { code: 'zh' as const, label: '中文', shortLabel: '中' },
  { code: 'en' as const, label: 'English', shortLabel: 'EN' },
];

export default function LanguageButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const lang = useSolarSystemStore((state) => state.lang);
  const setLang = useSolarSystemStore((state) => state.setLang);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="fixed" style={{ top: '9rem', right: '2rem', zIndex: 99999 }}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 transition-all duration-200"
        style={{
          background: ARKNIGHTS_CONFIG.colors.dark,
          border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          color: ARKNIGHTS_CONFIG.colors.text,
          clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.primary;
          e.currentTarget.style.boxShadow = `0 0 15px rgba(255, 255, 255, 0.3)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
        aria-label={lang === 'zh' ? '切换语言' : 'Switch language'}
      >
        {/* 语言图标 */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wide">
          {currentLang.shortLabel}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute mt-2 overflow-hidden"
          style={{
            right: 0,
            minWidth: '120px',
            background: ARKNIGHTS_CONFIG.colors.dark,
            border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                setLang(language.code);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm transition-colors"
              style={{
                color: lang === language.code ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.textDim,
                background: lang === language.code ? ARKNIGHTS_CONFIG.colors.darkLight : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = ARKNIGHTS_CONFIG.colors.darkLight;
                e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = lang === language.code ? ARKNIGHTS_CONFIG.colors.darkLight : 'transparent';
                e.currentTarget.style.color = lang === language.code ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.textDim;
              }}
            >
              {language.label}
            </button>
          ))}
        </div>
      )}

      {/* 动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}