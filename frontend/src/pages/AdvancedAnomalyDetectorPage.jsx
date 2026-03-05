// ============================================================================
// ADVANCED ANOMALY DETECTOR PAGE — Multi-Algorithm Anomaly Detection UI
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, IconButton, Divider, List, ListItem, ListItemText,
  ListItemIcon, Accordion, AccordionSummary, AccordionDetails,
  Badge, ToggleButton, ToggleButtonGroup, Slider, FormControlLabel,
  Switch
} from '@mui/material';
import {
  Warning, Security, TrendingUp, Timeline, BubbleChart,
  ExpandMore, Refresh, CheckCircle, Error as ErrorIcon,
  Analytics, Assessment, ShowChart, Shield, Gavel,
  NotificationImportant, Speed, Visibility, CrisisAlert
} from '@mui/icons-material';
import { useAIAnomalies } from '../hooks/useAIFeatures';

// ============================================================================
// §1  ANOMALY SUMMARY CARDS
// ============================================================================

function AnomalySummaryCards({ data }) {
  if (!data?.summary) return null;

  const cards = [
    {
      title: 'Transactions Analyzed',
      value: data.summary.totalAnalyzed || 0,
      icon: <Analytics />,
      color: 'primary'
    },
    {
      title: 'Anomalies Found',
      value: data.summary.anomaliesFound || 0,
      icon: <Warning />,
      color: data.summary.anomaliesFound > 5 ? 'error' : data.summary.anomaliesFound > 0 ? 'warning' : 'success'
    },
    {
      title: 'Changepoints',
      value: data.summary.changepointsDetected || data.changepoints?.length || 0,
      icon: <Timeline />,
      color: 'info'
    },
    {
      title: 'Overall Risk',
      value: data.summary.overallRisk || 'Low',
      icon: <Shield />,
      color: data.summary.overallRisk === 'high' ? 'error' : data.summary.overallRisk === 'medium' ? 'warning' : 'success'
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, i) => (
        <Grid item xs={6} md={3} key={i}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                {React.cloneElement(card.icon, { color: card.color, sx: { fontSize: 32 } })}
              </Box>
              <Typography variant="h4" fontWeight="bold" color={`${card.color}.main`}>
                {card.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ============================================================================
// §2  ANOMALY DETAIL VIEW
// ============================================================================

function AnomalyDetailView({ anomalies }) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <Alert severity="success" icon={<CheckCircle />}>
        No anomalies detected in the analyzed period. Your transactions look normal!
      </Alert>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <CrisisAlert color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <NotificationImportant color="info" />;
      default: return <Visibility color="action" />;
    }
  };

  return (
    <Box>
      {anomalies.map((anomaly, i) => (
        <Accordion key={i} defaultExpanded={anomaly.severity === 'critical'}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
              {getSeverityIcon(anomaly.severity)}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  ₹{(anomaly.transaction?.amount || 0).toLocaleString()} — {anomaly.transaction?.category || 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {anomaly.transaction?.description || 'No description'} • {anomaly.transaction?.date ? new Date(anomaly.transaction.date).toLocaleDateString() : ''}
                </Typography>
              </Box>
              <Chip
                label={anomaly.severity}
                size="small"
                color={getSeverityColor(anomaly.severity)}
              />
              <Chip
                label={`Score: ${(anomaly.score || 0).toFixed(2)}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Detection Details</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  <Chip label={`Confidence: ${((anomaly.confidence || 0) * 100).toFixed(0)}%`} size="small" />
                  <Chip label={`${anomaly.agreement || 0}/${anomaly.detectors || 0} detectors agree`} size="small" variant="outlined" />
                </Box>
                {anomaly.explanation && (
                  <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                    <Typography variant="caption">{anomaly.explanation}</Typography>
                  </Alert>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Detection Reasons</Typography>
                {anomaly.reasons?.map((reason, j) => (
                  <Paper key={j} elevation={0} sx={{ p: 1, mb: 0.5, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" fontWeight="bold" color="primary">
                      {reason.detector}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {reason.reason}
                    </Typography>
                  </Paper>
                ))}
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

// ============================================================================
// §3  CHANGEPOINT VIEW
// ============================================================================

function ChangepointView({ changepoints }) {
  if (!changepoints || changepoints.length === 0) {
    return (
      <Alert severity="info">No significant spending changepoints detected in the analyzed period.</Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Spending Pattern Changes
      </Typography>
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell align="right"><strong>Before</strong></TableCell>
              <TableCell align="right"><strong>After</strong></TableCell>
              <TableCell align="right"><strong>Change</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changepoints.map((cp, i) => (
              <TableRow key={i}>
                <TableCell>{cp.date ? new Date(cp.date).toLocaleDateString() : `Point ${cp.index}`}</TableCell>
                <TableCell>
                  <Chip
                    label={cp.type || 'change'}
                    size="small"
                    color={cp.type === 'increase' ? 'error' : 'success'}
                  />
                </TableCell>
                <TableCell align="right">₹{Math.round(cp.leftMean || 0).toLocaleString()}</TableCell>
                <TableCell align="right">₹{Math.round(cp.rightMean || 0).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={cp.shift > 0 ? 'error.main' : 'success.main'}
                  >
                    {cp.shift > 0 ? '+' : ''}{Math.round(cp.shift).toLocaleString()}
                    {cp.shiftPercent ? ` (${cp.shiftPercent.toFixed(1)}%)` : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{cp.description || ''}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ============================================================================
// §4  CATEGORY ANOMALIES VIEW
// ============================================================================

function CategoryAnomaliesView({ categoryAnomalies }) {
  if (!categoryAnomalies || categoryAnomalies.length === 0) {
    return <Alert severity="success">All spending categories are within normal ranges.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Category Anomalies</Typography>
      <Grid container spacing={2}>
        {categoryAnomalies.map((ca, i) => (
          <Grid item xs={12} md={6} key={i}>
            <Paper elevation={1} sx={{
              p: 2,
              borderLeft: 4,
              borderColor: ca.type === 'unusually_high' ? 'error.main' : 'success.main'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                  {ca.category}
                </Typography>
                <Chip
                  label={ca.type === 'unusually_high' ? 'High' : 'Low'}
                  size="small"
                  color={ca.type === 'unusually_high' ? 'error' : 'success'}
                />
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Last amount: ₹{Math.round(ca.lastAmount).toLocaleString()} •
                Average: ₹{Math.round(ca.mean).toLocaleString()} •
                Deviation: {ca.deviation?.toFixed(1)}σ
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(Math.abs(ca.deviation || 0) / 5 * 100, 100)}
                sx={{
                  mt: 1, height: 6, borderRadius: 3,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: ca.type === 'unusually_high' ? 'error.main' : 'success.main'
                  }
                }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ============================================================================
// §5  TIME & VELOCITY ANOMALIES
// ============================================================================

function TimeAnomaliesView({ timeAnomalies, velocityAnomalies }) {
  return (
    <Box>
      {timeAnomalies?.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Time-Based Patterns</Typography>
          {timeAnomalies.map((ta, i) => (
            <Alert key={i} severity={ta.type === 'unusual_hours' ? 'warning' : 'info'} sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight="bold">{ta.detail}</Typography>
              <Typography variant="caption">Ratio: {(ta.ratio * 100).toFixed(1)}%</Typography>
            </Alert>
          ))}
        </Box>
      )}

      {velocityAnomalies?.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Spending Velocity Alerts</Typography>
          <TableContainer component={Paper} elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Amount</strong></TableCell>
                  <TableCell><strong>Hours Since Last</strong></TableCell>
                  <TableCell><strong>Velocity</strong></TableCell>
                  <TableCell><strong>Deviation</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {velocityAnomalies.slice(0, 10).map((va, i) => (
                  <TableRow key={i}>
                    <TableCell>₹{Math.round(va.amount).toLocaleString()}</TableCell>
                    <TableCell>{va.timeSinceLastHours?.toFixed(1)}h</TableCell>
                    <TableCell>₹{Math.round(va.velocity).toLocaleString()}/hr</TableCell>
                    <TableCell>
                      <Chip
                        label={`${va.deviation?.toFixed(1)}σ`}
                        size="small"
                        color={va.deviation > 3 ? 'error' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {(!timeAnomalies?.length && !velocityAnomalies?.length) && (
        <Alert severity="success">No timing or velocity anomalies detected.</Alert>
      )}
    </Box>
  );
}

// ============================================================================
// §6  MAIN PAGE COMPONENT
// ============================================================================

export default function AdvancedAnomalyDetectorPage() {
  const [days, setDays] = useState(90);
  const [activeTab, setActiveTab] = useState(0);
  const { anomalies: data, loading, error, fetchAnomalies } = useAIAnomalies(days);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="primary" />
            Advanced Anomaly Detection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-algorithm detection: Isolation Forest, LOF, SPC, Autoencoders, and Ensemble methods
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={days}
            exclusive
            onChange={(_, v) => v && setDays(v)}
            size="small"
          >
            <ToggleButton value={30}>30d</ToggleButton>
            <ToggleButton value={90}>90d</ToggleButton>
            <ToggleButton value={180}>180d</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
            onClick={fetchAnomalies}
            disabled={loading}
          >
            Scan
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Running multi-algorithm anomaly detection...
          </Typography>
          <LinearProgress sx={{ mt: 2, maxWidth: 400, mx: 'auto' }} />
        </Box>
      )}

      {data && !loading && (
        <>
          <AnomalySummaryCards data={data} />

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab icon={<Warning />} label={`Anomalies (${data.anomalies?.length || 0})`} />
            <Tab icon={<Timeline />} label={`Changepoints (${data.changepoints?.length || 0})`} />
            <Tab icon={<BubbleChart />} label={`Categories (${data.categoryAnomalies?.length || 0})`} />
            <Tab icon={<Speed />} label="Timing & Velocity" />
          </Tabs>

          {activeTab === 0 && <AnomalyDetailView anomalies={data.anomalies} />}
          {activeTab === 1 && <ChangepointView changepoints={data.changepoints} />}
          {activeTab === 2 && <CategoryAnomaliesView categoryAnomalies={data.categoryAnomalies} />}
          {activeTab === 3 && (
            <TimeAnomaliesView
              timeAnomalies={data.timeAnomalies}
              velocityAnomalies={data.velocityAnomalies}
            />
          )}
        </>
      )}
    </Box>
  );
}
