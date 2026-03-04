// ============================================================
// Financial Analyzer - Export Center Page
// Feature #87: Comprehensive data export & report generation
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { AnimatedCard, StatCard, Badge, Modal, AnimatedTabs, ProgressRing } from '../components/ui/ComponentLibrary';
import { formatCurrency, formatDate } from '../utils/helpers';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import '../styles/animations.css';

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF', icon: '📄', description: 'Print-ready reports', color: '#EF4444' },
  { id: 'excel', label: 'Excel', icon: '📊', description: 'Spreadsheet with charts', color: '#10B981' },
  { id: 'csv', label: 'CSV', icon: '📋', description: 'Raw data export', color: '#3B82F6' },
  { id: 'json', label: 'JSON', icon: '🔗', description: 'API-compatible format', color: '#F59E0B' },
  { id: 'image', label: 'Image', icon: '🖼️', description: 'Chart screenshots', color: '#8B5CF6' },
];

const REPORT_TEMPLATES = [
  {
    id: 'monthly-summary',
    name: 'Monthly Financial Summary',
    description: 'Complete overview of income, expenses, savings, and investments for a month',
    icon: '📅',
    sections: ['income', 'expenses', 'savings', 'investments', 'net-worth'],
    estimatedPages: 8,
    category: 'summary',
    popular: true,
  },
  {
    id: 'tax-report',
    name: 'Tax Summary Report',
    description: 'Annual tax summary with deductions, exemptions, and tax-saving investments',
    icon: '🏛️',
    sections: ['income-sources', 'deductions', 'exemptions', 'investments-80c', 'tax-liability'],
    estimatedPages: 12,
    category: 'tax',
    popular: true,
  },
  {
    id: 'expense-analysis',
    name: 'Expense Analysis Report',
    description: 'Detailed breakdown of spending patterns, trends, and optimization suggestions',
    icon: '💸',
    sections: ['category-breakdown', 'trends', 'top-merchants', 'comparisons', 'recommendations'],
    estimatedPages: 10,
    category: 'analysis',
    popular: true,
  },
  {
    id: 'investment-portfolio',
    name: 'Investment Portfolio Report',
    description: 'Portfolio performance, asset allocation, and risk analysis',
    icon: '📈',
    sections: ['holdings', 'performance', 'allocation', 'risk-metrics', 'benchmarks'],
    estimatedPages: 15,
    category: 'investment',
    popular: false,
  },
  {
    id: 'budget-performance',
    name: 'Budget Performance Report',
    description: 'How well you adhered to your budget with variance analysis',
    icon: '🎯',
    sections: ['budget-vs-actual', 'variance', 'category-adherence', 'recommendations'],
    estimatedPages: 6,
    category: 'budget',
    popular: false,
  },
  {
    id: 'debt-status',
    name: 'Debt Status Report',
    description: 'Overview of all debts, EMIs, and payoff timelines',
    icon: '💳',
    sections: ['debt-summary', 'emi-schedule', 'payoff-timeline', 'interest-analysis'],
    estimatedPages: 8,
    category: 'debt',
    popular: false,
  },
  {
    id: 'networth-statement',
    name: 'Net Worth Statement',
    description: 'Assets vs liabilities breakdown with historical trend',
    icon: '💎',
    sections: ['assets', 'liabilities', 'net-worth', 'trend-analysis'],
    estimatedPages: 5,
    category: 'summary',
    popular: true,
  },
  {
    id: 'goal-progress',
    name: 'Goal Progress Report',
    description: 'Status of all financial goals with projections',
    icon: '🏆',
    sections: ['active-goals', 'progress', 'projections', 'recommendations'],
    estimatedPages: 7,
    category: 'goals',
    popular: false,
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Detailed cash flow analysis with waterfall visualization',
    icon: '🌊',
    sections: ['operating', 'investing', 'financing', 'net-flow', 'projections'],
    estimatedPages: 6,
    category: 'analysis',
    popular: false,
  },
  {
    id: 'annual-review',
    name: 'Annual Financial Review',
    description: 'Comprehensive year-end financial health assessment',
    icon: '📝',
    sections: ['summary', 'income-analysis', 'expense-analysis', 'savings-rate', 'investments', 'goals', 'net-worth', 'recommendations'],
    estimatedPages: 25,
    category: 'summary',
    popular: true,
  },
];

