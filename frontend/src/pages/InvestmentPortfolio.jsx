import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_URL } from '../services/api';
import Sidebar from '../components/Sidebar';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'rd', label: 'Recurring Deposit' },
  { value: 'bond', label: 'Bond' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'gold', label: 'Gold' },
  { value: 'etf', label: 'ETF' },
  { value: 'sip', label: 'SIP' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'ppf', label: 'PPF' },
  { value: 'nps', label: 'NPS' },
  { value: 'elss', label: 'ELSS' },
  { value: 'other', label: 'Other' }
];

const CATEGORIES = ['equity', 'debt', 'hybrid', 'commodity', 'real_estate', 'crypto', 'other'];
const RISK_LEVELS = ['low', 'medium', 'high'];

function InvestmentPortfolio() {
  const [activeTab, setActiveTab] = useState(0);
  const [investments, setInvestments] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [maturities, setMaturities] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sortBy: 'currentValue',
    order: 'desc'
  });

  const [formData, setFormData] = useState({
    type: 'stock',
    name: '',
    symbol: '',
    quantity: '',
    purchasePrice: '',
    currentPrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    category: 'equity',
    riskLevel: 'medium',
    maturityDate: '',
    sipAmount: '',
    sipFrequency: 'monthly',
    sipStartDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [investmentsRes, portfolioRes, maturitiesRes, allocationRes] = await Promise.all([
  axios.get(`${API_URL}/investments`, {
          headers,
          params: filters
        }),
        axios.get(`${API_URL}/investments/portfolio`, { headers }),
        axios.get(`${API_URL}/investments/maturities?days=90`, { headers }),
        axios.get(`${API_URL}/investments/analytics/allocation`, { headers })
      ]);
      
      // Debug: log investment fetch shapes and API host
      // eslint-disable-next-line no-console
      console.debug('InvestmentPortfolio fetch - API_URL:', API_URL, {
        investments: investmentsRes.data?.data?.length ?? 0,
        portfolio: portfolioRes.data?.data ? Object.keys(portfolioRes.data.data).length : 0,
        maturities: maturitiesRes.data?.data?.length ?? 0
      });

      setInvestments(investmentsRes.data.data || []);
      setPortfolio(portfolioRes.data.data || {});
      setMaturities(maturitiesRes.data.data || []);
      setAllocation(allocationRes.data.data || {});
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestment = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingInvestment) {
        await axios.put(
          `${API_URL}/investments/${editingInvestment._id}`,
          formData,
          { headers }
        );
      } else {
        await axios.post(
          `${API_URL}/investments`,
          formData,
          { headers }
        );
      }

      setOpenAddDialog(false);
      setEditingInvestment(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving investment:', error);
    }
  };

  const handleDeleteInvestment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) return;

    try {
      const token = localStorage.getItem('token');
  await axios.delete(`${API_URL}/investments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting investment:', error);
    }
  };

  const handleEditInvestment = (investment) => {
    setEditingInvestment(investment);
    setFormData({
      type: investment.type,
      name: investment.name,
      symbol: investment.symbol || '',
      quantity: investment.quantity,
      purchasePrice: investment.purchasePrice,
      currentPrice: investment.currentPrice,
      purchaseDate: investment.purchaseDate?.split('T')[0],
      category: investment.category,
      riskLevel: investment.riskLevel,
      maturityDate: investment.maturityDate?.split('T')[0] || '',
      sipAmount: investment.sipAmount || '',
      sipFrequency: investment.sipFrequency || 'monthly',
      sipStartDate: investment.sipStartDate?.split('T')[0] || '',
      notes: investment.notes || ''
    });
    setOpenAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'stock',
      name: '',
      symbol: '',
      quantity: '',
      purchasePrice: '',
      currentPrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      category: 'equity',
      riskLevel: 'medium',
      maturityDate: '',
      sipAmount: '',
      sipFrequency: 'monthly',
      sipStartDate: '',
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

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      matured: 'info',
      sold: 'default'
    };
    return colors[status] || 'default';
  };

  const getRiskColor = (risk) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error'
    };
    return colors[risk] || 'default';
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <Box className="lg:ml-72 min-h-screen bg-gray-50 flex items-center justify-center">
          <Typography>Loading portfolio...</Typography>
        </Box>
      </>
    );
  }

  const totalInvested = portfolio?.totalInvested || 0;
  const currentValue = portfolio?.currentValue || 0;
  const totalReturns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  return (
    <>
      <Sidebar />
      <Box className="lg:ml-72 min-h-screen bg-gray-50 pb-8">
        {/* Enhanced Header with Gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 0,
            p: 4,
            mb: 3,
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
          }}
        >
          <Container maxWidth="xl">
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography 
                  variant="h3" 
                  sx={{
                    fontWeight: 800,
                    color: 'white',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  📊 Investment Portfolio
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Track and manage your investment portfolio with advanced analytics
                </Typography>
              </Box>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Export
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetForm();
                    setOpenAddDialog(true);
                  }}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                  }}
                >
                  Add Investment
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl">
          {/* Enhanced Summary Cards with Gradients */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Total Invested
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalInvested)}
                      </Typography>
                    </Box>
                    <AccountBalanceIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Current Value
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(currentValue)}
                      </Typography>
                    </Box>
                    <ShowChartIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: totalReturns >= 0 
                  ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                  : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Total Returns
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalReturns)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {returnsPercentage >= 0 ? '+' : ''}{returnsPercentage.toFixed(2)}%
                      </Typography>
                    </Box>
                    {totalReturns >= 0 ? (
                      <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                    ) : (
                      <TrendingDownIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Total Assets
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {investments.length}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {INVESTMENT_TYPES.length} Types
                      </Typography>
                    </Box>
                    <AssessmentIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Holdings" />
              <Tab label="Asset Allocation" />
              <Tab label="Performance" />
              <Tab label="Upcoming Maturities" />
              <Tab label="🤖 Portfolio Optimizer" />
            </Tabs>
          </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper>
          {/* Filters */}
          <Box sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid #e0e0e0' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">All Types</MenuItem>
                {INVESTMENT_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="matured">Matured</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                label="Sort By"
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              >
                <MenuItem value="currentValue">Current Value</MenuItem>
                <MenuItem value="returnPercentage">Returns %</MenuItem>
                <MenuItem value="purchaseDate">Purchase Date</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Holdings Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Invested</TableCell>
                  <TableCell align="right">Current Value</TableCell>
                  <TableCell align="right">Returns</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {investments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No investments found. Add your first investment to get started!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  investments.map((investment) => (
                    <TableRow key={investment._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {investment.name}
                        </Typography>
                        {investment.symbol && (
                          <Typography variant="caption" color="text.secondary">
                            {investment.symbol}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={INVESTMENT_TYPES.find(t => t.value === investment.type)?.label || investment.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{investment.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(investment.totalInvestedAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(investment.currentValue)}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2"
                          color={investment.returnPercentage >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {formatPercent(investment.returnPercentage)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(investment.absoluteReturn)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={investment.status}
                          size="small"
                          color={getStatusColor(investment.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={investment.riskLevel}
                          size="small"
                          color={getRiskColor(investment.riskLevel)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditInvestment(investment)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteInvestment(investment._id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 1 && allocation && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                By Investment Type
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(allocation.byType || {}).map(([key, value]) => ({
                      name: INVESTMENT_TYPES.find(t => t.value === key)?.label || key,
                      value: value.value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(allocation.byType || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                By Risk Level
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(allocation.byRisk || {}).map(([key, value]) => ({
                      name: key.charAt(0).toUpperCase() + key.slice(1),
                      value: value.value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}%`}
                    outerRadius={80}
                    fill="#82ca9d"
                    dataKey="value"
                  >
                    {Object.keys(allocation.byRisk || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && portfolio && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="success.main">
                Top Performers
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Returns</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {portfolio.topPerformers?.slice(0, 5).map((inv) => (
                      <TableRow key={inv._id}>
                        <TableCell>{inv.name}</TableCell>
                        <TableCell align="right">
                          <Typography color="success.main" fontWeight="bold">
                            {formatPercent(inv.returnPercentage)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="error.main">
                Underperformers
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Returns</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {portfolio.worstPerformers?.slice(0, 5).map((inv) => (
                      <TableRow key={inv._id}>
                        <TableCell>{inv.name}</TableCell>
                        <TableCell align="right">
                          <Typography color="error.main" fontWeight="bold">
                            {formatPercent(inv.returnPercentage)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Maturity Amount</TableCell>
                  <TableCell>Maturity Date</TableCell>
                  <TableCell align="right">Days Until Maturity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maturities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No upcoming maturities in the next 90 days
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  maturities.map((maturity) => (
                    <TableRow key={maturity._id}>
                      <TableCell>{maturity.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={INVESTMENT_TYPES.find(t => t.value === maturity.type)?.label || maturity.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(maturity.maturityAmount)}</TableCell>
                      <TableCell>{new Date(maturity.maturityDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${maturity.daysUntilMaturity} days`}
                          size="small"
                          color={maturity.daysUntilMaturity <= 30 ? 'error' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Portfolio Optimizer Tab */}
      {activeTab === 4 && (
        <Box>
          {/* Optimizer Header */}
          <Paper
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 4,
              mb: 3,
              color: 'white',
              borderRadius: 2
            }}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              🤖 AI Portfolio Optimizer
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Advanced algorithms to optimize your portfolio allocation and maximize returns
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>Optimization Score</Typography>
                  <Typography variant="h3" fontWeight="bold">87</Typography>
                  <Typography variant="caption">/ 100</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>Potential Gain</Typography>
                  <Typography variant="h5" fontWeight="bold">+₹2.4L</Typography>
                  <Typography variant="caption">Annual</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>Risk Reduction</Typography>
                  <Typography variant="h5" fontWeight="bold">-15%</Typography>
                  <Typography variant="caption">Volatility</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>Rebalancing</Typography>
                  <Typography variant="h5" fontWeight="bold">Every</Typography>
                  <Typography variant="caption">Quarter</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={3}>
            {/* Current vs Optimal Allocation */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  📊 Current vs Optimal Allocation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Comparison of your current portfolio with AI-recommended allocation
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Equity', value: 45, optimal: 55 },
                          { name: 'Debt', value: 30, optimal: 25 },
                          { name: 'Gold', value: 15, optimal: 10 },
                          { name: 'Crypto', value: 10, optimal: 10 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Equity', value: 45, optimal: 55 },
                          { name: 'Debt', value: 30, optimal: 25 },
                          { name: 'Gold', value: 15, optimal: 10 },
                          { name: 'Crypto', value: 10, optimal: 10 }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ mt: 2 }}>
                  {[
                    { name: 'Equity', current: 45, optimal: 55, diff: +10 },
                    { name: 'Debt', current: 30, optimal: 25, diff: -5 },
                    { name: 'Gold', current: 15, optimal: 10, diff: -5 },
                    { name: 'Crypto', current: 10, optimal: 10, diff: 0 }
                  ].map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2">{item.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">{item.current}%</Typography>
                        <Typography variant="body2" sx={{ mx: 1 }}>→</Typography>
                        <Typography variant="body2" fontWeight="bold">{item.optimal}%</Typography>
                        <Chip
                          label={`${item.diff > 0 ? '+' : ''}${item.diff}%`}
                          size="small"
                          color={item.diff > 0 ? 'success' : item.diff < 0 ? 'error' : 'default'}
                          sx={{ minWidth: 60 }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Risk-Return Analysis */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  📈 Risk-Return Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Optimize your portfolio for better risk-adjusted returns
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { risk: 5, currentReturn: 8, optimalReturn: 10 },
                        { risk: 10, currentReturn: 12, optimalReturn: 15 },
                        { risk: 15, currentReturn: 14, optimalReturn: 18 },
                        { risk: 20, currentReturn: 16, optimalReturn: 22 },
                        { risk: 25, currentReturn: 18, optimalReturn: 24 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="risk" label={{ value: 'Risk (%)', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Return (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="currentReturn" stroke="#ff7300" name="Current Portfolio" strokeWidth={2} />
                      <Line type="monotone" dataKey="optimalReturn" stroke="#82ca9d" name="Optimal Portfolio" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Sharpe Ratio:</strong> Current: 1.2 → Optimal: 1.8
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Higher Sharpe ratio indicates better risk-adjusted returns
                  </Typography>
                </Alert>
              </Paper>
            </Grid>

            {/* Rebalancing Recommendations */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  ⚖️ Rebalancing Recommendations
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Specific actions to optimize your portfolio
                </Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      action: 'Increase Equity',
                      from: 'Debt Funds',
                      amount: '₹1,50,000',
                      impact: '+12% expected returns',
                      priority: 'High',
                      color: 'error'
                    },
                    {
                      action: 'Reduce Gold',
                      from: 'Physical Gold',
                      amount: '₹75,000',
                      impact: 'Better liquidity',
                      priority: 'Medium',
                      color: 'warning'
                    },
                    {
                      action: 'Diversify Sectors',
                      from: 'Tech Heavy',
                      amount: '₹1,00,000',
                      impact: '-8% portfolio risk',
                      priority: 'High',
                      color: 'error'
                    },
                    {
                      action: 'Add International',
                      from: 'Domestic Only',
                      amount: '₹2,00,000',
                      impact: 'Global exposure',
                      priority: 'Low',
                      color: 'info'
                    }
                  ].map((rec, index) => (
                    <Grid size={{ xs: 12, md: 6 }} key={index}>
                      <Card
                        sx={{
                          p: 2,
                          border: '2px solid',
                          borderColor: `${rec.color}.light`,
                          bgcolor: `${rec.color}.lighter`
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {rec.action}
                          </Typography>
                          <Chip label={rec.priority} color={rec.color} size="small" />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>From:</strong> {rec.from}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Amount:</strong> {rec.amount}
                          </Typography>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            💡 {rec.impact}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth
                          sx={{ mt: 2 }}
                        >
                          Apply Recommendation
                        </Button>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Tax Optimization */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  💰 Tax Optimization
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Maximize tax efficiency of your portfolio
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { title: 'LTCG Harvesting', saving: '₹45,000', description: 'Utilize ₹1L exemption limit' },
                    { title: 'ELSS Investment', saving: '₹46,800', description: 'Add ₹1.5L under 80C' },
                    { title: 'Tax-loss Harvesting', saving: '₹22,000', description: 'Offset gains with losses' }
                  ].map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        bgcolor: 'success.lighter',
                        borderRadius: 1,
                        borderLeft: '4px solid',
                        borderColor: 'success.main'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">{item.title}</Typography>
                        <Chip label={item.saving} color="success" size="small" />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                  ))}
                  <Alert severity="success">
                    <Typography variant="body2" fontWeight="bold">
                      Total Tax Savings Potential: ₹1,13,800/year
                    </Typography>
                  </Alert>
                </Box>
              </Paper>
            </Grid>

            {/* Performance Projections */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  🔮 Performance Projections
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Expected portfolio growth over next 5 years
                </Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { year: 'Now', current: 50, optimal: 50 },
                        { year: 'Year 1', current: 55, optimal: 58 },
                        { year: 'Year 2', current: 60, optimal: 67 },
                        { year: 'Year 3', current: 66, optimal: 78 },
                        { year: 'Year 4', current: 72, optimal: 90 },
                        { year: 'Year 5', current: 79, optimal: 104 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis label={{ value: 'Portfolio Value (Lakhs)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="current" stroke="#ff7300" name="Current Strategy" strokeWidth={2} />
                      <Line type="monotone" dataKey="optimal" stroke="#82ca9d" name="Optimized Strategy" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>5-Year Difference:</strong> ₹25L additional wealth with optimization
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Auto-Rebalance Settings */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  ⚙️ Auto-Rebalancing Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure automatic portfolio rebalancing
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Rebalancing Frequency</InputLabel>
                      <Select value="quarterly" label="Rebalancing Frequency">
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="quarterly">Quarterly</MenuItem>
                        <MenuItem value="halfyearly">Half-Yearly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Threshold (%)</InputLabel>
                      <Select value="5" label="Threshold (%)">
                        <MenuItem value="3">3% Deviation</MenuItem>
                        <MenuItem value="5">5% Deviation</MenuItem>
                        <MenuItem value="10">10% Deviation</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Risk Profile</InputLabel>
                      <Select value="moderate" label="Risk Profile">
                        <MenuItem value="conservative">Conservative</MenuItem>
                        <MenuItem value="moderate">Moderate</MenuItem>
                        <MenuItem value="aggressive">Aggressive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={12}>
                    <Button variant="contained" size="large" fullWidth startIcon={<AddIcon />}>
                      Enable Auto-Rebalancing
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openAddDialog} 
        onClose={() => {
          setOpenAddDialog(false);
          setEditingInvestment(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Investment Type *</InputLabel>
                <Select
                  value={formData.type}
                  label="Investment Type *"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {INVESTMENT_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Symbol/Code"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Quantity *"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Purchase Price *"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Current Price *"
                value={formData.currentPrice}
                onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date *"
                InputLabelProps={{ shrink: true }}
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={formData.riskLevel}
                  label="Risk Level"
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                >
                  {RISK_LEVELS.map(risk => (
                    <MenuItem key={risk} value={risk}>
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Maturity Date"
                InputLabelProps={{ shrink: true }}
                value={formData.maturityDate}
                onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
              />
            </Grid>

            <Grid size={12}>
              <Typography variant="subtitle2" gutterBottom>
                SIP Details (Optional)
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="SIP Amount"
                value={formData.sipAmount}
                onChange={(e) => setFormData({ ...formData, sipAmount: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>SIP Frequency</InputLabel>
                <Select
                  value={formData.sipFrequency}
                  label="SIP Frequency"
                  onChange={(e) => setFormData({ ...formData, sipFrequency: e.target.value })}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="SIP Start Date"
                InputLabelProps={{ shrink: true }}
                value={formData.sipStartDate}
                onChange={(e) => setFormData({ ...formData, sipStartDate: e.target.value })}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenAddDialog(false);
              setEditingInvestment(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddInvestment} 
            variant="contained"
            disabled={!formData.name || !formData.quantity || !formData.purchasePrice || !formData.currentPrice}
          >
            {editingInvestment ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
        </Container>
      </Box>
    </>
  );
}

export default InvestmentPortfolio;
