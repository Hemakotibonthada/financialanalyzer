import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const CompliancePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Compliance</h1>
          <p className="text-xl text-gray-600 mb-8">Financial Analyzer is fully compliant with international data protection and financial regulations.</p>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">GDPR Compliant</h3>
                <p className="text-gray-600">Full compliance with European data protection regulations</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">ISO 27001 Certified</h3>
                <p className="text-gray-600">International standard for information security management</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">SOC 2 Type II</h3>
                <p className="text-gray-600">Verified security, availability, and confidentiality controls</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">PCI DSS</h3>
                <p className="text-gray-600">Payment Card Industry Data Security Standard compliance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompliancePage;
