import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, Shield, Brain, Target, PieChart, CreditCard, 
  Bell, Search, Calculator, Briefcase, Home, Users, 
  BarChart3, DollarSign, Wallet, Award, RefreshCw, 
  Zap, Globe, Lock, Cloud, Download, CheckCircle,
  ArrowRight, Star, PlayCircle, Menu, X
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
    { icon: PieChart, title: 'Budget Tracking', desc: 'Smart budget allocation and monitoring' },
    { icon: CreditCard, title: 'EMI Management', desc: 'Track all loans and EMIs in one place' },
    { icon: Bell, title: 'Bill Reminders', desc: 'Never miss a payment with smart alerts' },
    { icon: Home, title: 'Real Estate', desc: 'Manage property investments and mortgages' },
    { icon: Award, title: 'Credit Score', desc: 'Monitor and improve your credit health' },
    { icon: Users, title: 'Lender Dashboard', desc: 'Manage loans given to others' },
    { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep insights into spending patterns' },
    { icon: Wallet, title: 'Net Worth Tracker', desc: 'Track assets and liabilities' },
    { icon: Target, title: 'Investment Portfolio', desc: 'Monitor stocks, mutual funds, and more' },
    { icon: Shield, title: 'Insurance Manager', desc: 'Track all insurance policies' },
    { icon: Calculator, title: 'Retirement Planner', desc: 'Plan for a secure future' },
    { icon: Search, title: 'Advanced Search', desc: 'Find any transaction instantly' },
    { icon: Globe, title: 'Multi-Currency', desc: 'Support for 12+ currencies' },
    { icon: Cloud, title: 'Cloud Sync', desc: 'Access data anywhere, anytime' },
    { icon: RefreshCw, title: 'Auto-Backup', desc: 'Never lose your financial data' },
    { icon: Zap, title: 'Quick Entry', desc: 'Add expenses in seconds' }
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
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition">Pricing</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition">Reviews</a>
              <button 
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition transform hover:scale-105"
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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium">
                <Star className="w-4 h-4" />
                <span>Trusted by 50,000+ users</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Take Control of Your
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Financial Future</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                All-in-one platform to track expenses, manage budgets, plan investments, and achieve financial goals with AI-powered insights.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('/register')}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition transform hover:scale-105 flex items-center justify-center space-x-2 text-lg font-semibold"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-600 hover:text-blue-600 transition flex items-center justify-center space-x-2 text-lg font-semibold">
                  <PlayCircle className="w-5 h-5" />
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

      {/* All Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Money
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed for individuals, families, and businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl p-6 hover:shadow-xl transition transform hover:-translate-y-1 cursor-pointer border border-gray-100"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </div>
              );
            })}
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
