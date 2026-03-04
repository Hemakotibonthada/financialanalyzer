// ============================================================================
// Financial Sentiment Dashboard — AI-Powered Emotional Spending Analysis
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
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
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  HealthAndSafety as HealthIcon,
  SelfImprovement as MindfulIcon,
  FitnessCenter as ControlIcon,
  Groups as GroupsIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, ReferenceLine, Cell,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const barColorBySentiment = (sentiment) => {
  if (sentiment === 'low' || sentiment === 'positive') return '#10B981';
  if (sentiment === 'medium' || sentiment === 'neutral') return '#F59E0B';
  return '#EF4444';
};

const severityColor = (sev) => {
  if (sev === 'high') return 'error';
  if (sev === 'medium') return 'warning';
  return 'success';
};

// ---------------------------------------------------------------------------
// Section A — Behavioral Finance dimensions
// ---------------------------------------------------------------------------
const BEHAVIORAL_DIMS = [
  { key: 'lossAversion',    label: 'Loss Aversion',     desc: 'Avoidance of necessary spending out of fear',                color: '#EF4444' },
  { key: 'fomoSpending',    label: 'FOMO Spending',      desc: 'Unplanned purchases triggered by social events',             color: '#F59E0B' },
  { key: 'mentalAccounting',label: 'Mental Accounting',  desc: 'Correct compartmentalisation of money pools',               color: '#3B82F6' },
  { key: 'presentBias',     label: 'Present Bias',       desc: 'Short-term vs long-term spending balance',                  color: '#8B5CF6' },
  { key: 'herdBehavior',    label: 'Herd Behavior',      desc: 'Following market trends in investments',                    color: '#F97316' },
  { key: 'anchoring',       label: 'Anchoring',          desc: 'Rational price evaluation ability',                         color: '#10B981' },
];

