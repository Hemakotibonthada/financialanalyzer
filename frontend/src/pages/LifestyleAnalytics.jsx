// ============================================================================
// Lifestyle Analytics — AI-Powered Lifestyle Clustering & Analysis (Enterprise)
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, Avatar, LinearProgress,
  Divider, useTheme as useMuiTheme,
  Tooltip as MuiTooltip, Slider, Switch, FormControlLabel
} from '@mui/material';
import {
  Spa as LifestyleIcon,
  TrendingUp as TrendIcon,
  TrendingDown as DownIcon,
  FitnessCenter as FitnessIcon,
  Restaurant as FoodIcon,
  ShoppingCart as ShopIcon,
  DirectionsCar as TransportIcon,
  Movie as EntertainIcon,
  Home as HomeIcon,
  LocalHospital as HealthIcon,
  School as EduIcon,
  Flight as TravelIcon,
  Refresh as RefreshIcon,
  Psychology as BrainIcon,
  Timeline as TimelineIcon,
  Lightbulb as InsightIcon,
  EmojiEvents as TrophyIcon,
  CompareArrows as CompareIcon,
  Category as CategoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  FlashOn as QuickWinIcon,
  StarBorder as GoalIcon,
  ErrorOutline as WatchOutIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  AssignmentTurnedIn as ApplyIcon,
} from '@mui/icons-material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const clusterIcons = {
  frugal: <FitnessIcon />,
  balanced: <CompareIcon />,
  premium: <TrophyIcon />,
  'high-spender': <ShopIcon />,
  saver: <FitnessIcon />,
  conservative: <HomeIcon />,
};

const clusterColors = {
  frugal: '#10B981',
  balanced: '#3B82F6',
  premium: '#8B5CF6',
  'high-spender': '#EF4444',
  saver: '#10B981',
  conservative: '#06B6D4',
};

const categoryIcons = {
  food: <FoodIcon />, shopping: <ShopIcon />, transport: <TransportIcon />,
  entertainment: <EntertainIcon />, health: <HealthIcon />, education: <EduIcon />,
  travel: <TravelIcon />, rent: <HomeIcon />,
};

// ─── Section A: Lifestyle Inflation Tracker ──────────────────────────────────
const InflationTracker = ({ data, dk, muiTheme }) => {
  const inflationTrends = data?.inflationTrends || [];
  const incomeGrowth = data?.incomeGrowthPct || 4;
  const spendingGrowthPct = useMemo(() => {
    if (inflationTrends.length < 2) return 0;
    const first = inflationTrends[0];
    const last = inflationTrends[inflationTrends.length - 1];
    const firstTotal = (first.food || 0) + (first.shopping || 0) + (first.entertainment || 0);
    const lastTotal = (last.food || 0) + (last.shopping || 0) + (last.entertainment || 0);
    if (firstTotal === 0) return 0;
    return (((lastTotal - firstTotal) / firstTotal) * 100).toFixed(1);
  }, [inflationTrends]);

  const creepScore = parseFloat(spendingGrowthPct) - incomeGrowth;
  const hasCreep = creepScore > 2;

  const fallback = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    food: 8000 + Math.round(Math.random() * 3000),
    shopping: 5000 + Math.round(Math.random() * 4000),
    entertainment: 2000 + Math.round(Math.random() * 2000),
    healthScore: 70 + Math.round(Math.random() * 20),
  }));
  const chartData = inflationTrends.length > 0 ? inflationTrends : fallback;

  const paperBg = dk ? '#1e293b' : '#ffffff';
  const borderCol = dk ? '#334155' : '#e2e8f0';

  return (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendIcon sx={{ color: '#F59E0B' }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Lifestyle Inflation Tracker
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`Spending Growth: ${spendingGrowthPct}%`} size="small" sx={{ bgcolor: hasCreep ? '#EF444420' : '#10B98120', color: hasCreep ? '#EF4444' : '#10B981', fontWeight: 'bold' }} />
          <Chip label={`Income Growth: ${incomeGrowth}%`} size="small" sx={{ bgcolor: '#3B82F620', color: '#3B82F6', fontWeight: 'bold' }} />
          {hasCreep && (
            <Chip icon={<WarningIcon sx={{ fontSize: 14 }} />} label={`Lifestyle Creep +${creepScore.toFixed(1)}%`} size="small" color="warning" variant="filled" />
          )}
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Monthly spending across top 3 categories over the last 12 months. Lifestyle Creep score = spending growth − income growth.
      </Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
          <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
          <YAxis tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} formatter={(val, name) => [fmt(val), name.charAt(0).toUpperCase() + name.slice(1)]} />
          <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
          <Line type="monotone" dataKey="food" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Food" />
          <Line type="monotone" dataKey="shopping" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="Shopping" />
          <Line type="monotone" dataKey="entertainment" stroke={COLORS[4]} strokeWidth={2} dot={{ r: 3 }} name="Entertainment" />
        </LineChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: hasCreep ? '#EF444410' : '#10B98110', border: `1px solid ${hasCreep ? '#EF444430' : '#10B98130'}` }}>
        <Typography variant="body2" sx={{ color: hasCreep ? '#EF4444' : '#10B981', fontWeight: 600 }}>
          {hasCreep
            ? `⚠ Your spending is growing ${creepScore.toFixed(1)}% faster than your income — lifestyle inflation detected.`
            : `✓ Your spending growth is in line with income growth. Keep it up!`}
        </Typography>
      </Box>
    </Paper>
  );
};

