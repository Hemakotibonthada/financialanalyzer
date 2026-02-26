import React, { useEffect } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { mode, toggleTheme } = useTheme();

  // Listen for keyboard shortcut event
  useEffect(() => {
    const handler = () => toggleTheme();
    window.addEventListener('toggleTheme', handler);
    return () => window.removeEventListener('toggleTheme', handler);
  }, [toggleTheme]);

  const getIcon = () => {
    if (mode === 'light') return <Sun size={18} />;
    if (mode === 'dark') return <Moon size={18} />;
    return <Sparkles size={18} />;
  };

  const getNext = () => {
    if (mode === 'light') return 'Dark';
    if (mode === 'dark') return 'Black';
    return 'Light';
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl transition-all duration-200
        hover:bg-slate-100 dark:hover:bg-slate-800
        text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95"
      title={`Switch to ${getNext()} (Ctrl+Shift+L)`}
      aria-label="Toggle theme"
    >
      {getIcon()}
    </button>
  );
};

export default ThemeToggle;
