// ============================================================================
// Goal Forecaster — AI-Powered Financial Goal Achievement Prediction
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress, Divider,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  Flag as GoalIcon,
  TrendingUp as TrendIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  EmojiEvents as TrophyIcon,
  Timer as TimerIcon,
  Savings as SavingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  CalendarMonth as CalendarIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Star as StarIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const getGoalColor = (prob) => prob >= 0.7 ? '#10B981' : prob >= 0.4 ? '#F59E0B' : '#EF4444';
const getGoalStatus = (prob) => prob >= 0.8 ? 'On Track' : prob >= 0.5 ? 'At Risk' : prob >= 0.2 ? 'Behind' : 'Critical';
const getGoalStatusIcon = (prob) => prob >= 0.7 ? <CheckIcon /> : prob >= 0.4 ? <WarningIcon /> : <CancelIcon />;

const GoalForecaster = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getGoalForecast();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load goal forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('goal_forecaster');
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
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Analyzing goal trajectories...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const goals = data?.goals || data?.goalAssessments || [];
  const overallFeasibility = data?.overallFeasibility ?? goals.reduce((s, g) => s + (g.probability || 0), 0) / Math.max(goals.length, 1);
  const savingsRequired = data?.totalSavingsRequired || goals.reduce((s, g) => s + (g.monthlySavingsNeeded || 0), 0);
  const onTrack = goals.filter(g => (g.probability || 0) >= 0.7).length;
  const atRisk = goals.filter(g => (g.probability || 0) >= 0.4 && (g.probability || 0) < 0.7).length;
  const behind = goals.filter(g => (g.probability || 0) < 0.4).length;

  // Chart data for goal comparison
  const goalBarData = goals.map((g, i) => ({
    name: g.name || g.goalName || `Goal ${i+1}`,
    probability: (g.probability || 0) * 100,
    saved: g.currentAmount || g.saved || 0,
    target: g.targetAmount || g.target || 0,
    fill: getGoalColor(g.probability || 0),
  }));

  // Savings projection
  const projectionData = (data?.savingsProjection || []).map((p, i) => ({
    month: p.month || p.period || `Month ${i+1}`,
    projected: p.projected || p.cumulativeSavings || 0,
    required: p.required || p.targetLine || 0,
    optimal: p.optimal || (p.required || 0) * 1.2,
  }));

  // Radar data for goal health factors
  const radarData = [
    { factor: 'Savings Rate', value: (data?.factors?.savingsRate || 0.5) * 100 },
    { factor: 'Consistency', value: (data?.factors?.consistency || 0.5) * 100 },
    { factor: 'Income Growth', value: (data?.factors?.incomeGrowth || 0.5) * 100 },
    { factor: 'Debt Ratio', value: (1 - (data?.factors?.debtRatio || 0.3)) * 100 },
    { factor: 'Timeline', value: (data?.factors?.timeline || 0.5) * 100 },
    { factor: 'Diversification', value: (data?.factors?.diversification || 0.5) * 100 },
  ];

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GoalIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Goal Forecaster</Typography>
              <Typography variant="body2" color="text.secondary">AI prediction of financial goal achievement probabilities</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain Model'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Goal model auto-trained.</Alert>}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Overall Feasibility', value: `${(overallFeasibility * 100).toFixed(0)}%`, icon: <SpeedIcon />, color: getGoalColor(overallFeasibility) },
            { label: 'On Track', value: onTrack, icon: <CheckIcon />, color: '#10B981' },
            { label: 'At Risk', value: atRisk, icon: <WarningIcon />, color: '#F59E0B' },
            { label: 'Monthly Needed', value: fmt(savingsRequired), icon: <SavingsIcon />, color: '#3B82F6' },
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

        {/* Goal Cards */}
        {goals.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <TrophyIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />Goal Achievement Forecast
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {goals.map((goal, i) => {
                const prob = goal.probability || 0;
                const color = getGoalColor(prob);
                const pctSaved = goal.targetAmount ? ((goal.currentAmount || goal.saved || 0) / goal.targetAmount * 100) : 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: `4px solid ${color}` }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold" color="text.primary" noWrap>
                            {goal.name || goal.goalName || `Goal ${i+1}`}
                          </Typography>
                          <Chip size="small" label={getGoalStatus(prob)} icon={getGoalStatusIcon(prob)}
                            sx={{ bgcolor: color + '20', color: color, fontWeight: 600, '& .MuiChip-icon': { color } }} />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Target: {fmt(goal.targetAmount || goal.target)}</Typography>
                          <Typography variant="caption" color="text.secondary">Saved: {fmt(goal.currentAmount || goal.saved)}</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={Math.min(100, pctSaved)}
                          sx={{ height: 8, borderRadius: 4, mb: 1.5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />

                        <Grid container spacing={1}>
                          <Grid item xs={4} sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ color }}>{(prob * 100).toFixed(0)}%</Typography>
                            <Typography variant="caption" color="text.secondary">Probability</Typography>
                          </Grid>
                          <Grid item xs={4} sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight="bold" color="text.primary">{goal.monthsRemaining || goal.timeLeft || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">Months Left</Typography>
                          </Grid>
                          <Grid item xs={4} sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight="bold" color="text.primary">{fmt(goal.monthlySavingsNeeded || goal.monthlyRequired)}</Typography>
                            <Typography variant="caption" color="text.secondary">/month</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        )}

        {/* Charts Row */}
        <Grid container spacing={3}>
          {/* Goal Probability Bar Chart */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Achievement Probability
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={goalBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: muiTheme.palette.text.secondary }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                    formatter={(val) => `${val.toFixed(1)}%`} />
                  <Bar dataKey="probability" name="Probability %" radius={[0, 6, 6, 0]}>
                    {goalBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Radar */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <StarIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />Goal Health Factors
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={muiTheme.palette.divider} />
                  <PolarAngleAxis dataKey="factor" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: muiTheme.palette.text.disabled, fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="Score" dataKey="value" stroke="#3B82F6" fill="#3B82F640" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Savings Projection */}
          {projectionData.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                  <SavingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Savings Projection
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                      formatter={(val) => fmt(val)} />
                    <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                    <Area type="monotone" dataKey="optimal" fill="#10B98115" stroke="#10B981" strokeDasharray="4 4" name="Optimal Path" />
                    <Area type="monotone" dataKey="projected" fill="#3B82F620" stroke="#3B82F6" strokeWidth={2} name="Projected Savings" />
                    <Area type="monotone" dataKey="required" fill="#EF444415" stroke="#EF4444" strokeDasharray="4 4" name="Required Line" />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default GoalForecaster;
