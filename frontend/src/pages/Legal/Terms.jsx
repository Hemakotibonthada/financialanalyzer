import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center space-x-4 mb-6">
            <FileText className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Terms of Service</h1>
          </div>
          <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>
          
          <div className="prose max-w-none space-y-6 text-gray-600">
            <p>Welcome to Financial Analyzer. By using our services, you agree to these terms and conditions.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">Acceptance of Terms</h2>
            <p>By accessing and using Financial Analyzer, you accept and agree to be bound by these Terms of Service.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">User Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account and password, and for restricting access to your devices.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">Service Description</h2>
            <p>Financial Analyzer provides personal finance management tools, including expense tracking, budgeting, investment monitoring, and AI-powered insights.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">Limitation of Liability</h2>
            <p>We strive for accuracy but cannot guarantee that all information is error-free. Use our service at your own discretion.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
