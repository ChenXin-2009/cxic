/**
 * LanguageSwitcher - 语言切换组件
 * 提供中英文切换功能
 */

'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useSolarSystemStore } from '@/lib/state';

interface LanguageSwitcherProps {
  /** 样式变体：'button' 为按钮样式，'text' 为纯文本样式 */
  variant?: 'button' | 'text';
  /** 是否显示完整名称（中文/English），否则显示缩写（中/EN） */
  showFullName?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 语言切换组件
 * 
 * 支持两种样式：
 * - button: 按钮样式，适合放在工具栏
 * - text: 纯文本样式，适合放在菜单中
 */
export default function LanguageSwitcher({
  variant = 'button',
  showFullName = false,
  className = '',
}: LanguageSwitcherProps) {
  const { lang } = useTranslation();
  const setLang = useSolarSystemStore((state) => state.setLang);

  const toggleLanguage = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  if (variant === 'text') {
    return (
      <button
        onClick={toggleLanguage}
        className={`text-sm transition-colors ${className}`}
        style={{ color: 'inherit' }}
      >
        {lang === 'zh' 
          ? (showFullName ? 'English' : 'EN')
          : (showFullName ? '中文' : '中')
        }
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wide transition-all duration-200 ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }}
    >
      <span style={{ opacity: lang === 'zh' ? 1 : 0.5 }}>中</span>
      <span style={{ opacity: 0.3 }}>/</span>
      <span style={{ opacity: lang === 'en' ? 1 : 0.5 }}>EN</span>
    </button>
  );
}