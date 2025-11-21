import {
  TrendingUp, Shield, Brain, Target, PieChart, CreditCard,
  Bell, Search, Calculator, Briefcase, Home, Users,
  BarChart3, DollarSign, Wallet, Award, RefreshCw,
  Zap, Globe, Lock, Cloud, Download,
  Activity, Heart, Sparkles, Lightbulb, TrendingDown, FileText, Upload
} from 'lucide-react';

export const heroFeatures = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Machine learning algorithms analyze your spending patterns and provide personalized recommendations',
    color: 'from-purple-500 to-pink-500',
    stats: '95% Accuracy'
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Enterprise-grade encryption, 2FA authentication, and secure data storage keep your finances safe',
    color: 'from-blue-500 to-cyan-500',
    stats: '256-bit Encryption'
  },
  {
    icon: TrendingUp,
    title: 'Real-Time Analytics',
    description: 'Track expenses, income, and investments with live updates and interactive dashboards',
    color: 'from-green-500 to-emerald-500',
    stats: 'Live Updates'
  },
  {
    icon: Target,
    title: 'Goal Planning',
    description: 'Set and achieve financial goals with smart tracking, milestones, and progress visualization',
    color: 'from-orange-500 to-red-500',
    stats: 'Smart Tracking'
  },
  {
    icon: Calculator,
    title: 'Tax Planning',
    description: 'Optimize deductions, track tax documents, and plan for tax season with intelligent calculations',
    color: 'from-indigo-500 to-purple-500',
    stats: 'Auto Calculations'
  },
  {
    icon: Briefcase,
    title: 'Business Management',
    description: 'Track business expenses, manage payroll, generate invoices, and monitor cash flow',
    color: 'from-pink-500 to-rose-500',
    stats: 'Full Suite'
  }
];

