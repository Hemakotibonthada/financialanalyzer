import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Tab,
  Tabs,
  Chip,
  Avatar,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  LinearProgress,
  Tooltip,
  Stack,
  InputBase
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Home as HomeIcon,
  DirectionsCar as CarIcon,
  HealthAndSafety as HealthIcon,
  Security as LifeIcon,
  Autorenew as RecurringIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Star as StarIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Upload as UploadIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

const FinancialInsuranceAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Financial Data States
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [insurances, setInsurances] = useState([]);
  
  // Form States
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  // Category configuration
  const categories = [
    {
      id: 'assets',
      title: 'Assets',
      icon: HomeIcon,
      color: '#4285F4',
      description: 'Properties, vehicles, and valuables',
      bgColor: '#E8F0FE'
    },
    {
      id: 'liabilities',
      title: 'Liabilities',
      icon: CardIcon,
      color: '#EA4335',
      description: 'Loans, mortgages, and debts',
      bgColor: '#FCE8E6'
    },
    {
      id: 'income',
      title: 'Income',
      icon: MoneyIcon,
      color: '#34A853',
      description: 'Salary, business, and earnings',
      bgColor: '#E6F4EA'
    },
    {
      id: 'expenses',
      title: 'Expenses',
      icon: ReceiptIcon,
      color: '#FBBC04',
      description: 'Monthly bills and spending',
      bgColor: '#FEF7E0'
    },
    {
      id: 'investments',
      title: 'Investments',
      icon: TrendingUpIcon,
      color: '#9334E9',
      description: 'Stocks, bonds, and portfolios',
      bgColor: '#F3E8FF'
    },
    {
      id: 'insurance',
      title: 'Insurance',
      icon: HealthIcon,
      color: '#F59E0B',
      description: 'Policies and coverage',
      bgColor: '#FFF3CD'
    }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [assetsRes, liabilitiesRes, incomesRes, expensesRes, investmentsRes, insurancesRes] = await Promise.all([
        api.get('/financial/assets').catch(() => ({ data: { assets: [] } })),
        api.get('/financial/liabilities').catch(() => ({ data: { liabilities: [] } })),
        api.get('/financial/incomes').catch(() => ({ data: { incomes: [] } })),
        api.get('/financial/expenses').catch(() => ({ data: { expenses: [] } })),
        api.get('/financial/investments').catch(() => ({ data: { investments: [] } })),
        api.get('/financial/insurances').catch(() => ({ data: { insurances: [] } }))
      ]);
      
      setAssets(assetsRes.data.assets || []);
      setLiabilities(liabilitiesRes.data.liabilities || []);
      setIncomes(incomesRes.data.incomes || []);
      setExpenses(expensesRes.data.expenses || []);
      setInvestments(investmentsRes.data.investments || []);
      setInsurances(insurancesRes.data.insurances || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setEditingId(item?._id || null);
    setFormData(item || getDefaultFormData(type));
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({});
    setEditingId(null);
  };

  const getDefaultFormData = (type) => {
    const defaults = {
      asset: { name: '', type: 'property', value: '', purchaseDate: '', description: '', location: '' },
      liability: { name: '', type: 'loan', amount: '', interestRate: '', startDate: '', endDate: '', monthlyPayment: '', lender: '' },
      income: { source: '', type: 'salary', amount: '', frequency: 'monthly', startDate: '', taxable: true },
      expense: { category: '', type: 'recurring', amount: '', frequency: 'monthly', dueDate: '', description: '' },
      investment: { name: '', type: 'stocks', amount: '', purchasePrice: '', currentValue: '', quantity: '', platform: '', notes: '' },
      insurance: { provider: '', type: 'health', policyNumber: '', premium: '', frequency: 'monthly', coverageAmount: '', startDate: '', endDate: '', beneficiaries: '', notes: '' }
    };
    return defaults[type] || {};
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const endpoints = {
        asset: '/financial/assets',
        liability: '/financial/liabilities',
        income: '/financial/incomes',
        expense: '/financial/expenses',
        investment: '/financial/investments',
        insurance: '/financial/insurances'
      };
      
      const endpoint = endpoints[dialogType];
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, formData);
        showSnackbar('Updated successfully');
      } else {
        await api.post(endpoint, formData);
        showSnackbar('Added successfully');
      }
      
      await fetchAllData();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving:', error);
      showSnackbar('Error saving data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    setLoading(true);
    try {
      const endpoints = {
        asset: '/financial/assets',
        liability: '/financial/liabilities',
        income: '/financial/incomes',
        expense: '/financial/expenses',
        investment: '/financial/investments',
        insurance: '/financial/insurances'
      };
      
      await api.delete(`${endpoints[type]}/${id}`);
      showSnackbar('Deleted successfully');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar('Error deleting item', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalInvestments = investments.reduce((sum, i) => sum + (parseFloat(i.currentValue) || parseFloat(i.amount) || 0), 0);
    const totalInsurancePremium = insurances.reduce((sum, i) => sum + (parseFloat(i.premium) || 0), 0);
    
    return {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      monthlySavings: totalIncome - totalExpenses,
      totalInvestments,
      totalInsurancePremium
    };
  };

  const summary = calculateSummary();

  // Get all documents based on active category
  const getAllDocuments = () => {
    const docs = [];
    
    if (activeTab === 'all' || activeTab === 'assets') {
      assets.forEach(item => docs.push({ ...item, type: 'asset', category: 'Assets', icon: HomeIcon, color: '#4285F4' }));
    }
    if (activeTab === 'all' || activeTab === 'liabilities') {
      liabilities.forEach(item => docs.push({ ...item, type: 'liability', category: 'Liabilities', icon: CardIcon, color: '#EA4335' }));
    }
    if (activeTab === 'all' || activeTab === 'income') {
      incomes.forEach(item => docs.push({ ...item, type: 'income', category: 'Income', icon: MoneyIcon, color: '#34A853' }));
    }
    if (activeTab === 'all' || activeTab === 'expenses') {
      expenses.forEach(item => docs.push({ ...item, type: 'expense', category: 'Expenses', icon: ReceiptIcon, color: '#FBBC04' }));
    }
    if (activeTab === 'all' || activeTab === 'investments') {
      investments.forEach(item => docs.push({ ...item, type: 'investment', category: 'Investments', icon: TrendingUpIcon, color: '#9334E9' }));
    }
    if (activeTab === 'all' || activeTab === 'insurance') {
      insurances.forEach(item => docs.push({ ...item, type: 'insurance', category: 'Insurance', icon: HealthIcon, color: '#F59E0B' }));
    }

    // Filter by search query
    if (searchQuery) {
      return docs.filter(doc => 
        JSON.stringify(doc).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return docs;
  };

  const filteredDocuments = getAllDocuments();

  // Category Cards Component
  const CategoryCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {categories.map((cat) => {
        const Icon = cat.icon;
        let count = 0;
        
        switch(cat.id) {
          case 'assets': count = assets.length; break;
          case 'liabilities': count = liabilities.length; break;
          case 'income': count = incomes.length; break;
          case 'expenses': count = expenses.length; break;
          case 'investments': count = investments.length; break;
          case 'insurance': count = insurances.length; break;
        }

        return (
          <Grid item xs={12} sm={6} md={4} lg={2} key={cat.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                },
                height: '100%',
                bgcolor: cat.bgColor,
                border: activeTab === cat.id ? `2px solid ${cat.color}` : 'none'
              }}
              onClick={() => setActiveTab(cat.id)}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Icon sx={{ fontSize: 48, color: cat.color, mb: 1 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {cat.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 40 }}>
                  {cat.description}
                </Typography>
                <Chip 
                  label={`${count} items`}
                  size="small"
                  sx={{ 
                    bgcolor: cat.color,
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Financial Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${summary.netWorth.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Net Worth
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BankIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${summary.totalAssets.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${summary.monthlySavings.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Monthly Savings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AssessmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${summary.totalInvestments.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Investments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Asset Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assets.map(a => ({ name: a.name, value: parseFloat(a.value) || 0 }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Income vs Expenses</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Income', amount: summary.monthlyIncome },
                  { name: 'Expenses', amount: summary.monthlyExpenses },
                  { name: 'Savings', amount: summary.monthlySavings }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Assets Component
  const AssetsView = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Assets</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('asset')}
          sx={{ borderRadius: 2 }}
        >
          Add Asset
        </Button>
      </Box>

      <Grid container spacing={3}>
        {assets.map((asset) => (
          <Grid item xs={12} md={6} key={asset._id}>
            <Card sx={{ '&:hover': { boxShadow: 6 }, transition: 'all 0.3s' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <HomeIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>{asset.name}</Typography>
                      <Chip label={asset.type} size="small" color="primary" variant="outlined" />
                    </Box>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog('asset', asset)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('asset', asset._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Value</Typography>
                    <Typography variant="h6" color="primary">${parseFloat(asset.value).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Purchase Date</Typography>
                    <Typography variant="body1">{new Date(asset.purchaseDate).toLocaleDateString()}</Typography>
                  </Grid>
                  {asset.location && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Location</Typography>
                      <Typography variant="body1">{asset.location}</Typography>
                    </Grid>
                  )}
                  {asset.description && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Description</Typography>
                      <Typography variant="body2">{asset.description}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Liabilities Component
  const LiabilitiesView = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Liabilities</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('liability')}
          color="error"
          sx={{ borderRadius: 2 }}
        >
          Add Liability
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'error.light' }}>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Interest Rate</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Monthly Payment</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Lender</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'white' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {liabilities.map((liability) => (
              <TableRow key={liability._id} hover>
                <TableCell>{liability.name}</TableCell>
                <TableCell><Chip label={liability.type} size="small" /></TableCell>
                <TableCell>${parseFloat(liability.amount).toLocaleString()}</TableCell>
                <TableCell>{liability.interestRate}%</TableCell>
                <TableCell>${parseFloat(liability.monthlyPayment).toLocaleString()}</TableCell>
                <TableCell>{liability.lender}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenDialog('liability', liability)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete('liability', liability._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Income Component
  const IncomeView = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Income Sources</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('income')}
          color="success"
          sx={{ borderRadius: 2 }}
        >
          Add Income
        </Button>
      </Box>

      <Grid container spacing={3}>
        {incomes.map((income) => (
          <Grid item xs={12} sm={6} md={4} key={income._id}>
            <Card sx={{ '&:hover': { boxShadow: 6 }, transition: 'all 0.3s', borderTop: '4px solid #4caf50' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>{income.source}</Typography>
                    <Chip label={income.type} size="small" color="success" sx={{ mt: 1 }} />
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog('income', income)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('income', income._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="h4" color="success.main" fontWeight="bold" mb={2}>
                  ${parseFloat(income.amount).toLocaleString()}
                </Typography>

                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Frequency</Typography>
                    <Typography variant="body2" fontWeight={500}>{income.frequency}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Taxable</Typography>
                    <Chip label={income.taxable ? 'Yes' : 'No'} size="small" color={income.taxable ? 'warning' : 'default'} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Expenses Component
  const ExpensesView = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Expenses</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('expense')}
          color="warning"
          sx={{ borderRadius: 2 }}
        >
          Add Expense
        </Button>
      </Box>

      <Grid container spacing={3}>
        {expenses.map((expense) => (
          <Grid item xs={12} sm={6} md={4} key={expense._id}>
            <Card sx={{ '&:hover': { boxShadow: 6 }, transition: 'all 0.3s', borderTop: '4px solid #ff9800' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>{expense.category}</Typography>
                    <Chip label={expense.type} size="small" color="warning" sx={{ mt: 1 }} />
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog('expense', expense)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('expense', expense._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="h4" color="warning.main" fontWeight="bold" mb={2}>
                  ${parseFloat(expense.amount).toLocaleString()}
                </Typography>

                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Frequency</Typography>
                    <Typography variant="body2" fontWeight={500}>{expense.frequency}</Typography>
                  </Box>
                  {expense.dueDate && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Due Date</Typography>
                      <Typography variant="body2" fontWeight={500}>{new Date(expense.dueDate).toLocaleDateString()}</Typography>
                    </Box>
                  )}
                  {expense.description && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {expense.description}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Investments Component
  const InvestmentsView = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Investments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('investment')}
          color="info"
          sx={{ borderRadius: 2 }}
        >
          Add Investment
        </Button>
      </Box>

      <Grid container spacing={3}>
        {investments.map((investment) => {
          const currentValue = parseFloat(investment.currentValue) || parseFloat(investment.amount) || 0;
          const purchasePrice = parseFloat(investment.purchasePrice) || parseFloat(investment.amount) || 1;
          const gainLoss = currentValue - purchasePrice;
          const gainLossPercent = ((gainLoss / purchasePrice) * 100).toFixed(2);
          const isProfit = gainLoss >= 0;

          return (
            <Grid item xs={12} md={6} key={investment._id}>
              <Card sx={{ '&:hover': { boxShadow: 6 }, transition: 'all 0.3s' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <TrendingUpIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>{investment.name}</Typography>
                        <Chip label={investment.type} size="small" color="info" variant="outlined" />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenDialog('investment', investment)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete('investment', investment._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Current Value</Typography>
                      <Typography variant="h6" color="info.main">${currentValue.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Purchase Price</Typography>
                      <Typography variant="h6">${purchasePrice.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Gain/Loss</Typography>
                      <Typography variant="h6" color={isProfit ? 'success.main' : 'error.main'}>
                        ${Math.abs(gainLoss).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Return %</Typography>
                      <Chip
                        label={`${isProfit ? '+' : ''}${gainLossPercent}%`}
                        color={isProfit ? 'success' : 'error'}
                        size="small"
                      />
                    </Grid>
                    {investment.platform && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Platform</Typography>
                        <Typography variant="body1">{investment.platform}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  // Insurance Component
  const InsuranceView = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Insurance Policies</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('insurance')}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          Add Insurance
        </Button>
      </Box>

      <Grid container spacing={3}>
        {insurances.map((insurance) => (
          <Grid item xs={12} md={6} lg={4} key={insurance._id}>
            <Card sx={{ '&:hover': { boxShadow: 6 }, transition: 'all 0.3s', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: getInsuranceColor(insurance.type) }}>
                      {getInsuranceIcon(insurance.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>{insurance.provider}</Typography>
                      <Chip label={insurance.type} size="small" sx={{ mt: 0.5 }} />
                    </Box>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog('insurance', insurance)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('insurance', insurance._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Policy Number</Typography>
                    <Typography variant="body1" fontWeight={500}>{insurance.policyNumber}</Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Premium</Typography>
                      <Typography variant="h6" color="primary">${parseFloat(insurance.premium).toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">per {insurance.frequency}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Coverage</Typography>
                      <Typography variant="h6" color="success.main">${parseFloat(insurance.coverageAmount).toLocaleString()}</Typography>
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography variant="body2" color="text.secondary">Period</Typography>
                    <Typography variant="body2">
                      {new Date(insurance.startDate).toLocaleDateString()} - {new Date(insurance.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>

                  {insurance.beneficiaries && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Beneficiaries</Typography>
                      <Typography variant="body2">{insurance.beneficiaries}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const getInsuranceIcon = (type) => {
    const icons = {
      health: <HealthIcon />,
      life: <LifeIcon />,
      auto: <CarIcon />,
      home: <HomeIcon />,
      property: <HomeIcon />
    };
    return icons[type] || <HealthIcon />;
  };

  const getInsuranceColor = (type) => {
    const colors = {
      health: '#f44336',
      life: '#9c27b0',
      auto: '#2196f3',
      home: '#ff9800',
      property: '#4caf50'
    };
    return colors[type] || '#2196f3';
  };

  // Dialog Component for Add/Edit
  const FormDialog = () => {
    const renderFormFields = () => {
      switch (dialogType) {
        case 'asset':
          return (
            <>
              <TextField
                fullWidth
                label="Asset Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'property'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="property">Property</MenuItem>
                  <MenuItem value="vehicle">Vehicle</MenuItem>
                  <MenuItem value="jewelry">Jewelry</MenuItem>
                  <MenuItem value="electronics">Electronics</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Value"
                type="number"
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <TextField
                fullWidth
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
                multiline
                rows={3}
              />
            </>
          );

        case 'liability':
          return (
            <>
              <TextField
                fullWidth
                label="Liability Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'loan'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="loan">Loan</MenuItem>
                  <MenuItem value="mortgage">Mortgage</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="personal_loan">Personal Loan</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <TextField
                fullWidth
                label="Interest Rate (%)"
                type="number"
                value={formData.interestRate || ''}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                margin="normal"
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
              <TextField
                fullWidth
                label="Monthly Payment"
                type="number"
                value={formData.monthlyPayment || ''}
                onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
              <TextField
                fullWidth
                label="Lender"
                value={formData.lender || ''}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </>
          );

        case 'income':
          return (
            <>
              <TextField
                fullWidth
                label="Income Source"
                value={formData.source || ''}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'salary'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="salary">Salary</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="freelance">Freelance</MenuItem>
                  <MenuItem value="investment">Investment</MenuItem>
                  <MenuItem value="rental">Rental</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="biweekly">Bi-weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Taxable</InputLabel>
                <Select
                  value={formData.taxable !== undefined ? formData.taxable : true}
                  onChange={(e) => setFormData({ ...formData, taxable: e.target.value })}
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </>
          );

        case 'expense':
          return (
            <>
              <TextField
                fullWidth
                label="Category"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'recurring'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="recurring">Recurring</MenuItem>
                  <MenuItem value="one-time">One-time</MenuItem>
                  <MenuItem value="variable">Variable</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={formData.dueDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
                multiline
                rows={2}
              />
            </>
          );

        case 'investment':
          return (
            <>
              <TextField
                fullWidth
                label="Investment Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'stocks'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="stocks">Stocks</MenuItem>
                  <MenuItem value="bonds">Bonds</MenuItem>
                  <MenuItem value="mutual_funds">Mutual Funds</MenuItem>
                  <MenuItem value="etf">ETF</MenuItem>
                  <MenuItem value="crypto">Cryptocurrency</MenuItem>
                  <MenuItem value="real_estate">Real Estate</MenuItem>
                  <MenuItem value="commodities">Commodities</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Purchase Price"
                type="number"
                value={formData.purchasePrice || ''}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <TextField
                fullWidth
                label="Current Value"
                type="number"
                value={formData.currentValue || ''}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Platform/Broker"
                value={formData.platform || ''}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                margin="normal"
                multiline
                rows={2}
              />
            </>
          );

        case 'insurance':
          return (
            <>
              <TextField
                fullWidth
                label="Provider"
                value={formData.provider || ''}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'health'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="health">Health</MenuItem>
                  <MenuItem value="life">Life</MenuItem>
                  <MenuItem value="auto">Auto</MenuItem>
                  <MenuItem value="home">Home</MenuItem>
                  <MenuItem value="property">Property</MenuItem>
                  <MenuItem value="disability">Disability</MenuItem>
                  <MenuItem value="travel">Travel</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Policy Number"
                value={formData.policyNumber || ''}
                onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Premium"
                type="number"
                value={formData.premium || ''}
                onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Payment Frequency</InputLabel>
                <Select
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="semi-annually">Semi-annually</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Coverage Amount"
                type="number"
                value={formData.coverageAmount || ''}
                onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                margin="normal"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                required
              />
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Beneficiaries"
                value={formData.beneficiaries || ''}
                onChange={(e) => setFormData({ ...formData, beneficiaries: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                margin="normal"
                multiline
                rows={3}
              />
            </>
          );

        default:
          return null;
      }
    };

    return (
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit' : 'Add'} {dialogType?.charAt(0).toUpperCase() + dialogType?.slice(1)}
        </DialogTitle>
        <DialogContent>
          {renderFormFields()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
      
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ color: '#1a73e8' }}>
          Personal Documents
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload and manage your financial documents
        </Typography>
      </Box>

      {/* Category Cards */}
      <CategoryCards />

      {/* Search and Filter Bar */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          {/* Tab Navigation */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
            <Button
              variant={activeTab === 'all' ? 'contained' : 'text'}
              startIcon={<DescriptionIcon />}
              onClick={() => setActiveTab('all')}
              sx={{ textTransform: 'none' }}
            >
              ALL DOCUMENTS
            </Button>
            <Button
              variant="text"
              startIcon={<SearchIcon />}
              sx={{ textTransform: 'none' }}
            >
              ADVANCED SEARCH
            </Button>
            <Button
              variant="text"
              startIcon={<StarIcon />}
              sx={{ textTransform: 'none' }}
            >
              STARRED
            </Button>
            <Button
              variant="text"
              startIcon={<HistoryIcon />}
              sx={{ textTransform: 'none' }}
            >
              RECENT
            </Button>
          </Box>

          {/* Upload Button */}
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => {
              // Determine which dialog to open based on active tab
              const typeMap = {
                'assets': 'asset',
                'liabilities': 'liability',
                'income': 'income',
                'expenses': 'expense',
                'investments': 'investment',
                'insurance': 'insurance'
              };
              handleOpenDialog(typeMap[activeTab] || 'asset');
            }}
            sx={{ 
              textTransform: 'none',
              bgcolor: '#ea4335',
              '&:hover': { bgcolor: '#d33426' }
            }}
          >
            Upload Document
          </Button>
        </Box>
      </Paper>

      {/* Search Bar */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box display="flex" gap={2} alignItems="center">
          <SearchIcon sx={{ color: 'text.secondary' }} />
          <InputBase
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              label="Filter by Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="assets">Assets</MenuItem>
              <MenuItem value="liabilities">Liabilities</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expenses">Expenses</MenuItem>
              <MenuItem value="investments">Investments</MenuItem>
              <MenuItem value="insurance">Insurance</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            sx={{ textTransform: 'none' }}
          >
            Auto-Categorize
          </Button>
        </Box>
      </Paper>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#e8f0fe' }}>
          <DescriptionIcon sx={{ fontSize: 64, color: '#1a73e8', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No documents found. Upload your first document to get started.
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Click the "Upload Document" button to add your financial records
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const Icon = doc.icon;
                const displayName = doc.name || doc.source || doc.category || doc.provider || 'Unnamed';
                const amount = doc.value || doc.amount || doc.premium || doc.currentValue || 0;
                const date = doc.purchaseDate || doc.startDate || doc.createdAt;
                
                return (
                  <TableRow 
                    key={doc._id}
                    hover
                    sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: doc.color, width: 32, height: 32 }}>
                          <Icon sx={{ fontSize: 18 }} />
                        </Avatar>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {displayName}
                      </Typography>
                      {doc.type && (
                        <Typography variant="caption" color="text.secondary">
                          {doc.type}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={doc.category} 
                        size="small"
                        sx={{ 
                          bgcolor: `${doc.color}20`,
                          color: doc.color,
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ${parseFloat(amount).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {date ? new Date(date).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label="Active" 
                        size="small" 
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(doc.type, doc)}
                          sx={{ color: '#1a73e8' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(doc.type, doc._id)}
                          sx={{ color: '#ea4335' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FormDialog />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FinancialInsuranceAnalyzer;
