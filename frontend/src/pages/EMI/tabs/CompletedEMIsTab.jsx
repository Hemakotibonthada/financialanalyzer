import React, { useState } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Alert, IconButton, Tooltip
} from '@mui/material';
import { 
  CheckCircle, Download, TrendingUp, CalendarToday, 
  CreditCard, Visibility
} from '@mui/icons-material';

const CompletedEMIsTab = ({ overview, onEMIClick, onExport }) => {
  const [sortBy, setSortBy] = useState('completedDate'); // completedDate, totalPaid, provider

  const completedEMIs = overview?.completedEMIs || [];

  if (!completedEMIs || completedEMIs.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="body1">
            No completed EMIs yet. Complete an EMI to see it here!
          </Typography>
        </Alert>
      </Box>
    );
  }

  const sortedEMIs = [...completedEMIs].sort((a, b) => {
    if (sortBy === 'completedDate') {
      return new Date(b.completionDate || b.endDate) - new Date(a.completionDate || a.endDate);
    } else if (sortBy === 'totalPaid') {
      return b.totalAmount - a.totalAmount;
    } else if (sortBy === 'provider') {
      return (a.cardProvider || '').localeCompare(b.cardProvider || '');
    }
    return 0;
  });

  const totalCompleted = completedEMIs.length;
  const totalPaid = completedEMIs.reduce((sum, emi) => sum + (emi.totalAmount || 0), 0);
  const avgEMIAmount = totalPaid / (totalCompleted || 1);
  const thisYearCompleted = completedEMIs.filter(emi => {
    const date = new Date(emi.completionDate || emi.endDate);
    return date.getFullYear() === new Date().getFullYear();
  }).length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleExport = () => {
    if (onExport) {
      onExport('completed');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="body2">Completed EMIs</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalCompleted}
              </Typography>
              <Typography variant="caption">
                This year: {thisYearCompleted}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1 }} />
                <Typography variant="body2">Total Paid</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CreditCard sx={{ mr: 1 }} />
                <Typography variant="body2">Avg EMI Value</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(avgEMIAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleExport}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Export History
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sort Options */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button 
          size="small" 
          variant={sortBy === 'completedDate' ? 'contained' : 'outlined'}
          onClick={() => setSortBy('completedDate')}
        >
          Sort by Completion Date
        </Button>
        <Button 
          size="small" 
          variant={sortBy === 'totalPaid' ? 'contained' : 'outlined'}
          onClick={() => setSortBy('totalPaid')}
        >
          Sort by Amount
        </Button>
        <Button 
          size="small" 
          variant={sortBy === 'provider' ? 'contained' : 'outlined'}
          onClick={() => setSortBy('provider')}
        >
          Sort by Provider
        </Button>
      </Box>

      {/* Completed EMIs Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: 'success.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Provider</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Product</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Total Paid</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>EMI Amount</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Tenure</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Start Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Completed Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEMIs.map((emi) => (
              <TableRow key={emi._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {emi.cardProvider || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {emi.cardLastFourDigits ? `•••• ${emi.cardLastFourDigits}` : ''}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">{emi.productDescription || emi.merchantName || 'N/A'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {emi.category}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    {formatCurrency(emi.totalAmount)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatCurrency(emi.emiAmount)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {emi.totalTenure} months
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">{formatDate(emi.startDate)}</Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDate(emi.completionDate || emi.endDate)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip 
                    label="Completed"
                    color="success"
                    size="small"
                    icon={<CheckCircle />}
                  />
                </TableCell>
                
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => onEMIClick && onEMIClick(emi)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CompletedEMIsTab;
