// ============================================================================
// CREDIT SCORE PREDICTOR PAGE — AI Credit Health Dashboard
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  List, ListItem, ListItemText, ListItemIcon, Divider,
  Paper, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Assessment, TrendingUp, TrendingDown, CheckCircle,
  Warning, ExpandMore, Refresh, Psychology, PlayArrow,
  Security, CreditCard, AccountBalance, Timeline
} from '@mui/icons-material';

export default function CreditScorePredictorPage() {
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [simResult, setSimResult] = useState(null);

  const fetchScore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-advanced/credit/score', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setScoreData(data.data);
    } catch (err) {
      console.error('Credit score error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScore(); }, [fetchScore]);

  const runSimulation = async (type) => {
    try {
      const res = await fetch('/api/ai-advanced/credit/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ scenario: { type } })
      });
      const data = await res.json();
      if (data.success) setSimResult(data.data);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 800) return '#1b5e20';
    if (score >= 750) return '#2e7d32';
    if (score >= 700) return '#f9a825';
    if (score >= 650) return '#e65100';
    return '#b71c1c';
  };

  const getFactorIcon = (factor) => {
    switch (factor) {
      case 'paymentHistory': return <CreditCard color="primary" />;
      case 'creditUtilization': return <Assessment color="warning" />;
      case 'creditAge': return <Timeline color="info" />;
      case 'creditMix': return <AccountBalance color="secondary" />;
      case 'recentInquiries': return <Security color="error" />;
      case 'totalDebt': return <AccountBalance color="warning" />;
      default: return <Assessment />;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color="primary" /> AI Credit Score Predictor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Predict, simulate, and improve your credit score with AI analysis
          </Typography>
        </Box>
        <Button variant="contained" startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          onClick={fetchScore} disabled={loading}>Refresh</Button>
      </Box>

      {loading && !scoreData && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Analyzing credit factors...</Typography>
        </Box>
      )}

      {scoreData && (
        <>
          {/* Score Display */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card elevation={3} sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={((scoreData.score - 300) / 600) * 100}
                      size={160} thickness={6} sx={{ color: getScoreColor(scoreData.score) }} />
                    <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <Typography variant="h2" fontWeight="bold" color={getScoreColor(scoreData.score)}>
                        {scoreData.score}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">/ 900</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ mt: 1 }}>{scoreData.rating}</Typography>
                  {scoreData.trend && (
                    <Chip
                      icon={scoreData.trend.direction === 'improving' ? <TrendingUp /> : <TrendingDown />}
                      label={`${scoreData.trend.direction} (${scoreData.trend.change > 0 ? '+' : ''}${scoreData.trend.change})`}
                      color={scoreData.trend.direction === 'improving' ? 'success' : scoreData.trend.direction === 'declining' ? 'error' : 'default'}
                      size="small" sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Credit Factors</Typography>
                  {scoreData.factors && Object.entries(scoreData.factors).map(([name, factor]) => (
                    <Box key={name} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getFactorIcon(name)}
                          <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                            {name.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={factor.rating} size="small"
                            color={factor.score >= 80 ? 'success' : factor.score >= 50 ? 'warning' : 'error'} />
                          <Typography variant="body2" fontWeight="bold">{Math.round(factor.score)}/100</Typography>
                        </Box>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(factor.score, 100)}
                        sx={{ height: 8, borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: factor.score >= 80 ? 'success.main' : factor.score >= 50 ? 'warning.main' : 'error.main',
                            borderRadius: 4
                          }
                        }} />
                      <Typography variant="caption" color="text.secondary">
                        Weight: {(factor.weight * 100).toFixed(0)}% | Impact: {factor.weightedScore.toFixed(1)} pts
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="Recommendations" icon={<CheckCircle />} />
            <Tab label="What-If Simulator" icon={<Psychology />} />
          </Tabs>

          {/* Recommendations Tab */}
          {activeTab === 0 && scoreData.recommendations && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Improvement Recommendations</Typography>
                <List>
                  {scoreData.recommendations.slice(0, 10).map((rec, i) => (
                    <ListItem key={i} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {rec.priority === 'high' ? <Warning color="error" /> :
                         rec.priority === 'medium' ? <Warning color="warning" /> :
                         <CheckCircle color="success" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2">{rec.recommendation}</Typography>}
                        secondary={`Factor: ${rec.factor.replace(/([A-Z])/g, ' $1').trim()} (${rec.factorRating})`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Simulator Tab */}
          {activeTab === 1 && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Credit Score Simulator</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  See how different financial decisions would affect your credit score:
                </Typography>

                <Grid container spacing={1} sx={{ mb: 3 }}>
                  {[
                    { type: 'pay_off_card', label: '💳 Pay Off Credit Card', color: 'success' },
                    { type: 'new_loan', label: '🏦 Take New Loan', color: 'warning' },
                    { type: 'missed_payment', label: '❌ Miss a Payment', color: 'error' },
                    { type: 'increase_limit', label: '📈 Increase Credit Limit', color: 'info' },
                    { type: 'pay_down_debt', label: '💰 Pay Down ₹1L Debt', color: 'success' },
                    { type: 'close_account', label: '🔒 Close Old Account', color: 'warning' }
                  ].map((sim, i) => (
                    <Grid item xs={6} md={4} key={i}>
                      <Button fullWidth variant="outlined" color={sim.color}
                        onClick={() => runSimulation(sim.type)} sx={{ py: 1.5, textTransform: 'none' }}>
                        {sim.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>

                {simResult && (
                  <Alert severity={simResult.impact === 'positive' ? 'success' : simResult.impact === 'negative' ? 'error' : 'info'}>
                    <Typography variant="body2" fontWeight="bold">
                      Score: {simResult.currentScore} → {simResult.newScore}
                      ({simResult.change > 0 ? '+' : ''}{simResult.change} points)
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{simResult.explanation}</Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}