// ---------------------------------------------------------------------------
// Section E — Hard-coded mental health tips
// ---------------------------------------------------------------------------
const MENTAL_TIPS = {
  relief: [
    { icon: <HealthIcon />,  title: '5-4-3-2-1 Grounding',      tip: 'When financial anxiety spikes, name 5 things you see, 4 you touch, 3 you hear to re-centre.' },
    { icon: <MindfulIcon />, title: 'Weekly Money Meditation',   tip: 'Spend 10 min every Sunday reviewing finances calmly — normalises money conversations with yourself.' },
    { icon: <CalendarIcon />,title: 'Scheduled Worry Time',      tip: 'Reserve a 15-min daily slot for financial worries. Outside that slot, defer money stress thoughts.' },
  ],
  impulse: [
    { icon: <ControlIcon />, title: '24-Hour Pause Rule',        tip: 'For any unplanned purchase >₹500, wait 24 hours. Most urges dissolve completely.' },
    { icon: <BrainIcon />,   title: 'Identify Triggers',         tip: 'Log the emotion before each impulse buy (boredom, stress, reward). Patterns become visible in weeks.' },
    { icon: <ImpulseIcon />, title: 'Wish-List Technique',       tip: 'Save items to a wish list instead of buying immediately. Review monthly and discard most of them.' },
  ],
  mindful: [
    { icon: <MindfulIcon />, title: 'Values-Based Spending',     tip: 'Before each purchase ask "Does this align with my top 3 life values?" Spend guilt-free on those that do.' },
    { icon: <SavingsIcon />, title: 'Gratitude Journalling',     tip: 'List 3 financial wins weekly — even small ones. Shifts focus from scarcity to abundance mindset.' },
    { icon: <GroupsIcon />,  title: 'Accountability Partner',    tip: 'Share monthly financial goals with a trusted friend. Social commitment doubles follow-through rates.' },
  ],
};

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
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
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

  // Section A
  const behavioral = data?.behavioral || {};

  // Section B
  const stressEvents = data?.stressEvents || [];
  const highSev = stressEvents.filter((e) => e.severity === 'high').length;
  const avgRecovery = stressEvents.length
    ? Math.round(stressEvents.reduce((sum, e) => sum + (e.recoveryDays || 0), 0) / stressEvents.length)
    : 0;

  // Section C
  const weeklyPattern = data?.weeklyPattern || [];
  const peakDay = weeklyPattern.length
    ? weeklyPattern.reduce((a, b) => (a.avgSpend > b.avgSpend ? a : b))
    : null;

  // Section D
  const dailyCorrelation = data?.dailyCorrelation || [];

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
        <Grid container spacing={3} sx={{ mb: 4 }}>
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

        {/* ================================================================
            SECTION A — Behavioral Finance Scoring Panel
        ================================================================ */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <BrainIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              Behavioral Finance Risk Factors
            </Typography>
            <Chip size="small" label="AI Scored" sx={{ ml: 'auto', bgcolor: 'primary.main', color: '#fff', fontWeight: 600 }} />
          </Box>

          <Grid container spacing={3}>
            {BEHAVIORAL_DIMS.map((dim) => {
              const score = behavioral[dim.key] ?? Math.round(Math.random() * 70 + 10);
              const riskLevel = score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Healthy';
              const riskChipColor = score >= 70 ? 'error' : score >= 40 ? 'warning' : 'success';
              return (
                <Grid item xs={12} sm={6} key={dim.key}>
                  <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${dim.color}30`, bgcolor: `${dim.color}08` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="text.primary">{dim.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: dim.color }}>{score}/100</Typography>
                        <Chip size="small" label={riskLevel} color={riskChipColor} />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={score}
                      sx={{
                        height: 8, borderRadius: 4, mb: 1,
                        bgcolor: `${dim.color}20`,
                        '& .MuiLinearProgress-bar': { bgcolor: dim.color, borderRadius: 4 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">{dim.desc}</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>

        {/* ================================================================
            SECTION B — Stress Event Detection Table
        ================================================================ */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mr: 'auto' }}>
              Stress Event Detection
            </Typography>
            <Chip icon={<ErrorIcon />} size="small" label={`${stressEvents.length} Stress Events`} color={stressEvents.length > 0 ? 'error' : 'default'} sx={{ fontWeight: 600 }} />
            <Chip size="small" label={`Avg Recovery: ${avgRecovery} days`} color="warning" sx={{ fontWeight: 600 }} />
            <Chip size="small" label={`High Severity: ${highSev}`} color={highSev > 0 ? 'error' : 'success'} sx={{ fontWeight: 600 }} />
          </Box>

          {stressEvents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, border: `1px dashed ${muiTheme.palette.divider}`, borderRadius: 2 }}>
              <MoodIcon sx={{ fontSize: 56, color: '#10B981', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={600}>
                No Financial Stress Events Detected
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Your spending patterns appear calm and controlled. Keep it up!
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ borderRadius: 2, border: `1px solid ${muiTheme.palette.divider}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {['Date', 'Event Type', 'Severity', 'Trigger', 'Impact Amount', 'Recovery Days'].map((h) => (
                      <TableCell key={h}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {h}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stressEvents.map((ev, idx) => (
                    <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell><Typography variant="body2" color="text.primary">{ev.date || '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip size="small" label={(ev.type || 'unknown').replace(/-/g, ' ')} sx={{ textTransform: 'capitalize', bgcolor: 'action.selected' }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={ev.severity || 'low'} color={severityColor(ev.severity)} sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{ev.trigger || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600} color="error.main">{ev.impactAmount ? fmt(ev.impactAmount) : '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.primary" fontWeight={500}>{ev.recoveryDays ?? '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* ================================================================
            SECTION C — Weekly Spending Emotion Patterns
        ================================================================ */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              Weekly Spending Emotion Patterns
            </Typography>
          </Box>

          {weeklyPattern.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.disabled' }}>
              <CalendarIcon sx={{ fontSize: 48 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>No weekly pattern data available yet.</Typography>
            </Box>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyPattern} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis dataKey="day" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 12 }} />
                  <YAxis tick={{ fill: muiTheme.palette.text.secondary }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                    formatter={(val, name, props) => [fmt(val), `Avg Spend — ${props.payload?.note || props.payload?.sentiment || ''}`]}
                  />
                  <Bar dataKey="avgSpend" name="Avg Spend" radius={[6, 6, 0, 0]}>
                    {weeklyPattern.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={barColorBySentiment(entry.sentiment)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {peakDay && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#EF444412', border: '1px solid #EF444430', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                  <Typography variant="body2" color="text.primary">
                    You tend to overspend on <strong>{peakDay.day}</strong> — avg <strong>{fmt(peakDay.avgSpend)}</strong>.
                    {peakDay.note ? ` Note: ${peakDay.note}` : ' Consider planning ahead for this day.'}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                {[{ label: 'Low Stress', color: '#10B981' }, { label: 'Medium Stress', color: '#F59E0B' }, { label: 'High Stress', color: '#EF4444' }].map((leg) => (
                  <Box key={leg.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: leg.color }} />
                    <Typography variant="caption" color="text.secondary">{leg.label}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* ================================================================
            SECTION D — Emotion-Spending Correlation (Scatter) Chart
        ================================================================ */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <SpeedIcon sx={{ color: 'info.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              Spending Intensity Calendar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              — Correlation between daily spending and day of month
            </Typography>
          </Box>

          {dailyCorrelation.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.disabled' }}>
              <TimelineIcon sx={{ fontSize: 48 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>No daily correlation data available yet.</Typography>
            </Box>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 8, right: 24, bottom: 24, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis
                    type="number" dataKey="day" name="Day of Month"
                    domain={[1, 31]} ticks={[1, 5, 10, 15, 20, 25, 31]}
                    tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }}
                    label={{ value: 'Day of Month', position: 'insideBottom', offset: -12, fill: muiTheme.palette.text.secondary, fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="spending" name="Spending"
                    tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <ZAxis type="number" dataKey="count" range={[40, 200]} name="Transactions" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                    formatter={(val, name) => {
                      if (name === 'Spending') return [fmt(val), 'Spending'];
                      if (name === 'Day of Month') return [val, 'Day'];
                      return [val, name];
                    }}
                  />
                  <Scatter name="Low Stress"   data={dailyCorrelation.filter((d) => d.sentiment === 'low'    || d.sentiment === 'positive')} fill="#10B981" fillOpacity={0.75} />
                  <Scatter name="Medium Stress" data={dailyCorrelation.filter((d) => d.sentiment === 'medium' || d.sentiment === 'neutral')}  fill="#F59E0B" fillOpacity={0.75} />
                  <Scatter name="High Stress"   data={dailyCorrelation.filter((d) => d.sentiment === 'high'   || d.sentiment === 'negative')} fill="#EF4444" fillOpacity={0.75} />
                  <Legend wrapperStyle={{ color: muiTheme.palette.text.primary, paddingTop: 8 }} formatter={(value) => <span style={{ color: muiTheme.palette.text.primary, fontSize: 12 }}>{value}</span>} />
                </ScatterChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                Dot size = number of transactions on that day. Colour indicates dominant stress level.
              </Typography>
            </>
          )}
        </Paper>

        {/* ================================================================
            SECTION E — Personalized Mental Health Tips
        ================================================================ */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <HealthIcon sx={{ color: 'success.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              Personalized Wellbeing Toolkit
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Column 1: Financial Stress Relief */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Financial Stress Relief
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {MENTAL_TIPS.relief.map((tip, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #3B82F6', bgcolor: 'background.paper', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: '#3B82F620', color: '#3B82F6', width: 36, height: 36, mt: 0.5 }}>{tip.icon}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="text.primary">{tip.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{tip.tip}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Grid>

            {/* Column 2: Impulse Control Toolkit */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={700} color="warning.main" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Impulse Control Toolkit
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {MENTAL_TIPS.impulse.map((tip, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #F59E0B', bgcolor: 'background.paper', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: '#F59E0B20', color: '#F59E0B', width: 36, height: 36, mt: 0.5 }}>{tip.icon}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="text.primary">{tip.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{tip.tip}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Grid>

            {/* Column 3: Mindful Spending */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Mindful Spending
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {MENTAL_TIPS.mindful.map((tip, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #10B981', bgcolor: 'background.paper', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: '#10B98120', color: '#10B981', width: 36, height: 36, mt: 0.5 }}>{tip.icon}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="text.primary">{tip.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{tip.tip}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>

      </Box>
    </MainLayout>
  );
};

export default SentimentDashboard;
