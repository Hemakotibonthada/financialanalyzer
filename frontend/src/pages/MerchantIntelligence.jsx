// ============================================================================
// Merchant Intelligence Dashboard — AI-Powered Merchant Analysis
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, TextField, InputAdornment, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails, Badge,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  Store as StoreIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  Repeat as RecurringIcon,
  Subscriptions as SubIcon,
  Loyalty as LoyaltyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  ExpandMore as ExpandIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as ShopIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Notifications as NotifyIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, Treemap, ScatterChart, Scatter
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'];
const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

// ── Frequency Badge ──
const FreqBadge = ({ frequency }) => {
  const colorMap = { daily: 'error', weekly: 'warning', 'bi-weekly': 'info', monthly: 'primary', quarterly: 'secondary', yearly: 'default', occasional: 'default' };
  return <Chip size="small" label={frequency || 'Unknown'} color={colorMap[frequency] || 'default'} variant="outlined" />;
};

// ── Loyalty Stars ──
const LoyaltyStars = ({ score }) => {
  const stars = Math.round((score || 0) / 20);
  return (
    <Box sx={{ display: 'flex', gap: 0.25 }}>
      {[1,2,3,4,5].map(i => i <= stars ? <StarIcon key={i} sx={{ fontSize: 16, color: '#F59E0B' }} /> : <StarBorderIcon key={i} sx={{ fontSize: 16, color: 'text.disabled' }} />)}
    </Box>
  );
};

