// ============================================================================
// Risk Assessment Dashboard — AI-Powered Financial Risk Analysis
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Divider, Avatar, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  Security as SecurityIcon,
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Shield as ShieldIcon,
  TrendingDown as DownIcon,
  TrendingUp as UpIcon,
  MonetizationOn as MoneyIcon,
  AccountBalance as BankIcon,
  LocalHospital as MedicalIcon,
  Work as WorkIcon,
  Savings as SavingsIcon,
  Psychology as BrainIcon,
  Refresh as RefreshIcon,
  HealthAndSafety as HealthIcon,
  Assessment as AssessmentIcon,
  Bolt as StressIcon
} from '@mui/icons-material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const RISK_COLORS = { low: '#10B981', moderate: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
const SCORE_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

const formatCurrency = (amt) => `₹${Math.abs(amt || 0).toLocaleString('en-IN')}`;

const getRiskColor = (level) => RISK_COLORS[level?.toLowerCase()] || '#6B7280';
const getScoreColor = (score) => score >= 80 ? SCORE_COLORS[3] : score >= 60 ? SCORE_COLORS[2] : score >= 40 ? SCORE_COLORS[1] : SCORE_COLORS[0];
const getScoreLabel = (score) => score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Improvement' : 'At Risk';

const stressTestIcons = {
  jobLoss: <WorkIcon />,
  interestRateHike: <BankIcon />,
  medicalEmergency: <MedicalIcon />,
  incomeReduction: <DownIcon />,
};

const factorIcons = {
  incomeStability: <MoneyIcon />,
  expenseControl: <ShieldIcon />,
  debtManagement: <BankIcon />,
  emergencyPreparedness: <SavingsIcon />,
  diversification: <AssessmentIcon />,
  insuranceCoverage: <HealthIcon />,
  savingsTrend: <UpIcon />,
};

