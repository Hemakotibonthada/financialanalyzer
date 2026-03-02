import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout, Star, Download, Eye, Plus, X, Search, Filter, Heart,
  BookOpen, Home, Briefcase, Users, Target, ShieldCheck, Sparkles,
  ChevronRight, RefreshCw, Edit3, Copy, Check, MessageSquare,
  ThumbsUp, Clock, Tag, BarChart3
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Layout },
  { id: 'personal', label: 'Personal', icon: BookOpen },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'business', label: 'Business', icon: Briefcase },
];

const TEMPLATES = [
  {
    id: 1, name: '50-30-20 Budget', category: 'personal', type: 'budget',
    description: 'Allocate 50% to needs, 30% to wants, and 20% to savings & debt repayment.',
    rating: 4.8, reviews: 234, downloads: 1250, author: 'FinanceGuru',
    tags: ['popular', 'beginner'],
    allocation: [
      { name: 'Needs', value: 50, color: '#3b82f6' },
      { name: 'Wants', value: 30, color: '#10b981' },
      { name: 'Savings', value: 20, color: '#f59e0b' },
    ],
    details: 'The 50-30-20 rule is a simple budgeting method. 50% of income goes to essentials like rent, groceries, and insurance. 30% goes to discretionary spending. 20% goes to savings and debt repayment.'
  },
  {
    id: 2, name: 'Zero-Based Budget', category: 'personal', type: 'budget',
    description: 'Every rupee has a job. Income minus expenses equals zero.',
    rating: 4.6, reviews: 189, downloads: 980, author: 'BudgetMaster',
    tags: ['advanced', 'detailed'],
    allocation: [
      { name: 'Housing', value: 30, color: '#3b82f6' },
      { name: 'Transport', value: 15, color: '#10b981' },
      { name: 'Food', value: 15, color: '#f59e0b' },
      { name: 'Insurance', value: 10, color: '#ef4444' },
      { name: 'Savings', value: 15, color: '#8b5cf6' },
      { name: 'Personal', value: 10, color: '#ec4899' },
      { name: 'Giving', value: 5, color: '#14b8a6' },
    ],
    details: 'Zero-based budgeting means assigning every rupee of income to specific categories so your income minus all allocations equals zero.'
  },
  {
    id: 3, name: 'Emergency Fund Plan', category: 'personal', type: 'goal',
    description: 'Build a 6-month emergency fund with guided milestones.',
    rating: 4.9, reviews: 312, downloads: 1580, author: 'SafetyFirst',
    tags: ['essential', 'popular'],
    allocation: [
      { name: 'Month 1-2', value: 16 }, { name: 'Month 3-4', value: 17 },
      { name: 'Month 5-6', value: 17 }, { name: 'Month 7-8', value: 17 },
      { name: 'Month 9-10', value: 16 }, { name: 'Month 11-12', value: 17 },
    ],
    details: 'Build your emergency fund over 12 months. Start by saving 1 month of expenses, then gradually increase until you have 6 months of expenses saved.'
  },
  {
    id: 4, name: 'Home Purchase Saver', category: 'family', type: 'goal',
    description: 'Systematic plan to save for a home down payment.',
    rating: 4.5, reviews: 156, downloads: 720, author: 'HomeDreams',
    tags: ['long-term'],
    allocation: [
      { name: 'Down Payment', value: 60, color: '#3b82f6' },
      { name: 'Registration', value: 15, color: '#10b981' },
      { name: 'Furnishing', value: 15, color: '#f59e0b' },
      { name: 'Buffer', value: 10, color: '#ef4444' },
    ],
    details: 'Plan for your home purchase by breaking down the total cost into down payment, registration, furnishing, and an emergency buffer.'
  },
  {
    id: 5, name: 'Family Budget', category: 'family', type: 'budget',
    description: 'Comprehensive family budget with categories for every family member.',
    rating: 4.7, reviews: 198, downloads: 1100, author: 'FamilyFinance',
    tags: ['family', 'comprehensive'],
    allocation: [
      { name: 'Household', value: 35, color: '#3b82f6' },
      { name: 'Education', value: 20, color: '#10b981' },
      { name: 'Healthcare', value: 10, color: '#f59e0b' },
      { name: 'Entertainment', value: 10, color: '#ef4444' },
      { name: 'Savings', value: 15, color: '#8b5cf6' },
      { name: 'Misc', value: 10, color: '#ec4899' },
    ],
    details: 'A complete family budget template that accounts for household expenses, children education, healthcare, and family entertainment.'
  },
  {
    id: 6, name: 'Vacation Fund', category: 'personal', type: 'goal',
    description: 'Save systematically for your dream vacation.',
    rating: 4.4, reviews: 87, downloads: 450, author: 'TravelBug',
    tags: ['fun', 'short-term'],
    allocation: [
      { name: 'Flights', value: 35 }, { name: 'Accommodation', value: 30 },
      { name: 'Activities', value: 20 }, { name: 'Food & Misc', value: 15 },
    ],
    details: 'Break down vacation costs and save monthly towards each component for stress-free travel planning.'
  },
  {
    id: 7, name: 'Business Expense Tracker', category: 'business', type: 'budget',
    description: 'Track business expenses across departments and projects.',
    rating: 4.3, reviews: 64, downloads: 320, author: 'BizTracker',
    tags: ['business', 'professional'],
    allocation: [
      { name: 'Operations', value: 30, color: '#3b82f6' },
      { name: 'Marketing', value: 20, color: '#10b981' },
      { name: 'Salaries', value: 35, color: '#f59e0b' },
      { name: 'R&D', value: 15, color: '#ef4444' },
    ],
    details: 'Professional expense tracking template for small businesses with department-wise allocation and project tracking.'
  },
  {
    id: 8, name: 'Freelancer Budget', category: 'business', type: 'budget',
    description: 'Budget template for freelancers with irregular income.',
    rating: 4.6, reviews: 142, downloads: 680, author: 'FreeAgent',
    tags: ['freelance', 'flexible'],
    allocation: [
      { name: 'Tax Reserve', value: 25, color: '#ef4444' },
      { name: 'Business', value: 15, color: '#3b82f6' },
      { name: 'Living', value: 40, color: '#10b981' },
      { name: 'Savings', value: 20, color: '#f59e0b' },
    ],
    details: 'Designed for variable income earners. Prioritize tax reserves, separate business and personal spending, and build a runway.'
  },
];

