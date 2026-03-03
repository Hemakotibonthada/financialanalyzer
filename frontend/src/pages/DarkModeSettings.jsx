import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette, Sun, Moon, Monitor, Droplets, Type, LayoutGrid, GripVertical,
  RotateCcw, Save, Check, Eye, ChevronDown, Minus, Plus, X,
  RefreshCw, Sparkles, Maximize2, Minimize2, Settings, Sliders
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const ACCENT_PRESETS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
];

const FONT_SIZES = [
  { label: 'Small', value: 14 },
  { label: 'Default', value: 16 },
  { label: 'Large', value: 18 },
  { label: 'X-Large', value: 20 },
];

const DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact', desc: 'More content, less spacing', padding: 'p-3', gap: 'gap-2' },
  { id: 'comfortable', label: 'Comfortable', desc: 'Balanced layout', padding: 'p-5', gap: 'gap-4' },
  { id: 'spacious', label: 'Spacious', desc: 'More breathing room', padding: 'p-8', gap: 'gap-6' },
];

const DEFAULT_WIDGETS = [
  { id: 'balance', name: 'Account Balance', enabled: true, order: 0, size: 'sm' },
  { id: 'spending', name: 'Spending Chart', enabled: true, order: 1, size: 'lg' },
  { id: 'goals', name: 'Savings Goals', enabled: true, order: 2, size: 'sm' },
  { id: 'transactions', name: 'Recent Transactions', enabled: true, order: 3, size: 'md' },
  { id: 'budget', name: 'Budget Overview', enabled: true, order: 4, size: 'md' },
  { id: 'credit', name: 'Credit Score', enabled: false, order: 5, size: 'sm' },
  { id: 'investments', name: 'Investments', enabled: false, order: 6, size: 'md' },
  { id: 'bills', name: 'Upcoming Bills', enabled: true, order: 7, size: 'sm' },
];

const PREVIEW_DATA = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 3500 },
];

const PREVIEW_PIE = [
  { name: 'Food', value: 35 },
  { name: 'Transport', value: 20 },
  { name: 'Shopping', value: 25 },
  { name: 'Bills', value: 20 },
];