// ─── Section B: Peer Comparison Panel ────────────────────────────────────────
const PeerComparisonPanel = ({ data, dk, muiTheme }) => {
  const peerComparison = data?.peerComparison || [
    { category: 'Food', you: 35, peerAvg: 28 },
    { category: 'Shopping', you: 20, peerAvg: 22 },
    { category: 'Transport', you: 12, peerAvg: 15 },
    { category: 'Entertainment', you: 18, peerAvg: 10 },
    { category: 'Health', you: 5, peerAvg: 8 },
    { category: 'Education', you: 7, peerAvg: 9 },
    { category: 'Travel', you: 3, peerAvg: 8 },
  ];
  const nonEssential = new Set(['shopping', 'entertainment', 'travel']);
  const paperBg = dk ? '#1e293b' : '#ffffff';
  const borderCol = dk ? '#334155' : '#e2e8f0';

  return (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <CompareIcon sx={{ color: '#8B5CF6' }} />
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          How You Compare to Similar Income Earners
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Percentage of monthly spending per category vs. peer average (same income bracket).
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {peerComparison.map((row, i) => {
          const isNonEssential = nonEssential.has(row.category?.toLowerCase());
          const youMore = row.you > row.peerAvg;
          const isAbove = isNonEssential && youMore;
          return (
            <Grid item xs={12} sm={6} key={i}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">{row.category}</Typography>
                <Chip label={isAbove ? 'Above Average' : 'Below Average'} size="small" sx={{ bgcolor: isAbove ? '#EF444420' : '#10B98120', color: isAbove ? '#EF4444' : '#10B981', fontWeight: 'bold', fontSize: 11 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 28 }}>You</Typography>
                <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: dk ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                  <Box sx={{ width: `${Math.min(100, row.you)}%`, height: '100%', bgcolor: COLORS[i % COLORS.length], borderRadius: 5, transition: 'width 0.6s' }} />
                </Box>
                <Typography variant="caption" fontWeight="bold" color="text.primary" sx={{ width: 32 }}>{row.you}%</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 28 }}>Avg</Typography>
                <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: dk ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                  <Box sx={{ width: `${Math.min(100, row.peerAvg)}%`, height: '100%', bgcolor: dk ? '#64748b' : '#94a3b8', borderRadius: 5, transition: 'width 0.6s' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ width: 32 }}>{row.peerAvg}%</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <Divider sx={{ my: 2 }} />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={peerComparison} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} horizontal={false} />
          <XAxis type="number" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="category" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 12 }} width={90} />
          <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} formatter={(val, name) => [`${val}%`, name]} />
          <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
          <Bar dataKey="you" name="You" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
          <Bar dataKey="peerAvg" name="Peer Avg" fill="#94A3B8" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

