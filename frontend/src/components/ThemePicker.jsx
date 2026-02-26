import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, Palette, X } from 'lucide-react';
import { useTheme, ACCENT_PRESETS } from '../context/ThemeContext';

/**
 * ThemePicker — A premium theme customizer panel
 * Allows switching between light/dark/black modes and accent colors
 */
const ThemePicker = () => {
  const { mode, setMode, accentColor, setAccentColor, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const modes = [
    { key: 'light', label: 'Light', icon: Sun,     desc: 'Clean & bright' },
    { key: 'dark',  label: 'Dark',  icon: Moon,    desc: 'Easy on the eyes' },
    { key: 'black', label: 'Black', icon: Monitor, desc: 'OLED friendly' },
  ];

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl transition-all duration-200
          hover:bg-slate-100 dark:hover:bg-slate-800
          text-slate-600 dark:text-slate-300"
        aria-label="Theme settings"
      >
        <Palette size={20} />
        {/* Accent dot indicator */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
          style={{ backgroundColor: ACCENT_PRESETS[accentColor]?.primary || '#3b82f6' }}
        />
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50
          bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-black/50
          border border-slate-200 dark:border-slate-700
          animate-scale-in overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <X size={16} />
            </button>
          </div>

          {/* Mode Selection */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {modes.map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center
                    ${mode === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Icon size={18} className={mode === key ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'} />
                  <span className={`text-xs font-medium ${mode === key ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Accent Color</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ACCENT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setAccentColor(key)}
                  className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200
                    ${accentColor === key
                      ? 'bg-slate-100 dark:bg-slate-700 ring-2 ring-offset-1 dark:ring-offset-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  style={accentColor === key ? { '--tw-ring-color': preset.primary } : {}}
                  title={preset.name}
                >
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full shadow-md transition-transform duration-200 group-hover:scale-110"
                      style={{ backgroundColor: preset.primary }}
                    />
                    {accentColor === key && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check size={14} className="text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate w-full text-center">
                    {preset.name.split(' ').pop()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Bar */}
          <div className="px-4 pb-4">
            <div
              className="h-2 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${ACCENT_PRESETS[accentColor]?.primary || '#3b82f6'}, ${
                  accentColor === 'blue' ? '#06b6d4' :
                  accentColor === 'purple' ? '#ec4899' :
                  accentColor === 'green' ? '#14b8a6' :
                  accentColor === 'rose' ? '#f97316' :
                  accentColor === 'amber' ? '#eab308' :
                  accentColor === 'teal' ? '#22d3ee' :
                  accentColor === 'indigo' ? '#3b82f6' :
                  '#38bdf8'
                })`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemePicker;
