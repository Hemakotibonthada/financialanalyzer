import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Target, Award, Globe } from 'lucide-react';

const AboutPage = () => {
  const navigate = useNavigate();

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

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            About Financial Analyzer
          </h1>
          
          <div className="prose max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              Your trusted partner in financial management since 2020. We're on a mission to make personal finance accessible, intuitive, and powerful for everyone.
            </p>

            <div className="grid md:grid-cols-2 gap-8 my-12">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                <Users className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">50K+ Users</h3>
                <p className="text-gray-600">Trusted by individuals and businesses worldwide</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <Target className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Our Mission</h3>
                <p className="text-gray-600">Empowering financial freedom through intelligent technology</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                <Award className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Award Winning</h3>
                <p className="text-gray-600">Recognized as Top Fintech App 2024</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
                <Globe className="w-12 h-12 text-orange-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Global Reach</h3>
                <p className="text-gray-600">Supporting 12+ currencies and expanding</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">Our Story</h2>
            <p className="text-gray-600 mb-4">
              Founded in 2020, Financial Analyzer was born from a simple idea: personal finance should be simple, secure, and smart. Our founders, experienced technologists and financial experts, saw the gap between complex financial tools and what people actually need.
            </p>
            <p className="text-gray-600 mb-4">
              Today, we serve over 50,000 users globally, helping them track expenses, manage budgets, plan investments, and achieve their financial goals with AI-powered insights.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">Our Values</h2>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <span className="text-blue-600 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Security First:</strong>
                  <span className="text-gray-600"> Bank-level encryption and data protection</span>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-blue-600 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">User-Centric:</strong>
                  <span className="text-gray-600"> Building features that matter to you</span>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-blue-600 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Innovation:</strong>
                  <span className="text-gray-600"> Leveraging AI and machine learning</span>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-blue-600 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Transparency:</strong>
                  <span className="text-gray-600"> Clear pricing, no hidden fees</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
