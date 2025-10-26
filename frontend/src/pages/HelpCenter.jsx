import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, ChevronDown, ChevronRight, BookOpen, HelpCircle, 
  Phone, Mail, MessageCircle, Video, FileText, Zap,
  DollarSign, CreditCard, Target, PieChart, Shield, Users
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Zap,
      color: 'blue',
      articles: [
        { title: 'How to create your account', views: '2.5k' },
        { title: 'Setting up your profile', views: '1.8k' },
        { title: 'First time dashboard tour', views: '3.2k' },
        { title: 'Connecting your Gmail account', views: '1.5k' },
        { title: 'Understanding the interface', views: '2.1k' }
      ]
    },
    {
      id: 'transactions',
      title: 'Transactions & Expenses',
      icon: DollarSign,
      color: 'green',
      articles: [
        { title: 'Importing bank statements', views: '4.2k' },
        { title: 'Manual transaction entry', views: '1.9k' },
        { title: 'Categorizing transactions', views: '2.7k' },
        { title: 'Editing and deleting transactions', views: '1.3k' },
        { title: 'Searching transaction history', views: '2.4k' }
      ]
    },
    {
      id: 'emi-loans',
      title: 'EMI & Loans',
      icon: CreditCard,
      color: 'yellow',
      articles: [
        { title: 'Adding a new EMI', views: '3.1k' },
        { title: 'Tracking loan payments', views: '2.8k' },
        { title: 'Understanding interest calculations', views: '1.7k' },
        { title: 'Setting up payment reminders', views: '1.4k' },
        { title: 'EMI graphs and analytics', views: '2.2k' }
      ]
    },
    {
      id: 'investments',
      title: 'Investment Portfolio',
      icon: PieChart,
      color: 'purple',
      articles: [
        { title: 'Adding investments', views: '2.9k' },
        { title: 'Tracking returns and performance', views: '3.5k' },
        { title: 'Portfolio allocation', views: '2.1k' },
        { title: 'Investment goals', views: '1.8k' },
        { title: 'Real-time value updates', views: '2.6k' }
      ]
    },
    {
      id: 'goals',
      title: 'Financial Goals',
      icon: Target,
      color: 'orange',
      articles: [
        { title: 'Creating financial goals', views: '2.3k' },
        { title: 'Tracking progress', views: '1.9k' },
        { title: 'Setting realistic targets', views: '1.5k' },
        { title: 'Goal categories and priorities', views: '1.2k' }
      ]
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: Shield,
      color: 'red',
      articles: [
        { title: 'Account security best practices', views: '4.1k' },
        { title: 'Enabling two-factor authentication', views: '3.3k' },
        { title: 'Managing connected accounts', views: '2.2k' },
        { title: 'Data privacy and protection', views: '2.8k' },
        { title: 'Understanding permissions', views: '1.6k' }
      ]
    }
  ];

  const quickLinks = [
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step guides',
      icon: Video,
      color: 'blue',
      link: '/tutorials'
    },
    {
      title: 'API Documentation',
      description: 'For developers',
      icon: FileText,
      color: 'purple',
      link: '/docs'
    },
    {
      title: 'Contact Support',
      description: 'Get personalized help',
      icon: Phone,
      color: 'green',
      link: '/contact'
    },
    {
      title: 'Community Forum',
      description: 'Connect with users',
      icon: Users,
      color: 'orange',
      link: '/community'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      purple: 'bg-purple-100 text-purple-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      <Sidebar />
      <div className="lg:ml-72 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <HelpCircle className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
              <p className="text-xl text-blue-100 mb-8">
                Search our knowledge base or browse categories below
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for help articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                to={link.link}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${getColorClasses(link.color)}`}>
                  <link.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{link.title}</h3>
                <p className="text-sm text-gray-600">{link.description}</p>
              </Link>
            ))}
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {categories.map((category) => {
                const Icon = category.icon;
                const isExpanded = expandedCategory === category.id;
                
                return (
                  <div key={category.id}>
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(category.color)}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900">{category.title}</h3>
                          <p className="text-sm text-gray-500">{category.articles.length} articles</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50">
                        <div className="space-y-2">
                          {category.articles.map((article, index) => (
                            <Link
                              key={index}
                              to={`/help/article/${category.id}/${index}`}
                              className="flex items-center justify-between p-3 hover:bg-white rounded-lg transition-colors group"
                            >
                              <div className="flex items-center space-x-3">
                                <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                <span className="text-gray-700 group-hover:text-blue-600">{article.title}</span>
                              </div>
                              <span className="text-xs text-gray-500">{article.views} views</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
            <p className="text-blue-100 mb-6">
              Our support team is here to assist you 24/7
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <Phone className="w-5 h-5 mr-2" />
                Contact Support
              </Link>
              <Link
                to="/chat"
                className="inline-flex items-center px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Live Chat
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-600">
            <p className="mb-2">© 2025 Circuvent Technologies. All rights reserved.</p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <Link to="/terms" className="hover:text-blue-600">Terms of Service</Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
              <span>•</span>
              <Link to="/docs" className="hover:text-blue-600">Documentation</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpCenter;
