import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Calculator, 
  Shield, 
  TrendingUp, 
  Building2, 
  Briefcase, 
  Bell, 
  Search,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

const NewFeaturesShowcase = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'AI & ML Insights',
      description: 'Predictive analytics, anomaly detection, and intelligent recommendations',
      icon: Brain,
      path: '/ml-dashboard',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-700/50',
      iconBg: 'bg-white dark:bg-purple-900/40'
    },
    {
      title: 'Tax Planner',
      description: 'Tax optimization, deduction calculator, and ITR filing assistance',
      icon: Calculator,
      path: '/tax-planner',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-700/50',
      iconBg: 'bg-white dark:bg-red-900/40'
    },
    {
      title: 'Insurance Portfolio',
      description: 'Policy tracking, coverage analysis, and claim management',
      icon: Shield,
      path: '/insurance',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-700/50',
      iconBg: 'bg-white dark:bg-blue-900/40'
    },
    {
      title: 'Retirement Planning',
      description: 'Corpus calculator, goal tracking, and retirement projections',
      icon: TrendingUp,
      path: '/retirement',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-700/50',
      iconBg: 'bg-white dark:bg-green-900/40'
    },
    {
      title: 'Real Estate',
      description: 'Property portfolio, rental income, and mortgage tracking',
      icon: Building2,
      path: '/real-estate',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-700/50',
      iconBg: 'bg-white dark:bg-orange-900/40'
    },
    {
      title: 'Business Management',
      description: 'Invoices, clients, projects, and business analytics',
      icon: Briefcase,
      path: '/business',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-200 dark:border-indigo-700/50',
      iconBg: 'bg-white dark:bg-indigo-900/40'
    },
    {
      title: 'Smart Notifications',
      description: 'Multi-channel alerts, bill reminders, and smart insights',
      icon: Bell,
      path: '/notifications',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-700/50',
      iconBg: 'bg-white dark:bg-yellow-900/40'
    },
    {
      title: 'Advanced Search',
      description: 'Natural language queries and powerful filtering',
      icon: Search,
      path: '/advanced-search',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      borderColor: 'border-cyan-200 dark:border-cyan-700/50',
      iconBg: 'bg-white dark:bg-cyan-900/40'
    }
  ];

  return (
    <div className="mt-6 bg-white dark:bg-slate-800/80 rounded-lg shadow-md dark:shadow-black/20 border border-transparent dark:border-slate-700/50">
      <div className="p-6 border-b dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <span className="text-2xl">🎉</span>
            New Features Available
          </h2>
          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-semibold border border-transparent dark:border-green-700/50">
            Just Released
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.path}
                onClick={() => navigate(feature.path)}
                className={`${feature.bgColor} ${feature.borderColor} border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-200 hover:scale-105 group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${feature.iconColor} p-2 rounded-lg ${feature.iconBg} shadow-sm dark:shadow-black/20`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {feature.badge ? (
                    <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full font-semibold animate-pulse">
                      {feature.badge}
                    </span>
                  ) : (
                    <ArrowRight className={`w-5 h-5 ${feature.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewFeaturesShowcase;
