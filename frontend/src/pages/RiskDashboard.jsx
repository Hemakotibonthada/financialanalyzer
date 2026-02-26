import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, IconButton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, LinearProgress, Tooltip, Avatar, Divider, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Slider, Badge, ToggleButton, ToggleButtonGroup, Switch, FormControlLabel
} from '@mui/material';
import {
  Shield, Warning, CheckCircle, ErrorOutline, TrendingUp, TrendingDown,
  Assessment, Speed, Info, Refresh, Download, Help, Lightbulb,
  AccountBalance, CreditCard, Savings, House, HealthAndSafety,
  Work, LocalAtm, Timeline, ArrowForward, Star, FiberManualRecord,
  GppGood, GppBad, GppMaybe, Security
} from '@mui/icons-material';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Legend, Tooltip as RechartsTooltip, LineChart, Line
} from 'recharts';
import '../../styles/animations.css';

// ============================================================
// Feature #101: Risk Assessment Dashboard
// ============================================================

// Risk factors configuration
const RISK_FACTORS = [
  {
    id: 'savings_rate',
    name: 'Savings Rate',
    description: 'Percentage of income saved each month',
    weight: 15,
    icon: <Savings />,
    color: '#4CAF50',
    benchmark: { poor: 5, fair: 10, good: 20, excellent: 30 },
    unit: '%',
    tip: 'Aim to save at least 20% of your income. The 50/30/20 rule recommends 20% for savings.',
  },
  {
    id: 'emergency_fund',
    name: 'Emergency Fund',
    description: 'Months of expenses covered by emergency savings',
    weight: 15,
    icon: <Shield />,
    color: '#2196F3',
    benchmark: { poor: 1, fair: 3, good: 6, excellent: 12 },
    unit: ' months',
    tip: 'Build an emergency fund covering 6 months of expenses. Keep it in liquid funds or savings accounts.',
  },
  {
    id: 'debt_to_income',
    name: 'Debt-to-Income Ratio',
    description: 'Monthly debt payments as percentage of income',
    weight: 15,
    icon: <CreditCard />,
    color: '#F44336',
    benchmark: { excellent: 10, good: 20, fair: 35, poor: 50 },
    unit: '%',
    tip: 'Keep total EMIs below 35% of income. High DTI ratio increases financial stress risk.',
    inverse: true,
  },
  {
    id: 'insurance_coverage',
    name: 'Insurance Coverage',
    description: 'Life insurance as multiple of annual income',
    weight: 12,
    icon: <HealthAndSafety />,
    color: '#9C27B0',
    benchmark: { poor: 2, fair: 5, good: 10, excellent: 15 },
    unit: 'x income',
    tip: 'Get term insurance of 10-15x annual income. Also ensure adequate health insurance.',
  },
  {
    id: 'income_stability',
    name: 'Income Stability',
    description: 'Consistency of income over past 12 months',
    weight: 10,
    icon: <Work />,
    color: '#FF9800',
    benchmark: { poor: 30, fair: 60, good: 80, excellent: 95 },
    unit: '%',
    tip: 'Diversify income sources. Consider freelancing, investments, or passive income streams.',
  },
  {
    id: 'expense_volatility',
    name: 'Expense Discipline',
    description: 'How consistent your spending patterns are',
    weight: 8,
    icon: <Assessment />,
    color: '#00BCD4',
    benchmark: { poor: 40, fair: 60, good: 75, excellent: 90 },
    unit: '%',
    tip: 'Track spending regularly. Large unexpected expenses indicate poor financial planning.',
  },
  {
    id: 'investment_diversification',
    name: 'Portfolio Diversification',
    description: 'How well-diversified your investments are',
    weight: 12,
    icon: <AccountBalance />,
    color: '#795548',
    benchmark: { poor: 20, fair: 40, good: 60, excellent: 80 },
    unit: '%',
    tip: 'Diversify across equity, debt, gold, and real estate. Don\'t put all eggs in one basket.',
  },
  {
    id: 'credit_utilization',
    name: 'Credit Utilization',
    description: 'Percentage of available credit being used',
    weight: 8,
    icon: <LocalAtm />,
    color: '#E91E63',
    benchmark: { excellent: 10, good: 30, fair: 50, poor: 80 },
    unit: '%',
    tip: 'Keep credit card utilization below 30%. Request credit limit increases to lower the ratio.',
    inverse: true,
  },
  {
    id: 'retirement_readiness',
    name: 'Retirement Planning',
    description: 'Progress towards retirement corpus goal',
    weight: 5,
    icon: <Timeline />,
    color: '#607D8B',
    benchmark: { poor: 10, fair: 30, good: 50, excellent: 75 },
    unit: '%',
    tip: 'Start early! Even small SIPs compound significantly. Aim for 25-30x annual expenses.',
  },
];

