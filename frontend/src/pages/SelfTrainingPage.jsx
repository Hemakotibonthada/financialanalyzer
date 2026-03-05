// ============================================================================
// SelfTrainingPage.jsx — Dedicated AI Self-Training Management Page
// ============================================================================
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useTheme } from '../context/ThemeContext';
import { ThemeGradientText } from '../components/ui/ThemePageComponents';
import { Brain, Zap, CheckCircle, RefreshCw, Activity, Shield } from 'lucide-react';
import { localAIService } from '../services/api';

const SelfTrainingPage = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [aiStatus, setAIStatus] = useState(null);

  useEffect(() => {
    localAIService.getStatus().then(r => setAIStatus(r.data?.data)).catch(() => {});
  }, []);

  return (
    <MainLayout title="AI Self-Training">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${dk ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
              <Brain className="w-7 h-7 text-indigo-500" />
            </div>
            <div>
              <ThemeGradientText className="text-2xl font-bold">
                AI Self-Training Engine
              </ThemeGradientText>
              <p className={`text-sm mt-0.5 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
                Autonomous model training · Real-time monitoring · Local AI
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${dk ? 'bg-slate-800 border border-slate-700' : 'bg-blue-50 border border-blue-200'}`}>
            <Zap className="w-4 h-4 text-blue-500" />
            <span className={`text-sm font-medium ${dk ? 'text-slate-300' : 'text-blue-700'}`}>
              All models run locally — your data never leaves
            </span>
          </div>
        </div>

        {/* AI Status Card */}
        <div className={`rounded-2xl border p-6 mb-6 ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-bold mb-4 ${dk ? 'text-white' : 'text-gray-900'}`}>
            <Activity className="w-5 h-5 inline mr-2 text-indigo-500" />
            AI Engine Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl ${dk ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Engine</p>
              <p className={`text-sm font-bold mt-1 ${dk ? 'text-white' : 'text-gray-900'}`}>{aiStatus?.engine || 'Local'}</p>
            </div>
            <div className={`p-4 rounded-xl ${dk ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Model</p>
              <p className={`text-sm font-bold mt-1 ${dk ? 'text-white' : 'text-gray-900'}`}>{aiStatus?.model || 'finserve-local-v1'}</p>
            </div>
            <div className={`p-4 rounded-xl ${dk ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Ollama</p>
              <p className={`text-sm font-bold mt-1 ${aiStatus?.ollamaAvailable ? 'text-emerald-500' : 'text-amber-500'}`}>
                {aiStatus?.ollamaAvailable ? '✅ Connected' : '⚡ Offline (using local)'}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${dk ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
              <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Version</p>
              <p className={`text-sm font-bold mt-1 ${dk ? 'text-white' : 'text-gray-900'}`}>{aiStatus?.version || '2.0.0'}</p>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className={`rounded-2xl border p-6 mb-6 ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-bold mb-4 ${dk ? 'text-white' : 'text-gray-900'}`}>
            <Shield className="w-5 h-5 inline mr-2 text-emerald-500" />
            AI Capabilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Financial Chat', desc: 'Context-aware AI assistant with financial knowledge', status: 'active' },
              { title: 'Transaction Categorization', desc: 'Auto-classify expenses into 13+ categories', status: 'active' },
              { title: 'Spending Pattern Analysis', desc: 'Detect recurring patterns and anomalies', status: 'active' },
              { title: 'Borrowing Intelligence', desc: 'Risk scoring, predictions, and recommendations', status: 'active' },
              { title: 'Debt Payoff Optimization', desc: 'Avalanche/Snowball strategy recommendations', status: 'active' },
              { title: 'Budget Recommendations', desc: '50/30/20 rule analysis and suggestions', status: 'active' },
              { title: 'Smart Alerts', desc: 'Predictive notifications for bills, spending, goals', status: 'active' },
              { title: 'Self-Training', desc: 'Model improves automatically with your usage data', status: 'active' }
            ].map((cap, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{cap.title}</p>
                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training Info */}
        <div className={`rounded-2xl border p-6 ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-bold mb-3 ${dk ? 'text-white' : 'text-gray-900'}`}>
            <RefreshCw className="w-5 h-5 inline mr-2 text-blue-500" />
            How Self-Training Works
          </h3>
          <div className={`space-y-3 text-sm ${dk ? 'text-slate-300' : 'text-gray-600'}`}>
            <p>The AI engine continuously learns from your financial data to provide increasingly accurate insights:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Pattern Learning:</strong> Analyzes your spending patterns, borrowing habits, and repayment behavior</li>
              <li><strong>Weight Adjustment:</strong> Automatically adjusts scoring weights based on your data accuracy</li>
              <li><strong>Knowledge Expansion:</strong> Builds a personalized financial profile over time</li>
              <li><strong>Privacy First:</strong> All training happens locally — your data never leaves your server</li>
            </ul>
            <p className={`mt-3 p-3 rounded-xl ${dk ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200'}`}>
              <strong>Topics covered:</strong> {aiStatus?.knowledgeTopics?.join(', ') || 'savings, investment, debt, budget, tax, insurance, retirement'}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SelfTrainingPage;
