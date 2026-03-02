// ============================================================
// Financial Analyzer - Data Visualization Lab Page
// Feature #85: Interactive data visualization laboratory
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatedCard, StatCard, AnimatedTabs, SearchInput, Modal, Badge, DropdownMenu } from '../components/ui/ComponentLibrary';
import { EnhancedLineChart, EnhancedBarChart, EnhancedDoughnutChart, FinancialRadarChart, ScatterPlot, HeatmapChart, WaterfallChart, TreemapChart, GaugeChart, ComparisonChart } from '../components/ui/ChartComponents';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useLocalStorage } from '../hooks/useCustomHooks';
import '../styles/animations.css';

const CHART_TYPES = [
  { id: 'line', label: 'Line Chart', icon: '📈', description: 'Trends over time' },
  { id: 'bar', label: 'Bar Chart', icon: '📊', description: 'Compare categories' },
  { id: 'doughnut', label: 'Doughnut Chart', icon: '🍩', description: 'Part of whole' },
  { id: 'radar', label: 'Radar Chart', icon: '🎯', description: 'Multi-axis comparison' },
  { id: 'scatter', label: 'Scatter Plot', icon: '⭐', description: 'Correlation analysis' },
  { id: 'heatmap', label: 'Heatmap', icon: '🗺️', description: 'Density patterns' },
  { id: 'waterfall', label: 'Waterfall', icon: '🌊', description: 'Sequential changes' },
  { id: 'treemap', label: 'Treemap', icon: '🌳', description: 'Hierarchical breakdown' },
  { id: 'gauge', label: 'Gauge', icon: '🎛️', description: 'Current vs target' },
  { id: 'comparison', label: 'Comparison', icon: '⚖️', description: 'Side by side' },
];

const DATA_SOURCES = [
  { id: 'transactions', label: 'Transactions', icon: '💰' },
  { id: 'budget', label: 'Budget', icon: '📋' },
  { id: 'investments', label: 'Investments', icon: '📈' },
  { id: 'networth', label: 'Net Worth', icon: '💎' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'debts', label: 'Debts', icon: '💳' },
  { id: 'income', label: 'Income', icon: '🤑' },
  { id: 'savings', label: 'Savings', icon: '🏦' },
];

const TIME_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
];

const PRESET_VISUALIZATIONS = [
  { id: 'expense-trend', name: 'Expense Trend Analysis', chart: 'line', source: 'transactions', description: 'Monthly expense trends with moving average' },
  { id: 'income-vs-expense', name: 'Income vs Expense', chart: 'bar', source: 'transactions', description: 'Side-by-side monthly comparison' },
  { id: 'category-breakdown', name: 'Spending by Category', chart: 'doughnut', source: 'transactions', description: 'Pie chart of expense categories' },
  { id: 'financial-health', name: 'Financial Health Radar', chart: 'radar', source: 'budget', description: 'Multi-dimensional financial assessment' },
  { id: 'spending-heatmap', name: 'Spending Heatmap', chart: 'heatmap', source: 'transactions', description: 'Day/hour spending intensity' },
  { id: 'cash-flow-waterfall', name: 'Monthly Cash Flow', chart: 'waterfall', source: 'transactions', description: 'Income, expenses & savings flow' },
  { id: 'expense-treemap', name: 'Expense Treemap', chart: 'treemap', source: 'transactions', description: 'Hierarchical expense visualization' },
  { id: 'savings-gauge', name: 'Savings Rate Gauge', chart: 'gauge', source: 'savings', description: 'Current savings vs target' },
  { id: 'yoy-comparison', name: 'Year-over-Year', chart: 'comparison', source: 'transactions', description: 'This year vs last year comparison' },
  { id: 'investment-scatter', name: 'Risk vs Return', chart: 'scatter', source: 'investments', description: 'Investment risk-return analysis' },
  { id: 'networth-line', name: 'Net Worth Growth', chart: 'line', source: 'networth', description: 'Net worth trajectory over time' },
  { id: 'debt-bar', name: 'Debt Breakdown', chart: 'bar', source: 'debts', description: 'Outstanding debts by type' },
];

