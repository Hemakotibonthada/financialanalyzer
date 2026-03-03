// ============================================================================
// AI Training Dashboard — Enterprise ML Model Management
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Button, Chip, LinearProgress,
  Card, CardContent, CardActions, Alert, CircularProgress,
  Divider, IconButton, Tooltip as MuiTooltip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField,
  Accordion, AccordionSummary, AccordionDetails, Avatar, Badge,
  useTheme as useMuiTheme
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
  AutoGraph as AutoGraphIcon
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { aiTrainingService } from '../services/api';
import MainLayout from '../components/MainLayout';

// ============================================================================
// Model Card Component
// ============================================================================
const ModelCard = ({ model, onTrain, training }) => {
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
    <Card
      elevation={trained ? 2 : 1}
      sx={{
        border: `1px solid ${trained
          ? stale ? muiTheme.palette.warning.main : muiTheme.palette.success.main
          : muiTheme.palette.divider
        }`,
        transition: 'all 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: muiTheme.shadows[6] },
        bgcolor: 'background.paper',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{
            bgcolor: trained
              ? stale ? 'warning.main' : 'success.main'
              : 'action.disabled',
            width: 40, height: 40
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
        >
          {training ? 'Training...' : trained ? 'Retrain' : 'Train Now'}
        </Button>
      </CardActions>
    </Card>
  );
};

// ============================================================================
// Chat Interface Component
// ============================================================================
const AIChatInterface = () => {
  const muiTheme = useMuiTheme();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your AI financial assistant. Ask me anything about your spending, income, savings, budgets, or financial health.', suggestions: ['Show summary', 'Budget status', 'Spending this month', 'Financial health'] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
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
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        suggestions: ['Help', 'Show summary'],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    setInput(suggestion);
    setTimeout(() => {
      setInput(suggestion);
      handleSend();
    }, 100);
  };

  return (
    <Paper elevation={2} sx={{
      height: 500,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon />
        <Typography variant="h6">AI Financial Assistant</Typography>
        <Chip label="Local NLP" size="small" sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                maxWidth: '80%',
                borderRadius: 2,
                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.default',
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
                    <Chip
                      key={j}
                      label={s}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => handleSuggestion(s)}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">Analyzing...</Typography>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${muiTheme.palette.divider}`, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about your finances..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
// Main Dashboard
// ============================================================================
const AITrainingDashboard = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
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
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <BrainIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                AI Training Center
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Self-training ML models that learn from your financial data
              </Typography>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Status Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <StorageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h3" fontWeight="bold" color="text.primary">
                    {trainedCount}/{totalCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Models Trained
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ borderRadius: 2, height: 8 }}
                color={progress === 100 ? 'success' : 'primary'}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h3" fontWeight="bold" color="text.primary">
                    {modelStatus?.staleModels?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Models Need Retraining
                  </Typography>
                </Box>
              </Box>
              {modelStatus?.staleModels?.length > 0 && (
                <Typography variant="caption" color="warning.main">
                  {modelStatus.staleModels.join(', ')}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={trainingAll ? <CircularProgress size={20} color="inherit" /> : <AutoGraphIcon />}
                onClick={handleTrainAll}
                disabled={trainingAll}
                fullWidth
                sx={{ mb: 1, py: 1.5, borderRadius: 2 }}
              >
                {trainingAll ? 'Training All Models...' : 'Train All Models'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchStatus}
                disabled={loading}
                fullWidth
              >
                Refresh Status
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* Train Results */}
        {trainResults && (
          <Accordion sx={{ mb: 3, borderRadius: 2, '&:before': { display: 'none' } }} elevation={2}>
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
                      <TableRow key={name}>
                        <TableCell sx={{ color: 'text.primary' }}>{name}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={result.success ? 'Success' : 'Failed'}
                            color={result.success ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {result.success
                            ? result.accuracy ? `Accuracy: ${result.accuracy}%` : result.message || 'OK'
                            : result.error || result.message || 'Error'
                          }
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
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 2 }}>
          ML Models
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {(modelStatus?.models || []).map((model) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={model.name}>
                <ModelCard
                  model={model}
                  onTrain={handleTrainModel}
                  training={trainingModel === model.name}
                />
              </Grid>
            ))}
          </Grid>
        )}

        <Divider sx={{ my: 4 }} />

        {/* AI Chat */}
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 2 }}>
          <ChatIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          AI Financial Chat
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <AIChatInterface />
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
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
      </Box>
    </MainLayout>
  );
};

export default AITrainingDashboard;
