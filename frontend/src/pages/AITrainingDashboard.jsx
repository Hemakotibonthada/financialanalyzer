// ============================================================================
// AI Training Dashboard — Enterprise ML Model Management + Registry + Scheduler
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Button, Chip, LinearProgress,
  Card, CardContent, CardActions, Alert, CircularProgress,
  Divider, IconButton, Tooltip as MuiTooltip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField,
  Accordion, AccordionSummary, AccordionDetails, Avatar, Badge,
  useTheme as useMuiTheme, Tabs, Tab, Switch, FormControlLabel,
  Skeleton, Fade, Grow
} from '@mui/material';
import {
  Psychology as BrainIcon,
  ModelTraining as TrainIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  TrendingUp as TrendIcon,
  Category as CategoryIcon,
  AccountBalance as BudgetIcon,
  Shield as ShieldIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  SmartToy as AIIcon,
  SelfImprovement as SelfIcon,
  Hub as HubIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  AutoGraph as AutoGraphIcon,
  Science as ScienceIcon,
  CompareArrows as CompareIcon,
  BugReport as DriftIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Upgrade as PromoteIcon,
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  DataObject as DataIcon,
  Bolt as BoltIcon,
  HealthAndSafety as HealthIcon
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService, aiModelService } from '../services/api';
import MainLayout from '../components/MainLayout';

// Placeholder for SelfTrainingPanel (component was removed)
const SelfTrainingPanel = ({ embedded }) => (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>Self-Training AI Engine</Typography>
    <Typography color="text.secondary">The AI model trains automatically as you use the app. Your data patterns are analyzed locally to improve predictions and recommendations.</Typography>
    <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="body2" color="text.secondary">Status: Active • Model: finserve-local-v1 • Training: Continuous</Typography>
    </Box>
  </Box>
);

// ─── Accent-aware MUI sx helper ─────────────────────────────────────────
const useAccentSx = () => {
  const { accent, mode } = useTheme();
  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';

  return useMemo(() => ({
    accent,
    isDark,
    isBlack,
    cardSx: {
      bgcolor: isBlack ? '#0a0a0a' : 'background.paper',
      borderRadius: 3,
      border: `1px solid`,
      borderColor: isBlack ? '#27272a' : isDark ? 'divider' : '#e5e7eb',
      transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
    },
    sectionSx: {
      bgcolor: isBlack ? '#0a0a0a' : 'background.paper',
      borderRadius: 3,
      border: `1px solid`,
      borderColor: isBlack ? '#27272a' : isDark ? 'divider' : '#e5e7eb',
      p: 3,
    },
    headerGradient: {
      background: `linear-gradient(135deg, var(--color-accent, #6366f1), var(--color-accent-hover, #4f46e5))`,
    },
  }), [accent, mode, isDark, isBlack]);
};

