// ============================================================================
// Financial Sentiment Dashboard — AI-Powered Emotional Spending Analysis
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  SentimentSatisfiedAlt as HappyIcon,
  SentimentVeryDissatisfied as SadIcon,
  SentimentNeutral as NeutralIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  Timeline as TimelineIcon,
  Lightbulb as InsightIcon,
  ShoppingCart as ImpulseIcon,
  Savings as SavingsIcon,
  AccountBalance as BudgetIcon,
  Mood as MoodIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, ReferenceLine, Cell
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const sentimentColors = {
  positive: '#10B981', neutral: '#F59E0B', negative: '#EF4444',
  optimistic: '#10B981', cautious: '#F59E0B', stressed: '#EF4444',
};

const sentimentIcons = {
  positive: <HappyIcon />, neutral: <NeutralIcon />, negative: <SadIcon />,
  optimistic: <HappyIcon />, cautious: <NeutralIcon />, stressed: <SadIcon />,
};

const getColor = (score) => score >= 0.6 ? '#10B981' : score >= 0.4 ? '#F59E0B' : '#EF4444';
const getLabel = (score) => score >= 0.7 ? 'Optimistic' : score >= 0.5 ? 'Stable' : score >= 0.3 ? 'Cautious' : 'Stressed';

const SentimentDashboard = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getSentiment();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sentiment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('sentiment_analyzer');
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
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Analyzing financial sentiment...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const monthlySentiment = data?.monthlySentiment || data?.monthly || [];
  const currentSentiment = monthlySentiment[monthlySentiment.length - 1] || {};
  const overallScore = currentSentiment.overallScore || currentSentiment.score || data?.overallScore || 0.5;
  const sentimentLabel = getLabel(overallScore);
  const sentimentColor = getColor(overallScore);

  // Chart data
  const chartData = monthlySentiment.map((m, i) => ({
    month: m.month || m.period || `Month ${i+1}`,
    score: (m.overallScore || m.score || 0.5) * 100,
    savingsRate: (m.savingsRate || 0) * 100,
    impulseRatio: (m.impulseRatio || 0) * 100,
    budgetAdherence: (m.budgetAdherence || 0) * 100,
  }));

  // Indicator breakdown
  const indicators = [
    { label: 'Savings Rate', value: currentSentiment.savingsRate || 0, icon: <SavingsIcon />, desc: 'Portion of income saved', goodAbove: 0.2 },
    { label: 'Budget Adherence', value: currentSentiment.budgetAdherence || 0, icon: <BudgetIcon />, desc: 'How well you stick to budgets', goodAbove: 0.7 },
    { label: 'Impulse Spending', value: currentSentiment.impulseRatio || 0, icon: <ImpulseIcon />, desc: 'Unplanned purchases ratio', goodBelow: 0.15 },
    { label: 'Spending Stability', value: currentSentiment.stability || currentSentiment.spendingStability || 0, icon: <SpeedIcon />, desc: 'Consistency of spending', goodAbove: 0.6 },
  ];

  // Sentiment trend
  const trendDirection = chartData.length >= 2 ? (chartData[chartData.length-1].score - chartData[chartData.length-2].score) : 0;

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MoodIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Financial Sentiment</Typography>
              <Typography variant="body2" color="text.secondary">AI analysis of your financial emotional health based on spending behavior</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Sentiment model auto-trained.</Alert>}

        {/* Overall Sentiment Score */}
        <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', mb: 4, border: `2px solid ${sentimentColor}22` }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress
                  variant="determinate" value={overallScore * 100}
                  size={140} thickness={5}
                  sx={{ color: sentimentColor }}
                />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ fontSize: 40 }}>
                    {sentimentIcons[sentimentLabel.toLowerCase()] || <MoodIcon sx={{ fontSize: 40, color: sentimentColor }} />}
                  </Box>
                </Box>
              </Box>
              <Typography variant="h5" fontWeight="bold" sx={{ color: sentimentColor }}>{sentimentLabel}</Typography>
              <Chip
                size="small"
                icon={trendDirection > 0 ? <TrendIcon /> : trendDirection < 0 ? <DownIcon /> : <NeutralIcon />}
                label={trendDirection > 0 ? 'Improving' : trendDirection < 0 ? 'Declining' : 'Stable'}
                sx={{ mt: 1, bgcolor: (trendDirection >= 0 ? '#10B981' : '#EF4444') + '20', color: trendDirection >= 0 ? '#10B981' : '#EF4444' }}
              />
            </Grid>

            <Grid item xs={12} md={9}>
              {/* Indicator Cards */}
              <Grid container spacing={2}>
                {indicators.map((ind, i) => {
                  const isGood = ind.goodAbove ? ind.value >= ind.goodAbove : ind.value <= (ind.goodBelow || 0.5);
                  const pct = Math.abs(ind.value) * 100;
                  const indColor = isGood ? '#10B981' : '#EF4444';
                  return (
                    <Grid item xs={6} sm={3} key={i}>
                      <Card variant="outlined" sx={{ borderRadius: 2, borderColor: indColor + '40' }}>
                        <CardContent sx={{ pb: '12px !important', textAlign: 'center' }}>
                          <Avatar sx={{ bgcolor: indColor + '20', mx: 'auto', mb: 1, width: 36, height: 36, color: indColor }}>
                            {ind.icon}
                          </Avatar>
                          <Typography variant="h6" fontWeight="bold" sx={{ color: indColor }}>
                            {pct.toFixed(0)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">{ind.label}</Typography>
                          <LinearProgress
                            variant="determinate" value={Math.min(100, pct)}
                            sx={{ mt: 1, height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: indColor } }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        {/* Sentiment Timeline */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
            <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Sentiment Over Time
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
              <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: muiTheme.palette.text.secondary }} />
              <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                formatter={(val) => `${val.toFixed(1)}%`} />
              <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
              <ReferenceLine y={50} stroke={muiTheme.palette.text.disabled} strokeDasharray="4 4" label={{ value: 'Neutral', fill: muiTheme.palette.text.disabled, fontSize: 10 }} />
              <Area type="monotone" dataKey="score" fill="#3B82F620" stroke="none" name="Score Area" />
              <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5, fill: '#3B82F6' }} name="Sentiment Score" />
              <Line type="monotone" dataKey="savingsRate" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4" name="Savings %" />
              <Line type="monotone" dataKey="budgetAdherence" stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="4 4" name="Budget Adherence %" />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>

        {/* Monthly Breakdown + Impulse Analysis */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <ImpulseIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Impulse vs Planned Spending
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: muiTheme.palette.text.secondary }} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                    formatter={(val) => `${val.toFixed(1)}%`} />
                  <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                  <Bar dataKey="impulseRatio" name="Impulse %" fill="#EF4444" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="budgetAdherence" name="Planned %" fill="#10B981" radius={[4, 4, 0, 0]} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <InsightIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />Sentiment Insights
              </Typography>
              {monthlySentiment.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Auto-generate insights from data */}
                  {overallScore >= 0.6 && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#10B98115' }}>
                      <Typography variant="body2" color="text.primary">
                        <HappyIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#10B981', fontSize: 18 }} />
                        Your financial sentiment is <strong>positive</strong>. Good savings habits and controlled spending detected.
                      </Typography>
                    </Box>
                  )}
                  {overallScore < 0.4 && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#EF444415' }}>
                      <Typography variant="body2" color="text.primary">
                        <SadIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#EF4444', fontSize: 18 }} />
                        Financial stress indicators detected. Consider reviewing impulse purchases and setting stricter budgets.
                      </Typography>
                    </Box>
                  )}
                  {(currentSentiment.impulseRatio || 0) > 0.15 && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F59E0B15' }}>
                      <Typography variant="body2" color="text.primary">
                        <ImpulseIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#F59E0B', fontSize: 18 }} />
                        Impulse spending ratio is <strong>{((currentSentiment.impulseRatio || 0) * 100).toFixed(0)}%</strong>. Try the 24-hour rule before unplanned purchases.
                      </Typography>
                    </Box>
                  )}
                  {(currentSentiment.savingsRate || 0) >= 0.2 && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#10B98115' }}>
                      <Typography variant="body2" color="text.primary">
                        <SavingsIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#10B981', fontSize: 18 }} />
                        Excellent savings rate of <strong>{((currentSentiment.savingsRate || 0) * 100).toFixed(0)}%</strong>! You're on track for financial goals.
                      </Typography>
                    </Box>
                  )}
                  {trendDirection > 5 && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#3B82F615' }}>
                      <Typography variant="body2" color="text.primary">
                        <TrendIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#3B82F6', fontSize: 18 }} />
                        Your sentiment is <strong>improving</strong>! Keep up the financial discipline.
                      </Typography>
                    </Box>
                  )}
                  {monthlySentiment.length < 3 && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="body2" color="text.secondary">
                        <BrainIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 18 }} />
                        Add more transaction history for deeper sentiment analysis. At least 3 months recommended.
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <MoodIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography color="text.secondary" sx={{ mt: 1 }}>No sentiment data available yet.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default SentimentDashboard;
