import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon,
  CompareArrows as CompareIcon,
  AutoGraph as AutoGraphIcon
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function NetWorthTracker() {
  const [activeTab, setActiveTab] = useState(0);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [history, setHistory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const [snapshotData, setSnapshotData] = useState({
    assets: {
      cash: 0,
      bankSavings: 0,
      bankCurrent: 0,
      stocks: 0,
      mutualFunds: 0,
      crypto: 0,
      bonds: 0,
      gold: 0,
      fixedDeposits: 0,
      ppf: 0,
      nps: 0,
      epf: 0,
      primaryHome: 0,
      rentalProperty: 0,
      land: 0,
      vehicles: 0,
      businessValue: 0,
      loansGiven: 0,
      otherAssets: 0
    },
    liabilities: {
      homeLoan: 0,
      carLoan: 0,
      personalLoan: 0,
      educationLoan: 0,
      businessLoan: 0,
      creditCardDues: 0,
      emiOutstanding: 0,
      personalDebts: 0,
      otherLiabilities: 0
    },
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [latestRes, historyRes, trendRes, comparisonRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/networth/latest`, { headers }).catch(() => ({ data: { data: null } })),
        axios.get(`${import.meta.env.VITE_API_URL}/api/networth/history?months=12`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL}/api/networth/trend?period=monthly&count=12`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL}/api/networth/comparison`, { headers }).catch(() => ({ data: { data: null } }))
      ]);

      setLatestSnapshot(latestRes.data.data);
      setHistory(historyRes.data.data || []);
      setTrend(trendRes.data.data || []);
      setComparison(comparisonRes.data.data);
    } catch (error) {
      console.error('Error fetching net worth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/networth/auto-generate`,
        { period: 'monthly' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      console.error('Error auto-generating snapshot:', error);
      alert('Failed to auto-generate snapshot. Please create manually.');
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/networth/snapshot`,
        snapshotData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpenDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating snapshot:', error);
    }
  };

  const resetForm = () => {
    setSnapshotData({
      assets: {
        cash: 0,
        bankSavings: 0,
        bankCurrent: 0,
        stocks: 0,
        mutualFunds: 0,
        crypto: 0,
        bonds: 0,
        gold: 0,
        fixedDeposits: 0,
        ppf: 0,
        nps: 0,
        epf: 0,
        primaryHome: 0,
        rentalProperty: 0,
        land: 0,
        vehicles: 0,
        businessValue: 0,
        loansGiven: 0,
        otherAssets: 0
      },
      liabilities: {
        homeLoan: 0,
        carLoan: 0,
        personalLoan: 0,
        educationLoan: 0,
        businessLoan: 0,
        creditCardDues: 0,
        emiOutstanding: 0,
        personalDebts: 0,
        otherLiabilities: 0
      },
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatNumber = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value}`;
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>Loading net worth data...</Typography>
      </Container>
    );
  }

  if (!latestSnapshot) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <AccountBalanceIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Start Tracking Your Net Worth
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create your first net worth snapshot to begin tracking your financial journey
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AutoGraphIcon />}
            onClick={handleAutoGenerate}
          >
            Auto-Generate from Data
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Manually
          </Button>
        </Box>
      </Container>
    );
  }

  const allocationData = latestSnapshot.assetAllocation ? [
    { name: 'Liquid Assets', value: latestSnapshot.assetAllocation.liquidAssets },
    { name: 'Investments', value: latestSnapshot.assetAllocation.investments },
    { name: 'Real Estate', value: latestSnapshot.assetAllocation.realEstate },
    { name: 'Other', value: latestSnapshot.assetAllocation.otherAssets }
  ] : [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Net Worth Tracker
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AutoGraphIcon />}
            onClick={handleAutoGenerate}
          >
            Auto-Generate
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Snapshot
          </Button>
        </Box>
      </Box>

      {/* Current Net Worth Display */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Typography variant="h6" gutterBottom>
          Current Net Worth
        </Typography>
        <Typography variant="h2" fontWeight="bold" gutterBottom>
          {formatCurrency(latestSnapshot.netWorth)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Total Assets
            </Typography>
            <Typography variant="h6">
              {formatCurrency(latestSnapshot.assets?.totalAssets || 0)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Total Liabilities
            </Typography>
            <Typography variant="h6">
              {formatCurrency(latestSnapshot.liabilities?.totalLiabilities || 0)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Last Updated
            </Typography>
            <Typography variant="h6">
              {new Date(latestSnapshot.date).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Debt-to-Asset Ratio
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {(latestSnapshot.metrics?.debtToAssetRatio * 100 || 0).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {latestSnapshot.metrics?.debtToAssetRatio < 0.3 ? 'Excellent' : 
                 latestSnapshot.metrics?.debtToAssetRatio < 0.5 ? 'Good' : 'Needs Improvement'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Liquidity Ratio
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {(latestSnapshot.metrics?.liquidityRatio * 100 || 0).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Emergency Coverage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {comparison?.monthAgo && (
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {comparison.monthAgo.change.netWorth >= 0 ? (
                    <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  ) : (
                    <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Month Change
                  </Typography>
                </Box>
                <Typography 
                  variant="h5" 
                  fontWeight="bold"
                  color={comparison.monthAgo.change.netWorth >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(comparison.monthAgo.change.netWorth)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatPercent(parseFloat(comparison.monthAgo.change.netWorthPercent))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {comparison?.yearAgo && (
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {comparison.yearAgo.change.netWorth >= 0 ? (
                    <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  ) : (
                    <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Year Change
                  </Typography>
                </Box>
                <Typography 
                  variant="h5" 
                  fontWeight="bold"
                  color={comparison.yearAgo.change.netWorth >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(comparison.yearAgo.change.netWorth)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatPercent(parseFloat(comparison.yearAgo.change.netWorthPercent))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Asset Breakdown" />
          <Tab label="Trend Analysis" />
          <Tab label="History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Assets Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="success.main">
                Assets
              </Typography>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Typography>Liquid Assets</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(
                        (latestSnapshot.assets?.cash || 0) +
                        (latestSnapshot.assets?.bankSavings || 0) +
                        (latestSnapshot.assets?.bankCurrent || 0)
                      )}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      {latestSnapshot.assets?.cash > 0 && (
                        <TableRow>
                          <TableCell>Cash</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.cash)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.bankSavings > 0 && (
                        <TableRow>
                          <TableCell>Bank Savings</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.bankSavings)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.bankCurrent > 0 && (
                        <TableRow>
                          <TableCell>Bank Current</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.bankCurrent)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Typography>Investments</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(
                        (latestSnapshot.assets?.stocks || 0) +
                        (latestSnapshot.assets?.mutualFunds || 0) +
                        (latestSnapshot.assets?.crypto || 0) +
                        (latestSnapshot.assets?.bonds || 0) +
                        (latestSnapshot.assets?.gold || 0) +
                        (latestSnapshot.assets?.fixedDeposits || 0) +
                        (latestSnapshot.assets?.ppf || 0) +
                        (latestSnapshot.assets?.nps || 0) +
                        (latestSnapshot.assets?.epf || 0)
                      )}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      {latestSnapshot.assets?.stocks > 0 && (
                        <TableRow>
                          <TableCell>Stocks</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.stocks)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.mutualFunds > 0 && (
                        <TableRow>
                          <TableCell>Mutual Funds</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.mutualFunds)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.fixedDeposits > 0 && (
                        <TableRow>
                          <TableCell>Fixed Deposits</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.fixedDeposits)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.ppf > 0 && (
                        <TableRow>
                          <TableCell>PPF</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.ppf)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.nps > 0 && (
                        <TableRow>
                          <TableCell>NPS</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.nps)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.epf > 0 && (
                        <TableRow>
                          <TableCell>EPF</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.epf)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Typography>Real Estate & Others</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(
                        (latestSnapshot.assets?.primaryHome || 0) +
                        (latestSnapshot.assets?.rentalProperty || 0) +
                        (latestSnapshot.assets?.land || 0) +
                        (latestSnapshot.assets?.vehicles || 0) +
                        (latestSnapshot.assets?.businessValue || 0) +
                        (latestSnapshot.assets?.loansGiven || 0) +
                        (latestSnapshot.assets?.otherAssets || 0)
                      )}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      {latestSnapshot.assets?.primaryHome > 0 && (
                        <TableRow>
                          <TableCell>Primary Home</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.primaryHome)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.vehicles > 0 && (
                        <TableRow>
                          <TableCell>Vehicles</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.vehicles)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.assets?.businessValue > 0 && (
                        <TableRow>
                          <TableCell>Business</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.assets.businessValue)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grid>

          {/* Liabilities Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="error.main">
                Liabilities
              </Typography>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Typography>Loans</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(
                        (latestSnapshot.liabilities?.homeLoan || 0) +
                        (latestSnapshot.liabilities?.carLoan || 0) +
                        (latestSnapshot.liabilities?.personalLoan || 0) +
                        (latestSnapshot.liabilities?.educationLoan || 0) +
                        (latestSnapshot.liabilities?.businessLoan || 0)
                      )}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      {latestSnapshot.liabilities?.homeLoan > 0 && (
                        <TableRow>
                          <TableCell>Home Loan</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.liabilities.homeLoan)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.liabilities?.carLoan > 0 && (
                        <TableRow>
                          <TableCell>Car Loan</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.liabilities.carLoan)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.liabilities?.personalLoan > 0 && (
                        <TableRow>
                          <TableCell>Personal Loan</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.liabilities.personalLoan)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Typography>Other Debts</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(
                        (latestSnapshot.liabilities?.creditCardDues || 0) +
                        (latestSnapshot.liabilities?.emiOutstanding || 0) +
                        (latestSnapshot.liabilities?.personalDebts || 0) +
                        (latestSnapshot.liabilities?.otherLiabilities || 0)
                      )}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      {latestSnapshot.liabilities?.creditCardDues > 0 && (
                        <TableRow>
                          <TableCell>Credit Card Dues</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.liabilities.creditCardDues)}</TableCell>
                        </TableRow>
                      )}
                      {latestSnapshot.liabilities?.emiOutstanding > 0 && (
                        <TableRow>
                          <TableCell>EMI Outstanding</TableCell>
                          <TableCell align="right">{formatCurrency(latestSnapshot.liabilities.emiOutstanding)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grid>

          {/* Asset Allocation Chart */}
          {allocationData.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Asset Allocation
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && trend.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Net Worth Trend (Last 12 Months)
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="netWorth" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.6}
                name="Net Worth"
              />
              <Area 
                type="monotone" 
                dataKey="assets" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.6}
                name="Assets"
              />
              <Area 
                type="monotone" 
                dataKey="liabilities" 
                stroke="#ff8042" 
                fill="#ff8042" 
                fillOpacity={0.6}
                name="Liabilities"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Net Worth</TableCell>
                  <TableCell align="right">Assets</TableCell>
                  <TableCell align="right">Liabilities</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell>Period</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No historical data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((snapshot) => (
                    <TableRow key={snapshot._id} hover>
                      <TableCell>{new Date(snapshot.date).toLocaleDateString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(snapshot.netWorth)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(snapshot.assets?.totalAssets || 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(snapshot.liabilities?.totalLiabilities || 0)}</TableCell>
                      <TableCell align="right">
                        {snapshot.growth?.changeFromPrevious?.amount && (
                          <Typography
                            variant="body2"
                            color={snapshot.growth.changeFromPrevious.amount >= 0 ? 'success.main' : 'error.main'}
                          >
                            {formatCurrency(snapshot.growth.changeFromPrevious.amount)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={snapshot.period} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create Snapshot Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Net Worth Snapshot</DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Assets</Typography>
          <Grid container spacing={2}>
            {Object.keys(snapshotData.assets).map((key) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <TextField
                  fullWidth
                  type="number"
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  value={snapshotData.assets[key]}
                  onChange={(e) => setSnapshotData({
                    ...snapshotData,
                    assets: { ...snapshotData.assets, [key]: parseFloat(e.target.value) || 0 }
                  })}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Liabilities</Typography>
          <Grid container spacing={2}>
            {Object.keys(snapshotData.liabilities).map((key) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <TextField
                  fullWidth
                  type="number"
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  value={snapshotData.liabilities[key]}
                  onChange={(e) => setSnapshotData({
                    ...snapshotData,
                    liabilities: { ...snapshotData.liabilities, [key]: parseFloat(e.target.value) || 0 }
                  })}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={snapshotData.notes}
            onChange={(e) => setSnapshotData({ ...snapshotData, notes: e.target.value })}
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSnapshot} variant="contained">
            Create Snapshot
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default NetWorthTracker;
