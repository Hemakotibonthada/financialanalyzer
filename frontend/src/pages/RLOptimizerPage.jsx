// ============================================================================
// RL BUDGET OPTIMIZER PAGE — Reinforcement Learning Budget Optimization
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  Slider, TextField, Chip, CircularProgress, Alert, Divider,
  LinearProgress, List, ListItem, ListItemIcon, ListItemText,
  ToggleButton, ToggleButtonGroup, Tooltip, IconButton
} from '@mui/material';
import {
  Psychology, TrendingUp, Savings, AccountBalance, Info,
  AutoAwesome, PlayArrow, CheckCircle, Warning, Refresh,
  PieChart, BarChart
} from '@mui/icons-material';
import {
  useAIBudgetOptimizer, useAIInvestmentOptimizer, useAIDebtOptimizer
} from '../hooks/useAIFeatures';

// ============================================================================
// §1  BUDGET OPTIMIZER TAB
// ============================================================================

function BudgetOptimizerTab() {
  const { optimization, loading, error, optimize } = useAIBudgetOptimizer();
  const [income, setIncome] = useState(75000);
  const [savingsGoal, setSavingsGoal] = useState(20);

  const handleOptimize = () => {
    optimize({
      monthlyIncome: income,
      savingsGoal: savingsGoal / 100
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      food: '#4caf50', transport: '#2196f3', utilities: '#ff9800',
      entertainment: '#e91e63', shopping: '#9c27b0', healthcare: '#00bcd4',
      education: '#3f51b5', savings: '#4caf50', investment: '#ff5722',
      misc: '#607d8b'
    };
    return colors[category] || '#607d8b';
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Configuration */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology color="primary" /> Configuration
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>Monthly Income</Typography>
                <TextField
                  fullWidth size="small" type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography> }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>Savings Goal: {savingsGoal}%</Typography>
                <Slider
                  value={savingsGoal}
                  onChange={(_, v) => setSavingsGoal(v)}
                  min={5} max={50} step={5}
                  marks={[{ value: 20, label: '20%' }, { value: 30, label: '30%' }]}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Button
                fullWidth variant="contained"
                onClick={handleOptimize}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
                sx={{ mt: 1 }}
              >
                {loading ? 'Training RL Agent...' : 'Optimize Budget'}
              </Button>

              {loading && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    The RL agent is training through simulated budget scenarios...
                  </Typography>
                  <LinearProgress sx={{ mt: 1 }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={8}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {optimization ? (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesome color="primary" /> Optimized Budget Allocation
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Savings Rate: ${((optimization.savingsRate || 0) * 100).toFixed(1)}%`}
                    color={optimization.savingsRate >= 0.2 ? 'success' : 'warning'}
                    icon={<Savings />}
                  />
                  <Chip
                    label={`Episodes: ${optimization.trainingEpisodes}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Avg Reward: ${(optimization.averageReward || 0).toFixed(1)}`}
                    variant="outlined"
                    color={optimization.averageReward > 0 ? 'success' : 'default'}
                  />
                  {optimization.convergence && (
                    <Chip
                      icon={optimization.convergence.converged ? <CheckCircle /> : <Warning />}
                      label={optimization.convergence.converged ? 'Converged' : 'Learning...'}
                      color={optimization.convergence.converged ? 'success' : 'info'}
                    />
                  )}
                </Box>

                {/* Budget Allocation Bars */}
                {optimization.optimizedAllocations && Object.entries(optimization.optimizedAllocations)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const pct = income > 0 ? (amount / income * 100) : 0;
                    return (
                      <Box key={category} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                            {category}
                          </Typography>
                          <Typography variant="body2">
                            ₹{Math.round(amount).toLocaleString()} ({pct.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(pct, 100)}
                          sx={{
                            height: 12, borderRadius: 6,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getCategoryColor(category),
                              borderRadius: 6
                            }
                          }}
                        />
                      </Box>
                    );
                  })}

                {/* Recommendations */}
                {optimization.recommendations?.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                      AI Recommendations
                    </Typography>
                    <List dense>
                      {optimization.recommendations.map((rec, i) => (
                        <ListItem key={i} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {rec.priority === 'high' ? <Warning color="error" /> : <Info color="info" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={`${rec.category}: ${rec.action}`}
                            secondary={rec.action === 'reduce'
                              ? `Reduce from ${rec.current} to ${rec.recommended} (save ₹${rec.savings?.toLocaleString()})`
                              : rec.reason}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Explanation */}
                {optimization.explanation && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={<Psychology />}>
                    <Typography variant="body2">{optimization.explanation}</Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <Psychology sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>RL-Powered Budget Optimization</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
                The AI agent uses reinforcement learning to simulate thousands of budget scenarios and find the optimal allocation for your income and goals.
              </Typography>
              <Button variant="outlined" onClick={handleOptimize}>Get Started</Button>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §2  INVESTMENT OPTIMIZER TAB
// ============================================================================

function InvestmentOptimizerTab() {
  const { portfolio, loading, error, optimize } = useAIInvestmentOptimizer();
  const [config, setConfig] = useState({
    totalCorpus: 1000000,
    riskTolerance: 0.5,
    investmentHorizon: 10,
    age: 30,
    monthlyContribution: 15000
  });

  const assetLabels = {
    equity_large: 'Large Cap Equity',
    equity_mid: 'Mid Cap Equity',
    equity_small: 'Small Cap Equity',
    debt_govt: 'Government Bonds',
    debt_corporate: 'Corporate Bonds',
    gold: 'Gold',
    real_estate: 'Real Estate',
    fixed_deposit: 'Fixed Deposit',
    ppf: 'PPF',
    nps: 'NPS'
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Investment Profile
              </Typography>

              <TextField
                fullWidth size="small" label="Total Corpus" type="number"
                value={config.totalCorpus}
                onChange={(e) => setConfig(p => ({ ...p, totalCorpus: Number(e.target.value) }))}
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" gutterBottom>
                Risk Tolerance: {config.riskTolerance < 0.3 ? 'Conservative' : config.riskTolerance < 0.7 ? 'Moderate' : 'Aggressive'}
              </Typography>
              <Slider
                value={config.riskTolerance * 100}
                onChange={(_, v) => setConfig(p => ({ ...p, riskTolerance: v / 100 }))}
                min={10} max={90}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth size="small" label="Investment Horizon (years)" type="number"
                value={config.investmentHorizon}
                onChange={(e) => setConfig(p => ({ ...p, investmentHorizon: Number(e.target.value) }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth size="small" label="Age" type="number"
                value={config.age}
                onChange={(e) => setConfig(p => ({ ...p, age: Number(e.target.value) }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth size="small" label="Monthly SIP" type="number"
                value={config.monthlyContribution}
                onChange={(e) => setConfig(p => ({ ...p, monthlyContribution: Number(e.target.value) }))}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth variant="contained"
                onClick={() => optimize(config)}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
              >
                {loading ? 'Optimizing...' : 'Optimize Portfolio'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {portfolio ? (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Optimal Portfolio Allocation
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip label={`Expected Return: ${((portfolio.expectedReturn || 0) * 100).toFixed(1)}%`} color="success" />
                  <Chip label={`Risk: ${((portfolio.portfolioRisk || 0) * 100).toFixed(1)}%`} color="warning" />
                  <Chip label={`Sharpe: ${(portfolio.sharpeRatio || 0).toFixed(2)}`} color="info" />
                </Box>

                {portfolio.optimalAllocations && Object.entries(portfolio.optimalAllocations)
                  .filter(([, v]) => v > 0.01)
                  .sort((a, b) => b[1] - a[1])
                  .map(([asset, allocation]) => (
                    <Box key={asset} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight="bold">
                          {assetLabels[asset] || asset}
                        </Typography>
                        <Typography variant="body2">
                          {(allocation * 100).toFixed(1)}% (₹{Math.round(config.totalCorpus * allocation).toLocaleString()})
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={allocation * 100}
                        sx={{ height: 10, borderRadius: 5, mt: 0.5 }}
                      />
                    </Box>
                  ))}

                {portfolio.recommendations?.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    {portfolio.recommendations.map((rec, i) => (
                      <Alert severity={rec.priority === 'high' ? 'warning' : 'info'} key={i} sx={{ mb: 1 }}>
                        {rec.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>AI Investment Optimizer</Typography>
              <Typography variant="body2" color="text.secondary">
                Uses Actor-Critic reinforcement learning to find the optimal asset allocation matching your risk profile and goals.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §3  DEBT OPTIMIZER TAB
// ============================================================================

function DebtOptimizerTab() {
  const { strategy, loading, error, optimize } = useAIDebtOptimizer();

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Debt Payoff Optimizer
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The RL agent will analyze your loans and find the optimal payoff strategy to minimize interest paid.
              </Typography>
              <Button
                fullWidth variant="contained" color="secondary"
                onClick={() => optimize()}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
              >
                {loading ? 'Optimizing...' : 'Find Best Strategy'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {strategy ? (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Optimal Payoff Strategy
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip label={`${strategy.monthsToDebtFree} months to debt-free`} color="primary" />
                  {strategy.totalInterestSaved > 0 && (
                    <Chip label={`₹${strategy.totalInterestSaved.toLocaleString()} interest saved`} color="success" />
                  )}
                </Box>

                {strategy.strategy?.slice(0, 12).map((step, i) => (
                  <Paper key={i} elevation={0} sx={{ p: 1, mb: 0.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        <strong>Month {step.month}:</strong> Focus on {step.focusDebt}
                      </Typography>
                      <Box>
                        {step.balances?.map((b, j) => (
                          <Chip key={j} label={`${b.name}: ₹${b.balance.toLocaleString()}`} size="small" sx={{ ml: 0.5 }} />
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                ))}

                {strategy.recommendations?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {strategy.recommendations.map((rec, i) => (
                      <Alert severity={rec.priority === 'high' ? 'warning' : 'info'} key={i} sx={{ mb: 1 }}>
                        {rec.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <AccountBalance sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>Smart Debt Payoff</Typography>
              <Typography variant="body2" color="text.secondary">
                AI uses Deep Q-Network to find the optimal order of debt repayment, comparing avalanche, snowball, and hybrid strategies.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §4  MAIN PAGE
// ============================================================================

export default function RLOptimizerPage() {
  const [activeTab, setActiveTab] = useState('budget');

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology color="primary" />
          AI Optimization Engine
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reinforcement Learning-powered financial optimization — runs locally on your machine
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={(_, v) => v && setActiveTab(v)}
          size="small"
        >
          <ToggleButton value="budget">
            <PieChart sx={{ mr: 1 }} /> Budget
          </ToggleButton>
          <ToggleButton value="investment">
            <TrendingUp sx={{ mr: 1 }} /> Investment
          </ToggleButton>
          <ToggleButton value="debt">
            <AccountBalance sx={{ mr: 1 }} /> Debt Payoff
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {activeTab === 'budget' && <BudgetOptimizerTab />}
      {activeTab === 'investment' && <InvestmentOptimizerTab />}
      {activeTab === 'debt' && <DebtOptimizerTab />}
    </Box>
  );
}