// ── MerchantCard ──
const MerchantCard = ({ merchant, data, theme }) => {
  const isRecurring = data.isRecurring || data.recurring;
  const isSub = data.isSubscription || data.subscription;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'primary.main', boxShadow: 2 }, transition: 'all 0.2s' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 16. }}>
              {merchant?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="text.primary" noWrap>
                {merchant || 'Unknown Merchant'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                <FreqBadge frequency={data.frequencyClass || data.frequency} />
                {isRecurring && <Chip size="small" icon={<RecurringIcon sx={{ fontSize: 14 }} />} label="Recurring" color="info" />}
                {isSub && <Chip size="small" icon={<SubIcon sx={{ fontSize: 14 }} />} label="Subscription" color="secondary" />}
              </Box>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary">{fmt(data.totalSpent || data.total)}</Typography>
            <Typography variant="caption" color="text.secondary">{data.transactionCount || data.count || 0} txns</Typography>
          </Box>
        </Box>

        {/* Stats Row */}
        <Grid container spacing={1} sx={{ mt: 0.5 }}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center', p: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" display="block">Avg</Typography>
              <Typography variant="body2" fontWeight="bold" color="text.primary">{fmt(data.averageAmount || data.average)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center', p: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" display="block">Loyalty</Typography>
              <LoyaltyStars score={data.loyaltyScore || 0} />
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center', p: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" display="block">Price Δ</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: (data.priceSensitivity || 0) > 0.5 ? 'warning.main' : 'success.main' }}>
                {((data.priceSensitivity || 0) * 100).toFixed(0)}%
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Next Predicted */}
        {data.nextPredicted && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography variant="caption" color="text.secondary">
              Next: <strong>{new Date(data.nextPredicted.date || data.nextPredicted).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</strong>
              {data.nextPredicted.amount && ` • ${fmt(data.nextPredicted.amount)}`}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const MerchantIntelligence = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getMerchantIntelligence();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load merchant intelligence');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('merchant_intelligence');
      await fetchData();
    } catch (err) {
      setError('Retraining failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTraining(false);
    }
  };

  // Derived data
  const merchants = useMemo(() => {
    const raw = data?.merchantProfiles || data?.merchants || {};
    return Object.entries(raw)
      .map(([name, info]) => ({ name, ...info }))
      .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const subscriptions = useMemo(() => merchants.filter(m => m.isSubscription || m.subscription), [merchants]);
  const recurring = useMemo(() => merchants.filter(m => m.isRecurring || m.recurring), [merchants]);
  const topBySpend = useMemo(() => [...merchants].sort((a, b) => (b.totalSpent || b.total || 0) - (a.totalSpent || a.total || 0)).slice(0, 10), [merchants]);

  // Chart Data
  const treemapData = useMemo(() => topBySpend.map((m, i) => ({
    name: m.name?.substring(0, 15) || 'Unknown',
    size: m.totalSpent || m.total || 0,
    fill: COLORS[i % COLORS.length],
  })), [topBySpend]);

  const frequencyDistribution = useMemo(() => {
    const counts = {};
    merchants.forEach(m => {
      const f = m.frequencyClass || m.frequency || 'unknown';
      counts[f] = (counts[f] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [merchants]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Analyzing merchant patterns...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StoreIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Merchant Intelligence</Typography>
              <Typography variant="body2" color="text.secondary">AI-powered merchant analysis, subscriptions & spending predictions</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small" placeholder="Search merchants..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ width: 200 }}
            />
            <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
              {training ? 'Retraining...' : 'Retrain'}
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Auto-trained with latest transaction data.</Alert>}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Total Merchants', value: merchants.length, icon: <StoreIcon />, color: 'primary.main' },
            { label: 'Subscriptions', value: subscriptions.length, icon: <SubIcon />, color: 'secondary.main' },
            { label: 'Recurring', value: recurring.length, icon: <RecurringIcon />, color: 'info.main' },
            { label: 'Total Tracked', value: fmt(merchants.reduce((s, m) => s + (m.totalSpent || m.total || 0), 0)), icon: <MoneyIcon />, color: 'success.main' },
          ].map((card, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: card.color, mx: 'auto', mb: 1, width: 44, height: 44 }}>{card.icon}</Avatar>
                <Typography variant="h5" fontWeight="bold" color="text.primary">{card.value}</Typography>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label={`All Merchants (${merchants.length})`} />
          <Tab label={`Subscriptions (${subscriptions.length})`} icon={<Badge badgeContent={subscriptions.length} color="secondary"><SubIcon /></Badge>} iconPosition="start" />
          <Tab label={`Recurring (${recurring.length})`} icon={<Badge badgeContent={recurring.length} color="info"><RecurringIcon /></Badge>} iconPosition="start" />
        </Tabs>

        {/* Tab 0: All Merchants */}
        {tab === 0 && (
          <>
            {/* Top Spending Treemap + Frequency Pie */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>Top Merchants by Spending</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap data={treemapData} dataKey="size" aspectRatio={4/3} stroke={muiTheme.palette.divider}
                      content={({ x, y, width, height, name, value }) => (
                        width > 40 && height > 30 ? (
                          <g>
                            <rect x={x} y={y} width={width} height={height} rx={4} fill={treemapData.find(d => d.name === name)?.fill || '#ccc'} fillOpacity={0.85} stroke={muiTheme.palette.background.paper} strokeWidth={2} />
                            <text x={x + width/2} y={y + height/2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold">{name}</text>
                            <text x={x + width/2} y={y + height/2 + 10} textAnchor="middle" fill="#fff" fontSize={9}>{fmt(value)}</text>
                          </g>
                        ) : (
                          <rect x={x} y={y} width={width} height={height} rx={2} fill={treemapData.find(d => d.name === name)?.fill || '#ccc'} fillOpacity={0.85} stroke={muiTheme.palette.background.paper} strokeWidth={1} />
                        )
                      )}
                    />
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>Frequency Distribution</Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={frequencyDistribution} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {frequencyDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Merchant Cards Grid */}
            <Grid container spacing={2}>
              {topBySpend.map((m) => (
                <Grid item xs={12} sm={6} md={4} key={m.name}>
                  <MerchantCard merchant={m.name} data={m} theme={muiTheme} />
                </Grid>
              ))}
              {topBySpend.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <StoreIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No merchant data found. Add more transactions to see insights.</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}

        {/* Tab 1: Subscriptions */}
        {tab === 1 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <SubIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Active Subscriptions
            </Typography>
            {subscriptions.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Merchant</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Frequency</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Avg Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Total Spent</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Loyalty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Next Expected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.map(s => (
                      <TableRow key={s.name} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main', fontSize: 13 }}>{s.name?.charAt(0)}</Avatar>
                            <Typography variant="body2" fontWeight="medium" color="text.primary">{s.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><FreqBadge frequency={s.frequencyClass || s.frequency} /></TableCell>
                        <TableCell align="right" sx={{ color: 'text.primary' }}>{fmt(s.averageAmount || s.average)}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 'bold' }}>{fmt(s.totalSpent || s.total)}</TableCell>
                        <TableCell><LoyaltyStars score={s.loyaltyScore || 0} /></TableCell>
                        <TableCell>
                          {s.nextPredicted ? (
                            <Chip size="small" icon={<CalendarIcon />} label={new Date(s.nextPredicted.date || s.nextPredicted).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} />
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SubIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography color="text.secondary" sx={{ mt: 1 }}>No subscriptions detected yet.</Typography>
              </Box>
            )}
            {subscriptions.length > 0 && (
              <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" color="text.primary" fontWeight="bold">
                  Monthly Subscription Cost: {fmt(subscriptions.reduce((s, m) => s + (m.averageAmount || m.average || 0), 0))}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Tab 2: Recurring */}
        {tab === 2 && (
          <Grid container spacing={2}>
            {recurring.length > 0 ? recurring.map(m => (
              <Grid item xs={12} sm={6} md={4} key={m.name}>
                <MerchantCard merchant={m.name} data={m} theme={muiTheme} />
              </Grid>
            )) : (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <RecurringIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography color="text.secondary" sx={{ mt: 1 }}>No recurring merchants found.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </MainLayout>
  );
};

export default MerchantIntelligence;
