// ============================================================================
// Anomaly Detector — AI-Powered Spending Anomaly Detection & Alerts
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Tabs, Tab,
  Badge, useTheme as useMuiTheme
} from '@mui/material';
import {
  BugReport as BugIcon,
  TrendingUp as TrendIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Shield as ShieldIcon,
  Speed as SpeedIcon,
  Notifications as AlertIcon,
  Category as CategoryIcon,
  Store as StoreIcon,
  CalendarMonth as CalendarIcon,
  ArrowUpward as UpIcon,
  MonetizationOn as MoneyIcon,
  Visibility as ViewIcon,
  VerifiedUser as VerifiedIcon,
  GppBad as ThreatIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, ReferenceLine, Cell, ZAxis
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const SEVERITY_CONFIG = {
  critical: { color: '#EF4444', icon: <ErrorIcon />, label: 'Critical' },
  high: { color: '#F97316', icon: <WarningIcon />, label: 'High' },
  medium: { color: '#F59E0B', icon: <InfoIcon />, label: 'Medium' },
  low: { color: '#3B82F6', icon: <InfoIcon />, label: 'Low' },
};

const getSeverity = (score) => score >= 3 ? 'critical' : score >= 2 ? 'high' : score >= 1.5 ? 'medium' : 'low';

const AnomalyDetector = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getStatus();
      // Anomaly data is often under model baselines; try specific endpoint first
      try {
        const { data: anomalyResult } = await aiTrainingService.getModel('anomaly_baselines');
        setData(anomalyResult);
      } catch {
        // Fallback: use the general status
        setData(result?.models?.anomaly_baselines || result);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load anomaly data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('anomaly_baselines');
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
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Scanning for anomalies...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  // Parse anomaly data (flexible structure)
  const anomalies = data?.anomalies || data?.detectedAnomalies || [];
  const categoryBaselines = data?.categoryBaselines || data?.baselines || {};
  const velocityAlerts = data?.velocityAlerts || [];
  const merchantAnomalies = data?.merchantAnomalies || [];
  const totalScanned = data?.transactionsScanned || data?.totalTransactions || 0;
  const anomalyRate = totalScanned > 0 ? anomalies.length / totalScanned : 0;

  const criticalCount = anomalies.filter(a => getSeverity(a.score || a.severity || 1) === 'critical').length;
  const highCount = anomalies.filter(a => getSeverity(a.score || a.severity || 1) === 'high').length;
  const medCount = anomalies.filter(a => getSeverity(a.score || a.severity || 1) === 'medium').length;

  // Baseline chart data
  const baselineData = Object.entries(categoryBaselines).map(([cat, b]) => ({
    category: cat,
    average: b.mean || b.average || 0,
    stdDev: b.stdDev || b.deviation || 0,
    upper: (b.mean || 0) + 2 * (b.stdDev || 0),
  }));

  // Anomaly scatter data
  const scatterData = anomalies.slice(0, 50).map((a, i) => ({
    x: i,
    y: a.amount || a.value || 0,
    z: (a.score || 1) * 15,
    severity: getSeverity(a.score || a.severity || 1),
    description: a.description || a.merchant || a.category || `Txn ${i+1}`,
  }));

  // Anomaly timeline
  const timelineData = useMemo(() => {
    const byDate = {};
    anomalies.forEach(a => {
      const date = (a.date || a.timestamp || '').slice(0, 7) || 'Unknown';
      byDate[date] = (byDate[date] || 0) + 1;
    });
    return Object.entries(byDate).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
  }, [anomalies]);

  const tabContent = [
    // Tab 0: Overview
    () => (
      <Grid container spacing={3}>
        {/* Anomaly Scatter Plot */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <BugIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#EF4444' }} />Detected Anomalies
            </Typography>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis dataKey="x" name="Transaction" tick={{ fill: muiTheme.palette.text.secondary }} label={{ value: 'Transaction Index', fill: muiTheme.palette.text.secondary, position: 'insideBottom', offset: -5 }} />
                  <YAxis dataKey="y" name="Amount" tick={{ fill: muiTheme.palette.text.secondary }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <ZAxis dataKey="z" range={[30, 200]} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                    formatter={(val, name) => name === 'Amount' ? fmt(val) : val}
                    labelFormatter={(l) => scatterData[l]?.description || `Transaction ${l}`} />
                  <Scatter name="Anomalies" data={scatterData}>
                    {scatterData.map((entry, i) => <Cell key={i} fill={SEVERITY_CONFIG[entry.severity].color} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <VerifiedIcon sx={{ fontSize: 64, color: '#10B981' }} />
                <Typography variant="h6" color="#10B981" sx={{ mt: 2 }}>No Anomalies Detected</Typography>
                <Typography color="text.secondary">All transactions look normal.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <CalendarIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Anomaly Timeline
            </Typography>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                  <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                  <Bar dataKey="count" name="Anomalies" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No timeline data.</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    ),
    // Tab 1: Category Baselines
    () => (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
          <CategoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Category Spending Baselines
        </Typography>
        {baselineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={baselineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
              <XAxis dataKey="category" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: muiTheme.palette.text.secondary }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                formatter={(val) => fmt(val)} />
              <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
              <Bar dataKey="average" name="Average" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="upper" name="Upper Limit (2σ)" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography color="text.secondary" sx={{ mt: 1 }}>Baselines not yet calculated. Click "Retrain" to generate.</Typography>
          </Box>
        )}
      </Paper>
    ),
    // Tab 2: Anomaly List
    () => (
      <Paper sx={{ borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }} align="center">Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {anomalies.length > 0 ? anomalies.slice(0, 100).map((a, i) => {
                const sev = getSeverity(a.score || a.severity || 1);
                const config = SEVERITY_CONFIG[sev];
                return (
                  <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Chip size="small" icon={config.icon} label={config.label}
                        sx={{ bgcolor: config.color + '20', color: config.color, '& .MuiChip-icon': { color: config.color }, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.primary">{a.description || a.merchant || 'Unknown transaction'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" sx={{ color: config.color }}>{fmt(a.amount || a.value)}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{a.category || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{a.date || a.timestamp || '—'}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={(a.score || 0).toFixed(1)} sx={{ bgcolor: config.color + '15', color: config.color, fontWeight: 700, minWidth: 40 }} />
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <VerifiedIcon sx={{ fontSize: 40, color: '#10B981' }} />
                    <Typography color="text.secondary" sx={{ mt: 1 }}>No anomalies found. Your spending patterns are clean!</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    ),
  ];

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ShieldIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Anomaly Detector</Typography>
              <Typography variant="body2" color="text.secondary">AI-powered unusual transaction detection with statistical baselines</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain Baselines'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Anomaly baselines auto-trained.</Alert>}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Total Anomalies', value: anomalies.length, icon: <Badge badgeContent={criticalCount} color="error"><BugIcon /></Badge>, color: '#EF4444' },
            { label: 'Critical', value: criticalCount, icon: <ThreatIcon />, color: '#EF4444' },
            { label: 'High Risk', value: highCount, icon: <WarningIcon />, color: '#F97316' },
            { label: 'Anomaly Rate', value: `${(anomalyRate * 100).toFixed(1)}%`, icon: <SpeedIcon />, color: anomalyRate > 0.05 ? '#EF4444' : '#10B981' },
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

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, bgcolor: 'background.paper', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}>
            <Tab label="Overview" icon={<ViewIcon />} iconPosition="start" />
            <Tab label="Baselines" icon={<CategoryIcon />} iconPosition="start" />
            <Tab label={`Anomaly List (${anomalies.length})`} icon={<AlertIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {tabContent[tab]()}
      </Box>
    </MainLayout>
  );
};

export default AnomalyDetector;