export default function DarkModeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState('system');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [fontSize, setFontSize] = useState(16);
  const [density, setDensity] = useState('comfortable');
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [activeSection, setActiveSection] = useState('theme');
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { setHasChanges(true); }, [theme, accentColor, fontSize, density, widgets]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setHasChanges(false);
  };

  const resetDefaults = () => {
    setTheme('system');
    setAccentColor('#3b82f6');
    setFontSize(16);
    setDensity('comfortable');
    setWidgets(DEFAULT_WIDGETS);
  };

  const toggleWidget = (id) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const moveWidget = (id, direction) => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if ((direction === -1 && idx === 0) || (direction === 1 && idx === prev.length - 1)) return prev;
      const newWidgets = [...prev];
      [newWidgets[idx], newWidgets[idx + direction]] = [newWidgets[idx + direction], newWidgets[idx]];
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
  };

  const sections = [
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'colors', label: 'Colors', icon: Droplets },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'layout', label: 'Layout', icon: LayoutGrid },
    { id: 'widgets', label: 'Widgets', icon: GripVertical },
  ];

  const themePreviewBg = theme === 'dark' ? 'bg-slate-900' : theme === 'light' ? 'bg-white' : 'bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-800';
  const themePreviewText = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const densityConfig = DENSITY_OPTIONS.find(d => d.id === density);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Dark Mode Settings">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Palette className="w-8 h-8 text-blue-500" /> Appearance & Theme
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Customize how your dashboard looks and feels</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetDefaults} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={handleSave} disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Nav */}
            <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 overflow-x-auto">
              {sections.map(sec => {
                const Icon = sec.icon;
                return (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeSection === sec.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <Icon className="w-4 h-4" /> {sec.label}
                  </button>
                );
              })}
            </div>

            {/* Theme Section */}
            {activeSection === 'theme' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Theme Mode</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, desc: 'Bright and clean' },
                    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
                    { id: 'system', label: 'System', icon: Monitor, desc: 'Follows OS setting' },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button key={opt.id} onClick={() => setTheme(opt.id)}
                        className={`p-5 rounded-2xl border-2 text-center transition-all ${theme === opt.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                        <Icon className={`w-8 h-8 mx-auto mb-2 ${theme === opt.id ? 'text-blue-500' : 'text-slate-400'}`} />
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{opt.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</p>
                        {theme === opt.id && <Check className="w-5 h-5 text-blue-500 mx-auto mt-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Colors Section */}
            {activeSection === 'colors' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Accent Color</h2>
                <div className="grid grid-cols-6 gap-3 mb-6">
                  {ACCENT_PRESETS.map(preset => (
                    <button key={preset.value} onClick={() => setAccentColor(preset.value)}
                      className={`relative w-full aspect-square rounded-xl transition-transform hover:scale-110 ${accentColor === preset.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800' : ''}`}
                      style={{ backgroundColor: preset.value, ringColor: preset.value }}>
                      {accentColor === preset.value && <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">Custom:</label>
                  <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); setAccentColor(e.target.value); }} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                  <input value={customColor} onChange={e => { setCustomColor(e.target.value); setAccentColor(e.target.value); }} className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white w-28 font-mono" />
                </div>
              </div>
            )}

            {/* Typography Section */}
            {activeSection === 'typography' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Font Size</h2>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {FONT_SIZES.map(fs => (
                    <button key={fs.value} onClick={() => setFontSize(fs.value)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${fontSize === fs.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                      <span className="font-semibold text-slate-900 dark:text-white" style={{ fontSize: fs.value }}>{fs.label}</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fs.value}px</p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <button onClick={() => setFontSize(prev => Math.max(12, prev - 1))} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600">
                    <Minus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <input type="range" min="12" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 accent-blue-600" />
                  <button onClick={() => setFontSize(prev => Math.min(24, prev + 1))} className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600">
                    <Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <span className="text-sm font-mono text-slate-600 dark:text-slate-300 w-12 text-center">{fontSize}px</span>
                </div>
              </div>
            )}

            {/* Layout Section */}
            {activeSection === 'layout' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Layout Density</h2>
                <div className="grid grid-cols-3 gap-4">
                  {DENSITY_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setDensity(opt.id)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${density === opt.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                      <div className={`flex flex-col ${opt.gap} mb-3`}>
                        {[1, 2, 3].map(i => <div key={i} className={`${opt.padding} bg-slate-200 dark:bg-slate-600 rounded-lg h-2`} />)}
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{opt.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</p>
                      {density === opt.id && <Check className="w-5 h-5 text-blue-500 mt-2" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Font Family Section - additional if typography is active */}
            {activeSection === 'typography' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Text Preview</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Heading', text: 'Financial Dashboard Overview', weight: 'font-bold', sizeAdd: 8 },
                    { label: 'Subheading', text: 'Your monthly spending breakdown', weight: 'font-semibold', sizeAdd: 2 },
                    { label: 'Body', text: 'Track your expenses, manage budgets, and reach your financial goals with our comprehensive dashboard tools.', weight: 'font-normal', sizeAdd: 0 },
                    { label: 'Caption', text: 'Last updated: February 26, 2026', weight: 'font-normal', sizeAdd: -2 },
                  ].map((sample, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">{sample.label}</span>
                      <p className={`${sample.weight} text-slate-900 dark:text-white mt-1`} style={{ fontSize: `${fontSize + sample.sizeAdd}px` }}>{sample.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Widgets Section */}
            {activeSection === 'widgets' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Dashboard Widgets</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Toggle and reorder your dashboard widgets</p>
                <div className="space-y-2">
                  {widgets.sort((a, b) => a.order - b.order).map(widget => (
                    <div key={widget.id} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${widget.enabled ? 'bg-slate-50 dark:bg-slate-700/50' : 'bg-slate-50/50 dark:bg-slate-700/20 opacity-60'}`}>
                      <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{widget.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Size: {widget.size}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => moveWidget(widget.id, -1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Move Up">▲</button>
                        <button onClick={() => moveWidget(widget.id, 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Move Down">▼</button>
                        <button onClick={() => toggleWidget(widget.id)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${widget.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${widget.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${themePreviewBg}`}>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Live Preview</span>
                </div>
              </div>
              <div className={`${densityConfig?.padding || 'p-5'} ${densityConfig?.gap || 'gap-4'} flex flex-col`} style={{ fontSize: `${fontSize}px` }}>
                {/* Preview Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-bold ${themePreviewText}`} style={{ fontSize: `${fontSize + 4}px` }}>Dashboard</p>
                    <p className="text-xs text-slate-500">February 2026</p>
                  </div>
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
                </div>
                {/* Preview Cards */}
                <div className={`grid grid-cols-2 ${densityConfig?.gap || 'gap-4'}`}>
                  {['Balance', 'Spent', 'Saved', 'Bills'].map((label, i) => (
                    <div key={i} className={`${densityConfig?.padding || 'p-3'} rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className={`font-bold ${themePreviewText}`} style={{ color: i === 0 ? accentColor : undefined }}>₹{(Math.random() * 50000).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
                {/* Preview Chart */}
                <div className={`${densityConfig?.padding || 'p-3'} rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={PREVIEW_DATA}>
                      <Bar dataKey="value" fill={accentColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={`${densityConfig?.padding || 'p-3'} rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie data={PREVIEW_PIE} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value" strokeWidth={0}>
                        {PREVIEW_PIE.map((_, i) => <Cell key={i} fill={i === 0 ? accentColor : `${accentColor}${['', 'aa', '77', '44'][i]}`} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Preview Button */}
                <button className="w-full py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: accentColor }}>
                  Sample Button
                </button>
              </div>
            </div>
            {/* Current Settings Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Current Settings
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  ['Theme', theme],
                  ['Accent', accentColor],
                  ['Font Size', `${fontSize}px`],
                  ['Density', density],
                  ['Active Widgets', `${widgets.filter(w => w.enabled).length}/${widgets.length}`],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="text-slate-900 dark:text-white font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
