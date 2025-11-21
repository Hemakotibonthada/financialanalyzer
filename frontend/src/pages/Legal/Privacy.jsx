import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPage = () => {
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
            <Shield className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Privacy Policy</h1>
          </div>
          <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>
          
          <div className="prose max-w-none space-y-6 text-gray-600">
            <p>At Financial Analyzer, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal and financial information.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">Information We Collect</h2>
            <p>We collect information you provide directly, including account details, financial transactions, and usage data to improve our services.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">How We Use Your Information</h2>
            <p>Your data is used to provide personalized financial insights, secure your account, and improve our services. We never sell your personal information.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">Data Security</h2>
            <p>We employ bank-level 256-bit encryption, secure cloud storage, and regular security audits to protect your data.</p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8">Your Rights</h2>
            <p>You have the right to access, modify, or delete your data at any time. Contact us for data requests.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
