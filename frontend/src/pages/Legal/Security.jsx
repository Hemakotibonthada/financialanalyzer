import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Shield, Key } from 'lucide-react';

const SecurityPage = () => {
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
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Security</h1>
          </div>
          
          <div className="prose max-w-none space-y-8">
            <p className="text-xl text-gray-600">Your security is our top priority. Learn how we protect your financial data.</p>
            
            <div className="grid md:grid-cols-3 gap-6 my-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <Lock className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">256-bit Encryption</h3>
                <p className="text-gray-600">Bank-level encryption for all data in transit and at rest</p>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-6">
                <Key className="w-10 h-10 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Two-Factor Auth</h3>
                <p className="text-gray-600">Extra layer of security with 2FA protection</p>
              </div>
              
              <div className="bg-green-50 rounded-xl p-6">
                <Shield className="w-10 h-10 text-green-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Regular Audits</h3>
                <p className="text-gray-600">Continuous security monitoring and testing</p>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900">Security Features</h2>
            <ul className="space-y-3 text-gray-600">
              <li>• End-to-end encryption for all transactions</li>
              <li>• Secure cloud storage with automatic backups</li>
              <li>• Regular penetration testing and security audits</li>
              <li>• Compliance with industry standards (ISO 27001, SOC 2)</li>
              <li>• Advanced fraud detection and prevention</li>
              <li>• Secure API connections with rate limiting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
