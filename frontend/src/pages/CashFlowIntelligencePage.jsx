// ============================================================================
// CASH FLOW INTELLIGENCE PAGE — Predictive Cash Flow Dashboard
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, List, ListItem, ListItemText, ListItemIcon, Divider,
  TextField, Slider
} from '@mui/material';
import {
  AccountBalance, TrendingUp, TrendingDown, Warning,
  CheckCircle, Refresh, Timeline, CalendarMonth,
  Speed, WaterDrop, Payments, Receipt
} from '@mui/icons-material';

export default function CashFlowIntelligencePage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [balance, setBalance] = useState(200000);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-premium/cashflow/analyze?balance=${balance}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [balance]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCurrency = (n) => `₹${Math.round(n || 0).toLocaleString()}`;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WaterDrop color="primary" /> Cash Flow Intelligence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-powered cash flow prediction, bill calendar, and liquidity analysis
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField size="small" label="Current Balance" type="number" value={balance}
            onChange={e => setBalance(Number(e.target.value))} sx={{ width: 160 }} />
          <Button variant="contained" onClick={fetchData} disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}>
            Analyze
          </Button>
        </Box>
      </Box>

      {loading && !data && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Analyzing cash flow patterns...</Typography>
        </Box>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {data.forecast?.summary && [
              { label: 'Projected Income', value: formatCurrency(data.forecast.summary.totalProjectedIncome), icon: <TrendingUp color="success" /> },
              { label: 'Projected Expenses', value: formatCurrency(data.forecast.summary.totalProjectedExpenses), icon: <TrendingDown color="error" /> },
              { label: 'Net Cash Flow', value: formatCurrency(data.forecast.summary.netCashFlow),
                icon: data.forecast.summary.netCashFlow >= 0 ? <CheckCircle color="success" /> : <Warning color="error" /> },
              { label: 'Lowest Balance', value: formatCurrency(data.forecast.summary.lowestBalance),
                icon: <AccountBalance color={data.forecast.summary.lowestBalance >= 0 ? 'info' : 'error'} /> }
            ].map((card, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    {card.icon}
                    <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{card.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Risk Alerts */}
          {data.forecast?.risks?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              {data.forecast.risks.map((risk, i) => (
                <Alert key={i} severity={risk.severity === 'critical' ? 'error' : risk.severity === 'high' ? 'warning' : 'info'} sx={{ mb: 1 }}>
                  <Typography variant="body2"><strong>{risk.type.replace(/_/g, ' ')}:</strong> {risk.message}</Typography>
                </Alert>
              ))}
            </Box>
          )}

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab icon={<Timeline />} label="Forecast" />
            <Tab icon={<CalendarMonth />} label="Bill Calendar" />
            <Tab icon={<Receipt />} label="Recurring" />
            <Tab icon={<Speed />} label="Liquidity" />
          </Tabs>

          {/* Forecast Tab */}
          {activeTab === 0 && data.forecast?.weekly && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Weekly Cash Flow Forecast</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Week</strong></TableCell>
                        <TableCell align="right"><strong>Income</strong></TableCell>
                        <TableCell align="right"><strong>Expenses</strong></TableCell>
                        <TableCell align="right"><strong>Net Flow</strong></TableCell>
                        <TableCell align="right"><strong>End Balance</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.forecast.weekly.map((w, i) => (
                        <TableRow key={i} sx={{ bgcolor: w.netFlow < 0 ? 'error.50' : 'inherit' }}>
                          <TableCell>Week {w.week} ({w.startDate?.split('T')[0]?.substring(5)})</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(w.totalIncome)}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>{formatCurrency(w.totalExpense)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', color: w.netFlow >= 0 ? 'success.main' : 'error.main' }}>
                            {w.netFlow >= 0 ? '+' : ''}{formatCurrency(w.netFlow)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: w.endBalance < 0 ? 'error.main' : 'text.primary' }}>
                            {formatCurrency(w.endBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Bill Calendar Tab */}
          {activeTab === 1 && data.billCalendar && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Upcoming Bills ({data.billCalendar.next7Days?.length || 0} this week)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={`${formatCurrency(data.billCalendar.totalUpcomingBills)} in bills`} color="error" />
                  <Chip label={`${formatCurrency(data.billCalendar.totalUpcomingIncome)} in income`} color="success" />
                  <Chip label={`${data.billCalendar.billFreeDays} bill-free days`} />
                </Box>
                {data.billCalendar.calendar?.slice(0, 20).map((day, i) => (
                  <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: day.netFlow < 0 ? 'error.50' : 'success.50', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{day.date} ({day.dayOfWeek})</Typography>
                        {day.events.map((e, j) => (
                          <Typography key={j} variant="caption" display="block" color={e.type === 'income' ? 'success.main' : 'error.main'}>
                            {e.type === 'income' ? '↑' : '↓'} {e.name}: {formatCurrency(e.amount)}
                          </Typography>
                        ))}
                      </Box>
                      <Chip label={`Net: ${day.netFlow >= 0 ? '+' : ''}${formatCurrency(day.netFlow)}`}
                        color={day.netFlow >= 0 ? 'success' : 'error'} size="small" />
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recurring Tab */}
          {activeTab === 2 && data.expenseAnalysis && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Recurring Expenses ({data.expenseAnalysis.recurring?.length || 0} detected)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Monthly: ${formatCurrency(data.expenseAnalysis.totalMonthlyRecurring)}`} color="primary" />
                  <Chip label={`Subscriptions: ${data.expenseAnalysis.subscriptionCount}`} color="info" />
                  <Chip label={`Annual: ${formatCurrency(data.expenseAnalysis.totalAnnualRecurring)}`} variant="outlined" />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell align="right"><strong>Amount</strong></TableCell>
                        <TableCell><strong>Frequency</strong></TableCell>
                        <TableCell><strong>Next Due</strong></TableCell>
                        <TableCell align="right"><strong>Annual Cost</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.expenseAnalysis.recurring || []).slice(0, 15).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {r.description}
                            {r.isSubscription && <Chip label="Sub" size="small" color="info" sx={{ ml: 1, height: 18 }} />}
                          </TableCell>
                          <TableCell align="right">{formatCurrency(r.amount)}</TableCell>
                          <TableCell><Chip label={r.frequency} size="small" variant="outlined" /></TableCell>
                          <TableCell>{r.daysUntilNext}d</TableCell>
                          <TableCell align="right">{formatCurrency(r.annualCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Savings suggestions */}
                {data.expenseAnalysis.potentialSavings?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">💡 Savings Opportunities</Typography>
                    {data.expenseAnalysis.potentialSavings.map((s, i) => (
                      <Alert key={i} severity="info" sx={{ mt: 1, py: 0 }}>
                        <Typography variant="caption">{s.suggestion}</Typography>
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Liquidity Tab */}
          {activeTab === 3 && data.liquidity && (
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h3" fontWeight="bold"
                    color={data.liquidity.score >= 60 ? 'success.main' : data.liquidity.score >= 40 ? 'warning.main' : 'error.main'}>
                    {data.liquidity.score}/100
                  </Typography>
                  <Typography variant="h6">{data.liquidity.status}</Typography>
                  <Chip label={data.liquidity.adequate ? 'Adequate Liquidity' : 'Low Liquidity'} sx={{ mt: 1 }}
                    color={data.liquidity.adequate ? 'success' : 'error'} />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {data.liquidity.metrics && Object.entries(data.liquidity.metrics).map(([key, value]) => (
                    <Grid item xs={6} md={4} key={key}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {key.replace(/([A-Z])/g, ' $1')}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {data.liquidity.recommendations?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Recommendations</Typography>
                    {data.liquidity.recommendations.map((rec, i) => (
                      <Alert key={i} severity="info" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="caption">{rec}</Typography>
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Forecast Recommendations */}
          {data.forecast?.recommendations?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              {data.forecast.recommendations.map((rec, i) => (
                <Alert key={i} severity={rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'} sx={{ mb: 1 }}>
                  {rec.message}
                </Alert>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
