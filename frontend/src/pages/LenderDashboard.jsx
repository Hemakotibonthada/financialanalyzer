import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import api from '../services/api';
import MainLayout from '../components/MainLayout';
import { useTheme } from '../context/ThemeContext';

// Color palette for charts (matching EMI Tracker)
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
  '& .chart-title': {
    transition: 'color 0.3s ease',
  },
  '&:hover .chart-title': {
    color: 'primary.main',
  },
  '& .chart-header': {
    transition: 'all 0.3s ease',
  },
  '&:hover .chart-header': {
    borderColor: 'primary.main',
  }
};

const LenderDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const cardSx = { bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider' };
  const subTextColor = 'text.secondary';
  const dialogSx = { '& .MuiDialog-paper': { bgcolor: 'background.paper', color: 'text.primary' } };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openAddLenderDialog, setOpenAddLenderDialog] = useState(false);
  const [openAddLoanDialog, setOpenAddLoanDialog] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null);
  
  // Form states
  const [lenderForm, setLenderForm] = useState({
    lenderName: '',
    lenderType: 'Individual',
    contactEmail: '',
    contactPhone: '',
    defaultInterestRate: 12,
    defaultInterestType: 'Simple',
    status: 'Active',
  });
  
  const [loanForm, setLoanForm] = useState({
    lenderId: '',
    borrowerName: '',
    borrowerPhone: '',
    borrowerEmail: '',
    principalAmount: '',
    interestRate: 12,
    interestType: 'Simple',
    tenure: 12,
    disbursementDate: new Date().toISOString().split('T')[0],
    firstEmiDate: new Date().toISOString().split('T')[0],
    loanPurpose: 'Personal',
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
        setError('Access denied. You need lender or admin privileges.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddLender = async () => {
    try {
      
      await api.post('/lenders', lenderForm);
      
      setOpenAddLenderDialog(false);
      setLenderForm({
        lenderName: '',
        lenderType: 'Individual',
        contactEmail: '',
        contactPhone: '',
        defaultInterestRate: 12,
        defaultInterestType: 'Simple',
        status: 'Active',
      });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add lender');
    }
  };

  const handleAddLoan = async () => {
    try {
      
      await api.post('/lender-loans', loanForm);
      
      setOpenAddLoanDialog(false);
      setLoanForm({
        lenderId: '',
        borrowerName: '',
        borrowerPhone: '',
        borrowerEmail: '',
        principalAmount: '',
        interestRate: 12,
        interestType: 'Simple',
        tenure: 12,
        disbursementDate: new Date().toISOString().split('T')[0],
        firstEmiDate: new Date().toISOString().split('T')[0],
        loanPurpose: 'Personal',
      });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add loan');
    }
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
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/')}>
            Go Back
          </Button>
        </Container>
      </MainLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MainLayout title="Lender Dashboard">
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="info">No dashboard data available</Alert>
        </Container>
      </MainLayout>
    );
  }

  const { stats, lenders, recentLoans, overdueLoans, upcomingEMIs, monthlyTrends, lenderDistribution } = dashboardData;

  // Prepare chart data
  const monthlyTrendsData = {
    labels: Object.keys(monthlyTrends),
    datasets: [
      {
        label: 'Total Collected',
        data: Object.values(monthlyTrends).map(m => m.totalCollected),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'Interest Collected',
        data: Object.values(monthlyTrends).map(m => m.interestCollected),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const lenderDistributionData = {
    labels: lenderDistribution.map(l => l.lenderName),
    datasets: [
      {
        label: 'Outstanding Amount',
        data: lenderDistribution.map(l => l.totalOutstanding),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const loanStatusData = {
    labels: ['Active', 'Completed', 'Defaulted'],
    datasets: [
      {
        data: [stats.activeLoanCount, stats.completedLoanCount, stats.defaultedLoanCount],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <MainLayout title="Lender Dashboard">
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, bgcolor: isDark ? '#0f172a' : 'transparent' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>
          Lender Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddLenderDialog(true)}
            sx={{ mr: 2 }}
          >
            Add Lender
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Add />}
            onClick={() => setOpenAddLoanDialog(true)}
            sx={{ mr: 2 }}
          >
            Add Loan
          </Button>
          <IconButton onClick={fetchDashboardData} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Amount Lent
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{(stats.totalAmountLent / 100000).toFixed(2)}L
                  </Typography>
                  <Typography variant="caption">
                    {stats.totalLoanCount} loans
                  </Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Outstanding
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{(stats.totalOutstanding / 100000).toFixed(2)}L
                  </Typography>
                  <Typography variant="caption">
                    {stats.activeLoanCount} active loans
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Interest Earned
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{(stats.totalInterestEarned / 1000).toFixed(0)}k
                  </Typography>
                  <Typography variant="caption">
                    ROI: {stats.roi}%
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Collection Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.collectionRate}%
                  </Typography>
                  <Typography variant="caption">
                    Default: {stats.defaultRate}%
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Monthly Collection Trends - Line Chart */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={0} sx={{ ...chartCardHoverEffect, bgcolor: 'background.paper', color: 'text.primary', borderColor: 'divider' }}>
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
                  variant="h6" 
                  className="chart-title"
                  sx={{ 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
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
                    <TrendingUp sx={{ fontSize: 24, color: 'white' }} />
                  </Box>
                  Monthly Collection Trends
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                  Track collection performance over time
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="#8884d8"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    stroke="#8884d8"
                  />
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                    contentStyle={{ 
                      borderRadius: 12, 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: 'none'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="line"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalCollected" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Total Collected"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="interestCollected" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Interest Collected"
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Lender Portfolio Distribution - Bar Chart */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={0} sx={{ ...chartCardHoverEffect, bgcolor: 'background.paper', color: 'text.primary', borderColor: 'divider' }}>
            <CardContent>
              <Box 
                className="chart-header"
                sx={{ 
                  pb: 2, 
                  mb: 3, 
                  borderBottom: '2px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography 
                  variant="h6" 
                  className="chart-title"
                  sx={{ 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <People sx={{ fontSize: 24, color: 'white' }} />
                  </Box>
                  Lender Portfolio Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                  Outstanding amounts by lender
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={lenderDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="lenderName" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                    contentStyle={{ 
                      borderRadius: 12, 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: 'none'
                    }}
                  />
                  <Bar 
                    dataKey="totalOutstanding" 
                    fill="#8884d8"
                    radius={[8, 8, 0, 0]}
                    name="Outstanding Amount"
                  >
                    {lenderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Loan Status Distribution - Pie Chart */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card elevation={0} sx={{ ...chartCardHoverEffect, bgcolor: 'background.paper', color: 'text.primary', borderColor: 'divider' }}>
            <CardContent>
              <Box 
                className="chart-header"
                sx={{ 
                  pb: 2, 
                  mb: 3, 
                  borderBottom: '2px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography 
                  variant="h6" 
                  className="chart-title"
                  sx={{ 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Assessment sx={{ fontSize: 24, color: 'white' }} />
                  </Box>
                  Loan Status
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: stats.activeLoanCount },
                      { name: 'Completed', value: stats.completedLoanCount },
                      { name: 'Defaulted', value: stats.defaultedLoanCount }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip 
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

        {/* Lenders Overview Table */}
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <Card sx={cardSx}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lenders Overview
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Lender</strong></TableCell>
                      <TableCell align="right"><strong>Active Loans</strong></TableCell>
                      <TableCell align="right"><strong>Outstanding</strong></TableCell>
                      <TableCell align="right"><strong>Interest Earned</strong></TableCell>
                      <TableCell align="right"><strong>ROI</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lenderDistribution.map((lender) => (
                      <TableRow key={lender.lenderId} hover>
                        <TableCell>{lender.lenderName}</TableCell>
                        <TableCell align="right">{lender.activeLoans}</TableCell>
                        <TableCell align="right">₹{lender.totalOutstanding.toLocaleString('en-IN')}</TableCell>
                        <TableCell align="right">₹{lender.interestEarned.toLocaleString('en-IN')}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${lender.roi}%`}
                            color={parseFloat(lender.roi) > 10 ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <Card sx={cardSx}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderColor: isDark ? '#334155' : 'divider', '& .MuiTab-root': { color: isDark ? '#94a3b8' : undefined }, '& .Mui-selected': { color: isDark ? '#60a5fa' : 'primary.main' }, '& .MuiTabs-indicator': { bgcolor: isDark ? '#60a5fa' : 'primary.main' } }}>
          <Tab label="Recent Loans" />
          <Tab label="Overdue Loans" />
          <Tab label="Upcoming EMIs" />
        </Tabs>

        <CardContent>
          {/* Recent Loans Tab */}
          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Loan #</strong></TableCell>
                    <TableCell><strong>Lender</strong></TableCell>
                    <TableCell><strong>Borrower</strong></TableCell>
                    <TableCell align="right"><strong>Principal</strong></TableCell>
                    <TableCell align="right"><strong>Outstanding</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Progress</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentLoans.map((loan) => (
                    <TableRow key={loan._id} hover>
                      <TableCell>{loan.loanNumber}</TableCell>
                      <TableCell>{loan.lenderId?.lenderName}</TableCell>
                      <TableCell>{loan.borrowerName}</TableCell>
                      <TableCell align="right">₹{loan.principalAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">₹{loan.outstandingAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Chip
                          label={loan.status}
                          color={
                            loan.status === 'Active' ? 'success' :
                            loan.status === 'Completed' ? 'primary' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Box width="100%" mr={1}>
                            <Box
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: isDark ? '#334155' : 'grey.200',
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${loan.completionPercentage}%`,
                                  bgcolor: 'success.main',
                                }}
                              />
                            </Box>
                          </Box>
                          <Typography variant="caption">{loan.completionPercentage}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Overdue Loans Tab */}
          {activeTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Loan #</strong></TableCell>
                    <TableCell><strong>Borrower</strong></TableCell>
                    <TableCell align="right"><strong>Overdue Amount</strong></TableCell>
                    <TableCell align="center"><strong>Days Overdue</strong></TableCell>
                    <TableCell align="right"><strong>Penalty</strong></TableCell>
                    <TableCell><strong>Risk</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overdueLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Box py={4}>
                          <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                          <Typography>No overdue loans!</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    overdueLoans.map((loan) => (
                      <TableRow key={loan._id} hover>
                        <TableCell>{loan.loanNumber}</TableCell>
                        <TableCell>{loan.borrowerName}</TableCell>
                        <TableCell align="right">₹{loan.overdueAmount.toLocaleString('en-IN')}</TableCell>
                        <TableCell align="center">
                          <Chip label={`${loan.overdueDays} days`} color="error" size="small" />
                        </TableCell>
                        <TableCell align="right">₹{loan.penaltyAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={loan.riskCategory}
                            color={
                              loan.riskCategory === 'Low Risk' ? 'success' :
                              loan.riskCategory === 'Medium Risk' ? 'warning' : 'error'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Upcoming EMIs Tab */}
          {activeTab === 2 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Loan #</strong></TableCell>
                    <TableCell><strong>Borrower</strong></TableCell>
                    <TableCell><strong>Lender</strong></TableCell>
                    <TableCell align="right"><strong>EMI Amount</strong></TableCell>
                    <TableCell><strong>Due Date</strong></TableCell>
                    <TableCell align="center"><strong>Days Until</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingEMIs.map((loan) => {
                    const daysUntil = Math.ceil((new Date(loan.nextEmiDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={loan._id} hover>
                        <TableCell>{loan.loanNumber}</TableCell>
                        <TableCell>{loan.borrowerName}</TableCell>
                        <TableCell>{loan.lenderId?.lenderName}</TableCell>
                        <TableCell align="right">₹{loan.nextEmiAmount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(loan.nextEmiDate).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${daysUntil} days`}
                            color={daysUntil <= 7 ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Lender Dialog */}
      <Dialog open={openAddLenderDialog} onClose={() => setOpenAddLenderDialog(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle>Add New Lender</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Lender Name"
              value={lenderForm.lenderName}
              onChange={(e) => setLenderForm({ ...lenderForm, lenderName: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Lender Type</InputLabel>
              <Select
                value={lenderForm.lenderType}
                onChange={(e) => setLenderForm({ ...lenderForm, lenderType: e.target.value })}
                label="Lender Type"
              >
                <MenuItem value="Individual">Individual</MenuItem>
                <MenuItem value="Financial Institution">Financial Institution</MenuItem>
                <MenuItem value="NBFC">NBFC</MenuItem>
                <MenuItem value="Bank">Bank</MenuItem>
                <MenuItem value="Private Lender">Private Lender</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Contact Email"
              type="email"
              value={lenderForm.contactEmail}
              onChange={(e) => setLenderForm({ ...lenderForm, contactEmail: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Contact Phone"
              value={lenderForm.contactPhone}
              onChange={(e) => setLenderForm({ ...lenderForm, contactPhone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Default Interest Rate (%)"
              type="number"
              value={lenderForm.defaultInterestRate}
              onChange={(e) => setLenderForm({ ...lenderForm, defaultInterestRate: parseFloat(e.target.value) })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddLenderDialog(false)}>Cancel</Button>
          <Button onClick={handleAddLender} variant="contained" color="primary">
            Add Lender
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Loan Dialog */}
      <Dialog open={openAddLoanDialog} onClose={() => setOpenAddLoanDialog(false)} maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle>Add New Loan</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Lender</InputLabel>
                  <Select
                    value={loanForm.lenderId}
                    onChange={(e) => setLoanForm({ ...loanForm, lenderId: e.target.value })}
                    label="Select Lender"
                    required
                  >
                    {lenders.map((lender) => (
                      <MenuItem key={lender._id} value={lender._id}>
                        {lender.lenderName} ({lender.lenderType})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Borrower Name"
                  value={loanForm.borrowerName}
                  onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Borrower Phone"
                  value={loanForm.borrowerPhone}
                  onChange={(e) => setLoanForm({ ...loanForm, borrowerPhone: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Principal Amount (₹)"
                  type="number"
                  value={loanForm.principalAmount}
                  onChange={(e) => setLoanForm({ ...loanForm, principalAmount: parseFloat(e.target.value) })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Interest Rate (%)"
                  type="number"
                  value={loanForm.interestRate}
                  onChange={(e) => setLoanForm({ ...loanForm, interestRate: parseFloat(e.target.value) })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Tenure (months)"
                  type="number"
                  value={loanForm.tenure}
                  onChange={(e) => setLoanForm({ ...loanForm, tenure: parseInt(e.target.value) })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Interest Type</InputLabel>
                  <Select
                    value={loanForm.interestType}
                    onChange={(e) => setLoanForm({ ...loanForm, interestType: e.target.value })}
                    label="Interest Type"
                  >
                    <MenuItem value="Simple">Simple</MenuItem>
                    <MenuItem value="Compound">Compound</MenuItem>
                    <MenuItem value="Flat">Flat</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Disbursement Date"
                  type="date"
                  value={loanForm.disbursementDate}
                  onChange={(e) => setLoanForm({ ...loanForm, disbursementDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First EMI Date"
                  type="date"
                  value={loanForm.firstEmiDate}
                  onChange={(e) => setLoanForm({ ...loanForm, firstEmiDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddLoanDialog(false)}>Cancel</Button>
          <Button onClick={handleAddLoan} variant="contained" color="primary">
            Add Loan
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </MainLayout>
  );
};

export default LenderDashboard;
