// ============================================================================
// Income Forecast — AI-Powered Income Prediction & Source Analysis
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress, Table,
  TableHead, TableBody, TableRow, TableCell, TableContainer, Divider,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  Verified as StableIcon,
  Warning as WarningIcon,
  PieChart as PieIcon,
  Timeline as TimelineIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as ArrowDownIcon,
  MonetizationOn as MoneyIcon,
  WorkOutline as WorkIcon,
  Business as BusinessIcon,
  AccountBalance as BankIcon,
  CardGiftcard as GiftIcon
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, ReferenceLine, Cell
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const sourceIcons = {
  salary: <WorkIcon />, business: <BusinessIcon />, investment: <BankIcon />,
  freelance: <WorkIcon />, rental: <BusinessIcon />, gift: <GiftIcon />,
  dividend: <MoneyIcon />, interest: <BankIcon />, other: <MoneyIcon />,
};

const SOURCE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const IncomeForecast = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getIncomeForecast();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load income forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('income_predictor');
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
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Forecasting income patterns...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const forecast = data?.forecast || data?.predictions || [];
  const sources = data?.sources || data?.incomeSources || [];
  const stability = data?.stability ?? data?.stabilityScore ?? 0.5;
  const currentIncome = data?.currentMonthly || data?.averageIncome || 0;
  const nextMonth = forecast[0] || {};
  const growthRate = data?.growthRate || 0;
  const diversification = data?.diversificationScore || sources.length / 5;

  // Forecast line data
  const forecastData = forecast.map((f, i) => ({
    month: f.month || f.period || `Month ${i+1}`,
    predicted: f.predicted || f.amount || 0,
    upper: f.upper || (f.predicted || 0) * 1.1,
    lower: f.lower || (f.predicted || 0) * 0.9,
    actual: f.actual || null,
  }));

  // Source pie data
  const pieData = sources.map((s, i) => ({
    name: s.source || s.name || `Source ${i+1}`,
    value: s.monthlyAverage || s.amount || 0,
    color: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  const stabilityColor = stability >= 0.7 ? '#10B981' : stability >= 0.4 ? '#F59E0B' : '#EF4444';
  const stabilityLabel = stability >= 0.7 ? 'Highly Stable' : stability >= 0.4 ? 'Moderate' : 'Volatile';

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WalletIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Income Forecast</Typography>
              <Typography variant="body2" color="text.secondary">AI-powered income prediction with source analysis and stability scoring</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain Model'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Income model auto-trained with your data.</Alert>}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Current Monthly', value: fmt(currentIncome), icon: <MoneyIcon />, color: '#3B82F6' },
            { label: 'Next Month Predicted', value: fmt(nextMonth.predicted || nextMonth.amount), icon: <TrendIcon />, color: '#10B981' },
            { label: 'Growth Rate', value: `${(growthRate * 100).toFixed(1)}%`, icon: growthRate >= 0 ? <UpIcon /> : <ArrowDownIcon />, color: growthRate >= 0 ? '#10B981' : '#EF4444' },
            { label: 'Income Stability', value: `${(stability * 100).toFixed(0)}%`, icon: stability >= 0.7 ? <StableIcon /> : <WarningIcon />, color: stabilityColor },
          ].map((card, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: card.color + '40' }}>
                <CardContent sx={{ pb: '12px !important', textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: card.color + '20', mx: 'auto', mb: 1, width: 40, height: 40, color: card.color }}>{card.icon}</Avatar>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: card.color }}>{card.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Forecast Chart + Source Breakdown */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Income Forecast Timeline
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                  <YAxis tick={{ fill: muiTheme.palette.text.secondary }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                    formatter={(val) => fmt(val)} />
                  <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                  <Area type="monotone" dataKey="upper" fill="#3B82F610" stroke="none" name="Upper Bound" />
                  <Area type="monotone" dataKey="lower" fill="transparent" stroke="none" name="Lower Bound" />
                  <Line type="monotone" dataKey="predicted" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5 }} name="Predicted" />
                  {forecastData.some(d => d.actual) && (
                    <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#10B981' }} name="Actual" />
                  )}
                  <ReferenceLine y={currentIncome} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Current', fill: '#F59E0B', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <PieIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Income Sources
              </Typography>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(val) => fmt(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 1 }}>
                    {pieData.map((s, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                          <Typography variant="body2" color="text.primary">{s.name}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold" color="text.primary">{fmt(s.value)}/mo</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <WalletIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography color="text.secondary">No income sources detected yet.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Stability + Diversification */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>Stability Analysis</Typography>
              <Box sx={{ textAlign: 'center', my: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress variant="determinate" value={stability * 100} size={120} thickness={6} sx={{ color: stabilityColor }} />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: stabilityColor }}>{(stability * 100).toFixed(0)}%</Typography>
                  </Box>
                </Box>
                <Typography variant="body1" sx={{ mt: 2, color: stabilityColor, fontWeight: 600 }}>{stabilityLabel}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">{sources.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Income Sources</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">{(diversification * 100).toFixed(0)}%</Typography>
                  <Typography variant="caption" color="text.secondary">Diversification</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: growthRate >= 0 ? '#10B981' : '#EF4444' }}>{growthRate >= 0 ? '+' : ''}{(growthRate * 100).toFixed(1)}%</Typography>
                  <Typography variant="caption" color="text.secondary">Monthly Growth</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>Source Trend</Typography>
              {sources.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sources.map((s, i) => ({
                    name: s.source || s.name || `Source ${i+1}`,
                    current: s.monthlyAverage || s.currentAmount || s.amount || 0,
                    predicted: s.predicted || (s.monthlyAverage || 0) * (1 + growthRate),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="name" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                      formatter={(val) => fmt(val)} />
                    <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                    <Bar dataKey="current" fill="#3B82F6" name="Current Avg" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="predicted" fill="#10B981" name="Next Month" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">Insufficient data for source trends.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default IncomeForecast;
