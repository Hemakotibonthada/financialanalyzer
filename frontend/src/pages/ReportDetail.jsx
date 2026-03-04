import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useParams, Link } from 'react-router-dom';
import { financialService } from '../services/api';
import { ArrowLeft, Loader } from 'lucide-react';
import MainLayout from '../components/MainLayout';

const ReportDetail = () => {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
    // Poll for status if processing
    const interval = setInterval(() => {
      if (report?.processingStatus === 'processing') {
        fetchReport();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const fetchReport = async () => {
    try {
      const response = await financialService.getReport(id);
      setReport(response.data.data.report);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-400 mb-4">Report not found</p>
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Report Detail">
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">{report.title}</h1>
            <Link to="/" className="flex items-center text-gray-700 dark:text-slate-300 hover:text-primary-600">
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {report.processingStatus === 'processing' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6 flex items-center">
            <Loader className="w-5 h-5 text-yellow-600 mr-3 animate-spin" />
            <p className="text-yellow-800 dark:text-yellow-400">Analysis in progress... This page will update automatically.</p>
          </div>
        )}

        {report.processingStatus === 'completed' && (
          <div className="space-y-6">
            {/* Health Score */}
            {report.financialHealthScore && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <h2 className="text-xl font-bold mb-4">Financial Health Score</h2>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-green-600">
                      {report.financialHealthScore.overall}
                    </div>
                    <div className="text-gray-600 dark:text-slate-400 mt-2 capitalize">
                      {report.financialHealthScore.rating}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights */}
            {report.aiInsights && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
                <h2 className="text-xl font-bold mb-4">AI Insights</h2>
                <p className="text-gray-700 dark:text-slate-300 mb-4">{report.aiInsights.summary}</p>
                {report.aiInsights.keyFindings && report.aiInsights.keyFindings.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Key Findings:</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
                      {report.aiInsights.keyFindings.map((finding, index) => (
                        <li key={index}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-6">
              <h2 className="text-xl font-bold mb-4">Transaction Summary</h2>
              <p className="text-gray-600 dark:text-slate-400">
                Total Transactions: {report.transactions?.length || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                Detailed charts and analysis - Coming soon
              </p>
            </div>
          </div>
        )}

        {report.processingStatus === 'failed' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Analysis Failed</h2>
            <p className="text-red-700 dark:text-red-300">
              {report.metadata?.error || 'An error occurred during processing'}
            </p>
          </div>
        )}
      </main>
    </div>
    </MainLayout>
  );
};

export default ReportDetail;
