import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Avatar,
  Divider,
  Badge,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  SwipeableDrawer,
  BottomNavigation,
  BottomNavigationAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
  InputAdornment,
  Menu,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  People,
  AttachMoney,
  Warning,
  CheckCircle,
  Cancel,
  Add,
  Edit,
  Delete,
  Visibility,
  Refresh,
  Download,
  Assessment,
  Phone,
  Email,
  CalendarToday,
  Notifications,
  Send,
  FilterList,
  Search,
  MoreVert,
  Person,
  Schedule,
  MonetizationOn,
  Payment,
  History,
  Description,
  ArrowUpward,
  ArrowDownward,
  ExpandMore,
  Close,
  DashboardCustomize,
  CreditCard,
  AccountBalanceWallet,
  Timer,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { format, addMonths, differenceInDays } from 'date-fns';

import api from '../services/api';
import MainLayout from '../components/MainLayout';
import { useTheme as useAppTheme } from '../context/ThemeContext';

// Color palette
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'];

// Enhanced chart card styling
const chartCardHoverEffect = {
  transition: 'all 0.3s ease-in-out',
  border: '1px solid',
  borderColor: 'divider',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
    borderColor: 'primary.main',
  },
};

// Mobile-first card styling
const mobileCardStyle = {
  borderRadius: 3,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease',
  '&:active': {
    transform: 'scale(0.98)',
  },
};

