// ============================================================================
// Lifestyle Analytics — AI-Powered Lifestyle Clustering & Analysis
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress,
  Divider, useTheme as useMuiTheme
} from '@mui/material';
import {
  Spa as LifestyleIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  FitnessCenter as FitnessIcon,
  Restaurant as FoodIcon,
  ShoppingCart as ShopIcon,
  DirectionsCar as TransportIcon,
  Movie as EntertainIcon,
  Home as HomeIcon,
  LocalHospital as HealthIcon,
  School as EduIcon,
  Flight as TravelIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  Timeline as TimelineIcon,
  Lightbulb as InsightIcon,
  EmojiEvents as TrophyIcon,
  CompareArrows as CompareIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const clusterIcons = {
  frugal: <FitnessIcon />,
  balanced: <CompareIcon />,
  premium: <TrophyIcon />,
  'high-spender': <ShopIcon />,
  saver: <FitnessIcon />,
  conservative: <HomeIcon />,
};

const clusterColors = {
  frugal: '#10B981',
  balanced: '#3B82F6',
  premium: '#8B5CF6',
  'high-spender': '#EF4444',
  saver: '#10B981',
  conservative: '#06B6D4',
};

const categoryIcons = {
  food: <FoodIcon />, shopping: <ShopIcon />, transport: <TransportIcon />,
  entertainment: <EntertainIcon />, health: <HealthIcon />, education: <EduIcon />,
  travel: <TravelIcon />, rent: <HomeIcon />,
};

const LifestyleAnalytics = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getLifestyle();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lifestyle analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('lifestyle_cluster');
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
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Clustering your lifestyle patterns...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const currentCluster = data?.currentCluster || data?.cluster || {};
  const clusterLabel = currentCluster.label || currentCluster.name || 'Unknown';
  const clusterColor = clusterColors[clusterLabel.toLowerCase()] || '#6B7280';
  const spendingProfile = data?.spendingProfile || data?.categoryBreakdown || {};
  const transitions = data?.transitions || data?.clusterHistory || [];
  const allClusters = data?.allClusters || data?.clusters || [];

  // Radar data for spending profile
  const radarData = Object.entries(spendingProfile)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'object' && v.percentage))
    .slice(0, 8)
    .map(([cat, v]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: typeof v === 'number' ? v : v.percentage || 0,
    }));

  // Cluster comparison
  const clusterComparison = allClusters.map((c, i) => ({
    name: c.label || c.name || `Cluster ${i+1}`,
    members: c.memberCount || c.size || 0,
    avgSpending: c.avgSpending || c.centroid?.reduce?.((s, v) => s + v, 0) || 0,
    fill: COLORS[i % COLORS.length],
  }));

  // Transition timeline
  const transitionData = transitions.map((t, i) => ({
    month: t.month || t.period || `Month ${i+1}`,
    cluster: t.cluster || t.label || '',
    spending: t.totalSpending || t.spending || 0,
  }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LifestyleIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Lifestyle Analytics</Typography>
              <Typography variant="body2" color="text.secondary">AI-powered lifestyle clustering using K-means analysis on spending patterns</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Lifestyle model auto-trained.</Alert>}

        {/* Current Cluster Card */}
        <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', mb: 4, border: `2px solid ${clusterColor}22` }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: clusterColor, width: 80, height: 80, mx: 'auto', mb: 2, fontSize: 36 }}>
                {clusterIcons[clusterLabel.toLowerCase()] || <LifestyleIcon sx={{ fontSize: 36 }} />}
              </Avatar>
              <Typography variant="h4" fontWeight="bold" sx={{ color: clusterColor }}>{clusterLabel}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Your Current Lifestyle Cluster</Typography>
              <Chip
                label={`Confidence: ${((currentCluster.confidence || currentCluster.similarity || 0) * 100).toFixed(0)}%`}
                sx={{ mt: 1, bgcolor: clusterColor + '20', color: clusterColor, fontWeight: 'bold' }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>Spending Profile</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={muiTheme.palette.divider} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: muiTheme.palette.text.secondary, fontSize: 9 }} />
                  <Radar name="Your Profile" dataKey="value" stroke={clusterColor} fill={clusterColor} fillOpacity={0.35} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                </RadarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </Paper>

        {/* Cluster Characteristics & Category Breakdown */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <CategoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Category Breakdown
              </Typography>
              {Object.entries(spendingProfile)
                .filter(([, v]) => typeof v === 'number' || (typeof v === 'object' && v.percentage))
                .sort((a, b) => {
                  const va = typeof a[1] === 'number' ? a[1] : a[1].percentage || 0;
                  const vb = typeof b[1] === 'number' ? b[1] : b[1].percentage || 0;
                  return vb - va;
                })
                .slice(0, 8)
                .map(([cat, v], i) => {
                  const pct = typeof v === 'number' ? v : v.percentage || 0;
                  return (
                    <Box key={cat} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: COLORS[i % COLORS.length] + '20' }}>
                            {categoryIcons[cat] || <CategoryIcon sx={{ fontSize: 14, color: COLORS[i % COLORS.length] }} />}
                          </Avatar>
                          <Typography variant="body2" color="text.primary">{cat.charAt(0).toUpperCase() + cat.slice(1)}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold" color="text.primary">
                          {typeof pct === 'number' && pct < 1 ? `${(pct * 100).toFixed(1)}%` : `${pct.toFixed?.(1) || pct}%`}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, pct < 1 ? pct * 100 : pct)}
                        sx={{ height: 8, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: COLORS[i % COLORS.length], borderRadius: 2 } }}
                      />
                    </Box>
                  );
                })}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <CompareIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Cluster Comparison
              </Typography>
              {clusterComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clusterComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="name" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                    <Bar dataKey="members" name="Members" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgSpending" name="Avg Spending" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CompareIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography color="text.secondary" sx={{ mt: 1 }}>Not enough data for cluster comparison yet.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Lifestyle Transitions Timeline */}
        {transitionData.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Lifestyle Evolution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>How your spending lifestyle has evolved over time</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={transitionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                  formatter={(val) => fmt(val)} />
                <Area type="monotone" dataKey="spending" stroke={clusterColor} fill={clusterColor} fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* Insights */}
        {(data?.insights || data?.recommendations) && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <InsightIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />AI Lifestyle Insights
            </Typography>
            <Grid container spacing={2}>
              {(data.insights || data.recommendations || []).map((insight, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS[i % COLORS.length] + '20' }}>
                      <InsightIcon sx={{ fontSize: 18, color: COLORS[i % COLORS.length] }} />
                    </Avatar>
                    <Typography variant="body2" color="text.primary">{typeof insight === 'string' ? insight : insight.text || insight.message}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
};

export default LifestyleAnalytics;