const RiskAssessment = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getRiskProfile();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load risk assessment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('risk_profiler');
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
              Computing your financial risk profile...
            </Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const profile = data?.riskProfile || {};
  const overallScore = profile.overallScore || 0;
  const riskLevel = profile.riskLevel || 'unknown';
  const factors = profile.factors || {};
  const stressTests = profile.stressTests || {};
  const metrics = profile.metrics || {};

  // Radar chart data for risk factors
  const radarData = Object.entries(factors)
    .filter(([, info]) => typeof info === 'object' && info.score !== undefined)
    .map(([key, info]) => ({
      factor: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      score: info.score,
      weight: Math.round((info.weight || 0) * 100),
    }));

  // Bar chart data for stress tests
  const stressData = Object.entries(stressTests).map(([key, info]) => ({
    name: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    survivalMonths: info.survivalMonths || 0,
    impactSeverity: info.impactSeverity || 0,
    color: (info.survivalMonths || 0) >= 6 ? '#10B981' : (info.survivalMonths || 0) >= 3 ? '#F59E0B' : '#EF4444',
  }));

  // Score distribution for overall visualization
  const scoreDistribution = [
    { name: 'Score', value: overallScore },
    { name: 'Remaining', value: 100 - overallScore },
  ];

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                Risk Assessment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-powered analysis of your financial resilience and vulnerabilities
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
            Risk model auto-trained with latest data. Add more financial data for improved accuracy.
          </Alert>
        )}

        {/* Overall Risk Score */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={overallScore}
                  size={160}
                  thickness={6}
                  sx={{ color: getScoreColor(overallScore) }}
                />
                <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: getScoreColor(overallScore) }}>
                    {Math.round(overallScore)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">/100</Typography>
                </Box>
              </Box>
              <Chip
                label={getScoreLabel(overallScore)}
                sx={{
                  bgcolor: getScoreColor(overallScore) + '20',
                  color: getScoreColor(overallScore),
                  fontWeight: 'bold', mb: 1, fontSize: '0.95rem', px: 2
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Overall Financial Health Score
              </Typography>
              <Chip
                size="small"
                label={`Risk Level: ${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}`}
                sx={{ mt: 1, bgcolor: getRiskColor(riskLevel) + '20', color: getRiskColor(riskLevel), fontWeight: 'bold' }}
              />
            </Paper>
          </Grid>

          {/* Key Metrics Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {[
                { label: 'Monthly Income', value: formatCurrency(metrics.avgIncome), icon: <MoneyIcon />, color: 'primary.main' },
                { label: 'Monthly Expenses', value: formatCurrency(metrics.avgExpenses), icon: <ShieldIcon />, color: 'warning.main' },
                { label: 'Savings Rate', value: `${metrics.savingsRate?.toFixed(1) || 0}%`, icon: <SavingsIcon />, color: metrics.savingsRate >= 20 ? 'success.main' : 'error.main' },
                { label: 'Debt-to-Income', value: `${metrics.debtToIncome?.toFixed(1) || 0}%`, icon: <BankIcon />, color: (metrics.debtToIncome || 0) <= 40 ? 'success.main' : 'error.main' },
                { label: 'Expense Volatility', value: `${metrics.expenseVolatility?.toFixed(1) || 0}%`, icon: <AssessmentIcon />, color: (metrics.expenseVolatility || 0) <= 15 ? 'success.main' : 'warning.main' },
                { label: 'Emergency Fund', value: `${metrics.emergencyMonths?.toFixed(1) || 0} mo`, icon: <HealthIcon />, color: (metrics.emergencyMonths || 0) >= 6 ? 'success.main' : 'error.main' },
              ].map((metric, i) => (
                <Grid item xs={6} sm={4} key={i}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: metric.color, mx: 'auto', mb: 1, width: 36, height: 36 }}>
                      {metric.icon}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" color="text.primary">{metric.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Risk Factors Radar & Details */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <ShieldIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
                Risk Factor Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={muiTheme.palette.divider} />
                  <PolarAngleAxis dataKey="factor" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: muiTheme.palette.text.secondary, fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.35} />
                  <Radar name="Weight" dataKey="weight" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} />
                  <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                Factor Breakdown
              </Typography>
              {Object.entries(factors)
                .filter(([, info]) => typeof info === 'object' && info.score !== undefined)
                .sort((a, b) => a[1].score - b[1].score)
                .map(([key, info]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                  const color = getScoreColor(info.score);
                  return (
                    <Box key={key} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: color + '20' }}>
                            {factorIcons[key] || <ShieldIcon sx={{ fontSize: 14, color }} />}
                          </Avatar>
                          <Typography variant="body2" color="text.primary" fontWeight="medium">{label}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color, fontWeight: 'bold' }}>
                            {Math.round(info.score)}/100
                          </Typography>
                          <Chip size="small" label={`${Math.round((info.weight || 0) * 100)}%`} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={info.score}
                        sx={{
                          height: 8, borderRadius: 2,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 }
                        }}
                      />
                      {info.details && (
                        <Typography variant="caption" color="text.secondary">{info.details}</Typography>
                      )}
                    </Box>
                  );
                })}
            </Paper>
          </Grid>
        </Grid>

        {/* Stress Tests */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
            <StressIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />
            Financial Stress Tests
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Simulated scenarios to test your financial resilience under adverse conditions
          </Typography>
          <Grid container spacing={3}>
            {Object.entries(stressTests).map(([key, test]) => {
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
              const survivalColor = (test.survivalMonths || 0) >= 6 ? 'success' : (test.survivalMonths || 0) >= 3 ? 'warning' : 'error';
              return (
                <Grid item xs={12} sm={6} key={key}>
                  <Card variant="outlined" sx={{ borderRadius: 2, borderColor: `${survivalColor}.main` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: `${survivalColor}.main`, width: 40, height: 40 }}>
                          {stressTestIcons[key] || <WarningIcon />}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" color="text.primary">{label}</Typography>
                          <Typography variant="caption" color="text.secondary">{test.description || 'Scenario simulation'}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Survival Duration</Typography>
                        <Chip
                          size="small"
                          label={`${test.survivalMonths?.toFixed(1) || 0} months`}
                          color={survivalColor}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, ((test.survivalMonths || 0) / 12) * 100)}
                        sx={{ height: 8, borderRadius: 2, mb: 1 }}
                        color={survivalColor}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          Impact: {test.impactSeverity ? `${Math.round(test.impactSeverity * 100)}%` : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Monthly Shortfall: {test.monthlyShortfall ? formatCurrency(test.monthlyShortfall) : 'None'}
                        </Typography>
                      </Box>
                      {test.recommendations && test.recommendations.length > 0 && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" fontWeight="bold" color="text.primary">Recommendations:</Typography>
                          {test.recommendations.map((rec, i) => (
                            <Typography key={i} variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, pl: 1 }}>
                              • {rec}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>

        {/* AI Recommendations */}
        {profile.recommendations && profile.recommendations.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <BrainIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'secondary.main' }} />
              AI Recommendations
            </Typography>
            <Grid container spacing={2}>
              {profile.recommendations.map((rec, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: rec.priority === 'high' ? 'error.main' : rec.priority === 'medium' ? 'warning.main' : 'info.main' }}>
                      {rec.priority === 'high' ? <WarningIcon sx={{ fontSize: 18 }} /> : <CheckIcon sx={{ fontSize: 18 }} />}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.primary" fontWeight="medium">{rec.title || rec.text || rec}</Typography>
                      {rec.impact && <Typography variant="caption" color="text.secondary">Impact: {rec.impact}</Typography>}
                    </Box>
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

export default RiskAssessment;
