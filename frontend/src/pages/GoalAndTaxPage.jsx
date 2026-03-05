// ============================================================================
// GOAL ACHIEVEMENT & TAX HARVESTING PAGE — AI Financial Goals + Tax Dashboard
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  TextField, Slider, List, ListItem, ListItemText, ListItemIcon,
  Divider, Paper, Accordion, AccordionSummary, AccordionDetails,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  EmojiEvents, TrendingUp, Warning, Refresh, Flag,
  CheckCircle, ExpandMore, Psychology, PlayArrow,
  Savings, AccountBalance, Star, Timeline,
  Calculate, Receipt, AutoAwesome, Lightbulb
} from '@mui/icons-material';

// ============================================================================
// §1  GOAL FEASIBILITY PANEL
// ============================================================================

function GoalFeasibilityPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [goals, setGoals] = useState([
    { name: 'Emergency Fund', targetAmount: 300000, currentAmount: 80000, deadline: '2027-01-01', priority: 'critical' },
    { name: 'Vacation', targetAmount: 150000, currentAmount: 30000, deadline: '2026-12-01', priority: 'low' },
    { name: 'Car Down Payment', targetAmount: 500000, currentAmount: 100000, deadline: '2028-06-01', priority: 'medium' }
  ]);
  const [income, setIncome] = useState(80000);
  const [expenses, setExpenses] = useState(55000);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      // Simplified — call backend or compute locally
      const { GoalAchievementService } = await import('../services/enhancedAIService');
      // Simulate analysis
      const results = goals.map(goal => {
        const months = Math.max(1, Math.round((new Date(goal.deadline) - Date.now()) / (30 * 86400000)));
        const gap = Math.max(0, goal.targetAmount * 1.06 - goal.currentAmount);
        const requiredSIP = Math.round(gap / months);
        const available = Math.max(0, income - expenses);
        const score = Math.min(100, Math.round((available / (requiredSIP || 1)) * 50));

        return {
          goalName: goal.name, priority: goal.priority,
          targetAmount: goal.targetAmount, currentAmount: goal.currentAmount,
          inflatedTarget: Math.round(goal.targetAmount * 1.06),
          progressPercent: ((goal.currentAmount / goal.targetAmount) * 100).toFixed(0),
          monthsRemaining: months, requiredMonthlySIP: requiredSIP,
          feasibilityScore: score,
          riskLevel: score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high',
          onTrack: requiredSIP <= available / goals.length,
          milestones: [
            { label: '25%', achieved: goal.currentAmount >= goal.targetAmount * 0.25 },
            { label: '50%', achieved: goal.currentAmount >= goal.targetAmount * 0.50 },
            { label: '75%', achieved: goal.currentAmount >= goal.targetAmount * 0.75 },
            { label: '100%', achieved: goal.currentAmount >= goal.targetAmount }
          ]
        };
      });

      const totalRequired = results.reduce((s, r) => s + r.requiredMonthlySIP, 0);
      const available = Math.max(0, income - expenses);

      setResult({
        goals: results,
        summary: {
          totalGoals: goals.length,
          fullyFunded: results.filter(r => r.onTrack).length,
          totalRequired,
          totalAvailable: available,
          deficit: Math.max(0, totalRequired - available)
        }
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [goals, income, expenses]);

  const getScoreColor = (score) =>
    score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error';

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <AccountBalance color="primary" /> Configuration
              </Typography>
              <TextField fullWidth size="small" label="Monthly Income" type="number"
                value={income} onChange={e => setIncome(Number(e.target.value))} sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Monthly Expenses" type="number"
                value={expenses} onChange={e => setExpenses(Number(e.target.value))} sx={{ mb: 2 }} />
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Goals ({goals.length})</Typography>
              {goals.map((g, i) => (
                <Paper key={i} elevation={0} sx={{ p: 1, mb: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">{g.name}</Typography>
                  <Typography variant="caption">
                    ₹{g.currentAmount.toLocaleString()} / ₹{g.targetAmount.toLocaleString()} • {g.deadline}
                  </Typography>
                </Paper>
              ))}
              <Button fullWidth variant="contained" onClick={analyze} disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />} sx={{ mt: 2 }}>
                Analyze Goals
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {result ? (
            <>
              {/* Summary */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Chip label={`${result.summary.fullyFunded}/${result.summary.totalGoals} on track`}
                  color={result.summary.fullyFunded === result.summary.totalGoals ? 'success' : 'warning'} />
                <Chip label={`Need: ₹${result.summary.totalRequired.toLocaleString()}/mo`} />
                <Chip label={`Available: ₹${result.summary.totalAvailable.toLocaleString()}/mo`}
                  color={result.summary.deficit > 0 ? 'error' : 'success'} />
                {result.summary.deficit > 0 && (
                  <Chip label={`Deficit: ₹${result.summary.deficit.toLocaleString()}/mo`} color="error" />
                )}
              </Box>

              {/* Goal Cards */}
              {result.goals.map((goal, i) => (
                <Card key={i} elevation={2} sx={{
                  mb: 2, borderLeft: 4,
                  borderColor: goal.feasibilityScore >= 70 ? 'success.main' : goal.feasibilityScore >= 40 ? 'warning.main' : 'error.main'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmojiEvents color={getScoreColor(goal.feasibilityScore)} />
                        <Typography variant="h6" fontWeight="bold">{goal.goalName}</Typography>
                        <Chip label={goal.priority} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" fontWeight="bold" color={`${getScoreColor(goal.feasibilityScore)}.main`}>
                          {goal.feasibilityScore}/100
                        </Typography>
                        <Chip label={goal.riskLevel} size="small" color={getScoreColor(goal.feasibilityScore)} />
                      </Box>
                    </Box>

                    <LinearProgress variant="determinate" value={Math.min(Number(goal.progressPercent), 100)}
                      sx={{ height: 12, borderRadius: 6, mb: 1 }}
                      color={Number(goal.progressPercent) >= 75 ? 'success' : 'primary'} />

                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">Progress</Typography>
                        <Typography variant="body2" fontWeight="bold">{goal.progressPercent}%</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">Target</Typography>
                        <Typography variant="body2" fontWeight="bold">₹{goal.inflatedTarget.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">Required SIP</Typography>
                        <Typography variant="body2" fontWeight="bold">₹{goal.requiredMonthlySIP.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">Timeline</Typography>
                        <Typography variant="body2" fontWeight="bold">{goal.monthsRemaining} months</Typography>
                      </Grid>
                    </Grid>

                    {/* Milestones */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      {goal.milestones.map((m, j) => (
                        <Chip key={j} label={m.label} size="small"
                          color={m.achieved ? 'success' : 'default'}
                          icon={m.achieved ? <CheckCircle /> : <Flag />}
                          sx={{ fontSize: '0.65rem' }} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <EmojiEvents sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">AI Goal Achievement Analysis</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                Analyze feasibility, optimize allocations across multiple goals, and get AI-powered milestone tracking with inflation-adjusted targets.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §2  TAX HARVESTING PANEL
// ============================================================================

function TaxHarvestingPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [portfolio] = useState([
    { name: 'Nifty IT Fund', assetType: 'equity', purchaseDate: '2025-06-01', purchasePrice: 500, currentPrice: 380, quantity: 100 },
    { name: 'SBI Blue Chip', assetType: 'equity', purchaseDate: '2024-01-15', purchasePrice: 45, currentPrice: 62, quantity: 500 },
    { name: 'HDFC Corporate Bond', assetType: 'debt', purchaseDate: '2024-06-01', purchasePrice: 100, currentPrice: 108, quantity: 200 },
    { name: 'Gold ETF', assetType: 'gold', purchaseDate: '2025-03-01', purchasePrice: 5200, currentPrice: 4800, quantity: 10 }
  ]);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-premium/tax-harvesting/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ portfolio })
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <Receipt color="primary" /> Portfolio Holdings
              </Typography>
              {portfolio.map((h, i) => {
                const gain = (h.currentPrice - h.purchasePrice) * h.quantity;
                return (
                  <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: gain >= 0 ? 'success.50' : 'error.50', borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight="bold">{h.name}</Typography>
                    <Typography variant="caption">
                      Buy: ₹{h.purchasePrice} | Now: ₹{h.currentPrice} | Qty: {h.quantity}
                    </Typography>
                    <Typography variant="caption" display="block" color={gain >= 0 ? 'success.main' : 'error.main'}>
                      {gain >= 0 ? 'Gain' : 'Loss'}: ₹{Math.abs(gain).toLocaleString()}
                    </Typography>
                  </Paper>
                );
              })}
              <Button fullWidth variant="contained" onClick={analyze} disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <Calculate />} sx={{ mt: 2 }}>
                Analyze Tax Opportunities
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {result ? (
            <>
              {/* Total Savings */}
              <Card elevation={2} sx={{ mb: 2, textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    ₹{(result.totalPotentialSavings || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Potential Tax Savings</Typography>
                </CardContent>
              </Card>

              {/* Action Plan */}
              {result.actionPlan?.length > 0 && (
                <Card elevation={2} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                      <AutoAwesome color="primary" /> Action Plan
                    </Typography>
                    {result.actionPlan.map((step, i) => (
                      <Alert key={i} severity={step.priority === 1 ? 'success' : step.priority === 2 ? 'info' : 'warning'} sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{step.action}</Typography>
                        <Typography variant="caption">{step.detail}</Typography>
                        {step.savings > 0 && (
                          <Chip label={`Save ₹${step.savings.toLocaleString()}`} size="small" color="success" sx={{ mt: 0.5 }} />
                        )}
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Timing */}
              {result.timing && (
                <Alert severity={result.timing.urgency === 'high' ? 'error' : 'info'}>
                  <Typography variant="body2">{result.timing.message}</Typography>
                </Alert>
              )}

              {/* Loss Harvesting */}
              {result.lossHarvesting?.opportunities?.length > 0 && (
                <Card elevation={2} sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                      Tax-Loss Harvesting ({result.lossHarvesting.opportunities.length})
                    </Typography>
                    {result.lossHarvesting.opportunities.map((opp, i) => (
                      <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: 'error.50', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight="bold">{opp.name}</Typography>
                          <Chip label={`Save ₹${opp.potentialTaxSavings.toLocaleString()}`} size="small" color="success" />
                        </Box>
                        <Typography variant="caption">{opp.recommendation}</Typography>
                      </Paper>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Gain Harvesting */}
              {result.gainHarvesting?.opportunities?.length > 0 && (
                <Card elevation={2} sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                      Tax-Free Gain Booking ({result.gainHarvesting.opportunities.length})
                    </Typography>
                    <Alert severity="success" sx={{ mb: 1, py: 0 }}>
                      <Typography variant="caption">{result.gainHarvesting.strategy}</Typography>
                    </Alert>
                    {result.gainHarvesting.opportunities.map((opp, i) => (
                      <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: 'success.50', borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight="bold">{opp.name}</Typography>
                        <Typography variant="caption">{opp.action}</Typography>
                      </Paper>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <Receipt sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6">AI Tax Harvesting</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                Identify tax-loss and tax-gain harvesting opportunities. Calculates STCG, LTCG with Indian tax rules, exemptions, and indexation.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §3  MAIN PAGE
// ============================================================================

export default function GoalAndTaxPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lightbulb color="primary" /> AI Goal & Tax Optimizer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Goal achievement analysis with multi-goal prioritization + Tax-loss/gain harvesting
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<EmojiEvents />} label="Goal Optimizer" />
        <Tab icon={<Receipt />} label="Tax Harvesting" />
      </Tabs>

      {activeTab === 0 && <GoalFeasibilityPanel />}
      {activeTab === 1 && <TaxHarvestingPanel />}
    </Box>
  );
}
