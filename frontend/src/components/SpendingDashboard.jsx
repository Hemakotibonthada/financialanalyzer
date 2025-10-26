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
import { 
  Calendar, Upload, TrendingUp, TrendingDown, DollarSign, FileText, 
  AlertCircle, CheckCircle, Wifi, WifiOff, Filter, Download, 
  RefreshCw, Search, Eye, Trash2, Clock, CreditCard, Receipt,
  PieChart, BarChart3, Activity, Target, Award, AlertTriangle, Mail
} from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import MonthlyTrends from './MonthlyTrends';

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [retryPassword, setRetryPassword] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearType, setClearType] = useState('documents-only'); // documents-only, all
  
  // New state for advanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, credit, debit
  const [filterCategory, setFilterCategory] = useState('all');
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // date, amount
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [viewMode, setViewMode] = useState('cards'); // cards, table, grid
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
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
            limit: 10000 // Load all transactions
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
        console.log('🔑 Password added to FormData:', uploadPassword.trim());
      } else {
        console.log('⚠️ No password provided');
      }
      
      // Debug: Log FormData contents
      console.log('📤 FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'password') {
          console.log(`  ${key}: ${value}`);
        } else {
          console.log(`  ${key}: [File]`);
        }
      }

      // IMPORTANT: Delete Content-Type to let browser set it with boundary
      const uploadResponse = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': undefined  // This tells axios to let browser set it
        }
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

  const handleRetryWithPassword = (doc) => {
    setSelectedDocument(doc);
    setRetryPassword('');
    setShowPasswordModal(true);
  };

  const retryDocumentProcessing = async () => {
    if (!selectedDocument || !retryPassword.trim()) {
      setMessage({ type: 'error', text: 'Please enter a password' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Retrying document processing...' });
      
      const response = await api.post(`/documents/${selectedDocument.id}/retry`, {
        password: retryPassword.trim()
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Document is being reprocessed...' });
        setShowPasswordModal(false);
        setRetryPassword('');
        setSelectedDocument(null);
        loadData();
      }
    } catch (error) {
      console.error('Error retrying document:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to retry document processing' 
      });
    }
  };

  const handleClearData = async () => {
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Clearing data...' });
      
      const endpoint = clearType === 'documents-only' 
        ? '/documents/clear/documents-only' 
        : '/documents/clear/all';

      const response = await api.delete(endpoint);

      if (response.data.success) {
        const msg = clearType === 'documents-only'
          ? `Cleared ${response.data.deletedCount} documents (kept transactions)`
          : `Cleared ${response.data.documentsDeleted} documents and ${response.data.transactionsDeleted} transactions`;
        
        setMessage({ type: 'success', text: msg });
        setShowClearModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to clear data' 
      });
    } finally {
      setLoading(false);
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

  // Filter and sort transactions
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory || t.ai_category === filterCategory);
    }
    
    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.end));
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortBy === 'amount') {
        return sortOrder === 'desc' ? 
          Math.abs(b.amount) - Math.abs(a.amount) : 
          Math.abs(a.amount) - Math.abs(b.amount);
      }
      return 0;
    });
    
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  
  // Get unique categories for filter
  const uniqueCategories = [...new Set(transactions.map(t => t.category || t.ai_category).filter(Boolean))];
  
  // Calculate insights
  const calculateInsights = () => {
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'debit');
    const incomeTransactions = filteredTransactions.filter(t => t.type === 'credit');
    
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome * 100) : 0;
    
    // Largest transaction
    const largestExpense = expenseTransactions.length > 0 ?
      expenseTransactions.reduce((max, t) => Math.abs(t.amount) > Math.abs(max.amount) ? t : max) : null;
    
    // Average transaction
    const avgExpense = expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0;
    
    // Category with highest spending
    const categorySpending = {};
    expenseTransactions.forEach(t => {
      const cat = t.category || t.ai_category || 'Uncategorized';
      categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(t.amount);
    });
    
    const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
    
    return {
      totalExpenses,
      totalIncome,
      netSavings,
      savingsRate,
      largestExpense,
      avgExpense,
      topCategory,
      transactionCount: filteredTransactions.length
    };
  };
  
  const insights = calculateInsights();

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

  // Transform monthlyTrends data to match MonthlyTrends component format
  const transformedMonthlyTrends = monthlyTrends.length > 0 ? {
    trends: monthlyTrends.map(trend => ({
      month: trend.month,
      totalSpending: trend.expenses || 0,
      totalIncome: trend.income || 0,
      totalInvestments: 0, // Not available in this endpoint
      transactionCount: trend.transactionCount || 0
    })),
    currentMonth: monthlyTrends[monthlyTrends.length - 1] ? {
      totalSpending: monthlyTrends[monthlyTrends.length - 1].expenses || 0,
      totalIncome: monthlyTrends[monthlyTrends.length - 1].income || 0,
      totalInvestments: 0
    } : null,
    previousMonth: monthlyTrends[monthlyTrends.length - 2] ? {
      totalSpending: monthlyTrends[monthlyTrends.length - 2].expenses || 0,
      totalIncome: monthlyTrends[monthlyTrends.length - 2].income || 0,
      totalInvestments: 0
    } : null,
    summary: {
      totalMonths: monthlyTrends.length,
      averageSpending: monthlyTrends.reduce((sum, t) => sum + (t.expenses || 0), 0) / monthlyTrends.length,
      averageIncome: monthlyTrends.reduce((sum, t) => sum + (t.income || 0), 0) / monthlyTrends.length,
      averageInvestments: 0,
      spendingTrend: monthlyTrends.length >= 2 ? 
        ((monthlyTrends[monthlyTrends.length - 1].expenses - monthlyTrends[0].expenses) / monthlyTrends[0].expenses * 100) : 0,
      incomeTrend: monthlyTrends.length >= 2 ? 
        ((monthlyTrends[monthlyTrends.length - 1].income - monthlyTrends[0].income) / monthlyTrends[0].income * 100) : 0
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Financial Intelligence Hub
                </h1>
                {/* Real-time connection indicator */}
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  isConnected 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 mr-1 animate-pulse" />
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
              <p className="text-gray-600 text-sm">
                Advanced analytics, real-time insights, and intelligent spending patterns
                {isConnected && <span className="text-green-600 ml-2">• Auto-sync enabled</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Actions */}
              <button
                onClick={loadData}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
              
              {/* Time Frame Selector */}
              <select
                value={activeTimeFrame}
                onChange={(e) => setActiveTimeFrame(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium"
              >
                {Object.entries(timeFrames).map(([key, frame]) => (
                  <option key={key} value={key}>{frame.label}</option>
                ))}
              </select>
              
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md transition-all"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm font-medium">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">AI Analysis</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowClearModal(true)}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-pink-700 flex items-center space-x-2 shadow-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Clear Data</span>
              </button>
            </div>
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

        {/* Enhanced Summary Cards */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Expenses Card */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg border border-red-200 p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-500 p-3 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {formatCurrency(insights.totalExpenses)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600">Avg: {formatCurrency(insights.avgExpense)}</span>
                <span className="text-red-700 font-semibold">{filteredTransactions.filter(t => t.type === 'debit').length} txns</span>
              </div>
            </div>

            {/* Total Income Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg border border-green-200 p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-500 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Total Income</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {formatCurrency(insights.totalIncome)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600">Growth</span>
                <span className="text-green-700 font-semibold">{filteredTransactions.filter(t => t.type === 'credit').length} txns</span>
              </div>
            </div>

            {/* Net Savings Card */}
            <div className={`bg-gradient-to-br ${insights.netSavings >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} rounded-xl shadow-lg border p-6 transform hover:scale-105 transition-transform`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`${insights.netSavings >= 0 ? 'bg-blue-500' : 'bg-orange-500'} p-3 rounded-lg`}>
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${insights.netSavings >= 0 ? 'text-blue-600' : 'text-orange-600'} uppercase tracking-wide`}>Net Savings</p>
                  <p className={`text-2xl font-bold ${insights.netSavings >= 0 ? 'text-blue-700' : 'text-orange-700'} mt-1`}>
                    {formatCurrency(insights.netSavings)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={insights.netSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}>Savings Rate</span>
                <span className={`font-semibold ${insights.netSavings >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{insights.savingsRate.toFixed(1)}%</span>
              </div>
            </div>

            {/* Transactions Count Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg border border-purple-200 p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Transactions</p>
                  <p className="text-2xl font-bold text-purple-700 mt-1">{insights.transactionCount}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-600">Largest</span>
                <span className="text-purple-700 font-semibold">
                  {insights.largestExpense ? formatCurrency(Math.abs(insights.largestExpense.amount)) : '₹0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Insights Bar */}
        {transactions.length > 0 && insights.topCategory && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs opacity-90">Top Spending Category</p>
                  <p className="text-lg font-bold">{insights.topCategory[0]}</p>
                  <p className="text-sm opacity-75">{formatCurrency(insights.topCategory[1])}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs opacity-90">Savings Goal Progress</p>
                  <p className="text-lg font-bold">{insights.savingsRate > 20 ? 'Excellent!' : insights.savingsRate > 10 ? 'Good' : 'Needs Improvement'}</p>
                  <p className="text-sm opacity-75">{insights.savingsRate.toFixed(1)}% savings rate</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs opacity-90">Financial Health</p>
                  <p className="text-lg font-bold">
                    {insights.savingsRate > 20 ? 'Strong' : insights.savingsRate > 10 ? 'Moderate' : insights.savingsRate > 0 ? 'Fair' : 'At Risk'}
                  </p>
                  <p className="text-sm opacity-75">Based on spending patterns</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filter & Search Bar */}
        {filteredTransactions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="credit">Credit Only</option>
                <option value="debit">Debit Only</option>
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Sort Controls */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded transition-colors ${
                    viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                  title="Cards View"
                >
                  <Receipt className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                  title="Table View"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                  title="Grid View"
                >
                  <PieChart className="h-4 w-4" />
                </button>
              </div>

              {/* Export Button */}
              <button
                onClick={() => {
                  const csv = [
                    ['Date', 'Description', 'Type', 'Amount', 'Category'],
                    ...filteredTransactions.map(t => [
                      new Date(t.date).toLocaleDateString(),
                      t.description,
                      t.type,
                      t.amount,
                      t.category || 'Uncategorized'
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              {/* Clear Filters */}
              {(searchTerm || filterType !== 'all' || filterCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterCategory('all');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        )}

        {/* Transaction List Views */}
        {filteredTransactions.length > 0 && (
          <div className="mb-8">
            {/* Cards View */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransactions.map((transaction, index) => (
                  <div
                    key={transaction._id || index}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'credit' ? (
                          <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="p-2 bg-red-100 rounded-lg">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className={`text-lg font-bold ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                      {transaction.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {transaction.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.map((transaction, index) => (
                        <tr key={transaction._id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.type === 'credit' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {transaction.category || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                            <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredTransactions.map((transaction, index) => (
                  <div
                    key={transaction._id || index}
                    className={`rounded-lg p-4 border-2 transition-all hover:scale-105 ${
                      transaction.type === 'credit'
                        ? 'bg-green-50 border-green-200 hover:border-green-400'
                        : 'bg-red-50 border-red-200 hover:border-red-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-2xl font-bold mb-1 ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      <div className="text-xs text-gray-600 truncate mb-1">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Charts Section */}
        {(spendingByCategory || monthlyTrendData) && (
          <div className="space-y-8 mb-8">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Visual Analytics</h2>
                <p className="text-gray-600">Interactive charts and insights</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Spending by Category */}
              {spendingByCategory && (
                <div className="bg-gradient-to-br from-white to-purple-50 rounded-lg shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <PieChart className="h-4 w-4" />
                      <span>Distribution</span>
                    </div>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Doughnut data={spendingByCategory} options={chartOptions} />
                  </div>
                  {/* Category Legends with percentages */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {spendingByCategory.labels && spendingByCategory.datasets[0].data.map((value, idx) => {
                      const total = spendingByCategory.datasets[0].data.reduce((a, b) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: spendingByCategory.datasets[0].backgroundColor[idx] }}
                          />
                          <span className="text-gray-700 truncate">{spendingByCategory.labels[idx]}</span>
                          <span className="text-gray-500 ml-auto">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spending Trends Card */}
              {insights && (
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg border border-blue-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Spending Insights</h3>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Activity className="h-4 w-4" />
                      <span>Analytics</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* Total Expenses Metric */}
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Expenses</span>
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(insights.totalExpenses)}
                      </div>
                    </div>

                    {/* Total Income Metric */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Income</span>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(insights.totalIncome)}
                      </div>
                    </div>

                    {/* Savings Rate Progress */}
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Savings Rate</span>
                        <Target className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(insights.savingsRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {insights.savingsRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Top Expense */}
                    {insights.largestExpense && (
                      <div className="bg-white rounded-lg p-4 border border-orange-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Largest Expense</span>
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                          {formatCurrency(insights.largestExpense.amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {insights.largestExpense.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Trends - Full Width */}
            {transformedMonthlyTrends && (
              <div className="bg-gradient-to-br from-white to-indigo-50 rounded-lg shadow-lg border border-indigo-100 hover:shadow-xl transition-shadow">
                <MonthlyTrends trendsData={transformedMonthlyTrends} />
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Results */}
        {analysis && (
          <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-xl shadow-xl border border-purple-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                <Award className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">AI Financial Intelligence</h3>
                <p className="text-gray-600">Powered by advanced analytics</p>
              </div>
            </div>
            
            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 mb-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5" />
                <h4 className="font-bold text-lg">Financial Summary</h4>
              </div>
              {analysis.summary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-sm opacity-90 mb-1">Total Income</p>
                    <p className="text-2xl font-bold">{formatCurrency(analysis.summary.totalIncome)}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-sm opacity-90 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold">{formatCurrency(analysis.summary.totalExpenses)}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-sm opacity-90 mb-1">Savings Rate</p>
                    <p className="text-2xl font-bold">{analysis.summary.savingsRate?.toFixed(1)}%</p>
                  </div>
                </div>
              ) : (
                <p className="text-white opacity-90">Analysis summary not available</p>
              )}
            </div>

            {/* Insights */}
            {analysis.insights && analysis.insights.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-purple-600" />
                  <h4 className="font-bold text-lg text-gray-900">Key Insights</h4>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {analysis.insights.slice(0, 6).map((insight, index) => (
                    <div 
                      key={index} 
                      className="group bg-white rounded-lg p-5 border-l-4 hover:shadow-lg transition-all"
                      style={{
                        borderColor: insight.impact === 'high' ? '#ef4444' :
                                   insight.impact === 'medium' ? '#f59e0b' : '#10b981'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          insight.impact === 'high' ? 'bg-red-100' :
                          insight.impact === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          {insight.impact === 'high' ? (
                            <AlertTriangle className={`h-5 w-5 ${
                              insight.impact === 'high' ? 'text-red-600' :
                              insight.impact === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                          ) : (
                            <CheckCircle className={`h-5 w-5 ${
                              insight.impact === 'high' ? 'text-red-600' :
                              insight.impact === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{insight.title}</p>
                          <p className="text-gray-600 text-sm">{insight.description}</p>
                          <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                            insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                            insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {insight.impact} impact
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-purple-600" />
                  <h4 className="font-bold text-lg text-gray-900">Smart Recommendations</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.recommendations.slice(0, 4).map((rec, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-xl p-5 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${
                            rec.priority === 'high' ? 'bg-red-100' :
                            rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            <Target className={`h-4 w-4 ${
                              rec.priority === 'high' ? 'text-red-600' :
                              rec.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                          </div>
                          <span className="font-bold text-gray-900">{rec.category}</span>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3 leading-relaxed">{rec.reasoning}</p>
                      {rec.potentialSavings > 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <p className="text-green-600 font-bold text-sm">
                            Save up to {formatCurrency(rec.potentialSavings)}
                          </p>
                        </div>
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
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Recent Documents</h3>
                  <p className="text-sm text-gray-600">{documents.length} documents processed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Last 10</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {documents.slice(0, 10).map((doc, idx) => (
                <div 
                  key={doc.id} 
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all hover:border-blue-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Document Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${
                        doc.processingStatus === 'completed' ? 'bg-green-100' :
                        doc.processingStatus === 'processing' ? 'bg-blue-100' :
                        doc.processingStatus === 'failed' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {doc.processingStatus === 'completed' ? (
                          <FileText className="h-5 w-5 text-green-600" />
                        ) : doc.processingStatus === 'processing' ? (
                          <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                        ) : doc.processingStatus === 'failed' ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{doc.originalName}</p>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full whitespace-nowrap">
                            {doc.category?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs font-medium ${
                            doc.processingStatus === 'completed' ? 'text-green-600' :
                            doc.processingStatus === 'processing' ? 'text-blue-600' :
                            doc.processingStatus === 'failed' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {doc.processingStatus === 'password_required' ? '🔒 Password Required' : 
                             doc.processingStatus === 'processing' ? '⏳ Processing...' :
                             doc.processingStatus === 'completed' ? '✓ Completed' : '✗ Failed'}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600">
                            {doc.transactionCount || 0} transactions
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600">
                            {new Date(doc.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {doc.error && (
                          <p className="text-xs text-red-500 mt-1">{doc.error}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {(doc.processingStatus === 'failed' || doc.processingStatus === 'password_required') && (
                        <button
                          onClick={() => handleRetryWithPassword(doc)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry
                        </button>
                      )}
                      {doc.processingStatus === 'completed' && (
                        <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="View Details">
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {transactions.length === 0 && documents.length === 0 && (
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border-2 border-dashed border-blue-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="inline-flex p-4 bg-blue-100 rounded-full mb-6">
                <FileText className="w-16 h-16 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Financial Data Yet</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Get started by uploading your bank statements, credit card bills, or connect your Gmail 
                to automatically fetch financial documents. We'll analyze your spending patterns and 
                provide intelligent insights.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Documents
                </button>
                <button className="w-full sm:w-auto border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                  <Mail className="h-5 w-5" />
                  Connect Gmail
                </button>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">Supported formats:</p>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                  <span className="px-3 py-1 bg-white border border-gray-200 rounded-full">PDF</span>
                  <span className="px-3 py-1 bg-white border border-gray-200 rounded-full">Excel</span>
                  <span className="px-3 py-1 bg-white border border-gray-200 rounded-full">CSV</span>
                  <span className="px-3 py-1 bg-white border border-gray-200 rounded-full">Images</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear Data Modal */}
        {showClearModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Clear Data
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Choose what you want to clear. This action cannot be undone!
              </p>
              
              <div className="mb-6 space-y-3">
                <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="clearType"
                    value="documents-only"
                    checked={clearType === 'documents-only'}
                    onChange={(e) => setClearType(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Clear Documents Only</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Delete all uploaded document files but keep extracted transaction data
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-red-300 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                  <input
                    type="radio"
                    name="clearType"
                    value="all"
                    checked={clearType === 'all'}
                    onChange={(e) => setClearType(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-red-700">Clear All Data</div>
                    <div className="text-sm text-red-600 mt-1">
                      Delete all documents AND all transaction data permanently
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowClearModal(false);
                    setClearType('documents-only');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white ${
                    clearType === 'all' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Clearing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Clear {clearType === 'all' ? 'All Data' : 'Documents'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Enter Document Password
              </h3>
              <p className="text-gray-600 mb-4">
                The document "{selectedDocument?.originalName}" is password-protected. 
                Please enter the password to process it.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={retryPassword}
                  onChange={(e) => setRetryPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && retryDocumentProcessing()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setRetryPassword('');
                    setSelectedDocument(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={retryDocumentProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry Processing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button - Quick Actions */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
          {/* Quick Stats Bubble */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2 animate-fade-in">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Today:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(
                    transactions
                      .filter(t => new Date(t.date).toDateString() === new Date().toDateString() && t.type === 'credit')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
                <span className="text-gray-400">|</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(
                    Math.abs(transactions
                      .filter(t => new Date(t.date).toDateString() === new Date().toDateString() && t.type === 'debit')
                      .reduce((sum, t) => sum + t.amount, 0))
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Main FAB */}
          <div className="relative group">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
              title="Scroll to Top"
            >
              <TrendingUp className="h-6 w-6" />
            </button>
            
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Back to Top
            </div>
          </div>

          {/* Refresh Data Button */}
          {transactions.length > 0 && (
            <div className="relative group">
              <button
                onClick={() => window.location.reload()}
                className="bg-white text-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200"
                title="Refresh Data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              {/* Tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Refresh Data
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpendingDashboard;