import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import { 
  CalendarToday, 
  AccountBalance, 
  Payment, 
  TrendingUp,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const EMIDetailDialog = ({ open, onClose, selectedEMI, onEdit, onDelete, onMarkPaid }) => {
  if (!selectedEMI) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getOrdinalSuffix = (day) => {
    if (!day) return '—';
    const j = day % 10;
    const k = day % 100;
    if (j === 1 && k !== 11) return day + 'st';
    if (j === 2 && k !== 12) return day + 'nd';
    if (j === 3 && k !== 13) return day + 'rd';
    return day + 'th';
  };

  const estimateEndDate = (emi) => {
    if (!emi.startDate || !emi.totalTenure) return null;
    const start = new Date(emi.startDate);
    const months = emi.totalTenure - (emi.paidInstallments || 0);
    start.setMonth(start.getMonth() + months);
    return start.toISOString();
  };

  const completionPercentage = selectedEMI.completionPercentage != null
    ? Math.round(selectedEMI.completionPercentage)
    : (selectedEMI.totalTenure ? Math.round(((selectedEMI.paidInstallments || 0) / selectedEMI.totalTenure) * 100) : 0);

  const InfoRow = ({ icon: Icon, label, value, valueColor, highlight }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      py: 0.75,
      px: 1.5,
      borderRadius: 1.5,
      bgcolor: highlight ? 'primary.50' : 'transparent',
      transition: 'all 0.2s',
      '&:hover': {
        bgcolor: 'grey.50'
      }
    }}>
      {Icon && (
        <Box sx={{ 
          mr: 1.5, 
          display: 'flex', 
          alignItems: 'center',
          color: 'primary.main',
          bgcolor: 'primary.50',
          p: 0.5,
          borderRadius: 1.5
        }}>
          <Icon sx={{ fontSize: '1.1rem' }} />
        </Box>
      )}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} color={valueColor || 'text.primary'} sx={{ fontSize: '0.875rem' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontWeight: 'bold',
        py: 2,
        px: 3
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {selectedEMI.merchantName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, mt: 0.25 }}>
              {selectedEMI.productDescription || 'EMI Details'}
            </Typography>
          </Box>
          <Chip 
            label={selectedEMI.repaymentType === 'ON_REQUEST' ? 'On Request' : 'Monthly'}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontWeight: 600
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Column: All Information */}
          <Grid item xs={12} md={9} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
            {/* Basic Information Section */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                📋 Basic Information
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={CalendarToday}
                      label="Start Date" 
                      value={formatDate(selectedEMI.startDate)} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={Schedule}
                      label="Tenure" 
                      value={`${selectedEMI.paidInstallments} paid of ${selectedEMI.totalTenure}`} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={CalendarToday}
                      label="Estimated End Date" 
                      value={estimateEndDate(selectedEMI) ? formatDate(estimateEndDate(selectedEMI)) : '—'} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={TrendingUp}
                      label="Completion" 
                      value={`${completionPercentage}%`}
                      valueColor="success.main"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Payment Information Section */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                💳 Payment Information
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={CalendarToday}
                      label="Next EMI Day" 
                      value={selectedEMI.nextDueDate ? getOrdinalSuffix(new Date(selectedEMI.nextDueDate).getDate()) : '—'} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={Payment}
                      label="Remaining Amount" 
                      value={formatCurrency(selectedEMI.remainingAmount)}
                      valueColor="error.main"
                      highlight
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={AccountBalance}
                      label="Provider" 
                      value={`${selectedEMI.cardProvider} ${selectedEMI.cardLastFourDigits}`} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={CalendarToday}
                      label="Next Due Date" 
                      value={formatDate(selectedEMI.nextDueDate)} 
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Financial Details Section */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                💰 Financial Details
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={Payment}
                      label="EMI Amount" 
                      value={formatCurrency(selectedEMI.emiAmount)}
                      valueColor="primary.main"
                      highlight
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={AccountBalance}
                      label="Principal Amount" 
                      value={formatCurrency(selectedEMI.principalAmount)} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={TrendingUp}
                      label="Interest Rate" 
                      value={`${selectedEMI.interestRate}% p.a.`} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <InfoRow 
                      icon={CheckCircle}
                      label="Repayment Type" 
                      value={selectedEMI.repaymentType === 'ON_REQUEST' ? 'On Request (flexible)' : 'Monthly'} 
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Notes Section */}
            {selectedEMI.notes && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                  📝 Notes
                </Typography>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.50', borderRadius: 2, border: '1px solid', borderColor: 'info.200' }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEMI.notes}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Payment Schedule Table */}
            {selectedEMI.schedule && selectedEMI.schedule.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                  📅 Payment Schedule
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300, borderRadius: 2, boxShadow: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
                          Installment
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
                          Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
                          Amount
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEMI.schedule.map((s, idx) => (
                        <TableRow 
                          key={idx} 
                          sx={{ 
                            '&:hover': { bgcolor: 'action.hover' },
                            bgcolor: s.paid ? 'success.50' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              #{s.installmentNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDate(s.dueDate)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(s.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {s.paid ? (
                              <Chip 
                                label={`Paid ${formatDate(s.paidDate)}`}
                                size="small"
                                color="success"
                                icon={<CheckCircle />}
                              />
                            ) : (
                              <Chip 
                                label="Pending"
                                size="small"
                                color="warning"
                                icon={<Schedule />}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Grid>

          {/* Right Column: Visual Representation */}
          <Grid item xs={12} md={3} sx={{ 
            bgcolor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            borderLeft: '1px solid',
            borderColor: 'divider'
          }}>
            {/* Circular Progress */}
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1.5 }}>
                Progress Overview
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={Math.min(Math.max(completionPercentage, 0), 100)} 
                  size={160} 
                  thickness={5} 
                  sx={{ 
                    color: completionPercentage >= 100 ? 'success.main' : 'primary.main',
                    filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    }
                  }} 
                />
                <Box sx={{ 
                  top: 0, 
                  left: 0, 
                  bottom: 0, 
                  right: 0, 
                  position: 'absolute', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <Typography variant="h2" component="div" fontWeight={900} color="primary" sx={{ lineHeight: 1, fontSize: '2.75rem' }}>
                    {completionPercentage}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                    Completed
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ width: '100%', mb: 2 }} />

            {/* Stats Cards */}
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, textAlign: 'center', fontSize: '0.7rem' }}>
                INSTALLMENT SUMMARY
              </Typography>
              
              {/* Paid vs Remaining */}
              <Paper elevation={3} sx={{ 
                p: 2, 
                mb: 1.5, 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                border: '2px solid',
                borderColor: 'success.200'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                      Paid
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="success.main">
                      {selectedEMI.paidInstallments || 0}
                    </Typography>
                  </Box>
                  
                  <Divider orientation="vertical" flexItem sx={{ mx: 1.5 }} />
                  
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                      Remaining
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="warning.main">
                      {selectedEMI.remainingInstallments || 0}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Total Payable */}
              <Paper elevation={3} sx={{ 
                p: 2, 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textAlign: 'center'
              }}>
                <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.7rem' }}>
                  Total Payable Amount
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {formatCurrency((selectedEMI.emiAmount || 0) * (selectedEMI.totalTenure || 0))}
                </Typography>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderTop: '2px solid', borderColor: 'divider', gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          size="medium"
          sx={{ 
            textTransform: 'none',
            px: 2,
            fontWeight: 600
          }}
        >
          Close
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          color="primary"
          variant="outlined"
          size="medium"
          onClick={() => {
            onEdit();
            onClose();
          }}
          sx={{ 
            textTransform: 'none',
            px: 2,
            fontWeight: 600
          }}
        >
          Edit EMI
        </Button>
        <Button
          color="error"
          variant="outlined"
          size="medium"
          onClick={() => {
            onDelete();
            onClose();
          }}
          sx={{ 
            textTransform: 'none',
            px: 2,
            fontWeight: 600
          }}
        >
          Delete
        </Button>
        <Button
          variant="contained"
          size="medium"
          onClick={() => {
            if (selectedEMI.repaymentType === 'ON_REQUEST') {
              alert('This EMI is On-Request and cannot be marked as a regular installment.');
              return;
            }
            const nextInstallment = (selectedEMI.paidInstallments || 0) + 1;
            const emiId = selectedEMI._id || selectedEMI.id || selectedEMI.emiId;
            
            if (!emiId) {
              alert('Invalid EMI ID. Please try again.');
              return;
            }
            
            onMarkPaid(emiId, nextInstallment, selectedEMI);
            onClose();
          }}
          sx={{ 
            textTransform: 'none',
            px: 2.5,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)'
            }
          }}
        >
          Mark Next Installment Paid
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EMIDetailDialog;
