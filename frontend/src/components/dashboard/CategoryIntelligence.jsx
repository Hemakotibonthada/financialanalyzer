// ============================================================================
// Category Intelligence Panel — AI-Powered Spending Category Analysis
// ============================================================================
// Interactive donut chart with category breakdown, trends, budgets,
// and AI suggestions for each spending category.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  TrendingUp, TrendingDown, ArrowRight, ChevronDown, ChevronUp,
  Sparkles, ShoppingBag, Utensils, Car, Home, Zap, Heart,
  GraduationCap, Gamepad2, Gift, MoreHorizontal, AlertTriangle
} from 'lucide-react';

const CATEGORY_ICONS = {
  food: Utensils, dining: Utensils, restaurant: Utensils,
  transport: Car, travel: Car, fuel: Car,
  shopping: ShoppingBag, retail: ShoppingBag,
  rent: Home, housing: Home, utilities: Zap,
  healthcare: Heart, medical: Heart,
  education: GraduationCap,
  entertainment: Gamepad2, subscription: Gamepad2,
  gift: Gift, donation: Gift,
};

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6'
];

function CategoryBar({ category, dk, maxAmount, onSelect, isSelected }) {
  const Icon = CATEGORY_ICONS[category.category?.toLowerCase()] || MoreHorizontal;
  const pct = category.percentage || 0;
  const isOverBudget = category.budget && category.current > category.budget;

  return (
    <button
      onClick={() => onSelect?.(category)}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
        isSelected
          ? dk ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-indigo-300 bg-indigo-50/50'
          : dk ? 'border-slate-700/50 hover:border-slate-600 bg-transparent' : 'border-gray-100 hover:border-gray-200 bg-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dk ? 'bg-slate-800' : 'bg-gray-100'}`}
          style={{ backgroundColor: `${category.color}15` }}>
          <Icon className="w-4 h-4" style={{ color: category.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-semibold capitalize ${dk ? 'text-white' : 'text-gray-900'}`}>
              {category.category}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
                ₹{(category.current || 0).toLocaleString('en-IN')}
              </span>
              {category.change != null && (
                <span className={`text-[10px] font-semibold flex items-center ${
                  category.change > 0 ? 'text-red-500' : category.change < 0 ? 'text-emerald-500' : 'text-gray-400'
                }`}>
                  {category.change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : category.change < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : null}
                  {Math.abs(category.change).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-1.5 rounded-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: isOverBudget ? '#ef4444' : category.color,
                }}
              />
            </div>
            <span className={`text-[10px] font-medium ${dk ? 'text-slate-500' : 'text-gray-400'} w-10 text-right`}>
              {pct.toFixed(0)}%
            </span>
          </div>
          {isOverBudget && (
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-[10px] text-red-500 font-medium">
                Over budget by ₹{(category.current - category.budget).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, dk }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className={`px-3 py-2 rounded-xl shadow-xl border ${
      dk ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <div className="text-xs font-bold capitalize">{data.category}</div>
      <div className="text-sm font-semibold">₹{(data.current || 0).toLocaleString('en-IN')}</div>
      <div className={`text-[10px] ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{(data.percentage || 0).toFixed(1)}%</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function CategoryIntelligence({ categories = [], total = 0, title = 'Spending by Category' }) {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const chartData = useMemo(() => {
    return categories
      .filter(c => (c.current || 0) > 0)
      .map((c, i) => ({
        ...c,
        color: c.color || CHART_COLORS[i % CHART_COLORS.length],
        value: c.current || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [categories]);

  const displayedCategories = showAll ? chartData : chartData.slice(0, 6);
  const maxAmount = chartData[0]?.current || 1;

  // AI suggestion for selected category
  const aiSuggestion = useMemo(() => {
    if (!selectedCategory) return null;
    const pct = selectedCategory.percentage || 0;
    const cat = selectedCategory.category?.toLowerCase() || '';

    if (pct > 30) return `${selectedCategory.category} is your largest expense at ${pct.toFixed(0)}%. Consider setting a strict budget and tracking daily.`;
    if (cat.includes('food') || cat.includes('dining')) return 'Try meal prepping to reduce food costs by up to 40%.';
    if (cat.includes('transport')) return 'Consider carpooling or public transit to cut transport costs.';
    if (cat.includes('shopping')) return 'Use a 48-hour rule: wait 2 days before non-essential purchases.';
    if (cat.includes('entertainment') || cat.includes('subscription')) return 'Audit subscriptions quarterly — most people have 2-3 unused ones.';
    if (selectedCategory.change > 20) return `This category increased by ${selectedCategory.change?.toFixed(0)}%. Review recent transactions for patterns.`;
    return 'This category looks healthy. Keep tracking to maintain good habits.';
  }, [selectedCategory]);

  return (
    <div className={`rounded-2xl p-6 border ${
      dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'
    } shadow-sm`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        <span className={`text-sm font-medium ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
          Total: ₹{total.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          {chartData.length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke="none"
                        opacity={selectedCategory && selectedCategory.category !== entry.category ? 0.3 : 1}
                        className="transition-opacity duration-300 cursor-pointer"
                        onClick={() => setSelectedCategory(
                          selectedCategory?.category === entry.category ? null : entry
                        )}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip dk={dk} />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
                  {selectedCategory ? selectedCategory.category : 'Total'}
                </span>
                <span className={`text-lg font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
                  ₹{(selectedCategory ? selectedCategory.current : total).toLocaleString('en-IN', { notation: 'compact' })}
                </span>
              </div>
            </div>
          ) : (
            <div className={`text-center py-12 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No spending data</p>
            </div>
          )}
        </div>

        {/* Category List */}
        <div className="space-y-1.5">
          {displayedCategories.map((cat, i) => (
            <div key={cat.category} className="card-appear" style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}>
              <CategoryBar
                category={cat}
                dk={dk}
                maxAmount={maxAmount}
                onSelect={setSelectedCategory}
                isSelected={selectedCategory?.category === cat.category}
              />
            </div>
          ))}
          {chartData.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium ${
                dk ? 'text-slate-400 hover:bg-slate-700/50' : 'text-gray-500 hover:bg-gray-50'
              } transition-colors`}
            >
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAll ? 'Show Less' : `Show All (${chartData.length})`}
            </button>
          )}
        </div>
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && selectedCategory && (
        <div className={`mt-4 p-3 rounded-xl border ${
          dk ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-200/50'
        }`} style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className={`text-xs font-semibold ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>AI Insight</span>
              <p className={`text-xs mt-0.5 ${dk ? 'text-slate-300' : 'text-gray-600'}`}>{aiSuggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
