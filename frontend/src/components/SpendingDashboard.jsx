import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Calendar, Upload, TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SpendingDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [activeTimeFrame, setActiveTimeFrame] = useState('3months');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadPassword, setUploadPassword] = useState('');
  
  // WebSocket integration
  const { isConnected, documentUpdates, analysisProgress, clearDocumentUpdate, clearAnalysisProgress } = useWebSocket();

  const timeFrames = {
    '1month': { label: '1 Month', months: 1 },
    '3months': { label: '3 Months', months: 3 },
    '6months': { label: '6 Months', months: 6 },
    '1year': { label: '1 Year', months: 12 }
  };

  // Dropzone for file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 10,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: handleFileUpload
  });

  useEffect(() => {
    loadData();
  }, [activeTimeFrame]);

  // Listen for document processing updates and refresh data
  useEffect(() => {
    const completedUpdates = Object.values(documentUpdates).filter(
      update => update.status === 'completed'
    );
    
    if (completedUpdates.length > 0) {
      // Auto-refresh data when documents are processed
      setTimeout(() => {
        loadData();
        // Clear completed updates
        completedUpdates.forEach(update => {
          clearDocumentUpdate(update.documentId);
        });
      }, 1000);
    }
  }, [documentUpdates, clearDocumentUpdate]);

  // Listen for analysis completion and refresh analysis data
  useEffect(() => {
    const completedAnalyses = Object.values(analysisProgress).filter(
      progress => progress.progress === 100
    );
    
    if (completedAnalyses.length > 0) {
      // Auto-refresh when analysis completes
      setTimeout(() => {
        completedAnalyses.forEach(progress => {
          // Update analysis state with the completed analysis
          if (progress.report) {
            setAnalysis(progress.report);
          }
          clearAnalysisProgress(progress.analysisId);
        });
      }, 1000);
    }
  }, [analysisProgress, clearAnalysisProgress]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - timeFrames[activeTimeFrame].months);

      // Load transactions, analytics, and monthly trends in parallel
      const [transactionsRes, analyticsRes, trendsRes, documentsRes] = await Promise.all([
        api.get('/financial/transactions', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 100
          }
        }),
        api.get('/financial/analytics/spending-by-category', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }),
        api.get('/financial/analytics/monthly-trends', {
          params: { months: timeFrames[activeTimeFrame].months }
        }),
        api.get('/documents', { params: { limit: 20 } })
      ]);

      setTransactions(transactionsRes.data.transactions || []);
      setAnalytics(analyticsRes.data);
      setMonthlyTrends(trendsRes.data.data || []);
      setDocuments(documentsRes.data.documents || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load dashboard data' });
    } finally {
      setLoading(false);
    }
  };

  async function handleFileUpload(acceptedFiles) {
    if (acceptedFiles.length === 0) return;

    try {
      setMessage({ type: 'info', text: 'Uploading documents...' });
      
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('documents', file);
      });
      
      // Add password if provided
      if (uploadPassword && uploadPassword.trim()) {
        formData.append('password', uploadPassword.trim());
      }

      const uploadResponse = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadResponse.data.success) {
        setMessage({ 
          type: 'success', 
          text: `${acceptedFiles.length} documents uploaded successfully. Processing...` 
        });

        // Clear password after successful upload
        setUploadPassword('');

        // Process documents
        const documentIds = uploadResponse.data.documents.map(doc => doc.id);
        await processDocuments(documentIds);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setMessage({ type: 'error', text: 'Failed to upload documents' });
    }
  }

  const processDocuments = async (documentIds) => {
    try {
      const response = await api.post('/documents/batch-process', {
        documentIds
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Processed ${response.data.summary.processed} documents with ${response.data.summary.totalTransactions} transactions` 
        });
        loadData(); // Refresh data
      }
    } catch (error) {
      console.error('Error processing documents:', error);
      setMessage({ type: 'error', text: 'Failed to process documents' });
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setMessage({ type: 'info', text: 'Running comprehensive financial analysis...' });

      const response = await api.post('/financial/analyze-all', {
        dateRange: {
          startDate: new Date(Date.now() - timeFrames[activeTimeFrame].months * 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      });

      if (response.data.success) {
        const analysisId = response.data.analysisId;
        
        // Poll for analysis completion
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await api.get(`/financial/reports/${analysisId}`);
            
            if (statusRes.data.success && statusRes.data.data.report.status === 'completed') {
              clearInterval(pollInterval);
              setAnalysis(statusRes.data.data.report);
              setMessage({ type: 'success', text: 'Analysis completed successfully!' });
              setAnalyzing(false);
            } else if (statusRes.data.data.report.status === 'failed') {
              clearInterval(pollInterval);
              setMessage({ type: 'error', text: 'Analysis failed. Please try again.' });
              setAnalyzing(false);
            }
          } catch (pollError) {
            console.error('Error polling analysis status:', pollError);
          }
        }, 3000);

        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (analyzing) {
            setAnalyzing(false);
            setMessage({ type: 'error', text: 'Analysis timed out. Please try again.' });
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      setMessage({ type: 'error', text: 'Failed to start analysis' });
      setAnalyzing(false);
    }
  };

  // Chart configurations
  const spendingByCategory = analytics?.data ? {
    labels: analytics.data.map(item => item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
    datasets: [{
      data: analytics.data.map(item => item.amount),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  } : null;

  const monthlyTrendData = monthlyTrends.length > 0 ? {
    labels: monthlyTrends.map(trend => trend.month),
    datasets: [
      {
        label: 'Income',
        data: monthlyTrends.map(trend => trend.income),
        borderColor: '#4BC0C0',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Expenses',
        data: monthlyTrends.map(trend => trend.expenses),
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Net Savings',
        data: monthlyTrends.map(trend => trend.net),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.4,
        fill: false
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Spending Analysis Dashboard</h1>
              {/* Real-time connection indicator */}
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                isConnected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    <span>Offline</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-600">
              Comprehensive financial insights and spending patterns
              {isConnected && <span className="text-green-600"> • Real-time updates enabled</span>}
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* Time Frame Selector */}
            <select
              value={activeTimeFrame}
              onChange={(e) => setActiveTimeFrame(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(timeFrames).map(([key, frame]) => (
                <option key={key} value={key}>{frame.label}</option>
              ))}
            </select>
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  <span>Run Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 mr-2" />
              ) : (
                <TrendingUp className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Financial Documents</h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? 'Drop files here...' : 'Upload Financial Documents'}
            </p>
            <p className="text-gray-500">
              Drag & drop PDF, Excel, CSV files or click to select
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Supported: Bank statements, credit card statements, receipts, invoices
            </p>
          </div>

          {/* Password field for encrypted documents */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password (Optional - for password-protected PDFs)
            </label>
            <input
              type="password"
              value={uploadPassword}
              onChange={(e) => setUploadPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter document password if required"
            />
            <p className="text-xs text-gray-500 mt-1">
              If your document is password-protected, enter the password here before uploading
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      transactions
                        .filter(t => t.type === 'debit')
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                    )}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      transactions
                        .filter(t => t.type === 'credit')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Savings</p>
                  <p className={`text-2xl font-bold ${
                    transactions
                      .filter(t => t.type === 'credit')
                      .reduce((sum, t) => sum + t.amount, 0) -
                    transactions
                      .filter(t => t.type === 'debit')
                      .reduce((sum, t) => sum + Math.abs(t.amount), 0) >= 0
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(
                      transactions
                        .filter(t => t.type === 'credit')
                        .reduce((sum, t) => sum + t.amount, 0) -
                      transactions
                        .filter(t => t.type === 'debit')
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                    )}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {(spendingByCategory || monthlyTrendData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Spending by Category */}
            {spendingByCategory && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
                <div style={{ height: '300px' }}>
                  <Doughnut data={spendingByCategory} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Monthly Trends */}
            {monthlyTrendData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
                <div style={{ height: '300px' }}>
                  <Line data={monthlyTrendData} options={chartOptions} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Results */}
        {analysis && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">AI Financial Analysis</h3>
            
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <p className="text-blue-800">
                {analysis.summary ? 
                  `Total Income: ${formatCurrency(analysis.summary.totalIncome)} | 
                   Total Expenses: ${formatCurrency(analysis.summary.totalExpenses)} | 
                   Savings Rate: ${analysis.summary.savingsRate?.toFixed(1)}%` :
                  'Analysis summary not available'
                }
              </p>
            </div>

            {/* Insights */}
            {analysis.insights && analysis.insights.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Key Insights</h4>
                <div className="space-y-2">
                  {analysis.insights.slice(0, 5).map((insight, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        insight.impact === 'high' ? 'bg-red-500' :
                        insight.impact === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{insight.title}</p>
                        <p className="text-gray-600 text-sm">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.recommendations.slice(0, 4).map((rec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{rec.category}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority} priority
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{rec.reasoning}</p>
                      {rec.potentialSavings > 0 && (
                        <p className="text-green-600 font-medium text-sm">
                          Potential savings: {formatCurrency(rec.potentialSavings)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Documents */}
        {documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Documents</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Document</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Transactions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.slice(0, 10).map(doc => (
                    <tr key={doc.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{doc.originalName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {doc.category?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          doc.processingStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                          doc.processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.processingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doc.transactionCount || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {transactions.length === 0 && documents.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Financial Data Found</h3>
            <p className="text-gray-600 mb-6">
              Upload your financial documents to start analyzing your spending patterns
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                Upload Documents
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50">
                Connect Gmail
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpendingDashboard;