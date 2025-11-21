import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Calendar } from 'lucide-react';

const UpdatesPage = () => {
  const navigate = useNavigate();

  const updates = [
    {
      version: 'v2.5.0',
      date: 'January 2025',
      title: 'Enhanced AI Insights & Analytics',
      features: [
        'Advanced ML predictions for spending patterns',
        'Improved financial health scoring algorithm',
        'New portfolio analytics dashboard',
        'Enhanced EMI tracking with foreclosure calculator'
      ]
    },
    {
      version: 'v2.4.0',
      date: 'December 2024',
      title: 'Business Features & Document Management',
      features: [
        'Company expenses tracking',
        'Password-protected document storage',
        'Multi-currency support expanded',
        'Advanced report generation'
      ]
    },
    {
      version: 'v2.3.0',
      date: 'November 2024',
      title: 'Investment & Planning Tools',
      features: [
        'Investment portfolio tracker',
        'Retirement planning calculator',
        'Tax planning dashboard',
        'Bill reminders and notifications'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>

        <div className="mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Latest Updates
          </h1>
          <p className="text-xl text-gray-600">
            Stay updated with the latest features and improvements
          </p>
        </div>

        <div className="space-y-6">
          {updates.map((update, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{update.title}</h2>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mt-2">
                      {update.version}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Calendar className="w-5 h-5" />
                  <span>{update.date}</span>
                </div>
              </div>
              
              <ul className="space-y-3 mt-6">
                {update.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpdatesPage;