export default function FinancialTemplate() {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [applied, setApplied] = useState([]);
  const [sortBy, setSortBy] = useState('popular');
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', category: 'personal', type: 'budget' });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let result = TEMPLATES;
    if (category !== 'all') result = result.filter(t => t.category === category);
    if (searchQuery) result = result.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortBy === 'popular') result = [...result].sort((a, b) => b.downloads - a.downloads);
    else if (sortBy === 'rating') result = [...result].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'newest') result = [...result].sort((a, b) => b.id - a.id);
    return result;
  }, [category, searchQuery, sortBy]);

  const toggleFavorite = (id) => setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  const applyTemplate = async (id) => {
    setApplied(prev => [...prev, id]);
    setPreviewTemplate(null);
    try {
      await api.post('/budget-optimization/apply-template', { templateId: id });
    } catch (err) {
      console.error('Failed to apply template:', err.message);
    }
  };
  const handleCreateTemplate = async () => {
    if (!newTemplate.name) return;
    try {
      await api.post('/budget-optimization/templates', newTemplate);
    } catch (err) {
      console.error('Failed to create template:', err.message);
    }
    setNewTemplate({ name: '', description: '', category: 'personal', type: 'budget' });
    setShowCreate(false);
  };

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} />
      ))}
      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{rating}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Layout className="w-8 h-8 text-blue-500" /> Template Marketplace
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Ready-to-use financial templates for every need</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search templates..." className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm">
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${category === cat.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <Icon className="w-4 h-4" /> {cat.label}
              </button>
            );
          })}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 dashboard-grid">
          {filtered.map(template => (
            <div key={template.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all group">
              {/* Preview Chart */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={template.allocation} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                      {template.allocation.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{template.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">by {template.author}</p>
                  </div>
                  <button onClick={() => toggleFavorite(template.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <Heart className={`w-4 h-4 ${favorites.includes(template.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{template.description}</p>
                <div className="flex items-center gap-3 mb-3">
                  {renderStars(template.rating)}
                  <span className="text-xs text-slate-400">({template.reviews})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {template.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{template.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewTemplate(template)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button onClick={() => applyTemplate(template.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${applied.includes(template.id) ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {applied.includes(template.id) ? <><Check className="w-4 h-4" /> Applied</> : <><Download className="w-4 h-4" /> Apply</>}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-400">
                  <Download className="w-3 h-3" /> {template.downloads.toLocaleString()} downloads
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
            <Layout className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No templates match your search</p>
            <button onClick={() => { setSearchQuery(''); setCategory('all'); }} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">Clear filters</button>
          </div>
        )}

        {/* Template Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" /> Template Insights
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Templates', value: TEMPLATES.length, icon: Layout, color: 'blue' },
              { label: 'Applied', value: applied.length, icon: Check, color: 'green' },
              { label: 'Favorites', value: favorites.length, icon: Heart, color: 'red' },
              { label: 'Total Downloads', value: TEMPLATES.reduce((s, t) => s + t.downloads, 0).toLocaleString(), icon: Download, color: 'purple' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                  <Icon className={`w-5 h-5 text-${stat.color}-500 mx-auto mb-2`} />
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{previewTemplate.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">by {previewTemplate.author}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                {renderStars(previewTemplate.rating)}
                <span className="text-sm text-slate-500">({previewTemplate.reviews} reviews)</span>
                <span className="text-sm text-slate-400">•</span>
                <span className="text-sm text-slate-500 flex items-center gap-1"><Download className="w-3 h-3" /> {previewTemplate.downloads}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{previewTemplate.details}</p>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Allocation Breakdown</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={previewTemplate.allocation}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {previewTemplate.allocation.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2">
                {previewTemplate.tags.map(tag => (
                  <span key={tag} className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setPreviewTemplate(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Close</button>
              <button onClick={() => applyTemplate(previewTemplate.id)} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <Download className="w-4 h-4" /> Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Custom Template</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} placeholder="Template Name" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500" />
              <textarea value={newTemplate.description} onChange={e => setNewTemplate(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 resize-none" />
              <select value={newTemplate.category} onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500">
                <option value="personal">Personal</option>
                <option value="family">Family</option>
                <option value="business">Business</option>
              </select>
              <select value={newTemplate.type} onChange={e => setNewTemplate(p => ({ ...p, type: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500">
                <option value="budget">Budget Template</option>
                <option value="goal">Goal Template</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleCreateTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
