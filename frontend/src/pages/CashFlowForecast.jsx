import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, IconButton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Switch, FormControlLabel, LinearProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  ToggleButton, ToggleButtonGroup, Alert, Slider, Avatar, Paper
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Timeline, AccountBalance, Assessment,
  CalendarMonth, ArrowUpward, ArrowDownward, ShowChart, Info,
  Add, Remove, ContentCopy, Download, Refresh, FilterList,
  CompareArrows, Speed, Warning, CheckCircle, ErrorOutline,
  WaterDrop, Waves, BarChart, SsidChart
} from '@mui/icons-material';
import {
  LineChart, Line, AreaChart, Area, BarChart as ReBarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
  ComposedChart, Scatter, ReferenceLine, Brush
} from 'recharts';
import '../../styles/animations.css';

// ============================================================
// Feature #99: Cash Flow Forecast & Projection Page
// ============================================================

// Generate mock forecast data
const generateForecastData = (months = 12) => {
  const data = [];
  let balance = 250000;
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const baseIncome = 85000 + Math.random() * 15000;
    const seasonalFactor = 1 + 0.1 * Math.sin((date.getMonth() / 12) * 2 * Math.PI);
    const income = Math.round(baseIncome * seasonalFactor);
    
    const baseExpense = 45000 + Math.random() * 15000;
    const expenseVariance = 1 + 0.05 * Math.cos((date.getMonth() / 12) * 2 * Math.PI);
    const expenses = Math.round(baseExpense * expenseVariance);
    
    const savings = income - expenses;
    balance += savings;
    
    data.push({
      month,
      date: date.toISOString(),
      income,
      expenses,
      savings,
      balance: Math.round(balance),
      incomeProjected: Math.round(income * (1 + 0.05 * Math.random())),
      expenseProjected: Math.round(expenses * (1 + 0.03 * Math.random())),
      confidence: Math.max(60, 95 - i * 3),
      investmentReturns: Math.round(balance * 0.01 * (0.5 + Math.random())),
      emiPayments: 15000,
      insurancePremiums: i % 3 === 0 ? 5000 : 0,
      sipInvestments: 10000,
    });
  }
  return data;
};

// Category-wise expense projections
const EXPENSE_CATEGORIES = [
  { name: 'Housing', current: 20000, projected: 21000, trend: 'up', color: '#2196F3', percentage: 28 },
  { name: 'Food & Groceries', current: 12000, projected: 12500, trend: 'up', color: '#4CAF50', percentage: 17 },
  { name: 'Transportation', current: 5000, projected: 4800, trend: 'down', color: '#FF9800', percentage: 7 },
  { name: 'Utilities', current: 4000, projected: 4200, trend: 'up', color: '#9C27B0', percentage: 6 },
  { name: 'Healthcare', current: 3000, projected: 3200, trend: 'up', color: '#F44336', percentage: 4 },
  { name: 'Entertainment', current: 5000, projected: 4500, trend: 'down', color: '#E91E63', percentage: 7 },
  { name: 'Shopping', current: 8000, projected: 7500, trend: 'down', color: '#00BCD4', percentage: 11 },
  { name: 'Education', current: 3000, projected: 3000, trend: 'stable', color: '#795548', percentage: 4 },
  { name: 'Insurance', current: 5000, projected: 5000, trend: 'stable', color: '#607060', percentage: 7 },
  { name: 'Miscellaneous', current: 6500, projected: 6800, trend: 'up', color: '#9E9E9E', percentage: 9 },
];

// Scenario templates
const SCENARIOS = [
  { id: 'optimistic', name: 'Optimistic', incomeGrowth: 15, expenseGrowth: 5, color: '#4CAF50', icon: '🚀' },
  { id: 'moderate', name: 'Moderate', incomeGrowth: 8, expenseGrowth: 7, color: '#2196F3', icon: '📊' },
  { id: 'conservative', name: 'Conservative', incomeGrowth: 5, expenseGrowth: 8, color: '#FF9800', icon: '🛡️' },
  { id: 'pessimistic', name: 'Pessimistic', incomeGrowth: 2, expenseGrowth: 12, color: '#F44336', icon: '⚠️' },
];

