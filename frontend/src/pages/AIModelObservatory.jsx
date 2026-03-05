// ============================================================================
// AI MODEL OBSERVATORY — Model Monitoring, AutoML & Explainability Dashboard
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, List, ListItem, ListItemText, ListItemIcon,
  Divider, TextField, Select, MenuItem, FormControl, InputLabel,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Speed, Science, Gavel, Memory, Warning, CheckCircle,
  Error as ErrorIcon, ExpandMore, Refresh, PlayArrow,
  ModelTraining, Analytics, Assessment, Timeline, BubbleChart,
  AutoAwesome, TrendingUp, BarChart, Info, Delete
} from '@mui/icons-material';
import {
  useAIMonitoring, useAutoML, useWhatIfAnalysis, useKnowledgeGraph
} from '../../hooks/useAIFeatures';

// ============================================================================
// §1  MODEL MONITORING TAB
// ============================================================================

function ModelMonitoringTab() {
  const { dashboard, alerts, loading, fetchDashboard, fetchAlerts, ackAlert } = useAIMonitoring();

  useEffect(() => {
    fetchDashboard();
    fetchAlerts();
  }, [fetchDashboard, fetchAlerts]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {dashboard?.summary?.totalModels || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Models</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {dashboard?.summary?.healthyModels || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Healthy</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="warning.main" fontWeight="bold">
                {dashboard?.summary?.degradedModels || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Degraded</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="error.main" fontWeight="bold">
                {dashboard?.summary?.totalAlerts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Active Alerts</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Model Details */}
      {dashboard?.models && Object.entries(dashboard.models).map(([modelId, model]) => (
        <Accordion key={modelId} defaultExpanded={model.performance?.status !== 'healthy'}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 2 }}>
              <Chip
                size="small"
                label={model.performance?.status || 'unknown'}
                color={getStatusColor(model.performance?.status)}
              />
              <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                {modelId.replace(/_/g, ' ')}
              </Typography>
              {model.performance && (
                <Typography variant="body2" color="text.secondary">
                  Accuracy: {((model.performance.accuracy || 0) * 100).toFixed(1)}% |
                  Latency: {Math.round(model.performance.avgLatency || 0)}ms |
                  Predictions: {model.performance.totalPredictions || 0}
                </Typography>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {model.performance && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Performance</Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">Accuracy</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(model.performance.accuracy || 0) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={model.performance.accuracy > 0.8 ? 'success' : 'warning'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    P95 Latency: {Math.round(model.performance.p95Latency || 0)}ms |
                    Error Rate: {((model.performance.errorRate || 0) * 100).toFixed(2)}%
                  </Typography>
                </Grid>
              )}
              {model.dataDrift && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Data Drift</Typography>
                  <Chip
                    label={model.dataDrift.driftDetected ? 'Drift Detected' : 'No Drift'}
                    color={model.dataDrift.driftDetected ? 'warning' : 'success'}
                    size="small"
                  />
                  {model.dataDrift.severity && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Severity: {model.dataDrift.severity} | Score: {(model.dataDrift.score || 0).toFixed(3)}
                    </Typography>
                  )}
                  {model.dataDrift.recommendation && (
                    <Typography variant="caption" color="primary" display="block">
                      {model.dataDrift.recommendation}
                    </Typography>
                  )}
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Active Alerts</Typography>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.severity === 'critical' ? 'error' : 'warning'}
              sx={{ mb: 1 }}
              action={
                <IconButton size="small" onClick={() => ackAlert(alert.id)}>
                  <CheckCircle fontSize="small" />
                </IconButton>
              }
            >
              <strong>{alert.modelId}:</strong> {alert.message}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// §2  AutoML TAB
// ============================================================================

function AutoMLTab() {
  const { pipelineResult, history, loading, error, runPipeline, fetchHistory } = useAutoML();
  const [task, setTask] = useState('forecast');

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <Science color="primary" /> Run AutoML
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Task</InputLabel>
                <Select value={task} onChange={(e) => setTask(e.target.value)} label="Task">
                  <MenuItem value="forecast">Spending Forecast</MenuItem>
                  <MenuItem value="categorize">Transaction Categorization</MenuItem>
                  <MenuItem value="anomaly">Anomaly Detection</MenuItem>
                </Select>
              </FormControl>

              <Button
                fullWidth variant="contained"
                onClick={() => runPipeline(task)}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
              >
                {loading ? 'Running Pipeline...' : 'Run AutoML'}
              </Button>

              {loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Training and evaluating multiple models...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {pipelineResult && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Pipeline Results
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Best: ${pipelineResult.bestModel}`} color="primary" />
                  <Chip label={`Score: ${(pipelineResult.bestScore || 0).toFixed(3)}`} color="success" />
                  <Chip label={`${pipelineResult.samplesUsed} samples`} variant="outlined" />
                  <Chip label={`${pipelineResult.featuresUsed} features`} variant="outlined" />
                  <Chip label={`${pipelineResult.duration}ms`} variant="outlined" />
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Model</strong></TableCell>
                        <TableCell align="right"><strong>Score</strong></TableCell>
                        <TableCell align="right"><strong>Std Dev</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pipelineResult.allModels?.map((model, i) => (
                        <TableRow key={i} sx={{ bgcolor: i === 0 ? 'action.selected' : 'inherit' }}>
                          <TableCell>
                            {i === 0 && <AutoAwesome sx={{ fontSize: 14, mr: 0.5, color: 'warning.main' }} />}
                            {model.name}
                          </TableCell>
                          <TableCell align="right">{(model.score || 0).toFixed(4)}</TableCell>
                          <TableCell align="right">{(model.stdScore || 0).toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {pipelineResult.forecast && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Forecast</Typography>
                    {pipelineResult.forecast.map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2">Week {f.week || i + 1}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          ₹{Math.round(f.predicted).toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {history.length > 0 && (
            <Card elevation={2} sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  Pipeline History ({history.length} runs)
                </Typography>
                {history.slice(-5).reverse().map((run, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="caption">
                      {run.task} | {run.bestModel} | Score: {run.bestScore?.toFixed(3)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(run.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §3  WHAT-IF ANALYSIS TAB
// ============================================================================

function WhatIfTab() {
  const { result, loading, error, analyze } = useWhatIfAnalysis();
  const [scenarioType, setScenarioType] = useState('increase_expense');
  const [params, setParams] = useState({ category: 'food', amount: 5000 });

  const handleAnalyze = () => {
    analyze({ type: scenarioType, ...params });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                What-If Scenario
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Scenario Type</InputLabel>
                <Select value={scenarioType} onChange={(e) => setScenarioType(e.target.value)} label="Scenario Type">
                  <MenuItem value="increase_expense">Increase Expense</MenuItem>
                  <MenuItem value="take_loan">Take New Loan</MenuItem>
                  <MenuItem value="increase_income">Income Change</MenuItem>
                </Select>
              </FormControl>

              {scenarioType === 'increase_expense' && (
                <>
                  <TextField
                    fullWidth size="small" label="Category"
                    value={params.category}
                    onChange={(e) => setParams(p => ({ ...p, category: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth size="small" label="Amount" type="number"
                    value={params.amount}
                    onChange={(e) => setParams(p => ({ ...p, amount: Number(e.target.value) }))}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {scenarioType === 'take_loan' && (
                <>
                  <TextField
                    fullWidth size="small" label="Loan Amount" type="number"
                    value={params.amount || 500000}
                    onChange={(e) => setParams(p => ({ ...p, amount: Number(e.target.value) }))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth size="small" label="Interest Rate (%)" type="number"
                    value={(params.rate || 0.12) * 100}
                    onChange={(e) => setParams(p => ({ ...p, rate: Number(e.target.value) / 100 }))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth size="small" label="Tenure (years)" type="number"
                    value={params.tenure || 5}
                    onChange={(e) => setParams(p => ({ ...p, tenure: Number(e.target.value) }))}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <Button
                fullWidth variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
              >
                Analyze Scenario
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {result ? (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Impact Analysis
                </Typography>

                {result.impacts?.map((impact, i) => (
                  <Alert
                    key={i}
                    severity={impact.severity === 'high' ? 'warning' : 'info'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2"><strong>{impact.area}:</strong> {impact.impact}</Typography>
                    {impact.totalPayment && (
                      <Typography variant="caption" display="block">
                        Total Payment: ₹{impact.totalPayment.toLocaleString()} |
                        Total Interest: ₹{impact.totalInterest.toLocaleString()}
                      </Typography>
                    )}
                  </Alert>
                ))}

                {result.recommendations?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Recommendations</Typography>
                    {result.recommendations.map((rec, i) => (
                      <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : !loading && (
            <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <BubbleChart sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>What-If Analysis</Typography>
              <Typography variant="body2" color="text.secondary">
                Simulate financial scenarios using the knowledge graph to understand potential impacts before making decisions.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §4  KNOWLEDGE GRAPH TAB
// ============================================================================

function KnowledgeGraphTab() {
  const { graphData, queryResult, loading, error, fetchGraph, query } = useKnowledgeGraph();
  const [question, setQuestion] = useState('');

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const handleQuery = () => {
    if (question.trim()) query(question);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Query Knowledge Graph
              </Typography>

              <TextField
                fullWidth multiline rows={2} size="small"
                placeholder="Ask about your finances... e.g., 'How much do I spend on food?'"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth variant="contained"
                onClick={handleQuery}
                disabled={loading || !question.trim()}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
              >
                Query Graph
              </Button>
            </CardContent>
          </Card>

          {graphData && (
            <Card elevation={2} sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Graph Statistics</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`${graphData.stats?.nodeCount || 0} Nodes`} size="small" />
                  <Chip label={`${graphData.stats?.edgeCount || 0} Edges`} size="small" />
                  <Chip label={`Avg Degree: ${(graphData.stats?.avgDegree || 0).toFixed(1)}`} size="small" />
                </Box>

                {graphData.communities?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight="bold">
                      {graphData.communities.length} communities detected
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={7}>
          {queryResult && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Answer
                </Typography>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, mb: 2 }}>
                  <Typography variant="body1">{queryResult.answer}</Typography>
                </Paper>

                {queryResult.confidence !== undefined && (
                  <Chip
                    label={`Confidence: ${(queryResult.confidence * 100).toFixed(0)}%`}
                    color={queryResult.confidence > 0.7 ? 'success' : 'default'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                )}

                {queryResult.reasoning && (
                  <Alert severity="info" sx={{ mb: 2 }} icon={<Info />}>
                    <Typography variant="caption">{queryResult.reasoning}</Typography>
                  </Alert>
                )}

                {queryResult.data && Object.keys(queryResult.data).length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="body2">Detailed Data</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 300 }}>
                        {JSON.stringify(queryResult.data, null, 2)}
                      </pre>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {graphData?.recommendations?.length > 0 && (
            <Card elevation={2} sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  Graph-Based Recommendations
                </Typography>
                {graphData.recommendations.map((rec, i) => (
                  <Alert
                    key={i}
                    severity={rec.priority === 'high' ? 'warning' : 'info'}
                    sx={{ mb: 1, py: 0 }}
                  >
                    <Typography variant="caption">{rec.message}</Typography>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// §5  MAIN PAGE
// ============================================================================

export default function AIModelObservatory() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Memory color="primary" />
          AI Model Observatory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor AI models, run AutoML pipelines, explore knowledge graphs, and perform what-if analysis
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<Speed />} label="Monitoring" />
        <Tab icon={<Science />} label="AutoML" />
        <Tab icon={<BubbleChart />} label="Knowledge Graph" />
        <Tab icon={<Assessment />} label="What-If" />
      </Tabs>

      {activeTab === 0 && <ModelMonitoringTab />}
      {activeTab === 1 && <AutoMLTab />}
      {activeTab === 2 && <KnowledgeGraphTab />}
      {activeTab === 3 && <WhatIfTab />}
    </Box>
  );
}
