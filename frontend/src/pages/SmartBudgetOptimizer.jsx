// ============================================================================
// Smart Budget Optimizer — AI-Powered Budget Management
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Divider, Avatar, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  AccountBalance as BudgetIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  Savings as SavingsIcon,
  AutoGraph as AIIcon,
  Category as CategoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Psychology as BrainIcon,
  Refresh as RefreshIcon,
  ShoppingCart as ShoppingIcon,
  Restaurant as FoodIcon,
  DirectionsCar as TransportIcon,
  Home as HomeIcon,
  LocalHospital as HealthIcon,
  School as EduIcon,
  Movie as EntertainmentIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const categoryIcons = {
  food: <FoodIcon />,
  shopping: <ShoppingIcon />,
  transport: <TransportIcon />,
  rent: <HomeIcon />,
  healthcare: <HealthIcon />,
  education: <EduIcon />,
  entertainment: <EntertainmentIcon />,
};

const formatCurrency = (amt) => `₹${Math.abs(amt || 0).toLocaleString('en-IN')}`;

const SmartBudgetOptimizer = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getBudgetOptimization();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load budget optimization data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('budget_optimizer');
      await fetchData();
    } catch (err) {
      setError('Retraining failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Analyzing your budget patterns...
            </Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const ruleAnalysis = data?.ruleAnalysis || {};
  const categoryAnalysis = data?.categoryAnalysis || {};
  const totalSavingsPotential = data?.totalSavingsPotential || 0;
  const avgIncome = data?.avgIncome || 0;

  // Prepare chart data
  const categoryData = Object.entries(categoryAnalysis)
    .sort((a, b) => b[1].average - a[1].average)
    .slice(0, 10)
    .map(([cat, info], i) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      current: info.average,
      optimal: info.optimalBudget,
      savings: info.savingsPotential,
      fill: COLORS[i % COLORS.length],
    }));

  const ruleData = [
    { name: 'Needs (50%)', actual: ruleAnalysis.needs?.percentage || 0, target: 50, amount: ruleAnalysis.needs?.actual || 0 },
    { name: 'Wants (30%)', actual: ruleAnalysis.wants?.percentage || 0, target: 30, amount: ruleAnalysis.wants?.actual || 0 },
    { name: 'Savings (20%)', actual: ruleAnalysis.savings?.percentage || 0, target: 20, amount: ruleAnalysis.savings?.actual || 0 },
  ];

  // Radar data for category analysis
  const radarData = Object.entries(categoryAnalysis)
    .slice(0, 8)
    .map(([cat, info]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      necessity: info.necessityScore,
      elasticity: Math.round(info.elasticity * 100),
      volatility: info.standardDeviation > 0 ? Math.min(100, Math.round(info.standardDeviation / info.average * 100)) : 0,
    }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BudgetIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                Smart Budget Optimizer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-powered budget recommendations based on your spending patterns
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRetrain}
            disabled={training}
          >
            {training ? 'Retraining...' : 'Retrain Model'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

        {data?.autoTrained && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Model was auto-trained with your latest data. Results will improve with more transaction history.
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1, width: 48, height: 48 }}>
                <BudgetIcon />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" color="text.primary">{formatCurrency(avgIncome)}</Typography>
              <Typography variant="caption" color="text.secondary">Avg Monthly Income</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1, width: 48, height: 48 }}>
                <SavingsIcon />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(totalSavingsPotential)}</Typography>
              <Typography variant="caption" color="text.secondary">Monthly Savings Potential</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1, width: 48, height: 48 }}>
                <CategoryIcon />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" color="text.primary">{data?.totalCategories || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Categories Tracked</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1, width: 48, height: 48 }}>
                <AIIcon />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" color="text.primary">{data?.totalMonthsAnalyzed || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Months Analyzed</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 50/30/20 Rule Analysis */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                50/30/20 Rule Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                How your spending compares to the recommended budget allocation
              </Typography>
              {ruleData.map((item, i) => {
                const overUnder = item.actual - item.target;
                const color = Math.abs(overUnder) <= 5 ? 'success.main' : overUnder > 0 ? 'error.main' : 'warning.main';
                return (
                  <Box key={i} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" color="text.primary">{item.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip size="small" label={`${item.actual}%`} sx={{ fontWeight: 'bold' }} />
                        <Typography variant="caption" sx={{ color }}>
                          {overUnder > 0 ? `+${overUnder}%` : `${overUnder}%`}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ position: 'relative' }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, item.actual * 2)}
                        sx={{
                          height: 12, borderRadius: 2,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 }
                        }}
                      />
                      {/* Target marker */}
                      <Box sx={{
                        position: 'absolute', top: -2, left: `${item.target * 2}%`,
                        width: 2, height: 16, bgcolor: 'text.primary', borderRadius: 1
                      }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Actual: {formatCurrency(item.amount)} • Recommended: {formatCurrency(avgIncome * item.target / 100)}
                    </Typography>
                  </Box>
                );
              })}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                Category Spending Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={muiTheme.palette.divider} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: muiTheme.palette.text.secondary, fontSize: 10 }} />
                  <Radar name="Necessity" dataKey="necessity" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Radar name="Volatility" dataKey="volatility" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Current vs Optimal Budget */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
            Current vs AI-Recommended Budget
          </Typography>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={categoryData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
              <XAxis dataKey="name" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: muiTheme.palette.background.paper,
                  border: `1px solid ${muiTheme.palette.divider}`,
                  borderRadius: 8,
                  color: muiTheme.palette.text.primary,
                }}
                formatter={(val) => formatCurrency(val)}
              />
              <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
              <Bar dataKey="current" name="Current Spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimal" name="AI Recommended" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings Potential" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Detailed Category Table */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
            Detailed Category Optimization
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 'bold' }}>Average</TableCell>
                  <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 'bold' }}>Optimal</TableCell>
                  <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 'bold' }}>Savings</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Volatility</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(categoryAnalysis)
                  .sort((a, b) => b[1].average - a[1].average)
                  .map(([cat, info]) => (
                    <TableRow key={cat} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: info.type === 'essential' ? 'info.main' : info.type === 'discretionary' ? 'warning.main' : 'action.selected' }}>
                            {categoryIcons[cat] || <ReceiptIcon sx={{ fontSize: 16 }} />}
                          </Avatar>
                          <Typography variant="body2" color="text.primary" fontWeight="medium">
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={info.type}
                          color={info.type === 'essential' ? 'info' : info.type === 'discretionary' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.primary' }}>{formatCurrency(info.average)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>{formatCurrency(info.optimalBudget)}</TableCell>
                      <TableCell align="right" sx={{ color: info.savingsPotential > 0 ? 'success.main' : 'text.secondary' }}>
                        {info.savingsPotential > 0 ? formatCurrency(info.savingsPotential) : '—'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, info.elasticity * 100)}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            color={info.elasticity > 0.5 ? 'warning' : 'primary'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(info.elasticity * 100)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {info.trend ? (
                          <Chip
                            size="small"
                            icon={info.trend.slope > 0 ? <TrendIcon /> : <DownIcon />}
                            label={info.trend.slope > 0 ? 'Rising' : 'Falling'}
                            color={info.trend.slope > 0 ? 'error' : 'success'}
                            variant="outlined"
                          />
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Top Optimization Opportunities */}
        {data?.topOptimizations && data.topOptimizations.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <SavingsIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'success.main' }} />
              Top Savings Opportunities
            </Typography>
            <Grid container spacing={2}>
              {data.topOptimizations.map((opt, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card variant="outlined" sx={{ borderColor: 'success.main', borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" color="text.primary" fontWeight="bold">
                          {opt.category?.charAt(0).toUpperCase() + opt.category?.slice(1)}
                        </Typography>
                        <Chip size="small" label={`Save ${formatCurrency(opt.potential)}`} color="success" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Current avg: {formatCurrency(opt.currentAvg)} → Target: {formatCurrency(opt.optimalBudget)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={opt.optimalBudget > 0 ? Math.min(100, Math.round(opt.currentAvg / opt.optimalBudget * 100)) : 0}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                        color={opt.currentAvg > opt.optimalBudget ? 'warning' : 'success'}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
};

export default SmartBudgetOptimizer;