export const allFeatures = [
  // Core Financial Management
  { icon: PieChart, title: 'Dashboard', desc: 'Comprehensive overview of your finances with real-time insights', category: 'Core', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=80' },
  { icon: TrendingUp, title: 'Budget Tracking', desc: 'Smart budget allocation, monitoring, and spending limits', category: 'Core', image: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&h=600&fit=crop&q=80' },
  { icon: CreditCard, title: 'EMI Tracker', desc: 'Track all EMIs, loans, and installment payments in one place', category: 'Core', image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&h=600&fit=crop&q=80' },
  { icon: Wallet, title: 'Net Worth Tracker', desc: 'Monitor total assets, liabilities, and net worth growth', category: 'Core', image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop&q=80' },
  { icon: Bell, title: 'Bill Reminders', desc: 'Never miss a payment with smart alerts and notifications', category: 'Core', image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&h=600&fit=crop&q=80' },
  { icon: DollarSign, title: 'Quick Expense Entry', desc: 'Add expenses in seconds with voice input support', category: 'Core', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop&q=80' },
  { icon: Target, title: 'Financial Goals', desc: 'Set and achieve savings goals with milestone tracking', category: 'Core', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&q=80' },
  
  // Investment & Portfolio
  { icon: Target, title: 'Investment Portfolio', desc: 'Monitor stocks, mutual funds, bonds, and crypto investments', category: 'Investments', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop&q=80' },
  { icon: BarChart3, title: 'Portfolio Analytics', desc: 'Advanced analytics with performance tracking and allocation', category: 'Investments', image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop&q=80' },
  { icon: TrendingUp, title: 'Market Insights', desc: 'Real-time market data and investment recommendations', category: 'Investments', image: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800&h=600&fit=crop&q=80' },
  
  // Business & Professional
  { icon: Briefcase, title: 'Company Expenses', desc: 'Track business transactions, receipts, and tax-deductible expenses', category: 'Business', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80' },
  { icon: Briefcase, title: 'Business Dashboard', desc: 'Manage invoices, payroll, vendors, and cash flow', category: 'Business', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80' },
  { icon: Users, title: 'Lender Dashboard', desc: 'Manage loans given to others with repayment tracking', category: 'Business', image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop&q=80' },
  
  // Planning & Analysis
  { icon: Calculator, title: 'Tax Planner', desc: 'Optimize deductions, track documents, and plan for tax season', category: 'Planning', image: 'https://images.unsplash.com/photo-1554224311-beee460c201f?w=800&h=600&fit=crop&q=80' },
  { icon: TrendingUp, title: 'Retirement Planner', desc: 'Plan for secure retirement with savings projections', category: 'Planning', image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop&q=80' },
  { icon: Shield, title: 'Insurance Manager', desc: 'Track all insurance policies, premiums, and claims', category: 'Planning', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80' },
  { icon: Target, title: 'Debt Management', desc: 'Debt consolidation strategies and payoff planning', category: 'Planning', image: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=800&h=600&fit=crop&q=80' },
  
  // Real Estate & Assets
  { icon: Home, title: 'Real Estate', desc: 'Manage property investments, mortgages, and rental income', category: 'Assets', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop&q=80' },
  { icon: Home, title: 'Property Analytics', desc: 'Track property values, ROI, and market trends', category: 'Assets', image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=600&fit=crop&q=80' },
  
  // AI & Intelligence
  { icon: Brain, title: 'AI-Powered Insights', desc: 'Machine learning recommendations for smarter spending', category: 'AI', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop&q=80' },
  { icon: Brain, title: 'ML Dashboard', desc: 'Advanced predictive analytics and financial forecasting', category: 'AI', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=600&fit=crop&q=80' },
  { icon: Sparkles, title: 'Spending Insights', desc: 'AI-driven analysis of spending patterns and trends', category: 'AI', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=80' },
  { icon: Lightbulb, title: 'Smart Recommendations', desc: 'Personalized suggestions to optimize your finances', category: 'AI', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&h=600&fit=crop&q=80' },
  
  // Health & Monitoring
  { icon: Heart, title: 'Financial Health', desc: 'Comprehensive health score with actionable improvements', category: 'Health', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop&q=80' },
  { icon: Activity, title: 'Credit Score Monitor', desc: 'Track and improve your credit score over time', category: 'Health', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop&q=80' },
  { icon: TrendingDown, title: 'Spending Analysis', desc: 'Deep dive into spending categories and patterns', category: 'Health', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80' },
  
  // Documents & Data
  { icon: FileText, title: 'Document Manager', desc: 'Secure storage for bills, receipts, and statements', category: 'Data', image: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&h=600&fit=crop&q=80' },
  { icon: Upload, title: 'CSV Import/Export', desc: 'Import from banks, export to Excel, CSV formats', category: 'Data', image: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=800&h=600&fit=crop&q=80' },
  { icon: Download, title: 'Report Generator', desc: 'Generate detailed financial reports and summaries', category: 'Data', image: 'https://images.unsplash.com/photo-1554224311-beee460c201f?w=800&h=600&fit=crop&q=80' },
  { icon: Search, title: 'Advanced Search', desc: 'Find any transaction instantly with smart filters', category: 'Data', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80' },
  
  // Security & Notifications
  { icon: Shield, title: 'Bank-Level Security', desc: '256-bit encryption, 2FA, and secure data storage', category: 'Security', image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&h=600&fit=crop&q=80' },
  { icon: Lock, title: 'Password Protection', desc: 'Document encryption and access control', category: 'Security', image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=600&fit=crop&q=80' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Customizable alerts for bills, goals, and anomalies', category: 'Security', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop&q=80' },
  
  // Additional Features
  { icon: Globe, title: 'Multi-Currency Support', desc: 'Support for 12+ currencies with live exchange rates', category: 'Global', image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop&q=80' },
  { icon: Cloud, title: 'Cloud Sync', desc: 'Access your data anywhere with automatic cloud backup', category: 'Global', image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=600&fit=crop&q=80' },
  { icon: RefreshCw, title: 'Auto-Backup', desc: 'Never lose financial data with automated backups', category: 'Global', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop&q=80' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep insights with interactive charts and graphs', category: 'Analytics', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=80' },
  { icon: Zap, title: 'Real-Time Updates', desc: 'Live data synchronization across all devices', category: 'Analytics', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80' }
];

export const stats = [
  { value: '50K+', label: 'Active Users' },
  { value: '₹500Cr+', label: 'Money Tracked' },
  { value: '1M+', label: 'Transactions' },
  { value: '99.9%', label: 'Uptime' }
];

export const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Small Business Owner',
    image: '👩‍💼',
    text: 'This app transformed how I manage my business finances. The company expenses feature is a game-changer!',
    rating: 5
  },
  {
    name: 'Rahul Verma',
    role: 'Software Engineer',
    image: '👨‍💻',
    text: 'Best financial app I\'ve used. The AI insights helped me save ₹50,000 in just 3 months!',
    rating: 5
  },
  {
    name: 'Anjali Patel',
    role: 'Doctor',
    image: '👩‍⚕️',
    text: 'EMI tracking and bill reminders ensure I never miss a payment. Highly recommended!',
    rating: 5
  }
];

export const featureCategories = [
  { name: 'Core', title: '🎯 Core Features', color: 'from-blue-500 to-cyan-500' },
  { name: 'Investments', title: '📈 Investment & Portfolio', color: 'from-green-500 to-emerald-500' },
  { name: 'Business', title: '💼 Business & Professional', color: 'from-purple-500 to-pink-500' },
  { name: 'Planning', title: '📊 Planning & Analysis', color: 'from-orange-500 to-red-500' },
  { name: 'AI', title: '🤖 AI & Intelligence', color: 'from-violet-500 to-purple-500' },
  { name: 'Health', title: '❤️ Financial Health', color: 'from-rose-500 to-pink-500' },
  { name: 'Data', title: '📁 Documents & Data', color: 'from-indigo-500 to-blue-500' },
  { name: 'Security', title: '🔒 Security & Privacy', color: 'from-gray-700 to-gray-900' },
  { name: 'Global', title: '🌍 Global Features', color: 'from-teal-500 to-cyan-500' },
  { name: 'Analytics', title: '📊 Advanced Analytics', color: 'from-amber-500 to-orange-500' },
  { name: 'Assets', title: '🏠 Real Estate & Assets', color: 'from-lime-500 to-green-500' }
];