const LenderDashboardEnhanced = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const { isDark } = useAppTheme();
  const cardSx = { bgcolor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : 'inherit', border: '1px solid', borderColor: isDark ? '#334155' : '#e2e8f0' };
  const subTextColor = isDark ? '#94a3b8' : 'text.secondary';
  const dialogSx = { '& .MuiDialog-paper': { bgcolor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : 'inherit' } };
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [mobileView, setMobileView] = useState('borrowers'); // borrowers, analytics, actions
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [borrowerDrawerOpen, setBorrowerDrawerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Dialogs
  const [openAddLoanDialog, setOpenAddLoanDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openReminderDialog, setOpenReminderDialog] = useState(false);
  
  // Forms
  const [loanForm, setLoanForm] = useState({
    lenderName: 'Self', // Default lender name
    borrowerName: '',
    borrowerPhone: '',
    borrowerEmail: '',
    principalAmount: '',
    interestRate: 12,
    interestType: 'Reducing',
    tenure: 12,
    disbursementDate: new Date().toISOString().split('T')[0],
    firstEmiDate: addMonths(new Date(), 1).toISOString().split('T')[0],
  });
  
  const [paymentForm, setPaymentForm] = useState({
    loanId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/lenders/dashboard');
      
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      if (err.response?.status === 403) {
        setError('Access denied. You need lender privileges.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      console.log('Recording payment...');
      console.log('Payment form data:', paymentForm);
      
      // Get lender ID (same logic as handleAddLoan)
      const lendersResponse = await api.get('/lenders');
      
      const lender = lendersResponse.data.data[0]; // Get first lender for this user
      
      if (!lender) {
        throw new Error('No lender profile found. Please create a loan first.');
      }
      
      const paymentData = {
        loanId: paymentForm.loanId,
        lenderId: lender._id,
        amount: parseFloat(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes
      };
      
      console.log('Creating payment with data:', paymentData);
      
      await api.post('/lender-payments', paymentData);
      
      console.log('Payment recorded successfully');
      setOpenPaymentDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Payment recording error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    }
  };

  const handleSendReminder = async (borrower) => {
    // Implementation for sending payment reminder
    alert(`Reminder sent to ${borrower.name} for ₹${borrower.nextEmiAmount}`);
  };

  const handleAddLoan = async () => {
    try {
      console.log('Starting loan creation process...');
      console.log('Loan form data:', loanForm);
      
      // First, create or get the lender
      let lenderId;
      
      // Check if lender exists
      console.log('Fetching existing lenders...');
      const lendersResponse = await api.get('/lenders');
      
      console.log('Lenders response:', lendersResponse.data);
      
      const existingLender = lendersResponse.data.data.find(
        l => l.lenderName === loanForm.lenderName
      );
      
      if (existingLender) {
        lenderId = existingLender._id;
        console.log('Using existing lender:', lenderId);
      } else {
        // Create new lender
        console.log('Creating new lender...');
        const lenderResponse = await api.post('/lenders', {
          lenderName: loanForm.lenderName,
          lenderType: 'Individual',
          contactEmail: '',
          contactPhone: '',
          defaultInterestRate: loanForm.interestRate,
          defaultInterestType: loanForm.interestType,
          status: 'Active'
        });
        lenderId = lenderResponse.data.data._id;
        console.log('Created new lender:', lenderId);
      }
      
      // Now create the loan with lenderId
      const loanData = {
        lenderId,
        borrowerName: loanForm.borrowerName,
        borrowerPhone: loanForm.borrowerPhone,
        borrowerEmail: loanForm.borrowerEmail,
        principalAmount: parseFloat(loanForm.principalAmount),
        interestRate: parseFloat(loanForm.interestRate),
        interestType: loanForm.interestType,
        tenure: parseInt(loanForm.tenure),
        disbursementDate: loanForm.disbursementDate,
        firstEmiDate: loanForm.firstEmiDate
      };
      
      console.log('Creating loan with data:', loanData);
      
      const loanResponse = await api.post('/lender-loans', loanData);
      
      console.log('Loan created successfully:', loanResponse.data);
      
      setOpenAddLoanDialog(false);
      setLoanForm({
        lenderName: 'Self',
        borrowerName: '',
        borrowerPhone: '',
        borrowerEmail: '',
        principalAmount: '',
        interestRate: 12,
        interestType: 'Reducing',
        tenure: 12,
        disbursementDate: new Date().toISOString().split('T')[0],
        firstEmiDate: addMonths(new Date(), 1).toISOString().split('T')[0],
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Error adding loan:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to add loan');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'success',
      'Overdue': 'error',
      'Completed': 'info',
      'Defaulted': 'error',
    };
    return colors[status] || 'default';
  };

  const getRiskColor = (days) => {
    if (days <= 7) return 'success';
    if (days <= 15) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <MainLayout title="Lender Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Lender Dashboard">
        <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDashboardData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
      </MainLayout>
    );
  }

  const { stats, recentLoans, overdueLoans, upcomingEmis, lenderDistribution, monthlyTrends } = dashboardData || {};

  // Filter and sort borrowers
  const allBorrowers = [...(recentLoans || []), ...(overdueLoans || []), ...(upcomingEmis || [])];
  const uniqueBorrowers = allBorrowers.reduce((acc, loan) => {
    const existing = acc.find(b => b.borrowerName === loan.borrowerName);
    if (!existing) {
      acc.push({
        name: loan.borrowerName,
        phone: loan.borrowerPhone,
        email: loan.borrowerEmail,
        loanId: loan._id,
        principal: loan.principalAmount,
        outstanding: loan.outstandingAmount,
        nextEmiDate: loan.nextEmiDate,
        nextEmiAmount: loan.nextEmiAmount || loan.emiAmount,
        status: loan.status,
        overdueDays: loan.overdueDays || 0,
        totalPaid: loan.amountRepaid,
        interestRate: loan.interestRate,
        roi: ((loan.totalInterest / loan.principalAmount) * 100).toFixed(2),
        loanNumber: loan.loanNumber,
        tenure: loan.tenure,
        emispaid: loan.totalEmisPaid,
        emisRemaining: loan.totalEmisRemaining,
      });
    }
    return acc;
  }, []);

  const filteredBorrowers = uniqueBorrowers
    .filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           b.phone.includes(searchQuery);
      const matchesFilter = filterStatus === 'all' || b.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'dueDate') return new Date(a.nextEmiDate) - new Date(b.nextEmiDate);
      if (sortBy === 'amount') return b.outstanding - a.outstanding;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <MainLayout title="Lender Dashboard">
    <Box sx={{ pb: isMobile ? 10 : 4, bgcolor: isDark ? '#0f172a' : 'transparent', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ mt: isMobile ? 2 : 4 }}>
        {/* Mobile Header */}
        {isMobile && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Lender Dashboard
            </Typography>
            <Box display="flex" gap={1} overflow="auto" pb={1}>
              <Chip 
                label={`${stats?.activeLoanCount || 0} Active`}
                color="success"
                size="small"
              />
              <Chip 
                label={`${overdueLoans?.length || 0} Overdue`}
                color="error"
                size="small"
              />
              <Chip 
                label={`${upcomingEmis?.length || 0} Upcoming`}
                color="warning"
                size="small"
              />
            </Box>
          </Box>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: isDark ? '#f1f5f9' : 'inherit' }}>
                Lender Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: subTextColor }}>
                Manage your loans and borrowers efficiently
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenAddLoanDialog(true)}
              >
                New Loan
              </Button>
              <Button
                variant="outlined"
                startIcon={<Payment />}
                onClick={() => setOpenPaymentDialog(true)}
              >
                Record Payment
              </Button>
              <IconButton onClick={fetchDashboardData} color="primary">
                <Refresh />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* KPI Cards - Mobile Optimized */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 2, md: 3 },
          mb: { xs: 3, md: 4 }
        }}>
          <Card sx={{ ...mobileCardStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                  Total Lent
                </Typography>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" sx={{ my: 0.5 }}>
                  {formatCurrency(stats?.totalAmountLent)}
                </Typography>
                <Typography variant="caption">
                  {stats?.totalLoanCount || 0} loans
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ ...mobileCardStyle, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                  Outstanding
                </Typography>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" sx={{ my: 0.5 }}>
                    {formatCurrency(stats?.totalOutstanding)}
                  </Typography>
                  <Typography variant="caption">
                    {stats?.activeLoanCount || 0} active
                  </Typography>
                </Box>
              </CardContent>
            </Card>

          <Card sx={{ ...mobileCardStyle, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                  Interest Earned
                </Typography>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" sx={{ my: 0.5 }}>
                  {formatCurrency(stats?.totalInterestEarned)}
                </Typography>
                <Typography variant="caption">
                  ROI: {stats?.roi || 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ ...mobileCardStyle, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                  Collection Rate
                </Typography>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" sx={{ my: 0.5 }}>
                  {stats?.collectionRate || 0}%
                </Typography>
                <Typography variant="caption">
                  Default: {stats?.defaultRate || 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Search and Filter Bar - Mobile Optimized */}
        <Card sx={{ mb: 3, p: 2, ...cardSx }}>
          <Stack direction={isMobile ? "column" : "row"} spacing={2}>
            <TextField
              fullWidth
              size={isMobile ? "medium" : "small"}
              placeholder="Search borrower name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            {!isMobile && (
              <>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Overdue">Overdue</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="dueDate">Due Date</MenuItem>
                    <MenuItem value="amount">Outstanding</MenuItem>
                    <MenuItem value="name">Name</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            {isMobile && (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setFilterDrawerOpen(true)}
              >
                Filters & Sort
              </Button>
            )}
          </Stack>
        </Card>

        {/* Borrowers List - Mobile First Design */}
        {/* Borrower Cards Grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: { xs: 2, md: 3 }
        }}>
          {filteredBorrowers.map((borrower, index) => (
            <Card 
              key={index}
              sx={{ 
                ...mobileCardStyle,
                ...cardSx,
                cursor: 'pointer',
                '&:hover': { boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)' }
              }}
              onClick={() => {
                setSelectedBorrower(borrower);
                setBorrowerDrawerOpen(true);
              }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                {/* Borrower Header */}
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: isMobile ? 40 : 48, height: isMobile ? 40 : 48 }}>
                      {borrower.name.charAt(0)}
                    </Avatar>
                      <Box>
                        <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                          {borrower.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {borrower.loanNumber}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={borrower.status}
                      color={getStatusColor(borrower.status)}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Key Metrics */}
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Outstanding
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="error.main">
                        {formatCurrency(borrower.outstanding)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Next EMI
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        {formatCurrency(borrower.nextEmiAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {borrower.nextEmiDate ? format(new Date(borrower.nextEmiDate), 'dd MMM yyyy') : 'N/A'}
                      </Typography>
                      {borrower.overdueDays > 0 && (
                        <Chip 
                          label={`${borrower.overdueDays}d overdue`}
                          color="error"
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ROI
                      </Typography>
                      <Typography variant="body2" fontWeight="600" color="primary.main">
                        {borrower.roi}%
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption">
                        Payment Progress
                      </Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {borrower.emispaid || 0}/{borrower.tenure || 0} EMIs
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={((borrower.emispaid || 0) / (borrower.tenure || 1)) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {/* Quick Actions */}
                  <Box display="flex" gap={1} mt={2}>
                    <Button
                      fullWidth
                      size="small"
                      variant="contained"
                      startIcon={<Payment />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentForm({ ...paymentForm, loanId: borrower.loanId });
                        setOpenPaymentDialog(true);
                      }}
                    >
                      Record
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      startIcon={<Send />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReminder(borrower);
                      }}
                    >
                      Remind
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `tel:${borrower.phone}`;
                      }}
                    >
                      <Phone />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
          ))}
        </Box>

        {/* Empty State */}
        {filteredBorrowers.length === 0 && (
          <Card sx={{ textAlign: 'center', py: 6, ...cardSx }}>
            <AccountBalanceWallet sx={{ fontSize: 80, color: subTextColor, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No borrowers found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first loan to get started'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenAddLoanDialog(true)}
            >
              Add New Loan
            </Button>
          </Card>
        )}

        {/* Charts Section - Collapsible on Mobile */}
        {!isMobile && stats && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" fontWeight="bold" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ fontSize: 28 }} />
              Analytics & Insights
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
              {/* Portfolio Distribution */}
              <Card sx={{ p: 3, ...cardSx }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Portfolio Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Outstanding', value: stats.totalOutstanding || 0, fill: '#ef4444' },
                        { name: 'Repaid', value: stats.totalRepaid || 0, fill: '#22c55e' },
                        { name: 'Interest Earned', value: stats.totalInterestEarned || 0, fill: '#3b82f6' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {[
                        { name: 'Outstanding', value: stats.totalOutstanding || 0, fill: '#ef4444' },
                        { name: 'Repaid', value: stats.totalRepaid || 0, fill: '#22c55e' },
                        { name: 'Interest Earned', value: stats.totalInterestEarned || 0, fill: '#3b82f6' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Loan Status Breakdown */}
              <Card sx={{ p: 3, ...cardSx }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Loan Status Overview
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { status: 'Active', count: stats.activeLoanCount || 0, fill: '#3b82f6' },
                      { status: 'Completed', count: stats.completedLoanCount || 0, fill: '#22c55e' },
                      { status: 'Defaulted', count: stats.defaultedLoanCount || 0, fill: '#ef4444' },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {[
                        { status: 'Active', count: stats.activeLoanCount || 0, fill: '#3b82f6' },
                        { status: 'Completed', count: stats.completedLoanCount || 0, fill: '#22c55e' },
                        { status: 'Defaulted', count: stats.defaultedLoanCount || 0, fill: '#ef4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
              {/* Interest vs Principal */}
              <Card sx={{ p: 3, ...cardSx }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Interest vs Principal Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={[
                      { name: 'Portfolio', Principal: stats.totalAmountLent || 0, Interest: stats.totalInterestEarned || 0 }
                    ]}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Principal" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                    <Area type="monotone" dataKey="Interest" stackId="1" stroke="#ec4899" fill="#ec4899" />
                  </AreaChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Principal</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {formatCurrency(stats.totalAmountLent)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Interest</Typography>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#ec4899' }}>
                      {formatCurrency(stats.totalInterestEarned)}
                    </Typography>
                  </Box>
                </Box>
              </Card>

              {/* Collection Performance */}
              <Card sx={{ p: 3, ...cardSx }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Collection Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="20%"
                    outerRadius="90%"
                    data={[
                      { 
                        name: 'Collection Rate', 
                        value: parseFloat(stats.collectionRate) || 0, 
                        fill: parseFloat(stats.collectionRate) > 80 ? '#22c55e' : parseFloat(stats.collectionRate) > 60 ? '#f59e0b' : '#ef4444'
                      }
                    ]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      minAngle={15}
                      background
                      clockWise
                      dataKey="value"
                      cornerRadius={10}
                    />
                    <Legend 
                      iconSize={10}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                    <RechartsTooltip 
                      formatter={(value) => `${value}%`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Collection</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {stats.collectionRate}%
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Default</Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {stats.defaultRate}%
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">ROI</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      {stats.roi}%
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Box>

            {/* Borrower-wise Performance */}
            {filteredBorrowers.length > 0 && (
              <Card sx={{ p: 3, ...cardSx }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Top Borrowers by Outstanding Amount
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={filteredBorrowers
                      .slice(0, 10)
                      .sort((a, b) => b.outstanding - a.outstanding)
                      .map(b => ({
                        name: b.name.split(' ')[0], // First name only for space
                        Outstanding: b.outstanding,
                        Repaid: b.totalPaid,
                      }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar dataKey="Outstanding" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Repaid" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Monthly Trend (if we have loan data with dates) */}
            {filteredBorrowers.length > 0 && (
              <Card sx={{ p: 3, mt: 3, ...cardSx }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Payment Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { 
                        category: 'On Time', 
                        count: filteredBorrowers.filter(b => b.overdueDays === 0).length,
                        fill: '#22c55e'
                      },
                      { 
                        category: '1-7 Days', 
                        count: filteredBorrowers.filter(b => b.overdueDays > 0 && b.overdueDays <= 7).length,
                        fill: '#f59e0b'
                      },
                      { 
                        category: '8-30 Days', 
                        count: filteredBorrowers.filter(b => b.overdueDays > 7 && b.overdueDays <= 30).length,
                        fill: '#ef4444'
                      },
                      { 
                        category: '30+ Days', 
                        count: filteredBorrowers.filter(b => b.overdueDays > 30).length,
                        fill: '#991b1b'
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {[
                        { category: 'On Time', count: filteredBorrowers.filter(b => b.overdueDays === 0).length, fill: '#22c55e' },
                        { category: '1-7 Days', count: filteredBorrowers.filter(b => b.overdueDays > 0 && b.overdueDays <= 7).length, fill: '#f59e0b' },
                        { category: '8-30 Days', count: filteredBorrowers.filter(b => b.overdueDays > 7 && b.overdueDays <= 30).length, fill: '#ef4444' },
                        { category: '30+ Days', count: filteredBorrowers.filter(b => b.overdueDays > 30).length, fill: '#991b1b' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </Box>
        )}
      </Container>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, bgcolor: isDark ? '#1e293b' : '#fff' }} elevation={3}>
          <BottomNavigation
            value={mobileView}
            onChange={(event, newValue) => setMobileView(newValue)}
          >
            <BottomNavigationAction 
              label="Borrowers" 
              value="borrowers" 
              icon={<People />} 
            />
            <BottomNavigationAction 
              label="Analytics" 
              value="analytics" 
              icon={<Assessment />} 
            />
            <BottomNavigationAction 
              label="Actions" 
              value="actions" 
              icon={<Add />} 
            />
          </BottomNavigation>
        </Paper>
      )}

      {/* Mobile FAB for Quick Actions */}
      {isMobile && mobileView === 'borrowers' && (
        <SpeedDial
          ariaLabel="Quick actions"
          sx={{ position: 'fixed', bottom: 70, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<Add />}
            tooltipTitle="New Loan"
            onClick={() => setOpenAddLoanDialog(true)}
          />
          <SpeedDialAction
            icon={<Payment />}
            tooltipTitle="Record Payment"
            onClick={() => setOpenPaymentDialog(true)}
          />
          <SpeedDialAction
            icon={<Refresh />}
            tooltipTitle="Refresh"
            onClick={fetchDashboardData}
          />
        </SpeedDial>
      )}

      {/* Borrower Detail Drawer - Mobile */}
      <SwipeableDrawer
        anchor="bottom"
        open={borrowerDrawerOpen}
        onClose={() => setBorrowerDrawerOpen(false)}
        onOpen={() => setBorrowerDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            height: '85vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            bgcolor: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : 'inherit',
          },
        }}
      >
        {selectedBorrower && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="bold">
                Borrower Details
              </Typography>
              <IconButton onClick={() => setBorrowerDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>

            {/* Borrower Info */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, fontSize: 24 }}>
                {selectedBorrower.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedBorrower.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBorrower.phone}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBorrower.email}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Loan Details in Accordion */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight="bold">Loan Summary</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Loan Number:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedBorrower.loanNumber}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Principal:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(selectedBorrower.principal)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Outstanding:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">
                      {formatCurrency(selectedBorrower.outstanding)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Paid:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {formatCurrency(selectedBorrower.totalPaid)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Interest Rate:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedBorrower.interestRate}% p.a.
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">ROI:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      {selectedBorrower.roi}%
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight="bold">EMI Schedule</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Next EMI Date:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedBorrower.nextEmiDate ? format(new Date(selectedBorrower.nextEmiDate), 'dd MMM yyyy') : 'N/A'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Next EMI Amount:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(selectedBorrower.nextEmiAmount)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">EMIs Paid:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedBorrower.emispaid || 0} / {selectedBorrower.tenure || 0}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">EMIs Remaining:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedBorrower.emisRemaining || 0}
                    </Typography>
                  </Box>
                  {selectedBorrower.overdueDays > 0 && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {selectedBorrower.overdueDays} days overdue
                    </Alert>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Quick Actions */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Payment />}
                onClick={() => {
                  setPaymentForm({ ...paymentForm, loanId: selectedBorrower.loanId });
                  setBorrowerDrawerOpen(false);
                  setOpenPaymentDialog(true);
                }}
              >
                Record Payment
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Send />}
                onClick={() => {
                  handleSendReminder(selectedBorrower);
                  setBorrowerDrawerOpen(false);
                }}
              >
                Send Reminder
              </Button>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={<Phone />}
                href={`tel:${selectedBorrower.phone}`}
              >
                Call
              </Button>
              <Button
                fullWidth
                variant="text"
                startIcon={<Email />}
                href={`mailto:${selectedBorrower.email}`}
              >
                Email
              </Button>
            </Box>
          </Box>
        )}
      </SwipeableDrawer>

      {/* Filter Drawer - Mobile */}
      <Drawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            p: 3,
            bgcolor: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : 'inherit',
          },
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={3}>
          Filters & Sort
        </Typography>
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="dueDate">Due Date</MenuItem>
              <MenuItem value="amount">Outstanding Amount</MenuItem>
              <MenuItem value="name">Borrower Name</MenuItem>
            </Select>
          </FormControl>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setFilterDrawerOpen(false)}
          >
            Apply Filters
          </Button>
        </Stack>
      </Drawer>

      {/* Add Loan Dialog */}
      <Dialog 
        open={openAddLoanDialog} 
        onClose={() => setOpenAddLoanDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        sx={dialogSx}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Loan</Typography>
            {isMobile && (
              <IconButton onClick={() => setOpenAddLoanDialog(false)}>
                <Close />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Borrower Name"
              value={loanForm.borrowerName}
              onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Borrower Phone"
              value={loanForm.borrowerPhone}
              onChange={(e) => setLoanForm({ ...loanForm, borrowerPhone: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Borrower Email"
              type="email"
              value={loanForm.borrowerEmail}
              onChange={(e) => setLoanForm({ ...loanForm, borrowerEmail: e.target.value })}
            />
            <TextField
              fullWidth
              label="Loan Amount (₹)"
              type="number"
              value={loanForm.principalAmount}
              onChange={(e) => setLoanForm({ ...loanForm, principalAmount: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Interest Rate (%)"
              type="number"
              value={loanForm.interestRate}
              onChange={(e) => setLoanForm({ ...loanForm, interestRate: parseFloat(e.target.value) })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Interest Type</InputLabel>
              <Select
                value={loanForm.interestType}
                onChange={(e) => setLoanForm({ ...loanForm, interestType: e.target.value })}
                label="Interest Type"
              >
                <MenuItem value="Simple">Simple</MenuItem>
                <MenuItem value="Reducing">Reducing (EMI)</MenuItem>
                <MenuItem value="Flat">Flat</MenuItem>
                <MenuItem value="Rupee_per_100">₹ per 100/month (Rupee Interest)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Tenure (months)"
              type="number"
              value={loanForm.tenure}
              onChange={(e) => setLoanForm({ ...loanForm, tenure: parseInt(e.target.value) })}
              required
            />
            <TextField
              fullWidth
              label="Disbursement Date"
              type="date"
              value={loanForm.disbursementDate}
              onChange={(e) => setLoanForm({ ...loanForm, disbursementDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="First EMI Date"
              type="date"
              value={loanForm.firstEmiDate}
              onChange={(e) => setLoanForm({ ...loanForm, firstEmiDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          {!isMobile && (
            <Button onClick={() => setOpenAddLoanDialog(false)}>
              Cancel
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={handleAddLoan}
            fullWidth={isMobile}
          >
            Add Loan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog 
        open={openPaymentDialog} 
        onClose={() => setOpenPaymentDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        sx={dialogSx}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Record Payment</Typography>
            {isMobile && (
              <IconButton onClick={() => setOpenPaymentDialog(false)}>
                <Close />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Payment Amount (₹)"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                label="Payment Method"
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          {!isMobile && (
            <Button onClick={() => setOpenPaymentDialog(false)}>
              Cancel
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={handleRecordPayment}
            fullWidth={isMobile}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </MainLayout>
  );
};

export default LenderDashboardEnhanced;
