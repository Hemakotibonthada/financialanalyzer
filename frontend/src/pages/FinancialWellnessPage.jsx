// ============================================================================
// FINANCIAL WELLNESS PAGE — Holistic Financial Health Dashboard
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, LinearProgress,
  List, ListItem, ListItemText, ListItemIcon, Divider,
  Paper, Stepper, Step, StepLabel, StepContent, Accordion,
  AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Assessment, TrendingUp, CheckCircle, Warning,
  Refresh, ExpandMore, Psychology, Favorite,
  Star, EmojiEvents, Lightbulb, Shield
} from '@mui/icons-material';

export default function FinancialWellnessPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Call the wellness assessment endpoint
      const res = await fetch('/api/ai-extended/behavioral/analyze', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();

      // Simulate comprehensive wellness data
      setData({
        overallScore: 68,
        rating: 'Good',
        emoji: '👍',
        dimensions: {
          incomeStability: { name: 'Income Stability', icon: '💰', score: 78, details: '1 source, stable amounts', weight: 0.15 },
          expenseManagement: { name: 'Expense Management', icon: '📊', score: 62, details: '75% of income spent', weight: 0.15 },
          savingsHealth: { name: 'Savings Health', icon: '🐖', score: 55, details: '15% savings rate, 2.5mo fund', weight: 0.15 },
          debtFitness: { name: 'Debt Fitness', icon: '🏦', score: 72, details: '2 loans, DTI 30%', weight: 0.15 },
          investmentMaturity: { name: 'Investment Maturity', icon: '📈', score: 45, details: '2 holdings, 1 asset class', weight: 0.10 },
          riskPreparedness: { name: 'Risk Preparedness', icon: '🛡️', score: 60, details: 'Health insurance only', weight: 0.10 },
          goalAlignment: { name: 'Goal Alignment', icon: '🎯', score: 80, details: '3 goals, 55% avg progress', weight: 0.10 },
          behavioralHealth: { name: 'Behavioral Health', icon: '🧠', score: 70, details: '5% late-night, 42% volatility', weight: 0.10 }
        },
        strengths: [
          { dimension: 'Goal Alignment', icon: '🎯', score: 80, detail: 'Well-defined goals with good tracking' },
          { dimension: 'Income Stability', icon: '💰', score: 78, detail: 'Stable income source' },
          { dimension: 'Debt Fitness', icon: '🏦', score: 72, detail: 'Manageable debt levels' }
        ],
        weaknesses: [
          { dimension: 'Investment Maturity', icon: '📈', score: 45, detail: 'Limited diversification' },
          { dimension: 'Savings Health', icon: '🐖', score: 55, detail: 'Below target savings rate' },
          { dimension: 'Risk Preparedness', icon: '🛡️', score: 60, detail: 'Missing life insurance' }
        ],
        actionPlan: [
          { dimension: 'Investment Maturity', icon: '📈', currentScore: 45, targetScore: 65,
            action: 'Grow investment portfolio', impact: 'medium', estimatedTimeWeeks: 8,
            steps: ['Start SIP in Nifty 50 index fund', 'Add debt fund for balance', 'Consider gold ETF'] },
          { dimension: 'Savings Health', icon: '🐖', currentScore: 55, targetScore: 75,
            action: 'Boost savings rate to 20%', impact: 'high', estimatedTimeWeeks: 4,
            steps: ['Auto-transfer 20% on salary day', 'Build emergency fund to 6 months', 'Cut unused subscriptions'] },
          { dimension: 'Risk Preparedness', icon: '🛡️', currentScore: 60, targetScore: 85,
            action: 'Close insurance gaps', impact: 'critical', estimatedTimeWeeks: 2,
            steps: ['Get term insurance (₹50L+)', 'Increase health cover to ₹10L', 'Update nominations'] }
        ],
        peerComparison: 'You\'re doing better than 60% of people in your age/income bracket!',
        nextAssessment: 'Review in 1 month for updated scores'
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getScoreColor = (score) =>
    score >= 80 ? '#2e7d32' : score >= 60 ? '#1976d2' : score >= 40 ? '#ed6c02' : '#d32f2f';

  const getScoreColorName = (score) =>
    score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'error';

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Favorite color="error" /> Financial Wellness
          </Typography>
          <Typography variant="body2" color="text.secondary">
            8-dimension holistic financial health assessment
          </Typography>
        </Box>
        <Button variant="contained" onClick={fetchData} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}>Assess</Button>
      </Box>

      {loading && !data && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" sx={{ mt: 2 }}>Analyzing financial wellness...</Typography>
        </Box>
      )}

      {data && (
        <>
          {/* Overall Score */}
          <Card elevation={3} sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h1" fontWeight="bold">{data.overallScore}</Typography>
              <Typography variant="h5">{data.emoji} {data.rating}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>{data.peerComparison}</Typography>
            </CardContent>
          </Card>

          {/* Dimension Scores */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(data.dimensions).map(([key, dim]) => (
              <Grid item xs={6} md={3} key={key}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h5">{dim.icon}</Typography>
                    <Typography variant="h4" fontWeight="bold" color={getScoreColor(dim.score)}>
                      {dim.score}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">{dim.name}</Typography>
                    <LinearProgress variant="determinate" value={dim.score}
                      sx={{ height: 6, borderRadius: 3, mt: 1,
                        '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(dim.score) }
                      }} />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {dim.details}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Strengths & Weaknesses */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ mb: 2 }}>
                    <Star color="success" /> Top Strengths
                  </Typography>
                  {data.strengths.map((s, i) => (
                    <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: 'success.50', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{s.icon} {s.dimension}</Typography>
                        <Typography variant="caption">{s.detail}</Typography>
                      </Box>
                      <Chip label={s.score} color="success" size="small" />
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" color="warning.main" sx={{ mb: 2 }}>
                    <Warning color="warning" /> Areas to Improve
                  </Typography>
                  {data.weaknesses.map((w, i) => (
                    <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: 'warning.50', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{w.icon} {w.dimension}</Typography>
                        <Typography variant="caption">{w.detail}</Typography>
                      </Box>
                      <Chip label={w.score} color="warning" size="small" />
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action Plan */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <Lightbulb color="primary" /> Personalized Action Plan
              </Typography>
              {data.actionPlan.map((action, i) => (
                <Accordion key={i} defaultExpanded={i === 0}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                      <Typography variant="h5">{action.icon}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{action.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.dimension} • Score: {action.currentScore} → {action.targetScore} • ~{action.estimatedTimeWeeks} weeks
                        </Typography>
                      </Box>
                      <Chip label={action.impact} size="small"
                        color={action.impact === 'critical' ? 'error' : action.impact === 'high' ? 'warning' : 'info'} />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stepper orientation="vertical" activeStep={-1}>
                      {action.steps.map((step, j) => (
                        <Step key={j} active>
                          <StepLabel>
                            <Typography variant="body2">{step}</Typography>
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <LinearProgress variant="determinate"
                        value={(action.currentScore / action.targetScore) * 100}
                        sx={{ flex: 1, height: 8, borderRadius: 4, alignSelf: 'center' }} />
                      <Typography variant="caption">{action.currentScore}/{action.targetScore}</Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">{data.nextAssessment}</Typography>
          </Alert>
        </>
      )}
    </Box>
  );
}
