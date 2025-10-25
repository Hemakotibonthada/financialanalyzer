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
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

// Chart card hover effect
const chartCardHoverEffect = {
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
    borderTop: '4px solid',
    borderColor: 'primary.main',
    '& .chart-title': {
      color: 'primary.main',
      transform: 'translateX(8px)'
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

  useEffect(() => {
    fetchAllData();
    fetchUserProfile();
  }, [selectedPeriod]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

      // Fetch all data in parallel
      const [overviewRes, upcomingRes, chartsRes, insightsRes] = await Promise.all([
        axios.get(`${API_URL}/emi/overview`, config),
        axios.get(`${API_URL}/emi/upcoming?months=${selectedPeriod}`, config),
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

  const handleSyncStatements = async () => {
    // Check if Gmail is connected
    if (!userProfile?.gmailConnected) {
      setError('Gmail not connected. Please connect Gmail in your Profile settings first.');
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          💳 EMI Tracker
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAllData}
            disabled={loading}
            sx={{ 
              mr: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 4,
                borderWidth: 2
              }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => setSyncDialogOpen(true)}
            disabled={syncing}
            sx={{
              transition: 'all 0.3s ease',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 6,
                background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)'
              }
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Statements'}
          </Button>
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

      {/* Overview Cards */}
      {overview && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={4}
              sx={{ 
                transition: 'all 0.3s ease-in-out',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 8,
                  bgcolor: 'primary.light',
                  '& .MuiTypography-h3': {
                    transform: 'scale(1.1)',
                    transition: 'transform 0.3s ease'
                  }
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <CreditCardIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                  <Typography variant="h6" fontWeight="bold">Active EMIs</Typography>
                </Box>
                <Typography variant="h3" sx={{ transition: 'transform 0.3s ease' }}>
                  {overview.overview.totalActiveEMIs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {overview.overview.totalCompletedEMIs} completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={4}
              sx={{ 
                transition: 'all 0.3s ease-in-out',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 8,
                  bgcolor: 'error.light',
                  '& .MuiTypography-h3': {
                    transform: 'scale(1.1)',
                    transition: 'transform 0.3s ease'
                  }
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AccountBalanceIcon color="error" sx={{ mr: 1, fontSize: 32 }} />
                  <Typography variant="h6" fontWeight="bold">Outstanding</Typography>
                </Box>
                <Typography variant="h3" color="error" sx={{ transition: 'transform 0.3s ease' }}>
                  {formatCurrency(overview.overview.totalOutstanding)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total amount remaining
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={4}
              sx={{ 
                transition: 'all 0.3s ease-in-out',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 8,
                  bgcolor: 'warning.light',
                  '& .MuiTypography-h3': {
                    transform: 'scale(1.1)',
                    transition: 'transform 0.3s ease'
                  }
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon color="warning" sx={{ mr: 1, fontSize: 32 }} />
                  <Typography variant="h6" fontWeight="bold">Monthly Burden</Typography>
                </Box>
                <Typography variant="h3" color="warning.main" sx={{ transition: 'transform 0.3s ease' }}>
                  {formatCurrency(overview.overview.monthlyBurden)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Per month
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={4}
              sx={{ 
                transition: 'all 0.3s ease-in-out',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 8,
                  bgcolor: 'success.light',
                  '& .MuiTypography-h3': {
                    transform: 'scale(1.1)',
                    transition: 'transform 0.3s ease'
                  }
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 32 }} />
                  <Typography variant="h6" fontWeight="bold">Total Paid</Typography>
                </Box>
                <Typography variant="h3" color="success.main" sx={{ transition: 'transform 0.3s ease' }}>
                  {formatCurrency(overview.overview.totalAmountPaid)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  So far
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Box mb={4}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            💡 Insights & Recommendations
          </Typography>
          <Grid container spacing={2}>
            {insights.map((insight, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert
                  severity={getSeverityColor(insight.severity)}
                  icon={<InfoIcon />}
                  action={
                    insight.action && (
                      <Chip label={insight.action} size="small" />
                    )
                  }
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateX(8px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">{insight.title}</Typography>
                  <Typography variant="body2">{insight.description}</Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                color: 'primary.main'
              }
            },
            '& .Mui-selected': {
              fontWeight: 'bold'
            }
          }}
        >
          <Tab label="Overview" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Upcoming Payments" icon={<CalendarIcon />} iconPosition="start" />
          <Tab label="Active EMIs" icon={<CreditCardIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {activeTab === 0 && chartData && (
        <Grid container spacing={3} direction="column">
          {/* Pie Chart - Distribution by Provider */}
          <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
            <Card 
              elevation={3}
              sx={{
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 12,
                  borderTop: '4px solid',
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent>
                <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}>
                  📊 EMI Distribution by Card Provider
                </Typography>
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
                    >
                      {chartData.pieChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Bar Chart - Monthly Burden */}
          <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
            <Card 
              elevation={3}
              sx={{
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 12,
                  borderTop: '4px solid',
                  borderColor: 'secondary.main'
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" fontWeight="bold" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1
                  }}>
                    📈 Monthly EMI Burden
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                      <MenuItem value={3}>3 Months</MenuItem>
                      <MenuItem value={6}>6 Months</MenuItem>
                      <MenuItem value={12}>12 Months</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={chartData.barChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" name="Monthly Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

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

          {/* Area Chart - Payment Trend */}
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

          {/* Composed Chart - Multi-metric Analysis */}
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

          {/* EMI Monthly Trends Chart */}
          {upcomingPayments && upcomingPayments.monthlyBreakdown && upcomingPayments.monthlyBreakdown.length > 0 && (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
              <EMIMonthlyTrends monthlyData={upcomingPayments.monthlyBreakdown} />
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && upcomingPayments && (
        <Grid container spacing={3}>
          {/* Monthly Breakdown */}
          {upcomingPayments.monthlyBreakdown.map((month, index) => (
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
                    <Typography variant="h6">
                      {month.month}/{month.year}
                    </Typography>
                    <Chip
                      label={`${month.emiCount} EMIs`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatCurrency(month.totalAmount)}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Merchant</TableCell>
                          <TableCell>Card</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Due Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {month.emis.map((emi, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{emi.merchantName}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${emi.cardProvider} ${emi.cardLastFourDigits}`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">{formatCurrency(emi.amount)}</TableCell>
                            <TableCell align="right">{formatDate(emi.dueDate)}</TableCell>
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
      )}

      {activeTab === 2 && overview && (
        <Grid container spacing={3}>
          {overview.activeEMIs.map((emi) => (
            <Grid item xs={12} md={6} lg={4} key={emi.id}>
              <Card 
                elevation={3}
                sx={{
                  transition: 'all 0.3s ease',
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
                    <Box>
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
                    <Typography variant="caption" color="text.secondary">
                      {emi.interestRate}% Interest
                    </Typography>
                  </Box>

                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatCurrency(emi.emiAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Per month
                  </Typography>

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
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
    </Container>
  );
};

export default EMITracker;