// Financial milestones
const MILESTONES = [
  { label: 'Emergency Fund (6 months)', target: 420000, current: 380000, date: 'Feb 2025', status: 'on-track' },
  { label: 'Down Payment for House', target: 1500000, current: 850000, date: 'Dec 2025', status: 'on-track' },
  { label: 'Car Purchase Fund', target: 800000, current: 320000, date: 'Jun 2026', status: 'at-risk' },
  { label: 'Retirement Corpus (1 Cr)', target: 10000000, current: 2500000, date: 'Mar 2045', status: 'on-track' },
  { label: 'Education Fund', target: 2000000, current: 150000, date: 'Jul 2035', status: 'behind' },
];

const CashFlowForecast = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [forecastMonths, setForecastMonths] = useState(12);
  const [selectedScenario, setSelectedScenario] = useState('moderate');
  const [showProjected, setShowProjected] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [chartType, setChartType] = useState('area');
  const [incomeGrowth, setIncomeGrowth] = useState(8);
  const [expenseGrowth, setExpenseGrowth] = useState(7);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [customScenario, setCustomScenario] = useState({ name: '', incomeGrowth: 10, expenseGrowth: 6 });

  const forecastData = useMemo(() => generateForecastData(forecastMonths), [forecastMonths]);

  const totals = useMemo(() => {
    const totalIncome = forecastData.reduce((s, d) => s + d.income, 0);
    const totalExpenses = forecastData.reduce((s, d) => s + d.expenses, 0);
    const totalSavings = forecastData.reduce((s, d) => s + d.savings, 0);
    const avgSavingsRate = ((totalSavings / totalIncome) * 100).toFixed(1);
    const endBalance = forecastData[forecastData.length - 1]?.balance || 0;
    const startBalance = forecastData[0]?.balance - forecastData[0].savings || 250000;
    const growthRate = (((endBalance - startBalance) / startBalance) * 100).toFixed(1);
    return { totalIncome, totalExpenses, totalSavings, avgSavingsRate, endBalance, startBalance, growthRate };
  }, [forecastData]);

  const formatCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  const CustomTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <Paper sx={{ p: 1.5, minWidth: 200 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>{label}</Typography>
        {payload.map((entry, idx) => (
          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" sx={{ color: entry.color }}>{entry.name}</Typography>
            <Typography variant="caption" fontWeight={600}>{formatCurrency(entry.value)}</Typography>
          </Box>
        ))}
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3, animation: 'fadeInUp 0.6s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Cash Flow Forecast</Typography>
          <Typography color="text.secondary">AI-powered financial projections and scenario analysis</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select value={forecastMonths} label="Period" onChange={(e) => setForecastMonths(e.target.value)}>
              <MenuItem value={3}>3 Months</MenuItem>
              <MenuItem value={6}>6 Months</MenuItem>
              <MenuItem value={12}>12 Months</MenuItem>
              <MenuItem value={24}>24 Months</MenuItem>
              <MenuItem value={36}>36 Months</MenuItem>
              <MenuItem value={60}>5 Years</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<Download />}>Export</Button>
          <Button variant="outlined" startIcon={<Refresh />}>Refresh</Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Projected Income', value: formatCurrency(totals.totalIncome), icon: <ArrowUpward />, color: '#4CAF50', change: '+8.5%' },
          { label: 'Projected Expenses', value: formatCurrency(totals.totalExpenses), icon: <ArrowDownward />, color: '#F44336', change: '+5.2%' },
          { label: 'Net Savings', value: formatCurrency(totals.totalSavings), icon: <TrendingUp />, color: '#2196F3', change: `${totals.avgSavingsRate}% rate` },
          { label: 'End Balance', value: formatCurrency(totals.endBalance), icon: <AccountBalance />, color: '#9C27B0', change: `+${totals.growthRate}%` },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, width: 48, height: 48 }}>
                  {stat.icon}
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                  <Typography variant="caption" sx={{ color: stat.color }}>{stat.change}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<ShowChart />} label="Forecast Chart" iconPosition="start" />
        <Tab icon={<CompareArrows />} label="Scenario Analysis" iconPosition="start" />
        <Tab icon={<BarChart />} label="Category Breakdown" iconPosition="start" />
        <Tab icon={<Timeline />} label="Milestones" iconPosition="start" />
      </Tabs>

      {/* Forecast Chart Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <ToggleButtonGroup size="small" value={chartType} exclusive onChange={(_, v) => v && setChartType(v)}>
              <ToggleButton value="area"><Waves sx={{ fontSize: 16, mr: 0.5 }} />Area</ToggleButton>
              <ToggleButton value="line"><SsidChart sx={{ fontSize: 16, mr: 0.5 }} />Line</ToggleButton>
              <ToggleButton value="bar"><BarChart sx={{ fontSize: 16, mr: 0.5 }} />Bar</ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel
              control={<Switch checked={showProjected} onChange={(e) => setShowProjected(e.target.checked)} size="small" />}
              label="Show Projected"
            />
            <FormControlLabel
              control={<Switch checked={showConfidence} onChange={(e) => setShowConfidence(e.target.checked)} size="small" />}
              label="Confidence Band"
            />
          </Box>

          {/* Main Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Income vs Expenses Forecast</Typography>
              <ResponsiveContainer width="100%" height={450}>
                {chartType === 'area' ? (
                  <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F44336" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F44336" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <RechartsTooltip content={<CustomTooltipContent />} />
                    <Legend />
                    <Area type="monotone" dataKey="income" stroke="#4CAF50" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expenses" stroke="#F44336" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
                    <Area type="monotone" dataKey="savings" stroke="#2196F3" fill="url(#savingsGrad)" strokeWidth={2} name="Savings" />
                    {showProjected && (
                      <>
                        <Area type="monotone" dataKey="incomeProjected" stroke="#4CAF50" fill="none" strokeWidth={1} strokeDasharray="5 5" name="Income (Projected)" />
                        <Area type="monotone" dataKey="expenseProjected" stroke="#F44336" fill="none" strokeWidth={1} strokeDasharray="5 5" name="Expenses (Projected)" />
                      </>
                    )}
                    <Brush dataKey="month" height={30} stroke="#8884d8" />
                  </AreaChart>
                ) : chartType === 'line' ? (
                  <LineChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <RechartsTooltip content={<CustomTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#4CAF50" strokeWidth={2} dot={{ r: 3 }} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#F44336" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
                    <Line type="monotone" dataKey="savings" stroke="#2196F3" strokeWidth={2} dot={{ r: 3 }} name="Net Savings" />
                    <Line type="monotone" dataKey="balance" stroke="#9C27B0" strokeWidth={2} dot={{ r: 3 }} name="Balance" />
                    <Brush dataKey="month" height={30} stroke="#8884d8" />
                  </LineChart>
                ) : (
                  <ComposedChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <RechartsTooltip content={<CustomTooltipContent />} />
                    <Legend />
                    <Bar dataKey="income" fill="#4CAF50" name="Income" opacity={0.8} />
                    <Bar dataKey="expenses" fill="#F44336" name="Expenses" opacity={0.8} />
                    <Line type="monotone" dataKey="savings" stroke="#2196F3" strokeWidth={2} name="Net Savings" />
                    <Brush dataKey="month" height={30} stroke="#8884d8" />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Balance Projection */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Balance Projection Over Time</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#9C27B0" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <RechartsTooltip content={<CustomTooltipContent />} />
                  <Area type="monotone" dataKey="balance" stroke="#9C27B0" fill="url(#balanceGrad)" strokeWidth={2} name="Balance" />
                  <ReferenceLine y={420000} stroke="#FF9800" strokeDasharray="5 5" label="Emergency Fund Target" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Scenario Analysis Tab */}
      {activeTab === 1 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {SCENARIOS.map(scenario => (
              <Grid item xs={12} sm={6} md={3} key={scenario.id}>
                <Card
                  onClick={() => {
                    setSelectedScenario(scenario.id);
                    setIncomeGrowth(scenario.incomeGrowth);
                    setExpenseGrowth(scenario.expenseGrowth);
                  }}
                  sx={{
                    cursor: 'pointer',
                    border: selectedScenario === scenario.id ? 2 : 1,
                    borderColor: selectedScenario === scenario.id ? scenario.color : 'divider',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" component="span">{scenario.icon}</Typography>
                    <Typography variant="h6" fontWeight={600} sx={{ mt: 1 }}>{scenario.name}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                      <Chip label={`Income +${scenario.incomeGrowth}%`} size="small" color="success" variant="outlined" />
                      <Chip label={`Expenses +${scenario.expenseGrowth}%`} size="small" color="error" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Custom Scenario Builder */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Custom Scenario Builder</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Annual Income Growth: {incomeGrowth}%</Typography>
                  <Slider
                    value={incomeGrowth}
                    onChange={(_, v) => setIncomeGrowth(v)}
                    min={-10}
                    max={30}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 10, label: '10%' },
                      { value: 20, label: '20%' },
                      { value: 30, label: '30%' },
                    ]}
                    valueLabelDisplay="auto"
                    color="success"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Annual Expense Growth: {expenseGrowth}%</Typography>
                  <Slider
                    value={expenseGrowth}
                    onChange={(_, v) => setExpenseGrowth(v)}
                    min={-5}
                    max={25}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 10, label: '10%' },
                      { value: 20, label: '20%' },
                    ]}
                    valueLabelDisplay="auto"
                    color="error"
                  />
                </Grid>
              </Grid>

              {/* Projected summary based on scenario */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  {[
                    { label: '1 Year Projection', months: 12 },
                    { label: '3 Year Projection', months: 36 },
                    { label: '5 Year Projection', months: 60 },
                  ].map((period, idx) => {
                    const monthlyIncome = 85000;
                    const monthlyExpense = 55000;
                    const yearlyFactor = period.months / 12;
                    const projIncome = monthlyIncome * 12 * yearlyFactor * (1 + incomeGrowth / 200);
                    const projExpense = monthlyExpense * 12 * yearlyFactor * (1 + expenseGrowth / 200);
                    const projSavings = projIncome - projExpense;
                    return (
                      <Grid item xs={12} md={4} key={idx}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="subtitle2" color="text.secondary">{period.label}</Typography>
                          <Typography variant="h5" fontWeight={700} color={projSavings > 0 ? 'success.main' : 'error.main'}>
                            {formatCurrency(Math.abs(projSavings))}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {projSavings > 0 ? 'Net Savings' : 'Net Deficit'}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </CardContent>
          </Card>

          {/* Scenario Comparison Chart */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Scenario Comparison</Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" type="category" allowDuplicatedCategory={false} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Legend />
                  {SCENARIOS.map(scenario => {
                    const data = forecastData.map((d, i) => ({
                      ...d,
                      balance: d.balance * (1 + (scenario.incomeGrowth - scenario.expenseGrowth) / 100 * (i / 12)),
                    }));
                    return (
                      <Line
                        key={scenario.id}
                        data={data}
                        dataKey="balance"
                        stroke={scenario.color}
                        strokeWidth={selectedScenario === scenario.id ? 3 : 1}
                        name={scenario.name}
                        dot={false}
                        strokeDasharray={selectedScenario === scenario.id ? '' : '5 5'}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Category Breakdown Tab */}
      {activeTab === 2 && (
        <Box>
          <Grid container spacing={2}>
            {EXPENSE_CATEGORIES.map((cat, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card sx={{ transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>{cat.name}</Typography>
                      <Chip
                        size="small"
                        icon={cat.trend === 'up' ? <TrendingUp /> : cat.trend === 'down' ? <TrendingDown /> : <Remove />}
                        label={cat.trend === 'up' ? 'Rising' : cat.trend === 'down' ? 'Falling' : 'Stable'}
                        color={cat.trend === 'up' ? 'error' : cat.trend === 'down' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Current</Typography>
                        <Typography variant="h6" fontWeight={700}>{formatCurrency(cat.current)}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Projected</Typography>
                        <Typography variant="h6" fontWeight={700} color={cat.projected > cat.current ? 'error.main' : 'success.main'}>
                          {formatCurrency(cat.projected)}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={cat.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': { bgcolor: cat.color, borderRadius: 4 }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {cat.percentage}% of total expenses
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color={cat.projected > cat.current ? 'error.main' : 'success.main'}>
                        {cat.projected > cat.current ? '+' : ''}{formatCurrency(cat.projected - cat.current)} change
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cat.projected > cat.current ? '+' : ''}{(((cat.projected - cat.current) / cat.current) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Total Summary */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Expense Category Summary</Typography>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={EXPENSE_CATEGORIES} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis tickFormatter={(v) => `₹${v / 1000}K`} />
                  <RechartsTooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="current" fill="#2196F3" name="Current Monthly" opacity={0.7} />
                  <Bar dataKey="projected" fill="#FF9800" name="Projected Monthly" opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Milestones Tab */}
      {activeTab === 3 && (
        <Box>
          <Grid container spacing={3}>
            {MILESTONES.map((milestone, idx) => {
              const progress = (milestone.current / milestone.target) * 100;
              return (
                <Grid item xs={12} md={6} key={idx}>
                  <Card sx={{ transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>{milestone.label}</Typography>
                        <Chip
                          size="small"
                          icon={
                            milestone.status === 'on-track' ? <CheckCircle /> :
                            milestone.status === 'at-risk' ? <Warning /> : <ErrorOutline />
                          }
                          label={milestone.status === 'on-track' ? 'On Track' : milestone.status === 'at-risk' ? 'At Risk' : 'Behind'}
                          color={milestone.status === 'on-track' ? 'success' : milestone.status === 'at-risk' ? 'warning' : 'error'}
                        />
                      </Box>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Current</Typography>
                          <Typography variant="subtitle2" fontWeight={600}>{formatCurrency(milestone.current)}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Target</Typography>
                          <Typography variant="subtitle2" fontWeight={600}>{formatCurrency(milestone.target)}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Target Date</Typography>
                          <Typography variant="subtitle2" fontWeight={600}>{milestone.date}</Typography>
                        </Grid>
                      </Grid>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          bgcolor: '#f0f0f0',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 6,
                            bgcolor: milestone.status === 'on-track' ? '#4CAF50' : milestone.status === 'at-risk' ? '#FF9800' : '#F44336'
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">{progress.toFixed(1)}% achieved</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(milestone.target - milestone.current)} remaining
                        </Typography>
                      </Box>

                      {/* Monthly contribution needed */}
                      <Alert
                        severity={milestone.status === 'on-track' ? 'success' : milestone.status === 'at-risk' ? 'warning' : 'error'}
                        sx={{ mt: 2 }}
                        icon={false}
                      >
                        <Typography variant="caption">
                          Monthly contribution needed: <strong>
                            {formatCurrency(Math.round((milestone.target - milestone.current) / 12))}
                          </strong>/month to reach target by {milestone.date}
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Add Milestone */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" startIcon={<Add />} size="large">
              Add New Financial Milestone
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Fix: Need to import Tooltip from Recharts separately
const RechartsTooltip = ({ content, ...props }) => {
  const RTooltip = require('recharts').Tooltip;
  return <RTooltip content={content} {...props} />;
};

export default CashFlowForecast;
