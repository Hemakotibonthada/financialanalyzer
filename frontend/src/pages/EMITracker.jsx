import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
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
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Switch,
  FormControlLabel
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
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

import { API_URL as API_BASE } from '../services/api';
// use API_BASE which includes the /api path, e.g. http://host:5001/api
const API_URL = API_BASE;

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
  
  // Monthly Trends State
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [trendsMonths, setTrendsMonths] = useState(6);
  const [trendsLoading, setTrendsLoading] = useState(false);
  
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
  const [emiDetailOpen, setEmiDetailOpen] = useState(false);
  const [selectedEmiChartData, setSelectedEmiChartData] = useState(null);

  // Upcoming Payments State
  const [upcomingMonthsToShow, setUpcomingMonthsToShow] = useState(1); // Default show next month only

  // Debt Freedom Plan State
  const [debtAnalysis, setDebtAnalysis] = useState(null);
  const [earlyPaymentAmount, setEarlyPaymentAmount] = useState('');
  const [selectedEMIForEarlyPayment, setSelectedEMIForEarlyPayment] = useState(null);
  const [emergencyFundGoal, setEmergencyFundGoal] = useState(180000); // 6 months of 30k
  const [currentEmergencyFund, setCurrentEmergencyFund] = useState(0);
  const [emergencyFundSaving, setEmergencyFundSaving] = useState(false);
  const [emergencyFundMessage, setEmergencyFundMessage] = useState(null);
  const [emergencyFundContribution, setEmergencyFundContribution] = useState('');
  const [contributionSaving, setContributionSaving] = useState(false);
  const [lastContribution, setLastContribution] = useState(null);
  const [repaymentStrategy, setRepaymentStrategy] = useState('avalanche'); // avalanche or snowball
  const [acceleratorBoostPct, setAcceleratorBoostPct] = useState(20); // % of available income to channel as extra payment
  const [guardrailSettings, setGuardrailSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('guardrailSettings');
      if (stored) return JSON.parse(stored);
    } catch (err) {
      console.error('Error parsing guardrail settings from storage', err);
    }
    return {
      lockNewEmiAbove50: true,
      preDueReminder: true,
      forceAvalancheHighAPR: true,
      recommendBalanceTransfer: true,
      autoRoundUp: true
    };
  });
  const [guardrailAlerts, setGuardrailAlerts] = useState([]);
  const [lastReminderEmiId, setLastReminderEmiId] = useState(null);
  const [hardshipMode, setHardshipMode] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedReminderEmi, setSelectedReminderEmi] = useState(null);
  const [reminderTab, setReminderTab] = useState(0);

  const currentDti = overview?.overview?.monthlyBurden && userProfile?.monthlyIncome
    ? (overview.overview.monthlyBurden / userProfile.monthlyIncome) * 100
    : 0;
  const isDtiLockActive = guardrailSettings.lockNewEmiAbove50 && currentDti > 50;
  const isNewEmiLocked = isDtiLockActive || hardshipMode;

  // Loans Given State
  const [loansGiven, setLoansGiven] = useState([]);
  const [loansGivenSummary, setLoansGivenSummary] = useState(null);
  const [loansGivenLoading, setLoansGivenLoading] = useState(false);
  const [loanGivenDialogOpen, setLoanGivenDialogOpen] = useState(false);
  const [selectedLoanGiven, setSelectedLoanGiven] = useState(null);
  const [loanGivenFormData, setLoanGivenFormData] = useState({
    borrowerName: '',
    relationship: 'Friend',
    amount: '',
    loanDate: new Date().toISOString().split('T')[0],
    expectedRepaymentDate: '',
    purpose: '',
    contactDetails: {
      phone: '',
      email: ''
    },
    hasInterest: false,
    interestRate: 0,
    notes: '',
    priority: 'medium',
    tags: []
  });
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [repaymentData, setRepaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    transactionId: '',
    notes: ''
  });

  // Personal Loans State (Loans TAKEN from friends/family)
  const [personalLoans, setPersonalLoans] = useState([]);
  const [personalLoansSummary, setPersonalLoansSummary] = useState(null);
  const [personalLoansLoading, setPersonalLoansLoading] = useState(false);
  const [personalLoanDialogOpen, setPersonalLoanDialogOpen] = useState(false);
  const [selectedPersonalLoan, setSelectedPersonalLoan] = useState(null);
  const [personalLoanFormData, setPersonalLoanFormData] = useState({
    lenderName: '',
    relationship: 'Friend',
    principalAmount: '',
    loanTakenDate: new Date().toISOString().split('T')[0],
    repaymentOption: 'one-time', // 'one-time' | 'emi'
    repayDate: '',
    emiTenureMonths: 0,
    emiFrequency: 'monthly',
    interestRate: 0,
    interestType: 'none',
    purpose: '',
    contactDetails: {
      phone: '',
      email: ''
    },
    notes: '',
    priority: 'medium',
    tags: []
  });
  const [personalLoanRepaymentDialogOpen, setPersonalLoanRepaymentDialogOpen] = useState(false);
  const [personalLoanRepaymentData, setPersonalLoanRepaymentData] = useState({
    amount: '',
    notes: ''
  });
  // Message shown inside Personal Loans tab (instead of alert())
  const [personalLoanMessage, setPersonalLoanMessage] = useState(null);

  // Confirmation Dialog State
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmAction: () => {},
    emiDetails: null
  });

  // Export Report State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0], // 6 months ago
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 12, 0).toISOString().split('T')[0] // 12 months ahead
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchUserProfile(); // Fetch profile first
      await fetchAllData(); // Then fetch EMI data
      fetchMonthlyTrends(trendsMonths);
    };
    loadData();
    // Trigger card animations after component mount
    setTimeout(() => setAnimateCards(true), 100);
  }, [selectedPeriod, trendsMonths]);

  useEffect(() => {
    // Fetch loans given when tab 6 is active
    if (activeTab === 6) {
      fetchLoansGiven();
    }
    // Fetch personal loans when tab 7 is active
    if (activeTab === 7) {
      fetchPersonalLoans();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Profile API Full Response:', response.data);
      
      // API returns: { success: true, data: { profile: {...}, gmailConnected, gmailEmail } }
      if (response.data?.success && response.data?.data?.profile) {
        const profileData = response.data.data.profile;
        console.log('✅ Extracted Profile Object:', profileData);
        console.log('✅ Monthly Income Found:', profileData.monthlyIncome);
        setUserProfile(profileData);

        const emergencyFund = profileData?.preferences?.debtFreedom?.emergencyFund;
        if (emergencyFund && typeof emergencyFund === 'object') {
          if (typeof emergencyFund.goalAmount === 'number' && !Number.isNaN(emergencyFund.goalAmount)) {
            setEmergencyFundGoal(emergencyFund.goalAmount);
          }
          if (typeof emergencyFund.currentAmount === 'number' && !Number.isNaN(emergencyFund.currentAmount)) {
            setCurrentEmergencyFund(emergencyFund.currentAmount);
          }
          if (Array.isArray(emergencyFund.contributions) && emergencyFund.contributions.length > 0) {
            const latest = emergencyFund.contributions[emergencyFund.contributions.length - 1];
            setLastContribution(latest);
          }
        }
      } else {
        console.error('❌ Unexpected API response structure:', response.data);
        // Fallback to try other structures
        const fallbackProfile = response.data?.data?.profile || response.data?.data || response.data?.profile;
        console.log('⚠️ Using fallback profile:', fallbackProfile);
        setUserProfile(fallbackProfile);

        const emergencyFund = fallbackProfile?.preferences?.debtFreedom?.emergencyFund;
        if (emergencyFund && typeof emergencyFund === 'object') {
          if (typeof emergencyFund.goalAmount === 'number' && !Number.isNaN(emergencyFund.goalAmount)) {
            setEmergencyFundGoal(emergencyFund.goalAmount);
          }
          if (typeof emergencyFund.currentAmount === 'number' && !Number.isNaN(emergencyFund.currentAmount)) {
            setCurrentEmergencyFund(emergencyFund.currentAmount);
          }
          if (Array.isArray(emergencyFund.contributions) && emergencyFund.contributions.length > 0) {
            const latest = emergencyFund.contributions[emergencyFund.contributions.length - 1];
            setLastContribution(latest);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      console.error('Error details:', err.response?.data);
    }
  };

  const saveEmergencyFundStatus = async () => {
    setEmergencyFundSaving(true);
    setEmergencyFundMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/profile/debt-freedom/emergency-fund`,
        {
          currentAmount: Number(currentEmergencyFund) || 0,
          goalAmount: Number(emergencyFundGoal) || 0
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const saved = response.data?.data?.emergencyFund;
      if (saved) {
        if (typeof saved.goalAmount === 'number' && !Number.isNaN(saved.goalAmount)) setEmergencyFundGoal(saved.goalAmount);
        if (typeof saved.currentAmount === 'number' && !Number.isNaN(saved.currentAmount)) setCurrentEmergencyFund(saved.currentAmount);
        if (Array.isArray(saved.contributions) && saved.contributions.length > 0) {
          setLastContribution(saved.contributions[saved.contributions.length - 1]);
        }
      }

      setEmergencyFundMessage({ type: 'success', text: 'Emergency fund saved to your profile.' });
      setTimeout(() => setEmergencyFundMessage(null), 6000);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save emergency fund.';
      setEmergencyFundMessage({ type: 'error', text: message });
      setTimeout(() => setEmergencyFundMessage(null), 8000);
    } finally {
      setEmergencyFundSaving(false);
    }
  };

  const addEmergencyFundContribution = async () => {
    setContributionSaving(true);
    setEmergencyFundMessage(null);
    try {
      const amount = Number(emergencyFundContribution);
      if (!amount || amount <= 0) {
        setEmergencyFundMessage({ type: 'error', text: 'Enter a positive contribution amount.' });
        setContributionSaving(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/profile/debt-freedom/emergency-fund/contribution`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const saved = response.data?.data?.emergencyFund;
      if (saved) {
        if (typeof saved.currentAmount === 'number' && !Number.isNaN(saved.currentAmount)) setCurrentEmergencyFund(saved.currentAmount);
        if (typeof saved.goalAmount === 'number' && !Number.isNaN(saved.goalAmount)) setEmergencyFundGoal(saved.goalAmount);
        if (Array.isArray(saved.contributions) && saved.contributions.length > 0) {
          setLastContribution(saved.contributions[saved.contributions.length - 1]);
        }
      }

      setEmergencyFundContribution('');
      setEmergencyFundMessage({ type: 'success', text: 'Contribution added and saved.' });
      setTimeout(() => setEmergencyFundMessage(null), 6000);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add contribution.';
      setEmergencyFundMessage({ type: 'error', text: message });
      setTimeout(() => setEmergencyFundMessage(null), 8000);
    } finally {
      setContributionSaving(false);
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

      // Debug: log fetched data shapes to help diagnose blank charts on remote clients
      // eslint-disable-next-line no-console
      console.debug('EMI fetchAllData - API_URL:', API_URL, {
        overviewCount: overviewRes.data?.data ? Object.keys(overviewRes.data.data).length : 0,
        upcomingMonths: upcomingRes.data?.data?.monthlyBreakdown?.length ?? 0,
        chartsKeys: chartsRes.data?.data ? Object.keys(chartsRes.data.data) : [],
        insightsCount: insightsRes.data?.data?.length ?? 0
      });
    } catch (err) {
      console.error('Error fetching EMI data:', err);
      setError(err.response?.data?.message || 'Failed to fetch EMI data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTrends = async (months = 6) => {
    setTrendsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const response = await axios.get(`${API_URL}/emi/monthly-trends?months=${months}`, config);
      setMonthlyTrends(response.data.data);

      // Debug: log monthly trends shape
      // eslint-disable-next-line no-console
      console.debug('EMI fetchMonthlyTrends - API_URL:', API_URL, 'months:', months, 'items:', response.data?.data?.monthlyTrends?.length ?? 0);
    } catch (err) {
      console.error('Error fetching monthly trends:', err);
      setError(err.response?.data?.message || 'Failed to fetch monthly trends');
    } finally {
      setTrendsLoading(false);
    }
  };

  // Calculate comprehensive debt analysis
  const calculateDebtAnalysis = () => {
    if (!overview || !overview.overview || !overview.activeEMIs) {
      console.log('Missing overview data for debt analysis');
      return;
    }

    const monthlyIncome = userProfile?.monthlyIncome || 0;
    const monthlyBurden = overview.overview.monthlyBurden || 0;
    const totalOutstanding = overview.overview.totalOutstanding || 0;
    const totalInterestOutstanding = overview.overview.totalInterestOutstanding || 0;

    // Calculate debt-to-income ratio
    const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyBurden / monthlyIncome) * 100 : 0;

    // Calculate months to debt freedom at current rate
    const avgMonthsRemaining = overview.activeEMIs.length > 0 
      ? overview.activeEMIs.reduce((sum, emi) => sum + (emi.remainingInstallments || 0), 0) / overview.activeEMIs.length
      : 0;

    // Calculate total interest that will be paid
    const totalInterestToPay = overview.activeEMIs.reduce((sum, emi) => {
      const totalRemaining = emi.emiAmount * emi.remainingInstallments;
      const principalRemaining = emi.remainingAmount - (totalInterestOutstanding / overview.activeEMIs.length);
      const interestRemaining = totalRemaining - principalRemaining;
      return sum + Math.max(0, interestRemaining);
    }, 0);

    // Determine debt trap status
    let debtTrapStatus = 'healthy';
    let debtTrapMessage = 'Your EMI burden is manageable';
    
    if (debtToIncomeRatio > 50) {
      debtTrapStatus = 'danger';
      debtTrapMessage = '🚨 CRITICAL: Your EMI burden exceeds 50% of income! Immediate action required.';
    } else if (debtToIncomeRatio > 40) {
      debtTrapStatus = 'warning';
      debtTrapMessage = '⚠️ WARNING: High EMI burden. Consider debt consolidation or increasing income.';
    } else if (debtToIncomeRatio > 30) {
      debtTrapStatus = 'caution';
      debtTrapMessage = '⚡ CAUTION: EMI burden is above recommended 30%. Watch your spending.';
    }

    // Calculate emergency fund status
    const emergencyFundPercentage = emergencyFundGoal > 0 ? (currentEmergencyFund / emergencyFundGoal) * 100 : 0;
    const emergencyFundMonths = monthlyIncome > 0 ? currentEmergencyFund / monthlyIncome : 0;

    // Calculate available income after EMIs
    const availableIncome = monthlyIncome - monthlyBurden;
    const availablePercentage = monthlyIncome > 0 ? (availableIncome / monthlyIncome) * 100 : 0;

    // Sort EMIs for repayment strategies
    const sortedEMIsAvalanche = [...overview.activeEMIs].sort((a, b) => 
      (b.interestRate || 0) - (a.interestRate || 0)
    );
    
    const sortedEMIsSnowball = [...overview.activeEMIs].sort((a, b) => 
      (a.remainingAmount || 0) - (b.remainingAmount || 0)
    );

    // Calculate savings from early repayment
    const calculateEarlyRepaymentSavings = (emi) => {
      const monthlyRate = (emi.interestRate || 0) / 12 / 100;
      const remainingMonths = emi.remainingInstallments || 0;
      const currentRemaining = emi.remainingAmount || 0;
      
      // Interest saved if paid off today
      const totalPayable = emi.emiAmount * remainingMonths;
      const interestSaved = totalPayable - currentRemaining;
      return Math.max(0, interestSaved);
    };

    setDebtAnalysis({
      debtToIncomeRatio,
      debtTrapStatus,
      debtTrapMessage,
      monthlyIncome,
      monthlyBurden,
      availableIncome,
      availablePercentage,
      totalOutstanding,
      totalInterestOutstanding,
      totalInterestToPay,
      avgMonthsRemaining,
      emergencyFundGoal,
      currentEmergencyFund,
      emergencyFundPercentage,
      emergencyFundMonths,
      sortedEMIsAvalanche,
      sortedEMIsSnowball,
      calculateEarlyRepaymentSavings,
      recommendedMonthlyExtra: Math.max(0, availableIncome * 0.2) // Recommend saving 20% of available income
    });

    console.log('Debt analysis calculated:', {
      debtToIncomeRatio,
      debtTrapStatus,
      monthlyIncome,
      monthlyBurden,
      availableIncome
    });
  };

  // Calculate debt analysis when data changes
  useEffect(() => {
    if (overview && userProfile && activeTab === 8) {
      calculateDebtAnalysis();
    }
  }, [overview, userProfile, emergencyFundGoal, currentEmergencyFund, activeTab]);

  // Persist guardrail settings
  useEffect(() => {
    try {
      localStorage.setItem('guardrailSettings', JSON.stringify(guardrailSettings));
    } catch (err) {
      console.error('Failed to persist guardrail settings', err);
    }
  }, [guardrailSettings]);

  // Auto-enforce avalanche when high APR is present and guardrail is enabled
  useEffect(() => {
    const hasHighApr = overview?.activeEMIs?.some((emi) => (emi.interestRate || 0) >= 18);
    if (guardrailSettings.forceAvalancheHighAPR && hasHighApr) {
      setRepaymentStrategy('avalanche');
    }
  }, [guardrailSettings.forceAvalancheHighAPR, overview]);

  // Build guardrail alerts feed when risk conditions are met
  useEffect(() => {
    if (!debtAnalysis || !overview?.activeEMIs) return;

    const alerts = [];
    if (guardrailSettings.lockNewEmiAbove50 && debtAnalysis.debtToIncomeRatio > 50) {
      alerts.push({
        severity: 'error',
        title: 'New EMI locked',
        message: 'DTI is above 50%. Hold off on new credit until EMI drops or income rises.'
      });
    }

    if (guardrailSettings.preDueReminder) {
      const dueSoon = overview.activeEMIs
        .map((emi) => ({
          ...emi,
          daysUntilDue: emi.nextDueDate ? Math.ceil((new Date(emi.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30
        }))
        .filter((emi) => emi.daysUntilDue <= 7)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];
      if (dueSoon) {
        alerts.push({
          severity: 'warning',
          title: 'Upcoming EMI',
          message: `${dueSoon.merchantName} due in ${dueSoon.daysUntilDue} days. Consider early payment to avoid fees.`
        });
        if (dueSoon.id || dueSoon._id) {
          schedulePreDueReminder(dueSoon);
        }
      }
    }

    if (guardrailSettings.forceAvalancheHighAPR) {
      const highApr = overview.activeEMIs.filter((emi) => (emi.interestRate || 0) >= 18);
      if (highApr.length > 0) {
        alerts.push({
          severity: 'info',
          title: 'High APR detected',
          message: 'Avalanche prioritized automatically because APR ≥ 18% exists.'
        });
      }
    }

    if (guardrailSettings.recommendBalanceTransfer) {
      const transferCandidate = overview.activeEMIs.find((emi) => (emi.interestRate || 0) >= 18 && (emi.remainingInstallments || 0) > 6);
      if (transferCandidate) {
        alerts.push({
          severity: 'info',
          title: 'Balance transfer advised',
          message: `${transferCandidate.merchantName} at ${transferCandidate.interestRate}% is a transfer candidate.`
        });
      }
    }

    if (guardrailSettings.autoRoundUp && debtAnalysis.availableIncome > 500) {
      const roundUp = Math.min(2000, Math.floor(debtAnalysis.availableIncome * 0.3 / 100) * 100);
      if (roundUp > 0) {
        alerts.push({
          severity: 'success',
          title: 'Round-up ready',
          message: `Channel an extra ₹${roundUp.toLocaleString()} this month to accelerate payoff.`
        });
      }
    }

    setGuardrailAlerts(alerts);
  }, [guardrailSettings, debtAnalysis, overview]);

  const handleGuardrailToggle = (key) => (event) => {
    setGuardrailSettings((prev) => ({ ...prev, [key]: event.target.checked }));
  };

  const schedulePreDueReminder = async (emi) => {
    const emiId = emi.id || emi._id;
    if (!emiId || lastReminderEmiId === emiId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/reminders/pre-due`,
        {
          emiId,
          merchantName: emi.merchantName,
          daysUntilDue: emi.daysUntilDue || 7
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLastReminderEmiId(emiId);
    } catch (err) {
      console.error('Failed to schedule pre-due reminder', err);
    }
  };

  const handleExportMonthlyTrends = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        months: trendsMonths,
        format: format
      });
      
      const response = await axios.get(`${API_URL}/emi/monthly-trends/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
      const fileName = `Monthly_Trends_${trendsMonths}months_${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Show success message
      setError(null);
      alert(`Monthly Trends report exported successfully as ${format.toUpperCase()}!`);
    } catch (err) {
      console.error('Error exporting monthly trends:', err);
      setError(err.response?.data?.message || 'Failed to export monthly trends');
      alert('Failed to export report. Please try again.');
    }
  };

  // Fetch loans given
  const fetchLoansGiven = async () => {
    setLoansGivenLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const [loansResponse, summaryResponse] = await Promise.all([
        axios.get(`${API_URL}/loans-given`, config),
        axios.get(`${API_URL}/loans-given/summary`, config)
      ]);
      
      setLoansGiven(loansResponse.data.data);
      setLoansGivenSummary(summaryResponse.data.data);
    } catch (err) {
      console.error('Error fetching loans given:', err);
      setError(err.response?.data?.message || 'Failed to fetch loans given');
    } finally {
      setLoansGivenLoading(false);
    }
  };

  // Add or update loan given
  const handleSaveLoanGiven = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      if (selectedLoanGiven) {
        // Update existing loan
        await axios.put(`${API_URL}/loans-given/${selectedLoanGiven._id}`, loanGivenFormData, config);
        alert('Loan updated successfully!');
      } else {
        // Create new loan
        await axios.post(`${API_URL}/loans-given`, loanGivenFormData, config);
        alert('Loan recorded successfully!');
      }
      
      setLoanGivenDialogOpen(false);
      setSelectedLoanGiven(null);
      setLoanGivenFormData({
        borrowerName: '',
        relationship: 'Friend',
        amount: '',
        loanDate: new Date().toISOString().split('T')[0],
        expectedRepaymentDate: '',
        purpose: '',
        contactDetails: { phone: '', email: '' },
        hasInterest: false,
        interestRate: 0,
        notes: '',
        priority: 'medium',
        tags: []
      });
      fetchLoansGiven();
    } catch (err) {
      console.error('Error saving loan:', err);
      alert(err.response?.data?.message || 'Failed to save loan');
    }
  };

  // Add repayment to loan
  const handleAddRepayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(`${API_URL}/loans-given/${selectedLoanGiven._id}/repayment`, repaymentData, config);
      alert('Repayment added successfully!');
      
      setRepaymentDialogOpen(false);
      setRepaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'cash',
        transactionId: '',
        notes: ''
      });
      fetchLoansGiven();
    } catch (err) {
      console.error('Error adding repayment:', err);
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  // Delete loan given
  const handleDeleteLoanGiven = async (loanId) => {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.delete(`${API_URL}/loans-given/${loanId}`, config);
      alert('Loan deleted successfully!');
      fetchLoansGiven();
    } catch (err) {
      console.error('Error deleting loan:', err);
      alert(err.response?.data?.message || 'Failed to delete loan');
    }
  };

  // Write off loan
  const handleWriteOffLoan = async (loanId) => {
    if (!confirm('Are you sure you want to write off this loan? This action marks it as unrecoverable.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.put(`${API_URL}/loans-given/${loanId}/write-off`, {}, config);
      alert('Loan written off successfully!');
      fetchLoansGiven();
    } catch (err) {
      console.error('Error writing off loan:', err);
      alert(err.response?.data?.message || 'Failed to write off loan');
    }
  };

  // ==================== PERSONAL LOANS FUNCTIONS ====================
  // Fetch personal loans (loans TAKEN from friends/family)
  const fetchPersonalLoans = async () => {
    try {
      setPersonalLoansLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const [loansRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/personal-loans`, config),
        axios.get(`${API_URL}/personal-loans/summary`, config)
      ]);
      
      setPersonalLoans(loansRes.data.loans || []);
      setPersonalLoansSummary(summaryRes.data.summary || null);
    } catch (err) {
      console.error('Error fetching personal loans:', err);
      setError(err.response?.data?.message || 'Failed to fetch personal loans');
    } finally {
      setPersonalLoansLoading(false);
    }
  };

  // Save personal loan (create or update)
  const handleSavePersonalLoan = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      if (selectedPersonalLoan) {
        // Update existing loan
        await axios.put(`${API_URL}/personal-loans/${selectedPersonalLoan._id}`, personalLoanFormData, config);
        setPersonalLoanMessage({ type: 'success', text: 'Personal loan updated successfully!' });
      } else {
        // Create new loan
        await axios.post(`${API_URL}/personal-loans`, personalLoanFormData, config);
        setPersonalLoanMessage({ type: 'success', text: 'Personal loan added successfully!' });
      }
      
      setPersonalLoanDialogOpen(false);
      setSelectedPersonalLoan(null);
      setPersonalLoanFormData({
        lenderName: '',
        relationship: 'Friend',
        principalAmount: '',
        loanTakenDate: new Date().toISOString().split('T')[0],
        repaymentOption: 'one-time',
        repayDate: '',
        emiTenureMonths: 0,
        emiFrequency: 'monthly',
        interestRate: 0,
        interestType: 'none',
        purpose: '',
        contactDetails: {
          phone: '',
          email: ''
        },
        notes: '',
        priority: 'medium',
        tags: []
      });
      fetchPersonalLoans();
      // Auto-dismiss message after 6s
      if (personalLoanMessage === null) {
        // ensure setPersonalLoanMessage exists in closure; set a removal timer
        setTimeout(() => setPersonalLoanMessage(null), 6000);
      } else {
        setTimeout(() => setPersonalLoanMessage(null), 6000);
      }
    } catch (err) {
      console.error('Error saving personal loan:', err);
      alert(err.response?.data?.message || 'Failed to save personal loan');
    }
  };

  // Add repayment to personal loan
  const handleAddPersonalLoanRepayment = async () => {
    if (!selectedPersonalLoan) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(
        `${API_URL}/personal-loans/${selectedPersonalLoan._id}/repayment`, 
        { amount: parseFloat(personalLoanRepaymentData.amount) },
        config
      );
      
      alert('Repayment added successfully!');
      setPersonalLoanRepaymentDialogOpen(false);
      setSelectedPersonalLoan(null);
      setPersonalLoanRepaymentData({
        amount: '',
        notes: ''
      });
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error adding repayment:', err);
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  // Mark personal loan as fully repaid
  const handleMarkPersonalLoanRepaid = async (loanId) => {
    if (!confirm('Mark this loan as fully repaid?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.put(`${API_URL}/personal-loans/${loanId}/mark-repaid`, {}, config);
      alert('Loan marked as repaid successfully!');
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error marking loan as repaid:', err);
      alert(err.response?.data?.message || 'Failed to mark loan as repaid');
    }
  };

  // Delete personal loan
  const handleDeletePersonalLoan = async (loanId) => {
    if (!confirm('Are you sure you want to delete this personal loan record?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.delete(`${API_URL}/personal-loans/${loanId}`, config);
      alert('Personal loan deleted successfully!');
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error deleting personal loan:', err);
      alert(err.response?.data?.message || 'Failed to delete personal loan');
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

  const handleRequestBalanceTransfer = async (offer, candidate) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/balance-transfer-request`,
        {
          emiId: candidate.id || candidate._id,
          provider: offer.provider,
          offerRate: offer.rate,
          processingFee: offer.fee,
          currentRate: candidate.interestRate,
          remainingAmount: candidate.remainingAmount,
          remainingInstallments: candidate.remainingInstallments
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Offer request sent to ${offer.provider} for ${candidate.merchantName}. We will follow up.`);
    } catch (err) {
      console.error('Balance transfer request failed', err);
      alert(err.response?.data?.message || 'Could not send balance transfer request. Please try again.');
    }
  };

  const handleOneClickPrepay = async (emi) => {
    if (!emi) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/one-click-prepay`,
        { emiId: emi.id || emi._id, amount: Math.min(emi.remainingAmount, emi.emiAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Prepayment scheduled. Great move!');
      fetchAllData();
    } catch (err) {
      console.error('One-click prepay failed', err);
      alert(err.response?.data?.message || 'Could not schedule prepayment.');
    }
  };

  const handleSetupAutoSweep = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/auto-sweep`,
        { sweepPercentage: 20 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Auto-sweep set to divert 20% surplus to highest-APR EMI.');
    } catch (err) {
      console.error('Auto-sweep setup failed', err);
      alert(err.response?.data?.message || 'Could not set auto-sweep.');
    }
  };

  const handleEnableLateFeeShield = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/emi/late-fee-shield`,
        { notifyDaysBefore: 5 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Late-fee shield armed: you will get alerts and auto-pay nudges 5 days before due.');
    } catch (err) {
      console.error('Late fee shield failed', err);
      alert(err.response?.data?.message || 'Could not enable late-fee shield.');
    }
  };

  // Manual EMI Dialog Handlers
  const handleOpenManualEMIDialog = () => {
    if (isNewEmiLocked) {
      alert('New EMI creation is locked (DTI > 50% or Hardship Mode on). Reduce EMI burden, increase income, or disable Hardship Mode to unlock.');
      return;
    }
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
  const handleMarkAsPaid = async (emiId, installmentNumber, emiDetails) => {
    // Open confirmation dialog first
    setConfirmationDialog({
      open: true,
      title: 'Mark Payment as Paid',
      message: `Are you sure you want to mark this EMI payment of ${formatCurrency(emiDetails.amount)} as paid?`,
      confirmAction: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `${API_URL}/emi/${emiId}/mark-paid`,
            { installmentNumber, paidDate: new Date().toISOString() },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          // Immediately update the UI by removing the paid EMI from upcomingPayments
          if (upcomingPayments && upcomingPayments.monthlyBreakdown) {
            const updatedBreakdown = upcomingPayments.monthlyBreakdown.map(month => ({
              ...month,
              emis: month.emis.filter(emi => emi.emiId !== emiId || emi.installmentNumber !== installmentNumber),
              emiCount: month.emis.filter(emi => emi.emiId !== emiId || emi.installmentNumber !== installmentNumber).length,
              totalAmount: month.emis
                .filter(emi => emi.emiId !== emiId || emi.installmentNumber !== installmentNumber)
                .reduce((sum, emi) => sum + emi.amount, 0)
            })).filter(month => month.emiCount > 0); // Remove empty months

            setUpcomingPayments({
              ...upcomingPayments,
              monthlyBreakdown: updatedBreakdown
            });
          }

          // Close dialog with success message
          setConfirmationDialog(prev => ({
            ...prev,
            open: true,
            title: 'Success',
            message: 'Payment marked as paid!',
            isSuccess: true,
            confirmAction: () => {
              setConfirmationDialog(prev => ({ ...prev, open: false }));
            }
          }));

          // Refresh data in background
          fetchAllData();
        } catch (err) {
          console.error('Error marking payment as paid:', err);
          setConfirmationDialog(prev => ({
            ...prev,
            title: 'Error',
            message: 'Failed to mark payment as paid. Please try again.',
            isError: true
          }));
        }
      },
      emiDetails
    });
  };

  // Build chart data when an EMI is selected for details
  useEffect(() => {
    if (!selectedEMI) {
      setSelectedEmiChartData(null);
      return;
    }

    // Prefer backend schedule if available
    const schedule = selectedEMI.schedule && selectedEMI.schedule.length ? selectedEMI.schedule : null;
    if (schedule) {
      // Map schedule to chart points: installment index, dueDate, amount, paid
      const data = schedule.map(s => ({
        name: `#${s.installmentNumber}`,
        dueDate: s.dueDate,
        amount: s.amount,
        paid: !!s.paid
      }));
      setSelectedEmiChartData(data);
      return;
    }

    // Fallback: synthesize by using totalTenure and emiAmount
    const tenure = parseInt(selectedEMI.totalTenure || 0, 10);
    const amt = parseFloat(selectedEMI.emiAmount || 0);
    if (tenure > 0 && amt > 0) {
      const data = Array.from({ length: tenure }).map((_, idx) => ({
        name: `#${idx + 1}`,
        dueDate: null,
        amount: amt,
        paid: idx < (selectedEMI.paidInstallments || 0)
      }));
      setSelectedEmiChartData(data);
      return;
    }

    setSelectedEmiChartData(null);
  }, [selectedEMI]);

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

  const projectDebtFreedom = (baseMonths, extraMonthly, baselineMonthly) => {
    if (!baseMonths || !baselineMonthly) {
      return { months: baseMonths || 0, targetDate: 'N/A', monthsSaved: 0, lift: 0 };
    }

    const effectiveMonthly = baselineMonthly + extraMonthly;
    const lift = effectiveMonthly > 0 ? effectiveMonthly / baselineMonthly : 1;
    const acceleratedMonths = lift > 0 ? baseMonths / lift : baseMonths;
    const monthsSaved = Math.max(0, baseMonths - acceleratedMonths);

    const targetDate = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + Math.max(0, Math.ceil(acceleratedMonths)));
      return formatDate(d);
    })();

    return { months: acceleratedMonths, targetDate, monthsSaved, lift };
  };

  // Helper to show ordinal suffix for day numbers (e.g., 1st, 2nd)
  const getOrdinalSuffix = (n) => {
    const s = ["th","st","nd","rd"], v = n%100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  const estimateEndDate = (emi) => {
    if (!emi) return null;
    if (emi.endDate) return emi.endDate;
    if (emi.schedule && emi.schedule.length) return emi.schedule[emi.schedule.length - 1].dueDate;
    try {
      const start = emi.startDate ? new Date(emi.startDate) : null;
      const months = parseInt(emi.totalTenure || 0, 10);
      if (!start || !months) return null;
      const d = new Date(start);
      d.setMonth(d.getMonth() + months - 1);
      return d.toISOString();
    } catch (e) {
      return null;
    }
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
    <>
      <Sidebar />
      <Box className="lg:ml-72 min-h-screen bg-gray-50">
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
              {/* Inline message for create/update actions */}
              <Box mb={2}>
                <Collapse in={!!personalLoanMessage}>
                  {personalLoanMessage && (
                    <Alert
                      severity={personalLoanMessage.type}
                      onClose={() => setPersonalLoanMessage(null)}
                      sx={{ mb: 2 }}
                    >
                      {personalLoanMessage.text}
                    </Alert>
                  )}
                </Collapse>
              </Box>
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
            <Tooltip
              title={isNewEmiLocked ? 'Locked: lower DTI below 50% or turn off Hardship Mode to add new EMIs.' : ''}
              placement="top"
              arrow
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenManualEMIDialog}
                  disabled={isNewEmiLocked}
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
              </span>
            </Tooltip>
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

      {/* EMI Detail Dialog - shows full EMI information when a card is clicked */}
      <Dialog
        open={emiDetailOpen}
        onClose={() => setEmiDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedEMI ? `${selectedEMI.merchantName} — EMI Details` : 'EMI Details'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedEMI ? (
            <Grid container spacing={2} alignItems="flex-start">
              {/* Left column: Start / End / Next EMI Day first, then provider info */}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Start Date</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.startDate ? formatDate(selectedEMI.startDate) : '—'}</Typography>

                <Typography variant="subtitle2">Estimated End Date</Typography>
                <Typography variant="body1" gutterBottom>{estimateEndDate(selectedEMI) ? formatDate(estimateEndDate(selectedEMI)) : '—'}</Typography>

                <Typography variant="subtitle2">Next EMI Day</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.nextDueDate ? getOrdinalSuffix(new Date(selectedEMI.nextDueDate).getDate()) : '—'}</Typography>

                <Typography variant="subtitle2">Provider</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.cardProvider} {selectedEMI.cardLastFourDigits}</Typography>

                <Typography variant="subtitle2">EMI Amount</Typography>
                <Typography variant="body1" gutterBottom>{formatCurrency(selectedEMI.emiAmount)}</Typography>

                <Typography variant="subtitle2">Principal</Typography>
                <Typography variant="body1" gutterBottom>{formatCurrency(selectedEMI.principalAmount)}</Typography>

                <Typography variant="subtitle2">Interest Rate</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.interestRate}% p.a.</Typography>

                <Typography variant="subtitle2">Repayment Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.repaymentType === 'ON_REQUEST' ? 'On Request (flexible)' : 'Monthly'}</Typography>
              </Grid>

              {/* Right column: tenure, completion, remaining, next due + chart */}
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle2">Tenure</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.paidInstallments} paid of {selectedEMI.totalTenure}</Typography>

                <Typography variant="subtitle2">Completion</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.completionPercentage}%</Typography>

                <Typography variant="subtitle2">Remaining Amount</Typography>
                <Typography variant="body1" gutterBottom>{formatCurrency(selectedEMI.remainingAmount)}</Typography>

                <Typography variant="subtitle2">Next Due Date</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.nextDueDate ? formatDate(selectedEMI.nextDueDate) : '—'}</Typography>

                {selectedEMI.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Notes</Typography>
                    <Typography variant="body2" gutterBottom>{selectedEMI.notes}</Typography>
                  </Box>
                )}

                {/* Show circular completion indicator instead of chart */}
                <Box sx={{ mt: 1, height: { xs: 220, sm: 340 }, display: 'flex', justifyContent: 'flex-end' }}>
                  <Box sx={{ width: { xs: 120, sm: 180 }, height: { xs: 120, sm: 180 }, ml: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    {(() => {
                      const pct = selectedEMI.completionPercentage != null
                        ? Math.round(selectedEMI.completionPercentage)
                        : (selectedEMI.totalTenure ? Math.round(( (selectedEMI.paidInstallments || 0) / selectedEMI.totalTenure) * 100) : 0);
                      return (
                        <>
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress variant="determinate" value={Math.min(Math.max(pct, 0), 100)} size={Math.min(180, Math.max(120, pct * 1))} thickness={6} sx={{ color: '#667eea' }} />
                            <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="h6" component="div">{pct}%</Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" sx={{ mt: 1 }}>Completed</Typography>
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              </Grid>

              {/* notes rendered in right column above; avoid duplicate */}

              {/* If backend provides transaction history or schedule, show it */}
              {selectedEMI.schedule && selectedEMI.schedule.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Payment Schedule</Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Installment</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedEMI.schedule.map((s, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{s.installmentNumber}</TableCell>
                            <TableCell>{formatDate(s.dueDate)}</TableCell>
                            <TableCell>{formatCurrency(s.amount)}</TableCell>
                            <TableCell>{s.paid ? `Paid (${formatDate(s.paidDate)})` : 'Pending'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography>No EMI selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmiDetailOpen(false)}>Close</Button>
          <Button
            color="primary"
            onClick={() => {
              if (!selectedEMI) return;
              // Open edit dialog
              setEditEMIDialogOpen(true);
              setEmiDetailOpen(false);
            }}
          >
            Edit
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (!selectedEMI) return;
              setDeleteConfirmOpen(true);
              setEmiDetailOpen(false);
            }}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!selectedEMI) return;
              if (selectedEMI.repaymentType === 'ON_REQUEST') {
                setConfirmationDialog({
                  open: true,
                  title: 'Cannot Mark as Paid',
                  message: 'This EMI is On-Request and cannot be marked as a regular installment.',
                  isError: true,
                  confirmAction: () => setConfirmationDialog(prev => ({ ...prev, open: false }))
                });
                return;
              }
              const nextInstallment = (selectedEMI.paidInstallments || 0) + 1;
              handleMarkAsPaid(
                selectedEMI.id || selectedEMI.emiId || selectedEMI._id, 
                nextInstallment,
                {
                  amount: selectedEMI.emiAmount,
                  dueDate: selectedEMI.nextDueDate
                }
              );
              setEmiDetailOpen(false);
            }}
          >
            Mark Next Installment Paid
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog (used for marking EMI paid and generic confirmations) */}
      <Dialog
        open={confirmationDialog.open}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: confirmationDialog.isError ? 'error.main' : confirmationDialog.isSuccess ? 'success.main' : 'text.primary' }}>
          {confirmationDialog.isError ? <WarningIcon color="error" /> : confirmationDialog.isSuccess ? <CheckCircleIcon color="success" /> : <InfoIcon />}
          {confirmationDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography>{confirmationDialog.message}</Typography>
          {confirmationDialog.emiDetails && !confirmationDialog.isSuccess && !confirmationDialog.isError && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">Payment Details</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>Amount: {formatCurrency(confirmationDialog.emiDetails.amount)}</Typography>
              <Typography variant="body2" color="text.secondary">Due Date: {confirmationDialog.emiDetails.dueDate ? formatDate(confirmationDialog.emiDetails.dueDate) : '—'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {(!confirmationDialog.isSuccess && !confirmationDialog.isError) ? (
            <>
              <Button onClick={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => {
                  // call confirmAction if provided
                  if (typeof confirmationDialog.confirmAction === 'function') {
                    // Run the action and leave dialog open until it updates state
                    confirmationDialog.confirmAction();
                  } else {
                    setConfirmationDialog(prev => ({ ...prev, open: false }));
                  }
                }}
                sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                Confirm
              </Button>
            </>
          ) : (
            <Button variant="contained" color={confirmationDialog.isError ? 'error' : 'success'} onClick={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}>
              OK
            </Button>
          )}
        </DialogActions>
      </Dialog>

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
                      {formatCurrency(overview.overview.totalOutstanding + ((personalLoansSummary && personalLoansSummary.totalOutstanding) || 0))}
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
                {personalLoansSummary && personalLoansSummary.totalOutstanding > 0 && (
                  <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 400, mt: 0.5, display: 'block' }}>
                    (EMI: {formatCurrency(overview.overview.totalOutstanding)} + Personal Loans: {formatCurrency(personalLoansSummary.totalOutstanding)})
                  </Typography>
                )}
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

      {/* Priority Tips + Next Schedule (shown on open, below summary cards) - ALWAYS VISIBLE */}
      {overview && (
        <Card
          elevation={3}
          sx={{
            mb: 4,
            bgcolor: 'white',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)',
            border: '2px solid',
            borderColor: '#667eea',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)'
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 2,
              color: 'white'
            }}
          >
            <Typography variant="h5" fontWeight={900} sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              🎯 Priority Dashboard
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95, mt: 0.5 }}>
              Your most important actions, schedules & progress at a glance
            </Typography>
          </Box>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            {(() => {
              const activeEmis = overview.activeEMIs || [];
              const withDue = activeEmis
                .filter((emi) => emi.nextDueDate)
                .map((emi) => ({
                  ...emi,
                  dueDateObj: new Date(emi.nextDueDate)
                }))
                .filter((emi) => !Number.isNaN(emi.dueDateObj.getTime()))
                .sort((a, b) => a.dueDateObj - b.dueDateObj);

              const soonest = withDue[0] || null;
              const topApr = [...activeEmis]
                .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0] || null;

              const scheduleItems = withDue.slice(0, 3);
              const today = new Date();

              const soonestDays = soonest
                ? Math.ceil((soonest.dueDateObj - today) / (1000 * 60 * 60 * 24))
                : null;

              const dti = currentDti || 0;
              const highDti = dti > 50;
              const warnDti = dti > 40 && dti <= 50;

              // Calculate next month total
              const nextMonthTotal = upcomingPayments?.monthlyBreakdown?.[0]?.totalAmount || 0;

              // Calculate debt-free progress
              const totalOriginal = (overview.overview?.totalOutstanding || 0) + (overview.overview?.totalAmountPaid || 0);
              const debtFreeProgress = totalOriginal > 0 ? ((overview.overview?.totalAmountPaid || 0) / totalOriginal) * 100 : 0;

              // Emergency fund status
              const efPercentage = emergencyFundGoal > 0 ? (currentEmergencyFund / emergencyFundGoal) * 100 : 0;
              const efStatus = efPercentage >= 100 ? 'success' : efPercentage >= 50 ? 'warning' : 'error';

              return (
                <>
                  {/* Summary Overview Section */}
                  <Box sx={{ mb: 3, p: 2.5, bgcolor: '#f8f9fa', borderRadius: 3, border: '1px solid #e0e0e0' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Active EMIs</Typography>
                        <Typography variant="h5" fontWeight={800} color="primary">{overview.overview?.totalActiveEMIs || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Outstanding</Typography>
                        <Typography variant="h5" fontWeight={800} color="error">{formatCurrency(overview.overview?.totalOutstanding || 0)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Monthly Burden</Typography>
                        <Typography variant="h5" fontWeight={800} color="warning.main">{formatCurrency(overview.overview?.monthlyBurden || 0)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Paid</Typography>
                        <Typography variant="h5" fontWeight={800} color="success.main">{formatCurrency(overview.overview?.totalAmountPaid || 0)}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Quick Stats Row */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ bgcolor: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="caption" fontWeight={700} color="#2e7d32">🛡️ EMERGENCY FUND</Typography>
                          <Typography variant="h6" fontWeight={900} color="#2e7d32">
                            {efPercentage.toFixed(0)}% funded
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(efPercentage, 100)}
                            sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: '#c8e6c9', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {formatCurrency(currentEmergencyFund)} / {formatCurrency(emergencyFundGoal)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="caption" fontWeight={700} color="#1565c0">📅 NEXT MONTH DUE</Typography>
                          <Typography variant="h6" fontWeight={900} color="#1565c0">
                            {nextMonthTotal > 0 ? formatCurrency(nextMonthTotal) : formatCurrency(overview.overview?.monthlyBurden || 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {nextMonthTotal > 0 
                              ? `${upcomingPayments?.monthlyBreakdown?.[0]?.emis?.length || 0} EMI payment(s)`
                              : `~${overview.overview?.totalActiveEMIs || 0} active EMI(s)`}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ bgcolor: '#f3e5f5', border: '2px solid #9c27b0', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="caption" fontWeight={700} color="#6a1b9a">🎉 DEBT-FREE PROGRESS</Typography>
                          <Typography variant="h6" fontWeight={900} color="#6a1b9a">
                            {totalOriginal > 0 ? `${debtFreeProgress.toFixed(1)}%` : 'N/A'}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(debtFreeProgress, 100)}
                            sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: '#e1bee7', '& .MuiLinearProgress-bar': { bgcolor: '#9c27b0' } }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {totalOriginal > 0 
                              ? `Remaining: ${formatCurrency(overview.overview?.totalOutstanding || 0)}`
                              : 'No debt to track'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end" sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setActiveTab(3)}
                    >
                      View Upcoming
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      onClick={() => setActiveTab(8)}
                    >
                      Debt Freedom Plan
                    </Button>
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={7}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper'
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
                          📅 Next due schedule
                        </Typography>

                        {activeEmis.length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              🎉 No active EMIs!
                            </Typography>
                            <Typography variant="body2">
                              You're EMI-free! Start building your emergency fund and savings.
                            </Typography>
                          </Alert>
                        ) : soonest ? (
                          <Alert
                            severity={soonestDays !== null && soonestDays <= 7 ? 'warning' : 'info'}
                            sx={{ borderRadius: 2, mb: 2 }}
                          >
                            <Typography variant="subtitle2" fontWeight={800}>
                              {soonest.merchantName} {soonestDays !== null ? `due in ${soonestDays} day(s)` : 'due soon'}
                            </Typography>
                            <Typography variant="body2">
                              Amount: {formatCurrency(soonest.emiAmount)} • Due: {soonest.dueDateObj.toLocaleDateString()}
                            </Typography>
                          </Alert>
                        ) : (
                          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                            No upcoming due dates found on active EMIs.
                          </Alert>
                        )}

                        {scheduleItems.length > 0 && (
                          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                  <TableCell sx={{ fontWeight: 800 }}>EMI</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 800 }}>Amount</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 800 }}>Due</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {scheduleItems.map((emi) => (
                                  <TableRow key={emi.id || emi._id} hover>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={700}>
                                        {emi.merchantName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {emi.cardProvider}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(emi.emiAmount)}</TableCell>
                                    <TableCell align="right">{emi.dueDateObj.toLocaleDateString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          height: '100%'
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
                          💡 Most important tips
                        </Typography>

                        {activeEmis.length === 0 ? (
                          <>
                            <Alert severity="success" sx={{ borderRadius: 2, mb: 1.5 }}>
                              <Typography variant="subtitle2" fontWeight={800}>
                                Build emergency fund first
                              </Typography>
                              <Typography variant="body2">
                                Aim for 6 months of expenses ({formatCurrency(emergencyFundGoal)}) before taking new EMIs.
                              </Typography>
                            </Alert>
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                              <Typography variant="subtitle2" fontWeight={800}>
                                Stay debt-free
                              </Typography>
                              <Typography variant="body2">
                                Avoid new EMIs unless necessary. Save and invest for your future goals.
                              </Typography>
                            </Alert>
                          </>
                        ) : (
                          <>
                            {highDti && (
                          <Alert severity="error" sx={{ borderRadius: 2, mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              Stop new EMIs for now
                            </Typography>
                            <Typography variant="body2">
                              Your DTI is {dti.toFixed(1)}%. Keep it under 50% before taking new credit.
                            </Typography>
                          </Alert>
                        )}

                        {warnDti && (
                          <Alert severity="warning" sx={{ borderRadius: 2, mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              Reduce burden (DTI {dti.toFixed(1)}%)
                            </Typography>
                            <Typography variant="body2">
                              Avoid new EMIs and consider consolidation / balance transfer for high-rate EMIs.
                            </Typography>
                          </Alert>
                        )}

                        {!!topApr && (
                          <Alert severity="info" sx={{ borderRadius: 2, mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              Avalanche target
                            </Typography>
                            <Typography variant="body2">
                              Focus extra payments on <strong>{topApr.merchantName}</strong> ({topApr.interestRate || 0}% APR) to save interest.
                            </Typography>
                          </Alert>
                        )}

                            <Alert severity="success" sx={{ borderRadius: 2 }}>
                              <Typography variant="subtitle2" fontWeight={800}>
                                Use the plan tab weekly
                              </Typography>
                              <Typography variant="body2">
                                Open <strong>Debt Freedom Plan</strong> to see payoff order, guardrails, and quick actions.
                              </Typography>
                            </Alert>
                          </>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </>
              );
            })()}
          </CardContent>
        </Card>
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
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
            label="Monthly Trends" 
            icon={<TrendingUpIcon />} 
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
          <Tab 
            label="Loans Given" 
            icon={<PaymentIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Personal Loans" 
            icon={<MoneyIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Debt Freedom Plan" 
            icon={<TrendingUpIcon />} 
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
                {(!chartData || !chartData.pieChart || chartData.pieChart.length === 0) ? (
                  <Box sx={{ p: 4 }}>
                    <Alert severity="info">No distribution data available to render this chart. If you're on a remote device, please ensure the backend is reachable (calls should go to your laptop IP) and reload.</Alert>
                  </Box>
                ) : (
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
                )}
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
      {/* Monthly Trends Tab */}
      {activeTab === 1 && monthlyTrends && (
        <Box sx={{ p: 3 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Monthly Trends
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Income and spending over time
            </Typography>
          </Box>

          {/* Date Range and Controls */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexWrap: 'wrap',
            gap: 2 
          }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                type="month"
                size="small"
                defaultValue={new Date().toISOString().slice(0, 7)}
                sx={{ width: 150 }}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                type="month"
                size="small"
                defaultValue={new Date().toISOString().slice(0, 7)}
                sx={{ width: 150 }}
              />
              <Button variant="text" size="small">Clear</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label="Show Investments" 
                icon={<CheckCircleIcon />}
                color="primary" 
                size="small"
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select value={trendsMonths} onChange={(e) => setTrendsMonths(e.target.value)}>
                  <MenuItem value={3}>3 Months</MenuItem>
                  <MenuItem value={5}>5 Months</MenuItem>
                  <MenuItem value={6}>6 Months</MenuItem>
                  <MenuItem value={12}>12 Months</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportMonthlyTrends('pdf')}
                sx={{ ml: 1 }}
              >
                Export PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportMonthlyTrends('excel')}
              >
                Export Excel
              </Button>
            </Box>
          </Box>

          {/* Summary Cards Row */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                bgcolor: '#d4f4dd',
                borderRadius: 2,
                border: '1px solid #a8e6b8'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      💵 Avg Monthly Income
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                      ↗ {monthlyTrends.analysis.incomeChange >= 0 ? '+' : ''}{monthlyTrends.analysis.incomeChange}%
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                    ₹{Math.round(monthlyTrends.summary.avgMonthlyIncome).toLocaleString('en-IN')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                bgcolor: '#fde8e8',
                borderRadius: 2,
                border: '1px solid #f8b4b4'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      📅 Avg Monthly Spending
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600 }}>
                      ↗ {monthlyTrends.analysis.spendingChange >= 0 ? '+' : ''}{Math.abs(monthlyTrends.analysis.spendingChange)}%
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#c62828' }}>
                    ₹{Math.round(monthlyTrends.summary.avgMonthlySpendings).toLocaleString('en-IN')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                bgcolor: '#f0e6f6',
                borderRadius: 2,
                border: '1px solid #d4b5e8'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      📊 Total Investments
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6a1b9a', fontWeight: 600 }}>
                      ↗ {trendsMonths} months
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#6a1b9a' }}>
                    ₹{Math.round(monthlyTrends.summary.totalInvestments).toLocaleString('en-IN')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                bgcolor: '#e3f2fd',
                borderRadius: 2,
                border: '1px solid #90caf9'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      🐷 Avg Savings Rate
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
                      ↘ {Math.abs(monthlyTrends.summary.avgSavingsRate)}%
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565c0' }}>
                    ₹{Math.round(monthlyTrends.summary.totalNetSavings / trendsMonths).toLocaleString('en-IN')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Month-over-Month Change Banner */}
          <Card elevation={0} sx={{ 
            mb: 3, 
            bgcolor: '#fafafa',
            border: '1px solid #e0e0e0',
            borderRadius: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Month-over-Month Change
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Comparing {monthlyTrends.monthlyTrends[monthlyTrends.monthlyTrends.length - 1]?.monthName} vs {monthlyTrends.monthlyTrends[monthlyTrends.monthlyTrends.length - 2]?.monthName}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: '#c62828', fontWeight: 700 }}>
                        {monthlyTrends.analysis.spendingChange >= 0 ? '+' : ''}Infinity%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Spending Change
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        ₹{Math.round(Math.abs(monthlyTrends.analysis.difference)).toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Difference
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Main Comprehensive Chart */}
          <Card elevation={0} sx={{ 
            borderRadius: 2,
            border: '1px solid #e0e0e0',
            mb: 3
          }}>
            <CardContent sx={{ p: 3 }}>
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={monthlyTrends.monthlyTrends}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f44336" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9c27b0" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNetSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  
                  <RechartsTooltip 
                    formatter={(value, name) => [formatCurrency(value), name]}
                    contentStyle={{ 
                      borderRadius: 8, 
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  
                  <Legend 
                    wrapperStyle={{ paddingTop: 20 }}
                    iconType="circle"
                  />
                  
                  {/* Income Line */}
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#4caf50"
                    strokeWidth={2}
                    fill="url(#colorIncome)"
                    name="Income"
                    dot={{ fill: '#4caf50', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  
                  {/* Spending Line */}
                  <Area
                    type="monotone"
                    dataKey="spendings"
                    stroke="#f44336"
                    strokeWidth={2}
                    fill="url(#colorSpending)"
                    name="Spending"
                    dot={{ fill: '#f44336', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  
                  {/* Investments Line */}
                  <Area
                    type="monotone"
                    dataKey="investments"
                    stroke="#9c27b0"
                    strokeWidth={2}
                    fill="url(#colorInvestments)"
                    name="Investments"
                    dot={{ fill: '#9c27b0', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  
                  {/* Net Savings Line with Dashed Style */}
                  <Line
                    type="monotone"
                    dataKey="netSavings"
                    stroke="#2196f3"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Net Savings"
                    dot={{ fill: '#2196f3', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottom Summary Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ 
                bgcolor: '#fafafa',
                borderRadius: 2,
                border: '1px solid #e0e0e0'
              }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Best Month
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                    {monthlyTrends.analysis.bestMonth || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ 
                bgcolor: '#fafafa',
                borderRadius: 2,
                border: '1px solid #e0e0e0'
              }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Total Period
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {trendsMonths} months
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ 
                bgcolor: '#fafafa',
                borderRadius: 2,
                border: '1px solid #e0e0e0'
              }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Consistency Score
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196f3' }}>
                    {monthlyTrends.analysis.consistencyScore}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Breakdown Table */}
          <Card elevation={0} sx={{ 
            mt: 3,
            borderRadius: 2,
            border: '1px solid #e0e0e0'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Monthly Breakdown Details
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Income</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Spendings</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>EMI</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Investments</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Loans</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Commitments</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Net Savings</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Savings %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyTrends.monthlyTrends.map((row, idx) => (
                      <TableRow 
                        key={idx} 
                        hover
                        sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>
                          {row.monthName} {row.year}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 600 }}>
                          ₹{Math.round(row.income).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#f44336' }}>
                          ₹{Math.round(row.spendings).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#2196f3' }}>
                          ₹{Math.round(row.emiPayments).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#9c27b0' }}>
                          ₹{Math.round(row.investments).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#ff9800' }}>
                          ₹{Math.round(row.loanPayments).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ₹{Math.round(row.monthlyCommitments).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: row.netSavings >= 0 ? '#4caf50' : '#f44336', 
                          fontWeight: 600 
                        }}>
                          ₹{Math.round(row.netSavings).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {row.savingsRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Reports Tab */}
      {activeTab === 2 && chartData && (
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

      {/* Upcoming Payments Tab */}
      {activeTab === 3 && upcomingPayments && (
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

      {/* Active EMIs Tab */}
      {activeTab === 4 && overview && (
        <Grid container spacing={3}>
          {overview.activeEMIs.map((emi) => (
            <Grid item xs={12} md={6} lg={4} key={emi.id}>
              <Card 
                elevation={3}
                onClick={() => {
                  // Open EMI detail when card is clicked
                  setSelectedEMI(emi);
                  setEmiDetailOpen(true);
                }}
                sx={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
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
                          onClick={(e) => {
                            // Prevent card click from firing
                            e.stopPropagation();
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

      {/* Tab 5: Completed EMIs */}
      {activeTab === 5 && overview && (
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

      {/* Tab 6: Loans Given to Friends & Family */}
      {activeTab === 6 && (
        <Box>
          {/* Summary Cards */}
          {loansGivenSummary && (
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Lent</Typography>
                    <Typography variant="h4">₹{loansGivenSummary.totalLent.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Outstanding</Typography>
                    <Typography variant="h4">₹{loansGivenSummary.totalOutstanding.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Repaid</Typography>
                    <Typography variant="h4">₹{loansGivenSummary.totalRepaid.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Active Loans</Typography>
                    <Typography variant="h4">{loansGivenSummary.activeLoansCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Add New Loan Button */}
          <Box mb={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedLoanGiven(null);
                setLoanGivenFormData({
                  borrowerName: '',
                  relationship: 'Friend',
                  amount: '',
                  loanDate: new Date().toISOString().split('T')[0],
                  expectedRepaymentDate: '',
                  purpose: '',
                  contactDetails: { phone: '', email: '' },
                  hasInterest: false,
                  interestRate: 0,
                  notes: '',
                  priority: 'medium',
                  tags: []
                });
                setLoanGivenDialogOpen(true);
              }}
              sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
            >
              Add Loan Given
            </Button>
          </Box>

          {/* Loans List */}
          {loansGivenLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : loansGiven.length === 0 ? (
            <Box textAlign="center" py={8}>
              <PaymentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" gutterBottom>No Loans Recorded</Typography>
              <Typography color="text.secondary">
                Track money lent to friends and family here
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {loansGiven.map((loan) => (
                <Grid item xs={12} md={6} lg={4} key={loan._id}>
                  <Card elevation={3} sx={{ '&:hover': { boxShadow: 6 } }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box>
                          <Typography variant="h6">{loan.borrowerName}</Typography>
                          <Chip label={loan.relationship} size="small" sx={{ mt: 0.5 }} />
                        </Box>
                        <Chip
                          label={loan.status.replace('_', ' ').toUpperCase()}
                          size="small"
                          color={
                            loan.status === 'fully_paid' ? 'success' :
                            loan.status === 'overdue' ? 'error' :
                            loan.status === 'partially_paid' ? 'warning' : 'default'
                          }
                        />
                      </Box>

                      <Typography variant="h4" color="primary" gutterBottom>
                        ₹{loan.amount.toLocaleString()}
                      </Typography>

                      {loan.totalRepaid > 0 && (
                        <Box my={2}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Repaid</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {loan.repaymentPercentage}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={parseFloat(loan.repaymentPercentage)}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      )}

                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary">
                          Outstanding: ₹{loan.remainingAmount.toLocaleString()}
                        </Typography>
                        {loan.expectedRepaymentDate && (
                          <Typography variant="body2" color="text.secondary">
                            Expected: {new Date(loan.expectedRepaymentDate).toLocaleDateString()}
                          </Typography>
                        )}
                        {loan.daysOverdue > 0 && (
                          <Typography variant="body2" color="error">
                            Overdue by {loan.daysOverdue} days
                          </Typography>
                        )}
                      </Box>

                      <Box display="flex" gap={1} mt={2}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedLoanGiven(loan);
                            setRepaymentDialogOpen(true);
                          }}
                          disabled={loan.status === 'fully_paid' || loan.status === 'written_off'}
                        >
                          Add Repayment
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedLoanGiven(loan);
                            setLoanGivenFormData({
                              ...loan,
                              loanDate: new Date(loan.loanDate).toISOString().split('T')[0],
                              expectedRepaymentDate: loan.expectedRepaymentDate ? 
                                new Date(loan.expectedRepaymentDate).toISOString().split('T')[0] : ''
                            });
                            setLoanGivenDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteLoanGiven(loan._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab 8: Debt Freedom Plan */}
      {activeTab === 8 && (
        <Box>
          {!overview || !overview.overview || !overview.activeEMIs || overview.activeEMIs.length === 0 || !userProfile || !userProfile.monthlyIncome || userProfile.monthlyIncome === 0 ? (
            <Box textAlign="center" py={8}>
              <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                <Typography variant="h6" gutterBottom>Setup Required</Typography>
                <Typography variant="body1" paragraph>
                  To use the Debt Freedom Plan, please ensure:
                </Typography>
                <Typography component="div" variant="body2" sx={{ textAlign: 'left' }}>
                  <ul>
                    <li>You have set your monthly income in Profile settings {userProfile?.monthlyIncome ? '✅' : '❌'}</li>
                    <li>You have at least one active EMI {overview?.activeEMIs?.length > 0 ? '✅' : '❌'}</li>
                  </ul>
                </Typography>
                {/* Debug info */}
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                  Debug: Income={userProfile?.monthlyIncome || 'not set'}, EMIs={overview?.activeEMIs?.length || 0}
                </Typography>
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={() => window.location.href = '/profile'}
                sx={{ mt: 2 }}
              >
                Go to Profile Settings
              </Button>
            </Box>
          ) : !debtAnalysis ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ ml: 3 }}>
                Calculating your debt analysis...
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
            {/* Debt Health Status Card */}
            <Grid item xs={12}>
              <Card elevation={0} sx={{
                ...chartCardHoverEffect,
                background: debtAnalysis.debtTrapStatus === 'danger' 
                  ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                  : debtAnalysis.debtTrapStatus === 'warning'
                  ? 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)'
                  : debtAnalysis.debtTrapStatus === 'caution'
                  ? 'linear-gradient(135deg, #ffd93d 0%, #ff8c42 100%)'
                  : 'linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Typography variant="h4" fontWeight="bold">
                      {debtAnalysis.debtTrapStatus === 'danger' ? '🚨' : debtAnalysis.debtTrapStatus === 'warning' ? '⚠️' : debtAnalysis.debtTrapStatus === 'caution' ? '⚡' : '✅'}
                      {' '}Debt Health Status
                    </Typography>
                    <Chip 
                      label={debtAnalysis.debtTrapStatus.toUpperCase()} 
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.3)', 
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        px: 2,
                        py: 3
                      }} 
                    />
                  </Box>
                  <Typography variant="h6" sx={{ mb: 2, opacity: 0.95 }}>
                    {debtAnalysis.debtTrapMessage}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Debt-to-Income Ratio</Typography>
                        <Typography variant="h3" fontWeight="bold">{debtAnalysis.debtToIncomeRatio.toFixed(1)}%</Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(debtAnalysis.debtToIncomeRatio, 100)} 
                          sx={{ 
                            mt: 1, 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: 'rgba(255,255,255,0.3)',
                            '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                          }} 
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Monthly Income</Typography>
                        <Typography variant="h3" fontWeight="bold">{formatCurrency(debtAnalysis.monthlyIncome)}</Typography>
                        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>After EMI: {formatCurrency(debtAnalysis.availableIncome)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Avg. Months to Freedom</Typography>
                        <Typography variant="h3" fontWeight="bold">{Math.round(debtAnalysis.avgMonthsRemaining)}</Typography>
                        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>At current rate</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box mt={3}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Balance Transfer Offers (Tailored)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      We scan your highest-APR EMI and show potential transfer deals with estimated monthly savings.
                    </Typography>
                    {(() => {
                      const candidate = [...overview.activeEMIs].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
                      if (!candidate) return <Typography variant="body2">No eligible EMI found.</Typography>;
                      const offers = [
                        { provider: 'PrimeBank', rate: 11.5, fee: 999 },
                        { provider: 'NeoCard', rate: 9.9, fee: 1499 },
                        { provider: 'SafePay', rate: 12.9, fee: 0 }
                      ];
                      return (
                        <Grid container spacing={2}>
                          {offers.map((offer) => {
                            const saving = Math.max(0, (candidate.interestRate - offer.rate) / (candidate.interestRate || 1)) * candidate.emiAmount * 0.35;
                            return (
                              <Grid item xs={12} md={4} key={offer.provider}>
                                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white', height: '100%' }}>
                                  <Typography variant="subtitle1" fontWeight="bold">{offer.provider}</Typography>
                                  <Typography variant="body2" color="text.secondary">New rate: {offer.rate}%</Typography>
                                  <Typography variant="body2" color="text.secondary">Processing fee: ₹{offer.fee.toLocaleString()}</Typography>
                                  <Typography variant="body1" fontWeight="bold" color="success.main" sx={{ mt: 1 }}>
                                    Save ≈ {formatCurrency(saving)} / month
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Based on {candidate.merchantName} @ {candidate.interestRate}% for ~{candidate.remainingInstallments} months left.
                                  </Typography>
                                  <Button
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    sx={{ mt: 2 }}
                                    onClick={() => handleRequestBalanceTransfer(offer, candidate)}
                                  >
                                    Request This Offer
                                  </Button>
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      );
                    })()}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Salary vs EMI Breakdown */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Box className="chart-header" sx={{ pb: 2, mb: 3, borderBottom: '2px solid', borderColor: 'divider' }}>
                    <Typography variant="h5" className="chart-title" fontWeight="bold" sx={{ transition: 'all 0.3s ease' }}>
                      💰 Monthly Income Breakdown
                    </Typography>
                  </Box>
                  <Box sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={
                            debtAnalysis.availableIncome >= 0 
                            ? [
                                { name: 'EMI Burden', value: debtAnalysis.monthlyBurden, color: '#ff6b6b' },
                                { name: 'Available Income', value: debtAnalysis.availableIncome, color: '#51cf66' }
                              ]
                            : [
                                { name: 'Monthly Income', value: debtAnalysis.monthlyIncome, color: '#51cf66' },
                                { name: 'EMI Overflow', value: Math.abs(debtAnalysis.availableIncome), color: '#ff6b6b' }
                              ]
                          }
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={(entry) => {
                            const percentage = debtAnalysis.availableIncome >= 0
                              ? ((entry.value / debtAnalysis.monthlyIncome) * 100).toFixed(1)
                              : ((entry.value / debtAnalysis.monthlyBurden) * 100).toFixed(1);
                            return `${percentage}%`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(debtAnalysis.availableIncome >= 0 
                            ? [
                                { name: 'EMI Burden', value: debtAnalysis.monthlyBurden, color: '#ff6b6b' },
                                { name: 'Available Income', value: debtAnalysis.availableIncome, color: '#51cf66' }
                              ]
                            : [
                                { name: 'Monthly Income', value: debtAnalysis.monthlyIncome, color: '#51cf66' },
                                { name: 'EMI Overflow', value: Math.abs(debtAnalysis.availableIncome), color: '#ff6b6b' }
                              ]
                          ).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value, entry) => {
                            const amount = entry.payload.value;
                            return `${value}: ₹${amount.toLocaleString()}`;
                          }}
                        />
                        <RechartsTooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    {debtAnalysis.availableIncome < 0 && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          ⚠️ EMI Burden Exceeds Income!
                        </Typography>
                        <Typography variant="body2">
                          Your EMIs (<strong>₹{debtAnalysis.monthlyBurden.toLocaleString()}</strong>) exceed your monthly income 
                          (<strong>₹{debtAnalysis.monthlyIncome.toLocaleString()}</strong>) by <strong>₹{Math.abs(debtAnalysis.availableIncome).toLocaleString()}</strong>.
                        </Typography>
                      </Alert>
                    )}
                    <Alert severity={debtAnalysis.availablePercentage > 60 ? 'success' : debtAnalysis.availablePercentage > 40 ? 'warning' : 'error'}>
                      <Typography variant="body2">
                        You have <strong>{debtAnalysis.availablePercentage.toFixed(1)}%</strong> of your income available after EMIs.
                        {debtAnalysis.availablePercentage < 40 && ' Consider debt consolidation or increasing income.'}
                      </Typography>
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Emergency Fund Status */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Box className="chart-header" sx={{ pb: 2, mb: 3, borderBottom: '2px solid', borderColor: 'divider' }}>
                    <Typography variant="h5" className="chart-title" fontWeight="bold" sx={{ transition: 'all 0.3s ease' }}>
                      🛡️ Emergency Fund Status
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">Current Fund</Typography>
                      <Typography variant="body2" fontWeight="bold">{formatCurrency(currentEmergencyFund)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">Goal (6 months)</Typography>
                      <Typography variant="body2" fontWeight="bold">{formatCurrency(emergencyFundGoal)}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(debtAnalysis.emergencyFundPercentage, 100)} 
                      sx={{ 
                        height: 20, 
                        borderRadius: 2,
                        bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          background: debtAnalysis.emergencyFundPercentage >= 100 
                            ? 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)'
                            : debtAnalysis.emergencyFundPercentage >= 50
                            ? 'linear-gradient(90deg, #f2994a 0%, #f2c94c 100%)'
                            : 'linear-gradient(90deg, #eb3349 0%, #f45c43 100%)'
                        }
                      }} 
                    />
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {debtAnalysis.emergencyFundPercentage.toFixed(1)}% of goal
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {debtAnalysis.emergencyFundMonths.toFixed(1)} months covered
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 2 }}>
                    {emergencyFundMessage && (
                      <Alert severity={emergencyFundMessage.type} sx={{ mb: 2 }}>
                        <Typography variant="body2">{emergencyFundMessage.text}</Typography>
                      </Alert>
                    )}
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Current Emergency Fund"
                          type="number"
                          fullWidth
                          value={currentEmergencyFund}
                          onChange={(e) => setCurrentEmergencyFund(parseFloat(e.target.value) || 0)}
                          InputProps={{ startAdornment: '₹' }}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Emergency Fund Goal"
                          type="number"
                          fullWidth
                          value={emergencyFundGoal}
                          onChange={(e) => setEmergencyFundGoal(parseFloat(e.target.value) || 0)}
                          InputProps={{ startAdornment: '₹' }}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Add This Month"
                          type="number"
                          fullWidth
                          value={emergencyFundContribution}
                          onChange={(e) => setEmergencyFundContribution(e.target.value)}
                          InputProps={{ startAdornment: '₹' }}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {lastContribution
                            ? `Last add: ₹${(lastContribution.amount || 0).toLocaleString()} on ${new Date(lastContribution.date).toLocaleDateString()}`
                            : 'No contributions recorded yet.'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={saveEmergencyFundStatus}
                          disabled={emergencyFundSaving}
                        >
                          {emergencyFundSaving ? 'Saving…' : 'Save to Profile'}
                        </Button>
                        <Button
                          variant="outlined"
                          sx={{ ml: 1 }}
                          onClick={addEmergencyFundContribution}
                          disabled={contributionSaving}
                        >
                          {contributionSaving ? 'Adding…' : 'Add Contribution'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                  <Alert severity={debtAnalysis.emergencyFundPercentage >= 100 ? 'success' : debtAnalysis.emergencyFundPercentage >= 50 ? 'warning' : 'error'}>
                    <Typography variant="body2">
                      {debtAnalysis.emergencyFundPercentage >= 100 
                        ? '✅ Great! Your emergency fund is fully funded.'
                        : debtAnalysis.emergencyFundPercentage >= 50
                        ? '⚠️ Build your emergency fund to 6 months of expenses before aggressive EMI prepayment.'
                        : `🚨 PRIORITY: Build emergency fund first! Aim for ${formatCurrency(Math.max(0, emergencyFundGoal - currentEmergencyFund))} more.`}
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Repayment Strategy Selector */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>🎯 Smart Repayment Strategies</Typography>
                  <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel>Choose Strategy</InputLabel>
                      <Select
                        value={repaymentStrategy}
                        onChange={(e) => setRepaymentStrategy(e.target.value)}
                        label="Choose Strategy"
                      >
                        <MenuItem value="avalanche">💎 Avalanche Method (Pay highest interest first - Save most money)</MenuItem>
                        <MenuItem value="snowball">⛄ Snowball Method (Pay smallest balance first - Quick wins)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  {repaymentStrategy === 'avalanche' && (
                    <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Avalanche Method</Typography>
                      <Typography variant="body2">Pay off EMIs with the highest interest rates first to save maximum money on interest over time.</Typography>
                    </Alert>
                  )}
                  
                  {repaymentStrategy === 'snowball' && (
                    <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Snowball Method</Typography>
                      <Typography variant="body2">Pay off smallest EMIs first for psychological wins and momentum. Great for motivation!</Typography>
                    </Alert>
                  )}

                  <Typography variant="h6" fontWeight="bold" mb={2}>Recommended Payoff Order:</Typography>
                  <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>EMI</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Interest Rate</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Potential Savings</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(repaymentStrategy === 'avalanche' ? debtAnalysis.sortedEMIsAvalanche : debtAnalysis.sortedEMIsSnowball)
                          .slice(0, 5)
                          .map((emi, index) => (
                          <TableRow key={emi.id} hover>
                            <TableCell align="center">
                              <Chip 
                                label={`#${index + 1}`} 
                                color={index === 0 ? 'error' : index === 1 ? 'warning' : 'default'}
                                sx={{ fontWeight: 'bold' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">{emi.merchantName}</Typography>
                              <Typography variant="caption" color="text.secondary">{emi.cardProvider}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(emi.remainingAmount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${emi.interestRate}%`} 
                                size="small"
                                sx={{ 
                                  bgcolor: emi.interestRate > 15 ? '#ffebee' : emi.interestRate > 10 ? '#fff3e0' : '#e8f5e9',
                                  color: emi.interestRate > 15 ? '#c62828' : emi.interestRate > 10 ? '#ef6c00' : '#2e7d32',
                                  fontWeight: 'bold'
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                {formatCurrency(debtAnalysis.calculateEarlyRepaymentSavings(emi))}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Button 
                                size="small" 
                                variant="contained" 
                                color="primary"
                                onClick={() => {
                                  setSelectedEMIForEarlyPayment(emi);
                                  setEarlyPaymentAmount(emi.remainingAmount.toString());
                                }}
                              >
                                Pay Off
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Interest Savings Calculator */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>📊 Total Interest Analysis</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Principal Outstanding', value: debtAnalysis.totalOutstanding - debtAnalysis.totalInterestOutstanding, color: '#4caf50' },
                        { name: 'Interest Already Accrued', value: debtAnalysis.totalInterestOutstanding, color: '#ff9800' },
                        { name: 'Future Interest', value: debtAnalysis.totalInterestToPay, color: '#f44336' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                        <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {[
                            { name: 'Principal Outstanding', value: debtAnalysis.totalOutstanding - debtAnalysis.totalInterestOutstanding, color: '#4caf50' },
                            { name: 'Interest Already Accrued', value: debtAnalysis.totalInterestOutstanding, color: '#ff9800' },
                            { name: 'Future Interest', value: debtAnalysis.totalInterestToPay, color: '#f44336' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      💡 <strong>Potential Savings:</strong> By paying off your EMIs early, you could save up to {formatCurrency(debtAnalysis.totalInterestToPay)} in future interest!
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Action Plan */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>🚀 Your Action Plan</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, borderLeft: '4px solid #2196f3' }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">Step 1: Build Emergency Fund</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Current: {formatCurrency(currentEmergencyFund)} | Goal: {formatCurrency(emergencyFundGoal)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        💡 Save {formatCurrency(emergencyFundGoal - currentEmergencyFund)} more. Target: {((emergencyFundGoal - currentEmergencyFund) / (debtAnalysis.availableIncome * 0.3)).toFixed(1)} months at 30% savings rate.
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 2, borderLeft: '4px solid #9c27b0' }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#9c27b0' }}>Step 2: Extra EMI Payments</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Available for extra payments: {formatCurrency(debtAnalysis.recommendedMonthlyExtra)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        💡 Paying an extra {formatCurrency(debtAnalysis.recommendedMonthlyExtra)} monthly could reduce your debt by {Math.round(debtAnalysis.avgMonthsRemaining * 0.3)} months!
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2, borderLeft: '4px solid #4caf50' }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="success.main">Step 3: Follow {repaymentStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'} Method</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Focus on: {(repaymentStrategy === 'avalanche' ? debtAnalysis.sortedEMIsAvalanche : debtAnalysis.sortedEMIsSnowball)[0]?.merchantName}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        💡 Potential savings: {formatCurrency(debtAnalysis.calculateEarlyRepaymentSavings((repaymentStrategy === 'avalanche' ? debtAnalysis.sortedEMIsAvalanche : debtAnalysis.sortedEMIsSnowball)[0]))}
                      </Typography>
                    </Box>

                    {debtAnalysis.debtToIncomeRatio > 40 && (
                      <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, borderLeft: '4px solid #f44336' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="error.main">⚠️ High Debt Alert</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Your debt-to-income ratio is {debtAnalysis.debtToIncomeRatio.toFixed(1)}%. Consider:
                        </Typography>
                        <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
                          <li>Debt consolidation at lower interest rate</li>
                          <li>Side income to increase monthly income</li>
                          <li>Negotiate with lenders for better terms</li>
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Debt-Free Accelerator */}
            <Grid item xs={12}>
              {(() => {
                const extraMonthly = Math.max(0, (debtAnalysis.availableIncome || 0) * (acceleratorBoostPct / 100));
                const baseProjection = projectDebtFreedom(debtAnalysis.avgMonthsRemaining, 0, debtAnalysis.monthlyBurden);
                const boostedProjection = projectDebtFreedom(debtAnalysis.avgMonthsRemaining, extraMonthly, debtAnalysis.monthlyBurden);
                const aggressiveProjection = projectDebtFreedom(
                  debtAnalysis.avgMonthsRemaining,
                  extraMonthly + debtAnalysis.recommendedMonthlyExtra,
                  debtAnalysis.monthlyBurden
                );

                return (
                  <Card elevation={0} sx={chartCardHoverEffect}>
                    <CardContent>
                      <Typography variant="h5" fontWeight="bold" mb={1}>⚡ Debt-Free Accelerator</Typography>
                      <Typography variant="body2" color="text.secondary" mb={3}>
                        Allocate a slice of your available income to fast-track freedom. We project months saved instantly.
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth>
                            <InputLabel>Extra allocation %</InputLabel>
                            <Select
                              value={acceleratorBoostPct}
                              label="Extra allocation %"
                              onChange={(e) => setAcceleratorBoostPct(parseInt(e.target.value, 10) || 0)}
                            >
                              {[10, 20, 30, 40, 50].map((pct) => (
                                <MenuItem key={pct} value={pct}>{pct}% of available income</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            Extra monthly contribution: <strong>{formatCurrency(extraMonthly)}</strong>
                          </Typography>
                          <Alert severity={extraMonthly > 0 ? 'success' : 'warning'} sx={{ mt: 2 }}>
                            {extraMonthly > 0
                              ? `Great! You are boosting payments by ₹${extraMonthly.toLocaleString()} each month.`
                              : 'Set a % to start accelerating your payoff.'}
                          </Alert>
                        </Grid>

                        <Grid item xs={12} md={8}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold">Baseline</Typography>
                                <Typography variant="h4" fontWeight="bold">{Math.round(baseProjection.months)} mo</Typography>
                                <Typography variant="body2" color="text.secondary">Target: {baseProjection.targetDate}</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #c8e6c9' }}>
                                <Typography variant="subtitle2" fontWeight="bold">Current Boost</Typography>
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                  {Math.max(1, Math.round(boostedProjection.months))} mo
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Save ~{Math.max(0, Math.round(boostedProjection.monthsSaved))} months
                                </Typography>
                                <Chip label={`Freedom by ${boostedProjection.targetDate}`} color="success" size="small" sx={{ mt: 1 }} />
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box sx={{ p: 2, bgcolor: '#fff8e1', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                                <Typography variant="subtitle2" fontWeight="bold">Max Push (adds recommended extra)</Typography>
                                <Typography variant="h4" fontWeight="bold" color="warning.main">
                                  {Math.max(1, Math.round(aggressiveProjection.months))} mo
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Save ~{Math.max(0, Math.round(aggressiveProjection.monthsSaved))} months
                                </Typography>
                                <Chip label={`Freedom by ${aggressiveProjection.targetDate}`} color="warning" size="small" sx={{ mt: 1 }} />
                              </Box>
                            </Grid>
                          </Grid>
                          <Alert severity="info" sx={{ mt: 2 }}>
                            We assume payoff speed scales with total monthly payment. Combine this with auto-sweep and guardrails to lock in gains.
                          </Alert>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                );
              })()}
            </Grid>

            {/* Spending Patterns Analysis */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>💳 Monthly Commitments Breakdown</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="h2" fontWeight="bold" color="primary">
                          {formatCurrency(debtAnalysis.monthlyBurden)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Monthly EMI Burden</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="h2" fontWeight="bold" color="success.main">
                          {formatCurrency(debtAnalysis.availableIncome)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Available After EMIs</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="h2" fontWeight="bold" color="warning.main">
                          {formatCurrency(debtAnalysis.recommendedMonthlyExtra)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Recommended Extra Payment</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, p: 3, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>💡 Smart Spending Tips to Close EMIs Faster:</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Cut unnecessary subscriptions</strong> - Review all monthly subscriptions</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Cook at home more</strong> - Save 30-40% on food expenses</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Use public transport</strong> - Reduce fuel and maintenance costs</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Bundle insurance policies</strong> - Get discounts on multiple policies</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Sell unused items</strong> - Generate extra cash from clutter</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Negotiate bills</strong> - Call providers for better rates</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Avoid new EMIs</strong> - Break the debt cycle immediately</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Increase income</strong> - Side hustle or freelancing</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* NEW: Quick Prepayment Calculator */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    💰 Prepayment Impact Calculator
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    See how extra payments can reduce your EMI burden and save interest
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Extra Payment Amount"
                        type="number"
                        fullWidth
                        value={earlyPaymentAmount}
                        onChange={(e) => setEarlyPaymentAmount(e.target.value)}
                        InputProps={{
                          startAdornment: '₹',
                        }}
                        helperText="How much extra can you pay?"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Apply To</InputLabel>
                        <Select
                          value={selectedEMIForEarlyPayment?.id || ''}
                          onChange={(e) => {
                            const emi = (repaymentStrategy === 'avalanche' 
                              ? debtAnalysis.sortedEMIsAvalanche 
                              : debtAnalysis.sortedEMIsSnowball
                            ).find(emi => emi.id === e.target.value);
                            setSelectedEMIForEarlyPayment(emi);
                          }}
                          label="Apply To"
                        >
                          <MenuItem value="">Select EMI</MenuItem>
                          {(repaymentStrategy === 'avalanche' 
                            ? debtAnalysis.sortedEMIsAvalanche 
                            : debtAnalysis.sortedEMIsSnowball
                          ).map(emi => (
                            <MenuItem key={emi.id} value={emi.id}>
                              {emi.merchantName} - {formatCurrency(emi.remainingAmount)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4} display="flex" alignItems="center">
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={!earlyPaymentAmount || !selectedEMIForEarlyPayment}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          height: '56px'
                        }}
                        onClick={() => {
                          if (selectedEMIForEarlyPayment && earlyPaymentAmount) {
                            const amount = parseFloat(earlyPaymentAmount);
                            const savings = debtAnalysis.calculateEarlyRepaymentSavings(selectedEMIForEarlyPayment);
                            const monthsReduced = Math.floor(amount / selectedEMIForEarlyPayment.emiAmount);
                            
                            alert(
                              `💰 Prepayment Impact:\n\n` +
                              `Extra Payment: ₹${amount.toLocaleString()}\n` +
                              `EMI: ${selectedEMIForEarlyPayment.merchantName}\n\n` +
                              `✅ Months Reduced: ${monthsReduced}\n` +
                              `✅ Interest Saved: ₹${Math.min(savings, amount * 0.15).toLocaleString()}\n` +
                              `✅ New Completion: ${selectedEMIForEarlyPayment.remainingInstallments - monthsReduced} months\n\n` +
                              `Tip: Contact ${selectedEMIForEarlyPayment.cardProvider} to make this payment!`
                            );
                          }
                        }}
                      >
                        Calculate Impact
                      </Button>
                    </Grid>
                  </Grid>

                  {selectedEMIForEarlyPayment && earlyPaymentAmount && parseFloat(earlyPaymentAmount) > 0 && (
                    <Alert severity="success" sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Quick Calculation:</Typography>
                      <Typography variant="body2">
                        Paying ₹{parseFloat(earlyPaymentAmount).toLocaleString()} extra on {selectedEMIForEarlyPayment.merchantName} will:
                      </Typography>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Reduce tenure by ~{Math.floor(parseFloat(earlyPaymentAmount) / selectedEMIForEarlyPayment.emiAmount)} months</li>
                        <li>Save ₹{Math.min(debtAnalysis.calculateEarlyRepaymentSavings(selectedEMIForEarlyPayment), parseFloat(earlyPaymentAmount) * 0.15).toLocaleString()} in interest</li>
                        <li>Free up ₹{selectedEMIForEarlyPayment.emiAmount.toLocaleString()}/month sooner</li>
                      </ul>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* NEW: Payment Reminders & Quick Actions */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    ⏰ Upcoming Payment Reminders
                  </Typography>
                  
                  {overview.activeEMIs
                    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))
                    .slice(0, 5)
                    .map((emi, index) => {
                      const daysUntilDue = Math.ceil((new Date(emi.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntilDue <= 7;
                      const isComingSoon = daysUntilDue <= 15;
                      
                      return (
                        <Box 
                          key={emi.id}
                          sx={{ 
                            p: 2, 
                            mb: 2, 
                            borderRadius: 2,
                            bgcolor: isUrgent ? '#ffebee' : isComingSoon ? '#fff3e0' : '#f5f5f5',
                            border: '1px solid',
                            borderColor: isUrgent ? '#f44336' : isComingSoon ? '#ff9800' : '#e0e0e0',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateX(8px)'
                            }
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <Box display="flex" alignItems="center" gap={1}>
                                {isUrgent && <WarningIcon sx={{ color: '#f44336' }} />}
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {emi.merchantName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {emi.cardProvider} {emi.cardLastFourDigits}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <Typography variant="body2" color="text.secondary">Due Date</Typography>
                              <Typography variant="h6">{formatDate(emi.nextDueDate)}</Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: isUrgent ? '#f44336' : isComingSoon ? '#ff9800' : 'text.secondary',
                                  fontWeight: isUrgent ? 'bold' : 'normal'
                                }}
                              >
                                {daysUntilDue} days away {isUrgent && '- URGENT!'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                              <Typography variant="body2" color="text.secondary">Amount</Typography>
                              <Typography variant="h6" color="primary">
                                {formatCurrency(emi.emiAmount)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <Button
                                variant={isUrgent ? "contained" : "outlined"}
                                color={isUrgent ? "error" : "primary"}
                                fullWidth
                                startIcon={<PaymentIcon />}
                                onClick={() => {
                                  setSelectedReminderEmi(emi);
                                  setReminderTab(0);
                                  setReminderDialogOpen(true);
                                }}
                              >
                                {isUrgent ? 'Pay Now' : 'Set Reminder'}
                              </Button>
                            </Grid>
                          </Grid>
                        </Box>
                      );
                    })}
                </CardContent>
              </Card>
            </Grid>

            {/* NEW: Overall Repayment Progress Tracker */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    📈 Overall Repayment Progress
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {overview.activeEMIs.map((emi) => {
                      const completionPct = (emi.paidInstallments / emi.totalTenure) * 100;
                      const isPriority = repaymentStrategy === 'avalanche' 
                        ? emi.interestRate >= 15 
                        : emi.remainingAmount <= 10000;
                      
                      return (
                        <Grid item xs={12} md={6} key={emi.id}>
                          <Box sx={{ 
                            p: 2, 
                            borderRadius: 2, 
                            bgcolor: '#f5f5f5',
                            border: isPriority ? '2px solid #f44336' : '1px solid #e0e0e0'
                          }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {emi.merchantName}
                                {isPriority && <Chip label="PRIORITY" size="small" color="error" sx={{ ml: 1 }} />}
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {Math.round(completionPct)}%
                              </Typography>
                            </Box>
                            
                            <LinearProgress 
                              variant="determinate" 
                              value={completionPct} 
                              sx={{ 
                                height: 10, 
                                borderRadius: 5,
                                mb: 2,
                                bgcolor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  background: completionPct > 75 
                                    ? 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)'
                                    : completionPct > 50
                                    ? 'linear-gradient(90deg, #f2994a 0%, #f2c94c 100%)'
                                    : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                }
                              }} 
                            />
                            
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Paid</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {emi.paidInstallments}/{emi.totalTenure}
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Remaining</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatCurrency(emi.remainingAmount)}
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Monthly</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatCurrency(emi.emiAmount)}
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            <Box mt={2}>
                              <Button
                                size="small"
                                variant="outlined"
                                fullWidth
                                onClick={() => {
                                  setSelectedEMIForEarlyPayment(emi);
                                  setEarlyPaymentAmount(emi.remainingAmount.toString());
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                Calculate Prepayment
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* NEW: Smart Payment Allocator */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    🎯 Smart Payment Allocator
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Have extra cash? Here's the smartest way to use it for maximum impact
                  </Typography>
                  
                  {debtAnalysis.availableIncome > debtAnalysis.recommendedMonthlyExtra && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        💰 You have ₹{formatCurrency(debtAnalysis.availableIncome)} available this month!
                      </Typography>
                      <Typography variant="body2">
                        Here's the optimal allocation strategy:
                      </Typography>
                    </Alert>
                  )}
                  
                  <Grid container spacing={2}>
                    {/* Allocation 1: Emergency Fund */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        bgcolor: debtAnalysis.emergencyFundPercentage < 50 ? '#e3f2fd' : '#f5f5f5',
                        border: '2px solid',
                        borderColor: debtAnalysis.emergencyFundPercentage < 50 ? '#2196f3' : '#e0e0e0'
                      }}>
                        <Typography variant="h6" fontWeight="bold" mb={1}>
                          🛡️ Emergency Fund
                        </Typography>
                        <Typography variant="h4" color="primary" mb={1}>
                          {debtAnalysis.emergencyFundPercentage < 50 ? '40%' : '10%'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {debtAnalysis.emergencyFundPercentage < 50 
                            ? 'Priority: Build to 50% first'
                            : 'Maintenance: Keep growing'}
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          ≈ {formatCurrency(debtAnalysis.availableIncome * (debtAnalysis.emergencyFundPercentage < 50 ? 0.4 : 0.1))}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Allocation 2: Priority EMI */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        bgcolor: '#fff3e0',
                        border: '2px solid #ff9800'
                      }}>
                        <Typography variant="h6" fontWeight="bold" mb={1}>
                          🎯 Priority EMI
                        </Typography>
                        <Typography variant="h4" color="warning.main" mb={1}>
                          {debtAnalysis.emergencyFundPercentage < 50 ? '40%' : '60%'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {(repaymentStrategy === 'avalanche' 
                            ? debtAnalysis.sortedEMIsAvalanche[0] 
                            : debtAnalysis.sortedEMIsSnowball[0]
                          )?.merchantName || 'Top priority'}
                        </Typography>
                        <Typography variant="h6" color="warning.dark">
                          ≈ {formatCurrency(debtAnalysis.availableIncome * (debtAnalysis.emergencyFundPercentage < 50 ? 0.4 : 0.6))}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Allocation 3: Lifestyle/Savings */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        bgcolor: '#e8f5e9',
                        border: '2px solid #4caf50'
                      }}>
                        <Typography variant="h6" fontWeight="bold" mb={1}>
                          ✨ Lifestyle/Savings
                        </Typography>
                        <Typography variant="h4" color="success.main" mb={1}>
                          20%
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          Reward yourself & stay motivated
                        </Typography>
                        <Typography variant="h6" color="success.dark">
                          ≈ {formatCurrency(debtAnalysis.availableIncome * 0.2)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Box mt={3} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      💡 Pro Tip: Review and adjust monthly
                    </Typography>
                    <Typography variant="body2">
                      As your emergency fund grows, shift more towards EMI prepayment. 
                      The 20% lifestyle allocation keeps you motivated and prevents burnout!
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* NEW FEATURES */}

            {/* Debt-Free Date Projector */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    📅 Debt-Free Date Projector
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    See when you'll be completely debt-free with your current pace or with extra payments
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 3, borderRadius: 2, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                        <Typography variant="h6" fontWeight="bold" color="#ef6c00" gutterBottom>
                          🐌 At Current Pace
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="#ef6c00" mb={1}>
                          {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const months = longestEMI;
                            const years = Math.floor(months / 12);
                            const remainingMonths = months % 12;
                            return years > 0 ? `${years}y ${remainingMonths}m` : `${months} months`;
                          })()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          Projected debt-free date: {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const date = new Date();
                            date.setMonth(date.getMonth() + longestEMI);
                            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          })()}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Total interest paid: {formatCurrency(
                            overview.activeEMIs.reduce((sum, emi) => 
                              sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0)
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 3, borderRadius: 2, bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
                        <Typography variant="h6" fontWeight="bold" color="#2e7d32" gutterBottom>
                          🚀 With ₹{debtAnalysis.recommendedMonthlyExtra?.toLocaleString()} Extra/Month
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="#2e7d32" mb={1}>
                          {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const extraPayment = debtAnalysis.recommendedMonthlyExtra || 0;
                            const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                            const reduction = extraPayment > 0 ? Math.floor((extraPayment / avgEMI) * 0.7) : 0;
                            const acceleratedMonths = Math.max(6, longestEMI - reduction);
                            const years = Math.floor(acceleratedMonths / 12);
                            const remainingMonths = acceleratedMonths % 12;
                            return years > 0 ? `${years}y ${remainingMonths}m` : `${acceleratedMonths} months`;
                          })()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          Save approximately {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const extraPayment = debtAnalysis.recommendedMonthlyExtra || 0;
                            const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                            const reduction = extraPayment > 0 ? Math.floor((extraPayment / avgEMI) * 0.7) : 0;
                            return reduction;
                          })()} months!
                        </Typography>
                        <Typography variant="caption" display="block" color="success.main" fontWeight="bold">
                          Estimated savings: {formatCurrency(
                            overview.activeEMIs.reduce((sum, emi) => 
                              sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0) * 0.15
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Timeline Visual */}
                  <Box mt={4}>
                    <Typography variant="subtitle2" gutterBottom>Timeline to Freedom:</Typography>
                    <Box sx={{ position: 'relative', height: 80 }}>
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 40, 
                        left: 0, 
                        right: 0, 
                        height: 4, 
                        bgcolor: '#e0e0e0',
                        borderRadius: 2
                      }} />
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 40, 
                        left: 0, 
                        width: '30%', 
                        height: 4, 
                        background: 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)',
                        borderRadius: 2
                      }} />
                      <Box sx={{ position: 'absolute', top: 0, left: 0 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#11998e', mb: 1 }} />
                        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>Today</Typography>
                      </Box>
                      <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50', mb: 1 }} />
                        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>Debt Free!</Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Interactive Debt Payoff Simulator */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    🎮 Interactive Debt Payoff Simulator
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Adjust your extra monthly payment to see real-time impact on payoff timeline
                  </Typography>
                  
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="body2" gutterBottom>
                          Extra Monthly Payment: <strong>₹{earlyPaymentAmount || 0}</strong>
                        </Typography>
                        <Box sx={{ px: 2 }}>
                          <input 
                            type="range" 
                            min="0" 
                            max="10000" 
                            step="500"
                            value={earlyPaymentAmount || 0}
                            onChange={(e) => setEarlyPaymentAmount(e.target.value)}
                            style={{ 
                              width: '100%', 
                              height: '8px',
                              borderRadius: '4px',
                              outline: 'none',
                              background: `linear-gradient(to right, #667eea 0%, #764ba2 ${(earlyPaymentAmount || 0) / 100}%, #e0e0e0 ${(earlyPaymentAmount || 0) / 100}%, #e0e0e0 100%)`
                            }}
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between" mt={1}>
                          <Typography variant="caption">₹0</Typography>
                          <Typography variant="caption">₹10,000</Typography>
                        </Box>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">Time Saved</Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary">
                              {(() => {
                                const extra = parseFloat(earlyPaymentAmount) || 0;
                                const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                                const monthsSaved = extra > 0 ? Math.floor((extra / avgEMI) * 0.8) : 0;
                                return `${monthsSaved} months`;
                              })()}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">Interest Saved</Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                              {formatCurrency((() => {
                                const extra = parseFloat(earlyPaymentAmount) || 0;
                                const totalInterest = overview.activeEMIs.reduce((sum, emi) => 
                                  sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0);
                                return extra > 0 ? Math.floor(totalInterest * (extra / 10000) * 0.15) : 0;
                              })())}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Box sx={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { 
                              name: 'Current', 
                              months: overview.activeEMIs.reduce((max, emi) => 
                                emi.remainingInstallments > max ? emi.remainingInstallments : max, 0),
                              fill: '#ff6b6b'
                            },
                            { 
                              name: 'With Extra', 
                              months: (() => {
                                const longest = overview.activeEMIs.reduce((max, emi) => 
                                  emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                                const extra = parseFloat(earlyPaymentAmount) || 0;
                                const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                                const reduction = extra > 0 ? Math.floor((extra / avgEMI) * 0.8) : 0;
                                return Math.max(6, longest - reduction);
                              })(),
                              fill: '#51cf66'
                            }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: 'Months', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip />
                            <Bar dataKey="months" radius={[8, 8, 0, 0]}>
                              {[0, 1].map((index) => (
                                <Cell key={index} fill={index === 0 ? '#ff6b6b' : '#51cf66'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Interest vs Principal Breakdown */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    📊 Interest vs Principal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Where your EMI money actually goes each month
                  </Typography>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Principal', 
                              value: overview.activeEMIs.reduce((sum, emi) => 
                                sum + (emi.remainingAmount / emi.remainingInstallments), 0),
                              color: '#51cf66'
                            },
                            { 
                              name: 'Interest', 
                              value: overview.activeEMIs.reduce((sum, emi) => 
                                sum + (emi.emiAmount - (emi.remainingAmount / emi.remainingInstallments)), 0),
                              color: '#ff6b6b'
                            }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#51cf66" />
                          <Cell fill="#ff6b6b" />
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Out of your monthly ₹{debtAnalysis.monthlyBurden.toLocaleString()} EMI payment:
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      • <strong>₹{Math.floor(overview.activeEMIs.reduce((sum, emi) => 
                        sum + (emi.remainingAmount / emi.remainingInstallments), 0)).toLocaleString()}</strong> goes to principal (reducing debt)
                    </Typography>
                    <Typography variant="body2">
                      • <strong>₹{Math.floor(overview.activeEMIs.reduce((sum, emi) => 
                        sum + (emi.emiAmount - (emi.remainingAmount / emi.remainingInstallments)), 0)).toLocaleString()}</strong> goes to interest (bank profit)
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Savings Milestones */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    🏆 Savings Milestones
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Track your progress and celebrate wins!
                  </Typography>
                  
                  {[
                    { 
                      title: '🎯 First EMI Closed', 
                      description: 'Pay off your first/smallest EMI',
                      completed: overview.activeEMIs.some(emi => emi.remainingInstallments <= 3),
                      progress: Math.min(100, (overview.activeEMIs.filter(emi => emi.remainingInstallments <= 3).length / Math.max(1, overview.activeEMIs.length)) * 100)
                    },
                    { 
                      title: '💰 ₹50,000 Debt Reduced', 
                      description: 'Reduce total debt by ₹50,000',
                      completed: (overview.overview.totalPaid >= 50000),
                      progress: Math.min(100, (overview.overview.totalPaid / 50000) * 100)
                    },
                    { 
                      title: '🛡️ Emergency Fund 50%', 
                      description: 'Build emergency fund to 50% of goal',
                      completed: debtAnalysis.emergencyFundPercentage >= 50,
                      progress: Math.min(100, debtAnalysis.emergencyFundPercentage)
                    },
                    { 
                      title: '⚡ 6 Months Consistent', 
                      description: 'Make extra payments for 6 months',
                      completed: false,
                      progress: 33
                    }
                  ].map((milestone, index) => (
                    <Box key={index} sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {milestone.title}
                        </Typography>
                        {milestone.completed && (
                          <Chip label="ACHIEVED!" size="small" color="success" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {milestone.description}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={milestone.progress} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            background: milestone.completed 
                              ? 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)'
                              : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: 4
                          }
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {milestone.progress.toFixed(0)}% Complete
                      </Typography>
                    </Box>
                  ))}

                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {[true, false, false, false].filter(Boolean).length} / 4 Milestones
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Keep going! Each milestone brings you closer to financial freedom 🚀
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Debt Trap Escape Toolkit */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    🧭 Debt Trap Escape Toolkit
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Clear, actionable steps to move from danger to safety. Targets assume 50% max debt-to-income (DTI) for stability.
                  </Typography>

                  <Grid container spacing={3}>
                    {/* DTI Target Planner */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ p: 3, bgcolor: '#fff3e0', borderRadius: 2, border: '2px solid #ff9800', height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" color="#ef6c00" gutterBottom>
                          🎯 Safe DTI Target (≤ 50%)
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          Reduce EMI by: {formatCurrency(Math.max(0, debtAnalysis.monthlyBurden - (debtAnalysis.monthlyIncome * 0.5)))}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Or increase income by: {formatCurrency(Math.max(0, debtAnalysis.monthlyBurden / 0.5 - debtAnalysis.monthlyIncome))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Aim: EMI ≤ ₹{Math.round(debtAnalysis.monthlyIncome * 0.5).toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Consolidation Opportunity */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ p: 3, bgcolor: '#e3f2fd', borderRadius: 2, border: '2px solid #2196f3', height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" color="#1565c0" gutterBottom>
                          🔄 Consolidation Check
                        </Typography>
                        {(() => {
                          const highInterest = [...overview.activeEMIs].sort((a, b) => b.interestRate - a.interestRate)[0];
                          if (!highInterest) return <Typography variant="body2">No EMIs found.</Typography>;
                          const targetRate = 12;
                          const monthlySavings = Math.max(0, (highInterest.interestRate - targetRate) / highInterest.interestRate) * highInterest.emiAmount * 0.35;
                          return (
                            <>
                              <Typography variant="body1" fontWeight="bold">
                                Best candidate: {highInterest.merchantName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Current rate: {highInterest.interestRate}% → Target: {targetRate}%
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mt: 1 }}>
                                Save ≈ {formatCurrency(monthlySavings)} / month
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                Tip: Ask lender for balance transfer / top-up at lower rate.
                              </Typography>
                            </>
                          );
                        })()}
                      </Box>
                    </Grid>

                    {/* Income Lift Playbook */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ p: 3, bgcolor: '#e8f5e9', borderRadius: 2, border: '2px solid #4caf50', height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" color="#2e7d32" gutterBottom>
                          💼 Income Lift Playbook
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          Needed monthly lift: {formatCurrency(Math.max(0, debtAnalysis.monthlyBurden - debtAnalysis.monthlyIncome * 0.5))}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Examples: ₹5k from weekend freelancing, ₹3k from tutoring, ₹2k from selling unused items.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Goal: Bridge the gap in 2-3 months, then channel all lift into prepayments.
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Risk Radar & Auto-Guardrails */}
            <Grid item xs={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    🛡️ Risk Radar & Guardrails
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Spot the riskiest EMIs and apply automatic guardrails to avoid new debt traps.
                  </Typography>

                  {guardrailAlerts.length > 0 && (
                    <Box display="grid" gap={1} mb={2}>
                      {guardrailAlerts.map((alert, index) => (
                        <Alert key={index} severity={alert.severity} icon={false} sx={{ borderRadius: 2 }}>
                          <Typography variant="subtitle2" fontWeight="bold">{alert.title}</Typography>
                          <Typography variant="body2">{alert.message}</Typography>
                        </Alert>
                      ))}
                    </Box>
                  )}

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell sx={{ fontWeight: 'bold' }}>Risk EMI</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Interest</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Due In</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {overview.activeEMIs
                              .map(emi => ({
                                ...emi,
                                daysUntilDue: emi.nextDueDate ? Math.ceil((new Date(emi.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30
                              }))
                              .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))
                              .slice(0, 5)
                              .map((emi) => {
                                const urgent = emi.daysUntilDue <= 7;
                                const highRate = (emi.interestRate || 0) >= 18;
                                return (
                                  <TableRow key={emi.id} hover>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight="bold">{emi.merchantName}</Typography>
                                      <Typography variant="caption" color="text.secondary">{emi.cardProvider}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Chip label={`${emi.interestRate}%`} size="small" color={highRate ? 'error' : 'warning'} />
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(emi.remainingAmount)}</TableCell>
                                    <TableCell align="center" sx={{ color: urgent ? '#d32f2f' : 'text.primary' }}>
                                      {emi.daysUntilDue}d
                                    </TableCell>
                                    <TableCell align="center">
                                      <Button 
                                        size="small" 
                                        variant={urgent ? 'contained' : 'outlined'} 
                                        color={urgent ? 'error' : 'primary'}
                                        onClick={() => {
                                          setSelectedEMIForEarlyPayment(emi);
                                          setEarlyPaymentAmount(Math.min(emi.remainingAmount, emi.emiAmount * 2).toString());
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                      >
                                        {urgent ? 'Pay Now' : 'Plan Payoff'}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Auto-Guardrails
                        </Typography>
                        <Box display="grid" gap={1}>
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={guardrailSettings.lockNewEmiAbove50} 
                                onChange={handleGuardrailToggle('lockNewEmiAbove50')} 
                                color="error"
                              />
                            }
                            label="Lock new EMI creation if DTI exceeds 50%"
                          />
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={guardrailSettings.preDueReminder} 
                                onChange={handleGuardrailToggle('preDueReminder')}
                                color="warning"
                              />
                            }
                            label="Auto-set reminders 7 days before due date"
                          />
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={guardrailSettings.forceAvalancheHighAPR} 
                                onChange={handleGuardrailToggle('forceAvalancheHighAPR')}
                                color="primary"
                              />
                            }
                            label="Force avalanche when any EMI rate ≥ 18%"
                          />
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={guardrailSettings.recommendBalanceTransfer} 
                                onChange={handleGuardrailToggle('recommendBalanceTransfer')}
                                color="info"
                              />
                            }
                            label="Recommend balance transfer for high-rate EMIs"
                          />
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={guardrailSettings.autoRoundUp} 
                                onChange={handleGuardrailToggle('autoRoundUp')}
                                color="success"
                              />
                            }
                            label="Round-up surplus cash into prepayments"
                          />
                        </Box>

                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                          Guardrails now persist across sessions and trigger alerts above when limits are breached.
                        </Typography>
                        <Typography variant="body2" color={guardrailSettings.lockNewEmiAbove50 && debtAnalysis.debtToIncomeRatio > 50 ? 'error.main' : 'text.secondary'} sx={{ mt: 1 }}>
                          {guardrailSettings.lockNewEmiAbove50 && debtAnalysis.debtToIncomeRatio > 50
                            ? 'New EMI creation is locked until DTI falls below 50%.'
                            : 'New EMI creation is allowed. Keep DTI under 50% to stay safe.'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Relief & Negotiation Planner */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>🤝 Relief & Negotiation Planner</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Cut costs without new debt: request rate drops, tenure tweaks, or fee waivers on your worst EMIs.
                  </Typography>
                  {(() => {
                    const targetEmi = [...overview.activeEMIs].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
                    if (!targetEmi) return <Typography variant="body2">No EMIs available.</Typography>;
                    const threePointDropSavings = targetEmi.emiAmount * 0.12; // rough monthly save estimate
                    const tenureReliefMonths = Math.ceil((targetEmi.emiAmount * 0.2) / (targetEmi.emiAmount || 1) * 12);
                    return (
                      <Box display="grid" gap={2}>
                        <Box p={2} sx={{ bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #c8e6c9' }}>
                          <Typography variant="subtitle2" fontWeight="bold">Ask for 3% rate drop</Typography>
                          <Typography variant="body2" color="text.secondary">On {targetEmi.merchantName} @ {targetEmi.interestRate}%</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">Save ≈ {formatCurrency(threePointDropSavings)} / month</Typography>
                        </Box>
                        <Box p={2} sx={{ bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                          <Typography variant="subtitle2" fontWeight="bold">Request fee/penalty waiver</Typography>
                          <Typography variant="body2" color="text.secondary">Waive late/foreclosure fees to speed prepayment.</Typography>
                          <Typography variant="caption" color="text.secondary">Mention spotless repayment streaks to negotiate.</Typography>
                        </Box>
                        <Box p={2} sx={{ bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #bbdefb' }}>
                          <Typography variant="subtitle2" fontWeight="bold">Extend tenure short-term</Typography>
                          <Typography variant="body2" color="text.secondary">Add a few months temporarily to lower EMI during crunch.</Typography>
                          <Typography variant="caption" color="text.secondary">Est. relief: {tenureReliefMonths} months cushion on {targetEmi.merchantName}.</Typography>
                        </Box>
                      </Box>
                    );
                  })()}
                </CardContent>
              </Card>
            </Grid>

            {/* Income Boost Sprint */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>⚡ Income Boost Sprint (30 days)</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Quick wins to unlock extra cash and push it into prepayments immediately.
                  </Typography>
                  <Grid container spacing={2}>
                    {[{title: 'Sell 3 idle items', impact: 3000, eta: '1 week'}, {title: 'Weekend gig (8 hrs)', impact: 2500, eta: 'This week'}, {title: 'Renegotiate 2 subscriptions', impact: 800, eta: '2 days'}]
                      .map((item, idx) => (
                        <Grid item xs={12} key={idx}>
                          <Box p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">{item.title}</Typography>
                              <Typography variant="caption" color="text.secondary">ETA: {item.eta}</Typography>
                            </Box>
                            <Chip label={`+₹${item.impact.toLocaleString()}`} color="success" />
                          </Box>
                        </Grid>
                      ))}
                  </Grid>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Channel the extra straight into {repaymentStrategy === 'avalanche' ? 'highest-APR EMI' : 'smallest balance'} for fastest freedom.
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Hardship Mode & Safety Net */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h5" fontWeight="bold">🛟 Hardship Mode</Typography>
                    <FormControlLabel
                      control={<Switch checked={hardshipMode} onChange={(e) => setHardshipMode(e.target.checked)} color="warning" />}
                      label={hardshipMode ? 'On' : 'Off'}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Temporarily prioritize survival: minimum payments, freeze new EMIs, and direct surplus to essentials.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box p={2} sx={{ bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                        <Typography variant="subtitle2" fontWeight="bold">Min-pay envelope</Typography>
                        <Typography variant="body2" color="text.secondary">Allocate ₹{Math.round(debtAnalysis.monthlyBurden * 0.6).toLocaleString()} to keep EMIs current.</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box p={2} sx={{ bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #c8e6c9' }}>
                        <Typography variant="subtitle2" fontWeight="bold">Essential spend cap</Typography>
                        <Typography variant="body2" color="text.secondary">Target monthly essentials ≤ {Math.max(0, debtAnalysis.availableIncome).toLocaleString()}.</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Hardship mode locks new EMIs and pauses extra prepayments until income stabilizes.
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* 6-Month Payoff Calendar */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={2}>📅 6-Month Payoff Calendar</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>Projected progress if you maintain current payments.</Typography>
                  <Grid container spacing={1}>
                    {(() => {
                      const months = Math.min(6, Math.max(1, Math.ceil(debtAnalysis.avgMonthsRemaining)));
                      const monthlyPrincipal = overview.activeEMIs.reduce((sum, emi) => sum + (emi.remainingAmount / Math.max(1, emi.remainingInstallments)), 0);
                      return Array.from({ length: months }).map((_, idx) => {
                        const paid = monthlyPrincipal * (idx + 1);
                        const remaining = Math.max(0, debtAnalysis.totalOutstanding - paid);
                        return (
                          <Grid item xs={12} sm={6} key={idx}>
                            <Box p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                              <Typography variant="subtitle2" fontWeight="bold">Month {idx + 1}</Typography>
                              <Typography variant="caption" color="text.secondary">Projected remaining</Typography>
                              <Typography variant="body1" fontWeight="bold">{formatCurrency(remaining)}</Typography>
                            </Box>
                          </Grid>
                        );
                      });
                    })()}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Automation Cockpit */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={2}>🤖 Automation Cockpit</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>Set-and-enforce rules that keep you on track.</Typography>
                  {(() => {
                    const topEmi = [...overview.activeEMIs].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
                    const soonest = [...overview.activeEMIs]
                      .map(emi => ({
                        ...emi,
                        daysUntilDue: emi.nextDueDate ? Math.ceil((new Date(emi.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30
                      }))
                      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];
                    return (
                      <Box display="grid" gap={2}>
                        <Button
                          variant="contained"
                          color="primary"
                          disabled={!topEmi}
                          onClick={() => handleOneClickPrepay(topEmi)}
                        >
                          One-click prepay highest APR EMI {topEmi ? `(₹${topEmi.emiAmount.toLocaleString()})` : ''}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleSetupAutoSweep}
                        >
                          Auto-sweep 20% surplus to avalanche target
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          disabled={!soonest}
                          onClick={handleEnableLateFeeShield}
                        >
                          Arm late-fee shield (alerts {soonest ? `${soonest.daysUntilDue}d` : ''} before due)
                        </Button>
                      </Box>
                    );
                  })()}
                </CardContent>
              </Card>
            </Grid>

            {/* Behavioral Nudges & Streaks */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={2}>🏅 Behavioral Nudges & Streaks</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>Small wins compound—keep your momentum.</Typography>
                  <Box display="grid" gap={1.5}>
                    <Box p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">On-time streak</Typography>
                      <Typography variant="body2" color="text.secondary">Maintain 3-month streak to unlock lower-risk profile.</Typography>
                    </Box>
                    <Box p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Round-up challenge</Typography>
                      <Typography variant="body2" color="text.secondary">Add ₹100 daily for 10 days → prepay highest APR EMI.</Typography>
                    </Box>
                    <Box p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">No-new-EMI pledge</Typography>
                      <Typography variant="body2" color="text.secondary">30-day freeze on new credit while DTI {`>`} 40%.</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          )}
        </Box>
      )}

      {activeTab === 7 && (
        <Box>
          {/* Summary Cards */}
          {personalLoansSummary && (
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Borrowed</Typography>
                    <Typography variant="h4">₹{personalLoansSummary.totalBorrowed.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Outstanding</Typography>
                    <Typography variant="h4">₹{personalLoansSummary.totalOutstanding.toLocaleString()}</Typography>
                    <Typography variant="caption">Principal + Interest</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Current Interest</Typography>
                    <Typography variant="h4">₹{personalLoansSummary.totalInterest.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Active Loans</Typography>
                    <Typography variant="h4">{personalLoansSummary.activeLoansCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Add New Personal Loan Button */}
          <Box mb={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedPersonalLoan(null);
                setPersonalLoanFormData({
                  lenderName: '',
                  relationship: 'Friend',
                  principalAmount: '',
                  loanTakenDate: new Date().toISOString().split('T')[0],
                  interestRate: 0,
                  interestType: 'none',
                  purpose: '',
                  contactDetails: { phone: '', email: '' },
                  notes: '',
                  priority: 'medium',
                  tags: []
                });
                setPersonalLoanDialogOpen(true);
              }}
              sx={{ background: 'linear-gradient(45deg, #f093fb 30%, #f5576c 90%)' }}
            >
              Add Personal Loan
            </Button>
          </Box>

          {/* Personal Loans List */}
          {personalLoansLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : personalLoans.filter(loan => loan.status === 'active').length === 0 ? (
            <Box textAlign="center" py={8}>
              <MoneyIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" gutterBottom>No Active Personal Loans</Typography>
              <Typography color="text.secondary">
                Track money borrowed from friends and family here
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {personalLoans.filter(loan => loan.status === 'active').map((loan) => {
                const daysSinceTaken = Math.floor((new Date() - new Date(loan.loanTakenDate)) / (1000 * 60 * 60 * 24));
                return (
                  <Grid item xs={12} md={6} lg={4} key={loan._id}>
                    <Card elevation={3} sx={{ 
                      '&:hover': { boxShadow: 6 },
                      border: loan.priority === 'urgent' ? '2px solid #f44336' : 
                              loan.priority === 'high' ? '2px solid #ff9800' : 'none'
                    }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Box>
                            <Typography variant="h6">{loan.lenderName}</Typography>
                            <Chip label={loan.relationship} size="small" sx={{ mt: 0.5 }} />
                          </Box>
                          <Chip
                            label={loan.priority.toUpperCase()}
                            size="small"
                            color={
                              loan.priority === 'urgent' ? 'error' :
                              loan.priority === 'high' ? 'warning' :
                              loan.priority === 'medium' ? 'info' : 'default'
                            }
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Principal Amount
                        </Typography>
                        <Typography variant="h5" color="primary" gutterBottom>
                          ₹{loan.principalAmount.toLocaleString()}
                        </Typography>

                        {loan.currentInterest > 0 && (
                          <Box mb={2}>
                            <Typography variant="body2" color="warning.main" gutterBottom>
                              Current Interest ({loan.interestRate}% p.a.)
                            </Typography>
                            <Typography variant="h6" color="warning.dark">
                              + ₹{loan.currentInterest.toLocaleString()}
                            </Typography>
                          </Box>
                        )}

                        <Box 
                          sx={{ 
                            bgcolor: 'error.light', 
                            color: 'error.contrastText',
                            p: 2, 
                            borderRadius: 2,
                            mt: 2
                          }}
                        >
                          <Typography variant="body2" gutterBottom>
                            Total Outstanding
                          </Typography>
                          <Typography variant="h4" fontWeight="bold">
                            ₹{loan.outstandingAmount.toLocaleString()}
                          </Typography>
                        </Box>

                        <Box mt={2}>
                          <Typography variant="body2" color="text.secondary">
                            Borrowed: {new Date(loan.loanTakenDate).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Days since: {daysSinceTaken} days
                          </Typography>
                          {loan.totalRepaid > 0 && (
                            <Typography variant="body2" color="success.main">
                              Repaid: ₹{loan.totalRepaid.toLocaleString()}
                            </Typography>
                          )}
                        </Box>

                        <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setSelectedPersonalLoan(loan);
                              setPersonalLoanRepaymentData({ amount: '', notes: '' });
                              setPersonalLoanRepaymentDialogOpen(true);
                            }}
                          >
                            Add Repayment
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleMarkPersonalLoanRepaid(loan._id)}
                          >
                            Mark Repaid
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPersonalLoan(loan);
                              setPersonalLoanFormData({
                                ...loan,
                                loanTakenDate: new Date(loan.loanTakenDate).toISOString().split('T')[0]
                              });
                              setPersonalLoanDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePersonalLoan(loan._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Completed Personal Loans */}
          {personalLoans.filter(loan => loan.status === 'repaid').length > 0 && (
            <Box mt={4}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" />
                Completed Repayments
              </Typography>
              <Grid container spacing={2} mt={1}>
                {personalLoans.filter(loan => loan.status === 'repaid').map((loan) => (
                  <Grid item xs={12} md={6} key={loan._id}>
                    <Card elevation={1} sx={{ opacity: 0.8 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between">
                          <Box>
                            <Typography variant="h6">{loan.lenderName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Principal: ₹{loan.principalAmount.toLocaleString()}
                            </Typography>
                            {loan.currentInterest > 0 && (
                              <Typography variant="body2" color="text.secondary">
                                Interest Paid: ₹{loan.currentInterest.toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                          <Chip label="REPAID" color="success" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Repaid on: {loan.repaymentDate ? new Date(loan.repaymentDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
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

      {/* Payment Reminder Dialog */}
      <Dialog
        open={reminderDialogOpen}
        onClose={() => {
          setReminderDialogOpen(false);
          setSelectedReminderEmi(null);
          setReminderTab(0);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 36px rgba(0,0,0,0.18)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon color="primary" />
          Payment & Reminder Assistant
        </DialogTitle>
        <DialogContent dividers>
          {selectedReminderEmi ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#f8fafc'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {selectedReminderEmi.merchantName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedReminderEmi.cardProvider} {selectedReminderEmi.cardLastFourDigits || ''}
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                  <Chip label={`Due: ${formatDate(selectedReminderEmi.nextDueDate)}`} color="warning" />
                  <Chip label={`Amount: ${formatCurrency(selectedReminderEmi.emiAmount)}`} color="primary" />
                  <Chip label={`Tenure left: ${selectedReminderEmi.remainingInstallments || '—'} months`} />
                </Box>
              </Box>

              <Tabs
                value={reminderTab}
                onChange={(_, value) => setReminderTab(value)}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="Ways to Pay" />
                <Tab label="Auto-pay Setup" />
                <Tab label="Smart Nudges" />
              </Tabs>

              {reminderTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="info" icon={<PaymentIcon />}>
                    Use any option below; we will keep this EMI pinned in reminders until it is marked paid.
                  </Alert>
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold">Card/Billing App</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay via {selectedReminderEmi.cardProvider} app with saved card {selectedReminderEmi.cardLastFourDigits || ''}.
                        </Typography>
                        <Button fullWidth sx={{ mt: 1.5 }} variant="contained" color="primary">
                          Open Provider App
                        </Button>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold">Net Banking / UPI</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Use your bank portal or UPI ID to settle ₹{selectedReminderEmi.emiAmount?.toLocaleString()} instantly.
                        </Typography>
                        <Button fullWidth sx={{ mt: 1.5 }} variant="outlined">
                          Copy Payment Details
                        </Button>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              )}

              {reminderTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Recommended: cap auto-debit at ₹{(selectedReminderEmi.emiAmount * 1.05).toLocaleString()} to cover taxes/fees.
                  </Alert>
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold">Set Standing Instruction</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Enable auto-debit on due date ({formatDate(selectedReminderEmi.nextDueDate)}) with max limit guard.
                        </Typography>
                        <Button fullWidth sx={{ mt: 1.5 }} variant="contained" color="success">
                          Enable Auto-pay
                        </Button>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold">Safety Checks</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Keep balance ≥ ₹{(selectedReminderEmi.emiAmount * 1.1).toLocaleString()} a day before due; avoid failed debits.
                        </Typography>
                        <Button fullWidth sx={{ mt: 1.5 }} variant="outlined" color="warning">
                          Add Balance Alert
                        </Button>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              )}

              {reminderTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Smart nudges for this EMI
                  </Typography>
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body2" fontWeight="bold">Pre-due reminder</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Nudge 3 days before due; share UPI link + outstanding amount.
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body2" fontWeight="bold">Late-fee shield</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Alert if balance drops below ₹{(selectedReminderEmi.emiAmount * 0.75).toLocaleString()} within 48 hours of due.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  <Alert severity="info">
                    We will keep this EMI highlighted in the reminder feed until you mark it paid or reschedule.
                  </Alert>
                </Box>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Pick an EMI to view payment options and set reminders.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1.5 }}>
          <Button
            onClick={() => {
              setReminderDialogOpen(false);
              setSelectedReminderEmi(null);
              setReminderTab(0);
            }}
            variant="outlined"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              const emiId = selectedReminderEmi?.id || selectedReminderEmi?._id || null;
              if (emiId) {
                setLastReminderEmiId(emiId);
              }
              setReminderDialogOpen(false);
              setSelectedReminderEmi(null);
              setReminderTab(0);
            }}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            disabled={!selectedReminderEmi}
          >
            Save reminder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Loan Given Dialog */}
      <Dialog open={loanGivenDialogOpen} onClose={() => setLoanGivenDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedLoanGiven ? 'Edit Loan' : 'Add New Loan Given'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Borrower Name *"
              fullWidth
              value={loanGivenFormData.borrowerName}
              onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, borrowerName: e.target.value })}
            />
            
            <FormControl fullWidth>
              <InputLabel>Relationship</InputLabel>
              <Select
                value={loanGivenFormData.relationship}
                onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, relationship: e.target.value })}
                label="Relationship"
              >
                <MenuItem value="Friend">Friend</MenuItem>
                <MenuItem value="Family">Family</MenuItem>
                <MenuItem value="Colleague">Colleague</MenuItem>
                <MenuItem value="Relative">Relative</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Amount *"
              type="number"
              fullWidth
              value={loanGivenFormData.amount}
              onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, amount: e.target.value })}
              InputProps={{ startAdornment: '₹' }}
            />

            <TextField
              label="Loan Date"
              type="date"
              fullWidth
              value={loanGivenFormData.loanDate}
              onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, loanDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Expected Repayment Date"
              type="date"
              fullWidth
              value={loanGivenFormData.expectedRepaymentDate}
              onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, expectedRepaymentDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Purpose"
              fullWidth
              multiline
              rows={2}
              value={loanGivenFormData.purpose}
              onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, purpose: e.target.value })}
            />

            <Box display="flex" gap={2}>
              <TextField
                label="Phone Number"
                fullWidth
                value={loanGivenFormData.contactDetails.phone}
                onChange={(e) => setLoanGivenFormData({
                  ...loanGivenFormData,
                  contactDetails: { ...loanGivenFormData.contactDetails, phone: e.target.value }
                })}
              />
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={loanGivenFormData.contactDetails.email}
                onChange={(e) => setLoanGivenFormData({
                  ...loanGivenFormData,
                  contactDetails: { ...loanGivenFormData.contactDetails, email: e.target.value }
                })}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={loanGivenFormData.priority}
                onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, priority: e.target.value })}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={loanGivenFormData.notes}
              onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoanGivenDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveLoanGiven} variant="contained" color="primary">
            {selectedLoanGiven ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Repayment Dialog */}
      <Dialog open={repaymentDialogOpen} onClose={() => setRepaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Repayment</DialogTitle>
        <DialogContent>
          {selectedLoanGiven && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{selectedLoanGiven.borrowerName}</strong>
                  <br />
                  Outstanding: ₹{selectedLoanGiven.remainingAmount.toLocaleString()}
                </Typography>
              </Alert>

              <TextField
                label="Repayment Amount *"
                type="number"
                fullWidth
                value={repaymentData.amount}
                onChange={(e) => setRepaymentData({ ...repaymentData, amount: e.target.value })}
                InputProps={{ startAdornment: '₹' }}
                helperText={`Max: ₹${selectedLoanGiven.remainingAmount.toLocaleString()}`}
              />

              <TextField
                label="Repayment Date"
                type="date"
                fullWidth
                value={repaymentData.date}
                onChange={(e) => setRepaymentData({ ...repaymentData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={repaymentData.method}
                  onChange={(e) => setRepaymentData({ ...repaymentData, method: e.target.value })}
                  label="Payment Method"
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Transaction ID"
                fullWidth
                value={repaymentData.transactionId}
                onChange={(e) => setRepaymentData({ ...repaymentData, transactionId: e.target.value })}
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={repaymentData.notes}
                onChange={(e) => setRepaymentData({ ...repaymentData, notes: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddRepayment} variant="contained" color="primary">
            Add Repayment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Personal Loan Dialog */}
      <Dialog 
        open={personalLoanDialogOpen} 
        onClose={() => setPersonalLoanDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPersonalLoan ? 'Edit Personal Loan' : 'Add Personal Loan'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Lender Name"
              required
              fullWidth
              value={personalLoanFormData.lenderName}
              onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, lenderName: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Relationship</InputLabel>
              <Select
                value={personalLoanFormData.relationship}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, relationship: e.target.value })}
                label="Relationship"
              >
                <MenuItem value="Friend">Friend</MenuItem>
                <MenuItem value="Family">Family</MenuItem>
                <MenuItem value="Colleague">Colleague</MenuItem>
                <MenuItem value="Relative">Relative</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Principal Amount"
              type="number"
              required
              fullWidth
              value={personalLoanFormData.principalAmount}
              onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, principalAmount: e.target.value })}
              InputProps={{ startAdornment: '₹' }}
            />

            <TextField
              label="Loan Taken Date"
              type="date"
              fullWidth
              value={personalLoanFormData.loanTakenDate}
              onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, loanTakenDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Repayment Option</InputLabel>
              <Select
                value={personalLoanFormData.repaymentOption}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, repaymentOption: e.target.value })}
                label="Repayment Option"
              >
                <MenuItem value="one-time">One-time (On date)</MenuItem>
                <MenuItem value="emi">Installments (EMI)</MenuItem>
              </Select>
            </FormControl>

            {personalLoanFormData.repaymentOption === 'one-time' && (
              <TextField
                label="Repay Date"
                type="date"
                fullWidth
                value={personalLoanFormData.repayDate}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, repayDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            )}

            {personalLoanFormData.repaymentOption === 'emi' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="EMI Tenure (months)"
                  type="number"
                  fullWidth
                  value={personalLoanFormData.emiTenureMonths}
                  onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, emiTenureMonths: parseInt(e.target.value || 0) })}
                />
                <FormControl fullWidth>
                  <InputLabel>EMI Frequency</InputLabel>
                  <Select
                    value={personalLoanFormData.emiFrequency}
                    onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, emiFrequency: e.target.value })}
                    label="EMI Frequency"
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Bi-weekly</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <FormControl fullWidth>
              <InputLabel>Interest Type</InputLabel>
              <Select
                value={personalLoanFormData.interestType}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, interestType: e.target.value })}
                label="Interest Type"
              >
                <MenuItem value="none">No Interest</MenuItem>
                <MenuItem value="simple">Simple Interest</MenuItem>
              </Select>
            </FormControl>

            {personalLoanFormData.interestType === 'simple' && (
              <TextField
                label="Interest Rate (% per annum)"
                type="number"
                fullWidth
                value={personalLoanFormData.interestRate}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, interestRate: parseFloat(e.target.value) || 0 })}
                InputProps={{ endAdornment: '%' }}
              />
            )}

            <TextField
              label="Purpose"
              fullWidth
              multiline
              rows={2}
              value={personalLoanFormData.purpose}
              onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, purpose: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={personalLoanFormData.priority}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, priority: e.target.value })}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Contact Phone"
              fullWidth
              value={personalLoanFormData.contactDetails.phone}
              onChange={(e) => setPersonalLoanFormData({
                ...personalLoanFormData,
                contactDetails: { ...personalLoanFormData.contactDetails, phone: e.target.value }
              })}
            />

            <TextField
              label="Contact Email"
              fullWidth
              type="email"
              value={personalLoanFormData.contactDetails.email}
              onChange={(e) => setPersonalLoanFormData({
                ...personalLoanFormData,
                contactDetails: { ...personalLoanFormData.contactDetails, email: e.target.value }
              })}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={personalLoanFormData.notes}
              onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalLoanDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePersonalLoan} variant="contained" color="primary">
            {selectedPersonalLoan ? 'Update' : 'Add'} Loan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Repayment to Personal Loan Dialog */}
      <Dialog 
        open={personalLoanRepaymentDialogOpen} 
        onClose={() => setPersonalLoanRepaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Repayment</DialogTitle>
        <DialogContent>
          {selectedPersonalLoan && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Lender:</strong> {selectedPersonalLoan.lenderName}
                </Typography>
                <Typography variant="body2">
                  <strong>Outstanding:</strong> ₹{selectedPersonalLoan.outstandingAmount.toLocaleString()}
                </Typography>
                {selectedPersonalLoan.currentInterest > 0 && (
                  <Typography variant="body2" color="warning.main">
                    <strong>Current Interest:</strong> ₹{selectedPersonalLoan.currentInterest.toLocaleString()}
                  </Typography>
                )}
              </Alert>

              <TextField
                label="Repayment Amount"
                type="number"
                required
                fullWidth
                value={personalLoanRepaymentData.amount}
                onChange={(e) => setPersonalLoanRepaymentData({ ...personalLoanRepaymentData, amount: e.target.value })}
                InputProps={{ startAdornment: '₹' }}
                helperText={`Max: ₹${selectedPersonalLoan.outstandingAmount.toLocaleString()}`}
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={personalLoanRepaymentData.notes}
                onChange={(e) => setPersonalLoanRepaymentData({ ...personalLoanRepaymentData, notes: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalLoanRepaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddPersonalLoanRepayment} variant="contained" color="success">
            Add Repayment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
      </Box>
    </>
  );
};

export default EMITracker;