// ============================================================================
// Model Card Component
// ============================================================================
const ModelCard = ({ model, onTrain, training, sx: sxHelper }) => {
  const muiTheme = useMuiTheme();
  const icons = {
    categorizer: <CategoryIcon />,
    spending_patterns: <TrendIcon />,
    anomaly_baselines: <ShieldIcon />,
    budget_optimizer: <BudgetIcon />,
    risk_profile: <ShieldIcon />,
    goal_forecaster: <TimelineIcon />,
    lifestyle_cluster: <InsightsIcon />,
    income_predictor: <TrendIcon />,
    merchant_intelligence: <HubIcon />,
    sentiment_analyzer: <SelfIcon />,
  };
  const labels = {
    categorizer_v2: 'Transaction Categorizer',
    spending_patterns: 'Spending Patterns',
    anomaly_baselines_v2: 'Anomaly Detection',
    budget_optimizer: 'Budget Optimizer',
    risk_profile: 'Risk Profiler',
    goal_forecaster: 'Goal Forecaster',
    lifestyle_cluster: 'Lifestyle Clustering',
    income_predictor: 'Income Predictor',
    merchant_intelligence: 'Merchant Intelligence',
    sentiment_analyzer: 'Financial Sentiment',
  };
  const trainerKeys = {
    categorizer_v2: 'categorizer',
    spending_patterns: 'spending_patterns',
    anomaly_baselines_v2: 'anomaly_baselines',
    budget_optimizer: 'budget_optimizer',
    risk_profile: 'risk_profile',
    goal_forecaster: 'goal_forecaster',
    lifestyle_cluster: 'lifestyle_cluster',
    income_predictor: 'income_predictor',
    merchant_intelligence: 'merchant_intelligence',
    sentiment_analyzer: 'sentiment_analyzer',
  };

  const name = model.name;
  const trained = model.trained;
  const stale = model.lastTrained && (Date.now() - new Date(model.lastTrained).getTime() > 7 * 86400000);
  const label = labels[name] || name;
  const icon = icons[name.replace('_v2', '')] || <BrainIcon />;
  const trainerKey = trainerKeys[name] || name;

  return (
    <Grow in timeout={400}>
      <Card sx={{
        ...sxHelper.cardSx,
        borderLeft: `4px solid`,
        borderLeftColor: trained ? (stale ? 'warning.main' : 'success.main') : 'action.disabled',
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{
              bgcolor: trained ? (stale ? 'warning.main' : 'success.main') : 'action.disabled',
              width: 40, height: 40,
              transition: 'all 0.3s ease',
            }}>
              {icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                {label}
              </Typography>
              <Chip
                size="small"
                label={trained ? (stale ? 'Stale' : 'Trained') : 'Not Trained'}
                color={trained ? (stale ? 'warning' : 'success') : 'default'}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          {trained && model.lastTrained && (
            <Typography variant="caption" color="text.secondary" display="block">
              Last trained: {new Date(model.lastTrained).toLocaleString()}
            </Typography>
          )}
          {model.size > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              Model size: {(model.size / 1024).toFixed(1)} KB
            </Typography>
          )}
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button
            size="small"
            variant={trained ? 'outlined' : 'contained'}
            startIcon={training ? <CircularProgress size={16} /> : <TrainIcon />}
            onClick={() => onTrain(trainerKey)}
            disabled={training}
            fullWidth
            color={trained ? 'primary' : 'success'}
            sx={{ borderRadius: 2 }}
          >
            {training ? 'Training...' : trained ? 'Retrain' : 'Train Now'}
          </Button>
        </CardActions>
      </Card>
    </Grow>
  );
};

// ============================================================================
// Chat Interface Component
// ============================================================================
const AIChatInterface = ({ sxHelper }) => {
  const muiTheme = useMuiTheme();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your AI financial assistant. Ask me anything about your spending, income, savings, budgets, or financial health.', suggestions: ['Show summary', 'Budget status', 'Spending this month', 'Financial health'] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await aiTrainingService.chat(userMsg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.text || 'I couldn\'t process that request.',
        suggestions: data.suggestions || [],
        intent: data.intent,
        confidence: data.confidence,
        processingTime: data.processingTime,
        chartData: data.data,
        chartType: data.chartType,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        suggestions: ['Help', 'Show summary'],
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleSuggestion = (suggestion) => {
    setInput(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <Paper elevation={0} sx={{
      height: 500,
      display: 'flex',
      flexDirection: 'column',
      ...sxHelper.cardSx,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{ p: 2, ...sxHelper.headerGradient, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon />
        <Typography variant="h6" fontWeight="bold">AI Financial Assistant</Typography>
        <Chip label="Local NLP" size="small" sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {messages.map((msg, i) => (
          <Fade in key={i}>
            <Box sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  maxWidth: '80%',
                  borderRadius: 2,
                  bgcolor: msg.role === 'user' ? 'primary.main' : (sxHelper.isBlack ? '#18181b' : 'background.default'),
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text?.replace(/\*\*(.*?)\*\*/g, '$1')}
                </Typography>
                {msg.confidence && (
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                    Intent: {msg.intent} • Confidence: {msg.confidence}% • {msg.processingTime}ms
                  </Typography>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {msg.suggestions.map((s, j) => (
                      <Chip key={j} label={s} size="small" variant="outlined" clickable onClick={() => handleSuggestion(s)} sx={{ fontSize: '0.75rem' }} />
                    ))}
                  </Box>
                )}
              </Paper>
            </Box>
          </Fade>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">Analyzing...</Typography>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth size="small" placeholder="Ask about your finances..."
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

// ============================================================================
// Model Registry Panel — connects to aiModelService
// ============================================================================
const ModelRegistryPanel = ({ sxHelper }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduler, setScheduler] = useState(null);
  const [toggling, setToggling] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, schedRes] = await Promise.allSettled([
        aiModelService.getDashboard(),
        aiModelService.getScheduler(),
      ]);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
      if (schedRes.status === 'fulfilled') setScheduler(schedRes.value.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const toggleScheduler = async () => {
    try {
      setToggling(true);
      if (scheduler?.isRunning) {
        await aiModelService.stopScheduler();
      } else {
        await aiModelService.startScheduler(30 * 60 * 1000);
      }
      await fetchDashboard();
    } catch { /* ignore */ } finally { setToggling(false); }
  };

  const handleTrainAll = async () => {
    try {
      setToggling(true);
      await aiModelService.trainAll();
      await fetchDashboard();
    } catch { /* ignore */ } finally { setToggling(false); }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[1,2,3].map(i => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 2, borderRadius: 2 }} />)}
      </Box>
    );
  }

  const models = dashboard?.models || {};
  const activeModels = models.activeModels || {};
  const system = dashboard?.system || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Registry Stats */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ ...sxHelper.sectionSx, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}><StorageIcon /></Avatar>
            <Typography variant="h4" fontWeight="bold" color="text.primary">{models.totalModels || 0}</Typography>
            <Typography variant="caption" color="text.secondary">Total Models</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ ...sxHelper.sectionSx, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}><CheckIcon /></Avatar>
            <Typography variant="h4" fontWeight="bold" color="text.primary">{models.productionModels || 0}</Typography>
            <Typography variant="caption" color="text.secondary">In Production</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ ...sxHelper.sectionSx, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}><DriftIcon /></Avatar>
            <Typography variant="h4" fontWeight="bold" color="text.primary">{models.driftWarnings || 0}</Typography>
            <Typography variant="caption" color="text.secondary">Drift Warnings</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ ...sxHelper.sectionSx, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}><MemoryIcon /></Avatar>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              {system.memoryUsage ? `${Math.round(system.memoryUsage.heapUsed / 1048576)}M` : '--'}
            </Typography>
            <Typography variant="caption" color="text.secondary">Heap Memory</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Scheduler Controls */}
      <Paper sx={sxHelper.sectionSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: scheduler?.isRunning ? 'success.main' : 'action.disabled' }}>
              <ScheduleIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                Auto-Training Scheduler
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {scheduler?.isRunning ? 'Running — models retrain automatically every 30 min' : 'Stopped — models only train on demand'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={scheduler?.isRunning ? 'outlined' : 'contained'}
              color={scheduler?.isRunning ? 'error' : 'success'}
              startIcon={toggling ? <CircularProgress size={16} /> : scheduler?.isRunning ? <StopIcon /> : <PlayIcon />}
              onClick={toggleScheduler}
              disabled={toggling}
              sx={{ borderRadius: 2 }}
            >
              {scheduler?.isRunning ? 'Stop' : 'Start'}
            </Button>
            <Button
              variant="outlined"
              startIcon={toggling ? <CircularProgress size={16} /> : <BoltIcon />}
              onClick={handleTrainAll}
              disabled={toggling}
              sx={{ borderRadius: 2 }}
            >
              Train All Now
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Active Models Table */}
      {Object.keys(activeModels).length > 0 && (
        <Paper sx={sxHelper.sectionSx}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DataIcon /> Active Model Registry
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Predictions</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Accuracy</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(activeModels).map(([name, model]) => (
                  <TableRow key={name} hover>
                    <TableCell sx={{ color: 'text.primary', fontWeight: 500 }}>{name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`v${model.version || '?'}`} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={model.status || 'unknown'}
                        color={model.status === 'production' ? 'success' : model.status === 'staging' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{model.metrics?.totalPredictions || 0}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {model.metrics?.accuracy ? `${(model.metrics.accuracy * 100).toFixed(1)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* System Info */}
      <Paper sx={sxHelper.sectionSx}>
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HealthIcon /> System Health
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">Uptime</Typography>
            <Typography variant="body2" fontWeight="bold" color="text.primary">
              {system.uptime ? `${Math.floor(system.uptime / 3600)}h ${Math.floor((system.uptime % 3600) / 60)}m` : '--'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">Node Version</Typography>
            <Typography variant="body2" fontWeight="bold" color="text.primary">{system.nodeVersion || '--'}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">RSS Memory</Typography>
            <Typography variant="body2" fontWeight="bold" color="text.primary">
              {system.memoryUsage ? `${Math.round(system.memoryUsage.rss / 1048576)} MB` : '--'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

// ============================================================================
// Main Dashboard — Tabbed
// ============================================================================
const AITrainingDashboard = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const sxHelper = useAccentSx();
  const [tab, setTab] = useState(0);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainingModel, setTrainingModel] = useState(null);
  const [trainingAll, setTrainingAll] = useState(false);
  const [trainResults, setTrainResults] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await aiTrainingService.getStatus();
      setModelStatus(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch model status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleTrainModel = async (modelName) => {
    try {
      setTrainingModel(modelName);
      const { data } = await aiTrainingService.trainModel(modelName);
      setTrainResults(prev => ({ ...prev, [modelName]: data }));
      await fetchStatus();
    } catch (err) {
      setError(`Training ${modelName} failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setTrainingModel(null);
    }
  };

  const handleTrainAll = async () => {
    try {
      setTrainingAll(true);
      setError(null);
      const { data } = await aiTrainingService.trainAll();
      setTrainResults(data.results);
      await fetchStatus();
    } catch (err) {
      setError(`Bulk training failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setTrainingAll(false);
    }
  };

  const trainedCount = modelStatus?.totalTrained || 0;
  const totalCount = modelStatus?.totalExpected || 10;
  const progress = totalCount > 0 ? Math.round((trainedCount / totalCount) * 100) : 0;

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ ...sxHelper.headerGradient, width: 48, height: 48 }}>
              <BrainIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                AI Training Center
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Self-training ML models • Enterprise Model Registry • Drift Detection
              </Typography>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ ...sxHelper.sectionSx, p: 0, mb: 3, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<TrainIcon />} label="Training" iconPosition="start" />
            <Tab icon={<StorageIcon />} label="Model Registry" iconPosition="start" />
            <Tab icon={<ChatIcon />} label="AI Chat" iconPosition="start" />
            <Tab icon={<SelfIcon />} label="Self-Training" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* ── Tab 0: Training ────────────────────────────── */}
        {tab === 0 && (
          <Fade in>
            <Box>
              {/* Status Overview */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={sxHelper.sectionSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}><StorageIcon /></Avatar>
                      <Box>
                        <Typography variant="h3" fontWeight="bold" color="text.primary">{trainedCount}/{totalCount}</Typography>
                        <Typography variant="caption" color="text.secondary">Models Trained</Typography>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, height: 8 }} color={progress === 100 ? 'success' : 'primary'} />
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={sxHelper.sectionSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}><ScheduleIcon /></Avatar>
                      <Box>
                        <Typography variant="h3" fontWeight="bold" color="text.primary">{modelStatus?.staleModels?.length || 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Models Need Retraining</Typography>
                      </Box>
                    </Box>
                    {modelStatus?.staleModels?.length > 0 && (
                      <Typography variant="caption" color="warning.main">{modelStatus.staleModels.join(', ')}</Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ ...sxHelper.sectionSx, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Button
                      variant="contained" size="large"
                      startIcon={trainingAll ? <CircularProgress size={20} color="inherit" /> : <AutoGraphIcon />}
                      onClick={handleTrainAll} disabled={trainingAll} fullWidth
                      sx={{ mb: 1, py: 1.5, borderRadius: 2 }}
                    >
                      {trainingAll ? 'Training All Models...' : 'Train All Models'}
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchStatus} disabled={loading} fullWidth sx={{ borderRadius: 2 }}>
                      Refresh Status
                    </Button>
                  </Paper>
                </Grid>
              </Grid>

              {/* Train Results */}
              {trainResults && (
                <Accordion sx={{ mb: 3, borderRadius: 2, '&:before': { display: 'none' }, ...sxHelper.cardSx }} elevation={0}>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                      <CheckIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Training Results
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Model</TableCell>
                            <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(trainResults).map(([name, result]) => (
                            <TableRow key={name} hover>
                              <TableCell sx={{ color: 'text.primary' }}>{name}</TableCell>
                              <TableCell>
                                <Chip size="small" label={result.success ? 'Success' : 'Failed'} color={result.success ? 'success' : 'error'} />
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>
                                {result.success ? (result.accuracy ? `Accuracy: ${result.accuracy}%` : result.message || 'OK') : (result.error || result.message || 'Error')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Model Cards Grid */}
              <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon /> ML Models
              </Typography>
              {loading ? (
                <Grid container spacing={2}>
                  {[1,2,3,4].map(i => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                      <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {(modelStatus?.models || []).map((model) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={model.name}>
                      <ModelCard model={model} onTrain={handleTrainModel} training={trainingModel === model.name} sx={sxHelper} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Fade>
        )}

        {/* ── Tab 1: Model Registry ──────────────────────── */}
        {tab === 1 && (
          <Fade in>
            <Box>
              <ModelRegistryPanel sxHelper={sxHelper} />
            </Box>
          </Fade>
        )}

        {/* ── Tab 2: AI Chat ─────────────────────────────── */}
        {tab === 2 && (
          <Fade in>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <AIChatInterface sxHelper={sxHelper} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={sxHelper.sectionSx}>
                  <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                    What You Can Ask
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      '💰 "How much did I spend this month?"',
                      '📊 "Show my spending breakdown"',
                      '💵 "What\'s my savings rate?"',
                      '📋 "Budget status"',
                      '🏦 "Show my EMIs"',
                      '📈 "Compare spending to last month"',
                      '🎯 "Goal progress"',
                      '⚠️ "Any unusual transactions?"',
                      '🏥 "Financial health score"',
                      '📱 "Monthly summary"',
                    ].map((q, i) => (
                      <Typography key={i} variant="body2" color="text.secondary">{q}</Typography>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">
                    All AI processing happens locally — your data never leaves the server.
                    Models learn from your financial patterns to provide personalized insights.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Fade>
        )}

        {/* ── Tab 3: Self-Training ───────────────────────── */}
        {tab === 3 && (
          <Fade in>
            <Box>
              <SelfTrainingPanel embedded={true} />
            </Box>
          </Fade>
        )}
      </Box>
    </MainLayout>
  );
};

export default AITrainingDashboard;
