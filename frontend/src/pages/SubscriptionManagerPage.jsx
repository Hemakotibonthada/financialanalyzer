// ============================================================================
// SUBSCRIPTION MANAGER PAGE — AI Subscription Tracking & Optimization
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, List, ListItem, ListItemText, ListItemIcon, Avatar, Divider
} from '@mui/material';
import {
  Subscriptions, TrendingUp, Warning, Refresh,
  CheckCircle, Cancel, Savings, AutoAwesome, Category,
  CalendarMonth, AttachMoney, DeleteForever
} from '@mui/icons-material';

export default function SubscriptionManagerPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-premium/subscriptions/analyze', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (n) => `₹${Math.round(n || 0).toLocaleString()}`;

  const categoryColors = {
    streaming: '#e50914', music: '#1DB954', telecom: '#1a73e8',
    fitness: '#ff6f00', food_delivery: '#ff5722', professional: '#0077b5',
    storage: '#4285f4', productivity: '#ffb300', design: '#ff3850',
    education: '#673ab7', security: '#2e7d32', development: '#24292e',
    finance: '#1565c0', news: '#455a64', cloud: '#ff9800', unknown: '#9e9e9e'
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Subscriptions color="primary" /> AI Subscription Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Auto-detect, track, and optimize all your subscriptions
          </Typography>
        </Box>
        <Button variant="contained" onClick={fetchData} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}>Scan</Button>
      </Box>

      {loading && !data && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" sx={{ mt: 2 }}>Scanning transactions for subscriptions...</Typography>
        </Box>
      )}

      {data && (
        <>
          {/* Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Active Subscriptions', value: data.summary?.totalActive || 0, icon: <Subscriptions />, color: 'primary' },
              { label: 'Monthly Cost', value: fmt(data.summary?.monthlyCost), icon: <AttachMoney />, color: 'error' },
              { label: 'Annual Cost', value: fmt(data.summary?.annualCost), icon: <CalendarMonth />, color: 'warning' },
              { label: 'Potential Savings', value: fmt(data.summary?.potentialMonthlySavings) + '/mo', icon: <Savings />, color: 'success' }
            ].map((card, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    {React.cloneElement(card.icon, { color: card.color, sx: { fontSize: 28 } })}
                    <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{card.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab icon={<Subscriptions />} label={`All (${data.subscriptions?.length || 0})`} />
            <Tab icon={<AutoAwesome />} label="Recommendations" />
            <Tab icon={<Category />} label="By Category" />
          </Tabs>

          {/* All Subscriptions Tab */}
          {activeTab === 0 && (
            <Card elevation={2}>
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Service</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell align="right"><strong>Amount</strong></TableCell>
                        <TableCell align="right"><strong>Annual</strong></TableCell>
                        <TableCell><strong>Frequency</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Next Due</strong></TableCell>
                        <TableCell><strong>Price</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.subscriptions || []).map((sub, i) => (
                        <TableRow key={i} sx={{ opacity: sub.isActive ? 1 : 0.5 }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 11,
                                bgcolor: categoryColors[sub.category] || '#9e9e9e' }}>
                                {(sub.name || '?')[0].toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" fontWeight="bold">{sub.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={sub.category} size="small" variant="outlined"
                              sx={{ fontSize: '0.65rem', borderColor: categoryColors[sub.category] || '#9e9e9e',
                                color: categoryColors[sub.category] || '#9e9e9e' }} />
                          </TableCell>
                          <TableCell align="right"><strong>{fmt(sub.currentAmount)}</strong></TableCell>
                          <TableCell align="right">{fmt(sub.annualCost)}</TableCell>
                          <TableCell><Chip label={sub.frequency} size="small" variant="outlined" /></TableCell>
                          <TableCell>
                            {sub.isActive
                              ? <Chip icon={<CheckCircle />} label="Active" size="small" color="success" />
                              : <Chip icon={<Cancel />} label="Inactive" size="small" color="default" />}
                          </TableCell>
                          <TableCell>{sub.daysUntilNext >= 0 ? `${sub.daysUntilNext}d` : 'Past'}</TableCell>
                          <TableCell>
                            {sub.priceDirection === 'increasing'
                              ? <Chip icon={<TrendingUp />} label={`↑${sub.priceChangePercent}%`} size="small" color="error" />
                              : sub.priceDirection === 'decreasing'
                                ? <Chip label="↓" size="small" color="success" />
                                : <Chip label="Stable" size="small" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {data.summary?.totalInactive > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {data.summary.totalInactive} subscription(s) appear to be cancelled. You've already saved!
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations Tab */}
          {activeTab === 1 && data.optimization?.recommendations && (
            <Box>
              {data.optimization.recommendations.map((rec, i) => (
                <Card key={i} elevation={2} sx={{
                  mb: 2, borderLeft: 4,
                  borderColor: rec.priority === 'high' ? 'error.main' : rec.priority === 'medium' ? 'warning.main' : 'info.main'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Chip label={rec.type.replace(/_/g, ' ')} size="small" sx={{ mb: 1, textTransform: 'capitalize' }}
                          color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'} />
                        <Typography variant="body2">{rec.message}</Typography>
                      </Box>
                      {rec.potentialMonthlySavings > 0 && (
                        <Chip label={`Save ${fmt(rec.potentialMonthlySavings)}/mo`} color="success" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Alert severity="success" sx={{ mt: 2 }}>
                Total potential savings: <strong>{fmt(data.optimization.potentialSavings)}/month</strong> ({fmt(data.optimization.potentialSavings * 12)}/year)
              </Alert>
            </Box>
          )}

          {/* Category Breakdown Tab */}
          {activeTab === 2 && data.optimization?.categoryBreakdown && (
            <Grid container spacing={2}>
              {Object.entries(data.optimization.categoryBreakdown)
                .sort((a, b) => b[1].monthlyCost - a[1].monthlyCost)
                .map(([cat, info]) => (
                <Grid item xs={12} md={6} key={cat}>
                  <Card elevation={2} sx={{ borderLeft: 4, borderColor: categoryColors[cat] || '#9e9e9e' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                          {cat}
                        </Typography>
                        <Typography variant="h6" color="error.main">{fmt(info.monthlyCost)}/mo</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {info.count} service(s): {info.services.join(', ')}
                      </Typography>
                      {info.count > 1 && (
                        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                          <Typography variant="caption">Multiple {cat} subscriptions — consider consolidating</Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Lifetime stats */}
          {data.lifecycle && (
            <Card elevation={2} sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Lifetime Stats</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Total lifetime spend: ${fmt(data.lifecycle.totalLifetimeSpend)}`} />
                  <Chip label={`Avg sub age: ${Math.round(data.lifecycle.averageSubscriptionAge || 0)} months`} />
                  {data.lifecycle.longestRunning && (
                    <Chip label={`Longest: ${data.lifecycle.longestRunning.name} (${data.lifecycle.longestRunning.lifetimeMonths}mo)`} color="info" />
                  )}
                  {data.lifecycle.mostExpensive && (
                    <Chip label={`Priciest: ${data.lifecycle.mostExpensive.name} (${fmt(data.lifecycle.mostExpensive.monthlyCost)}/mo)`} color="warning" />
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}
