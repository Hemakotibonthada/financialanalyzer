// ============================================================================
// SPENDING INTELLIGENCE PAGE — Deep Spending Analysis Dashboard
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, List, ListItem, ListItemText, ListItemIcon,
  Accordion, AccordionSummary, AccordionDetails, Avatar,
  ToggleButton, ToggleButtonGroup, IconButton, Tooltip
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Speed, ShoppingCart, Restaurant,
  ExpandMore, Refresh, CheckCircle, Warning, Psychology,
  AccessTime, PieChart, Timeline, Storefront, Subscriptions,
  LocalAtm, Category, Person, FlagCircle, AutoAwesome
} from '@mui/icons-material';
import enhancedAIService from '../services/enhancedAIService';

// ============================================================================
// §1  MERCHANT INTELLIGENCE TAB
// ============================================================================

function MerchantIntelligenceTab({ data }) {
  if (!data) return <Alert severity="info">Run analysis to see merchant insights</Alert>;

  const { topMerchants, subscriptions, recurringMerchants, clusters, subscriptionTotal } = data;

  return (
    <Box>
      {/* Subscription Summary */}
      {subscriptions?.length > 0 && (
        <Card elevation={2} sx={{ mb: 3, borderLeft: 4, borderColor: 'info.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Subscriptions color="info" />
                <Typography variant="h6" fontWeight="bold">Detected Subscriptions</Typography>
              </Box>
              <Chip label={`₹${(subscriptionTotal || 0).toLocaleString()}/mo`} color="info" />
            </Box>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {subscriptions.map((sub, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>{sub.merchant}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{sub.avgAmount.toLocaleString()}/mo • {sub.transactionCount} txns
                    </Typography>
                    {sub.priceConsistency > 0.9 && (
                      <Chip label="Fixed price" size="small" color="success" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Annual subscription cost: ₹{((subscriptionTotal || 0) * 12).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Top Merchants */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storefront color="primary" /> Top Merchants
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Merchant</strong></TableCell>
                  <TableCell align="right"><strong>Total Spent</strong></TableCell>
                  <TableCell align="right"><strong>Transactions</strong></TableCell>
                  <TableCell align="right"><strong>Avg Amount</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(topMerchants || []).map((m, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: `hsl(${i * 40}, 60%, 50%)` }}>
                          {(m.merchant || '?')[0].toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{m.merchant}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right"><strong>₹{m.totalSpent.toLocaleString()}</strong></TableCell>
                    <TableCell align="right">{m.transactionCount}</TableCell>
                    <TableCell align="right">₹{m.avgAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={m.category} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell>
                      {m.isSubscription && <Chip label="Sub" size="small" color="info" sx={{ height: 18 }} />}
                      {m.isRecurring && !m.isSubscription && <Chip label="Recurring" size="small" color="warning" sx={{ height: 18 }} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Category Clusters */}
      {clusters?.length > 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Category color="secondary" /> Spending Clusters
            </Typography>
            <Grid container spacing={2}>
              {clusters.slice(0, 8).map((cluster, i) => (
                <Grid item xs={6} md={3} key={i}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {cluster.category}
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      ₹{cluster.totalSpent.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cluster.merchantCount} merchants • {cluster.transactionCount} txns
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ============================================================================
// §2  SPENDING VELOCITY TAB
// ============================================================================

function SpendingVelocityTab({ data }) {
  if (!data) return <Alert severity="info">Run analysis to see velocity data</Alert>;

  const {
    currentDailyVelocity, historicalDailyVelocity, monthlyBurnRate,
    projectedRemainder, acceleration, accelerating, dowPattern, peakSpendingDay
  } = data;

  const velocityChange = historicalDailyVelocity > 0
    ? ((currentDailyVelocity - historicalDailyVelocity) / historicalDailyVelocity * 100)
    : 0;

  return (
    <Box>
      {/* Velocity Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Speed sx={{ fontSize: 32, color: accelerating ? 'error.main' : 'success.main' }} />
              <Typography variant="h5" fontWeight="bold">₹{(currentDailyVelocity || 0).toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Daily Velocity</Typography>
              <Chip
                label={`${velocityChange >= 0 ? '+' : ''}${velocityChange.toFixed(0)}%`}
                size="small"
                color={velocityChange > 10 ? 'error' : velocityChange < -10 ? 'success' : 'default'}
                sx={{ mt: 0.5 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocalAtm sx={{ fontSize: 32, color: 'warning.main' }} />
              <Typography variant="h5" fontWeight="bold">₹{(monthlyBurnRate || 0).toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Monthly Burn Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 32, color: 'info.main' }} />
              <Typography variant="h5" fontWeight="bold">₹{(projectedRemainder || 0).toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Projected Remainder</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccessTime sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="bold">{peakSpendingDay || 'N/A'}</Typography>
              <Typography variant="caption" color="text.secondary">Peak Spending Day</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Day of Week Pattern */}
      {dowPattern && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Day-of-Week Spending Pattern
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 200 }}>
              {dowPattern.map((d, i) => {
                const maxAvg = Math.max(...dowPattern.map(dp => dp.average));
                const height = maxAvg > 0 ? (d.average / maxAvg) * 150 : 0;
                return (
                  <Box key={i} sx={{ textAlign: 'center', flex: 1, px: 0.5 }}>
                    <Box sx={{
                      width: '100%', height: height, maxHeight: 150,
                      bgcolor: d.average === maxAvg ? 'error.main' : 'primary.main',
                      borderRadius: '4px 4px 0 0', minHeight: 4,
                      transition: 'height 0.3s'
                    }} />
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{d.day}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{d.average.toLocaleString()}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Acceleration Alert */}
      {accelerating && (
        <Alert severity="warning" icon={<Speed />}>
          <Typography variant="body2" fontWeight="bold">Spending is accelerating!</Typography>
          <Typography variant="caption">
            {acceleration} increase in spending velocity. Consider setting stricter daily limits.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

// ============================================================================
// §3  IMPULSE DETECTION TAB
// ============================================================================

function ImpulseDetectionTab({ data }) {
  if (!data) return <Alert severity="info">Run analysis to see impulse patterns</Alert>;

  const { impulseTransactions, totalImpulseSpend, impulseSpendPercent, patterns, recommendations } = data;

  return (
    <Box>
      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {impulseTransactions?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Impulse Transactions</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                ₹{(totalImpulseSpend || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Impulse Spending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {impulseSpendPercent || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">Of Total Spending</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Patterns */}
      {patterns?.length > 0 && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Impulse Patterns</Typography>
            {patterns.map((p, i) => (
              <Paper key={i} elevation={0} sx={{ p: 2, mb: 1, bgcolor: 'warning.50', borderRadius: 2, borderLeft: 3, borderColor: 'warning.main' }}>
                <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                  {p.pattern.replace(/_/g, ' ')} ({p.frequency} occurrences)
                </Typography>
                <Typography variant="caption" color="text.secondary">{p.description}</Typography>
              </Paper>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Impulse Transactions */}
      {impulseTransactions?.length > 0 && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Detected Impulse Purchases</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Amount</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Score</strong></TableCell>
                    <TableCell><strong>Indicators</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {impulseTransactions.slice(0, 10).map((t, i) => (
                    <TableRow key={i}>
                      <TableCell><strong>₹{t.transaction.amount.toLocaleString()}</strong></TableCell>
                      <TableCell>{t.transaction.category || 'N/A'}</TableCell>
                      <TableCell>{t.transaction.date ? new Date(t.transaction.date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={t.impulseScore}
                          size="small"
                          color={t.impulseScore > 70 ? 'error' : t.impulseScore > 50 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {t.indicators.slice(0, 3).map((ind, j) => (
                            <Chip key={j} label={ind.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <Box>
          {recommendations.map((rec, i) => (
            <Alert key={i} severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2">{rec.message}</Typography>
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// §4  SPENDING PERSONALITY TAB
// ============================================================================

function SpendingPersonalityTab({ data }) {
  if (!data) return <Alert severity="info">Run analysis to see your spending personality</Alert>;

  const { personality, description, traits, strengths, weaknesses, tips, confidence } = data;

  const traitColors = {
    frugality: '#4caf50', consistency: '#2196f3', impulsiveness: '#f44336',
    diversity: '#9c27b0', planning: '#ff9800', riskTolerance: '#e91e63',
    generosity: '#00bcd4', techSavvy: '#3f51b5'
  };

  return (
    <Box>
      {/* Personality Card */}
      <Card elevation={3} sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 32 }}>
            <Person sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold">{personality || 'Unknown'}</Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mt: 1, maxWidth: 500, mx: 'auto' }}>
            {description}
          </Typography>
          <Chip
            label={`${confidence || 0}% confidence`}
            sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
        </CardContent>
      </Card>

      {/* Traits Radar */}
      {traits && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Behavioral Traits</Typography>
            <Grid container spacing={1}>
              {Object.entries(traits).map(([trait, value]) => (
                <Grid item xs={6} md={3} key={trait}>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                        {trait.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Typography variant="caption" fontWeight="bold">{Math.round(value)}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(value, 100)}
                      sx={{
                        height: 8, borderRadius: 4,
                        '& .MuiLinearProgress-bar': { bgcolor: traitColors[trait] || 'primary.main', borderRadius: 4 }
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ mb: 1 }}>
                ✅ Strengths
              </Typography>
              <List dense>
                {(strengths || []).map((s, i) => (
                  <ListItem key={i} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary={s} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="warning.main" sx={{ mb: 1 }}>
                ⚠️ Areas to Watch
              </Typography>
              <List dense>
                {(weaknesses || []).map((w, i) => (
                  <ListItem key={i} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}><Warning color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText primary={w} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tips */}
      {tips?.length > 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
              💡 Personalized Tips
            </Typography>
            {tips.map((tip, i) => (
              <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: 'info.50', borderRadius: 2 }}>
                <Typography variant="body2">{tip}</Typography>
              </Paper>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ============================================================================
// §5  MAIN PAGE COMPONENT
// ============================================================================

export default function SpendingIntelligencePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch comprehensive spending intelligence
      const [anomalyRes, insightRes] = await Promise.all([
        enhancedAIService.getAnomalies(180).catch(() => ({ success: false })),
        enhancedAIService.getAIInsights().catch(() => ({ success: false }))
      ]);

      // Simulate additional spending intelligence data
      // In production, this would call a dedicated endpoint
      setData({
        merchantAnalysis: {
          topMerchants: [
            { merchant: 'Swiggy', totalSpent: 12500, transactionCount: 25, avgAmount: 500, category: 'food', isRecurring: true, isSubscription: false, priceConsistency: 0.3 },
            { merchant: 'Amazon', totalSpent: 18000, transactionCount: 8, avgAmount: 2250, category: 'shopping', isRecurring: false, isSubscription: false, priceConsistency: 0.2 },
            { merchant: 'Netflix', totalSpent: 3588, transactionCount: 6, avgAmount: 598, category: 'entertainment', isRecurring: true, isSubscription: true, priceConsistency: 0.98 },
            { merchant: 'Uber', totalSpent: 4500, transactionCount: 30, avgAmount: 150, category: 'transport', isRecurring: true, isSubscription: false, priceConsistency: 0.4 },
            { merchant: 'Spotify', totalSpent: 714, transactionCount: 6, avgAmount: 119, category: 'entertainment', isRecurring: true, isSubscription: true, priceConsistency: 0.99 },
          ],
          subscriptions: [
            { merchant: 'Netflix', avgAmount: 598, transactionCount: 6, priceConsistency: 0.98 },
            { merchant: 'Spotify', avgAmount: 119, transactionCount: 6, priceConsistency: 0.99 },
          ],
          recurringMerchants: [
            { merchant: 'Swiggy', avgAmount: 500, transactionCount: 25 },
            { merchant: 'Uber', avgAmount: 150, transactionCount: 30 },
          ],
          subscriptionTotal: 717,
          clusters: [
            { category: 'food', merchantCount: 5, totalSpent: 15000, transactionCount: 35 },
            { category: 'shopping', merchantCount: 3, totalSpent: 22000, transactionCount: 12 },
            { category: 'transport', merchantCount: 2, totalSpent: 6000, transactionCount: 35 },
            { category: 'entertainment', merchantCount: 3, totalSpent: 5000, transactionCount: 15 },
          ]
        },
        velocity: {
          currentDailyVelocity: 2800,
          historicalDailyVelocity: 2400,
          monthlyBurnRate: 84000,
          projectedRemainder: 28000,
          acceleration: '16.7%',
          accelerating: true,
          peakSpendingDay: 'Sat',
          dowPattern: [
            { day: 'Sun', average: 3200 }, { day: 'Mon', average: 2100 },
            { day: 'Tue', average: 1900 }, { day: 'Wed', average: 2200 },
            { day: 'Thu', average: 2400 }, { day: 'Fri', average: 3100 },
            { day: 'Sat', average: 3800 }
          ]
        },
        impulseAnalysis: {
          impulseTransactions: [
            { transaction: { amount: 4500, category: 'shopping', date: new Date().toISOString() }, impulseScore: 75, indicators: ['late_night_purchase', 'e_commerce', 'non_essential'], isImpulse: true },
            { transaction: { amount: 2800, category: 'entertainment', date: new Date().toISOString() }, impulseScore: 60, indicators: ['rapid_succession', 'non_essential'], isImpulse: true },
          ],
          totalImpulseSpend: 7300,
          impulseSpendPercent: '8.7',
          patterns: [
            { pattern: 'late_night_purchase', frequency: 5, description: 'Late-night shopping is a common impulse trigger' },
            { pattern: 'e_commerce', frequency: 4, description: 'Online shopping platforms are a significant source' },
          ],
          recommendations: [
            { type: 'action', message: 'Remove saved payment methods from shopping apps and set a "no shopping after 10pm" rule.' },
            { type: 'action', message: 'Use the 24-hour rule for all non-essential purchases above ₹1,000.' },
          ]
        },
        personality: {
          personality: 'The Balanced Spender',
          description: 'You maintain a healthy balance between saving and spending. Money is a tool for well-being.',
          traits: { frugality: 55, consistency: 65, impulsiveness: 35, diversity: 70, planning: 60, riskTolerance: 50, generosity: 40, techSavvy: 80 },
          strengths: ['Balanced approach', 'Good digital payment habits', 'Diverse spending'],
          weaknesses: ['Weekend spending spikes', 'Some late-night impulse purchases'],
          tips: ['Set specific weekend budgets', 'Automate savings on payday', 'Track impulse triggers'],
          confidence: 72
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" />
            Spending Intelligence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deep AI-powered analysis of your spending patterns, merchants, and behavior
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          onClick={runAnalysis}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<Storefront />} label="Merchants" />
        <Tab icon={<Speed />} label="Velocity" />
        <Tab icon={<FlagCircle />} label="Impulse" />
        <Tab icon={<Person />} label="Personality" />
      </Tabs>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Analyzing spending patterns...
          </Typography>
        </Box>
      ) : (
        <>
          {activeTab === 0 && <MerchantIntelligenceTab data={data?.merchantAnalysis} />}
          {activeTab === 1 && <SpendingVelocityTab data={data?.velocity} />}
          {activeTab === 2 && <ImpulseDetectionTab data={data?.impulseAnalysis} />}
          {activeTab === 3 && <SpendingPersonalityTab data={data?.personality} />}
        </>
      )}
    </Box>
  );
}