// Stress test scenarios
const STRESS_SCENARIOS = [
  {
    id: 'job_loss',
    name: 'Job Loss',
    icon: '💼',
    description: 'What if you lose your job for 6 months?',
    params: { incomeReduction: 100, duration: 6, additionalExpenses: 0 },
    likelihood: 'medium',
  },
  {
    id: 'medical_emergency',
    name: 'Medical Emergency',
    icon: '🏥',
    description: 'Major surgery or hospitalization costing ₹5L',
    params: { incomeReduction: 0, duration: 1, additionalExpenses: 500000 },
    likelihood: 'low',
  },
  {
    id: 'market_crash',
    name: 'Market Crash',
    icon: '📉',
    description: 'Stock market drops 40% in 3 months',
    params: { investmentLoss: 40, duration: 3, additionalExpenses: 0 },
    likelihood: 'low',
  },
  {
    id: 'income_reduction',
    name: 'Income Cut',
    icon: '💸',
    description: 'Salary reduced by 30% for 12 months',
    params: { incomeReduction: 30, duration: 12, additionalExpenses: 0 },
    likelihood: 'medium',
  },
  {
    id: 'interest_rate_hike',
    name: 'Interest Rate Hike',
    icon: '📊',
    description: 'Loan interest rates increase by 2%',
    params: { interestIncrease: 2, duration: 12, additionalExpenses: 0 },
    likelihood: 'high',
  },
  {
    id: 'inflation_spike',
    name: 'High Inflation',
    icon: '🔥',
    description: 'Inflation rises to 12% for a year',
    params: { expenseIncrease: 12, duration: 12, additionalExpenses: 0 },
    likelihood: 'medium',
  },
];

// Mock user risk data
const USER_RISK_DATA = {
  savings_rate: 25,
  emergency_fund: 4,
  debt_to_income: 28,
  insurance_coverage: 8,
  income_stability: 85,
  expense_volatility: 72,
  investment_diversification: 55,
  credit_utilization: 35,
  retirement_readiness: 30,
};

// Historical risk score
const RISK_HISTORY = [
  { month: 'Jul', score: 58, category: 'Fair' },
  { month: 'Aug', score: 60, category: 'Fair' },
  { month: 'Sep', score: 62, category: 'Good' },
  { month: 'Oct', score: 59, category: 'Fair' },
  { month: 'Nov', score: 64, category: 'Good' },
  { month: 'Dec', score: 67, category: 'Good' },
  { month: 'Jan', score: 65, category: 'Good' },
  { month: 'Feb', score: 70, category: 'Good' },
  { month: 'Mar', score: 68, category: 'Good' },
  { month: 'Apr', score: 72, category: 'Good' },
  { month: 'May', score: 71, category: 'Good' },
  { month: 'Jun', score: 74, category: 'Good' },
];

const RiskDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [riskData, setRiskData] = useState(USER_RISK_DATA);
  const [selectedStressTest, setSelectedStressTest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  // Calculate individual factor scores (0-100)
  const calculateFactorScore = (factor, value) => {
    const { benchmark, inverse } = factor;
    if (inverse) {
      if (value <= benchmark.excellent) return 100;
      if (value <= benchmark.good) return 75;
      if (value <= benchmark.fair) return 50;
      return 25;
    }
    if (value >= benchmark.excellent) return 100;
    if (value >= benchmark.good) return 75;
    if (value >= benchmark.fair) return 50;
    if (value >= benchmark.poor) return 25;
    return 10;
  };

  const getRating = (score) => {
    if (score >= 80) return { label: 'Excellent', color: '#4CAF50', icon: <GppGood /> };
    if (score >= 60) return { label: 'Good', color: '#2196F3', icon: <GppMaybe /> };
    if (score >= 40) return { label: 'Fair', color: '#FF9800', icon: <GppMaybe /> };
    return { label: 'Poor', color: '#F44336', icon: <GppBad /> };
  };

  // Overall risk score
  const overallScore = useMemo(() => {
    let totalWeight = 0;
    let weightedScore = 0;

    RISK_FACTORS.forEach(factor => {
      const value = riskData[factor.id] || 0;
      const score = calculateFactorScore(factor, value);
      weightedScore += score * factor.weight;
      totalWeight += factor.weight;
    });

    return Math.round(weightedScore / totalWeight);
  }, [riskData]);

  // Factor details with scores
  const factorDetails = useMemo(() => {
    return RISK_FACTORS.map(factor => {
      const value = riskData[factor.id] || 0;
      const score = calculateFactorScore(factor, value);
      const rating = getRating(score);
      return { ...factor, value, score, rating };
    });
  }, [riskData]);

  // Radar chart data
  const radarData = factorDetails.map(f => ({
    subject: f.name.split(' ').slice(0, 2).join(' '),
    score: f.score,
    fullMark: 100,
  }));

  // Action items
  const actionItems = useMemo(() => {
    const items = [];
    factorDetails.forEach(f => {
      if (f.score < 50) {
        items.push({
          priority: 'high',
          factor: f.name,
          action: f.tip,
          impact: `+${Math.round((75 - f.score) * f.weight / 100)} points`,
          color: '#F44336',
        });
      } else if (f.score < 75) {
        items.push({
          priority: 'medium',
          factor: f.name,
          action: f.tip,
          impact: `+${Math.round((100 - f.score) * f.weight / 100)} points`,
          color: '#FF9800',
        });
      }
    });
    return items.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  }, [factorDetails]);

  // Stress test results
  const stressTestResult = useMemo(() => {
    if (!selectedStressTest) return null;
    const scenario = STRESS_SCENARIOS.find(s => s.id === selectedStressTest);
    if (!scenario) return null;

    const monthlyIncome = 85000;
    const monthlyExpenses = 55000;
    const savings = 380000;
    const investments = 1200000;

    const { params } = scenario;
    const incReduction = (params.incomeReduction || 0) / 100;
    const months = params.duration;
    const additionalExp = params.additionalExpenses || 0;
    const investLoss = (params.investmentLoss || 0) / 100;
    const expIncrease = (params.expenseIncrease || 0) / 100;
    const intIncrease = params.interestIncrease || 0;

    const adjustedIncome = monthlyIncome * (1 - incReduction);
    const adjustedExpenses = monthlyExpenses * (1 + expIncrease / 12);
    const monthlyDeficit = adjustedIncome - adjustedExpenses;
    const totalDeficit = monthlyDeficit * months;
    const additionalEMI = intIncrease > 0 ? intIncrease * 150 * months : 0;
    const investmentLoss = investments * investLoss;
    const totalImpact = -totalDeficit + additionalExp + investmentLoss + additionalEMI;
    const remainingSavings = savings - (totalImpact > 0 ? totalImpact : 0);
    const monthsOfRunway = remainingSavings > 0 ? Math.floor(remainingSavings / adjustedExpenses) : 0;
    const canSurvive = remainingSavings > 0;

    return {
      scenario: scenario.name,
      totalImpact,
      remainingSavings,
      monthsOfRunway,
      canSurvive,
      adjustedIncome: adjustedIncome * months,
      adjustedExpenses: adjustedExpenses * months,
      investmentLoss,
      additionalExp,
    };
  }, [selectedStressTest]);

  const overallRating = getRating(overallScore);

  return (
    <Box sx={{ p: 3, animation: 'fadeInUp 0.6s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Risk Assessment</Typography>
          <Typography color="text.secondary">Comprehensive financial risk analysis and stress testing</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Download />}>Export Report</Button>
          <Button variant="contained" startIcon={<Refresh />}>Reassess</Button>
        </Box>
      </Box>

      {/* Overall Score Card */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${overallRating.color}15, ${overallRating.color}05)`, border: '1px solid', borderColor: `${overallRating.color}30` }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Box sx={{
                  width: 160, height: 160, borderRadius: '50%',
                  border: '8px solid', borderColor: overallRating.color,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  animation: 'scaleIn 0.8s ease-out',
                }}>
                  <Typography variant="h2" fontWeight={800} sx={{ color: overallRating.color }}>{overallScore}</Typography>
                  <Typography variant="caption" color="text.secondary">out of 100</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={overallRating.icon}
                  label={overallRating.label}
                  sx={{ bgcolor: `${overallRating.color}20`, color: overallRating.color, fontWeight: 600, fontSize: '1rem', height: 36 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Financial Health Summary</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {factorDetails.slice(0, 5).map(f => (
                  <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FiberManualRecord sx={{ fontSize: 10, color: f.rating.color }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>{f.name}</Typography>
                    <Chip label={f.rating.label} size="small" sx={{ bgcolor: `${f.rating.color}15`, color: f.rating.color, fontSize: '0.65rem' }} />
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {factorDetails.slice(5).map(f => (
                  <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FiberManualRecord sx={{ fontSize: 10, color: f.rating.color }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>{f.name}</Typography>
                    <Chip label={f.rating.label} size="small" sx={{ bgcolor: `${f.rating.color}15`, color: f.rating.color, fontSize: '0.65rem' }} />
                  </Box>
                ))}
              </Box>
              <Alert severity={actionItems.length > 3 ? 'warning' : 'info'} sx={{ mt: 2 }} icon={false}>
                <Typography variant="caption">{actionItems.length} improvement actions identified</Typography>
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Assessment />} label="Risk Factors" iconPosition="start" />
        <Tab icon={<Shield />} label="Stress Tests" iconPosition="start" />
        <Tab icon={<Timeline />} label="Risk History" iconPosition="start" />
        <Tab icon={<Lightbulb />} label="Action Items" iconPosition="start" />
      </Tabs>

      {/* Risk Factors Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Radar Chart */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Risk Profile Radar</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Your Score" dataKey="score" stroke="#2196F3" fill="#2196F3" fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Target" dataKey="fullMark" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.05} strokeWidth={1} strokeDasharray="5 5" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Factor Cards */}
          <Grid item xs={12} md={7}>
            <Grid container spacing={2}>
              {factorDetails.map(factor => (
                <Grid item xs={12} sm={6} key={factor.id}>
                  <Card sx={{
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    borderLeft: 4,
                    borderColor: factor.rating.color,
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: `${factor.color}15`, color: factor.color, width: 32, height: 32 }}>
                            {factor.icon}
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight={600}>{factor.name}</Typography>
                        </Box>
                        <Chip
                          label={factor.rating.label}
                          size="small"
                          sx={{ bgcolor: `${factor.rating.color}15`, color: factor.rating.color, fontSize: '0.65rem' }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {factor.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h5" fontWeight={700}>{factor.value}{factor.unit}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          (Score: {factor.score}/100)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={factor.score}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: '#f0f0f0',
                          '& .MuiLinearProgress-bar': { bgcolor: factor.rating.color, borderRadius: 3 }
                        }}
                      />
                      <Tooltip title={factor.tip} arrow>
                        <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.3, cursor: 'pointer' }}>
                          <Info sx={{ fontSize: 12 }} /> Tip
                        </Typography>
                      </Tooltip>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Stress Tests Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Run stress tests to see how your finances would handle various adverse scenarios.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {STRESS_SCENARIOS.map(scenario => (
              <Grid item xs={12} sm={6} md={4} key={scenario.id}>
                <Card
                  onClick={() => setSelectedStressTest(scenario.id)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedStressTest === scenario.id ? 2 : 1,
                    borderColor: selectedStressTest === scenario.id ? 'primary.main' : 'divider',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h3" component="span">{scenario.icon}</Typography>
                      <Chip
                        label={scenario.likelihood}
                        size="small"
                        color={scenario.likelihood === 'high' ? 'error' : scenario.likelihood === 'medium' ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600}>{scenario.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{scenario.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Stress Test Results */}
          {stressTestResult && (
            <Card sx={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Stress Test Results: {stressTestResult.scenario}
                </Typography>
                <Alert
                  severity={stressTestResult.canSurvive ? 'success' : 'error'}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="body2">
                    {stressTestResult.canSurvive
                      ? `You can survive this scenario with ${stressTestResult.monthsOfRunway} months of runway remaining.`
                      : 'Your current savings would not be sufficient to handle this scenario. Build your emergency fund!'
                    }
                  </Typography>
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Total Impact</Typography>
                      <Typography variant="h6" fontWeight={700} color="error.main">
                        {formatCurrency(stressTestResult.totalImpact)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Remaining Savings</Typography>
                      <Typography variant="h6" fontWeight={700} color={stressTestResult.remainingSavings > 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(Math.max(0, stressTestResult.remainingSavings))}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Months of Runway</Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {stressTestResult.monthsOfRunway} months
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Survival Status</Typography>
                      <Chip
                        icon={stressTestResult.canSurvive ? <CheckCircle /> : <ErrorOutline />}
                        label={stressTestResult.canSurvive ? 'Can Survive' : 'At Risk'}
                        color={stressTestResult.canSurvive ? 'success' : 'error'}
                        sx={{ mt: 0.5 }}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Risk History Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Risk Score Trend (Last 12 Months)</Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={RISK_HISTORY} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#2196F3" strokeWidth={3} dot={{ r: 5 }} name="Risk Score" />
                {/* Reference lines for risk zones */}
                <Line type="monotone" dataKey={() => 80} stroke="#4CAF50" strokeDasharray="5 5" name="Excellent" dot={false} />
                <Line type="monotone" dataKey={() => 60} stroke="#FF9800" strokeDasharray="5 5" name="Good" dot={false} />
                <Line type="monotone" dataKey={() => 40} stroke="#F44336" strokeDasharray="5 5" name="Fair" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
              <Chip label="80+ Excellent" size="small" sx={{ bgcolor: '#4CAF5020', color: '#4CAF50' }} />
              <Chip label="60-79 Good" size="small" sx={{ bgcolor: '#2196F320', color: '#2196F3' }} />
              <Chip label="40-59 Fair" size="small" sx={{ bgcolor: '#FF980020', color: '#FF9800' }} />
              <Chip label="Below 40 Poor" size="small" sx={{ bgcolor: '#F4433620', color: '#F44336' }} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Items Tab */}
      {activeTab === 3 && (
        <Box>
          {actionItems.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={600}>Excellent!</Typography>
              <Typography color="text.secondary">All your risk factors are in great shape.</Typography>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {actionItems.map((item, idx) => (
                <Grid item xs={12} md={6} key={idx}>
                  <Card sx={{
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    borderLeft: 4,
                    borderColor: item.color,
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip
                          label={`${item.priority} priority`}
                          size="small"
                          color={item.priority === 'high' ? 'error' : 'warning'}
                        />
                        <Chip label={item.impact} size="small" variant="outlined" color="success" />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>{item.factor}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.action}</Typography>
                      <Button size="small" endIcon={<ArrowForward />} sx={{ mt: 1 }}>Take Action</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default RiskDashboard;
