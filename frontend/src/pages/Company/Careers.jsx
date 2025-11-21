import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CareersPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Careers</h1>
          <p className="text-xl text-gray-600 mb-8">Join our team and help revolutionize personal finance management.</p>
          <p className="text-gray-600">Career opportunities coming soon. Check back later!</p>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
