import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Alert } from '@mui/material';
import { PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import EMIMonthlyTrends from '../../../components/EMIMonthlyTrends';
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

const OverviewTab = ({ chartData, upcomingPayments }) => {
  const chartCardHoverEffect = {
    transition: 'all 0.3s ease',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 6,
      borderColor: 'primary.main'
    }
  };

  if (!chartData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Loading chart data...</Alert>
      </Box>
    );
  }

  return (
    <Grid container spacing={3} direction="column">
      {/* Pie Chart - Distribution by Provider */}
      <Grid item xs={12}>
        <Card elevation={0} sx={chartCardHoverEffect}>
          <CardContent>
            <Box sx={{ pb: 2, mb: 3, borderBottom: '2px solid', borderColor: 'divider' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 2, p: 1, display: 'flex' }}>
                  <PieChartIcon className="w-6 h-6" style={{ color: 'white' }} />
                </Box>
                EMI Distribution by Card Provider
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                Breakdown of outstanding amounts across different card providers
              </Typography>
            </Box>
            {(!chartData.pieChart || chartData.pieChart.length === 0) ? (
              <Box sx={{ p: 4 }}>
                <Alert severity="info">No distribution data available</Alert>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={chartData.pieChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={140}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {chartData.pieChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: 'none' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Radar Chart */}
      {chartData.pieChart && chartData.pieChart.length > 0 && chartData.pieChart.length <= 8 && (
        <Grid item xs={12}>
          <Card elevation={3} sx={chartCardHoverEffect}>
            <CardContent>
              <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🕸️ Card Provider 360° Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart data={chartData.pieChart}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                  <Radar name="Outstanding Amount" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* EMI Monthly Trends */}
      {upcomingPayments && upcomingPayments.monthlyBreakdown && upcomingPayments.monthlyBreakdown.length > 0 && (
        <Grid item xs={12}>
          <EMIMonthlyTrends monthlyData={upcomingPayments.monthlyBreakdown} />
        </Grid>
      )}
    </Grid>
  );
};

export default OverviewTab;
