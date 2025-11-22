import React, { useState } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Chip, Button, IconButton, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  LinearProgress, Tooltip, Alert
} from '@mui/material';
import { 
  CreditCard, Delete, Visibility, CheckCircle, Schedule, TrendingUp,
  AccountBalance, CalendarToday, Info
} from '@mui/icons-material';

const ActiveEMIsTab = ({ overview, onEMIClick, onDelete, onMarkAsPaid }) => {
  const [sortBy, setSortBy] = useState('dueDate'); // dueDate, amount, provider

  if (!overview || !overview.activeEMIs || overview.activeEMIs.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            No active EMIs found. Add your first EMI to start tracking!
          </Typography>
        </Alert>
      </Box>
    );
  }

  const activeEMIs = overview.activeEMIs || [];
  
  // Sort EMIs
  const sortedEMIs = [...activeEMIs].sort((a, b) => {
    if (sortBy === 'dueDate') {
      const dateA = new Date(a.nextPaymentDate || a.nextDueDate || 0);
      const dateB = new Date(b.nextPaymentDate || b.nextDueDate || 0);
      return dateA - dateB;
    } else if (sortBy === 'amount') {
      return (b.emiAmount || 0) - (a.emiAmount || 0);
    } else if (sortBy === 'provider') {
      return (a.cardProvider || '').localeCompare(b.cardProvider || '');
    }
    return 0;
  });

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

  const getStatusColor = (emi) => {
    if (!emi.nextPaymentDate && !emi.nextDueDate) return 'default';
    const dueDate = emi.nextPaymentDate || emi.nextDueDate;
    if (!dueDate) return 'default';
    
    const daysUntilDue = Math.floor((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (isNaN(daysUntilDue)) return 'default';
    if (daysUntilDue < 0) return 'error';
    if (daysUntilDue <= 3) return 'warning';
    if (daysUntilDue <= 7) return 'info';
    return 'success';
  };

  const getDaysUntilDue = (emi) => {
    if (!emi.nextPaymentDate && !emi.nextDueDate) return 'N/A';
    const dueDate = emi.nextPaymentDate || emi.nextDueDate;
    if (!dueDate) return 'N/A';
    
    const days = Math.floor((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (isNaN(days)) return 'N/A';
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Due Tomorrow';
    return `${days} days`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CreditCard sx={{ mr: 1 }} />
                <Typography variant="body2">Active EMIs</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {activeEMIs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance sx={{ mr: 1 }} />
                <Typography variant="body2">Monthly Burden</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(overview.summary?.totalMonthlyEMI || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1 }} />
                <Typography variant="body2">Total Outstanding</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(overview.summary?.totalOutstanding || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule sx={{ mr: 1 }} />
                <Typography variant="body2">Next Payment</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {sortedEMIs[0] ? getDaysUntilDue(sortedEMIs[0]) : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sort Options */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button 
          size="small" 
          variant={sortBy === 'dueDate' ? 'contained' : 'outlined'}
          onClick={() => setSortBy('dueDate')}
        >
          Sort by Due Date
        </Button>
        <Button 
          size="small" 
          variant={sortBy === 'amount' ? 'contained' : 'outlined'}
          onClick={() => setSortBy('amount')}
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

      {/* EMIs Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Provider</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Product</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>EMI Amount</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Outstanding</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Progress</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Next Due</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEMIs.map((emi) => {
              const totalTenure = emi.totalTenure || 0;
              const remainingInstallments = emi.remainingInstallments || 0;
              const paidInstallments = totalTenure - remainingInstallments;
              const progress = totalTenure > 0 ? (paidInstallments / totalTenure) * 100 : 0;
              
              return (
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
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(emi.emiAmount)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="error.main" fontWeight={600}>
                      {formatCurrency(emi.outstandingAmount || (emi.emiAmount * remainingInstallments))}
                    </Typography>
                  </TableCell>
                  
                  <TableCell sx={{ minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(Math.max(progress, 0), 100)} 
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(progress)}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {paidInstallments} / {totalTenure} paid
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">{formatDate(emi.nextPaymentDate || emi.nextDueDate)}</Typography>
                    <Typography variant="caption" color={getStatusColor(emi) + '.main'}>
                      {getDaysUntilDue(emi)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={emi.status === 'active' ? 'Active' : emi.status}
                      color={getStatusColor(emi)}
                      size="small"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => onEMIClick(emi)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Mark as Paid">
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => onMarkAsPaid(emi._id, paidInstallments + 1, emi)}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete EMI">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => onDelete(emi)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ActiveEMIsTab;
