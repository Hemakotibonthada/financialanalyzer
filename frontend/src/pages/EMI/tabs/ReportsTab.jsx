import React from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton, Alert
} from '@mui/material';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { COLORS } from '../constants';

const ReportsTab = ({ chartData, selectedPeriod, setSelectedPeriod }) => {
  if (!chartData || (!chartData.providerDistribution?.length && !chartData.categoryDistribution?.length)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography>No data available for reports. Add EMIs to see analytics!</Typography>
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

  const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.error, '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Period Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={selectedPeriod}
          exclusive
          onChange={(e, val) => val && setSelectedPeriod(val)}
          size="small"
        >
          <ToggleButton value={3}>Last 3 Months</ToggleButton>
          <ToggleButton value={6}>Last 6 Months</ToggleButton>
          <ToggleButton value={12}>Last 12 Months</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* Provider Distribution */}
        {chartData.providerDistribution && chartData.providerDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Provider Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.providerDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.providerDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Category Distribution */}
        {chartData.categoryDistribution && chartData.categoryDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Category Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Repayment Schedule Radar */}
        {chartData.repaymentSchedule && chartData.repaymentSchedule.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Repayment Schedule Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={chartData.repaymentSchedule}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="month" />
                    <PolarRadiusAxis />
                    <Radar name="EMI Amount" dataKey="amount" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Monthly Payment Bar Chart */}
        {chartData.monthlyPayments && chartData.monthlyPayments.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Monthly Payment Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.monthlyPayments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="amount" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ReportsTab;
