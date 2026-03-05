import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import EMIMonthlyTrends from '../components/EMIMonthlyTrends';
import { useTheme } from '../context/ThemeContext';
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
  FormControlLabel,
  Snackbar
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

import api from '../services/api';
import { FadeIn, StaggerChildren, PageTransition } from '../components/ui/AnimatedComponents';

// Color palette for charts
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Theme-aware chart card styling factory
const getChartCardStyle = (isDark) => ({
  bgcolor: 'background.paper',
  borderRadius: 4,
  boxShadow: isDark
    ? '0 2px 12px rgba(0,0,0,0.3)'
    : '0 2px 12px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid',
  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider',
  backdropFilter: isDark ? 'blur(20px)' : 'none',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: isDark
      ? '0 16px 48px rgba(0,0,0,0.4)'
      : '0 16px 48px rgba(0,0,0,0.15)',
    borderColor: 'primary.main',
    '& .chart-title': {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundClip: 'text',
      textFillColor: 'transparent',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      transform: 'translateX(8px)'
    }
  }
});

// Theme-aware surface colors
const getSurface = (isDark) => isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff';
const getSurfaceAlt = (isDark) => isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc';
const getSurfaceMuted = (isDark) => isDark ? 'rgba(51, 65, 85, 0.5)' : '#f5f5f5';
const getBorder = (isDark) => isDark ? 'rgba(255,255,255,0.08)' : '#e0e0e0';
const getTableHover = (isDark) => isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5';
const getTableHeader = (isDark) => isDark ? 'rgba(30, 41, 59, 0.8)' : '#fafafa';

