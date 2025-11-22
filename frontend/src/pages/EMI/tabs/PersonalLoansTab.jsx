import React from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Button, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Alert, CircularProgress, LinearProgress
} from '@mui/material';
import { 
  Add, Edit, Delete, AccountBalance, CheckCircle, Warning, TrendingUp
} from '@mui/icons-material';

const PersonalLoansTab = ({ personalLoans, personalLoansSummary, personalLoansLoading, handlers }) => {
  if (personalLoansLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance sx={{ mr: 1 }} />
                <Typography variant="body2">Total Borrowed</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(personalLoansSummary?.totalBorrowed || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="body2">Total Repaid</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(personalLoansSummary?.totalRepaid || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning sx={{ mr: 1 }} />
                <Typography variant="body2">Pending Payment</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(personalLoansSummary?.pendingPayment || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handlers?.handleAddPersonalLoan}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Add Personal Loan
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loans Table */}
      {!personalLoans || personalLoans.length === 0 ? (
        <Alert severity="info">
          <Typography>No personal loans yet. Click "Add Personal Loan" to track money you've borrowed from friends/family.</Typography>
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: 'primary.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Lender</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Loan Amount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Interest</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Repaid</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Pending</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Progress</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date Borrowed</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Due Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {personalLoans.map((loan) => {
                const totalWithInterest = (loan.principalAmount || 0) * (1 + (loan.interestRate || 0) / 100);
                const progress = ((loan.totalRepaid || 0) / totalWithInterest) * 100;
                const isFullyPaid = progress >= 100;
                
                return (
                  <TableRow key={loan._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {loan.lenderName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {loan.purpose}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(loan.principalAmount)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {loan.interestRate || 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(totalWithInterest - (loan.principalAmount || 0))}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {formatCurrency(loan.totalRepaid || 0)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="error.main" fontWeight={600}>
                        {formatCurrency(totalWithInterest - (loan.totalRepaid || 0))}
                      </Typography>
                    </TableCell>
                    
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(progress, 100)} 
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={isFullyPaid ? 'success' : 'primary'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">{formatDate(loan.loanTakenDate)}</Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">{formatDate(loan.dueDate)}</Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={isFullyPaid ? 'Paid' : 'Pending'}
                        color={isFullyPaid ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!isFullyPaid && (
                          <Tooltip title="Add Repayment">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handlers?.handleAddPersonalLoanRepayment(loan)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handlers?.handleEditPersonalLoan(loan)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handlers?.handleDeletePersonalLoan(loan)}
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
      )}
    </Box>
  );
};

export default PersonalLoansTab;
