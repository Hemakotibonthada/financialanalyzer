import React from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Button, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Alert, CircularProgress, LinearProgress
} from '@mui/material';
import { 
  Add, Edit, Delete, TrendingUp, AccountBalance, CheckCircle, Warning
} from '@mui/icons-material';

const LoansGivenTab = ({ loansGiven, loansGivenSummary, loansGivenLoading, handlers }) => {
  if (loansGivenLoading) {
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
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance sx={{ mr: 1 }} />
                <Typography variant="body2">Total Lent</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(loansGivenSummary?.totalLent || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="body2">Total Recovered</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(loansGivenSummary?.totalRecovered || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning sx={{ mr: 1 }} />
                <Typography variant="body2">Pending Recovery</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(loansGivenSummary?.pendingRecovery || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handlers?.handleAddLoanGiven}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Add Loan Given
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loans Table */}
      {!loansGiven || loansGiven.length === 0 ? (
        <Alert severity="info">
          <Typography>No loans given yet. Click "Add Loan Given" to track money you've lent to others.</Typography>
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: 'primary.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Borrower</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Loan Amount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Recovered</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Pending</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Progress</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date Given</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Expected Return</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loansGiven.map((loan) => {
                const progress = ((loan.recoveredAmount || 0) / (loan.loanAmount || 1)) * 100;
                const isFullyRecovered = progress >= 100;
                
                return (
                  <TableRow key={loan._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {loan.borrowerName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {loan.purpose}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(loan.loanAmount)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {formatCurrency(loan.recoveredAmount || 0)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="error.main" fontWeight={600}>
                        {formatCurrency((loan.loanAmount || 0) - (loan.recoveredAmount || 0))}
                      </Typography>
                    </TableCell>
                    
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(progress, 100)} 
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={isFullyRecovered ? 'success' : 'primary'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">{formatDate(loan.dateGiven)}</Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">{formatDate(loan.expectedReturnDate)}</Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={isFullyRecovered ? 'Recovered' : 'Pending'}
                        color={isFullyRecovered ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!isFullyRecovered && (
                          <Tooltip title="Add Repayment">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handlers?.handleAddRepayment(loan)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handlers?.handleEditLoanGiven(loan)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handlers?.handleDeleteLoanGiven(loan)}
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

export default LoansGivenTab;