const COLOR_THEMES = {
  default: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140'],
  ocean: ['#0077b6', '#00b4d8', '#90e0ef', '#023e8a', '#0096c7', '#48cae4', '#ade8f4', '#caf0f8'],
  sunset: ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#ee5a24', '#f368e0'],
  earth: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc', '#1b4332'],
  neon: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b', '#06d6a0', '#ef476f', '#118ab2'],
};

export default function DataVisualizationLab() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [selectedChart, setSelectedChart] = useState(null);
  const [selectedSource, setSelectedSource] = useState('transactions');
  const [timeRange, setTimeRange] = useState('6m');
  const [colorTheme, setColorTheme] = useState('default');
  const [customCharts, setCustomCharts] = useLocalStorage('viz-lab-custom', []);
  const [showBuilder, setShowBuilder] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareCharts, setCompareCharts] = useState([]);

  // Builder state
  const [builderConfig, setBuilderConfig] = useState({
    name: '',
    chartType: 'line',
    dataSource: 'transactions',
    timeRange: '6m',
    colorTheme: 'default',
    showLegend: true,
    showGrid: true,
    animation: true,
    stacked: false,
    smooth: true,
  });

  const tabs = [
    { key: 'gallery', label: 'Gallery', icon: '🖼️' },
    { key: 'builder', label: 'Chart Builder', icon: '🔧' },
    { key: 'compare', label: 'Compare', icon: '⚖️' },
    { key: 'insights', label: 'AI Insights', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Visualization Lab</h1>
            <p className="text-gray-500 mt-1">Create, explore, and analyze your financial data visually</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time Range */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
            >
              {TIME_RANGES.map(tr => (
                <option key={tr.value} value={tr.value}>{tr.label}</option>
              ))}
            </select>

            {/* Color Theme */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-1.5">
              {Object.entries(COLOR_THEMES).map(([key, colors]) => (
                <button
                  key={key}
                  onClick={() => setColorTheme(key)}
                  title={key}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    colorTheme === key ? 'border-blue-500 scale-110' : 'border-transparent'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})` }}
                />
              ))}
            </div>

            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ➕ Create Chart
            </button>
          </div>
        </div>

        {/* Tabs */}
        <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

        {/* Tab Content */}
        {activeTab === 'gallery' && (
          <GalleryView
            presets={PRESET_VISUALIZATIONS}
            colorTheme={colorTheme}
            timeRange={timeRange}
            onSelect={setSelectedChart}
          />
        )}
        {activeTab === 'builder' && (
          <ChartBuilderView
            config={builderConfig}
            setConfig={setBuilderConfig}
            colorTheme={colorTheme}
            onSave={(chart) => setCustomCharts(prev => [...prev, chart])}
          />
        )}
        {activeTab === 'compare' && (
          <CompareView
            presets={PRESET_VISUALIZATIONS}
            colorTheme={colorTheme}
            timeRange={timeRange}
          />
        )}
        {activeTab === 'insights' && (
          <AIInsightsView colorTheme={colorTheme} />
        )}
      </div>
    </div>
  );
}

// ======================== GALLERY VIEW ========================
function GalleryView({ presets, colorTheme, timeRange, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = presets.filter(p => {
    if (filterType !== 'all' && p.chart !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            All Charts
          </button>
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => setFilterType(ct.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                filterType === ct.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {ct.icon} {ct.label}
            </button>
          ))}
        </div>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search charts..." className="w-56" />
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((preset, i) => (
          <PresetChartCard
            key={preset.id}
            preset={preset}
            colorTheme={colorTheme}
            delay={i * 100}
            onClick={() => onSelect(preset)}
          />
        ))}
      </div>
    </div>
  );
}

function PresetChartCard({ preset, colorTheme, delay, onClick }) {
  const colors = COLOR_THEMES[colorTheme] || COLOR_THEMES.default;
  const chartInfo = CHART_TYPES.find(ct => ct.id === preset.chart);

  const renderMiniChart = () => {
    const mockData = [30, 45, 28, 55, 40, 65, 50, 70, 60, 80, 55, 75];
    const mockLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (preset.chart) {
      case 'line':
        return <EnhancedLineChart data={mockData} labels={mockLabels} height={180} currency />;
      case 'bar':
        return <EnhancedBarChart data={mockData} labels={mockLabels} height={180} currency />;
      case 'doughnut':
        return <EnhancedDoughnutChart data={[35, 25, 20, 12, 8]} labels={['Food', 'Transport', 'Shopping', 'Bills', 'Others']} height={180} cutout="60%" />;
      case 'radar':
        return <FinancialRadarChart data={[80, 70, 90, 60, 75, 85]} labels={['Savings', 'Income', 'Budgeting', 'Investment', 'Debt', 'Goals']} height={180} />;
      case 'gauge':
        return <GaugeChart value={72} max={100} height={180} label="Score" />;
      case 'heatmap':
        return <HeatmapChart height={180} />;
      case 'waterfall':
        return <WaterfallChart data={[85000, -32000, -15000, -2500, -10000, -5000, 20500]} labels={['Salary', 'Housing', 'Transport', 'Utilities', 'Food', 'Others', 'Savings']} height={180} />;
      case 'treemap':
        return <TreemapChart height={180} />;
      case 'comparison':
        return <ComparisonChart currentData={[45, 52, 38, 60, 48]} previousData={[40, 45, 42, 55, 50]} labels={['Food', 'Transport', 'Shopping', 'Bills', 'Fun']} height={180} currency />;
      case 'scatter':
        return <ScatterPlot height={180} />;
      default:
        return <EnhancedLineChart data={mockData} labels={mockLabels} height={180} />;
    }
  };

  return (
    <AnimatedCard
      className="cursor-pointer group hover:shadow-lg transition-all duration-300"
      delay={delay}
      onClick={onClick}
    >
      {/* Chart Preview */}
      <div className="relative mb-4 overflow-hidden rounded-lg">
        {renderMiniChart()}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">Click to expand</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{chartInfo?.icon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{preset.name}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
        </div>
        <Badge variant="info" size="xs">{preset.chart}</Badge>
      </div>
    </AnimatedCard>
  );
}

// ======================== CHART BUILDER VIEW ========================
function ChartBuilderView({ config, setConfig, colorTheme, onSave }) {
  const renderBuilderChart = () => {
    const mockData = [30, 45, 28, 55, 40, 65, 50, 70, 60, 80, 55, 75];
    const mockLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (config.chartType) {
      case 'line':
        return <EnhancedLineChart data={mockData} labels={mockLabels} height={350} currency />;
      case 'bar':
        return <EnhancedBarChart data={mockData} labels={mockLabels} height={350} currency />;
      case 'doughnut':
        return <EnhancedDoughnutChart data={[35, 25, 20, 12, 8]} labels={['Food', 'Transport', 'Shopping', 'Bills', 'Others']} height={350} cutout="60%" centerLabel="Total" centerValue="₹1.2L" />;
      case 'radar':
        return <FinancialRadarChart data={[80, 70, 90, 60, 75, 85]} labels={['Savings', 'Income', 'Budgeting', 'Investment', 'Debt', 'Goals']} height={350} />;
      case 'gauge':
        return <GaugeChart value={72} max={100} height={350} label="Score" />;
      case 'heatmap':
        return <HeatmapChart height={350} />;
      case 'waterfall':
        return <WaterfallChart data={[85000, -32000, -15000, -2500, -10000, -5000, 20500]} labels={['Salary', 'Housing', 'Transport', 'Utilities', 'Food', 'Others', 'Savings']} height={350} />;
      case 'treemap':
        return <TreemapChart height={350} />;
      case 'comparison':
        return <ComparisonChart currentData={[45, 52, 38, 60, 48]} previousData={[40, 45, 42, 55, 50]} labels={['Food', 'Transport', 'Shopping', 'Bills', 'Fun']} height={350} currency />;
      case 'scatter':
        return <ScatterPlot height={350} />;
      default:
        return <EnhancedLineChart data={mockData} labels={mockLabels} height={350} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Config Panel */}
      <AnimatedCard className="lg:col-span-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chart Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chart Name</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig(p => ({ ...p, name: e.target.value }))}
              placeholder="My Custom Chart"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chart Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setConfig(p => ({ ...p, chartType: ct.id }))}
                  className={`p-2 rounded-lg text-xs text-center transition-all ${
                    config.chartType === ct.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-base">{ct.icon}</div>
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Source</label>
            <select
              value={config.dataSource}
              onChange={(e) => setConfig(p => ({ ...p, dataSource: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              {DATA_SOURCES.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.icon} {ds.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
            <select
              value={config.timeRange}
              onChange={(e) => setConfig(p => ({ ...p, timeRange: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              {TIME_RANGES.map(tr => (
                <option key={tr.value} value={tr.value}>{tr.label}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Options</h4>
            {[
              { key: 'showLegend', label: 'Show Legend' },
              { key: 'showGrid', label: 'Show Grid' },
              { key: 'animation', label: 'Animation' },
              { key: 'stacked', label: 'Stacked' },
              { key: 'smooth', label: 'Smooth Line' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-gray-400">{opt.label}</span>
                <div
                  onClick={() => setConfig(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    config[opt.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                    config[opt.key] ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={() => onSave({ ...config, id: Date.now().toString() })}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            💾 Save Chart
          </button>
        </div>
      </AnimatedCard>

      {/* Chart Preview */}
      <AnimatedCard className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {config.name || 'Chart Preview'}
          </h3>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">📥 Export PNG</button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">📊 Export CSV</button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">🔗 Share</button>
          </div>
        </div>
        {renderBuilderChart()}
      </AnimatedCard>
    </div>
  );
}

// ======================== COMPARE VIEW ========================
function CompareView({ presets, colorTheme, timeRange }) {
  const [leftChart, setLeftChart] = useState(presets[0]?.id || '');
  const [rightChart, setRightChart] = useState(presets[1]?.id || '');

  const leftPreset = presets.find(p => p.id === leftChart);
  const rightPreset = presets.find(p => p.id === rightChart);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4 mb-4">
        <select
          value={leftChart}
          onChange={(e) => setLeftChart(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-xl text-sm"
        >
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="text-2xl">⚖️</span>
        <select
          value={rightChart}
          onChange={(e) => setRightChart(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-xl text-sm"
        >
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {leftPreset && (
          <AnimatedCard>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{leftPreset.name}</h3>
            <CompareChartRenderer preset={leftPreset} />
          </AnimatedCard>
        )}
        {rightPreset && (
          <AnimatedCard>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{rightPreset.name}</h3>
            <CompareChartRenderer preset={rightPreset} />
          </AnimatedCard>
        )}
      </div>

      {/* Comparison Insights - computed when user selects charts to compare */}
      <AnimatedCard className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📊 Comparison Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Correlation</div>
            <div className="text-2xl font-bold text-blue-600">{leftPreset && rightPreset ? '—' : 'N/A'}</div>
            <div className="text-xs text-gray-400">{leftPreset && rightPreset ? 'Select data to analyze' : 'Select two charts'}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Variance</div>
            <div className="text-2xl font-bold text-purple-600">{leftPreset && rightPreset ? '—' : 'N/A'}</div>
            <div className="text-xs text-gray-400">{leftPreset && rightPreset ? 'Requires real data' : 'Select two charts'}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Trend Match</div>
            <div className="text-2xl font-bold text-green-600">{leftPreset && rightPreset ? '—' : 'N/A'}</div>
            <div className="text-xs text-gray-400">{leftPreset && rightPreset ? 'Requires real data' : 'Select two charts'}</div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}

function CompareChartRenderer({ preset }) {
  const mockData = [30, 45, 28, 55, 40, 65, 50, 70, 60, 80, 55, 75];
  const mockLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (preset.chart) {
    case 'line':
      return <EnhancedLineChart data={mockData} labels={mockLabels} height={250} currency />;
    case 'bar':
      return <EnhancedBarChart data={mockData} labels={mockLabels} height={250} currency />;
    case 'doughnut':
      return <EnhancedDoughnutChart data={[35, 25, 20, 12, 8]} labels={['A', 'B', 'C', 'D', 'E']} height={250} cutout="60%" />;
    case 'radar':
      return <FinancialRadarChart data={[80, 70, 90, 60, 75, 85]} labels={['A', 'B', 'C', 'D', 'E', 'F']} height={250} />;
    case 'gauge':
      return <GaugeChart value={72} max={100} height={250} label="Score" />;
    case 'waterfall':
      return <WaterfallChart data={[85, -32, -15, -2.5, -10, -5, 20.5]} labels={['In', 'A', 'B', 'C', 'D', 'E', 'Out']} height={250} />;
    default:
      return <EnhancedLineChart data={mockData} labels={mockLabels} height={250} />;
  }
}

// ======================== AI INSIGHTS VIEW ========================
function AIInsightsView({ colorTheme }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real AI insights from backend
    const fetchInsights = async () => {
      try {
        const { default: api } = await import('../services/api');
        const res = await api.get('/insights');
        if (res.data && Array.isArray(res.data.insights)) {
          setInsights(res.data.insights);
        }
      } catch (err) {
        // No insights available - show empty state
        console.log('AI insights not available:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="space-y-6">
        <AnimatedCard className="text-center py-12">
          <span className="text-4xl mb-4 block">🤖</span>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No AI Insights Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Add transactions and financial data to get personalized AI-powered insights about your spending patterns, savings opportunities, and financial health.</p>
        </AnimatedCard>
      </div>
    );
  }

  const savingsFound = insights.filter(i => i.type === 'opportunity').reduce((sum, i) => sum + (i.savingsAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Insights Generated" value={insights.length} color="#3B82F6" icon="🤖" />
        <StatCard title="Anomalies Found" value={insights.filter(i => i.type === 'anomaly').length} color="#F59E0B" icon="⚠️" />
        <StatCard title="Savings Found" value={savingsFound} format="currency" color="#10B981" icon="💰" />
      </div>

      {insights.map((insight, i) => (
        <AnimatedCard
          key={insight.id}
          className={`border-l-4 ${
            insight.severity === 'warning' ? 'border-l-yellow-500' :
            insight.severity === 'success' ? 'border-l-green-500' :
            'border-l-blue-500'
          }`}
          delay={i * 100}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Insight Text */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{insight.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h3>
                  <Badge
                    variant={insight.severity === 'warning' ? 'warning' : insight.severity === 'success' ? 'success' : 'info'}
                    size="xs"
                  >
                    {insight.type}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">💡 Recommendation</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{insight.recommendation}</p>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="flex items-center">
              {insight.chart === 'line' && insight.data && (
                <EnhancedLineChart data={insight.data} labels={insight.labels} height={150} />
              )}
              {insight.chart === 'bar' && insight.data && (
                <EnhancedBarChart data={insight.data} labels={insight.labels} height={150} />
              )}
              {insight.chart === 'doughnut' && insight.data && (
                <EnhancedDoughnutChart data={insight.data} labels={insight.labels} height={150} cutout="60%" />
              )}
              {insight.chart === 'gauge' && (
                <GaugeChart value={70} max={100} height={150} label="4.2/6 mo" />
              )}
              {insight.chart === 'waterfall' && insight.data && (
                <WaterfallChart data={insight.data} labels={insight.labels} height={150} />
              )}
            </div>
          </div>
        </AnimatedCard>
      ))}
    </div>
  );
}
