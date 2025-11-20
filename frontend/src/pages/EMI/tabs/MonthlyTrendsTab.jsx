import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Alert } from '@mui/material';
import { ComposedChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';

const MonthlyTrendsTab = ({ monthlyTrendsData }) => {
  if (!monthlyTrendsData || !monthlyTrendsData.monthlyTrends) {
    return <Box sx={{ p: 3 }}><Alert severity="info">No trends data available</Alert></Box>;
  }

  const { monthlyTrends, summary, analysis } = monthlyTrendsData;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Monthly Trends</Typography>
        <Typography variant="body2" color="text.secondary">Income and spending over time</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: '#d4f4dd', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>💵 Avg Monthly Income</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>₹{Math.round(summary?.avgMonthlyIncome || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: '#fde8e8', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>📅 Avg Monthly Spending</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#c62828' }}>₹{Math.round(summary?.avgMonthlySpendings || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: '#f0e6f6', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>📊 Total Investments</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#6a1b9a' }}>₹{Math.round(summary?.totalInvestments || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: '#e3f2fd', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>🐷 Avg Savings Rate</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565c0' }}>{Math.abs(summary?.avgSavingsRate || 0).toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
              <RechartsTooltip formatter={(value, name) => [formatCurrency(value), name]} />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Area type="monotone" dataKey="income" stroke="#4caf50" fill="#4caf5030" name="Income" />
              <Area type="monotone" dataKey="spendings" stroke="#f44336" fill="#f4433630" name="Spending" />
              <Area type="monotone" dataKey="investments" stroke="#9c27b0" fill="#9c27b030" name="Investments" />
              <Line type="monotone" dataKey="netSavings" stroke="#2196f3" strokeWidth={2} strokeDasharray="5 5" name="Net Savings" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonthlyTrendsTab;
