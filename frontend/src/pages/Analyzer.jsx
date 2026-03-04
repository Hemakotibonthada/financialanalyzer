import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Upload, FileText } from 'lucide-react';
import SpendingDashboard from '../components/SpendingDashboard';
import DocumentSummary from '../components/DocumentSummary';
import MainLayout from '../components/MainLayout';
import '../styles/animations.css';

const Analyzer = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  return (
    <MainLayout title="Add Expense" subtitle="Upload & analyze your financial documents">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="animate-fade-in-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 p-6 md:p-8 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNEgyNHYtMmgxMnYyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Expense Analyzer</h1>
                  <p className="text-red-100 mt-1">Upload bank statements, invoices & receipts for instant analysis</p>
                </div>
              </div>
              <FileText className="w-16 h-16 text-white/20 hidden md:block" />
            </div>
          </div>
        </div>

        {/* Real Aggregated Data from ALL Documents */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <DocumentSummary />
        </div>
        
        {/* Divider with gradient */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
              Detailed Analysis
            </span>
          </div>
        </div>
        
        {/* Detailed Dashboard with Upload and Charts */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <SpendingDashboard />
        </div>
      </div>
    </MainLayout>
  );
};

export default Analyzer;
