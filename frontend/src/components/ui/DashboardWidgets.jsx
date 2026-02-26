// ============================================================
// Financial Analyzer - Dashboard Widget Components
// Feature-rich dashboard widgets for financial insights
// ============================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AnimatedCard, StatCard, ProgressRing, Badge, Timeline, Avatar, Tooltip } from './ComponentLibrary';
import { Sparkline, GaugeChart, EnhancedDoughnutChart, EnhancedBarChart, EnhancedLineChart } from './ChartComponents';
import { useAnimatedCounter, useScrollReveal, useLocalStorage } from '../../hooks/useCustomHooks';
import { formatCurrency, formatPercentage, formatDate, calculateEMI, calculateSIP } from '../../utils/helpers';

// ======================== FINANCIAL HEALTH SCORE WIDGET ========================
// Feature #68: Comprehensive Financial Health Score

export function FinancialHealthWidget({ score, metrics, trend, loading = false }) {
  const [ref, isVisible] = useScrollReveal();
  const { count: animatedScore } = useAnimatedCounter(isVisible ? score : 0, 2000);

  const getScoreLabel = (s) => {
    if (s >= 90) return { label: 'Excellent', color: '#10B981', emoji: '🌟' };
    if (s >= 75) return { label: 'Good', color: '#34D399', emoji: '👍' };
    if (s >= 60) return { label: 'Fair', color: '#FBBF24', emoji: '👌' };
    if (s >= 40) return { label: 'Needs Work', color: '#F59E0B', emoji: '⚠️' };
    return { label: 'Poor', color: '#EF4444', emoji: '🔴' };
  };

  const scoreInfo = getScoreLabel(score);

  const defaultMetrics = metrics || [
    { label: 'Savings Rate', score: 72, weight: 20 },
    { label: 'Debt-to-Income', score: 85, weight: 20 },
    { label: 'Emergency Fund', score: 60, weight: 15 },
    { label: 'Investment Portfolio', score: 78, weight: 20 },
    { label: 'Insurance Coverage', score: 65, weight: 15 },
    { label: 'Credit Score', score: 82, weight: 10 },
  ];

  if (loading) {
    return (
      <AnimatedCard className="animate-pulse">
        <div className="flex items-center justify-center py-8">
          <div className="skeleton w-32 h-32 rounded-full" />
        </div>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard ref={ref} className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: scoreInfo.color, filter: 'blur(60px)' }} />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Health</h3>
          <p className="text-sm text-gray-500">Overall wellness score</p>
        </div>
        <Badge variant={score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger'} dot pulse>
          {scoreInfo.emoji} {scoreInfo.label}
        </Badge>
      </div>

      <div className="flex items-center gap-8 mb-6">
        <ProgressRing
          value={animatedScore}
          max={100}
          size={140}
          strokeWidth={10}
          color={scoreInfo.color}
          label="Score"
        />
        
        <div className="flex-1 space-y-3">
          {defaultMetrics.map((metric, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">{metric.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">{metric.score}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: isVisible ? `${metric.score}%` : '0%',
                    backgroundColor: metric.score >= 75 ? '#10B981' : metric.score >= 50 ? '#F59E0B' : '#EF4444',
                    transitionDelay: `${i * 150}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {trend && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">30-day trend</span>
            <div className="flex items-center gap-2">
              <Sparkline data={trend.data || [65, 68, 72, 70, 75, 78, 80, 82]} color={scoreInfo.color} height={28} width={100} />
              <Badge variant={trend.change >= 0 ? 'success' : 'danger'} size="xs">
                {trend.change >= 0 ? '+' : ''}{trend.change}%
              </Badge>
            </div>
          </div>
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== EXPENSE BREAKDOWN WIDGET ========================
// Feature #69: Interactive Expense Breakdown

export function ExpenseBreakdownWidget({ expenses = [], totalBudget, period = 'This Month', loading = false }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = [...expenses].sort((a, b) => b.amount - a.amount);

  const categoryIcons = {
    food: '🍕', transport: '🚗', shopping: '🛍️', entertainment: '🎬',
    utilities: '💡', healthcare: '🏥', education: '📚', rent: '🏠',
    investment: '📈', insurance: '🛡️', travel: '✈️', other: '📦',
  };

  if (loading) {
    return <AnimatedCard className="animate-pulse"><div className="skeleton h-64 rounded-xl" /></AnimatedCard>;
  }

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Breakdown</h3>
          <p className="text-sm text-gray-500">{period}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</div>
          {totalBudget && (
            <div className={`text-xs ${total > totalBudget ? 'text-red-500' : 'text-green-500'}`}>
              {total > totalBudget ? 'Over budget' : `${formatCurrency(totalBudget - total)} remaining`}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-4">
        <div className="col-span-2 mb-3">
          <EnhancedDoughnutChart
            data={sorted.map(e => e.amount)}
            labels={sorted.map(e => e.category)}
            height={180}
            cutout="65%"
            centerValue={formatCurrency(total, 'INR', { compact: true })}
            centerLabel="Total Spent"
            showLegend={false}
          />
        </div>
        
        {sorted.map((expense, i) => {
          const pct = (expense.amount / total) * 100;
          const isSelected = selectedCategory === expense.category;
          
          return (
            <div
              key={i}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedCategory(isSelected ? null : expense.category)}
            >
              <span className="text-lg">{categoryIcons[expense.category?.toLowerCase()] || '📦'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{expense.category}</div>
                <div className="text-[10px] text-gray-400">{pct.toFixed(1)}%</div>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(expense.amount, 'INR', { compact: true })}</span>
            </div>
          );
        })}
      </div>

      {totalBudget && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Budget Usage</span>
            <span className="font-medium">{((total / totalBudget) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((total / totalBudget) * 100, 100)}%`,
                backgroundColor: total / totalBudget > 0.9 ? '#EF4444' : total / totalBudget > 0.7 ? '#F59E0B' : '#10B981',
              }}
            />
          </div>
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== INCOME VS EXPENSE WIDGET ========================
// Feature #70: Income vs Expense Comparison

export function IncomeExpenseWidget({ data = [], loading = false }) {
  const latestMonth = data[data.length - 1] || { income: 0, expense: 0 };
  const savings = latestMonth.income - latestMonth.expense;
  const savingsRate = latestMonth.income > 0 ? (savings / latestMonth.income) * 100 : 0;

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Income vs Expense</h3>
      <p className="text-sm text-gray-500 mb-4">Monthly breakdown</p>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">Income</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            {formatCurrency(latestMonth.income, 'INR', { compact: true })}
          </div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="text-xs text-red-600 dark:text-red-400 mb-1">Expense</div>
          <div className="text-lg font-bold text-red-700 dark:text-red-300">
            {formatCurrency(latestMonth.expense, 'INR', { compact: true })}
          </div>
        </div>
        <div className={`text-center p-3 rounded-xl ${savings >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
          <div className={`text-xs mb-1 ${savings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Savings</div>
          <div className={`text-lg font-bold ${savings >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
            {formatCurrency(Math.abs(savings), 'INR', { compact: true })}
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <EnhancedBarChart
          labels={data.map(d => d.month || d.label)}
          datasets={[
            { label: 'Income', data: data.map(d => d.income) },
            { label: 'Expense', data: data.map(d => d.expense) },
          ]}
          height={200}
          currency
          colors={['#10B981', '#EF4444']}
        />
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500">Savings Rate</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(savingsRate, 100))}%` }}
            />
          </div>
          <Badge variant={savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'warning' : 'danger'} size="xs">
            {savingsRate.toFixed(1)}%
          </Badge>
        </div>
      </div>
    </AnimatedCard>
  );
}

// ======================== GOAL TRACKER WIDGET ========================
// Feature #71: Financial Goals Progress Tracker

export function GoalTrackerWidget({ goals = [], loading = false }) {
  const [activeGoal, setActiveGoal] = useState(null);

  if (loading) {
    return (
      <AnimatedCard className="animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </AnimatedCard>
    );
  }

  const goalIcons = {
    retirement: '🏖️', house: '🏠', car: '🚗', education: '🎓',
    vacation: '✈️', emergency: '🛟', wedding: '💒', business: '💼',
    debt_free: '🆓', investment: '📈', default: '🎯',
  };

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Goals</h3>
        <Badge variant="primary" size="xs">{goals.length} active</Badge>
      </div>

      <div className="space-y-3">
        {goals.slice(0, 5).map((goal, i) => {
          const progress = (goal.current / goal.target) * 100;
          const isActive = activeGoal === i;
          const remaining = goal.target - goal.current;
          const monthsLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30))) : null;

          return (
            <div
              key={i}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                isActive ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveGoal(isActive ? null : i)}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{goalIcons[goal.type] || goalIcons.default}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{goal.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{progress.toFixed(0)}%</div>
                  {monthsLeft !== null && (
                    <div className="text-[10px] text-gray-400">{monthsLeft}mo left</div>
                  )}
                </div>
              </div>
              
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    background: progress >= 100 ? '#10B981' : `linear-gradient(90deg, #667eea, #764ba2)`,
                    transitionDelay: `${i * 100}ms`,
                  }}
                />
              </div>

              {isActive && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3 text-xs animate-fadeInUp">
                  <div>
                    <span className="text-gray-500">Remaining</span>
                    <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(remaining)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Monthly Required</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {monthsLeft ? formatCurrency(remaining / monthsLeft) : 'N/A'}
                    </div>
                  </div>
                  {goal.deadline && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Deadline: </span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(goal.deadline)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {goals.length > 5 && (
        <button className="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
          View all {goals.length} goals →
        </button>
      )}
    </AnimatedCard>
  );
}

// ======================== BILL REMINDER WIDGET ========================
// Feature #72: Upcoming Bills Countdown

export function BillReminderWidget({ bills = [], loading = false }) {
  const today = new Date();
  
  const sortedBills = [...bills].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const upcomingBills = sortedBills.filter(b => new Date(b.dueDate) >= today);
  const overdueBills = sortedBills.filter(b => new Date(b.dueDate) < today && !b.paid);

  const getDaysRemaining = (date) => {
    const diff = new Date(date) - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days) => {
    if (days < 0) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (days <= 3) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
    if (days <= 7) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-green-500 bg-green-50 dark:bg-green-900/20';
  };

  if (loading) {
    return <AnimatedCard className="animate-pulse"><div className="skeleton h-48 rounded-xl" /></AnimatedCard>;
  }

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Bills</h3>
        {overdueBills.length > 0 && (
          <Badge variant="danger" dot pulse>{overdueBills.length} overdue</Badge>
        )}
      </div>

      {overdueBills.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">⚠️ Overdue Bills</div>
          {overdueBills.map((bill, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-red-600">{bill.name}</span>
              <span className="font-medium text-red-700">{formatCurrency(bill.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {upcomingBills.slice(0, 6).map((bill, i) => {
          const days = getDaysRemaining(bill.dueDate);
          
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${getUrgencyColor(days)}`}>
                {days <= 0 ? '!' : days}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{bill.name}</div>
                <div className="text-xs text-gray-500">
                  {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : days < 0 ? `${Math.abs(days)}d overdue` : `${days} days left`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(bill.amount)}</div>
                {bill.recurring && <div className="text-[10px] text-gray-400">Recurring</div>}
              </div>
            </div>
          );
        })}
      </div>

      {upcomingBills.length === 0 && overdueBills.length === 0 && (
        <div className="py-8 text-center text-gray-400">
          <span className="text-3xl block mb-2">🎉</span>
          <span className="text-sm">All bills are paid!</span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Total upcoming: <span className="font-bold text-gray-900 dark:text-white">
            {formatCurrency(upcomingBills.reduce((sum, b) => sum + b.amount, 0))}
          </span>
        </span>
      </div>
    </AnimatedCard>
  );
}

// ======================== INVESTMENT OVERVIEW WIDGET ========================
// Feature #73: Investment Portfolio Overview

export function InvestmentOverviewWidget({ investments = [], loading = false }) {
  const totalInvested = investments.reduce((sum, inv) => sum + inv.invested, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnsPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  const typeIcons = {
    stocks: '📊', 'mutual_funds': '📈', bonds: '📜', gold: '🥇',
    fd: '🏦', ppf: '🏛️', crypto: '₿', real_estate: '🏠', nps: '💰',
  };

  if (loading) {
    return <AnimatedCard className="animate-pulse"><div className="skeleton h-56 rounded-xl" /></AnimatedCard>;
  }

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Investment Portfolio</h3>
      <p className="text-sm text-gray-500 mb-4">Asset allocation & returns</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="text-xs text-gray-500 mb-1">Total Invested</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalInvested, 'INR', { compact: true })}</div>
        </div>
        <div className={`p-3 rounded-xl ${totalReturns >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div className="text-xs text-gray-500 mb-1">Returns</div>
          <div className={`text-lg font-bold ${totalReturns >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns, 'INR', { compact: true })}
            <span className="text-xs ml-1">({returnsPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {investments.slice(0, 6).map((inv, i) => {
          const returns = inv.currentValue - inv.invested;
          const retPct = inv.invested > 0 ? (returns / inv.invested) * 100 : 0;
          const allocation = (inv.currentValue / totalCurrent) * 100;

          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="text-xl">{typeIcons[inv.type] || '💹'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{inv.name}</span>
                  <Badge size="xs" variant="default">{allocation.toFixed(0)}%</Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Invested: {formatCurrency(inv.invested, 'INR', { compact: true })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(inv.currentValue, 'INR', { compact: true })}
                </div>
                <div className={`text-xs font-medium ${retPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {retPct >= 0 ? '↗' : '↘'} {Math.abs(retPct).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AnimatedCard>
  );
}

// ======================== QUICK ACTIONS WIDGET ========================
// Feature #74: Quick Actions Grid

export function QuickActionsWidget({ actions = [], columns = 4 }) {
  const defaultActions = actions.length > 0 ? actions : [
    { icon: '➕', label: 'Add Expense', color: '#EF4444', action: () => {} },
    { icon: '💰', label: 'Add Income', color: '#10B981', action: () => {} },
    { icon: '📊', label: 'Reports', color: '#667eea', action: () => {} },
    { icon: '🎯', label: 'New Goal', color: '#F59E0B', action: () => {} },
    { icon: '📤', label: 'Export Data', color: '#8B5CF6', action: () => {} },
    { icon: '🔔', label: 'Reminders', color: '#EC4899', action: () => {} },
    { icon: '📱', label: 'Scan Receipt', color: '#14B8A6', action: () => {} },
    { icon: '🏦', label: 'Link Bank', color: '#6366F1', action: () => {} },
  ];

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
      <div className={`grid grid-cols-${columns} gap-3`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {defaultActions.map((action, i) => (
          <button
            key={i}
            onClick={action.action}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 group"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${action.color}15` }}
            >
              {action.icon}
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </AnimatedCard>
  );
}

// ======================== RECENT TRANSACTIONS WIDGET ========================
// Feature #75: Recent Transactions List

export function RecentTransactionsWidget({ transactions = [], loading = false, onViewAll }) {
  const categoryColors = {
    food: '#EF4444', transport: '#F59E0B', shopping: '#8B5CF6',
    entertainment: '#EC4899', utilities: '#6366F1', healthcare: '#14B8A6',
    education: '#3B82F6', salary: '#10B981', freelance: '#84CC16',
    investment: '#667eea', rent: '#D946EF', other: '#6B7280',
  };

  if (loading) {
    return (
      <AnimatedCard>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-32 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </button>
        )}
      </div>

      <div className="space-y-1">
        {transactions.slice(0, 8).map((tx, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${categoryColors[tx.category?.toLowerCase()] || '#6B7280'}, ${categoryColors[tx.category?.toLowerCase()] || '#6B7280'}CC)`,
              }}
            >
              {tx.category?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description || tx.title}</div>
              <div className="text-xs text-gray-500">
                {tx.category} · {formatDate(tx.date, 'relative')}
              </div>
            </div>
            <div className={`text-sm font-bold ${tx.type === 'income' || tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {tx.type === 'income' || tx.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
            </div>
          </div>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="py-8 text-center text-gray-400">
          <span className="text-3xl block mb-2">📭</span>
          <span className="text-sm">No transactions yet</span>
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== SUBSCRIPTION TRACKER WIDGET ========================
// Feature #76: Active Subscriptions Overview

export function SubscriptionTrackerWidget({ subscriptions = [], loading = false }) {
  const totalMonthly = subscriptions.reduce((sum, sub) => {
    const monthly = sub.frequency === 'yearly' ? sub.amount / 12 : sub.amount;
    return sum + monthly;
  }, 0);

  const totalYearly = totalMonthly * 12;

  const serviceIcons = {
    netflix: '🎬', spotify: '🎵', amazon: '📦', youtube: '▶️',
    gym: '💪', cloud: '☁️', insurance: '🛡️', phone: '📱',
    internet: '🌐', newspaper: '📰', default: '📋',
  };

  if (loading) {
    return <AnimatedCard className="animate-pulse"><div className="skeleton h-48 rounded-xl" /></AnimatedCard>;
  }

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscriptions</h3>
        <Badge variant="info" size="sm">{subscriptions.length} active</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
          <div className="text-xs text-purple-600 dark:text-purple-400">Monthly</div>
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(totalMonthly)}</div>
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center">
          <div className="text-xs text-indigo-600 dark:text-indigo-400">Yearly</div>
          <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalYearly)}</div>
        </div>
      </div>

      <div className="space-y-2">
        {subscriptions.map((sub, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="text-xl">{serviceIcons[sub.service?.toLowerCase()] || serviceIcons.default}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{sub.name}</div>
              <div className="text-xs text-gray-500">{sub.frequency || 'Monthly'}</div>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(sub.amount)}</span>
          </div>
        ))}
      </div>
    </AnimatedCard>
  );
}

// ======================== NET WORTH SUMMARY WIDGET ========================
// Feature #77: Net Worth Summary Card

export function NetWorthWidget({ assets = 0, liabilities = 0, history = [], loading = false }) {
  const netWorth = assets - liabilities;
  const { count: animatedNetWorth } = useAnimatedCounter(netWorth, 2000, 0);

  if (loading) {
    return <AnimatedCard className="animate-pulse"><div className="skeleton h-48 rounded-xl" /></AnimatedCard>;
  }

  return (
    <AnimatedCard className="relative overflow-hidden">
      <div 
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-5"
        style={{ background: netWorth >= 0 ? '#10B981' : '#EF4444' }}
      />

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Net Worth</h3>
      <div className={`text-3xl font-bold mb-4 ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {formatCurrency(animatedNetWorth)}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Total Assets</div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(assets, 'INR', { compact: true })}</div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(assets / (assets + liabilities)) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Total Liabilities</div>
          <div className="text-lg font-bold text-red-600">{formatCurrency(liabilities, 'INR', { compact: true })}</div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${(liabilities / (assets + liabilities)) * 100}%` }} />
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">12-month trend</span>
            {history.length >= 2 && (
              <Badge
                variant={history[history.length - 1] >= history[history.length - 2] ? 'success' : 'danger'}
                size="xs"
              >
                {history[history.length - 1] >= history[history.length - 2] ? '↗' : '↘'}
                {Math.abs(((history[history.length - 1] - history[history.length - 2]) / history[history.length - 2]) * 100).toFixed(1)}%
              </Badge>
            )}
          </div>
          <Sparkline data={history} color={netWorth >= 0 ? '#10B981' : '#EF4444'} height={50} width={280} />
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== EMI CALCULATOR WIDGET ========================
// Feature #78: Quick EMI Calculator

export function EMICalculatorWidget() {
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);

  const emi = calculateEMI(loanAmount, interestRate, tenure);
  const totalPayment = emi * tenure;
  const totalInterest = totalPayment - loanAmount;

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">EMI Calculator</h3>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Loan Amount</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(loanAmount)}</span>
          </div>
          <input
            type="range"
            min="100000"
            max="50000000"
            step="100000"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Interest Rate</span>
            <span className="font-medium text-gray-900 dark:text-white">{interestRate}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Tenure</span>
            <span className="font-medium text-gray-900 dark:text-white">{tenure} months ({(tenure / 12).toFixed(1)} yr)</span>
          </div>
          <input
            type="range"
            min="6"
            max="360"
            step="6"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4">
        <div className="text-center mb-3">
          <div className="text-xs text-gray-500 mb-1">Monthly EMI</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(emi)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">Total Payment</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(totalPayment, 'INR', { compact: true })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Interest</div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalInterest, 'INR', { compact: true })}</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <EnhancedDoughnutChart
          data={[loanAmount, totalInterest]}
          labels={['Principal', 'Interest']}
          height={150}
          cutout="60%"
          showLegend={false}
          colors={['#667eea', '#f5576c']}
        />
      </div>
    </AnimatedCard>
  );
}

// ======================== ACTIVITY FEED WIDGET ========================
// Feature #79: Activity Timeline Feed

export function ActivityFeedWidget({ activities = [], loading = false }) {
  if (loading) {
    return (
      <AnimatedCard className="animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3">
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-48 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </AnimatedCard>
    );
  }

  const activityIcons = {
    transaction: '💳', goal: '🎯', budget: '📊', investment: '📈',
    bill: '📋', login: '🔑', export: '📤', settings: '⚙️',
    alert: '🔔', achievement: '🏆', default: '📌',
  };

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
      
      <Timeline
        items={activities.slice(0, 8).map(act => ({
          title: act.title,
          description: act.description,
          date: formatDate(act.date, 'relative'),
          icon: activityIcons[act.type] || activityIcons.default,
          status: act.status || 'completed',
        }))}
        maxItems={5}
        showMore
      />

      {activities.length === 0 && (
        <div className="py-6 text-center text-gray-400">
          <span className="text-2xl block mb-2">📭</span>
          <span className="text-sm">No recent activity</span>
        </div>
      )}
    </AnimatedCard>
  );
}

// ======================== CURRENCY CONVERTER WIDGET ========================
// Feature #80: Quick Currency Converter

export function CurrencyConverterWidget() {
  const [amount, setAmount] = useState(1000);
  const [fromCurrency, setFromCurrency] = useState('INR');
  const [toCurrency, setToCurrency] = useState('USD');

  // Static rates (in production, these would come from an API)
  const rates = {
    INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095,
    JPY: 1.78, AUD: 0.018, CAD: 0.016, SGD: 0.016,
    AED: 0.044, CHF: 0.011,
  };

  const convertedAmount = (amount / rates[fromCurrency]) * rates[toCurrency];
  const rate = rates[toCurrency] / rates[fromCurrency];

  const currencies = Object.keys(rates);
  const currencyFlags = {
    INR: '🇮🇳', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
    JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬',
    AED: '🇦🇪', CHF: '🇨🇭',
  };

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💱 Currency Converter</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
            >
              {currencies.map(c => (
                <option key={c} value={c}>{currencyFlags[c]} {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
            >
              {currencies.map(c => (
                <option key={c} value={c}>{currencyFlags[c]} {c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Converted Amount</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {currencyFlags[toCurrency]} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {toCurrency}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            1 {fromCurrency} = {rate.toFixed(6)} {toCurrency}
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
}

// ======================== EXPORTS ========================
export default {
  FinancialHealthWidget, ExpenseBreakdownWidget, IncomeExpenseWidget,
  GoalTrackerWidget, BillReminderWidget, InvestmentOverviewWidget,
  QuickActionsWidget, RecentTransactionsWidget, SubscriptionTrackerWidget,
  NetWorthWidget, EMICalculatorWidget, ActivityFeedWidget, CurrencyConverterWidget,
};
