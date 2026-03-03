// ============================================================================
// Spending Forecast — AI-Powered Spending Predictions Dashboard
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Divider,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  ShowChart as ForecastIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  CalendarMonth as CalendarIcon,
  Category as CategoryIcon,
  CompareArrows as CompareIcon,
  WbSunny as SeasonIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  Speed as SpeedIcon,
  AttachMoney as MoneyIcon,
  Timeline as TimelineIcon,
  Insights as InsightIcon,
  Warning as WarningIcon,
  AccountBalance as BudgetIcon
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, ReferenceLine
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const SpendingForecast = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);
  const [chartView, setChartView] = useState('line');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getSpendingForecast();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load spending forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('spending_patterns');
      await fetchData();
    } catch (err) {
      setError('Retraining failed');
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
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Forecasting spending patterns with Holt-Winters...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const forecast = data?.forecast || data?.monthlyForecast || [];
  const trends = data?.categoryTrends || data?.trends || {};
  const seasonal = data?.seasonalPatterns || data?.seasonal || {};
  const dayPatterns = data?.dayOfWeekPatterns || data?.dayPatterns || {};
  const hourPatterns = data?.hourOfDayPatterns || data?.hourPatterns || {};
  const monthlyHistory = data?.monthlyTotals || data?.history || [];

  // Combine history + forecast for chart
  const chartData = useMemo(() => {
    const history = monthlyHistory.map(m => ({
      month: m.month || m.label,
      actual: m.total || m.amount || 0,
      type: 'actual',
    }));
    const fcast = forecast.map((f, i) => ({
      month: f.month || f.label || `Forecast ${i+1}`,
      forecast: f.predicted || f.amount || f.value || 0,
      lower: f.lower || (f.predicted || 0) * 0.85,
      upper: f.upper || (f.predicted || 0) * 1.15,
      type: 'forecast',
    }));
    return [...history, ...fcast];
  }, [monthlyHistory, forecast]);

  // Category trends for table
  const categoryTrendData = useMemo(() => {
    return Object.entries(trends)
      .map(([cat, info]) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        slope: info.slope || 0,
        average: info.average || info.mean || 0,
        trend: (info.slope || 0) > 0 ? 'rising' : 'falling',
        volatility: info.volatility || info.stdDev || 0,
      }))
      .sort((a, b) => Math.abs(b.slope) - Math.abs(a.slope));
  }, [trends]);

  // Day of week
  const dayData = useMemo(() => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    if (Array.isArray(dayPatterns)) return dayPatterns.map((v, i) => ({ name: days[i]?.substring(0,3), amount: v }));
    return Object.entries(dayPatterns).map(([d, v]) => ({ name: d.substring(0, 3), amount: typeof v === 'number' ? v : v.average || 0 }));
  }, [dayPatterns]);

  // Seasonal
  const seasonalData = useMemo(() => {
    if (Array.isArray(seasonal)) return seasonal.map((v, i) => ({ month: `M${i+1}`, index: v }));
    return Object.entries(seasonal).map(([m, v]) => ({ month: m, index: typeof v === 'number' ? v : v.index || 0 }));
  }, [seasonal]);

  // Next month predicted
  const nextMonthPrediction = forecast[0]?.predicted || forecast[0]?.amount || 0;
  const lastActual = monthlyHistory[monthlyHistory.length - 1]?.total || monthlyHistory[monthlyHistory.length - 1]?.amount || 0;
  const changePercent = lastActual > 0 ? ((nextMonthPrediction - lastActual) / lastActual * 100) : 0;

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ForecastIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Spending Forecast</Typography>
              <Typography variant="body2" color="text.secondary">Holt-Winters exponential smoothing with seasonal decomposition</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Spending model auto-trained with your data.</Alert>}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1, width: 44, height: 44 }}><ForecastIcon /></Avatar>
              <Typography variant="h5" fontWeight="bold" color="text.primary">{fmt(nextMonthPrediction)}</Typography>
              <Typography variant="caption" color="text.secondary">Next Month Predicted</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: changePercent > 0 ? 'error.main' : 'success.main', mx: 'auto', mb: 1, width: 44, height: 44 }}>
                {changePercent > 0 ? <TrendIcon /> : <DownIcon />}
              </Avatar>
              <Typography variant="h5" fontWeight="bold" sx={{ color: changePercent > 0 ? 'error.main' : 'success.main' }}>
                {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">vs Last Month</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1, width: 44, height: 44 }}><CalendarIcon /></Avatar>
              <Typography variant="h5" fontWeight="bold" color="text.primary">{forecast.length}</Typography>
              <Typography variant="caption" color="text.secondary">Months Forecasted</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1, width: 44, height: 44 }}><CategoryIcon /></Avatar>
              <Typography variant="h5" fontWeight="bold" color="text.primary">{categoryTrendData.length}</Typography>
              <Typography variant="caption" color="text.secondary">Categories Tracked</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Main Forecast Chart */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Spending Forecast Timeline
            </Typography>
            <ToggleButtonGroup value={chartView} exclusive onChange={(_, v) => v && setChartView(v)} size="small">
              <ToggleButton value="line">Line</ToggleButton>
              <ToggleButton value="area">Area</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
              <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
              <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
              <Tooltip
                contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                formatter={(val) => fmt(val)}
              />
              <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
              {/* Confidence Band */}
              <Area type="monotone" dataKey="upper" fill="#3B82F620" stroke="none" name="Upper Bound" />
              <Area type="monotone" dataKey="lower" fill="#3B82F620" stroke="none" name="Lower Bound" />
              {/* Actual */}
              <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} name="Actual" connectNulls={false} />
              {/* Forecast */}
              <Line type="monotone" dataKey="forecast" stroke="#3B82F6" strokeWidth={2.5} strokeDasharray="8 4" dot={{ r: 4, fill: '#3B82F6' }} name="Forecast" connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>

        {/* Category Trends + Day of Week */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <CategoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Category Trend Analysis
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Average</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Trend</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Volatility</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryTrendData.slice(0, 10).map((row, i) => (
                      <TableRow key={row.name} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                            <Typography variant="body2" color="text.primary">{row.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'text.primary' }}>{fmt(row.average)}</TableCell>
                        <TableCell>
                          <Chip size="small" icon={row.trend === 'rising' ? <TrendIcon /> : <DownIcon />}
                            label={`${row.slope > 0 ? '+' : ''}${row.slope.toFixed(0)}/mo`}
                            color={row.trend === 'rising' ? 'error' : 'success'} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, row.volatility > 0 ? Math.min(100, (row.volatility / row.average * 100)) : 0)}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            color={row.volatility / (row.average || 1) > 0.3 ? 'warning' : 'primary'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <CalendarIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Day of Week Patterns
              </Typography>
              {dayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="name" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                      formatter={(val) => fmt(val)} />
                    <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CalendarIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography color="text.secondary">Not enough data for day patterns.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Seasonal Patterns */}
        {seasonalData.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <SeasonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Seasonal Spending Index
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Values above 1.0 indicate higher-than-average spending periods</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={seasonalData}>
                <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                <YAxis domain={[0, 'auto']} tick={{ fill: muiTheme.palette.text.secondary }} />
                <ReferenceLine y={1} stroke={muiTheme.palette.text.secondary} strokeDasharray="4 4" label={{ value: 'Average', fill: muiTheme.palette.text.secondary, fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                <Bar dataKey="index" name="Seasonal Index" radius={[4, 4, 0, 0]}>
                  {seasonalData.map((entry, i) => (
                    <Cell key={i} fill={entry.index > 1 ? '#EF4444' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
};

export default SpendingForecast;
