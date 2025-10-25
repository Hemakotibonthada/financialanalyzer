import React from 'react';
import SpendingDashboard from '../components/SpendingDashboard';
import DocumentSummary from '../components/DocumentSummary';

const Analyzer = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Real Aggregated Data from ALL Documents */}
        <DocumentSummary />
        
        {/* Divider */}
        <div className="my-12 border-t border-gray-300"></div>
        
        {/* Detailed Dashboard with Upload and Charts */}
        <SpendingDashboard />
      </div>
    </div>
  );
};

export default Analyzer;
