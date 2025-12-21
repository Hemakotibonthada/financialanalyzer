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
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Tax Planner',
      description: 'Tax optimization, deduction calculator, and ITR filing assistance',
      icon: Calculator,
      path: '/tax-planner',
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200'
    },
    {
      title: 'Insurance Portfolio',
      description: 'Policy tracking, coverage analysis, and claim management',
      icon: Shield,
      path: '/insurance',
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Retirement Planning',
      description: 'Corpus calculator, goal tracking, and retirement projections',
      icon: TrendingUp,
      path: '/retirement',
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      title: 'Real Estate',
      description: 'Property portfolio, rental income, and mortgage tracking',
      icon: Building2,
      path: '/real-estate',
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Business Management',
      description: 'Invoices, clients, projects, and business analytics',
      icon: Briefcase,
      path: '/business',
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Smart Notifications',
      description: 'Multi-channel alerts, bill reminders, and smart insights',
      icon: Bell,
      path: '/notifications',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Advanced Search',
      description: 'Natural language queries and powerful filtering',
      icon: Search,
      path: '/advanced-search',
      color: 'cyan',
      bgColor: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200'
    },
    {
      title: '📋 Bill of Materials',
      description: 'Track materials, components, costs with links and suppliers',
      icon: ClipboardList,
      path: '/bill-of-materials',
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      badge: 'NEW'
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            New Features Available
          </h2>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
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
                className={`${feature.bgColor} ${feature.borderColor} border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${feature.iconColor} p-2 rounded-lg bg-white shadow-sm`}>
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
                <h3 className="font-bold text-gray-900 mb-1 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
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
