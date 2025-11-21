import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Alert } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import EMIMonthlyTrends from '../../../components/EMIMonthlyTrends';
import { COLORS, chartCardHoverEffect } from '../constants';
import { formatCurrency } from '../utils/formatters';

const OverviewTab = ({ chartData, upcomingPayments }) => {
  if (!chartData) return null;

  // Debug logging
  console.log('OverviewTab - chartData:', chartData);
  
  // The API returns providerDistribution, not pieChart
  // Extract the data array from providerDistribution
  const providerData = chartData.providerDistribution?.data || chartData.pieChart || [];
  
  console.log('OverviewTab - providerData:', providerData);
  console.log('OverviewTab - is array?', Array.isArray(providerData));

  // Ensure pieChart is an array
  const pieChartData = Array.isArray(providerData) ? providerData : [];

  return (
    <Grid container spacing={3} direction="column">
      {/* Pie Chart - Distribution by Provider */}
      <Grid item xs={12}>
        <Card elevation={0} sx={chartCardHoverEffect}>
          <CardContent>
            <Box 
              className="chart-header"
              sx={{ 
                pb: 2, 
                mb: 3, 
                borderBottom: '2px solid',
                borderColor: 'divider',
                transition: 'border-color 0.3s ease'
              }}
            >
              <Typography 
                variant="h5" 
                className="chart-title"
                sx={{ 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.3s ease'
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ color: 'white', fontSize: '24px' }}>📊</span>
                </Box>
                EMI Distribution by Card Provider
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                Breakdown of outstanding amounts across different card providers
              </Typography>
            </Box>
            {pieChartData.length === 0 ? (
              <Box sx={{ p: 4 }}>
                <Alert severity="info">No distribution data available to render this chart. If you're on a remote device, please ensure the backend is reachable (calls should go to your laptop IP) and reload.</Alert>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name || 'Unknown'} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={140}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="provider"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: 12, 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: 'none'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Radar Chart - Card Provider Analysis */}
      {pieChartData.length > 0 && pieChartData.length <= 8 && (
        <Grid item xs={12}>
          <Card elevation={3} sx={chartCardHoverEffect}>
            <CardContent>
              <Typography variant="h5" gutterBottom fontWeight="bold" className="chart-title" sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.3s ease'
              }}>
                🕸️ Card Provider 360° Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart data={pieChartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="provider" />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                  <Radar name="Outstanding Amount" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* EMI Monthly Trends Chart */}
      {upcomingPayments && Array.isArray(upcomingPayments.monthlyBreakdown) && upcomingPayments.monthlyBreakdown.length > 0 && (
        <Grid item xs={12}>
          <EMIMonthlyTrends monthlyData={upcomingPayments.monthlyBreakdown} />
        </Grid>
      )}
    </Grid>
  );
};

export default OverviewTab;
