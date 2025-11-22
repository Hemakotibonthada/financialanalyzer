import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Button, Grid, 
  ToggleButtonGroup, ToggleButton, Alert, CircularProgress
} from '@mui/material';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { Download, TrendingUp, TrendingDown } from '@mui/icons-material';
import { COLORS } from '../constants';

const MonthlyTrendsTab = ({ monthlyTrends, trendsMonths, setTrendsMonths, trendsLoading, onExport }) => {
  const [chartType, setChartType] = useState('line'); // line, bar, area
  const [dataView, setDataView] = useState('all'); // all, payments, outstanding

  if (trendsLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Ensure monthlyTrends is an array
  const trendsData = Array.isArray(monthlyTrends) ? monthlyTrends : [];

  if (trendsData.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography>No trend data available yet. Add EMIs to see trends!</Typography>
        </Alert>
      </Box>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate statistics
  const latestMonth = trendsData[trendsData.length - 1] || {};
  const previousMonth = trendsData[trendsData.length - 2] || {};
  
  const paymentChange = (latestMonth.totalPayments || 0) - (previousMonth.totalPayments || 0);
  const outstandingChange = (latestMonth.totalOutstanding || 0) - (previousMonth.totalOutstanding || 0);
  
  const avgMonthlyPayment = trendsData.reduce((sum, m) => sum + (m.totalPayments || 0), 0) / trendsData.length;
  const totalPaidSoFar = trendsData.reduce((sum, m) => sum + (m.totalPayments || 0), 0);

  const renderChart = () => {
    const commonProps = {
      data: trendsData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    const xAxisProps = {
      dataKey: "month",
      tick: { fontSize: 12 }
    };

    const yAxisProps = {
      tick: { fontSize: 12 },
      tickFormatter: (value) => `₹${(value / 1000).toFixed(0)}k`
    };

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Legend />
            {(dataView === 'all' || dataView === 'payments') && (
              <Line 
                type="monotone" 
                dataKey="totalPayments" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                dot={{ fill: COLORS.primary, r: 5 }}
                name="EMI Payments"
                activeDot={{ r: 7 }}
              />
            )}
            {(dataView === 'all' || dataView === 'outstanding') && (
              <Line 
                type="monotone" 
                dataKey="totalOutstanding" 
                stroke={COLORS.error} 
                strokeWidth={3}
                dot={{ fill: COLORS.error, r: 5 }}
                name="Outstanding Amount"
                activeDot={{ r: 7 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Legend />
            {(dataView === 'all' || dataView === 'payments') && (
              <Bar 
                dataKey="totalPayments" 
                fill={COLORS.primary} 
                name="EMI Payments"
                radius={[8, 8, 0, 0]}
              />
            )}
            {(dataView === 'all' || dataView === 'outstanding') && (
              <Bar 
                dataKey="totalOutstanding" 
                fill={COLORS.error} 
                name="Outstanding Amount"
                radius={[8, 8, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.error} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.error} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Legend />
            {(dataView === 'all' || dataView === 'payments') && (
              <Area 
                type="monotone" 
                dataKey="totalPayments" 
                stroke={COLORS.primary} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPayments)"
                name="EMI Payments"
              />
            )}
            {(dataView === 'all' || dataView === 'outstanding') && (
              <Area 
                type="monotone" 
                dataKey="totalOutstanding" 
                stroke={COLORS.error} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOutstanding)"
                name="Outstanding Amount"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" gutterBottom>Current Month Payment</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(latestMonth.totalPayments || 0)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {paymentChange >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                <Typography variant="caption">
                  {paymentChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(paymentChange))} vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" gutterBottom>Total Outstanding</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(latestMonth.totalOutstanding || 0)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {outstandingChange <= 0 ? <TrendingDown fontSize="small" /> : <TrendingUp fontSize="small" />}
                <Typography variant="caption">
                  {outstandingChange <= 0 ? '-' : '+'}{formatCurrency(Math.abs(outstandingChange))} vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" gutterBottom>Avg Monthly Payment</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(avgMonthlyPayment)}
              </Typography>
              <Typography variant="caption">
                Over {trendsData.length} months
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" gutterBottom>Total Paid</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(totalPaidSoFar)}
              </Typography>
              <Typography variant="caption">
                All time payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Period
                </Typography>
                <ToggleButtonGroup
                  value={trendsMonths}
                  exclusive
                  onChange={(e, val) => val && setTrendsMonths(val)}
                  size="small"
                >
                  <ToggleButton value={3}>3M</ToggleButton>
                  <ToggleButton value={6}>6M</ToggleButton>
                  <ToggleButton value={12}>12M</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Chart Type
                </Typography>
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={(e, val) => val && setChartType(val)}
                  size="small"
                >
                  <ToggleButton value="line">Line</ToggleButton>
                  <ToggleButton value="bar">Bar</ToggleButton>
                  <ToggleButton value="area">Area</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Data View
                </Typography>
                <ToggleButtonGroup
                  value={dataView}
                  exclusive
                  onChange={(e, val) => val && setDataView(val)}
                  size="small"
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="payments">Payments</ToggleButton>
                  <ToggleButton value="outstanding">Outstanding</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => onExport && onExport('trends')}
            >
              Export Data
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            EMI Payment Trends
          </Typography>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Monthly Breakdown
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Month</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Payments</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Outstanding</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Active EMIs</th>
                </tr>
              </thead>
              <tbody>
                {trendsData.map((month, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{month.month}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#667eea' }}>
                      {formatCurrency(month.totalPayments)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#f5576c' }}>
                      {formatCurrency(month.totalOutstanding)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {month.activeCount || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonthlyTrendsTab;
