import React from 'react';
import { Link } from 'react-router-dom';

const Reports = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All Reports</h1>
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            Back to Dashboard
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Reports list - Coming soon</p>
          <p className="text-sm text-gray-500 mt-2">
            This page will display all financial analysis reports with filtering and sorting options.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
