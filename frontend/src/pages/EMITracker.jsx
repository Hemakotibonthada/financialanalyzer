import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EMIMonthlyTrends from '../components/EMIMonthlyTrends';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  CreditCard as CreditCardIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

// Enhanced chart card styling
const chartCardHoverEffect = {
  bgcolor: 'white',
  borderRadius: 4,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid',
  borderColor: 'divider',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
    borderColor: 'primary.main',
    '& .chart-title': {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundClip: 'text',
      textFillColor: 'transparent',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      transform: 'translateX(8px)'
    },
    '& .chart-header': {
      borderColor: 'primary.main'
    }
  }
};

const EMITracker = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(12);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);
  
  // Manual EMI Dialog State
  const [manualEMIDialogOpen, setManualEMIDialogOpen] = useState(false);
  const [manualEMILoading, setManualEMILoading] = useState(false);
  const [manualEMIData, setManualEMIData] = useState({
    cardProvider: '',
    customProviderName: '',
    cardLastFourDigits: '',
    cardHolderName: '',
    merchantName: '',
    productDescription: '',
    principalAmount: '',
    interestRate: '',
    processingFee: '',
    emiAmount: '',
    totalTenure: '',
    repaymentType: 'MONTHLY', // MONTHLY or ON_REQUEST
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    tags: []
  });
  const [manualEMIErrors, setManualEMIErrors] = useState({});
  
  // Edit/Delete EMI State
  const [selectedEMI, setSelectedEMI] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editEMIDialogOpen, setEditEMIDialogOpen] = useState(false);

  // Upcoming Payments State
  const [upcomingMonthsToShow, setUpcomingMonthsToShow] = useState(1); // Default show next month only

  // Export Report State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0], // 6 months ago
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 12, 0).toISOString().split('T')[0] // 12 months ahead
  });

  useEffect(() => {
    fetchAllData();
    fetchUserProfile();
    // Trigger card animations after component mount
    setTimeout(() => setAnimateCards(true), 100);
  }, [selectedPeriod]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile data loaded:', response.data.data);
      setUserProfile(response.data.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all data in parallel - fetch max 36 months for upcoming payments
      const [overviewRes, upcomingRes, chartsRes, insightsRes] = await Promise.all([
        axios.get(`${API_URL}/emi/overview`, config),
        axios.get(`${API_URL}/emi/upcoming?months=36`, config), // Fetch 36 months, filter on frontend
        axios.get(`${API_URL}/emi/charts`, config),
        axios.get(`${API_URL}/emi/insights`, config)
      ]);

      setOverview(overviewRes.data.data);
      setUpcomingPayments(upcomingRes.data.data);
      setChartData(chartsRes.data.data);
      setInsights(insightsRes.data.data);
    } catch (err) {
      console.error('Error fetching EMI data:', err);
      setError(err.response?.data?.message || 'Failed to fetch EMI data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: exportDateRange.startDate,
        endDate: exportDateRange.endDate
      });
      
      if (exportFormat === 'pdf') {
        // Generate PDF report
        const response = await axios.get(`${API_URL}/emi/export/pdf?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else if (exportFormat === 'excel') {
        // Generate Excel report
        const response = await axios.get(`${API_URL}/emi/export/excel?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else if (exportFormat === 'csv') {
        // Generate CSV report
        const response = await axios.get(`${API_URL}/emi/export/csv?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      setExportDialogOpen(false);
      // Show success message
      alert('Report exported successfully!');
    } catch (err) {
      console.error('Error exporting report:', err);
      alert(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const handleSyncStatements = async () => {
    console.log('Starting sync, userProfile:', userProfile);
    console.log('Gmail connected:', userProfile?.gmailConnected);
    
    // Check if Gmail is connected
    if (!userProfile?.gmailConnected) {
      const errorMsg = 'Gmail not connected. Please connect Gmail in your Profile settings first.';
      setError(errorMsg);
      alert(errorMsg);
      setSyncDialogOpen(false);
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/emi/sync-statements`,
        { maxResults: 50 },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSyncDialogOpen(false);
      fetchAllData(); // Refresh data after sync
      
      alert(response.data.message || 'Statements synced successfully!');
    } catch (err) {
      console.error('Error syncing statements:', err);
      const errorMessage = err.response?.data?.message || 'Failed to sync statements. Please ensure Gmail is connected.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Manual EMI Dialog Handlers
  const handleOpenManualEMIDialog = () => {
    setManualEMIDialogOpen(true);
    setManualEMIErrors({});
  };

  const handleCloseManualEMIDialog = () => {
    setManualEMIDialogOpen(false);
    setManualEMIData({
      cardProvider: '',
      customProviderName: '',
      cardLastFourDigits: '',
      cardHolderName: '',
      merchantName: '',
      productDescription: '',
      principalAmount: '',
      interestRate: '',
      processingFee: '',
      emiAmount: '',
      totalTenure: '',
      repaymentType: 'MONTHLY', // MONTHLY or ON_REQUEST
      startDate: new Date().toISOString().split('T')[0],
      notes: '',
      tags: []
    });
    setManualEMIErrors({});
  };

  const handleManualEMIChange = (field, value) => {
    setManualEMIData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (manualEMIErrors[field]) {
      setManualEMIErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateManualEMI = () => {
    const errors = {};
    
    if (!manualEMIData.cardProvider) errors.cardProvider = 'Card provider is required';
    if (manualEMIData.cardProvider === 'OTHER' && !manualEMIData.customProviderName) {
      errors.customProviderName = 'Provider name is required when selecting OTHER';
    }
    if (!manualEMIData.cardLastFourDigits) {
      errors.cardLastFourDigits = 'Card last 4 digits required';
    } else if (!/^\d{4}$/.test(manualEMIData.cardLastFourDigits)) {
      errors.cardLastFourDigits = 'Must be exactly 4 digits';
    }
    if (!manualEMIData.cardHolderName) errors.cardHolderName = 'Card holder name is required';
    if (!manualEMIData.merchantName) errors.merchantName = 'Merchant name is required';
    if (!manualEMIData.principalAmount || parseFloat(manualEMIData.principalAmount) <= 0) {
      errors.principalAmount = 'Valid principal amount required';
    }
    
    // Only validate EMI amount and tenure for MONTHLY repayment type
    if (manualEMIData.repaymentType === 'MONTHLY') {
      if (!manualEMIData.emiAmount || parseFloat(manualEMIData.emiAmount) <= 0) {
        errors.emiAmount = 'Valid EMI amount required';
      }
      if (!manualEMIData.totalTenure || parseInt(manualEMIData.totalTenure) <= 0) {
        errors.totalTenure = 'Valid tenure required';
      }
    }
    
    if (!manualEMIData.startDate) errors.startDate = 'Start date is required';
    
    setManualEMIErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateManualEMI = async () => {
    if (!validateManualEMI()) {
      return;
    }

    setManualEMILoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/emi/manual`,
        manualEMIData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('EMI created successfully!');
      handleCloseManualEMIDialog();
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error creating manual EMI:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create EMI';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setManualEMILoading(false);
    }
  };

  // Delete EMI Handlers
  const handleDeleteEMI = async () => {
    if (!selectedEMI) return;

    try {
      const token = localStorage.getItem('token');
      const deletedEmiId = selectedEMI.id;
      
      await axios.delete(
        `${API_URL}/emi/${deletedEmiId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Immediately filter out deleted EMI from upcoming payments
      if (upcomingPayments && upcomingPayments.monthlyBreakdown) {
        const updatedBreakdown = upcomingPayments.monthlyBreakdown.map(month => ({
          ...month,
          emis: month.emis.filter(emi => emi.emiId !== deletedEmiId),
          emiCount: month.emis.filter(emi => emi.emiId !== deletedEmiId).length,
          totalAmount: month.emis
            .filter(emi => emi.emiId !== deletedEmiId)
            .reduce((sum, emi) => sum + emi.amount, 0)
        })).filter(month => month.emiCount > 0); // Remove empty months

        setUpcomingPayments({
          ...upcomingPayments,
          monthlyBreakdown: updatedBreakdown
        });
      }

      alert('EMI deleted successfully!');
      setDeleteConfirmOpen(false);
      setSelectedEMI(null);
      fetchAllData(); // Refresh all data from backend
    } catch (err) {
      console.error('Error deleting EMI:', err);
      alert('Failed to delete EMI');
    }
  };

  // Mark Payment as Paid Handler
  const handleMarkAsPaid = async (emiId, installmentNumber) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/${emiId}/mark-paid`,
        { installmentNumber, paidDate: new Date().toISOString() },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Payment marked as paid!');
      fetchAllData();
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      alert('Failed to mark payment as paid');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  // Get filtered monthly breakdown for display
  const getDisplayedMonths = () => {
    if (!upcomingPayments || !upcomingPayments.monthlyBreakdown) return [];
    
    // Calculate how many months to show based on selection
    const monthsToDisplay = upcomingMonthsToShow === 1 ? 1 : 
                            upcomingMonthsToShow === 3 ? 3 :
                            upcomingMonthsToShow === 6 ? 6 :
                            upcomingMonthsToShow === 12 ? 12 :
                            upcomingMonthsToShow === 24 ? 24 :
                            upcomingMonthsToShow === 36 ? 36 : 1;
    
    return upcomingPayments.monthlyBreakdown.slice(0, monthsToDisplay);
  };

  if (loading && !overview) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
        sx={{
          '& .MuiCircularProgress-root': {
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.7, transform: 'scale(1.1)' }
            }
          }
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 } }}>
      {/* Enhanced Header with Gradient Background */}
      <Box 
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          p: 4,
          mb: 4,
          boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.4
          }
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} position="relative" zIndex={1}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{
                fontWeight: 800,
                color: 'white',
                mb: 1,
                textShadow: '0 4px 12px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              💳 EMI Tracker
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 500
              }}
            >
              Track and manage all your EMI payments in one place
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAllData}
              disabled={loading}
              sx={{ 
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                },
                '&:disabled': {
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.5)'
                }
              }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              onClick={() => setExportDialogOpen(true)}
              sx={{ 
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                }
              }}
            >
              Export Report
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenManualEMIDialog}
              sx={{
                background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                color: 'white',
                fontWeight: 700,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(51, 8, 103, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(51, 8, 103, 0.5)',
                  background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
                }
              }}
            >
              Add Manual EMI
            </Button>
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <DownloadIcon />}
              onClick={() => setSyncDialogOpen(true)}
              disabled={syncing}
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                fontWeight: 700,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(245, 87, 108, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(245, 87, 108, 0.5)',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                },
                '&:disabled': {
                  background: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.5)'
                }
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Statements'}
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: 4,
              transform: 'scale(1.01)'
            }
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Enhanced Overview Cards */}
      {overview && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                transform: animateCards ? 'translateY(0)' : 'translateY(20px)',
                opacity: animateCards ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: '0ms',
                '&:hover': { 
                  transform: 'translateY(-12px) scale(1.02)', 
                  boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
                  '& .icon-container': {
                    transform: 'rotate(360deg) scale(1.2)'
                  },
                  '& .stats-number': {
                    transform: 'scale(1.1)'
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)'
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, mb: 1 }}>
                      Active EMIs
                    </Typography>
                    <Typography 
                      variant="h2" 
                      className="stats-number"
                      sx={{ 
                        fontWeight: 800, 
                        transition: 'transform 0.3s ease',
                        textShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      {overview.overview.totalActiveEMIs}
                    </Typography>
                  </Box>
                  <Box 
                    className="icon-container"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 3,
                      p: 1.5,
                      transition: 'all 0.5s ease'
                    }}
                  >
                    <CreditCardIcon sx={{ fontSize: 40 }} />
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    {overview.overview.totalCompletedEMIs} completed
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                transform: animateCards ? 'translateY(0)' : 'translateY(20px)',
                opacity: animateCards ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: '100ms',
                '&:hover': { 
                  transform: 'translateY(-12px) scale(1.02)', 
                  boxShadow: '0 20px 40px rgba(245, 87, 108, 0.4)',
                  '& .icon-container': {
                    transform: 'rotate(360deg) scale(1.2)'
                  },
                  '& .stats-number': {
                    transform: 'scale(1.1)'
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)'
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, mb: 1 }}>
                      Outstanding Amount
                    </Typography>
                    <Typography 
                      variant="h2" 
                      className="stats-number"
                      sx={{ 
                        fontWeight: 800, 
                        fontSize: { xs: '1.75rem', sm: '2.5rem' },
                        transition: 'transform 0.3s ease',
                        textShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      {formatCurrency(overview.overview.totalOutstanding)}
                    </Typography>
                  </Box>
                  <Box 
                    className="icon-container"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 3,
                      p: 1.5,
                      transition: 'all 0.5s ease'
                    }}
                  >
                    <AccountBalanceIcon sx={{ fontSize: 40 }} />
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <WarningIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    Total remaining debt
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                transform: animateCards ? 'translateY(0)' : 'translateY(20px)',
                opacity: animateCards ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: '200ms',
                '&:hover': { 
                  transform: 'translateY(-12px) scale(1.02)', 
                  boxShadow: '0 20px 40px rgba(250, 112, 154, 0.4)',
                  '& .icon-container': {
                    transform: 'rotate(360deg) scale(1.2)'
                  },
                  '& .stats-number': {
                    transform: 'scale(1.1)'
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)'
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, mb: 1 }}>
                      Monthly Burden
                    </Typography>
                    <Typography 
                      variant="h2" 
                      className="stats-number"
                      sx={{ 
                        fontWeight: 800, 
                        fontSize: { xs: '1.75rem', sm: '2.5rem' },
                        transition: 'transform 0.3s ease',
                        textShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      {formatCurrency(overview.overview.monthlyBurden)}
                    </Typography>
                  </Box>
                  <Box 
                    className="icon-container"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 3,
                      p: 1.5,
                      transition: 'all 0.5s ease'
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 40 }} />
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    Paid monthly
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                color: 'white',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                transform: animateCards ? 'translateY(0)' : 'translateY(20px)',
                opacity: animateCards ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: '300ms',
                '&:hover': { 
                  transform: 'translateY(-12px) scale(1.02)', 
                  boxShadow: '0 20px 40px rgba(48, 207, 208, 0.4)',
                  '& .icon-container': {
                    transform: 'rotate(360deg) scale(1.2)'
                  },
                  '& .stats-number': {
                    transform: 'scale(1.1)'
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)'
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, mb: 1 }}>
                      Total Paid
                    </Typography>
                    <Typography 
                      variant="h2" 
                      className="stats-number"
                      sx={{ 
                        fontWeight: 800, 
                        fontSize: { xs: '1.75rem', sm: '2.5rem' },
                        transition: 'transform 0.3s ease',
                        textShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      {formatCurrency(overview.overview.totalAmountPaid)}
                    </Typography>
                  </Box>
                  <Box 
                    className="icon-container"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 3,
                      p: 1.5,
                      transition: 'all 0.5s ease'
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 40 }} />
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    Successfully paid
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Enhanced Insights Section */}
      {insights.length > 0 && (
        <Box mb={4}>
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
              pb: 2,
              borderBottom: '2px solid',
              borderImage: 'linear-gradient(to right, #667eea, #764ba2) 1'
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <InfoIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography 
              variant="h5" 
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Smart Insights & Recommendations
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {insights.map((insight, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert
                  severity={getSeverityColor(insight.severity)}
                  icon={<InfoIcon sx={{ fontSize: 24 }} />}
                  action={
                    insight.action && (
                      <Chip 
                        label={insight.action} 
                        size="small"
                        sx={{
                          fontWeight: 600,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      />
                    )
                  }
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateX(8px) translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {insight.title}
                  </Typography>
                  <Typography variant="body2">{insight.description}</Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Enhanced Tabs */}
      <Box 
        sx={{ 
          mb: 4,
          bgcolor: 'white',
          borderRadius: 4,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            px: 2,
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            },
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              minHeight: 64,
              transition: 'all 0.3s ease',
              '&:hover': {
                color: '#667eea',
                transform: 'translateY(-2px)'
              }
            },
            '& .Mui-selected': {
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
            }
          }}
        >
          <Tab 
            label="Overview" 
            icon={<AssessmentIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Reports" 
            icon={<TrendingUpIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Upcoming Payments" 
            icon={<CalendarIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Active EMIs" 
            icon={<CreditCardIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Completed EMIs" 
            icon={<CheckCircleIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {activeTab === 0 && chartData && (
        <Grid container spacing={3} direction="column">
          {/* Pie Chart - Distribution by Provider */}
          <Grid item xs={12}>
            <Card elevation={0} sx={chartCardHoverEffect}>
              <CardContent>
                <Box 
                  className="chart-header"
                  sx={{ 
                    pb: 2, 
                    mb: 3, 
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <Typography 
                    variant="h5" 
                    className="chart-title"
                    sx={{ 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <PieChart className="w-6 h-6" style={{ color: 'white' }} />
                    </Box>
                    EMI Distribution by Card Provider
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                    Breakdown of outstanding amounts across different card providers
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={chartData.pieChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.pieChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: 12, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: 'none'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Radar Chart - Card Provider Analysis */}
          {chartData.pieChart && chartData.pieChart.length > 0 && chartData.pieChart.length <= 8 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    🕸️ Card Provider 360° Comparison
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <RadarChart data={chartData.pieChart}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                      <Radar name="Outstanding Amount" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* EMI Monthly Trends Chart */}
          {upcomingPayments && upcomingPayments.monthlyBreakdown && upcomingPayments.monthlyBreakdown.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <EMIMonthlyTrends monthlyData={upcomingPayments.monthlyBreakdown} />
            </Grid>
          )}
        </Grid>
      )}

      {/* Reports Tab */}
      {activeTab === 1 && chartData && (
        <Grid container spacing={3} direction="column">
          {/* Bar Chart - Monthly EMI Burden */}
          <Grid item xs={12}>
            <Card elevation={0} sx={chartCardHoverEffect}>
              <CardContent>
                <Box 
                  className="chart-header"
                  sx={{ 
                    pb: 2, 
                    mb: 3, 
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    transition: 'border-color 0.3s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 2
                  }}
                >
                  <Box>
                    <Typography 
                      variant="h5" 
                      className="chart-title"
                      sx={{ 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Box
                        sx={{
                          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                          borderRadius: 2,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <TrendingUpIcon style={{ color: 'white' }} />
                      </Box>
                      Monthly EMI Burden
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                      Track your EMI payment obligations over time
                    </Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      label="Period"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value={3}>3 Months</MenuItem>
                      <MenuItem value={6}>6 Months</MenuItem>
                      <MenuItem value={12}>12 Months</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={chartData.barChart}>
                    <defs>
                      <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#667eea" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#764ba2" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis tick={{ fill: '#666' }} />
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: 12, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: 'none'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#colorBar)" 
                      name="Monthly Amount"
                      radius={[8, 8, 0, 0]}
                      animationBegin={0}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Area Chart - Payment Trend Analysis */}
          {chartData.barChart && chartData.barChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    📊 Payment Trend Analysis
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <AreaChart data={chartData.barChart}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="amount" stroke="#8884d8" fillOpacity={1} fill="url(#colorAmount)" name="Payment Amount" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Composed Chart - Monthly Burden with EMI Count */}
          {chartData.barChart && chartData.barChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    📊 Monthly Burden with EMI Count
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <ComposedChart data={chartData.barChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
                      <YAxis yAxisId="left" label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'EMI Count', angle: 90, position: 'insideRight' }} />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'amount') return formatCurrency(value);
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="amount" fill="#8884d8" name="Monthly Amount" />
                      <Line yAxisId="right" type="monotone" dataKey="count" stroke="#ff7300" name="EMI Count" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Stacked Bar Chart - Principal vs Interest */}
          {chartData.stackedBarChart && chartData.stackedBarChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    💰 Principal vs Interest Breakdown
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={chartData.stackedBarChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="principal" stackId="a" fill="#82ca9d" name="Principal" />
                      <Bar dataKey="interest" stackId="a" fill="#ff8042" name="Interest" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Line Chart - EMI Completion Timeline */}
          {chartData.lineChart && chartData.lineChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    📉 EMI Completion Progress
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <LineChart data={chartData.lineChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'progress') return `${value.toFixed(1)}%`;
                          if (name === 'remaining') return formatCurrency(value);
                          return value;
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="progress" stroke="#8884d8" name="Completion %" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Scatter Chart - EMI Distribution Analysis */}
          {chartData.stackedBarChart && chartData.stackedBarChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    🎯 Principal vs Interest Scatter Analysis
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="principal" name="Principal" label={{ value: 'Principal (₹)', position: 'insideBottom', offset: -5 }} />
                      <YAxis type="number" dataKey="interest" name="Interest" label={{ value: 'Interest (₹)', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => chartData.stackedBarChart[label]?.name || ''}
                      />
                      <Legend />
                      <Scatter name="EMIs" data={chartData.stackedBarChart} fill="#8884d8">
                        {chartData.stackedBarChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Merchant Comparison Chart */}
          {chartData.merchantChart && chartData.merchantChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    🏪 Top Merchants by Outstanding Amount
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <ComposedChart data={chartData.merchantChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                      <YAxis yAxisId="left" label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Interest Rate %', angle: 90, position: 'insideRight' }} />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'amount') return formatCurrency(value);
                          if (name === 'rate') return `${value}%`;
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="amount" fill="#8884d8" name="Outstanding Amount" />
                      <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#ff7300" name="Interest Rate %" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Interest Rate Distribution */}
          {chartData.rateDistribution && chartData.rateDistribution.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    📊 Interest Rate Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={chartData.rateDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis label={{ value: 'Number of EMIs', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#82ca9d" name="EMI Count">
                        {chartData.rateDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* EMI Progress Funnel */}
          {chartData.lineChart && chartData.lineChart.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <Card elevation={3} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease'
                  }}>
                    🎯 EMI Progress Overview
                  </Typography>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={chartData.lineChart.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} label={{ value: 'Completion %', position: 'insideBottom', offset: -5 }} />
                      <YAxis type="category" dataKey="name" width={200} />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'progress') return `${value.toFixed(1)}%`;
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="progress" fill="#8884d8" name="Progress %">
                        {chartData.lineChart.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.progress > 80 ? '#82ca9d' : entry.progress > 50 ? '#FFBB28' : '#FF8042'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 2 && upcomingPayments && (
        <Box>
          {/* Time Period Selector */}
          <Card elevation={2} sx={{ mb: 3, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  View Upcoming Payments For:
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={9}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label="Next Month"
                    color={upcomingMonthsToShow === 1 ? "primary" : "default"}
                    onClick={() => setUpcomingMonthsToShow(1)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label="3 Months"
                    color={upcomingMonthsToShow === 3 ? "primary" : "default"}
                    onClick={() => setUpcomingMonthsToShow(3)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label="6 Months"
                    color={upcomingMonthsToShow === 6 ? "primary" : "default"}
                    onClick={() => setUpcomingMonthsToShow(6)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label="12 Months"
                    color={upcomingMonthsToShow === 12 ? "primary" : "default"}
                    onClick={() => setUpcomingMonthsToShow(12)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label="2 Years"
                    color={upcomingMonthsToShow === 24 ? "primary" : "default"}
                    onClick={() => setUpcomingMonthsToShow(24)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label="3 Years"
                    color={upcomingMonthsToShow === 36 ? "primary" : "default"}
                    onClick={() => setUpcomingMonthsToShow(36)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Monthly Breakdown */}
          <Grid container spacing={3}>
            {getDisplayedMonths().map((month, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card
                  elevation={3}
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8,
                      borderTop: '4px solid',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight="bold">
                        {month.month}/{month.year}
                      </Typography>
                      <Chip
                        label={`${month.emiCount} EMIs`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
                      {formatCurrency(month.totalAmount)}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Merchant</strong></TableCell>
                            <TableCell><strong>Card</strong></TableCell>
                            <TableCell align="right"><strong>Amount</strong></TableCell>
                            <TableCell align="right"><strong>Due Date</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {month.emis.map((emi, idx) => (
                            <TableRow 
                              key={idx}
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'action.hover'
                                }
                              }}
                            >
                              <TableCell>{emi.merchantName}</TableCell>
                              <TableCell>
                                <Chip
                                  label={`${emi.cardProvider} ${emi.cardLastFourDigits}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  {formatCurrency(emi.amount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{formatDate(emi.dueDate)}</TableCell>
                              <TableCell align="center">
                                <Tooltip title="Mark as Paid">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleMarkAsPaid(emi.emiId, emi.installmentNumber)}
                                    sx={{
                                      '&:hover': {
                                        transform: 'scale(1.1)',
                                        backgroundColor: 'success.light'
                                      }
                                    }}
                                  >
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* No Results Message */}
          {getDisplayedMonths().length === 0 && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No upcoming payments found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                You have no scheduled payments for the selected period
              </Typography>
            </Card>
          )}
        </Box>
      )}

      {activeTab === 3 && overview && (
        <Grid container spacing={3}>
          {overview.activeEMIs.map((emi) => (
            <Grid item xs={12} md={6} lg={4} key={emi.id}>
              <Card 
                elevation={3}
                sx={{
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&:hover': {
                    transform: 'scale(1.03)',
                    boxShadow: 8,
                    borderLeft: '4px solid',
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {emi.merchantName}
                      </Typography>
                      <Chip
                        label={`${emi.cardProvider} ${emi.cardLastFourDigits}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Delete EMI">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => {
                            setSelectedEMI(emi);
                            setDeleteConfirmOpen(true);
                          }}
                          sx={{
                            transition: 'all 0.2s',
                            '&:hover': {
                              transform: 'scale(1.2)',
                              backgroundColor: 'error.light'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                        {emi.interestRate}% Interest
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatCurrency(emi.emiAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {emi.repaymentType === 'ON_REQUEST' ? 'Total Due (Principal + Interest)' : 'Per month'}
                  </Typography>

                  {/* Show accrued interest for ON_REQUEST loans */}
                  {emi.repaymentType === 'ON_REQUEST' && emi.accruedInterest > 0 && (
                    <Box my={2} p={2} bgcolor="warning.light" borderRadius={2}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        💰 Interest Accrued
                      </Typography>
                      <Typography variant="h6" color="warning.dark" fontWeight="bold">
                        {formatCurrency(emi.accruedInterest)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {emi.daysElapsed} days @ {emi.interestRate}% p.a.
                      </Typography>
                      <Box mt={1} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Principal: {formatCurrency(emi.principalAmount)}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="warning.dark">
                          + {formatCurrency(emi.accruedInterest)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Regular progress bar for MONTHLY, status indicator for ON_REQUEST */}
                  {emi.repaymentType === 'ON_REQUEST' ? (
                    <Box my={2} p={2} bgcolor="info.light" borderRadius={2}>
                      <Typography variant="body2" color="info.dark" fontWeight="bold">
                        🤝 Pay Anytime (On Request)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        No fixed EMI or due date. Flexible repayment.
                      </Typography>
                    </Box>
                  ) : (
                    <Box my={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">
                          {emi.paidInstallments} of {emi.totalTenure} paid
                        </Typography>
                        <Typography variant="body2">
                          {emi.completionPercentage}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={emi.completionPercentage}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  )}

                  <Box display="flex" justifyContent="space-between" mt={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Remaining
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(emi.remainingAmount)}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        Next Due
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatDate(emi.nextDueDate)}
                      </Typography>
                    </Box>
                  </Box>

                  {emi.notes && (
                    <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary">
                        📝 {emi.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 4: Completed EMIs */}
      {activeTab === 4 && overview && (
        <>
          {overview.completedEMIs && overview.completedEMIs.length === 0 ? (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 8,
                px: 3,
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                No Completed EMIs Yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
                EMIs that reach their full tenure will automatically appear here. Keep track of your active EMIs to see your progress!
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {overview.completedEMIs.map((emi) => (
                <Grid item xs={12} md={6} lg={4} key={emi.id}>
                  <Card 
                    elevation={3}
                    sx={{
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      border: '2px solid',
                      borderColor: 'success.main',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: 8,
                        borderColor: 'success.dark'
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
                            <Chip
                              label="COMPLETED"
                              size="small"
                              color="success"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                          <Typography variant="h6" gutterBottom>
                            {emi.merchantName}
                          </Typography>
                          <Chip
                            label={`${emi.cardProvider} ${emi.cardLastFourDigits}`}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                          {emi.interestRate}% Interest
                        </Typography>
                      </Box>

                      <Typography variant="h4" color="success.main" gutterBottom>
                        {formatCurrency(emi.emiAmount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Per month (was)
                      </Typography>

                      <Box my={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {emi.totalTenure} of {emi.totalTenure} paid
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            100%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={100}
                          color="success"
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      <Box display="flex" justifyContent="space-between" mt={2} p={2} bgcolor="success.light" borderRadius={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Total Paid
                          </Typography>
                          <Typography variant="h6" fontWeight="bold" color="success.dark">
                            {formatCurrency(emi.emiAmount * emi.totalTenure)}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" color="text.secondary">
                            Completed On
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatDate(emi.endDate)}
                          </Typography>
                        </Box>
                      </Box>

                      {emi.notes && (
                        <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
                          <Typography variant="caption" color="text.secondary">
                            📝 {emi.notes}
                          </Typography>
                        </Box>
                      )}

                      <Box mt={2} display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" color="success.main" fontWeight="bold">
                          ✓ Successfully Completed
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Sync Dialog */}
      <Dialog 
        open={syncDialogOpen} 
        onClose={() => setSyncDialogOpen(false)}
        TransitionProps={{
          style: {
            transition: 'all 0.3s ease'
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white',
          fontWeight: 'bold'
        }}>
          📥 Sync Credit Card Statements
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography gutterBottom>
            This will fetch credit card statements from your Gmail and automatically extract EMI information.
          </Typography>
          
          {userProfile?.gmailConnected ? (
            <Alert 
              severity="success" 
              sx={{ 
                mt: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'scale(1.02)'
                }
              }}
            >
              ✓ Gmail is connected and ready to sync
            </Alert>
          ) : (
            <Alert 
              severity="warning" 
              sx={{ 
                mt: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'scale(1.02)'
                }
              }}
            >
              ⚠ Gmail not connected. Please go to Profile → Settings to connect Gmail first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setSyncDialogOpen(false)}
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                backgroundColor: 'grey.100'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSyncStatements} 
            variant="contained" 
            disabled={syncing || !userProfile?.gmailConnected}
            sx={{
              transition: 'all 0.3s ease',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 6,
                background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)'
              },
              '&:disabled': {
                background: 'grey.300'
              }
            }}
          >
            {syncing ? '⏳ Syncing...' : '🚀 Start Sync'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual EMI Entry Dialog */}
      <Dialog 
        open={manualEMIDialogOpen} 
        onClose={handleCloseManualEMIDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon />
            Add Manual EMI
          </Box>
          <IconButton 
            onClick={handleCloseManualEMIDialog}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Card Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                💳 Card Details
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!manualEMIErrors.cardProvider}>
                <InputLabel>Card Provider *</InputLabel>
                <Select
                  value={manualEMIData.cardProvider}
                  onChange={(e) => handleManualEMIChange('cardProvider', e.target.value)}
                  label="Card Provider *"
                >
                  <MenuItem value="ICICI">ICICI</MenuItem>
                  <MenuItem value="HDFC">HDFC</MenuItem>
                  <MenuItem value="SBI">SBI</MenuItem>
                  <MenuItem value="AXIS">AXIS</MenuItem>
                  <MenuItem value="KOTAK">KOTAK</MenuItem>
                  <MenuItem value="CITI">CITI</MenuItem>
                  <MenuItem value="AMEX">AMEX</MenuItem>
                  <MenuItem value="STANDARD CHARTERED">STANDARD CHARTERED</MenuItem>
                  <MenuItem value="INDUSIND">INDUSIND</MenuItem>
                  <MenuItem value="YES BANK">YES BANK</MenuItem>
                  <MenuItem value="OTHER">OTHER</MenuItem>
                </Select>
                {manualEMIErrors.cardProvider && (
                  <Typography variant="caption" color="error">{manualEMIErrors.cardProvider}</Typography>
                )}
              </FormControl>
            </Grid>

            {/* Custom Provider Name - Shows only when OTHER is selected */}
            {manualEMIData.cardProvider === 'OTHER' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Provider Name *"
                  value={manualEMIData.customProviderName}
                  onChange={(e) => handleManualEMIChange('customProviderName', e.target.value)}
                  error={!!manualEMIErrors.customProviderName}
                  helperText={manualEMIErrors.customProviderName || 'Enter the name of the loan provider'}
                  placeholder="e.g., Local Bank, Friend, Family, etc."
                />
              </Grid>
            )}

            <Grid item xs={12} sm={manualEMIData.cardProvider === 'OTHER' ? 12 : 6}>
              <TextField
                fullWidth
                label="Card Last 4 Digits *"
                value={manualEMIData.cardLastFourDigits}
                onChange={(e) => handleManualEMIChange('cardLastFourDigits', e.target.value)}
                error={!!manualEMIErrors.cardLastFourDigits}
                helperText={manualEMIErrors.cardLastFourDigits}
                inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
                placeholder="1234"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Card Holder Name *"
                value={manualEMIData.cardHolderName}
                onChange={(e) => handleManualEMIChange('cardHolderName', e.target.value)}
                error={!!manualEMIErrors.cardHolderName}
                helperText={manualEMIErrors.cardHolderName}
                placeholder="John Doe"
              />
            </Grid>

            {/* EMI Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                🛍️ Purchase Details
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Merchant Name *"
                value={manualEMIData.merchantName}
                onChange={(e) => handleManualEMIChange('merchantName', e.target.value)}
                error={!!manualEMIErrors.merchantName}
                helperText={manualEMIErrors.merchantName}
                placeholder="Amazon, Flipkart, etc."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Product Description"
                value={manualEMIData.productDescription}
                onChange={(e) => handleManualEMIChange('productDescription', e.target.value)}
                placeholder="iPhone, Laptop, etc."
              />
            </Grid>

            {/* Financial Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                💰 Financial Details
              </Typography>
            </Grid>

            {/* Repayment Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Repayment Type *</InputLabel>
                <Select
                  value={manualEMIData.repaymentType}
                  onChange={(e) => handleManualEMIChange('repaymentType', e.target.value)}
                  label="Repayment Type *"
                >
                  <MenuItem value="MONTHLY">
                    <Box>
                      <Typography variant="body1" fontWeight={600}>📅 Monthly EMI</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Regular monthly installments with fixed tenure
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="ON_REQUEST">
                    <Box>
                      <Typography variant="body1" fontWeight={600}>🤝 On Request (Personal Loan)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pay back anytime when requested (friends, family, informal loans)
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Principal Amount *"
                type="number"
                value={manualEMIData.principalAmount}
                onChange={(e) => handleManualEMIChange('principalAmount', e.target.value)}
                error={!!manualEMIErrors.principalAmount}
                helperText={manualEMIErrors.principalAmount || (manualEMIData.repaymentType === 'ON_REQUEST' ? 'Total loan amount to be repaid' : '')}
                InputProps={{ startAdornment: '₹' }}
                placeholder="50000"
              />
            </Grid>

            {/* Only show EMI Amount for MONTHLY repayment type */}
            {manualEMIData.repaymentType === 'MONTHLY' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="EMI Amount (Monthly) *"
                  type="number"
                  value={manualEMIData.emiAmount}
                  onChange={(e) => handleManualEMIChange('emiAmount', e.target.value)}
                  error={!!manualEMIErrors.emiAmount}
                  helperText={manualEMIErrors.emiAmount}
                  InputProps={{ startAdornment: '₹' }}
                  placeholder="5000"
                />
              </Grid>
            )}

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Interest Rate (%)"
                type="number"
                value={manualEMIData.interestRate}
                onChange={(e) => handleManualEMIChange('interestRate', e.target.value)}
                placeholder="12"
                InputProps={{ endAdornment: '%' }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Processing Fee"
                type="number"
                value={manualEMIData.processingFee}
                onChange={(e) => handleManualEMIChange('processingFee', e.target.value)}
                InputProps={{ startAdornment: '₹' }}
                placeholder="0"
              />
            </Grid>

            {/* Only show Tenure for MONTHLY repayment type */}
            {manualEMIData.repaymentType === 'MONTHLY' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Tenure (Months) *"
                  type="number"
                  value={manualEMIData.totalTenure}
                  onChange={(e) => handleManualEMIChange('totalTenure', e.target.value)}
                  error={!!manualEMIErrors.totalTenure}
                  helperText={manualEMIErrors.totalTenure}
                  placeholder="12"
                  inputProps={{ min: 1, max: 60 }}
                />
              </Grid>
            )}

            {/* Date Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                📅 Date Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="EMI Start Date *"
                type="date"
                value={manualEMIData.startDate}
                onChange={(e) => handleManualEMIChange('startDate', e.target.value)}
                error={!!manualEMIErrors.startDate}
                helperText={manualEMIErrors.startDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                📝 Additional Information
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={manualEMIData.notes}
                onChange={(e) => handleManualEMIChange('notes', e.target.value)}
                placeholder="Any additional notes about this EMI..."
              />
            </Grid>

            {/* Summary Card - Shows for both MONTHLY and ON_REQUEST types */}
            {manualEMIData.principalAmount && (
              (manualEMIData.repaymentType === 'MONTHLY' && manualEMIData.emiAmount && manualEMIData.totalTenure) ||
              manualEMIData.repaymentType === 'ON_REQUEST'
            ) && (
              <Grid item xs={12}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                  border: '2px solid',
                  borderColor: 'primary.light'
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      📊 {manualEMIData.repaymentType === 'MONTHLY' ? 'EMI Summary' : 'Loan Summary'}
                    </Typography>
                    
                    {manualEMIData.repaymentType === 'MONTHLY' ? (
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Principal</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(parseFloat(manualEMIData.principalAmount))}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Monthly EMI</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(parseFloat(manualEMIData.emiAmount))}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Total Payable</Typography>
                          <Typography variant="h6" color="secondary">
                            {formatCurrency(parseFloat(manualEMIData.emiAmount) * parseInt(manualEMIData.totalTenure))}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Total Interest</Typography>
                          <Typography variant="h6" color="error">
                            {formatCurrency((parseFloat(manualEMIData.emiAmount) * parseInt(manualEMIData.totalTenure)) - parseFloat(manualEMIData.principalAmount))}
                          </Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">Total Loan Amount</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(parseFloat(manualEMIData.principalAmount))}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">Repayment Type</Typography>
                          <Typography variant="h6" color="secondary">
                            🤝 On Request (Pay Anytime)
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: 'info.light', 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'info.main'
                          }}>
                            <Typography variant="body2" color="info.dark">
                              💡 <strong>Note:</strong> This is a personal loan that can be repaid anytime when requested. 
                              No fixed monthly EMI or tenure.
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCloseManualEMIDialog}
            variant="outlined"
            startIcon={<CloseIcon />}
            disabled={manualEMILoading}
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 3
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateManualEMI}
            variant="contained"
            startIcon={manualEMILoading ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={manualEMILoading}
            sx={{
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 6,
                background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
              },
              '&:disabled': {
                background: 'grey.300'
              }
            }}
          >
            {manualEMILoading ? 'Creating...' : 'Create EMI'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'error.main',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <WarningIcon />
          Delete EMI?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this EMI?
          </Typography>
          {selectedEMI && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={2}>
              <Typography variant="body2"><strong>Merchant:</strong> {selectedEMI.merchantName}</Typography>
              <Typography variant="body2"><strong>Card:</strong> {selectedEMI.cardProvider} {selectedEMI.cardLastFourDigits}</Typography>
              <Typography variant="body2"><strong>EMI Amount:</strong> {formatCurrency(selectedEMI.emiAmount)}</Typography>
              <Typography variant="body2"><strong>Remaining:</strong> {formatCurrency(selectedEMI.remainingAmount)}</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. All payment history will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setSelectedEMI(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteEMI}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 6
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Report Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AssessmentIcon />
          Export EMI Report
        </DialogTitle>
        
        <DialogContent sx={{ mt: 3 }}>
          <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
            Configure your EMI report parameters:
          </Typography>
          
          {/* Date Range Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              📅 Date Range
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={exportDateRange.startDate}
                  onChange={(e) => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="EMIs started from this date"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={exportDateRange.endDate}
                  onChange={(e) => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Payments due until this date"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Format Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              📄 Export Format
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Choose Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                label="Choose Format"
              >
                <MenuItem value="pdf">
                  <Box display="flex" alignItems="center" gap={1}>
                    <DownloadIcon sx={{ color: 'error.main' }} />
                    PDF Report (Detailed with formatting)
                  </Box>
                </MenuItem>
                <MenuItem value="excel">
                  <Box display="flex" alignItems="center" gap={1}>
                    <DownloadIcon sx={{ color: 'success.main' }} />
                    Excel Spreadsheet (Multiple sheets)
                  </Box>
                </MenuItem>
                <MenuItem value="csv">
                  <Box display="flex" alignItems="center" gap={1}>
                    <DownloadIcon sx={{ color: 'info.main' }} />
                    CSV File (Simple data)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Alert severity="info">
            <Box>
              <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                Report includes:
              </Typography>
              <Box component="ul" sx={{ marginTop: 1, paddingLeft: 2.5, fontSize: '0.875rem' }}>
                <li>EMI Overview & Summary Statistics</li>
                <li>All EMIs (Active, Completed, Foreclosed) in date range</li>
                <li>Upcoming Payments Schedule</li>
                <li>Payment History & Status</li>
                <li>Provider-wise Breakdown</li>
                <li>Interest & Principal Analysis</li>
              </Box>
            </Box>
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setExportDialogOpen(false)}
            disabled={exportLoading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExportReport}
            disabled={exportLoading}
            variant="contained"
            startIcon={exportLoading ? <CircularProgress size={16} /> : <DownloadIcon />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 6,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }
            }}
          >
            {exportLoading ? 'Exporting...' : 'Export Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EMITracker;
