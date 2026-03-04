// ============================================================================
// SelfTrainingPage.jsx — Dedicated AI Self-Training Management Page
// ============================================================================
import React from 'react';
import MainLayout from '../components/MainLayout';
import SelfTrainingPanel from '../components/ai/SelfTrainingPanel';
import { useTheme } from '../context/ThemeContext';
import { ThemeGradientText } from '../components/ui/ThemePageComponents';
import { Brain, Zap } from 'lucide-react';

const SelfTrainingPage = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  return (
    <MainLayout title="AI Self-Training">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
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
                Autonomous model training · Real-time monitoring · Drift detection
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

        {/* Main Panel */}
        <SelfTrainingPanel embedded={true} />
      </div>
    </MainLayout>
  );
};

export default SelfTrainingPage;
