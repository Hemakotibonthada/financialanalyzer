// ============================================================================
// PORTFOLIO OPTIMIZER PAGE — AI Portfolio Construction & Analysis
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  Slider, FormControl, InputLabel, Select, MenuItem, TextField,
  Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, ToggleButton, ToggleButtonGroup,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  TrendingUp, ShowChart, PieChart, Psychology, PlayArrow,
  ExpandMore, Assessment, Security, BarChart, Warning
} from '@mui/icons-material';
import enhancedAIService from '../services/enhancedAIService';

function PortfolioConfigPanel({ config, setConfig, onOptimize, loading }) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology color="primary" /> Portfolio Configuration
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Risk Profile</InputLabel>
          <Select value={config.riskProfile} onChange={e => setConfig(p => ({ ...p, riskProfile: e.target.value }))} label="Risk Profile">
            <MenuItem value="conservative">Conservative</MenuItem>
            <MenuItem value="moderate">Moderate</MenuItem>
            <MenuItem value="aggressive">Aggressive</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Optimization Method</InputLabel>
          <Select value={config.method} onChange={e => setConfig(p => ({ ...p, method: e.target.value }))} label="Method">
            <MenuItem value="markowitz">Markowitz Mean-Variance</MenuItem>
            <MenuItem value="risk_parity">Risk Parity</MenuItem>
            <MenuItem value="black_litterman">Black-Litterman</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Investment Horizon: {config.investmentHorizon} years</Typography>
          <Slider value={config.investmentHorizon} onChange={(_, v) => setConfig(p => ({ ...p, investmentHorizon: v }))}
            min={1} max={30} marks={[{ value: 5, label: '5y' }, { value: 10, label: '10y' }, { value: 20, label: '20y' }]} />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Age: {config.age}</Typography>
          <Slider value={config.age} onChange={(_, v) => setConfig(p => ({ ...p, age: v }))} min={20} max={70} />
        </Box>

        <Button fullWidth variant="contained" onClick={onOptimize} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}>
          {loading ? 'Optimizing...' : 'Optimize Portfolio'}
        </Button>
      </CardContent>
    </Card>
  );
}

function AllocationChart({ allocations }) {
  if (!allocations || Object.keys(allocations).length === 0) return null;

  const sorted = Object.entries(allocations).sort((a, b) => b[1].weight - a[1].weight);
  const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#d32f2f', '#0097a7', '#fbc02d', '#5d4037', '#c2185b', '#455a64',
                  '#4caf50', '#ff5722', '#3f51b5', '#009688', '#ffeb3b', '#795548', '#e91e63', '#00bcd4', '#9c27b0', '#607d8b'];

  return (
    <Box>
      {sorted.map(([id, data], i) => (
        <Box key={id} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" fontWeight="bold">{data.name || id}</Typography>
            <Typography variant="body2">{(data.weight * 100).toFixed(1)}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={data.weight * 100}
            sx={{ height: 14, borderRadius: 7, bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': { bgcolor: colors[i % colors.length], borderRadius: 7 }
            }} />
        </Box>
      ))}
    </Box>
  );
}

function StressTestResults({ stressTest }) {
  if (!stressTest?.scenarios) return null;

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          <Warning color="warning" /> Stress Test Results
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Scenario</strong></TableCell>
                <TableCell align="right"><strong>Impact</strong></TableCell>
                <TableCell><strong>Best Asset</strong></TableCell>
                <TableCell><strong>Worst Asset</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stressTest.scenarios.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>{s.scenario}</TableCell>
                  <TableCell align="right">
                    <Chip label={s.portfolioImpactFormatted} size="small"
                      color={s.portfolioImpact > 0 ? 'success' : s.portfolioImpact > -15 ? 'warning' : 'error'} />
                  </TableCell>
                  <TableCell>{s.bestAsset}</TableCell>
                  <TableCell>{s.worstAsset}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {stressTest.recommendation && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">{stressTest.recommendation}</Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortfolioOptimizerPage() {
  const [config, setConfig] = useState({
    riskProfile: 'moderate', method: 'markowitz', investmentHorizon: 10, age: 30
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleOptimize = useCallback(async () => {
    setLoading(true);
    try {
      // Call the backend API via a generic POST
      const { PortfolioOptimizationService } = await import('../services/enhancedAIService');

      // For now, make a direct API call
      const response = await fetch('/api/ai-advanced/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.success) setResult(data.data);
    } catch (err) {
      console.error('Portfolio optimization error:', err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PieChart color="primary" /> AI Portfolio Optimizer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Markowitz, Risk Parity & Black-Litterman optimization — runs locally
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <PortfolioConfigPanel config={config} setConfig={setConfig} onOptimize={handleOptimize} loading={loading} />
        </Grid>

        <Grid item xs={12} md={8}>
          {result ? (
            <>
              {/* Metrics */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Expected Return', value: `${((result.expectedReturn || 0) * 100).toFixed(1)}%`, color: 'success' },
                  { label: 'Risk (Volatility)', value: `${((result.risk || 0) * 100).toFixed(1)}%`, color: 'warning' },
                  { label: 'Sharpe Ratio', value: (result.sharpeRatio || 0).toFixed(2), color: 'info' },
                  { label: 'Active Assets', value: result.activeAssets || 0, color: 'primary' }
                ].map((m, i) => (
                  <Grid item xs={6} md={3} key={i}>
                    <Card elevation={2}>
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="h5" fontWeight="bold" color={`${m.color}.main`}>{m.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Allocation" icon={<PieChart />} />
                <Tab label="Analytics" icon={<Assessment />} />
                <Tab label="Stress Test" icon={<Warning />} />
              </Tabs>

              {activeTab === 0 && (
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Optimal Allocation</Typography>
                    <AllocationChart allocations={result.allocations} />
                    <Chip label={`Method: ${result.method || config.method}`} size="small" sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              )}

              {activeTab === 1 && result.analytics && (
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Portfolio Analytics</Typography>
                    <Grid container spacing={2}>
                      {Object.entries(result.analytics.metrics || {}).map(([key, value]) => (
                        <Grid item xs={6} md={4} key={key}>
                          <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {key.replace(/([A-Z])/g, ' $1')}
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {typeof value === 'number' ? value.toFixed(3) : value}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    {result.analytics.styleAnalysis && (
                      <Box sx={{ mt: 2 }}>
                        <Chip label={`Style: ${result.analytics.styleAnalysis.category}`} color="primary" />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Equity: {((result.analytics.styleAnalysis.equity || 0) * 100).toFixed(0)}% |
                          Debt: {((result.analytics.styleAnalysis.debt || 0) * 100).toFixed(0)}% |
                          Alt: {((result.analytics.styleAnalysis.alternatives || 0) * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 2 && <StressTestResults stressTest={result.stressTest} />}
            </>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <ShowChart sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">AI Portfolio Construction</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                Uses Modern Portfolio Theory with 20+ Indian asset classes including equities, debt, gold, REITs, NPS, PPF, and ELSS. Includes stress testing and rebalancing analysis.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