const EMITracker = () => {
  const { isDark, mode, accent } = useTheme();

  // Memoized theme-aware styles
  const chartCardHoverEffect = useMemo(() => getChartCardStyle(isDark), [isDark]);
  const surface = useMemo(() => getSurface(isDark), [isDark]);
  const surfaceAlt = useMemo(() => getSurfaceAlt(isDark), [isDark]);
  const surfaceMuted = useMemo(() => getSurfaceMuted(isDark), [isDark]);
  const borderColor = useMemo(() => getBorder(isDark), [isDark]);
  const tableHoverBg = useMemo(() => getTableHover(isDark), [isDark]);
  const tableHeaderBg = useMemo(() => getTableHeader(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
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

  // Bank & Balance State
  const [bankDeductionData, setBankDeductionData] = useState(null);
  const [bankDeductionLoading, setBankDeductionLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningEmi, setAssigningEmi] = useState(null);
  const [assignForm, setAssignForm] = useState({
    bankAccountId: '',
    deductionDay: '',
    autoDebitEnabled: false,
    minimumBalanceRequired: '',
    deductionBankName: '',
    deductionAccountNumber: ''
  });
  
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
    interestType: 'percentage', // 'percentage' or 'flat' (rupees)
    processingFee: '',
    emiAmount: '',
    totalTenure: '',
    repaymentType: 'MONTHLY', // MONTHLY or ON_REQUEST
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    tags: []
  });
  const [manualEMIErrors, setManualEMIErrors] = useState({});
  const [autoCalculatedRate, setAutoCalculatedRate] = useState(null);

  // Auto-calculate interest rate when Principal, EMI, and Tenure are provided
  useEffect(() => {
    if (manualEMIData.repaymentType !== 'MONTHLY') return;
    if (manualEMIData.interestType !== 'percentage') {
      setAutoCalculatedRate(null);
      return;
    }

    const P = parseFloat(manualEMIData.principalAmount);
    const EMI = parseFloat(manualEMIData.emiAmount);
    const n = parseInt(manualEMIData.totalTenure);

    if (!P || !EMI || !n || P <= 0 || EMI <= 0 || n <= 0) {
      setAutoCalculatedRate(null);
      return;
    }

    // If EMI * n == P, interest is 0
    const totalPayable = EMI * n;
    if (Math.abs(totalPayable - P) < 1) {
      setAutoCalculatedRate(0);
      if (!manualEMIData.interestRate) {
        setManualEMIData(prev => ({ ...prev, interestRate: '0' }));
      }
      return;
    }

    // If EMI * n < P, EMI is too low (invalid)
    if (totalPayable < P) {
      setAutoCalculatedRate(null);
      return;
    }

    // Newton-Raphson to solve: EMI = P * r * (1+r)^n / ((1+r)^n - 1) for r
    let r = 0.01; // initial guess: 1% monthly
    for (let i = 0; i < 100; i++) {
      const rn = Math.pow(1 + r, n);
      const f = P * r * rn / (rn - 1) - EMI;
      // derivative of f w.r.t. r
      const df = P * (rn * (rn - 1) - r * n * Math.pow(1 + r, n - 1) * (rn - 1) + r * rn * n * Math.pow(1 + r, n - 1)) / ((rn - 1) * (rn - 1));
      // simplified derivative
      const numerator = rn * (1 + r) * (rn - 1) - r * n * rn * (rn - 1) / (1 + r) + r * rn * n * rn / (1 + r);
      // Use numerical derivative for stability
      const r2 = r + 0.0001;
      const rn2 = Math.pow(1 + r2, n);
      const f2 = P * r2 * rn2 / (rn2 - 1) - EMI;
      const dfNum = (f2 - f) / 0.0001;

      if (Math.abs(dfNum) < 1e-10) break;
      const rNew = r - f / dfNum;
      if (rNew <= 0) { r = r / 2; continue; }
      if (Math.abs(rNew - r) < 1e-10) { r = rNew; break; }
      r = rNew;
    }

    const annualRate = parseFloat((r * 12 * 100).toFixed(2));
    if (annualRate >= 0 && annualRate < 200 && isFinite(annualRate)) {
      setAutoCalculatedRate(annualRate);
      setManualEMIData(prev => ({ ...prev, interestRate: String(annualRate) }));
    } else {
      setAutoCalculatedRate(null);
    }
  }, [manualEMIData.principalAmount, manualEMIData.emiAmount, manualEMIData.totalTenure, manualEMIData.repaymentType, manualEMIData.interestType]);
  
  // Edit/Delete EMI State
  const [selectedEMI, setSelectedEMI] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editEMIDialogOpen, setEditEMIDialogOpen] = useState(false);
  const [editEMIData, setEditEMIData] = useState({});
  const [editEMILoading, setEditEMILoading] = useState(false);
  const [emiDetailOpen, setEmiDetailOpen] = useState(false);
  const [selectedEmiChartData, setSelectedEmiChartData] = useState(null);

  // Upcoming Payments State
  const [upcomingMonthsToShow, setUpcomingMonthsToShow] = useState(1); // Default show next month only

  // Debt Freedom Plan State
  const [debtAnalysisData, setDebtAnalysis] = useState(null);
  const debtAnalysis = debtAnalysisData || {
    debtToIncomeRatio: 0,
    debtTrapStatus: 'healthy',
    debtTrapMessage: 'Loading...',
    monthlyIncome: 0,
    monthlyBurden: 0,
    availableIncome: 0,
    availablePercentage: 0,
    totalOutstanding: 0,
    totalInterestOutstanding: 0,
    totalInterestToPay: 0,
    avgMonthsRemaining: 0,
    emergencyFundGoal: 0,
    currentEmergencyFund: 0,
    emergencyFundPercentage: 0,
    emergencyFundMonths: 0,
    sortedEMIsAvalanche: [],
    sortedEMIsSnowball: [],
    calculateEarlyRepaymentSavings: () => 0,
    recommendedMonthlyExtra: 0,
  };
  const [earlyPaymentAmount, setEarlyPaymentAmount] = useState('');
  const [selectedEMIForEarlyPayment, setSelectedEMIForEarlyPayment] = useState(null);
  const [earlyPaymentDialogOpen, setEarlyPaymentDialogOpen] = useState(false);
  const [emergencyFundGoal, setEmergencyFundGoal] = useState(180000); // 6 months of 30k
  const [currentEmergencyFund, setCurrentEmergencyFund] = useState(0);
  const [emergencyFundSaving, setEmergencyFundSaving] = useState(false);
  const [emergencyFundMessage, setEmergencyFundMessage] = useState(null);
  const [emergencyFundContribution, setEmergencyFundContribution] = useState('');
  const [contributionSaving, setContributionSaving] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0); // Actual expenses from dashboard
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
  const [customExtraPayment, setCustomExtraPayment] = useState(0);

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
    interestType: 'none', // 'none', 'percentage', 'flat'
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

  // ===== Credit Card Bills State =====
  const [ccBills, setCcBills] = useState([]);
  const [ccBillsSummary, setCcBillsSummary] = useState(null);
  const [ccBillsLoading, setCcBillsLoading] = useState(false);
  const [ccBillSyncing, setCcBillSyncing] = useState(false);
  const [ccBillDialogOpen, setCcBillDialogOpen] = useState(false);
  const [ccBillPayDialogOpen, setCcBillPayDialogOpen] = useState(false);
  const [selectedCcBill, setSelectedCcBill] = useState(null);
  const [ccBillFormData, setCcBillFormData] = useState({
    cardProvider: '',
    cardLastFourDigits: '',
    cardHolderName: '',
    cardNetwork: '',
    statementDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    totalAmount: '',
    minimumDue: '',
    creditLimit: '',
    interestCharged: '',
    feesAndCharges: '',
    newCharges: '',
    previousBalance: '',
    paymentsReceived: '',
    notes: '',
    spendingByCategory: []
  });
  const [ccPayAmount, setCcPayAmount] = useState('');
  const [ccPayMethod, setCcPayMethod] = useState('');

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
      await fetchMonthlyExpenses(); // Fetch actual expenses
      await fetchAllData(); // Then fetch EMI data
      fetchMonthlyTrends(trendsMonths);
    };
    loadData();
    // Trigger card animations after component mount
    setTimeout(() => setAnimateCards(true), 100);
  }, [selectedPeriod, trendsMonths]);

  useEffect(() => {
    // Fetch loans given when tab 7 is active
    if (activeTab === 7) {
      fetchLoansGiven();
    }
    // Fetch personal loans when tab 8 is active
    if (activeTab === 8) {
      fetchPersonalLoans();
    }
    // Fetch CC bills when tab 9 is active
    if (activeTab === 9) {
      fetchCCBills();
    }
    // Fetch bank deduction data when tab 10 is active
    if (activeTab === 10) {
      fetchBankDeductionSummary();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/profile');
      console.log('✅ Profile API Full Response:', response.data);
      
      // API returns: { success: true, data: { profile: {...}, gmailConnected, gmailEmail } }
      if (response.data?.success && response.data?.data?.profile) {
        const profileData = response.data.data.profile;
        console.log('✅ Extracted Profile Object:', profileData);
        console.log('✅ Monthly Income Found:', profileData.monthlyIncome);
        setUserProfile(profileData);

        const emergencyFund = profileData?.preferences?.debtFreedom?.emergencyFund;
        if (emergencyFund && typeof emergencyFund === 'object') {
          // Load current amount and contributions
          if (typeof emergencyFund.currentAmount === 'number' && !Number.isNaN(emergencyFund.currentAmount)) {
            setCurrentEmergencyFund(emergencyFund.currentAmount);
          }
          if (Array.isArray(emergencyFund.contributions) && emergencyFund.contributions.length > 0) {
            const latest = emergencyFund.contributions[emergencyFund.contributions.length - 1];
            setLastContribution(latest);
          }
          // Note: Goal will be auto-calculated based on EMIs and expenses
        }
      } else {
        console.error('❌ Unexpected API response structure:', response.data);
        // Fallback to try other structures
        const fallbackProfile = response.data?.data?.profile || response.data?.data || response.data?.profile;
        console.log('⚠️ Using fallback profile:', fallbackProfile);
        setUserProfile(fallbackProfile);

        const emergencyFund = fallbackProfile?.preferences?.debtFreedom?.emergencyFund;
        if (emergencyFund && typeof emergencyFund === 'object') {
          // Load current amount and contributions
          if (typeof emergencyFund.currentAmount === 'number' && !Number.isNaN(emergencyFund.currentAmount)) {
            setCurrentEmergencyFund(emergencyFund.currentAmount);
          }
          if (Array.isArray(emergencyFund.contributions) && emergencyFund.contributions.length > 0) {
            const latest = emergencyFund.contributions[emergencyFund.contributions.length - 1];
            setLastContribution(latest);
          }
          // Note: Goal will be auto-calculated based on EMIs and expenses
        }
      }
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      console.error('Error details:', err.response?.data);
    }
  };

  const fetchMonthlyExpenses = async () => {
    try {
      // Get last 30 days of expenses from transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const response = await api.get(
        `/financial/transactions?startDate=${thirtyDaysAgo.toISOString().split('T')[0]}&type=expense`
      );
      
      if (response.data?.success && response.data?.data?.transactions) {
        const totalExpenses = response.data.data.transactions.reduce(
          (sum, txn) => sum + (txn.amount || 0), 0
        );
        // Average monthly expenses (last 30 days)
        setMonthlyExpenses(totalExpenses);
        console.log('✅ Monthly expenses fetched:', totalExpenses.toLocaleString());
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      // Fallback to estimated expenses if fetch fails
      setMonthlyExpenses(0);
    }
  };

  const saveEmergencyFundStatus = async () => {
    setEmergencyFundSaving(true);
    setEmergencyFundMessage(null);
    try {
      const response = await api.put(
        '/profile/debt-freedom/emergency-fund',
        {
          currentAmount: Number(currentEmergencyFund) || 0,
          goalAmount: Number(emergencyFundGoal) || 0
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

      const response = await api.post(
        '/profile/debt-freedom/emergency-fund/contribution',
        { amount }
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
      // Fetch all data in parallel - fetch max 36 months for upcoming payments
      const [overviewRes, upcomingRes, chartsRes, insightsRes] = await Promise.all([
        api.get('/emi/overview'),
        api.get('/emi/upcoming?months=36'),
        api.get('/emi/charts'),
        api.get('/emi/insights')
      ]);

      setOverview(overviewRes.data.data);
      setUpcomingPayments(upcomingRes.data.data);
      setChartData(chartsRes.data.data);
      setInsights(insightsRes.data.data);

      // Debug: log fetched data shapes to help diagnose blank charts on remote clients
      // eslint-disable-next-line no-console
      console.debug('EMI fetchAllData', {
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
      const response = await api.get(`/emi/monthly-trends?months=${months}`);
      setMonthlyTrends(response.data.data);

      // Debug: log monthly trends shape
      // eslint-disable-next-line no-console
      console.debug('EMI fetchMonthlyTrends', 'months:', months, 'items:', response.data?.data?.monthlyTrends?.length ?? 0);
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

  // Auto-calculate emergency fund goal based on monthly obligations
  useEffect(() => {
    if (overview && userProfile) {
      const monthlyIncome = userProfile?.monthlyIncome || 0;
      const monthlyBurden = overview.overview?.monthlyBurden || 0;
      
      // Use actual expenses from dashboard if available, otherwise estimate
      let actualMonthlyExpenses = monthlyExpenses;
      if (actualMonthlyExpenses === 0 && monthlyIncome > 0) {
        // Fallback: estimate as 30% of income if no expense data available
        actualMonthlyExpenses = monthlyIncome * 0.30;
      } else if (actualMonthlyExpenses === 0) {
        // Last resort fallback
        actualMonthlyExpenses = 30000;
      }
      
      const totalMonthlyObligations = monthlyBurden + actualMonthlyExpenses;
      
      // Calculate 6 months of obligations as the goal
      const calculatedGoal = Math.round(totalMonthlyObligations * 6);
      
      // Auto-set goal if it's not already set or if it's significantly different (>20% change)
      if (calculatedGoal > 0) {
        if (emergencyFundGoal === 0 || Math.abs(emergencyFundGoal - calculatedGoal) / calculatedGoal > 0.2) {
          setEmergencyFundGoal(calculatedGoal);
          console.log('✅ Emergency fund goal auto-calculated:', {
            monthlyBurden,
            actualMonthlyExpenses: actualMonthlyExpenses.toLocaleString(),
            source: monthlyExpenses > 0 ? 'actual expenses from dashboard' : 'estimated (30% of income)',
            totalMonthlyObligations,
            calculatedGoal: calculatedGoal.toLocaleString()
          });
        }
      }
    }
  }, [overview, userProfile, monthlyExpenses]);

  // Calculate debt analysis when data changes
  useEffect(() => {
    if (overview && userProfile && activeTab === 1) {
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
    if (!debtAnalysisData || !overview?.activeEMIs) return;

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
  }, [guardrailSettings, debtAnalysisData, overview]);

  const handleGuardrailToggle = (key) => (event) => {
    setGuardrailSettings((prev) => ({ ...prev, [key]: event.target.checked }));
  };

  const schedulePreDueReminder = async (emi) => {
    const emiId = emi.id || emi._id;
    if (!emiId || lastReminderEmiId === emiId) return;
    try {
      await api.post(
        '/emi/reminders/pre-due',
        {
          emiId,
          merchantName: emi.merchantName,
          daysUntilDue: emi.daysUntilDue || 7
        }
      );
      setLastReminderEmiId(emiId);
    } catch (err) {
      console.error('Failed to schedule pre-due reminder', err);
    }
  };

  const handleExportMonthlyTrends = async (format) => {
    try {
      const params = new URLSearchParams({
        months: trendsMonths,
        format: format
      });
      
      const response = await api.get(`/emi/monthly-trends/export?${params}`, {
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
      showSnackbar(`Monthly Trends report exported successfully as ${format.toUpperCase()}!`);
    } catch (err) {
      console.error('Error exporting monthly trends:', err);
      const errMsg = err.response?.data?.message || 'Failed to export monthly trends';
      setError(errMsg);
      showSnackbar('Failed to export report. Please try again.', 'error');
    }
  };

  // Fetch loans given
  const fetchLoansGiven = async () => {
    setLoansGivenLoading(true);
    try {
      const [loansResponse, summaryResponse] = await Promise.all([
        api.get('/loans-given'),
        api.get('/loans-given/summary')
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
      if (selectedLoanGiven) {
        // Update existing loan
        await api.put(`/loans-given/${selectedLoanGiven._id}`, loanGivenFormData);
        showSnackbar('Loan updated successfully!');
      } else {
        // Create new loan
        await api.post('/loans-given', loanGivenFormData);
        showSnackbar('Loan recorded successfully!');
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
        interestType: 'none',
        notes: '',
        priority: 'medium',
        tags: []
      });
      fetchLoansGiven();
    } catch (err) {
      console.error('Error saving loan:', err);
      showSnackbar(err.response?.data?.message || 'Failed to save loan', 'error');
    }
  };

  // Add repayment to loan
  const handleAddRepayment = async () => {
    try {
      await api.post(`/loans-given/${selectedLoanGiven._id}/repayment`, repaymentData);
      showSnackbar('Repayment added successfully!');
      
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
      showSnackbar(err.response?.data?.message || 'Failed to add repayment', 'error');
    }
  };

  // Delete loan given
  const handleDeleteLoanGiven = async (loanId) => {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    
    try {
      await api.delete(`/loans-given/${loanId}`);
      showSnackbar('Loan deleted successfully!');
      fetchLoansGiven();
    } catch (err) {
      console.error('Error deleting loan:', err);
      showSnackbar(err.response?.data?.message || 'Failed to delete loan', 'error');
    }
  };

  // Write off loan
  const handleWriteOffLoan = async (loanId) => {
    if (!confirm('Are you sure you want to write off this loan? This action marks it as unrecoverable.')) return;
    
    try {
      await api.put(`/loans-given/${loanId}/write-off`, {});
      showSnackbar('Loan written off successfully!');
      fetchLoansGiven();
    } catch (err) {
      console.error('Error writing off loan:', err);
      showSnackbar(err.response?.data?.message || 'Failed to write off loan', 'error');
    }
  };

  // ==================== PERSONAL LOANS FUNCTIONS ====================
  // Fetch personal loans (loans TAKEN from friends/family)
  const fetchPersonalLoans = async () => {
    try {
      setPersonalLoansLoading(true);
      const [loansRes, summaryRes] = await Promise.all([
        api.get('/personal-loans'),
        api.get('/personal-loans/summary')
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
      if (selectedPersonalLoan) {
        // Update existing loan
        await api.put(`/personal-loans/${selectedPersonalLoan._id}`, personalLoanFormData);
        setPersonalLoanMessage({ type: 'success', text: 'Personal loan updated successfully!' });
      } else {
        // Create new loan
        await api.post('/personal-loans', personalLoanFormData);
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
      showSnackbar(err.response?.data?.message || 'Failed to save personal loan', 'error');
    }
  };

  // Add repayment to personal loan
  const handleAddPersonalLoanRepayment = async () => {
    if (!selectedPersonalLoan) return;
    
    try {
      await api.post(
        `/personal-loans/${selectedPersonalLoan._id}/repayment`, 
        { amount: parseFloat(personalLoanRepaymentData.amount) }
      );
      
      showSnackbar('Repayment added successfully!');
      setPersonalLoanRepaymentDialogOpen(false);
      setSelectedPersonalLoan(null);
      setPersonalLoanRepaymentData({
        amount: '',
        notes: ''
      });
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error adding repayment:', err);
      showSnackbar(err.response?.data?.message || 'Failed to add repayment', 'error');
    }
  };

  // Mark personal loan as fully repaid
  const handleMarkPersonalLoanRepaid = async (loanId) => {
    if (!confirm('Mark this loan as fully repaid?')) return;
    
    try {
      await api.put(`/personal-loans/${loanId}/mark-repaid`, {});
      showSnackbar('Loan marked as repaid successfully!');
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error marking loan as repaid:', err);
      showSnackbar(err.response?.data?.message || 'Failed to mark loan as repaid', 'error');
    }
  };

  // Delete personal loan
  const handleDeletePersonalLoan = async (loanId) => {
    if (!confirm('Are you sure you want to delete this personal loan record?')) return;
    
    try {
      await api.delete(`/personal-loans/${loanId}`);
      showSnackbar('Personal loan deleted successfully!');
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error deleting personal loan:', err);
      showSnackbar(err.response?.data?.message || 'Failed to delete personal loan', 'error');
    }
  };

  // ===== Credit Card Bills Functions =====
  const fetchCCBills = async () => {
    setCcBillsLoading(true);
    try {
      const [billsRes, summaryRes] = await Promise.all([
        api.get('/cc-bills?months=12'),
        api.get('/cc-bills/summary')
      ]);
      setCcBills(billsRes.data.data?.bills || []);
      setCcBillsSummary(summaryRes.data.data || null);
    } catch (err) {
      console.error('Error fetching CC bills:', err);
    } finally {
      setCcBillsLoading(false);
    }
  };

  // ─── Bank & Balance helpers ────────────────────────────────────
  const fetchBankDeductionSummary = async () => {
    setBankDeductionLoading(true);
    try {
      const res = await api.get('/emi/bank-deduction-summary');
      setBankDeductionData(res.data.data || null);
    } catch (err) {
      console.error('Error fetching bank deduction summary:', err);
    } finally {
      setBankDeductionLoading(false);
    }
  };

  const openAssignDialog = (emi) => {
    setAssigningEmi(emi);
    setAssignForm({
      bankAccountId: emi.deductionBank?._id || '',
      deductionDay: emi.deductionDay || '',
      autoDebitEnabled: emi.autoDebitEnabled || false,
      minimumBalanceRequired: emi.minimumBalanceRequired || '',
      deductionBankName: emi.deductionBank?.bankName || '',
      deductionAccountNumber: emi.deductionBank?.accountNumber || ''
    });
    setAssignDialogOpen(true);
  };

  const handleAssignBank = async () => {
    if (!assigningEmi) return;
    try {
      const payload = {
        deductionDay: Number(assignForm.deductionDay) || undefined,
        autoDebitEnabled: assignForm.autoDebitEnabled,
        minimumBalanceRequired: Number(assignForm.minimumBalanceRequired) || 0
      };
      if (assignForm.bankAccountId) {
        payload.bankAccountId = assignForm.bankAccountId;
      } else if (assignForm.deductionBankName) {
        payload.deductionBankName = assignForm.deductionBankName;
        payload.deductionAccountNumber = assignForm.deductionAccountNumber;
      }
      await api.patch(`/emi/${assigningEmi._id}/bank-deduction`, payload);
      showSnackbar('Bank deduction details updated!');
      setAssignDialogOpen(false);
      setAssigningEmi(null);
      fetchBankDeductionSummary();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update', 'error');
    }
  };

  const handleSaveCCBill = async () => {
    try {
      const payload = {
        ...ccBillFormData,
        totalAmount: Number(ccBillFormData.totalAmount),
        minimumDue: Number(ccBillFormData.minimumDue || 0),
        creditLimit: Number(ccBillFormData.creditLimit || 0),
        interestCharged: Number(ccBillFormData.interestCharged || 0),
        feesAndCharges: Number(ccBillFormData.feesAndCharges || 0),
        newCharges: Number(ccBillFormData.newCharges || 0),
        previousBalance: Number(ccBillFormData.previousBalance || 0),
        paymentsReceived: Number(ccBillFormData.paymentsReceived || 0)
      };

      if (selectedCcBill) {
        await api.put(`/cc-bills/${selectedCcBill._id}`, payload);
        showSnackbar('Credit card bill updated!');
      } else {
        await api.post('/cc-bills', payload);
        showSnackbar('Credit card bill added!');
      }
      setCcBillDialogOpen(false);
      setSelectedCcBill(null);
      setCcBillFormData({
        cardProvider: '', cardLastFourDigits: '', cardHolderName: '', cardNetwork: '',
        statementDate: new Date().toISOString().split('T')[0], dueDate: '',
        totalAmount: '', minimumDue: '', creditLimit: '', interestCharged: '',
        feesAndCharges: '', newCharges: '', previousBalance: '', paymentsReceived: '', notes: '',
        spendingByCategory: []
      });
      fetchCCBills();
    } catch (err) {
      console.error('Error saving CC bill:', err);
      showSnackbar(err.response?.data?.message || 'Failed to save credit card bill', 'error');
    }
  };

  const handlePayCCBill = async () => {
    if (!selectedCcBill || !ccPayAmount) return;
    try {
      await api.post(
        `/cc-bills/${selectedCcBill._id}/pay`,
        { amount: Number(ccPayAmount), paymentMethod: ccPayMethod }
      );
      showSnackbar('Payment recorded!');
      setCcBillPayDialogOpen(false);
      setCcPayAmount('');
      setCcPayMethod('');
      setSelectedCcBill(null);
      fetchCCBills();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Payment failed', 'error');
    }
  };

  const handleDeleteCCBill = async (billId) => {
    if (!confirm('Delete this credit card bill?')) return;
    try {
      await api.delete(`/cc-bills/${billId}`);
      showSnackbar('Bill deleted');
      fetchCCBills();
    } catch (err) {
      showSnackbar('Failed to delete bill', 'error');
    }
  };

  const handleSyncCCBillsGmail = async () => {
    setCcBillSyncing(true);
    try {
      const res = await api.post('/cc-bills/sync-gmail', {});
      const data = res.data.data;
      showSnackbar(`Gmail sync: ${data.created} bills imported, ${data.skipped} skipped`);
      fetchCCBills();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Gmail sync failed', 'error');
    } finally {
      setCcBillSyncing(false);
    }
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: exportDateRange.startDate,
        endDate: exportDateRange.endDate
      });
      
      if (exportFormat === 'pdf') {
        // Generate PDF report
        const response = await api.get(`/emi/export/pdf?${params}`, {
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
        const response = await api.get(`/emi/export/excel?${params}`, {
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
        const response = await api.get(`/emi/export/csv?${params}`, {
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
      showSnackbar('Report exported successfully!');
    } catch (err) {
      console.error('Error exporting report:', err);
      showSnackbar(err.response?.data?.message || 'Failed to export report', 'error');
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
      showSnackbar(errorMsg, 'error');
      setSyncDialogOpen(false);
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const response = await api.post(
        '/emi/sync-statements',
        { maxResults: 50 }
      );

      setSyncDialogOpen(false);
      fetchAllData(); // Refresh data after sync
      
      showSnackbar(response.data.message || 'Statements synced successfully!');
    } catch (err) {
      console.error('Error syncing statements:', err);
      const errorMessage = err.response?.data?.message || 'Failed to sync statements. Please ensure Gmail is connected.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleRequestBalanceTransfer = async (offer, candidate) => {
    try {
      await api.post(
        '/emi/balance-transfer-request',
        {
          emiId: candidate.id || candidate._id,
          provider: offer.provider,
          offerRate: offer.rate,
          processingFee: offer.fee,
          currentRate: candidate.interestRate,
          remainingAmount: candidate.remainingAmount,
          remainingInstallments: candidate.remainingInstallments
        }
      );
      showSnackbar(`Offer request sent to ${offer.provider} for ${candidate.merchantName}. We will follow up.`);
    } catch (err) {
      console.error('Balance transfer request failed', err);
      showSnackbar(err.response?.data?.message || 'Could not send balance transfer request. Please try again.', 'error');
    }
  };

  const handleOneClickPrepay = async (emi) => {
    if (!emi) return;
    try {
      await api.post(
        '/emi/one-click-prepay',
        { emiId: emi.id || emi._id, amount: Math.min(emi.remainingAmount, emi.emiAmount) }
      );
      showSnackbar('Prepayment scheduled. Great move!');
      fetchAllData();
    } catch (err) {
      console.error('One-click prepay failed', err);
      showSnackbar(err.response?.data?.message || 'Could not schedule prepayment.', 'error');
    }
  };

  const handleSetupAutoSweep = async () => {
    try {
      await api.post(
        '/emi/auto-sweep',
        { sweepPercentage: 20 }
      );
      showSnackbar('Auto-sweep set to divert 20% surplus to highest-APR EMI.');
    } catch (err) {
      console.error('Auto-sweep setup failed', err);
      showSnackbar(err.response?.data?.message || 'Could not set auto-sweep.', 'error');
    }
  };

  const handleEnableLateFeeShield = async () => {
    try {
      await api.post(
        '/emi/late-fee-shield',
        { notifyDaysBefore: 5 }
      );
      showSnackbar('Late-fee shield armed: you will get alerts and auto-pay nudges 5 days before due.');
    } catch (err) {
      console.error('Late fee shield failed', err);
      showSnackbar(err.response?.data?.message || 'Could not enable late-fee shield.', 'error');
    }
  };

  // Manual EMI Dialog Handlers
  const handleOpenManualEMIDialog = () => {
    if (isNewEmiLocked) {
      showSnackbar('New EMI creation is locked (DTI > 50% or Hardship Mode on). Reduce EMI burden, increase income, or disable Hardship Mode to unlock.', 'warning');
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
      interestType: 'percentage',
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
      const response = await api.post(
        '/emi/manual',
        manualEMIData
      );

      showSnackbar('EMI created successfully!');
      handleCloseManualEMIDialog();
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error creating manual EMI:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create EMI';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setManualEMILoading(false);
    }
  };

  // Delete EMI Handlers
  const handleDeleteEMI = async () => {
    if (!selectedEMI) return;

    try {
      const deletedEmiId = selectedEMI.id;
      await api.delete(
        `/emi/${deletedEmiId}`
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

      showSnackbar('EMI deleted successfully!');
      setDeleteConfirmOpen(false);
      setSelectedEMI(null);
      fetchAllData(); // Refresh all data from backend
    } catch (err) {
      console.error('Error deleting EMI:', err);
      showSnackbar('Failed to delete EMI', 'error');
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
          // First, optimistically update the UI BEFORE the API call
          let updatedActiveEMIs = null;
          if (overview && overview.activeEMIs) {
            updatedActiveEMIs = overview.activeEMIs.map(emi => {
              if ((emi.id || emi.emiId || emi._id) === emiId) {
                const newPaidInstallments = (emi.paidInstallments || 0) + 1;
                const newRemainingInstallments = Math.max(0, emi.totalTenure - newPaidInstallments);
                const completionPercentage = Math.round((newPaidInstallments / emi.totalTenure) * 100);
                
                return {
                  ...emi,
                  paidInstallments: newPaidInstallments,
                  remainingInstallments: newRemainingInstallments,
                  completionPercentage: completionPercentage
                };
              }
              return emi;
            });

            setOverview({
              ...overview,
              activeEMIs: updatedActiveEMIs
            });
          }

          // Then make the API call
          await api.post(
            `/emi/${emiId}/mark-paid`,
            { installmentNumber, paidDate: new Date().toISOString() }
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
            message: 'Payment marked as paid! Card updated.',
            isSuccess: true,
            confirmAction: () => {
              setConfirmationDialog(prev => ({ ...prev, open: false }));
            }
          }));

          // Refresh data in background after a slight delay to ensure optimistic update is visible
          setTimeout(() => {
            fetchAllData();
          }, 500);
        } catch (err) {
          console.error('Error marking payment as paid:', err);
          
          // Revert optimistic update on error
          fetchAllData();
          
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
      <MainLayout title="EMI Tracker">
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
      </MainLayout>
    );
  }

  return (
    <MainLayout title="EMI Tracker">
      <PageTransition>
      <Box className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 } }}>
      {/* Enhanced Header with Gradient Background */}
      <Box 
        sx={{
          background: isDark 
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          p: { xs: 3, md: 4 },
          mb: 4,
          boxShadow: isDark 
            ? '0 20px 60px rgba(30, 27, 75, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 20px 60px rgba(102, 126, 234, 0.3)',
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
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
      >
        <DialogTitle>
          {selectedEMI ? `${selectedEMI.merchantName} — EMI Details` : 'EMI Details'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedEMI ? (
            <Grid container spacing={2} alignItems="flex-start">
              {/* Left column: Start / End / Next EMI Day first, then provider info */}
              <Grid size={{ xs: 12, md: 4 }}>
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
                <Typography variant="body1" gutterBottom>
                  {selectedEMI.interestType === 'flat' ? `${formatCurrency(selectedEMI.interestRate)} (Flat)` : selectedEMI.interestType === 'rupee_per_100' ? `${selectedEMI.interestRate} ₹/100/month` : `${selectedEMI.interestRate}% p.a.`}
                </Typography>

                <Typography variant="subtitle2">Repayment Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedEMI.repaymentType === 'ON_REQUEST' ? 'On Request (flexible)' : 'Monthly'}</Typography>
              </Grid>

              {/* Right column: tenure, completion, remaining, next due + chart */}
              <Grid size={{ xs: 12, md: 8 }}>
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
                <Grid size={12}>
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
              // Populate edit form with current EMI data
              setEditEMIData({
                merchantName: selectedEMI.merchantName || '',
                productDescription: selectedEMI.productDescription || '',
                emiAmount: selectedEMI.emiAmount || '',
                interestRate: selectedEMI.interestRate || '',
                totalTenure: selectedEMI.totalTenure || '',
                notes: selectedEMI.notes || '',
                tags: selectedEMI.tags || [],
                status: selectedEMI.status || 'active'
              });
              setEmiDetailOpen(false);
              // Delay opening edit dialog until detail dialog finishes closing
              setTimeout(() => setEditEMIDialogOpen(true), 150);
            }}
          >
            Edit
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (!selectedEMI) return;
              setEmiDetailOpen(false);
              setTimeout(() => setDeleteConfirmOpen(true), 150);
            }}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!selectedEMI) return;
              if (selectedEMI.repaymentType === 'ON_REQUEST') {
                setEmiDetailOpen(false);
                setTimeout(() => {
                  setConfirmationDialog({
                    open: true,
                    title: 'Cannot Mark as Paid',
                    message: 'This EMI is On-Request and cannot be marked as a regular installment.',
                    isError: true,
                    confirmAction: () => setConfirmationDialog(prev => ({ ...prev, open: false }))
                  });
                }, 150);
                return;
              }
              const nextInstallment = (selectedEMI.paidInstallments || 0) + 1;
              setEmiDetailOpen(false);
              setTimeout(() => {
                handleMarkAsPaid(
                  selectedEMI.id || selectedEMI.emiId || selectedEMI._id, 
                  nextInstallment,
                  {
                    amount: selectedEMI.emiAmount,
                    dueDate: selectedEMI.nextDueDate
                  }
                );
              }, 150);
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
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: confirmationDialog.isError ? 'error.main' : confirmationDialog.isSuccess ? 'success.main' : 'text.primary' }}>
          {confirmationDialog.isError ? <WarningIcon color="error" /> : confirmationDialog.isSuccess ? <CheckCircleIcon color="success" /> : <InfoIcon />}
          {confirmationDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography>{confirmationDialog.message}</Typography>
          {confirmationDialog.emiDetails && !confirmationDialog.isSuccess && !confirmationDialog.isError && (
            <Box sx={{ mt: 2, p: 2, bgcolor: surfaceMuted, borderRadius: 1 }}>
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

      {/* Early Payment Dialog */}
      <Dialog
        open={earlyPaymentDialogOpen}
        onClose={() => {
          setEarlyPaymentDialogOpen(false);
          setSelectedEMIForEarlyPayment(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ 
          background: isDark ? 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold'
        }}>
          💰 Early Payment Calculator
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedEMIForEarlyPayment && (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: surfaceMuted, borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Selected EMI</Typography>
                <Typography variant="h6" fontWeight="bold">{selectedEMIForEarlyPayment.merchantName}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedEMIForEarlyPayment.cardProvider}</Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Remaining</Typography>
                    <Typography variant="body1" fontWeight="bold">{formatCurrency(selectedEMIForEarlyPayment.remainingAmount)}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Interest Rate</Typography>
                    <Typography variant="body1" fontWeight="bold" color="error">
                      {selectedEMIForEarlyPayment.interestType === 'flat' 
                        ? `${formatCurrency(selectedEMIForEarlyPayment.interestRate)} Flat` 
                        : selectedEMIForEarlyPayment.interestType === 'rupee_per_100'
                        ? `${selectedEMIForEarlyPayment.interestRate} ₹/100/mo`
                        : `${selectedEMIForEarlyPayment.interestRate}%`}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <TextField
                label="Payment Amount"
                type="number"
                fullWidth
                value={earlyPaymentAmount}
                onChange={(e) => setEarlyPaymentAmount(e.target.value)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                }}
                helperText="Enter the amount you want to pay"
                sx={{ mb: 3 }}
              />

              {earlyPaymentAmount && parseFloat(earlyPaymentAmount) > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Impact Summary</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    <li>
                      <Typography variant="body2">
                        Months Reduced: ~{Math.floor(parseFloat(earlyPaymentAmount) / selectedEMIForEarlyPayment.emiAmount)}
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Interest Saved: {formatCurrency(Math.min(
                          debtAnalysis.calculateEarlyRepaymentSavings(selectedEMIForEarlyPayment), 
                          parseFloat(earlyPaymentAmount) * 0.15
                        ))}
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        New Completion: {Math.max(0, selectedEMIForEarlyPayment.remainingInstallments - Math.floor(parseFloat(earlyPaymentAmount) / selectedEMIForEarlyPayment.emiAmount))} months
                      </Typography>
                    </li>
                  </Box>
                </Alert>
              )}

              <Alert severity="info">
                <Typography variant="body2">
                  💡 <strong>Next Step:</strong> Contact {selectedEMIForEarlyPayment.cardProvider} to process this early payment. This calculator shows projected savings only.
                </Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => {
              setEarlyPaymentDialogOpen(false);
              setSelectedEMIForEarlyPayment(null);
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            disabled={!earlyPaymentAmount || parseFloat(earlyPaymentAmount) <= 0}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            onClick={() => {
              if (selectedEMIForEarlyPayment && earlyPaymentAmount) {
                const amount = parseFloat(earlyPaymentAmount);
                const savings = debtAnalysis.calculateEarlyRepaymentSavings(selectedEMIForEarlyPayment);
                const monthsReduced = Math.floor(amount / selectedEMIForEarlyPayment.emiAmount);
                
                setConfirmationDialog({
                  open: true,
                  title: '💰 Payment Impact',
                  message: 
                    `Payment: ${formatCurrency(amount)}\n` +
                    `EMI: ${selectedEMIForEarlyPayment.merchantName}\n\n` +
                    `✅ Months Reduced: ${monthsReduced}\n` +
                    `✅ Interest Saved: ${formatCurrency(Math.min(savings, amount * 0.15))}\n` +
                    `✅ New Completion: ${selectedEMIForEarlyPayment.remainingInstallments - monthsReduced} months\n\n` +
                    `Contact ${selectedEMIForEarlyPayment.cardProvider} to process this payment.`,
                  isSuccess: true,
                  confirmAction: () => {
                    setConfirmationDialog(prev => ({ ...prev, open: false }));
                  }
                });
                setEarlyPaymentDialogOpen(false);
              }
            }}
          >
            View Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Overview Cards */}
      {overview && (
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: isDark 
              ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(102, 126, 234, 0.15)',
            border: '2px solid',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#667eea',
            overflow: 'hidden',
            backdropFilter: isDark ? 'blur(20px)' : 'none',
            background: isDark 
              ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(30, 41, 59, 0.6) 100%)'
              : 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)'
          }}
        >
          <Box
            sx={{
              background: isDark
                ? 'linear-gradient(135deg, #312e81 0%, #4c1d95 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  <Box sx={{ mb: 3, p: 2.5, bgcolor: surfaceMuted, borderRadius: 3, border: `1px solid ${borderColor}` }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Active EMIs</Typography>
                        <Typography variant="h5" fontWeight={800} color="primary">{overview.overview?.totalActiveEMIs || 0}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Outstanding</Typography>
                        <Typography variant="h5" fontWeight={800} color="error">{formatCurrency(overview.overview?.totalOutstanding || 0)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Monthly Burden</Typography>
                        <Typography variant="h5" fontWeight={800} color="warning.main">{formatCurrency(overview.overview?.monthlyBurden || 0)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Paid</Typography>
                        <Typography variant="h5" fontWeight={800} color="success.main">{formatCurrency(overview.overview?.totalAmountPaid || 0)}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Quick Stats Row */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Card sx={{ bgcolor: isDark ? 'rgba(76, 175, 80, 0.12)' : '#e8f5e9', border: '2px solid', borderColor: isDark ? 'rgba(76, 175, 80, 0.4)' : '#4caf50', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="caption" fontWeight={700} color="#2e7d32">🛡️ EMERGENCY FUND</Typography>
                          <Typography variant="h6" fontWeight={900} color="#2e7d32">
                            {efPercentage.toFixed(0)}% funded
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(efPercentage, 100)}
                            sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: isDark ? 'rgba(76,175,80,0.2)' : '#c8e6c9', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {formatCurrency(currentEmergencyFund)} / {formatCurrency(emergencyFundGoal)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Card sx={{ bgcolor: isDark ? 'rgba(33, 150, 243, 0.12)' : '#e3f2fd', border: '2px solid', borderColor: isDark ? 'rgba(33, 150, 243, 0.4)' : '#2196f3', borderRadius: 3 }}>
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
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Card sx={{ bgcolor: isDark ? 'rgba(156, 39, 176, 0.12)' : '#f3e5f5', border: '2px solid', borderColor: isDark ? 'rgba(156, 39, 176, 0.4)' : '#9c27b0', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="caption" fontWeight={700} color="#6a1b9a">🎉 DEBT-FREE PROGRESS</Typography>
                          <Typography variant="h6" fontWeight={900} color="#6a1b9a">
                            {totalOriginal > 0 ? `${debtFreeProgress.toFixed(1)}%` : 'N/A'}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(debtFreeProgress, 100)}
                            sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: isDark ? 'rgba(156,39,176,0.2)' : '#e1bee7', '& .MuiLinearProgress-bar': { bgcolor: '#9c27b0' } }}
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
                      onClick={() => setActiveTab(4)}
                    >
                      View Upcoming
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      onClick={() => setActiveTab(1)}
                    >
                      Debt Freedom Plan
                    </Button>
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 7 }}>
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
                                <TableRow sx={{ bgcolor: surfaceMuted }}>
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

                    <Grid size={{ xs: 12, md: 5 }}>
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

      {/* Side Navigation + Content Layout */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Side Navigation Panel */}
        <Box 
          sx={{ 
            width: 200,
            minWidth: 200,
            flexShrink: 0,
            position: 'sticky',
            top: 80,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            display: { xs: 'none', lg: 'block' },
            '&::-webkit-scrollbar': { width: 3 },
            '&::-webkit-scrollbar-thumb': { background: isDark ? '#334155' : '#cbd5e1', borderRadius: 2 }
          }}
        >
          <Box 
            sx={{
              bgcolor: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              borderRadius: 3,
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
              p: 1,
            }}
          >
            {[
              { label: 'Overview', icon: <AssessmentIcon sx={{ fontSize: 18 }} /> },
              { label: 'Debt Freedom', icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
              { label: 'Monthly Trends', icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
              { label: 'Reports', icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
              { label: 'Upcoming', icon: <CalendarIcon sx={{ fontSize: 18 }} /> },
              { label: 'Active EMIs', icon: <CreditCardIcon sx={{ fontSize: 18 }} /> },
              { label: 'Completed', icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
              { label: 'Loans Given', icon: <PaymentIcon sx={{ fontSize: 18 }} /> },
              { label: 'Personal Loans', icon: <MoneyIcon sx={{ fontSize: 18 }} /> },
              { label: 'Credit Cards', icon: <CreditCardIcon sx={{ fontSize: 18 }} /> },
              { label: 'Bank & Balance', icon: <AccountBalanceIcon sx={{ fontSize: 18 }} /> },
            ].map((item, idx) => (
              <Box
                key={idx}
                onClick={() => setActiveTab(idx)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1.2,
                  mb: 0.3,
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontWeight: activeTab === idx ? 700 : 500,
                  fontSize: '0.82rem',
                  color: activeTab === idx 
                    ? (isDark ? '#a78bfa' : '#667eea') 
                    : (isDark ? 'rgba(255,255,255,0.55)' : 'text.secondary'),
                  bgcolor: activeTab === idx 
                    ? (isDark ? 'rgba(167,139,250,0.1)' : 'rgba(102,126,234,0.08)') 
                    : 'transparent',
                  borderLeft: activeTab === idx ? '3px solid' : '3px solid transparent',
                  borderColor: activeTab === idx 
                    ? (isDark ? '#a78bfa' : '#667eea') 
                    : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(167,139,250,0.06)' : 'rgba(102,126,234,0.05)',
                    color: isDark ? '#818cf8' : '#667eea',
                  }
                }}
              >
                {item.icon}
                {item.label}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Mobile horizontal tabs (shown only on small/medium screens) */}
        <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 3, width: '100%' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              bgcolor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
              borderRadius: 3,
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              minHeight: 44,
              '& .MuiTab-root': { fontWeight: 600, fontSize: '0.8rem', textTransform: 'none', minHeight: 44, py: 0.5, px: 1.5 },
              '& .Mui-selected': { fontWeight: 700, color: isDark ? '#a78bfa !important' : '#667eea !important' },
              '& .MuiTabs-indicator': { height: 2, background: isDark ? '#a78bfa' : '#667eea' }
            }}
          >
            <Tab label="Overview" />
            <Tab label="Debt Plan" />
            <Tab label="Trends" />
            <Tab label="Reports" />
            <Tab label="Upcoming" />
            <Tab label="Active" />
            <Tab label="Completed" />
            <Tab label="Given" />
            <Tab label="Personal" />
            <Tab label="CC Bills" />
            <Tab label="Bank" />
          </Tabs>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

      {/* Smart Insights Section — below sticky tabs */}
      {insights.length > 0 && (
        <Box mb={4}>
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
              pb: 1.5,
              borderBottom: '2px solid',
              borderImage: 'linear-gradient(to right, #667eea, #764ba2) 1'
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <InfoIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Typography 
              variant="h6" 
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Smart Insights
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {insights.map((insight, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <Alert
                  severity={getSeverityColor(insight.severity)}
                  icon={<InfoIcon sx={{ fontSize: 20 }} />}
                  action={
                    insight.action && (
                      <Chip 
                        label={insight.action} 
                        size="small"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    )
                  }
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    py: 0.5,
                    '& .MuiAlert-message': { py: 0.5 }
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.25 }}>
                    {insight.title}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{insight.description}</Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tab Panels */}
      {activeTab === 0 && chartData && (
        <Grid container spacing={3} direction="column">
          {/* Pie Chart - Distribution by Provider */}
          <Grid size={12}>
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
                        border: 'none',
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        color: isDark ? '#f1f5f9' : '#333'
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
              <EMIMonthlyTrends monthlyData={upcomingPayments.monthlyBreakdown} />
            </Grid>
          )}
        </Grid>
      )}

      {/* Reports Tab */}
      {/* Monthly Trends Tab */}
      {activeTab === 2 && monthlyTrends && (
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ 
                bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#d4f4dd',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(76,175,80,0.3)' : '#a8e6b8'}`
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

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ 
                bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#fde8e8',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#f8b4b4'}`
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

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ 
                bgcolor: isDark ? 'rgba(139,92,246,0.12)' : '#f0e6f6',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : '#d4b5e8'}`
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

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ 
                bgcolor: isDark ? 'rgba(33,150,243,0.12)' : '#e3f2fd',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(33,150,243,0.3)' : '#90caf9'}`
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
            bgcolor: tableHeaderBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Month-over-Month Change
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Comparing {monthlyTrends.monthlyTrends[monthlyTrends.monthlyTrends.length - 1]?.monthName} vs {monthlyTrends.monthlyTrends[monthlyTrends.monthlyTrends.length - 2]?.monthName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
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
            border: `1px solid ${borderColor}`,
            bgcolor: surface,
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
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      color: isDark ? '#f1f5f9' : '#333'
                    }}
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
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ 
                bgcolor: tableHeaderBg,
                borderRadius: 2,
                border: `1px solid ${borderColor}`
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

            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ 
                bgcolor: tableHeaderBg,
                borderRadius: 2,
                border: `1px solid ${borderColor}`
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

            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ 
                bgcolor: tableHeaderBg,
                borderRadius: 2,
                border: `1px solid ${borderColor}`
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
            bgcolor: surface,
            border: `1px solid ${borderColor}`
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Monthly Breakdown Details
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: tableHeaderBg }}>
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
                        sx={{ '&:hover': { bgcolor: surfaceMuted } }}
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
      {activeTab === 3 && chartData && (
        <Grid container spacing={3} direction="column">
          {/* Bar Chart - Monthly EMI Burden */}
          <Grid size={12}>
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
                      tick={{ fill: isDark ? '#94a3b8' : '#666' }}
                    />
                    <YAxis tick={{ fill: isDark ? '#94a3b8' : '#666' }} />
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: 12, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: 'none',
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        color: isDark ? '#f1f5f9' : '#333'
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
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
      {activeTab === 4 && upcomingPayments && (
        <Box>
          {/* Time Period Selector */}
          <Card elevation={isDark ? 0 : 2} sx={{ mb: 3, p: 2, bgcolor: surface, border: `1px solid ${borderColor}` }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  View Upcoming Payments For:
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 9 }}>
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
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <Card
                  elevation={isDark ? 0 : 3}
                  sx={{
                    transition: 'all 0.3s ease',
                    bgcolor: surface,
                    border: `1px solid ${borderColor}`,
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : 8,
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
            <Card elevation={isDark ? 0 : 2} sx={{ p: 4, textAlign: 'center', bgcolor: surface, border: `1px solid ${borderColor}` }}>
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
      {activeTab === 5 && overview && (
        <Box>
          {/* EMI Distribution Chart */}
          {overview.activeEMIs && overview.activeEMIs.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={isDark ? 0 : 3} sx={{ bgcolor: surface, border: `1px solid ${borderColor}`, borderRadius: 3, p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>📊 EMI Distribution by Provider</Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const providerMap = {};
                          overview.activeEMIs.forEach(emi => {
                            const key = emi.cardProvider || 'Other';
                            providerMap[key] = (providerMap[key] || 0) + (emi.emiAmount || 0);
                          });
                          return Object.entries(providerMap).map(([name, value]) => ({ name, value }));
                        })()}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                        paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {Object.keys(
                          overview.activeEMIs.reduce((acc, e) => { acc[e.cardProvider || 'Other'] = 1; return acc; }, {})
                        ).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={isDark ? 0 : 3} sx={{ bgcolor: surface, border: `1px solid ${borderColor}`, borderRadius: 3, p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>📈 EMI Amount Comparison</Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={overview.activeEMIs.map(emi => ({
                      name: emi.merchantName?.length > 12 ? emi.merchantName.substring(0, 12) + '...' : emi.merchantName,
                      emi: emi.emiAmount || 0,
                      remaining: emi.remainingAmount || 0
                    }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="emi" name="Monthly EMI" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="remaining" name="Remaining" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>
            </Grid>
          )}
          <Grid container spacing={3}>
          {(overview.activeEMIs || []).map((emi) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={emi.id}>
              <Card 
                elevation={isDark ? 0 : 3}
                onClick={() => {
                  // Open EMI detail when card is clicked
                  setSelectedEMI(emi);
                  setEmiDetailOpen(true);
                }}
                sx={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  bgcolor: surface,
                  border: `1px solid ${borderColor}`,
                  '&:hover': {
                    transform: 'scale(1.03)',
                    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : 8,
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
                        {emi.interestType === 'flat' ? `${formatCurrency(emi.interestRate)} Flat Interest` : emi.interestType === 'rupee_per_100' ? `${emi.interestRate} ₹/100/mo` : `${emi.interestRate}% Interest`}
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
                        {emi.daysElapsed} days @ {emi.interestType === 'rupee_per_100' ? `${emi.interestRate} ₹/100/mo` : `${emi.interestRate}% p.a.`}
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
                    <Box mt={2} p={1} bgcolor={surfaceMuted} borderRadius={1}>
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
        </Box>
      )}

      {/* Tab 5: Completed EMIs */}
      {activeTab === 6 && overview && (
        <>
          {overview.completedEMIs && overview.completedEMIs.length === 0 ? (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 8,
                px: 3,
                background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                borderRadius: 4,
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)'
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
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={emi.id}>
                  <Card 
                    elevation={isDark ? 0 : 3}
                    sx={{
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      bgcolor: surface,
                      border: '2px solid',
                      borderColor: 'success.main',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : 8,
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
                          {emi.interestType === 'flat' ? `${formatCurrency(emi.interestRate)} Flat Interest` : emi.interestType === 'rupee_per_100' ? `${emi.interestRate} ₹/100/mo` : `${emi.interestRate}% Interest`}
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
                        <Box mt={2} p={1} bgcolor={surfaceMuted} borderRadius={1}>
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
      {activeTab === 7 && (
        <Box>
          {/* Summary Cards */}
          {loansGivenSummary && (
            <Grid container spacing={3} mb={4}>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Lent</Typography>
                    <Typography variant="h4">₹{loansGivenSummary.totalLent.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Outstanding</Typography>
                    <Typography variant="h4">₹{loansGivenSummary.totalOutstanding.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Interest Earned</Typography>
                    <Typography variant="h4">₹{(loansGivenSummary.totalInterest || 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Repaid</Typography>
                    <Typography variant="h4">₹{loansGivenSummary.totalRepaid.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', color: '#333' }}>
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
                  interestType: 'none',
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
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={loan._id}>
                  <Card elevation={isDark ? 0 : 3} sx={{ bgcolor: surface, border: `1px solid ${borderColor}`, '&:hover': { boxShadow: isDark ? '0 6px 20px rgba(0,0,0,0.4)' : 6 } }}>
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

                      {/* Interest info */}
                      {loan.hasInterest && loan.interestType !== 'none' && (loan.currentInterest > 0 || loan.interestRate > 0) && (
                        <Box mb={2} sx={{
                          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                          borderRadius: 2,
                          p: 2,
                          border: '1px solid #a5d6a7'
                        }}>
                          <Typography variant="body2" color="success.dark" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            💰 Interest Earning
                            {loan.interestType === 'rupee_per_100' && (
                              <Chip label={`${loan.interestRate} ₹/100/mo`} size="small" sx={{ ml: 1, bgcolor: '#2e7d32', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
                            )}
                            {loan.interestType === 'percentage' && (
                              <Chip label={`${loan.interestRate}% p.a.`} size="small" sx={{ ml: 1 }} />
                            )}
                            {loan.interestType === 'flat' && (
                              <Chip label={`₹${loan.interestRate.toLocaleString()} Flat`} size="small" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="h6" color="success.dark" fontWeight="bold">
                            + ₹{(loan.currentInterest || 0).toLocaleString()}
                          </Typography>
                          {loan.interestType === 'rupee_per_100' && loan.monthlyInterest > 0 && (
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                              ₹{loan.monthlyInterest.toLocaleString()}/month • {loan.annualEquivalentRate}% p.a. equivalent
                            </Typography>
                          )}
                        </Box>
                      )}

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
                          {loan.hasInterest && loan.currentInterest > 0 && (
                            <Typography component="span" variant="caption" color="success.main" sx={{ ml: 1 }}>
                              (incl. ₹{(loan.currentInterest || 0).toLocaleString()} interest)
                            </Typography>
                          )}
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
      {activeTab === 1 && (
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
          ) : !debtAnalysisData ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ ml: 3 }}>
                Calculating your debt analysis...
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
            {/* Debt Health Status Card */}
            <Grid size={12}>
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
                    <Grid size={{ xs: 12, sm: 4 }}>
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
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Monthly Income</Typography>
                        <Typography variant="h3" fontWeight="bold">{formatCurrency(debtAnalysis.monthlyIncome)}</Typography>
                        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>After EMI: {formatCurrency(debtAnalysis.availableIncome)}</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
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
                              <Grid size={{ xs: 12, md: 4 }} key={offer.provider}>
                                <Box sx={{ p: 2, border: `1px solid ${borderColor}`, borderRadius: 2, bgcolor: surface, height: '100%' }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                          contentStyle={{ borderRadius: 8, border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#333' }}
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                        bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
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
                  <Box sx={{ bgcolor: surfaceMuted, p: 2, borderRadius: 2, mb: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        🤖 Smart Goal Calculation
                      </Typography>
                      <Typography variant="body2">
                        Your emergency fund goal is automatically calculated as <strong>6 months</strong> of your total monthly obligations 
                        (EMI burden + {monthlyExpenses > 0 ? 'actual expenses from your transactions' : 'estimated living expenses'}). 
                        Goal updates when your financial situation changes.
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Current calculation: ₹{Math.round((overview?.overview?.monthlyBurden || 0) + (monthlyExpenses > 0 ? monthlyExpenses : ((userProfile?.monthlyIncome || 0) * 0.30))).toLocaleString()} × 6 months = ₹{emergencyFundGoal.toLocaleString()}
                      </Typography>
                      {monthlyExpenses > 0 && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'success.main' }}>
                          ✅ Using actual expense data from your last 30 days
                        </Typography>
                      )}
                    </Alert>
                    {emergencyFundMessage && (
                      <Alert severity={emergencyFundMessage.type} sx={{ mb: 2 }}>
                        <Typography variant="body2">{emergencyFundMessage.text}</Typography>
                      </Alert>
                    )}
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, md: 6 }}>
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
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Emergency Fund Goal (Auto-Calculated)"
                          type="number"
                          fullWidth
                          value={emergencyFundGoal}
                          onChange={(e) => setEmergencyFundGoal(parseFloat(e.target.value) || 0)}
                          InputProps={{ startAdornment: '₹' }}
                          size="small"
                          helperText="Auto-adjusts based on your EMIs & expenses"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
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
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {lastContribution
                            ? `Last add: ₹${(lastContribution.amount || 0).toLocaleString()} on ${new Date(lastContribution.date).toLocaleDateString()}`
                            : 'No contributions recorded yet.'}
                        </Typography>
                      </Grid>
                      <Grid size={12}>
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
            <Grid size={12}>
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
                  <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', bgcolor: surface }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: surfaceMuted }}>
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
                                  setEarlyPaymentDialogOpen(true);
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>🚀 Your Action Plan</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(33,150,243,0.12)' : '#e3f2fd', borderRadius: 2, borderLeft: '4px solid #2196f3' }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">Step 1: Build Emergency Fund</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Current: {formatCurrency(currentEmergencyFund)} | Goal: {formatCurrency(emergencyFundGoal)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        💡 Save {formatCurrency(emergencyFundGoal - currentEmergencyFund)} more. Target: {((emergencyFundGoal - currentEmergencyFund) / (debtAnalysis.availableIncome * 0.3)).toFixed(1)} months at 30% savings rate.
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(156,39,176,0.12)' : '#f3e5f5', borderRadius: 2, borderLeft: '4px solid #9c27b0' }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#9c27b0' }}>Step 2: Extra EMI Payments</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Available for extra payments: {formatCurrency(debtAnalysis.recommendedMonthlyExtra)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        💡 Paying an extra {formatCurrency(debtAnalysis.recommendedMonthlyExtra)} monthly could reduce your debt by {Math.round(debtAnalysis.avgMonthsRemaining * 0.3)} months!
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#e8f5e9', borderRadius: 2, borderLeft: '4px solid #4caf50' }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="success.main">Step 3: Follow {repaymentStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'} Method</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Focus on: {(repaymentStrategy === 'avalanche' ? debtAnalysis.sortedEMIsAvalanche : debtAnalysis.sortedEMIsSnowball)[0]?.merchantName}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        💡 Potential savings: {formatCurrency(debtAnalysis.calculateEarlyRepaymentSavings((repaymentStrategy === 'avalanche' ? debtAnalysis.sortedEMIsAvalanche : debtAnalysis.sortedEMIsSnowball)[0]))}
                      </Typography>
                    </Box>

                    {debtAnalysis.debtToIncomeRatio > 40 && (
                      <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(244,67,54,0.12)' : '#ffebee', borderRadius: 2, borderLeft: '4px solid #f44336' }}>
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
            <Grid size={12}>
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
                        <Grid size={{ xs: 12, md: 4 }}>
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

                        <Grid size={{ xs: 12, md: 8 }}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Box sx={{ p: 2, bgcolor: surfaceMuted, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold">Baseline</Typography>
                                <Typography variant="h4" fontWeight="bold">{Math.round(baseProjection.months)} mo</Typography>
                                <Typography variant="body2" color="text.secondary">Target: {baseProjection.targetDate}</Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#e8f5e9', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(76,175,80,0.3)' : '#c8e6c9'}` }}>
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
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(255,193,7,0.12)' : '#fff8e1', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(255,152,0,0.3)' : '#ffe0b2'}` }}>
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
            <Grid size={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>💳 Monthly Commitments Breakdown</Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 3, bgcolor: surfaceMuted, borderRadius: 2 }}>
                        <Typography variant="h2" fontWeight="bold" color="primary">
                          {formatCurrency(debtAnalysis.monthlyBurden)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Monthly EMI Burden</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 3, bgcolor: surfaceMuted, borderRadius: 2 }}>
                        <Typography variant="h2" fontWeight="bold" color="success.main">
                          {formatCurrency(debtAnalysis.availableIncome)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Available After EMIs</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 3, bgcolor: surfaceMuted, borderRadius: 2 }}>
                        <Typography variant="h2" fontWeight="bold" color="warning.main">
                          {formatCurrency(debtAnalysis.recommendedMonthlyExtra)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Recommended Extra Payment</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, p: 3, bgcolor: isDark ? 'rgba(33,150,243,0.12)' : '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>💡 Smart Spending Tips to Close EMIs Faster:</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Cut unnecessary subscriptions</strong> - Review all monthly subscriptions</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Cook at home more</strong> - Save 30-40% on food expenses</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Use public transport</strong> - Reduce fuel and maintenance costs</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>✅ <strong>Bundle insurance policies</strong> - Get discounts on multiple policies</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={12}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>
                    💰 Prepayment Impact Calculator
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    See how extra payments can reduce your EMI burden and save interest
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
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
                    <Grid size={{ xs: 12, md: 4 }}>
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
                    <Grid size={{ xs: 12, md: 4 }} display="flex" alignItems="center">
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
                            
                            showSnackbar(
                              `💰 Prepayment Impact: Extra Payment ₹${amount.toLocaleString()} on ${selectedEMIForEarlyPayment.merchantName} — ` +
                              `Months Reduced: ${monthsReduced}, ` +
                              `Interest Saved: ₹${Math.min(savings, amount * 0.15).toLocaleString()}, ` +
                              `New Completion: ${selectedEMIForEarlyPayment.remainingInstallments - monthsReduced} months. ` +
                              `Tip: Contact ${selectedEMIForEarlyPayment.cardProvider} to make this payment!`,
                              'info'
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
            <Grid size={12}>
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
                            bgcolor: isUrgent ? '#ffebee' : isComingSoon ? '#fff3e0' : 'background.default',
                            border: '1px solid',
                            borderColor: isUrgent ? '#f44336' : isComingSoon ? '#ff9800' : 'divider',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateX(8px)'
                            }
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 4 }}>
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
                            <Grid size={{ xs: 12, sm: 3 }}>
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
                            <Grid size={{ xs: 12, sm: 2 }}>
                              <Typography variant="body2" color="text.secondary">Amount</Typography>
                              <Typography variant="h6" color="primary">
                                {formatCurrency(emi.emiAmount)}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
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
            <Grid size={12}>
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
                        <Grid size={{ xs: 12, md: 6 }} key={emi.id}>
                          <Box sx={{ 
                            p: 2, 
                            borderRadius: 2, 
                            bgcolor: surfaceMuted,
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
                                bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
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
                              <Grid size={4}>
                                <Typography variant="caption" color="text.secondary">Paid</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {emi.paidInstallments}/{emi.totalTenure}
                                </Typography>
                              </Grid>
                              <Grid size={4}>
                                <Typography variant="caption" color="text.secondary">Remaining</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatCurrency(emi.remainingAmount)}
                                </Typography>
                              </Grid>
                              <Grid size={4}>
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
            <Grid size={12}>
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        bgcolor: debtAnalysis.emergencyFundPercentage < 50 ? '#e3f2fd' : 'background.default',
                        border: '2px solid',
                        borderColor: debtAnalysis.emergencyFundPercentage < 50 ? '#2196f3' : 'divider'
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        bgcolor: isDark ? 'rgba(255,152,0,0.12)' : '#fff3e0',
                        border: `2px solid ${isDark ? 'rgba(255,152,0,0.5)' : '#ff9800'}`
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#e8f5e9',
                        border: `2px solid ${isDark ? 'rgba(76,175,80,0.5)' : '#4caf50'}`
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
                  
                  <Box mt={3} p={2} bgcolor="background.default" borderRadius={2}>
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

            {/* Slim & Sleek Debt-Free Date Projector */}
            <Grid size={12}>
              <Card elevation={0} sx={{
                ...chartCardHoverEffect,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ pb: 3 }}>
                  {/* Compact Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        📅 Debt-Free Date Projector
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        Adjust slider to see your path to freedom
                      </Typography>
                    </Box>
                    <Chip 
                      label={`₹${customExtraPayment.toLocaleString()}/mo extra`}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.25)', 
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        height: 36
                      }} 
                    />
                  </Box>

                  {/* Compact Slider */}
                  <Box sx={{ px: 2, mb: 3 }}>
                    <input
                      type="range"
                      min="0"
                      max={Math.round(debtAnalysis.availableIncome * 0.5)}
                      step="500"
                      value={customExtraPayment}
                      onChange={(e) => setCustomExtraPayment(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: `linear-gradient(to right, #4caf50 0%, #4caf50 ${(customExtraPayment / (Math.round(debtAnalysis.availableIncome * 0.5))) * 100}%, rgba(255,255,255,0.3) ${(customExtraPayment / (Math.round(debtAnalysis.availableIncome * 0.5))) * 100}%, rgba(255,255,255,0.3) 100%)`,
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>₹0</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>₹{Math.round(debtAnalysis.availableIncome * 0.5).toLocaleString()}</Typography>
                    </Box>
                  </Box>
                  
                  {/* Compact 3-Column Comparison */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center'
                      }}>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>🐌 Current Pace</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const years = Math.floor(longestEMI / 12);
                            const remainingMonths = longestEMI % 12;
                            return years > 0 ? `${years}y ${remainingMonths}m` : `${longestEMI}mo`;
                          })()}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                          {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const date = new Date();
                            date.setMonth(date.getMonth() + longestEMI);
                            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          })()}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'rgba(76,175,80,0.25)',
                        border: `2px solid ${isDark ? 'rgba(76,175,80,0.5)' : '#4caf50'}`,
                        textAlign: 'center',
                        position: 'relative'
                      }}>
                        {customExtraPayment > 0 && (
                          <Chip 
                            label="ACTIVE"
                            size="small"
                            sx={{ 
                              position: 'absolute',
                              top: -8,
                              right: 8,
                              bgcolor: '#4caf50',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.65rem',
                              height: 18
                            }}
                          />
                        )}
                        <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>💪 Your Plan</Typography>
                        <Typography variant="h4" fontWeight="bold" color="#4caf50">
                          {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                            const reduction = customExtraPayment > 0 ? Math.floor((customExtraPayment / avgEMI) * 0.7) : 0;
                            const acceleratedMonths = Math.max(1, longestEMI - reduction);
                            const years = Math.floor(acceleratedMonths / 12);
                            const remainingMonths = acceleratedMonths % 12;
                            return years > 0 ? `${years}y ${remainingMonths}m` : `${acceleratedMonths}mo`;
                          })()}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                          Save {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                            const reduction = customExtraPayment > 0 ? Math.floor((customExtraPayment / avgEMI) * 0.7) : 0;
                            return reduction;
                          })()} months
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center'
                      }}>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>🚀 Max Push</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {(() => {
                            const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                            const aggressiveExtra = Math.round(debtAnalysis.availableIncome * 0.5);
                            const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                            const reduction = Math.floor((aggressiveExtra / avgEMI) * 0.7);
                            const acceleratedMonths = Math.max(1, longestEMI - reduction);
                            const years = Math.floor(acceleratedMonths / 12);
                            const remainingMonths = acceleratedMonths % 12;
                            return years > 0 ? `${years}y ${remainingMonths}m` : `${acceleratedMonths}mo`;
                          })()}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                          ₹{Math.round(debtAnalysis.availableIncome * 0.5).toLocaleString()}/mo
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Compact Visual Chart */}
                  <Box sx={{ mt: 3, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'Current',
                            months: overview.activeEMIs.reduce((max, emi) => 
                              emi.remainingInstallments > max ? emi.remainingInstallments : max, 0),
                            savings: 0
                          },
                          {
                            name: 'Your Plan',
                            months: (() => {
                              const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                                emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                              const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                              const reduction = customExtraPayment > 0 ? Math.floor((customExtraPayment / avgEMI) * 0.7) : 0;
                              return Math.max(1, longestEMI - reduction);
                            })(),
                            savings: overview.activeEMIs.reduce((sum, emi) => 
                              sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0) * 
                              (customExtraPayment > 0 ? 0.15 : 0)
                          },
                          {
                            name: 'Max Push',
                            months: (() => {
                              const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                                emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                              const aggressiveExtra = Math.round(debtAnalysis.availableIncome * 0.5);
                              const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                              const reduction = Math.floor((aggressiveExtra / avgEMI) * 0.7);
                              return Math.max(1, longestEMI - reduction);
                            })(),
                            savings: overview.activeEMIs.reduce((sum, emi) => 
                              sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0) * 0.25
                          }
                        ]}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                        <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#333', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f1f5f9' }}
                          formatter={(value, name) => [
                            name === 'months' ? `${value} months` : formatCurrency(value),
                            name === 'months' ? 'Time' : 'Interest Saved'
                          ]}
                        />
                        <Bar dataKey="months" fill="#42a5f5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Compact Stats Row */}
                  <Box sx={{ 
                    mt: 3, 
                    display: 'flex', 
                    gap: 2, 
                    flexWrap: 'wrap',
                    justifyContent: 'space-around',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    p: 2,
                    borderRadius: 2
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Interest Saved</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(
                          overview.activeEMIs.reduce((sum, emi) => 
                            sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0) * 
                            (customExtraPayment > 0 ? 0.15 : 0)
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Months Saved</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {(() => {
                          const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                            emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                          const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                          const reduction = customExtraPayment > 0 ? Math.floor((customExtraPayment / avgEMI) * 0.7) : 0;
                          return reduction;
                        })()}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Freedom Date</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {(() => {
                          const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                            emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                          const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                          const reduction = customExtraPayment > 0 ? Math.floor((customExtraPayment / avgEMI) * 0.7) : 0;
                          const acceleratedMonths = Math.max(1, longestEMI - reduction);
                          const date = new Date();
                          date.setMonth(date.getMonth() + acceleratedMonths);
                          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        })()}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Compact Action Tip */}
                  {customExtraPayment > 0 && (
                    <Alert 
                      severity="success" 
                      sx={{ 
                        mt: 2,
                        py: 1,
                        bgcolor: 'rgba(76,175,80,0.2)', 
                        color: 'white',
                        '& .MuiAlert-icon': { color: '#4caf50' },
                        '& .MuiAlert-message': { fontSize: '0.875rem' }
                      }}
                    >
                      💡 Add ₹{customExtraPayment.toLocaleString()}/mo to your highest-interest EMI to save {(() => {
                        const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                          emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                        const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                        const reduction = customExtraPayment > 0 ? Math.floor((customExtraPayment / avgEMI) * 0.7) : 0;
                        return reduction;
                      })()} months!
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sleek Interactive Debt Payoff Simulator */}
            <Grid size={12}>
              <Card elevation={0} sx={{
                ...chartCardHoverEffect,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}>
                <CardContent sx={{ pb: 3 }}>
                  {/* Compact Header with Value Display */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🎮 Debt Payoff Simulator
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        See real-time impact of extra payments
                      </Typography>
                    </Box>
                    <Chip 
                      label={`₹${(earlyPaymentAmount || 0).toLocaleString()}/mo`}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.25)', 
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        height: 36
                      }} 
                    />
                  </Box>

                  {/* Slider with Linear Progress Style */}
                  <Box sx={{ px: 2, mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                      Adjust extra monthly payment
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={((earlyPaymentAmount || 0) / 10000) * 100}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        bgcolor: 'rgba(255,255,255,0.3)',
                        mb: 1,
                        cursor: 'pointer',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)',
                          borderRadius: 4
                        }
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        const value = Math.round(percentage * 10000 / 500) * 500;
                        setEarlyPaymentAmount(Math.min(10000, Math.max(0, value)));
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="500"
                      value={earlyPaymentAmount || 0}
                      onChange={(e) => setEarlyPaymentAmount(e.target.value)}
                      style={{
                        width: '100%',
                        height: '4px',
                        opacity: 0,
                        position: 'absolute',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>₹0</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 'bold' }}>
                        {Math.round(((earlyPaymentAmount || 0) / 10000) * 100)}% Complete
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>₹10,000</Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    {/* Chart Section */}
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Box sx={{ 
                        bgcolor: 'rgba(255,255,255,0.1)', 
                        borderRadius: 2, 
                        p: 2,
                        height: 240
                      }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={[
                              { 
                                name: 'Current', 
                                months: overview.activeEMIs.reduce((max, emi) => 
                                  emi.remainingInstallments > max ? emi.remainingInstallments : max, 0)
                              },
                              { 
                                name: 'Accelerated', 
                                months: (() => {
                                  const longest = overview.activeEMIs.reduce((max, emi) => 
                                    emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                                  const extra = parseFloat(earlyPaymentAmount) || 0;
                                  const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                                  const reduction = extra > 0 ? Math.floor((extra / avgEMI) * 0.8) : 0;
                                  return Math.max(6, longest - reduction);
                                })()
                              }
                            ]}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#333', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f1f5f9' }}
                              formatter={(value) => [`${value} months`, 'Duration']}
                            />
                            <Bar dataKey="months" radius={[6, 6, 0, 0]}>
                              <Cell fill="#ff6b6b" />
                              <Cell fill="#51cf66" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>

                    {/* Stats Cards */}
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Time Saved */}
                        <Box sx={{ 
                          bgcolor: 'rgba(255,255,255,0.15)', 
                          borderRadius: 2, 
                          p: 2,
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
                            ⏱️ Time Saved
                          </Typography>
                          <Typography variant="h4" fontWeight="bold">
                            {(() => {
                              const extra = parseFloat(earlyPaymentAmount) || 0;
                              const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                              const monthsSaved = extra > 0 ? Math.floor((extra / avgEMI) * 0.8) : 0;
                              return monthsSaved;
                            })()} mo
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                            Faster payoff
                          </Typography>
                        </Box>

                        {/* Interest Saved */}
                        <Box sx={{ 
                          bgcolor: 'rgba(76, 175, 80, 0.25)', 
                          borderRadius: 2, 
                          p: 2,
                          border: '1px solid rgba(76, 175, 80, 0.5)',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                            💰 Interest Saved
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="#4caf50">
                            {formatCurrency((() => {
                              const extra = parseFloat(earlyPaymentAmount) || 0;
                              const totalInterest = overview.activeEMIs.reduce((sum, emi) => 
                                sum + (emi.emiAmount * emi.remainingInstallments - emi.remainingAmount), 0);
                              return extra > 0 ? Math.floor(totalInterest * (extra / 10000) * 0.15) : 0;
                            })())}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                            Money in pocket
                          </Typography>
                        </Box>

                        {/* New Payoff Date */}
                        <Box sx={{ 
                          bgcolor: 'rgba(255,255,255,0.15)', 
                          borderRadius: 2, 
                          p: 2,
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
                            🎯 Freedom Date
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {(() => {
                              const longest = overview.activeEMIs.reduce((max, emi) => 
                                emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                              const extra = parseFloat(earlyPaymentAmount) || 0;
                              const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                              const reduction = extra > 0 ? Math.floor((extra / avgEMI) * 0.8) : 0;
                              const acceleratedMonths = Math.max(6, longest - reduction);
                              const date = new Date();
                              date.setMonth(date.getMonth() + acceleratedMonths);
                              return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                            })()}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Action Tip */}
                  {(earlyPaymentAmount || 0) > 0 && (
                    <Alert 
                      severity="success" 
                      sx={{ 
                        mt: 2,
                        py: 0.5,
                        bgcolor: 'rgba(76,175,80,0.2)', 
                        color: 'white',
                        '& .MuiAlert-icon': { color: '#4caf50' },
                        '& .MuiAlert-message': { fontSize: '0.875rem' }
                      }}
                    >
                      🚀 Start with your highest-interest EMI to maximize savings!
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Interest vs Principal Breakdown */}
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                          bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
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

                  <Box sx={{ mt: 3, p: 2, bgcolor: surfaceMuted, borderRadius: 2, textAlign: 'center' }}>
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
            <Grid size={12}>
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(255,152,0,0.12)' : '#fff3e0', borderRadius: 2, border: `2px solid ${isDark ? 'rgba(255,152,0,0.5)' : '#ff9800'}`, height: '100%' }}>
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(33,150,243,0.12)' : '#e3f2fd', borderRadius: 2, border: `2px solid ${isDark ? 'rgba(33,150,243,0.5)' : '#2196f3'}`, height: '100%' }}>
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#e8f5e9', borderRadius: 2, border: `2px solid ${isDark ? 'rgba(76,175,80,0.5)' : '#4caf50'}`, height: '100%' }}>
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
            <Grid size={12}>
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
                    <Grid size={{ xs: 12, md: 7 }}>
                      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', bgcolor: surface }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: surfaceMuted }}>
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

                    <Grid size={{ xs: 12, md: 5 }}>
                      <Box sx={{ p: 3, bgcolor: surfaceMuted, borderRadius: 2, height: '100%' }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                        <Box p={2} sx={{ bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#e8f5e9', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(76,175,80,0.3)' : '#c8e6c9'}` }}>
                          <Typography variant="subtitle2" fontWeight="bold">Ask for 3% rate drop</Typography>
                          <Typography variant="body2" color="text.secondary">On {targetEmi.merchantName} @ {targetEmi.interestRate}%</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">Save ≈ {formatCurrency(threePointDropSavings)} / month</Typography>
                        </Box>
                        <Box p={2} sx={{ bgcolor: isDark ? 'rgba(255,152,0,0.12)' : '#fff3e0', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(255,152,0,0.3)' : '#ffe0b2'}` }}>
                          <Typography variant="subtitle2" fontWeight="bold">Request fee/penalty waiver</Typography>
                          <Typography variant="body2" color="text.secondary">Waive late/foreclosure fees to speed prepayment.</Typography>
                          <Typography variant="caption" color="text.secondary">Mention spotless repayment streaks to negotiate.</Typography>
                        </Box>
                        <Box p={2} sx={{ bgcolor: isDark ? 'rgba(33,150,243,0.12)' : '#e3f2fd', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(33,150,243,0.3)' : '#bbdefb'}` }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={3}>⚡ Income Boost Sprint (30 days)</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Quick wins to unlock extra cash and push it into prepayments immediately.
                  </Typography>
                  <Grid container spacing={2}>
                    {[{title: 'Sell 3 idle items', impact: 3000, eta: '1 week'}, {title: 'Weekend gig (8 hrs)', impact: 2500, eta: 'This week'}, {title: 'Renegotiate 2 subscriptions', impact: 800, eta: '2 days'}]
                      .map((item, idx) => (
                        <Grid size={12} key={idx}>
                          <Box p={2} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box p={2} sx={{ bgcolor: isDark ? 'rgba(255,152,0,0.12)' : '#fff3e0', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(255,152,0,0.3)' : '#ffe0b2'}` }}>
                        <Typography variant="subtitle2" fontWeight="bold">Min-pay envelope</Typography>
                        <Typography variant="body2" color="text.secondary">Allocate ₹{Math.round(debtAnalysis.monthlyBurden * 0.6).toLocaleString()} to keep EMIs current.</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box p={2} sx={{ bgcolor: isDark ? 'rgba(76,175,80,0.12)' : '#e8f5e9', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(76,175,80,0.3)' : '#c8e6c9'}` }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                          <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                            <Box p={2} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={chartCardHoverEffect}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" mb={2}>🏅 Behavioral Nudges & Streaks</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>Small wins compound—keep your momentum.</Typography>
                  <Box display="grid" gap={1.5}>
                    <Box p={2} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">On-time streak</Typography>
                      <Typography variant="body2" color="text.secondary">Maintain 3-month streak to unlock lower-risk profile.</Typography>
                    </Box>
                    <Box p={2} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Round-up challenge</Typography>
                      <Typography variant="body2" color="text.secondary">Add ₹100 daily for 10 days → prepay highest APR EMI.</Typography>
                    </Box>
                    <Box p={2} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2 }}>
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

      {activeTab === 8 && (
        <Box>
          {/* Summary Cards */}
          {personalLoansSummary && (
            <Grid container spacing={3} mb={4}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Borrowed</Typography>
                    <Typography variant="h4">₹{personalLoansSummary.totalBorrowed.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Outstanding</Typography>
                    <Typography variant="h4">₹{personalLoansSummary.totalOutstanding.toLocaleString()}</Typography>
                    <Typography variant="caption">Principal + Interest</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Current Interest</Typography>
                    <Typography variant="h4">₹{personalLoansSummary.totalInterest.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
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
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={loan._id}>
                    <Card elevation={isDark ? 0 : 3} sx={{ 
                      bgcolor: surface,
                      '&:hover': { boxShadow: isDark ? '0 6px 20px rgba(0,0,0,0.4)' : 6 },
                      border: loan.priority === 'urgent' ? '2px solid #f44336' : 
                              loan.priority === 'high' ? '2px solid #ff9800' : `1px solid ${borderColor}`
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
                          <Box mb={2} sx={{
                            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                            borderRadius: 2,
                            p: 2,
                            border: '1px solid #ffcc80'
                          }}>
                            <Typography variant="body2" color="warning.main" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              💰 Interest Accrued
                              {loan.interestType === 'rupee_per_100' && (
                                <Chip label={`${loan.interestRate} ₹/100/mo`} size="small" sx={{ ml: 1, bgcolor: '#ff9800', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
                              )}
                              {loan.interestType === 'flat' && (
                                <Chip label={`₹${loan.interestRate.toLocaleString()} Flat`} size="small" sx={{ ml: 1 }} />
                              )}
                              {loan.interestType === 'simple' && (
                                <Chip label={`${loan.interestRate}% p.a.`} size="small" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            <Typography variant="h6" color="warning.dark" fontWeight="bold">
                              + ₹{loan.currentInterest.toLocaleString()}
                            </Typography>
                            {loan.interestType === 'rupee_per_100' && loan.monthlyInterest > 0 && (
                              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                ₹{loan.monthlyInterest.toLocaleString()}/month • {loan.annualEquivalentRate}% p.a. equivalent
                              </Typography>
                            )}
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
                  <Grid size={{ xs: 12, md: 6 }} key={loan._id}>
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

          {/* NEW: Smart Income Suggestions */}
          <Grid size={12}>
            <Card elevation={0} sx={{
              ...chartCardHoverEffect,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              mt: 4
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Typography variant="h4" fontWeight="bold">
                    💡 Smart Income Boost Suggestions
                  </Typography>
                  <Chip 
                    label={`Need: ₹${debtAnalysis.recommendedMonthlyExtra?.toLocaleString()}/mo`}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.3)', 
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }} 
                  />
                </Box>
                <Typography variant="h6" sx={{ mb: 3, opacity: 0.95 }}>
                  Based on your ₹{debtAnalysis.totalOutstanding.toLocaleString()} debt, here are personalized ways to generate extra income:
                </Typography>

                <Grid container spacing={3}>
                  {/* Quick Wins - Under 1 Month */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', p: 3, borderRadius: 2, border: '2px solid rgba(255,255,255,0.3)' }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        🚀 Quick Wins (Start This Week)
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, '& li': { mb: 1.5 } }}>
                        <li>
                          <Typography variant="body1" fontWeight="600">Freelance Your Skills</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Platforms: Upwork, Fiverr, Freelancer
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.5).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra).toLocaleString()}/month
                            <br />Best for: Writing, Design, Programming, Data Entry
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body1" fontWeight="600">Online Tutoring</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Platforms: Chegg, Vedantu, Unacademy
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.4).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.8).toLocaleString()}/month
                            <br />Time: 1-2 hours/day after work
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body1" fontWeight="600">Sell Unused Items</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Platforms: OLX, Quikr, Facebook Marketplace
                            <br />One-time boost: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 2).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 4).toLocaleString()}
                            <br />Items: Electronics, Furniture, Books, Clothes
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body1" fontWeight="600">Food Delivery Partner</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Apps: Swiggy, Zomato, Uber Eats
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.6).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 1.2).toLocaleString()}/month
                            <br />Flexibility: Choose your own hours
                          </Typography>
                        </li>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Medium-Term - 1-3 Months */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', p: 3, borderRadius: 2, border: '2px solid rgba(255,255,255,0.3)' }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        📈 Medium-Term Growth (1-3 Months)
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, '& li': { mb: 1.5 } }}>
                        <li>
                          <Typography variant="body1" fontWeight="600">Start a Blog/YouTube Channel</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Monetization: Ads, Sponsorships, Affiliate
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.3).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 2).toLocaleString()}/month (grows over time)
                            <br />Topics: Finance, Tech, Lifestyle, Education
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body1" fontWeight="600">Rent Out Spare Room/Parking</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Platforms: Airbnb, NoBroker, OLX
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 1.5).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 3).toLocaleString()}/month
                            <br />Low effort, passive income
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body1" fontWeight="600">Consulting in Your Field</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Leverage your expertise
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 3).toLocaleString()}/month
                            <br />Charge: ₹1,000-₹5,000/hour based on expertise
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body1" fontWeight="600">Content Creation (Instagram/TikTok)</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Monetization: Brand collaborations, affiliate
                            <br />Target: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.5).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 4).toLocaleString()}/month
                            <br />Build following: 10K+ for sponsorships
                          </Typography>
                        </li>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Passive Income Streams */}
                  <Grid size={12}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', p: 3, borderRadius: 2, border: '2px solid rgba(255,255,255,0.3)' }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        💰 Passive Income Opportunities
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Stock Photography</Typography>
                            <Typography variant="caption" display="block">Upload photos to Shutterstock, Adobe Stock</Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Earn: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.2).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.8).toLocaleString()}/mo
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Create Digital Products</Typography>
                            <Typography variant="caption" display="block">Sell templates, courses, ebooks</Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Earn: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.5).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 2).toLocaleString()}/mo
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Affiliate Marketing</Typography>
                            <Typography variant="caption" display="block">Promote products, earn commission</Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Earn: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.3).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 1.5).toLocaleString()}/mo
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>App/Website Testing</Typography>
                            <Typography variant="caption" display="block">Test apps on UserTesting, TryMyUI</Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Earn: ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.15).toLocaleString()}-₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.5).toLocaleString()}/mo
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>

                  {/* Action Plan */}
                  <Grid size={12}>
                    <Alert severity="success" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '& .MuiAlert-icon': { color: 'white' } }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>🎯 Your Personalized Action Plan</Typography>
                      <Box component="ol" sx={{ pl: 2, '& li': { mb: 1 } }}>
                        <li>
                          <Typography variant="body2">
                            <strong>Week 1:</strong> Sign up for 2-3 freelancing platforms and create profiles. List unused items for sale.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            <strong>Week 2-4:</strong> Apply for 10+ freelance gigs daily. Start 1 side hustle that matches your skills.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            <strong>Month 2:</strong> Once earning ₹{Math.round(debtAnalysis.recommendedMonthlyExtra * 0.5).toLocaleString()}/month extra, add it to EMI prepayments.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            <strong>Month 3+:</strong> Scale successful income streams to hit ₹{debtAnalysis.recommendedMonthlyExtra?.toLocaleString()}/month target.
                          </Typography>
                        </li>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
                        💪 Goal: Generate ₹{debtAnalysis.recommendedMonthlyExtra?.toLocaleString()}/month extra to become debt-free {(() => {
                          const longestEMI = overview.activeEMIs.reduce((max, emi) => 
                            emi.remainingInstallments > max ? emi.remainingInstallments : max, 0);
                          const extraPayment = debtAnalysis.recommendedMonthlyExtra || 0;
                          const avgEMI = debtAnalysis.monthlyBurden / overview.activeEMIs.length;
                          const reduction = extraPayment > 0 ? Math.floor((extraPayment / avgEMI) * 0.7) : 0;
                          return reduction;
                        })()} months faster!
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Box>
      )}

      {/* ===== Credit Card Bills Tab ===== */}
      {activeTab === 9 && (
        <Box>
          {ccBillsLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress size={48} />
            </Box>
          ) : (
            <>
              {/* Summary Cards */}
              {ccBillsSummary && (
                <Grid container spacing={3} mb={4}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Outstanding</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          ₹{(ccBillsSummary.totalOutstanding || 0).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Minimum Due</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          ₹{(ccBillsSummary.totalMinimumDue || 0).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Overdue Bills</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {ccBillsSummary.overdueCount || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Upcoming (30 days)</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {Array.isArray(ccBillsSummary.upcomingBills) ? ccBillsSummary.upcomingBills.length : (ccBillsSummary.upcomingBills || 0)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Action Buttons */}
              <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedCcBill(null);
                    setCcBillFormData({
                      cardProvider: '', cardLastFourDigits: '', cardHolderName: '', cardNetwork: '',
                      statementDate: new Date().toISOString().split('T')[0], dueDate: '',
                      totalAmount: '', minimumDue: '', creditLimit: '', interestCharged: '',
                      feesAndCharges: '', newCharges: '', previousBalance: '', paymentsReceived: '', notes: '',
                      spendingByCategory: []
                    });
                    setCcBillDialogOpen(true);
                  }}
                  sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  Add Bill Manually
                </Button>
                <Button
                  variant="outlined"
                  startIcon={ccBillSyncing ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={handleSyncCCBillsGmail}
                  disabled={ccBillSyncing}
                >
                  {ccBillSyncing ? 'Syncing...' : 'Sync from Gmail'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchCCBills}
                >
                  Refresh
                </Button>
              </Box>

              {/* Bills Table */}
              {ccBills.length === 0 ? (
                <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
                  <CreditCardIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">No credit card bills found</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Add bills manually or sync from Gmail to get started
                  </Typography>
                </Card>
              ) : (
                <Card sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Card</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Statement Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Amount</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Min Due</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Paid</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ccBills.map((bill) => {
                          const statusColors = {
                            unpaid: 'error',
                            minimum_paid: 'warning',
                            partial_paid: 'info',
                            full_paid: 'success',
                            overdue: 'error'
                          };
                          return (
                            <TableRow key={bill._id} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <CreditCardIcon fontSize="small" color="primary" />
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {bill.cardProvider}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      ****{bill.cardLastFourDigits || '----'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {new Date(bill.statementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell align="right">
                                <Typography fontWeight="bold" color="error.main">
                                  ₹{bill.totalAmount?.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                ₹{(bill.minimumDue || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {bill.dueDate
                                  ? new Date(bill.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={bill.paymentStatus?.replace('_', ' ').toUpperCase() || 'UNPAID'}
                                  color={statusColors[bill.paymentStatus] || 'default'}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                ₹{(bill.amountPaid || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={bill.source === 'gmail' ? 'Gmail' : bill.source === 'statement_pdf' ? 'PDF' : 'Manual'}
                                  size="small"
                                  variant="filled"
                                  sx={{
                                    bgcolor: bill.source === 'gmail' ? 'info.main' : bill.source === 'statement_pdf' ? 'secondary.main' : 'success.main',
                                    color: 'white',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box display="flex" justifyContent="center" gap={0.5}>
                                  {bill.paymentStatus !== 'full_paid' && (
                                    <Tooltip title="Pay Bill">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => {
                                          setSelectedCcBill(bill);
                                          setCcPayAmount('');
                                          setCcPayMethod('');
                                          setCcBillPayDialogOpen(true);
                                        }}
                                      >
                                        <PaymentIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Edit">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        setSelectedCcBill(bill);
                                        setCcBillFormData({
                                          cardProvider: bill.cardProvider || '',
                                          cardLastFourDigits: bill.cardLastFourDigits || '',
                                          cardHolderName: bill.cardHolderName || '',
                                          cardNetwork: bill.cardNetwork || '',
                                          statementDate: bill.statementDate?.split('T')[0] || '',
                                          dueDate: bill.dueDate?.split('T')[0] || '',
                                          totalAmount: bill.totalAmount || '',
                                          minimumDue: bill.minimumDue || '',
                                          creditLimit: bill.creditLimit || '',
                                          interestCharged: bill.interestCharged || '',
                                          feesAndCharges: bill.feesAndCharges || '',
                                          newCharges: bill.newCharges || '',
                                          previousBalance: bill.previousBalance || '',
                                          paymentsReceived: bill.paymentsReceived || '',
                                          notes: bill.notes || '',
                                          spendingByCategory: bill.spendingByCategory || []
                                        });
                                        setCcBillDialogOpen(true);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteCCBill(bill._id)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              )}

              {/* Spending Analytics */}
              {ccBillsSummary && (
                <Grid container spacing={3}>
                  {/* Monthly Spending Trend */}
                  {ccBillsSummary.monthlySpending?.length > 0 && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ ...getChartCardStyle(isDark), p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Monthly Spending Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={ccBillsSummary.monthlySpending}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : '#eee'} />
                            <XAxis dataKey="_id" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: isDark ? '#1e293b' : '#fff',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                borderRadius: 8
                              }}
                              formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                            />
                            <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid>
                  )}

                  {/* Category Breakdown */}
                  {ccBillsSummary.categorySpending?.length > 0 && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ ...getChartCardStyle(isDark), p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Spending by Category
                        </Typography>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={ccBillsSummary.categorySpending}
                              dataKey="total"
                              nameKey="_id"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                            >
                              {ccBillsSummary.categorySpending.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: isDark ? '#1e293b' : '#fff',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                borderRadius: 8
                              }}
                              formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid>
                  )}

                  {/* Card-wise Breakdown */}
                  {ccBillsSummary.cardBreakdown?.length > 0 && (
                    <Grid size={12}>
                      <Card sx={{ ...getChartCardStyle(isDark), p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Card-wise Breakdown
                        </Typography>
                        <Grid container spacing={2}>
                          {ccBillsSummary.cardBreakdown.map((card, idx) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                              <Card variant="outlined" sx={{ p: 2 }}>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                  <CreditCardIcon color="primary" />
                                  <Typography fontWeight="bold">{card._id?.provider || 'Unknown'}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ****{card._id?.digits || '----'}
                                  </Typography>
                                </Box>
                                <Typography variant="h6">₹{(card.totalSpent || 0).toLocaleString()}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {card.count || 0} bill(s) · Avg: ₹{Math.round(card.avgBill || 0).toLocaleString()}
                                </Typography>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              )}
            </>
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: isDark ? 'linear-gradient(45deg, #1e3a5f 30%, #1a6b8a 90%)' : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'grey.100'
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: isDark ? 'linear-gradient(135deg, #155e75 0%, #1e1b4b 100%)' : 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
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
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                💳 Card Details
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: manualEMIData.cardProvider === 'OTHER' ? 12 : 6 }}>
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

            <Grid size={12}>
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
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                🛍️ Purchase Details
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Product Description"
                value={manualEMIData.productDescription}
                onChange={(e) => handleManualEMIChange('productDescription', e.target.value)}
                placeholder="iPhone, Laptop, etc."
              />
            </Grid>

            {/* Financial Details Section */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                💰 Financial Details
              </Typography>
            </Grid>

            {/* Repayment Type Selection */}
            <Grid size={12}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Interest Type</InputLabel>
                <Select
                  value={manualEMIData.interestType}
                  onChange={(e) => {
                    handleManualEMIChange('interestType', e.target.value);
                    handleManualEMIChange('interestRate', '');
                  }}
                  label="Interest Type"
                >
                  <MenuItem value="percentage">Percentage (% p.a.)</MenuItem>
                  <MenuItem value="rupee_per_100">₹ per 100/month (Rupee Interest)</MenuItem>
                  <MenuItem value="flat">Flat Amount (₹)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label={
                  manualEMIData.interestType === 'rupee_per_100' ? 'Rupees per ₹100/month' :
                  manualEMIData.interestType === 'flat' ? 'Interest Amount (₹)' : 'Interest Rate (%)'
                }
                type="number"
                value={manualEMIData.interestRate}
                onChange={(e) => handleManualEMIChange('interestRate', e.target.value)}
                placeholder={manualEMIData.interestType === 'rupee_per_100' ? '2' : manualEMIData.interestType === 'flat' ? '5000' : '12'}
                InputProps={{ 
                  endAdornment: manualEMIData.interestType === 'flat' ? '₹' : manualEMIData.interestType === 'rupee_per_100' ? '₹/100' : '%',
                  readOnly: manualEMIData.interestType === 'percentage' && autoCalculatedRate !== null
                }}
                helperText={
                  manualEMIData.interestType === 'percentage' && autoCalculatedRate !== null
                    ? '✅ Auto-calculated from Principal, EMI & Tenure'
                    : manualEMIData.interestType === 'rupee_per_100' && manualEMIData.interestRate
                    ? `= ${(parseFloat(manualEMIData.interestRate) * 12).toFixed(1)}% p.a. equivalent`
                    : manualEMIData.interestType === 'percentage'
                    ? 'Enter Principal, EMI & Tenure to auto-calculate'
                    : ''
                }
                sx={{
                  ...(manualEMIData.interestType === 'percentage' && autoCalculatedRate !== null ? {
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'action.hover'
                    }
                  } : {})
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
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
              <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                📅 Date Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                📝 Additional Information
              </Typography>
            </Grid>

            <Grid size={12}>
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
              <Grid size={12}>
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
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">Principal</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(parseFloat(manualEMIData.principalAmount))}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">Monthly EMI</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(parseFloat(manualEMIData.emiAmount))}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">Total Payable</Typography>
                          <Typography variant="h6" color="secondary">
                            {formatCurrency(parseFloat(manualEMIData.emiAmount) * parseInt(manualEMIData.totalTenure))}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">Total Interest</Typography>
                          <Typography variant="h6" color="error">
                            {manualEMIData.interestType === 'flat' 
                              ? formatCurrency(parseFloat(manualEMIData.interestRate) || 0)
                              : formatCurrency((parseFloat(manualEMIData.emiAmount) * parseInt(manualEMIData.totalTenure)) - parseFloat(manualEMIData.principalAmount))
                            }
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {manualEMIData.interestType === 'flat' 
                              ? '(Flat)' 
                              : manualEMIData.interestType === 'rupee_per_100' 
                              ? `(${manualEMIData.interestRate || 0} ₹/100/mo)` 
                              : `(${manualEMIData.interestRate || 0}% p.a.${autoCalculatedRate !== null ? ' - auto' : ''})`
                            }
                          </Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Total Loan Amount</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(parseFloat(manualEMIData.principalAmount))}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Repayment Type</Typography>
                          <Typography variant="h6" color="secondary">
                            🤝 On Request (Pay Anytime)
                          </Typography>
                        </Grid>
                        <Grid size={12}>
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            bgcolor: 'background.paper'
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
            <Box mt={2} p={2} bgcolor={surfaceMuted} borderRadius={2}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
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
                  bgcolor: surfaceAlt
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
      <Dialog open={loanGivenDialogOpen} onClose={() => setLoanGivenDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
      >
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

            <FormControl fullWidth>
              <InputLabel>Interest Type</InputLabel>
              <Select
                value={loanGivenFormData.interestType}
                onChange={(e) => {
                  const val = e.target.value;
                  setLoanGivenFormData({
                    ...loanGivenFormData,
                    interestType: val,
                    hasInterest: val !== 'none',
                    interestRate: val === 'none' ? 0 : loanGivenFormData.interestRate
                  });
                }}
                label="Interest Type"
              >
                <MenuItem value="none">No Interest</MenuItem>
                <MenuItem value="rupee_per_100">₹ per 100/month (Rupee Interest)</MenuItem>
                <MenuItem value="percentage">Percentage (% p.a.)</MenuItem>
                <MenuItem value="flat">Flat Amount (₹)</MenuItem>
              </Select>
            </FormControl>

            {loanGivenFormData.interestType !== 'none' && (
              <TextField
                label={
                  loanGivenFormData.interestType === 'rupee_per_100' ? 'Rupees per ₹100 per month' :
                  loanGivenFormData.interestType === 'flat' ? 'Interest Amount (₹)' : 'Interest Rate (% per annum)'
                }
                type="number"
                fullWidth
                value={loanGivenFormData.interestRate}
                onChange={(e) => setLoanGivenFormData({ ...loanGivenFormData, interestRate: parseFloat(e.target.value) || 0 })}
                InputProps={{ endAdornment: loanGivenFormData.interestType === 'flat' ? '₹' : loanGivenFormData.interestType === 'rupee_per_100' ? '₹/100' : '%' }}
                helperText={
                  loanGivenFormData.interestType === 'rupee_per_100' && loanGivenFormData.interestRate > 0 && loanGivenFormData.amount
                    ? `Monthly interest: ₹${((parseFloat(loanGivenFormData.amount) || 0) * loanGivenFormData.interestRate / 100).toLocaleString()} | Equiv. ${(loanGivenFormData.interestRate * 12).toFixed(1)}% p.a.`
                    : loanGivenFormData.interestType === 'rupee_per_100' ? 'e.g. "2" means ₹2 interest on every ₹100 per month'
                    : ''
                }
              />
            )}

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
      <Dialog open={repaymentDialogOpen} onClose={() => setRepaymentDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
      >
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
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
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
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, interestType: e.target.value, interestRate: e.target.value === 'none' ? 0 : personalLoanFormData.interestRate })}
                label="Interest Type"
              >
                <MenuItem value="none">No Interest</MenuItem>
                <MenuItem value="rupee_per_100">₹ per 100/month (Rupee Interest)</MenuItem>
                <MenuItem value="simple">Simple Interest (% p.a.)</MenuItem>
                <MenuItem value="flat">Flat Amount (₹)</MenuItem>
              </Select>
            </FormControl>

            {personalLoanFormData.interestType !== 'none' && (
              <TextField
                label={
                  personalLoanFormData.interestType === 'rupee_per_100' ? 'Rupees per ₹100 per month' :
                  personalLoanFormData.interestType === 'flat' ? 'Interest Amount (₹)' : 'Interest Rate (% per annum)'
                }
                type="number"
                fullWidth
                value={personalLoanFormData.interestRate}
                onChange={(e) => setPersonalLoanFormData({ ...personalLoanFormData, interestRate: parseFloat(e.target.value) || 0 })}
                InputProps={{ endAdornment: personalLoanFormData.interestType === 'flat' ? '₹' : personalLoanFormData.interestType === 'rupee_per_100' ? '₹/100' : '%' }}
                helperText={
                  personalLoanFormData.interestType === 'rupee_per_100' && personalLoanFormData.interestRate > 0 && personalLoanFormData.principalAmount
                    ? `Monthly interest: ₹${((parseFloat(personalLoanFormData.principalAmount) || 0) * personalLoanFormData.interestRate / 100).toLocaleString()} | Equiv. ${(personalLoanFormData.interestRate * 12).toFixed(1)}% p.a.`
                    : personalLoanFormData.interestType === 'rupee_per_100' ? 'e.g. "2" means ₹2 interest on every ₹100 per month'
                    : ''
                }
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
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
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

      {/* Add/Edit Credit Card Bill Dialog */}
      <Dialog
        open={ccBillDialogOpen}
        onClose={() => { setCcBillDialogOpen(false); setSelectedCcBill(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCardIcon color="primary" />
          {selectedCcBill ? 'Edit Credit Card Bill' : 'Add Credit Card Bill'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Card Provider</InputLabel>
                  <Select
                    value={ccBillFormData.cardProvider}
                    onChange={(e) => setCcBillFormData({ ...ccBillFormData, cardProvider: e.target.value })}
                    label="Card Provider"
                  >
                    {['ICICI', 'HDFC', 'SBI', 'AXIS', 'KOTAK', 'CITI', 'AMEX', 'RBL', 'YES BANK', 'INDUSIND', 'OTHER'].map(p => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Last 4 Digits"
                  fullWidth
                  value={ccBillFormData.cardLastFourDigits}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, cardLastFourDigits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="1234"
                  inputProps={{ maxLength: 4 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Card Holder Name"
                  fullWidth
                  value={ccBillFormData.cardHolderName}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, cardHolderName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Card Network</InputLabel>
                  <Select
                    value={ccBillFormData.cardNetwork}
                    onChange={(e) => setCcBillFormData({ ...ccBillFormData, cardNetwork: e.target.value })}
                    label="Card Network"
                  >
                    {['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS'].map(n => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Statement Date"
                  type="date"
                  fullWidth
                  required
                  value={ccBillFormData.statementDate}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, statementDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  value={ccBillFormData.dueDate}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, dueDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Total Bill Amount"
                  type="number"
                  fullWidth
                  required
                  value={ccBillFormData.totalAmount}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, totalAmount: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Minimum Due"
                  type="number"
                  fullWidth
                  value={ccBillFormData.minimumDue}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, minimumDue: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Credit Limit"
                  type="number"
                  fullWidth
                  value={ccBillFormData.creditLimit}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, creditLimit: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Interest Charged"
                  type="number"
                  fullWidth
                  value={ccBillFormData.interestCharged}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, interestCharged: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Fees & Charges"
                  type="number"
                  fullWidth
                  value={ccBillFormData.feesAndCharges}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, feesAndCharges: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="New Charges"
                  type="number"
                  fullWidth
                  value={ccBillFormData.newCharges}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, newCharges: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Previous Balance"
                  type="number"
                  fullWidth
                  value={ccBillFormData.previousBalance}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, previousBalance: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Payments Received"
                  type="number"
                  fullWidth
                  value={ccBillFormData.paymentsReceived}
                  onChange={(e) => setCcBillFormData({ ...ccBillFormData, paymentsReceived: e.target.value })}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={ccBillFormData.notes}
              onChange={(e) => setCcBillFormData({ ...ccBillFormData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setCcBillDialogOpen(false); setSelectedCcBill(null); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveCCBill}
            variant="contained"
            disabled={!ccBillFormData.cardProvider || !ccBillFormData.totalAmount}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {selectedCcBill ? 'Update Bill' : 'Add Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Credit Card Bill Dialog */}
      <Dialog
        open={ccBillPayDialogOpen}
        onClose={() => { setCcBillPayDialogOpen(false); setSelectedCcBill(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon color="success" />
          Pay Credit Card Bill
        </DialogTitle>
        <DialogContent>
          {selectedCcBill && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Card:</strong> {selectedCcBill.cardProvider} ****{selectedCcBill.cardLastFourDigits || '----'}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Amount:</strong> ₹{selectedCcBill.totalAmount?.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Already Paid:</strong> ₹{(selectedCcBill.amountPaid || 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  <strong>Remaining:</strong> ₹{((selectedCcBill.totalAmount || 0) - (selectedCcBill.amountPaid || 0)).toLocaleString()}
                </Typography>
                {selectedCcBill.minimumDue > 0 && (
                  <Typography variant="body2" color="warning.main">
                    <strong>Minimum Due:</strong> ₹{selectedCcBill.minimumDue?.toLocaleString()}
                  </Typography>
                )}
              </Alert>

              <TextField
                label="Payment Amount"
                type="number"
                required
                fullWidth
                value={ccPayAmount}
                onChange={(e) => setCcPayAmount(e.target.value)}
                InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography> }}
                helperText={`Remaining: ₹${((selectedCcBill.totalAmount || 0) - (selectedCcBill.amountPaid || 0)).toLocaleString()}`}
              />

              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setCcPayAmount(String(selectedCcBill.minimumDue || 0))}
                >
                  Min Due (₹{(selectedCcBill.minimumDue || 0).toLocaleString()})
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setCcPayAmount(String((selectedCcBill.totalAmount || 0) - (selectedCcBill.amountPaid || 0)))}
                >
                  Full (₹{((selectedCcBill.totalAmount || 0) - (selectedCcBill.amountPaid || 0)).toLocaleString()})
                </Button>
              </Box>

              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={ccPayMethod}
                  onChange={(e) => setCcPayMethod(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="auto_debit">Auto Debit</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setCcBillPayDialogOpen(false); setSelectedCcBill(null); }}>
            Cancel
          </Button>
          <Button
            onClick={handlePayCCBill}
            variant="contained"
            color="success"
            disabled={!ccPayAmount || Number(ccPayAmount) <= 0}
            startIcon={<PaymentIcon />}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit EMI Dialog */}
      <Dialog
        open={editEMIDialogOpen}
        onClose={() => setEditEMIDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}
      >
        <DialogTitle>Edit EMI — {selectedEMI?.merchantName}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Merchant / Product Name"
              value={editEMIData.merchantName || ''}
              onChange={(e) => setEditEMIData(prev => ({ ...prev, merchantName: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Product Description"
              value={editEMIData.productDescription || ''}
              onChange={(e) => setEditEMIData(prev => ({ ...prev, productDescription: e.target.value }))}
            />
            <TextField
              fullWidth
              label="EMI Amount (₹)"
              type="number"
              value={editEMIData.emiAmount || ''}
              onChange={(e) => setEditEMIData(prev => ({ ...prev, emiAmount: e.target.value }))}
              InputProps={{ startAdornment: '₹' }}
            />
            <TextField
              fullWidth
              label="Interest Rate (%)"
              type="number"
              value={editEMIData.interestRate || ''}
              onChange={(e) => setEditEMIData(prev => ({ ...prev, interestRate: e.target.value }))}
              InputProps={{ endAdornment: '%' }}
            />
            <TextField
              fullWidth
              label="Total Tenure (months)"
              type="number"
              value={editEMIData.totalTenure || ''}
              onChange={(e) => setEditEMIData(prev => ({ ...prev, totalTenure: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editEMIData.status || 'active'}
                onChange={(e) => setEditEMIData(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={editEMIData.notes || ''}
              onChange={(e) => setEditEMIData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEMIDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={editEMILoading}
            onClick={async () => {
              if (!selectedEMI) return;
              setEditEMILoading(true);
              try {
                const updatePayload = {
                  merchantName: editEMIData.merchantName,
                  productDescription: editEMIData.productDescription,
                  emiAmount: parseFloat(editEMIData.emiAmount) || undefined,
                  interestRate: parseFloat(editEMIData.interestRate) || undefined,
                  totalTenure: parseInt(editEMIData.totalTenure) || undefined,
                  notes: editEMIData.notes,
                  status: editEMIData.status,
                  tags: editEMIData.tags
                };
                await api.put(
                  `/emi/${selectedEMI.id || selectedEMI._id}`,
                  updatePayload
                );
                showSnackbar('EMI updated successfully!');
                setEditEMIDialogOpen(false);
                fetchAllData();
              } catch (err) {
                console.error('Error updating EMI:', err);
                showSnackbar(err.response?.data?.message || 'Failed to update EMI', 'error');
              } finally {
                setEditEMILoading(false);
              }
            }}
          >
            {editEMILoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════ TAB 10 — Bank & Balance ════════ */}
      {activeTab === 10 && (
        <Box sx={{ mt: 3 }}>
          {bankDeductionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : bankDeductionData ? (
            <Grid container spacing={3}>
              {/* ── Summary Cards ──────────────────────────── */}
              <Grid size={12}>
                <Grid container spacing={2}>
                  {/* Total Monthly EMI */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card elevation={0} sx={{ ...chartCardHoverEffect, p: 0 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Total Monthly EMI
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          ₹{(bankDeductionData.totalMonthlyEmi || 0).toLocaleString('en-IN')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {/* Active EMIs */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card elevation={0} sx={{ ...chartCardHoverEffect, p: 0 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Active EMIs
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'primary.main' }}>
                          {bankDeductionData.emiDeductions?.length || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {/* Bank Accounts Linked */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card elevation={0} sx={{ ...chartCardHoverEffect, p: 0 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Banks Linked
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'success.main' }}>
                          {bankDeductionData.bankAccounts?.length || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {/* Unassigned EMIs */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card elevation={0} sx={{ ...chartCardHoverEffect, p: 0 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Unassigned EMIs
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: bankDeductionData.unassignedCount > 0 ? 'warning.main' : 'success.main' }}>
                          {bankDeductionData.unassignedCount || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* ── Bank-wise Balance Summary ─────────────── */}
              {bankDeductionData.bankSummaries?.filter(bs => bs.bank).length > 0 && (
                <Grid size={12}>
                  <Card elevation={0} sx={chartCardHoverEffect}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceIcon sx={{ color: 'primary.main' }} />
                        Expected Balance by Bank
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                        Ensure each bank account has sufficient balance before EMI deduction dates
                      </Typography>
                      <Grid container spacing={2}>
                        {bankDeductionData.bankSummaries.filter(bs => bs.bank).map((bs, idx) => (
                          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idx}>
                            <Box sx={{
                              p: 3, borderRadius: 3,
                              border: '2px solid',
                              borderColor: bs.sufficient === false ? 'error.main' : bs.sufficient === true ? 'success.main' : 'divider',
                              bgcolor: bs.sufficient === false
                                ? (isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)')
                                : (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.03)'),
                              transition: 'all 0.3s ease',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Box sx={{
                                  width: 12, height: 12, borderRadius: '50%',
                                  bgcolor: bs.bank?.color || '#4F46E5'
                                }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {bs.bank?.bankName || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                                  {bs.bank?.accountNumber || ''}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Current Balance</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                  {bs.currentBalance !== null ? `₹${bs.currentBalance.toLocaleString('en-IN')}` : 'N/A'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>EMI Outflow ({bs.emiCount} EMIs)</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                  −₹{bs.totalEmiAmount.toLocaleString('en-IN')}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Balance Needed</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                  ₹{bs.totalNeeded.toLocaleString('en-IN')}
                                </Typography>
                              </Box>
                              {bs.shortfall > 0 && (
                                <Box sx={{
                                  mt: 2, p: 1.5, borderRadius: 2,
                                  bgcolor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                                  display: 'flex', alignItems: 'center', gap: 1
                                }}>
                                  <WarningIcon sx={{ fontSize: 18, color: 'error.main' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                    Shortfall: ₹{bs.shortfall.toLocaleString('en-IN')}
                                  </Typography>
                                </Box>
                              )}
                              {bs.sufficient && (
                                <Box sx={{
                                  mt: 2, p: 1.5, borderRadius: 2,
                                  bgcolor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)',
                                  display: 'flex', alignItems: 'center', gap: 1
                                }}>
                                  <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                    Sufficient balance ✓
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* ── EMI Deduction Details Table ───────────── */}
              <Grid size={12}>
                <Card elevation={0} sx={chartCardHoverEffect}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCardIcon sx={{ color: 'primary.main' }} />
                        EMI Deduction Details
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={fetchBankDeductionSummary}
                        startIcon={<RefreshIcon />}
                        sx={{ borderRadius: 3, textTransform: 'none' }}
                      >
                        Refresh
                      </Button>
                    </Box>

                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: tableHeaderBg }}>
                            <TableCell sx={{ fontWeight: 700 }}>EMI / Product</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Card / Provider</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">EMI Amount</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Deduction Bank</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Deduction Day</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Auto-Debit</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Min Balance</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bankDeductionData.emiDeductions?.map((emi) => (
                            <TableRow
                              key={emi._id}
                              sx={{
                                '&:hover': { bgcolor: tableHoverBg },
                                transition: 'background 0.2s ease'
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{emi.merchantName}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{emi.productDescription}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${emi.cardProvider} •••${emi.cardLastFourDigits}`}
                                  sx={{ fontWeight: 600, borderRadius: 2 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  ₹{emi.emiAmount?.toLocaleString('en-IN')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {emi.deductionBank ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: emi.deductionBank.color || '#4F46E5' }} />
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{emi.deductionBank.bankName}</Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{emi.deductionBank.accountNumber}</Typography>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Chip
                                    size="small"
                                    label="Not Assigned"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ borderRadius: 2 }}
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {emi.deductionDay ? `${emi.deductionDay}${['st','nd','rd'][((emi.deductionDay+90)%100-10)%10-1]||'th'}` : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {emi.autoDebitEnabled ? (
                                  <Chip size="small" label="ON" color="success" sx={{ fontWeight: 700, minWidth: 50 }} />
                                ) : (
                                  <Chip size="small" label="OFF" variant="outlined" sx={{ fontWeight: 600, minWidth: 50 }} />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {emi.minimumBalanceRequired ? `₹${emi.minimumBalanceRequired.toLocaleString('en-IN')}` : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={((emi.paidInstallments / emi.totalTenure) * 100)}
                                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                                  />
                                  <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 45 }}>
                                    {emi.paidInstallments}/{emi.totalTenure}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Assign Bank / Edit">
                                  <IconButton size="small" onClick={() => openAssignDialog(emi)} sx={{ color: 'primary.main' }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!bankDeductionData.emiDeductions || bankDeductionData.emiDeductions.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                  No active EMIs found. Add EMIs to see bank deduction details.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* ── Monthly Deduction Calendar View ────────── */}
              <Grid size={12}>
                <Card elevation={0} sx={chartCardHoverEffect}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ color: 'primary.main' }} />
                      Deduction Calendar — This Month
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                      Days when EMI amounts will be debited from your bank accounts
                    </Typography>

                    {(() => {
                      // Group EMIs by deduction day
                      const byDay = {};
                      (bankDeductionData.emiDeductions || []).forEach(emi => {
                        const day = emi.deductionDay || (emi.nextDueDate ? new Date(emi.nextDueDate).getDate() : null);
                        if (day) {
                          if (!byDay[day]) byDay[day] = { emis: [], total: 0 };
                          byDay[day].emis.push(emi);
                          byDay[day].total += emi.emiAmount;
                        }
                      });

                      const sortedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);

                      if (sortedDays.length === 0) {
                        return (
                          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                            No deduction dates set. Assign bank accounts to your EMIs to see the calendar.
                          </Typography>
                        );
                      }

                      return (
                        <Grid container spacing={2}>
                          {sortedDays.map(day => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={day}>
                              <Box sx={{
                                p: 2.5, borderRadius: 3,
                                border: '1px solid', borderColor: 'divider',
                                bgcolor: surface,
                                transition: 'all 0.3s ease',
                                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' }
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                  <Box sx={{
                                    width: 48, height: 48, borderRadius: 2,
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800 }}>{day}</Typography>
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Outflow</Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.main' }}>
                                      −₹{byDay[day].total.toLocaleString('en-IN')}
                                    </Typography>
                                  </Box>
                                </Box>
                                {byDay[day].emis.map((emi, i) => (
                                  <Box key={i} sx={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    py: 0.5, borderTop: i > 0 ? '1px solid' : 'none', borderColor: 'divider'
                                  }}>
                                    <Box>
                                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{emi.merchantName}</Typography>
                                      {emi.deductionBank && (
                                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem' }}>
                                          via {emi.deductionBank.bankName}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                      ₹{emi.emiAmount?.toLocaleString('en-IN')}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AccountBalanceIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                No bank deduction data available
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
                Add active EMIs and link bank accounts to see deduction details
              </Typography>
              <Button variant="contained" onClick={fetchBankDeductionSummary} startIcon={<RefreshIcon />}
                sx={{ borderRadius: 3, textTransform: 'none' }}>
                Retry
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── Bank Assignment Dialog ──────────────────── */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon sx={{ color: 'primary.main' }} />
          Assign Deduction Bank
          {assigningEmi && (
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              — {assigningEmi.merchantName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {/* Select from linked bank accounts */}
            {bankDeductionData?.bankAccounts?.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Select Bank Account</InputLabel>
                <Select
                  value={assignForm.bankAccountId}
                  label="Select Bank Account"
                  onChange={(e) => {
                    const ba = bankDeductionData.bankAccounts.find(b => b._id === e.target.value);
                    setAssignForm(prev => ({
                      ...prev,
                      bankAccountId: e.target.value,
                      deductionBankName: ba?.bankName || '',
                      deductionAccountNumber: ba?.accountNumber || ''
                    }));
                  }}
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="">
                    <em>Enter manually below</em>
                  </MenuItem>
                  {bankDeductionData.bankAccounts.map(ba => (
                    <MenuItem key={ba._id} value={ba._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ba.color || '#4F46E5' }} />
                        {ba.displayName}
                        <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
                          ₹{ba.balance?.toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Or enter manually */}
            {!assignForm.bankAccountId && (
              <Grid container spacing={2}>
                <Grid size={8}>
                  <TextField
                    fullWidth
                    label="Bank Name"
                    value={assignForm.deductionBankName}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, deductionBankName: e.target.value }))}
                    placeholder="e.g. HDFC Bank"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    fullWidth
                    label="Account (last 4)"
                    value={assignForm.deductionAccountNumber}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, deductionAccountNumber: e.target.value }))}
                    placeholder="1234"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Grid>
              </Grid>
            )}

            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Deduction Day (1–31)"
                  value={assignForm.deductionDay}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, deductionDay: e.target.value }))}
                  inputProps={{ min: 1, max: 31 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Min Balance Required (₹)"
                  value={assignForm.minimumBalanceRequired}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, minimumBalanceRequired: e.target.value }))}
                  inputProps={{ min: 0 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={assignForm.autoDebitEnabled}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, autoDebitEnabled: e.target.checked }))}
                  color="primary"
                />
              }
              label="Auto-Debit / Standing Instruction Enabled"
            />

            {/* Balance Preview */}
            {assignForm.bankAccountId && assigningEmi && (() => {
              const selectedBank = bankDeductionData.bankAccounts.find(b => b._id === assignForm.bankAccountId);
              if (!selectedBank) return null;
              const needed = assigningEmi.emiAmount + Number(assignForm.minimumBalanceRequired || 0);
              const hasEnough = selectedBank.balance >= needed;
              return (
                <Box sx={{
                  p: 2, borderRadius: 3,
                  border: '1px solid',
                  borderColor: hasEnough ? 'success.main' : 'error.main',
                  bgcolor: hasEnough
                    ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.04)')
                    : (isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)')
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Balance Preview
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Current Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{selectedBank.balance?.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>EMI Amount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>−₹{assigningEmi.emiAmount?.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Min Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{Number(assignForm.minimumBalanceRequired || 0).toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>After Deduction</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: hasEnough ? 'success.main' : 'error.main' }}>
                      ₹{(selectedBank.balance - assigningEmi.emiAmount).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                  {!hasEnough && (
                    <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                      Insufficient balance — shortfall of ₹{(needed - selectedBank.balance).toLocaleString('en-IN')}
                    </Alert>
                  )}
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ borderRadius: 3, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssignBank}
            startIcon={<SaveIcon />}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              '&:hover': { background: 'linear-gradient(135deg, #5a6fd6, #6a4298)' }
            }}
          >
            Save Bank Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for in-tab notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', boxShadow: 6 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    {/* Close content area and flex layout */}
    </Box>{/* end Main Content Area */}
    </Box>{/* end Side Nav + Content flex */}
    </Container>
      </Box>
      </PageTransition>
    </MainLayout>
  );
};

export default EMITracker;
