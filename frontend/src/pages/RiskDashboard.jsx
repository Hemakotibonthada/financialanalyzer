import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Paper, Alert, CircularProgress, Tabs, Tab, Button, Tooltip, Divider
} from '@mui/material';
import {
  Warning, TrendingUp, Shield, AccountBalance, CreditCard,
  Savings, Assessment, Psychology, Speed, Timeline, BarChart as BarChartIcon,
  CheckCircle, Error, Info, ExpandMore
} from '@mui/icons-material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import { useTheme } from '../context/ThemeContext';

// ==============================
// Static Reference Data
// ==============================

const RISK_FACTORS = [
  { id: 'emergency_fund', name: 'Emergency Fund', icon: '🛡️', benchmark: 6, unit: 'months', description: 'Months of expenses covered by emergency savings', weight: 15 },
  { id: 'debt_to_income', name: 'Debt-to-Income', icon: '⚖️', benchmark: 36, unit: '%', description: 'Percentage of income going to debt payments', weight: 15, inverted: true },
  { id: 'savings_rate', name: 'Savings Rate', icon: '💰', benchmark: 20, unit: '%', description: 'Percentage of income being saved', weight: 12 },
  { id: 'credit_utilization', name: 'Credit Utilization', icon: '💳', benchmark: 30, unit: '%', description: 'Percentage of available credit being used', weight: 12, inverted: true },
  { id: 'insurance_coverage', name: 'Insurance Coverage', icon: '🏥', benchmark: 100, unit: '%', description: 'Adequacy of insurance coverage', weight: 10 },
  { id: 'investment_diversification', name: 'Diversification', icon: '📊', benchmark: 80, unit: '%', description: 'Portfolio diversification score', weight: 10 },
  { id: 'income_stability', name: 'Income Stability', icon: '📈', benchmark: 90, unit: '%', description: 'Regularity and predictability of income', weight: 10 },
  { id: 'expense_volatility', name: 'Expense Control', icon: '📉', benchmark: 20, unit: '%', description: 'Monthly expense variation (lower is better)', weight: 8, inverted: true },
  { id: 'net_worth_growth', name: 'Net Worth Growth', icon: '🚀', benchmark: 10, unit: '%', description: 'Year-over-year net worth growth rate', weight: 8 },
];

const STRESS_SCENARIOS = [
  { id: 'job_loss', name: 'Job Loss', description: 'What if you lose your primary income source?', icon: '💼', severity: 'high', factors: ['emergency_fund', 'debt_to_income', 'savings_rate'] },
  { id: 'medical_emergency', name: 'Medical Emergency', description: 'Can you handle a major medical expense?', icon: '🏥', severity: 'high', factors: ['emergency_fund', 'insurance_coverage'] },
  { id: 'market_crash', name: 'Market Crash', description: 'Impact of a 40% portfolio decline', icon: '📉', severity: 'medium', factors: ['investment_diversification', 'net_worth_growth'] },
  { id: 'interest_rate_hike', name: 'Interest Rate Hike', description: 'Effect of 2% interest rate increase on loans', icon: '📈', severity: 'medium', factors: ['debt_to_income', 'credit_utilization'] },
  { id: 'income_reduction', name: 'Income Reduction', description: 'What if your income drops by 30%?', icon: '💸', severity: 'medium', factors: ['debt_to_income', 'savings_rate', 'expense_volatility'] },
  { id: 'inflation_surge', name: 'Inflation Surge', description: 'Impact of 10% inflation on your finances', icon: '🔥', severity: 'low', factors: ['savings_rate', 'investment_diversification', 'net_worth_growth'] },
];

const RiskDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [riskData, setRiskData] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);

  const { isDark } = useTheme();
  const cardSx = { bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: isDark ? '#334155' : '#e2e8f0' };
  const subTextColor = isDark ? '#94a3b8' : 'text.secondary';

  useEffect(() => {
    const fetchRiskData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/analytics/health-score');
        const data = res.data?.data || res.data || {};
        setRiskData(data);
        setRiskHistory(data.history || []);
      } catch (err) {
        console.error('Error fetching risk data:', err);
        try {
          const fallback = await api.get('/risk-assessment/quick');
          const data = fallback.data?.data || fallback.data || {};
          setRiskData(data);
          setRiskHistory(data.history || []);
        } catch (err2) {
          console.error('Error fetching risk assessment:', err2);
          setError('Failed to load risk assessment data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRiskData();
  }, []);

  const overallScore = riskData?.overallScore ?? riskData?.score ?? 0;

  const factorValues = useMemo(() => {
    if (!riskData) return {};
    return riskData.factors || {};
  }, [riskData]);

  const computedFactors = useMemo(() => {
    return RISK_FACTORS.map(factor => {
      const value = factorValues[factor.id] ?? 0;
      let score;
      if (factor.inverted) {
        score = value <= factor.benchmark ? 100 : Math.max(0, 100 - ((value - factor.benchmark) / factor.benchmark) * 100);
      } else {
        score = Math.min(100, (value / factor.benchmark) * 100);
      }
      return { ...factor, value, score: Math.round(score) };
    });
  }, [factorValues]);

  const radarData = useMemo(() =>
    computedFactors.map(f => ({ factor: f.name, score: f.score, benchmark: 70 })),
  [computedFactors]);

  const stressResults = useMemo(() => {
    return STRESS_SCENARIOS.map(scenario => {
      const relatedFactors = computedFactors.filter(f => scenario.factors.includes(f.id));
      const avgScore = relatedFactors.length > 0 ? relatedFactors.reduce((s, f) => s + f.score, 0) / relatedFactors.length : 50;
      let resilience;
      if (avgScore >= 75) resilience = 'Strong';
      else if (avgScore >= 50) resilience = 'Moderate';
      else resilience = 'Vulnerable';
      return { ...scenario, avgScore: Math.round(avgScore), resilience, relatedFactors };
    });
  }, [computedFactors]);

  const actionItems = useMemo(() => {
    return computedFactors
      .filter(f => f.score < 70)
      .sort((a, b) => a.score - b.score)
      .map(f => ({
        factor: f.name,
        icon: f.icon,
        score: f.score,
        priority: f.score < 40 ? 'High' : f.score < 60 ? 'Medium' : 'Low',
        suggestion: f.inverted
          ? `Reduce your ${f.name.toLowerCase()} from ${f.value}${f.unit} to below ${f.benchmark}${f.unit}.`
          : `Improve your ${f.name.toLowerCase()} from ${f.value}${f.unit} to at least ${f.benchmark}${f.unit}.`,
      }));
  }, [computedFactors]);

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <MainLayout title="Risk Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography sx={{ mt: 2 }} color="text.secondary">Analyzing your risk profile...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return <MainLayout title="Risk Dashboard"><Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box></MainLayout>;
  }

  return (
    <MainLayout title="Risk Dashboard">
    <Box sx={{ p: 3, bgcolor: isDark ? '#0f172a' : 'transparent', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: isDark ? '#f1f5f9' : 'inherit' }}>Risk Dashboard</Typography>
          <Typography sx={{ color: subTextColor }}>Comprehensive financial risk assessment</Typography>
        </Box>
        <Chip icon={<Assessment />} label={`Score: ${overallScore}/100 — ${getScoreLabel(overallScore)}`}
          sx={{ bgcolor: getScoreColor(overallScore) + '20', color: getScoreColor(overallScore), fontWeight: 600, fontSize: '0.85rem', height: 36 }} />
      </Box>

      {/* Overall Score Card */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${getScoreColor(overallScore)}15, ${getScoreColor(overallScore)}05)`, border: '1px solid', borderColor: `${getScoreColor(overallScore)}40` }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={overallScore} size={120}
                  sx={{ color: getScoreColor(overallScore), '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <Typography variant="h3" fontWeight={700} sx={{ color: getScoreColor(overallScore) }}>{overallScore}</Typography>
                  <Typography variant="caption" color="text.secondary">/ 100</Typography>
                </Box>
              </Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1, color: getScoreColor(overallScore) }}>{getScoreLabel(overallScore)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Grid container spacing={2}>
                {computedFactors.slice(0, 6).map(f => (
                  <Grid size={{ xs: 6, md: 4 }} key={f.id}>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{f.icon} {f.name}</Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ color: getScoreColor(f.score) }}>{f.score}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={f.score} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: 'background.default', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: getScoreColor(f.score) } }} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: isDark ? '#334155' : 'divider', '& .MuiTab-root': { color: isDark ? '#94a3b8' : undefined }, '& .Mui-selected': { color: isDark ? '#60a5fa' : 'primary.main' }, '& .MuiTabs-indicator': { bgcolor: isDark ? '#60a5fa' : 'primary.main' } }}>
        <Tab icon={<Assessment />} label="Risk Factors" iconPosition="start" />
        <Tab icon={<Warning />} label="Stress Tests" iconPosition="start" />
        <Tab icon={<Timeline />} label="History" iconPosition="start" />
        <Tab icon={<CheckCircle />} label="Action Items" iconPosition="start" />
      </Tabs>

      {/* Risk Factors Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Risk Profile Radar</Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Your Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    <Radar name="Benchmark" dataKey="benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeDasharray="5 5" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Factor Details</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {computedFactors.map(f => (
                    <Box key={f.id} sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? '#0f172a' : 'action.hover' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" component="span">{f.icon}</Typography>
                          <Typography variant="subtitle2" fontWeight={600}>{f.name}</Typography>
                          <Chip label={`${f.weight}% weight`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ color: getScoreColor(f.score) }}>
                            {f.value}{f.unit}
                          </Typography>
                          <Chip label={`${f.score}/100`} size="small" sx={{ bgcolor: getScoreColor(f.score) + '20', color: getScoreColor(f.score), fontSize: '0.65rem', height: 20, fontWeight: 600 }} />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{f.description}</Typography>
                      <LinearProgress variant="determinate" value={f.score} sx={{ height: 5, borderRadius: 3, bgcolor: 'background.default', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: getScoreColor(f.score) } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                        Benchmark: {f.benchmark}{f.unit} {f.inverted ? '(lower is better)' : '(higher is better)'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Stress Tests Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {stressResults.map(scenario => (
            <Grid size={{ xs: 12, md: 6 }} key={scenario.id}>
              <Card sx={{ border: '1px solid', borderColor: scenario.resilience === 'Strong' ? '#10b98140' : scenario.resilience === 'Moderate' ? '#f59e0b40' : '#ef444440', bgcolor: 'background.paper', color: 'text.primary' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" component="span">{scenario.icon}</Typography>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>{scenario.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{scenario.description}</Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={scenario.resilience}
                      size="small"
                      sx={{
                        bgcolor: scenario.resilience === 'Strong' ? '#10b98120' : scenario.resilience === 'Moderate' ? '#f59e0b20' : '#ef444420',
                        color: scenario.resilience === 'Strong' ? '#10b981' : scenario.resilience === 'Moderate' ? '#f59e0b' : '#ef4444',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Resilience Score</Typography>
                      <Typography variant="caption" fontWeight={600}>{scenario.avgScore}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={scenario.avgScore}
                      sx={{ height: 8, borderRadius: 4, bgcolor: 'background.default', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: getScoreColor(scenario.avgScore) } }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">Related factors:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {scenario.relatedFactors.map(f => (
                      <Chip key={f.id} label={`${f.icon} ${f.name}: ${f.score}%`} size="small" variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 20, borderColor: getScoreColor(f.score), color: getScoreColor(f.score) }} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* History Tab */}
      {activeTab === 2 && (
        <Card sx={cardSx}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Risk Score Trend</Typography>
            {riskHistory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">No historical data available yet.</Typography>
                <Typography variant="caption" color="text.secondary">Risk history will appear here as data is collected over time.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={riskHistory}>
                  <defs>
                    <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#f1f5f9' : '#1e293b' }} />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fill="url(#gradScore)" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Items Tab */}
      {activeTab === 3 && (
        <Box>
          {actionItems.length === 0 ? (
            <Card sx={cardSx}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircle sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                <Typography variant="h6" fontWeight={600}>All Clear!</Typography>
                <Typography color="text.secondary">All your risk factors are within healthy ranges.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {actionItems.map((item, i) => (
                <Grid size={{ xs: 12, md: 6 }} key={i}>
                  <Card sx={{ borderLeft: 4, borderColor: item.priority === 'High' ? 'error.main' : item.priority === 'Medium' ? 'warning.main' : 'info.main', bgcolor: 'background.paper', color: 'text.primary' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" component="span">{item.icon}</Typography>
                          <Typography variant="subtitle1" fontWeight={600}>{item.factor}</Typography>
                        </Box>
                        <Chip label={`${item.priority} Priority`} size="small"
                          color={item.priority === 'High' ? 'error' : item.priority === 'Medium' ? 'warning' : 'info'} />
                      </Box>
                      <LinearProgress variant="determinate" value={item.score}
                        sx={{ height: 6, borderRadius: 3, mb: 1, bgcolor: 'background.default', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: getScoreColor(item.score) } }} />
                      <Typography variant="body2" color="text.secondary">{item.suggestion}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
    </MainLayout>
  );
};

export default RiskDashboard;
