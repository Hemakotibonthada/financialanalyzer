import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, Shield, Brain, Target, PieChart, CreditCard, 
  Bell, Search, Calculator, Briefcase, Home, Users, 
  BarChart3, DollarSign, Wallet, Award, RefreshCw, 
  Zap, Globe, Lock, Cloud, Download, CheckCircle,
  ArrowRight, Star, PlayCircle, Menu, X, Upload, FileText,
  Activity, Heart, Sparkles, Lightbulb, TrendingDown
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate features showcase
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
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

  const allFeatures = [
    // Core Financial Management
    { icon: PieChart, title: 'Dashboard', desc: 'Comprehensive overview of your finances with real-time insights', category: 'Core' },
    { icon: TrendingUp, title: 'Budget Tracking', desc: 'Smart budget allocation, monitoring, and spending limits', category: 'Core' },
    { icon: CreditCard, title: 'EMI Tracker', desc: 'Track all EMIs, loans, and installment payments in one place', category: 'Core' },
    { icon: Wallet, title: 'Net Worth Tracker', desc: 'Monitor total assets, liabilities, and net worth growth', category: 'Core' },
    { icon: Bell, title: 'Bill Reminders', desc: 'Never miss a payment with smart alerts and notifications', category: 'Core' },
    { icon: DollarSign, title: 'Quick Expense Entry', desc: 'Add expenses in seconds with voice input support', category: 'Core' },
    { icon: Target, title: 'Financial Goals', desc: 'Set and achieve savings goals with milestone tracking', category: 'Core' },
    
    // Investment & Portfolio
    { icon: Target, title: 'Investment Portfolio', desc: 'Monitor stocks, mutual funds, bonds, and crypto investments', category: 'Investments' },
    { icon: BarChart3, title: 'Portfolio Analytics', desc: 'Advanced analytics with performance tracking and allocation', category: 'Investments' },
    { icon: TrendingUp, title: 'Market Insights', desc: 'Real-time market data and investment recommendations', category: 'Investments' },
    
    // Business & Professional
    { icon: Briefcase, title: 'Company Expenses', desc: 'Track business transactions, receipts, and tax-deductible expenses', category: 'Business' },
    { icon: Briefcase, title: 'Business Dashboard', desc: 'Manage invoices, payroll, vendors, and cash flow', category: 'Business' },
    { icon: Users, title: 'Lender Dashboard', desc: 'Manage loans given to others with repayment tracking', category: 'Business' },
    
    // Planning & Analysis
    { icon: Calculator, title: 'Tax Planner', desc: 'Optimize deductions, track documents, and plan for tax season', category: 'Planning' },
    { icon: TrendingUp, title: 'Retirement Planner', desc: 'Plan for secure retirement with savings projections', category: 'Planning' },
    { icon: Shield, title: 'Insurance Manager', desc: 'Track all insurance policies, premiums, and claims', category: 'Planning' },
    { icon: Target, title: 'Debt Management', desc: 'Debt consolidation strategies and payoff planning', category: 'Planning' },
    
    // Real Estate & Assets
    { icon: Home, title: 'Real Estate', desc: 'Manage property investments, mortgages, and rental income', category: 'Assets' },
    { icon: Home, title: 'Property Analytics', desc: 'Track property values, ROI, and market trends', category: 'Assets' },
    
    // AI & Intelligence
    { icon: Brain, title: 'AI-Powered Insights', desc: 'Machine learning recommendations for smarter spending', category: 'AI' },
    { icon: Brain, title: 'ML Dashboard', desc: 'Advanced predictive analytics and financial forecasting', category: 'AI' },
    { icon: Sparkles, title: 'Spending Insights', desc: 'AI-driven analysis of spending patterns and trends', category: 'AI' },
    { icon: Lightbulb, title: 'Smart Recommendations', desc: 'Personalized suggestions to optimize your finances', category: 'AI' },
    
    // Health & Monitoring
    { icon: Heart, title: 'Financial Health', desc: 'Comprehensive health score with actionable improvements', category: 'Health' },
    { icon: Activity, title: 'Credit Score Monitor', desc: 'Track and improve your credit score over time', category: 'Health' },
    { icon: TrendingDown, title: 'Spending Analysis', desc: 'Deep dive into spending categories and patterns', category: 'Health' },
    
    // Documents & Data
    { icon: FileText, title: 'Document Manager', desc: 'Secure storage for bills, receipts, and statements', category: 'Data' },
    { icon: Upload, title: 'CSV Import/Export', desc: 'Import from banks, export to Excel, CSV formats', category: 'Data' },
    { icon: Download, title: 'Report Generator', desc: 'Generate detailed financial reports and summaries', category: 'Data' },
    { icon: Search, title: 'Advanced Search', desc: 'Find any transaction instantly with smart filters', category: 'Data' },
    
    // Security & Notifications
    { icon: Shield, title: 'Bank-Level Security', desc: '256-bit encryption, 2FA, and secure data storage', category: 'Security' },
    { icon: Lock, title: 'Password Protection', desc: 'Document encryption and access control', category: 'Security' },
    { icon: Bell, title: 'Smart Notifications', desc: 'Customizable alerts for bills, goals, and anomalies', category: 'Security' },
    
    // Additional Features
    { icon: Globe, title: 'Multi-Currency Support', desc: 'Support for 12+ currencies with live exchange rates', category: 'Global' },
    { icon: Cloud, title: 'Cloud Sync', desc: 'Access your data anywhere with automatic cloud backup', category: 'Global' },
    { icon: RefreshCw, title: 'Auto-Backup', desc: 'Never lose financial data with automated backups', category: 'Global' },
    { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep insights with interactive charts and graphs', category: 'Analytics' },
    { icon: Zap, title: 'Real-Time Updates', desc: 'Live data synchronization across all devices', category: 'Analytics' }
  ];

  const stats = [
    { value: '50K+', label: 'Active Users' },
    { value: '₹500Cr+', label: 'Money Tracked' },
    { value: '1M+', label: 'Transactions' },
    { value: '99.9%', label: 'Uptime' }
  ];

  const testimonials = [
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Financial Analyzer
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-baseline gap-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base">
                Features
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base">
                Pricing
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base">
                Reviews
              </a>
              <button 
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors text-base"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105 font-medium text-base"
              >
                Get Started Free
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-700 hover:text-blue-600">Features</a>
              <a href="#pricing" className="block text-gray-700 hover:text-blue-600">Pricing</a>
              <a href="#testimonials" className="block text-gray-700 hover:text-blue-600">Reviews</a>
              <button 
                onClick={() => navigate('/login')}
                className="block w-full text-left text-blue-600 font-medium"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="block w-full px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-center"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer">
                <Star className="w-4 h-4 animate-pulse" />
                <span>Trusted by 50,000+ users</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                <span className="inline-block">Take Control of Your</span>
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x"> Financial Future</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                All-in-one platform to track expenses, manage budgets, plan investments, and achieve financial goals with AI-powered insights.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('/register')}
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 flex items-center justify-center space-x-2 text-lg font-semibold relative overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative">Start Free Trial</span>
                  <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button className="group px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-600 hover:text-blue-600 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 text-lg font-semibold">
                  <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Watch Demo</span>
                </button>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Free for 30 days</span>
                </div>
              </div>
            </div>

            {/* Animated Feature Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition duration-500">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className={`transition-all duration-500 ${
                        activeFeature === index ? 'opacity-100' : 'opacity-0 absolute inset-0 p-8'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-gray-600 mb-4">{feature.description}</p>
                      <div className="flex items-center space-x-2 text-sm font-semibold">
                        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${feature.color} text-white`}>
                          {feature.stats}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Feature Dots */}
                <div className="flex justify-center space-x-2 mt-8">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      className={`w-2 h-2 rounded-full transition ${
                        activeFeature === index ? 'bg-blue-600 w-8' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute -bottom-8 left-8 right-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl p-6">
                <div className="grid grid-cols-3 gap-4 text-white text-center">
                  <div>
                    <div className="text-2xl font-bold">50K+</div>
                    <div className="text-sm opacity-90">Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">1M+</div>
                    <div className="text-sm opacity-90">Transactions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">4.9★</div>
                    <div className="text-sm opacity-90">Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Features Grid - Categorized */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Financial Management Suite
            </h2>
            <p className="text-xl text-gray-600">
              45+ powerful features designed for individuals, families, and businesses
            </p>
          </div>

          {/* Feature Categories */}
          {[
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
          ].map((category) => {
            const categoryFeatures = allFeatures.filter(f => f.category === category.name);
            if (categoryFeatures.length === 0) return null;

            return (
              <div key={category.name} className="mb-12">
                <div className="mb-6">
                  <h3 className={`text-2xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent inline-block`}>
                    {category.title}
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categoryFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div 
                        key={index}
                        className="bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100 group"
                      >
                        {/* Image/Visual Section */}
                        <div className={`relative h-40 bg-gradient-to-br ${category.color} overflow-hidden`}>
                          {/* Animated Background Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                              backgroundSize: '20px 20px'
                            }}></div>
                          </div>
                          
                          {/* Large Icon with Animation */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                              <Icon className="w-20 h-20 text-white relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            </div>
                          </div>
                          
                          {/* Decorative Elements */}
                          <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/10 rounded-lg group-hover:rotate-45 transition-transform duration-500"></div>
                        </div>
                        
                        {/* Content Section */}
                        <div className="p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {feature.desc}
                          </p>
                          
                          {/* Learn More Link */}
                          <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Learn more</span>
                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Feature Summary */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">And Much More!</h3>
            <p className="text-lg mb-6 opacity-90">
              Recurring transactions, subscription tracking, expense categorization, income management, 
              savings calculators, loan comparisons, investment analysis, cash flow forecasting, and more...
            </p>
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:shadow-xl transition transform hover:scale-105 font-semibold"
            >
              Explore All Features →
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Thousands of Users
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{testimonial.image}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that's right for you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-600 transition">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-6">
                ₹0<span className="text-lg text-gray-600">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Up to 100 transactions</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Local storage</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                Get Started
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white transform scale-105 shadow-2xl">
              <div className="bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">
                ₹299<span className="text-lg opacity-90">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Unlimited transactions</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>AI-powered insights</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Cloud sync</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Priority support</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-white text-blue-600 rounded-lg hover:shadow-lg transition font-semibold"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-purple-600 transition">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-gray-900 mb-6">
                Custom
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Multi-user access</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>API access</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <button className="w-full py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition font-semibold">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Financial Life?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 50,000+ users who are already taking control of their finances
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:shadow-2xl transition transform hover:scale-105 flex items-center justify-center space-x-2 text-lg font-semibold"
            >
              <span>Start Your Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white hover:text-blue-600 transition flex items-center justify-center space-x-2 text-lg font-semibold">
              <Download className="w-5 h-5" />
              <span>Download App</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">Financial Analyzer</span>
              </div>
              <p className="text-gray-400">
                Your trusted partner for complete financial management
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 Financial Analyzer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