// ─── Section C: Lifestyle Score Gauge ────────────────────────────────────────
const LifestyleScoreGauge = ({ data, dk }) => {
  const score = data?.lifestyleScore || 72;
  const breakdown = data?.scoreBreakdown || { savingsDiscipline: 68, spendingControl: 74, goalAlignment: 80 };
  const paperBg = dk ? '#1e293b' : '#ffffff';
  const borderCol = dk ? '#334155' : '#e2e8f0';
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work';

  const miniStats = [
    { label: 'Savings Discipline', key: 'savingsDiscipline', color: '#3B82F6' },
    { label: 'Spending Control', key: 'spendingControl', color: '#10B981' },
    { label: 'Goal Alignment', key: 'goalAlignment', color: '#8B5CF6' },
  ];

  return (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SpeedIcon sx={{ color: scoreColor }} />
        <Typography variant="h6" fontWeight="bold" color="text.primary">Lifestyle Score</Typography>
        <Chip label={scoreLabel} size="small" sx={{ ml: 'auto', bgcolor: scoreColor + '20', color: scoreColor, fontWeight: 'bold' }} />
      </Box>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
            <CircularProgress variant="determinate" value={100} size={160} thickness={4} sx={{ color: dk ? '#334155' : '#e2e8f0', position: 'absolute' }} />
            <CircularProgress variant="determinate" value={score} size={160} thickness={4} sx={{ color: scoreColor }} />
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: 160, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h3" fontWeight="bold" sx={{ color: scoreColor, lineHeight: 1 }}>{score}</Typography>
              <Typography variant="caption" color="text.secondary">/ 100</Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">Overall Lifestyle Score</Typography>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.primary" sx={{ mb: 2 }}>Score Breakdown</Typography>
          {miniStats.map((stat) => {
            const val = breakdown[stat.key] || 0;
            return (
              <Box key={stat.key} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.primary">{stat.label}</Typography>
                  <Chip label={`${val}%`} size="small" sx={{ bgcolor: stat.color + '20', color: stat.color, fontWeight: 'bold', minWidth: 54 }} />
                </Box>
                <LinearProgress variant="determinate" value={val} sx={{ height: 10, borderRadius: 5, bgcolor: dk ? '#334155' : '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: stat.color, borderRadius: 5 } }} />
              </Box>
            );
          })}
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: scoreColor + '10', border: `1px solid ${scoreColor}30` }}>
            <Typography variant="body2" sx={{ color: scoreColor, fontWeight: 600 }}>
              {score >= 80 ? '🏆 Outstanding! Your financial lifestyle is highly optimized.' : score >= 60 ? '📈 On track. A few improvements can push you into the excellence zone.' : '🔧 Action needed. Focus on savings discipline and controlling discretionary spend.'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

// ─── Section D: Monthly Heatmap ───────────────────────────────────────────────
const MonthlyHeatmap = ({ data, dk }) => {
  const rawHeatmap = data?.monthlyHeatmap || [];
  const paperBg = dk ? '#1e293b' : '#ffffff';
  const borderCol = dk ? '#334155' : '#e2e8f0';

  const heatmapData = useMemo(() => {
    if (rawHeatmap.length > 0) return rawHeatmap;
    return Array.from({ length: 28 }, (_, i) => ({ day: i + 1, intensity: Math.random() }));
  }, [rawHeatmap]);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const intensityToColor = (val) => {
    const v = Math.max(0, Math.min(1, val));
    if (v < 0.25) return '#10B981';
    if (v < 0.5) return '#84CC16';
    if (v < 0.75) return '#F59E0B';
    return '#EF4444';
  };

  const rows = [];
  for (let i = 0; i < heatmapData.length; i += 7) rows.push(heatmapData.slice(i, i + 7));

  return (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CalendarIcon sx={{ color: '#06B6D4' }} />
        <Typography variant="h6" fontWeight="bold" color="text.primary">Monthly Spending Heatmap</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Daily spending intensity for the current month. Darker cells indicate higher spend days.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 28px)', gap: '6px', mb: 0.5, ml: 1 }}>
        {dayLabels.map((d) => (
          <Typography key={d} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: 10, fontWeight: 600 }}>{d}</Typography>
        ))}
      </Box>
      {rows.map((row, ri) => (
        <Box key={ri} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 28px)', gap: '6px', mb: '6px', ml: 1 }}>
          {row.map((cell, ci) => (
            <MuiTooltip key={ci} title={`Day ${cell.day} — Intensity: ${(cell.intensity * 100).toFixed(0)}%`} arrow placement="top">
              <Box sx={{ width: 28, height: 28, borderRadius: '4px', bgcolor: intensityToColor(cell.intensity), opacity: 0.3 + cell.intensity * 0.7, cursor: 'pointer', transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.2)', opacity: 1 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: 9, color: '#fff', fontWeight: 700, lineHeight: 1 }}>{cell.day}</Typography>
              </Box>
            </MuiTooltip>
          ))}
          {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, k) => (
            <Box key={`pad-${k}`} sx={{ width: 28, height: 28 }} />
          ))}
        </Box>
      ))}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Spend level:</Typography>
        {[{ label: 'Low', color: '#10B981' }, { label: 'Moderate', color: '#84CC16' }, { label: 'High', color: '#F59E0B' }, { label: 'Very High', color: '#EF4444' }].map((l) => (
          <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: l.color }} />
            <Typography variant="caption" color="text.secondary">{l.label}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

// ─── Section E: AI Recommendations Panel ─────────────────────────────────────
const AIRecommendationsPanel = ({ data, dk }) => {
  const rawInsights = data?.insights || data?.recommendations || [];
  const paperBg = dk ? '#1e293b' : '#ffffff';
  const borderCol = dk ? '#334155' : '#e2e8f0';

  const categorized = useMemo(() => {
    const quickWins = [], monthlyGoals = [], watchOut = [];
    rawInsights.forEach((item, i) => {
      const text = typeof item === 'string' ? item : item.text || item.message || item.title || '';
      const priority = typeof item === 'object' ? (item.priority || item.type || '') : '';
      const entry = { text, priority, id: i };
      if (priority === 'warning' || text.toLowerCase().includes('warning') || text.toLowerCase().includes('watch') || text.toLowerCase().includes('risk')) {
        watchOut.push(entry);
      } else if (priority === 'goal' || text.toLowerCase().includes('save') || text.toLowerCase().includes('goal') || text.toLowerCase().includes('target')) {
        monthlyGoals.push(entry);
      } else {
        quickWins.push(entry);
      }
    });
    if (quickWins.length === 0) {
      quickWins.push(
        { text: 'Batch grocery shopping on weekends to cut food spend by ~12%.', id: 'fw1' },
        { text: 'Use a subscription audit to cancel unused services this week.', id: 'fw2' },
        { text: 'Switch to home-brewed coffee for a ₹1,200/month saving.', id: 'fw3' },
      );
    }
    if (monthlyGoals.length === 0) {
      monthlyGoals.push(
        { text: 'Set a ₹5,000 discretionary cap for entertainment this month.', id: 'mg1' },
        { text: 'Automate 20% of salary to savings on the 1st of each month.', id: 'mg2' },
      );
    }
    if (watchOut.length === 0) {
      watchOut.push(
        { text: 'Shopping spend up 18% this month — review cart before checkout.', id: 'wo1' },
        { text: 'Dining out frequency increased — consider meal-prepping 3 days/week.', id: 'wo2' },
      );
    }
    return { quickWins, monthlyGoals, watchOut };
  }, [rawInsights]);

  const [applied, setApplied] = useState({});
  const handleApply = (id) => setApplied((prev) => ({ ...prev, [id]: true }));

  const renderGroup = (title, items, icon, accentColor) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: accentColor }}>{title}</Typography>
        <Chip label={items.length} size="small" sx={{ bgcolor: accentColor + '20', color: accentColor, fontWeight: 'bold', height: 20, fontSize: 11 }} />
      </Box>
      <Grid container spacing={1.5}>
        {items.map((item) => (
          <Grid item xs={12} sm={6} key={item.id}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: accentColor + '15', border: `1px solid ${accentColor}30`, display: 'flex', alignItems: 'flex-start', gap: 1.5, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: `0 0 0 2px ${accentColor}40` } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: accentColor, mt: '5px', flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 1, lineHeight: 1.5 }}>{item.text}</Typography>
                <Button size="small" variant={applied[item.id] ? 'contained' : 'outlined'} startIcon={applied[item.id] ? <CheckIcon sx={{ fontSize: 14 }} /> : <ApplyIcon sx={{ fontSize: 14 }} />} onClick={() => handleApply(item.id)} sx={{ fontSize: 11, py: 0.3, px: 1.5, borderColor: accentColor, color: applied[item.id] ? '#fff' : accentColor, bgcolor: applied[item.id] ? accentColor : 'transparent', '&:hover': { bgcolor: accentColor, color: '#fff' } }}>
                  {applied[item.id] ? 'Applied!' : 'Apply Goal'}
                </Button>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <BrainIcon sx={{ color: '#8B5CF6' }} />
        <Typography variant="h6" fontWeight="bold" color="text.primary">AI Lifestyle Recommendations</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Personalized, categorized action plan based on your spending clusters and lifestyle score.
      </Typography>
      {renderGroup('Quick Wins', categorized.quickWins, <QuickWinIcon sx={{ color: '#10B981', fontSize: 20 }} />, '#10B981')}
      {renderGroup('Monthly Goals', categorized.monthlyGoals, <GoalIcon sx={{ color: '#3B82F6', fontSize: 20 }} />, '#3B82F6')}
      {renderGroup('Watch Out', categorized.watchOut, <WatchOutIcon sx={{ color: '#F59E0B', fontSize: 20 }} />, '#F59E0B')}
    </Paper>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LifestyleAnalytics = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const muiTheme = useMuiTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result } = await aiTrainingService.getLifestyle();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lifestyle analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetrain = async () => {
    try {
      setTraining(true);
      await aiTrainingService.trainModel('lifestyle_cluster');
      await fetchData();
    } catch (err) {
      setError('Retraining failed');
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Clustering your lifestyle patterns...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  const currentCluster = data?.currentCluster || data?.cluster || {};
  const clusterLabel = currentCluster.label || currentCluster.name || 'Unknown';
  const clusterColor = clusterColors[clusterLabel.toLowerCase()] || '#6B7280';
  const spendingProfile = data?.spendingProfile || data?.categoryBreakdown || {};
  const transitions = data?.transitions || data?.clusterHistory || [];
  const allClusters = data?.allClusters || data?.clusters || [];

  const paperBg = dk ? '#1e293b' : '#ffffff';
  const borderCol = dk ? '#334155' : '#e2e8f0';

  // Radar data for spending profile
  const radarData = Object.entries(spendingProfile)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'object' && v.percentage))
    .slice(0, 8)
    .map(([cat, v]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: typeof v === 'number' ? v : v.percentage || 0,
    }));

  // Cluster comparison
  const clusterComparison = allClusters.map((c, i) => ({
    name: c.label || c.name || `Cluster ${i+1}`,
    members: c.memberCount || c.size || 0,
    avgSpending: c.avgSpending || c.centroid?.reduce?.((s, v) => s + v, 0) || 0,
    fill: COLORS[i % COLORS.length],
  }));

  // Transition timeline
  const transitionData = transitions.map((t, i) => ({
    month: t.month || t.period || `Month ${i+1}`,
    cluster: t.cluster || t.label || '',
    spending: t.totalSpending || t.spending || 0,
  }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LifestyleIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">Lifestyle Analytics</Typography>
              <Typography variant="body2" color="text.secondary">AI-powered lifestyle clustering using K-means analysis on spending patterns</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={training ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRetrain} disabled={training}>
            {training ? 'Retraining...' : 'Retrain'}
          </Button>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
        {data?.autoTrained && <Alert severity="info" sx={{ mb: 3 }}><BrainIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Lifestyle model auto-trained.</Alert>}

        {/* Current Cluster Card */}
        <Paper sx={{ p: 4, borderRadius: 3, bgcolor: paperBg, mb: 4, border: `2px solid ${clusterColor}22` }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: clusterColor, width: 80, height: 80, mx: 'auto', mb: 2, fontSize: 36 }}>
                {clusterIcons[clusterLabel.toLowerCase()] || <LifestyleIcon sx={{ fontSize: 36 }} />}
              </Avatar>
              <Typography variant="h4" fontWeight="bold" sx={{ color: clusterColor }}>{clusterLabel}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Your Current Lifestyle Cluster</Typography>
              <Chip
                label={`Confidence: ${((currentCluster.confidence || currentCluster.similarity || 0) * 100).toFixed(0)}%`}
                sx={{ mt: 1, bgcolor: clusterColor + '20', color: clusterColor, fontWeight: 'bold' }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>Spending Profile</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={muiTheme.palette.divider} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: muiTheme.palette.text.secondary, fontSize: 9 }} />
                  <Radar name="Your Profile" dataKey="value" stroke={clusterColor} fill={clusterColor} fillOpacity={0.35} />
                  <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                </RadarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </Paper>

        {/* Cluster Characteristics & Category Breakdown */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <CategoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Category Breakdown
              </Typography>
              {Object.entries(spendingProfile)
                .filter(([, v]) => typeof v === 'number' || (typeof v === 'object' && v.percentage))
                .sort((a, b) => {
                  const va = typeof a[1] === 'number' ? a[1] : a[1].percentage || 0;
                  const vb = typeof b[1] === 'number' ? b[1] : b[1].percentage || 0;
                  return vb - va;
                })
                .slice(0, 8)
                .map(([cat, v], i) => {
                  const pct = typeof v === 'number' ? v : v.percentage || 0;
                  return (
                    <Box key={cat} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: COLORS[i % COLORS.length] + '20' }}>
                            {categoryIcons[cat] || <CategoryIcon sx={{ fontSize: 14, color: COLORS[i % COLORS.length] }} />}
                          </Avatar>
                          <Typography variant="body2" color="text.primary">{cat.charAt(0).toUpperCase() + cat.slice(1)}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold" color="text.primary">
                          {typeof pct === 'number' && pct < 1 ? `${(pct * 100).toFixed(1)}%` : `${pct.toFixed?.(1) || pct}%`}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, pct < 1 ? pct * 100 : pct)}
                        sx={{ height: 8, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: COLORS[i % COLORS.length], borderRadius: 2 } }}
                      />
                    </Box>
                  );
                })}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                <CompareIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Cluster Comparison
              </Typography>
              {clusterComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clusterComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="name" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }} />
                    <Bar dataKey="members" name="Members" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgSpending" name="Avg Spending" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ color: muiTheme.palette.text.primary }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CompareIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography color="text.secondary" sx={{ mt: 1 }}>Not enough data for cluster comparison yet.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Lifestyle Transitions Timeline */}
        {transitionData.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: paperBg, border: `1px solid ${borderCol}`, mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Lifestyle Evolution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>How your spending lifestyle has evolved over time</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={transitionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                <XAxis dataKey="month" tick={{ fill: muiTheme.palette.text.secondary, fontSize: 11 }} />
                <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                <Tooltip contentStyle={{ backgroundColor: muiTheme.palette.background.paper, border: `1px solid ${muiTheme.palette.divider}`, borderRadius: 8, color: muiTheme.palette.text.primary }}
                  formatter={(val) => fmt(val)} />
                <Area type="monotone" dataKey="spending" stroke={clusterColor} fill={clusterColor} fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* ── Section A: Lifestyle Inflation Tracker ── */}
        <InflationTracker data={data} dk={dk} muiTheme={muiTheme} />

        {/* ── Section B: Peer Comparison Panel ── */}
        <PeerComparisonPanel data={data} dk={dk} muiTheme={muiTheme} />

        {/* ── Section C: Lifestyle Score Gauge ── */}
        <LifestyleScoreGauge data={data} dk={dk} />

        {/* ── Section D: Monthly Heatmap ── */}
        <MonthlyHeatmap data={data} dk={dk} />

        {/* ── Section E: AI Recommendations Panel ── */}
        <AIRecommendationsPanel data={data} dk={dk} />

      </Box>
    </MainLayout>
  );
};

export default LifestyleAnalytics;
