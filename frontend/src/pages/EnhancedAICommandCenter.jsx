// ============================================================================
// AI COMMAND CENTER — Enhanced Dashboard with All AI Features
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, CardActions,
  Button, Chip, CircularProgress, LinearProgress, Alert, Tabs, Tab,
  IconButton, Tooltip, Divider, List, ListItem, ListItemText,
  ListItemIcon, Avatar, Badge, Collapse, TextField
} from '@mui/material';
import {
  Psychology, TrendingUp, Warning, Security, Speed, SmartToy,
  BarChart, BubbleChart, Timeline, Memory, AutoAwesome, Insights,
  ExpandMore, ExpandLess, Refresh, CheckCircle, Error as ErrorIcon,
  Science, AccountTree, ModelTraining, Analytics, Assessment,
  Lightbulb, Shield, ShowChart, PieChart, Gavel
} from '@mui/icons-material';
import {
  useAIHealthScore, useAIAnomalies, useAIInsights,
  useAIPredictions, useAIMonitoring, useComprehensiveAnalysis
} from '../../hooks/useAIFeatures';

// ============================================================================
// §1  HEALTH SCORE CARD
// ============================================================================

function HealthScoreCard() {
  const { healthData, loading, fetchHealthScore } = useAIHealthScore();

  useEffect(() => { fetchHealthScore(); }, [fetchHealthScore]);

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#f44336';
    return '#d32f2f';
  };

  return (
    <Card elevation={3} sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">Financial Health</Typography>
          </Box>
          <IconButton size="small" onClick={fetchHealthScore} disabled={loading}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
        ) : healthData ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={healthData.overallScore}
                  size={120}
                  thickness={6}
                  sx={{ color: getScoreColor(healthData.overallScore) }}
                />
                <Box sx={{
                  top: 0, left: 0, bottom: 0, right: 0, position: 'absolute',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <Typography variant="h3" fontWeight="bold" color={getScoreColor(healthData.overallScore)}>
                    {healthData.overallScore}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">/100</Typography>
                </Box>
              </Box>
            </Box>

            <Chip
              label={healthData.rating}
              color={healthData.overallScore >= 80 ? 'success' : healthData.overallScore >= 60 ? 'warning' : 'error'}
              sx={{ display: 'flex', mb: 2 }}
            />

            {healthData.breakdown && Object.entries(healthData.breakdown).slice(0, 5).map(([key, value]) => (
              <Box key={key} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">{Math.round(value)}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(value, 100)}
                  sx={{
                    height: 6, borderRadius: 3,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(value),
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            ))}
          </>
        ) : (
          <Typography color="text.secondary" align="center">Click refresh to load</Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// §2  ANOMALY DETECTION CARD
// ============================================================================

function AnomalyCard() {
  const { anomalies, loading, fetchAnomalies } = useAIAnomalies(90);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={anomalies?.summary?.anomaliesFound || 0} color="error">
              <Warning sx={{ color: 'warning.main' }} />
            </Badge>
            <Typography variant="h6" fontWeight="bold">Anomalies</Typography>
          </Box>
          <IconButton size="small" onClick={fetchAnomalies} disabled={loading}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
        ) : anomalies ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<Analytics />}
                label={`${anomalies.summary?.totalAnalyzed || 0} Analyzed`}
                size="small"
              />
              <Chip
                icon={<Warning />}
                label={`${anomalies.summary?.anomaliesFound || 0} Found`}
                size="small"
                color={anomalies.summary?.anomaliesFound > 0 ? 'warning' : 'success'}
              />
              <Chip
                label={`Risk: ${anomalies.summary?.overallRisk || 'Low'}`}
                size="small"
                color={anomalies.summary?.overallRisk === 'high' ? 'error' : anomalies.summary?.overallRisk === 'medium' ? 'warning' : 'success'}
              />
            </Box>

            {anomalies.anomalies?.slice(0, expanded ? 10 : 3).map((anomaly, i) => (
              <Paper key={i} elevation={1} sx={{ p: 1.5, mb: 1, borderLeft: 3, borderColor: `${getSeverityColor(anomaly.severity)}.main` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="bold">
                    ₹{(anomaly.transaction?.amount || 0).toLocaleString()}
                  </Typography>
                  <Chip label={anomaly.severity} size="small" color={getSeverityColor(anomaly.severity)} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {anomaly.transaction?.description || anomaly.transaction?.category || 'Unknown'}
                </Typography>
                {anomaly.explanation && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                    {anomaly.explanation.substring(0, 120)}...
                  </Typography>
                )}
              </Paper>
            ))}

            {anomalies.anomalies?.length > 3 && (
              <Button
                size="small"
                onClick={() => setExpanded(!expanded)}
                endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              >
                {expanded ? 'Show Less' : `Show ${anomalies.anomalies.length - 3} More`}
              </Button>
            )}
          </>
        ) : (
          <Typography color="text.secondary" align="center">No data available</Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// §3  AI INSIGHTS CARD
// ============================================================================

function InsightsCard() {
  const { insights, loading, fetchInsights } = useAIInsights();

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'warning': return <Warning color="warning" />;
      case 'positive': return <CheckCircle color="success" />;
      case 'info': return <Insights color="info" />;
      default: return <Lightbulb color="primary" />;
    }
  };

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lightbulb sx={{ color: 'info.main' }} />
            <Typography variant="h6" fontWeight="bold">AI Insights</Typography>
          </Box>
          <Chip label={`${insights?.totalInsights || 0} insights`} size="small" color="primary" />
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
        ) : insights?.insights?.length > 0 ? (
          <List dense>
            {insights.insights.slice(0, 5).map((insight, i) => (
              <ListItem key={i} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getSeverityIcon(insight.severity)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="bold">{insight.title}</Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="caption">{insight.message}</Typography>
                      {insight.actionable && insight.action && (
                        <Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.5 }}>
                          💡 {insight.action}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" align="center">No insights yet</Typography>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={fetchInsights} startIcon={<Refresh />}>Refresh</Button>
      </CardActions>
    </Card>
  );
}

// ============================================================================
// §4  PREDICTIONS CARD
// ============================================================================

function PredictionsCard() {
  const { predictions, loading, fetchPredictions } = useAIPredictions(4);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChart sx={{ color: 'secondary.main' }} />
            <Typography variant="h6" fontWeight="bold">Spending Forecast</Typography>
          </Box>
          <IconButton size="small" onClick={fetchPredictions} disabled={loading}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
        ) : predictions?.forecast?.length > 0 ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Model: {predictions.bestModel || 'AutoML'}
              </Typography>
            </Box>
            {predictions.forecast.map((pred, i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Week {pred.week || i + 1}</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    ₹{Math.round(pred.predicted).toLocaleString()}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((pred.predicted / (predictions.historicalAvg * 1.5 || 50000)) * 100, 100)}
                  sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                  color={pred.predicted > (predictions.historicalAvg || 0) * 1.2 ? 'warning' : 'primary'}
                />
                {pred.explanation && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {pred.explanation.substring(0, 100)}
                  </Typography>
                )}
              </Box>
            ))}

            {predictions.historicalAvg > 0 && (
              <Divider sx={{ my: 1 }} />
            )}
            {predictions.historicalAvg > 0 && (
              <Typography variant="body2" color="text.secondary">
                Historical average: ₹{Math.round(predictions.historicalAvg).toLocaleString()}/week
              </Typography>
            )}
          </>
        ) : predictions?.error ? (
          <Alert severity="info">{predictions.error}</Alert>
        ) : (
          <Typography color="text.secondary" align="center">Need more data for predictions</Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// §5  AI SYSTEM STATUS CARD
// ============================================================================

function AIStatusCard() {
  const { dashboard, alerts, loading, fetchDashboard, fetchAlerts } = useAIMonitoring();

  useEffect(() => {
    fetchDashboard();
    fetchAlerts();
  }, [fetchDashboard, fetchAlerts]);

  const moduleIcons = {
    reinforcementLearning: <Psychology />,
    anomalyDetection: <Security />,
    knowledgeGraph: <AccountTree />,
    autoML: <Science />,
    explainableAI: <Gavel />,
    conversationalAI: <SmartToy />,
    modelMonitoring: <Speed />
  };

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Memory sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">AI System Status</Typography>
          </Box>
          <Chip label="v3.0" size="small" color="primary" variant="outlined" />
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
        ) : dashboard ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircle />}
                label={`${dashboard.summary?.healthyModels || 0} Healthy`}
                size="small"
                color="success"
              />
              {dashboard.summary?.degradedModels > 0 && (
                <Chip
                  icon={<Warning />}
                  label={`${dashboard.summary.degradedModels} Degraded`}
                  size="small"
                  color="warning"
                />
              )}
              {dashboard.summary?.totalAlerts > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${dashboard.summary.totalAlerts} Alerts`}
                  size="small"
                  color="error"
                />
              )}
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Active Modules</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {Object.entries(moduleIcons).map(([module, icon]) => (
                <Tooltip key={module} title={module.replace(/([A-Z])/g, ' $1').trim()}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                    {React.cloneElement(icon, { sx: { fontSize: 18 } })}
                  </Avatar>
                </Tooltip>
              ))}
            </Box>

            {alerts.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error.main">Recent Alerts</Typography>
                {alerts.slice(0, 3).map((alert, i) => (
                  <Alert key={i} severity={alert.severity === 'critical' ? 'error' : 'warning'} sx={{ mt: 0.5, py: 0 }}>
                    <Typography variant="caption">{alert.message}</Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Chip icon={<CheckCircle />} label="All Systems Operational" color="success" />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// §6  MAIN COMMAND CENTER COMPONENT
// ============================================================================

export default function EnhancedAICommandCenter() {
  const [activeTab, setActiveTab] = useState(0);
  const { analysis, loading: analysisLoading, runAnalysis } = useComprehensiveAnalysis();

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome sx={{ color: 'primary.main' }} />
            AI Command Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Powered by local ML — Reinforcement Learning, Neural Networks, NLP & Knowledge Graphs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={analysisLoading ? <CircularProgress size={16} /> : <Science />}
            onClick={() => runAnalysis()}
            disabled={analysisLoading}
          >
            Run Full Analysis
          </Button>
        </Box>
      </Box>

      {/* Analysis Summary */}
      {analysis && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<Psychology />}>
          <Typography variant="body2">{analysis.summary}</Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<BarChart />} label="Overview" />
        <Tab icon={<Warning />} label="Anomalies" />
        <Tab icon={<Lightbulb />} label="Insights" />
        <Tab icon={<ShowChart />} label="Predictions" />
        <Tab icon={<Memory />} label="System" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <HealthScoreCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnomalyCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <InsightsCard />
          </Grid>
          <Grid item xs={12} md={6}>
            <PredictionsCard />
          </Grid>
          <Grid item xs={12} md={6}>
            <AIStatusCard />
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <AnomalyCard />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <InsightsCard />
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <PredictionsCard />
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <AIStatusCard />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