const DATA_CATEGORIES = [
  { id: 'transactions', label: 'Transactions', icon: '💰' },
  { id: 'budgets', label: 'Budgets', icon: '📋' },
  { id: 'investments', label: 'Investments', icon: '📈' },
  { id: 'bills', label: 'Bills & EMIs', icon: '🏦' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '🔄' },
  { id: 'debts', label: 'Debts', icon: '💳' },
  { id: 'documents', label: 'Documents', icon: '📎' },
];

export default function ExportCenter() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [quickExporting, setQuickExporting] = useState(false);

  // Load export history from localStorage
  const [exportHistory, setExportHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('fa_export_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist export history
  useEffect(() => {
    localStorage.setItem('fa_export_history', JSON.stringify(exportHistory));
  }, [exportHistory]);

  // Quick Export state
  const [quickExportConfig, setQuickExportConfig] = useState({
    dataCategories: ['transactions'],
    format: 'csv',
    dateRange: 'last-month',
    includeCharts: false,
  });

  // Generate report via API
  const generateReport = async (template, format) => {
    setGenerating(true);
    setExportError(null);

    try {
      const response = await api.post('/financial-reports/generate', {
        templateId: template.id,
        format,
      });

      const result = response.data;
      const newEntry = {
        id: Date.now(),
        name: template.name,
        format,
        date: new Date().toISOString().split('T')[0],
        size: result.fileSize || result.size || 'Unknown',
        status: 'completed',
        downloadUrl: result.downloadUrl || null,
      };

      setExportHistory(prev => [newEntry, ...prev]);

      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Export failed';
      setExportError(errorMsg);

      setExportHistory(prev => [{
        id: Date.now(),
        name: template.name,
        format,
        date: new Date().toISOString().split('T')[0],
        size: 'N/A',
        status: 'failed',
      }, ...prev]);
    } finally {
      setGenerating(false);
      setShowGenerateModal(false);
    }
  };

  // Quick export via API
  const handleQuickExport = async () => {
    setQuickExporting(true);
    setExportError(null);

    try {
      const response = await api.post('/financial-reports/generate', {
        templateId: 'quick-export',
        format: quickExportConfig.format,
        dateRange: quickExportConfig.dateRange,
        filters: {
          categories: quickExportConfig.dataCategories,
          includeCharts: quickExportConfig.includeCharts,
        },
      });

      const result = response.data;
      const newEntry = {
        id: Date.now(),
        name: `Quick Export - ${quickExportConfig.dataCategories.join(', ')}`,
        format: quickExportConfig.format,
        date: new Date().toISOString().split('T')[0],
        size: result.fileSize || result.size || 'Unknown',
        status: 'completed',
        downloadUrl: result.downloadUrl || null,
      };

      setExportHistory(prev => [newEntry, ...prev]);

      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Quick export failed:', error);
      setExportError(error.response?.data?.error || error.message || 'Export failed');

      setExportHistory(prev => [{
        id: Date.now(),
        name: `Quick Export - ${quickExportConfig.dataCategories.join(', ')}`,
        format: quickExportConfig.format,
        date: new Date().toISOString().split('T')[0],
        size: 'N/A',
        status: 'failed',
      }, ...prev]);
    } finally {
      setQuickExporting(false);
    }
  };

  const tabs = [
    { key: 'reports', label: 'Report Templates', icon: '📄' },
    { key: 'quick-export', label: 'Quick Export', icon: '⚡' },
    { key: 'scheduled', label: 'Scheduled', icon: '📅' },
    { key: 'history', label: 'Export History', icon: '📚' },
  ];

  return (
    <MainLayout title="Export Center" subtitle="Generate reports & export data">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="animate-fade-in-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 md:p-8 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNEgyNHYtMmgxMnYyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <span className="text-3xl">📥</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Export Center</h1>
                <p className="text-amber-100 mt-1">Generate reports, export data & share insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {exportError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">⚠️ {exportError}</p>
            <button onClick={() => setExportError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Exports" value={exportHistory.length} color="#3B82F6" icon="📊" delay={0} />
          <StatCard title="Reports Generated" value={exportHistory.filter(e => e.format === 'pdf').length} color="#EF4444" icon="📄" delay={100} />
          <StatCard title="Completed" value={exportHistory.filter(e => e.status === 'completed').length} color="#10B981" icon="✅" delay={200} />
          <StatCard title="Available Templates" value={REPORT_TEMPLATES.length} color="#8B5CF6" icon="📋" delay={300} />
        </div>

        {/* Tabs */}
        <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

        {/* Tab Content */}
        {activeTab === 'reports' && (
          <ReportTemplatesView
            templates={REPORT_TEMPLATES}
            onSelect={(template) => { setSelectedTemplate(template); setShowGenerateModal(true); setExportError(null); }}
          />
        )}

        {activeTab === 'quick-export' && (
          <QuickExportView
            config={quickExportConfig}
            setConfig={setQuickExportConfig}
            onExport={handleQuickExport}
            exporting={quickExporting}
          />
        )}

        {activeTab === 'scheduled' && <ScheduledExportsView />}

        {activeTab === 'history' && (
          <ExportHistoryView history={exportHistory} />
        )}
      </div>

      {/* Generate Report Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={showGenerateModal}
          onClose={() => { if (!generating) { setShowGenerateModal(false); setSelectedTemplate(null); } }}
          title="Generate Report"
          size="md"
        >
          {generating ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <h3 className="font-semibold text-gray-900 dark:text-white mt-4">Generating Report...</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Preparing your {selectedTemplate.name}. This may take a moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <span className="text-4xl block mb-2">{selectedTemplate.icon}</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedTemplate.description}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sections Included:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.sections.map(section => (
                    <Badge key={section} variant="info" size="xs">{section.replace(/-/g, ' ')}</Badge>
                  ))}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">~{selectedTemplate.estimatedPages} pages</div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Format:</h4>
                <div className="grid grid-cols-5 gap-2">
                  {EXPORT_FORMATS.map(format => (
                    <button
                      key={format.id}
                      onClick={() => generateReport(selectedTemplate, format.id)}
                      className="p-3 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 group"
                    >
                      <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">{format.icon}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </MainLayout>
  );
}

// ======================== REPORT TEMPLATES VIEW ========================
function ReportTemplatesView({ templates, onSelect }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const categories = [...new Set(templates.map(t => t.category))];

  const filtered = filterCategory === 'all' ? templates : templates.filter(t => t.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
          All
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterCategory === cat ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Popular Templates */}
      {filterCategory === 'all' && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">⭐ Popular Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.popular).map((template, i) => (
              <AnimatedCard
                key={template.id}
                delay={i * 100}
                className="cursor-pointer hover:shadow-lg transition-all group"
                onClick={() => onSelect(template)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl group-hover:scale-110 transition-transform">{template.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{template.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{template.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="info" size="xs">{template.estimatedPages} pages</Badge>
                      <Badge variant="default" size="xs" className="capitalize">{template.category}</Badge>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{filterCategory === 'all' ? 'All Templates' : `${filterCategory} Templates`}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template, i) => (
            <AnimatedCard
              key={template.id}
              delay={i * 80}
              className="cursor-pointer hover:shadow-lg transition-all group"
              onClick={() => onSelect(template)}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">{template.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{template.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="info" size="xs">{template.estimatedPages} pages</Badge>
                    {template.popular && <Badge variant="warning" size="xs">Popular</Badge>}
                  </div>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======================== QUICK EXPORT VIEW ========================
function QuickExportView({ config, setConfig, onExport, exporting }) {
  const toggleCategory = (catId) => {
    setConfig(prev => ({
      ...prev,
      dataCategories: prev.dataCategories.includes(catId)
        ? prev.dataCategories.filter(c => c !== catId)
        : [...prev.dataCategories, catId],
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Step 1: Select Data */}
        <AnimatedCard>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">1️⃣ Select Data to Export</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DATA_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`p-4 rounded-xl text-center transition-all ${
                  config.dataCategories.includes(cat.id)
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-2xl block mb-1">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white block">{cat.label}</span>
              </button>
            ))}
          </div>
        </AnimatedCard>

        {/* Step 2: Configure */}
        <AnimatedCard delay={100}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">2️⃣ Configure Export</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
              <select
                value={config.dateRange}
                onChange={(e) => setConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
              >
                <option value="last-week">Last Week</option>
                <option value="last-month">Last Month</option>
                <option value="last-quarter">Last Quarter</option>
                <option value="last-6-months">Last 6 Months</option>
                <option value="last-year">Last Year</option>
                <option value="ytd">Year to Date</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
              <div className="flex gap-2">
                {EXPORT_FORMATS.map(format => (
                  <button
                    key={format.id}
                    onClick={() => setConfig(prev => ({ ...prev, format: format.id }))}
                    className={`flex-1 p-2 rounded-lg text-center text-xs transition-all ${
                      config.format === format.id
                        ? 'text-white'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                    style={config.format === format.id ? { backgroundColor: format.color } : {}}
                  >
                    <span className="text-lg block">{format.icon}</span>
                    {format.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeCharts}
              onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include charts and visualizations</span>
          </label>
        </AnimatedCard>

        {/* Step 3: Export */}
        <AnimatedCard delay={200}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">3️⃣ Export</h3>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {config.dataCategories.length} categories selected • {config.dateRange.replace(/-/g, ' ')} • {config.format.toUpperCase()}
            </div>
            <button
              onClick={onExport}
              disabled={config.dataCategories.length === 0 || exporting}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                '📥 Export Now'
              )}
            </button>
          </div>
        </AnimatedCard>
      </div>

      {/* Preview Panel */}
      <AnimatedCard delay={150}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Preview</h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Selected Data</div>
            <div className="flex flex-wrap gap-1">
              {config.dataCategories.map(catId => {
                const cat = DATA_CATEGORIES.find(c => c.id === catId);
                return cat ? (
                  <Badge key={catId} variant="info" size="xs">{cat.icon} {cat.label}</Badge>
                ) : null;
              })}
              {config.dataCategories.length === 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">No categories selected</span>
              )}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Categories</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {config.dataCategories.length}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Format</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white uppercase">{config.format}</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Date Range</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {config.dateRange.replace(/-/g, ' ')}
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}

// ======================== SCHEDULED EXPORTS VIEW ========================
function ScheduledExportsView() {
  const [scheduledExports, setScheduledExports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScheduled = async () => {
      try {
        const response = await api.get('/financial-reports/scheduled');
        if (response.data?.schedules) {
          setScheduledExports(response.data.schedules);
        }
      } catch (error) {
        // API may not support this endpoint yet; silently handle
        console.debug('Scheduled exports not available:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchScheduled();
  }, []);

  return (
    <div className="space-y-6">
      <AnimatedCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Scheduled Exports</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            ➕ New Schedule
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading scheduled exports...</p>
          </div>
        ) : scheduledExports.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📅</span>
            <p className="text-gray-500 dark:text-gray-400 mb-1">No scheduled exports yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Create a schedule to automatically generate and deliver reports</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledExports.map(schedule => (
              <div key={schedule.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className={`w-3 h-3 rounded-full ${schedule.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{schedule.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {schedule.frequency} • Next: {formatDate(schedule.nextRun)} • {(schedule.format || '').toUpperCase()}
                  </div>
                </div>
                <Badge variant={schedule.enabled ? 'success' : 'default'}>{schedule.enabled ? 'Active' : 'Paused'}</Badge>
                <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">⚙️</button>
              </div>
            ))}
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}

// ======================== EXPORT HISTORY VIEW ========================
function ExportHistoryView({ history }) {
  if (history.length === 0) {
    return (
      <AnimatedCard>
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">📚</span>
          <p className="text-gray-500 dark:text-gray-400 mb-1">No exports yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Generated reports and exports will appear here</p>
        </div>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Export History</h3>
      <div className="space-y-2">
        {history.map((entry, i) => {
          const formatInfo = EXPORT_FORMATS.find(f => f.id === entry.format) || EXPORT_FORMATS[0];
          return (
            <div
              key={entry.id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="text-xl">{formatInfo.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white text-sm">{entry.name}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{formatDate(entry.date)} • {entry.size || 'Unknown'}</div>
              </div>
              <Badge variant={entry.status === 'completed' ? 'success' : 'warning'} size="xs">{entry.status}</Badge>
              <div className="flex gap-1">
                {entry.downloadUrl && (
                  <a href={entry.downloadUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs transition-colors" title="Download">📥</a>
                )}
                <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs transition-colors" title="Share">🔗</button>
                <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs transition-colors" title="Delete">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </AnimatedCard>
  );
}
